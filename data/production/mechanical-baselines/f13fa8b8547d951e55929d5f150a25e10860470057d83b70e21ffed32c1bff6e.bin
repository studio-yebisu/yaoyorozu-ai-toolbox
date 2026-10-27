// Quartz concept map for 八百万図AIツールボックス.
// Shared by the page (index.html) and the silent film source (video/index.html).
// loadBundle() verifies all 30 assets before anything is drawn, drawMap() draws one
// deterministic frame of the connected diagram, initConceptPage() wires the page only.

export const MANIFEST_PATH = 'concept/manifest.json';
export const MANIFEST_SHA256 = '306d3c942e89aa8049964872b901c88163606cbb9b83f79dc025a9055d6a7374';
export const SOURCE_COMMIT = '1aaaa1b47ba5a18b47b0ebcac684ade460c6823f';
export const MODEL_ID = 'claude-opus-5-5';
export const CASES = ['completed', 'tool-failed', 'waiting-input'];
export const COMPONENTS = ['Timeline', 'Status', 'JsonView', 'Button', 'DataList', 'SegmentedControl', 'Badge', 'PageHeader'];
export const PARTS = ['instructions', 'scope', 'tokens', 'components', 'selection', 'check'];
export const CASE_WORD = {completed: '完了', 'tool-failed': 'ツール失敗', 'waiting-input': '入力待ち'};
export const STATUS_WORD = {ok: '完了', fail: '失敗', waiting: '入力待ち'};
export const TYPE_WORD = {model: 'モデル', tool: 'ツール', input: '入力'};

const ASSET_BASE = new URL('./', import.meta.url);

// What the three original fixtures must contain. Synthetic nature comes from samples.json's note
// and structure.json, not from an invented boolean key.
const EXPECT = {
  completed: {
    steps: ['a1-plan', 'a1-fetch', 'a1-license', 'a1-write', 'a1-save'], plan: 5, focus: 'a1-write', outcome: 'ok', now: 5400,
    bytes: 4076, path: 'concept/fixtures/completed.json',
    check: fx => fx.steps.every(s => s.status === 'ok') && fx.steps[4].output.saved === true && fx.steps[3].output.draft.length === 3,
  },
  'tool-failed': {
    steps: ['b2-plan', 'b2-commit', 'b2-fetch'], plan: 6, focus: 'b2-fetch', outcome: 'fail', now: 2050,
    bytes: 2645, path: 'concept/fixtures/tool-failed.json',
    check: fx => fx.steps[0].status === 'ok' && fx.steps[1].status === 'ok' && fx.steps[2].status === 'fail'
      && fx.steps[2].input.path === 'quartz/SKILL.md' && fx.steps[2].output.status === 404,
  },
  'waiting-input': {
    steps: ['c3-plan', 'c3-check', 'c3-missing', 'c3-input'], plan: 5, focus: 'c3-input', outcome: 'waiting', now: 9600,
    bytes: 2723, path: 'concept/fixtures/waiting-input.json',
    check: fx => fx.steps[3].status === 'waiting' && fx.steps[3].start_ms === 1990 && fx.steps[3].end_ms === null
      && fx.steps[3].input.field === 'source_url' && fx.steps[3].output.waiting_for === 'source_url' && fx.steps[3].output.answer === null,
  },
};

const REQUIRED = [
  'concept/structure.json', 'concept/original-run.json', 'samples.json', 'request.txt',
  'concept/fixtures/completed.json', 'concept/fixtures/tool-failed.json', 'concept/fixtures/waiting-input.json',
  'vendor/quartz/SKILL.md', 'src/app.tsx', 'video/screenshot-light.png', 'video/screenshot-fail.png',
];

export class LoadError extends Error {
  constructor(message) { super(message); this.name = 'LoadError'; }
}

function need(ok, message) { if (!ok) throw new LoadError(message); }

async function fetchBytes(path, signal) {
  let res;
  try {
    res = await fetch(new URL(path, ASSET_BASE), {cache: 'no-store', signal});
  } catch (err) {
    if (signal && signal.aborted) throw err;
    throw new LoadError(`「${path}」を読み込めませんでした。通信を確かめて、もう一度読み込んでください。`);
  }
  need(res.ok, `「${path}」を取得できません（HTTP ${res.status}）。`);
  return new Uint8Array(await res.arrayBuffer());
}

async function sha256(bytes) {
  need(globalThis.crypto && crypto.subtle, 'この環境ではSHA-256で資料を確かめられません。httpsまたはlocalhostで開いてください。');
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

const decoder = new TextDecoder('utf-8', {fatal: true});
function decodeText(bytes, path) {
  try { return decoder.decode(bytes); } catch { throw new LoadError(`「${path}」をUTF-8の文字として読めません。`); }
}
function parseJson(bytes, path) {
  try { return JSON.parse(decodeText(bytes, path)); } catch (err) {
    if (err instanceof LoadError) throw err;
    throw new LoadError(`「${path}」のJSONが壊れています。`);
  }
}

function same(a, b) {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every(k => Object.prototype.hasOwnProperty.call(b, k) && same(a[k], b[k]));
}
const sameSet = (a, b) => Array.isArray(a) && a.length === b.length && new Set(a).size === a.length && b.every(x => a.includes(x));

function checkManifest(m) {
  need(m && m.id === 'quartz-agent-console' && m.revision === 'visual-r1', '素材一覧の事例IDまたは版が違います。');
  need(Array.isArray(m.files) && m.files.length === 30, '素材一覧が30件ではありません。');
  const seen = new Set();
  for (const f of m.files) {
    need(f && typeof f.path === 'string' && /^[A-Za-z0-9._/-]+$/.test(f.path) && !f.path.startsWith('/') && !f.path.split('/').includes('..'),
      '素材一覧に使えないパスがあります。');
    need(Number.isInteger(f.bytes) && f.bytes > 0 && typeof f.sha256 === 'string' && /^[0-9a-f]{64}$/.test(f.sha256),
      `素材一覧の「${f.path}」に大きさかSHA-256がありません。`);
    need(!seen.has(f.path), `素材一覧で「${f.path}」が重複しています。`);
    seen.add(f.path);
  }
  for (const p of REQUIRED) need(seen.has(p), `素材一覧に「${p}」がありません。`);
}

async function decodePng(bytes, path) {
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  need(sig.every((b, i) => bytes[i] === b), `「${path}」はPNG画像ではありません。`);
  const url = URL.createObjectURL(new Blob([bytes], {type: 'image/png'}));
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
  try { await img.decode(); } catch {
    URL.revokeObjectURL(url);
    throw new LoadError(`「${path}」の画像を表示用に復号できませんでした。`);
  }
  if (!(img.naturalWidth > 0 && img.naturalHeight > 0)) {
    URL.revokeObjectURL(url);
    throw new LoadError(`「${path}」の画像の大きさが0です。`);
  }
  return Object.freeze({img, url, width: img.naturalWidth, height: img.naturalHeight, path});
}

function validate(files, manifest) {
  const byPath = new Map(manifest.files.map(f => [f.path, f]));
  const text = p => decodeText(files.get(p), p);
  const json = p => parseJson(files.get(p), p);
  const structure = json('concept/structure.json');
  const run = json('concept/original-run.json');
  const samplesFile = json('samples.json');
  const request = text('request.txt');

  need(samplesFile && samplesFile.format === 'input-output' && typeof samplesFile.note === 'string' && samplesFile.note.length > 0
    && Array.isArray(samplesFile.samples), 'samples.json の format・note・samples が想定と違います。');
  need(samplesFile.samples.map(s => s && s.id).join() === CASES.join(), 'samples.json の3件のIDか順序が想定と違います。');

  const cases = {};
  samplesFile.samples.forEach((sample, index) => {
    const e = EXPECT[sample.id], fx = sample.fixture, where = `samples.json の「${sample.id}」`;
    need(typeof sample.label === 'string' && typeof sample.input === 'string' && typeof sample.output === 'string'
      && fx && typeof fx === 'object', `${where} に label・input・output・fixture がそろっていません。`);
    need(Array.isArray(fx.steps) && fx.steps.map(s => s && s.id).join() === e.steps.join(), `${where} の段が元の${e.steps.length}段と違います。`);
    need(Array.isArray(fx.plan) && fx.plan.length === e.plan, `${where} の予定が${e.plan}段ではありません。`);
    need(fx.focus_step === e.focus && fx.outcome === e.outcome && fx.now_ms === e.now, `${where} の注目段・結果・架空の時刻が想定と違います。`);
    for (const s of fx.steps) {
      need(typeof s.label === 'string' && typeof s.note === 'string' && ['ok', 'fail', 'waiting'].includes(s.status)
        && ['model', 'tool', 'input'].includes(s.type) && 'input' in s && 'output' in s
        && Number.isFinite(s.start_ms) && (s.end_ms === null || Number.isFinite(s.end_ms)), `${where} の段「${s.id}」の項目が足りません。`);
    }
    let factsOk = false;
    try { factsOk = e.check(fx); } catch { factsOk = false; }
    need(factsOk, `${where} の止まり方（完了・失敗・入力待ち）が元の内容と違います。`);
    const bytes = files.get(e.path), fileText = text(e.path);
    need(bytes.byteLength === e.bytes, `「${e.path}」が${e.bytes}バイトではありません。`);
    need(fileText === JSON.stringify(fx, null, 2) + '\n', `「${e.path}」が同じfixtureを JSON.stringify(fixture, null, 2) と改行で書いた内容と一致しません。`);
    need(same(JSON.parse(fileText), fx), `「${e.path}」の中身が samples.json の同じ事例と一致しません。`);
    cases[sample.id] = Object.freeze({
      id: sample.id, index, label: sample.label, input: sample.input, output: sample.output, fixture: fx,
      path: e.path, file: `${sample.id}.json`, bytes, text: fileText, byteLength: bytes.byteLength, sha256: byPath.get(e.path).sha256,
    });
  });

  need(structure && structure.id === 'quartz-agent-console' && structure.source_commit === SOURCE_COMMIT, 'structure.json の事例IDか固定コミットが違います。');
  need(Array.isArray(structure.parts) && structure.parts.map(p => p && p.id).join() === PARTS.join(), 'structure.json の6要素が想定と違います。');
  const parts = structure.parts.map(part => {
    need(typeof part.label === 'string' && typeof part.meaning === 'string' && typeof part.quote === 'string'
      && byPath.has(part.source_path) && Number.isInteger(part.line_start) && part.line_start > 0, `要素「${part.id}」の出典が足りません。`);
    const line = text(part.source_path).split(/\r?\n/)[part.line_start - 1];
    need(typeof line === 'string' && line.trim() === part.quote.trim(), `「${part.label}」の引用が ${part.source_path} の${part.line_start}行目と一致しません。`);
    return Object.freeze({...part, line});
  });
  const comp = structure.composition || {};
  need(comp.shadcn_cli_exercised === false && comp.manual_copy === true && sameSet(comp.components, COMPONENTS),
    'structure.json の構成（8部品・手で配置・CLI未実行）が想定と違います。');
  need(Array.isArray(structure.samples) && structure.samples.length === 3
    && structure.samples.every((s, i) => s.id === CASES[i] && same(s.fixture, samplesFile.samples[i].fixture)),
    'structure.json の3件が samples.json と一致しません。');
  need(Array.isArray(structure.fixture_files) && structure.fixture_files.length === 3 && structure.fixture_files.every((f, i) =>
    f.id === CASES[i] && f.path === EXPECT[f.id].path && f.bytes === EXPECT[f.id].bytes && byPath.get(f.path).sha256 === f.sha256),
  'structure.json のfixtureファイル記録が素材一覧と一致しません。');

  const prod = run && run.production || {};
  need(prod.requested_model === MODEL_ID && Array.isArray(prod.reported_models) && prod.reported_models.length === 1
    && prod.reported_models[0] === MODEL_ID, 'original-run.json の制作モデルが claude-opus-5-5 だけではありません。');
  const lim = run.scope_limits || {};
  need(sameSet(lim.selected_components, COMPONENTS), '元の画面で使った8部品の記録が想定と違います。');
  need(lim.shadcn_cli_install_exercised === false && lim.live_agent_connected === false && lim.other_components_exercised === false,
    'shadcn CLI・ライブ接続・ほかの部品を使っていないという記録が見つかりません。');
  need(Array.isArray(run.fixtures) && run.fixtures.length === 3 && run.fixtures.every((f, i) => {
    const e = EXPECT[CASES[i]];
    return f.id === CASES[i] && f.path === e.path && f.bytes === e.bytes && f.sha256 === byPath.get(e.path).sha256
      && f.steps === e.steps.length && f.planned_steps === e.plan && f.focus_step === e.focus;
  }), 'original-run.json のfixture記録が想定と違います。');
  const checks = run.checks || {};
  need(checks.quartz_lint === 'passed' && checks.vite_build === 'passed' && checks.browser && same(checks.browser.widths, [390, 1280]),
    '元の画面の確認記録（lint・build・390/1280px）が想定と違います。');
  need(request.includes('npx shadcn@latest add') && request.includes('Quartz'), 'request.txt の依頼文が想定と違います。');

  return {structure, run, note: samplesFile.note, request, cases, parts};
}

// Verifies the manifest hash, then every file's bytes and SHA-256, then the facts the map draws.
export async function loadBundle({onProgress = () => {}, signal} = {}) {
  const manBytes = await fetchBytes(MANIFEST_PATH, signal);
  need(await sha256(manBytes) === MANIFEST_SHA256, '素材一覧（concept/manifest.json）のSHA-256が固定値と一致しません。');
  const manifest = parseJson(manBytes, MANIFEST_PATH);
  checkManifest(manifest);
  const total = manifest.files.length;
  let done = 0;
  onProgress(done, total);
  const files = new Map();
  await Promise.all(manifest.files.map(async f => {
    const bytes = await fetchBytes(f.path, signal);
    need(bytes.byteLength === f.bytes, `「${f.path}」の大きさが一覧と違います（一覧 ${f.bytes} バイト、受信 ${bytes.byteLength} バイト）。`);
    need(await sha256(bytes) === f.sha256, `「${f.path}」のSHA-256が一覧と一致しません。`);
    files.set(f.path, bytes);
    done += 1;
    onProgress(done, total, f.path);
  }));
  const data = validate(files, manifest);
  const light = await decodePng(files.get('video/screenshot-light.png'), 'video/screenshot-light.png');
  let fail;
  try { fail = await decodePng(files.get('video/screenshot-fail.png'), 'video/screenshot-fail.png'); } catch (err) {
    URL.revokeObjectURL(light.url);
    throw err;
  }
  return Object.freeze({
    manifest, ...data, images: Object.freeze({light, fail}),
    dispose() { URL.revokeObjectURL(light.url); URL.revokeObjectURL(fail.url); },
  });
}

// ---- Short readings of fixture values (labels, not JSON dumps) ----

export function seconds(ms) {
  const s = ms / 1000;
  return `${Number.isInteger(s) ? s : s.toFixed(s < 10 ? 2 : 1).replace(/0$/, '')}秒`;
}

export function brief(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) {
    if (v.every(x => typeof x === 'string') && v.join('、').length <= 18) return v.join('、');
    return `${v.length}件`;
  }
  if (typeof v === 'object') return `{${Object.keys(v).join(', ')}}`;
  return String(v);
}

const IN_KEYS = ['path', 'field', 'length', 'request', 'skill_name', 'name_present', 'ref', 'lines', 'repository', 'facts'];
const OUT_KEYS = ['status', 'answer', 'source_url', 'saved', 'draft', 'license', 'missing', 'found', 'plan', 'goal', 'waiting_for', 'name_present'];

export function keysFor(obj, side, n) {
  const ks = obj && typeof obj === 'object' && !Array.isArray(obj) ? Object.keys(obj) : [];
  const pref = side === 'input' ? IN_KEYS : OUT_KEYS;
  return [...pref.filter(k => ks.includes(k)), ...ks.filter(k => !pref.includes(k))].slice(0, n ?? ks.length);
}

// Which value explains why this step stopped. Only fail is warm; waiting stays neutral.
export function troubleOf(step, side, key) {
  if (step.status === 'fail') return (side === 'input' && key === 'path') || (side === 'output' && ['status', 'error', 'message', 'checked_path'].includes(key)) ? 'fail' : null;
  if (step.status === 'waiting') return side === 'output' && (key === 'answer' || key === 'waiting_for') ? 'waiting' : null;
  return null;
}

export function stepTime(run, step) {
  const end = step.end_ms ?? run.now_ms;
  return {start: seconds(step.start_ms), took: seconds(end - step.start_ms), waited: step.end_ms === null};
}

// ---- Drawing primitives (pure: same input, same pixels) ----

const SANS = '"Hiragino Sans","Hiragino Kaku Gothic ProN","Yu Gothic UI","Yu Gothic","Meiryo","Noto Sans JP",system-ui,sans-serif';
const MONO = 'ui-monospace,"SF Mono",Menlo,Consolas,"Liberation Mono",monospace';
const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
export const seg = (v, a, b) => clamp01((v - a) / (b - a));
export const ease = t => { t = clamp01(t); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const R = (x, y, w, h) => ({x, y, w, h});
const midX = r => r.x + r.w / 2, midY = r => r.y + r.h / 2, rightOf = r => r.x + r.w, bottomOf = r => r.y + r.h;

// Black and white chassis; warm colors only for fail and warn.
export function palette(theme) {
  return theme === 'dark' ? {
    bg: '#121419', paper: '#1a1d24', field: '#232832', ink: '#eef0f4', inv: '#121419',
    t2: 'rgba(238,240,244,0.8)', t3: 'rgba(238,240,244,0.64)', line: 'rgba(238,240,244,0.22)', strong: 'rgba(238,240,244,0.56)',
    wash: 'rgba(238,240,244,0.11)', fail: '#f2907f', failWash: 'rgba(242,144,127,0.16)', warn: '#e2b866',
    hue: ['#7fcfd5', '#cfa3cc', '#8eaee8', '#ab9be6', '#8ccfac'],
  } : {
    bg: '#f6f5f1', paper: '#ffffff', field: '#eef0f2', ink: '#1b2130', inv: '#ffffff',
    t2: 'rgba(27,33,48,0.8)', t3: 'rgba(27,33,48,0.64)', line: 'rgba(27,33,48,0.17)', strong: 'rgba(27,33,48,0.5)',
    wash: 'rgba(27,33,48,0.07)', fail: '#b8352a', failWash: 'rgba(184,53,42,0.09)', warn: '#8a6114',
    hue: ['#58aeb5', '#b388b0', '#6d8fcf', '#8c7cc9', '#62a985'],
  };
}

function font(size, weight = 400, mono = false) { return `${weight} ${size}px ${mono ? MONO : SANS}`; }
function tw(ctx, s, size = 11, weight = 400, mono = false) { ctx.font = font(size, weight, mono); return ctx.measureText(String(s)).width; }

// Text never drops below `min` (11 CSS px on the page); it is shortened with an ellipsis instead.
function txt(ctx, s, x, y, o = {}) {
  let size = o.size ?? 11;
  const min = o.min ?? Math.min(11, size), weight = o.weight ?? 400, mono = !!o.mono;
  let str = String(s);
  ctx.font = font(size, weight, mono);
  if (o.maxW) {
    while (size > min && ctx.measureText(str).width > o.maxW) { size = Math.max(min, size - 0.5); ctx.font = font(size, weight, mono); }
    if (ctx.measureText(str).width > o.maxW) {
      while (str.length > 1 && ctx.measureText(str + '…').width > o.maxW) str = str.slice(0, -1);
      str += '…';
    }
  }
  ctx.fillStyle = o.color;
  ctx.textAlign = o.align ?? 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
  return ctx.measureText(str).width;
}

function rrect(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function box(ctx, r, o = {}) {
  rrect(ctx, r.x, r.y, r.w, r.h, o.radius ?? 4);
  if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
  if (o.stroke) {
    ctx.lineWidth = o.lw ?? 1;
    ctx.strokeStyle = o.stroke;
    ctx.setLineDash(o.dash ?? []);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function arrowHead(ctx, a, b, color, s) {
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  ctx.beginPath();
  ctx.moveTo(b[0], b[1]);
  ctx.lineTo(b[0] - s * Math.cos(ang - 0.5), b[1] - s * Math.sin(ang - 0.5));
  ctx.lineTo(b[0] - s * Math.cos(ang + 0.5), b[1] - s * Math.sin(ang + 0.5));
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function poly(ctx, pts, o) {
  if (!pts || pts.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.lineWidth = o.lw ?? 1;
  ctx.strokeStyle = o.color;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.setLineDash(o.dash ?? []);
  ctx.stroke();
  ctx.setLineDash([]);
  if (o.head) arrowHead(ctx, pts[pts.length - 2], pts[pts.length - 1], o.color, o.head);
}

export function along(pts, f) {
  f = clamp01(f);
  const lens = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    lens.push(l);
    total += l;
  }
  if (!total) return [pts[0][0], pts[0][1]];
  let d = f * total;
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i] || i === lens.length - 1) {
      const k = lens[i] ? Math.min(1, d / lens[i]) : 0;
      return [lerp(pts[i][0], pts[i + 1][0], k), lerp(pts[i][1], pts[i + 1][1], k)];
    }
    d -= lens[i];
  }
  return [pts[pts.length - 1][0], pts[pts.length - 1][1]];
}

function check(ctx, x, y, s, color) {
  ctx.beginPath();
  ctx.moveTo(x - s * 0.5, y);
  ctx.lineTo(x - s * 0.15, y + s * 0.38);
  ctx.lineTo(x + s * 0.55, y - s * 0.42);
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.stroke();
}

// A sheet of paper with a folded corner: the request, the code and the fixtures.
function paper(ctx, x0, y0, w, h, pal, o = {}) {
  const f = Math.min(5, w * 0.3);
  ctx.save();
  ctx.globalAlpha *= o.alpha ?? 1;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x0 + w - f, y0);
  ctx.lineTo(x0 + w, y0 + f);
  ctx.lineTo(x0 + w, y0 + h);
  ctx.lineTo(x0, y0 + h);
  ctx.closePath();
  ctx.fillStyle = o.fill ?? pal.paper;
  ctx.fill();
  ctx.lineWidth = o.lw ?? 1;
  ctx.strokeStyle = o.stroke ?? pal.ink;
  ctx.setLineDash(o.dash ?? []);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(x0 + w - f, y0);
  ctx.lineTo(x0 + w - f, y0 + f);
  ctx.lineTo(x0 + w, y0 + f);
  ctx.stroke();
  if (!o.bare) {
    ctx.strokeStyle = o.lines ?? pal.line;
    ctx.lineWidth = 1;
    for (let ly = y0 + 5, i = 0; ly < y0 + h - 3 && i < 4; ly += 4, i++) {
      ctx.beginPath();
      ctx.moveTo(x0 + 3, ly);
      ctx.lineTo(x0 + w - 3 - (i === 0 ? f : 0), ly);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// The selection mark: the step id that Timeline hands back through onSpanClick.
function markTag(ctx, x, y, label, pal, alpha = 1) {
  const w = tw(ctx, label, 11, 600, true) + 10, h = 15;
  ctx.save();
  ctx.globalAlpha *= alpha;
  box(ctx, R(x - w / 2, y - h / 2, w, h), {fill: pal.ink, radius: 3});
  txt(ctx, label, x, y + 0.5, {size: 11, weight: 600, mono: true, color: pal.inv, align: 'center'});
  ctx.restore();
  return w;
}

// ---- Layouts: native portrait and native wide, never a shrunk copy of each other ----

export function makeLayout(orient, W, H) {
  return orient === 'wide' ? wideLayout(W, H) : portraitLayout(W, H);
}

function portraitLayout(W, H) {
  const m = 4, xw = Math.max(0, W - 320), xh = Math.max(0, H - 362);
  const aH = 88 + xh * 0.16, gH = 32 + xh * 0.06, dH = 28 + xh * 0.06;
  const book = R(m, m, 202 + xw * 0.42, aH);
  const rx = rightOf(book) + 6;
  const req = R(rx, m + 12, 38 + xw * 0.08, 30 + xh * 0.04);
  const author = R(rightOf(req) + 6, m, W - m - (rightOf(req) + 6), bottomOf(req) - m);
  const lowY = bottomOf(req) + 6;
  const code = R(rx, lowY, 44 + xw * 0.06, m + aH - lowY);
  const fix = R(rightOf(code) + 6, lowY, W - m - (rightOf(code) + 6), m + aH - lowY);
  const gate = R(m, m + aH + 6, W - 2 * m, gH);
  const outY = H - m - dH;
  const scope = R(m, bottomOf(gate) + 6, W - 2 * m, outY - 6 - (bottomOf(gate) + 6));
  const desk = R(m, outY, (W - 2 * m - 8) / 2, dH);
  const json = R(rightOf(desk) + 8, outY, (W - 2 * m - 8) / 2, dH);
  const laneX = rightOf(scope) - 8;
  const head = R(scope.x + 6, scope.y + 3, 0, 13);
  const portal = R(laneX - 6 - 66, scope.y + 3, 66, 13);
  head.w = portal.x - 6 - head.x;
  const rail = R(scope.x + 6, scope.y + 19, laneX - 8 - (scope.x + 6), 11);
  const shelf = R(scope.x + 6, scope.y + 34, rail.w, 31);
  const R0 = bottomOf(shelf) + 5 + xh * 0.05;
  const rcW = 120 + xw * 0.3, rcX = laneX - 6 - rcW;
  const inner = bottomOf(scope) - 5;
  const tl = R(scope.x + 6, R0, rcX - 6 - (scope.x + 6), inner - R0);
  const app = R(rcX, R0, rcW, 40 + xh * 0.05);
  const stat = R(rcX, bottomOf(app) + 4, rcW, 12 + xh * 0.02);
  const jy = bottomOf(stat) + 3, jh = (inner - jy - 3) / 2;
  return {
    orient: 'portrait', W, H, book, leftW: 58 + xw * 0.08, req, author, code, fix, gate, scope, head, portal, rail, shelf,
    chipH: 14, chipGap: 3, app, tl, stat, dl: null, jin: R(rcX, jy, rcW, jh), jout: R(rcX, jy + jh + 3, rcW, jh),
    desk, json, not: null, laneX, laneR: laneX,
  };
}

function wideLayout(W, H) {
  const m = 8, xh = Math.max(0, H - 340);
  const book = R(m, m, 226, 100 + xh * 0.2);
  const rowY = bottomOf(book) + 8;
  const req = R(m, rowY, 50, 38), author = R(66, rowY, 94, 38), code = R(168, rowY, 66, 38);
  const fix = R(m, rowY + 46, 154, 40 + xh * 0.05);
  const gate = R(m, bottomOf(fix) + 8, 226, 46);
  const not = R(m, bottomOf(gate) + 8, 226, H - m - (bottomOf(gate) + 8));
  const outH = 34;
  const scope = R(248, m, W - 248 - m, H - m - outH - 8 - m);
  const desk = R(248, H - m - outH, (scope.w - 12) / 2, outH);
  const json = R(rightOf(desk) + 12, H - m - outH, (scope.w - 12) / 2, outH);
  const laneR = rightOf(scope) - 6;
  const head = R(scope.x + 8, scope.y + 4, 0, 16);
  const portal = R(laneR - 4 - 150, scope.y + 4, 150, 16);
  head.w = portal.x - 8 - head.x;
  const rail = R(scope.x + 8, scope.y + 24, laneR - 6 - (scope.x + 8), 12);
  const shelf = R(scope.x + 8, scope.y + 42, rail.w, 36);
  const R0 = bottomOf(shelf) + 12 + xh * 0.05;
  const app = R(scope.x + 8, R0, 262, 36);
  const tl = R(app.x, bottomOf(app) + 16, 262, bottomOf(scope) - 6 - (bottomOf(app) + 16));
  const rcX = rightOf(app) + 12, rcW = laneR - 6 - rcX;
  const jy = R0 + 40, jh = Math.min(58, (bottomOf(scope) - 6 - jy - 6) / 2);
  return {
    orient: 'wide', W, H, book, leftW: 78, req, author, code, fix, gate, scope, head, portal, rail, shelf,
    chipH: 16, chipGap: 4, app, tl, stat: R(rcX, R0, rcW, 16), dl: R(rcX, R0 + 18, rcW, 16),
    jin: R(rcX, jy, rcW, jh), jout: R(rcX, jy + jh + 6, rcW, jh), desk, json, not, laneX: scope.x - 5, laneR,
  };
}

// Page canvas: portrait is drawn at 1:1 CSS px (labels stay at 11px), wide scales from 720 design px.
export function pageGeometry(cssW) {
  if (cssW >= 720) { const scale = cssW / 720; return {orient: 'wide', scale, W: 720, H: 392, cssH: Math.round(392 * scale)}; }
  if (cssW < 320) { const scale = cssW / 320; return {orient: 'portrait', scale, W: 320, H: 362, cssH: Math.round(362 * scale)}; }
  const H = Math.round(362 + Math.max(0, cssW - 400) * 0.3);
  return {orient: 'portrait', scale: 1, W: cssW, H, cssH: H};
}

// ---- Explanation progress: p runs 0..3 (stage 0 book+authoring, 1 scoped runtime+selection, 2 read+use) ----

export function phases(p) {
  return {
    req: seg(p, 0.04, 0.34), beam: seg(p, 0.1, 0.4), emit: seg(p, 0.42, 0.62), toGate: seg(p, 0.64, 0.84), check: seg(p, 0.84, 1),
    enter: seg(p, 1, 1.2), tokens: seg(p, 1, 1.4), spans: seg(p, 1.2, 1.5), pick: seg(p, 1.5, 1.6), back: seg(p, 1.6, 1.8),
    open: seg(p, 1.8, 2), read: seg(p, 2, 2.4), hand: seg(p, 2.4, 2.8), desk: seg(p, 2.8, 3),
  };
}

export const STAGE_GROUPS = [['author', 'gate'], ['scope'], ['detail', 'out']];

const SHELF_ROWS = [['PageHeader', 'Badge', 'SegmentedControl', 'Button'], ['Timeline', 'Status', 'DataList', 'JsonView']];

function chipGeom(ctx, L) {
  const out = {};
  SHELF_ROWS.forEach((names, r) => {
    let x = L.shelf.x;
    const y = L.shelf.y + r * (L.chipH + L.chipGap);
    for (const n of names) {
      const w = tw(ctx, n, 11, 400, true) + 8;
      out[n] = R(x, y, w, L.chipH);
      x += w + 4;
    }
  });
  return out;
}

function timelineGeom(L, run) {
  const t = L.tl, wide = L.orient === 'wide';
  const headH = wide ? 18 : 14, capH = wide ? 14 : 13;
  const rowH = Math.min(wide ? 20 : 15, (t.h - headH - capH - 2) / 6);
  const nameW = wide ? Math.min(118, t.w * 0.42) : Math.round(t.w * 0.5);
  const statusW = wide ? 54 : 0;
  const trackX = t.x + nameW, trackW = t.w - nameW - statusW - 8;
  const total = Math.max(1, run.now_ms, ...run.steps.map(s => s.end_ms ?? run.now_ms));
  const rows = run.steps.map((s, i) => {
    const y = t.y + headH + i * rowH;
    return {step: s, y, h: rowH, cy: y + rowH / 2, x0: trackX + (s.start_ms / total) * trackW, x1: trackX + ((s.end_ms ?? run.now_ms) / total) * trackW};
  });
  const left = run.plan.slice(run.steps.length);
  const ghost = left.length ? {y: t.y + headH + rows.length * rowH, h: rowH, labels: left} : null;
  return {headH, capH, rowH, nameW, statusW, trackX, trackW, total, rows, ghost, capY: bottomOf(t) - capH / 2 - 1};
}

function fixSheets(L) {
  const f = L.fix;
  if (L.orient === 'wide') {
    const w = (f.w - 16) / 3;
    return CASES.map((id, i) => R(f.x + i * (w + 8), f.y + 14, w, f.h - 14));
  }
  const h = Math.min(24, f.h - 15);
  return CASES.map((id, i) => R(f.x + 4 + i * 10, f.y + 2, 18, h));
}

function appCols(L) {
  const a = L.app, c0 = a.x + 36;
  return {sampleId: R(c0, a.y, 90, a.h), openSteps: R(c0 + 94, a.y, 80, a.h), theme: R(c0 + 178, a.y, rightOf(a) - (c0 + 178) - 4, a.h)};
}

function pathsFor(ctx, L, chips, tg, row, sheet, markLabel) {
  const {book, req, author, code, fix, gate, scope, app, tl, desk, json, laneX, laneR} = L;
  const P = {};
  P.reqMove = [[midX(req), midY(req)], [midX(author), midY(author)]];
  P.req = [[rightOf(req), midY(req)], [author.x, midY(req)]];
  P.emitCode = [[midX(author), midY(author)], [midX(code), midY(code)]];
  P.emitFix = [[midX(author), midY(author)], [midX(sheet), midY(sheet)]];
  P.desk = [[midX(desk), bottomOf(scope)], [midX(desk), desk.y]];
  P.tokens = [[midX(L.rail), bottomOf(L.rail)], [midX(L.rail), L.shelf.y]];
  const markW = tw(ctx, markLabel, 11, 600, true) + 10;
  if (L.orient === 'wide') {
    const cols = appCols(L), gx = rightOf(tl) + 6, by = bottomOf(app) + 12, ox = midX(cols.openSteps), sx = cols.sampleId.x + 10;
    P.beam = [[midX(author), bottomOf(book)], [midX(author), author.y]];
    P.toCode = [[rightOf(author), midY(author)], [code.x, midY(code)]];
    P.toFix = [[rightOf(author) - 10, bottomOf(author)], [rightOf(author) - 10, fix.y]];
    P.codeGate = [[midX(code), bottomOf(code)], [midX(code), midY(gate)]];
    P.fixGate = [[midX(sheet), bottomOf(sheet)], [midX(sheet), midY(gate)]];
    P.enter = [[midX(sheet), midY(gate)], [laneX, midY(gate)], [laneX, midY(app)], [app.x, midY(app)]];
    P.spansMove = [[app.x, midY(app)], [sx + 10, midY(app)], [sx + 10, tl.y + 9]];
    P.toSpans = [[sx, bottomOf(app)], [sx, tl.y]];
    P.toSpansLabel = [sx + 6, bottomOf(app) + 7];
    P.backLabel = [gx - 8, bottomOf(app) + 5];
    P.back = row ? [[rightOf(tl), row.cy], [gx, row.cy], [gx, by], [ox, by], [ox, bottomOf(app)]] : null;
    P.rest = [ox, app.y + app.h * 0.72];
    P.backMove = P.back ? [...P.back.slice(0, -1), P.rest] : null;
    P.open = [[rightOf(app), app.y + 9], [L.stat.x, app.y + 9]];
    const btn = chips.Button;
    P.json = [[rightOf(btn), midY(btn)], [laneR, midY(btn)], [laneR, json.y]];
    P.steps78 = [[book.x, bottomOf(book) - 12], [4, bottomOf(book) - 12], [4, midY(gate)], [gate.x, midY(gate)]];
  } else {
    const y1 = app.y + app.h * 0.18, y3 = app.y + app.h * 0.82, gx = (rightOf(tl) + app.x) / 2;
    const fx = Math.min(Math.max(midX(fix), author.x + 8), rightOf(author) - 8);
    P.beam = [[rightOf(book), book.y + 7], [author.x, book.y + 7]];
    P.toCode = [[author.x + 8, bottomOf(author)], [midX(code), code.y]];
    P.toFix = [[fx, bottomOf(author)], [fx, fix.y]];
    P.codeGate = [[midX(code), bottomOf(code)], [midX(code), midY(gate)]];
    P.fixGate = [[midX(sheet), midY(sheet)], [laneX, midY(sheet)], [laneX, midY(gate)]];
    P.enter = [[laneX, midY(gate)], [laneX, y1], [rightOf(app), y1]];
    P.spansMove = [[rightOf(app) - 10, y1], [app.x, y1], [rightOf(tl) - 26, tl.y + 7]];
    P.toSpans = [[app.x, y1], [rightOf(tl), y1]];
    P.toSpansLabel = null;
    P.backLabel = null;
    P.rest = [app.x + 5 + markW / 2, y3];
    P.back = row ? [[rightOf(tl), row.cy], [gx, row.cy], [gx, y3], [app.x, y3]] : null;
    P.backMove = row ? [[rightOf(tl), row.cy], [gx, row.cy], [gx, y3], P.rest] : null;
    P.open = [[P.rest[0], bottomOf(app)], [P.rest[0], L.stat.y]];
    P.json = [[rightOf(app), app.y + app.h * 0.62], [laneR, app.y + app.h * 0.62], [laneR, json.y]];
    P.steps78 = [[book.x + L.leftW / 2, bottomOf(book)], [book.x + L.leftW / 2, gate.y]];
  }
  P.fixStatic = L.orient === 'wide' ? [[midX(sheet), bottomOf(sheet)], ...P.enter.slice(1)] : [[laneX, fix.y + 12], ...P.enter.slice(1)];
  return P;
}

// ---- Outside the app: book, request, the one author, papers, the separate producer gate, outputs ----

const RULE_ROWS = [['部品優先', '範囲', '白黒'], ['トークン', 'キー操作'], ['状態=言葉', '暖色=異常']];

function drawBook(ctx, L, pal, bookLit, rulesLit) {
  const r = L.book, wide = L.orient === 'wide', headH = wide ? 17 : 14;
  box(ctx, r, {fill: pal.paper, stroke: pal.ink, radius: 3});
  txt(ctx, '指示書 SKILL.md', r.x + 6, r.y + headH / 2 + 1, {size: wide ? 12 : 11, weight: 700, color: pal.ink, maxW: r.w * 0.56});
  txt(ctx, '8手順と規則', rightOf(r) - 6, r.y + headH / 2 + 1, {color: pal.t3, align: 'right', maxW: r.w * 0.38});
  poly(ctx, [[r.x + 3, r.y + headH + 0.5], [rightOf(r) - 3, r.y + headH + 0.5]], {color: pal.line});
  const sx = r.x + L.leftW;
  poly(ctx, [[sx, r.y + headH + 3], [sx, bottomOf(r) - 3]], {color: pal.strong});
  const pad = 5, gap = 3;
  const cw = (L.leftW - pad * 2 - gap) / 2, ch = (r.h - headH - pad - 3 - gap * 3) / 4;
  for (let i = 0; i < 8; i++) {
    const q = R(r.x + pad + (i < 4 ? 0 : cw + gap), r.y + headH + 3 + (i % 4) * (ch + gap), cw, ch);
    const on = bookLit > i + 0.5;
    box(ctx, q, {fill: on ? pal.ink : pal.paper, stroke: on ? pal.ink : pal.strong, radius: 2, dash: i >= 6 && !on ? [2, 2] : undefined});
    txt(ctx, String(i + 1), midX(q), midY(q) + 0.5, {weight: 600, color: on ? pal.inv : pal.t2, align: 'center'});
  }
  const chH = wide ? 17 : 15, rg = wide ? 5 : 3;
  let k = 0;
  RULE_ROWS.forEach((names, ri) => {
    let x = sx + 5;
    const y = r.y + headH + 3 + ri * (chH + rg);
    for (const n of names) {
      const w = tw(ctx, n) + 8, on = rulesLit > k + 0.5;
      box(ctx, R(x, y, w, chH), {fill: on ? pal.wash : pal.paper, stroke: on ? pal.ink : pal.line, radius: 3});
      txt(ctx, n, x + 4, y + chH / 2 + 0.5, {color: on ? pal.ink : pal.t3});
      x += w + 4;
      k += 1;
    }
  });
}

function drawSheetLabel(ctx, r, pal, label, ready) {
  const pw = Math.min(18, r.w - 10), phh = Math.max(10, Math.min(20, r.h - 15));
  paper(ctx, midX(r) - pw / 2, r.y + 1, pw, phh, pal, ready ? {} : {dash: [2, 2], stroke: pal.strong});
  txt(ctx, label, midX(r), bottomOf(r) - 6, {weight: 600, color: ready ? pal.ink : pal.t3, align: 'center', maxW: r.w + 4});
}

function drawAuthorLane(ctx, L, pal, ph, kase, sheets) {
  const {req, author, code, fix} = L, wide = L.orient === 'wide';
  drawSheetLabel(ctx, req, pal, '依頼', true);
  box(ctx, author, {fill: pal.paper, stroke: pal.ink, lw: 1.5, radius: 8});
  txt(ctx, '作者AI', midX(author), author.y + author.h * 0.36, {size: 12, weight: 700, color: pal.ink, align: 'center', maxW: author.w - 6});
  txt(ctx, 'Opus 5.5', midX(author), author.y + author.h * 0.72, {color: pal.t2, align: 'center', maxW: author.w - 6});
  drawSheetLabel(ctx, code, pal, 'コード', ph.emit >= 1);
  const ready = ph.emit >= 1;
  if (wide) {
    txt(ctx, 'fixture 3件・静的サンプル', fix.x, fix.y + 6, {color: pal.t2, maxW: fix.w - 18});
    const words = ['完了', '失敗', '待ち'];
    sheets.forEach((r, i) => {
      const on = i === kase.index;
      paper(ctx, r.x, r.y, r.w, r.h, pal, {bare: true, stroke: on && ready ? pal.ink : pal.strong, lw: on && ready ? 1.6 : 1, dash: ready ? undefined : [2, 2]});
      txt(ctx, words[i], r.x + 6, r.y + r.h * 0.34, {weight: on ? 700 : 400, color: ready ? pal.ink : pal.t3, maxW: r.w - 10});
      const c = CASES[i];
      txt(ctx, `${EXPECT[c].steps.length}/${EXPECT[c].plan}段`, r.x + 6, r.y + r.h * 0.74, {color: pal.t3, maxW: r.w - 10});
    });
  } else {
    const order = [0, 1, 2].filter(i => i !== kase.index).concat(kase.index);
    for (const i of order) {
      const r = sheets[i], on = i === kase.index;
      paper(ctx, r.x, r.y, r.w, r.h, pal, {stroke: on && ready ? pal.ink : pal.strong, lw: on && ready ? 1.5 : 1, dash: ready ? undefined : [2, 2]});
    }
    txt(ctx, 'fixture', fix.x + 4, bottomOf(fix) - 6, {weight: 600, mono: true, color: ready ? pal.ink : pal.t3, maxW: fix.w - 4});
  }
}

function drawGate(ctx, L, pal, chk) {
  const g = L.gate, wide = L.orient === 'wide';
  box(ctx, g, {fill: pal.field, stroke: pal.strong, radius: 4});
  const y1 = wide ? g.y + 10 : g.y + g.h * 0.3, y2 = wide ? g.y + 25 : y1, y3 = wide ? g.y + 38 : g.y + g.h * 0.74;
  let x = g.x + 6 + txt(ctx, '制作担当（別工程）', g.x + 6, y1, {weight: 700, color: pal.ink}) + 8;
  if (wide) x = g.x + 6;
  (wide ? ['lint', 'build', '390/1280px'] : ['lint', 'build', '390/1280']).forEach((n, i) => {
    const on = chk >= (i + 1) / 3 - 0.001, w = tw(ctx, n, 11, 400, true) + 18;
    box(ctx, R(x, y2 - 7, w, 14), {fill: pal.paper, stroke: on ? pal.ink : pal.line, radius: 3});
    if (on) check(ctx, x + 7, y2, 7, pal.ink);
    txt(ctx, n, x + 14, y2 + 0.5, {mono: true, color: on ? pal.ink : pal.t3});
    x += w + 4;
  });
  const maxW = (wide ? rightOf(g) : L.laneX - 10) - g.x - 12;
  txt(ctx, '固定版を手で配置・shadcn CLIは未実行', g.x + 6, y3, {color: pal.t2, maxW});
}

function drawOutputs(ctx, L, pal, ph, kase) {
  const d = L.desk, j = L.json, wide = L.orient === 'wide';
  const y1 = d.y + d.h * 0.32, y2 = d.y + d.h * 0.72;
  box(ctx, d, {fill: pal.paper, stroke: ph.desk > 0 ? pal.ink : pal.strong, lw: ph.desk >= 1 ? 1.6 : 1, radius: 4});
  const x = d.x + 6 + txt(ctx, 'desk.html', d.x + 6, y1, {weight: 700, mono: true, color: pal.ink}) + 6;
  txt(ctx, '実物の画面', x, y1, {color: pal.ink, maxW: rightOf(d) - 6 - x});
  txt(ctx, wide ? '同じ8部品をキーボードでも操作できる' : '8部品を操作できる', d.x + 6, y2, {color: pal.t2, maxW: d.w - 12});
  box(ctx, j, {fill: pal.paper, stroke: ph.hand >= 1 ? pal.ink : pal.strong, lw: ph.hand >= 1 ? 1.6 : 1, radius: 4});
  txt(ctx, wide ? 'JSON → ブラウザー（保存完了は未確認）' : 'JSON → ブラウザー', j.x + 6, y1, {weight: 600, color: pal.ink, maxW: j.w - 12});
  txt(ctx, wide ? `${kase.file}　${kase.byteLength.toLocaleString('ja-JP')}バイト` : '保存完了は未確認', j.x + 6, y2, {color: pal.t2, mono: wide, maxW: j.w - 12});
}

function drawNot(ctx, L, pal) {
  const n = L.not;
  if (!n || n.h < 30) return;
  box(ctx, n, {fill: pal.paper, stroke: pal.line, radius: 4, dash: [3, 3]});
  txt(ctx, 'Quartzではないもの', n.x + 6, n.y + 10, {weight: 700, color: pal.ink, maxW: n.w - 12});
  ['AIモデル・エージェント実行基盤', 'ログ収集・ホストAPI', 'ワークフロー・自動UI生成'].forEach((s, i) => {
    const y = n.y + 26 + i * 14;
    if (y < bottomOf(n) - 4) txt(ctx, s, n.x + 6, y, {color: pal.t2, maxW: n.w - 12});
  });
}

// ---- Inside body.quartz: tokens, the 8 original parts, App state, Timeline, the chosen step ----

function drawScopeTop(ctx, L, pin, ph, appTheme, chips) {
  const wide = L.orient === 'wide';
  txt(ctx, wide ? '範囲 body.quartz ＋ QuartzPortalProvider' : 'body.quartz ＋ QuartzPortalProvider', L.head.x, midY(L.head),
    {weight: 600, color: pin.ink, maxW: L.head.w});
  box(ctx, L.portal, {stroke: pin.strong, dash: [3, 2], radius: 3});
  txt(ctx, wide ? 'Portal枠（ポップアップなし）' : 'Portal枠', midX(L.portal), midY(L.portal), {color: pin.t3, align: 'center', maxW: L.portal.w - 6});
  const rail = L.rail;
  box(ctx, rail, {fill: pin.field, radius: 3});
  let x = rail.x + 5 + txt(ctx, wide ? '役割トークン tokens.css' : '役割トークン', rail.x + 5, midY(rail), {weight: 700, color: pin.ink}) + 8;
  const sw = [pin.ink, pin.paper, pin.field, ...pin.hue, pin.warn, pin.fail];
  sw.forEach((c, i) => {
    const on = ph.tokens > i / sw.length;
    box(ctx, R(x + i * 11, midY(rail) - 3.5, 9, 7), {fill: on ? c : undefined, stroke: pin.strong, radius: 1.5});
  });
  txt(ctx, `theme:${appTheme}`, rightOf(rail) - 5, midY(rail), {mono: true, color: pin.t2, align: 'right'});
  let i = 0;
  for (const name of [...SHELF_ROWS[0], ...SHELF_ROWS[1]]) {
    const r = chips[name], on = ph.tokens > 0.3 + i * 0.08;
    box(ctx, r, on ? {fill: pin.paper, stroke: pin.strong, radius: 3} : {stroke: pin.line, dash: [2, 2], radius: 3});
    txt(ctx, name, r.x + 4, midY(r) + 0.5, {mono: true, color: on ? pin.ink : pin.t3});
    i += 1;
  }
}

function drawApp(ctx, L, pin, ph, sel, p, kase, appTheme) {
  const a = L.app, wide = L.orient === 'wide';
  box(ctx, a, {fill: pin.paper, stroke: pin.strong, dash: [3, 2], radius: 4});
  const arrived = (p >= 2 && sel < 1) ? sel >= 0.7 : ph.back >= 1;
  if (wide) {
    const c = appCols(L), y1 = a.y + 10, y2 = a.y + a.h * 0.72;
    if (ph.enter >= 1 && ph.spans < 1) box(ctx, R(c.sampleId.x - 3, a.y + 2, c.sampleId.w, a.h - 4), {fill: pin.wash, radius: 3});
    if (arrived) box(ctx, R(c.openSteps.x - 3, a.y + 2, c.openSteps.w, a.h - 4), {fill: pin.wash, radius: 3});
    txt(ctx, 'App', a.x + 6, y1, {weight: 700, color: pin.ink});
    txt(ctx, 'sampleId', c.sampleId.x, y1, {mono: true, color: pin.t3});
    txt(ctx, 'openSteps', c.openSteps.x, y1, {mono: true, color: pin.t3});
    txt(ctx, 'theme', c.theme.x, y1, {mono: true, color: pin.t3, maxW: c.theme.w});
    if (ph.enter >= 1) txt(ctx, kase.id, c.sampleId.x, y2, {mono: true, color: pin.ink, maxW: c.sampleId.w - 4});
    txt(ctx, appTheme, c.theme.x, y2, {mono: true, color: pin.ink, maxW: c.theme.w});
  } else {
    const y1 = a.y + a.h * 0.18, y2 = a.y + a.h * 0.5;
    if (arrived) box(ctx, R(a.x + 2, y2 - 6, a.w - 4, a.h * 0.82 - y2 + a.y + 13), {fill: pin.wash, radius: 3});
    txt(ctx, 'App', a.x + 5, y1, {weight: 700, color: pin.ink});
    txt(ctx, `theme:${appTheme}`, rightOf(a) - 5, y1, {mono: true, color: pin.t2, align: 'right'});
    txt(ctx, 'openSteps', a.x + 5, y2, {mono: true, color: pin.t3, maxW: a.w - 10});
  }
}

function drawTimeline(ctx, L, pin, tg, run, step, ph, sel, p, regrow) {
  const t = L.tl, wide = L.orient === 'wide';
  box(ctx, t, {fill: pin.paper, stroke: pin.strong, radius: 5});
  const hy = t.y + tg.headH / 2;
  const x = t.x + 6 + txt(ctx, 'Timeline', t.x + 6, hy, {weight: 700, mono: true, color: pin.ink}) + 8;
  if (wide) {
    const bw = tw(ctx, '静的サンプル') + 10;
    box(ctx, R(x, hy - 7, bw, 14), {fill: pin.paper, stroke: pin.strong, radius: 3});
    txt(ctx, '静的サンプル', x + 5, hy + 0.5, {color: pin.ink});
    txt(ctx, `架空 ${seconds(tg.total)}`, rightOf(t) - 6, hy, {color: pin.t2, align: 'right'});
  } else {
    txt(ctx, 'toSpans(run)', rightOf(t) - 5, hy, {mono: true, color: pin.t3, align: 'right', maxW: rightOf(t) - 10 - x});
  }
  poly(ctx, [[t.x + 1, t.y + tg.headH + 0.5], [rightOf(t) - 1, t.y + tg.headH + 0.5]], {color: pin.line});
  const n = tg.rows.length, grow = Math.min(ph.spans, regrow);
  const picked = (p >= 2 && sel < 1) || ph.pick > 0;
  tg.rows.forEach((r, i) => {
    const g = ease(grow * (n + 0.5) - i);
    if (g <= 0) return;
    const s = r.step, isSel = picked && s.id === step.id, fail = s.status === 'fail';
    ctx.save();
    ctx.globalAlpha *= Math.min(1, g * 1.5);
    if (isSel) box(ctx, R(t.x + 1, r.y, t.w - 2, r.h), {fill: pin.wash, radius: 0});
    poly(ctx, [[t.x + 1, r.y + r.h + 0.5], [rightOf(t) - 1, r.y + r.h + 0.5]], {color: pin.line});
    txt(ctx, s.label, t.x + 6, r.cy, {weight: isSel ? 700 : 400, color: fail ? pin.fail : pin.ink, maxW: tg.nameW - 10});
    const bh = Math.min(8, r.h - 6), x1 = lerp(r.x0, r.x1, g), bw = Math.max(3, x1 - r.x0);
    if (s.status === 'waiting') {
      box(ctx, R(r.x0, r.cy - bh / 2 - 1, bw, bh + 2), {fill: pin.paper, stroke: pin.ink, radius: 2});
      if (!wide && bw > tw(ctx, '入力待ち') + 6) txt(ctx, '入力待ち', r.x0 + 3, r.cy + 0.5, {color: pin.ink});
    } else {
      box(ctx, R(r.x0, r.cy - bh / 2, bw, bh), {fill: fail ? pin.fail : isSel ? pin.ink : pin.strong, radius: 2});
    }
    if (wide && tg.statusW) {
      const sx = rightOf(t) - tg.statusW;
      if (fail) txt(ctx, '失敗', sx, r.cy, {weight: 700, color: pin.fail});
      if (s.status === 'waiting') {
        const w = tw(ctx, '入力待ち') + 8;
        box(ctx, R(sx, r.cy - 7, w, 14), {fill: pin.paper, stroke: pin.ink, radius: 3});
        txt(ctx, '入力待ち', sx + 4, r.cy + 0.5, {color: pin.ink});
      }
    }
    ctx.restore();
  });
  if (tg.ghost && grow >= 1) {
    const gr = R(t.x + 4, tg.ghost.y + 2, t.w - 8, tg.ghost.h - 4), k = tg.ghost.labels.length;
    box(ctx, gr, {stroke: pin.strong, dash: [3, 2], radius: 2});
    const label = wide ? `未実行 ${k}段：「${tg.ghost.labels[0]}」${k > 1 ? 'ほか' : ''}` : `未実行 ${k}段`;
    txt(ctx, label, gr.x + 5, midY(gr) + 0.5, {color: pin.t2, maxW: gr.w - 10});
  }
  txt(ctx, wide ? '架空の時刻（ms を秒で表示）' : `静的サンプル・架空の時刻 ${seconds(tg.total)}`, t.x + 6, tg.capY, {color: pin.t2, maxW: t.w - 12});
}

function drawValue(ctx, x, y, step, side, key, pin, maxW, wide) {
  const v = step[side][key], tr = troubleOf(step, side, key), s = brief(v);
  if (tr === 'waiting' && v === null) {
    const w = tw(ctx, 'null', 11, 600, true) + 8;
    box(ctx, R(x, y - 7, w, 14), {fill: pin.paper, stroke: pin.ink, radius: 3});
    txt(ctx, 'null', x + 4, y + 0.5, {weight: 600, mono: true, color: pin.ink});
    return;
  }
  let used = txt(ctx, s, x, y, {weight: tr ? 700 : 400, mono: true, color: tr === 'fail' ? pin.fail : pin.ink, maxW});
  if (step.id === 'a1-save' && side === 'output' && key === 'saved' && used + 40 < maxW) txt(ctx, '（架空）', x + used + 2, y, {color: pin.t3});
  if (wide && tr === 'fail' && key === 'path' && used + 80 < maxW) txt(ctx, 'systems/ なし', x + used + 6, y, {color: pin.fail});
}

function drawJson(ctx, r, side, step, pin, show, wide) {
  box(ctx, r, {fill: pin.paper, stroke: show > 0 ? pin.strong : pin.line, radius: 4});
  const y1 = wide ? r.y + 10 : r.y + Math.min(7, r.h * 0.28);
  let x = r.x + 5;
  if (wide) x += txt(ctx, 'JsonView', x, y1, {mono: true, color: pin.t3}) + 6;
  x += txt(ctx, side === 'input' ? '入力' : '出力', x, y1, {weight: 700, color: pin.ink}) + 6;
  if (show <= 0) return;
  ctx.save();
  ctx.globalAlpha *= show;
  const obj = step[side], keys = keysFor(obj, side, wide ? 2 : 1);
  if (!keys.length) txt(ctx, brief(obj), r.x + 5, wide ? r.y + 26 : r.y + r.h * 0.72, {mono: true, color: pin.ink, maxW: r.w - 10});
  if (wide) {
    keys.forEach((k, i) => {
      const y = r.y + 26 + i * 15;
      if (y > bottomOf(r) - 5) return;
      const vx = r.x + 5 + txt(ctx, k, r.x + 5, y, {mono: true, color: pin.t3, maxW: 84}) + 6;
      drawValue(ctx, vx, y, step, side, k, pin, rightOf(r) - 5 - vx, true);
    });
  } else if (keys.length) {
    txt(ctx, keys[0], x, y1, {mono: true, color: pin.t3, maxW: rightOf(r) - 5 - x});
    drawValue(ctx, r.x + 5, r.y + r.h * 0.72, step, side, keys[0], pin, r.w - 10, false);
  }
  ctx.restore();
}

function drawDetail(ctx, L, pin, run, step, ph) {
  const wide = L.orient === 'wide', st = L.stat;
  const sStat = seg(ph.read, 0, 0.3), sIn = seg(ph.read, 0.3, 0.65), sOut = seg(ph.read, 0.65, 1);
  const time = stepTime(run, step);
  let x = st.x + (wide ? 0 : 1);
  if (wide) x += txt(ctx, 'Status', x, midY(st), {mono: true, color: pin.t3}) + 8;
  if (sStat <= 0) {
    if (!wide) txt(ctx, 'Status', x, midY(st), {mono: true, color: pin.t3});
  } else {
    ctx.save();
    ctx.globalAlpha *= sStat;
    if (step.status === 'waiting') {
      const w = tw(ctx, '入力待ち') + 8;
      box(ctx, R(x, midY(st) - 7, w, 14), {fill: pin.paper, stroke: pin.ink, radius: 3});
      txt(ctx, '入力待ち', x + 4, midY(st) + 0.5, {color: pin.ink});
      x += w + 6;
    } else {
      x += txt(ctx, STATUS_WORD[step.status], x, midY(st), {weight: 700, color: step.status === 'fail' ? pin.fail : pin.t2}) + 6;
    }
    if (!wide) txt(ctx, `${time.took}${time.waited ? '待機' : ''} 架空`, x, midY(st), {color: pin.t2, maxW: rightOf(st) - x});
    ctx.restore();
  }
  if (wide && L.dl) {
    const d = L.dl;
    const dx = d.x + txt(ctx, 'DataList', d.x, midY(d), {mono: true, color: pin.t3}) + 8;
    if (sStat > 0) {
      ctx.save();
      ctx.globalAlpha *= sStat;
      txt(ctx, `${TYPE_WORD[step.type]}${step.tool ? ' ' + step.tool : ''}　${time.waited ? '待った時間' : '所要'} ${time.took}（架空）`, dx, midY(d),
        {color: pin.ink, maxW: rightOf(d) - dx});
      ctx.restore();
    }
  }
  drawJson(ctx, L.jin, 'input', step, pin, sIn, wide);
  drawJson(ctx, L.jout, 'output', step, pin, sOut, wide);
}

// ---- One whole frame of the connected map ----

function partRect(L, id) {
  switch (id) {
    case 'instructions': return L.book;
    case 'scope': return L.scope;
    case 'tokens': return L.rail;
    case 'components': return L.shelf;
    case 'selection': {
      const x = Math.min(L.tl.x, L.app.x), y = Math.min(L.tl.y, L.app.y);
      return R(x, y, Math.max(rightOf(L.tl), rightOf(L.app)) - x, Math.max(bottomOf(L.tl), bottomOf(L.app)) - y);
    }
    case 'check': return L.gate;
    default: return null;
  }
}

function drawPartFrame(ctx, L, pal, part) {
  const r = partRect(L, part.id);
  if (!r) return;
  const o = R(r.x - 2.5, r.y - 2.5, r.w + 5, r.h + 5);
  box(ctx, o, {stroke: pal.ink, lw: 2, radius: 6});
  const w = Math.min(tw(ctx, part.label, 11, 700) + 10, o.w);
  const tag = R(rightOf(o) - w, bottomOf(o) - 8, w, 16);
  box(ctx, tag, {fill: pal.ink, radius: 3});
  txt(ctx, part.label, tag.x + 5, midY(tag) + 0.5, {weight: 700, color: pal.inv, maxW: w - 10});
}

// s: {bundle, caseId, stepId, theme, appTheme?, p (0..3), sel (0..1 pulse), regrow, part, emph, bookLit?, rulesLit?}
export function drawMap(ctx, L, s) {
  const b = s.bundle, kase = b.cases[s.caseId] || b.cases.completed, run = kase.fixture;
  const step = run.steps.find(x => x.id === s.stepId) || run.steps.find(x => x.id === run.focus_step);
  const p = s.p ?? 3, ph = phases(p), sel = s.sel ?? 1, regrow = s.regrow ?? 1;
  const appTheme = s.appTheme || s.theme, pal = palette(s.theme), pin = palette(appTheme);
  const wide = L.orient === 'wide';
  const bookLit = s.bookLit ?? 8 * seg(p, 0, 0.3), rulesLit = s.rulesLit ?? 7 * ph.beam;
  const alpha = g => (s.emph && s.emph.length && !s.emph.includes(g) ? 0.7 : 1);
  const chips = chipGeom(ctx, L);
  const tg = timelineGeom(L, run);
  const row = tg.rows[run.steps.indexOf(step)];
  const sheets = fixSheets(L), sheet = sheets[kase.index];
  const P = pathsFor(ctx, L, chips, tg, row, sheet, step.id);
  const pulsing = p >= 2 && sel < 1;
  const arrived = pulsing ? sel >= 0.7 : ph.back >= 1;

  const links = c => [
    ['author', P.beam, {color: ph.beam > 0 ? c.strong : c.line, dash: [3, 3], head: 4}],
    ['author', P.req, {color: c.strong, head: 4}],
    ['author', P.toCode, {color: ph.emit > 0 ? c.strong : c.line, head: 4}],
    ['author', P.toFix, {color: ph.emit > 0 ? c.strong : c.line, head: 4}],
    ['gate', P.steps78, {color: c.strong, dash: [1.5, 3]}],
    ['gate', P.codeGate, {color: ph.toGate > 0 ? c.strong : c.line, head: 4}],
    ['gate', P.fixStatic, {color: ph.enter > 0 ? c.ink : c.strong, head: 5}],
    ['scope', P.tokens, {color: ph.tokens > 0 ? c.strong : c.line, head: 4}],
    ['scope', P.toSpans, {color: ph.spans > 0 ? c.ink : c.strong, head: 5}],
    ['scope', P.back, {color: arrived ? c.ink : c.strong, lw: arrived ? 1.5 : 1, head: 5}],
    ['detail', P.open, {color: ph.open > 0 || pulsing ? c.ink : c.strong, head: 4}],
    ['out', P.json, {color: ph.hand > 0 ? c.ink : c.strong, dash: [4, 3], head: 5}],
    ['out', P.desk, {color: ph.desk > 0 ? c.ink : c.strong, dash: [3, 3], head: 5}],
  ];
  const drawLinks = c => {
    for (const [g, pts, o] of links(c)) {
      if (!pts) continue;
      ctx.save();
      ctx.globalAlpha *= alpha(g);
      poly(ctx, pts, o);
      ctx.restore();
    }
  };
  const group = (g, fn) => { ctx.save(); ctx.globalAlpha *= alpha(g); fn(); ctx.restore(); };

  ctx.save();
  ctx.fillStyle = pal.bg;
  ctx.fillRect(0, 0, L.W, L.H);
  drawLinks(pal);
  group('author', () => { drawBook(ctx, L, pal, bookLit, rulesLit); drawAuthorLane(ctx, L, pal, ph, kase, sheets); });
  group('gate', () => drawGate(ctx, L, pal, ph.check));
  group('out', () => drawOutputs(ctx, L, pal, ph, kase));
  drawNot(ctx, L, pal);

  // The built app: author code and producer checks feed it; inside, the App theme sets the tokens.
  const sc = L.scope;
  group('scope', () => box(ctx, sc, {fill: pin.paper, stroke: pal.ink, lw: 1.5, radius: 7, dash: ph.enter >= 0.5 ? undefined : [5, 3]}));
  ctx.save();
  rrect(ctx, sc.x, sc.y, sc.w, sc.h, 7);
  ctx.clip();
  drawLinks(pin);
  group('scope', () => {
    drawScopeTop(ctx, L, pin, ph, appTheme, chips);
    drawApp(ctx, L, pin, ph, sel, p, kase, appTheme);
    drawTimeline(ctx, L, pin, tg, run, step, ph, sel, p, regrow);
    if (P.toSpansLabel) txt(ctx, 'toSpans(run)', P.toSpansLabel[0], P.toSpansLabel[1], {mono: true, color: pin.t2});
    if (P.backLabel) txt(ctx, 'onSpanClick(id)', P.backLabel[0], P.backLabel[1], {mono: true, color: pin.t2, align: 'right'});
  });
  group('detail', () => drawDetail(ctx, L, pin, run, step, ph));
  ctx.restore();

  // Moving entities: the same request, code, fixture paper, selection mark and JSON sheet.
  if (ph.req > 0 && ph.req < 1) {
    const [x, y] = along(P.reqMove, ease(ph.req)), k = 1 - 0.35 * ph.req;
    paper(ctx, x - 7 * k, y - 9 * k, 14 * k, 18 * k, pal);
  }
  if (ph.emit > 0 && ph.emit < 1) {
    const e = ease(ph.emit), [cx1, cy1] = along(P.emitCode, e), [fx1, fy1] = along(P.emitFix, e);
    paper(ctx, cx1 - 6, cy1 - 8, 12, 16, pal);
    paper(ctx, fx1 - 6, fy1 - 8, 12, 16, pal);
  }
  if (ph.toGate > 0 && ph.enter < 1) {
    const [x, y] = along(P.codeGate, ease(ph.toGate));
    paper(ctx, x - 6, y - 8, 12, 16, pal, {alpha: 1 - ph.enter});
  }
  if (ph.toGate > 0 && ph.spans < 1) {
    const pos = ph.enter <= 0 ? along(P.fixGate, ease(ph.toGate)) : ph.spans <= 0 ? along(P.enter, ease(ph.enter)) : along(P.spansMove, ease(ph.spans));
    const k = 1 - 0.4 * ph.spans;
    paper(ctx, pos[0] - 6 * k, pos[1] - 8 * k, 12 * k, 16 * k, pin, {alpha: 1 - ph.spans * 0.8, stroke: pal.ink, lw: 1.4});
    txt(ctx, CASE_WORD[kase.id], pos[0] + 9, pos[1], {weight: 700, color: pal.ink});
  }
  if (P.backMove) {
    let pos = null, a = 1;
    if (pulsing) pos = sel < 0.3 ? P.backMove[0] : along(P.backMove, ease(seg(sel, 0.3, 0.7)));
    else if (ph.pick > 0) { pos = ph.back > 0 ? along(P.backMove, ease(ph.back)) : P.backMove[0]; a = ph.back > 0 ? 1 : ph.pick; }
    if (pos) markTag(ctx, pos[0], pos[1], step.id, pin, a);
  }
  const openT = pulsing ? seg(sel, 0.7, 1) : ph.open;
  if (openT > 0 && openT < 1) {
    const [x, y] = along(P.open, ease(openT));
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = pin.ink;
    ctx.fill();
  }
  if (ph.hand > 0 && ph.hand < 1) {
    const [x, y] = along(P.json, ease(ph.hand));
    paper(ctx, x - 7, y - 9, 14, 18, pal, {lw: 1.4});
    txt(ctx, 'JSON', x + 10, y, {weight: 700, mono: true, color: pal.ink});
  }
  const part = s.part && b.parts.find(x => x.id === s.part);
  if (part) drawPartFrame(ctx, L, pal, part);
  ctx.restore();
}

// ---- The reader-facing page (index.html). The film imports the exports above without running this. ----

const STAGE_NOTES = [
  '指示書（SKILL.md）の8手順と規則を、依頼文と一緒に同じ作者AIが読み、Reactの構成・日本語の文言・3件のfixtureを書きます。制作担当は別工程で固定版のファイルを手で配置し、元の画面にlint・build・390/1280pxの確認をしました。',
  'body.quartz と QuartzPortalProvider の範囲で、役割トークンが8部品の見た目を決めます。fixtureは App の sampleId から toSpans(run) を通って Timeline になり、押した段のidが onSpanClick で App.openSteps へ戻ります。',
  '選んだ段の状態と時間、入力と出力を読み、どこで止まったかを確かめます。サンプルJSONは事例全体をブラウザーへ渡すだけです。desk.html では実物の8部品を操作できます。',
];
const STAGE_MS = 3400;

export function initConceptPage() {
  const root = document.documentElement;
  const $ = id => document.getElementById(id);
  const all = q => Array.from(document.querySelectorAll(q));
  const ui = {
    status: $('load-status'), retry: $('retry'), canvas: $('concept-map'), figure: $('concept-map').parentElement,
    caseMeta: $('case-meta'), phaseNote: $('phase-note'), replay: $('replay'), stepSelect: $('step-select'),
    stepName: $('step-name'), stepStatus: $('step-status'), stepNote: $('step-note'), stepFacts: $('step-facts'),
    stepInput: $('step-input'), stepOutput: $('step-output'), openDesk: $('open-desk'), save: $('save-record'),
    saveStatus: $('save-status'), recordName: $('record-name'), recordContent: $('record-content'), recordBytes: $('record-bytes'),
    partLabel: $('part-label'), partMeaning: $('part-meaning'), partQuote: $('part-quote'), partSource: $('part-source'), partLocal: $('part-local'),
    request: $('request-text'), copy: $('copy-request'), copyStatus: $('copy-status'), mapText: $('map-text'),
    shotLight: $('shot-light'), shotFail: $('shot-fail'), note: $('sample-note'),
  };
  const caseButtons = all('button[data-case]'), stageButtons = all('button[data-stage]');
  const partButtons = all('button[data-part]'), themeButtons = all('button[data-theme]');
  const reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : {matches: false};
  let initial = typeof window.__quartzInitialHash === 'string' ? window.__quartzInitialHash : '';
  if (!initial) { try { initial = decodeURIComponent(location.hash.slice(1)); } catch { initial = ''; } }
  const st = {
    bundle: null, gen: 0, ctrl: null, caseId: CASES.includes(initial) ? initial : 'completed', stepId: null,
    p: 3, sel: 1, regrow: 1, part: 'instructions', theme: 'light', stage: null, tween: null, pulse: null, raf: 0, cssW: 0,
  };
  const hadHash = CASES.includes(initial);

  const setText = (node, text) => { if (node) node.textContent = text; };
  const setStatus = text => setText(ui.status, text);

  function setControls(on) {
    for (const el of [...caseButtons, ...stageButtons, ...partButtons, ui.replay, ui.stepSelect, ui.save, ui.copy]) if (el) el.disabled = !on;
    if (on) { ui.openDesk.removeAttribute('aria-disabled'); updateDesk(); }
    else { ui.openDesk.setAttribute('aria-disabled', 'true'); ui.openDesk.removeAttribute('href'); }
  }

  function clearData() {
    for (const n of [ui.caseMeta, ui.stepName, ui.stepStatus, ui.stepNote, ui.saveStatus, ui.recordName, ui.recordContent, ui.partLabel,
      ui.partMeaning, ui.partQuote, ui.partLocal, ui.copyStatus, ui.note]) setText(n, '');
    for (const n of [ui.stepFacts, ui.stepInput, ui.stepOutput, ui.mapText, ui.recordBytes, ui.partSource]) if (n) n.replaceChildren();
    if (ui.stepSelect) ui.stepSelect.replaceChildren();
    if (ui.request) ui.request.value = '';
    for (const img of [ui.shotLight, ui.shotFail]) if (img) { img.removeAttribute('src'); img.hidden = true; }
    for (const id of CASES) {
      const art = $(id);
      if (art) for (const f of art.querySelectorAll('[data-f]')) { f.textContent = ''; if (f.tagName === 'A') f.removeAttribute('href'); }
    }
    ui.canvas.setAttribute('aria-label', 'Quartzのつながり図（資料を確かめるまで表示しません）');
  }

  // ---- drawing on the page ----
  function resize() {
    const cssW = Math.max(1, Math.round(ui.figure.clientWidth));
    const geo = pageGeometry(cssW);
    ui.canvas.style.height = `${geo.cssH}px`;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const w = Math.round(cssW * dpr), h = Math.round(geo.cssH * dpr);
    if (ui.canvas.width !== w || ui.canvas.height !== h) { ui.canvas.width = w; ui.canvas.height = h; }
    st.cssW = cssW;
    draw();
  }

  function draw() {
    const ctx = ui.canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ui.canvas.width, ui.canvas.height);
    if (!st.bundle || root.dataset.state !== 'ready') return;
    const geo = pageGeometry(st.cssW || ui.figure.clientWidth);
    const k = (ui.canvas.width / Math.max(1, st.cssW)) * geo.scale;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    const L = makeLayout(geo.orient, geo.W, geo.H);
    const playing = !!st.tween;
    drawMap(ctx, L, {
      bundle: st.bundle, caseId: st.caseId, stepId: st.stepId, theme: st.theme, p: st.p, sel: st.sel, regrow: st.regrow,
      part: st.part, emph: playing ? STAGE_GROUPS[Math.min(2, Math.floor(st.p))] : null,
    });
  }

  function frame(now) {
    st.raf = 0;
    let more = false;
    if (st.tween) {
      const t = st.tween, k = Math.min(1, (now - t.t0) / t.ms);
      st.p = t.from + (t.to - t.from) * k;
      if (k < 1) more = true; else st.tween = null;
      showStage(Math.min(2, Math.floor(Math.max(0, st.p - 1e-6))));
    }
    if (st.pulse) {
      const k = Math.min(1, (now - st.pulse.t0) / st.pulse.ms);
      st.sel = k;
      st.regrow = st.pulse.regrow ? seg(k, 0, 0.3) : 1;
      if (k < 1) more = true; else { st.pulse = null; st.sel = 1; st.regrow = 1; }
    }
    draw();
    if (more) st.raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (!st.raf) st.raf = requestAnimationFrame(frame); };

  function play(from, to) {
    if (reduce.matches) { st.tween = null; st.p = to; showStage(Math.min(2, Math.ceil(to) - 1)); draw(); return; }
    st.tween = {from, to, ms: (to - from) * STAGE_MS, t0: performance.now()};
    st.p = from;
    kick();
  }

  function pulse(regrow) {
    if (reduce.matches || st.p < 2) { st.sel = 1; st.regrow = 1; draw(); return; }
    st.pulse = {t0: performance.now(), ms: 1300, regrow};
    st.sel = 0;
    kick();
  }

  function showStage(i) {
    if (st.stage === i) return;
    st.stage = i;
    stageButtons.forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.stage) === i)));
    setText(ui.phaseNote, STAGE_NOTES[i] || '');
  }

  // ---- data into words ----
  const cur = () => st.bundle.cases[st.caseId];
  const curStep = () => cur().fixture.steps.find(s => s.id === st.stepId);

  function updateDesk() {
    if (!st.bundle) return;
    ui.openDesk.href = `desk.html${st.theme === 'dark' ? '?theme=dark' : ''}#${st.caseId}`;
  }

  function dl(node, rows) {
    node.replaceChildren();
    for (const [k, v, cls] of rows) {
      const dt = document.createElement('dt'), dd = document.createElement('dd');
      dt.textContent = k;
      dd.textContent = v;
      if (cls) dd.className = cls;
      node.append(dt, dd);
    }
  }

  function ioRows(step, side) {
    const obj = step[side];
    if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return [['値', brief(obj)]];
    return keysFor(obj, side).map(k => {
      const v = obj[k], tr = troubleOf(step, side, k);
      const text = typeof v === 'string' ? v : Array.isArray(v) && v.every(x => typeof x === 'string') ? v.join('、') : brief(v);
      return [k, text, tr ? `is-${tr}` : ''];
    });
  }

  function renderStep() {
    const kase = cur(), run = kase.fixture, step = curStep(), time = stepTime(run, step);
    setText(ui.stepName, `${step.label}（${step.id}）`);
    ui.stepStatus.textContent = STATUS_WORD[step.status];
    ui.stepStatus.className = `status is-${step.status}`;
    setText(ui.stepNote, step.note);
    dl(ui.stepFacts, [
      ['種類', `${TYPE_WORD[step.type]}（fixtureの分類）`],
      ['ツール名', step.tool ?? 'なし'],
      ['開始', `${time.start}（架空の時刻）`],
      [time.waited ? '待った時間' : '所要', `${time.took}（架空の時刻）`],
    ]);
    dl(ui.stepInput, ioRows(step, 'input'));
    dl(ui.stepOutput, ioRows(step, 'output'));
    if (ui.stepSelect.value !== step.id) ui.stepSelect.value = step.id;
    renderMapText();
  }

  function renderMapText() {
    const kase = cur(), run = kase.fixture, step = curStep();
    const io = side => { const k = keysFor(step[side], side, 1)[0]; return k ? `${k}: ${brief(step[side][k])}` : brief(step[side]); };
    const items = [
      '指示書 SKILL.md：8手順と規則（部品から作る、body.quartzの範囲、役割トークン、状態は言葉、キー操作、白黒、暖色は警告と失敗だけ）。',
      '依頼文と指示書を同じ作者AI（Opus 5.5、1体）が読み、Reactの構成・日本語の文言・3件のfixtureを書きました。手順7と8の確認は制作担当の工程です。',
      '制作担当（別工程）：固定版のファイルを手で配置し（shadcn CLIは未実行）、元の画面にlint・build・390/1280pxの確認をしました。',
      '範囲 body.quartz ＋ QuartzPortalProvider。Portal枠はありますが、この作例でポップアップは使っていません。',
      `役割トークン（テーマ ${st.theme}、App.theme の明示切替）→ 8部品：${COMPONENTS.join('、')}。`,
      `fixture「${kase.label}」（静的サンプル、予定${run.plan.length}段のうち${run.steps.length}段、架空の時刻 ${seconds(run.now_ms)}）→ App.sampleId → toSpans(run) → Timeline。`,
      `選んだ段 ${step.id}「${step.label}」→ onSpanClick → App.openSteps → 状態「${STATUS_WORD[step.status]}」、入力 ${io('input')}、出力 ${io('output')}。表示するだけで、AIやツールは動きません。`,
      `サンプルJSON（${kase.file}、${kase.byteLength.toLocaleString('ja-JP')}バイト）→ ブラウザーへ渡す（保存完了は確かめません）。desk.html で実物の画面を操作できます。`,
    ];
    ui.mapText.replaceChildren(...items.map(t => { const li = document.createElement('li'); li.textContent = t; return li; }));
    ui.canvas.setAttribute('aria-label', `Quartzのつながり図。事例「${kase.label}」、選んだ段 ${step.id}。図の内容は下の一覧「図の読み方」で文章でも読めます。`);
  }

  function renderCase() {
    const kase = cur(), run = kase.fixture;
    caseButtons.forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.case === kase.id)));
    ui.caseMeta.replaceChildren(...[
      CASE_WORD[kase.id], `予定${run.plan.length}段のうち${run.steps.length}段`, `架空の時刻 ${seconds(run.now_ms)}`, '静的サンプル',
    ].map(t => { const s = document.createElement('span'); s.textContent = t; return s; }));
    ui.stepSelect.replaceChildren(...run.steps.map(s => {
      const o = document.createElement('option');
      o.value = s.id;
      o.textContent = `${s.id}　${s.label}（${STATUS_WORD[s.status]}）`;
      return o;
    }));
    setText(ui.recordName, kase.file);
    setText(ui.recordContent, kase.text);
    setText(ui.saveStatus, '');
    updateDesk();
    renderStep();
  }

  function chooseCase(id, {pulseIt = true, writeHash = true} = {}) {
    if (!st.bundle || !CASES.includes(id)) return;
    st.caseId = id;
    st.stepId = cur().fixture.focus_step;
    if (writeHash) history.replaceState(null, '', `${location.pathname}${location.search}#${id}`);
    renderCase();
    if (pulseIt) pulse(true); else draw();
  }

  function choosePart(id) {
    const part = st.bundle && st.bundle.parts.find(x => x.id === id);
    if (!part) return;
    st.part = id;
    partButtons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.part === id)));
    setText(ui.partLabel, part.label);
    setText(ui.partMeaning, part.meaning);
    setText(ui.partQuote, part.quote);
    ui.partSource.replaceChildren();
    if (/^https:\/\//.test(part.source_url)) {
      const a = document.createElement('a');
      a.href = part.source_url;
      a.textContent = `原典 ${part.source_path.replace('vendor/quartz/', 'systems/quartz/')} ${part.line_start}行目（固定版 ${SOURCE_COMMIT.slice(0, 7)}）`;
      ui.partSource.append(a);
    } else {
      ui.partSource.textContent = `この作例の元のReact画面 ${part.source_path} ${part.line_start}行目`;
    }
    setText(ui.partLocal, `同梱ファイル ${part.source_path} の${part.line_start}行目と一字ずつ照合済み`);
    draw();
  }

  function setTheme(t) {
    st.theme = t === 'dark' ? 'dark' : 'light';
    root.dataset.theme = st.theme;
    themeButtons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.theme === st.theme)));
    updateDesk();
    if (st.bundle) renderMapText();
    draw();
  }

  function fillStatic() {
    const b = st.bundle;
    ui.request.value = b.request;
    setText(ui.note, b.note);
    ui.recordBytes.replaceChildren(...CASES.map(id => {
      const c = b.cases[id], li = document.createElement('li');
      li.textContent = `${c.file}　${c.byteLength.toLocaleString('ja-JP')}バイト（${CASE_WORD[id]}）`;
      return li;
    }));
    for (const id of CASES) {
      const art = $(id), c = b.cases[id], run = c.fixture;
      if (!art) continue;
      const f = name => art.querySelector(`[data-f="${name}"]`);
      setText(f('label'), `${c.label}（静的サンプル）`);
      setText(f('input'), c.input);
      setText(f('output'), c.output);
      setText(f('facts'), `予定${run.plan.length}段のうち${run.steps.length}段、注目する段 ${run.focus_step}、架空の時刻 ${seconds(run.now_ms)}、${c.file} ${c.byteLength.toLocaleString('ja-JP')}バイト`);
      const a = f('desk');
      if (a) { a.textContent = `「${CASE_WORD[id]}」を実物の画面で開く`; a.href = `desk.html#${id}`; }
    }
    if (ui.shotLight) { ui.shotLight.src = b.images.light.url; ui.shotLight.hidden = false; }
    if (ui.shotFail) { ui.shotFail.src = b.images.fail.url; ui.shotFail.hidden = false; }
  }

  // ---- loading: verify all 30 files before any control works ----
  function fail(err) {
    root.dataset.state = 'error';
    const msg = err instanceof LoadError ? err.message : '資料を読み込めませんでした。';
    setStatus(`${msg} 図と操作を止めています。`);
    if (st.bundle) { st.bundle.dispose(); st.bundle = null; }
    st.tween = null;
    st.pulse = null;
    clearData();
    setControls(false);
    ui.retry.hidden = false;
    ui.retry.disabled = false;
    draw();
  }

  function load() {
    const gen = ++st.gen;
    if (st.ctrl) st.ctrl.abort();
    const ctrl = new AbortController();
    st.ctrl = ctrl;
    if (st.bundle) { st.bundle.dispose(); st.bundle = null; }
    root.dataset.state = 'loading';
    clearData();
    setControls(false);
    ui.retry.hidden = true;
    setStatus('固定版の資料を確かめています（0/30）');
    draw();
    loadBundle({
      signal: ctrl.signal,
      onProgress(done, total) {
        if (gen === st.gen && root.dataset.state === 'loading') setStatus(`固定版の資料を確かめています（${done}/${total}）`);
      },
    }).then(bundle => {
      if (gen !== st.gen) { bundle.dispose(); return; }
      st.bundle = bundle;
      root.dataset.state = 'ready';
      setStatus('固定版の資料30件を、大きさとSHA-256で確かめました。');
      setControls(true);
      fillStatic();
      chooseCase(st.caseId, {pulseIt: false, writeHash: hadHash});
      choosePart(st.part);
      st.stage = null;
      showStage(0);
      play(0, 3);
    }).catch(err => {
      if (gen !== st.gen) return;
      ctrl.abort();
      fail(err);
    });
  }

  // ---- events ----
  caseButtons.forEach(b => b.addEventListener('click', () => chooseCase(b.dataset.case)));
  stageButtons.forEach(b => b.addEventListener('click', () => {
    const i = Number(b.dataset.stage);
    st.stage = null;
    showStage(i);
    play(i, i + 1);
  }));
  ui.replay.addEventListener('click', () => { st.stage = null; showStage(0); play(0, 3); });
  ui.stepSelect.addEventListener('change', () => {
    if (!st.bundle) return;
    st.stepId = ui.stepSelect.value;
    renderStep();
    pulse(false);
  });
  partButtons.forEach(b => b.addEventListener('click', () => choosePart(b.dataset.part)));
  themeButtons.forEach(b => b.addEventListener('click', () => setTheme(b.dataset.theme)));
  ui.retry.addEventListener('click', load);
  ui.save.addEventListener('click', () => {
    if (!st.bundle || root.dataset.state !== 'ready') return;
    const kase = cur();
    // The verified file bytes: JSON.stringify(fixture, null, 2) + '\n', the whole case regardless of the chosen step.
    const url = URL.createObjectURL(new Blob([kase.bytes], {type: 'application/json'}));
    const a = document.createElement('a');
    a.href = url;
    a.download = kase.file;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    setText(ui.saveStatus, `${kase.file}（${kase.byteLength.toLocaleString('ja-JP')}バイト、事例全体）をブラウザーへ渡しました。保存先に書き込まれたかは、このページからは確かめられません。`);
  });
  ui.copy.addEventListener('click', async () => {
    if (!st.bundle) return;
    try {
      await navigator.clipboard.writeText(st.bundle.request);
      setText(ui.copyStatus, 'コピーしました。');
    } catch {
      ui.request.focus();
      ui.request.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      setText(ui.copyStatus, ok ? 'コピーしました。' : 'コピーできませんでした。文を選んでコピーしてください。');
    }
  });
  ui.openDesk.addEventListener('click', e => { if (ui.openDesk.getAttribute('aria-disabled') === 'true') e.preventDefault(); });
  window.addEventListener('hashchange', () => {
    let id = '';
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { id = ''; }
    if (CASES.includes(id) && id !== st.caseId) chooseCase(id, {writeHash: false});
  });
  if (typeof ResizeObserver === 'function') {
    new ResizeObserver(() => { if (Math.round(ui.figure.clientWidth) !== st.cssW) resize(); }).observe(ui.figure);
  } else {
    window.addEventListener('resize', resize);
  }
  if (reduce.addEventListener) reduce.addEventListener('change', () => { if (reduce.matches && st.tween) { st.p = st.tween.to; st.tween = null; draw(); } });

  setTheme('light');
  resize();
  load();
}
