import items from './items.json' with {type: 'json'};

const allowedItems = new Set(items);
const visitorPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_IDS = 40;

function headers(origin) {
  const result = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Vary': 'Origin',
    'X-Content-Type-Options': 'nosniff'
  });
  if (origin) {
    result.set('Access-Control-Allow-Origin', origin);
    result.set('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
    result.set('Access-Control-Allow-Headers', 'Content-Type, X-Visitor-ID');
    result.set('Access-Control-Max-Age', '86400');
  }
  return result;
}

function reply(data, status, origin) {
  return new Response(status === 204 ? null : JSON.stringify(data), {status, headers: headers(origin)});
}

async function visitorHash(token) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token.toLowerCase()));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

async function readBody(request) {
  if (Number(request.headers.get('Content-Length')) > 256) throw new Error('too_large');
  if (!request.body) throw new Error('invalid_body');
  const reader = request.body.getReader();
  const parts = [];
  let size = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > 256) {
        await reader.cancel();
        throw new Error('too_large');
      }
      parts.push(part.value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.length; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new Error('invalid_body'); }
}

async function handle(request, env) {
  const url = new URL(request.url);
  const origin = request.headers.get('Origin');
  const allowedOrigins = String(env.ALLOWED_ORIGINS || '').split(',').map(value => value.trim());
  if ((origin && !allowedOrigins.includes(origin)) || (!origin && request.method !== 'GET')) {
    return reply({error: 'origin_not_allowed'}, 403);
  }
  const isCollection = url.pathname === '/v1/likes';
  const match = /^\/v1\/likes\/([a-z0-9][a-z0-9-]*)$/.exec(url.pathname);
  if (!isCollection && !match) return reply({error: 'not_found'}, 404, origin);
  if (request.method === 'OPTIONS') return reply(null, 204, origin);
  if (!((isCollection && request.method === 'GET') || (match && request.method === 'PUT'))) {
    return reply({error: 'method_not_allowed'}, 405, origin);
  }
  const token = request.headers.get('X-Visitor-ID');
  if (token !== null && !visitorPattern.test(token)) return reply({error: 'invalid_visitor'}, 400, origin);

  if (isCollection) {
    const ids = [...new Set((url.searchParams.get('ids') || '').split(','))];
    if (!ids.length || ids.length > MAX_IDS || ids.some(id => !allowedItems.has(id))) {
      return reply({error: 'invalid_items'}, 400, origin);
    }
    const placeholders = ids.map(() => '?').join(',');
    const queries = [env.DB.prepare(`SELECT item_id, count FROM like_counts WHERE item_id IN (${placeholders})`).bind(...ids)];
    if (token) {
      queries.push(env.DB.prepare(`SELECT item_id FROM likes WHERE visitor_hash = ? AND item_id IN (${placeholders})`)
        .bind(await visitorHash(token), ...ids));
    }
    const result = await env.DB.batch(queries);
    const counts = new Map(result[0].results.map(row => [row.item_id, row.count]));
    const liked = new Set(result[1]?.results.map(row => row.item_id) || []);
    return reply({items: ids.map(id => ({id, count: counts.get(id) || 0, liked: liked.has(id)}))}, 200, origin);
  }

  const id = match[1];
  if (!allowedItems.has(id)) return reply({error: 'not_found'}, 404, origin);
  if (!token) return reply({error: 'visitor_required'}, 400, origin);
  if (!/^application\/json(?:;|$)/i.test(request.headers.get('Content-Type') || '')) {
    return reply({error: 'json_required'}, 415, origin);
  }
  let body;
  try { body = await readBody(request); }
  catch (error) { return reply({error: error.message}, error.message === 'too_large' ? 413 : 400, origin); }
  if (!body || typeof body.liked !== 'boolean' || Object.keys(body).length !== 1) {
    return reply({error: 'invalid_body'}, 400, origin);
  }
  const hash = await visitorHash(token);
  const mutation = body.liked
    ? env.DB.prepare('INSERT INTO likes (item_id, visitor_hash) VALUES (?, ?) ON CONFLICT DO NOTHING').bind(id, hash)
    : env.DB.prepare('DELETE FROM likes WHERE item_id = ? AND visitor_hash = ?').bind(id, hash);
  // Both statements run in one D1 transaction. Triggers and the composite primary key
  // keep retries, double taps, simultaneous requests and removal from inflating totals.
  const result = await env.DB.batch([
    mutation,
    env.DB.prepare(`SELECT COALESCE((SELECT count FROM like_counts WHERE item_id = ?), 0) AS count,
      EXISTS(SELECT 1 FROM likes WHERE item_id = ? AND visitor_hash = ?) AS liked`).bind(id, id, hash)
  ]);
  const row = result[1].results[0];
  return reply({id, count: row.count, liked: Boolean(row.liked)}, 200, origin);
}

export default {
  async fetch(request, env) {
    try { return await handle(request, env); }
    catch {
      const origin = request.headers.get('Origin');
      const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).includes(origin);
      return reply({error: 'unavailable'}, 503, allowed ? origin : undefined);
    }
  }
};
