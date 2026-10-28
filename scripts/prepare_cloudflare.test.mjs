import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareCloudflare, collectDistFiles, shouldTransform, siteUrlFrom, r2BucketFrom, MAX_FILE_BYTES, DEFAULT_SITE_URL, GITHUB_BASE, DEFAULT_LIKES_API_URL, WORKER_NAME, ACCOUNT_ID} from './prepare_cloudflare.mjs';

const CF_SITE = 'https://cf-check.example.workers.dev/';
const OLD = GITHUB_BASE; // https://studio-yebisu.github.io/yaoyorozu-ai-toolbox/
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..');
const NOW = '2026-10-28T00:00:00.000Z';

function makeRoot() {
  const root = mkdtempSync(join(tmpdir(), 'yaoyorozu-prepare-'));
  const dist = join(root, 'dist');
  mkdirSync(join(dist, 'guides', 'slides'), {recursive: true});
  mkdirSync(join(dist, 'data', 'production'), {recursive: true});
  mkdirSync(join(dist, 'data', 'cases'), {recursive: true});
  mkdirSync(join(dist, 'media'), {recursive: true});
  mkdirSync(join(root, 'services', 'site'), {recursive: true});
  for (const name of ['worker.mjs', 'handler.mjs']) {
    writeFileSync(join(root, 'services', 'site', name), readFileSync(join(REPO, 'services', 'site', name)));
  }
  writeFileSync(join(dist, 'index.html'), `<html><a href="${OLD}case.html">x</a> <a href="${OLD.replace('toolbox/', 'toolbox-slides/')}">slides</a></html>`);
  writeFileSync(join(dist, 'case.html'), `<link rel="canonical" href="${OLD}case.html">`);
  writeFileSync(join(dist, 'guides', 'slides', 'index.html'), `<meta property="og:url" content="${OLD}guides/slides/">`);
  writeFileSync(join(dist, 'sitemap.xml'), `<url><loc>${OLD}index.html</loc></url>`);
  writeFileSync(join(dist, 'robots.txt'), `Sitemap: ${OLD}sitemap.xml\n`);
  writeFileSync(join(dist, 'data', 'projects.json'), JSON.stringify({title: 'Yaoyorozu AI ToolBox', site_url: OLD, url: OLD}));
  writeFileSync(join(dist, 'data', 'social-cards.json'), JSON.stringify({base_url: OLD, cards: [{url: OLD + 'share/a-card.html'}]}));
  writeFileSync(join(dist, 'data', 'likes.json'), JSON.stringify({api_url: DEFAULT_LIKES_API_URL}) + '\n');
  writeFileSync(join(dist, 'data', 'production', 'receipt.json'), JSON.stringify({proof: OLD + 'case.html?id=a'}));
  writeFileSync(join(dist, 'data', 'cases', 'c1.json'), JSON.stringify({demo: OLD + 'examples/c1/'}));
  writeFileSync(join(dist, 'MEDIA-LICENSE.md'), `See ${OLD}media-rights.html\n`);
  writeFileSync(join(dist, 'media', 'small.mp4'), 'small-video');
  writeFileSync(join(dist, 'media', 'big.bin'), Buffer.alloc(MAX_FILE_BYTES + 1));
  return root;
}

function readOutput(root, ...parts) {
  return readFileSync(join(root, '.cloudflare', 'output', 'v0', ...parts), 'utf8');
}

test('packages dist into a validated Build Output with configs from the official helpers', async () => {
  const root = makeRoot();
  try {
    const report = await prepareCloudflare({root, siteUrl: CF_SITE, likesApiUrl: DEFAULT_LIKES_API_URL, r2Bucket: null, now: NOW});

    assert.match(report.worker.revision, /^[0-9a-f]{16}$/);
    assert.equal(report.worker.name, WORKER_NAME);
    assert.equal(report.site_url, CF_SITE);
    assert.equal(report.dist.files, 13);
    assert.equal(report.excluded.files, 1);
    assert.equal(report.excluded.items[0].path, '/media/big.bin');
    assert.equal(report.excluded.items[0].bytes, MAX_FILE_BYTES + 1);
    assert.match(report.excluded.items[0].sha256, /^[0-9a-f]{64}$/);
    assert.ok(report.packaged.files >= 12);
    assert.equal(report.media.mode, 'github-pages-fallback');
    assert.equal(report.media.base, GITHUB_BASE);

    const rootConfig = JSON.parse(readOutput(root, 'config.json'));
    assert.equal(rootConfig.accountId, ACCOUNT_ID);
    assert.deepEqual(rootConfig.buildContext, {isPreview: false, mode: 'production'});

    const workerConfig = JSON.parse(readOutput(root, 'workers', 'default', 'worker.config.json'));
    assert.equal(workerConfig.name, WORKER_NAME);
    assert.equal(workerConfig.compatibilityDate, '2026-10-28');
    assert.equal(workerConfig.workersDev, true);
    assert.deepEqual(workerConfig.env.ASSETS, {type: 'assets'});
    assert.equal('MEDIA' in workerConfig.env, false, 'fallback mode must not bind R2');
    assert.equal(workerConfig.assets.htmlHandling, 'auto-trailing-slash');
    assert.equal(workerConfig.assets.notFoundHandling, 'none');
    assert.equal(workerConfig.observability.logs.enabled, true);
    assert.equal(workerConfig.observability.traces.enabled, true);
    assert.equal(workerConfig.manifest.mainModule, 'worker.mjs');
    assert.equal(workerConfig.manifest.modules['remote-assets.mjs'].type, 'esm');

    // Assets landed and the large file did not.
    assert.ok(existsSync(join(root, '.cloudflare', 'output', 'v0', 'workers', 'default', 'assets', 'media', 'small.mp4')));
    assert.equal(existsSync(join(root, '.cloudflare', 'output', 'v0', 'workers', 'default', 'assets', 'media', 'big.bin')), false);

    // Bundle modules shipped with the excluded manifest.
    const remote = readOutput(root, 'workers', 'default', 'bundle', 'remote-assets.mjs');
    assert.match(remote, new RegExp(`REMOTE_ASSETS = Object\\.freeze\\(\\["/media/big.bin"\\]`));
    assert.match(remote, new RegExp(`R2_BUCKET = null`));
    assert.match(remote, new RegExp(`R2_KEYS = Object\\.freeze\\(\\[\\]\\)`));
    assert.match(remote, new RegExp(`BUILD_REVISION = "${report.worker.revision}"`));
    assert.ok(existsSync(join(root, '.cloudflare', 'output', 'v0', 'workers', 'default', 'bundle', 'worker.mjs')));
    assert.ok(existsSync(join(root, '.cloudflare', 'output', 'v0', 'workers', 'default', 'bundle', 'handler.mjs')));

    // Report persisted for release bookkeeping.
    const saved = JSON.parse(readFileSync(join(root, '.local', 'cloudflare-release-report.json'), 'utf8'));
    assert.equal(saved.worker.revision, report.worker.revision);
    assert.equal(saved.excluded.files, 1);
    assert.equal(saved.media.mode, 'github-pages-fallback');
  } finally {
    rmSync(root, {recursive: true, force: true});
  }
});

test('rewrites the site-owned prefix only in navigation, canonical and share surfaces', async () => {
  const root = makeRoot();
  try {
    await prepareCloudflare({root, siteUrl: CF_SITE, likesApiUrl: DEFAULT_LIKES_API_URL, r2Bucket: null, now: NOW});
    const assets = (...parts) => readFileSync(join(root, '.cloudflare', 'output', 'v0', 'workers', 'default', 'assets', ...parts), 'utf8');

    const home = assets('index.html');
    assert.ok(home.includes(CF_SITE + 'case.html'));
    assert.ok(!home.includes(OLD));
    assert.ok(home.includes('yaoyorozu-ai-toolbox-slides/'), 'specialist guide origin must stay on GitHub Pages');

    assert.ok(assets('case.html').includes(CF_SITE + 'case.html'));
    assert.ok(assets('guides', 'slides', 'index.html').includes(CF_SITE + 'guides/slides/'));
    assert.ok(assets('sitemap.xml').includes(CF_SITE + 'index.html'));
    assert.ok(assets('robots.txt').includes(CF_SITE + 'sitemap.xml'));
    assert.ok(assets('data', 'projects.json').includes(CF_SITE));
    assert.ok(assets('data', 'social-cards.json').includes(CF_SITE + 'share/a-card.html'));

    // Provenance and factual data stay byte-identical to the GitHub Pages build.
    assert.ok(assets('data', 'production', 'receipt.json').includes(OLD));
    assert.ok(assets('data', 'cases', 'c1.json').includes(OLD));
    assert.ok(assets('MEDIA-LICENSE.md').includes(OLD));
    assert.ok(!assets('data', 'likes.json').includes('studio-yebisu.github.io'));
  } finally {
    rmSync(root, {recursive: true, force: true});
  }
});

test('rejects private paths, healthz shadowing, wrong likes API and escaping symlinks', async () => {
  const root = makeRoot();
  try {
    mkdirSync(join(root, 'dist', '.local'), {recursive: true});
    writeFileSync(join(root, 'dist', '.local', 'secret.txt'), 'secret');
    assert.throws(() => collectDistFiles(join(root, 'dist')), /not publishable/);
    rmSync(join(root, 'dist', '.local'), {recursive: true, force: true});

    writeFileSync(join(root, 'dist', 'healthz'), 'shadow');
    assert.throws(() => collectDistFiles(join(root, 'dist')), /healthz/);
    rmSync(join(root, 'dist', 'healthz'));

    writeFileSync(join(root, 'dist', 'data', 'likes.json'), JSON.stringify({api_url: 'https://wrong.example'}) + '\n');
    await assert.rejects(() => prepareCloudflare({root, siteUrl: CF_SITE, likesApiUrl: DEFAULT_LIKES_API_URL, r2Bucket: null, now: NOW}), /api_url/);

    writeFileSync(join(root, 'dist', 'data', 'likes.json'), JSON.stringify({api_url: DEFAULT_LIKES_API_URL}) + '\n');
    try {
      symlinkSync(join(root, 'outside-secret.txt'), join(root, 'dist', 'linked.txt'));
      writeFileSync(join(root, 'outside-secret.txt'), 'outside');
      assert.throws(() => collectDistFiles(join(root, 'dist')), /escapes dist/);
    } catch (error) {
      if (error.code !== 'EPERM' && error.code !== 'EACCES' && error.code !== 'ENOTSUP' && error.code !== 'ERR_ASSERTION' && error.code !== 'ENOENT') throw error;
      if (error.code === 'ERR_ASSERTION') throw error; // symlink worked but was not rejected
    }
  } finally {
    rmSync(root, {recursive: true, force: true});
  }
});

test('URL policy helpers: transform allowlist and site_url validation', () => {
  assert.equal(shouldTransform('index.html'), true);
  assert.equal(shouldTransform('share/a-card.html'), true);
  assert.equal(shouldTransform('data/projects.json'), true);
  assert.equal(shouldTransform('data/social-cards.json'), true);
  assert.equal(shouldTransform('sitemap.xml'), true);
  assert.equal(shouldTransform('data/production/receipt.json'), false);
  assert.equal(shouldTransform('data/cases.json'), false);
  assert.equal(shouldTransform('data/cases/c1.json'), false);
  assert.equal(shouldTransform('examples/demo/index.html'), false);
  assert.equal(shouldTransform('guides/motion/ATTRIBUTION.md'), false);
  assert.equal(shouldTransform('MEDIA-LICENSE.md'), false);
  assert.equal(shouldTransform('media/video.mp4'), false);
  assert.equal(shouldTransform('.nojekyll'), false);

  assert.equal(siteUrlFrom({YAOYOROZU_SITE_URL: ''}), DEFAULT_SITE_URL);
  assert.equal(siteUrlFrom({YAOYOROZU_SITE_URL: 'https://custom.example.workers.dev'}), 'https://custom.example.workers.dev/');
  assert.throws(() => siteUrlFrom({YAOYOROZU_SITE_URL: 'http://insecure.example/'}), /https/);
  assert.throws(() => siteUrlFrom({YAOYOROZU_SITE_URL: 'https://user:pass@example.com/'}), /credentials/);
});

test('r2BucketFrom: unset keeps the GitHub Pages fallback; set validates the bucket name shape', () => {
  assert.equal(r2BucketFrom({}), null);
  assert.equal(r2BucketFrom({YAOYOROZU_R2_BUCKET: ''}), null);
  assert.equal(r2BucketFrom({YAOYOROZU_R2_BUCKET: '   '}), null);
  assert.equal(r2BucketFrom({YAOYOROZU_R2_BUCKET: '  yaoyorozu-toolbox-media  '}), 'yaoyorozu-toolbox-media');
  assert.equal(r2BucketFrom({YAOYOROZU_R2_BUCKET: 'a-b-c'}), 'a-b-c');
  assert.throws(() => r2BucketFrom({YAOYOROZU_R2_BUCKET: 'Bad_Name'}), /YAOYOROZU_R2_BUCKET/);
  assert.throws(() => r2BucketFrom({YAOYOROZU_R2_BUCKET: 'ab'}), /YAOYOROZU_R2_BUCKET/);
  assert.throws(() => r2BucketFrom({YAOYOROZU_R2_BUCKET: '-bucket-'}), /YAOYOROZU_R2_BUCKET/);
  assert.throws(() => r2BucketFrom({YAOYOROZU_R2_BUCKET: 'bucket.name'}), /YAOYOROZU_R2_BUCKET/);
});

test('R2 opt-in: allowlists excluded files as exact bucket keys and binds MEDIA only when configured', async () => {
  const root = makeRoot();
  try {
    // Fallback mode: no MEDIA binding, generated module carries no R2 keys.
    const fallback = await prepareCloudflare({root, siteUrl: CF_SITE, likesApiUrl: DEFAULT_LIKES_API_URL, r2Bucket: null, now: NOW});
    const fallbackConfig = JSON.parse(readOutput(root, 'workers', 'default', 'worker.config.json'));
    assert.equal('MEDIA' in fallbackConfig.env, false);
    const fallbackModule = readOutput(root, 'workers', 'default', 'bundle', 'remote-assets.mjs');
    assert.match(fallbackModule, /R2_BUCKET = null/);
    assert.match(fallbackModule, /R2_KEYS = Object\.freeze\(\[\]\)/);
    assert.equal(fallback.media.mode, 'github-pages-fallback');
    assert.equal(fallback.media.base, GITHUB_BASE);

    // R2 mode: excluded paths become exact allowlisted keys (sans leading slash).
    const r2 = await prepareCloudflare({root, siteUrl: CF_SITE, likesApiUrl: DEFAULT_LIKES_API_URL, r2Bucket: 'yaoyorozu-toolbox-media', now: NOW});
    const r2Config = JSON.parse(readOutput(root, 'workers', 'default', 'worker.config.json'));
    assert.deepEqual(r2Config.env.ASSETS, {type: 'assets'});
    assert.deepEqual(r2Config.env.MEDIA, {type: 'r2', name: 'yaoyorozu-toolbox-media'});
    const r2Module = readOutput(root, 'workers', 'default', 'bundle', 'remote-assets.mjs');
    assert.match(r2Module, /REMOTE_ASSETS = Object\.freeze\(\[\]\)/);
    assert.match(r2Module, /R2_BUCKET = "yaoyorozu-toolbox-media"/);
    assert.match(r2Module, /R2_KEYS = Object\.freeze\(\["media\/big.bin"\]\)/);
    assert.equal(r2.media.mode, 'r2');
    assert.equal(r2.media.binding, 'MEDIA');
    assert.equal(r2.media.bucket, 'yaoyorozu-toolbox-media');
    assert.deepEqual(r2.media.keys, ['media/big.bin']);
    // Excluded bookkeeping keeps full paths + hashes for the upload/verify step.
    assert.deepEqual(r2.excluded.items.map(item => item.path), ['/media/big.bin']);

    // The revision identifies code/config as well as asset input.
    assert.notEqual(r2.worker.revision, fallback.worker.revision, 'R2 mode/bucket must change the revision');
    const otherSite = await prepareCloudflare({root, siteUrl: 'https://elsewhere.example.workers.dev/', likesApiUrl: DEFAULT_LIKES_API_URL, r2Bucket: 'yaoyorozu-toolbox-media', now: NOW});
    assert.notEqual(otherSite.worker.revision, r2.worker.revision, 'site URL must change the revision');

    // Identical inputs stay reproducible.
    const again = await prepareCloudflare({root, siteUrl: CF_SITE, likesApiUrl: DEFAULT_LIKES_API_URL, r2Bucket: 'yaoyorozu-toolbox-media', now: NOW});
    assert.equal(again.worker.revision, r2.worker.revision);

    // A Worker source change alone must also produce a new revision.
    writeFileSync(join(root, 'services', 'site', 'handler.mjs'), readFileSync(join(root, 'services', 'site', 'handler.mjs'), 'utf8') + '\n// touched\n');
    const rebuilt = await prepareCloudflare({root, siteUrl: CF_SITE, likesApiUrl: DEFAULT_LIKES_API_URL, r2Bucket: 'yaoyorozu-toolbox-media', now: NOW});
    assert.notEqual(rebuilt.worker.revision, r2.worker.revision, 'bundled Worker source must change the revision');
  } finally {
    rmSync(root, {recursive: true, force: true});
  }
});
