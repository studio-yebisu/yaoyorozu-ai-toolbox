// SolidCraft 作例の構造図：共有ローダー・検証・描画と、構造図ページの初期化。
// 保存済みの31ファイルを大きさとSHA-256で確かめて読むだけ。CAD・AI・寸法の再計算は行わない。
// 編集用の動画ソース（video/video.js）はこのファイルを import するが、ページの初期化は
// <html data-concept-page="main"> のときだけ動く。

export const MANIFEST_PATH = 'concept/manifest.json';
export const MANIFEST_SHA256 = '928aa73b0c5699488fc6cc4fe95d695319fd8e42cbfdc5b0306be33e3503f1f4';
export const ASSET_COUNT = 31;
export const CASE_IDS = ['tray-default', 'tray-resized'];
export const CASE_KEY = {'tray-default': 'default', 'tray-resized': 'resized'};
export const FILM = {duration: 32, fps: 30, width: 720, height: 1280, posterTime: 31};
export const FILM_SCENES = [
  {id: 'books', at: 0, label: '手順書と依頼'},
  {id: 'roles', at: 4, label: '作者と制作担当'},
  {id: 'cad', at: 8, label: '値→式→履歴→形'},
  {id: 'update', at: 14, label: '4つの値を変える'},
  {id: 'verify', at: 20, label: '予測と実測'},
  {id: 'files', at: 26, label: '3形式とビューア'},
  {id: 'whole', at: 29, label: '全体図'}
];

const ROOT = new URL('./', import.meta.url);
const SOURCE_COMMIT = '16c49c3e860a954e9f27309927d6848bcba9c607';
const RUNTIME_COMMIT = 'b01b9689c8999a4415b4a6daaa2f8aae8a1a2f25';
const SKILLS = ['solidcraft-modeling', 'solidcraft-editing', 'solidcraft-checking'];
const DRIVING = ['width', 'depth', 'height', 'hole_diameter'];
const FIXED = ['wall', 'floor_thickness'];
const PARAM_ORDER = [...DRIVING, ...FIXED];
const PARAM_JP = {width: '幅', depth: '奥行', height: '高さ', hole_diameter: '穴径', wall: '壁', floor_thickness: '底'};
const FEATURES = [
  {name: 'TrayBlock', type: 'box', operation: 'new_body'},
  {name: 'Pocket', type: 'box', operation: 'cut'},
  {name: 'DrainHole', type: 'cylinder', operation: 'cut'}
];
const TIMELINE_TYPES = ['BoxFeature', 'BoxFeature', 'CylinderFeature'];
const PART_IDS = ['modeling', 'editing', 'checking', 'commands', 'history', 'formats'];
const MCP_TOOLS = ['inspect_design', 'batch', 'measure', 'screenshot', 'save', 'export', 'body_topology'];
const FORMATS = ['json', 'step', 'stl'];
const VIEWS = ['iso', 'top'];
const SAFE_PATH = /^[A-Za-z0-9_-][A-Za-z0-9._-]*(\/[A-Za-z0-9_-][A-Za-z0-9._-]*)*$/;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export class ConceptError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConceptError';
  }
}

function need(condition, message) {
  if (!condition) throw new ConceptError(message);
}

// ---- SHA-256（安全な文脈では Web Crypto、それ以外は同じ計算をJSで行う） ----

const K256 = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
]);

const rotr = (value, bits) => (value >>> bits) | (value << (32 - bits));

function sha256Fallback(buffer) {
  const bytes = new Uint8Array(buffer);
  const length = bytes.length;
  const padded = new Uint8Array(((length + 9 + 63) >> 6) << 6);
  padded.set(bytes);
  padded[length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Math.floor(length / 0x20000000));
  view.setUint32(padded.length - 4, (length << 3) >>> 0);
  const hash = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const w = new Uint32Array(64);
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i += 1) w[i] = view.getUint32(offset + i * 4);
    for (let i = 16; i < 64; i += 1) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let a = hash[0], b = hash[1], c = hash[2], d = hash[3], e = hash[4], f = hash[5], g = hash[6], h = hash[7];
    for (let i = 0; i < 64; i += 1) {
      const t1 = (h + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K256[i] + w[i]) >>> 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0;
      d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    hash[0] = (hash[0] + a) >>> 0; hash[1] = (hash[1] + b) >>> 0;
    hash[2] = (hash[2] + c) >>> 0; hash[3] = (hash[3] + d) >>> 0;
    hash[4] = (hash[4] + e) >>> 0; hash[5] = (hash[5] + f) >>> 0;
    hash[6] = (hash[6] + g) >>> 0; hash[7] = (hash[7] + h) >>> 0;
  }
  return Array.from(hash, word => word.toString(16).padStart(8, '0')).join('');
}

export async function sha256Hex(buffer) {
  const subtle = globalThis.crypto && globalThis.crypto.subtle;
  if (subtle && typeof subtle.digest === 'function') {
    try {
      const digest = new Uint8Array(await subtle.digest('SHA-256', buffer));
      return Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
    } catch (_) {
      // Web Crypto が使えない環境では下の計算に切り替える
    }
  }
  return sha256Fallback(buffer);
}

// ---- 読み込み ----

const utf8 = new TextDecoder('utf-8', {fatal: true});

function decodeText(entry) {
  try {
    return utf8.decode(entry.buffer);
  } catch (_) {
    throw new ConceptError(`${entry.path} をUTF-8の文字として読めません`);
  }
}

function parseJson(entry) {
  const text = decodeText(entry);
  try {
    return JSON.parse(text);
  } catch (_) {
    throw new ConceptError(`${entry.path} をJSONとして読めません`);
  }
}

async function fetchBuffer(path, signal) {
  let response;
  try {
    response = await fetch(new URL(path, ROOT), {cache: 'no-store', signal});
  } catch (error) {
    if (error && error.name === 'AbortError') throw error;
    throw new ConceptError(`${path} を読み込めませんでした（通信できません。ローカルのWebサーバーで開いてください）`);
  }
  if (!response.ok) throw new ConceptError(`${path} を読み込めませんでした（HTTP ${response.status}）`);
  return response.arrayBuffer();
}

function checkManifest(manifest) {
  need(manifest && manifest.id === 'solidcraft-example', 'concept/manifest.json の作例IDが solidcraft-example ではありません');
  need(Array.isArray(manifest.files) && manifest.files.length === ASSET_COUNT,
    `concept/manifest.json のファイル数が${ASSET_COUNT}件ではありません`);
  const seen = new Set();
  return manifest.files.map((file, index) => {
    need(file && typeof file.path === 'string' && SAFE_PATH.test(file.path),
      `concept/manifest.json の${index + 1}件目のパスが不正です`);
    need(!seen.has(file.path), `concept/manifest.json に同じパスが2回あります：${file.path}`);
    seen.add(file.path);
    need(Number.isInteger(file.bytes) && file.bytes > 0, `${file.path} の記録上の大きさが不正です`);
    need(typeof file.sha256 === 'string' && /^[0-9a-f]{64}$/.test(file.sha256), `${file.path} の記録上のSHA-256が不正です`);
    return {path: file.path, bytes: file.bytes, sha256: file.sha256};
  });
}

/**
 * 31ファイルを読み、すべての大きさとSHA-256を確かめてから中身を検証する。
 * 4枚のPNGも展開する。どれか1つでも合わなければ ConceptError で止まる。
 */
export async function loadConcept({onProgress, signal} = {}) {
  const controller = new AbortController();
  const relay = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', relay, {once: true});
  }
  let failed = false;
  const report = (done, total) => {
    if (!failed && !controller.signal.aborted && typeof onProgress === 'function') onProgress(done, total);
  };
  try {
    const manifestBuffer = await fetchBuffer(MANIFEST_PATH, controller.signal);
    const manifestHash = await sha256Hex(manifestBuffer);
    need(manifestHash === MANIFEST_SHA256, 'concept/manifest.json の内容が記録と一致しません（SHA-256 が違います）');
    const manifest = parseJson({path: MANIFEST_PATH, buffer: manifestBuffer});
    const entries = checkManifest(manifest);
    const files = new Map();
    let done = 0;
    report(0, entries.length);
    await Promise.all(entries.map(async entry => {
      const buffer = await fetchBuffer(entry.path, controller.signal);
      need(buffer.byteLength === entry.bytes,
        `${entry.path} の大きさが記録と違います（${buffer.byteLength}バイト／記録 ${entry.bytes}バイト）`);
      const hash = await sha256Hex(buffer);
      need(hash === entry.sha256, `${entry.path} の内容が記録と一致しません（SHA-256 が違います）`);
      files.set(entry.path, {path: entry.path, bytes: entry.bytes, sha256: entry.sha256, buffer});
      done += 1;
      report(done, entries.length);
    }));
    const model = buildModel(manifest, files);
    await decodeImages(model);
    return model;
  } catch (error) {
    failed = true;
    controller.abort();
    if (error instanceof ConceptError) throw error;
    if (error && error.name === 'AbortError') throw new ConceptError('読み込みを中止しました');
    throw new ConceptError('保存データの確認中に問題が起きました：' + (error && error.message ? error.message : String(error)));
  } finally {
    if (signal) signal.removeEventListener('abort', relay);
  }
}

// ---- 中身の検証（保存データどうしの突き合わせだけ。CADやチェッカーは動かさない） ----

function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) return a.length === b.length && a.every((value, i) => deepEqual(value, b[i]));
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every(key => Object.prototype.hasOwnProperty.call(b, key) && deepEqual(a[key], b[key]));
}

function mm(text) {
  const match = typeof text === 'string' && /^(\d+(?:\.\d+)?) mm$/.exec(text);
  return match ? Number(match[1]) : NaN;
}

const sameNumbers = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => v === b[i]);

function checkState(label, state, params) {
  need(state && state.parameters && state.fixed_parameters && state.measured && state.expected,
    `${label} の記録が足りません`);
  DRIVING.forEach(name => need(state.parameters[name] === params[name], `${label} の ${name} が記録どうしで違います`));
  FIXED.forEach(name => need(state.fixed_parameters[name] === 3, `${label} の ${name} が3 mm固定ではありません`));
  need(state.status === 'passed' && state.sketch_count === 0, `${label} の状態が passed ではありません`);
  const features = state.timeline_features || [];
  need(features.length === 3 && features.every((f, i) => f.name === FEATURES[i].name && f.type === TIMELINE_TYPES[i] && f.error === null && f.warning === null),
    `${label} の履歴3件に error か warning があるか、順番が違います`);
}

function sameMeasured(a, b) {
  return a.volume_mm3 === b.volume_mm3 && a.area_mm2 === b.area_mm2 && sameNumbers(a.center_of_mass, b.center_of_mass) &&
    sameNumbers(a.bbox.min, b.bbox.min) && sameNumbers(a.bbox.max, b.bbox.max);
}

function buildModel(manifest, files) {
  const get = path => {
    const entry = files.get(path);
    need(entry, `${path} が検証済みの31ファイルに入っていません`);
    return entry;
  };
  const json = path => parseJson(get(path));
  const structure = json('concept/structure.json');
  const run = json('concept/original-run.json');
  const samples = json('samples.json');
  const measurements = json('measurements.json');
  const build = json('cad/build.json');
  const resize = json('cad/resize.json');
  const walk = json('cad/walk.json');
  const expected = json('cad/expected.json');
  const designs = {default: json('outputs/tray-default.json'), resized: json('outputs/tray-resized.json')};
  const requestRaw = decodeText(get('request.txt'));
  const request = requestRaw.replace(/\r\n?/g, '\n');

  need(structure.id === 'solidcraft-example' && manifest.id === structure.id, 'concept/structure.json の作例IDが違います');
  need(structure.source_commit === SOURCE_COMMIT, '参照コミットの記録が 16c49c3 ではありません');
  need(structure.runtime_commit === RUNTIME_COMMIT && structure.runtime_version === '0.11.1', '実行した版の記録が 0.11.1 / b01b968 ではありません');
  need(deepEqual(structure.skills, SKILLS), '3つの手順書の名前が記録と違います');

  // 6つの名前付きの値：4つを変え、2つは3 mmで固定
  need(Array.isArray(structure.parameters) && structure.parameters.length === 6, '名前付きの値が6つではありません');
  const params = structure.parameters.map((p, i) => {
    need(p.name === PARAM_ORDER[i], `名前付きの値の${i + 1}番目が ${PARAM_ORDER[i]} ではありません`);
    const value = {name: p.name, jp: PARAM_JP[p.name], default: mm(p.default), resized: mm(p.resized), driving: p.driving, comment: p.comment};
    need(Number.isFinite(value.default) && Number.isFinite(value.resized), `${p.name} の値を読めません`);
    need(p.driving === DRIVING.includes(p.name), `${p.name} の「変える／固定」の区分が違います`);
    if (p.driving) need(value.default !== value.resized, `${p.name} が変更されていません`);
    else need(value.default === 3 && value.resized === 3, `${p.name} が3 mm固定ではありません`);
    return value;
  });
  const paramValues = key => Object.fromEntries(params.filter(p => p.driving).map(p => [p.name, p[key]]));

  // 3つの順番どおりの履歴とボディ1つ。保存した2つの設計で features は同じ
  need(Array.isArray(structure.features) && structure.features.length === 3, '履歴が3件ではありません');
  structure.features.forEach((f, i) => {
    need(f.name === FEATURES[i].name && f.type === FEATURES[i].type && f.operation === FEATURES[i].operation && f.suppressed === false,
      `履歴の${i + 1}件目が ${FEATURES[i].name} ではありません`);
  });
  need(deepEqual(structure.features[0].body_names, ['Tray']) && deepEqual(structure.features[1].participants, ['Tray']) &&
    deepEqual(structure.features[2].participants, ['Tray']), 'ボディが Tray の1つではありません');
  need(sameNumbers(structure.features[2].base, [0, 0, -1]) && sameNumbers(structure.features[2].axis, [0, 0, 1]),
    '穴の位置が中心 x=y=0、z=−1 からではありません');
  for (const key of ['default', 'resized']) {
    const design = designs[key];
    const label = `outputs/tray-${key}.json`;
    need(design.format === 'solidcraft/20' && design.units === 'mm', `${label} の形式が solidcraft/20・mm ではありません`);
    need(Array.isArray(design.params) && design.params.length === 6, `${label} の値が6つではありません`);
    design.params.forEach((p, i) => {
      need(p.name === params[i].name && p.expr === `${params[i][key]} mm` && p.comment === params[i].comment,
        `${label} の ${params[i].name} が記録と違います`);
    });
    need(deepEqual(design.features, structure.features), `${label} の履歴が記録と違います`);
  }
  need(deepEqual(designs.default.features, designs.resized.features), '保存した2つの設計の履歴が同じではありません');

  // 状態の数値：structure・measurements・original-run・samples・expected の突き合わせ
  const stateKeys = ['block_default', 'pocket_default', 'default', 'resized'];
  for (const key of stateKeys) {
    const own = key === 'resized' ? paramValues('resized') : paramValues('default');
    const m = measurements.states && measurements.states[key];
    checkStateLoose(key, m, own);
    const s = structure.states && structure.states[key];
    const r = run.build_stage_measures && run.build_stage_measures[key];
    need(s && r && sameMeasured(m.measured, s.measured) && sameMeasured(m.measured, r.measured) &&
      m.expected.volume_mm3 === s.expected.volume_mm3 && m.expected.volume_mm3 === r.expected.volume_mm3,
      `${key} の実測値が記録どうしで一致しません`);
  }
  checkState('初期（default）', measurements.states.default, paramValues('default'));
  checkState('変更後（resized）', measurements.states.resized, paramValues('resized'));
  need(expected.states && expected.states.default && expected.states.all_max, 'cad/expected.json の状態が足りません');
  need(expected.states.default.expected.volume_mm3 === measurements.states.default.expected.volume_mm3 &&
    expected.states.all_max.expected.volume_mm3 === measurements.states.resized.expected.volume_mm3,
    '予測値（expected.json）と記録の予測値が一致しません');
  need(deepEqual(expected.fixed_parameters, {wall: 3, floor_thickness: 3}) && deepEqual(expected.default_parameters, paramValues('default')),
    'cad/expected.json の値が記録と違います');

  // 2つの作例：ID・順番・中身
  need(samples.format === 'input-output' && samples.synthetic === true && Array.isArray(samples.samples) && samples.samples.length === 2,
    'samples.json の形式が違います');
  need(Array.isArray(structure.samples) && structure.samples.length === 2, 'concept/structure.json の作例が2つではありません');
  CASE_IDS.forEach((id, i) => {
    need(samples.samples[i].id === id && structure.samples[i].id === id, `作例の${i + 1}番目が ${id} ではありません`);
    need(deepEqual(samples.samples[i], structure.samples[i]), `${id} の入力と結果が記録どうしで一致しません`);
    const key = CASE_KEY[id];
    const out = samples.samples[i].output;
    const state = measurements.states[key];
    need(out.body_count === 1 && out.status === 'passed', `${id} のボディ数か状態が違います`);
    need(out.volume_mm3 === state.measured.volume_mm3 && out.expected_volume_mm3 === state.expected.volume_mm3 &&
      out.area_mm2 === state.measured.area_mm2 && sameNumbers(out.center_of_mass_mm, state.measured.center_of_mass) &&
      sameNumbers(out.bbox_mm.min, state.measured.bbox.min) && sameNumbers(out.bbox_mm.max, state.measured.bbox.max),
      `${id} の数値が measurements.json と一致しません`);
    need(out.timeline.length === 3 && out.timeline.every((f, j) => f.name === FEATURES[j].name && f.error === null && f.warning === null),
      `${id} の履歴が違います`);
    need(deepEqual(out.files, structure.images[key]) && deepEqual(out.files, measurements.files[key]), `${id} のファイルの場所が記録と違います`);
  });
  need(samples.samples[0].input.request === request.replace(/\n+$/, ''), 'request.txt と samples.json の依頼文が一致しません');
  need(deepEqual(samples.samples[1].input.commands, resize.commands), 'cad/resize.json と samples.json の変更コマンドが一致しません');

  // コマンド：作る3段・4つの変更・往復
  const adds = build.commands.filter(c => c.command === 'parameters.add');
  need(adds.length === 6 && adds.every((c, i) => c.params.name === params[i].name && c.params.expression === `${params[i].default} mm`),
    'cad/build.json の値が記録と違います');
  const solids = build.commands.filter(c => c.command.startsWith('solid.'));
  need(solids.length === 3 && solids.every((c, i) => c.params.name === FEATURES[i].name), 'cad/build.json の3つの形が違います');
  need(solids[0].params.operation === 'new' && solids[0].params.body_name === 'Tray' &&
    deepEqual(solids[0].params.center, [0, 0, 'height / 2']), 'TrayBlock の作り方が記録と違います');
  need(solids[1].params.operation === 'cut' && solids[2].params.operation === 'cut' && sameNumbers(solids[2].params.base, [0, 0, -1]),
    'Pocket・DrainHole の作り方が記録と違います');
  need(resize.commands.length === 5 && DRIVING.every((name, i) => resize.commands[i].command === 'parameters.change' &&
    resize.commands[i].params.name === name && resize.commands[i].params.expression === `${params[i].resized} mm`) &&
    resize.commands[4].command === 'document.inspect', 'cad/resize.json の4つの変更が記録と違います');

  // 元の実行：25回のMCP操作・往復11状態/6形・6ファイルの開き直し
  need(run.model && run.model.requested === 'claude-opus-5-5' && deepEqual(run.model.reported, ['claude-opus-5-5']) &&
    Array.isArray(run.model.receipts) && run.model.receipts.length === 2, '元の制作モデルの記録が違います');
  need(Array.isArray(run.calls) && run.calls.length === 25, 'MCPの操作が25回ではありません');
  run.calls.forEach((call, i) => need(call.index === i + 1 && MCP_TOOLS.includes(call.tool) && call.is_error === false,
    `MCPの${i + 1}回目の記録が違います`));
  const checks = structure.checks;
  const batches = run.calls.filter(call => call.tool === 'batch').length;
  need(checks.mcp_calls === 25 && checks.build_stages === 3 && checks.resize_batch === 1 && batches === 4,
    'MCPの batch が「作る3段＋変更1回」になっていません');
  need(deepEqual(run.runtime, checks.original_runtime), '元の実行の記録が structure.json と違います');
  const release = run.runtime.official_release;
  need(release.version === '0.11.1' && release.commit === RUNTIME_COMMIT && release.mode === 'isolated headless MCP stdio' &&
    release.shared_gui_accessed === false && run.runtime.human_approval === false && run.runtime.manufacturing_tested === false,
    '実行環境の記録（0.11.1・headless・共有GUIなし）が違います');
  const regression = run.regression;
  const plannedWalk = expected.sequences.walk.cases;
  need(regression.ok === true && regression.cases.length === 11 && checks.walk_states === 11 && plannedWalk.length === 11,
    '端点の往復が11状態ではありません');
  regression.cases.forEach((c, i) => {
    need(c.ok === true && c.label === plannedWalk[i].label && c.step === plannedWalk[i].inspect_index && c.state === plannedWalk[i].state &&
      walk.commands[c.step] && walk.commands[c.step].command === 'document.inspect' && expected.states[c.state],
      `往復の${i + 1}状態目の記録が違います`);
  });
  const distinct = new Set(regression.cases.map(c => c.state));
  need(distinct.size === 6 && checks.walk_distinct_shapes === 6, '往復した形が6種類ではありません');
  const mWalk = measurements.regression;
  need(mWalk && mWalk.cases.length === 11 && mWalk.cases.every((c, i) => c.label === regression.cases[i].label && c.ok === true),
    'measurements.json の往復の記録が一致しません');
  const buildCases = run.additional_regressions.build.cases;
  need(buildCases.length === 3 && buildCases.every((c, i) => c.ok === true && c.step === expected.sequences.build.cases[i].inspect_index &&
    build.commands[c.step].command === 'document.inspect'), '作る3段の点検記録が違います');
  const resizeCases = run.additional_regressions.resize.cases;
  need(resizeCases.length === 1 && resizeCases[0].ok === true && resize.commands[resizeCases[0].step].command === 'document.inspect',
    '変更1回の点検記録が違います');

  // 6つの書き出し（outputs）と開き直し、4枚のPNG
  need(Array.isArray(structure.outputs) && structure.outputs.length === 6 && checks.roundtrip_files === 6, '書き出しが6ファイルではありません');
  const outputs = {};
  let index = 0;
  for (const id of CASE_IDS) {
    const key = CASE_KEY[id];
    outputs[id] = {};
    for (const format of FORMATS) {
      const record = structure.outputs[index];
      index += 1;
      const path = `outputs/${id}.${format}`;
      need(record.id === id && record.format === format && record.path === path, `書き出しの記録の順番が違います（${path}）`);
      const entry = get(path);
      need(record.bytes === entry.bytes && record.sha256 === entry.sha256, `${path} の大きさかSHA-256が記録と違います`);
      need(record.parametric_history === (format === 'json'), `${path} の「式と履歴を保つか」の記録が違います`);
      const trip = run.roundtrips[key] && run.roundtrips[key][format];
      const tripM = measurements.export_roundtrips[key] && measurements.export_roundtrips[key][format];
      need(trip && tripM && trip.status === 'passed' && trip.body_count === 1 && trip.file_sha256 === entry.sha256 && tripM.file_sha256 === entry.sha256,
        `${path} の開き直しの記録が違います`);
      outputs[id][format] = {...entry, format, name: path.split('/').pop(), parametric: record.parametric_history, roundtrip: trip};
    }
  }
  for (const key of ['default', 'resized']) {
    const images = structure.images[key];
    VIEWS.forEach(view => need(images[view] === `renders/tray-${key}-${view}.png`, `${key} の${view}画像の場所が違います`));
    VIEWS.forEach(view => get(images[view]));
    const top = run.top_image_checks[key];
    need(top && top.top_png_sha256 === get(images.top).sha256 && sameNumbers(top.size, [1280, 960]) &&
      top.dark_outline_x_px.length === 6 && top.dark_outline_y_px.length === 6, `${key} の上面画像の確認記録が違います`);
  }

  // 6つの部品：原文の行と引用が一致すること
  need(Array.isArray(structure.parts) && structure.parts.length === 6, '説明用の部品が6つではありません');
  const parts = structure.parts.map((part, i) => {
    need(part.id === PART_IDS[i], `部品の${i + 1}番目が ${PART_IDS[i]} ではありません`);
    need(typeof part.source_path === 'string' && part.source_path.startsWith('vendor/solidcraft/'), `${part.id} の原典の場所が不正です`);
    const lines = decodeText(get(part.source_path)).split(/\r?\n/);
    need(Number.isInteger(part.line_start) && lines[part.line_start - 1] === part.quote,
      `${part.id} の引用が原典 ${part.source_path} の${part.line_start}行目と一致しません`);
    const upstream = part.source_path.slice('vendor/solidcraft/'.length);
    need(part.source_url === `https://github.com/tangency-labs/solidcraft/blob/${SOURCE_COMMIT}/${upstream}#L${part.line_start}`,
      `${part.id} の原典URLが参照コミットと一致しません`);
    return {...part, upstream};
  });

  const cases = {};
  CASE_IDS.forEach((id, i) => {
    const key = CASE_KEY[id];
    const state = measurements.states[key];
    cases[id] = {
      id, key, label: samples.samples[i].label,
      params: paramValues(key), fixed: {...state.fixed_parameters},
      measured: state.measured, expected: state.expected, tolerance: state.tolerance,
      topCheck: run.top_image_checks[key], stl: run.runtime.stl_checks[key],
      images: {iso: structure.images[key].iso, top: structure.images[key].top}
    };
  });

  return {
    manifest, files, structure, run, samples, measurements, build, resize, walk, expected, designs,
    request, requestRaw, params, features: structure.features, parts, cases, outputs,
    calls: run.calls.map(call => call.tool),
    walkStates: regression.cases.map(c => c.state),
    numbers: {
      assets: files.size, mcpCalls: run.calls.length, batches, buildStages: checks.build_stages, resizeBatch: checks.resize_batch,
      walkStates: regression.cases.length, walkShapes: distinct.size, reopen: checks.roundtrip_files,
      features: structure.features.length, bodies: checks.body_count
    },
    limits: Array.isArray(structure.limits) ? structure.limits.slice() : [],
    images: {}
  };
}

function checkStateLoose(label, state, params) {
  need(state && state.parameters && state.measured && state.measured.bbox && state.expected, `${label} の記録が足りません`);
  DRIVING.forEach(name => need(state.parameters[name] === params[name], `${label} の ${name} が記録どうしで違います`));
}

async function decodePng(entry) {
  const head = new Uint8Array(entry.buffer, 0, 8);
  need(PNG_SIGNATURE.every((byte, i) => head[i] === byte), `${entry.path} はPNGではありません`);
  const blob = new Blob([entry.buffer], {type: 'image/png'});
  let bitmap = null;
  try {
    if (typeof createImageBitmap === 'function') {
      bitmap = await createImageBitmap(blob);
    } else {
      const url = URL.createObjectURL(blob);
      try {
        const image = new Image();
        image.src = url;
        await image.decode();
        bitmap = image;
      } finally {
        URL.revokeObjectURL(url);
      }
    }
  } catch (_) {
    throw new ConceptError(`${entry.path} を画像として展開できません`);
  }
  const width = bitmap.naturalWidth || bitmap.width;
  const height = bitmap.naturalHeight || bitmap.height;
  need(width === 1280 && height === 960, `${entry.path} の大きさが1280×960ではありません`);
  return {path: entry.path, blob, bitmap, width, height};
}

async function decodeImages(model) {
  const jobs = [];
  for (const id of CASE_IDS) {
    model.images[id] = {};
    for (const view of VIEWS) {
      const path = model.cases[id].images[view];
      jobs.push(decodePng(model.files.get(path)).then(image => { model.images[id][view] = image; }));
    }
  }
  await Promise.all(jobs);
}

// ---- 図の配置（設計上の座標。描画時に画面へ一様に縮める） ----

const R = (x, y, w, h) => ({x, y, w, h});

const LINK_IDS = [
  'books>author', 'request>author', 'author>expect', 'author>cmds', 'cmds>operator', 'operator>mcp',
  'v_width>e1', 'v_width>e2', 'v_depth>e1', 'v_depth>e2', 'v_height>e1', 'v_height>e2',
  'v_hole_diameter>e3', 'v_wall>e2', 'v_floor_thickness>e2', 'v_floor_thickness>e3',
  'e1>f1', 'e2>f2', 'e3>f3', 'hist>body',
  'expect>verify', 'body>verify',
  'verify>out_json', 'verify>out_step', 'verify>out_stl',
  'out_json>viewer', 'out_step>viewer', 'out_stl>viewer'
];

export const LAYOUTS = {
  wide: {
    name: 'wide', w: 1280, h: 720, detail: 'full',
    font: {title: 19, label: 18, value: 20, sub: 16, min: 16},
    rects: {
      books: R(24, 48, 96, 150),
      bookModeling: R(24, 48, 96, 46), bookEditing: R(24, 100, 96, 46), bookChecking: R(24, 152, 96, 46),
      request: R(132, 48, 160, 150),
      author: R(24, 222, 268, 74),
      expect: R(24, 318, 124, 70), cmds: R(168, 318, 124, 70),
      operator: R(142, 410, 150, 90),
      legend: R(24, 540, 268, 164),
      cad: R(316, 24, 940, 488),
      mcp: R(332, 452, 620, 40),
      v_width: R(340, 88, 220, 46), v_depth: R(340, 142, 220, 46), v_height: R(340, 196, 220, 46),
      v_hole_diameter: R(340, 250, 220, 46), v_wall: R(340, 330, 220, 46), v_floor_thickness: R(340, 384, 220, 46),
      e1: R(586, 92, 262, 70), e2: R(586, 190, 262, 116), e3: R(586, 330, 262, 96),
      hist: R(864, 66, 150, 360), f1: R(871, 100, 136, 72), f2: R(871, 212, 136, 72), f3: R(871, 342, 136, 72),
      body: R(1028, 66, 216, 372),
      verify: R(316, 532, 452, 100), walk: R(316, 640, 452, 64),
      out_json: R(792, 532, 200, 52), out_step: R(792, 592, 200, 52), out_stl: R(792, 652, 200, 52),
      viewer: R(1004, 532, 252, 172)
    },
    headers: [
      {group: 'books', text: '手順書3冊（SKILL.md）＋依頼', x: 24, y: 32},
      {group: 'values', text: '名前付きの値（6）', x: 340, y: 76},
      {group: 'values', text: '固定（変えない）', x: 340, y: 316},
      {group: 'exprs', text: '式（値から寸法を計算）', x: 586, y: 76}
    ],
    links: {
      default: ['r', 'l'],
      'books>author': ['b', 't'], 'request>author': ['b', 't'],
      'author>expect': ['b', 't'], 'author>cmds': ['b', 't'],
      'cmds>operator': ['b', 't'],
      'expect>verify': {fs: 'b', ts: 't', tat: 420, via: [[86, 520], [420, 520]]},
      'body>verify': {fs: 'b', ts: 't', tat: 700, via: [[1131, 520], [700, 520]]}
    }
  },
  square: {
    name: 'square', w: 360, h: 340, detail: 'compact',
    font: {title: 15, label: 15, value: 14, sub: 14, min: 14},
    rects: {
      books: R(4, 4, 128, 26),
      bookModeling: R(4, 4, 36, 26), bookEditing: R(43, 4, 50, 26), bookChecking: R(96, 4, 36, 26),
      request: R(4, 36, 128, 48),
      author: R(144, 4, 70, 80),
      cmds: R(224, 4, 64, 36), expect: R(224, 48, 64, 36),
      operator: R(296, 4, 62, 80),
      cad: R(14, 92, 344, 160),
      mcp: R(316, 92, 16, 6),
      v_width: R(20, 114, 84, 20), v_depth: R(20, 137, 84, 20), v_height: R(20, 160, 84, 20),
      v_hole_diameter: R(20, 183, 84, 20), v_wall: R(20, 206, 84, 20), v_floor_thickness: R(20, 229, 84, 20),
      e1: R(114, 116, 76, 26), e2: R(114, 160, 76, 36), e3: R(114, 214, 76, 26),
      hist: R(198, 112, 74, 136), f1: R(202, 116, 66, 30), f2: R(202, 163, 66, 30), f3: R(202, 212, 66, 30),
      body: R(278, 112, 78, 136),
      verify: R(14, 258, 120, 52), walk: R(14, 314, 120, 24),
      out_json: R(140, 258, 104, 24), out_step: R(140, 286, 104, 24), out_stl: R(140, 314, 104, 24),
      viewer: R(250, 258, 108, 80)
    },
    headers: [
      {group: 'values', text: 'CAD 値(mm)', x: 20, y: 103},
      {group: 'exprs', text: '式', x: 114, y: 103},
      {group: 'hist', text: '履歴', x: 202, y: 103},
      {group: 'body', text: '1ボディ', x: 280, y: 103}
    ],
    links: {
      default: ['r', 'l'],
      'author>cmds': {fs: 'r', ts: 'l', fat: 22},
      'author>expect': {fs: 'r', ts: 'l', fat: 66},
      'operator>mcp': ['b', 't'],
      'expect>verify': {fs: 'b', ts: 'l', via: [[256, 88], [7, 88], [7, 284]]},
      'body>verify': {fs: 'b', ts: 't', fat: 316, tat: 110, via: [[316, 255], [110, 255]]}
    }
  },
  tall: {
    name: 'tall', w: 720, h: 1280, detail: 'tall',
    font: {title: 30, label: 26, value: 26, sub: 22, min: 20},
    rects: {
      header: R(36, 20, 648, 64),
      books: R(36, 92, 312, 162),
      bookModeling: R(36, 92, 312, 50), bookEditing: R(36, 148, 312, 50), bookChecking: R(36, 204, 312, 50),
      request: R(368, 92, 316, 162),
      author: R(150, 272, 420, 76),
      expect: R(36, 372, 200, 72), cmds: R(256, 372, 208, 72), operator: R(484, 372, 200, 72),
      cad: R(20, 466, 680, 610),
      mcp: R(40, 508, 640, 30),
      v_width: R(40, 582, 210, 48), v_depth: R(40, 636, 210, 48), v_height: R(40, 690, 210, 48),
      v_hole_diameter: R(40, 744, 210, 48), v_wall: R(40, 820, 210, 48), v_floor_thickness: R(40, 874, 210, 48),
      e1: R(272, 582, 216, 86), e2: R(272, 684, 216, 122), e3: R(272, 822, 216, 100),
      hist: R(506, 560, 178, 366), f1: R(516, 598, 158, 72), f2: R(516, 709, 158, 72), f3: R(516, 836, 158, 72),
      body: R(40, 938, 644, 128),
      verify: R(36, 1092, 320, 80), walk: R(36, 1180, 320, 90),
      out_json: R(372, 1092, 100, 64), out_step: R(478, 1092, 100, 64), out_stl: R(584, 1092, 100, 64),
      viewer: R(372, 1166, 312, 100)
    },
    headers: [
      {group: 'values', text: '名前付きの値（6）', x: 40, y: 560},
      {group: 'values', text: '固定（変えない）', x: 40, y: 806},
      {group: 'exprs', text: '式', x: 272, y: 560}
    ],
    links: {
      default: ['r', 'l'],
      'books>author': ['b', 't'], 'request>author': ['b', 't'],
      'author>expect': ['b', 't'], 'author>cmds': ['b', 't'],
      'operator>mcp': {fs: 'b', ts: 't', tat: 584},
      'hist>body': {fs: 'b', ts: 't', tat: 595},
      'expect>verify': {fs: 'b', ts: 'l', via: [[136, 452], [8, 452], [8, 1132]]},
      'body>verify': {fs: 'b', ts: 't', fat: 300, tat: 300},
      'verify>out_json': {fs: 'r', ts: 'l', fat: 1124},
      'verify>out_step': {fs: 'r', ts: 't', fat: 1104, via: [[364, 1104], [364, 1084], [528, 1084]]},
      'verify>out_stl': {fs: 'r', ts: 't', fat: 1104, via: [[364, 1104], [364, 1084], [634, 1084]]},
      'out_json>viewer': ['b', 't'], 'out_step>viewer': ['b', 't'], 'out_stl>viewer': ['b', 't']
    }
  }
};

export function layoutNameFor(width, height) {
  const ratio = width / Math.max(1, height);
  if (ratio >= 1.3) return 'wide';
  if (ratio < 0.75) return 'tall';
  return 'square';
}

const GROUP_OF = {
  books: 'books', bookModeling: 'books', bookEditing: 'books', bookChecking: 'books',
  request: 'request', author: 'author', expect: 'papers', cmds: 'papers', operator: 'operator',
  cad: 'cad', mcp: 'cad', e1: 'exprs', e2: 'exprs', e3: 'exprs',
  hist: 'hist', f1: 'hist', f2: 'hist', f3: 'hist', body: 'body',
  verify: 'verify', walk: 'walk', out_json: 'files', out_step: 'files', out_stl: 'files', viewer: 'viewer', legend: 'legend'
};
PARAM_ORDER.forEach(name => { GROUP_OF['v_' + name] = 'values'; });

export const STAGE_GROUPS = [
  ['books', 'request', 'author', 'papers', 'operator'],
  ['cad', 'values', 'exprs', 'hist', 'body'],
  ['verify', 'walk', 'files', 'viewer']
];

const PART_TARGETS = {
  modeling: ['bookModeling'],
  editing: ['bookEditing'],
  checking: ['bookChecking', 'verify', 'walk'],
  commands: ['cmds', 'operator', 'mcp'],
  history: ['v_width', 'v_depth', 'v_height', 'v_hole_diameter', 'v_wall', 'v_floor_thickness', 'e1', 'e2', 'e3', 'hist'],
  formats: ['out_json', 'out_step', 'out_stl']
};

// ---- 線の形（レイアウトごとに一度だけ計算） ----

function anchor(rect, side, at) {
  if (side === 'l') return {x: rect.x, y: at, nx: -1, ny: 0};
  if (side === 'r') return {x: rect.x + rect.w, y: at, nx: 1, ny: 0};
  if (side === 't') return {x: at, y: rect.y, nx: 0, ny: -1};
  return {x: at, y: rect.y + rect.h, nx: 0, ny: 1};
}

function sampleBezier(p0, p1, p2, p3, steps) {
  const out = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps, u = 1 - t;
    out.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]
    ]);
  }
  return out;
}

function sampleRounded(points, radius) {
  const out = [points[0]];
  for (let i = 1; i < points.length - 1; i += 1) {
    const [ax, ay] = points[i - 1], [vx, vy] = points[i], [bx, by] = points[i + 1];
    const la = Math.hypot(ax - vx, ay - vy), lb = Math.hypot(bx - vx, by - vy);
    const r = Math.min(radius, la / 2, lb / 2);
    if (r < 0.5) { out.push(points[i]); continue; }
    const q1 = [vx + (ax - vx) / la * r, vy + (ay - vy) / la * r];
    const q2 = [vx + (bx - vx) / lb * r, vy + (by - vy) / lb * r];
    for (let k = 0; k <= 6; k += 1) {
      const t = k / 6, u = 1 - t;
      out.push([u * u * q1[0] + 2 * u * t * vx + t * t * q2[0], u * u * q1[1] + 2 * u * t * vy + t * t * q2[1]]);
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

function withLengths(points) {
  const lengths = [0];
  for (let i = 1; i < points.length; i += 1) {
    lengths.push(lengths[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
  }
  return {points, lengths, total: lengths[lengths.length - 1]};
}

function pointAt(path, u) {
  const target = Math.max(0, Math.min(1, u)) * path.total;
  const {points, lengths} = path;
  let i = 1;
  while (i < lengths.length - 1 && lengths[i] < target) i += 1;
  const span = lengths[i] - lengths[i - 1] || 1;
  const k = (target - lengths[i - 1]) / span;
  return [points[i - 1][0] + (points[i][0] - points[i - 1][0]) * k, points[i - 1][1] + (points[i][1] - points[i - 1][1]) * k];
}

const geometryCache = new Map();

function geometry(L) {
  if (geometryCache.has(L.name)) return geometryCache.get(L.name);
  const specs = LINK_IDS.map(id => {
    const [from, to] = id.split('>');
    let spec = L.links[id] || L.links.default;
    if (Array.isArray(spec)) spec = {fs: spec[0], ts: spec[1]};
    return {id, from, to, ...spec};
  });
  // 同じ辺から出る線・入る線は辺に沿って等間隔に並べる
  const slots = new Map();
  const claim = (entity, side, id) => {
    const key = entity + ':' + side;
    if (!slots.has(key)) slots.set(key, []);
    slots.get(key).push(id);
  };
  specs.forEach(s => {
    if (s.fat == null) claim(s.from, s.fs, s.id);
    if (s.tat == null) claim(s.to, s.ts, s.id);
  });
  const at = (entity, side, id) => {
    const rect = L.rects[entity];
    const list = slots.get(entity + ':' + side);
    const k = (list.indexOf(id) + 1) / (list.length + 1);
    return side === 'l' || side === 'r' ? rect.y + rect.h * k : rect.x + rect.w * k;
  };
  const paths = {};
  specs.forEach(s => {
    const a = anchor(L.rects[s.from], s.fs, s.fat != null ? s.fat : at(s.from, s.fs, s.id));
    const b = anchor(L.rects[s.to], s.ts, s.tat != null ? s.tat : at(s.to, s.ts, s.id));
    let points;
    if (s.via) {
      points = sampleRounded([[a.x, a.y], ...s.via, [b.x, b.y]], L.w > 400 ? 10 : 5);
    } else {
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      const k = Math.max(L.w > 400 ? 12 : 4, Math.min(d * 0.45, L.w > 400 ? 140 : 40));
      points = sampleBezier([a.x, a.y], [a.x + a.nx * k, a.y + a.ny * k], [b.x + b.nx * k, b.y + b.ny * k], [b.x, b.y], 28);
    }
    paths[s.id] = {...withLengths(points), from: s.from, to: s.to};
  });
  const geo = {paths, routes: new Map()};
  geometryCache.set(L.name, geo);
  return geo;
}

function route(geo, L, ids, startRect) {
  const key = (startRect ? startRect + '|' : '') + ids.join('|');
  if (geo.routes.has(key)) return geo.routes.get(key);
  const points = [];
  if (startRect) {
    const r = L.rects[startRect];
    points.push([r.x + r.w / 2, r.y + r.h / 2]);
  }
  ids.forEach(id => geo.paths[id].points.forEach(p => points.push(p)));
  const path = withLengths(points);
  geo.routes.set(key, path);
  return path;
}

// ---- 時刻から決まる場面（同じ時刻なら必ず同じ画） ----

const smooth = x => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const ramp = (t, a, b) => smooth((t - a) / (b - a));
const pulse = (t, a, b) => ramp(t, a, a + 0.25) * (1 - ramp(t, b - 0.25, b));
const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);

const REVEAL = {
  legend: [0.2, 1.0], books: [0.1, 0.9], request: [0.6, 1.4], author: [1.5, 2.3], papers: [4.6, 5.1], operator: [5.3, 6.0],
  cad: [6.4, 7.3], values: [8.0, 8.8], exprs: [8.8, 9.5], hist: [9.5, 10.2], body: [10.1, 10.6],
  verify: [20.0, 20.7], walk: [22.9, 23.4], files: [26.5, 27.0], viewer: [27.3, 27.9]
};

function linkWindow(id) {
  if (id === 'books>author') return [1.9, 2.7];
  if (id === 'request>author') return [2.1, 2.9];
  if (id === 'author>cmds') return [4.0, 4.8];
  if (id === 'author>expect') return [4.2, 5.0];
  if (id === 'cmds>operator') return [5.8, 6.4];
  if (id === 'operator>mcp') return [6.8, 7.6];
  if (id.startsWith('v_')) return [9.0, 10.0];
  if (/^e\d>f\d$/.test(id)) return [9.8, 10.5];
  if (id === 'hist>body') return [10.3, 10.8];
  if (id === 'expect>verify') return [20.2, 21.6];
  if (id === 'body>verify') return [20.6, 21.8];
  if (id.startsWith('verify>')) return [26.0, 26.6];
  return [27.1, 27.6];
}

// 元のMCP 25回を、作る3段と変更1回の流れに合わせて点灯させる時刻（説明用。実行時刻ではない）
const CALL_TIMES = [8.2, 10.6, 11.2, 11.35, 11.6, 12.2, 12.35, 12.6, 13.2, 13.35, 13.5, 13.6, 13.7, 13.8, 13.9, 14.0,
  14.4, 18.8, 18.95, 19.1, 19.25, 19.4, 19.55, 19.7, 19.85];
const TAG_ROUTE = {
  width: ['v_width>e1', 'e1>f1', 'hist>body'],
  depth: ['v_depth>e2', 'e2>f2', 'hist>body'],
  height: ['v_height>e1', 'e1>f1', 'hist>body'],
  hole_diameter: ['v_hole_diameter>e3', 'e3>f3', 'hist>body']
};
const TAG_FEATURE = {width: 0, depth: 1, height: 0, hole_diameter: 2};

export function sceneAt(seconds) {
  const t = Math.min(FILM.duration, Math.max(0, Number(seconds) || 0));
  const scene = {
    t, ghost: true, reveal: {}, links: {}, glow: {}, tokens: [],
    build: 0, featLit: [0, 0, 0], m: [0, 0, 0, 0], sw: [0, 0, 0, 0], valueLit: [0, 0, 0, 0],
    fixedPulse: 0, centerMark: 0, mcpLit: 0, match: 0, walkLit: 0, walkNote: 0, pixelNote: 0, reopen: 0,
    viewer: {a: {caseId: 'tray-default', view: 'iso'}, b: {caseId: 'tray-resized', view: 'iso'}, mix: 0},
    focus: null, part: null, format: null, pixelMarks: false
  };
  for (const [group, [a, b]] of Object.entries(REVEAL)) scene.reveal[group] = ramp(t, a, b);
  for (const id of LINK_IDS) {
    const [a, b] = linkWindow(id);
    scene.links[id] = ramp(t, a, b);
  }
  scene.build = ramp(t, 10.6, 11.3) + ramp(t, 11.6, 12.3) + ramp(t, 12.6, 13.3);
  scene.featLit = [pulse(t, 10.5, 11.6), pulse(t, 11.5, 12.6), pulse(t, 12.5, 13.6)];
  scene.mcpLit = CALL_TIMES.filter(time => t >= time).length;

  // 1〜2：手順書と依頼が同じ作者へ。作者はコマンドと予測値を別々に書き、制作担当がCADへ送る
  for (let k = 0; k < 3; k += 1) {
    const rect = ['bookModeling', 'bookEditing', 'bookChecking'][k];
    scene.tokens.push({kind: 'page', ids: ['books>author'], start: rect, u: (t - (2.0 + 0.18 * k)) / 1.1});
  }
  scene.tokens.push({kind: 'sheet', ids: ['request>author'], u: (t - 2.3) / 1.1, label: '依頼'});
  scene.tokens.push({kind: 'paper', ids: ['author>cmds'], u: (t - 4.0) / 0.8, label: 'コマンド', role: 'author'});
  scene.tokens.push({kind: 'paper', ids: ['author>expect'], u: (t - 4.2) / 0.8, label: '予測値', role: 'author'});
  scene.tokens.push({kind: 'paper', ids: ['cmds>operator', 'operator>mcp'], u: (t - 6.0) / 1.8, label: 'コマンド', role: 'operator'});

  // 3：値→式→履歴→ボディ
  LINK_IDS.filter(id => id.startsWith('v_')).forEach((id, j) => {
    scene.tokens.push({kind: 'dot', ids: [id], u: (t - 9.0 - 0.04 * j) / 1.0, role: id.includes('wall') || id.includes('floor') ? 'fixed' : 'value'});
  });
  ['e1>f1', 'e2>f2', 'e3>f3'].forEach(id => scene.tokens.push({kind: 'dot', ids: [id], u: (t - 9.9) / 0.6, role: 'value'}));
  scene.tokens.push({kind: 'dot', ids: ['hist>body'], u: (t - 10.4) / 0.4, role: 'value'});

  // 4：4つの値の札が同じ線を通り、同じ3つの履歴でボディを計算し直す
  DRIVING.forEach((name, i) => {
    const depart = 14.4 + 0.7 * i;
    scene.sw[i] = ramp(t, depart - 0.1, depart + 0.3);
    scene.m[i] = ramp(t, depart + 2.0, depart + 2.6);
    scene.valueLit[i] = pulse(t, depart - 0.2, depart + 1.0);
    scene.tokens.push({kind: 'tag', ids: TAG_ROUTE[name], u: (t - depart) / 2.2, param: name});
    const along = pulse(t, depart, depart + 1.0);
    LINK_IDS.filter(id => id.startsWith('v_' + name + '>')).forEach(id => { scene.glow[id] = Math.max(scene.glow[id] || 0, along); });
    const feature = 'e' + (TAG_FEATURE[name] + 1) + '>f' + (TAG_FEATURE[name] + 1);
    scene.glow[feature] = Math.max(scene.glow[feature] || 0, pulse(t, depart + 0.9, depart + 1.7));
    scene.glow['hist>body'] = Math.max(scene.glow['hist>body'] || 0, pulse(t, depart + 1.5, depart + 2.3));
    scene.featLit[TAG_FEATURE[name]] = Math.max(scene.featLit[TAG_FEATURE[name]], pulse(t, depart + 1.2, depart + 1.9));
  });
  scene.fixedPulse = pulse(t, 19.0, 20.0);
  scene.centerMark = pulse(t, 19.1, 20.0);

  // 5：予測値と実測が別々の道で来て照合。範囲の端の往復は11状態だけ
  scene.tokens.push({kind: 'paper', ids: ['expect>verify'], u: (t - 20.2) / 1.6, label: '予測', role: 'author'});
  scene.tokens.push({kind: 'paper', ids: ['body>verify'], u: (t - 20.6) / 1.4, label: '実測', role: 'verify'});
  scene.match = ramp(t, 21.8, 22.5);
  scene.walkLit = Array.from({length: 11}, (_, k) => 23.1 + 0.17 * k).filter(time => t >= time).length;
  scene.walkNote = ramp(t, 24.8, 25.3);
  scene.pixelNote = ramp(t, 25.0, 25.6);

  // 6：同じ設計はJSONに、形だけがSTEP・STLに。保存結果ビューアで実PNGを開く
  [['verify>out_json', 'JSON'], ['verify>out_step', 'STEP'], ['verify>out_stl', 'STL']].forEach(([id, label]) => {
    scene.tokens.push({kind: 'paper', ids: [id], u: (t - 26.0) / 0.8, label, role: 'file'});
  });
  ['out_json>viewer', 'out_step>viewer', 'out_stl>viewer'].forEach(id => scene.tokens.push({kind: 'dot', ids: [id], u: (t - 27.1) / 0.7, role: 'file'}));
  scene.reopen = ramp(t, 27.0, 27.5);
  scene.viewer.mix = ramp(t, 28.1, 28.8);

  scene.focus = t < 8 ? 0 : t < 20 ? 1 : t < 29 ? 2 : null;
  return scene;
}

function replaySegment(stage, caseId) {
  if (stage === 0) return [0, 8];
  if (stage === 1) return caseId === 'tray-resized' ? [8, 20] : [8, 14];
  return [20, 29];
}

export function replaySeconds(stage, caseId) {
  const [a, b] = replaySegment(stage, caseId);
  return b - a;
}

/** 構造図ページ用の場面。全体図を常に見せ、選んだ段階だけを動かす。 */
export function pageScene({stage = 0, caseId = 'tray-default', view = 'iso', format = 'json', part = null, morph = null, replay = null} = {}) {
  const resized = caseId === 'tray-resized';
  let scene;
  if (replay != null) {
    const [a, b] = replaySegment(stage, caseId);
    const t = a + clamp01(replay) * (b - a);
    scene = sceneAt(t);
    for (const [group, [ga, gb]] of Object.entries(REVEAL)) if (gb <= a || ga >= b) scene.reveal[group] = 1;
    for (const id of LINK_IDS) {
      const [la, lb] = linkWindow(id);
      if (lb <= a || la >= b) scene.links[id] = 1;
    }
    // この段階より後で起きることは、全体図として完成した姿で見せる
    if (b <= 10.6) scene.build = 3;
    if (b <= 8.2) scene.mcpLit = CALL_TIMES.length;
    if (b <= 21.8) { scene.match = 1; scene.walkLit = 11; scene.walkNote = 1; scene.pixelNote = 1; }
    if (b <= 27.0) scene.reopen = 1;
    if (!(stage === 1 && resized)) {
      const v = resized ? 1 : 0;
      scene.m = [v, v, v, v];
      scene.sw = [v, v, v, v];
      scene.valueLit = [0, 0, 0, 0];
      scene.tokens = scene.tokens.filter(token => token.kind !== 'tag');
      scene.glow = {};
      scene.fixedPulse = 0;
      scene.centerMark = 0;
    }
  } else {
    scene = sceneAt(FILM.duration);
    const v = morph == null ? (resized ? 1 : 0) : clamp01(morph);
    scene.m = [v, v, v, v];
    scene.sw = [v, v, v, v];
    scene.centerMark = stage === 1 ? 1 : 0;
  }
  scene.ghost = false;
  scene.viewer = {a: {caseId, view}, b: null, mix: 0};
  scene.focus = stage;
  scene.part = part;
  scene.format = format;
  scene.pixelMarks = view === 'top';
  return scene;
}

// ---- 色 ----

export const PALETTES = {
  light: {
    bg: '#f4f1ea', paper: '#fffdf8', panel: '#ebe6da', ink: '#1c1b18', soft: '#57534a', faint: 'rgba(28,27,24,0.16)',
    line: '#8b8578', halo: '#f4f1ea', accent: '#b8381a', accentInk: '#ffffff', accentSoft: 'rgba(184,56,26,0.10)',
    operator: '#28588a', operatorSoft: 'rgba(40,88,138,0.09)', verify: '#1f6a4e', verifySoft: 'rgba(31,106,78,0.10)',
    fixed: '#6b665b', cadFill: 'rgba(28,27,24,0.025)',
    trayTop: '#ece5d2', traySideA: '#d3c9b1', traySideB: '#bfb498', trayInner: '#d8cfba', trayInnerB: '#cbc1a8', trayFloor: '#e4dcc8', trayHole: '#2a2823',
    tools: {inspect_design: '#8b8578', batch: '#b8381a', measure: '#1f6a4e', screenshot: '#28588a', save: '#1c1b18', export: '#1c1b18', body_topology: '#8b8578'}
  },
  dark: {
    bg: '#16171a', paper: '#202227', panel: '#2a2c31', ink: '#ecebe5', soft: '#b3afa4', faint: 'rgba(236,235,229,0.16)',
    line: '#7d7a72', halo: '#16171a', accent: '#ff8a5c', accentInk: '#1a1310', accentSoft: 'rgba(255,138,92,0.13)',
    operator: '#86b6e8', operatorSoft: 'rgba(134,182,232,0.10)', verify: '#76d0a4', verifySoft: 'rgba(118,208,164,0.11)',
    fixed: '#9d998f', cadFill: 'rgba(236,235,229,0.025)',
    trayTop: '#4a4d55', traySideA: '#393c43', traySideB: '#2f3237', trayInner: '#41444b', trayInnerB: '#3a3d44', trayFloor: '#45484f', trayHole: '#0b0b0c',
    tools: {inspect_design: '#7d7a72', batch: '#ff8a5c', measure: '#76d0a4', screenshot: '#86b6e8', save: '#ecebe5', export: '#ecebe5', body_topology: '#7d7a72'}
  }
};

// ---- 文字 ----

const SANS = '"Hiragino Sans","Hiragino Kaku Gothic ProN","Yu Gothic UI","Yu Gothic","Meiryo","Noto Sans JP",system-ui,sans-serif';
const MONO = 'ui-monospace,"SFMono-Regular","Cascadia Mono",Consolas,"Liberation Mono",monospace';

function font(ctx, size, weight, mono) {
  ctx.font = `${weight || 400} ${size}px ${mono ? MONO : SANS}`;
}

// 枠に収まるよう最小の大きさまで縮め、それでも入らなければ末尾を省く
function text(ctx, L, str, x, y, o = {}) {
  if (!str) return 0;
  let size = o.size || L.font.sub;
  const min = Math.min(size, o.min || L.font.min);
  const weight = o.weight || 400;
  font(ctx, size, weight, o.mono);
  let width = ctx.measureText(str).width;
  if (o.maxW) {
    while (width > o.maxW && size > min) {
      size = Math.max(min, size - 0.5);
      font(ctx, size, weight, o.mono);
      width = ctx.measureText(str).width;
    }
    if (width > o.maxW) {
      let cut = str;
      while (cut.length > 1 && ctx.measureText(cut + '…').width > o.maxW) cut = cut.slice(0, -1);
      str = cut + '…';
      width = ctx.measureText(str).width;
    }
  }
  ctx.fillStyle = o.color || '#000';
  ctx.textAlign = o.align || 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
  return width;
}

const fmt = v => (Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : String(v));
const fmt3 = v => v.toLocaleString('en-US', {minimumFractionDigits: 3, maximumFractionDigits: 3});
const relPercent = (measured, expected) => (Math.abs(measured - expected) / Math.abs(expected) * 100).toFixed(5);

// ---- 形の部品 ----

function roundRect(ctx, r, radius) {
  const k = Math.min(radius, r.w / 2, r.h / 2);
  ctx.beginPath();
  ctx.moveTo(r.x + k, r.y);
  ctx.arcTo(r.x + r.w, r.y, r.x + r.w, r.y + r.h, k);
  ctx.arcTo(r.x + r.w, r.y + r.h, r.x, r.y + r.h, k);
  ctx.arcTo(r.x, r.y + r.h, r.x, r.y, k);
  ctx.arcTo(r.x, r.y, r.x + r.w, r.y, k);
  ctx.closePath();
}

function box(ctx, r, {fill, stroke, width = 1.5, dash = null, radius = 6} = {}) {
  roundRect(ctx, r, radius);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) {
    ctx.lineWidth = width;
    ctx.strokeStyle = stroke;
    ctx.setLineDash(dash || []);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function paper(ctx, r, {fill, stroke, width = 1.5, fold = 10} = {}) {
  const f = Math.min(fold, r.w / 3, r.h / 3);
  ctx.beginPath();
  ctx.moveTo(r.x, r.y);
  ctx.lineTo(r.x + r.w - f, r.y);
  ctx.lineTo(r.x + r.w, r.y + f);
  ctx.lineTo(r.x + r.w, r.y + r.h);
  ctx.lineTo(r.x, r.y + r.h);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  ctx.lineWidth = width;
  ctx.strokeStyle = stroke;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(r.x + r.w - f, r.y);
  ctx.lineTo(r.x + r.w - f, r.y + f);
  ctx.lineTo(r.x + r.w, r.y + f);
  ctx.stroke();
}

function lock(ctx, x, y, size, color) {
  const w = size * 0.7, h = size * 0.55;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1, size * 0.11);
  ctx.beginPath();
  ctx.arc(x, y - h * 0.35, w * 0.3, Math.PI, 0);
  ctx.stroke();
  ctx.fillRect(x - w / 2, y - h * 0.35, w, h);
}

function check(ctx, x, y, size, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.5, size * 0.16);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - size * 0.42, y);
  ctx.lineTo(x - size * 0.12, y + size * 0.3);
  ctx.lineTo(x + size * 0.45, y - size * 0.35);
  ctx.stroke();
  ctx.lineCap = 'butt';
}

function strokePartial(ctx, path, progress) {
  if (progress <= 0) return;
  const limit = path.total * Math.min(1, progress);
  const {points, lengths} = path;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) {
    if (lengths[i] <= limit) {
      ctx.lineTo(points[i][0], points[i][1]);
    } else {
      const k = (limit - lengths[i - 1]) / ((lengths[i] - lengths[i - 1]) || 1);
      ctx.lineTo(points[i - 1][0] + (points[i][0] - points[i - 1][0]) * k, points[i - 1][1] + (points[i][1] - points[i - 1][1]) * k);
      break;
    }
  }
  ctx.stroke();
}

function arrowHead(ctx, path, size, color) {
  const n = path.points.length;
  const [x1, y1] = path.points[n - 1];
  let j = n - 2;
  while (j > 0 && Math.hypot(path.points[j][0] - x1, path.points[j][1] - y1) < size) j -= 1;
  const [x0, y0] = path.points[j];
  const angle = Math.atan2(y1 - y0, x1 - x0);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - size * Math.cos(angle - 0.42), y1 - size * Math.sin(angle - 0.42));
  ctx.lineTo(x1 - size * Math.cos(angle + 0.42), y1 - size * Math.sin(angle + 0.42));
  ctx.closePath();
  ctx.fill();
}

// ---- 模式図のトレー（説明用。CADの出力ではない） ----

function trayDims(model, scene) {
  const by = name => model.params.find(p => p.name === name);
  const lerp = (p, k) => p.default + (p.resized - p.default) * k;
  const value = (name, i) => lerp(by(name), scene.m[i]);
  return {
    W: value('width', 0), D: value('depth', 1), H: value('height', 2), hole: value('hole_diameter', 3),
    wall: by('wall').default, floor: by('floor_thickness').default
  };
}

function trayFrame(model, area) {
  const max = name => {
    const p = model.params.find(q => q.name === name);
    return Math.max(p.default, p.resized);
  };
  const W = max('width'), D = max('depth'), H = max('height');
  const c = 0.8660254, s = 0.5;
  const k = Math.min(area.w / ((W + D) * c), area.h / ((W + D) * s + H));
  return {k, cx: area.x + area.w / 2, oy: area.y + ((W + D) / 2 * s + H) * k + (area.h - ((W + D) * s + H) * k) / 2};
}

function drawTray(ctx, P, frame, dims, build, centerMark) {
  const b1 = clamp01(build), b2 = clamp01(build - 1), b3 = clamp01(build - 2);
  if (b1 <= 0) return;
  const {k, cx, oy} = frame;
  const c = 0.8660254, s = 0.5;
  const pr = (x, y, z) => [cx + (x - y) * c * k, oy + ((x + y) * s - z) * k];
  const poly = (points, fill) => {
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  };
  const {W, D, H, hole, wall, floor} = dims;
  const h = H * b1;
  const x0 = -W / 2, x1 = W / 2, y0 = -D / 2, y1 = D / 2;
  ctx.lineJoin = 'round';
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = P.ink;
  poly([pr(x1, y0, 0), pr(x1, y1, 0), pr(x1, y1, h), pr(x1, y0, h)], P.traySideA); ctx.stroke();
  poly([pr(x0, y1, 0), pr(x1, y1, 0), pr(x1, y1, h), pr(x0, y1, h)], P.traySideB); ctx.stroke();
  const top = [pr(x0, y0, h), pr(x1, y0, h), pr(x1, y1, h), pr(x0, y1, h)];
  if (b2 <= 0) {
    poly(top, P.trayTop); ctx.stroke();
    return;
  }
  const ix0 = x0 + wall, ix1 = x1 - wall, iy0 = y0 + wall, iy1 = y1 - wall;
  const zf = H - (H - floor) * b2;
  const inner = [pr(ix0, iy0, H), pr(ix1, iy0, H), pr(ix1, iy1, H), pr(ix0, iy1, H)];
  ctx.beginPath();
  [top, inner].forEach(ring => ring.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))));
  ctx.fillStyle = P.trayTop;
  ctx.fill('evenodd');
  ctx.save();
  poly(inner);
  ctx.clip();
  poly([pr(ix0, iy0, zf), pr(ix1, iy0, zf), pr(ix1, iy1, zf), pr(ix0, iy1, zf)], P.trayFloor);
  poly([pr(ix0, iy0, zf), pr(ix0, iy1, zf), pr(ix0, iy1, H), pr(ix0, iy0, H)], P.trayInner);
  poly([pr(ix0, iy0, zf), pr(ix1, iy0, zf), pr(ix1, iy0, H), pr(ix0, iy0, H)], P.trayInnerB);
  if (b3 > 0) {
    const r = hole / 2 * b3;
    ctx.beginPath();
    for (let i = 0; i <= 40; i += 1) {
      const a = i / 40 * Math.PI * 2;
      const [x, y] = pr(r * Math.cos(a), r * Math.sin(a), zf);
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = P.trayHole;
    ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = P.ink;
  ctx.lineWidth = 1.2;
  poly(top); ctx.stroke();
  poly(inner); ctx.stroke();
  if (centerMark > 0) {
    const [hx, hy] = pr(0, 0, zf);
    const [bx, by] = pr(0, 0, H + 6);
    const base = ctx.globalAlpha;
    ctx.globalAlpha = base * centerMark;
    ctx.strokeStyle = P.verify;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(bx, by);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = base;
  }
}

// ---- 図全体の描画 ----

/**
 * 図を1枚描く。scene は sceneAt / pageScene の結果。毎回背景から描き直すので、
 * 前に描いた画や呼んだ順番に左右されない。
 */
export function drawConcept(ctx, {width, height, dpr = 1, palette = PALETTES.light, model, scene, layout, film = false}) {
  const L = LAYOUTS[layout || layoutNameFor(width, height)];
  const P = palette;
  const scale = Math.min(width / L.w, height / L.h);
  const ox = (width - L.w * scale) / 2, oy = (height - L.h * scale) / 2;
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalAlpha = 1;
  ctx.fillStyle = P.bg;
  ctx.fillRect(0, 0, width, height);
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * ox, dpr * oy);
  const geo = geometry(L);
  const focus = scene.focus == null ? null : new Set(STAGE_GROUPS[scene.focus]);
  const alphaOf = group => {
    const reveal = group === 'legend' ? (scene.reveal.legend == null ? 1 : scene.reveal.legend) : (scene.reveal[group] == null ? 1 : scene.reveal[group]);
    return reveal * (focus && group !== 'legend' && !focus.has(group) ? 0.78 : 1);
  };
  const env = {ctx, L, P, model, scene, geo, alphaOf, film};
  const caseKey = scene.m.every(v => v >= 0.5) ? 'resized' : 'default';
  env.caseId = caseKey === 'resized' ? 'tray-resized' : 'tray-default';

  if (scene.ghost) drawGhosts(env);
  drawCad(env);
  drawLinks(env);
  drawHeaders(env);
  drawBooks(env);
  drawRequest(env);
  drawRoles(env);
  drawPapers(env);
  drawValues(env);
  drawExprs(env);
  drawHistory(env);
  drawBody(env);
  drawVerify(env);
  drawWalk(env);
  drawFiles(env);
  drawViewer(env);
  if (L.name === 'wide') drawLegend(env);
  if (L.name === 'tall') drawTallHeader(env);
  drawPartRings(env);
  drawTokens(env);
  ctx.restore();
}

function withAlpha(env, group, fn) {
  const a = env.alphaOf(group);
  if (a <= 0.001) return;
  env.ctx.save();
  env.ctx.globalAlpha = a;
  fn(a);
  env.ctx.restore();
}

function drawGhosts(env) {
  const {ctx, L, P, scene} = env;
  ctx.save();
  ctx.globalAlpha = 0.5;
  for (const [entity, rect] of Object.entries(L.rects)) {
    const group = GROUP_OF[entity];
    if (!group || entity === 'books' || entity === 'header') continue;
    const reveal = scene.reveal[group] == null ? 1 : scene.reveal[group];
    if (reveal >= 1) continue;
    box(ctx, rect, {stroke: P.faint, width: 1, radius: entity === 'cad' ? 10 : 5, dash: [3, 4]});
  }
  ctx.restore();
}

function drawCad(env) {
  const {ctx, L, P} = env;
  withAlpha(env, 'cad', () => {
    const r = L.rects.cad;
    box(ctx, r, {fill: P.cadFill, stroke: P.ink, width: 2.2, radius: 10});
    if (L.name === 'wide') {
      const w = text(ctx, L, 'SolidCraft 0.11.1 の中', r.x + 16, r.y + 20, {size: L.font.title, weight: 700, color: P.ink});
      text(ctx, L, '名前付きの値 → 式 → 順番どおりの履歴 → 1つの形（パラメトリックCAD）', r.x + 32 + w, r.y + 20, {color: P.soft, maxW: r.w - w - 48});
    } else if (L.name === 'tall') {
      text(ctx, L, 'SolidCraft 0.11.1 の中（CAD）', r.x + 20, r.y + 22, {size: 24, weight: 700, color: P.ink, maxW: r.w - 40});
    }
    drawMcp(env);
  });
}

function drawMcp(env) {
  const {ctx, L, P, model, scene} = env;
  const r = L.rects.mcp;
  const lit = scene.mcpLit;
  if (L.name === 'square') {
    ctx.fillStyle = P.operator;
    ctx.fillRect(r.x, r.y - 2, r.w, r.h);
    return;
  }
  const labelW = L.name === 'wide' ? 96 : 120;
  text(ctx, L, `MCP ${model.calls.length}回`, r.x + 4, r.y + r.h / 2, {size: L.font.label, weight: 700, color: P.operator});
  const right = L.name === 'wide' ? 196 : 96;
  const span = r.w - labelW - right - 8;
  const step = span / model.calls.length;
  const base = ctx.globalAlpha;
  model.calls.forEach((tool, i) => {
    const x = r.x + labelW + i * step;
    const hh = tool === 'batch' ? r.h * 0.78 : r.h * 0.44;
    ctx.globalAlpha = base * (i < lit ? 1 : 0.22);
    ctx.fillStyle = P.tools[tool] || P.line;
    ctx.fillRect(x + step * 0.18, r.y + (r.h - hh) / 2, Math.max(2, step * 0.62), hh);
  });
  ctx.globalAlpha = base;
  const note = L.name === 'wide'
    ? `batch ${model.numbers.batches}＝作る${model.numbers.buildStages}＋変更${model.numbers.resizeBatch}`
    : `batch ${model.numbers.batches}`;
  text(ctx, L, note, r.x + r.w - 4, r.y + r.h / 2, {color: P.accent, align: 'right', weight: 700, maxW: right - 8});
}

function linkStyle(env, id) {
  const {P} = env;
  if (id.startsWith('v_wall') || id.startsWith('v_floor')) return {color: P.fixed, dash: [4, 3]};
  if (id.startsWith('v_') || /^e\d>f\d$/.test(id) || id === 'hist>body') return {color: P.line};
  if (id === 'cmds>operator' || id === 'operator>mcp') return {color: P.operator};
  if (id === 'body>verify') return {color: P.verify};
  if (id === 'expect>verify') return {color: P.ink, dash: [6, 4]};
  return {color: P.ink};
}

function drawLinks(env) {
  const {ctx, L, P, scene, geo} = env;
  const big = L.w > 400;
  const width = L.name === 'tall' ? 2.2 : big ? 1.7 : 1.1;
  for (const id of LINK_IDS) {
    const path = geo.paths[id];
    const progress = scene.links[id] == null ? 1 : scene.links[id];
    if (progress <= 0) continue;
    // 線を描き出す進み具合は progress が持つ。濃さは両端のうち濃いほうに合わせる
    const alpha = Math.max(env.alphaOf(GROUP_OF[path.from]), env.alphaOf(GROUP_OF[path.to]));
    if (alpha <= 0.001) continue;
    const style = linkStyle(env, id);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = P.halo;
    ctx.lineWidth = width + (big ? 4 : 2.5);
    strokePartial(ctx, path, progress);
    ctx.strokeStyle = style.color;
    ctx.lineWidth = width;
    ctx.setLineDash(style.dash || []);
    strokePartial(ctx, path, progress);
    ctx.setLineDash([]);
    const glow = scene.glow[id] || 0;
    if (glow > 0) {
      ctx.globalAlpha = alpha * glow;
      ctx.strokeStyle = P.accent;
      ctx.lineWidth = width + (big ? 2.5 : 1.5);
      strokePartial(ctx, path, progress);
      ctx.globalAlpha = alpha;
    }
    if (progress >= 0.98) arrowHead(ctx, path, big ? (L.name === 'tall' ? 12 : 9) : 5, glow > 0.5 ? P.accent : style.color);
    ctx.restore();
  }
}

function drawHeaders(env) {
  const {ctx, L, P} = env;
  for (const h of L.headers) {
    withAlpha(env, h.group, () => {
      text(ctx, L, h.text, h.x, h.y, {size: L.name === 'square' ? L.font.sub : L.font.sub, weight: 700, color: P.soft});
    });
  }
}

const BOOK_TEXT = {
  bookModeling: {jp: '作る', tag: '数値を先に、段ごとに測る', en: 'solidcraft-modeling', short: 'modeling'},
  bookEditing: {jp: '変える', tag: '値を変え、作り直さない', en: 'solidcraft-editing', short: 'editing'},
  bookChecking: {jp: '点検', tag: '別の根拠で照合する', en: 'solidcraft-checking', short: 'checking'}
};

function drawBooks(env) {
  const {ctx, L, P} = env;
  withAlpha(env, 'books', () => {
    for (const key of ['bookModeling', 'bookEditing', 'bookChecking']) {
      const r = L.rects[key];
      const t = BOOK_TEXT[key];
      box(ctx, r, {fill: P.paper, stroke: P.ink, width: 1.4, radius: 3});
      const spine = L.name === 'square' ? 3 : L.name === 'tall' ? 10 : 7;
      ctx.fillStyle = P.ink;
      ctx.fillRect(r.x, r.y, spine, r.h);
      if (L.name === 'square') {
        text(ctx, L, t.jp, r.x + spine + (r.w - spine) / 2, r.y + r.h / 2, {size: L.font.sub, weight: 700, color: P.ink, align: 'center', maxW: r.w - spine - 2});
      } else if (L.name === 'tall') {
        const w = text(ctx, L, t.jp, r.x + spine + 12, r.y + 17, {size: 24, weight: 700, color: P.ink});
        text(ctx, L, t.tag, r.x + spine + 24 + w, r.y + 17, {size: 20, color: P.soft, maxW: r.w - spine - 36 - w});
        text(ctx, L, t.en, r.x + spine + 12, r.y + 38, {size: 20, mono: true, color: P.soft, maxW: r.w - spine - 20});
      } else {
        text(ctx, L, t.jp, r.x + spine + 8, r.y + 15, {size: L.font.label, weight: 700, color: P.ink});
        text(ctx, L, t.short, r.x + spine + 8, r.y + 33, {mono: true, color: P.soft, maxW: r.w - spine - 12});
      }
    }
  });
}

function drawRequest(env) {
  const {ctx, L, P, model} = env;
  withAlpha(env, 'request', () => {
    const r = L.rects.request;
    paper(ctx, r, {fill: P.paper, stroke: P.ink, width: 1.4, fold: L.name === 'square' ? 7 : 14});
    const p = name => model.params.find(q => q.name === name);
    const size = key => `${fmt(p('width')[key])}×${fmt(p('depth')[key])}×${fmt(p('height')[key])}`;
    if (L.name === 'square') {
      ctx.fillStyle = P.bg;
      ctx.fillRect(r.x + 4, r.y - 8, 34, 15);
      text(ctx, L, '依頼', r.x + 6, r.y, {weight: 700, color: P.ink});
      text(ctx, L, '初期 ' + size('default'), r.x + 6, r.y + 18, {color: P.ink, maxW: r.w - 10});
      text(ctx, L, '変更 ' + size('resized'), r.x + 6, r.y + 36, {color: P.accent, maxW: r.w - 10});
      return;
    }
    const tall = L.name === 'tall';
    const pad = tall ? 14 : 10;
    const lh = tall ? 28 : 22;
    let y = r.y + (tall ? 24 : 20);
    text(ctx, L, tall ? '依頼（架空の工房）' : '依頼（架空）', r.x + pad, y, {size: L.font.label, weight: 700, color: P.ink, maxW: r.w - pad * 2 - 12});
    y += tall ? 36 : 26;
    const hole = name => fmt(p('hole_diameter')[name]);
    const lines = tall
      ? [['小物トレー・底の中央に穴', P.ink], [`初期 ${size('default')}・穴${hole('default')}`, P.ink],
        [`変更 ${size('resized')}・穴${hole('resized')}`, P.accent], [`壁・底は${fmt(p('wall').default)} mm固定`, P.fixed]]
      : [['小物トレー', P.ink], ['初期 ' + size('default'), P.ink], ['変更 ' + size('resized'), P.accent],
        [`穴 ${hole('default')} → ${hole('resized')} mm`, P.accent], [`壁・底 ${fmt(p('wall').default)} mm 固定`, P.fixed]];
    lines.forEach(([line, color]) => {
      text(ctx, L, line, r.x + pad, y, {color, size: L.font.sub, maxW: r.w - pad * 2});
      y += lh;
    });
  });
}

function drawRoles(env) {
  const {ctx, L, P, model} = env;
  withAlpha(env, 'author', () => {
    const r = L.rects.author;
    box(ctx, r, {fill: P.paper, stroke: P.ink, width: 2, radius: 8});
    if (L.name === 'square') {
      text(ctx, L, '作者AI', r.x + r.w / 2, r.y + 20, {size: L.font.label, weight: 700, color: P.ink, align: 'center', maxW: r.w - 6});
      text(ctx, L, 'Opus 5.5', r.x + r.w / 2, r.y + 42, {color: P.soft, align: 'center', maxW: r.w - 6});
      text(ctx, L, '書くだけ', r.x + r.w / 2, r.y + 62, {color: P.soft, align: 'center', maxW: r.w - 6});
      return;
    }
    const tall = L.name === 'tall';
    const pad = tall ? 16 : 12;
    const w = text(ctx, L, '作者AI', r.x + pad, r.y + (tall ? 22 : 18), {size: tall ? 26 : L.font.label, weight: 700, color: P.ink});
    text(ctx, L, 'Claude Opus 5.5', r.x + r.w - pad, r.y + (tall ? 22 : 18), {mono: true, size: tall ? 20 : 16, color: P.soft, align: 'right', maxW: r.w - w - pad * 3});
    text(ctx, L, '計画・コマンド・予測を書く', r.x + pad, r.y + (tall ? 54 : 40), {color: P.ink, maxW: r.w - pad * 2});
    if (!tall) text(ctx, L, 'CADは自分で動かさない', r.x + pad, r.y + 60, {color: P.soft, maxW: r.w - pad * 2});
  });
  withAlpha(env, 'operator', () => {
    const r = L.rects.operator;
    box(ctx, r, {fill: P.operatorSoft, stroke: P.operator, width: 2, radius: 8});
    box(ctx, {x: r.x + 3, y: r.y + 3, w: r.w - 6, h: r.h - 6}, {stroke: P.operator, width: 0.8, radius: 6});
    if (L.name === 'square') {
      text(ctx, L, '制作担当', r.x + r.w / 2, r.y + 18, {weight: 700, color: P.operator, align: 'center', maxW: r.w - 6});
      text(ctx, L, '別工程', r.x + r.w / 2, r.y + 36, {color: P.operator, align: 'center', maxW: r.w - 6});
      text(ctx, L, `${model.calls.length}操作`, r.x + r.w / 2, r.y + 54, {color: P.operator, align: 'center', maxW: r.w - 6});
      const lit = env.scene.mcpLit;
      const step = (r.w - 12) / model.calls.length;
      model.calls.forEach((tool, i) => {
        ctx.globalAlpha = env.alphaOf('operator') * (i < lit ? 1 : 0.25);
        ctx.fillStyle = P.tools[tool] || P.line;
        const hh = tool === 'batch' ? 8 : 5;
        ctx.fillRect(r.x + 6 + i * step, r.y + 72 - hh / 2, Math.max(1, step * 0.6), hh);
      });
      return;
    }
    const tall = L.name === 'tall';
    const pad = tall ? 16 : 12;
    text(ctx, L, '制作担当', r.x + pad, r.y + (tall ? 22 : 18), {size: tall ? 26 : L.font.label, weight: 700, color: P.operator});
    if (tall) {
      text(ctx, L, `別工程・MCP ${model.calls.length}回`, r.x + pad, r.y + 52, {color: P.operator, maxW: r.w - pad * 2});
    } else {
      text(ctx, L, '別工程で実行', r.x + pad, r.y + 40, {color: P.operator, maxW: r.w - pad * 2});
      text(ctx, L, `MCP ${model.calls.length}回・CLI`, r.x + pad, r.y + 60, {color: P.operator, maxW: r.w - pad * 2});
      text(ctx, L, '共有GUIなし', r.x + pad, r.y + 79, {color: P.soft, maxW: r.w - pad * 2});
    }
  });
}

function drawPapers(env) {
  const {ctx, L, P} = env;
  withAlpha(env, 'papers', () => {
    const items = {
      cmds: {title: 'コマンド', lines: {full: ['build.json', 'resize/walk'], tall: ['JSON 3本'], compact: []}},
      expect: {title: '予測値', lines: {full: ['解析で予測', '＋チェッカー'], tall: ['解析で先に計算'], compact: []}}
    };
    for (const [key, item] of Object.entries(items)) {
      const r = L.rects[key];
      paper(ctx, r, {fill: P.paper, stroke: P.ink, width: 1.4, fold: L.name === 'square' ? 6 : 12});
      if (L.name === 'square') {
        text(ctx, L, item.title, r.x + r.w / 2 - 2, r.y + r.h / 2, {weight: 700, color: P.ink, align: 'center', maxW: r.w - 8});
        continue;
      }
      const tall = L.name === 'tall';
      const pad = tall ? 14 : 10;
      text(ctx, L, item.title, r.x + pad, r.y + (tall ? 22 : 18), {size: tall ? 26 : L.font.label, weight: 700, color: P.ink, maxW: r.w - pad * 2 - 12});
      item.lines[tall ? 'tall' : 'full'].forEach((line, i) => {
        text(ctx, L, line, r.x + pad, r.y + (tall ? 52 : 40) + i * 20, {color: P.soft, maxW: r.w - pad * 2});
      });
    }
  });
}

function drawValues(env) {
  const {ctx, L, P, model, scene} = env;
  withAlpha(env, 'values', alpha => {
    model.params.forEach(p => {
      const r = L.rects['v_' + p.name];
      const i = DRIVING.indexOf(p.name);
      const sw = i >= 0 ? scene.sw[i] : 0;
      const lit = i >= 0 ? scene.valueLit[i] : 0;
      const fixed = !p.driving;
      const pulseFixed = fixed ? scene.fixedPulse : 0;
      box(ctx, r, {fill: fixed ? P.panel : P.paper, stroke: fixed ? P.fixed : (sw >= 0.5 ? P.accent : P.ink), width: fixed ? 1.3 : 1.6,
        dash: fixed ? [4, 3] : null, radius: L.name === 'square' ? 4 : 6});
      if (lit > 0 || pulseFixed > 0) {
        ctx.globalAlpha = alpha * Math.max(lit, pulseFixed);
        box(ctx, {x: r.x - 3, y: r.y - 3, w: r.w + 6, h: r.h + 6}, {stroke: fixed ? P.verify : P.accent, width: 2.5, radius: 8});
        ctx.globalAlpha = alpha;
      }
      const compact = L.name === 'square';
      const tall = L.name === 'tall';
      const valueSize = tall ? 24 : L.font.value;
      const unit = compact ? '' : ' mm';
      const y1 = compact ? r.y + r.h / 2 : tall ? r.y + 15 : r.y + r.h * 0.35;
      text(ctx, L, p.jp, r.x + (compact ? 5 : 10), y1, {size: compact ? L.font.value : tall ? 24 : L.font.label, weight: 700, color: fixed ? P.fixed : P.ink});
      const right = r.x + r.w - (compact ? 5 : 10);
      if (fixed) {
        const label = compact ? `${fmt(p.default)} 固定` : `${fmt(p.default)} mm`;
        const w = text(ctx, L, label, right, y1, {size: valueSize, weight: 700, color: P.fixed, align: 'right'});
        if (!compact) lock(ctx, right - w - 12, y1 + 2, L.name === 'tall' ? 18 : 15, P.fixed);
      } else {
        // 端点の数字だけを出す（途中の値は表示しない）
        const shift = tall ? 14 : compact ? 6 : 10;
        if (sw < 1) {
          ctx.globalAlpha = alpha * (1 - sw);
          text(ctx, L, fmt(p.default) + unit, right, y1 - shift * sw, {size: valueSize, weight: 700, color: P.ink, align: 'right'});
        }
        if (sw > 0) {
          ctx.globalAlpha = alpha * sw;
          text(ctx, L, fmt(p.resized) + unit, right, y1 + shift * (1 - sw), {size: valueSize, weight: 700, color: P.accent, align: 'right'});
        }
        ctx.globalAlpha = alpha;
      }
      if (!compact) {
        const y2 = tall ? r.y + 37 : r.y + r.h * 0.74;
        text(ctx, L, p.name, r.x + 10, y2, {mono: true, size: tall ? 20 : 16, color: P.soft, maxW: r.w - 20 - (fixed ? 44 : 0)});
        if (fixed) text(ctx, L, '固定', right, y2, {color: P.fixed, align: 'right', size: tall ? 20 : 16});
      }
    });
  });
}

const EXPR_TEXT = {
  full: {
    e1: {title: '外形の寸法', lines: [['width, depth, height', true]]},
    e2: {title: 'くぼみの寸法', lines: [['width - 2 * wall', true], ['depth - 2 * wall', true], ['height - floor_thickness', true], ['+ 1 mm は工具のはみ出し', false]]},
    e3: {title: '穴の寸法と位置', lines: [['半径 (hole_diameter) / 2', false], ['中心 x = y = 0', false], ['底 3 mm を貫通', false]]}
  },
  tall: {
    e1: {title: '外形', lines: [['幅・奥行・高さ', false], ['をそのまま使う', false]]},
    e2: {title: 'くぼみ', lines: [['幅 − 2×壁', false], ['奥行 − 2×壁', false], ['深さ ＝ 高さ − 底', false]]},
    e3: {title: '穴', lines: [['半径 ＝ 穴径 ÷ 2', false], ['中心 x ＝ y ＝ 0', false]]}
  },
  compact: {e1: '幅/奥/高', e2: '−2壁・−底', e3: '穴径÷2'}
};

function drawExprs(env) {
  const {ctx, L, P} = env;
  withAlpha(env, 'exprs', () => {
    for (const key of ['e1', 'e2', 'e3']) {
      const r = L.rects[key];
      box(ctx, r, {fill: P.paper, stroke: P.line, width: 1.3, radius: L.name === 'square' ? 4 : 6});
      if (L.name === 'square') {
        text(ctx, L, EXPR_TEXT.compact[key], r.x + r.w / 2, r.y + r.h / 2, {color: P.ink, align: 'center', maxW: r.w - 6});
        continue;
      }
      const tall = L.name === 'tall';
      const e = EXPR_TEXT[tall ? 'tall' : 'full'][key];
      const pad = tall ? 12 : 10;
      const lh = tall ? 25 : 19;
      let y = r.y + (tall ? 18 : 16);
      text(ctx, L, e.title, r.x + pad, y, {size: tall ? 24 : 17, min: 16, weight: 700, color: P.ink, maxW: r.w - pad * 2});
      y += lh + 2;
      e.lines.forEach(([line, mono]) => {
        text(ctx, L, line, r.x + pad, y, {mono, size: tall ? 22 : 16, color: mono ? P.ink : P.soft, maxW: r.w - pad * 2});
        y += lh;
      });
    }
  });
}

const FEATURE_TEXT = {
  full: ['① 箱を作る', '② くぼみを切る', '③ 中央に穴'],
  tall: ['① 箱を作る', '② くぼみを切る', '③ 中央に穴'],
  compact: ['①箱', '②くぼみ', '③穴']
};

function drawHistory(env) {
  const {ctx, L, P, model, scene} = env;
  withAlpha(env, 'hist', alpha => {
    const h = L.rects.hist;
    box(ctx, h, {stroke: P.ink, width: 1, radius: 8, dash: [2, 3]});
    if (L.name === 'wide') text(ctx, L, '履歴（順番）', h.x + 10, h.y + 17, {weight: 700, color: P.soft, maxW: h.w - 16});
    if (L.name === 'tall') text(ctx, L, '履歴（順番）', h.x + 12, h.y + 20, {size: 22, weight: 700, color: P.soft, maxW: h.w - 20});
    const detail = L.name === 'square' ? 'compact' : L.name === 'tall' ? 'tall' : 'full';
    model.features.forEach((f, i) => {
      const r = L.rects['f' + (i + 1)];
      const lit = scene.featLit[i] || 0;
      const built = clamp01(scene.build - i);
      box(ctx, r, {fill: P.paper, stroke: lit > 0.5 ? P.accent : P.ink, width: 1.8, radius: L.name === 'square' ? 4 : 6});
      if (lit > 0) {
        ctx.globalAlpha = alpha * lit;
        box(ctx, {x: r.x - 3, y: r.y - 3, w: r.w + 6, h: r.h + 6}, {stroke: P.accent, width: 2.5, radius: 8});
        ctx.globalAlpha = alpha;
      }
      // 作り終えた段には小さな印
      if (built >= 1 && L.name !== 'square') check(ctx, r.x + r.w - 14, r.y + 14, L.name === 'tall' ? 16 : 12, P.verify);
      const label = FEATURE_TEXT[detail][i];
      if (detail === 'compact') {
        text(ctx, L, label, r.x + r.w / 2, r.y + r.h / 2, {weight: 700, color: P.ink, align: 'center', maxW: r.w - 6});
      } else if (detail === 'tall') {
        text(ctx, L, label, r.x + 12, r.y + 22, {size: 24, weight: 700, color: P.ink, maxW: r.w - 40});
        text(ctx, L, f.name, r.x + 12, r.y + 52, {mono: true, size: 20, color: P.soft, maxW: r.w - 20});
      } else {
        text(ctx, L, label, r.x + 10, r.y + 17, {size: 17, min: 16, weight: 700, color: P.ink, maxW: r.w - 30});
        text(ctx, L, f.name, r.x + 10, r.y + 39, {mono: true, color: P.ink, maxW: r.w - 16});
        const op = f.operation === 'new_body' ? 'new_body（Tray）' : `cut（${f.type === 'cylinder' ? '円柱' : '箱'}）`;
        text(ctx, L, op, r.x + 10, r.y + 58, {color: P.soft, maxW: r.w - 16});
      }
      if (i < 2) {
        const next = L.rects['f' + (i + 2)];
        const x = r.x + r.w / 2, y0 = r.y + r.h + 2, y1 = next.y - 2;
        ctx.strokeStyle = P.ink;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x, y0);
        ctx.lineTo(x, y1);
        ctx.stroke();
        const s = L.name === 'square' ? 3 : 6;
        ctx.fillStyle = P.ink;
        ctx.beginPath();
        ctx.moveTo(x, y1);
        ctx.lineTo(x - s, y1 - s * 1.4);
        ctx.lineTo(x + s, y1 - s * 1.4);
        ctx.closePath();
        ctx.fill();
      }
    });
  });
}

function drawBody(env) {
  const {ctx, L, P, model, scene} = env;
  withAlpha(env, 'body', () => {
    const r = L.rects.body;
    box(ctx, r, {fill: P.paper, stroke: P.ink, width: 2, radius: 8});
    const p = name => model.params.find(q => q.name === name);
    const dims = trayDims(model, scene);
    const val = (name, i) => (scene.m[i] >= 0.5 ? p(name).resized : p(name).default);
    const changed = i => scene.m[i] >= 0.5;
    const dimText = `${fmt(val('width', 0))}×${fmt(val('depth', 1))}×${fmt(val('height', 2))}`;
    const anyChanged = scene.m.some(v => v >= 0.5);
    const tagBox = (x, y, label, size) => {
      font(ctx, size, 700, false);
      const w = ctx.measureText(label).width + size * 0.8;
      box(ctx, {x, y: y - size * 0.75, w, h: size * 1.5}, {fill: P.bg, stroke: P.soft, width: 1, radius: 3});
      text(ctx, L, label, x + w / 2, y, {size, weight: 700, color: P.soft, align: 'center'});
      return w;
    };
    if (L.name === 'square') {
      const frame = trayFrame(model, {x: r.x + 3, y: r.y + 4, w: r.w - 6, h: 64});
      drawTray(ctx, P, frame, dims, scene.build, scene.centerMark);
      text(ctx, L, dimText, r.x + r.w / 2, r.y + 82, {color: anyChanged ? P.accent : P.ink, weight: 700, align: 'center', maxW: r.w - 4});
      text(ctx, L, `穴 ${fmt(val('hole_diameter', 3))}`, r.x + r.w / 2, r.y + 100, {color: changed(3) ? P.accent : P.ink, align: 'center', maxW: r.w - 4});
      const w = (font(ctx, 14, 700, false), ctx.measureText('模式図').width + 11);
      tagBox(r.x + (r.w - w) / 2, r.y + 121, '模式図', 14);
      return;
    }
    if (L.name === 'tall') {
      text(ctx, L, 'ボディ1つ', r.x + 18, r.y + 28, {size: 26, weight: 700, color: P.ink});
      text(ctx, L, `「${model.features[0].body_names[0]}」`, r.x + 14, r.y + 60, {size: 22, color: P.ink});
      tagBox(r.x + 18, r.y + 98, '模式図', 20);
      const frame = trayFrame(model, {x: r.x + 170, y: r.y + 8, w: 300, h: r.h - 16});
      drawTray(ctx, P, frame, dims, scene.build, scene.centerMark);
      const x = r.x + r.w - 16;
      text(ctx, L, dimText, x, r.y + 30, {size: 26, weight: 700, color: anyChanged ? P.accent : P.ink, align: 'right', maxW: 150});
      text(ctx, L, `穴 ${fmt(val('hole_diameter', 3))} mm`, x, r.y + 64, {size: 22, color: changed(3) ? P.accent : P.ink, align: 'right', maxW: 150});
      text(ctx, L, `壁・底 ${fmt(dims.wall)} 固定`, x, r.y + 96, {size: 22, color: P.fixed, align: 'right', maxW: 150});
      return;
    }
    text(ctx, L, `ボディ1つ「${model.features[0].body_names[0]}」`, r.x + 12, r.y + 20, {size: L.font.label, weight: 700, color: P.ink, maxW: r.w - 24});
    font(ctx, 16, 700, false);
    const tw = ctx.measureText('模式図').width + 13;
    tagBox(r.x + r.w - tw - 10, r.y + 50, '模式図', 16);
    const frame = trayFrame(model, {x: r.x + 10, y: r.y + 64, w: r.w - 20, h: 220});
    drawTray(ctx, P, frame, dims, scene.build, scene.centerMark);
    text(ctx, L, dimText + ' mm', r.x + r.w / 2, r.y + 302, {size: L.font.value, weight: 700, color: anyChanged ? P.accent : P.ink, align: 'center', maxW: r.w - 16});
    text(ctx, L, `穴 ${fmt(val('hole_diameter', 3))} mm・中央のまま`, r.x + r.w / 2, r.y + 328, {color: changed(3) ? P.accent : P.ink, align: 'center', maxW: r.w - 16});
    text(ctx, L, `壁・底 ${fmt(dims.wall)} mm（固定）`, r.x + r.w / 2, r.y + 352, {color: P.fixed, align: 'center', maxW: r.w - 16});
  });
}

function drawVerify(env) {
  const {ctx, L, P, model, scene} = env;
  withAlpha(env, 'verify', alpha => {
    const r = L.rects.verify;
    box(ctx, r, {fill: P.verifySoft, stroke: P.verify, width: 1.8, radius: 8});
    const c = model.cases[env.caseId];
    const diff = relPercent(c.measured.volume_mm3, c.expected.volume_mm3);
    const m = scene.match;
    if (L.name === 'square') {
      text(ctx, L, '予測≈実測', r.x + 8, r.y + 16, {size: L.font.label, weight: 700, color: P.verify, maxW: r.w - 14});
      ctx.globalAlpha = alpha * m;
      check(ctx, r.x + 13, r.y + 37, 12, P.verify);
      text(ctx, L, '許容差内', r.x + 24, r.y + 37, {color: P.verify, maxW: r.w - 30});
      ctx.globalAlpha = alpha;
      return;
    }
    const tall = L.name === 'tall';
    const pw = tall ? 92 : 104, ph = tall ? 30 : 30;
    const left = {x: r.x + 10, y: r.y + 8, w: pw, h: ph};
    const right = {x: r.x + r.w - pw - 10, y: r.y + 8, w: pw, h: ph};
    paper(ctx, left, {fill: P.paper, stroke: P.ink, width: 1.2, fold: 7});
    paper(ctx, right, {fill: P.paper, stroke: P.verify, width: 1.2, fold: 7});
    text(ctx, L, tall ? '予測' : '予測（作者）', left.x + 8, left.y + ph / 2, {color: P.ink, weight: 700, maxW: pw - 14, size: tall ? 22 : 16});
    text(ctx, L, tall ? '実測' : '実測（CAD）', right.x + 8, right.y + ph / 2, {color: P.verify, weight: 700, maxW: pw - 14, size: tall ? 22 : 16});
    ctx.globalAlpha = alpha * (0.35 + 0.65 * m);
    text(ctx, L, m > 0.5 ? '≈ 許容差内' : '≈ ?', r.x + r.w / 2, r.y + 8 + ph / 2, {size: tall ? 24 : L.font.label, weight: 700, color: P.verify, align: 'center', maxW: r.w - pw * 2 - 30});
    ctx.globalAlpha = alpha * m;
    if (tall) {
      text(ctx, L, `体積の差 ${diff} %`, r.x + 12, r.y + 58, {size: 22, color: P.ink, maxW: r.w - 24});
    } else {
      text(ctx, L, `体積 予測 ${fmt3(c.expected.volume_mm3)}／実測 ${fmt3(c.measured.volume_mm3)} mm³`, r.x + 12, r.y + 58, {color: P.ink, maxW: r.w - 24});
      text(ctx, L, 'run.py＝状態点検・check_design.py＝解析値と照合', r.x + 12, r.y + 80, {color: P.soft, maxW: r.w - 24});
    }
    ctx.globalAlpha = alpha;
  });
}

const WALK_LETTER = {width_max: '幅', depth_max: '奥', height_max: '高', hole_max: '穴', all_max: '全'};

function drawWalk(env) {
  const {ctx, L, P, model, scene} = env;
  withAlpha(env, 'walk', alpha => {
    const r = L.rects.walk;
    box(ctx, r, {fill: P.paper, stroke: P.verify, width: 1.2, radius: 6});
    const compact = L.name === 'square';
    const tall = L.name === 'tall';
    const step = compact ? 6.2 : tall ? 26 : 22;
    const x0 = r.x + (compact ? 7 : tall ? 22 : 18);
    const y = r.y + (compact ? r.h / 2 : tall ? 15 : 14);
    const rad = compact ? 2.4 : tall ? 8 : 7;
    model.walkStates.forEach((state, k) => {
      const x = x0 + k * step;
      const lit = k < scene.walkLit;
      ctx.globalAlpha = alpha * (lit ? 1 : 0.3);
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      if (state === 'default') {
        ctx.fillStyle = P.paper;
        ctx.fill();
        ctx.strokeStyle = P.verify;
        ctx.lineWidth = compact ? 1 : 1.6;
        ctx.stroke();
      } else {
        ctx.fillStyle = P.verify;
        ctx.fill();
      }
      if (!compact && state !== 'default') text(ctx, L, WALK_LETTER[state] || '', x, y + (tall ? 20 : 18), {size: tall ? 20 : 16, weight: 700, color: P.verify, align: 'center'});
    });
    ctx.globalAlpha = alpha;
    const n = model.numbers;
    if (compact) {
      text(ctx, L, `${n.walkStates}状態`, r.x + r.w - 4, y, {color: P.verify, weight: 700, align: 'right'});
      return;
    }
    const after = x0 + (model.walkStates.length - 1) * step + rad + 12;
    if (tall) {
      ctx.globalAlpha = alpha * Math.max(0.35, scene.walkNote);
      text(ctx, L, `端点往復 ${n.walkStates}状態・${n.walkShapes}形`, r.x + 14, r.y + 57, {size: 22, weight: 700, color: P.verify, maxW: r.w - 24});
      text(ctx, L, '途中の値・ほかの組合せは未検証', r.x + 14, r.y + 78, {size: 20, color: P.soft, maxW: r.w - 24});
    } else {
      ctx.globalAlpha = alpha * Math.max(0.35, scene.walkNote);
      text(ctx, L, `端点往復 ${n.walkStates}状態・${n.walkShapes}形`, after, y, {weight: 700, color: P.verify, maxW: r.x + r.w - after - 8});
      text(ctx, L, '途中の値・ほかの組合せ・壁/底の変更は未検証', r.x + 14, r.y + 52, {color: P.soft, maxW: r.w - 24});
    }
    ctx.globalAlpha = alpha;
  });
}

const FILE_TEXT = {
  out_json: {fmt: 'json', title: 'JSON', full: ['JSON 正本', '値・式・履歴が残る'], tall: ['JSON', '式あり'], compact: '式あり'},
  out_step: {fmt: 'step', title: 'STEP', full: ['STEP', 'CAD受渡し・式なし'], tall: ['STEP', '式なし'], compact: '式なし'},
  out_stl: {fmt: 'stl', title: 'STL', full: ['STL', '三角形・式なし'], tall: ['STL', '三角形'], compact: '三角形'}
};

function drawFiles(env) {
  const {ctx, L, P, scene} = env;
  withAlpha(env, 'files', alpha => {
    for (const [key, t] of Object.entries(FILE_TEXT)) {
      const r = L.rects[key];
      const selected = scene.format === t.fmt;
      paper(ctx, r, {fill: P.paper, stroke: selected ? P.accent : P.ink, width: selected ? 2.6 : 1.4, fold: L.name === 'square' ? 6 : 10});
      const json = t.fmt === 'json';
      if (L.name === 'square') {
        const w = text(ctx, L, t.title, r.x + 6, r.y + r.h / 2, {weight: 700, color: json ? P.ink : P.soft});
        text(ctx, L, t.compact, r.x + 12 + w, r.y + r.h / 2, {color: json ? P.ink : P.soft, maxW: r.w - w - 20});
        continue;
      }
      const tall = L.name === 'tall';
      const lines = t[tall ? 'tall' : 'full'];
      const pad = 10;
      text(ctx, L, lines[0], r.x + pad, r.y + (tall ? 20 : 16), {size: tall ? 22 : L.font.label, weight: 700, color: P.ink, mono: tall, maxW: tall ? r.w - pad * 2 : r.w - pad * 2 - 44});
      text(ctx, L, lines[1], r.x + pad, r.y + (tall ? 46 : 36), {size: tall ? 20 : 16, color: json ? P.ink : P.soft, maxW: r.w - pad * 2});
      // 2つの状態とも、0.11.1で開き直して確かめた印（元の記録）
      ctx.globalAlpha = alpha * scene.reopen;
      const cy = r.y + (tall ? 20 : 16);
      check(ctx, r.x + r.w - (tall ? 28 : 40), cy, 11, P.verify);
      check(ctx, r.x + r.w - (tall ? 14 : 24), cy, 11, P.verify);
      ctx.globalAlpha = alpha;
    }
  });
}

function drawImageFit(ctx, image, frame) {
  const k = Math.min(frame.w / image.width, frame.h / image.height);
  const w = image.width * k, h = image.height * k;
  const x = frame.x + (frame.w - w) / 2, y = frame.y + (frame.h - h) / 2;
  ctx.drawImage(image.bitmap, x, y, w, h);
  return {x, y, w, h, k};
}

const VIEW_JP = {iso: '等角', top: '上面'};

function drawViewer(env) {
  const {ctx, L, P, model, scene} = env;
  withAlpha(env, 'viewer', alpha => {
    const r = L.rects.viewer;
    box(ctx, r, {fill: P.paper, stroke: P.ink, width: 1.8, radius: 8});
    let frame;
    if (L.name === 'square') frame = {x: r.x + 6, y: r.y + 6, w: r.w - 12, h: r.h - 12};
    else if (L.name === 'tall') frame = {x: r.x + 8, y: r.y + 8, w: 112, h: r.h - 16};
    else frame = {x: r.x + 8, y: r.y + 28, w: r.w - 16, h: r.h - 54};
    ctx.fillStyle = '#e9edf2';
    ctx.fillRect(frame.x, frame.y, frame.w, frame.h);
    const v = scene.viewer;
    const show = (sel, a) => {
      if (!sel || a <= 0) return null;
      const image = model.images[sel.caseId] && model.images[sel.caseId][sel.view];
      if (!image) return null;
      ctx.globalAlpha = alpha * a;
      const placed = drawImageFit(ctx, image, frame);
      ctx.globalAlpha = alpha;
      return placed;
    };
    const placed = show(v.a, v.b ? 1 - v.mix : 1);
    show(v.b, v.b ? v.mix : 0);
    ctx.strokeStyle = P.ink;
    ctx.lineWidth = 1;
    ctx.strokeRect(frame.x, frame.y, frame.w, frame.h);
    // 上面画像の画素確認（元の記録の線の位置）。穴の中心と壁・穴の幅だけ
    if (scene.pixelMarks && placed && v.a.view === 'top') {
      const top = model.cases[v.a.caseId].topCheck;
      const xs = top.dark_outline_x_px, ys = top.dark_outline_y_px;
      const cx = placed.x + (xs[2] + xs[3]) / 2 * placed.k;
      const cy = placed.y + (ys[2] + ys[3]) / 2 * placed.k;
      const rr = (xs[3] - xs[2]) / 2 * placed.k + 3;
      ctx.strokeStyle = P.verify;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(cx, cy, rr, 0, Math.PI * 2);
      ctx.stroke();
    }
    const tag = (x, y, label, size) => {
      font(ctx, size, 700, false);
      const w = ctx.measureText(label).width + size * 0.7;
      ctx.fillStyle = P.paper;
      ctx.fillRect(x, y, w, size * 1.4);
      ctx.strokeStyle = P.ink;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, size * 1.4);
      text(ctx, L, label, x + w / 2, y + size * 0.72, {size, weight: 700, color: P.ink, align: 'center'});
    };
    const current = v.b && v.mix >= 0.5 ? v.b : v.a;
    const caseLabel = `${current.caseId === 'tray-resized' ? '変更後' : '初期'}・${VIEW_JP[current.view]}`;
    if (L.name === 'square') {
      tag(frame.x + 2, frame.y + 2, '実PNG', 14);
      return;
    }
    if (L.name === 'tall') {
      const x = frame.x + frame.w + 14;
      const maxW = r.x + r.w - x - 8;
      tag(frame.x + 3, frame.y + 3, '実PNG', 20);
      text(ctx, L, '保存結果ビューア', x, r.y + 20, {size: 22, weight: 700, color: P.ink, maxW});
      text(ctx, L, '各画像は個別に', x, r.y + 44, {size: 20, color: P.soft, maxW});
      text(ctx, L, '自動フィット', x, r.y + 66, {size: 20, color: P.soft, maxW});
      text(ctx, L, caseLabel, x, r.y + 88, {size: 20, weight: 700, color: P.ink, maxW});
      return;
    }
    text(ctx, L, '保存結果ビューア', r.x + 10, r.y + 15, {weight: 700, color: P.ink});
    text(ctx, L, 'desk.html', r.x + r.w - 10, r.y + 15, {mono: true, color: P.soft, align: 'right'});
    tag(frame.x + 3, frame.y + 3, '実PNG', 16);
    tag(frame.x + 3, frame.y + frame.h - 26, caseLabel, 16);
    text(ctx, L, scene.pixelMarks ? '画素確認は穴の中心と壁・穴の幅だけ' : '各画像は個別に自動フィット', r.x + r.w / 2, r.y + r.h - 13, {color: P.soft, align: 'center', maxW: r.w - 16});
  });
}

function drawLegend(env) {
  const {ctx, L, P, film} = env;
  withAlpha(env, 'legend', () => {
    const r = L.rects.legend;
    box(ctx, r, {stroke: P.faint, width: 1, radius: 6});
    const x = r.x + 12;
    let y = r.y + 14;
    const lh = 17;
    text(ctx, L, film ? 'SolidCraft の中身と流れ' : '凡例', x, y, {size: film ? L.font.label : 16, weight: 700, color: P.ink, maxW: r.w - 24});
    y += 20;
    const swatch = (color, dashed, fill) => {
      box(ctx, {x, y: y - 6, w: 18, h: 12}, {fill: fill || P.paper, stroke: color, width: 1.6, radius: 2, dash: dashed ? [3, 2] : null});
    };
    const row = (draw, label, color) => {
      draw();
      text(ctx, L, label, x + 26, y, {color: color || P.ink, maxW: r.w - 44});
      y += lh;
    };
    row(() => swatch(P.ink), '作者AI（書くだけ）');
    row(() => swatch(P.operator, false, P.operatorSoft), '制作担当（別工程で実行）', P.operator);
    row(() => { swatch(P.accent); }, '変える4つの値／点線は固定', P.ink);
    row(() => swatch(P.soft, false, P.trayTop), '模式図＝説明用の絵');
    row(() => { ctx.fillStyle = '#e9edf2'; ctx.fillRect(x, y - 6, 18, 12); ctx.strokeStyle = P.ink; ctx.lineWidth = 1; ctx.strokeRect(x, y - 6, 18, 12); }, '実PNG＝保存した実出力');
    row(() => check(ctx, x + 9, y, 11, P.verify), '2状態とも開き直して確認', P.verify);
    text(ctx, L, '未検証：製造・強度・印刷・', x, y, {color: P.soft, maxW: r.w - 24});
    text(ctx, L, '水はけ・人の承認', x, y + lh, {color: P.soft, maxW: r.w - 24});
  });
}

function drawTallHeader(env) {
  const {ctx, L, P} = env;
  withAlpha(env, 'legend', () => {
    const r = L.rects.header;
    text(ctx, L, 'SolidCraft の中身と流れ', r.x, r.y + 18, {size: 30, weight: 700, color: P.ink, maxW: r.w});
    text(ctx, L, 'CADエンジン＋AIが読む3つの手順書（架空の小物トレー）', r.x, r.y + 52, {size: 21, color: P.soft, maxW: r.w});
  });
}

function drawPartRings(env) {
  const {ctx, L, P, scene} = env;
  if (!scene.part || !PART_TARGETS[scene.part]) return;
  ctx.save();
  ctx.strokeStyle = P.accent;
  ctx.lineWidth = L.name === 'square' ? 2 : 3;
  ctx.setLineDash(L.name === 'square' ? [3, 2] : [6, 4]);
  for (const key of PART_TARGETS[scene.part]) {
    const r = L.rects[key];
    if (!r) continue;
    const pad = L.name === 'square' ? 2 : 4;
    roundRect(ctx, {x: r.x - pad, y: r.y - pad, w: r.w + pad * 2, h: r.h + pad * 2}, 8);
    ctx.stroke();
  }
  ctx.restore();
}

function drawTokens(env) {
  const {ctx, L, P, model, geo, scene} = env;
  const big = L.w > 400;
  const k = L.name === 'tall' ? 1.35 : big ? 1 : 0.55;
  for (const token of scene.tokens) {
    if (!(token.u > 0 && token.u < 1)) continue;
    const path = route(geo, L, token.ids, token.start);
    const [x, y] = pointAt(path, smooth(token.u));
    const fade = Math.min(1, token.u / 0.08, (1 - token.u) / 0.08);
    ctx.save();
    ctx.globalAlpha = fade;
    if (token.kind === 'dot') {
      ctx.fillStyle = token.role === 'fixed' ? P.fixed : token.role === 'file' ? P.ink : P.accent;
      ctx.beginPath();
      ctx.arc(x, y, 4 * k, 0, Math.PI * 2);
      ctx.fill();
    } else if (token.kind === 'page') {
      const w = 14 * k, h = 18 * k;
      paper(ctx, {x: x - w / 2, y: y - h / 2, w, h}, {fill: P.paper, stroke: P.ink, width: 1.2, fold: 4 * k});
      ctx.fillStyle = P.ink;
      ctx.fillRect(x - w / 2, y - h / 2, 2.5 * k, h);
    } else if (token.kind === 'tag') {
      const p = model.params.find(q => q.name === token.param);
      const label = `${p.jp} ${fmt(p.resized)}`;
      const size = big ? (L.name === 'tall' ? 22 : 16) : 14;
      font(ctx, size, 700, false);
      const w = ctx.measureText(label).width + size * 0.9;
      const h = size * 1.5;
      box(ctx, {x: x - w / 2, y: y - h / 2, w, h}, {fill: P.accent, radius: h / 2});
      text(ctx, L, label, x, y, {size, min: size, weight: 700, color: P.accentInk, align: 'center'});
    } else {
      const label = token.label || '';
      const size = big ? (L.name === 'tall' ? 20 : 16) : 14;
      font(ctx, size, 700, false);
      const w = Math.max(ctx.measureText(label).width + size * 1.4, 30 * k);
      const h = size * 1.7;
      const stroke = token.role === 'operator' ? P.operator : token.role === 'verify' ? P.verify : P.ink;
      paper(ctx, {x: x - w / 2, y: y - h / 2, w, h}, {fill: P.paper, stroke, width: 1.6, fold: 5 * k});
      text(ctx, L, label, x - size * 0.2, y, {size, min: size, weight: 700, color: stroke, align: 'center'});
    }
    ctx.restore();
  }
}

// ---- 構造図ページ（index.html） ----

const STAGE_NOTE = [
  '①：手順書3冊と依頼が同じ作者AIへ。作者はコマンドと予測値を別々に書き、制作担当が別工程でCADへ送った。',
  '②：CADの中では名前付きの値が式を通って3つの履歴を動かし、ボディを1つ作る。値を変えても同じ式と履歴で計算し直す。',
  '③：予測値と実測を別々の道で照合し、範囲の端だけを往復した。同じ設計はJSONに、形だけがSTEP・STLに残る。'
];

const ALT = {
  'tray-default': {
    iso: 'SolidCraft 0.11.1 が保存した初期のトレー（120×80×18 mm・穴8 mm）の等角画像。上が開いた箱で、底の中央に丸い穴が1つある。',
    top: '初期のトレーを真上から見た保存画像。外側と内側の四角い線のあいだが壁で、中央に丸い穴が1つある。'
  },
  'tray-resized': {
    iso: 'SolidCraft 0.11.1 が保存した変更後のトレー（150×90×24 mm・穴12 mm）の等角画像。上が開いた箱で、底の中央に丸い穴が1つある。',
    top: '変更後のトレーを真上から見た保存画像。外側と内側の四角い線のあいだが壁で、中央に丸い穴が1つある。'
  }
};

const FORMAT_INFO = {
  json: {label: 'JSON', note: '編集できる正本。6つの値・式・3つの履歴が残る。', mime: 'application/json'},
  step: {label: 'STEP', note: 'ほかのCADへ渡す形。開くと基礎の固体1つになり、式は残らない。', mime: 'model/step'},
  stl: {label: 'STL', note: '三角形のメッシュ（バイナリ）。式も履歴も残らない。', mime: 'model/stl'}
};

function initConceptPage() {
  const root = document.documentElement;
  const $ = selector => document.querySelector(selector);
  const $$ = selector => Array.from(document.querySelectorAll(selector));
  const ui = {
    canvas: $('#concept-map'), figure: $('#map-area'), status: $('#load-status'), retry: $('#retry'),
    cases: $$('button[data-case]'), stages: $$('button[data-stage]'), replay: $('#replay'),
    phase: $('#phase-note'), meta: $('#case-meta'), desk: $('#open-desk'),
    save: $('#save-record'), saveStatus: $('#save-status'), format: $('#save-format'), recordName: $('#record-name'), recordContent: $('#record-content'),
    views: $$('button[data-view]'), real: $('#real-output'),
    parts: $$('button[data-part]'), partLabel: $('#part-label'), partMeaning: $('#part-meaning'), partQuote: $('#part-quote'),
    partSource: $('#part-source'), partLocal: $('#part-local'),
    themes: $$('button[data-theme]'), request: $('#request-text'), copy: $('#copy-request'), copyStatus: $('#copy-status'),
    fills: $$('[data-fill]'), limits: $('#limit-list')
  };
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const state = {
    model: null, generation: 0, caseId: 'tray-default', stage: 0, view: 'iso', format: 'json', part: 'modeling', partTouched: false,
    theme: 'light', morph: 0, morphFrom: 0, morphTo: 0, morphStart: 0, replay: null, frame: 0, urls: new Map(), layout: 'square', cssW: 0, cssH: 0
  };

  const hash = location.hash.slice(1);
  if (CASE_IDS.includes(hash)) {
    state.caseId = hash;
    keepTop();
  }
  state.morph = state.morphTo = state.caseId === 'tray-resized' ? 1 : 0;

  function keepTop() {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    const top = () => window.scrollTo(0, 0);
    top();
    requestAnimationFrame(top);
    window.addEventListener('load', () => { top(); requestAnimationFrame(top); }, {once: true});
  }

  // ---- 状態の表示 ----

  function setControls(enabled) {
    [...ui.cases, ...ui.stages, ui.replay, ui.save, ui.format, ...ui.views, ...ui.parts, ui.copy].forEach(control => {
      if (control) control.disabled = !enabled;
    });
    if (enabled) {
      ui.desk.setAttribute('href', `desk.html#${state.caseId}`);
      ui.desk.removeAttribute('aria-disabled');
      ui.desk.removeAttribute('tabindex');
    } else {
      ui.desk.removeAttribute('href');
      ui.desk.setAttribute('aria-disabled', 'true');
      ui.desk.setAttribute('tabindex', '-1');
    }
  }

  function revokeUrls() {
    state.urls.forEach(url => URL.revokeObjectURL(url));
    state.urls.clear();
  }

  function clearData() {
    revokeUrls();
    ui.request.value = '';
    ui.meta.textContent = '';
    ui.phase.textContent = '';
    ui.saveStatus.textContent = '';
    ui.recordName.textContent = '';
    ui.recordContent.replaceChildren();
    ui.real.removeAttribute('src');
    ui.real.alt = '';
    ui.real.hidden = true;
    ui.partLabel.textContent = '';
    ui.partMeaning.textContent = '';
    ui.partQuote.textContent = '';
    ui.partSource.removeAttribute('href');
    ui.partSource.textContent = '';
    ui.partLocal.removeAttribute('href');
    ui.partLocal.textContent = '';
    ui.copyStatus.textContent = '';
    ui.fills.forEach(node => { node.textContent = ''; });
    if (ui.limits) ui.limits.replaceChildren();
    ui.save.textContent = '保存';
  }

  function clearCanvas() {
    const ctx = ui.canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ui.canvas.width, ui.canvas.height);
  }

  function urlFor(caseId, view) {
    const key = caseId + ':' + view;
    if (!state.urls.has(key)) state.urls.set(key, URL.createObjectURL(state.model.images[caseId][view].blob));
    return state.urls.get(key);
  }

  function output() {
    return state.model.outputs[state.caseId][state.format];
  }

  function fillStatic() {
    const model = state.model;
    ui.request.value = model.request.replace(/\n+$/, '');
    const n = model.numbers;
    const p = name => model.params.find(q => q.name === name);
    const values = {
      assets: String(n.assets), mcp: String(n.mcpCalls), batches: String(n.batches), build: String(n.buildStages), resize: String(n.resizeBatch),
      walk: String(n.walkStates), shapes: String(n.walkShapes), reopen: String(n.reopen),
      'default-size': `${fmt(p('width').default)}×${fmt(p('depth').default)}×${fmt(p('height').default)} mm・穴${fmt(p('hole_diameter').default)} mm`,
      'resized-size': `${fmt(p('width').resized)}×${fmt(p('depth').resized)}×${fmt(p('height').resized)} mm・穴${fmt(p('hole_diameter').resized)} mm`,
      'default-volume': fmt3(model.cases['tray-default'].measured.volume_mm3), 'default-expected': fmt3(model.cases['tray-default'].expected.volume_mm3),
      'resized-volume': fmt3(model.cases['tray-resized'].measured.volume_mm3), 'resized-expected': fmt3(model.cases['tray-resized'].expected.volume_mm3),
      'default-volume-full': String(model.cases['tray-default'].measured.volume_mm3), 'resized-volume-full': String(model.cases['tray-resized'].measured.volume_mm3),
      'default-expected-full': String(model.cases['tray-default'].expected.volume_mm3), 'resized-expected-full': String(model.cases['tray-resized'].expected.volume_mm3)
    };
    ui.fills.forEach(node => {
      const key = node.dataset.fill;
      if (key in values) node.textContent = values[key];
    });
    if (ui.limits) {
      ui.limits.replaceChildren(...model.limits.map(line => {
        const li = document.createElement('li');
        li.textContent = line;
        return li;
      }));
    }
  }

  function updateCase() {
    const model = state.model;
    const c = model.cases[state.caseId];
    ui.cases.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.case === state.caseId)));
    const size = [0, 1, 2].map(i => fmt(c.measured.bbox.max[i] - c.measured.bbox.min[i])).join('×');
    const health = c.measured && model.samples.samples[CASE_IDS.indexOf(state.caseId)].output.timeline.every(f => f.error === null && f.warning === null);
    ui.meta.textContent = `${state.caseId === 'tray-resized' ? '変更後' : '初期'}：外接箱 ${size} mm・穴 ${fmt(c.params.hole_diameter)} mm・壁と底 ${fmt(c.fixed.wall)} mm／` +
      `体積 実測 ${fmt3(c.measured.volume_mm3)} mm³・解析 ${fmt3(c.expected.volume_mm3)} mm³／ボディ1つ・履歴3件${health ? 'とも error・warning なし' : ''}`;
    ui.desk.setAttribute('href', `desk.html#${state.caseId}`);
    ui.desk.textContent = `保存結果ビューアで開く（${state.caseId === 'tray-resized' ? '変更後' : '初期'}）`;
    updateFormat();
    updateView();
  }

  function updateFormat() {
    const model = state.model;
    const entry = output();
    const info = FORMAT_INFO[state.format];
    ui.save.textContent = `保存：${entry.name}`;
    ui.save.setAttribute('aria-label', `${info.label}形式の ${entry.name} を保存（${entry.bytes.toLocaleString('ja-JP')}バイト）`);
    ui.recordName.textContent = entry.path;
    const dl = document.createElement('dl');
    const add = (term, value) => {
      const dt = document.createElement('dt');
      dt.textContent = term;
      const dd = document.createElement('dd');
      dd.textContent = value;
      dl.append(dt, dd);
    };
    add('形式', `${info.label}：${info.note}`);
    add('大きさ', `${entry.bytes.toLocaleString('ja-JP')} バイト`);
    add('SHA-256', entry.sha256);
    add('式と履歴', entry.parametric ? '保つ' : '保たない');
    add('0.11.1で開き直した元の記録', `${entry.roundtrip.format_note}・ボディ${entry.roundtrip.body_count}つ・体積 ${fmt3(entry.roundtrip.volume_mm3)} mm³`);
    if (state.format === 'stl') {
      const stl = model.cases[state.caseId].stl;
      add('三角形', `${stl.triangles}枚・どの辺も三角形2枚で共有（元の記録）`);
    }
    const nodes = [dl];
    if (state.format === 'json') {
      const pre = document.createElement('pre');
      pre.className = 'record-text';
      pre.textContent = decodeText(entry);
      nodes.push(pre);
    }
    ui.recordContent.replaceChildren(...nodes);
    if (ui.format.value !== state.format) ui.format.value = state.format;
  }

  function updateView() {
    ui.views.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === state.view)));
    ui.real.hidden = false;
    ui.real.src = urlFor(state.caseId, state.view);
    ui.real.alt = ALT[state.caseId][state.view];
  }

  function updateStage() {
    ui.stages.forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.stage) === state.stage)));
    ui.phase.textContent = STAGE_NOTE[state.stage];
  }

  function updatePart() {
    const part = state.model.parts.find(p => p.id === state.part);
    ui.parts.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.part === state.part)));
    ui.partLabel.textContent = `${part.label}（${part.id}）`;
    ui.partMeaning.textContent = part.meaning;
    ui.partQuote.textContent = part.quote;
    ui.partSource.href = part.source_url;
    ui.partSource.textContent = `原典 ${part.upstream} ${part.line_start}行目（参照コミット 16c49c3）`;
    ui.partLocal.href = part.source_path;
    ui.partLocal.textContent = `同梱した原文 ${part.source_path}`;
  }

  // ---- 描画 ----

  function measure() {
    const width = Math.max(240, Math.round(ui.figure.clientWidth));
    const layout = width >= 900 ? 'wide' : 'square';
    const height = layout === 'wide' ? Math.round(width * LAYOUTS.wide.h / LAYOUTS.wide.w) : Math.round(Math.min(width * LAYOUTS.square.h / LAYOUTS.square.w, 620));
    if (width !== state.cssW || height !== state.cssH || layout !== state.layout) {
      state.cssW = width;
      state.cssH = height;
      state.layout = layout;
      ui.canvas.style.height = height + 'px';
    }
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const pw = Math.round(width * dpr), ph = Math.round(height * dpr);
    if (ui.canvas.width !== pw || ui.canvas.height !== ph) {
      ui.canvas.width = pw;
      ui.canvas.height = ph;
    }
    return dpr;
  }

  function draw(now) {
    const dpr = measure();
    if (!state.model) {
      clearCanvas();
      return false;
    }
    let animating = false;
    let morph = state.morphTo;
    if (state.morphStart) {
      const k = Math.min(1, (now - state.morphStart) / 700);
      morph = state.morphFrom + (state.morphTo - state.morphFrom) * smooth(k);
      if (k < 1) animating = true; else state.morphStart = 0;
    }
    state.morph = morph;
    let replay = null;
    if (state.replay) {
      replay = Math.min(1, (now - state.replay.start) / state.replay.duration);
      if (replay >= 1) {
        stopReplay();
        replay = null;
      } else {
        animating = true;
      }
    }
    const scene = pageScene({
      stage: state.stage, caseId: state.caseId, view: state.view, format: state.format,
      part: state.partTouched ? state.part : null, morph: state.morphStart ? morph : null, replay
    });
    const ctx = ui.canvas.getContext('2d');
    drawConcept(ctx, {width: state.cssW, height: state.cssH, dpr, palette: PALETTES[state.theme], model: state.model, scene, layout: state.layout});
    return animating;
  }

  function loop(now) {
    state.frame = 0;
    if (draw(now)) state.frame = requestAnimationFrame(loop);
  }

  function redraw() {
    if (state.frame) return;
    state.frame = requestAnimationFrame(loop);
  }

  function stopReplay() {
    state.replay = null;
    ui.replay.textContent = '▶ 動きで見る';
    ui.replay.setAttribute('aria-pressed', 'false');
  }

  // ---- 読み込み ----

  async function load() {
    const generation = ++state.generation;
    stopReplay();
    state.model = null;
    root.dataset.state = 'loading';
    clearData();
    setControls(false);
    ui.retry.hidden = true;
    ui.status.textContent = `保存データ${ASSET_COUNT}件の大きさとSHA-256を確かめています（0/${ASSET_COUNT}）`;
    redraw();
    try {
      const model = await loadConcept({
        onProgress: (done, total) => {
          if (generation !== state.generation || root.dataset.state !== 'loading') return;
          ui.status.textContent = `保存データ${total}件の大きさとSHA-256を確かめています（${done}/${total}）`;
        }
      });
      if (generation !== state.generation) return;
      state.model = model;
      root.dataset.state = 'ready';
      ui.status.textContent = `${model.numbers.assets}ファイル確認済み・保存結果を表示（CAD・AIは動かしません）`;
      setControls(true);
      fillStatic();
      updateCase();
      updateStage();
      updatePart();
      redraw();
    } catch (error) {
      if (generation !== state.generation) return;
      state.model = null;
      root.dataset.state = 'error';
      clearData();
      setControls(false);
      clearCanvas();
      ui.status.textContent = `表示できません：${error && error.message ? error.message : error}`;
      ui.retry.hidden = false;
    }
  }

  // ---- 操作 ----

  function selectCase(caseId, {updateHash = true} = {}) {
    if (!state.model || !CASE_IDS.includes(caseId)) return;
    if (caseId !== state.caseId) {
      state.morphFrom = state.morph;
      state.morphTo = caseId === 'tray-resized' ? 1 : 0;
      state.morphStart = reduce.matches ? 0 : performance.now();
      if (reduce.matches) state.morph = state.morphTo;
    }
    state.caseId = caseId;
    if (state.replay) stopReplay();
    if (updateHash && history.replaceState) history.replaceState(null, '', '#' + caseId);
    ui.saveStatus.textContent = '';
    updateCase();
    redraw();
  }

  ui.cases.forEach(button => button.addEventListener('click', () => selectCase(button.dataset.case)));
  ui.stages.forEach(button => button.addEventListener('click', () => {
    state.stage = Number(button.dataset.stage);
    stopReplay();
    updateStage();
    redraw();
  }));
  ui.replay.addEventListener('click', () => {
    if (!state.model) return;
    if (state.replay) {
      stopReplay();
      redraw();
      return;
    }
    if (reduce.matches) {
      ui.phase.textContent = STAGE_NOTE[state.stage] + '（動きを減らす設定のため、完成した図だけを表示しています）';
      redraw();
      return;
    }
    state.replay = {start: performance.now(), duration: replaySeconds(state.stage, state.caseId) * 1000};
    ui.replay.textContent = '■ 止める';
    ui.replay.setAttribute('aria-pressed', 'true');
    redraw();
  });
  ui.format.addEventListener('change', () => {
    if (!state.model || !FORMATS.includes(ui.format.value)) return;
    state.format = ui.format.value;
    ui.saveStatus.textContent = '';
    updateFormat();
    redraw();
  });
  ui.save.addEventListener('click', () => {
    if (!state.model) return;
    const entry = output();
    // 検証した元のバイト列をそのまま渡す（JSONも書き直さない）
    const blob = new Blob([entry.buffer], {type: FORMAT_INFO[state.format].mime});
    if (blob.size !== entry.bytes) {
      ui.saveStatus.textContent = '保存用のデータの大きさが記録と合わないため、渡しませんでした。';
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = entry.name;
    link.rel = 'noopener';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    ui.saveStatus.textContent = `${entry.name}（${entry.bytes.toLocaleString('ja-JP')}バイト・SHA-256一致を確認済みの元データ）をブラウザーの保存処理へ渡しました。ディスクへの保存が終わったかは、このページからは分かりません。`;
  });
  ui.views.forEach(button => button.addEventListener('click', () => {
    if (!state.model) return;
    state.view = button.dataset.view;
    updateView();
    redraw();
  }));
  ui.parts.forEach(button => button.addEventListener('click', () => {
    if (!state.model) return;
    state.part = button.dataset.part;
    state.partTouched = true;
    updatePart();
    redraw();
  }));
  ui.themes.forEach(button => button.addEventListener('click', () => {
    state.theme = button.dataset.theme === 'dark' ? 'dark' : 'light';
    root.dataset.theme = state.theme;
    ui.themes.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.theme === state.theme)));
    redraw();
  }));
  ui.retry.addEventListener('click', () => load());

  function copyFallback(value) {
    ui.request.focus();
    ui.request.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
    ui.request.setSelectionRange(0, 0);
    return ok;
  }
  ui.copy.addEventListener('click', () => {
    const value = ui.request.value;
    if (!value) return;
    const done = ok => { ui.copyStatus.textContent = ok ? 'コピーしました。' : 'コピーできませんでした。上の文を選んでコピーしてください。'; };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(value).then(() => done(true), () => done(copyFallback(value)));
    else done(copyFallback(value));
  });

  window.addEventListener('hashchange', () => {
    const id = location.hash.slice(1);
    if (CASE_IDS.includes(id)) selectCase(id, {updateHash: false});
  });
  if (typeof ResizeObserver === 'function') new ResizeObserver(() => redraw()).observe(ui.figure);
  else window.addEventListener('resize', redraw);
  reduce.addEventListener('change', () => { if (reduce.matches && state.replay) { stopReplay(); redraw(); } });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(redraw);

  load();
}

if (typeof document !== 'undefined' && document.documentElement.dataset.conceptPage === 'main') {
  initConceptPage();
}
