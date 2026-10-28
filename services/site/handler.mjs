/* Request handling for the Yaoyorozu AI ToolBox site Worker.
 *
 * Pure routing logic, separate from the generated bundle module so that
 * node:test can exercise it without running scripts/prepare_cloudflare.mjs.
 * No logging of full requests and no secret material: the only inputs are the
 * request URL/method, the static ASSETS binding, the optional R2 media
 * binding, and the small generated manifest of large files that are either
 * allowlisted for R2 (media mode) or kept on GitHub Pages (fallback mode).
 */

export const SERVICE_NAME = 'yaoyorozu-ai-toolbox';
export const CANONICAL_ORIGIN = 'https://yaoyorozu-ai-toolbox.riyun-aihara.workers.dev';
export const LEGACY_PREFIX = '/yaoyorozu-ai-toolbox';
export const GITHUB_BASE = 'https://studio-yebisu.github.io/yaoyorozu-ai-toolbox/';
export const HEALTH_PATH = '/healthz';
export const R2_BINDING_NAME = 'MEDIA';

const ALLOWED_METHODS = new Set(['GET', 'HEAD']);
const SECURITY_HEADERS = {'X-Content-Type-Options': 'nosniff'};
const NUL_CHARACTER = String.fromCharCode(0);
// These statuses must not carry a message body; the Response constructor
// throws otherwise, so passthrough and R2 paths drop bodies explicitly.
const NULL_BODY_STATUSES = new Set([101, 204, 205, 304]);

function applySecurityHeaders(headers) {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(name)) headers.set(name, value);
  }
  return headers;
}

function jsonResponse(data, method, status = 200) {
  return new Response(method === 'HEAD' ? null : JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...SECURITY_HEADERS
    }
  });
}

function redirectResponse(location, status, cacheSeconds, method) {
  return new Response(null, {
    status,
    headers: {
      Location: location,
      'Cache-Control': `public, max-age=${cacheSeconds}`,
      ...SECURITY_HEADERS
    }
  });
}

function notFoundResponse(method) {
  const body = '<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>404 Not Found</title></head>'
    + '<body><h1>404 Not Found</h1></body></html>';
  return new Response(method === 'HEAD' ? null : body, {
    status: 404,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      ...SECURITY_HEADERS
    }
  });
}

function methodNotAllowed(method) {
  return new Response(method === 'HEAD' ? null : 'Method Not Allowed', {
    status: 405,
    headers: {Allow: 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8', ...SECURITY_HEADERS}
  });
}

/** Decode a request pathname once for manifest and prefix checks. Null means malformed. */
export function decodePathname(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (decoded.includes(NUL_CHARACTER)) return null;
  return decoded;
}

/**
 * Parse a single HTTP byte-range value (RFC 9110 §14.1.2).
 * Returns null when the header is absent, syntactically invalid, or asks for
 * multiple ranges — callers ignore those per the RFC. Exact, open-ended and
 * suffix ranges return a descriptor whose satisfiability still depends on the
 * object size; ranges that can never match return {unsatisfiable: true}.
 */
export function parseByteRange(value) {
  if (typeof value !== 'string') return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(value.trim());
  if (!match) return null;
  const [, rawStart, rawEnd] = match;
  if (rawStart === '' && rawEnd === '') return null;
  if (rawStart === '') {
    const suffixLength = Number(rawEnd);
    return suffixLength > 0 ? {suffixLength} : {unsatisfiable: true};
  }
  const offset = Number(rawStart);
  if (rawEnd === '') return {offset, openEnded: true};
  const end = Number(rawEnd);
  return end >= offset ? {offset, length: end - offset + 1} : {unsatisfiable: true};
}

/** Decide whether a parsed range can never be satisfied for the given object size. */
function rangeIsUnsatisfiable(parsed, size) {
  if (!parsed) return false;
  if (parsed.unsatisfiable) return true;
  if (typeof size !== 'number') return false;
  if (parsed.suffixLength) return size <= 0;
  return parsed.offset >= size;
}

function normalizeEtagToken(token) {
  let value = token.trim();
  if (value.startsWith('W/')) value = value.slice(2).trim();
  return value.toLowerCase();
}

function etagHeaderMatches(headerValue, httpEtag) {
  if (!headerValue || !httpEtag) return false;
  const current = normalizeEtagToken(httpEtag);
  return headerValue.split(',').some(part => {
    const token = part.trim();
    return token === '*' || normalizeEtagToken(token) === current;
  });
}

/** True when the request validators say the cached copy is still fresh (→ 304). */
function requestIsNotModified(request, object, httpEtag) {
  const ifNoneMatch = request.headers.get('If-None-Match');
  if (ifNoneMatch) return etagHeaderMatches(ifNoneMatch, httpEtag);
  const ifModifiedSince = request.headers.get('If-Modified-Since');
  if (ifModifiedSince && object.uploaded instanceof Date) {
    const since = Date.parse(ifModifiedSince);
    return !Number.isNaN(since) && object.uploaded.getTime() <= since;
  }
  return false;
}

/**
 * Serve an exact allowlisted media key from the R2 binding, streaming the
 * object body straight into the response (nothing is buffered whole). Follows
 * the documented R2 binding pattern: onlyIf/range straight from the request
 * headers, writeHttpMetadata for the stored MIME metadata, and the quoted
 * httpEtag. Results map to honest HTTP semantics (200/206/304/412/416/404).
 * Failures are reported as 503 — allowlisted paths never silently redirect
 * back to GitHub Pages when R2 was supposed to serve them.
 */
async function serveR2Object(request, env, method, key, bindingName) {
  const unavailable = () => new Response(
    method === 'HEAD' ? null : `Media storage is unavailable (R2 binding ${bindingName}).`,
    {
      status: 503,
      headers: {'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', ...SECURITY_HEADERS}
    }
  );
  const binding = env ? env[bindingName] : undefined;
  if (!binding || typeof binding.get !== 'function') return unavailable();

  // Only syntactically valid single ranges reach the bucket; junk and
  // multi-range headers are ignored per RFC 9110 and yield the full object.
  const wantedRange = parseByteRange(request.headers.get('Range'));
  const options = {onlyIf: request.headers};
  if (wantedRange) options.range = request.headers;

  let object;
  try {
    object = await binding.get(key, options);
  } catch {
    return unavailable();
  }
  if (object === null || object === undefined) return notFoundResponse(method);

  const headers = new Headers();
  if (typeof object.writeHttpMetadata === 'function') object.writeHttpMetadata(headers);
  const httpEtag = typeof object.httpEtag === 'string' && object.httpEtag
    ? object.httpEtag
    : typeof object.etag === 'string' && object.etag ? `"${object.etag}"` : null;
  if (httpEtag) headers.set('ETag', httpEtag);
  if (object.uploaded instanceof Date) headers.set('Last-Modified', object.uploaded.toUTCString());
  headers.set('Accept-Ranges', 'bytes');
  applySecurityHeaders(headers);
  // Length and range headers are recomputed below from authoritative fields.
  headers.delete('Content-Length');
  headers.delete('Content-Range');

  const size = typeof object.size === 'number' ? object.size : undefined;
  const range = object.range && typeof object.range.offset === 'number' && typeof object.range.length === 'number'
    ? object.range
    : undefined;
  const body = 'body' in object ? object.body : null;
  const discard = stream => {
    if (stream && typeof stream.cancel === 'function') stream.cancel().catch(() => {});
  };

  if (!body) {
    // Metadata without a body: the bucket rejected the conditional or the
    // byte range is unsatisfiable. Distinguish 416/304/412 for the client.
    if (rangeIsUnsatisfiable(wantedRange, size)) {
      if (typeof size === 'number') headers.set('Content-Range', `bytes */${size}`);
      return new Response(null, {status: 416, headers});
    }
    if (httpEtag && requestIsNotModified(request, object, httpEtag)) {
      return new Response(null, {status: 304, headers});
    }
    return new Response(null, {status: 412, headers});
  }
  if (rangeIsUnsatisfiable(wantedRange, size)) {
    // Defensive: a runtime that streams a body for an unsatisfiable range.
    discard(body);
    if (typeof size === 'number') headers.set('Content-Range', `bytes */${size}`);
    return new Response(null, {status: 416, headers});
  }

  if (method === 'HEAD') discard(body);
  if (range) {
    const total = typeof size === 'number' ? size : range.offset + range.length;
    headers.set('Content-Range', `bytes ${range.offset}-${range.offset + range.length - 1}/${total}`);
    headers.set('Content-Length', String(range.length));
    return new Response(method === 'HEAD' ? null : body, {status: 206, headers});
  }
  if (typeof size === 'number') headers.set('Content-Length', String(size));
  return new Response(method === 'HEAD' ? null : body, {status: 200, headers});
}

/**
 * Build the site request handler.
 *
 * options:
 *   remoteAssets    array of exact decoded URL paths kept on GitHub Pages
 *                   (fallback mode)
 *   r2Bucket        optional R2 bucket name; when set, the handler serves
 *                   r2Keys from env[r2Binding] instead of redirecting large
 *                   files to GitHub Pages
 *   r2Keys          array of exact object keys (no leading slash) allowlisted
 *                   for R2 reads; nothing outside this list ever reaches the
 *                   bucket and the binding is never written to
 *   r2Binding       binding name for the media bucket (default MEDIA)
 *   revision        deployment revision reported by /healthz
 *   canonicalOrigin origin used for legacy-prefix redirects (no trailing slash needed)
 *   githubBase      public GitHub Pages base that keeps hosting large files
 *                   in fallback mode
 *   assetFetch      optional (request, env) => Promise<Response> override for tests;
 *                   defaults to env.ASSETS.fetch
 */
export function createSiteHandler({remoteAssets = [], r2Bucket = null, r2Keys = [], r2Binding = R2_BINDING_NAME, revision = 'dev', canonicalOrigin = CANONICAL_ORIGIN, githubBase = GITHUB_BASE, assetFetch} = {}) {
  const remotePaths = new Set(remoteAssets);
  const r2KeySet = new Set(r2Keys);
  const origin = canonicalOrigin.endsWith('/') ? canonicalOrigin.slice(0, -1) : canonicalOrigin;
  const serve = assetFetch || ((request, env) => env.ASSETS.fetch(request));
  const mediaInfo = r2Bucket
    ? {mode: 'r2', binding: r2Binding, bucket: r2Bucket}
    : {mode: 'github-pages-fallback', base: githubBase};

  return {
    async fetch(request, env, ctx) {
      const method = request.method;
      if (!ALLOWED_METHODS.has(method)) return methodNotAllowed(method);

      const url = new URL(request.url);
      const decoded = decodePathname(url.pathname);
      if (decoded === null) {
        return new Response('Bad Request', {status: 400, headers: {'Content-Type': 'text/plain; charset=utf-8', ...SECURITY_HEADERS}});
      }

      if (decoded === HEALTH_PATH) {
        // Reports the configured media mode only; bucket upload and
        // connectivity are verified by the release owner, not here.
        const media = r2Bucket ? {...mediaInfo, bound: Boolean(env && env[r2Binding])} : mediaInfo;
        return jsonResponse({ok: true, service: SERVICE_NAME, revision, media}, method);
      }

      // Old GitHub Pages project-prefix URLs keep working: /yaoyorozu-ai-toolbox/x -> /x.
      // The target is always our own origin plus a slash-anchored path, so this
      // cannot become an open redirect. The browser re-attaches the fragment.
      if (decoded === LEGACY_PREFIX || decoded.startsWith(LEGACY_PREFIX + '/')) {
        const rest = decoded.slice(LEGACY_PREFIX.length) || '/';
        return redirectResponse(origin + rest + url.search, 301, 86400, method);
      }

      // Media mode: serve the exact allowlisted keys from the R2 bucket.
      if (r2Bucket && r2KeySet.has(decoded.slice(1))) {
        return serveR2Object(request, env, method, decoded.slice(1), r2Binding);
      }

      // Large files that stay on GitHub Pages: redirect exact paths only.
      if (remotePaths.has(decoded)) {
        return redirectResponse(githubBase + decoded.slice(1) + url.search, 307, 3600, method);
      }

      const response = await serve(request, env, ctx);
      if (response.status === 404) return notFoundResponse(method);
      // Attach our security headers without buffering the streamed body.
      const headers = applySecurityHeaders(new Headers(response.headers));
      if (response.body === null || NULL_BODY_STATUSES.has(response.status)) {
        return new Response(null, {status: response.status, statusText: response.statusText, headers});
      }
      return new Response(response.body, {status: response.status, statusText: response.statusText, headers});
    }
  };
}
