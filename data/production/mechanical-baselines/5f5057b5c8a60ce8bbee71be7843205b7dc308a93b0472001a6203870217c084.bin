// 八百万図AIツールボックス: Make Interfaces Feel Better concept map (visual-r1).
// One connected picture of what this skill is (Markdown guidance an AI reads: one SKILL.md, five reference topics,
// 19 core principles), what was handed to the original AI, the three places it changed on one real page, what it
// chose not to change, and the unchanged clips.json + export.mjs contract that still produces the same JSON file.
// The browser reads only the 34 frozen files named in concept/manifest.json, then imports the original export.mjs
// and really calls summarize() and serializeExport() for the three saved presets, comparing each string with the
// saved output byte for byte. It never calls a model, reruns the review or reruns the original Node/browser checks.
// video/video.js imports this same module for the 32 s film; importing it does not start the page UI.

const BASE = new URL('./', import.meta.url);
const MANIFEST_PATH = 'concept/manifest.json';
const MANIFEST_SHA = 'a4075c5d1bda1e89cbae006fd7d65268d9e1784704df569cd719c5bb738c1426';
const CASE = 'make-interfaces-feel-better-example';
export const COMMIT = '35545ea1512ad59fa463e6b1f95ca9c052981fe6';
export const REPO = 'jakubkrehel/make-interfaces-feel-better';
export const TOTAL_FILES = 34;
export const CASE_IDS = ['all', 'two', 'one'];
export const PART_IDS = ['scope', 'references', 'quick', 'findings', 'rejected', 'verify'];
export const GROUP_IDS = ['area', 'numbers', 'button'];
export const FILE_NAME = 'atelier-delivery.json';

const SKILL = 'vendor/make-interfaces-feel-better/skills/make-interfaces-feel-better/SKILL.md';
const REF = name => `vendor/make-interfaces-feel-better/skills/make-interfaces-feel-better/${name}.md`;
// The six frozen quotes and the SKILL.md line each one sits on at the fixed commit.
const QUOTES = {
  scope: [9, 'Never introduce a second styling system just to apply a polish fix.'],
  references: [13, '## Quick Reference'],
  quick: [126, '| `quick` | Primary user path and highest-traffic states; report only `HIGH` and `MEDIUM` issues | 5 |'],
  findings: [141, 'Group findings by principle.'],
  rejected: [172, 'Include 1–3 real candidates in `quick` mode and 2–5 in `full` mode:'],
  verify: [180, '### Verification and Verdict'],
};
const REFERENCES = ['typography', 'surfaces', 'animations', 'icons', 'performance'];
// Saved results of the three unchanged presets. The page recomputes them with the original export.mjs and stops if
// anything differs.
const FROZEN = {
  all: {ids: ['c01', 'c02', 'c03'], count: 3, seconds: 370, time: '06:10', bytes: 560, path: 'outputs/all.json'},
  two: {ids: ['c02', 'c03'], count: 2, seconds: 275, time: '04:35', bytes: 399, path: 'outputs/two.json'},
  one: {ids: ['c02'], count: 1, seconds: 190, time: '03:10', bytes: 252, path: 'outputs/one.json'},
};
const GROUPS = {
  area: {severity: 'HIGH', before: '16px', after: '行全体'},
  numbers: {severity: 'MEDIUM', before: '幅が変わる', after: '幅を予約'},
  button: {severity: 'HIGH', before: '0.86', after: '0.96'},
};
const CLIPS = [['c01', 95], ['c02', 190], ['c03', 85]];
// Lines of the protected original UI that the three drawn changes stand for. Read as text, never edited.
const SOURCE_FACTS = [
  ['before/before.css', '.clip input,.option input{width:16px;height:16px;'],
  ['before/before.css', 'input:focus,button:focus{outline:none}'],
  ['before/before.css', 'button:active{transform:scale(.86)}'],
  ['before/before.css', 'transition:all .5s'],
  ['before/before.mjs', "import {summarize,serializeExport} from '../export.mjs';"],
  ['app.mjs', "import {summarize,serializeExport} from './export.mjs';"],
  ['style.css', ':focus-visible{outline:2px solid #375846;outline-offset:3px}'],
  ['style.css', '.export:active:enabled{scale:.96}'],
  ['style.css', 'font-variant-numeric:tabular-nums'],
  ['style.css', 'transition-property:scale,background-color'],
];
const EXPECTED = [
  'app.mjs', 'assets/after-all.png', 'assets/after-empty.png', 'assets/after-focus.png', 'assets/after-handoff.png',
  'assets/after-mobile.png', 'assets/after-two.png', 'assets/before.png', 'before/before.css', 'before/before.mjs',
  'before/index.html', 'clips.json', 'concept/original-run.json', 'concept/structure.json', 'export.mjs', 'input.md',
  'outputs/all.json', 'outputs/no-notes.json', 'outputs/one.json', 'outputs/two.json', 'request.txt', 'review.md',
  'samples.json', 'style.css', 'validation.json', 'vendor/make-interfaces-feel-better/LICENSE',
  'vendor/make-interfaces-feel-better/README.md', SKILL, ...REFERENCES.map(REF), 'verification.json',
];

export const assetURL = path => new URL(path, BASE).href;

export class LoadError extends Error {}
const fail = message => new LoadError(message);
const check = (ok, message) => { if (!ok) throw fail(message); };
const utf8 = new TextDecoder('utf-8', {fatal: true});
const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const hasOwn = (o, key) => Object.prototype.hasOwnProperty.call(o, key);
export const byteLength = str => new TextEncoder().encode(str).length;

function same(a, b) {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every(key => hasOwn(b, key) && same(a[key], b[key]));
}

async function sha256(buffer) {
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

async function fetchBytes(path, signal) {
  let response;
  try {
    response = await fetch(assetURL(path), {cache: 'no-store', credentials: 'same-origin', signal});
  } catch (error) {
    if (signal.aborted) throw error;
    throw fail(`${path} を取得できません`);
  }
  if (!response.ok) throw fail(`${path}：HTTP ${response.status}`);
  return response.arrayBuffer();
}

function readText(path, buffer) {
  try { return utf8.decode(buffer); } catch { throw fail(`${path}：UTF-8として読めません`); }
}

function readJSON(path, text) {
  try { return JSON.parse(text); } catch { throw fail(`${path}：JSONとして読めません`); }
}

// Match the encoded image, not its historical .png filename. The preserved CUA captures
// contain JPEG bytes; their original hashes and dimensions remain unchanged.
function captureSize(buffer) {
  const b = new DataView(buffer);
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (buffer.byteLength >= 24 && sig.every((v, i) => b.getUint8(i) === v))
    return [b.getUint32(16), b.getUint32(20)];
  if (buffer.byteLength < 4 || b.getUint16(0) !== 0xffd8) return null;
  for (let p = 2; p + 3 < buffer.byteLength;) {
    if (b.getUint8(p++) !== 0xff) return null;
    while (p < buffer.byteLength && b.getUint8(p) === 0xff) p++;
    if (p >= buffer.byteLength) return null;
    const marker = b.getUint8(p++);
    if (marker === 0xd9 || marker === 0xda) return null;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (p + 2 > buffer.byteLength) return null;
    const length = b.getUint16(p);
    if (length < 2 || p + length > buffer.byteLength) return null;
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker))
      return length >= 7 ? [b.getUint16(p + 5), b.getUint16(p + 3)] : null;
    p += length;
  }
  return null;
}

let importCount = 0;

// Loads the 34 frozen files named by concept/manifest.json, checks size, SHA-256 and meaning, then imports the
// original export.mjs and recomputes the three saved outputs. Nothing is fetched again per frame.
export async function loadAssets({signal, onProgress = () => {}} = {}) {
  if (!globalThis.crypto || !crypto.subtle) {
    throw fail('SHA-256を確かめるには、HTTPS か localhost で開いてください（crypto.subtle を使えません）');
  }
  const local = new AbortController();
  const abort = () => local.abort();
  if (signal) { if (signal.aborted) local.abort(); else signal.addEventListener('abort', abort, {once: true}); }
  const report = info => { if (!local.signal.aborted) onProgress(info); };
  try {
    const manifestBuffer = await fetchBytes(MANIFEST_PATH, local.signal);
    check(await sha256(manifestBuffer) === MANIFEST_SHA, 'concept/manifest.json のSHA-256が固定値と違います');
    const manifest = readJSON(MANIFEST_PATH, readText(MANIFEST_PATH, manifestBuffer));
    const entries = isObj(manifest) && Array.isArray(manifest.files) ? manifest.files : [];
    const listed = new Set(entries.map(entry => (isObj(entry) ? entry.path : null)));
    check(manifest.case_id === CASE && manifest.version === 'visual-r1' && entries.length === TOTAL_FILES &&
      listed.size === TOTAL_FILES && EXPECTED.every(path => listed.has(path)) &&
      entries.every(entry => Number.isInteger(entry.bytes) && entry.bytes > 0 && /^[0-9a-f]{64}$/.test(entry.sha256)),
    `確認する${TOTAL_FILES}件の一覧が違います`);

    const bytes = new Map();
    const hashes = new Map(entries.map(entry => [entry.path, entry.sha256]));
    let done = 0;
    report({done, total: TOTAL_FILES});
    await Promise.all(entries.map(async entry => {
      const buffer = await fetchBytes(entry.path, local.signal);
      check(buffer.byteLength === entry.bytes, `${entry.path}：大きさが違います（${buffer.byteLength}／${entry.bytes}バイト）`);
      check(await sha256(buffer) === entry.sha256, `${entry.path}：SHA-256が違います`);
      bytes.set(entry.path, buffer);
      report({done: ++done, total: TOTAL_FILES});
    }).map(task => task.catch(error => { local.abort(); throw error; })));
    if (local.signal.aborted) throw signal && signal.aborted ? new DOMException('aborted', 'AbortError') : fail('読み込みを中断しました');

    const texts = new Map();
    const text = path => {
      if (!texts.has(path)) texts.set(path, readText(path, bytes.get(path)));
      return texts.get(path);
    };
    let facts;
    try {
      facts = validate(text, path => readJSON(path, text(path)), hashes, path => bytes.get(path));
    } catch (error) {
      throw error instanceof LoadError ? error : fail('保存記録の形が想定と違います');
    }
    // The only calculation module: the protected original export.mjs, imported after its bytes were checked.
    let mod;
    try {
      const url = new URL('export.mjs', BASE);
      if (importCount++) url.searchParams.set('retry', String(importCount));
      mod = await import(url.href);
    } catch {
      throw fail('export.mjs を読み込めません');
    }
    if (local.signal.aborted) throw signal && signal.aborted ? new DOMException('aborted', 'AbortError') : fail('読み込みを中断しました');
    return compute(mod, facts, text);
  } catch (error) {
    local.abort();
    throw error;
  } finally {
    if (signal) signal.removeEventListener('abort', abort);
  }
}

// Meaning checks on the saved records. They read what the original production wrote; they are not a new review.
function validate(text, json, hashes, raw) {
  const structure = json('concept/structure.json');
  check(isObj(structure) && structure.id === CASE && structure.source_commit === COMMIT && structure.core_principles === 19,
    'structure.json の識別子・固定コミット・原則数が違います');
  const parts = Array.isArray(structure.parts) ? structure.parts : [];
  check(parts.map(part => (isObj(part) ? part.id : null)).join() === PART_IDS.join(), 'structure.json の6部品が違います');
  const skillLines = text(SKILL).split(/\r?\n/);
  for (const part of parts) {
    const [line, quote] = QUOTES[part.id];
    check(part.source_path === SKILL && part.upstream_path === SKILL.replace(/^vendor\/make-interfaces-feel-better\//, '') &&
      part.line_start === line && part.quote === quote && typeof part.label === 'string' && typeof part.meaning === 'string',
    `${part.id}：引用の記録が違います`);
    check(typeof skillLines[line - 1] === 'string' && skillLines[line - 1].includes(quote), `SKILL.md:${line} に引用の文がありません`);
  }
  check((text(SKILL).match(/^### \d+\. /gm) || []).length === 19, 'SKILL.md の Core Principles が19件ではありません');
  const refs = Array.isArray(structure.reference_categories) ? structure.reference_categories : [];
  check(refs.map(r => (isObj(r) ? r.id : null)).join() === REFERENCES.join() &&
    refs.every(r => r.path === REF(r.id) && hashes.has(r.path) && typeof r.label === 'string') &&
    REFERENCES.every(name => skillLines.some(line => line.includes(`(${name}.md)`))),
  'structure.json の5参照が SKILL.md の Quick Reference と違います');
  const mode = isObj(structure.review_mode) ? structure.review_mode : {};
  check(mode.mode === 'quick' && mode.original_skill_cap === 5 && mode.request_group_cap === 3 && mode.findings === 3 &&
    mode.rejected_candidates === 3, 'structure.json の quick の範囲が違います');
  const groups = Array.isArray(structure.finding_groups) ? structure.finding_groups : [];
  check(groups.map(g => (isObj(g) ? g.id : null)).join() === GROUP_IDS.join() && groups.every(g =>
    g.severity === GROUPS[g.id].severity && g.before_value === GROUPS[g.id].before && g.after_value === GROUPS[g.id].after &&
    typeof g.label === 'string' && typeof g.limit === 'string' && Array.isArray(g.evidence) && g.evidence.every(p => hashes.has(p))),
  'structure.json の3群が違います');
  check(isObj(structure.legacy) && structure.legacy.after === 'desk.html' && structure.legacy.before === 'before/desk.html',
    'structure.json の元画面の場所が違います');
  const presets = Array.isArray(structure.presets) ? structure.presets : [];
  check(presets.map(p => (isObj(p) ? p.id : null)).join() === CASE_IDS.join() && presets.every(p => {
    const f = FROZEN[p.id];
    return same(p.ids, f.ids) && p.include_notes === true && p.count === f.count && p.seconds === f.seconds &&
      p.time === f.time && p.output_path === f.path && p.output_bytes === f.bytes && p.output_sha256 === hashes.get(f.path);
  }), 'structure.json の3見本が保存した出力と違います');

  const clips = json('clips.json');
  check(isObj(clips) && clips.project === '週末のアトリエ' && Array.isArray(clips.clips) &&
    same(clips.clips.map(c => (isObj(c) ? [c.id, c.duration_seconds] : null)), CLIPS) &&
    clips.clips.every(c => typeof c.title === 'string' && typeof c.note === 'string'), 'clips.json の架空の3件が違います');

  const samples = json('samples.json');
  const list = isObj(samples) && Array.isArray(samples.samples) ? samples.samples : [];
  check(samples.format === 'input-output' && list.length === 3 && list.every((s, i) => {
    const f = FROZEN[CASE_IDS[i]];
    return isObj(s) && s.id === CASE_IDS[i] && same(s.ids, f.ids) && s.include_notes === true &&
      same(s.expected, {count: f.count, seconds: f.seconds, time: f.time}) && s.actual_output === f.path &&
      s.actual_sha256 === hashes.get(f.path);
  }), 'samples.json の3見本が違います');

  const original = json('concept/original-run.json');
  const node = isObj(original) && isObj(original.original_node) ? original.original_node : {};
  const runtime = isObj(original.original_runtime) ? original.original_runtime : {};
  const receipts = Array.isArray(original.original_model_receipts) ? original.original_model_receipts : [];
  const captures = isObj(original.source_captures) && Array.isArray(original.source_captures.captures) ? original.source_captures.captures : [];
  check(node.status === 'passed' && node.conditions === 8 && Array.isArray(node.results) && node.results.length === 8 &&
    runtime.status === 'passed' && runtime.human_approval === false && runtime.sample_count === 3 &&
    receipts.map(r => (isObj(r) ? r.phase : null)).join() === 'implement,video' &&
    typeof original.original_verdict === 'string' && original.original_verdict.includes('not human approval'),
  'concept/original-run.json の元の記録が違います');
  check(captures.length === 7 && captures.every(c => {
    const size = isObj(c) && hashes.has(c.file) ? captureSize(raw(c.file)) : null;
    return size && c.sha256 === hashes.get(c.file) && size[0] === c.width && size[1] === c.height;
  }), '元の実画面7枚の記録が違います');

  const validation = json('validation.json');
  check(isObj(validation) && validation.status === 'passed' && validation.conditions === 8 && Array.isArray(validation.results) &&
    same(validation.results.map(r => r.id), node.results.map(r => r.id)), 'validation.json が元のNode記録と違います');
  const verification = json('verification.json');
  check(isObj(verification) && verification.human_approval === false, 'verification.json の元の確認記録が違います');

  for (const [path, line] of SOURCE_FACTS) check(text(path).includes(line), `${path} に「${line}」がありません`);
  const request = text('request.txt');
  check(request.includes(COMMIT) && request.includes('quick') && request.includes('export.mjs'), 'request.txt の依頼文が違います');
  const review = text('review.md');
  check(review.includes('## Considered but Rejected') && review.includes('## Verification') && review.includes('**Approve（'),
    'review.md の元のレビューが違います');
  check(text('input.md').startsWith('# 入力：'), 'input.md の元の依頼が違います');
  const license = text('vendor/make-interfaces-feel-better/LICENSE');
  check(license.includes('MIT License') && license.includes('Jakub Krehel'), '原典の LICENSE が違います');
  check(text('vendor/make-interfaces-feel-better/README.md').includes('make-interfaces-feel-better'), '原典の README が違います');

  return {structure, parts, groups, clips, request};
}

// Really call the original module on the loaded input and compare with the saved bytes before anything is enabled.
function compute(mod, facts, text) {
  check(typeof mod.summarize === 'function' && typeof mod.serializeExport === 'function', 'export.mjs の関数がありません');
  const data = () => JSON.parse(JSON.stringify(facts.clips));
  const presets = {};
  for (const id of CASE_IDS) {
    const f = FROZEN[id];
    const sum = mod.summarize(data(), f.ids);
    const out = mod.serializeExport(data(), f.ids, true);
    check(isObj(sum) && sum.count === f.count && sum.seconds === f.seconds && sum.time === f.time,
      `export.mjs の計算（${id}）が保存値と違います`);
    check(out === text(f.path) && byteLength(out) === f.bytes, `export.mjs の出力（${id}）が ${f.path} と一致しません`);
    presets[id] = {id, ids: f.ids, count: sum.count, seconds: sum.seconds, time: sum.time, text: out, bytes: byteLength(out), path: f.path};
  }
  check(mod.serializeExport(data(), FROZEN.all.ids, false) === text('outputs/no-notes.json'),
    'メモなしの出力が outputs/no-notes.json と一致しません');
  let rejected = false;
  try { mod.serializeExport(data(), [], true); } catch (error) { rejected = error instanceof RangeError; }
  check(rejected, 'export.mjs が0件を拒否しません');
  const clipTimes = Object.fromEntries(facts.clips.clips.map(c => [c.id, mod.summarize(data(), [c.id]).time]));
  return {...facts, presets, clipTimes, clipTitles: Object.fromEntries(facts.clips.clips.map(c => [c.id, c.title]))};
}

// ---- Diagram -------------------------------------------------------------------------------------------------
// Paper and ink. The page keeps the original UI's green; vermilion is only the lens and its three marks; blue is
// the highlight of whatever a control spotlights.

export const PALETTES = {
  light: {bg: '#f1efe8', paper: '#fffefa', ink: '#22261f', sub: '#585e55', rule: '#b8baae', lane: '#e3e2d8',
    ribbon: '#d7dacd', accent: '#a8431c', accentSoft: '#f3dfd3', green: '#375846', greenSoft: '#dce6dd',
    gold: '#80652f', onGreen: '#ffffff', blue: '#24539a'},
  dark: {bg: '#171815', paper: '#23241f', ink: '#ebe9e0', sub: '#a9ab9f', rule: '#555950', lane: '#2c2e28',
    ribbon: '#363a31', accent: '#ec8a5f', accentSoft: '#3e2a20', green: '#86b596', greenSoft: '#22322a',
    gold: '#d1ab62', onGreen: '#10170f', blue: '#8eaaf0'},
};

export const FONT = '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic UI", "Yu Gothic", "Noto Sans JP", Meiryo, sans-serif';
export const SERIF = '"Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif';

// Design space: portrait 300×380, wide 640×300. Positions scale uniformly; labels never drop below 11 output px.
// The page is the same real screen before and after; chip y offsets line up with its three patches.
export const LAYOUTS = {
  portrait: {
    w: 300, h: 380,
    book: {x: 4, y: 4, w: 62, h: 58}, plus: [70, 37], req: {x: 74, y: 4, w: 48, h: 58},
    ai: {cx: 146, cy: 24, r: 14, label: [146, 54]},
    rejected: {x: 186, y: 4, w: 110, h: 58},
    page: {x: 4, y: 76, w: 194, h: 200}, lensHome: [100, 96],
    chips: {x: 206, w: 90}, quick: [251, 188],
    clips: {x: 4, y: 292, w: 60, h: 42}, exp: {x: 84, y: 292, w: 72, h: 42},
    file: {x: 178, y: 286, w: 118, h: 54}, verify: {x: 178, y: 346, w: 118, h: 32},
    ribbon: {x1: 4, x2: 178, y: 313}, contract: [[80, 354], [80, 368]],
    paths: {
      'merge-book': [[35, 32], [98, 32], [132, 24]],
      'merge-req': [[98, 32], [132, 24]],
      'ai-page': [[160, 24], [176, 24], [176, 68], [100, 68], [100, 76]],
      'ai-rejected': [[176, 24], [186, 24]],
      'page-export': [[120, 276], [120, 292]],
      'ribbon-a': [[64, 313], [84, 313]],
      'ribbon-b': [[156, 313], [178, 313]],
      'file-verify': [[237, 340], [237, 346]],
    },
  },
  wide: {
    w: 640, h: 300,
    book: {x: 6, y: 8, w: 80, h: 56}, plus: null, req: {x: 6, y: 72, w: 80, h: 52},
    ai: {cx: 116, cy: 66, r: 15, label: [116, 100]},
    rejected: {x: 6, y: 144, w: 136, h: 58},
    page: {x: 150, y: 10, w: 200, h: 200}, lensHome: [172, 66],
    chips: {x: 360, w: 116}, quick: [418, 120],
    clips: {x: 6, y: 226, w: 84, h: 44}, exp: {x: 206, y: 226, w: 90, h: 44},
    file: {x: 486, y: 220, w: 148, h: 56}, verify: {x: 486, y: 150, w: 148, h: 42},
    ribbon: {x1: 6, x2: 486, y: 248}, contract: [[148, 291]],
    paths: {
      'merge-book': [[46, 36], [92, 60], [101, 66]],
      'merge-req': [[46, 98], [92, 72], [101, 66]],
      'ai-page': [[131, 66], [150, 66]],
      'ai-rejected': [[140, 66], [140, 144]],
      'page-export': [[251, 210], [251, 226]],
      'ribbon-a': [[90, 248], [206, 248]],
      'ribbon-b': [[296, 248], [486, 248]],
      'file-verify': [[560, 220], [560, 192]],
    },
  },
};
const DRAWN_EDGES = ['ai-page', 'ai-rejected', 'page-export', 'file-verify'];
const DASHED = new Set(['ai-rejected', 'file-verify']);
const CHIP_DY = {numbers: 0, area: 52, button: 142};

// Parts of the same page, relative to its corner.
export function pageGeom(P) {
  const rows = [0, 1, 2].map(i => ({x: P.x + 6, y: P.y + 34 + i * 28, w: P.w - 12, h: 24}));
  return {
    totals: {x: P.x + P.w - 86, y: P.y + 6, w: 80, h: 22},
    rows,
    option: {x: P.x + 6, y: P.y + 120, w: P.w - 12, h: 18},
    button: {x: P.x + 8, y: P.y + 150, w: 120, h: 26},
    status: [P.x + 8, P.y + 193],
    marks: {numbers: P.y + 17, area: P.y + 76, button: P.y + 163},
  };
}

export function lensSpot(kind, id) {
  const L = LAYOUTS[kind], g = pageGeom(L.page);
  if (id === 'numbers') return [g.totals.x + g.totals.w / 2, g.totals.y + 11];
  if (id === 'button') return [g.button.x + g.button.w / 2, g.button.y + 13];
  if (id === 'area') return [L.page.x + L.page.w / 2, g.marks.area];
  return L.lensHome;
}

// Which part of the picture each control lights up. The whole picture always stays on screen.
export const STAGE_FOCUS = [
  ['book', 'tabs', 'req', 'ai', 'page', 'e:ai-page'],
  ['ai', 'page', 'lens', 'patch:area', 'patch:numbers', 'patch:button', 'chip:area', 'chip:numbers', 'chip:button',
    'quick', 'rejected', 'e:ai-page', 'e:ai-rejected'],
  ['page', 'patch:numbers', 'patch:button', 'e:page-export', 'clips', 'exp', 'ribbon', 'file', 'verify', 'e:file-verify'],
];
export const GROUP_FOCUS = {
  area: ['page', 'patch:area', 'chip:area'],
  numbers: ['page', 'patch:numbers', 'chip:numbers'],
  button: ['page', 'patch:button', 'chip:button', 'e:page-export', 'exp', 'ribbon', 'file'],
};
export const PART_FOCUS = {
  scope: ['req', 'page', 'clips', 'exp', 'ribbon', 'e:page-export'],
  references: ['book', 'tabs'],
  quick: ['req', 'quick', 'chip:area', 'chip:numbers', 'chip:button'],
  findings: ['page', 'patch:area', 'patch:numbers', 'patch:button', 'chip:area', 'chip:numbers', 'chip:button'],
  rejected: ['ai', 'rejected', 'e:ai-rejected'],
  verify: ['file', 'verify', 'e:file-verify'],
};

export const clamp01 = x => (x <= 0 ? 0 : x >= 1 ? 1 : x);
export const seg = (t, a, b) => (b > a ? clamp01((t - a) / (b - a)) : t >= a ? 1 : 0);
export const ease = x => { const c = clamp01(x); return c * c * (3 - 2 * c); };
const lerp = (a, b, p) => a + (b - a) * p;
// A press: scale dips to `low` and returns, from a to b.
const dip = (e, a, b, low) => 1 - (1 - low) * Math.sin(Math.PI * seg(e, a, b));

// ---- States --------------------------------------------------------------------------------------------------
// Every state is a pure function of (assets, case, stage or group, e). Page and film draw the same thing at the
// same arguments. fix.* runs 0 = the original before screen → 1 = the original after screen.

export function finalState(assets, caseId) {
  const p = assets.presets[caseId];
  return {
    caseId, preset: p, from: null, roll: 1, titles: assets.clipTitles, times: assets.clipTimes,
    fix: {area: 1, numbers: 1, button: 1}, marks: [1, 1, 1], chips: [1, 1, 1], lens: null,
    press: 1, pressLabel: null, icon: 1, status: 1, file: 1, gold: 0, focusRow: 1,
    show: {}, focus: null, tokens: [], pulse: {}, ghost: 0.3, dim: 0.5, strike: 1, tabs: null,
  };
}

export const STAGE_TIMES = [4.0, 7.0, 5.2];
export const GROUP_TIME = 2.6;

export function stageState(assets, caseId, stage, e) {
  const s = finalState(assets, caseId);
  const ev = (a, b) => ease(seg(e, a, b));
  const move = (path, kind, a, b, reverse = false) => s.tokens.push({path, kind, p: reverse ? 1 - seg(e, a, b) : seg(e, a, b), live: e > a && e < b});
  s.focus = STAGE_FOCUS[stage];
  if (stage === 0) {
    s.fix = {area: 0, numbers: 0, button: 0};
    s.marks = [0, 0, 0]; s.chips = [0, 0, 0]; s.icon = 0; s.status = 0; s.file = 0; s.strike = 0; s.focusRow = -1;
    s.show = {quick: 0, rejected: 0, file: 0, verify: 0};
    move('merge-book', 'sheet', 0.2, 1.2);
    move('merge-req', 'req', 0.6, 1.4);
    move('ai-page', 'screen', 1.3, 2.4, true);
    s.pulse.ai = seg(e, 2.4, 3.1);
    s.tabs = [0, 1, 2, 3, 4].map(i => ev(0.1 + i * 0.12, 0.3 + i * 0.12));
    return s;
  }
  if (stage === 1) {
    // The lens leaves the AI, marks the three places in order, and each place turns into the after version.
    s.lens = {legs: [[0.0, 0.7, 'home', 'area'], [2.0, 2.6, 'area', 'numbers'], [3.9, 4.5, 'numbers', 'button'], [6.0, 6.6, 'button', 'home']],
      alpha: ev(0, 0.3) * (1 - ev(6.4, 7.0))};
    s.marks = [ev(0.8, 1.0), ev(2.7, 2.9), ev(4.6, 4.8)];
    s.fix = {area: ev(1.0, 1.7), numbers: ev(2.9, 3.5), button: ev(4.8, 5.5)};
    s.focusRow = s.fix.area > 0.6 ? 1 : -1;
    s.chips = [ev(1.4, 1.8), ev(3.2, 3.6), ev(5.3, 5.7)];
    s.press = e < 5.2 ? dip(e, 4.85, 5.15, 0.86) : dip(e, 5.3, 5.6, 0.96);
    s.pressLabel = e > 4.8 && e < 5.15 ? '0.86' : e >= 5.25 && e < 5.75 ? '0.96' : null;
    s.gold = e > 5.0 && e < 5.2 ? 1 : 0;
    s.icon = 0; s.status = 0; s.file = 0;
    s.strike = ev(6.0, 6.8);
    move('ai-rejected', 'cross', 5.9, 6.4);
    s.show = {quick: ev(1.4, 1.8), rejected: ev(5.8, 6.2), file: 0, verify: 0};
    return s;
  }
  // Stage 2: pick the preset, the totals roll in anchored slots, the button hands the real JSON to the browser.
  s.from = 'blank';
  s.roll = ev(0.2, 0.8);
  s.press = dip(e, 1.1, 1.4, 0.96);
  s.pressLabel = e > 1.05 && e < 1.6 ? '0.96' : null;
  s.icon = ev(1.4, 1.7);
  s.status = ev(1.7, 2.0);
  move('page-export', 'json', 1.5, 2.0);
  move('ribbon-a', 'clip', 1.4, 2.0);
  s.pulse.exp = seg(e, 2.0, 2.6);
  move('ribbon-b', 'json', 2.4, 3.1);
  s.file = ev(3.0, 3.3);
  s.pulse.file = seg(e, 3.1, 3.8);
  s.pulse.verify = seg(e, 4.0, 4.9);
  s.show = {verify: ev(3.8, 4.2)};
  return s;
}

export function groupState(assets, caseId, group, e) {
  const s = finalState(assets, caseId);
  const ev = (a, b) => ease(seg(e, a, b));
  s.focus = GROUP_FOCUS[group];
  if (group === 'area') {
    s.fix.area = ev(0.5, 1.5);
    s.focusRow = s.fix.area > 0.6 ? 1 : -1;
  } else if (group === 'numbers') {
    s.fix.numbers = ev(0.3, 0.8);
    s.from = caseId === 'all' ? 'one' : 'all';
    s.roll = ev(1.2, 1.8);
  } else {
    s.fix.button = ev(0.9, 1.1);
    s.press = e < 0.9 ? dip(e, 0.2, 0.6, 0.86) : dip(e, 1.2, 1.5, 0.96);
    s.pressLabel = e > 0.15 && e < 0.7 ? '0.86' : e > 1.15 && e < 1.7 ? '0.96' : null;
    s.gold = e > 0.4 && e < 0.9 ? 1 : 0;
    s.icon = e < 0.9 ? 0 : ev(1.5, 1.8);
    s.status = e < 0.9 ? 0 : ev(1.8, 2.1);
    s.tokens.push({path: 'page-export', kind: 'json', p: seg(e, 1.6, 2.1), live: e > 1.6 && e < 2.1});
    s.pulse.file = seg(e, 2.0, 2.6);
  }
  return s;
}

// ---- Drawing -------------------------------------------------------------------------------------------------

function pointAt(points, p) {
  let total = 0;
  const lengths = [];
  for (let i = 1; i < points.length; i++) {
    const d = Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
    lengths.push(d); total += d;
  }
  let left = clamp01(p) * total;
  for (let i = 0; i < lengths.length; i++) {
    if (left <= lengths[i] || i === lengths.length - 1) {
      const q = lengths[i] ? Math.min(1, left / lengths[i]) : 0;
      return [lerp(points[i][0], points[i + 1][0], q), lerp(points[i][1], points[i + 1][1], q)];
    }
    left -= lengths[i];
  }
  return points[0];
}

// Rounded rectangle and folded paper paths without roundRect, which older iOS Safari lacks.
function rrect(ctx, x, y, w, h, r) {
  const q = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + q, y);
  ctx.arcTo(x + w, y, x + w, y + h, q);
  ctx.arcTo(x + w, y + h, x, y + h, q);
  ctx.arcTo(x, y + h, x, y, q);
  ctx.arcTo(x, y, x + w, y, q);
  ctx.closePath();
}

function paperPath(ctx, x, y, w, h, fold) {
  ctx.beginPath();
  ctx.moveTo(x, y); ctx.lineTo(x + w - fold, y); ctx.lineTo(x + w, y + fold); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h);
  ctx.closePath();
}

function lensAt(kind, lens, e) {
  if (!lens.legs) return lens.at;
  let at = lensSpot(kind, lens.legs[0][2]);
  for (const [t0, t1, from, to] of lens.legs) {
    if (e >= t0) {
      const a = lensSpot(kind, from), b = lensSpot(kind, to), q = ease(seg(e, t0, t1));
      at = [lerp(a[0], b[0], q), lerp(a[1], b[1], q)];
    }
  }
  return at;
}

// Draws the whole connected map for state `s` into `rect` (canvas units). `pxPerUnit` is how many output pixels
// (CSS pixels on the page, video pixels in the film) one canvas unit becomes, so labels stay at least 11.
// `e` is only needed to place a moving lens.
export function drawMap(ctx, kind, rect, s, pal, pxPerUnit = 1, e = 0) {
  const L = LAYOUTS[kind];
  const k = Math.min(rect.w / L.w, rect.h / L.h);
  const unit = k * pxPerUnit;
  const size = n => Math.max(n, 11 / unit);
  const shown = id => { const v = s.show[id]; return v === undefined ? 1 : v; };
  const hot = id => !!(s.focus && s.focus.includes(id));
  const pageHot = hot('page') || GROUP_IDS.some(g => hot('patch:' + g));
  // Keep the rest of the connected map readable against the dark page.
  const ghost = pal === PALETTES.dark ? Math.max(s.ghost, 0.75) : s.ghost;
  const dim = pal === PALETTES.dark ? Math.max(s.dim, 0.8) : s.dim;
  const alpha = (id, focusId = id) => {
    let a = ghost + (1 - ghost) * shown(id);
    if (s.focus && !(focusId === 'page' ? pageHot : hot(focusId))) a *= dim;
    return a;
  };
  const font = (n, weight) => `${weight} ${size(n)}px ${FONT}`;
  const text = (str, x, y, n, {weight = 500, align = 'left', color = pal.ink, max} = {}) => {
    ctx.font = font(n, weight); ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = color;
    if (max) ctx.fillText(str, x, y, max); else ctx.fillText(str, x, y);
  };
  const outline = (id, base = 1.3, dash = null) => {
    ctx.setLineDash(dash || []);
    ctx.lineWidth = hot(id) ? base + 1 : base;
    ctx.strokeStyle = hot(id) ? pal.blue : pal.ink;
    ctx.stroke();
    ctx.setLineDash([]);
  };
  const ring = (x, y, w, h, p, color = pal.blue) => {
    if (!(p > 0 && p < 1)) return;
    const a = ctx.globalAlpha, g = 7 * p;
    rrect(ctx, x - g, y - g, w + 2 * g, h + 2 * g, 5 + g);
    ctx.globalAlpha = a * (1 - p); ctx.lineWidth = 1.8; ctx.strokeStyle = color; ctx.stroke(); ctx.globalAlpha = a;
  };
  const arrowHead = (points, color) => {
    const [x1, y1] = points[points.length - 2], [x2, y2] = points[points.length - 1];
    const angle = Math.atan2(y2 - y1, x2 - x1), head = 4.5;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - head * Math.cos(angle - 0.5), y2 - head * Math.sin(angle - 0.5));
    ctx.lineTo(x2 - head * Math.cos(angle + 0.5), y2 - head * Math.sin(angle + 0.5));
    ctx.closePath(); ctx.fillStyle = color; ctx.fill();
  };
  const preset = s.preset;

  ctx.save();
  ctx.translate(rect.x + (rect.w - L.w * k) / 2, rect.y + (rect.h - L.h * k) / 2);
  ctx.scale(k, k);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';

  // The unchanged contract: one constant ribbon from clips.json through export.mjs to the JSON file.
  const rb = L.ribbon;
  ctx.globalAlpha = alpha('ribbon');
  ctx.fillStyle = hot('ribbon') ? pal.greenSoft : pal.ribbon;
  ctx.fillRect(rb.x1, rb.y - 6, rb.x2 - rb.x1, 12);
  for (const id of ['ribbon-a', 'ribbon-b']) arrowHead(L.paths[id], hot('ribbon') ? pal.blue : pal.sub);

  // Edges under the shapes.
  for (const id of DRAWN_EDGES) {
    const points = L.paths[id];
    const eid = 'e:' + id;
    const from = {'ai-page': 'ai', 'ai-rejected': 'rejected', 'page-export': 'exp', 'file-verify': 'verify'}[id];
    ctx.globalAlpha = alpha(from, eid);
    const color = hot(eid) ? pal.blue : pal.sub;
    ctx.strokeStyle = color;
    ctx.lineWidth = hot(eid) ? 2.2 : 1.4;
    ctx.setLineDash(DASHED.has(id) ? [3, 3] : []);
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    ctx.setLineDash([]);
    arrowHead(points, color);
  }

  // What is handed over: the skill (one SKILL.md with five reference tabs) and the request.
  const book = L.book;
  ctx.globalAlpha = alpha('book');
  const tabH = (book.h - 12) / 5;
  for (let i = 0; i < 5; i++) {
    const lit = s.tabs ? s.tabs[i] : hot('tabs') ? 1 : 0;
    ctx.fillStyle = lit > 0.5 ? pal.blue : pal.lane;
    ctx.fillRect(book.x + book.w - 1, book.y + 6 + i * tabH, 5, tabH - 2);
    ctx.lineWidth = 0.8; ctx.strokeStyle = pal.ink; ctx.strokeRect(book.x + book.w - 1, book.y + 6 + i * tabH, 5, tabH - 2);
  }
  rrect(ctx, book.x, book.y, book.w, book.h, 3); ctx.fillStyle = pal.paper; ctx.fill(); outline('book');
  ctx.fillStyle = pal.ink; ctx.fillRect(book.x + 4, book.y + 3, 2.4, book.h - 6);
  text('SKILL.md', book.x + 10, book.y + 17, 12, {weight: 700, max: book.w - 14});
  text('19原則', book.x + 10, book.y + 33, 11, {color: pal.sub, max: book.w - 14});
  text('＋5参照', book.x + 10, book.y + 48, 11, {weight: hot('tabs') ? 700 : 500, color: hot('tabs') ? pal.blue : pal.sub, max: book.w - 14});
  if (L.plus) { ctx.globalAlpha = Math.min(alpha('book'), alpha('req')); text('+', L.plus[0], L.plus[1], 11, {weight: 700, align: 'center', color: pal.sub}); }

  const req = L.req;
  ctx.globalAlpha = alpha('req');
  paperPath(ctx, req.x, req.y, req.w, req.h, 7); ctx.fillStyle = pal.paper; ctx.fill(); outline('req');
  text('依頼文', req.x + 5, req.y + 17, 11, {weight: 700, max: req.w - 10});
  text('quick', req.x + 5, req.y + 31, 11, {color: pal.sub, max: req.w - 10});
  ctx.beginPath();
  for (const dy of [38, 44, 50]) if (req.y + dy < req.y + req.h - 3) { ctx.moveTo(req.x + 5, req.y + dy); ctx.lineTo(req.x + req.w - 6, req.y + dy); }
  ctx.lineWidth = 1; ctx.strokeStyle = pal.rule; ctx.stroke();

  // The original AI: it read the skill, the request and the screen once and wrote the review and the after files.
  const ai = L.ai;
  ctx.globalAlpha = alpha('ai');
  const ap = s.pulse.ai;
  if (ap > 0 && ap < 1) {
    const a = ctx.globalAlpha;
    ctx.beginPath(); ctx.arc(ai.cx, ai.cy, ai.r + 9 * ap, 0, Math.PI * 2);
    ctx.globalAlpha = a * (1 - ap); ctx.lineWidth = 1.8; ctx.strokeStyle = pal.blue; ctx.stroke(); ctx.globalAlpha = a;
  }
  ctx.beginPath(); ctx.arc(ai.cx, ai.cy, ai.r, 0, Math.PI * 2); ctx.fillStyle = pal.paper; ctx.fill(); outline('ai', 1.6);
  text('AI', ai.cx, ai.cy + 4, 12, {weight: 700, align: 'center'});
  text('元のAI', ai.label[0], ai.label[1], 11, {weight: 700, align: 'center'});

  // Considered and not changed.
  const rj = L.rejected;
  ctx.globalAlpha = alpha('rejected');
  rrect(ctx, rj.x, rj.y, rj.w, rj.h, 4); ctx.fillStyle = pal.lane; ctx.fill(); outline('rejected', 1.2, [3, 2.5]);
  text('変えない3案', rj.x + 6, rj.y + 15, 11, {weight: 700, max: rj.w - 12});
  ['枠線→影', '見出しbalance', 'macOS平滑化'].forEach((item, i) => {
    const y = rj.y + 29 + i * 13;
    text('×', rj.x + 7, y, 11, {weight: 700, color: pal.accent});
    text(item, rj.x + 19, y, 11, {color: pal.sub, max: rj.w - 24});
    const w = Math.min(rj.w - 24, ctx.measureText(item).width) * s.strike;
    if (w > 0) { ctx.fillStyle = pal.sub; ctx.fillRect(rj.x + 19, y - 4, w, 1); }
  });

  drawPage(ctx, L, s, pal, {size, text, hot, pageHot, alpha, e, kind});

  // Findings: place → reason pairs, each chip tied to its mark on the page.
  const P = L.page, g = pageGeom(P);
  GROUP_IDS.forEach((id, i) => {
    const show = s.chips[i];
    const C = {x: L.chips.x, y: P.y + CHIP_DY[id], w: L.chips.w, h: 40};
    const a = (ghost + (1 - ghost) * show) * (s.focus && !hot('chip:' + id) ? dim : 1);
    ctx.globalAlpha = a;
    const my = g.marks[id];
    ctx.beginPath(); ctx.moveTo(P.x + P.w + 7, my); ctx.lineTo(C.x, Math.min(Math.max(my, C.y + 6), C.y + C.h - 6));
    ctx.lineWidth = hot('chip:' + id) ? 1.8 : 1; ctx.strokeStyle = hot('chip:' + id) ? pal.blue : pal.sub; ctx.stroke();
    rrect(ctx, C.x, C.y, C.w, C.h, 3); ctx.fillStyle = pal.paper; ctx.fill(); outline('chip:' + id, 1.1);
    ctx.fillStyle = pal.accent; ctx.fillRect(C.x, C.y + 4, 2.6, C.h - 8);
    text(LABELS[id], C.x + 7, C.y + 16, 11, {weight: 700, max: C.w - 11});
    const v = GROUPS[id];
    text(id === 'numbers' ? v.after : `${v.before}→${v.after}`, C.x + 7, C.y + 32, 11, {color: pal.sub, max: C.w - 11});
  });
  const q = L.quick;
  ctx.globalAlpha = alpha('quick');
  text('quick・上限3群', q[0], q[1], 11, {weight: 700, align: 'center', color: hot('quick') ? pal.blue : pal.ink});
  text('5分類とも記録', q[0], q[1] + 14, 11, {align: 'center', color: pal.sub});

  // The contract: same input, same function, same JSON.
  const cl = L.clips;
  ctx.globalAlpha = alpha('clips');
  paperPath(ctx, cl.x, cl.y, cl.w, cl.h, 6); ctx.fillStyle = pal.paper; ctx.fill(); outline('clips');
  text('clips.json', cl.x + 5, cl.y + 17, 11, {weight: 700, max: cl.w - 10});
  text('3件・不変', cl.x + 5, cl.y + 32, 11, {color: pal.sub, max: cl.w - 10});
  const ex = L.exp;
  ctx.globalAlpha = alpha('exp');
  rrect(ctx, ex.x, ex.y, ex.w, ex.h, 6); ctx.fillStyle = pal.lane; ctx.fill(); outline('exp', 1.5);
  text('export.mjs', ex.x + ex.w / 2, ex.y + 17, 11, {weight: 700, align: 'center', max: ex.w - 8});
  text('同じ関数', ex.x + ex.w / 2, ex.y + 32, 11, {align: 'center', color: pal.sub, max: ex.w - 8});
  ring(ex.x, ex.y, ex.w, ex.h, s.pulse.exp);
  ctx.globalAlpha = alpha('ribbon');
  L.contract.forEach(([x, y], i) => {
    const line = L.contract.length === 1 ? '同じ入力・同じ関数 → 同じJSON' : ['同じ入力・同じ関数', '→ 同じJSON'][i];
    text(line, x, y, 11, {align: 'center', color: hot('ribbon') ? pal.blue : pal.sub});
  });

  const fl = L.file;
  ctx.globalAlpha = alpha('file');
  paperPath(ctx, fl.x, fl.y, fl.w, fl.h, 9); ctx.fillStyle = pal.paper; ctx.fill(); outline('file', 1.6);
  ctx.fillStyle = pal.green; ctx.fillRect(fl.x, fl.y, 4, fl.h);
  const fv = s.file;
  text('JSON', fl.x + 10, fl.y + 17, 12, {weight: 700});
  ctx.globalAlpha = alpha('file') * (0.35 + 0.65 * fv);
  text(fv > 0 ? `${preset.bytes}B` : '—', fl.x + fl.w - 8, fl.y + 17, 12, {weight: 700, align: 'right', color: pal.green});
  text(fv > 0 ? `${preset.count}件・${preset.time}` : '書き出し前', fl.x + 10, fl.y + 33, 11, {color: pal.ink, max: fl.w - 18});
  text('メモ付き・入力順', fl.x + 10, fl.y + 48, 11, {color: pal.sub, max: fl.w - 18});
  ctx.globalAlpha = alpha('file');
  ring(fl.x, fl.y, fl.w, fl.h, s.pulse.file, pal.green);

  const vf = L.verify;
  ctx.globalAlpha = alpha('verify');
  rrect(ctx, vf.x, vf.y, vf.w, vf.h, 3); ctx.fillStyle = pal.bg; ctx.fill(); outline('verify', 1.2, [3, 2.5]);
  text('制作担当・別工程', vf.x + 6, vf.y + 14, 11, {weight: 700, max: vf.w - 12});
  text('Node8条件・実DL確認', vf.x + 6, vf.y + 27, 11, {color: pal.sub, max: vf.w - 12});
  ring(vf.x, vf.y, vf.w, vf.h, s.pulse.verify);

  // Small things in flight.
  for (const token of s.tokens) {
    if (!token.live) continue;
    const [tx, ty] = pointAt(L.paths[token.path], token.p);
    ctx.globalAlpha = 1;
    drawToken(ctx, token.kind, tx, ty, pal);
  }
  ctx.restore();
}

const LABELS = {area: '押せる範囲', numbers: '数字と状態', button: '押下と手渡し'};

// The same delivery-note page, drawn from the selected preset. Each patch blends the original before look into
// the original after look; the drawn sizes are illustrative, not measurements of the real UI.
function drawPage(ctx, L, s, pal, h) {
  const {size, text, hot, pageHot, alpha} = h;
  const P = L.page, g = pageGeom(P), preset = s.preset;
  const base = alpha('page');
  ctx.globalAlpha = base;
  rrect(ctx, P.x, P.y, P.w, P.h, 8); ctx.fillStyle = pal.paper; ctx.fill();
  ctx.lineWidth = pageHot ? 2 : 1.4; ctx.strokeStyle = pageHot ? pal.blue : pal.ink; ctx.stroke();
  text('納品メモ', P.x + 8, P.y + 20, 12, {weight: 700});
  const patchRing = (id, x, y, w, hh) => {
    if (!hot('patch:' + id)) return;
    rrect(ctx, x - 3, y - 3, w + 6, hh + 6, 5); ctx.lineWidth = 1.6; ctx.strokeStyle = pal.blue; ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]);
  };

  // 2. Totals: one proportional string → anchored tabular slots that roll in place.
  const T = g.totals, fn = s.fix.numbers;
  const target = {count: String(preset.count), time: preset.time};
  const from = s.from === 'blank' ? {count: '–', time: '--:--'} : s.from ? {count: String(FROZEN[s.from].count), time: FROZEN[s.from].time} : target;
  const roll = s.from ? s.roll : 1;
  const fs = 12, cy = T.y + 16;
  if (fn < 1) {
    ctx.globalAlpha = base * (1 - fn);
    const shown = roll < 0.5 ? from : target;
    text(`${shown.count}件 / ${shown.time}`, T.x + T.w - 3, cy, fs, {weight: 600, align: 'right', color: pal.sub});
  }
  if (fn > 0) {
    ctx.globalAlpha = base * fn;
    ctx.font = `600 ${size(fs)}px ${FONT}`;
    const cw = Math.max(7.6, ctx.measureText('0').width + 1.6);
    const kanjiW = ctx.measureText('件 / ').width;
    const cells = 1 + 5;
    let x = T.x + T.w - 3 - cells * cw - kanjiW;
    const slot = (oldC, newC, cx) => {
      ctx.fillStyle = pal.greenSoft; ctx.fillRect(cx + 0.5, T.y + 3, cw - 1, T.h - 6);
      ctx.save();
      ctx.beginPath(); ctx.rect(cx, T.y + 2, cw, T.h - 4); ctx.clip();
      const dy = (T.h - 6) * ease(roll);
      if (oldC !== newC && roll < 1) text(oldC, cx + cw / 2, cy - dy, fs, {weight: 600, align: 'center'});
      text(newC, cx + cw / 2, oldC !== newC ? cy + (T.h - 6) - dy : cy, fs, {weight: 600, align: 'center'});
      ctx.restore();
    };
    slot(from.count, target.count, x); x += cw;
    text('件 / ', x, cy, fs, {weight: 600, color: pal.sub}); x += kanjiW;
    for (let i = 0; i < 5; i++) { slot(from.time[i], target.time[i], x); x += cw; }
  }
  ctx.globalAlpha = base;
  patchRing('numbers', T.x, T.y, T.w, T.h);

  // 1. Rows: the hit area grows from the 16 px box to the whole native label row, with a visible focus ring.
  const fa = s.fix.area;
  const selected = new Set(preset.ids);
  CLIPS.forEach(([id], i) => {
    const R = g.rows[i];
    const on = selected.has(id);
    const boxS = lerp(7, 9, fa);
    const bx = R.x + 5, by = R.y + R.h / 2 - boxS / 2;
    const hx = lerp(bx - 2, R.x, fa), hy = lerp(by - 2, R.y, fa), hw = lerp(boxS + 4, R.w, fa), hh = lerp(boxS + 4, R.h, fa);
    ctx.globalAlpha = base;
    ctx.fillStyle = pal.greenSoft; rrect(ctx, hx, hy, hw, hh, 3); ctx.fill();
    if (fa < 1) { ctx.globalAlpha = base * (1 - fa); ctx.setLineDash([2, 2]); ctx.lineWidth = 1; ctx.strokeStyle = pal.accent; ctx.stroke(); ctx.setLineDash([]); }
    ctx.globalAlpha = base;
    if (i === s.focusRow && fa > 0.6) {
      rrect(ctx, R.x - 2, R.y - 2, R.w + 4, R.h + 4, 4);
      ctx.lineWidth = 2; ctx.strokeStyle = pal.green; ctx.stroke();
    }
    ctx.fillStyle = on ? pal.green : pal.paper; ctx.fillRect(bx, by, boxS, boxS);
    ctx.lineWidth = 1; ctx.strokeStyle = pal.green; ctx.strokeRect(bx, by, boxS, boxS);
    if (on) {
      ctx.beginPath(); ctx.moveTo(bx + boxS * 0.22, by + boxS * 0.52); ctx.lineTo(bx + boxS * 0.42, by + boxS * 0.72); ctx.lineTo(bx + boxS * 0.8, by + boxS * 0.28);
      ctx.lineWidth = 1.3; ctx.strokeStyle = pal.onGreen; ctx.stroke();
    }
    text(`${id} ${s.titles[id]}`, R.x + 20, R.y + R.h / 2 + 4, 11, {weight: on ? 600 : 500, color: on ? pal.ink : pal.sub, max: R.w - 64});
    text(s.times[id], R.x + R.w - 5, R.y + R.h / 2 + 4, 11, {align: 'right', color: pal.sub});
  });
  patchRing('area', g.rows[0].x, g.rows[0].y, g.rows[0].w, g.rows[2].y + g.rows[2].h - g.rows[0].y);

  // Notes option: always on in the three saved presets.
  const O = g.option;
  ctx.globalAlpha = base;
  ctx.fillStyle = pal.green; ctx.fillRect(O.x + 6, O.y + 5, 8, 8);
  text('メモを含める', O.x + 20, O.y + 13, 11, {color: pal.sub});

  // 3. The button: press 0.86 → 0.96, colour-only done → icon and words; the file is handed to the browser.
  const B = g.button;
  ctx.save();
  ctx.translate(B.x + B.w / 2, B.y + B.h / 2);
  ctx.scale(s.press, s.press);
  rrect(ctx, -B.w / 2, -B.h / 2, B.w, B.h, 6);
  ctx.fillStyle = s.gold ? pal.gold : pal.green; ctx.fill();
  const ix = -B.w / 2 + 14, icon = s.fix.button > 0.5 ? s.icon : 0;
  ctx.lineWidth = 1.6; ctx.strokeStyle = pal.onGreen;
  if (icon < 1) {
    ctx.save(); ctx.globalAlpha = base * (1 - icon); ctx.translate(ix, 0); ctx.scale(lerp(1, 0.25, icon), lerp(1, 0.25, icon));
    ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(0, 3); ctx.moveTo(-3.5, -0.5); ctx.lineTo(0, 3); ctx.lineTo(3.5, -0.5);
    ctx.moveTo(-6, 3); ctx.lineTo(-6, 6.5); ctx.lineTo(6, 6.5); ctx.lineTo(6, 3); ctx.stroke(); ctx.restore();
  }
  if (icon > 0) {
    ctx.save(); ctx.globalAlpha = base * icon; ctx.translate(ix, 0); ctx.scale(lerp(0.25, 1, icon), lerp(0.25, 1, icon));
    ctx.beginPath(); ctx.moveTo(-5.5, 0.5); ctx.lineTo(-1.5, 4.5); ctx.lineTo(6, -4); ctx.stroke(); ctx.restore();
  }
  ctx.globalAlpha = base;
  text('JSONを書き出す', -B.w / 2 + 26, 4, 11, {weight: 700, color: pal.onGreen, max: B.w - 32});
  ctx.restore();
  if (s.pressLabel) text('×' + s.pressLabel, B.x + B.w + 6, B.y + 17, 12, {weight: 700, color: pal.accent});
  if (s.status > 0 && s.fix.button > 0.5) {
    ctx.globalAlpha = base * s.status;
    text('ブラウザーへ渡しました', g.status[0], g.status[1], 11, {weight: 700, color: pal.green, max: P.w - 16});
  }
  ctx.globalAlpha = base;
  patchRing('button', B.x, B.y, B.w, B.h);

  // Marks left by the lens, on the page edge where each chip's leader starts.
  GROUP_IDS.forEach((id, i) => {
    const m = s.marks[i];
    if (!(m > 0)) return;
    const x = P.x + P.w, y = g.marks[id];
    ctx.globalAlpha = base * m;
    ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fillStyle = pal.accent; ctx.fill();
    text(String(i + 1), x, y + 4, 11, {weight: 700, align: 'center', color: pal.onGreen});
  });

  // The lens of the review, only while it is reading.
  if (s.lens && s.lens.alpha > 0) {
    const [lx, ly] = lensAt(h.kind, s.lens, h.e);
    ctx.globalAlpha = s.lens.alpha;
    ctx.beginPath(); ctx.arc(lx, ly, 19, 0, Math.PI * 2);
    ctx.fillStyle = pal.accentSoft; ctx.globalAlpha = s.lens.alpha * 0.35; ctx.fill();
    ctx.globalAlpha = s.lens.alpha; ctx.lineWidth = 2.4; ctx.strokeStyle = pal.accent; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(lx + 13.5, ly + 13.5); ctx.lineTo(lx + 22, ly + 22); ctx.lineWidth = 4; ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawToken(ctx, kind, x, y, pal) {
  const sheet = (cx, cy, w, hh, fill, edge) => {
    ctx.fillStyle = fill; ctx.fillRect(cx - w / 2, cy - hh / 2, w, hh);
    ctx.lineWidth = 1.2; ctx.strokeStyle = edge; ctx.strokeRect(cx - w / 2, cy - hh / 2, w, hh);
  };
  switch (kind) {
    case 'sheet':
      sheet(x, y, 12, 15, pal.paper, pal.ink);
      ctx.fillStyle = pal.blue; ctx.fillRect(x + 4, y - 6, 2, 12);
      break;
    case 'req':
      sheet(x, y, 11, 14, pal.paper, pal.ink);
      ctx.fillStyle = pal.rule; ctx.fillRect(x - 3.5, y - 2, 7, 1.2); ctx.fillRect(x - 3.5, y + 2, 7, 1.2);
      break;
    case 'screen':
      sheet(x, y, 16, 12, pal.paper, pal.ink);
      ctx.fillStyle = pal.green; ctx.fillRect(x - 6, y + 2, 7, 2.5);
      break;
    case 'cross':
      ctx.beginPath(); ctx.moveTo(x - 4, y - 4); ctx.lineTo(x + 4, y + 4); ctx.moveTo(x + 4, y - 4); ctx.lineTo(x - 4, y + 4);
      ctx.lineWidth = 2; ctx.strokeStyle = pal.accent; ctx.stroke();
      break;
    case 'clip':
      sheet(x, y, 10, 12, pal.paper, pal.sub);
      break;
    default:
      sheet(x, y, 11, 14, pal.paper, pal.green);
      ctx.fillStyle = pal.green; ctx.fillRect(x - 3.5, y - 1, 7, 2);
  }
}

// ---- Page ------------------------------------------------------------------------------------------------------

const STAGE_NOTES = [
  'SKILL.md（19原則＋5参照）と依頼文、今の画面のファイルを、元のAIが一度読みました。いまこのページでAIは動きません。',
  '元のAIのレビューと修正を、制作担当が3群に整理した図です。変えない3案も残しています。',
  '同じ clips.json と export.mjs から同じJSON。押すとブラウザーへ渡します。実検証は制作担当の別工程です。',
];
const GROUP_NOTES = {
  area: '16pxのチェックだけ → 行全体をネイティブのlabelへ、見えるフォーカス。図の大きさは実寸ではありません。',
  numbers: '件数と時間を等幅の升に固定し、値が変わっても幅が動きません。0件と読み込み失敗には理由を出します。',
  button: '押下0.86 → 0.96。色だけの完了 → アイコンと「ブラウザーへ渡しました」。ディスク保存の完了ではありません。',
};

function defaultNote(p) {
  return `${p.count}件・${p.time}・${p.bytes}B。元の export.mjs を呼んだ結果が保存済みの ${p.path} と一致しました。`;
}

function initPage() {
  const root = document.documentElement;
  const $ = id => document.getElementById(id);
  const canvas = $('concept-map');
  const ctx = canvas.getContext('2d');
  const figure = canvas.parentElement;
  const caseButtons = [...document.querySelectorAll('button[data-case]')];
  const stageButtons = [...document.querySelectorAll('button[data-stage]')];
  const groupButtons = [...document.querySelectorAll('button[data-group]')];
  const partButtons = [...document.querySelectorAll('button[data-part]')];
  const assetLinks = [...document.querySelectorAll('a[data-asset-link]')];
  const summarySteps = [...document.querySelectorAll('#map-summary [data-step]')];
  const replay = $('replay'), retry = $('retry'), status = $('load-status'), meta = $('case-meta'), note = $('phase-note');
  const saveRecord = $('save-record'), saveStatus = $('save-status'), openDesk = $('open-desk');
  const recordContent = $('record-content'), recordName = $('record-name');
  const requestText = $('request-text'), copyButton = $('copy-request'), copyStatus = $('copy-status');
  const partFields = ['part-label', 'part-meaning', 'part-quote'].map($);
  const partSource = $('part-source'), partLocal = $('part-local');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const dark = matchMedia('(prefers-color-scheme: dark)');
  const controls = [...caseButtons, ...stageButtons, ...groupButtons, ...partButtons, replay, copyButton, saveRecord];

  let assets = null, generation = 0, controller = null;
  let caseId = 'all', stage = null, group = null, part = -1, anim = null, raf = 0;

  const schedule = () => { if (!raf) raf = requestAnimationFrame(paint); };

  // The state on screen: a stage, a group, or the whole settled map. Replay with nothing chosen runs all stages.
  function currentState(elapsed) {
    if (anim && anim.all) {
      let t = elapsed, st = 0;
      while (st < 3 && t >= STAGE_TIMES[st]) { t -= STAGE_TIMES[st]; st++; }
      if (st < 3) return {s: stageState(assets, caseId, st, t), e: t, running: true};
      return {s: finalState(assets, caseId), e: 0, running: false};
    }
    if (group) {
      const e = Math.min(elapsed, GROUP_TIME);
      return {s: groupState(assets, caseId, group, e), e, running: !!anim && elapsed < GROUP_TIME};
    }
    if (stage !== null) {
      const e = Math.min(elapsed, STAGE_TIMES[stage]);
      return {s: stageState(assets, caseId, stage, e), e, running: !!anim && elapsed < STAGE_TIMES[stage]};
    }
    return {s: finalState(assets, caseId), e: 0, running: false};
  }

  function paint(now) {
    raf = 0;
    const box = canvas.getBoundingClientRect();
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(box.width * dpr)), h = Math.max(1, Math.round(box.height * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (!assets) return;
    const elapsed = anim ? (now - anim.start) / 1000 : Infinity;
    const {s, e, running} = currentState(elapsed);
    if (part >= 0) s.focus = PART_FOCUS[PART_IDS[part]];
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Canvas units are CSS pixels here, so the 11 px label floor is in CSS pixels.
    drawMap(ctx, canvas.dataset.layout, {x: 0, y: 0, w: box.width, h: box.height}, s, dark.matches ? PALETTES.dark : PALETTES.light, 1, e);
    ctx.restore();
    if (running) raf = requestAnimationFrame(paint);
    else anim = null;
  }

  function fitLayout() {
    const layout = figure.clientWidth >= 600 ? 'wide' : 'portrait';
    if (canvas.dataset.layout !== layout) canvas.dataset.layout = layout;
    schedule();
  }

  function setLink(link, target) {
    link.dataset.assetLink = target;
    if (root.dataset.state === 'ready') link.href = target;
  }

  function updateNote() {
    if (!assets) { note.textContent = ''; return; }
    if (group) note.textContent = GROUP_NOTES[group];
    else if (stage !== null) note.textContent = STAGE_NOTES[stage];
    else note.textContent = defaultNote(assets.presets[caseId]);
  }

  function startAnim(all) {
    anim = reduced.matches ? null : {start: performance.now(), all};
    schedule();
  }

  function selectCase(id, writeHash) {
    caseId = id;
    for (const button of caseButtons) button.setAttribute('aria-pressed', String(button.dataset.case === id));
    const p = assets.presets[id];
    meta.textContent = `${p.ids.join('・')} → ${p.count}件・${p.time}・${p.bytes}B`;
    setLink(openDesk, `desk.html#${id}`);
    recordName.textContent = `${FILE_NAME}（${p.path} と同じ ${p.bytes}B）`;
    recordContent.textContent = p.text;
    saveStatus.textContent = '';
    updateNote();
    if (writeHash) history.replaceState(null, '', '#' + id);
    if (stage !== null || group) startAnim(false); else schedule();
  }

  function pressOnly(buttons, attr, value) {
    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset[attr] === value));
  }

  function selectStage(next, animate) {
    stage = next;
    group = null;
    part = -1;
    pressOnly(partButtons, 'part', '');
    pressOnly(groupButtons, 'group', '');
    pressOnly(stageButtons, 'stage', next === null ? '' : String(next));
    for (const step of summarySteps) {
      if (next !== null && Number(step.dataset.step) === next) step.setAttribute('aria-current', 'step');
      else step.removeAttribute('aria-current');
    }
    updateNote();
    if (animate) startAnim(next === null); else { anim = null; schedule(); }
  }

  function selectGroup(id) {
    group = id;
    stage = null;
    part = -1;
    pressOnly(partButtons, 'part', '');
    pressOnly(stageButtons, 'stage', '');
    pressOnly(groupButtons, 'group', id);
    for (const step of summarySteps) step.removeAttribute('aria-current');
    updateNote();
    startAnim(false);
  }

  function fillPart(index) {
    const p = assets.parts[index];
    partFields[0].textContent = p.label;
    partFields[1].textContent = p.meaning;
    partFields[2].textContent = p.quote;
    partSource.href = `https://github.com/${REPO}/blob/${COMMIT}/${p.upstream_path}#L${p.line_start}`;
    partSource.textContent = `GitHub ${p.upstream_path}#L${p.line_start}`;
    partLocal.href = p.source_path;
    partLocal.textContent = `${p.source_path}:${p.line_start}`;
  }

  function selectPart(index) {
    part = index;
    pressOnly(partButtons, 'part', PART_IDS[index]);
    fillPart(index);
    schedule();
  }

  function hashCase() {
    let id = '';
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { id = ''; }
    return CASE_IDS.includes(id) ? id : 'all';
  }

  function setControls(enabled) {
    for (const control of controls) control.disabled = !enabled;
    for (const link of assetLinks) {
      if (enabled) { link.href = link.dataset.assetLink; link.removeAttribute('aria-disabled'); }
      else { link.removeAttribute('href'); link.setAttribute('aria-disabled', 'true'); }
    }
  }

  function clearResults() {
    anim = null;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    meta.textContent = '';
    note.textContent = '';
    saveStatus.textContent = '';
    for (const field of partFields) field.textContent = '';
    for (const link of [partSource, partLocal]) { link.removeAttribute('href'); link.textContent = ''; }
    requestText.value = '';
    copyStatus.textContent = '';
    recordContent.textContent = '';
    recordName.textContent = '';
  }

  function ready() {
    root.dataset.state = 'ready';
    setControls(true);
    requestText.value = assets.request;
    // Short on purpose: it shares the readout line under the map on a 320 px phone. Details are below the fold.
    status.textContent = `${TOTAL_FILES}件と実計算を確認済み`;
    fillPart(0);
    selectStage(null, false);
    selectCase(hashCase(), false);
  }

  function failed(error) {
    root.dataset.state = 'error';
    assets = null;
    clearResults();
    setControls(false);
    const reason = error instanceof LoadError ? error.message : '読み込み中に予期しないエラーが起きました';
    status.textContent = `読み込みを止めました。${reason}。図・JSON・引用・依頼文は表示していません。`;
    retry.hidden = false;
    retry.disabled = false;
  }

  async function load() {
    const mine = ++generation;
    if (controller) controller.abort();
    controller = new AbortController();
    assets = null;
    root.dataset.state = 'loading';
    clearResults();
    setControls(false);
    retry.hidden = true;
    retry.disabled = true;
    status.textContent = `確認中 0/${TOTAL_FILES}`;
    try {
      const loaded = await loadAssets({signal: controller.signal, onProgress(info) {
        if (mine !== generation) return;
        status.textContent = `確認中 ${info.done}/${info.total}`;
      }});
      if (mine !== generation) return;
      assets = loaded;
      ready();
    } catch (error) {
      if (mine !== generation) return;
      failed(error);
    }
  }

  // Hands the exact string export.mjs returned (already equal to the saved file) to the browser as a download.
  function saveJson() {
    if (!assets) return;
    const p = assets.presets[caseId];
    let url = null;
    try {
      url = URL.createObjectURL(new Blob([p.text], {type: 'application/json;charset=utf-8'}));
      const link = document.createElement('a');
      link.href = url; link.download = FILE_NAME; link.rel = 'noopener';
      document.body.append(link); link.click(); link.remove();
      saveStatus.textContent = `${FILE_NAME}（${p.count}件・${p.bytes}B）をブラウザーへ渡しました。保存できたかはブラウザーのダウンロード表示で確かめてください。`;
    } catch {
      saveStatus.textContent = 'ブラウザーへ渡せませんでした。下の「保存した元のファイル」から開いてください。';
    } finally {
      if (url) setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
  }

  for (const button of caseButtons) button.addEventListener('click', () => selectCase(button.dataset.case, true));
  for (const button of stageButtons) button.addEventListener('click', () => selectStage(Number(button.dataset.stage), true));
  for (const button of groupButtons) button.addEventListener('click', () => selectGroup(button.dataset.group));
  for (const button of partButtons) button.addEventListener('click', () => selectPart(PART_IDS.indexOf(button.dataset.part)));
  replay.addEventListener('click', () => (group ? selectGroup(group) : selectStage(stage, true)));
  retry.addEventListener('click', load);
  saveRecord.addEventListener('click', saveJson);
  copyButton.addEventListener('click', async () => {
    if (!assets) return;
    copyStatus.textContent = '';
    try {
      await navigator.clipboard.writeText(assets.request);
      copyStatus.textContent = '依頼文をコピーしました。';
    } catch {
      requestText.focus();
      requestText.select();
      copyStatus.textContent = 'コピーできませんでした。文を選んだので、長押しか Ctrl+C でコピーしてください。';
    }
  });
  window.addEventListener('hashchange', () => { if (assets) selectCase(hashCase(), false); });
  dark.addEventListener('change', schedule);
  new ResizeObserver(fitLayout).observe(figure);
  fitLayout();
  load();
}

if (typeof document !== 'undefined' && document.getElementById('concept-map')) initPage();
