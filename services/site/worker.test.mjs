import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, writeFileSync, copyFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, dirname} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createSiteHandler, decodePathname, parseByteRange, CANONICAL_ORIGIN, GITHUB_BASE} from './handler.mjs';

const REVISION = 'test-revision-1';
const REMOTE = ['/media/case/large-video.mp4', '/media/downloads/app-installer.zip'];
const GITHUB_MEDIA = {mode: 'github-pages-fallback', base: GITHUB_BASE};

// Minimal stand-in for the Workers Static Assets binding: exact path lookup,
// 404 when absent, like notFoundHandling "none".
const FILES = new Map([
  ['/index.html', '<html>home</html>'],
  ['/case.html', '<html>case</html>'],
  ['/guides/index.html', '<html>guides</html>'],
  ['/media/social-cards/card.jpg', 'jpeg-bytes']
]);
function assetsBinding() {
  return {
    async fetch(request) {
      const pathname = new URL(request.url).pathname;
      // Emulate the runtime's directory index: "/guides/" serves "/guides/index.html".
      const body = FILES.get(pathname) ?? (pathname.endsWith('/') ? FILES.get(pathname + 'index.html') : undefined);
      if (body === undefined) return new Response('asset missing', {status: 404});
      return new Response(request.method === 'HEAD' ? null : body, {
        status: 200,
        headers: {'Content-Type': pathname.endsWith('.jpg') ? 'image/jpeg' : 'text/html; charset=utf-8'}
      });
    }
  };
}
const env = () => ({ASSETS: assetsBinding()});
const handler = createSiteHandler({remoteAssets: REMOTE, revision: REVISION});
const call = (target, {method = 'GET', headers, host = 'https://yaoyorozu-ai-toolbox.riyun-aihara.workers.dev'} = {}) =>
  handler.fetch(new Request(target.startsWith('http') ? target : host + target, {method, headers}), env());

test('GET and HEAD static paths pass through with queries preserved', async () => {
  for (const method of ['GET', 'HEAD']) {
    const response = await call('/case.html?id=brief-to-demo&tab=usage', {method});
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Content-Type'), 'text/html; charset=utf-8');
    assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
    const body = await response.text();
    assert.equal(body, method === 'HEAD' ? '' : '<html>case</html>');
  }
  assert.equal((await call('/index.html')).status, 200);
  assert.equal((await call('/guides/')).status, 200);
  const image = await call('/media/social-cards/card.jpg');
  assert.equal(image.headers.get('Content-Type'), 'image/jpeg');
});

test('old /yaoyorozu-ai-toolbox/ prefix redirects to the same path on the canonical origin', async () => {
  const cases = [
    ['/yaoyorozu-ai-toolbox', '/'],
    ['/yaoyorozu-ai-toolbox/', '/'],
    ['/yaoyorozu-ai-toolbox/case.html?id=brief-to-demo', '/case.html?id=brief-to-demo'],
    ['/yaoyorozu-ai-toolbox/guides/slides/index.html', '/guides/slides/index.html']
  ];
  for (const [requestPath, target] of cases) {
    const response = await call(requestPath);
    assert.equal(response.status, 301, requestPath);
    assert.equal(response.headers.get('Location'), CANONICAL_ORIGIN + target, requestPath);
  }
  const head = await call('/yaoyorozu-ai-toolbox/case.html', {method: 'HEAD'});
  assert.equal(head.status, 301);
  assert.equal(await head.text(), '');
});

test('excluded large files redirect to GitHub Pages by exact path only', async () => {
  const found = await call('/media/case/large-video.mp4?v=2');
  assert.equal(found.status, 307);
  assert.equal(found.headers.get('Location'), GITHUB_BASE + 'media/case/large-video.mp4?v=2');
  assert.equal((await call('/media/downloads/app-installer.zip')).status, 307);
  // Not exact matches are left to the asset lookup, never guessed onto GitHub.
  for (const path of ['/media/case/large-video.mp4/extra', '/media/case/large-video.mp5', '/media/case', '/Media/Case/Large-Video.mp4']) {
    const response = await call(path);
    assert.equal(response.status, 404, path);
    assert.equal(response.headers.get('Location'), null, path);
  }
});

test('real missing paths return 404, not the homepage', async () => {
  for (const path of ['/missing.html', '/nope/', '/media/case/large-video.mp4/../secret.txt']) {
    const response = await call(path);
    assert.equal(response.status, 404, path);
    const body = await response.text();
    assert.match(body, /404 Not Found/);
    assert.doesNotMatch(body, /<html>home<\/html>/);
  }
});

test('only GET and HEAD are allowed; others receive 405 with Allow', async () => {
  for (const method of ['POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH']) {
    const response = await call('/case.html', {method});
    assert.equal(response.status, 405, method);
    assert.equal(response.headers.get('Allow'), 'GET, HEAD');
  }
});

test('/healthz reports service name, deployment revision and the media mode', async () => {
  const response = await call('/healthz');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.deepEqual(await response.json(), {ok: true, service: 'yaoyorozu-ai-toolbox', revision: REVISION, media: GITHUB_MEDIA});
  const head = await call('/healthz', {method: 'HEAD'});
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  assert.equal((await call('/healthz', {method: 'POST'})).status, 405);
});

test('redirects cannot be turned into an open proxy', async () => {
  // An absolute URL in the legacy prefix still lands on our own origin.
  const nested = await call('/yaoyorozu-ai-toolbox/http://evil.example/case.html');
  assert.equal(nested.status, 301);
  assert.equal(nested.headers.get('Location'), CANONICAL_ORIGIN + '/http://evil.example/case.html');
  assert.ok(nested.headers.get('Location').startsWith(CANONICAL_ORIGIN));
  // Encoded slashes or foreign hosts are not proxied or redirected externally.
  for (const path of ['/%2F%2Fevil.example/x', '/http://evil.example/x', 'https://evil.example/yaoyorozu-ai-toolbox/case.html']) {
    const response = await call(path);
    assert.equal(response.status, (path.startsWith('/') ? 404 : 301), path);
    const location = response.headers.get('Location');
    if (location) assert.ok(location.startsWith(CANONICAL_ORIGIN), path);
  }
  // A foreign Host header cannot redirect visitors elsewhere either.
  const foreign = await call('/yaoyorozu-ai-toolbox/case.html', {host: 'https://evil.example'});
  assert.equal(foreign.headers.get('Location'), CANONICAL_ORIGIN + '/case.html');
});

test('malformed encodings are rejected without touching the asset binding', async () => {
  assert.equal(decodePathname('/case%2Ehtml'), '/case.html');
  assert.equal(decodePathname('/bad%'), null);
  assert.equal(decodePathname('/%E0%A4%A'), null);
  const response = await call('/bad%');
  assert.equal(response.status, 400);
});

test('assetFetch override is used instead of env.ASSETS', async () => {
  let seen = null;
  const custom = createSiteHandler({
    remoteAssets: REMOTE,
    revision: REVISION,
    assetFetch: async request => { seen = request.url; return new Response('custom', {status: 200}); }
  });
  const response = await custom.fetch(new Request('https://host/index.html'), {});
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'custom');
  assert.equal(seen, 'https://host/index.html');
});

test('parseByteRange keeps single ranges and ignores the rest per RFC 9110', () => {
  assert.deepEqual(parseByteRange('bytes=0-499'), {offset: 0, length: 500});
  assert.deepEqual(parseByteRange('bytes=500-'), {offset: 500, openEnded: true});
  assert.deepEqual(parseByteRange('bytes=-100'), {suffixLength: 100});
  assert.deepEqual(parseByteRange('bytes=100-50'), {unsatisfiable: true});
  assert.deepEqual(parseByteRange('bytes=-0'), {unsatisfiable: true});
  assert.equal(parseByteRange('bytes='), null);
  assert.equal(parseByteRange('bytes=-'), null);
  assert.equal(parseByteRange('bytes=0-1,4-5'), null);
  assert.equal(parseByteRange('items=0-9'), null);
  assert.equal(parseByteRange('bytes=abc'), null);
  assert.equal(parseByteRange(null), null);
  assert.equal(parseByteRange(undefined), null);
});

/* R2 media mode: exact allowlisted keys stream from env.MEDIA. */

// Minimal stand-in for an R2 bucket binding, modelling the documented R2
// Workers API subset the handler relies on: get(key, {onlyIf, range}) with
// Headers options, conditional failure and unsatisfiable ranges returning
// metadata without a body, and honored ranges flagged via object.range.
const MEDIA_STORE = [
  {key: 'media/case/large-video.mp4', bytes: '0123456789abcdef', etag: 'abc123', contentType: 'video/mp4'},
  {key: 'examples/tool/source.zip', bytes: 'zip-bytes-here!', etag: 'zip9', contentType: 'application/zip'},
  {key: 'private/other.bin', bytes: 'not-allowlisted', etag: 'priv1', contentType: 'application/octet-stream'}
];
const R2_BUCKET = 'yaoyorozu-toolbox-media';
const R2_KEYS = ['media/case/large-video.mp4', 'examples/tool/source.zip', 'media/downloads/app-installer.zip'];

function r2Binding(store = MEDIA_STORE) {
  const objects = new Map(store.map(record => [record.key, {
    bytes: new TextEncoder().encode(record.bytes),
    etag: record.etag,
    uploaded: new Date(record.uploaded || '2026-10-27T00:00:00.000Z'),
    contentType: record.contentType
  }]));
  const listMatches = (list, etag) => list.split(',').some(part => {
    let token = part.trim();
    if (token === '*') return true;
    if (token.startsWith('W/')) token = token.slice(2).trim();
    return token === `"${etag}"`;
  });
  const metadata = (stored, key) => ({
    key,
    size: stored.bytes.byteLength,
    etag: stored.etag,
    httpEtag: `"${stored.etag}"`,
    uploaded: stored.uploaded,
    httpMetadata: {contentType: stored.contentType},
    customMetadata: {},
    writeHttpMetadata(headers) {
      headers.set('Content-Type', stored.contentType);
      headers.set('Cache-Control', 'public, max-age=3600');
    }
  });
  return {
    async get(key, options = {}) {
      const stored = objects.get(key);
      if (!stored) return null;
      const headers = options.onlyIf instanceof Headers ? options.onlyIf : new Headers(options.onlyIf || undefined);
      // onlyIf: evaluate the R2ConditionalHeaders subset the tests exercise.
      const ifNoneMatch = headers.get('If-None-Match');
      if (ifNoneMatch && listMatches(ifNoneMatch, stored.etag)) return metadata(stored, key);
      const ifMatch = headers.get('If-Match');
      if (ifMatch && ifMatch.trim() !== '*' && !listMatches(ifMatch, stored.etag)) return metadata(stored, key);
      const modifiedSince = Date.parse(headers.get('If-Modified-Since') || '');
      if (!Number.isNaN(modifiedSince) && stored.uploaded.getTime() <= modifiedSince) return metadata(stored, key);
      const unmodifiedSince = Date.parse(headers.get('If-Unmodified-Since') || '');
      if (!Number.isNaN(unmodifiedSince) && stored.uploaded.getTime() > unmodifiedSince) return metadata(stored, key);
      // range: options arrive as Headers (request.headers) from the handler.
      const rangeHeader = options.range instanceof Headers ? options.range.get('Range') : null;
      const parsed = fakeParseRange(rangeHeader, stored.bytes.byteLength);
      const base = metadata(stored, key);
      if (!parsed) return {...base, body: new Response(stored.bytes).body};
      if (parsed.unsatisfiable) return base;
      return {
        ...base,
        range: {offset: parsed.offset, length: parsed.length},
        body: new Response(stored.bytes.slice(parsed.offset, parsed.offset + parsed.length)).body
      };
    }
  };
}

function fakeParseRange(header, size) {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;
  const [, rawStart, rawEnd] = match;
  if (rawStart === '' && rawEnd === '') return null;
  if (rawStart === '') {
    const suffix = Number(rawEnd);
    if (suffix <= 0 || size <= 0) return {unsatisfiable: true};
    const length = Math.min(suffix, size);
    return {offset: size - length, length};
  }
  const offset = Number(rawStart);
  const end = rawEnd === '' ? size - 1 : Math.min(Number(rawEnd), size - 1);
  if (offset >= size || end < offset) return {unsatisfiable: true};
  return {offset, length: end - offset + 1};
}

const r2Handler = createSiteHandler({remoteAssets: [], r2Bucket: R2_BUCKET, r2Keys: R2_KEYS, revision: REVISION});
const r2Env = () => ({ASSETS: assetsBinding(), MEDIA: r2Binding()});
const r2Call = (target, {method = 'GET', headers, host = 'https://yaoyorozu-ai-toolbox.riyun-aihara.workers.dev'} = {}) =>
  r2Handler.fetch(new Request(target.startsWith('http') ? target : host + target, {method, headers}), r2Env());

test('R2 media mode streams exact allowlisted keys with GET and HEAD', async () => {
  const served = await r2Call('/media/case/large-video.mp4?autoplay=1');
  assert.equal(served.status, 200);
  assert.equal(served.headers.get('Content-Type'), 'video/mp4');
  assert.equal(served.headers.get('ETag'), '"abc123"');
  assert.equal(served.headers.get('Accept-Ranges'), 'bytes');
  assert.equal(served.headers.get('Content-Length'), '16');
  assert.equal(served.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(await served.text(), '0123456789abcdef');

  const head = await r2Call('/media/case/large-video.mp4', {method: 'HEAD'});
  assert.equal(head.status, 200);
  assert.equal(head.headers.get('Content-Length'), '16');
  assert.equal(head.headers.get('ETag'), '"abc123"');
  assert.equal(await head.text(), '');

  const zip = await r2Call('/examples/tool/source.zip');
  assert.equal(zip.status, 200);
  assert.equal(zip.headers.get('Content-Type'), 'application/zip');
});

test('R2 media mode honors Range with 206/Content-Range and answers 416 out-of-range', async () => {
  const first = await r2Call('/media/case/large-video.mp4', {headers: {Range: 'bytes=0-3'}});
  assert.equal(first.status, 206);
  assert.equal(first.headers.get('Content-Range'), 'bytes 0-3/16');
  assert.equal(first.headers.get('Content-Length'), '4');
  assert.equal(await first.text(), '0123');

  const suffix = await r2Call('/media/case/large-video.mp4', {headers: {Range: 'bytes=-4'}});
  assert.equal(suffix.status, 206);
  assert.equal(suffix.headers.get('Content-Range'), 'bytes 12-15/16');
  assert.equal(await suffix.text(), 'cdef');

  const open = await r2Call('/media/case/large-video.mp4', {method: 'HEAD', headers: {Range: 'bytes=8-'}});
  assert.equal(open.status, 206);
  assert.equal(open.headers.get('Content-Range'), 'bytes 8-15/16');
  assert.equal(open.headers.get('Content-Length'), '8');
  assert.equal(await open.text(), '');

  for (const range of ['bytes=99-120', 'bytes=30-', 'bytes=100-50']) {
    const beyond = await r2Call('/media/case/large-video.mp4', {headers: {Range: range}});
    assert.equal(beyond.status, 416, range);
    assert.equal(beyond.headers.get('Content-Range'), 'bytes */16', range);
    assert.equal(await beyond.text(), '', range);
  }

  // Junk and multi-range headers are ignored per RFC 9110: full object, 200.
  const ignored = await r2Call('/media/case/large-video.mp4', {headers: {Range: 'bytes=abc,0-3'}});
  assert.equal(ignored.status, 200);
  assert.equal(ignored.headers.get('Content-Length'), '16');
  assert.equal(await ignored.text(), '0123456789abcdef');
});

test('R2 media mode answers conditional requests with 304 or 412', async () => {
  const notModified = await r2Call('/media/case/large-video.mp4', {headers: {'If-None-Match': '"abc123"'}});
  assert.equal(notModified.status, 304);
  assert.equal(notModified.headers.get('ETag'), '"abc123"');
  assert.equal(await notModified.text(), '');

  const weakList = await r2Call('/media/case/large-video.mp4', {headers: {'If-None-Match': 'W/"abc123", "other"'}});
  assert.equal(weakList.status, 304);

  const stale = await r2Call('/media/case/large-video.mp4', {headers: {'If-None-Match': '"different"'}});
  assert.equal(stale.status, 200);
  assert.equal(await stale.text(), '0123456789abcdef');

  const precondition = await r2Call('/media/case/large-video.mp4', {headers: {'If-Match': '"different"'}});
  assert.equal(precondition.status, 412);
  assert.equal(await precondition.text(), '');

  const headNotModified = await r2Call('/media/case/large-video.mp4', {method: 'HEAD', headers: {'If-None-Match': '"abc123"'}});
  assert.equal(headNotModified.status, 304);
});

test('R2 media mode reports allowlisted-but-missing objects as 404', async () => {
  const response = await r2Call('/media/downloads/app-installer.zip');
  assert.equal(response.status, 404);
  assert.match(await response.text(), /404 Not Found/);
  assert.equal(response.headers.get('Location'), null);
  const head = await r2Call('/media/downloads/app-installer.zip', {method: 'HEAD'});
  assert.equal(head.status, 404);
  assert.equal(await head.text(), '');
});

test('R2 media mode never queries the bucket for non-allowlisted paths', async () => {
  let r2Gets = 0;
  const binding = r2Binding();
  const countingEnv = () => ({
    ASSETS: assetsBinding(),
    MEDIA: {...binding, get: (...args) => { r2Gets += 1; return binding.get(...args); }}
  });
  // The bucket holds this object, but it is not on the allowlist.
  const denied = await r2Handler.fetch(new Request('https://host/private/other.bin'), countingEnv());
  assert.equal(denied.status, 404);
  assert.equal(denied.headers.get('Location'), null);
  // Near-misses of an allowlisted key are not served either.
  for (const path of ['/media/case/large-video.mp5', '/media/case/large-video.mp4/extra', '/Media/Case/Large-Video.mp4', '/media/case/../private/other.bin']) {
    const response = await r2Handler.fetch(new Request('https://host' + path), countingEnv());
    assert.equal(response.status, 404, path);
    assert.equal(response.headers.get('Location'), null, path);
  }
  assert.equal(r2Gets, 0);
});

test('R2 media mode keeps GET/HEAD-only: no public PUT or listing', async () => {
  for (const method of ['POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH']) {
    const response = await r2Call('/media/case/large-video.mp4', {method});
    assert.equal(response.status, 405, method);
    assert.equal(response.headers.get('Allow'), 'GET, HEAD', method);
  }
});

test('R2 media mode fails honestly when the binding is missing or errors', async () => {
  const unbound = await r2Handler.fetch(new Request('https://host/media/case/large-video.mp4'), {ASSETS: assetsBinding()});
  assert.equal(unbound.status, 503);
  assert.match(await unbound.text(), /MEDIA/);
  assert.equal(unbound.headers.get('Location'), null);

  const failing = {ASSETS: assetsBinding(), MEDIA: {get: async () => { throw new Error('boom'); }}};
  const errored = await r2Handler.fetch(new Request('https://host/media/case/large-video.mp4'), failing);
  assert.equal(errored.status, 503);
  assert.equal(errored.headers.get('Location'), null);

  // Health states the configured mode and local binding wiring only — it does
  // not claim the bucket was uploaded to or is reachable.
  const health = await r2Handler.fetch(new Request('https://host/healthz'), {ASSETS: assetsBinding()});
  assert.deepEqual(await health.json(), {
    ok: true,
    service: 'yaoyorozu-ai-toolbox',
    revision: REVISION,
    media: {mode: 'r2', binding: 'MEDIA', bucket: R2_BUCKET, bound: false}
  });
  const boundHealth = await r2Handler.fetch(new Request('https://host/healthz'), r2Env());
  assert.deepEqual(await boundHealth.json(), {
    ok: true,
    service: 'yaoyorozu-ai-toolbox',
    revision: REVISION,
    media: {mode: 'r2', binding: 'MEDIA', bucket: R2_BUCKET, bound: true}
  });
});

test('R2 media mode keeps legacy redirects and open-proxy protections', async () => {
  const legacy = await r2Call('/yaoyorozu-ai-toolbox/case.html');
  assert.equal(legacy.status, 301);
  assert.equal(legacy.headers.get('Location'), CANONICAL_ORIGIN + '/case.html');
  const foreign = await r2Call('/yaoyorozu-ai-toolbox/case.html', {host: 'https://evil.example'});
  assert.equal(foreign.headers.get('Location'), CANONICAL_ORIGIN + '/case.html');
  // No silent GitHub redirect for allowlisted paths in R2 mode.
  const served = await r2Call('/media/case/large-video.mp4');
  assert.equal(served.headers.get('Location'), null);
});

test('deployed bundle wiring: worker.mjs + generated remote-assets.mjs resolve together', async () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const bundle = mkdtempSync(join(tmpdir(), 'yaoyorozu-bundle-'));
  try {
    copyFileSync(join(here, 'worker.mjs'), join(bundle, 'worker.mjs'));
    copyFileSync(join(here, 'handler.mjs'), join(bundle, 'handler.mjs'));
    writeFileSync(join(bundle, 'remote-assets.mjs'),
      'export const BUILD_REVISION = "bundle-rev-9";\n'
      + `export const CANONICAL_ORIGIN = "${CANONICAL_ORIGIN}/";\n`
      + 'export const REMOTE_ASSETS = Object.freeze(["/media/big.mp4"]);\n'
      + 'export const R2_BUCKET = null;\n'
      + 'export const R2_KEYS = Object.freeze([]);\n');
    const worker = (await import(pathToFileURL(join(bundle, 'worker.mjs')).href)).default;
    const health = await worker.fetch(new Request('https://host/healthz'), env());
    assert.deepEqual(await health.json(), {ok: true, service: 'yaoyorozu-ai-toolbox', revision: 'bundle-rev-9', media: GITHUB_MEDIA});
    const redirect = await worker.fetch(new Request('https://host/yaoyorozu-ai-toolbox/case.html'), env());
    assert.equal(redirect.status, 301);
    assert.equal(redirect.headers.get('Location'), CANONICAL_ORIGIN + '/case.html');
    const remote = await worker.fetch(new Request('https://host/media/big.mp4'), env());
    assert.equal(remote.status, 307);
    assert.equal(remote.headers.get('Location'), GITHUB_BASE + 'media/big.mp4');
  } finally {
    rmSync(bundle, {recursive: true, force: true});
  }
});

test('deployed bundle wiring: R2 mode serves generated keys from env.MEDIA and fails honestly when unbound', async () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const bundle = mkdtempSync(join(tmpdir(), 'yaoyorozu-bundle-r2-'));
  try {
    copyFileSync(join(here, 'worker.mjs'), join(bundle, 'worker.mjs'));
    copyFileSync(join(here, 'handler.mjs'), join(bundle, 'handler.mjs'));
    writeFileSync(join(bundle, 'remote-assets.mjs'),
      'export const BUILD_REVISION = "bundle-r2-rev";\n'
      + `export const CANONICAL_ORIGIN = "${CANONICAL_ORIGIN}";\n`
      + 'export const REMOTE_ASSETS = Object.freeze([]);\n'
      + 'export const R2_BUCKET = "media-bucket";\n'
      + 'export const R2_KEYS = Object.freeze(["media/big.mp4"]);\n');
    const worker = (await import(pathToFileURL(join(bundle, 'worker.mjs')).href)).default;
    const boundEnv = () => ({ASSETS: assetsBinding(), MEDIA: r2Binding([{key: 'media/big.mp4', bytes: 'bundle-video-bytes', etag: 'b1', contentType: 'video/mp4'}])});
    const served = await worker.fetch(new Request('https://host/media/big.mp4'), boundEnv());
    assert.equal(served.status, 200);
    assert.equal(served.headers.get('ETag'), '"b1"');
    assert.equal(served.headers.get('Content-Type'), 'video/mp4');
    assert.equal(await served.text(), 'bundle-video-bytes');
    const ranged = await worker.fetch(new Request('https://host/media/big.mp4', {headers: {Range: 'bytes=0-6'}}), boundEnv());
    assert.equal(ranged.status, 206);
    assert.equal(ranged.headers.get('Content-Range'), 'bytes 0-6/18');
    const unbound = await worker.fetch(new Request('https://host/media/big.mp4'), {ASSETS: assetsBinding()});
    assert.equal(unbound.status, 503);
    assert.equal(unbound.headers.get('Location'), null);
  } finally {
    rmSync(bundle, {recursive: true, force: true});
  }
});
