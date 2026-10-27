/* brief-to-demo 作例「ひと言を、制作の設計図へ」— 概念図ページと図解動画の共通部分
 * 12件の素材を、大きさ・SHA-256・中身の対応で照合してから図と読み出しを出す。
 * brief-to-demo はAIが読むMarkdownの指示書で、それ自体は動かない。このページでもAIは動かない。
 * 図の文字は照合済みの保存記録（3件のブリーフ・出力JSON・引き継ぎ文・SKILL.md）から読む。
 * ページの初期化は index.html（data-page="brief-to-demo-concept"）でだけ行う。video/video.js は読み込みと描画だけを使う。
 * Copyright (c) 2026 Studio Yebisu. MIT License. */

export const CASE_ID = 'brief-to-demo';
export const SOURCE_COMMIT = 'bc2984ab4208e349aded79b3694cc2cb98b8a4a6';
export const MANIFEST_PATH = 'concept/manifest.json';
export const MANIFEST_SHA256 = '843aaa40a8d024d8711cbca739924124a5470066a2fe2d87dcdeb72e906cd21d';
const SKILL_PATH = 'vendor/brief-to-demo/SKILL.md';
export const ASSET_PATHS = Object.freeze([
  'concept/structure.json', 'inputs/requests.json', 'samples.json',
  'outputs/ui.json', 'outputs/slides.json', 'outputs/motion.json',
  'outputs/ui-handoff.txt', 'outputs/slides-handoff.txt', 'outputs/motion-handoff.txt',
  SKILL_PATH, 'vendor/brief-to-demo/LICENSE', 'request.txt',
]);
export const ASSET_COUNT = ASSET_PATHS.length;
export const JOB_IDS = Object.freeze(['ui', 'slides', 'motion']);
// 原典SKILL.mdのJSONの11項目（順序もそのまま）
export const KEYS = Object.freeze(['title', 'request', 'category', 'audience', 'goal', 'inputs', 'skill_refs', 'deliverables', 'steps', 'acceptance', 'assumptions']);
const GROUP_IDS = ['core', 'materials', 'production', 'assumptions'];
const GROUP_SIZES = [5, 2, 3, 1];
const PART_IDS = ['manual', 'input', 'category', 'schema', 'assumptions', 'handoff'];
const RULE_IDS = ['by-result', 'no-facts', 'separate'];
const CATEGORY_IDS = ['ui-ux', 'slides', 'motion', 'agents'];
const LIST_COUNTS = {inputs: 3, steps: 5, acceptance: 5, assumptions: 4};
export const OUTPUTS = Object.freeze({
  ui: Object.freeze({
    json: Object.freeze({path: 'outputs/ui.json', bytes: 2733, sha256: 'b6a8268425e870d94dce568b89a122bd9074fd802bdcf71fbb30333031c295ff'}),
    handoff: Object.freeze({path: 'outputs/ui-handoff.txt', bytes: 3156, sha256: 'e7fcd958c98bd77fc32a7f2426918c5fb78924cd899868bdd70309a1bb7ecb5a'}),
  }),
  slides: Object.freeze({
    json: Object.freeze({path: 'outputs/slides.json', bytes: 2687, sha256: 'ba67e0e00ea4cdc478842671e47a54f3a3c041e6212ee9c484ed7788cb8e93c4'}),
    handoff: Object.freeze({path: 'outputs/slides-handoff.txt', bytes: 3110, sha256: 'a4dd15961802ff504cfa5169a8ea0e3ef4999651969816d21a92502516bab352'}),
  }),
  motion: Object.freeze({
    json: Object.freeze({path: 'outputs/motion.json', bytes: 2370, sha256: '2b21f9eb87b70c6c85274a79dc46ce059c7c4ec58af9fa06f70dd39b9dd9184b'}),
    handoff: Object.freeze({path: 'outputs/motion-handoff.txt', bytes: 2793, sha256: '14b9da5b6fcd6cea8c502adaba711b2037c8e7320fb55f9d2dba6872b107df36'}),
  }),
});
const SAMPLES_PIN = Object.freeze({path: 'samples.json', bytes: 10649, sha256: '859dd1124c27924f77588e52bbf4c638adc42cb62539246b1e26062619dfe73c'});
export const UPSTREAM_SKILL_URL = `https://github.com/studio-yebisu/yaoyorozu-ai-toolbox/blob/${SOURCE_COMMIT}/skills/brief-to-demo/SKILL.md`;
// 図のポケットに載せる「未提供」の言い回し。保存済みの assumptions[index] の部分文字列（読み込み時に確かめる）。
export const UNSET = Object.freeze({
  ui: Object.freeze({index: 1, text: '日時・会場・定員は未提供'}),
  slides: Object.freeze({index: 0, text: '開催日時・課題本・参加費は未提供'}),
  motion: Object.freeze({index: 0, text: '3つの変更点の内容は未提供'}),
});
// 以前のビューア（app.js）の handoffText と同じ前置き
const HANDOFF_HEAD = [
  '次の制作ブリーフに沿って制作してください。',
  '1. skill_refs にあるSKILL.mdや資料を、作り始める前に読んでください。',
  '2. 未指定の条件は assumptions に分け、依頼の範囲で進めてください。成果を左右する未解決の選択だけ確認してください。',
  '3. 完成したら、acceptance の条件を一つずつ満たしたか報告してください。',
  '',
];
export const HANDOFF_KEYS = Object.freeze(['skill_refs', 'assumptions', 'acceptance']);

const BASE = new URL('./', import.meta.url);
export const assetUrl = (path) => new URL(path, BASE).href;

// ---------- 小さな道具 ----------
export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const easeOut = (x) => 1 - Math.pow(1 - clamp01(x), 3);
export const prog = (t, a, b) => clamp01((t - a) / (b - a));
export const span = (t, a, b, c, d) => Math.min(easeOut(prog(t, a, b)), 1 - ease(prog(t, c, d)));
// 時刻 at から dur 秒で値を to へ移す変化を順に重ねる（絶対時刻だけで決まる）
export function steps(t, v0, changes) {
  let v = v0, prev = v0;
  for (const [at, to, dur = 0.5] of changes) { v += (to - prev) * ease(prog(t, at, at + dur)); prev = to; }
  return v;
}
const lerp = (a, b, k) => a + (b - a) * k;
const lerpRect = (a, b, k) => ({x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), w: lerp(a.w, b.w, k), h: lerp(a.h, b.h, k)});
const isStr = (s) => typeof s === 'string' && s.length > 0;
const ids = (list) => (Array.isArray(list) ? list.map((x) => x && x.id) : []);
const sameList = (a, b) => Array.isArray(a) && a.length === b.length && a.every((x, i) => x === b[i]);
const norm = (s) => s.replace(/\s+/g, ' ').trim();
function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && deepEqual(a[k], b[k]));
}
function deepFreeze(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); for (const v of Object.values(o)) deepFreeze(v); }
  return o;
}

// ---------- 取得と照合 ----------
export class AssetError extends Error {}
const fail = (message) => { throw new AssetError(message); };
const check = (ok, message) => { if (!ok) fail(message); };

async function fetchBytes(path, signal) {
  let response;
  try {
    response = await fetch(assetUrl(path), {cache: 'no-store', credentials: 'same-origin', signal});
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    fail(`${path} を取得できませんでした`);
  }
  if (!response.ok) fail(`${path} が HTTP ${response.status} でした`);
  try {
    return new Uint8Array(await response.arrayBuffer());
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    return fail(`${path} を最後まで読めませんでした`);
  }
}

const hex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
const K256 = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);
const ror = (x, n) => (x >>> n) | (x << (32 - n));
// crypto.subtle が使えない環境（http で別の端末から開いた場合など）のための、同じ結果を返すSHA-256
function softSha256(bytes) {
  const n = bytes.length, total = ((n + 9 + 63) >> 6) << 6;
  const buf = new Uint8Array(total);
  buf.set(bytes);
  buf[n] = 0x80;
  const view = new DataView(buf.buffer);
  view.setUint32(total - 8, Math.floor(n / 0x20000000));
  view.setUint32(total - 4, (n << 3) >>> 0);
  const h = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const w = new Uint32Array(64);
  for (let o = 0; o < total; o += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(o + i * 4);
    for (let i = 16; i < 64; i++) {
      const a = w[i - 15], b = w[i - 2];
      w[i] = (w[i - 16] + (ror(a, 7) ^ ror(a, 18) ^ (a >>> 3)) + w[i - 7] + (ror(b, 17) ^ ror(b, 19) ^ (b >>> 10))) | 0;
    }
    let a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], k = h[7];
    for (let i = 0; i < 64; i++) {
      const t1 = (k + (ror(e, 6) ^ ror(e, 11) ^ ror(e, 25)) + ((e & f) ^ (~e & g)) + K256[i] + w[i]) | 0;
      const t2 = ((ror(a, 2) ^ ror(a, 13) ^ ror(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      k = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    h[0] += a; h[1] += b; h[2] += c; h[3] += d; h[4] += e; h[5] += f; h[6] += g; h[7] += k;
  }
  const out = new Uint8Array(32);
  const ov = new DataView(out.buffer);
  for (let i = 0; i < 8; i++) ov.setUint32(i * 4, h[i]);
  return hex(out);
}

export async function sha256Hex(bytes) {
  if (globalThis.crypto?.subtle) {
    try { return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))); } catch { /* 下の実装で求める */ }
  }
  return softSha256(bytes);
}

function decodeText(bytes, path) {
  let body;
  try { body = new TextDecoder('utf-8', {fatal: true}).decode(bytes); } catch { fail(`${path} がUTF-8として読めません`); }
  return body.charCodeAt(0) === 0xfeff ? body.slice(1) : body;
}
function parseJson(path, body) {
  try { return JSON.parse(body); } catch { return fail(`${path} がJSONとして読めません`); }
}

function validateManifest(m) {
  check(m && m.format === 'studio-yebisu-assets/v1' && m.case_id === CASE_ID && m.source_commit === SOURCE_COMMIT, 'manifest の形式か固定版が違います');
  check(Array.isArray(m.files) && sameList(m.files.map((f) => f && f.path), ASSET_PATHS), `manifest の素材${ASSET_COUNT}件の一覧が違います`);
  for (const f of m.files) check(Number.isInteger(f.bytes) && f.bytes > 0 && /^[0-9a-f]{64}$/.test(f.sha256), `manifest の ${f.path} の記録が読めません`);
  const pins = [SAMPLES_PIN, ...Object.values(OUTPUTS).flatMap((o) => [o.json, o.handoff])];
  for (const pin of pins) {
    const e = m.files.find((f) => f.path === pin.path);
    check(e && e.bytes === pin.bytes && e.sha256 === pin.sha256, `manifest の ${pin.path} が固定値と違います`);
  }
}

export const handoffText = (brief) => [...HANDOFF_HEAD, JSON.stringify(brief, null, 2)].join('\n');

function buildBundle(manifest, bytes) {
  const text = (p) => decodeText(bytes.get(p), p);
  const json = (p) => parseJson(p, text(p));
  const structure = json('concept/structure.json');
  const requests = json('inputs/requests.json');
  const samples = json('samples.json');
  const request = text('request.txt');
  const license = text('vendor/brief-to-demo/LICENSE');
  const skillLines = text(SKILL_PATH).split(/\r?\n/);

  check(structure && structure.format === 'brief-to-demo-structure/v1' && structure.case_id === CASE_ID && structure.source_commit === SOURCE_COMMIT, 'concept/structure.json の形式か固定版が違います');
  check(license.startsWith('MIT License') && license.includes('Copyright (c) 2026 Studio Yebisu'), 'LICENSE が MIT License（八百万図AIツールボックス）ではありません');
  check(samples && samples.model === 'claude-opus-5-5' && sameList(ids(samples.samples), JOB_IDS), 'samples.json の3件が違います');
  check(requests && requests.format === 'brief-inputs/v1' && requests.case_id === CASE_ID && sameList(ids(requests.samples), JOB_IDS), 'inputs/requests.json の3件が違います');
  check(sameList(ids(structure.jobs), JOB_IDS), 'concept/structure.json の3件のIDが違います');

  // 原典の11項目：SKILL.md 13行目のJSONそのもの
  let schema = null;
  try { schema = JSON.parse(skillLines[12] || ''); } catch { fail('SKILL.md の13行目がJSONとして読めません'); }
  check(sameList(Object.keys(schema), KEYS), 'SKILL.md の11項目が固定の順序と違います');
  check(sameList(String(schema.category).split(' | '), CATEGORY_IDS), 'SKILL.md の分野の4つが違います');
  check(sameList(ids(structure.fields), KEYS), 'concept/structure.json の11項目が違います');
  for (const f of structure.fields) {
    check(isStr(f.label) && f.source_path === SKILL_PATH && f.line_start === 13 && deepEqual(f.schema_example, schema[f.id])
      && skillLines[12].includes(`"${f.id}":${JSON.stringify(f.schema_example)}`), `${f.id} の引用が SKILL.md の13行目と違います`);
  }
  const groups = structure.field_groups;
  check(sameList(ids(groups), GROUP_IDS) && groups.every((g, i) => isStr(g.label) && Array.isArray(g.fields) && g.fields.length === GROUP_SIZES[i])
    && sameList(groups.flatMap((g) => g.fields), KEYS), '説明用の4つのまとまりが11項目と合いません');
  for (const g of groups) for (const k of g.fields) check(structure.fields.find((f) => f.id === k).group === g.id, `${k} のまとまりが違います`);
  const cats = structure.categories;
  check(sameList(ids(cats), CATEGORY_IDS) && cats.every((c, i) => isStr(c.label) && c.saved_example === (i < 3)), '分野の4つの記録が違います');

  check(sameList(ids(structure.parts), PART_IDS), 'concept/structure.json の6つの部分が違います');
  check(sameList(ids(structure.rules), RULE_IDS), 'concept/structure.json の3つの決まりが違います');
  for (const x of [...structure.parts, ...structure.rules]) {
    check(isStr(x.label) && isStr(x.meaning) && isStr(x.quote) && x.source_path === SKILL_PATH && Number.isInteger(x.line_start)
      && x.line_start >= 1 && (skillLines[x.line_start - 1] || '').includes(x.quote), `${x.id} の引用が SKILL.md の${x.line_start}行目にありません`);
  }
  const c = structure.counts || {};
  check(c.jobs === 3 && c.schema_fields === 11 && c.proposed_inputs === 9 && c.planned_steps === 15 && c.planned_acceptance === 15 && c.assumptions === 12, 'concept/structure.json の件数が違います');
  const g = structure.guardrails || {};
  check(g.new_original_brief_generation === false && g.live_ai_in_browser === false && g.next_production_executed === false
    && g.human_approval === false && g.quality_guarantee === false && g.original_parent_slide_route_adjustment === true, 'concept/structure.json の範囲の記録が違います');

  const head = norm(HANDOFF_HEAD.join('\n'));
  const jobs = {};
  JOB_IDS.forEach((id, i) => {
    const s = structure.jobs[i], sm = samples.samples[i], rq = requests.samples[i], brief = s.brief, pin = OUTPUTS[id];
    check(isStr(s.label) && s.label === sm.label && deepEqual(s.route, sm.route) && deepEqual(brief, sm.brief), `${id} が samples.json と違います`);
    check(sameList(Object.keys(brief), KEYS) && sameList(Object.keys(sm.brief), KEYS), `${id} の11項目の順序が違います`);
    check(isStr(brief.request) && brief.request === s.original_request && brief.request === rq.request, `${id} の元の依頼が保存先ごとに違います`);
    check(isStr(rq.available_materials) && rq.available_materials.startsWith('No concrete'), `${id} の素材の記録が違います`);
    check(brief.category === CATEGORY_IDS[i], `${id} の分野が違います`);
    for (const k of ['title', 'audience', 'goal']) check(isStr(brief[k]), `${id} の ${k} が読めません`);
    for (const k of ['inputs', 'skill_refs', 'deliverables', 'steps', 'acceptance', 'assumptions']) {
      check(Array.isArray(brief[k]) && brief[k].length > 0 && brief[k].every(isStr), `${id} の ${k} が読めません`);
    }
    for (const [k, n] of Object.entries(LIST_COUNTS)) check(brief[k].length === n, `${id} の ${k} が${n}件ではありません`);
    const skill = s.route && Array.isArray(s.route.skills) && s.route.skills.length === 1 ? s.route.skills[0] : null;
    check(skill && isStr(skill.name) && isStr(skill.ref) && isStr(skill.why) && brief.skill_refs.includes(skill.ref) && isStr(s.route.category_label) && isStr(s.route.reason), `${id} の読むスキルの記録が違います`);
    check(s.inputs_are_materials_to_obtain === true && s.acceptance_is_future_plan_not_verified === true && s.next_production_executed === false, `${id} の範囲の記録が違います`);
    check(deepEqual(s.output_file, pin.json) && deepEqual(s.handoff_file, pin.handoff), `${id} の出力ファイルの記録が違います`);
    const outText = text(pin.json.path);
    const out = parseJson(pin.json.path, outText);
    check(deepEqual(out, brief) && sameList(Object.keys(out), KEYS), `${pin.json.path} の中身が保存済みのブリーフと違います`);
    const hand = text(pin.handoff.path);
    // 今回の保存ファイルはWindows改行。CRLFだけLFへそろえ、旧handoffTextと空白を含めて同一内容を照合。
    check(hand.replace(/\r\n/g, '\n') === handoffText(brief), `${pin.handoff.path} が以前のビューアの引き継ぎ文と違います`);
    const unset = UNSET[id];
    check(brief.assumptions[unset.index].includes(unset.text), `${id} の図の「未提供」の言い回しが保存済みの assumptions にありません`);
    const category = cats.find((x) => x.id === brief.category);
    jobs[id] = {
      id, label: s.label, brief, route: s.route, skill, categoryLabel: category.label,
      provenance: s.source_provenance, unset,
      json: {...pin.json, url: assetUrl(pin.json.path), download: `brief-to-demo-${id}.json`, text: outText},
      handoff: {...pin.handoff, url: assetUrl(pin.handoff.path), text: hand},
    };
  });
  for (const k of HANDOFF_KEYS) check(head.includes(k), '引き継ぎ文の前置きが違います');
  check(request.includes('skills/brief-to-demo/SKILL.md') && request.includes(`依頼：${jobs.ui.brief.request}`), 'request.txt の依頼文が違います');

  const lineRef = (x) => ({...x, url: assetUrl(x.source_path), lineUrl: `${UPSTREAM_SKILL_URL}#L${x.line_start}`});
  const groupOf = Object.fromEntries(groups.flatMap((gr) => gr.fields.map((k) => [k, gr.label])));
  const fields = structure.fields.map((f) => ({...lineRef(f), groupLabel: groupOf[f.id]}));
  return {
    manifest, request, jobs,
    fields, fieldMap: Object.fromEntries(fields.map((f) => [f.id, f])),
    groups: groups.map((gr) => ({id: gr.id, label: gr.label, fields: gr.fields})),
    categories: cats.map((x) => ({id: x.id, label: x.label, saved: x.saved_example})),
    parts: structure.parts.map(lineRef), rules: structure.rules.map(lineRef),
    definition: structure.definition, groupingNote: structure.grouping_note,
  };
}

// 12件をすべて取り直し、大きさとSHA-256、中身の対応を確かめた記録だけを返す。どれか一つでも違えば例外。
export async function loadValidatedAssets({signal, onProgress} = {}) {
  const inner = new AbortController();
  const relay = () => inner.abort();
  if (signal?.aborted) inner.abort();
  signal?.addEventListener('abort', relay, {once: true});
  let failed = false;
  try {
    const manifestBytes = await fetchBytes(MANIFEST_PATH, inner.signal);
    check((await sha256Hex(manifestBytes)) === MANIFEST_SHA256, 'concept/manifest.json のSHA-256が固定値と違います');
    const manifest = parseJson(MANIFEST_PATH, decodeText(manifestBytes, MANIFEST_PATH));
    validateManifest(manifest);
    const bytes = new Map();
    let done = 0;
    onProgress?.(0, manifest.files.length);
    await Promise.all(manifest.files.map(async (entry) => {
      try {
        const body = await fetchBytes(entry.path, inner.signal);
        check(body.byteLength === entry.bytes, `${entry.path} の大きさが記録と違います`);
        check((await sha256Hex(body)) === entry.sha256, `${entry.path} のSHA-256が記録と違います`);
        bytes.set(entry.path, body);
      } catch (error) {
        if (!failed) { failed = true; inner.abort(); }
        throw error;
      }
      if (!failed) onProgress?.(++done, manifest.files.length);
    }));
    if (signal?.aborted) throw new DOMException('aborted', 'AbortError');
    return deepFreeze(buildBundle(manifest, bytes));
  } finally {
    signal?.removeEventListener('abort', relay);
  }
}

// ---------- 概念図（ページと図解動画で共通） ----------
// 指示書の本（3つの決まり）＋受け取った依頼文1枚 → 1つのAI → 同じ紙が11項目のブリーフに開く
// → 未指定・仮の条件は別のポケット → 分野と読むスキル → 保存済みのJSONと引き継ぎ文 → 次の制作（点線・未実行）。

export const FONT = Object.freeze({
  sans: '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic UI", "Yu Gothic", YuGothic, Meiryo, "Noto Sans JP", sans-serif',
  mincho: '"Hiragino Mincho ProN", "Yu Mincho", YuMincho, "BIZ UDPMincho", "Noto Serif JP", serif',
});
export const PALETTES = Object.freeze({
  light: Object.freeze({bg: '#f2eee3', sheet: '#fbf9f3', ink: '#17150f', muted: '#565042', rule: '#cdc4b0', signal: '#ff4f00', signalInk: '#a63600', onSignal: '#17150f', tint: 'rgba(255,79,0,0.11)', hatch: 'rgba(23,21,15,0.15)', desk: '#17150f', deskInk: '#f2eee3'}),
  dark: Object.freeze({bg: '#16140f', sheet: '#221f18', ink: '#efe9dc', muted: '#bdb4a2', rule: '#4d463a', signal: '#ff6b2b', signalInk: '#ff9a66', onSignal: '#17150f', tint: 'rgba(255,107,43,0.16)', hatch: 'rgba(239,233,220,0.15)', desk: '#efe9dc', deskInk: '#16140f'}),
});

const TALL = {
  nodes: {
    book: [0.03, 0.012, 0.45, 0.20], tray: [0.52, 0.012, 0.45, 0.20],
    ai: [0.03, 0.25, 0.94, 0.075],
    packet: [0.03, 0.37, 0.69, 0.32], pocket: [0.755, 0.37, 0.215, 0.32],
    route: [0.03, 0.725, 0.94, 0.06],
    json: [0.03, 0.825, 0.27, 0.16], handoff: [0.33, 0.825, 0.30, 0.16], next: [0.67, 0.825, 0.30, 0.16],
  },
  edges: {
    bookIn: [[0.255, 0.212], [0.255, 0.25]],
    reqIn: [[0.745, 0.212], [0.745, 0.25]],
    open: [[0.375, 0.325], [0.375, 0.37]],
    route: [[0.375, 0.69], [0.375, 0.725]],
    toJson: [[0.165, 0.785], [0.165, 0.825]],
    toHandoff: [[0.48, 0.785], [0.48, 0.825]],
    handNext: [[0.63, 0.905], [0.67, 0.905]],
    routeNext: [[0.82, 0.785], [0.82, 0.825]],
  },
};
const WIDE = {
  nodes: {
    book: [0.01, 0.03, 0.18, 0.44], tray: [0.01, 0.53, 0.18, 0.44],
    ai: [0.225, 0.22, 0.125, 0.56],
    packet: [0.39, 0.03, 0.33, 0.64], pocket: [0.39, 0.72, 0.33, 0.25],
    route: [0.76, 0.03, 0.225, 0.21],
    json: [0.76, 0.30, 0.225, 0.15], handoff: [0.76, 0.49, 0.225, 0.17], next: [0.76, 0.72, 0.225, 0.25],
  },
  edges: {
    bookIn: [[0.19, 0.25], [0.2075, 0.25], [0.2075, 0.40], [0.225, 0.40]],
    reqIn: [[0.19, 0.75], [0.2075, 0.75], [0.2075, 0.60], [0.225, 0.60]],
    open: [[0.35, 0.35], [0.39, 0.35]],
    route: [[0.72, 0.135], [0.76, 0.135]],
    toJson: [[0.72, 0.375], [0.76, 0.375]],
    toHandoff: [[0.72, 0.575], [0.76, 0.575]],
    handNext: [[0.8725, 0.66], [0.8725, 0.72]],
    routeNext: [[0.985, 0.20], [0.995, 0.20], [0.995, 0.845], [0.985, 0.845]],
  },
};
const EDGE_GROUP = {bookIn: 'in', reqIn: 'in', open: 'open', route: 'route', toJson: 'out', toHandoff: 'out', handNext: 'future', routeNext: 'future'};
export const ALL_EDGES = Object.freeze(Object.keys(EDGE_GROUP));
export const ACTUAL_EDGES = Object.freeze(ALL_EDGES.filter((k) => EDGE_GROUP[k] !== 'future'));
// 「6つの部分」と「3つの決まり」を選んだときに枠を付ける場所
export const PART_NODES = Object.freeze({manual: ['book'], input: ['tray'], category: ['route'], schema: ['packet'], assumptions: ['pocket'], handoff: ['json', 'handoff', 'next']});
const RULE_NODES = {'by-result': ['route'], 'no-facts': ['tray', 'pocket'], separate: ['pocket']};

export function chooseKind(W, H) { return W >= 640 && W / H >= 1.3 ? 'wide' : 'tall'; }

export function conceptLayout(kind, W, H) {
  const spec = kind === 'wide' ? WIDE : TALL;
  const n = {};
  for (const [k, [x, y, w, h]] of Object.entries(spec.nodes)) n[k] = {x: x * W, y: y * H, w: w * W, h: h * H};
  const e = {};
  for (const [k, pts] of Object.entries(spec.edges)) e[k] = pts.map(([x, y]) => [x * W, y * H]);
  const u = kind === 'wide' ? Math.min(W / 70, H / 31) : Math.min(W / 25, H / 40);
  const f = {label: u * 0.95, small: Math.max(10, u * 0.76), big: u * 1.5};
  const t = n.tray;
  const head = Math.min(f.small * 1.9, t.h * 0.18);
  n.paper0 = {x: t.x + u * 0.4, y: t.y + head + u * 0.15, w: t.w - u * 0.8, h: t.h * 0.56};
  const matY = n.paper0.y + n.paper0.h + u * 0.3;
  n.mat = {x: t.x + u * 0.4, y: matY, w: t.w - u * 0.8, h: Math.max(u * 0.8, t.y + t.h - u * 0.3 - matY)};
  const a = n.ai;
  n.aiSpot = kind === 'wide'
    ? {x: a.x + u * 0.5, y: a.y + a.h * 0.32, w: a.w - u, h: a.h * 0.6}
    : {x: a.x + a.w * 0.3, y: a.y + u * 0.25, w: a.w * 0.68, h: a.h - u * 0.5};
  const pk = n.packet, po = n.pocket;
  n.pocketHome = kind === 'wide'
    ? {x: po.x + u * 0.4, y: pk.y + pk.h - po.h * 0.55, w: po.w - u * 0.8, h: po.h * 0.6}
    : {x: pk.x + pk.w - po.w * 0.55, y: po.y + u * 0.4, w: po.w * 0.6, h: po.h - u * 0.8};
  return {kind, W, H, u, f, n, e};
}

// 既定は完成した姿。ページの段階と動画は、ここから値を変える。
export function restParams() {
  return {
    show: {}, emph: {}, emphEdge: {}, draw: {}, flow: {},
    s: 2, fill: 1, groupFill: [1, 1, 1], pocketOut: 1, pins: 4, unset: 1,
    rules: 3, bookOpen: 1, route: 1, skillName: 1, outputs: 1, next: 1,
    trayGlow: 0, slotGlow: {}, ruleGlow: {},
    focusPart: null, focusRule: null, focusField: null,
  };
}

// ページの段階：τ=1 読む、τ=2 組む、τ=3 渡す。τの途中は動きの途中。
const STAGE_NODES = {
  book: [1, 0, 0], tray: [1, 0, 0], ai: [1, 1, 0], packet: [0, 1, 1], pocket: [0, 1, 0],
  route: [0, 0, 1], json: [0, 0, 1], handoff: [0, 0, 1], next: [0, 0, 1],
};
const STAGE_EDGES = {in: [1, 0, 0], open: [0, 1, 0], route: [0, 0, 1], out: [0, 0, 1], future: [0, 0, 1]};
export function storyParams(tau) {
  const p = restParams();
  p.bookOpen = 0.6 + 0.4 * easeOut(prog(tau, 0, 0.4));
  p.s = ease(prog(tau, 0.3, 0.95)) + ease(prog(tau, 1.05, 1.6));
  p.fill = easeOut(prog(tau, 1.35, 1.7));
  p.groupFill = [easeOut(prog(tau, 1.4, 1.6)), easeOut(prog(tau, 1.5, 1.7)), easeOut(prog(tau, 1.6, 1.8))];
  p.pocketOut = prog(tau, 1.55, 1.9);
  p.pins = 4 * prog(tau, 1.65, 1.95);
  p.unset = easeOut(prog(tau, 1.8, 2.0));
  p.route = easeOut(prog(tau, 2.05, 2.35));
  p.skillName = easeOut(prog(tau, 2.2, 2.45));
  p.outputs = easeOut(prog(tau, 2.4, 2.75));
  p.next = easeOut(prog(tau, 2.6, 2.95));
  p.flow.bookIn = p.flow.reqIn = prog(tau, 0.05, 0.5) * (1 - prog(tau, 1.1, 1.4));
  p.flow.open = prog(tau, 1.0, 1.4) * (1 - prog(tau, 2.1, 2.3));
  p.flow.route = prog(tau, 2.05, 2.3);
  p.flow.toJson = p.flow.toHandoff = prog(tau, 2.35, 2.65);
  const w =[tau <= 1 ? 1 : clamp01(2 - tau), clamp01(1 - Math.abs(tau - 2)), clamp01(tau - 2)];
  const weight = (m) => Math.max(m[0] * w[0], m[1] * w[1], m[2] * w[2]);
  for (const [k, m] of Object.entries(STAGE_NODES)) p.emph[k] = 0.72 + 0.28 * weight(m);
  for (const [k, m] of Object.entries(STAGE_EDGES)) p.emphEdge[k] = 0.72 + 0.28 * weight(m);
  return p;
}

// ---- 描画の部品 ----
function rr(c, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
function alpha(c, a, fn) {
  if (a <= 0.001) return;
  c.save();
  c.globalAlpha *= Math.min(1, a);
  fn();
  c.restore();
}
// 幅 max に収まるまで文字を小さくして描く。描いた幅を返す。
export function drawText(c, s, x, y, o = {}) {
  const weight = o.weight || 400, family = o.family || FONT.sans;
  let size = o.size || 14;
  const min = Math.min(size, o.min || 9);
  c.font = `${weight} ${size}px ${family}`;
  let w = c.measureText(s).width;
  if (o.max > 0) {
    while (w > o.max && size > min) {
      size = Math.max(min, size - 0.5);
      c.font = `${weight} ${size}px ${family}`;
      w = c.measureText(s).width;
    }
  }
  c.fillStyle = o.color || '#000';
  c.textAlign = o.align || 'left';
  c.textBaseline = o.base || 'middle';
  c.fillText(s, x, y);
  return w;
}
const NO_BREAK_BEFORE = '、。，．」』）・ー';
function wrapLines(c, s, maxW) {
  const out = [];
  let line = '';
  for (const ch of s) {
    const next = line + ch;
    if (line && c.measureText(next).width > maxW && !NO_BREAK_BEFORE.includes(ch)) { out.push(line); line = ch; } else line = next;
  }
  if (line) out.push(line);
  return out;
}
// 枠 r に収まるまで文字を小さくし、文字単位で折り返して描く
export function drawWrapped(c, s, r, o = {}) {
  const family = o.family || FONT.sans, weight = o.weight || 400, lh = o.lh || 1.4, maxLines = o.maxLines || 99;
  let size = o.size || 14;
  const min = Math.min(size, o.min || 8);
  let lines = [];
  for (let guard = 0; guard < 80; guard++) {
    c.font = `${weight} ${size}px ${family}`;
    lines = wrapLines(c, s, Math.max(1, r.w));
    if ((lines.length <= maxLines && lines.length * size * lh <= r.h + 0.5) || size <= min) break;
    size = Math.max(min, size - 0.5);
  }
  const room = Math.max(1, Math.min(maxLines, Math.floor((r.h + 0.5) / (size * lh)) || 1));
  if (lines.length > room) { lines = lines.slice(0, room); lines[room - 1] = lines[room - 1].slice(0, -1) + '…'; }
  c.fillStyle = o.color || '#000';
  c.textAlign = o.align || 'left';
  c.textBaseline = 'middle';
  const x = o.align === 'center' ? r.x + r.w / 2 : r.x;
  const total = lines.length * size * lh;
  const y0 = (o.valign === 'middle' ? r.y + (r.h - total) / 2 : r.y) + (size * lh) / 2;
  lines.forEach((ln, i) => c.fillText(ln, x, y0 + i * size * lh));
  return {lines: lines.length, size, height: total};
}
function segments(pts) {
  const list = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const len = Math.hypot(x1 - x0, y1 - y0);
    list.push({x0, y0, x1, y1, len});
    total += len;
  }
  return {list, total};
}
function strokePath(c, pts, k, o) {
  if (k <= 0.001) return;
  const {list, total} = segments(pts);
  let d = clamp01(k) * total;
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  let end = {x: pts[0][0], y: pts[0][1], a: 0};
  for (const s of list) {
    if (d <= 0) break;
    const q = Math.min(1, d / (s.len || 1));
    const x = s.x0 + (s.x1 - s.x0) * q, y = s.y0 + (s.y1 - s.y0) * q;
    c.lineTo(x, y);
    end = {x, y, a: Math.atan2(s.y1 - s.y0, s.x1 - s.x0)};
    d -= s.len;
  }
  c.strokeStyle = o.color;
  c.lineWidth = o.width;
  c.lineJoin = 'round';
  c.lineCap = 'round';
  c.setLineDash(o.dash || []);
  c.stroke();
  c.setLineDash([]);
  if (o.head > 0) {
    const h = o.head;
    c.beginPath();
    c.moveTo(end.x, end.y);
    c.lineTo(end.x - h * Math.cos(end.a - 0.45), end.y - h * Math.sin(end.a - 0.45));
    c.lineTo(end.x - h * Math.cos(end.a + 0.45), end.y - h * Math.sin(end.a + 0.45));
    c.closePath();
    c.fillStyle = o.color;
    c.fill();
  }
}
function dashed(c, u, on) { c.setLineDash(on ? [u * 0.28, u * 0.2] : []); }

function paperShape(c, r, pal, u, o = {}) {
  const fold = Math.min(u * 0.7, r.w * 0.22, r.h * 0.3);
  c.beginPath();
  c.moveTo(r.x, r.y);
  c.lineTo(r.x + r.w - fold, r.y);
  c.lineTo(r.x + r.w, r.y + fold);
  c.lineTo(r.x + r.w, r.y + r.h);
  c.lineTo(r.x, r.y + r.h);
  c.closePath();
  c.fillStyle = o.fill || pal.sheet;
  c.fill();
  dashed(c, u, o.dashed);
  c.strokeStyle = o.stroke || pal.ink;
  c.lineWidth = o.lw || 1.2;
  c.stroke();
  c.setLineDash([]);
  c.beginPath();
  c.moveTo(r.x + r.w - fold, r.y);
  c.lineTo(r.x + r.w - fold, r.y + fold);
  c.lineTo(r.x + r.w, r.y + fold);
  c.stroke();
  return fold;
}
function hatch(c, r, color, step, radius) {
  c.save();
  rr(c, r.x, r.y, r.w, r.h, radius);
  c.clip();
  c.strokeStyle = color;
  c.lineWidth = 1;
  c.beginPath();
  for (let x = r.x - r.h; x < r.x + r.w; x += step) { c.moveTo(x, r.y + r.h); c.lineTo(x + r.h, r.y); }
  c.stroke();
  c.restore();
}
function focusBox(c, L, r, pal) {
  const pad = L.u * 0.22;
  rr(c, r.x - pad, r.y - pad, r.w + pad * 2, r.h + pad * 2, L.u * 0.35);
  c.setLineDash([]);
  c.strokeStyle = pal.signal;
  c.lineWidth = 2.5;
  c.stroke();
}
const val = (o, k, dflt) => (o && o[k] !== undefined ? o[k] : dflt);

// 指示書の本：SKILL.md と3つの決まり
function drawBook(c, L, p, d, pal) {
  const {u, f} = L, r = L.n.book;
  const headH = Math.min(f.label * 1.8, r.h * 0.22);
  rr(c, r.x, r.y, r.w, headH, u * 0.2);
  c.fillStyle = pal.ink;
  c.fill();
  const nw = drawText(c, 'SKILL.md', r.x + u * 0.45, r.y + headH / 2, {size: f.label, weight: 700, color: pal.bg, max: r.w * 0.5});
  drawText(c, 'brief-to-demo', r.x + r.w - u * 0.45, r.y + headH / 2, {size: f.small * 0.92, color: pal.bg, align: 'right', max: r.w - nw - u * 1.4, min: 7});
  const top = r.y + headH + u * 0.3, bot = r.y + r.h;
  const cx = r.x + r.w / 2, half = (r.w / 2) * (0.7 + 0.3 * clamp01(p.bookOpen));
  for (const side of [-1, 1]) {
    c.beginPath();
    c.moveTo(cx, top + u * 0.25);
    c.quadraticCurveTo(cx + side * half * 0.5, top - u * 0.12, cx + side * half, top + u * 0.05);
    c.lineTo(cx + side * half, bot);
    c.quadraticCurveTo(cx + side * half * 0.5, bot - u * 0.3, cx, bot - u * 0.05);
    c.closePath();
    c.fillStyle = pal.sheet;
    c.fill();
    c.strokeStyle = pal.ink;
    c.lineWidth = 1.2;
    c.stroke();
  }
  const x0 = cx - half + u * 0.35, w = 2 * half - u * 0.7;
  const capY = top + u * 0.35 + f.small * 0.55;
  c.fillStyle = pal.sheet; c.fillRect(cx - f.small * 4.5, capY - f.small * 0.65, f.small * 9, f.small * 1.3);
  drawText(c, 'AIが読む指示書', cx, capY, {size: f.small, weight: 700, color: pal.muted, align: 'center', max: w});
  const areaTop = capY + f.small * 0.85, areaBot = bot - u * 0.45;
  const gap = u * 0.22;
  const slipH = Math.max(f.small * 1.2, Math.min(f.label * 1.75, (areaBot - areaTop - gap * 2) / 3));
  d.rules.forEach((rule, i) => {
    const a = clamp01(p.rules - i);
    if (a <= 0) return;
    const y = areaTop + i * (slipH + gap);
    const on = p.focusRule === rule.id;
    const glow = clamp01(val(p.ruleGlow, rule.id, 0));
    alpha(c, a, () => {
      // 本の綴じ目がルールの文字を貫かないよう、札には不透明な紙を敷く。
      c.fillStyle = pal.sheet;
      c.fillRect(x0, y, w, slipH);
      c.fillStyle = on ? pal.signal : pal.tint;
      c.fillRect(x0, y, w, slipH);
      if (glow > 0 && !on) alpha(c, glow, () => { c.fillStyle = pal.signal; c.fillRect(x0, y, w, slipH); });
      c.fillStyle = pal.signal;
      c.fillRect(x0, y, Math.max(2, u * 0.18), slipH);
      const lit = on || glow > 0.5;
      drawText(c, rule.label, x0 + u * 0.45, y + slipH / 2, {size: Math.min(f.label * 0.92, slipH * 0.62), weight: 700, color: lit ? pal.onSignal : pal.ink, max: w - u * 0.6, min: 7});
    });
  });
}

// 受け取ったもの：短い依頼文1枚だけ。素材はこの例では受け取っていない。
function drawTray(c, L, p, pal) {
  const {u, f, n} = L, r = n.tray;
  const glow = clamp01(p.trayGlow);
  rr(c, r.x, r.y, r.w, r.h, u * 0.25);
  c.strokeStyle = glow > 0.01 ? pal.signal : pal.rule;
  c.lineWidth = 1.2 + 1.4 * glow;
  c.stroke();
  drawText(c, '受け取ったもの', r.x + u * 0.4, (r.y + n.paper0.y) / 2, {size: f.small, weight: 700, color: pal.ink, max: r.w - u * 0.8});
  const gk = clamp01(p.s * 4);
  if (gk > 0) alpha(c, gk * 0.9, () => {
    paperShape(c, n.paper0, pal, u, {dashed: true, fill: 'rgba(0,0,0,0)', stroke: pal.muted});
    drawText(c, '依頼文1枚', n.paper0.x + n.paper0.w / 2, n.paper0.y + n.paper0.h / 2, {size: f.small, color: pal.muted, align: 'center', max: n.paper0.w - u * 0.6});
  });
  const m = n.mat;
  rr(c, m.x, m.y, m.w, m.h, u * 0.15);
  dashed(c, u, true);
  c.strokeStyle = pal.muted;
  c.lineWidth = 1;
  c.stroke();
  c.setLineDash([]);
  drawText(c, '素材：この例ではなし', m.x + u * 0.3, m.y + m.h / 2, {size: Math.min(f.small, m.h * 0.7), color: pal.muted, max: m.w - u * 0.6, min: 7});
}

// 1つのAI：指示書と依頼を読んで、ブリーフを書く
function drawDesk(c, L, pal) {
  const {u, f, kind} = L, r = L.n.ai;
  rr(c, r.x, r.y, r.w, r.h, u * 0.35);
  c.fillStyle = pal.desk;
  c.fill();
  const s = L.n.aiSpot;
  if (kind === 'wide') {
    const aw = drawText(c, 'AI', r.x + u * 0.5, r.y + Math.min(r.h * 0.13, f.big), {size: f.big, weight: 700, color: pal.deskInk});
    drawText(c, '1つ', r.x + u * 0.8 + aw, r.y + Math.min(r.h * 0.13, f.big), {size: f.small, weight: 700, color: pal.deskInk, max: r.w - aw - u * 1.3});
    drawWrapped(c, '指示書と依頼を読んで書く', {x: r.x + u * 0.5, y: r.y + Math.min(r.h * 0.13, f.big) + f.big * 0.6, w: r.w - u, h: s.y - r.y - Math.min(r.h * 0.13, f.big) - f.big * 0.6 - u * 0.2}, {size: f.small, color: pal.deskInk, maxLines: 2, min: 7});
  } else {
    const big = Math.min(f.big, r.h * 0.62);
    const aw = drawText(c, 'AI', r.x + u * 0.55, r.y + r.h / 2, {size: big, weight: 700, color: pal.deskInk});
    drawText(c, '読んで書く', r.x + u * 0.85 + aw, r.y + r.h / 2, {size: f.small, color: pal.deskInk, max: s.x - (r.x + u * 1.1 + aw), min: 7});
  }
  alpha(c, 0.45, () => {
    dashed(c, u, true);
    c.strokeStyle = pal.deskInk;
    c.lineWidth = 1;
    c.strokeRect(s.x, s.y, s.w, s.h);
    c.setLineDash([]);
  });
}

// ブリーフの袋：元の依頼の帯と、説明用の3つのまとまりに並ぶ10の区画（11項目めは別のポケット）
function packetGeom(L, d) {
  const {u, f, kind, n, e} = L, r = n.packet, pad = u * 0.4;
  const wide = kind === 'wide';
  const top = wide ? r.y + pad + f.small * 1.5 : r.y + pad * 0.7;
  const labelPos = wide ? {x: r.x + pad, y: r.y + pad + f.small * 0.6} : {x: r.x, y: (n.ai.y + n.ai.h + r.y) / 2};
  const labelMax = wide ? r.w - pad * 2 : e.open[0][0] - r.x - u * 0.5;
  const headerH = r.h * (wide ? 0.17 : 0.2);
  const header = {x: r.x + pad, y: top, w: r.w - pad * 2, h: headerH};
  const rowsTop = top + headerH + u * 0.35;
  const rowH = (r.y + r.h - pad * 0.6 - rowsTop) / 3;
  const groups = d.groups.slice(0, 3).map((g, gi) => {
    const y = rowsTop + gi * rowH;
    const sy = y + f.small * 1.45, sh = Math.max(u * 0.9, rowH - f.small * 1.45 - u * 0.3);
    const gap = u * 0.25, count = g.fields.length;
    const sw = (r.w - pad * 2 - gap * (count - 1)) / count;
    return {
      id: g.id, label: g.label, count, labelPos: {x: r.x + pad, y: y + f.small * 0.7},
      slots: g.fields.map((key, i) => ({key, r: {x: r.x + pad + i * (sw + gap), y: sy, w: sw, h: sh}})),
    };
  });
  return {labelPos, labelMax, header, groups};
}

function glyphRow(area, count, g) {
  const step = count > 1 ? Math.min(g * 1.55, (area.w - g) / (count - 1)) : g;
  return {step, used: count > 0 ? (count - 1) * step + g : 0};
}
function drawMarks(c, L, key, job, area, pal) {
  const {u, f} = L, v = job.brief[key];
  const g = Math.max(4, Math.min(area.h, u * 0.62));
  const count = Array.isArray(v) ? v.length : 0;
  const y = area.y + (area.h - g) / 2, cy = area.y + area.h / 2;
  c.lineWidth = 1;
  c.setLineDash([]);
  let used = 0, tag = '';
  if (key === 'title' || key === 'audience' || key === 'goal') {
    for (const [k, w] of [[0.3, 0.82], [0.75, 0.55]]) {
      c.beginPath();
      c.moveTo(area.x, area.y + area.h * k);
      c.lineTo(area.x + area.w * w, area.y + area.h * k);
      c.strokeStyle = pal.ink;
      c.stroke();
    }
    return;
  }
  if (key === 'request') {
    paperShape(c, {x: area.x, y, w: g * 0.8, h: g}, pal, g * 0.5, {stroke: pal.signal, lw: 1.2});
    used = g * 0.8;
    tag = '同じ紙';
  } else if (key === 'category') {
    c.font = `700 ${Math.max(7, Math.min(f.small * 0.85, area.h * 0.95))}px ${FONT.sans}`;
    const w = Math.min(area.w, c.measureText(job.categoryLabel).width + u * 0.5);
    rr(c, area.x, area.y, w, area.h, u * 0.1);
    c.fillStyle = pal.signal;
    c.fill();
    drawText(c, job.categoryLabel, area.x + w / 2, cy, {size: Math.max(7, Math.min(f.small * 0.85, area.h * 0.95)), weight: 700, color: pal.onSignal, align: 'center', max: w - u * 0.2, min: 6});
    return;
  } else {
    const {step} = glyphRow(area, count, g);
    for (let i = 0; i < count; i++) {
      const x = area.x + i * step;
      c.strokeStyle = pal.ink;
      if (key === 'inputs') {
        dashed(c, g * 2.2, true);
        c.strokeRect(x, y, g * 0.8, g);
        c.setLineDash([]);
      } else if (key === 'skill_refs') {
        c.strokeRect(x, y, g * 0.4, g);
        c.strokeRect(x + g * 0.4, y, g * 0.4, g);
      } else if (key === 'deliverables') {
        c.strokeRect(x, y + g * 0.15, g, g * 0.7);
      } else if (key === 'steps') {
        c.beginPath();
        c.arc(x + g / 2, cy, g * 0.38, 0, Math.PI * 2);
        c.stroke();
      } else if (key === 'acceptance') {
        c.strokeRect(x + g * 0.1, y + g * 0.1, g * 0.8, g * 0.8);
      }
    }
    used = glyphRow(area, count, g).used;
    tag = {inputs: '未受領', skill_refs: '次に読む', deliverables: '計画', steps: '計画', acceptance: '未確認'}[key] || '';
  }
  const tx = area.x + used + u * 0.3, room = area.x + area.w - tx;
  const ts = Math.max(7, Math.min(f.small * 0.82, area.h * 1.05));
  if (tag && room >= ts * 1.6) drawText(c, tag, tx, cy, {size: ts, color: pal.signalInk, weight: 700, max: room, min: 6});
}

function drawSlot(c, L, slot, job, d, k, pal, focused, glow) {
  const {u, f} = L, r = slot.r, key = slot.key;
  rr(c, r.x, r.y, r.w, r.h, u * 0.12);
  c.fillStyle = pal.bg;
  c.fill();
  if (k > 0) alpha(c, k, () => { c.fillStyle = pal.sheet; c.fill(); });
  if (glow > 0) alpha(c, glow, () => { c.fillStyle = pal.tint; c.fill(); });
  dashed(c, u, k < 0.5);
  c.strokeStyle = focused || glow > 0.5 ? pal.signal : k < 0.5 ? pal.muted : pal.ink;
  c.lineWidth = focused ? 2.6 : 1 + glow * 1.2;
  c.stroke();
  c.setLineDash([]);
  const v = job.brief[key];
  const count = Array.isArray(v) ? v.length : 0;
  const ly = r.y + Math.min(r.h * 0.32, f.small * 0.95);
  let cw = 0;
  if (count && k > 0) alpha(c, k, () => { cw = drawText(c, String(count), r.x + r.w - u * 0.25, ly, {size: f.small, weight: 700, color: pal.signalInk, align: 'right'}); });
  drawText(c, d.fieldMap[key].label, r.x + u * 0.25, ly, {size: f.small, weight: k > 0.5 ? 700 : 400, color: k > 0.5 ? pal.ink : pal.muted, max: r.w - u * 0.6 - (cw ? cw + u * 0.2 : 0), min: 7});
  const area = {x: r.x + u * 0.25, y: r.y + r.h * 0.56, w: r.w - u * 0.5, h: Math.min(r.h * 0.34, u * 0.9)};
  if (k > 0) alpha(c, k, () => drawMarks(c, L, key, job, area, pal));
}

function drawPacket(c, L, p, d, job, pal) {
  const {u, f} = L, r = L.n.packet, G = packetGeom(L, d);
  const k = clamp01(p.fill);
  rr(c, r.x, r.y, r.w, r.h, u * 0.25);
  c.fillStyle = pal.bg;
  c.fill();
  if (k > 0) alpha(c, k, () => { c.fillStyle = pal.sheet; c.fill(); });
  dashed(c, u, k < 0.5);
  c.strokeStyle = k < 0.5 ? pal.muted : pal.ink;
  c.lineWidth = 1.4;
  c.stroke();
  c.setLineDash([]);
  drawText(c, `制作ブリーフ　${KEYS.length}項目`, G.labelPos.x, G.labelPos.y, {size: f.small, weight: 700, color: pal.ink, max: G.labelMax, min: 7});
  const hd = G.header;
  if (k < 1) alpha(c, 1 - k, () => {
    dashed(c, u, true);
    c.strokeStyle = pal.muted;
    c.lineWidth = 1;
    c.strokeRect(hd.x, hd.y, hd.w, hd.h);
    c.setLineDash([]);
  });
  if (k > 0) alpha(c, k, () => {
    c.fillStyle = pal.tint;
    c.fillRect(hd.x, hd.y, hd.w, hd.h);
    c.fillStyle = pal.signal;
    c.fillRect(hd.x, hd.y, Math.max(2, u * 0.14), hd.h);
    drawWrapped(c, job.brief.request, {x: hd.x + u * 0.45, y: hd.y + u * 0.12, w: hd.w - u * 0.65, h: hd.h - u * 0.24}, {size: f.label, min: 7, family: FONT.mincho, weight: 700, color: pal.ink, maxLines: 2, lh: 1.32, valign: 'middle'});
  });
  G.groups.forEach((g, gi) => {
    const gk = clamp01(Math.min(k, val(p.groupFill, gi, 1)));
    drawText(c, `${g.label}　${g.count}`, g.labelPos.x, g.labelPos.y, {size: f.small * 0.92, weight: 700, color: gk > 0.5 ? pal.signalInk : pal.muted, max: r.w - u, min: 7});
    for (const s of g.slots) drawSlot(c, L, s, job, d, gk, pal, p.focusField === s.key, clamp01(val(p.slotGlow, s.key, 0)));
  });
}

// 未指定・仮の条件のポケット：値の入っていない印（中空のピン）と、未提供のまま残す言い回し
function pocketRect(L, p) { return lerpRect(L.n.pocketHome, L.n.pocket, ease(clamp01(p.pocketOut))); }
function drawPocket(c, L, p, d, job, pal) {
  const {u, f, kind} = L;
  const k = ease(clamp01(p.pocketOut));
  const r = pocketRect(L, p);
  const count = job.brief.assumptions.length;
  rr(c, r.x, r.y, r.w, r.h, u * 0.25);
  c.fillStyle = pal.sheet;
  c.fill();
  hatch(c, r, pal.hatch, Math.max(5, u * 0.45), u * 0.25);
  rr(c, r.x, r.y, r.w, r.h, u * 0.25);
  dashed(c, u, true);
  c.strokeStyle = p.focusField === 'assumptions' ? pal.signal : pal.ink;
  c.lineWidth = p.focusField === 'assumptions' ? 2.6 : 1.4;
  c.stroke();
  c.setLineDash([]);
  if (k < 0.1) return;
  const pk = L.n.packet;
  if (k > 0.3) alpha(c, clamp01((k - 0.3) / 0.4), () => {
    c.strokeStyle = pal.ink;
    c.lineWidth = 1.2;
    c.beginPath();
    for (let i = 0; i < 4; i++) {
      if (kind === 'wide') { const x = pk.x + pk.w * (0.2 + 0.2 * i); c.moveTo(x, pk.y + pk.h); c.lineTo(x, r.y); }
      else { const y = pk.y + pk.h * (0.2 + 0.2 * i); c.moveTo(pk.x + pk.w, y); c.lineTo(r.x, y); }
    }
    dashed(c, u * 0.6, true);
    c.stroke();
    c.setLineDash([]);
  });
  alpha(c, clamp01((k - 0.1) / 0.3), () => {
    const pad = u * 0.35;
    const R = kind === 'wide'
      ? {label: {x: r.x + pad, y: r.y + pad, w: r.w * 0.44, h: r.h * 0.34}, pins: {x: r.x + pad, y: r.y + r.h * 0.44, w: r.w * 0.44, h: r.h * 0.48}, unset: {x: r.x + r.w * 0.5, y: r.y + pad, w: r.w * 0.5 - pad, h: r.h - pad * 2}}
      : {label: {x: r.x + pad, y: r.y + pad, w: r.w - pad * 2, h: r.h * 0.24}, pins: {x: r.x + pad, y: r.y + r.h * 0.28, w: r.w - pad * 2, h: r.h * 0.24}, unset: {x: r.x + pad, y: r.y + r.h * 0.55, w: r.w - pad * 2, h: r.h * 0.45 - pad}};
    // 名前と数
    c.fillStyle = pal.sheet;
    c.fillRect(R.label.x, R.label.y, R.label.w, R.label.h);
    const cs = Math.min(f.label * 1.1, R.label.h * 0.6);
    const cw = drawText(c, String(count), R.label.x + R.label.w - u * 0.15, R.label.y + cs * 0.65, {size: cs, weight: 700, color: pal.signalInk, align: 'right'});
    drawWrapped(c, d.groups[3].label, {x: R.label.x + u * 0.15, y: R.label.y, w: R.label.w - cw - u * 0.45, h: R.label.h}, {size: f.small, weight: 700, color: pal.ink, maxLines: 2, min: 7, lh: 1.3});
    // 中空のピン（値は入っていない）
    const cols = kind === 'wide' ? count : 2, rows = Math.ceil(count / cols);
    const cellW = R.pins.w / cols, cellH = R.pins.h / rows;
    const rad = Math.max(3, Math.min(cellW, cellH) * 0.3);
    for (let i = 0; i < count; i++) {
      const a = clamp01(p.pins - i);
      if (a <= 0) continue;
      const x = R.pins.x + cellW * ((i % cols) + 0.5), y = R.pins.y + cellH * (Math.floor(i / cols) + 0.45);
      alpha(c, a, () => {
        c.beginPath();
        c.moveTo(x, y + rad);
        c.lineTo(x, y + rad * 2.1);
        dashed(c, rad * 1.2, true);
        c.strokeStyle = pal.ink;
        c.lineWidth = 1.2;
        c.stroke();
        c.setLineDash([]);
        c.beginPath();
        c.arc(x, y, rad, 0, Math.PI * 2);
        c.fillStyle = pal.sheet;
        c.fill();
        c.strokeStyle = pal.signal;
        c.lineWidth = Math.max(1.6, rad * 0.32);
        c.stroke();
      });
    }
    // 未提供のまま：保存済みの言い回しと、空の欄
    alpha(c, clamp01(p.unset), () => {
      const q = R.unset;
      c.fillStyle = pal.sheet;
      c.fillRect(q.x, q.y, q.w, q.h);
      dashed(c, u, true);
      c.strokeStyle = pal.signal;
      c.lineWidth = 1.4;
      c.strokeRect(q.x, q.y, q.w, q.h);
      c.setLineDash([]);
      const rowH = Math.min(f.small * 1.5, q.h * 0.3);
      drawWrapped(c, job.unset.text, {x: q.x + u * 0.25, y: q.y + u * 0.2, w: q.w - u * 0.5, h: q.h - rowH - u * 0.45}, {size: f.small, weight: 700, color: pal.ink, min: 7, lh: 1.3});
      const by = q.y + q.h - rowH / 2 - u * 0.15, bs = rowH * 0.62;
      dashed(c, u * 0.6, true);
      c.strokeStyle = pal.muted;
      c.lineWidth = 1;
      c.strokeRect(q.x + u * 0.25, by - bs / 2, bs * 1.6, bs);
      c.setLineDash([]);
      drawText(c, '未設定', q.x + u * 0.45 + bs * 1.6, by, {size: Math.min(f.small * 0.9, rowH * 0.7), color: pal.muted, weight: 700, max: q.w - bs * 1.6 - u * 0.7, min: 6});
    });
  });
}

// 分野（成果物から選ぶ）と、次の制作で読むスキル
function drawRoute(c, L, p, d, job, pal) {
  const {u, f, kind, n} = L, r = n.route;
  const wide = kind === 'wide';
  const k = clamp01(p.route);
  let chips;
  if (wide) {
    drawText(c, '分野は成果物から選ぶ', r.x, r.y + f.small * 0.65, {size: f.small, weight: 700, color: pal.ink, max: r.w});
    const top = r.y + f.small * 1.5, gh = r.h * 0.5, gap = u * 0.25;
    const cw = (r.w - gap) / 2, ch = (gh - gap) / 2;
    chips = d.categories.map((cat, i) => ({cat, r: {x: r.x + (i % 2) * (cw + gap), y: top + Math.floor(i / 2) * (ch + gap), w: cw, h: ch}}));
  } else {
    const end = n.next.x - u * 0.9, gap = u * 0.2;
    const cw = (end - r.x - gap * 3) / 4, ch = r.h * 0.74;
    chips = d.categories.map((cat, i) => ({cat, r: {x: r.x + i * (cw + gap), y: r.y + (r.h - ch) / 2, w: cw, h: ch}}));
  }
  for (const {cat, r: q} of chips) {
    const sel = cat.id === job.brief.category;
    rr(c, q.x, q.y, q.w, q.h, u * 0.15);
    c.fillStyle = pal.bg;
    c.fill();
    if (sel && k > 0) alpha(c, k, () => { c.fillStyle = pal.signal; c.fill(); });
    dashed(c, u, !cat.saved);
    c.strokeStyle = sel && k > 0.5 ? pal.signal : cat.saved ? pal.ink : pal.muted;
    c.lineWidth = 1;
    c.stroke();
    c.setLineDash([]);
    drawText(c, cat.label, q.x + q.w / 2, q.y + q.h / 2, {size: Math.min(f.small, q.h * 0.62), weight: sel ? 700 : 400, color: sel && k > 0.5 ? pal.onSignal : cat.saved ? pal.ink : pal.muted, align: 'center', max: q.w - u * 0.3, min: 6});
  }
  const sk = clamp01(p.skillName);
  if (wide) {
    const y = r.y + r.h - f.label * 0.75;
    alpha(c, sk, () => {
      const lw = drawText(c, '読む', r.x, y, {size: f.small, color: pal.muted});
      drawText(c, job.skill.name, r.x + lw + u * 0.35, y, {size: f.label, weight: 700, color: pal.ink, max: r.w - lw - u * 0.8, min: 8});
    });
  } else {
    const x0 = n.next.x, y = r.y + r.h / 2, end = chips[chips.length - 1].r;
    if (k > 0) alpha(c, k, () => strokePath(c, [[end.x + end.w + u * 0.12, y], [x0 - u * 0.1, y]], 1, {color: pal.signal, width: 1.6, head: u * 0.32}));
    alpha(c, sk, () => {
      const lw = drawText(c, '読む', x0 + u * 0.1, y, {size: f.small * 0.9, color: pal.muted});
      drawText(c, job.skill.name, x0 + lw + u * 0.4, y, {size: f.label, weight: 700, color: pal.ink, max: r.x + r.w - (x0 + lw + u * 0.5), min: 7});
    });
  }
}

// 保存済みのブリーフJSON
function drawJson(c, L, p, job, pal) {
  const {u, f} = L, r = L.n.json, k = clamp01(p.outputs);
  paperShape(c, r, pal, u, {dashed: k < 0.5, fill: k < 0.5 ? pal.bg : pal.sheet, stroke: k < 0.5 ? pal.muted : pal.ink, lw: 1.3 + 0.8 * k});
  const lh = Math.min(f.label * 1.25, r.h / 3.6);
  const y = r.y + r.h / 2 - lh;
  const x = r.x + u * 0.4, max = r.w - u * 0.8;
  drawText(c, '{ }', x, y, {size: Math.min(f.label * 1.1, lh), weight: 700, color: k < 0.5 ? pal.muted : pal.signalInk});
  alpha(c, 0.35 + 0.65 * k, () => {
    drawText(c, job.json.path.split('/').pop(), x, y + lh, {size: Math.min(f.label, lh * 0.9), weight: 700, color: pal.ink, max, min: 7});
    drawText(c, `${job.json.bytes.toLocaleString('en-US')} B`, x, y + lh * 2, {size: Math.min(f.small, lh * 0.8), color: pal.muted, max, min: 7});
  });
  if (k > 0.5) alpha(c, (k - 0.5) * 2, () => drawText(c, '保存済み', r.x + r.w - u * 0.35, y, {size: Math.min(f.small * 0.85, lh * 0.75), weight: 700, color: pal.signalInk, align: 'right', max: r.w * 0.45, min: 6}));
}

// 引き継ぎ文：3つの依頼（skill_refs・assumptions・acceptance）と、同じブリーフ
function drawHandoff(c, L, p, job, pal) {
  const {u, f} = L, r = L.n.handoff, k = clamp01(p.outputs);
  const fold = paperShape(c, r, pal, u, {dashed: k < 0.5, fill: k < 0.5 ? pal.bg : pal.sheet, stroke: k < 0.5 ? pal.muted : pal.ink, lw: 1.3 + 0.8 * k});
  const pad = u * 0.4, max = r.w - pad * 2;
  const lh = Math.min(f.small * 1.35, (r.h - pad) / 5.4);
  let y = r.y + pad * 0.5 + lh * 0.6;
  drawText(c, '引き継ぎ文', r.x + pad, y, {size: Math.min(f.label, lh * 0.95), weight: 700, color: pal.ink, max: max - fold, min: 7});
  alpha(c, 0.35 + 0.65 * k, () => {
    HANDOFF_KEYS.forEach((key, i) => {
      y += lh;
      const nw = drawText(c, String(i + 1), r.x + pad, y, {size: lh * 0.7, weight: 700, color: pal.signalInk});
      drawText(c, key, r.x + pad + nw + u * 0.25, y, {size: lh * 0.7, color: pal.ink, max: max - nw - u * 0.25, min: 6});
    });
    y += lh * 1.05;
    const name = job.handoff.path.split('/').pop();
    drawText(c, `${name}　${job.handoff.bytes.toLocaleString('en-US')} B`, r.x + pad, y, {size: lh * 0.66, color: pal.muted, max, min: 6});
  });
}

function drawIcon(c, cat, r, pal, u) {
  c.save();
  dashed(c, u * 0.8, true);
  c.strokeStyle = pal.muted;
  c.lineWidth = 1.4;
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  if (cat === 'ui-ux') {
    const h = Math.min(r.h, r.w * 1.4), w = h * 0.55;
    rr(c, cx - w / 2, cy - h / 2, w, h, w * 0.16);
    c.stroke();
    c.beginPath();
    c.moveTo(cx - w * 0.18, cy - h / 2 + h * 0.1);
    c.lineTo(cx + w * 0.18, cy - h / 2 + h * 0.1);
    c.stroke();
  } else {
    const w = Math.min(r.w, r.h * 1.78), h = w / 1.78;
    c.strokeRect(cx - w / 2, cy - h / 2, w, h);
    c.beginPath();
    if (cat === 'slides') {
      c.moveTo(cx - w * 0.32, cy - h * 0.12); c.lineTo(cx + w * 0.2, cy - h * 0.12);
      c.moveTo(cx - w * 0.32, cy + h * 0.14); c.lineTo(cx + w * 0.05, cy + h * 0.14);
    } else {
      for (let i = 0; i < 5; i++) {
        const x = cx - w / 2 + w * (0.12 + 0.19 * i);
        c.moveTo(x, cy - h / 2 + h * 0.12); c.lineTo(x + w * 0.07, cy - h / 2 + h * 0.12);
        c.moveTo(x, cy + h / 2 - h * 0.12); c.lineTo(x + w * 0.07, cy + h / 2 - h * 0.12);
      }
    }
    c.stroke();
  }
  c.restore();
}

// 次の制作：点線の枠だけ。ここでは何も作っていない。
function drawNext(c, L, p, job, pal) {
  const {u, f, kind} = L, r = L.n.next;
  alpha(c, 0.55 + 0.45 * clamp01(p.next), () => {
    rr(c, r.x, r.y, r.w, r.h, u * 0.35);
    dashed(c, u, true);
    c.strokeStyle = pal.muted;
    c.lineWidth = 1.3;
    c.stroke();
    c.setLineDash([]);
    const pad = u * 0.4;
    const ty = r.y + pad * 0.6 + f.small * 0.6;
    drawText(c, '次の制作・未実行', r.x + pad, ty, {size: f.small, weight: 700, color: pal.muted, max: r.w - pad * 2, min: 7});
    const nameY = r.y + r.h - pad * 0.6 - f.small * 0.55;
    if (kind === 'wide') {
      const icon = {x: r.x + pad, y: ty + f.small * 0.9, w: r.w * 0.36, h: nameY - ty - f.small * 1.6};
      drawIcon(c, job.brief.category, icon, pal, u);
      drawWrapped(c, `${job.skill.name}を読んで作る別の作業`, {x: r.x + pad + r.w * 0.42, y: icon.y, w: r.w * 0.58 - pad * 2, h: icon.h}, {size: f.small, color: pal.muted, maxLines: 3, min: 7, valign: 'middle'});
    } else {
      const icon = {x: r.x + pad, y: ty + f.small * 0.8, w: r.w - pad * 2, h: nameY - ty - f.small * 1.5};
      drawIcon(c, job.brief.category, icon, pal, u);
      drawText(c, '別の作業', r.x + r.w / 2, nameY, {size: f.small * 0.9, color: pal.muted, align: 'center', max: r.w - pad * 2, min: 6});
    }
  });
}

// 依頼の紙：受け取った場所 → AIの作業台（s=1）→ 開いてブリーフの袋になる（s=2）
function drawSheet(c, L, p, job, pal) {
  const {u, f, n} = L;
  const s = Math.max(0, Math.min(2, p.s));
  if (s >= 2) return;
  const r = s <= 1 ? lerpRect(n.paper0, n.aiSpot, s) : lerpRect(n.aiSpot, n.packet, s - 1);
  alpha(c, 1 - ease(prog(s, 1.7, 2.0)), () => {
    const fold = paperShape(c, r, pal, u, {lw: 1.4});
    const pad = Math.min(u * 0.4, r.w * 0.06);
    const labelH = r.h > f.small * 3.4 ? f.small * 1.45 : 0;
    if (labelH) drawText(c, '依頼', r.x + pad, r.y + pad * 0.5 + labelH / 2, {size: f.small * 0.92, weight: 700, color: pal.signalInk});
    drawWrapped(c, job.brief.request, {x: r.x + pad, y: r.y + pad * 0.5 + labelH, w: r.w - pad * 2 - (labelH ? 0 : fold * 0.6), h: r.h - labelH - pad}, {size: f.label * 1.05, min: 6.5, family: FONT.mincho, weight: 700, color: pal.ink, lh: 1.4, valign: labelH ? 'top' : 'middle'});
  });
}

export function drawConcept(c, L, p, d, pal, jobId) {
  const job = d.jobs[jobId];
  const {n, e, u} = L;
  const show = (k) => clamp01(val(p.show, k, 1));
  const nodeA = (k) => show(k) * val(p.emph, k, 1);
  c.save();
  c.lineCap = 'round';
  for (const key of ALL_EDGES) {
    const k = val(p.draw, key, 1);
    if (k <= 0.001) continue;
    const group = EDGE_GROUP[key], future = group === 'future';
    alpha(c, val(p.emphEdge, group, 1), () => strokePath(c, e[key], k, {color: future ? pal.muted : pal.ink, width: Math.max(1.2, u * 0.09), head: u * 0.45, dash: future ? [u * 0.3, u * 0.24] : null}));
    const fl = future ? 0 : val(p.flow, key, 0);
    if (fl > 0) strokePath(c, e[key], Math.min(k, fl), {color: pal.signal, width: Math.max(2.2, u * 0.17), head: u * 0.5});
  }
  alpha(c, nodeA('tray'), () => drawTray(c, L, p, pal));
  alpha(c, nodeA('book'), () => drawBook(c, L, p, d, pal));
  alpha(c, nodeA('ai'), () => drawDesk(c, L, pal));
  alpha(c, nodeA('pocket'), () => drawPocket(c, L, p, d, job, pal));
  alpha(c, nodeA('packet'), () => drawPacket(c, L, p, d, job, pal));
  alpha(c, nodeA('route'), () => drawRoute(c, L, p, d, job, pal));
  alpha(c, nodeA('json'), () => drawJson(c, L, p, job, pal));
  alpha(c, nodeA('handoff'), () => drawHandoff(c, L, p, job, pal));
  alpha(c, nodeA('next'), () => drawNext(c, L, p, job, pal));
  alpha(c, show('sheet') * Math.max(val(p.emph, 'tray', 1), val(p.emph, 'ai', 1), val(p.emph, 'packet', 1)), () => drawSheet(c, L, p, job, pal));

  const box = (k) => focusBox(c, L, k === 'pocket' ? pocketRect(L, p) : n[k], pal);
  if (p.focusPart && PART_NODES[p.focusPart]) PART_NODES[p.focusPart].forEach(box);
  if (p.focusRule && RULE_NODES[p.focusRule]) RULE_NODES[p.focusRule].forEach(box);
  c.restore();
}

// ---------- ページ ----------
const STAGES = Object.freeze([
  {name: '読む', note: (j) => `指示書（SKILL.md）と、受け取った依頼文1枚を、1つのAIが読みます。この例では素材を受け取っていません。例は「${j.label}」です。`},
  {name: '組む', note: (j) => `同じ紙が11項目のブリーフに開きます。未指定・仮の条件${j.brief.assumptions.length}つは、値を入れずに別のポケットへ分けます。`},
  {name: '渡す', note: (j) => `分野は${j.categoryLabel}、次に読むのは${j.skill.name}。保存済みの${j.json.path.split('/').pop()}と引き継ぎ文を持ち帰れます。次の制作はまだ実行していません。`},
]);
const FIELD_NOTES = Object.freeze({
  title: 'ブリーフの題名。保存済みのブリーフが付けた提案です。',
  request: '受け取った依頼そのままです。',
  category: '欲しい成果物から選んだ分野です。',
  audience: '見る人の想定。依頼者が確かめた事実ではなく、ブリーフの提案です。',
  goal: '達成すること一つ。ブリーフの提案です。',
  inputs: '次に受け取る素材の計画です。この例では、まだどれも受け取っていません。',
  skill_refs: '次の制作で読むSKILL.mdや原典です。参照先の確認と、次の制作を実行することは別です。',
  deliverables: '成果物の計画です。まだ作っていません。',
  steps: '制作の手順の計画です。まだ進めていません。',
  acceptance: '今後確かめる完成の条件です。どれも未確認で、合格した記録ではありません。',
  assumptions: '未指定・仮に置いた条件です。確定した事実ではありません。',
});
const THEME_KEY = 'studio-yebisu.brief-to-demo.theme';

function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') el.className = value;
    else el.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; }
  } catch { /* 下の方法を試す */ }
  const tmp = h('textarea', {class: 'offscreen', readonly: true, 'aria-hidden': 'true', tabindex: '-1'});
  tmp.value = text;
  document.body.append(tmp);
  tmp.select();
  tmp.setSelectionRange(0, text.length);
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { ok = false; }
  tmp.remove();
  return ok;
}

function initPage() {
  const $ = (id) => document.getElementById(id);
  const root = document.documentElement;
  const canvas = $('concept-map');
  const ctx = canvas.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const darkMq = matchMedia('(prefers-color-scheme: dark)');
  const statusEl = $('load-status'), retryBtn = $('retry');
  const dynLinks = ['save-json', 'open-desk', 'handoff-raw', 'json-raw'].map($);
  const dependents = () => document.querySelectorAll('button[data-stage], #replay, button[data-sample], button[data-field], button[data-part], button[data-rule], #copy-handoff, #copy-handoff-2, #copy-json, #copy-request');
  const readouts = ['save-meta', 'stage-note', 'copy-status', 'field-label', 'field-key', 'field-status', 'field-value', 'field-quote', 'field-source',
    'part-label', 'part-meaning', 'part-quote', 'part-source', 'rule-label', 'rule-meaning', 'rule-quote', 'rule-source',
    'handoff-name', 'json-name', 'handoff-status', 'json-status', 'request-status', 'route-reason'];
  const areas = ['handoff-text', 'json-text', 'request-text'].map($);

  let data = null;
  let caseId = JOB_IDS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'ui';
  let stage = 0, tau = 1, raf = 0, part = null, rule = null, field = 'request', loadGen = 0, controller = null;

  // 表示の色
  const themeButtons = document.querySelectorAll('button[data-theme-choice]');
  const theme = () => root.dataset.theme || 'system';
  const resolved = () => (theme() === 'system' ? (darkMq.matches ? 'dark' : 'light') : theme());
  function setTheme(t, save) {
    root.dataset.theme = t;
    themeButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.themeChoice === t)));
    if (save) { try { localStorage.setItem(THEME_KEY, t); } catch { /* 保存できなくても表示は切り替える */ } }
    draw();
  }
  themeButtons.forEach((b) => b.addEventListener('click', () => setTheme(b.dataset.themeChoice, true)));
  darkMq.addEventListener?.('change', () => { if (theme() === 'system') draw(); });

  // 図
  function draw() {
    const rect = canvas.getBoundingClientRect();
    const W = Math.max(1, Math.round(rect.width)), H = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
    }
    const pal = PALETTES[resolved()];
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, W, H);
    if (!data) return;
    const L = conceptLayout(chooseKind(W, H), W, H);
    const p = storyParams(tau);
    p.focusPart = part;
    p.focusRule = rule;
    p.focusField = field;
    drawConcept(ctx, L, p, data, pal, caseId);
  }
  new ResizeObserver(() => draw()).observe(canvas);

  function stopAnim() { if (raf) cancelAnimationFrame(raf); raf = 0; }
  function animate(from, to) {
    stopAnim();
    if (reduce.matches || from === to) { tau = to; draw(); return; }
    const dur = Math.min(2200, Math.max(600, Math.abs(to - from) * 1200));
    const t0 = performance.now();
    const tick = (now) => {
      const k = clamp01((now - t0) / dur);
      tau = from + (to - from) * k;
      draw();
      raf = k < 1 ? requestAnimationFrame(tick) : 0;
    };
    tau = from;
    raf = requestAnimationFrame(tick);
  }
  function setStage(i, replay) {
    stage = i;
    document.querySelectorAll('button[data-stage]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.stage) === i)));
    if (data) $('stage-note').textContent = `${STAGES[i].name}：${STAGES[i].note(data.jobs[caseId])}`;
    const target = i + 1;
    animate(replay || target < tau ? i : tau, target);
  }
  document.querySelectorAll('button[data-stage]').forEach((b) => b.addEventListener('click', () => { if (data) setStage(Number(b.dataset.stage), false); }));
  $('replay').addEventListener('click', () => { if (data) setStage(stage, true); });

  // 3件
  function renderCase() {
    const job = data.jobs[caseId];
    document.querySelectorAll('button[data-sample]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.sample === caseId)));
    const save = $('save-json');
    save.href = job.json.url;
    save.setAttribute('download', job.json.download);
    $('open-desk').href = `desk.html#${caseId}`;
    $('handoff-raw').href = job.handoff.url;
    $('json-raw').href = job.json.url;
    for (const a of dynLinks) a.removeAttribute('aria-disabled');
    $('save-meta').textContent = `${job.json.path}・${job.json.bytes.toLocaleString('en-US')} B・SHA-256 ${job.json.sha256.slice(0, 12)}…（照合済み）`;
    $('handoff-name').textContent = `${job.handoff.path}・${job.handoff.bytes.toLocaleString('en-US')} B`;
    $('json-name').textContent = `${job.json.path}・${job.json.bytes.toLocaleString('en-US')} B`;
    $('handoff-text').value = job.handoff.text;
    $('json-text').value = job.json.text;
    $('route-reason').textContent = `${job.route.category_label}を選んだ理由（保存済み）：${job.route.reason}`;
    for (const id of ['copy-status', 'handoff-status', 'json-status']) $(id).textContent = '';
    $('stage-note').textContent = `${STAGES[stage].name}：${STAGES[stage].note(job)}`;
    renderField();
  }
  document.querySelectorAll('button[data-sample]').forEach((b) => b.addEventListener('click', () => {
    if (!data || !JOB_IDS.includes(b.dataset.sample)) return;
    caseId = b.dataset.sample;
    history.replaceState(null, '', `#${caseId}`);
    renderCase();
    draw();
  }));
  window.addEventListener('hashchange', () => {
    const id = location.hash.slice(1);
    if (data && JOB_IDS.includes(id) && id !== caseId) { caseId = id; renderCase(); draw(); }
  });

  // 11項目
  const sourceLinks = (item) => [
    h('a', {href: item.url}, `${item.source_path} の${item.line_start}行目`), '　',
    h('a', {href: item.lineUrl, rel: 'noopener'}, '固定版の該当行（GitHub）'),
  ];
  function valueNode(key, v) {
    if (!Array.isArray(v)) {
      if (key === 'category') return h('p', {class: 'v-text'}, `${v}（${data.jobs[caseId].categoryLabel}）`);
      return h('p', {class: key === 'request' ? 'v-text v-request' : 'v-text'}, v);
    }
    const items = v.map((item) => {
      if (key !== 'skill_refs') return h('li', {}, item);
      return /^https:\/\//.test(item)
        ? h('li', {}, h('a', {href: item, rel: 'noopener'}, item.replace(/^https:\/\//, '')))
        : h('li', {}, h('code', {}, item), h('span', {class: 'v-aside'}, '八百万図AIツールボックスの作業場所を指す文字列です。公開リンクではありません。'));
    });
    return h(key === 'steps' ? 'ol' : 'ul', {class: `v-list v-${key}`}, items);
  }
  function renderField() {
    document.querySelectorAll('button[data-field]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.field === field)));
    const fd = data.fieldMap[field], job = data.jobs[caseId];
    $('field-label').textContent = fd.label;
    $('field-key').textContent = `${fd.id}　説明用のまとまり：${fd.groupLabel}`;
    $('field-status').textContent = FIELD_NOTES[field];
    $('field-value').replaceChildren(valueNode(field, job.brief[field]));
    $('field-quote').textContent = `"${fd.id}":${JSON.stringify(fd.schema_example)}`;
    $('field-source').replaceChildren(...sourceLinks(fd));
  }
  document.querySelectorAll('button[data-field]').forEach((b) => b.addEventListener('click', () => {
    if (!data || !KEYS.includes(b.dataset.field)) return;
    field = b.dataset.field;
    renderField();
    draw();
  }));

  // 6つの部分と3つの決まり
  function renderRef(prefix, item) {
    $(`${prefix}-label`).textContent = item ? item.label : '';
    $(`${prefix}-meaning`).textContent = item ? item.meaning : '';
    $(`${prefix}-quote`).textContent = item ? item.quote : '';
    $(`${prefix}-source`).replaceChildren(...(item ? sourceLinks(item) : []));
  }
  document.querySelectorAll('button[data-part]').forEach((b) => b.addEventListener('click', () => {
    if (!data) return;
    part = part === b.dataset.part ? null : b.dataset.part;
    document.querySelectorAll('button[data-part]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.part === part)));
    renderRef('part', data.parts.find((x) => x.id === part));
    draw();
  }));
  document.querySelectorAll('button[data-rule]').forEach((b) => b.addEventListener('click', () => {
    if (!data) return;
    rule = rule === b.dataset.rule ? null : b.dataset.rule;
    document.querySelectorAll('button[data-rule]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.rule === rule)));
    renderRef('rule', data.rules.find((x) => x.id === rule));
    draw();
  }));

  // コピー（失敗したら読み取り専用の欄を選んだ状態にして伝える）
  async function copyFrom(area, text, statusId, done, what) {
    const ok = await copyText(text);
    const out = $(statusId);
    if (ok) { out.textContent = done; return; }
    out.textContent = `コピーできませんでした。${what}の欄を選んだ状態にしたので、端末の操作でコピーしてください。`;
    area.closest('details')?.setAttribute('open', '');
    area.focus();
    area.select();
  }
  const job = () => data.jobs[caseId];
  $('copy-handoff').addEventListener('click', () => { if (data) copyFrom($('handoff-text'), job().handoff.text, 'copy-status', '引き継ぎ文をコピーしました。', '下の引き継ぎ文'); });
  $('copy-handoff-2').addEventListener('click', () => { if (data) copyFrom($('handoff-text'), job().handoff.text, 'handoff-status', '引き継ぎ文をコピーしました。', '引き継ぎ文'); });
  $('copy-json').addEventListener('click', () => { if (data) copyFrom($('json-text'), job().json.text, 'json-status', 'ブリーフJSONをコピーしました。', 'JSON'); });
  $('copy-request').addEventListener('click', () => { if (data) copyFrom($('request-text'), data.request, 'request-status', 'request.txt の依頼文をコピーしました。', '依頼文'); });

  // 読み込みと失敗
  function setDependents(on) {
    dependents().forEach((el) => { el.disabled = !on; });
    if (!on) for (const a of dynLinks) { a.removeAttribute('href'); a.removeAttribute('download'); a.setAttribute('aria-disabled', 'true'); }
  }
  function clearReadouts() {
    for (const id of readouts) $(id).replaceChildren();
    for (const a of areas) a.value = '';
  }
  function setStatus(text, state) {
    statusEl.textContent = text;
    statusEl.dataset.state = state;
    statusEl.setAttribute('role', state === 'error' ? 'alert' : 'status');
  }
  async function load() {
    const gen = ++loadGen;
    controller?.abort();
    controller = new AbortController();
    stopAnim();
    data = null;
    root.dataset.state = 'loading';
    retryBtn.hidden = true;
    setDependents(false);
    clearReadouts();
    draw();
    setStatus(`保存済みの素材${ASSET_COUNT}件を照合しています…`, 'loading');
    try {
      const bundle = await loadValidatedAssets({
        signal: controller.signal,
        onProgress: (done, total) => { if (gen === loadGen && root.dataset.state === 'loading') setStatus(`素材 ${done}/${total} を照合しています…`, 'loading'); },
      });
      if (gen !== loadGen) return;
      data = bundle;
      root.dataset.state = 'ready';
      setStatus(`${ASSET_COUNT}件の素材を、大きさとSHA-256で照合しました。`, 'ready');
      setDependents(true);
      $('request-text').value = data.request;
      document.querySelectorAll('button[data-field]').forEach((b) => { const fd = data.fieldMap[b.dataset.field]; if (fd) b.textContent = fd.label; });
      renderRef('part', data.parts.find((x) => x.id === part));
      renderRef('rule', data.rules.find((x) => x.id === rule));
      renderCase();
      tau = 0;
      setStage(0, true);
    } catch (error) {
      if (gen !== loadGen || error?.name === 'AbortError') return;
      stopAnim();
      data = null;
      root.dataset.state = 'error';
      setDependents(false);
      clearReadouts();
      draw();
      const why = error instanceof AssetError ? error.message : '素材を読めませんでした';
      setStatus(`${why}。図と読み出しを止めました。ファイルを直接開いた場合は、ローカルのHTTPサーバー経由で開いてください。`, 'error');
      retryBtn.hidden = false;
    }
  }
  retryBtn.addEventListener('click', () => load());
  setTheme(theme(), false);
  load();
}

if (typeof document !== 'undefined' && document.documentElement.dataset.page === 'brief-to-demo-concept') initPage();
