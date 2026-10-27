import {test, beforeEach, afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker from './worker.mjs';
import items from './items.json' with {type: 'json'};

const ORIGIN = 'https://studio-yebisu.github.io';
const [first, second] = items;
const alice = '2da33609-3886-4ab2-a481-f7ca72bd0fce';
const bob = 'b1567d3e-54d9-4f71-b036-3b4491f3e174';
let db;
let env;

// Run the shipped SQL against SQLite. This adapter provides D1's binding interface.
beforeEach(() => {
  db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('./migrations/0001_likes.sql', import.meta.url), 'utf8'));
  env = {
    ALLOWED_ORIGINS: ORIGIN,
    DB: {
      prepare(sql) { return {sql, values: [], bind(...values) { return {...this, values}; }}; },
      async batch(queries) {
        db.exec('BEGIN');
        try {
          const results = queries.map(query => ({success: true, results: db.prepare(query.sql).all(...query.values)}));
          db.exec('COMMIT');
          return results;
        } catch (error) { db.exec('ROLLBACK'); throw error; }
      }
    }
  };
});
afterEach(() => db.close());

function call(path = '/v1/likes', {token, origin = ORIGIN, method = 'GET', body, ...options} = {}) {
  const {headers: suppliedHeaders, ...rest} = options;
  const headers = new Headers(suppliedHeaders);
  if (origin) headers.set('Origin', origin);
  if (token) headers.set('X-Visitor-ID', token);
  if (body !== undefined && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  return worker.fetch(new Request('https://likes.example' + path, {method, headers, ...rest, body}), env);
}
const vote = (token, liked, id = first) => call('/v1/likes/' + id, {token, method: 'PUT', body: JSON.stringify({liked})});
const read = (token, ids = [first, second]) => call('/v1/likes?ids=' + ids.join(','), {token});

test('simultaneous retries count one vote; another browser counts another; removal is idempotent', async () => {
  const replies = await Promise.all(Array.from({length: 30}, () => vote(alice, true)));
  for (const response of replies) assert.equal(response.status, 200);
  assert.deepEqual(await (await read(alice)).json(), {items: [
    {id: first, count: 1, liked: true}, {id: second, count: 0, liked: false}
  ]});
  assert.deepEqual(await (await vote(bob, true)).json(), {id: first, count: 2, liked: true});
  assert.deepEqual(await (await read()).json(), {items: [
    {id: first, count: 2, liked: false}, {id: second, count: 0, liked: false}
  ]});
  assert.deepEqual(await (await vote(alice, false)).json(), {id: first, count: 1, liked: false});
  assert.deepEqual(await (await vote(alice, false)).json(), {id: first, count: 1, liked: false});
  await vote(bob, false);
  await vote(bob, false);
  assert.equal((await (await read()).json()).items[0].count, 0);
  await vote(alice, true);
  assert.equal((await (await read()).json()).items[0].count, 1);
});

test('state is per item and visitor; storage contains only hashed random IDs', async () => {
  await vote(alice, true);
  await vote(bob, true, second);
  assert.deepEqual((await (await read(alice)).json()).items, [
    {id: first, count: 1, liked: true}, {id: second, count: 1, liked: false}
  ]);
  for (const row of db.prepare('SELECT visitor_hash FROM likes').all()) {
    assert.match(row.visitor_hash, /^[a-f0-9]{64}$/);
    assert.notEqual(row.visitor_hash, alice);
    assert.notEqual(row.visitor_hash, bob);
  }
});

test('disallowed origins, missing identity and unknown items cannot write', async () => {
  for (const origin of ['https://evil.example', null]) {
    const response = await call('/v1/likes/' + first, {origin, token: alice, method: 'PUT', body: '{"liked":true}'});
    assert.equal(response.status, 403);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
  }
  assert.equal((await vote(undefined, true)).status, 400);
  assert.equal((await vote('bad-token', true)).status, 400);
  assert.equal((await vote(alice, true, 'not-an-item')).status, 404);
  assert.equal((await read(alice, ['not-an-item'])).status, 400);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM likes').get().n, 0);
});

test('invalid and oversized writes and unsupported methods leave totals unchanged', async () => {
  for (const body of ['{}', 'null', '{', '{"liked":1}', '{"liked":true,"count":99}']) {
    assert.equal((await call('/v1/likes/' + first, {method: 'PUT', token: alice, body})).status, 400);
  }
  assert.equal((await call('/v1/likes/' + first, {method: 'PUT', token: alice, body: ' '.repeat(257)})).status, 413);
  assert.equal((await call('/v1/likes/' + first, {method: 'PUT', token: alice, body: '{}', headers: {'Content-Type': 'text/plain'}})).status, 415);
  assert.equal((await call('/v1/likes/' + first, {method: 'POST'})).status, 405);
  assert.equal((await call('/v1/likes')).status, 400);
  assert.equal((await read(alice, items.slice(0, 41))).status, 400);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM likes').get().n, 0);
});

test('configured CORS works and visitor-specific responses cannot be cached', async () => {
  env.ALLOWED_ORIGINS += ',http://127.0.0.1:8857';
  const preflight = await call('/v1/likes/' + first, {method: 'OPTIONS', origin: 'http://127.0.0.1:8857'});
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), 'http://127.0.0.1:8857');
  const response = await read(alice);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(response.headers.get('Vary'), 'Origin');
  assert.equal(response.headers.get('Access-Control-Allow-Credentials'), null);
});

test('database failure returns no fabricated count; retry after recovery succeeds', async () => {
  const batch = env.DB.batch;
  env.DB.batch = async () => { throw new Error('private database failure'); };
  const response = await vote(alice, true);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {error: 'unavailable'});
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), ORIGIN);
  env.DB.batch = batch;
  assert.deepEqual(await (await vote(alice, true)).json(), {id: first, count: 1, liked: true});
});
