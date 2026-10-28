/* Package the validated dist/ publication into the Cloudflare Build Output tree.
 *
 *   node scripts/prepare_cloudflare.mjs
 *
 * Reads the already validated static allowlist in dist/ (produce it first with
 * `python scripts/build.py` and `python scripts/check.py`), then writes
 * .cloudflare/output/v0/ for `cf deploy --prebuilt --mode production`:
 *
 *   - copies/hardlinks files <= MAX_FILE_BYTES into workers/default/assets/
 *   - rewrites the site-owned GitHub Pages URL prefix to the Cloudflare origin
 *     in navigation/canonical/share surfaces only (never in production
 *     receipts, case data, or license/provenance files)
 *   - records files above MAX_FILE_BYTES in a generated bundle module. In the
 *     default GitHub Pages fallback mode (YAOYOROZU_R2_BUCKET unset, unchanged
 *     from the initial deployment) the Worker 307-redirects those exact paths
 *     to the still-live GitHub Pages hosting; nothing is uploaded to R2 and
 *     none is claimed connected. With YAOYOROZU_R2_BUCKET set to an existing
 *     bucket that the release owner has already uploaded to and verified
 *     outside this script, the same paths instead become an exact allowlist
 *     of R2 keys (same path sans leading slash) served by the Worker through
 *     the MEDIA binding with streaming GET/HEAD — no listing, no writes
 *   - writes root and Worker configs through @cloudflare/build-output-utils
 *     (no handwritten prebuilt schema) and re-validates the tree
 *   - records counts/bytes/sha256 in .local/cloudflare-release-report.json
 *
 * Environment overrides: YAOYOROZU_SITE_URL (canonical origin, default below),
 * YAOYOROZU_LIKES_API_URL (expected likes API origin used for a sanity check),
 * YAOYOROZU_R2_BUCKET (optional name of an existing R2 bucket that switches
 * large-file serving from GitHub Pages redirects to the R2 MEDIA binding).
 */
import {createHash} from 'node:crypto';
import {cpSync, existsSync, linkSync, mkdirSync, readdirSync, readFileSync, realpathSync, statSync, copyFileSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {cleanBuildOutputDir, getWorkerAssetsDir, getWorkerBundleDir, readBuildOutput, writeRootConfig, writeWorkerConfig} from '@cloudflare/build-output-utils';

export const WORKER_NAME = 'yaoyorozu-ai-toolbox';
export const ACCOUNT_ID = 'b9a279130afe8c02e3c6f32c3f3ac43a';
export const COMPATIBILITY_DATE = '2026-10-28';
export const DEFAULT_SITE_URL = 'https://yaoyorozu-ai-toolbox.riyun-aihara.workers.dev/';
export const GITHUB_BASE = 'https://studio-yebisu.github.io/yaoyorozu-ai-toolbox/';
export const DEFAULT_LIKES_API_URL = 'https://yaoyorozu-likes.riyun-aihara.workers.dev';
export const R2_BINDING_NAME = 'MEDIA';

export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_TOTAL_FILES = 20000;
export const MAX_EXCLUDED_FILES = 5000;

// Private or generated state that must never reach a publication directory.
const DENIED_SEGMENTS = new Set(['.local', '.git', 'workspace', 'node_modules', '__pycache__', '.cloudflare', 'reviews', 'out', '.openai', '.wrangler']);

// Text surfaces that receive the site-owned URL rewrite. Everything else in
// dist/ is byte-identical to the GitHub Pages build.
const TRANSFORM_EXTENSIONS = new Set(['.html', '.htm', '.xml', '.txt', '.json', '.js', '.mjs', '.css', '.md', '.webmanifest']);
const TRANSFORM_EXACT = new Set(['data/projects.json', 'data/social-cards.json', 'sitemap.xml', 'robots.txt']);

// Never rewrite provenance: historical production receipts, factual case data,
// licenses/attribution, and upstream source records keep their original URLs.
const NO_TRANSFORM_EXACT = new Set(['LICENSE', 'README.md', 'MEDIA-LICENSE.md', 'data/cases.json', 'data/catalog.json',
  'data/open-models.json', 'data/categories.json', 'data/site-map.json', 'data/likes.json']);
const NO_TRANSFORM_BASENAMES = new Set(['LICENSE', 'ATTRIBUTION.md', 'MEDIA-LICENSE.md']);
const NO_TRANSFORM_PREFIXES = ['data/production/', 'data/cases/', 'data/import-manifest.json', 'data/curated-resources.json', 'data/video-downloads.json', 'examples/'];

const BUNDLE_FILES = ['worker.mjs', 'handler.mjs'];

export function siteUrlFrom(env = process.env) {
  const value = (env.YAOYOROZU_SITE_URL || DEFAULT_SITE_URL).trim();
  const url = new URL(value);
  if (url.protocol !== 'https:' || !url.hostname || url.username || url.password || url.search || url.hash) {
    throw new Error(`YAOYOROZU_SITE_URL must be an https origin without credentials/query/fragment, got ${value}`);
  }
  return value.endsWith('/') ? value : value + '/';
}

/**
 * Optional R2 media mode: YAOYOROZU_R2_BUCKET names an existing bucket the
 * release owner has already uploaded to and verified. Unset/empty keeps the
 * GitHub Pages fallback exactly as before. The bucket itself is never created,
 * written, or connectivity-checked here — this only validates the name shape
 * so a typo cannot produce a silently broken binding.
 */
export function r2BucketFrom(env = process.env) {
  const value = (env.YAOYOROZU_R2_BUCKET || '').trim();
  if (!value) return null;
  if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(value)) {
    throw new Error(`YAOYOROZU_R2_BUCKET must be an existing R2 bucket name (3-63 chars: lowercase letters, digits and hyphens, starting and ending alphanumeric), got "${value}"`);
  }
  return value;
}

export function shouldTransform(relativePath) {
  if (TRANSFORM_EXACT.has(relativePath)) return true;
  if (NO_TRANSFORM_EXACT.has(relativePath)) return false;
  if (NO_TRANSFORM_PREFIXES.some(prefix => relativePath.startsWith(prefix))) return false;
  const base = relativePath.slice(relativePath.lastIndexOf('/') + 1);
  if (NO_TRANSFORM_BASENAMES.has(base)) return false;
  const dot = base.lastIndexOf('.');
  if (dot <= 0) return false;
  return TRANSFORM_EXTENSIONS.has(base.slice(dot).toLowerCase());
}

/** Walk dist/ into a sorted flat list after safety checks. Throws on private paths or escaping links. */
export function collectDistFiles(distDir) {
  const root = resolve(distDir);
  if (!existsSync(root)) throw new Error(`dist/ not found at ${root}; run python scripts/build.py and scripts/check.py first`);
  const files = [];
  const walk = (dir, relDir) => {
    for (const entry of readdirSync(dir, {withFileTypes: true})) {
      const rel = relDir ? `${relDir}/${entry.name}` : entry.name;
      const abs = join(dir, entry.name);
      if (DENIED_SEGMENTS.has(entry.name)) {
        throw new Error(`Private or generated path segment "${entry.name}" is not publishable: ${rel}`);
      }
      if (entry.isSymbolicLink()) {
        const real = realpathSync(abs);
        if (real !== root && !real.startsWith(root + sep)) {
          throw new Error(`Symlink escapes dist/: ${rel} -> ${real}`);
        }
        const stat = statSync(real);
        if (stat.isDirectory()) { walk(real, rel); continue; }
        if (!stat.isFile()) throw new Error(`Not a regular file: ${rel}`);
        files.push({rel, abs: real, bytes: stat.size});
        continue;
      }
      if (entry.isDirectory()) { walk(abs, rel); continue; }
      if (!entry.isFile()) throw new Error(`Not a regular file: ${rel}`);
      const stat = statSync(abs);
      files.push({rel, abs, bytes: stat.size});
    }
  };
  walk(root, '');
  files.sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0));
  if (files.length === 0) throw new Error('dist/ is empty');
  if (files.length > MAX_TOTAL_FILES) throw new Error(`dist/ has ${files.length} files, above the ${MAX_TOTAL_FILES} safety limit`);
  if (!files.some(file => file.rel === 'index.html')) throw new Error('dist/index.html is missing; dist/ does not look like the built site');
  if (files.some(file => file.rel === 'healthz')) throw new Error('dist/ contains a "healthz" file that would shadow the Worker health route');
  return {root, files};
}

function sha256File(abs) {
  const hash = createHash('sha256');
  hash.update(readFileSync(abs));
  return hash.digest('hex');
}

function copyOrLink(abs, dest) {
  mkdirSync(dirname(dest), {recursive: true});
  try {
    linkSync(abs, dest);
  } catch {
    copyFileSync(abs, dest);
  }
}

function assertLikesApi(distRoot, expectedApiUrl) {
  const likesPath = join(distRoot, 'data', 'likes.json');
  if (!existsSync(likesPath)) throw new Error('dist/data/likes.json is missing');
  const likes = JSON.parse(readFileSync(likesPath, 'utf8'));
  if (likes.api_url !== expectedApiUrl) {
    throw new Error(`dist/data/likes.json api_url is ${likes.api_url}; expected ${expectedApiUrl} (set YAOYOROZU_LIKES_API_URL at build time if the API origin changed)`);
  }
}

/**
 * Package distDir into the Build Output tree under project root.
 * Returns the report object (also written to .local/cloudflare-release-report.json).
 */
export async function prepareCloudflare({root, distDir = join(root, 'dist'), siteUrl, likesApiUrl = process.env.YAOYOROZU_LIKES_API_URL || DEFAULT_LIKES_API_URL, r2Bucket = r2BucketFrom(), now = new Date().toISOString()} = {}) {
  const site = siteUrl ? (siteUrl.endsWith('/') ? siteUrl : siteUrl + '/') : siteUrlFrom();
  const oldBase = GITHUB_BASE;
  const {root: distRoot, files} = collectDistFiles(distDir);
  assertLikesApi(distRoot, likesApiUrl);

  const included = [];
  const excluded = [];
  for (const file of files) {
    if (file.bytes > MAX_FILE_BYTES) excluded.push(file); else included.push(file);
  }
  if (excluded.length > MAX_EXCLUDED_FILES) throw new Error(`dist/ has ${excluded.length} files above ${MAX_FILE_BYTES} bytes, above the ${MAX_EXCLUDED_FILES} safety limit`);

  await cleanBuildOutputDir(root);
  const assetsDir = getWorkerAssetsDir(root);
  const bundleDir = getWorkerBundleDir(root);
  mkdirSync(assetsDir, {recursive: true});
  mkdirSync(bundleDir, {recursive: true});

  const transformed = [];
  let packagedBytes = 0;
  let transformedBytes = 0;
  for (const file of included) {
    const dest = join(assetsDir, ...file.rel.split('/'));
    if (shouldTransform(file.rel)) {
      const text = readFileSync(file.abs, 'utf8');
      if (text.includes(oldBase)) {
        const rewritten = text.split(oldBase).join(site);
        mkdirSync(dirname(dest), {recursive: true});
        writeFileSync(dest, rewritten);
        transformed.push({path: file.rel, bytes: file.bytes, sha256: sha256File(dest)});
        transformedBytes += file.bytes;
        packagedBytes += file.bytes;
        continue;
      }
    }
    copyOrLink(file.abs, dest);
    packagedBytes += file.bytes;
  }

  const excludedItems = excluded.map(file => ({path: '/' + file.rel, bytes: file.bytes, sha256: sha256File(file.abs)}));
  const excludedBytes = excluded.reduce((sum, file) => sum + file.bytes, 0);

  for (const name of BUNDLE_FILES) cpSync(join(root, 'services', 'site', name), join(bundleDir, name));

  // The revision identifies this whole deployment, not just the asset input:
  // canonical site URL, media mode/bucket, every dist path + content hash, and
  // the actual Worker sources that get bundled. A config-only or code-only
  // change must therefore produce a new /healthz revision.
  const revisionHash = createHash('sha256');
  revisionHash.update(`site ${site}\n`);
  revisionHash.update(r2Bucket ? `r2 ${R2_BINDING_NAME} ${r2Bucket}\n` : 'r2 none\n');
  for (const file of [...included, ...excluded]) revisionHash.update(`${file.rel} ${sha256File(file.abs)}\n`);
  for (const name of BUNDLE_FILES) revisionHash.update(`bundle ${name} ${sha256File(join(bundleDir, name))}\n`);
  const revision = revisionHash.digest('hex').slice(0, 16);

  // In R2 media mode the oversized files become an exact allowlist of bucket
  // keys (same path sans leading slash); in fallback mode they redirect.
  const r2Keys = r2Bucket ? excluded.map(file => file.rel) : [];
  writeFileSync(join(bundleDir, 'remote-assets.mjs'),
    '// Generated by scripts/prepare_cloudflare.mjs. Lists oversized files excluded from the static assets.\n'
    + (r2Bucket
      ? `// R2 media mode: the Worker serves these exact keys from bucket "${r2Bucket}" via the ${R2_BINDING_NAME} binding.\n`
      : '// GitHub Pages fallback: the Worker 307-redirects these exact paths; no R2 bucket configured.\n')
    + `export const BUILD_REVISION = ${JSON.stringify(revision)};\n`
    + `export const CANONICAL_ORIGIN = ${JSON.stringify(site)};\n`
    + `export const REMOTE_ASSETS = Object.freeze(${JSON.stringify(r2Bucket ? [] : excludedItems.map(item => item.path))});\n`
    + `export const R2_BUCKET = ${JSON.stringify(r2Bucket)};\n`
    + `export const R2_KEYS = Object.freeze(${JSON.stringify(r2Keys)});\n`);

  await writeRootConfig(root, {accountId: ACCOUNT_ID}, {isPreview: false, mode: 'production'});
  await writeWorkerConfig({
    root,
    config: {
      name: WORKER_NAME,
      compatibilityDate: COMPATIBILITY_DATE,
      workersDev: true,
      assets: {htmlHandling: 'auto-trailing-slash', notFoundHandling: 'none'},
      observability: {
        enabled: true,
        logs: {enabled: true, headSamplingRate: 0.1},
        traces: {enabled: true, headSamplingRate: 0.05}
      },
      env: r2Bucket
        ? {ASSETS: {type: 'assets'}, MEDIA: {type: 'r2', name: r2Bucket}}
        : {ASSETS: {type: 'assets'}}
    },
    manifest: {
      type: 'complete',
      mainModule: 'worker.mjs',
      modules: {
        'worker.mjs': {type: 'esm'},
        'handler.mjs': {type: 'esm'},
        'remote-assets.mjs': {type: 'esm'}
      }
    }
  });

  // Re-read the tree with the official validator: schema, layout, no symlinks.
  const output = await readBuildOutput(root);
  if (output.workers.default.config.name !== WORKER_NAME) throw new Error('Build Output validation lost the Worker name');

  const distBytes = files.reduce((sum, file) => sum + file.bytes, 0);
  const report = {
    schema_version: 1,
    generated_at: now,
    worker: {name: WORKER_NAME, compatibilityDate: COMPATIBILITY_DATE, revision},
    site_url: site,
    github_fallback_base: oldBase,
    likes_api_url: likesApiUrl,
    media: r2Bucket
      ? {
          mode: 'r2',
          binding: R2_BINDING_NAME,
          bucket: r2Bucket,
          keys: r2Keys,
          note: 'objects are uploaded to and verified in the bucket by the release owner before deploy; this step only allowlists the exact keys'
        }
      : {
          mode: 'github-pages-fallback',
          base: oldBase,
          note: 'YAOYOROZU_R2_BUCKET not set; oversized files redirect to GitHub Pages and nothing is uploaded to R2'
        },
    limits: {max_file_bytes: MAX_FILE_BYTES, max_total_files: MAX_TOTAL_FILES, max_excluded_files: MAX_EXCLUDED_FILES},
    dist: {files: files.length, bytes: distBytes},
    packaged: {files: included.length, bytes: packagedBytes, transformed_files: transformed.length, transformed_bytes: transformedBytes, transformed},
    excluded: {files: excluded.length, bytes: excludedBytes, items: excludedItems},
    validated_by: '@cloudflare/build-output-utils readBuildOutput'
  };
  const reportPath = join(root, '.local', 'cloudflare-release-report.json');
  mkdirSync(dirname(reportPath), {recursive: true});
  writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
  return report;
}

const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (invokedDirectly) {
  prepareCloudflare({root: resolve(dirname(fileURLToPath(import.meta.url)), '..')})
    .then(report => {
      const media = report.media.mode === 'r2'
        ? `${report.excluded.files} oversized files allowlisted for R2 bucket ${report.media.bucket} via ${report.media.binding} (upload and verification are separate release steps)`
        : `${report.excluded.files} oversized files (${report.excluded.bytes} B) kept on GitHub Pages`;
      console.log(`Prepared ${report.worker.name}@${report.worker.revision}: ${report.packaged.files} files (${report.packaged.bytes} B) packaged, ${media}.`);
      console.log(`Report: .local/cloudflare-release-report.json`);
    })
    .catch(error => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
