// 八百万図AIツールボックス: Motion Primitives concept map (visual-r1).
// One connected picture of what Motion Primitives is in this example: a collection of React animation components, from
// which one Accordion source was copied by the documented Manual route (no npm package called motion-primitives, no
// Agent Skill, no model or search API). It shows who wrote the example (one original author AI) and who built and
// checked it (the production operator, separately), then the runtime nesting App → Accordion (MotionConfig + Provider)
// → Item → Trigger / Content, the return path from the native button back to the App's state, and the unchanged JSON
// the original page saved. Every drawn state is one of the 15 states the operator recorded in a real browser; the
// motion between two of them is an explanation, not the component running and not a screen recording. The real
// Accordion still runs in desk.html.
// The browser reads only the 22 frozen files in concept/manifest.json and checks size, SHA-256 and meaning. It never
// calls a model, rebuilds, or reruns the original browser checks.
// video/video.js imports this module for the 32 s film; importing it does not start the page UI.

const BASE = new URL('./', import.meta.url);
const MANIFEST_PATH = 'concept/manifest.json';
const MANIFEST_SHA = '5fcd230bdc6adf3f43f83ccb587e4cde5de901ed3fdd59937a1dc9f4ffae3c9f';
const CASE = 'motion-primitives-example';
export const COMMIT = '120f64f6ca60348e251f929e9c81f11ccbe45eda';
export const REPO = 'ibelick/motion-primitives';
export const TOTAL_FILES = 22;
export const CASE_IDS = ['search-two', 'open-pdf', 'switch-images', 'manual-reduced', 'empty'];
export const PART_IDS = ['copy', 'state', 'container', 'item', 'trigger', 'content'];
export const DOWNLOAD_NAME = 'downloaded-state.json';

const ACC = 'vendor/motion-primitives/accordion.original.tsx';
const DOCS = 'vendor/motion-primitives/accordion-docs.mdx';
const UP_ACC = 'components/core/accordion.tsx';
// The five saved observations behind the case buttons, by their index among the 15 recorded states.
const CASE_STATE = {'search-two': 2, 'open-pdf': 3, 'switch-images': 4, 'manual-reduced': 11, empty: 9};
const STATE_LABELS = ['initial', 'draft-only', 'search-two', 'open-pdf', 'switch-images', 'close-images', 'keyboard-pdf',
  'fullwidth-pdf', 'and-query', 'empty', 'reset', 'manual-reduced', 'os-reduced', 'error', 'retry'];
const SAMPLE_IDS = STATE_LABELS.filter(label => !['initial', 'draft-only', 'reset'].includes(label));
const OP_FALLBACK = {initial: '最初の表示（全6件）', 'draft-only': '検索欄へ入力しただけ（未検索）', reset: 'リセットで全件へ'};
const RECORD_IDS = ['export-pdf', 'export-images', 'input-materials', 'review-comment', 'name-files', 'share-link'];
const NOT = ['Agent SkillのMarkdown指示書', 'npmのmotion-primitivesパッケージ', 'AI推論API', '検索エンジン'];
const DOWNLOAD = {
  path: 'outputs/downloaded-state.json', bytes: 2529,
  sha256: 'd4e218264c3e346ba769d42082f13b9c104bb86ca008442759ee529f92fdd95b', savedAt: '2026-10-16T08:39:23.439Z',
};
// Fixed upstream files and their SHA-256 at the commit (raw bytes matched the official Git tree in the original run).
const UPSTREAM = {
  'vendor/motion-primitives/README.md': ['README.md', '104fe086b717c6e68274965445d49e7b433b5ec5e0c13bc9056804e74e39d69a'],
  'vendor/motion-primitives/LICENCE.md': ['LICENCE.md', 'f668f5ef3635eb906f10b1eea9a32e449eb6e1a183ab6879ef6d56c0980dd2f3'],
  [ACC]: [UP_ACC, '5de8206a53d083d3c5d4503fc4d203efaed734ea904de4fd77b33c1ebc991b7c'],
  'vendor/motion-primitives/utils.ts': ['lib/utils.ts', '9304a861c8673bee09e0f12de31773abbde503b02e59dfd74763ddec2e37cf05'],
  [DOCS]: ['app/docs/accordion/page.mdx', '937ecde7a7c0133d136074fe75d78593ecb2937e3448f55fd099efbb120fc6f1'],
  'vendor/motion-primitives/accordion-basic.tsx': ['app/docs/accordion/accordion-basic.tsx', 'f599cc966f9702df0a54278763d16bdddbf48fdbff4ef669e8ab8084a4e8947a'],
  'vendor/motion-primitives/accordion-variant.tsx': ['app/docs/accordion/accordion-variant.tsx', '16d4cfa4f906598917e1f0b8c6ae33611eb3fce8baa2889636f905904c911c3a'],
};
// The six frozen quotes: shipped file, upstream path, line at the fixed commit, exact text.
const QUOTES = {
  copy: [DOCS, 'app/docs/accordion/page.mdx', 51, "<TabsTrigger value='manual'>Manual</TabsTrigger>"],
  state: [ACC, UP_ACC, 38, 'function AccordionProvider({'],
  container: [ACC, UP_ACC, 77, 'function Accordion({'],
  item: [ACC, UP_ACC, 106, 'function AccordionItem({ value, children, className }: AccordionItemProps) {'],
  trigger: [ACC, UP_ACC, 134, 'function AccordionTrigger({'],
  content: [ACC, UP_ACC, 161, 'function AccordionContent({'],
};
// Lines of the protected original sources the drawing stands for. Read as text, never edited.
const SOURCE_FACTS = [
  ['src/app.tsx', "return text.normalize('NFKC').toLowerCase();"],
  ['src/app.tsx', "[record.title, record.category, record.summary, ...record.body, ...record.tags].join('\\n')"],
  ['src/app.tsx', '.filter(({ text }) => terms.every((term) => text.includes(term)))'],
  ['src/app.tsx', 'setQuery(next.trim());'],
  ['src/app.tsx', 'onSubmit={onSubmit}'],
  ['src/app.tsx', "const FULL_TRANSITION: Transition = { duration: 0.18, ease: 'easeOut' };"],
  ['src/app.tsx', 'const REDUCED_TRANSITION: Transition = { duration: 0 };'],
  ['src/app.tsx', 'const effectiveReduced = osReduced || manualReduced;'],
  ['src/app.tsx', 'expandedValue={expandedId}'],
  ['src/app.tsx', 'onValueChange={(value) => setExpanded(value === null ? null : String(value))}'],
  ['src/app.tsx', 'transition={effectiveReduced ? REDUCED_TRANSITION : FULL_TRANSITION}'],
  ['src/app.tsx', '<AccordionItem value={record.id} className="result-item">'],
  ['src/accordion.tsx', 'const newValue = expandedValue === value ? null : value;'],
  ['src/accordion.tsx', '<MotionConfig transition={transition}>'],
  ['src/accordion.tsx', 'onClick={() => value !== undefined && toggleItem(value)}'],
  ['src/accordion.tsx', '<AnimatePresence initial={false}>'],
  ['src/accordion.tsx', "import { cn } from '../vendor/motion-primitives/utils';"],
  [ACC, "import { cn } from '@/lib/utils';"],
  ['vendor/motion-primitives/accordion-adapter.patch', "+import { cn } from '../vendor/motion-primitives/utils';"],
];
// The four original screenshots (supporting evidence) and their pixel sizes.
export const SCREENS = {
  'video/assets/phone.png': [375, 812], 'video/assets/search.png': [1265, 889],
  'video/assets/pdf.png': [1265, 2023], 'video/assets/images.png': [1265, 2023],
};
const EXPECTED = [
  'concept/original-run.json', 'concept/structure.json', 'dependency-versions.json', 'input/articles.json',
  DOWNLOAD.path, 'outputs/operations.json', 'request.txt', 'samples.json', 'src/accordion.tsx', 'src/app.tsx',
  'vendor/motion-primitives/accordion-adapter.patch', ...Object.keys(UPSTREAM), ...Object.keys(SCREENS),
];

export const assetURL = path => new URL(path, BASE).href;

export class LoadError extends Error {}
const fail = message => new LoadError(message);
const check = (ok, message) => { if (!ok) throw fail(message); };
const utf8 = new TextDecoder('utf-8', {fatal: true});
const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const hasOwn = (o, key) => Object.prototype.hasOwnProperty.call(o, key);

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

function pngSize(buffer) {
  const b = new DataView(buffer);
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (buffer.byteLength < 24 || !sig.every((v, i) => b.getUint8(i) === v)) return null;
  return [b.getUint32(16), b.getUint32(20)];
}

// The example App's search rule, re-derived only to check that the saved observations follow it.
const norm = text => text.normalize('NFKC').toLowerCase();
function searchIds(records, query) {
  const terms = norm(query).split(/\s+/).filter(Boolean);
  return records.filter(r => {
    const text = norm([r.title, r.category, r.summary, ...r.body, ...r.tags].join('\n'));
    return terms.every(term => text.includes(term));
  }).map(r => r.id);
}

// Loads the 22 frozen files named by concept/manifest.json and checks size, SHA-256 and meaning. Nothing is fetched
// again per frame.
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
    const sizes = new Map(entries.map(entry => [entry.path, entry.bytes]));
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
    try {
      return validate(text, path => readJSON(path, text(path)), hashes, sizes, path => bytes.get(path));
    } catch (error) {
      throw error instanceof LoadError ? error : fail('保存記録の形が想定と違います');
    }
  } catch (error) {
    local.abort();
    throw error;
  } finally {
    if (signal) signal.removeEventListener('abort', abort);
  }
}

// Meaning checks on the saved records. They read what the original production wrote; they are not a new test run.
function validate(text, json, hashes, sizes, raw) {
  const structure = json('concept/structure.json');
  check(isObj(structure) && structure.id === CASE && structure.source_commit === COMMIT &&
    structure.kind === 'Reactのアニメーション付きUI部品集', 'structure.json の識別子・固定コミット・種類が違います');
  check(Array.isArray(structure.not) && NOT.every(n => structure.not.includes(n)), 'structure.json の「ではないもの」が違います');
  const parts = Array.isArray(structure.parts) ? structure.parts : [];
  check(parts.map(p => (isObj(p) ? p.id : null)).join() === PART_IDS.join(), 'structure.json の6部品が違います');
  for (const part of parts) {
    const [localPath, upstream, line, quote] = QUOTES[part.id];
    check(part.source_path === localPath && part.upstream_path === upstream && part.line_start === line && part.quote === quote &&
      part.source_url === `https://github.com/${REPO}/blob/${COMMIT}/${upstream}#L${line}` &&
      typeof part.label === 'string' && part.label !== '' && typeof part.meaning === 'string' && part.meaning !== '',
    `${part.id}：引用の記録が違います`);
    const lines = text(localPath).split(/\r?\n/);
    check(typeof lines[line - 1] === 'string' && lines[line - 1].includes(quote), `${localPath}:${line} に引用の文がありません`);
    check(UPSTREAM[localPath][0] === upstream, `${localPath} の原典の場所が違います`);
  }
  for (const [path, [, sha]] of Object.entries(UPSTREAM)) check(hashes.get(path) === sha, `${path} が固定コミットの原典と違います`);

  const cases = Array.isArray(structure.cases) ? structure.cases : [];
  check(cases.map(c => (isObj(c) ? c.id : null)).join() === CASE_IDS.join() &&
    cases.every(c => c.state_index === CASE_STATE[c.id] && typeof c.label === 'string' && c.label !== ''),
  'structure.json の5つの記録が違います');
  const dlMeta = isObj(structure.download) ? structure.download : {};
  check(dlMeta.path === DOWNLOAD.path && dlMeta.bytes === DOWNLOAD.bytes && dlMeta.sha256 === DOWNLOAD.sha256 &&
    hashes.get(DOWNLOAD.path) === DOWNLOAD.sha256 && sizes.get(DOWNLOAD.path) === DOWNLOAD.bytes,
  'structure.json の元の実JSONの記録が違います');
  check(isObj(structure.legacy) && structure.legacy.interactive_demo === 'desk.html' && structure.legacy.old_editor === 'video/legacy.html',
    'structure.json の元画面の場所が違います');
  const motion = isObj(structure.motion) ? structure.motion : {};
  check(motion.normal_duration_setting === 0.18 && motion.reduced_duration_setting === 0, 'structure.json の動きの設定値が違います');
  check(isObj(structure.search) && same(structure.search.scope, ['title', 'category', 'summary', 'body', 'tags']),
    'structure.json の検索範囲が違います');
  check(Array.isArray(structure.hierarchy) && structure.hierarchy.length === 5, 'structure.json の入れ子の記録が違います');

  const articles = json('input/articles.json');
  const records = isObj(articles) && Array.isArray(articles.records) ? articles.records : [];
  check(typeof articles.title === 'string' && typeof articles.scope_note === 'string' &&
    records.map(r => (isObj(r) ? r.id : null)).join() === RECORD_IDS.join() &&
    records.every(r => ['title', 'category', 'summary'].every(key => typeof r[key] === 'string' && r[key] !== '') &&
      Array.isArray(r.body) && r.body.length > 0 && r.body.every(p => typeof p === 'string') &&
      Array.isArray(r.tags) && r.tags.length > 0 && r.tags.every(t => typeof t === 'string')),
  'input/articles.json の架空の手順書6件が違います');
  const byId = new Map(records.map(r => [r.id, r]));

  const original = json('concept/original-run.json');
  const operations = json('outputs/operations.json');
  const states = isObj(original) && Array.isArray(original.states) ? original.states : [];
  check(states.length === 15 && isObj(operations) && Array.isArray(operations.observed_states) &&
    same(states, operations.observed_states), '元の15状態が operations.json と違います');
  check(operations.input_sha256 === hashes.get('input/articles.json'), 'operations.json の入力ハッシュが違います');
  states.forEach((st, i) => {
    const where = `記録${i + 1}（${STATE_LABELS[i]}）`;
    check(isObj(st) && st.label === STATE_LABELS[i] && typeof st.query === 'string' && typeof st.draft === 'string' &&
      typeof st.ready === 'boolean' && typeof st.alert === 'string' &&
      Array.isArray(st.matching_ids) && typeof st.expanded_id === 'string' && isObj(st.mode) &&
      typeof st.mode.manual === 'boolean' && typeof st.mode.os === 'boolean' && st.mode.reduced === (st.mode.manual || st.mode.os) &&
      Array.isArray(st.expanded_buttons) && Array.isArray(st.regions), `${where} の形が違います`);
    if (st.ready) {
      check(same(st.matching_ids, searchIds(records, st.query)), `${where}：保存した一致idが検索の規則と合いません`);
      const id = st.expanded_id;
      if (id) {
        const r = byId.get(id);
        const button = st.expanded_buttons[0], region = st.regions[0];
        check(st.matching_ids.includes(id) && st.expanded_buttons.length === 1 && st.regions.length === 1 &&
          isObj(button) && button.id === `guide-trigger-${id}` && button.controls === `guide-panel-${id}` &&
          button.text === r.category + r.title && isObj(region) && region.id === `guide-panel-${id}` &&
          region.labelled_by === `guide-trigger-${id}` && same(region.paragraphs, r.body), `${where}：開いた1件の記録が違います`);
      } else {
        check(st.expanded_buttons.length === 0 && st.regions.length === 0, `${where}：閉じた状態の記録が違います`);
      }
    } else {
      check(st.matching_ids.length === 0 && st.alert !== '', `${where}：読み込み失敗の記録が違います`);
    }
  });
  check(states[1].draft === '書き出し' && states[1].query === '' && states[1].matching_ids.length === 6,
    '入力しただけの記録が全6件のままではありません');
  const runtime = isObj(original.original_runtime) ? original.original_runtime : {};
  const receipts = Array.isArray(original.original_model_receipts) ? original.original_model_receipts : [];
  check(runtime.status === 'passed' && runtime.sample_count === 12 && runtime.human_approval === false &&
    receipts.map(r => (isObj(r) ? r.phase : null)).join() === 'implement,video', 'concept/original-run.json の元の記録が違います');

  const samples = json('samples.json');
  const list = isObj(samples) && Array.isArray(samples.samples) ? samples.samples : [];
  check(samples.format === 'input-output' && list.length === SAMPLE_IDS.length && list.every((sm, i) => {
    const st = states[STATE_LABELS.indexOf(SAMPLE_IDS[i])];
    return isObj(sm) && sm.id === SAMPLE_IDS[i] && typeof sm.label === 'string' && isObj(sm.input) && isObj(sm.output) &&
      ['ready', 'query', 'matching_ids', 'expanded_id', 'expanded_buttons', 'regions', 'mode', 'alert'].every(key => same(sm.output[key], st[key])) &&
      sm.input.query === st.query && sm.input.fixture === 'input/articles.json' && sm.input.os_reduce_emulated === st.mode.os;
  }), 'samples.json の12の入出力例が記録と違います');
  const operation = new Map(list.map(sm => [sm.id, sm.label]));

  const dlText = text(DOWNLOAD.path);
  const dl = json(DOWNLOAD.path);
  const saved = states[CASE_STATE['manual-reduced']];
  check(isObj(dl) && dl.format === 'studio-yebisu/motion-primitives-example/search-state' && dl.saved_at === DOWNLOAD.savedAt &&
    dl.source === './input/articles.json' && dl.dataset_title === articles.title && dl.query === saved.query &&
    same(dl.terms, ['書き出し']) && dl.total_count === 6 && dl.matching_count === 2 && same(dl.matching_ids, saved.matching_ids) &&
    dl.expanded_id === saved.expanded_id &&
    same(dl.motion, {effective_reduced: true, os_reduced: false, manual_reduced: true, transition: {duration: 0}}) &&
    same(dl.records, saved.matching_ids.map(id => ({...byId.get(id), expanded: id === saved.expanded_id}))) &&
    same(original.downloaded_state, dl) && same(operations.downloaded_state, dl),
  'outputs/downloaded-state.json が元の記録と合いません');

  const deps = json('dependency-versions.json');
  const packages = isObj(deps) && Array.isArray(deps.runtime_packages) ? deps.runtime_packages : [];
  const version = name => (packages.find(p => isObj(p) && p.name === name) || {}).version;
  check(version('react') === '18.3.1' && version('react-dom') === '18.3.1' && version('motion') === '11.12.0',
    'dependency-versions.json の固定版が違います');

  for (const [path, line] of SOURCE_FACTS) check(text(path).includes(line), `${path} に「${line}」がありません`);
  const request = text('request.txt');
  check(request.includes(COMMIT) && request.includes('expandedValue と onValueChange') && request.includes('components/core/accordion.tsx'),
    'request.txt の依頼文が違います');
  const licence = text('vendor/motion-primitives/LICENCE.md');
  check(licence.includes('MIT License') && licence.includes('Copyright (c) 2024 ibelick'), '原典の LICENCE.md が違います');
  check(text('vendor/motion-primitives/README.md').includes('This project is in beta.'), '原典の README.md が違います');

  const screens = Object.entries(SCREENS).map(([path, [w, h]]) => {
    const size = pngSize(raw(path));
    check(size && size[0] === w && size[1] === h, `${path}：PNGの寸法が元の記録と違います`);
    return {path, w, h, bytes: sizes.get(path)};
  });

  const obs = states.map((st, i) => Object.freeze({
    index: i, label: st.label, query: st.query, draft: st.draft, matching: Object.freeze(st.matching_ids.slice()),
    expanded: st.expanded_id || null, manual: st.mode.manual, os: st.mode.os, reduced: st.mode.reduced, ready: st.ready,
    operation: operation.get(st.label) || OP_FALLBACK[st.label] || '',
  }));
  return {
    structure, parts, obs, records, request, screens, files: TOTAL_FILES,
    title: articles.title, scopeNote: articles.scope_note,
    cases: Object.fromEntries(cases.map(c => [c.id, {id: c.id, label: c.label, index: c.state_index}])),
    download: {path: DOWNLOAD.path, name: DOWNLOAD_NAME, bytes: DOWNLOAD.bytes, sha256: DOWNLOAD.sha256, savedAt: dl.saved_at,
      text: dlText, count: dl.matching_count, expanded: dl.expanded_id, duration: dl.motion.transition.duration,
      manual: dl.motion.manual_reduced, os: dl.motion.os_reduced},
    // A fresh copy each call, so a caller can never alter the verified bytes.
    raw: path => raw(path).slice(0),
  };
}

// ---- Drawn states -----------------------------------------------------------------------------------------------
// A state `s` is plain data: which records are listed and how far each panel is open, what the App holds, the two
// motion settings, tokens on paths and highlights. All values come from saved observations; the in-between values are
// explanatory interpolation.

export const clamp01 = x => (x <= 0 ? 0 : x >= 1 ? 1 : x);
export const seg = (t, a, b) => (b > a ? clamp01((t - a) / (b - a)) : t >= a ? 1 : 0);
export const ease = x => { const c = clamp01(x); return c * c * (3 - 2 * c); };
const lerp = (a, b, p) => a + (b - a) * p;
const bump = (t, a, b) => Math.sin(Math.PI * seg(t, a, b));

export function observation(assets, label) {
  const o = assets.obs[STATE_LABELS.indexOf(label)];
  if (!o) throw new RangeError(label);
  return o;
}
export const caseObs = (assets, caseId) => assets.obs[CASE_STATE[caseId]];

export function settled(assets, o) {
  return {
    obs: o, query: o.query, typed: o.draft, pending: o.draft.trim() !== o.query,
    count: o.matching.length, total: assets.records.length,
    rows: assets.records.map(r => ({id: r.id, title: r.title, body: r.body, tags: r.tags,
      present: o.matching.includes(r.id) ? 1 : 0, open: r.id === o.expanded ? 1 : 0})),
    slotFrom: o.expanded, slotTo: o.expanded, slotMix: 1,
    manual: o.manual ? 1 : 0, os: o.os ? 1 : 0, reduced: o.reduced ? 1 : 0,
    empty: o.matching.length ? 0 : 1, lane: o.expanded || o.matching[0] || null, laneFade: 1,
    json: assets.download, tokens: [], pulse: {}, press: null, show: {}, focus: null, morph: null, hero: null, evidence: 0,
  };
}

// The steps between two saved observations, in the order the original App applies them: the motion setting, typing,
// the search (which clears the open id inside the App), then one click on a trigger.
export function plan(a, b) {
  const steps = [];
  let at = 0;
  const add = (kind, d, extra = {}) => { steps.push({kind, at, d, ...extra}); at += d; };
  if (a.manual !== b.manual || a.os !== b.os) add('motion', 1.0);
  if (a.draft !== b.draft) add('type', 0.9);
  if (a.query !== b.query || !same(a.matching, b.matching)) add('search', 1.4);
  const kept = steps.some(st => st.kind === 'search') ? null : a.expanded;
  if (kept !== b.expanded) add('click', b.reduced ? 1.7 : 2.2, {id: b.expanded ?? kept, from: kept, to: b.expanded});
  return {steps, total: at};
}

const APPLY = {
  motion(s, a, b, q) {
    const sw = ease(seg(q, 0, 0.4));
    s.manual = lerp(+a.manual, +b.manual, sw);
    s.os = lerp(+a.os, +b.os, sw);
    s.reduced = lerp(+a.reduced, +b.reduced, ease(seg(q, 0.3, 0.6)));
    s.pulse.motion = bump(q, 0.05, 0.7);
    if (q > 0.45 && q < 0.85) s.tokens.push({path: 'mc-link', p: seg(q, 0.45, 0.85), color: 'green'});
    s.pulse.mc = bump(q, 0.7, 1);
  },
  type(s, a, b, q) {
    const from = a.draft, to = b.draft;
    let common = 0;
    while (common < from.length && common < to.length && from[common] === to[common]) common++;
    const erase = from.length - common, n = erase + to.length - common;
    const c = Math.round(seg(q, 0.05, 0.85) * n);
    s.typed = c <= erase ? from.slice(0, from.length - c) : to.slice(0, common + c - erase);
    s.pending = s.typed.trim() !== s.query;
    s.pulse.query = bump(q, 0, 1) * 0.6;
  },
  search(s, a, b, q) {
    s.pulse.query = Math.max(s.pulse.query || 0, bump(q, 0, 0.3));
    if (q >= 0.2) { s.query = b.query; s.pending = s.typed.trim() !== b.query; }
    // A search clears the open id inside the App itself; no trigger is pressed.
    const clear = s.reduced >= 0.5 ? (q >= 0.15 ? 1 : 0) : ease(seg(q, 0.15, 0.45));
    if (a.expanded) { s.slotFrom = a.expanded; s.slotTo = null; s.slotMix = clear; s.pulse.state = bump(q, 0.1, 0.5); }
    const p = ease(seg(q, 0.35, 0.85));
    for (const r of s.rows) {
      r.open *= 1 - clear;
      r.present = lerp(a.matching.includes(r.id) ? 1 : 0, b.matching.includes(r.id) ? 1 : 0, p);
    }
    s.count = q < 0.6 ? a.matching.length : b.matching.length;
    s.pulse.count = bump(q, 0.5, 0.8);
    s.empty = lerp(a.matching.length ? 0 : 1, b.matching.length ? 0 : 1, ease(seg(q, 0.55, 0.95)));
    s.laneFade = 1 - bump(q, 0.3, 0.9);
    if (q >= 0.6) s.lane = b.matching[0] || null;
  },
  click(s, a, b, q, st) {
    const tau = q * st.d;
    const instant = s.reduced >= 0.5;
    s.lane = st.id;
    s.laneFade = 1;
    s.press = {id: st.id, k: bump(tau, 0, 0.4)};
    if (tau > 0.25 && tau < 0.85) s.tokens.push({path: 'up', p: seg(tau, 0.25, 0.85), color: 'accent'});
    s.slotFrom = st.from;
    s.slotTo = st.to;
    s.slotMix = ease(seg(tau, 0.8, 1.05));
    s.pulse.state = bump(tau, 0.7, 1.2);
    if (tau > 1.05 && tau < 1.45) s.tokens.push({path: 'down', p: seg(tau, 1.05, 1.45), color: 'ink'});
    s.pulse.prov = bump(tau, 1.3, 1.65);
    const k = instant ? (tau >= 1.45 ? 1 : 0) : ease(seg(tau, 1.45, 2.15));
    for (const r of s.rows) r.open = lerp(r.id === st.from ? 1 : 0, r.id === st.to ? 1 : 0, k);
  },
};

// The picture e seconds after leaving observation a for observation b. At e >= plan(a, b).total it is the end state.
// startLane keeps the return path on the row it was drawn from before this step (the film passes it across holds).
export function between(assets, a, b, e, startLane) {
  const {steps} = plan(a, b);
  const s = settled(assets, a);
  if (startLane !== undefined) s.lane = startLane;
  for (const st of steps) {
    if (e <= st.at) break;
    APPLY[st.kind](s, a, b, Math.min(1, (e - st.at) / st.d), st);
  }
  s.obs = e >= plan(a, b).total * 0.92 ? b : a;
  return s;
}

const INNER = ['app', 'query', 'motion', 'state', 'acc', 'mc', 'prov', 'item', 'trig', 'body', 'lanes', 'obs', 'json', 'desk', 'read'];

// Stage 0: what went to the original author AI, what it wrote, and the separate build and check.
function authoring(assets, o, e) {
  const s = settled(assets, o);
  const inner = 0.22 + 0.78 * ease(seg(e, 3.4, 4.4));
  for (const key of INNER) s.show[key] = inner;
  s.show.browser = 0.35 + 0.65 * ease(seg(e, 2.8, 3.4));
  s.show.ai = 0.35 + 0.65 * ease(seg(e, 0.5, 0.9));
  s.show.code = 0.25 + 0.75 * ease(seg(e, 1.3, 1.8));
  s.show.op = 0.3 + 0.7 * ease(seg(e, 2.0, 2.4));
  s.pulse.src = bump(e, 0, 0.8);
  s.pulse.req = bump(e, 0.1, 0.9);
  const run = (path, a, b, color = 'accent') => { if (e > a && e < b) s.tokens.push({path, p: seg(e, a, b), color}); };
  run('src-ai', 0.3, 0.9, 'blue');
  run('req-ai', 0.3, 0.9);
  s.pulse.ai = bump(e, 0.8, 1.4);
  run('ai-code', 1.2, 1.7);
  run('code-op', 1.9, 2.4);
  s.pulse.op = bump(e, 2.3, 2.9);
  run('op-browser', 2.7, 3.2, 'ink');
  s.morph = e > 2.9 && e < 4.4 ? seg(e, 3.0, 4.3) : null;
  return s;
}

// Stage 1: the nesting, outside in. The panel of an open record unfolds last.
function hierarchy(assets, o, e) {
  const s = settled(assets, o);
  const r = (a, b) => 0.15 + 0.85 * ease(seg(e, a, b));
  s.show.app = r(0, 0.6);
  s.show.query = s.show.motion = s.show.state = s.show.read = r(0.4, 1.0);
  s.show.acc = s.show.mc = r(0.9, 1.6);
  s.show.prov = r(1.5, 2.2);
  s.show.item = s.show.trig = r(2.1, 2.8);
  s.show.body = r(2.7, 3.4);
  s.show.lanes = r(3.3, 3.9);
  s.pulse.app = bump(e, 0, 0.8);
  s.pulse.acc = bump(e, 0.9, 1.7);
  s.pulse.prov = bump(e, 1.5, 2.3);
  s.pulse.item = bump(e, 2.1, 2.9);
  s.pulse.body = bump(e, 2.7, 3.5);
  if (e > 3.6 && e < 4.3) s.tokens.push({path: 'mc-link', p: seg(e, 3.6, 4.3), color: 'green'});
  s.pulse.mc = bump(e, 4.0, 4.6);
  const k = o.reduced ? (e >= 2.7 ? 1 : 0) : ease(seg(e, 2.7, 3.4));
  for (const row of s.rows) row.open *= k;
  return s;
}

export const STAGE_TIMES = [4.6, 4.6];
// Stage 2 joins two saved observations: the one before the selected case's action, and the case itself.
export const CASE_FROM = {'search-two': 'draft-only', 'open-pdf': 'search-two', 'switch-images': 'open-pdf',
  'manual-reduced': 'search-two', empty: 'search-two'};

export function stageDuration(assets, caseId, stage) {
  if (stage < 2) return STAGE_TIMES[stage];
  return plan(observation(assets, CASE_FROM[caseId]), caseObs(assets, caseId)).total + 0.3;
}

export function stageState(assets, caseId, stage, e) {
  const o = caseObs(assets, caseId);
  if (stage === 0) return authoring(assets, o, e);
  if (stage === 1) return hierarchy(assets, o, e);
  return between(assets, observation(assets, CASE_FROM[caseId]), o, e);
}
export const stageAt = (assets, o, stage, e) => (stage === 0 ? authoring(assets, o, e) : hierarchy(assets, o, e));
export const finalState = (assets, caseId) => settled(assets, caseObs(assets, caseId));

export const STAGE_FOCUS = [
  ['src', 'req', 'ai', 'code', 'op', 'browser'],
  ['app', 'acc', 'mc', 'prov', 'item'],
  ['trig', 'lanes', 'state', 'body', 'json', 'obs'],
];
export const PART_FOCUS = {
  copy: ['src', 'code', 'acc'],
  state: ['state', 'lanes', 'prov'],
  container: ['acc', 'mc', 'prov', 'motion'],
  item: ['item'],
  trigger: ['trig', 'lanes'],
  content: ['body', 'mc', 'motion'],
};

// ---- Diagram -----------------------------------------------------------------------------------------------------
// Paper and ink. Blueprint blue is everything copied from the upstream source; green is the example's own App and
// data; vermilion is the pressed id travelling back to the App. Gold marks what a control spotlights.

export const PALETTES = {
  light: {bg: '#f4f1ea', paper: '#fffdf8', ink: '#1d211e', sub: '#4a5048', rule: '#aeb1a6', lane: '#e6e3da',
    blue: '#2a5a8e', blueSoft: '#dfe8f3', accFill: '#eef3f9', green: '#2d6346', greenSoft: '#dcebe1', appFill: '#f2f7f2',
    accent: '#b2401b', accentSoft: '#f7dfd4', mark: '#d39a12', onInk: '#fffdf8'},
  dark: {bg: '#151715', paper: '#202320', ink: '#ecebe3', sub: '#b3b6ab', rule: '#5b5f57', lane: '#2b2e2a',
    blue: '#93b8e6', blueSoft: '#1f2c3b', accFill: '#1a222c', green: '#8fc7a5', greenSoft: '#1d3127', appFill: '#1a221d',
    accent: '#f2936c', accentSoft: '#43281c', mark: '#e6bb4f', onInk: '#151715'},
};

export const FONT = '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic UI", "Yu Gothic", "Noto Sans JP", Meiryo, sans-serif';
export const SERIF = '"Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif';
export const MONO = 'ui-monospace, "SFMono-Regular", Consolas, Menlo, "Liberation Mono", monospace';

// Phone-page and portrait-film layouts share one vertical arrangement; only spacing differs. Units are design units
// scaled uniformly; labels never drop below the caller's minimum pixel size.
function vertical({h, fs, topH, chip, trig, body, gap, bottomH, titleH, bodyLines, threeBottom}) {
  const cy = 2 + topH / 2;
  const bottomY = h - 2 - bottomH;
  const browser = {x: 2, y: topH + 12, w: 296, h: 0};
  browser.h = bottomY - 10 - browser.y;
  const app = {x: 8, y: browser.y + titleH + 6, w: 284, h: 0};
  app.h = browser.y + browser.h - 6 - app.y;
  const row1 = app.y + 9;
  const query = {x: 14, y: row1, w: 86, h: chip};
  const motion = {x: 14, y: row1 + chip + 4, w: 122, h: chip};
  const accY = motion.y + chip + 8;
  const acc = {x: 14, y: accY, w: 234, h: app.y + app.h - 6 - accY};
  const mc = {x: 18, y: acc.y + 7, w: 226, h: 14};
  const provY = mc.y + mc.h + 5;
  const prov = {x: 18, y: provY, w: 226, h: acc.y + acc.h - 4 - provY};
  const bottom = threeBottom
    ? {obs: {x: 2, y: bottomY, w: 96, h: bottomH}, desk: {x: 102, y: bottomY, w: 96, h: bottomH}, json: {x: 202, y: bottomY, w: 96, h: bottomH}}
    : {obs: {x: 2, y: bottomY, w: 146, h: bottomH}, desk: null, json: {x: 152, y: bottomY, w: 146, h: bottomH}};
  const mid = R => R.x + R.w / 2;
  const paths = {
    'req-ai': [[123, cy], [130, cy]],
    'ai-code': [[166, cy], [173, cy]],
    'code-op': [[229, cy], [236, cy]],
    'op-browser': [[267, 2 + topH], [267, browser.y]],
    // Runs between the window dots and the title text, and left of the App label.
    read: [[80, 2 + topH], [80, topH + 7], [26, topH + 7], [26, query.y]],
    'browser-obs': [[mid(bottom.obs), browser.y + browser.h], [mid(bottom.obs), bottomY]],
    'app-json': [[mid(bottom.json), app.y + app.h], [mid(bottom.json), bottomY]],
    'mc-link': [[120, motion.y + chip], [120, mc.y]],
  };
  if (bottom.desk) paths['browser-desk'] = [[mid(bottom.desk), browser.y + browser.h], [mid(bottom.desk), bottomY]];
  return {
    w: 300, h, fs, titleH, bodyLines,
    src: {x: 2, y: 2, w: 56, h: topH}, plus: [62.5, cy], req: {x: 67, y: 2, w: 56, h: topH},
    ai: {x: 130, y: 2, w: 36, h: topH}, code: {x: 173, y: 2, w: 56, h: topH}, op: {x: 236, y: 2, w: 62, h: topH},
    browser, app, query, count: {x: 102, y: row1, w: 34, h: chip}, motion,
    state: {x: 142, y: row1, w: 144, h: chip * 2 + 4}, acc, mc, prov,
    items: {x: 24, w: 214, y: prov.y + 9, bottom: prov.y + prov.h - 5, trig, body, gap},
    lanes: {up: 258, down: 276}, ...bottom, key: null,
    hero: {x: 34, y: browser.y + 14, w: 232, h: Math.min(230, browser.h - 30)},
    paths,
  };
}

export const LAYOUTS = {
  portrait: vertical({h: 300, fs: 11, topH: 38, chip: 18, trig: 18, body: 30, gap: 3, bottomH: 36, titleH: 14, bodyLines: 2}),
  tall: vertical({h: 430, fs: 11.5, topH: 52, chip: 20, trig: 22, body: 50, gap: 5, bottomH: 50, titleH: 16, bodyLines: 3, threeBottom: true}),
  wide: {
    w: 640, h: 300, fs: 11, titleH: 16, bodyLines: 3,
    src: {x: 4, y: 6, w: 66, h: 44}, plus: null, req: {x: 80, y: 6, w: 66, h: 44},
    ai: {x: 52, y: 64, w: 46, h: 36}, code: {x: 4, y: 114, w: 66, h: 44}, op: {x: 80, y: 114, w: 66, h: 44},
    key: {x: 4, y: 172, w: 142, h: 112},
    browser: {x: 158, y: 6, w: 330, h: 288}, app: {x: 166, y: 28, w: 314, h: 260},
    query: {x: 174, y: 37, w: 104, h: 20}, count: {x: 282, y: 37, w: 38, h: 20},
    motion: {x: 174, y: 61, w: 146, h: 20}, state: {x: 328, y: 37, w: 144, h: 44},
    acc: {x: 174, y: 89, w: 250, h: 193}, mc: {x: 180, y: 96, w: 238, h: 14}, prov: {x: 180, y: 115, w: 238, h: 163},
    items: {x: 188, w: 222, y: 124, bottom: 273, trig: 22, body: 46, gap: 6},
    lanes: {up: 440, down: 460},
    obs: {x: 496, y: 28, w: 140, h: 56}, desk: {x: 496, y: 94, w: 140, h: 94}, json: {x: 496, y: 198, w: 140, h: 72},
    hero: {x: 196, y: 34, w: 258, h: 232},
    paths: {
      'src-ai': [[37, 50], [37, 57], [75, 57], [75, 64]],
      'req-ai': [[113, 50], [113, 57], [75, 57], [75, 64]],
      'ai-code': [[75, 100], [75, 107], [37, 107], [37, 114]],
      'code-op': [[70, 136], [80, 136]],
      'op-browser': [[146, 136], [158, 136]],
      read: [[146, 24], [162, 24], [162, 47], [174, 47]],
      'browser-obs': [[488, 56], [496, 56]],
      'browser-desk': [[488, 141], [496, 141]],
      'app-json': [[480, 234], [496, 234]],
      'mc-link': [[270, 81], [270, 96]],
    },
  },
};

const BOX_TEXT = {
  portrait: {src: ['原典部品', ['120f64f', {family: MONO}]], req: ['依頼文', '架空6件'], op: ['制作担当', '検査・操作']},
  tall: {src: ['原典部品', 'MIT・β', ['120f64f', {family: MONO}]], req: ['依頼文', '架空6件'], op: ['制作担当', '型検査', '実操作']},
  wide: {src: ['原典部品', ['Accordion', {family: MONO}], ['120f64f', {family: MONO}]], req: ['依頼文', '架空6件'], op: ['制作担当', '型検査', '実操作']},
};
const BROWSER_TITLE = 'ブラウザー（React 18.3＋motion 11.12）';
const EDGES = {
  'src-ai': ['src', 'ai', 'blue'], 'req-ai': ['req', 'ai', 'ink'], 'ai-code': ['ai', 'code', 'ink'], 'code-op': ['code', 'op', 'ink'],
  'op-browser': ['op', 'browser', 'ink', true], read: ['req', 'query', 'green', true], 'browser-obs': ['browser', 'obs', 'sub', true],
  'browser-desk': ['browser', 'desk', 'sub', true], 'app-json': ['app', 'json', 'green'], 'mc-link': ['motion', 'mc', 'green'],
};
// Nesting for spotlight: a child is lit when its container is.
const PARENT = {query: 'app', count: 'app', motion: 'app', state: 'app', acc: 'app', mc: 'acc', prov: 'acc', item: 'prov',
  trig: 'item', body: 'item', tag: 'item'};
const DIM = 0.6;
// The row of the PDF record in the original pdf.png screenshot (from the preserved screen manifest).
export const PDF_ROW_CROP = [256, 627, 768, 290];

// Rows of the result list for the drawn state. A record has a presence (0 = not listed) and an openness.
function rowGeom(L, s) {
  const I = L.items;
  const avail = I.bottom - I.y;
  let n = 0, open = 0;
  for (const r of s.rows) { n += r.present; open += r.present * r.open; }
  const th = n > 0 ? Math.max(4, Math.min(I.trig, (avail - open * I.body - Math.max(0, n - 1) * I.gap) / n)) : I.trig;
  let y = I.y;
  const out = [];
  for (const r of s.rows) {
    if (r.present > 0.001) {
      const h = th * r.present;
      out.push({r, trig: {x: I.x, y, w: I.w, h}, body: {x: I.x, y: y + h, w: I.w, h: I.body * r.open * r.present}});
    }
    y += (th + I.body * r.open + I.gap) * r.present;
  }
  return out;
}

function lanePaths(L, s, rows) {
  const g = rows.find(row => row.r.id === s.lane);
  if (!g || s.empty >= 0.999) return null;
  const ya = g.trig.y + g.trig.h / 2;
  const sb = L.state.y + L.state.h;
  const pb = L.prov.y + L.prov.h - 10;
  return {
    up: [[L.items.x + L.items.w, ya], [L.lanes.up, ya], [L.lanes.up, sb]],
    down: [[L.lanes.down, sb], [L.lanes.down, pb], [L.prov.x + L.prov.w, pb]],
    box: {x: L.lanes.up - 3, y: sb, w: L.lanes.down - L.lanes.up + 16, h: pb - sb + 4},
    sb, pb,
  };
}

function pointAt(points, p) {
  const lens = [];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const d = Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
    lens.push(d);
    total += d;
  }
  let left = clamp01(p) * total;
  for (let i = 0; i < lens.length; i++) {
    if (left <= lens[i] || i === lens.length - 1) {
      const f = lens[i] ? Math.min(1, left / lens[i]) : 0;
      return [lerp(points[i][0], points[i + 1][0], f), lerp(points[i][1], points[i + 1][1], f)];
    }
    left -= lens[i];
  }
  return points[points.length - 1];
}

const lerpRect = (a, b, p) => ({x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p), w: lerp(a.w, b.w, p), h: lerp(a.h, b.h, p)});
const grow = (R, d) => ({x: R.x - d, y: R.y - d, w: R.w + 2 * d, h: R.h + 2 * d});

function rr(ctx, x, y, w, h, r) {
  const q = Math.max(0, Math.min(r, w / 2, h / 2));
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
  ctx.moveTo(x, y);
  ctx.lineTo(x + w - fold, y);
  ctx.lineTo(x + w, y + fold);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
}

const fitCache = new Map();
function fit(ctx, str, max) {
  const key = `${ctx.font}|${max.toFixed(1)}|${str}`;
  if (fitCache.has(key)) return fitCache.get(key);
  let out = str;
  if (ctx.measureText(str).width > max) {
    let lo = 0, hi = str.length;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (ctx.measureText(str.slice(0, mid) + '…').width <= max) lo = mid; else hi = mid - 1;
    }
    out = str.slice(0, lo) + '…';
  }
  if (fitCache.size > 600) fitCache.clear();
  fitCache.set(key, out);
  return out;
}

function codeSheets(C) {
  const pad = 3, w = (C.w - pad * 3) / 2, h = C.h * 0.58;
  return {app: {x: C.x + pad, y: C.y + pad, w, h}, part: {x: C.x + pad * 2 + w, y: C.y + pad, w, h}, cap: C.y + pad + h + (C.h - pad - h) / 2};
}

// Draws the whole map for state s into rect (canvas units). minPx is the smallest label size in rect units.
// images: optional {pdf: CanvasImageSource} for the film's evidence crop.
export function drawMap(ctx, kind, rect, s, pal, {minPx = 11, images = null} = {}) {
  const L = LAYOUTS[kind];
  const T = BOX_TEXT[kind];
  const k = rect.w / L.w;
  const px = n => Math.max(n, minPx / k);
  const FS = L.fs;
  const focus = s.focus && s.focus.length ? new Set(s.focus) : null;
  const lit = key => focus.has(key) || (PARENT[key] !== undefined && lit(PARENT[key]));
  const A = key => (s.show[key] ?? 1) * (focus && !lit(key) ? DIM : 1);
  const ga = a => { ctx.globalAlpha = clamp01(a); };

  const put = (str, x, y, o = {}) => {
    const size = px(o.size ?? FS);
    ctx.font = `${o.weight ?? 500} ${size}px ${o.family ?? FONT}`;
    ctx.textAlign = o.align ?? 'left';
    ctx.fillStyle = o.color ?? pal.ink;
    ctx.fillText(o.max ? fit(ctx, str, o.max) : str, x, y);
  };
  const midY = (R, size = FS) => R.y + R.h / 2 + px(size) * 0.36;
  const box = (R, {fill = pal.paper, stroke = pal.ink, width = 1.2, dash = false, radius = 2, fold = 0} = {}) => {
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.setLineDash(dash ? [3.5, 2.5] : []);
    if (fold) paperPath(ctx, R.x, R.y, R.w, R.h, fold); else rr(ctx, R.x, R.y, R.w, R.h, radius);
    if (fill) ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    if (fold) {
      ctx.beginPath();
      ctx.moveTo(R.x + R.w - fold, R.y);
      ctx.lineTo(R.x + R.w - fold, R.y + fold);
      ctx.lineTo(R.x + R.w, R.y + fold);
      ctx.stroke();
    }
  };
  const linesIn = (R, list, color = pal.ink, firstWeight = 700) => {
    const size = px(FS), lh = size * 1.22;
    const block = list.length * lh - (lh - size);
    let y = R.y + (R.h - block) / 2 + size * 0.86;
    list.forEach((item, i) => {
      const [str, o = {}] = Array.isArray(item) ? item : [item];
      put(str, R.x + R.w / 2, y, {align: 'center', max: R.w - 6, color, weight: i === 0 ? firstWeight : 500, ...o});
      y += lh;
    });
  };
  const legend = (str, x, y, color, bg, o = {}) => {
    const size = px(FS);
    ctx.font = `${o.weight ?? 700} ${size}px ${o.family ?? FONT}`;
    const w = ctx.measureText(str).width;
    const x0 = o.align === 'right' ? x - w - 6 : x;
    ctx.fillStyle = bg;
    ctx.fillRect(x0, y - size * 0.62, w + 6, size * 1.24);
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.fillText(str, x0 + 3, y + size * 0.36);
  };
  const arrow = (pts, color, dash, width = 1.2, head = 4.2) => {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = width;
    ctx.setLineDash(dash ? [3, 2.6] : []);
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
    ctx.setLineDash([]);
    if (!head) return;
    const [x2, y2] = pts[pts.length - 1], [x1, y1] = pts[pts.length - 2];
    const ang = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - head * Math.cos(ang - 0.45), y2 - head * Math.sin(ang - 0.45));
    ctx.lineTo(x2 - head * Math.cos(ang + 0.45), y2 - head * Math.sin(ang + 0.45));
    ctx.closePath();
    ctx.fill();
  };
  const halo = (R, color, a, width = 3.6) => {
    if (a <= 0.01) return;
    ga(a);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    const G = grow(R, 2.6);
    rr(ctx, G.x, G.y, G.w, G.h, 4);
    ctx.stroke();
  };

  ctx.save();
  ctx.translate(rect.x, rect.y);
  ctx.scale(k, k);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.textBaseline = 'alphabetic';

  const rows = rowGeom(L, s);
  const lanes = lanePaths(L, s, rows);
  const rectsFor = key => {
    if (key === 'item') return rows.map(g => ({x: g.trig.x, y: g.trig.y, w: g.trig.w, h: g.trig.h + g.body.h}));
    if (key === 'trig') return rows.map(g => g.trig);
    if (key === 'body') return rows.filter(g => g.body.h > 1).map(g => g.body);
    if (key === 'lanes') return lanes ? [lanes.box] : [];
    if (key === 'query') return [{x: L.query.x, y: L.query.y, w: L.count.x + L.count.w - L.query.x, h: L.query.h}];
    return L[key] ? [L[key]] : [];
  };

  // ---- Authoring band: fixed source + request/guides → author AI → code → operator.
  ga(A('src'));
  box(L.src, {fill: pal.blueSoft, stroke: pal.blue, width: 1.4, fold: 7});
  linesIn(L.src, T.src, pal.blue);
  if (L.plus) {
    ga(Math.min(A('src'), A('req')));
    put('+', L.plus[0], L.plus[1] + px(FS + 2) * 0.36, {align: 'center', weight: 700, size: FS + 2});
  }
  ga(A('req'));
  box(L.req, {fill: pal.paper, stroke: pal.green, width: 1.2, fold: 7});
  linesIn(L.req, T.req, pal.green);
  ga(A('ai'));
  ctx.fillStyle = pal.ink;
  rr(ctx, L.ai.x, L.ai.y, L.ai.w, L.ai.h, 9);
  ctx.fill();
  linesIn(L.ai, ['作者', 'AI'], pal.onInk);
  ga(A('code'));
  box(L.code, {fill: pal.paper, stroke: pal.rule, width: 1, radius: 3});
  const sheets = codeSheets(L.code);
  box(sheets.app, {fill: pal.appFill, stroke: pal.green, width: 1.1, fold: 4});
  put('App', sheets.app.x + sheets.app.w / 2, midY(sheets.app), {align: 'center', weight: 700, color: pal.green, max: sheets.app.w - 2});
  box(sheets.part, {fill: pal.blueSoft, stroke: pal.blue, width: 1.1, fold: 4});
  put('部品', sheets.part.x + sheets.part.w / 2, midY(sheets.part), {align: 'center', weight: 700, color: pal.blue, max: sheets.part.w - 2});
  put('AIが書く', L.code.x + L.code.w / 2, sheets.cap + px(FS) * 0.36, {align: 'center', max: L.code.w - 4});
  ga(A('op'));
  box(L.op, {fill: pal.bg, stroke: pal.ink, width: 1.2, dash: true, radius: 3});
  linesIn(L.op, T.op);

  // ---- Browser frame.
  const B = L.browser;
  ga(A('browser'));
  box(B, {fill: pal.paper, stroke: pal.ink, width: 1.4, radius: 4});
  ctx.fillStyle = pal.lane;
  ctx.fillRect(B.x + 0.7, B.y + 0.7, B.w - 1.4, L.titleH);
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = pal.rule;
    ctx.beginPath();
    ctx.arc(B.x + 7 + i * 6, B.y + L.titleH / 2 + 0.7, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  put(BROWSER_TITLE, B.x + 27, B.y + L.titleH / 2 + 0.7 + px(FS) * 0.36, {color: pal.sub, max: B.w - 32});

  // ---- App: the example's own code. It owns the search, the motion setting and the one open id.
  ga(A('app'));
  box(L.app, {fill: pal.appFill, stroke: pal.green, width: 1.5, radius: 3});
  legend('App（作例）', L.app.x + L.app.w - 6, L.app.y, pal.green, pal.paper, {align: 'right'});

  ga(A('query'));
  box(L.query, {fill: pal.paper, stroke: pal.green, width: 1.1, dash: s.pending, radius: 2});
  const shown = s.pending ? s.typed : s.query;
  put(shown ? `「${shown}」` : '（検索語なし）', L.query.x + 4, midY(L.query),
    {color: s.pending || !shown ? pal.sub : pal.ink, weight: s.pending ? 500 : 700, max: L.query.w - 8});
  box(L.count, {fill: pal.greenSoft, stroke: pal.green, width: 1.1, radius: 2});
  put(`${s.count}/${s.total}`, L.count.x + L.count.w / 2, midY(L.count), {align: 'center', weight: 700, color: pal.green, max: L.count.w - 4});

  ga(A('motion'));
  const M = L.motion;
  box(M, {fill: pal.paper, stroke: pal.green, width: 1.1, radius: 2});
  let mx = M.x + 4;
  const pill = (label, on) => {
    const size = px(FS);
    ctx.font = `700 ${size}px ${FONT}`;
    const w = ctx.measureText(label).width + 8, h = M.h - 6;
    const base = A('motion');
    ctx.fillStyle = pal.paper; ctx.strokeStyle = pal.ink; ctx.lineWidth = 1;
    rr(ctx, mx, M.y + 3, w, h, h / 2); ctx.fill(); ctx.stroke();
    ga(base * on); ctx.fillStyle = pal.ink; rr(ctx, mx, M.y + 3, w, h, h / 2); ctx.fill();
    ga(base);
    put(label, mx + w / 2, midY(M), {align: 'center', weight: 700, color: on > 0.5 ? pal.onInk : pal.ink});
    mx += w + 3;
  };
  pill('OS', s.os);
  pill('ページ', s.manual);
  put('→', mx + 1, midY(M), {color: pal.sub});
  mx += px(FS) + 3;
  const base = A('motion');
  ga(base * (1 - s.reduced));
  put('0.18秒', mx, midY(M), {weight: 700, max: M.x + M.w - mx - 3});
  ga(base * s.reduced);
  put('0秒', mx, midY(M), {weight: 700, color: pal.accent, max: M.x + M.w - mx - 3});

  ga(A('state'));
  const S = L.state;
  box(S, {fill: pal.paper, stroke: pal.green, width: 1.7, radius: 3});
  put('Appの状態（開く1件）', S.x + 6, S.y + px(FS) + 3, {color: pal.sub, max: S.w - 10});
  const slot = v => (v ? v : 'null（なし）');
  const vy = S.y + S.h - px(FS) * 0.55 - 2;
  const stateA = A('state');
  if (s.slotFrom !== s.slotTo) {
    ga(stateA * (1 - s.slotMix));
    put(slot(s.slotFrom), S.x + 6, vy, {family: MONO, weight: 700, color: s.slotFrom ? pal.accent : pal.sub, size: FS + 1, max: S.w - 10});
  }
  ga(stateA * (s.slotFrom !== s.slotTo ? s.slotMix : 1));
  put(slot(s.slotTo), S.x + 6, vy, {family: MONO, weight: 700, color: s.slotTo ? pal.accent : pal.sub, size: FS + 1, max: S.w - 10});

  // ---- Accordion: the copied component. MotionConfig passes the transition; Provider shares the id and toggleItem.
  const ghost = 1 - 0.72 * s.empty;
  ga(A('acc') * ghost);
  box(L.acc, {fill: pal.accFill, stroke: pal.blue, width: 1.5, dash: s.empty > 0.5, radius: 3});
  legend('Accordion', L.acc.x + 6, L.acc.y, pal.blue, pal.appFill, {family: MONO});
  legend('原典＋最小adapter', L.acc.x + L.acc.w - 6, L.acc.y, pal.blue, pal.appFill, {weight: 500, align: 'right'});
  ga(A('mc') * ghost);
  box(L.mc, {fill: pal.blueSoft, stroke: pal.blue, width: 1, radius: 2});
  put('MotionConfig', L.mc.x + 4, midY(L.mc), {family: MONO, weight: 700, color: pal.blue});
  const mcA = A('mc') * ghost;
  ga(mcA * (1 - s.reduced));
  put('0.18秒 easeOut', L.mc.x + L.mc.w - 4, midY(L.mc), {align: 'right', color: pal.blue});
  ga(mcA * s.reduced);
  put('0秒', L.mc.x + L.mc.w - 4, midY(L.mc), {align: 'right', weight: 700, color: pal.accent});
  ga(A('prov') * ghost);
  box(L.prov, {fill: pal.paper, stroke: pal.blue, width: 1.1, radius: 2});
  legend('Provider・toggleItem', L.prov.x + 6, L.prov.y, pal.blue, pal.accFill, {family: MONO});

  // ---- Items: each AccordionItem has a value; the Trigger is a real button; the Content is the same folded paper.
  const fs = px(FS);
  for (const g of rows) {
    const r = g.r;
    const rowA = clamp01(r.present) * (1 - s.empty);
    const tg = g.trig;
    ga(rowA * A('trig'));
    box(tg, {fill: pal.paper, stroke: pal.blue, width: 1.1, radius: 2});
    if (s.press && s.press.id === r.id && s.press.k > 0) {
      ga(rowA * A('trig') * s.press.k);
      ctx.fillStyle = pal.accentSoft;
      rr(ctx, tg.x, tg.y, tg.w, tg.h, 2);
      ctx.fill();
      ga(rowA * A('trig'));
    }
    const cx = tg.x + 7, cyy = tg.y + tg.h / 2, c = Math.min(3.2, tg.h / 4);
    ctx.save();
    ctx.translate(cx, cyy);
    ctx.rotate((Math.PI / 2) * clamp01(r.open));
    ctx.fillStyle = pal.blue;
    ctx.beginPath();
    ctx.moveTo(-c * 0.7, -c);
    ctx.lineTo(c, 0);
    ctx.lineTo(-c * 0.7, c);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    if (tg.h >= fs + 2) {
      ctx.font = `500 ${fs}px ${MONO}`;
      const tagW = ctx.measureText(r.id).width + 6;
      const tagX = tg.x + tg.w - 4 - tagW;
      put(r.title, tg.x + 14, midY(tg), {weight: 700, max: tagX - tg.x - 18});
      ga(rowA * A('item'));
      ctx.strokeStyle = pal.accent;
      ctx.lineWidth = 1;
      rr(ctx, tagX, tg.y + 2.5, tagW, tg.h - 5, 2);
      ctx.stroke();
      put(r.id, tagX + 3, midY(tg), {family: MONO, color: pal.accent});
    }
    const bd = g.body;
    if (bd.h > 0.4) {
      const bodyA = rowA * A('body');
      ga(bodyA);
      ctx.save();
      ctx.beginPath();
      ctx.rect(bd.x - 1, bd.y, bd.w + 2, bd.h + 1);
      ctx.clip();
      ctx.fillStyle = pal.blueSoft;
      ctx.fillRect(bd.x + 2, bd.y, bd.w - 4, bd.h);
      // Pleats of the folded paper; they flatten as it opens and vanish when it is fully open.
      const fold = 1 - clamp01(r.open);
      if (fold > 0.01) {
        for (let i = 0; i < 3; i++) {
          if (i % 2 === 0) continue;
          ga(bodyA * fold * 0.9);
          ctx.fillStyle = pal.rule;
          ctx.fillRect(bd.x + 2, bd.y + (bd.h * i) / 3, bd.w - 4, bd.h / 3);
        }
        ga(bodyA);
      }
      ctx.strokeStyle = pal.blue;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bd.x + 2, bd.y);
      ctx.lineTo(bd.x + 2, bd.y + bd.h);
      ctx.lineTo(bd.x + bd.w - 2, bd.y + bd.h);
      ctx.lineTo(bd.x + bd.w - 2, bd.y);
      ctx.stroke();
      ga(bodyA * ease(seg(r.open, 0.5, 1)));
      const tags = r.tags.map(t => `#${t}`).join(' ');
      const content = L.bodyLines >= 3 ? [r.body[0], r.body[1] || '', tags] : [r.body[0], tags];
      const lh = fs * 1.16;
      const top = bd.y + 2 + fs * 0.9;
      const bodyMax = bd.w - 12 - (s.reduced > 0.5 ? fs * 2.6 : 0);
      content.forEach((line, i) => {
        const last = i === content.length - 1;
        put(line, bd.x + 7, top + i * lh, {color: last ? pal.green : pal.ink, weight: last ? 700 : 500, max: i === 0 ? bodyMax : bd.w - 12});
      });
      if (s.reduced > 0.01 && r.open > 0.99) {
        ga(bodyA * s.reduced);
        ctx.font = `700 ${fs}px ${FONT}`;
        const w = ctx.measureText('0秒').width + 6;
        ctx.fillStyle = pal.accent;
        rr(ctx, bd.x + bd.w - 6 - w, bd.y + 2, w, fs + 2, 2);
        ctx.fill();
        put('0秒', bd.x + bd.w - 3 - w, bd.y + 2 + fs * 0.92, {weight: 700, color: pal.onInk});
      }
      ctx.restore();
    }
  }

  // 0 results: the App renders no Accordion at all and offers the way back to all six.
  if (s.empty > 0.01) {
    const P = L.prov;
    const E = {x: P.x + 8, y: P.y + 10, w: P.w - 16, h: Math.min(P.h - 18, fs * 4.4 + 8)};
    ga(s.empty * A('app'));
    box(E, {fill: pal.paper, stroke: pal.green, width: 1.2, dash: true, radius: 3});
    put('0件・Accordionは描かない', E.x + E.w / 2, E.y + fs * 1.3, {align: 'center', weight: 700, color: pal.green, max: E.w - 8});
    ctx.font = `700 ${fs}px ${FONT}`;
    const w = ctx.measureText('全件に戻す').width + 16;
    const Bt = {x: E.x + (E.w - w) / 2, y: E.y + fs * 2, w, h: fs * 1.9};
    box(Bt, {fill: pal.greenSoft, stroke: pal.green, width: 1.2, radius: 3});
    put('全件に戻す', Bt.x + w / 2, midY(Bt), {align: 'center', weight: 700, color: pal.green});
  }

  // ---- Return path: the pressed button's id goes up to the App (onValueChange); the App's value comes back down.
  if (lanes) {
    const la = A('lanes') * s.laneFade * (1 - s.empty);
    ga(la);
    arrow(lanes.up, pal.accent, false, 1.7, 4.8);
    arrow(lanes.down, pal.ink, false, 1.3, 4.4);
    const vlabel = (str, x, color) => {
      ctx.save();
      ctx.translate(x + 2.5 + fs * 0.78, (lanes.sb + lanes.pb) / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.font = `700 ${fs}px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = color;
      ctx.fillText(fit(ctx, str, lanes.pb - lanes.sb - 6), 0, 0);
      ctx.restore();
    };
    vlabel('onValueChange', L.lanes.up, pal.accent);
    vlabel('expandedValue', L.lanes.down, pal.ink);
  }

  // ---- Records and outputs.
  const o = s.obs;
  const j = s.json;
  ga(A('obs'));
  box(L.obs, {fill: pal.paper, stroke: pal.sub, width: 1.1, dash: true, radius: 3});
  const obsLines = kind === 'portrait'
    ? ['保存した実操作記録', [`${o.index + 1}/15 ${o.label}`, {family: MONO}]]
    : [kind === 'tall' ? '実操作記録' : '保存した実操作記録', `記録 ${o.index + 1}/15`, [o.label, {family: MONO}]];
  linesIn(L.obs, obsLines, pal.ink);
  ga(A('json'));
  box(L.json, {fill: pal.paper, stroke: pal.green, width: 1.4, fold: 7});
  const jsonLines = kind === 'portrait'
    ? [`元の実JSON・${j.bytes}B`, [`${j.count}件・${j.expanded}・${j.duration}秒`, {family: MONO}]]
    : kind === 'tall'
      ? ['元の実JSON', `${j.bytes}B`, `${j.count}件・${j.duration}秒`]
      : ['元の実JSON', `${j.bytes}B・そのまま`, [`${j.count}件・${j.expanded}`, {family: MONO}], `手動${j.manual ? 'オン' : 'オフ'}・OS${j.os ? 'オン' : 'オフ'}・${j.duration}秒`];
  linesIn(L.json, jsonLines, pal.green);
  if (L.desk) {
    const D = L.desk;
    ga(A('desk'));
    box(D, {fill: pal.paper, stroke: pal.blue, width: 1.3, radius: 3});
    if (kind === 'tall') {
      linesIn(D, ['元の画面', ['desk.html', {family: MONO}], '実部品'], pal.blue);
    } else {
      const head = {x: D.x, y: D.y, w: D.w, h: 32};
      linesIn(head, ['元の画面 desk.html', '原典部品が実際に動く'], pal.blue);
      const area = {x: D.x + 6, y: D.y + 34, w: D.w - 12, h: D.h - 40};
      const img = images && images.pdf;
      const ev = img ? s.evidence : 0;
      if (ev < 1) {
        // A small schematic of the original page: the search line and two result rows, one open.
        ga(A('desk') * (1 - ev));
        ctx.strokeStyle = pal.rule;
        ctx.lineWidth = 1;
        rr(ctx, area.x, area.y, area.w, area.h, 2);
        ctx.stroke();
        ctx.fillStyle = pal.lane;
        ctx.fillRect(area.x + 4, area.y + 4, area.w * 0.6, 6);
        ctx.fillStyle = pal.blueSoft;
        ctx.fillRect(area.x + 4, area.y + 14, area.w - 8, 8);
        ctx.fillRect(area.x + 4, area.y + 34, area.w - 8, 8);
        ctx.fillStyle = pal.lane;
        ctx.fillRect(area.x + 8, area.y + 24, area.w - 20, 3);
        ctx.fillRect(area.x + 8, area.y + 29, area.w - 34, 3);
      }
      if (ev > 0.01) {
        const [sx, sy, sw, sh] = PDF_ROW_CROP;
        const scale = Math.min(area.w / sw, area.h / sh);
        const dw = sw * scale, dh = sh * scale;
        ga(A('desk') * ev);
        ctx.drawImage(img, sx, sy, sw, sh, area.x + (area.w - dw) / 2, area.y + (area.h - dh) / 2, dw, dh);
        ctx.strokeStyle = pal.blue;
        ctx.lineWidth = 1;
        ctx.strokeRect(area.x + (area.w - dw) / 2, area.y + (area.h - dh) / 2, dw, dh);
      }
    }
  }
  if (L.key) {
    const K = L.key;
    ga(A('key'));
    const items = [['sq', pal.blue, pal.blueSoft, '原典から写した部品'], ['sq', pal.green, pal.greenSoft, '作例のApp・データ'],
      ['dot', pal.accent, pal.accent, '押したid・戻る道'], ['dash', pal.ink, pal.bg, '制作担当の別工程']];
    const lh = Math.max(20, fs * 1.8);
    items.forEach(([shape, stroke, fill, label], i) => {
      const y = K.y + 10 + i * lh;
      ctx.strokeStyle = stroke;
      ctx.fillStyle = fill;
      ctx.lineWidth = 1.3;
      if (shape === 'dot') {
        ctx.beginPath();
        ctx.arc(K.x + 8, y + 5, 4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.setLineDash(shape === 'dash' ? [3, 2] : []);
        rr(ctx, K.x + 3, y, 11, 10, 2);
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);
      }
      put(label, K.x + 20, y + 5 + fs * 0.36, {color: pal.ink, max: K.w - 22});
    });
  }

  // Spotlight and pulse rings, outside each part's edge so nested parts stay visible.
  if (focus) for (const key of focus) for (const R of rectsFor(key)) halo(R, pal.mark, 0.55 * (s.show[key] ?? 1));
  for (const [key, v] of Object.entries(s.pulse)) if (v > 0.01) for (const R of rectsFor(key)) halo(R, pal.accent, 0.6 * v, 2.6);

  // Connections, drawn over the boxes: every path runs through gaps and ends on a border, never across a label.
  for (const [name, pts] of Object.entries(L.paths)) {
    const [from, to, color, dash] = EDGES[name];
    if ((from === 'desk' || to === 'desk') && !L.desk) continue;
    ga(Math.min(A(from), A(to)) * (name === 'mc-link' ? 1 - s.empty : 1));
    arrow(pts, pal[color], dash);
  }

  // ---- Moving parts: tokens, the blueprint becoming the Accordion box, and the film's opening blueprint.
  for (const t of s.tokens) {
    const path = t.path === 'up' ? lanes && lanes.up : t.path === 'down' ? lanes && lanes.down : L.paths[t.path];
    if (!path) continue;
    const [x, y] = pointAt(path, ease(t.p));
    ga(1);
    ctx.fillStyle = pal[t.color] || pal.accent;
    ctx.strokeStyle = pal.paper;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  if (s.morph !== null && s.morph !== undefined) {
    const p = ease(s.morph);
    const R = lerpRect(codeSheets(L.code).part, L.acc, p);
    ga(0.9 - 0.5 * p);
    box(R, {fill: null, stroke: pal.blue, width: 2, dash: true, radius: 3});
    ga((1 - p) * 0.35);
    ctx.fillStyle = pal.blueSoft;
    rr(ctx, R.x, R.y, R.w, R.h, 3);
    ctx.fill();
  }
  if (s.hero) drawHero(ctx, L, s.hero, pal, put, box, px);

  ctx.restore();
}

// The film's opening: the Accordion source drawn as a blueprint with its nested parts, shrinking into the source box.
function drawHero(ctx, L, hero, pal, put, box, px) {
  const p = ease(hero.p);
  const R = lerpRect(L.hero, L.src, p);
  ctx.globalAlpha = 1;
  box(R, {fill: pal.blueSoft, stroke: pal.blue, width: 1.8, fold: lerp(16, 7, p)});
  const c = 1 - ease(seg(hero.p, 0, 0.5));
  if (c <= 0.01) return;
  ctx.globalAlpha = c;
  const fs = px(L.fs);
  const x = R.x + 12, w = R.w - 24;
  put('accordion.tsx', x, R.y + 22, {family: MONO, weight: 700, size: L.fs + 2, color: pal.blue, max: w - 14});
  put('Reactの部品のソース（motion/react）', x, R.y + 22 + fs * 1.5, {color: pal.ink, max: w});
  const top = R.y + 22 + fs * 2.6, bottom = R.y + R.h - fs * 2.2;
  const O = {x, y: top, w, h: bottom - top};
  ctx.strokeStyle = pal.blue;
  ctx.lineWidth = 1.3;
  rr(ctx, O.x, O.y, O.w, O.h, 3);
  ctx.stroke();
  put('Accordion', O.x + 6, O.y + fs * 1.2, {family: MONO, weight: 700, color: pal.blue});
  const P = {x: O.x + 6, y: O.y + fs * 1.7, w: O.w - 12, h: O.h - fs * 1.7 - 6};
  ctx.setLineDash([3, 2]);
  rr(ctx, P.x, P.y, P.w, P.h, 2);
  ctx.stroke();
  ctx.setLineDash([]);
  put('Provider', P.x + 5, P.y + fs * 1.15, {family: MONO, color: pal.blue});
  const rowH = Math.max(fs + 6, (P.h - fs * 1.6 - 10) / 4);
  let y = P.y + fs * 1.6;
  [['Item', 'Trigger', true], ['Item', 'Trigger', false]].forEach(([item, trig, open]) => {
    ctx.strokeStyle = pal.blue;
    rr(ctx, P.x + 5, y, P.w - 10, rowH * (open ? 2.2 : 1), 2);
    ctx.stroke();
    put(`${item} › ${trig}`, P.x + 10, y + rowH / 2 + fs * 0.36, {family: MONO, color: pal.blue, max: P.w - 20});
    if (open) {
      ctx.fillStyle = pal.paper;
      ctx.fillRect(P.x + 9, y + rowH, P.w - 18, rowH * 1.1);
      put('Content', P.x + 14, y + rowH * 1.55 + fs * 0.36, {family: MONO, color: pal.blue});
    }
    y += rowH * (open ? 2.2 : 1) + 4;
  });
  put('Motion Primitives の1部品・MIT・ベータ', x, R.y + R.h - fs * 0.8, {color: pal.sub, max: w});
}

// ---- Page ----------------------------------------------------------------------------------------------------------

const STAGE_NOTES = [
  '作者AIが原典部品と依頼・架空6件を読み、画面と最小adapterを書いた。型検査・ビルド・実操作は制作担当の別工程。',
  'Appが開く1件を持ち、Accordion（MotionConfig＋Provider）がItem・押す入口・本文へ配る。',
];
const CASE_NOTES = {
  'search-two': '検索ボタンで6件→2件。入力しただけでは6件のまま。検索と正規化はAppの処理。',
  'open-pdf': '押したbuttonのidがtoggleItem→onValueChangeでAppへ戻り、Appの状態が本文を開く。',
  'switch-images': '別のidを押すと古い本文が閉じ、新しい本文が開く。開くのは常に1件。',
  'manual-reduced': 'ページの「動きを抑える」で設定0秒。同じ本文・タグ・操作が残る。',
  empty: '0件ではAccordionを描かず、全件に戻すボタンを出す（Appの処理）。',
};

function initPage() {
  const root = document.documentElement;
  const $ = id => document.getElementById(id);
  const canvas = $('concept-map');
  const ctx = canvas.getContext('2d');
  const figure = canvas.parentElement;
  const caseButtons = [...document.querySelectorAll('button[data-case]')];
  const stageButtons = [...document.querySelectorAll('button[data-stage]')];
  const partButtons = [...document.querySelectorAll('button[data-part]')];
  const summarySteps = [...document.querySelectorAll('#map-summary [data-step]')];
  const replay = $('replay'), retry = $('retry'), status = $('load-status'), meta = $('case-meta'), note = $('phase-note');
  const saveRecord = $('save-record'), saveStatus = $('save-status');
  const recordContent = $('record-content'), recordName = $('record-name');
  // Article links keep all original 12 sample IDs; only five of them are diagram cases.
  const linkedJump = $('linked-jump'), linkedRecord = $('linked-record');
  const linkedTitle = $('linked-title'), linkedBoundary = $('linked-boundary');
  const linkedInput = $('linked-input'), linkedOutput = $('linked-output');
  const requestText = $('request-text'), copyButton = $('copy-request'), copyStatus = $('copy-status');
  const partFields = ['part-label', 'part-meaning', 'part-quote'].map($);
  const partSource = $('part-source'), partLocal = $('part-local');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const dark = matchMedia('(prefers-color-scheme: dark)');
  const controls = [...caseButtons, ...stageButtons, ...partButtons, replay, copyButton, saveRecord];

  let assets = null, generation = 0, controller = null;
  let caseId = 'open-pdf', stage = 0, focus = null, anim = null, raf = 0;

  const schedule = () => { if (!raf) raf = requestAnimationFrame(paint); };

  function currentState(elapsed) {
    if (anim && elapsed < anim.total) {
      if (anim.kind === 'stage') return {s: stageState(assets, caseId, anim.stage, elapsed), running: true};
      return {s: between(assets, anim.from, anim.to, elapsed), running: true};
    }
    const s = anim && anim.kind === 'case' ? between(assets, anim.from, anim.to, Infinity) : finalState(assets, caseId);
    s.focus = focus;
    return {s, running: false};
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
    const {s, running} = currentState(elapsed);
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Canvas units are CSS pixels here, so the 11 px label floor is in CSS pixels.
    drawMap(ctx, canvas.dataset.layout, {x: 0, y: 0, w: box.width, h: box.height}, s, dark.matches ? PALETTES.dark : PALETTES.light);
    ctx.restore();
    if (running) raf = requestAnimationFrame(paint);
  }

  function fitLayout() {
    const layout = figure.clientWidth >= 620 ? 'wide' : 'portrait';
    if (canvas.dataset.layout !== layout) canvas.dataset.layout = layout;
    schedule();
  }

  const pressOnly = (buttons, attr, value) => {
    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset[attr] === value));
  };

  function describeCase() {
    const o = caseObs(assets, caseId);
    const open = o.expanded ? `開く ${o.expanded}` : '開く なし';
    meta.textContent = `記録${o.index + 1}/15「${o.operation}」・${o.matching.length}/6件・${open}・${o.reduced ? '設定0秒' : '設定0.18秒'}`;
  }

  function startAnim(next) {
    anim = reduced.matches ? null : {...next, start: performance.now()};
    schedule();
  }

  function selectCase(id, writeHash, animate) {
    const from = assets ? caseObs(assets, caseId) : null;
    caseId = id;
    pressOnly(caseButtons, 'case', id);
    describeCase();
    note.textContent = CASE_NOTES[id];
    saveStatus.textContent = '';
    focus = null;
    if (writeHash) history.replaceState(null, '', '#' + id);
    showLinkedRecord(writeHash ? id : hashId());
    const to = caseObs(assets, id);
    if (animate && from && from !== to) startAnim({kind: 'case', from, to, total: plan(from, to).total});
    else { anim = null; schedule(); }
  }

  function selectStage(next, animate) {
    stage = next;
    pressOnly(stageButtons, 'stage', String(next));
    pressOnly(partButtons, 'part', '');
    for (const step of summarySteps) {
      if (Number(step.dataset.step) === next) step.setAttribute('aria-current', 'step');
      else step.removeAttribute('aria-current');
    }
    if (next === 2) {
      const from = observation(assets, CASE_FROM[caseId]);
      note.textContent = `記録${from.index + 1}→${caseObs(assets, caseId).index + 1}：${CASE_NOTES[caseId]}`;
    } else {
      note.textContent = STAGE_NOTES[next];
    }
    if (!animate) { focus = null; anim = null; schedule(); return; }
    focus = STAGE_FOCUS[next];
    startAnim({kind: 'stage', stage: next, total: stageDuration(assets, caseId, next)});
  }

  function fillPart(index) {
    const p = assets.parts[index];
    partFields[0].textContent = p.label;
    partFields[1].textContent = p.meaning;
    partFields[2].textContent = p.quote;
    partSource.href = p.source_url;
    partSource.textContent = `GitHub ${p.upstream_path}#L${p.line_start}`;
    partLocal.href = p.source_path;
    partLocal.textContent = `${p.source_path}:${p.line_start}（同梱・同じバイト）`;
  }

  function selectPart(index) {
    pressOnly(partButtons, 'part', PART_IDS[index]);
    fillPart(index);
    focus = PART_FOCUS[PART_IDS[index]];
    anim = null;
    schedule();
  }

  function hashId() {
    try { return decodeURIComponent(location.hash.slice(1)); } catch { return ''; }
  }

  function hashCase() { return CASE_IDS.includes(hashId()) ? hashId() : 'open-pdf'; }

  function showLinkedRecord(id) {
    const sample = assets && SAMPLE_IDS.includes(id)
      ? JSON.parse(new TextDecoder().decode(assets.raw('samples.json'))).samples.find(s => s.id === id) : null;
    linkedRecord.hidden = !sample;
    linkedJump.hidden = !sample || CASE_IDS.includes(id);
    linkedRecord.dataset.sample = sample ? id : '';
    linkedTitle.textContent = sample ? `記事で選んだ実記録：${sample.label}` : '';
    linkedBoundary.textContent = sample ? (CASE_IDS.includes(id)
      ? '上の図で選んだ記録の、元の入力と結果です。'
      : 'この記録は図の5例に含まれません。上の図は「PDFを開く（記録4）」です。以下が記事で選んだ記録の元の入力と結果です。') : '';
    linkedInput.textContent = sample ? JSON.stringify(sample.input, null, 2) : '';
    linkedOutput.textContent = sample ? JSON.stringify(sample.output, null, 2) : '';
  }

  function setControls(enabled) {
    for (const control of controls) control.disabled = !enabled;
  }

  function clearResults() {
    anim = null;
    focus = null;
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
    showLinkedRecord('');
  }

  function ready() {
    root.dataset.state = 'ready';
    setControls(true);
    requestText.value = assets.request;
    recordContent.textContent = assets.download.text;
    recordName.textContent = `${assets.download.path}・${assets.download.bytes}B・saved_at ${assets.download.savedAt}`;
    // Short on purpose: it shares the readout line under the map on a 320 px phone. Details are below the fold.
    status.textContent = `${TOTAL_FILES}件を確認済み`;
    fillPart(0);
    pressOnly(partButtons, 'part', '');
    caseId = hashCase();
    selectCase(caseId, false, false);
    selectStage(0, false);
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

  // Hands the verified original bytes, unchanged, to the browser as a download. It does not rewrite saved_at and is
  // not the state of whichever record is selected.
  function saveJson() {
    if (!assets) return;
    const d = assets.download;
    let url = null;
    try {
      url = URL.createObjectURL(new Blob([assets.raw(d.path)], {type: 'application/json'}));
      const link = document.createElement('a');
      link.href = url;
      link.download = d.name;
      link.rel = 'noopener';
      document.body.append(link);
      link.click();
      link.remove();
      const match = caseId === 'manual-reduced'
        ? '選んでいる記録12と同じ状態の元ファイルです。'
        : '選んでいる記録ではなく、記録12（手動で動きを抑えPDFを開く）の元ファイルです。';
      saveStatus.textContent = `元の実JSON（${d.bytes}B・saved_at ${d.savedAt}）をブラウザーへ渡しました。${match}保存できたかはブラウザーのダウンロード表示で確かめてください。`;
    } catch {
      saveStatus.textContent = 'ブラウザーへ渡せませんでした。下の「ファイル」から outputs/downloaded-state.json を開いてください。';
    } finally {
      if (url) setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
  }

  for (const button of caseButtons) button.addEventListener('click', () => selectCase(button.dataset.case, true, true));
  for (const button of stageButtons) button.addEventListener('click', () => selectStage(Number(button.dataset.stage), true));
  for (const button of partButtons) button.addEventListener('click', () => selectPart(PART_IDS.indexOf(button.dataset.part)));
  replay.addEventListener('click', () => selectStage(stage, true));
  retry.addEventListener('click', load);
  linkedJump.addEventListener('click', () => { linkedRecord.scrollIntoView(); linkedRecord.focus({preventScroll: true}); });
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
      copyStatus.textContent = 'コピーできませんでした。文を選んだので、長押しか Ctrl+C（⌘+C）でコピーしてください。';
    }
  });
  window.addEventListener('hashchange', () => { if (assets) selectCase(hashCase(), false, true); });
  dark.addEventListener('change', schedule);
  new ResizeObserver(fitLayout).observe(figure);
  fitLayout();
  load();
}

if (typeof document !== 'undefined' && document.getElementById('concept-map')) initPage();
