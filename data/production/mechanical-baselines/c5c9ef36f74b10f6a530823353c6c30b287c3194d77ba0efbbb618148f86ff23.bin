/* ACE-Step V1 example: shared loader, scene and drawer for the page and the silent film.
   八百万図AIツールボックス, MIT. Upstream ACE-Step files keep their Apache-2.0 notices. */

export const MANIFEST_SHA256 = '7858cef475daefb30ae1a4d0465fdbd7523705f842767c0dec7cecadfade8662';
export const ASSET_COUNT = 25;
export const FACTS_SCHEMA = 'ace-step-actual-facts@1';
export const SOURCE_COMMIT = '1bee4c9f5b43e30995f8d4d33b3919197ce1bd68';
export const MODEL_REVISION = '82cd0d7b6322bd28cd4e830fe675ddb6180ce36c';
export const PART_IDS = ['pipeline', 'text', 'noise', 'flow', 'decode', 'wav'];
export const VIEW_IDS = ['whole', 'begin', 'end'];
export const FILM = {duration: 32, fps: 30, width: 720, height: 1280, posterTime: 31, freezeAt: 30};

// Asset URLs resolve from this module, so the page (./) and the editor (video/) read the same files.
const ROOT = new URL('./', import.meta.url);
const WAVE_BINS = 320;
const K = 24;

export class LoadFailure extends Error {
  constructor(message, detail) { super(message); this.name = 'LoadFailure'; this.detail = detail || ''; }
}
const fail = (message, detail) => { throw new LoadFailure(message, detail); };

/* ---------- loading and verification ---------- */

const hex = buf => Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('');
const sha256 = async buf => hex(await crypto.subtle.digest('SHA-256', buf));
const safePath = p => typeof p === 'string' && /^[A-Za-z0-9._\-/]+$/.test(p) && !p.startsWith('/') &&
  !p.split('/').some(s => s === '' || s === '.' || s === '..');

function same(a, b) {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every(k => Object.prototype.hasOwnProperty.call(b, k) && same(a[k], b[k]));
}

async function fetchBytes(path) {
  let res;
  try { res = await fetch(new URL(path, ROOT), {cache: 'no-store'}); }
  catch (_) { fail('ファイルを取得できませんでした', path); }
  if (!res.ok) fail('HTTP ' + res.status + 'で取得できませんでした', path);
  return res.arrayBuffer();
}

function text(buf, path) {
  try { return new TextDecoder('utf-8', {fatal: true}).decode(buf); }
  catch (_) { fail('UTF-8として読めません', path); }
}
function json(buf, path) {
  const value = text(buf, path);
  try { return JSON.parse(value); } catch (_) { fail('JSONとして読めません', path); }
}

function parseWav(buf, path) {
  const v = new DataView(buf);
  const tag = o => String.fromCharCode(v.getUint8(o), v.getUint8(o + 1), v.getUint8(o + 2), v.getUint8(o + 3));
  if (buf.byteLength < 44 || tag(0) !== 'RIFF' || tag(8) !== 'WAVE') fail('WAVの見出しが読めません', path);
  if (v.getUint32(4, true) + 8 !== buf.byteLength) fail('WAVの長さの記録がファイルと合いません', path);
  let o = 12, fmt = null, data = null;
  while (o + 8 <= buf.byteLength) {
    const id = tag(o), size = v.getUint32(o + 4, true), body = o + 8;
    if (body + size > buf.byteLength) fail('WAVのチャンクが途中で切れています', path);
    if (id === 'fmt ') {
      if (size < 16) fail('WAVのfmtが短すぎます', path);
      let code = v.getUint16(body, true);
      if (code === 0xFFFE && size >= 40) code = v.getUint16(body + 24, true);
      fmt = {code, channels: v.getUint16(body + 2, true), sampleRate: v.getUint32(body + 4, true),
        blockAlign: v.getUint16(body + 12, true), bits: v.getUint16(body + 14, true)};
    } else if (id === 'data') data = {offset: body, size};
    o = body + size + (size & 1);
  }
  if (!fmt || !data) fail('WAVにfmtかdataがありません', path);
  if (fmt.code !== 3 || fmt.bits !== 32) fail('32-bit浮動小数のWAVではありません', path);
  if (fmt.blockAlign !== fmt.channels * 4 || data.size % fmt.blockAlign) fail('WAVのフレームの大きさが合いません', path);
  return {format: 'WAV', subtype: 'FLOAT', ...fmt, frames: data.size / fmt.blockAlign, dataBytes: data.size};
}

function check(ok, message, detail) { if (!ok) fail(message, detail); }

/** Fetch the manifest (no-store), verify its fixed SHA-256, then every asset's bytes and hash and the facts. */
export async function loadData() {
  if (!globalThis.crypto || !crypto.subtle) fail('この環境ではSHA-256を確かめられません', 'https か localhost で開いてください');
  const manifestPath = 'concept/manifest.json';
  const manifestBytes = await fetchBytes(manifestPath);
  check(await sha256(manifestBytes) === MANIFEST_SHA256, '素材一覧のSHA-256が固定値と合いません', manifestPath);
  const manifest = json(manifestBytes, manifestPath);
  check(manifest && manifest.schema === 'ace-step-assets@1' && Array.isArray(manifest.assets) && manifest.assets.length === ASSET_COUNT,
    '素材一覧の形が違います', manifestPath);
  const seen = new Set();
  for (const a of manifest.assets) {
    check(a && safePath(a.path) && !seen.has(a.path) && Number.isInteger(a.bytes) && a.bytes >= 0 && /^[0-9a-f]{64}$/.test(a.sha256),
      '素材一覧の項目が不正です', String(a && a.path));
    seen.add(a.path);
  }
  const files = new Map();
  await Promise.all(manifest.assets.map(async a => {
    const buf = await fetchBytes(a.path);
    check(buf.byteLength === a.bytes, '大きさが一覧と合いません', a.path + '（' + buf.byteLength + '／' + a.bytes + 'バイト）');
    check(await sha256(buf) === a.sha256, 'SHA-256が一覧と合いません', a.path);
    files.set(a.path, buf);
  }));
  const need = p => { check(files.has(p), '一覧に必要なファイルがありません', p); return files.get(p); };
  const entry = p => manifest.assets.find(a => a.path === p);

  const facts = json(need('concept/facts.json'), 'concept/facts.json');
  check(facts.schema === FACTS_SCHEMA && facts.case_id === 'ace-step-example' && facts.catalog_id === 'resource-ace-step',
    '事実ファイルの種類が違います', 'concept/facts.json');
  const id = facts.identity || {};
  check(id.source_commit === SOURCE_COMMIT && id.model_revision === MODEL_REVISION && id.model_repository === 'ACE-Step/ACE-Step-v1-3.5B',
    '固定版の原典かモデルが違います', 'concept/facts.json');

  // Six editorial parts: every excerpt must equal the exact line range of the distributed source file.
  check(Array.isArray(facts.parts) && facts.parts.length === 6 && facts.parts.every((p, i) => p && p.id === PART_IDS[i]),
    '6つの部品の並びが違います', 'concept/facts.json');
  const sourceLines = new Map();
  for (const part of facts.parts) {
    const s = part.source || {};
    check(typeof s.path === 'string' && s.path.startsWith('vendor/ace-step/') && files.has(s.path), '引用元が一覧にありません', part.id);
    if (!sourceLines.has(s.path)) sourceLines.set(s.path, text(files.get(s.path), s.path).split(/\r?\n/));
    const lines = sourceLines.get(s.path);
    check(Number.isInteger(s.start_line) && Number.isInteger(s.end_line) && s.start_line >= 1 && s.end_line >= s.start_line && s.end_line <= lines.length,
      '引用の行番号が範囲外です', s.path);
    check(lines.slice(s.start_line - 1, s.end_line).join('\n') === part.excerpt, '引用が原典の行と一致しません', s.path + ' L' + s.start_line + '–' + s.end_line);
    const url = 'https://github.com/ace-step/ACE-Step/blob/' + SOURCE_COMMIT + '/' + s.path.slice('vendor/ace-step/'.length) + '#L' + s.start_line;
    check(s.url === url, '引用のリンクが固定版を指していません', part.id);
  }

  // One job, one call.
  const out = facts.actual_output || {};
  const api = (facts.input || {}).api_params || {};
  check(out.id === 'cozy-puzzle-bgm-20s' && api.task === 'text2music' && api.batch_size === 1 && api.lyrics === '' &&
    api.audio_duration === 20 && facts.input.requested_duration_s === 20 && facts.input.reference_audio === false,
    '入力の記録が想定と違います', 'concept/facts.json');
  const jobs = json(need('inputs/jobs.json'), 'inputs/jobs.json');
  check(jobs.schema === 'studio-yebisu.ace-step-example.jobs/1' && Array.isArray(jobs.jobs) && jobs.jobs.length === 1,
    'ジョブは1件のはずです', 'inputs/jobs.json');
  const job = jobs.jobs[0];
  check(job.job_id === out.id && same(job.api_params, api) && job.labels && job.labels.fictional_request === facts.input.request &&
    jobs.source.commit === SOURCE_COMMIT && jobs.model.revision === MODEL_REVISION, 'ジョブが事実ファイルと一致しません', 'inputs/jobs.json');

  const ex = facts.execution || {};
  const counts = ex.method_boundary_counts || {};
  check(ex.pipeline_call_count === 1 && ex.load_checkpoint_call_count === 1 &&
    ['get_text_embeddings', 'text2music_diffusion_process', 'latents2audio', 'save_wav_file'].every(m => counts[m] === 1),
    '呼び出しの回数が1回ではありません', 'concept/facts.json');

  // The exact WAV and the source's own parameter JSON.
  for (const [path, bytes, hash] of [[out.audio, out.wav_bytes, out.wav_sha256], [out.params, out.params_bytes, out.params_sha256]]) {
    const e = entry(path);
    check(e && e.bytes === bytes && e.sha256 === hash, '出力ファイルが一覧と合いません', String(path));
  }
  const wavBytes = need(out.audio);
  const wav = parseWav(wavBytes, out.audio);
  const m = out.measurements || {};
  const c = m.container || {};
  check(wav.channels === c.channels && wav.sampleRate === c.samplerate && wav.frames === c.frames && c.format === 'WAV' && c.subtype === 'FLOAT',
    'WAVの形式が測定の記録と合いません', out.audio);
  const duration = wav.frames / wav.sampleRate;
  check(Math.abs(duration - m.duration.actual_duration_s) <= 5e-7 && m.duration.requested_audio_duration_s === 20 &&
    Math.abs(duration - 20 - m.duration.actual_minus_requested_s) <= 1e-6, 'WAVの長さが記録と合いません', out.audio);

  const paramsBytes = need(out.params);
  const params = json(paramsBytes, out.params);
  check(params.prompt === api.prompt && params.lyrics === '' && params.audio_duration === 20 && params.infer_step === api.infer_step &&
    same(params.actual_seeds, [Number(api.manual_seeds)]) && params.audio_path === out.native_save_path, '原典の設定JSONが入力と合いません', out.params);
  const returnPublic = json(need(out.return), out.return);
  check(Array.isArray(returnPublic) && returnPublic.length === 2 && returnPublic[0] === out.native_save_path && same(returnPublic[1], params),
    '戻り値の写しが設定JSONと合いません', out.return);

  const executionBytes = need(out.execution);
  const execution = json(executionBytes, out.execution);
  check(execution.schema === 'studio-yebisu.ace-step-example.execution-summary/1' && execution.status === 'succeeded' &&
    execution.job_id === out.id && execution.execution.pipeline_call_count === 1 && execution.execution.load_checkpoint_call_count === 1 &&
    execution.outputs.source_wav.sha256 === out.wav_sha256 && execution.outputs.source_input_params.sha256 === out.params_sha256 &&
    execution.outputs.audio_postprocessing_by_operator === false && execution.listening_review.status === 'not_performed' &&
    execution.runtime.python === ex.python && execution.runtime.packages.torch === ex.torch && same(execution.request.api_params, api),
    '実行の記録が事実ファイルと合いません', out.execution);

  // Audition views are seek hints into the same whole file.
  const views = facts.audition_views;
  check(Array.isArray(views) && views.length === 3 && views.every((v, i) => v.id === VIEW_IDS[i]), '試聴の区間が違います', 'concept/facts.json');
  const close = (a, b) => Math.abs(a - b) <= 1e-6;
  check(close(views[0].start_s, 0) && close(views[0].end_s, duration) && close(views[1].start_s, 0) && close(views[1].end_s, 3) &&
    close(views[2].start_s, duration - 3) && close(views[2].end_s, duration), '試聴の区間がWAVの長さと合いません', 'concept/facts.json');

  // Real envelope of the saved WAV (min/max/RMS per window), not a synthetic curve.
  const waveforms = json(need('concept/waveforms.json'), 'concept/waveforms.json');
  check(waveforms.schema === 'ace-step-waveform@1' && waveforms.file === out.audio && waveforms.sha256 === out.wav_sha256 &&
    waveforms.frames === wav.frames && waveforms.sample_rate === wav.sampleRate && waveforms.channels === wav.channels &&
    Array.isArray(waveforms.bins) && waveforms.bins.length === WAVE_BINS, '波形の包絡がWAVと合いません', 'concept/waveforms.json');
  let next = 0;
  const finite = (arr, lim) => Array.isArray(arr) && arr.length === 2 && arr.every(x => Number.isFinite(x) && Math.abs(x) <= lim);
  for (const b of waveforms.bins) {
    check(b.start_frame === next && b.end_frame > b.start_frame && finite(b.min, 1) && finite(b.max, 1) && finite(b.rms, 1) &&
      b.min[0] <= b.max[0] && b.min[1] <= b.max[1], '波形の包絡の区間が不正です', 'concept/waveforms.json');
    next = b.end_frame;
  }
  check(next === wav.frames, '波形の包絡がWAV全体を覆っていません', 'concept/waveforms.json');
  const envelope = Array.from({length: K}, (_, i) => {
    let peak = 0;
    for (let j = Math.floor(i * WAVE_BINS / K); j < Math.floor((i + 1) * WAVE_BINS / K); j++) {
      const b = waveforms.bins[j];
      peak = Math.max(peak, -b.min[0], -b.min[1], b.max[0], b.max[1]);
    }
    return peak;
  });

  return {
    manifestSha: MANIFEST_SHA256,
    assets: manifest.assets.map(a => ({path: a.path, bytes: a.bytes, sha256: a.sha256})),
    facts, jobs, job, params, paramsBytes, returnPublic, execution, executionBytes, waveforms, envelope, views,
    wav: {...wav, bytes: wavBytes, duration},
    latentShape: findRecord(facts, 'text2music_diffusion_process').result.tensor_shape
  };
}

function findRecord(facts, method) {
  const r = facts.execution.method_boundary_records.find(x => x.method === method);
  check(r, '境界の記録がありません', method);
  return r;
}

/* ---------- scenes (closed-form in t; geometry frozen from 30 s) ---------- */

export const SCENES = [
  {id: 'identity', start: 0, end: 4, message: 'ACE-Step V1は、手元のPythonで動く音楽生成モデル', focus: []},
  {id: 'author', start: 4, end: 8, message: 'READMEと架空の依頼を、作者AI 1体が実装と入力に', focus: ['readme', 'request', 'author']},
  {id: 'operator', start: 8, end: 12, message: '制作担当が、原典のPython APIを1回だけ実行', focus: ['author', 'operator']},
  {id: 'inputs', start: 12, end: 16.5, message: '説明文はUMT5の条件へ。20秒とseedは初期の潜在へ', focus: ['operator', 'text', 'noise', 'lyric']},
  {id: 'flow', start: 16.5, end: 21, message: 'Transformerが潜在を整える（27stepは設定値）', focus: ['text', 'noise', 'lyric', 'flow']},
  {id: 'decode', start: 21, end: 26, message: 'DCAE→メル→vocoderで左右の波形、原典内部で48kHzへ', focus: ['latent', 'decode', 'wav']},
  {id: 'result', start: 26, end: 32, message: 'WAVと設定JSONが返る。数値は別に測定、人の聴取は未実施', focus: ['wav', 'use', 'strip']}
];

// Page stages: 何か / 渡す / 返る are moments of the same continuous scene.
export const STAGE_TIMES = [2, 14.6, 30];
export const STAGE_FOCUS = [[], ['author', 'operator', 'text', 'noise', 'lyric'], ['flow', 'latent', 'decode', 'wav', 'use', 'strip']];

const clamp01 = x => Math.max(0, Math.min(1, x));
const smooth = x => { x = clamp01(x); return x * x * (3 - 2 * x); };
const seg = (t, a, b) => smooth((t - a) / (b - a));
const mv = (from, to, p, fromSlot = 'full', toSlot = 'full') => ({from, to, p, fromSlot, toSlot});
const at = node => mv(node, node, 0);

function pathA(g) {
  if (g < 4.6) return at('request');
  if (g < 6.2) return mv('request', 'author', seg(g, 4.6, 6.2));
  if (g < 8.0) return at('author');
  if (g < 9.6) return mv('author', 'operator', seg(g, 8.0, 9.6));
  if (g < 12.0) return at('operator');
  if (g < 13.4) return mv('operator', 'text', seg(g, 12.0, 13.4));
  if (g < 14.8) return at('text');
  return mv('text', 'flow', seg(g, 14.8, 16.4));
}
function pathB(g) {
  if (g < 13.4) return mv('operator', 'noise', seg(g, 12.0, 13.4));
  if (g < 14.8) return at('noise');
  if (g < 16.4) return mv('noise', 'flow', seg(g, 14.8, 16.4));
  if (g < 21.0) return at('flow');
  if (g < 22.2) return mv('flow', 'latent', seg(g, 21.0, 22.2));
  if (g < 22.6) return at('latent');
  if (g < 23.8) return mv('latent', 'decode', seg(g, 22.6, 23.8));
  if (g < 25.4) return at('decode');
  if (g < 26.4) return mv('decode', 'wav', seg(g, 25.4, 26.4));
  return mv('wav', 'wav', seg(g, 26.6, 27.4), 'full', 'left');
}
function formB(g) {
  if (g < 13.5) return ['bar', 'bar', 0];
  if (g < 16.8) return ['bar', 'grid', seg(g, 13.5, 14.5)];
  if (g < 22.9) return ['grid', 'smooth', seg(g, 16.8, 20.6)];
  if (g < 24.45) return ['smooth', 'mel', seg(g, 23.0, 24.4)];
  return ['mel', 'wave', seg(g, 24.5, 25.3)];
}

/** Complete state at time t. Same t always gives the same state, whatever was drawn before. */
export function sceneAt(t) {
  const time = Math.max(0, Math.min(FILM.duration, Number(t) || 0));
  const g = Math.min(time, FILM.freezeAt);
  let index = SCENES.findIndex(s => time >= s.start && time < s.end);
  if (index < 0) index = SCENES.length - 1;
  const fa = g < 9 ? ['doc', 'code', seg(g, 6.4, 7.4)] : ['code', 'tokens', seg(g, 12.3, 13.6)];
  const carriers = [
    {id: 'readme', ...(g < 4.6 ? at('readme') : mv('readme', 'author', seg(g, 4.6, 6.2))), form: ['doc', 'doc', 0], alpha: 1 - seg(g, 6.0, 6.6)},
    {id: 'request', ...pathA(g), form: fa, alpha: 1 - seg(g, 16.0, 16.6)},
    {id: 'lyric', ...(g < 14.8 ? at('lyric') : mv('lyric', 'flow', seg(g, 14.8, 16.4))), form: ['empty', 'empty', 0], alpha: 1 - seg(g, 16.0, 16.6)},
    {id: 'latent', ...pathB(g), form: formB(g), alpha: seg(g, 11.8, 12.4)},
    {id: 'json', ...mv('wav', 'wav', 0, 'right', 'right'), form: ['json', 'json', 0], alpha: seg(g, 26.6, 27.4)},
    {id: 'out', ...mv('wav', 'use', seg(g, 27.6, 28.9), 'left', 'afterPlay'), form: ['wave', 'wave', 0], alpha: seg(g, 27.6, 27.9)}
  ];
  return {
    time, g, index, scene: SCENES[index], focus: SCENES[index].focus, carriers,
    trace: {p: seg(g, 0.6, 3.6), alpha: 1 - seg(g, 3.8, 4.4)},
    play: seg(g, 28.6, 29.2), strip: seg(g, 26.4, 27.6), checks: seg(g, 27.8, 28.8)
  };
}

/* ---------- layout ---------- */

export const NODES = [
  {id: 'readme', role: 'source', lines: ['README', '原典のAPI']},
  {id: 'author', role: 'author', lines: ['作者AI 1体', '実装と入力']},
  {id: 'request', role: 'author', lines: ['架空の依頼', '20秒のBGM']},
  {id: 'operator', role: 'model', part: 'pipeline', lines: ['制作担当', 'Pythonで1回']},
  {id: 'text', role: 'model', part: 'text', lines: ['説明文', '→UMT5条件']},
  {id: 'noise', role: 'model', part: 'noise', lines: ['20秒＋seed', '→初期潜在']},
  {id: 'lyric', role: 'model', lines: ['歌詞は空', 'ID/mask 0']},
  {id: 'flow', role: 'model', part: 'flow', lines: ['Transformer', '27step設定']},
  {id: 'latent', role: 'model', lines: ['圧縮潜在', '']},
  {id: 'decode', role: 'model', part: 'decode', lines: ['DCAE→メル', '→vocoder']},
  {id: 'wav', role: 'model', part: 'wav', lines: ['WAV＋JSON', '原典が保存']},
  {id: 'use', role: 'browser', lines: ['再生・保存', '聴いて判断']}
];
export const EDGES = [['readme', 'author'], ['request', 'author'], ['author', 'operator'], ['operator', 'text'], ['operator', 'noise'],
  ['text', 'flow'], ['noise', 'flow'], ['lyric', 'flow'], ['flow', 'latent'], ['latent', 'decode'], ['decode', 'wav'], ['wav', 'use']];

// [row, col]. The wide grid is the tall grid transposed, so every relationship keeps its neighbours.
const TALL = {readme: [0, 0], author: [0, 1], request: [0, 2], text: [1, 0], operator: [1, 1], noise: [1, 2],
  latent: [2, 0], flow: [2, 1], lyric: [2, 2], decode: [3, 0], wav: [3, 1], use: [3, 2]};
const U = {nodeW: 6.6, gapX: 0.55, margin: 0.35, label: 2.55, glyph: 1.0, pad: 0.3, gapY: 1.6, stripGap: 0.9, stripLabel: 1.3, stripWave: 2.3};

/** Node rectangles in CSS px. Height is derived from width when `height` is null (page), or fitted (film). */
export function layoutConcept(width, height, opts = {}) {
  const orient = opts.orient || (height != null && width > height ? 'wide' : 'tall');
  const cols = orient === 'tall' ? 3 : 4, rows = orient === 'tall' ? 4 : 3;
  const nodeH0 = U.label + U.glyph + U.pad;
  const unitsH = 2 * U.margin + rows * nodeH0 + (rows - 1) * U.gapY + U.stripGap + U.stripLabel + U.stripWave;
  const unitsW = 2 * U.margin + cols * U.nodeW + (cols - 1) * U.gapX;
  let f = width / unitsW;
  if (height != null) f = Math.min(f, height / unitsH);
  f = Math.max(opts.minFont || 14, Math.min(opts.maxFont || 30, f));
  const H = height != null ? height : Math.ceil(unitsH * f);
  const extra = Math.max(0, H - unitsH * f);
  const glyphExtra = extra * 0.45 / rows, gapExtra = extra * 0.35 / (rows - 1), stripExtra = extra * 0.2;
  const m = U.margin * f;
  const nodeW = Math.max(40, Math.min((width - 2 * m - (cols - 1) * U.gapX * f) / cols, 9.5 * f));
  const gapX = cols > 1 ? (width - 2 * m - cols * nodeW) / (cols - 1) : 0;
  const nodeH = nodeH0 * f + glyphExtra, gapY = U.gapY * f + gapExtra;
  const nodes = {};
  for (const n of NODES) {
    const [r0, c0] = TALL[n.id];
    const [r, c] = orient === 'tall' ? [r0, c0] : [c0, r0];
    const x = m + c * (nodeW + gapX), y = m + r * (nodeH + gapY);
    nodes[n.id] = {...n, x, y, w: nodeW, h: nodeH, cx: x + nodeW / 2, cy: y + nodeH / 2,
      glyph: {x: x + 0.3 * f, y: y + U.label * f, w: nodeW - 0.6 * f, h: U.glyph * f + glyphExtra}};
  }
  const sy = m + rows * nodeH + (rows - 1) * gapY + U.stripGap * f;
  const labelW = 1.3 * f;
  const strip = {x: m, y: sy, w: width - 2 * m, labelY: sy + 0.6 * f,
    wave: {x: m + labelW, y: sy + U.stripLabel * f, w: width - 2 * m - labelW, h: U.stripWave * f + stripExtra}};
  strip.h = strip.wave.y + strip.wave.h - sy;
  return {width, height: H, f, orient, nodes, strip};
}

/* ---------- drawing ---------- */

export const PALETTES = {
  light: {bg: '#f3eee3', paper: '#fbf8f1', ink: '#1e1b16', muted: '#554e43', line: '#8a8172', accent: '#b13c17',
    teal: '#1b6660', warm: '#946009', source: '#eee7d8', author: '#f4e4d0', model: '#e1ece8', browser: '#ebe6da'},
  dark: {bg: '#16140f', paper: '#211e18', ink: '#f2ede2', muted: '#c4bba9', line: '#8f8674', accent: '#f08458',
    teal: '#6cc3b8', warm: '#e0a84a', source: '#29251e', author: '#352a1f', model: '#1c2b28', browser: '#26231d'}
};
export const SANS = '"Hiragino Sans","Hiragino Kaku Gothic ProN","Yu Gothic UI","Yu Gothic","Meiryo","Noto Sans JP",system-ui,sans-serif';
export const SERIF = '"Hiragino Mincho ProN","Yu Mincho","YuMincho","Noto Serif JP",serif';

const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
export function mix(a, b, k) {
  const A = rgb(a), B = rgb(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * clamp01(k)).toString(16).padStart(2, '0')).join('');
}
const lerp = (a, b, k) => a + (b - a) * k;
const hash = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// Every carrier is the same 24 rectangles in a unit box; forms only move and recolour them.
const FORM_COLOR = {doc: 'ink', code: 'accent', json: 'teal', tokens: 'accent', bar: 'teal', grid: 'teal', smooth: 'teal', mel: 'warm', wave: 'ink', empty: 'line'};
function formRect(form, i, env) {
  const col8 = i % 8, row3 = Math.floor(i / 8);
  switch (form) {
    case 'doc': case 'code': case 'json':
      return {x: 0.04 + col8 * 0.12, y: 0.12 + row3 * 0.3, w: (row3 === 2 && col8 > 4) ? 0 : 0.1, h: 0.18, l: 0.8};
    case 'tokens': { const h = 0.35 + 0.6 * hash(i + 3); return {x: i / K + 0.006, y: 1 - h, w: 1 / K - 0.012, h, l: 0.55 + 0.45 * hash(i + 7)}; }
    case 'bar': return i < 22 ? {x: i / 22 * 0.84, y: 0.42, w: 0.84 / 22 + 0.002, h: 0.16, l: 0.6} : {x: 0.9, y: 0.18, w: 0.08, h: 0.64, l: 1};
    case 'grid': return {x: col8 / 8 + 0.008, y: row3 / 3 + 0.03, w: 1 / 8 - 0.016, h: 1 / 3 - 0.06, l: hash(i * 7 + 13)};
    case 'smooth': return {x: col8 / 8 + 0.008, y: row3 / 3 + 0.03, w: 1 / 8 - 0.016, h: 1 / 3 - 0.06, l: 0.35 + 0.5 * (0.5 + 0.5 * Math.sin(col8 * 0.8 + row3 * 1.3))};
    case 'mel': { const y = 0.06 + 0.3 * (0.5 + 0.5 * Math.sin(i * 0.7)); return {x: i / K, y, w: 1 / K - 0.008, h: 0.96 - y, l: 0.4 + 0.5 * hash(i + 51)}; }
    case 'wave': { const h = Math.max(0.06, (env ? env[i] : 0.5) * 0.96); return {x: i / K + 0.006, y: 0.5 - h / 2, w: 1 / K - 0.012, h, l: 0.9}; }
    default: return {x: i / K, y: 0.46, w: 1 / K - 0.01, h: 0.08, l: 0.5};
  }
}

function slotBox(node, slot) {
  const g = node.glyph;
  if (slot === 'left') return {x: g.x, y: g.y, w: g.w * 0.56, h: g.h};
  if (slot === 'right') return {x: g.x + g.w * 0.64, y: g.y, w: g.w * 0.36, h: g.h};
  if (slot === 'afterPlay') { const s = Math.min(g.h, g.w * 0.25); return {x: g.x + s * 1.3, y: g.y, w: g.w - s * 1.3, h: g.h}; }
  return {...g};
}

function fitText(ctx, value, x, y, maxW) {
  const w = ctx.measureText(value).width;
  if (w <= maxW || w === 0) { ctx.fillText(value, x, y); return; }
  // Condense horizontally instead of shrinking: the glyph height stays at the declared font size.
  ctx.save(); ctx.translate(x, y); ctx.scale(maxW / w, 1); ctx.fillText(value, 0, 0); ctx.restore();
}
function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
}
function haloText(ctx, value, x, y, maxW, halo, size) {
  ctx.save(); ctx.lineJoin = 'round'; ctx.strokeStyle = halo; ctx.lineWidth = Math.max(3, size * 0.24);
  const w = ctx.measureText(value).width, k = w > maxW && w > 0 ? maxW / w : 1;
  ctx.translate(x, y); ctx.scale(k, 1); ctx.strokeText(value, 0, 0); ctx.fillText(value, 0, 0); ctx.restore();
}

function clipToRect(ax, ay, bx, by, r, gap) {
  const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
  const tx = dx ? (r.w / 2) / Math.abs(dx) : Infinity, ty = dy ? (r.h / 2) / Math.abs(dy) : Infinity, k = Math.min(tx, ty);
  return [ax + dx * k + dx / len * gap, ay + dy * k + dy / len * gap];
}
function arrow(ctx, x1, y1, x2, y2, size) {
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  const a = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath(); ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - size * Math.cos(a - 0.45), y2 - size * Math.sin(a - 0.45));
  ctx.lineTo(x2 - size * Math.cos(a + 0.45), y2 - size * Math.sin(a + 0.45));
  ctx.closePath(); ctx.fill();
}

/**
 * Draw the connected map for one scene into a layout from layoutConcept.
 * opts: {layout, palette, mode:'page'|'film', x, y, focus, view:{start,end,label}, playhead}
 */
export function drawConcept(ctx, data, scene, opts) {
  const L = opts.layout, pal = opts.palette || PALETTES.light, f = L.f, film = opts.mode === 'film';
  const focus = new Set(opts.focus || scene.focus || []);
  const lw = Math.max(1.25, f / 11);
  const small = Math.max(14, Math.round(f * 0.92));
  ctx.save();
  ctx.translate(opts.x || 0, opts.y || 0);
  ctx.textBaseline = 'middle';

  // Edges stay visible in every scene; only emphasis changes.
  const traceN = film ? scene.trace.p * EDGES.length : -1;
  EDGES.forEach(([a, b], i) => {
    const A = L.nodes[a], B = L.nodes[b];
    const p1 = clipToRect(A.cx, A.cy, B.cx, B.cy, A, 3), p2 = clipToRect(B.cx, B.cy, A.cx, A.cy, B, 3);
    const lit = (focus.has(a) && focus.has(b)) || (film && scene.trace.alpha > 0 && i < traceN);
    const c = lit ? (film && !(focus.has(a) && focus.has(b)) ? mix(pal.line, pal.accent, scene.trace.alpha) : pal.accent) : pal.line;
    ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = lit ? lw * 1.8 : lw;
    arrow(ctx, p1[0], p1[1], p2[0], p2[1], f * 0.42);
  });
  const use = L.nodes.use, S = L.strip;
  {
    const lit = focus.has('use') && focus.has('strip');
    ctx.strokeStyle = ctx.fillStyle = lit ? pal.accent : pal.line; ctx.lineWidth = lit ? lw * 1.8 : lw;
    arrow(ctx, use.cx, use.y + use.h + 3, use.cx, S.y - 2, f * 0.42);
  }

  // Node bodies.
  for (const n of Object.values(L.nodes)) {
    const on = focus.has(n.id);
    n.fill = mix(pal[n.role], pal.accent, on ? 0.12 : 0);
    rrect(ctx, n.x, n.y, n.w, n.h, f * 0.35);
    ctx.fillStyle = n.fill; ctx.fill();
    ctx.strokeStyle = on ? pal.accent : pal.line; ctx.lineWidth = on ? lw * 2 : lw; ctx.stroke();
    ctx.save(); ctx.setLineDash([f * 0.18, f * 0.18]); ctx.strokeStyle = mix(n.fill, pal.line, 0.55); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(n.glyph.x, n.glyph.y + n.glyph.h - 1); ctx.lineTo(n.glyph.x + n.glyph.w, n.glyph.y + n.glyph.h - 1); ctx.stroke();
    ctx.restore();
  }

  // The real waveform of the saved WAV (320 min/max windows per channel).
  drawStrip(ctx, data, scene, opts, L, pal, focus, lw, small, film);

  // Carriers: the same 24 shapes move between nodes and change form.
  for (const c of scene.carriers) {
    if (c.alpha <= 0.001) continue;
    const A = slotBox(L.nodes[c.from], c.fromSlot), B = slotBox(L.nodes[c.to], c.toSlot);
    const moving = c.from !== c.to;
    const s = moving ? 1 - 0.3 * Math.sin(Math.PI * c.p) : 1;
    const bw = lerp(A.w, B.w, c.p) * s, bh = lerp(A.h, B.h, c.p) * s;
    const bx = lerp(A.x + A.w / 2, B.x + B.w / 2, c.p) - bw / 2, by = lerp(A.y + A.h / 2, B.y + B.h / 2, c.p) - bh / 2;
    const [fa, fb, k] = c.form;
    const col = mix(pal[FORM_COLOR[fa]], pal[FORM_COLOR[fb]], k);
    ctx.save(); ctx.globalAlpha = c.alpha;
    for (let i = 0; i < K; i++) {
      const ra = formRect(fa, i, data.envelope), rb = formRect(fb, i, data.envelope);
      const w = lerp(ra.w, rb.w, k) * bw;
      if (w <= 0.2) continue;
      ctx.fillStyle = mix(pal.paper, col, 0.3 + 0.7 * lerp(ra.l, rb.l, k));
      ctx.fillRect(bx + lerp(ra.x, rb.x, k) * bw, by + lerp(ra.y, rb.y, k) * bh, Math.max(1, w), Math.max(1, lerp(ra.h, rb.h, k) * bh));
    }
    ctx.restore();
  }
  if (scene.play > 0) {
    const g = use.glyph, sz = Math.min(g.h, g.w * 0.25);
    ctx.save(); ctx.globalAlpha = scene.play; ctx.fillStyle = pal.accent;
    ctx.beginPath(); ctx.moveTo(g.x, g.y + g.h / 2 - sz / 2); ctx.lineTo(g.x + sz * 0.95, g.y + g.h / 2); ctx.lineTo(g.x, g.y + g.h / 2 + sz / 2); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // Labels on top with a halo, so a passing shape never hides them.
  ctx.textAlign = 'center';
  for (const n of Object.values(L.nodes)) {
    const inner = n.w - 0.5 * f;
    const line2 = n.id === 'latent' ? data.latentShape.join('×') : n.lines[1];
    ctx.font = '700 ' + f + 'px ' + SANS; ctx.fillStyle = pal.ink;
    haloText(ctx, n.lines[0], n.cx, n.y + 1.15 * f, inner, n.fill, f);
    ctx.font = '500 ' + small + 'px ' + SANS; ctx.fillStyle = pal.muted;
    haloText(ctx, line2, n.cx, n.y + 2.1 * f, inner, n.fill, small);
  }
  if (!film) {
    // Numbered badges match the six native detail buttons laid over these nodes.
    const r = Math.max(9, 0.62 * f);
    ctx.font = '700 ' + Math.max(14, Math.round(0.8 * f)) + 'px ' + SANS;
    PART_IDS.forEach((pid, i) => {
      const n = Object.values(L.nodes).find(x => x.part === pid);
      const x = n.x + n.w - 0.25 * f, y = n.y;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = pal.ink; ctx.fill();
      ctx.fillStyle = pal.paper; ctx.fillText(String(i + 1), x, y + 0.5);
    });
  }
  ctx.restore();
  return L;
}

function drawStrip(ctx, data, scene, opts, L, pal, focus, lw, small, film) {
  const S = L.strip, W = S.wave, on = focus.has('strip');
  const alpha = film ? scene.strip : 1;
  const dur = data.wav.duration, req = data.facts.input.requested_duration_s;
  ctx.textAlign = 'left'; ctx.font = '700 ' + small + 'px ' + SANS; ctx.fillStyle = pal.ink;
  const head = '実波形 ' + dur.toFixed(3) + '秒（要求' + req + '秒）';
  const view = !film && opts.view ? opts.view : null;
  const tagW = view ? Math.min(S.w * 0.4, ctx.measureText(view.label).width + 4) : 0;
  fitText(ctx, head, S.x, S.labelY, S.w - tagW - 8);
  if (view) { ctx.textAlign = 'right'; ctx.fillStyle = pal.accent; fitText(ctx, view.label, S.x + S.w, S.labelY, tagW); ctx.textAlign = 'left'; }
  ctx.fillStyle = pal.muted; ctx.font = '500 ' + small + 'px ' + SANS; ctx.textAlign = 'center';
  ctx.fillText('左', S.x + (W.x - S.x) / 2 - 2, W.y + W.h * 0.25);
  ctx.fillText('右', S.x + (W.x - S.x) / 2 - 2, W.y + W.h * 0.75);
  rrect(ctx, W.x, W.y, W.w, W.h, 4);
  ctx.fillStyle = pal.paper; ctx.fill();
  ctx.save();
  if (alpha < 1) ctx.setLineDash([L.f * 0.25, L.f * 0.2]);
  ctx.strokeStyle = on ? pal.accent : pal.line; ctx.lineWidth = on ? lw * 1.8 : lw; ctx.stroke();
  ctx.restore();
  if (alpha <= 0.001) return;
  const bins = data.waveforms.bins, n = bins.length, bw = W.w / n, amp = W.h * 0.23;
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = pal.ink;
  for (let i = 0; i < n; i++) {
    const b = bins[i], x = W.x + i * bw;
    for (let ch = 0; ch < 2; ch++) {
      const c = W.y + W.h * (ch ? 0.75 : 0.25);
      ctx.fillRect(x, c - b.max[ch] * amp, Math.max(1, bw - 0.25), Math.max(1, (b.max[ch] - b.min[ch]) * amp));
    }
  }
  ctx.restore();
  if (view) {
    const x1 = W.x + view.start / dur * W.w, x2 = W.x + view.end / dur * W.w;
    ctx.save(); ctx.fillStyle = pal.bg; ctx.globalAlpha = 0.62;
    ctx.fillRect(W.x, W.y, x1 - W.x, W.h); ctx.fillRect(x2, W.y, W.x + W.w - x2, W.h);
    ctx.restore();
    ctx.strokeStyle = pal.accent; ctx.lineWidth = 2; ctx.strokeRect(x1 + 1, W.y + 1, Math.max(2, x2 - x1 - 2), W.h - 2);
  }
  if (!film && Number.isFinite(opts.playhead) && opts.playhead > 0) {
    const x = W.x + Math.min(1, opts.playhead / dur) * W.w;
    ctx.fillStyle = pal.accent; ctx.fillRect(x - 1, W.y - 3, 2, W.h + 6);
  }
}

/* ---------- details shared by page and editor ---------- */

const shape = s => s.tensor_shape.join('×');
export const fmtInt = n => Number(n).toLocaleString('en-US');

/** Observed facts for one of the six parts, read only from verified files. */
export function partInfo(data, id) {
  const i = PART_IDS.indexOf(id), part = data.facts.parts[i], fx = data.facts.execution, ex = data.execution;
  const rec = m => fx.method_boundary_records.find(r => r.method === m);
  const out = data.facts.actual_output, api = data.facts.input.api_params, rt = ex.execution.runner_timings_s;
  const latentLen = Math.floor(api.audio_duration * 44100 / 512 / 8);
  const rows = {
    pipeline: [
      ['呼び出し', 'load_checkpoint ' + fx.load_checkpoint_call_count + '回、ACEStepPipeline.__call__ ' + fx.pipeline_call_count + '回（batch ' + api.batch_size + '）'],
      ['実行環境', 'CPU・' + fx.dtype.replace('torch.', '') + '・Python ' + fx.python + '・torch ' + fx.torch + '・スレッド ' + fx.torch_threads + '/' + fx.torch_interop_threads],
      ['1回きりの時間', '読み込み ' + rt.load_checkpoint + '秒、__call__ ' + rt.pipeline_call + '秒。速さの比較やベンチマークではありません']
    ],
    text: [
      ['観測', 'get_text_embeddings ' + fx.method_boundary_counts.get_text_embeddings + '回 → 特徴 ' + shape(rec('get_text_embeddings').result[0]) + '・マスク ' + shape(rec('get_text_embeddings').result[1])],
      ['歌詞', '空文字なので、原典は既定の歌詞ID/マスク0（形 ' + shape(rec('text2music_diffusion_process').kwargs.lyric_token_ids) + '）を渡します。歌詞のトークン化は実行していません'],
      ['観測していない', 'use_erg_tag による空文字側の埋め込み呼び出し（get_text_embeddings_null）']
    ],
    noise: [
      ['長さ', 'audio_duration ' + api.audio_duration + '秒（要求値）→ 原典の式 int(' + api.audio_duration + '×44100/512/8) = ' + latentLen + ' の潜在長'],
      ['seed', rec('text2music_diffusion_process').kwargs.random_generators.map(g => g.initial_seed + '（' + g.generator_device + '）').join('、')],
      ['記録していない', '初期の乱数の値そのもの。図の格子は説明用の模様です']
    ],
    flow: [
      ['観測', 'text2music_diffusion_process ' + fx.method_boundary_counts.text2music_diffusion_process + '回（境界 ' + rec('text2music_diffusion_process').elapsed_s + '秒）→ 圧縮潜在 ' + shape(rec('text2music_diffusion_process').result)],
      ['設定値', 'infer_step ' + api.infer_step + '・' + api.scheduler_type + '・' + api.cfg_type + '・guidance_scale ' + api.guidance_scale + '・omega_scale ' + api.omega_scale],
      ['観測していない', '各stepの途中、attention、guidanceの効き方。27は実行中に数えた値ではなく設定です']
    ],
    decode: [
      ['観測', 'latents2audio ' + fx.method_boundary_counts.latents2audio + '回（境界 ' + rec('latents2audio').elapsed_s + '秒）、入力 ' + shape(rec('latents2audio').kwargs.latents)],
      ['原典内部', 'DCAEの復元→メル→vocoderで左右を別々に→Resample(44100→' + rec('save_wav_file').kwargs.sample_rate + ')'],
      ['制作担当', '追加のリサンプリング・正規化・フェード・トリミングはしていません。図のメルは説明用の模様です']
    ],
    wav: [
      ['観測', 'save_wav_file ' + fx.method_boundary_counts.save_wav_file + '回、波形 ' + shape(rec('save_wav_file').args[0]) + '・' + fmtInt(rec('save_wav_file').kwargs.sample_rate) + 'Hz'],
      ['保存されたWAV', fmtInt(out.wav_bytes) + 'バイト・' + data.wav.channels + 'ch・32-bit浮動小数・' + fmtInt(data.wav.frames) + 'フレーム = ' + out.measurements.duration.actual_duration_s + '秒（要求' + data.facts.input.requested_duration_s + '秒）'],
      ['設定JSON', '原典がWAVの横に書いた入力記録 ' + fmtInt(out.params_bytes) + 'バイト。数値の測定は別工程で、聴いた確認ではありません']
    ]
  }[id];
  return {n: i + 1, id, label: part.label, meaning: part.meaning, rows, source: part.source, excerpt: part.excerpt};
}
