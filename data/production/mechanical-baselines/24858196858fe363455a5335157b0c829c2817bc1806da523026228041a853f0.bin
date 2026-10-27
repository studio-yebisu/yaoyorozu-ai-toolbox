/* Diagram Design の作例 — 紹介図（八百万図AIツールボックス, MIT）
   One connected canvas map: the skill (a book with six tabs) and the request join at one AI writer,
   the same paper becomes HTML with inline SVG, a separate operator checks it and makes SVG/PNG copies,
   and all three reconnect to the saved figure. video/video.js imports the same layouts and drawing.

   Everything drawn comes from the 27 files listed in concept/manifest.json. The manifest itself is
   checked against a fixed SHA-256, then each file's size and SHA-256. Nothing here runs the original
   AI, the Python checkers, the exporter or a rasterizer: the actual figure is the saved
   diagrams/intake.png, decoded from verified bytes through a blob: URL. */

export const PIN = 'd97c5c7477e54cee17cfa6459190610da0643a05';
export const UPSTREAM = 'cathrynlavery/diagram-design';
export const MANIFEST_PATH = 'concept/manifest.json';
export const MANIFEST_SHA256 = 'fc782021a55f03dec70a20fdfbd01d743ac55d19ae0b188889a803f012f8e201';
export const SITE = new URL('./', import.meta.url);

export const ASSET_PATHS = Object.freeze([
  'concept/structure.json',
  'concept/original-run.json',
  'diagram-data.json',
  'samples.json',
  'request.txt',
  'design-profile.md',
  'diagrams/intake.html',
  'diagrams/intake.svg',
  'diagrams/intake.png',
  'vendor/diagram-design/README.md',
  'vendor/diagram-design/LICENSE',
  'vendor/diagram-design/THIRD_PARTY_LICENSES.md',
  'vendor/diagram-design/SKILL.md',
  'vendor/diagram-design/references/type-swimlane.md',
  'vendor/diagram-design/references/semantic-patterns.md',
  'vendor/diagram-design/references/style-guide.md',
  'vendor/diagram-design/references/primitives-core.md',
  'vendor/diagram-design/references/layout-budget.md',
  'vendor/diagram-design/references/output-spec.md',
  'vendor/diagram-design/references/export.md',
  'vendor/diagram-design/assets/template.html',
  'vendor/diagram-design/scripts/self_check.py',
  'vendor/diagram-design/scripts/export_svg.py',
  'concept/records/route-main.json',
  'concept/records/route-missing.json',
  'concept/records/route-unresolved.json',
  'concept/records/route-complete.json'
]);

export const PART_IDS = Object.freeze(['choose', 'style', 'draw', 'budget', 'check', 'export']);
export const PART_TABS = Object.freeze({choose: '選ぶ', style: '配色', draw: '描く', budget: '分量', check: '点検', export: '書出'});
export const ROUTE_IDS = Object.freeze(['route-main', 'route-missing', 'route-unresolved', 'route-complete']);
export const ROUTE_SHORT = Object.freeze({'route-main': '基本', 'route-missing': '情報不足', 'route-unresolved': '未解決', 'route-complete': '完了'});
export const CHIPS = Object.freeze(['目的', '不足', '戻り', '完了']);

// The four original route objects, restated so a drifted copy fails loudly instead of drawing.
const EXPECTED_ROUTES = {
  'route-main': {nodes: ['C1', 'R1', 'R2', 'R3', 'S1', 'R4', 'C3', 'R5'], edges: ['E01', 'E02', 'E05', 'E06', 'E07', 'E08', 'E09']},
  'route-missing': {nodes: ['R2', 'C2', 'R2'], edges: ['E03', 'E04']},
  'route-unresolved': {nodes: ['C3', 'R3', 'S1', 'R4', 'C3'], edges: ['E10', 'E06', 'E07', 'E08']},
  'route-complete': {nodes: ['C3', 'R5'], edges: ['E09']}
};
const EXPECTED_SIZES = {'diagrams/intake.html': 20504, 'diagrams/intake.svg': 18412, 'diagrams/intake.png': 190200, 'diagram-data.json': 17679};
const VENDOR = 'vendor/diagram-design/';

/* ---------- Verified loading ---------- */

export class AssetError extends Error {
  constructor(message, path = '') {
    super(message);
    this.name = 'AssetError';
    this.path = path;
  }
}

function check(ok, message, path) {
  if (!ok) throw new AssetError(message, path);
}

async function fetchBytes(path, signal) {
  const url = new URL(path, SITE);
  let res;
  try {
    res = await fetch(url, {signal, cache: 'no-cache', credentials: 'same-origin'});
  } catch (err) {
    if (err && err.name === 'AbortError') throw err;
    throw new AssetError(`${path} を取得できませんでした（通信エラー）。`, path);
  }
  check(res.ok, `${path} を取得できませんでした（HTTP ${res.status}）。`, path);
  check(!res.url || new URL(res.url).origin === SITE.origin, `${path} が別の場所へ転送されました。`, path);
  return new Uint8Array(await res.arrayBuffer());
}

function decodeUTF8(bytes, path) {
  try {
    return new TextDecoder('utf-8', {fatal: true}).decode(bytes);
  } catch (_) {
    throw new AssetError(`${path} がUTF-8として読めません。`, path);
  }
}

function parseJSON(text, path) {
  try {
    return JSON.parse(text);
  } catch (_) {
    throw new AssetError(`${path} のJSONを読めません。`, path);
  }
}

function same(a, b) {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  return ka.length === kb.length && ka.every(k => Object.prototype.hasOwnProperty.call(b, k) && same(a[k], b[k]));
}

/* SHA-256: Web Crypto where the page is a secure context, otherwise this small fallback
   (crypto.subtle is absent on plain-http LAN previews). */
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

function sha256Soft(bytes) {
  const len = bytes.length;
  const total = Math.ceil((len + 9) / 64) * 64;
  const buf = new Uint8Array(total);
  buf.set(bytes);
  buf[len] = 0x80;
  const view = new DataView(buf.buffer);
  view.setUint32(total - 8, Math.floor(len / 0x20000000));
  view.setUint32(total - 4, (len * 8) >>> 0);
  const H = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const W = new Uint32Array(64);
  const rot = (x, n) => (x >>> n) | (x << (32 - n));
  for (let o = 0; o < total; o += 64) {
    for (let i = 0; i < 16; i++) W[i] = view.getUint32(o + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rot(W[i - 15], 7) ^ rot(W[i - 15], 18) ^ (W[i - 15] >>> 3);
      const s1 = rot(W[i - 2], 17) ^ rot(W[i - 2], 19) ^ (W[i - 2] >>> 10);
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
    }
    let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (rot(e, 6) ^ rot(e, 11) ^ rot(e, 25)) + ((e & f) ^ (~e & g)) + K256[i] + W[i]) >>> 0;
      const t2 = ((rot(a, 2) ^ rot(a, 13) ^ rot(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0;
      d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
  }
  const out = new Uint8Array(32);
  const ov = new DataView(out.buffer);
  H.forEach((v, i) => ov.setUint32(i * 4, v));
  return out;
}

const hex = bytes => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');

export async function sha256Hex(bytes) {
  const subtle = globalThis.crypto && globalThis.crypto.subtle;
  if (subtle) {
    try {
      return hex(new Uint8Array(await subtle.digest('SHA-256', bytes)));
    } catch (_) { /* fall through */ }
  }
  return hex(sha256Soft(bytes));
}

function checkFigureDOM(doc, path, data, standalone) {
  check(doc.getElementsByTagName('parsererror').length === 0, `${path} を構造として読めません。`, path);
  const svg = standalone ? doc.documentElement : doc.querySelector('svg');
  check(svg && svg.localName === 'svg', `${path} にSVGがありません。`, path);
  check(svg.getAttribute('viewBox') === '0 0 1280 720' && svg.getAttribute('data-type') === 'swimlane', `${path} のviewBoxが1280×720のスイムレーンではありません。`, path);
  check(doc.getElementsByTagName('script').length === 0, `${path} はスクリプトのない静的な図のはずです。`, path);
  const byId = new Map();
  for (const el of svg.querySelectorAll('[id]')) byId.set(el.getAttribute('id'), el);
  const ids = prefix => [...byId.keys()].filter(id => id.startsWith(prefix) && /^[A-Z]\d+$/.test(id.slice(prefix.length))).map(id => id.slice(prefix.length)).sort();
  check(ids('node-').join() === data.nodes.map(n => n.id).sort().join(), `${path} の工程IDが記録と一致しません。`, path);
  check(ids('edge-').join() === data.edges.map(e => e.id).sort().join(), `${path} の矢印IDが記録と一致しません。`, path);
  for (const n of data.nodes) {
    check(byId.get(n.element_id).getAttribute('data-lane') === n.lane, `${path} の${n.id}の段が記録と一致しません。`, path);
  }
  for (const e of data.edges) {
    const el = byId.get(e.element_id);
    check(el.getAttribute('data-from') === e.from && el.getAttribute('data-to') === e.to, `${path} の${e.id}の始点・終点が記録と一致しません。`, path);
  }
}

function validate(files, entries) {
  const text = path => decodeUTF8(files.get(path), path);
  const json = path => parseJSON(text(path), path);
  const structure = json('concept/structure.json');
  const run = json('concept/original-run.json');
  const data = json('diagram-data.json');
  const samples = json('samples.json');
  const request = text('request.txt');
  const profile = text('design-profile.md');

  // Pin, versions, licence and notices.
  check(structure.source_commit === PIN && data.skill && data.skill.commit === PIN, '原典の固定コミットが一致しません。', 'concept/structure.json');
  check(data.skill.repository === UPSTREAM && data.skill.license === 'MIT' && data.skill.skill_metadata_version === '2.6' && data.skill.plugin_manifest_version === '2.6.99', '原典の版または利用条件の記録が一致しません。', 'diagram-data.json');
  const license = text(VENDOR + 'LICENSE');
  check(/^MIT License\r?\n/.test(license) && license.includes('Copyright (c) 2025 Cathryn Lavery'), '原典のMIT Licenseを確認できません。', VENDOR + 'LICENSE');
  check(text(VENDOR + 'THIRD_PARTY_LICENSES.md').startsWith('# Third-party licenses'), '原典の第三者ライセンス表記を確認できません。', VENDOR + 'THIRD_PARTY_LICENSES.md');
  check(/\n {2}version: "2\.6"\r?\n/.test(text(VENDOR + 'SKILL.md')), 'SKILL.md の版（2.6）を確認できません。', VENDOR + 'SKILL.md');
  for (const color of ['#f2eee3', '#17150f', '#4f4a3f', '#b83a00']) {
    check(profile.includes(color), `design-profile.md に配色 ${color} がありません。`, 'design-profile.md');
  }

  // Six explanatory parts and their exact upstream lines (CRLF or LF).
  check(Array.isArray(structure.parts) && structure.parts.map(p => p.id).join() === PART_IDS.join(), '6つの部分の並びが一致しません。', 'concept/structure.json');
  const parts = structure.parts.map(p => {
    check(ASSET_PATHS.includes(p.source_path) && p.source_path.startsWith(VENDOR), `${p.id} の出典パスが照合対象にありません。`, 'concept/structure.json');
    check(p.upstream_path === 'skills/diagram-design/' + p.source_path.slice(VENDOR.length), `${p.id} の原典パスが一致しません。`, 'concept/structure.json');
    const body = text(p.source_path);
    const line = body.split(/\r\n|\n/)[p.line_start - 1];
    check(Number.isInteger(p.line_start) && typeof line === 'string' && typeof p.quote === 'string' && p.quote.length >= 12 && line.includes(p.quote), `${p.source_path} の${p.line_start}行目に引用が見つかりません。`, p.source_path);
    return {
      id: p.id, tab: PART_TABS[p.id], label: p.label, meaning: p.meaning, quote: p.quote, line: p.line_start,
      local: p.source_path, upstream: p.upstream_path,
      url: `https://github.com/${UPSTREAM}/blob/${PIN}/${p.upstream_path}#L${p.line_start}`
    };
  });

  // Semantic data: 9 nodes, 10 edges, 3 lanes, 8 hand-offs, 2 returns, 2 accents.
  const {nodes, edges, lanes} = data;
  check(Array.isArray(nodes) && nodes.length === 9 && Array.isArray(edges) && edges.length === 10 && Array.isArray(lanes) && lanes.length === 3, '工程9・矢印10・段3の記録ではありません。', 'diagram-data.json');
  check(lanes.map(l => l.id).join() === 'customer,intake,specialist', '段の並びが一致しません。', 'diagram-data.json');
  const laneOf = new Map(nodes.map(n => [n.id, n.lane]));
  check(laneOf.size === 9 && edges.every(e => laneOf.has(e.from) && laneOf.has(e.to)), '矢印が存在しない工程を指しています。', 'diagram-data.json');
  check(edges.every(e => e.cross_lane === (laneOf.get(e.from) !== laneOf.get(e.to))) && edges.filter(e => e.cross_lane).length === 8, '段をまたぐ矢印が8本ではありません。', 'diagram-data.json');
  check(!edges.some(e => [laneOf.get(e.from), laneOf.get(e.to)].sort().join() === 'customer,specialist'), '顧客と専門担当を直接つなぐ矢印があります。', 'diagram-data.json');
  check(edges.filter(e => e.kind === 'return').map(e => e.id).join() === 'E04,E10', '戻り道がE04とE10の2本ではありません。', 'diagram-data.json');
  const accents = [...nodes.filter(n => n.focal).map(n => n.id), ...edges.filter(e => e.style === 'accent').map(e => e.id)];
  check(accents.join() === 'R5,E09' && same(data.budget.accent_elements.which, ['R5', 'E09']), '朱の要素がR5とE09の2つではありません。', 'diagram-data.json');
  check(data.budget.nodes.max === 9 && data.budget.edges.max === 12 && data.budget.lanes.max === 5, '1枚の上限（9/12/5）の記録が一致しません。', 'diagram-data.json');
  check(data.choices.type === 'swimlane' && data.choices.semantic_pattern === null && data.choices.viewBox === '0 0 1280 720', '図の種類の記録が一致しません。', 'diagram-data.json');

  // Input fragments: 18 = P1 P2 + F1..F12 + K1 + O1..O3; assumptions A1..A4.
  const factIds = Array.isArray(data.facts) ? data.facts.map(f => f.id) : [];
  check(factIds.length === 18 && factIds.filter(id => /^F\d+$/.test(id)).length === 12 && factIds.filter(id => /^P\d$/.test(id)).length === 2 && factIds.filter(id => /^K\d$/.test(id)).length === 1 && factIds.filter(id => /^O\d$/.test(id)).length === 3, '依頼の断片（18件・業務の事実12件）が一致しません。', 'diagram-data.json');
  check(Array.isArray(data.assumptions) && data.assumptions.map(a => a.id).join() === 'A1,A2,A3,A4', '解釈A1〜A4の記録が一致しません。', 'diagram-data.json');

  const c = structure.counts || {};
  const expectCounts = {visual_types_at_pin: 45, semantic_patterns_at_pin: 9, applied_visual_types: 1, nodes: 9, edges: 10, lanes: 3, cross_lane_edges: 8, return_edges: 2, input_fragments: 18, business_facts: 12, original_checked_conditions: 12, assumptions: 4, parts: 6};
  check(Object.entries(expectCounts).every(([k, v]) => c[k] === v), '数の記録が一致しません。', 'concept/structure.json');
  check(structure.chosen && structure.chosen.type === 'swimlane' && structure.chosen.semantic_pattern === null, '選んだ図の種類の記録が一致しません。', 'concept/structure.json');
  const lim = structure.limits || {};
  check(lim.business_workflow_executed === false && lim.original_AI_or_checkers_or_export_rerun === false && lim.new_UI_generated_figure === false && lim.human_approval === false, '範囲の記録が一致しません。', 'concept/structure.json');

  // Routes: same four objects, same order, in data, structure and the four wrappers.
  check(Array.isArray(data.routes) && data.routes.map(r => r.id).join() === ROUTE_IDS.join(), '経路の並びが一致しません。', 'diagram-data.json');
  check(Array.isArray(structure.jobs) && structure.jobs.map(j => j.id).join() === ROUTE_IDS.join(), '経路の並びが一致しません。', 'concept/structure.json');
  const edgeById = new Map(edges.map(e => [e.id, e]));
  const nodeById = new Map(nodes.map(n => [n.id, n]));
  const routes = {};
  data.routes.forEach((route, i) => {
    const want = EXPECTED_ROUTES[route.id];
    check(same(route.nodes, want.nodes) && same(route.edges, want.edges), `${route.id} の工程と矢印が元の記録と一致しません。`, 'diagram-data.json');
    route.edges.forEach((id, j) => {
      const e = edgeById.get(id);
      check(e && e.from === route.nodes[j] && e.to === route.nodes[j + 1], `${route.id} の${id}がつながっていません。`, 'diagram-data.json');
    });
    const job = structure.jobs[i];
    const path = `concept/records/${route.id}.json`;
    check(same(job.nodes, route.nodes) && same(job.edges, route.edges), `${route.id} の整理が元の記録と一致しません。`, 'concept/structure.json');
    check(job.output_file && job.output_file.path === path && job.output_file.bytes === entries.get(path).bytes && job.output_file.sha256 === entries.get(path).sha256, `${path} の大きさまたはSHA-256の記録が一致しません。`, path);
    const recText = text(path);
    check(!recText.includes('\r') && recText.endsWith('\n'), `${path} はLF改行の記録のはずです。`, path);
    const record = parseJSON(recText, path);
    check(same(record, route), `${path} の中身が元の経路と一致しません。`, path);
    routes[route.id] = {
      id: route.id, name: route.name, short: ROUTE_SHORT[route.id], nodes: route.nodes, edges: route.edges,
      conditions: route.conditions || null, text: recText, path, bytes: entries.get(path).bytes
    };
  });
  check(same(routes['route-complete'].conditions, ['顧客が解決を確認した（C3 → 解決した）', '受付が対応記録を残した（R5）']), '完了の2条件が一致しません。', 'diagram-data.json');

  // Outputs and the original run record are bound to the same bytes.
  const sha = {};
  for (const [key, path] of [['html', 'diagrams/intake.html'], ['svg', 'diagrams/intake.svg'], ['png', 'diagrams/intake.png'], ['data', 'diagram-data.json']]) {
    const out = structure.outputs && structure.outputs[key];
    check(entries.get(path).bytes === EXPECTED_SIZES[path] && out && out.path === path && out.bytes === EXPECTED_SIZES[path] && out.sha256 === entries.get(path).sha256, `${path} の記録が一致しません。`, path);
    sha[key] = entries.get(path).sha256;
  }
  const rt = run.runtime || {};
  check(run.format === 'diagram-original-run/v1' && rt.type === 'swimlane' && rt.nodes === 9 && rt.edges === 10 && rt.lanes === 3 && rt.business_workflow_executed === false && rt.human_approval === false, '元の実行記録が一致しません。', 'concept/original-run.json');
  const tools = Array.isArray(rt.original_tools) ? rt.original_tools : [];
  check(tools.map(t => t.tool).join() === 'skills/diagram-design/scripts/self_check.py,scripts/verify-geometry.py,skills/diagram-design/scripts/export_svg.py' && tools.every(t => t.exit_code === 0 && t.input_sha256 === sha.html && t.input === 'diagrams/intake.html'), '元の検査・書出しの記録が一致しません。', 'concept/original-run.json');
  const ex = run.exports || {};
  check(Array.isArray(ex.svg) && ex.svg.length === 1 && ex.svg[0].svg_sha256 === sha.svg && ex.svg[0].input_sha256 === sha.html, 'SVG書出しの記録が一致しません。', 'concept/original-run.json');
  check(ex.png && ex.png.output_sha256 === sha.png && ex.png.source_sha256 === sha.html && same(ex.png.output_size, [2560, 1440]) && ex.png.device_scale_factor === 2, 'PNG撮影の記録が一致しません。', 'concept/original-run.json');

  const sample = samples.samples && samples.samples[0];
  const norm = s => String(s).replace(/\r\n/g, '\n').replace(/\s+$/, '');
  check(samples.synthetic === true && sample && sample.id === 'intake-flow' && norm(sample.input) === norm(request) && sample.nodes === 9 && sample.edges === 10 && sample.lanes === 3, 'samples.json と依頼文が一致しません。', 'samples.json');

  // Actual figure structure, read only (DOMParser does not run or load anything).
  const parser = new DOMParser();
  checkFigureDOM(parser.parseFromString(text('diagrams/intake.svg'), 'image/svg+xml'), 'diagrams/intake.svg', data, true);
  checkFigureDOM(parser.parseFromString(text('diagrams/intake.html'), 'text/html'), 'diagrams/intake.html', data, false);

  return {
    structure, run, data, samples, request, parts, routes, sha, nodeById, edgeById,
    sizes: {html: EXPECTED_SIZES['diagrams/intake.html'], svg: EXPECTED_SIZES['diagrams/intake.svg'], png: EXPECTED_SIZES['diagrams/intake.png'], data: EXPECTED_SIZES['diagram-data.json']},
    tools
  };
}

async function decodePNG(bytes) {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  check(sig.every((b, i) => bytes[i] === b), 'intake.png がPNGではありません。', 'diagrams/intake.png');
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  check(dv.getUint32(16) === 2560 && dv.getUint32(20) === 1440, 'intake.png が2560×1440ではありません。', 'diagrams/intake.png');
  const url = URL.createObjectURL(new Blob([bytes], {type: 'image/png'}));
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
  try {
    await img.decode();
  } catch (_) {
    URL.revokeObjectURL(url);
    throw new AssetError('intake.png を画像として読めません。', 'diagrams/intake.png');
  }
  if (img.naturalWidth !== 2560 || img.naturalHeight !== 1440) {
    URL.revokeObjectURL(url);
    throw new AssetError('intake.png が2560×1440ではありません。', 'diagrams/intake.png');
  }
  return {img, url};
}

export async function loadVerified({signal} = {}) {
  const manifestBytes = await fetchBytes(MANIFEST_PATH, signal);
  check(await sha256Hex(manifestBytes) === MANIFEST_SHA256, '目録（concept/manifest.json）のSHA-256が一致しません。', MANIFEST_PATH);
  const manifest = parseJSON(decodeUTF8(manifestBytes, MANIFEST_PATH), MANIFEST_PATH);
  check(manifest.format === 'diagram-design-visual-assets/v1' && manifest.case_id === 'diagram-design-example' && Array.isArray(manifest.files), '目録の形式が一致しません。', MANIFEST_PATH);
  const listed = manifest.files.map(f => f.path);
  check(listed.length === 27 && new Set(listed).size === 27 && ASSET_PATHS.every(p => listed.includes(p)), '目録の27ファイルの組が一致しません。', MANIFEST_PATH);
  const entries = new Map(manifest.files.map(f => [f.path, f]));
  const files = new Map(await Promise.all(manifest.files.map(async f => {
    check(Number.isInteger(f.bytes) && /^[0-9a-f]{64}$/.test(f.sha256), `${f.path} の目録の値が不正です。`, f.path);
    const bytes = await fetchBytes(f.path, signal);
    check(bytes.byteLength === f.bytes, `${f.path} の大きさが目録と一致しません（${bytes.byteLength} / ${f.bytes} バイト）。`, f.path);
    check(await sha256Hex(bytes) === f.sha256, `${f.path} のSHA-256が目録と一致しません。`, f.path);
    return [f.path, bytes];
  })));
  const model = validate(files, entries);
  const png = await decodePNG(files.get('diagrams/intake.png'));
  model.img = png.img;
  model.imgURL = png.url;
  return model;
}

export function releaseModel(model) {
  if (model && model.imgURL) {
    URL.revokeObjectURL(model.imgURL);
    model.imgURL = '';
  }
}

/* ---------- Drawing primitives (shared with video/video.js) ---------- */

export const FONTS = {
  gothic: '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic UI", "Yu Gothic", YuGothic, Meiryo, "Noto Sans JP", sans-serif',
  mincho: '"Hiragino Mincho ProN", "Yu Mincho", YuMincho, "BIZ UDPMincho", "Noto Serif JP", serif',
  mono: 'ui-monospace, "SF Mono", Consolas, Menlo, monospace'
};

export const PALETTES = {
  light: {
    bg: '#f2eee3', sheet: '#fbf9f2', ink: '#17150f', soft: '#4f4a3f', rule: 'rgba(23,21,15,0.22)', faint: 'rgba(23,21,15,0.12)',
    accent: '#b83a00', accentTint: 'rgba(184,58,0,0.10)', onInk: '#f2eee3',
    lane: ['rgba(79,74,63,0.16)', '#ffffff', 'rgba(23,21,15,0.07)']
  },
  dark: {
    bg: '#1a1812', sheet: '#24211a', ink: '#f2eee3', soft: '#cbc3af', rule: 'rgba(242,238,227,0.30)', faint: 'rgba(242,238,227,0.14)',
    accent: '#ff8d57', accentTint: 'rgba(255,141,87,0.16)', onInk: '#1a1812',
    lane: ['rgba(203,195,175,0.22)', 'rgba(242,238,227,0.10)', 'rgba(242,238,227,0.04)']
  }
};

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const ease = v => {
  v = clamp(v);
  return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2;
};
export const ramp = (t, a, b) => ease((t - a) / (b - a));
export const lerp = (a, b, k) => a + (b - a) * k;
export const lerpRect = (a, b, k) => ({x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), w: lerp(a.w, b.w, k), h: lerp(a.h, b.h, k)});
const moving = v => v > 0 && v < 1;

// Text with a floor in output pixels: S.scale is output px per layout unit.
export function label(ctx, S, str, x, y, o = {}) {
  const size = Math.max(o.size || 12, (o.floor || 11) / (S.scale || 1));
  ctx.font = `${o.weight || 400} ${size}px ${o.family || FONTS.gothic}`;
  ctx.fillStyle = o.color || '#000';
  ctx.textAlign = o.align || 'left';
  ctx.textBaseline = o.baseline || 'middle';
  ctx.fillText(str, x, y);
  return size;
}

export function rrect(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function sheet(ctx, r, pal, o = {}) {
  rrect(ctx, r.x, r.y, r.w, r.h, o.r == null ? 4 : o.r);
  ctx.fillStyle = o.fill || pal.sheet;
  ctx.fill();
  ctx.lineWidth = o.lw || 1;
  ctx.strokeStyle = o.stroke || pal.ink;
  ctx.stroke();
}

// Orthogonal connector with rounded elbows (Diagram Design §6: r=8, smaller only when a leg is short).
export function tracePath(ctx, pts, r = 8) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
    const rad = Math.min(r, Math.hypot(x1 - x0, y1 - y0) / 2, Math.hypot(x2 - x1, y2 - y1) / 2);
    ctx.arcTo(x1, y1, x2, y2, rad);
  }
  const last = pts[pts.length - 1];
  ctx.lineTo(last[0], last[1]);
}

function pathLength(pts) {
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return total;
}

export function pointAt(pts, f) {
  let remain = clamp(f) * pathLength(pts);
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const seg = Math.hypot(x1 - x0, y1 - y0);
    if (remain <= seg && seg > 0) return [x0 + (x1 - x0) * remain / seg, y0 + (y1 - y0) * remain / seg];
    remain -= seg;
  }
  return pts[pts.length - 1].slice();
}

export function partPath(pts, f) {
  f = clamp(f);
  if (f >= 1) return pts;
  let remain = f * pathLength(pts);
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const seg = Math.hypot(x1 - x0, y1 - y0);
    if (remain <= seg) {
      out.push(seg > 0 ? [x0 + (x1 - x0) * remain / seg, y0 + (y1 - y0) * remain / seg] : [x1, y1]);
      return out;
    }
    out.push(pts[i]);
    remain -= seg;
  }
  return out;
}

export function arrow(ctx, pts, o = {}) {
  if (pts.length < 2) return;
  ctx.save();
  ctx.strokeStyle = o.color;
  ctx.lineWidth = o.width || 1.2;
  ctx.setLineDash(o.dash || []);
  tracePath(ctx, pts, o.r == null ? 8 : o.r);
  ctx.stroke();
  ctx.setLineDash([]);
  if (o.head !== false) {
    const [x1, y1] = pts[pts.length - 1];
    let j = pts.length - 2;
    while (j > 0 && pts[j][0] === x1 && pts[j][1] === y1) j--;
    const a = Math.atan2(y1 - pts[j][1], x1 - pts[j][0]);
    const len = o.headLen || 7, w = o.headW || 3;
    const cos = Math.cos(a), sin = Math.sin(a);
    ctx.fillStyle = o.color;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - len * cos + w * sin, y1 - len * sin - w * cos);
    ctx.lineTo(x1 - len * cos - w * sin, y1 - len * sin + w * cos);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/* Small marks drawn by hand for this page (no upstream icons). */
function glyphWrench(ctx, x, y, s, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, s * 0.32);
  ctx.beginPath();
  ctx.arc(x - s * 0.35, y - s * 0.35, s * 0.5, 0, Math.PI * 2);
  ctx.moveTo(x, y);
  ctx.lineTo(x + s * 0.8, y + s * 0.8);
  ctx.stroke();
  ctx.restore();
}

function glyphCheck(ctx, x, y, s, k, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.strokeRect(x - s, y - s, s * 2, s * 2);
  if (k > 0) {
    ctx.lineWidth = Math.max(1.2, s * 0.4);
    ctx.lineCap = 'round';
    const tick = [[x - s * 0.55, y], [x - s * 0.1, y + s * 0.5], [x + s * 0.65, y - s * 0.55]];
    const part = partPath(tick, k);
    ctx.beginPath();
    ctx.moveTo(part[0][0], part[0][1]);
    for (const p of part.slice(1)) ctx.lineTo(p[0], p[1]);
    ctx.stroke();
  }
  ctx.restore();
}

function glyphBrowser(ctx, x, y, s, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.strokeRect(x - s * 1.2, y - s, s * 2.4, s * 2);
  ctx.beginPath();
  ctx.moveTo(x - s * 1.2, y - s * 0.4);
  ctx.lineTo(x + s * 1.2, y - s * 0.4);
  ctx.stroke();
  ctx.restore();
}

export function miniPage(ctx, cx, cy, w, h, pal, S, tag) {
  const x = cx - w / 2, y = cy - h / 2, fold = Math.min(5, w * 0.3);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w - fold, y);
  ctx.lineTo(x + w, y + fold);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.fillStyle = pal.sheet;
  ctx.fill();
  ctx.strokeStyle = pal.ink;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.strokeStyle = pal.faint;
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(x + 3, y + h * (0.3 + i * 0.2));
    ctx.lineTo(x + w - 4 - (i % 2) * 3, y + h * (0.3 + i * 0.2));
    ctx.stroke();
  }
  if (tag && (S.scale || 1) * w >= 30) label(ctx, S, tag, cx, y + h + 7, {size: 8, floor: 9, family: FONTS.mono, color: pal.ink, align: 'center'});
  ctx.restore();
}

export function stripsToken(ctx, r, pal, S, withCodes) {
  ctx.save();
  const h = r.h / 3;
  ['C', 'R', 'S'].forEach((code, i) => {
    ctx.fillStyle = pal.lane[i];
    ctx.fillRect(r.x, r.y + i * h, r.w, h);
    if (withCodes && h * (S.scale || 1) >= 15) label(ctx, S, code, r.x + 4, r.y + i * h + h / 2, {size: Math.min(12, h * 0.6), family: FONTS.mono, color: pal.soft});
  });
  ctx.strokeStyle = pal.ink;
  ctx.lineWidth = 1;
  ctx.strokeRect(r.x, r.y, r.w, r.h);
  ctx.strokeStyle = pal.rule;
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(r.x, r.y + i * h);
    ctx.lineTo(r.x + r.w, r.y + i * h);
    ctx.stroke();
  }
  ctx.restore();
}

/* ---------- Layouts (layout units; the page and the film scale them) ---------- */

export function portraitLayout() {
  const book = {x: 8, y: 24, w: 140, h: 94};
  const tabH = 14.5, tabGap = (94 - 6 * 14.5) / 5;
  return {
    kind: 'portrait', w: 360, h: 420,
    captions: [{x: 8, y: 14, text: '指針'}, {x: 192, y: 14, text: '依頼', chip: '架空'}],
    book,
    tabs: PART_IDS.map((id, i) => ({id, x: 148, y: book.y + i * (tabH + tabGap), w: 36, h: tabH})),
    request: {x: 192, y: 24, w: 160, h: 94},
    strips: [
      {code: 'C', label: '顧客', x: 198, y: 30, h: 16, bandX: 256, bandW: 44},
      {code: 'R', label: '受付', x: 198, y: 50, h: 16, bandX: 256, bandW: 44},
      {code: 'S', label: '専門担当', x: 198, y: 70, h: 16, bandX: 256, bandW: 44}
    ],
    fork: {x: 312, y: 58, s: 6.5},
    ret: {x0: 324, x: 338, y1: 38, y2: 58},
    chips: CHIPS.map((text, i) => ({text, x: 198 + i * 38, y: 96, w: 35, h: 16})),
    ai: {x: 24, y: 134, w: 108, h: 30},
    card: {x: 88, y: 167, w: 90, h: 20},
    paper: {x: 8, y: 190, w: 188, h: 92, head: 18},
    operator: {x: 216, y: 190, w: 136, h: 92},
    opName: 205,
    opRows: [{text: '点検', y: 222, glyph: 'check'}, {text: 'SVG書出', y: 237, glyph: 'tool'}, {text: 'PNG撮影', y: 252, glyph: 'browser'}],
    opRule: 261,
    ack: {y: 272, text: '12条件の照合は別'},
    figure: {x: 91, y: 314, w: 178, h: 100.125},
    tags: [{text: 'HTML', x: 95, y: 296, w: 52, h: 18}, {text: 'SVG', x: 153, y: 296, w: 52, h: 18}, {text: 'PNG', x: 211, y: 296, w: 52, h: 18}],
    action: {x: 280, y: 352, w: 72, h: 24, text: '開く・編集'},
    routeLabel: {x: 8, y: 334},
    zones: [{bar: {x: 0, y: 4, w: 3, h: 116}}, {bar: {x: 0, y: 126, w: 3, h: 160}}, {bar: {x: 0, y: 290, w: 3, h: 126}}],
    edges: {
      bookAI: {z: 0, pts: [[78, 118], [78, 134]]},
      reqAI: {z: 0, pts: [[272, 118], [272, 149], [132, 149]]},
      aiPaper: {z: 1, pts: [[78, 164], [78, 190]]},
      paperOp: {z: 1, pts: [[196, 212], [216, 212]]},
      html: {z: 2, pts: [[121, 282], [121, 296]]},
      svg: {z: 2, pts: [[224, 282], [224, 289], [179, 289], [179, 296]]},
      png: {z: 2, pts: [[248, 282], [248, 296]]},
      action: {z: 2, pts: [[269, 364], [280, 364]], accent: true}
    },
    forkLabels: [],
    toolTargets: [[230, 222], [230, 237]],
    glyph: 4
  };
}

export function wideLayout() {
  const book = {x: 20, y: 34, w: 180, h: 120};
  const tabH = 18, tabGap = (120 - 6 * 18) / 5;
  return {
    kind: 'wide', w: 960, h: 420,
    captions: [{x: 20, y: 20, text: '指針'}, {x: 20, y: 228, text: '依頼', chip: '架空'}],
    book,
    tabs: PART_IDS.map((id, i) => ({id, x: 200, y: book.y + i * (tabH + tabGap), w: 44, h: tabH})),
    request: {x: 20, y: 242, w: 224, h: 150},
    strips: [
      {code: 'C', label: '顧客', x: 32, y: 254, h: 22, bandX: 100, bandW: 92},
      {code: 'R', label: '受付', x: 32, y: 284, h: 22, bandX: 100, bandW: 92},
      {code: 'S', label: '専門担当', x: 32, y: 314, h: 22, bandX: 100, bandW: 92}
    ],
    fork: {x: 208, y: 295, s: 8},
    ret: {x0: 222, x: 234, y1: 265, y2: 295},
    chips: CHIPS.map((text, i) => ({text, x: 32 + i * 52, y: 356, w: 46, h: 22})),
    ai: {x: 292, y: 192, w: 112, h: 40},
    card: {x: 405, y: 186, w: 86, h: 20},
    paper: {x: 492, y: 132, w: 184, h: 160, head: 22},
    operator: {x: 492, y: 318, w: 184, h: 84},
    opName: 338,
    opRows: [{text: '点検', sub: 'self_check・geometry', y: 361, glyph: 'check'}],
    opRule: 375,
    ack: {y: 389, text: '12条件の照合は検査とは別'},
    figure: {x: 716, y: 62, w: 228, h: 128.25},
    tags: [{text: 'HTML', x: 724, y: 190.25, w: 60, h: 18}, {text: 'SVG', x: 800, y: 190.25, w: 60, h: 18}, {text: 'PNG', x: 876, y: 190.25, w: 60, h: 18}],
    action: {x: 832, y: 24, w: 112, h: 24, text: '開く・編集に使う'},
    routeLabel: {x: 716, y: 32},
    zones: [{bar: {x: 8, y: 412, w: 248, h: 3}}, {bar: {x: 268, y: 412, w: 420, h: 3}}, {bar: {x: 700, y: 412, w: 252, h: 3}}],
    edges: {
      bookAI: {z: 0, pts: [[110, 154], [110, 172], [348, 172], [348, 192]]},
      reqAI: {z: 0, pts: [[244, 317], [348, 317], [348, 232]]},
      aiPaper: {z: 1, pts: [[404, 212], [492, 212]]},
      paperOp: {z: 1, pts: [[584, 292], [584, 318]]},
      html: {z: 2, pts: [[676, 252], [754, 252], [754, 208.25]]},
      svg: {z: 2, pts: [[676, 346], [830, 346], [830, 208.25]]},
      png: {z: 2, pts: [[676, 378], [906, 378], [906, 208.25]]},
      action: {z: 2, pts: [[888, 62], [888, 48]], accent: true}
    },
    forkLabels: [
      {edge: 'html', text: '正本のまま', cx: 715, cy: 236},
      {edge: 'svg', text: 'export_svg.py', mono: true, cx: 753, cy: 330},
      {edge: 'png', text: 'ブラウザー撮影', cx: 791, cy: 362}
    ],
    toolTargets: [[506, 361], [692, 330]],
    glyph: 5
  };
}

export function paperLanes(L) {
  const p = L.paper;
  const x = p.x + 4, y = p.y + p.head + 2, w = p.w - 8, h = p.h - p.head - 6;
  return [0, 1, 2].map(i => ({x, y: y + i * h / 3, w, h: h / 3}));
}

export function bookToolPos(L, i) {
  const b = L.book;
  return [b.x + b.w - 14, b.y + b.h * (0.66 + i * 0.18)];
}

const tagsBox = L => {
  const a = L.tags[0], z = L.tags[L.tags.length - 1];
  return {x: a.x, y: a.y, w: z.x + z.w - a.x, h: a.h};
};

function partTarget(L, part) {
  if (part === 'choose') return L.card;
  if (part === 'check') return L.operator;
  if (part === 'export') return tagsBox(L);
  return L.paper;
}

// Mapping from the actual figure's viewBox (1280×720) into a rect.
export function figureMap(r) {
  return {x: x => r.x + x * r.w / 1280, y: y => r.y + y * r.h / 720, s: r.w / 1280};
}

export function drawRoute(ctx, r, model, routeId, k, pal, o = {}) {
  const route = model.routes[routeId];
  if (!route || k <= 0) return;
  const m = figureMap(r);
  const width = o.width || Math.max(1.6, m.s * 6);
  const color = o.color || pal.accent;
  const total = route.edges.length;
  ctx.save();
  ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha;
  route.edges.forEach((id, i) => {
    const local = clamp(k * total - i);
    if (local <= 0) return;
    const e = model.edgeById.get(id);
    const pts = partPath(e.points.map(([x, y]) => [m.x(x), m.y(y)]), local);
    arrow(ctx, pts, {color, width, dash: e.kind === 'return' ? [width * 2.4, width * 1.6] : [], r: 8 * m.s, head: local >= 1, headLen: width * 3.2, headW: width * 1.4});
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = width * 0.8;
  route.nodes.forEach((id, i) => {
    if (i > 0 && clamp(k * total - (i - 1)) < 1) return;
    const b = model.nodeById.get(id).bbox;
    const pad = 4 * m.s + width;
    rrect(ctx, m.x(b.x) - pad, m.y(b.y) - pad, b.w * m.s + pad * 2, b.h * r.h / 720 + pad * 2, 6 * m.s + width);
    ctx.stroke();
  });
  ctx.restore();
}

export function drawFigure(ctx, r, model, pal, o = {}) {
  ctx.save();
  ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha;
  ctx.fillStyle = '#f2eee3';
  ctx.fillRect(r.x, r.y, r.w, r.h);
  if (model && model.img) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(model.img, r.x, r.y, r.w, r.h);
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = pal.ink;
  ctx.lineWidth = o.frame || 1;
  ctx.strokeRect(r.x, r.y, r.w, r.h);
  ctx.restore();
}

/* ---------- The connected network ---------- */

// Rest state: everything built, no tokens in flight. The page and the film override parts of it.
export function restState() {
  return {
    book: 1, tabs: 1, bookMarks: 1, request: 1, chips: 1, inflow: 1, ai: 1, card: 1,
    unfold: 1, lanes: 1, units: 1, returns: 1, tools: 1, toOp: 1, check: 1, ack: 1,
    fork: 1, tags: 1, tagsLit: 0, figure: 1, action: 1, zone: -1, part: null, route: null, scale: 1
  };
}

function drawCaptions(ctx, L, S, pal) {
  for (const c of L.captions) {
    const size = label(ctx, S, c.text, c.x, c.y, {size: 15, floor: 14, weight: 600, family: FONTS.mincho, color: pal.ink});
    if (c.chip) {
      const w = ctx.measureText(c.text).width;
      const cs = Math.max(11, 11 / (S.scale || 1));
      ctx.font = `400 ${cs}px ${FONTS.gothic}`;
      const cw = ctx.measureText(c.chip).width + 8;
      const cx = c.x + w + 6;
      ctx.strokeStyle = pal.soft;
      ctx.lineWidth = 0.8;
      rrect(ctx, cx, c.y - size * 0.5, cw, size, 2);
      ctx.stroke();
      label(ctx, S, c.chip, cx + cw / 2, c.y, {size: 11, color: pal.soft, align: 'center'});
    }
  }
}

function drawBook(ctx, L, S, pal) {
  const b = L.book, half = b.w / 2, spine = b.x + half, open = clamp(S.book);
  sheet(ctx, {x: spine, y: b.y, w: half, h: b.h}, pal, {r: 3});
  if (open >= 0.5) {
    const w = half * (open - 0.5) * 2;
    sheet(ctx, {x: spine - w, y: b.y, w, h: b.h}, pal, {r: 3});
  }
  const marks = open >= 1 ? clamp(S.bookMarks) : 0;
  if (marks > 0) {
    ctx.save();
    ctx.globalAlpha = marks;
    label(ctx, S, '手順書', b.x + 7, b.y + b.h * 0.16, {size: 12, weight: 600, color: pal.ink});
    ctx.strokeStyle = pal.faint;
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const y = b.y + b.h * (0.36 + i * 0.14);
      ctx.beginPath();
      ctx.moveTo(b.x + 7, y);
      ctx.lineTo(spine - 7 - (i % 2) * 12, y);
      ctx.stroke();
    }
    label(ctx, S, '参照', spine + 7, b.y + b.h * 0.16, {size: 12, weight: 600, color: pal.ink});
    ctx.strokeStyle = pal.soft;
    ctx.lineWidth = 0.8;
    for (let j = 2; j >= 0; j--) ctx.strokeRect(spine + 7 + j * 3, b.y + b.h * 0.3 + j * 3, half * 0.42, b.h * 0.13);
    const tx = spine + 7, ty = b.y + b.h * 0.6, tw = half * 0.42, th = b.h * 0.22;
    ctx.strokeStyle = pal.ink;
    ctx.strokeRect(tx, ty, tw, th);
    ctx.beginPath();
    ctx.moveTo(tx, ty + th * 0.28);
    ctx.lineTo(tx + tw, ty + th * 0.28);
    ctx.stroke();
    if (!moving(S.tools)) for (let i = 0; i < 2; i++) glyphWrench(ctx, ...bookToolPos(L, i), L.glyph, pal.ink);
    ctx.restore();
  }
  if (open < 0.5) {
    const w = half * (1 - open * 2);
    rrect(ctx, spine, b.y, w, b.h, 3);
    ctx.fillStyle = pal.ink;
    ctx.fill();
    if (w * (S.scale || 1) > 40) label(ctx, S, '指針', spine + w / 2, b.y + b.h / 2, {size: 16, weight: 600, family: FONTS.mincho, color: pal.onInk, align: 'center'});
  }
  ctx.strokeStyle = pal.ink;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(spine, b.y);
  ctx.lineTo(spine, b.y + b.h);
  ctx.stroke();

  L.tabs.forEach((t, i) => {
    const local = open >= 1 ? clamp(S.tabs * 6 - i) : 0;
    if (local <= 0) return;
    const w = t.w * ease(local);
    const on = S.part === t.id;
    rrect(ctx, t.x, t.y, w, t.h, 2);
    ctx.fillStyle = on ? pal.ink : pal.sheet;
    ctx.fill();
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = 1;
    ctx.stroke();
    if (local > 0.7) label(ctx, S, PART_TABS[t.id], t.x + w / 2 + 1, t.y + t.h / 2, {size: 12, weight: on ? 600 : 400, color: on ? pal.onInk : pal.ink, align: 'center'});
  });
}

function drawRequest(ctx, L, S, pal) {
  sheet(ctx, L.request, pal, {r: 3});
  L.strips.forEach((st, i) => {
    const local = clamp(S.request * 3 - i);
    if (local <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, local * 1.5);
    label(ctx, S, st.label, st.x, st.y + st.h / 2, {size: 12, color: pal.ink});
    ctx.restore();
    ctx.fillStyle = pal.lane[i];
    ctx.fillRect(st.bandX, st.y, st.bandW * ease(local), st.h);
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = 0.8;
    ctx.strokeRect(st.bandX, st.y, st.bandW * ease(local), st.h);
  });
  const marks = clamp(S.request * 3 - 2);
  if (marks > 0) {
    ctx.save();
    ctx.globalAlpha = marks;
    const f = L.fork;
    ctx.beginPath();
    ctx.moveTo(f.x, f.y - f.s);
    ctx.lineTo(f.x + f.s, f.y);
    ctx.lineTo(f.x, f.y + f.s);
    ctx.lineTo(f.x - f.s, f.y);
    ctx.closePath();
    ctx.fillStyle = pal.sheet;
    ctx.fill();
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = 1;
    ctx.stroke();
    const r = L.ret;
    arrow(ctx, [[r.x0, r.y1], [r.x, r.y1], [r.x, r.y2], [r.x0, r.y2]], {color: pal.soft, width: 1.2, dash: [3, 2], r: 4, headLen: 5, headW: 2.5});
    ctx.restore();
  }
  L.chips.forEach((c, i) => {
    const local = clamp(S.chips * 4 - i);
    if (local <= 0) return;
    ctx.save();
    ctx.globalAlpha = local;
    rrect(ctx, c.x, c.y, c.w, c.h, 2);
    ctx.fillStyle = pal.bg;
    ctx.fill();
    ctx.strokeStyle = pal.soft;
    ctx.lineWidth = 0.8;
    ctx.stroke();
    label(ctx, S, c.text, c.x + c.w / 2, c.y + c.h / 2, {size: 11, color: pal.ink, align: 'center'});
    ctx.restore();
  });
}

function drawPaper(ctx, L, S, pal, model) {
  const p = L.paper;
  sheet(ctx, p, pal, {r: 3});
  const hs = Math.min(12, p.head - 4);
  ctx.font = `400 ${Math.max(hs, 11 / (S.scale || 1))}px ${FONTS.mono}`;
  const tw = ctx.measureText('HTML').width + 8;
  ctx.strokeStyle = pal.ink;
  ctx.lineWidth = 0.8;
  rrect(ctx, p.x + 5, p.y + 3, tw, p.head - 5, 2);
  ctx.stroke();
  label(ctx, S, 'HTML', p.x + 5 + tw / 2, p.y + 3 + (p.head - 5) / 2, {size: hs, family: FONTS.mono, color: pal.ink, align: 'center'});
  label(ctx, S, 'SVG入り', p.x + 11 + tw, p.y + 3 + (p.head - 5) / 2, {size: hs, color: pal.soft});

  const lanes = paperLanes(L);
  const lanesK = clamp(S.lanes);
  if (lanesK > 0) {
    ctx.save();
    ctx.globalAlpha = lanesK;
    lanes.forEach((ln, i) => {
      ctx.fillStyle = pal.lane[i];
      ctx.fillRect(ln.x, ln.y, ln.w, ln.h);
      if (ln.h * (S.scale || 1) >= 15) label(ctx, S, 'CRS'[i], ln.x + 3, ln.y + ln.h / 2, {size: Math.min(11, ln.h * 0.55), family: FONTS.mono, color: pal.soft});
    });
    ctx.strokeStyle = pal.rule;
    ctx.lineWidth = 0.8;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(lanes[0].x, lanes[i].y);
      ctx.lineTo(lanes[0].x + lanes[0].w, lanes[i].y);
      ctx.stroke();
    }
    ctx.restore();
  }
  if (!model || clamp(S.units) <= 0) return;
  const top = lanes[0].y, height = lanes[0].h * 3;
  const ax = lanes[0].x + 14, bx = lanes[0].x + lanes[0].w - 3;
  const X = x => ax + (x - 176) * (bx - ax) / 1048;
  const Y = y => top + (y - 116) * height / 480;
  const nodes = model.data.nodes;
  const shown = new Map(nodes.map((n, i) => [n.id, clamp(S.units * nodes.length - i)]));
  ctx.save();
  for (const e of model.data.edges) {
    if (shown.get(e.from) < 1 || shown.get(e.to) < 1) continue;
    const isReturn = e.kind === 'return';
    const k = isReturn ? clamp(S.returns) : 1;
    if (k <= 0) continue;
    arrow(ctx, partPath(e.points.map(([x, y]) => [X(x), Y(y)]), k), {
      color: e.style === 'accent' ? pal.accent : pal.soft, width: 0.8, dash: isReturn ? [2.5, 1.8] : [], r: 2, head: k >= 1, headLen: 3, headW: 1.4
    });
  }
  for (const n of nodes) {
    const k = ease(shown.get(n.id));
    if (k <= 0) continue;
    const b = n.bbox;
    const w = (b.w * (bx - ax) / 1048) * k, h = (b.h * height / 480) * k;
    const cx = X(b.x + b.w / 2), cy = Y(b.y + b.h / 2);
    rrect(ctx, cx - w / 2, cy - h / 2, w, h, 1.5);
    ctx.fillStyle = n.focal ? pal.accentTint : pal.sheet;
    ctx.fill();
    ctx.strokeStyle = n.focal ? pal.accent : pal.ink;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
  ctx.restore();
}

function drawOperator(ctx, L, S, pal) {
  const o = L.operator;
  sheet(ctx, o, pal, {r: 3});
  label(ctx, S, '制作担当', o.x + o.w / 2, L.opName, {size: 15, floor: 14, weight: 600, color: pal.ink, align: 'center'});
  const toolsHere = clamp(S.tools) >= 1;
  for (const row of L.opRows) {
    const gx = o.x + 14;
    if (row.glyph === 'check') glyphCheck(ctx, gx, row.y, L.glyph, clamp(S.check), pal.ink);
    else if (row.glyph === 'tool' && toolsHere) glyphWrench(ctx, gx, row.y, L.glyph, pal.ink);
    else if (row.glyph === 'browser') glyphBrowser(ctx, gx, row.y, L.glyph, pal.ink);
    label(ctx, S, row.text, o.x + 26, row.y, {size: 12, color: pal.ink});
    if (row.sub) {
      const x = o.x + 32 + ctx.measureText(row.text).width;
      ctx.font = `400 ${Math.max(11, 11 / (S.scale || 1))}px ${FONTS.mono}`;
      const sub = ctx.measureText(row.sub).width <= o.x + o.w - 8 - x ? row.sub : 'self_check ほか';
      label(ctx, S, sub, x, row.y, {size: 11, family: FONTS.mono, color: pal.soft});
    }
  }
  const ack = clamp(S.ack);
  ctx.strokeStyle = pal.rule;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(o.x + 8, L.opRule);
  ctx.lineTo(o.x + o.w - 8, L.opRule);
  ctx.stroke();
  if (ack > 0) {
    ctx.save();
    ctx.globalAlpha = ack;
    label(ctx, S, L.ack.text, o.x + o.w / 2, L.ack.y, {size: 11, color: pal.soft, align: 'center'});
    ctx.restore();
  }
}

function drawOutputs(ctx, L, S, pal, model) {
  const f = L.figure;
  const shown = clamp(S.figure);
  if (shown > 0) drawFigure(ctx, f, model, pal, {alpha: shown});
  else {
    ctx.strokeStyle = pal.rule;
    ctx.lineWidth = 1;
    ctx.strokeRect(f.x, f.y, f.w, f.h);
  }
  if (S.route && S.route.id && shown >= 1 && model) drawRoute(ctx, f, model, S.route.id, S.route.k, pal, {width: Math.max(1.6, 2.2 / Math.max(1, (S.scale || 1) / 1.4))});

  const tagK = clamp(S.tags);
  for (const t of L.tags) {
    rrect(ctx, t.x, t.y, t.w, t.h, 2);
    ctx.fillStyle = pal.sheet;
    ctx.fill();
    if (S.tagsLit > 0) {
      ctx.save();
      ctx.globalAlpha = clamp(S.tagsLit);
      ctx.fillStyle = pal.accentTint;
      ctx.fill();
      ctx.restore();
    }
    ctx.strokeStyle = tagK > 0 ? pal.ink : pal.rule;
    ctx.lineWidth = 1;
    ctx.stroke();
    if (tagK > 0) {
      ctx.save();
      ctx.globalAlpha = tagK;
      label(ctx, S, t.text, t.x + t.w / 2, t.y + t.h / 2, {size: 12, family: FONTS.mono, weight: 600, color: pal.ink, align: 'center'});
      ctx.restore();
    }
  }

  const a = L.action, ak = clamp(S.action);
  rrect(ctx, a.x, a.y, a.w, a.h, 2);
  ctx.fillStyle = pal.bg;
  ctx.fill();
  if (ak > 0) {
    ctx.save();
    ctx.globalAlpha = ak;
    ctx.fillStyle = pal.accentTint;
    ctx.fill();
    ctx.restore();
  }
  ctx.strokeStyle = pal.accent;
  ctx.lineWidth = 1;
  ctx.stroke();
  label(ctx, S, a.text, a.x + a.w / 2, a.y + a.h / 2, {size: 12, weight: 600, color: pal.accent, align: 'center'});

  if (S.route && S.route.id) {
    const rl = L.routeLabel;
    label(ctx, S, '経路', rl.x, rl.y, {size: 11, color: pal.soft});
    label(ctx, S, ROUTE_SHORT[S.route.id], rl.x, rl.y + 20, {size: 16, floor: 14, weight: 600, color: pal.ink});
  }
}

function drawEdgeLabel(ctx, S, pal, cx, cy, text, o = {}) {
  const size = Math.max(o.size || 12, 11 / (S.scale || 1));
  ctx.font = `${o.weight || 400} ${size}px ${o.mono ? FONTS.mono : FONTS.gothic}`;
  const w = ctx.measureText(text).width + 8, h = Math.max(16, size + 4);
  ctx.save();
  ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
  rrect(ctx, cx - w / 2, cy - h / 2, w, h, 2);
  ctx.fillStyle = o.fill || pal.bg;
  ctx.fill();
  if (o.stroke) {
    ctx.strokeStyle = o.stroke;
    ctx.lineWidth = 0.9;
    ctx.stroke();
  }
  label(ctx, S, text, cx, cy, {size, weight: o.weight, family: o.mono ? FONTS.mono : FONTS.gothic, color: o.color || pal.soft, align: 'center'});
  ctx.restore();
}

export function drawNetwork(ctx, L, S, pal, model) {
  ctx.save();
  ctx.lineJoin = 'round';
  if (S.zone >= 0 && L.zones[S.zone]) {
    const b = L.zones[S.zone].bar;
    ctx.fillStyle = pal.accent;
    ctx.fillRect(b.x, b.y, b.w, b.h);
  }
  for (const e of Object.values(L.edges)) {
    const active = S.zone === e.z;
    arrow(ctx, e.pts, {color: e.accent ? pal.accent : active ? pal.ink : pal.soft, width: active ? 1.6 : 1.2, r: 8});
  }
  // Labels sit on masks beside their connector (Diagram Design §6 rule 2).
  if (S.card > 0) {
    const c = L.card;
    drawEdgeLabel(ctx, S, pal, c.x + c.w / 2, c.y + c.h / 2, 'スイムレーン', {size: 13, weight: 600, color: pal.ink, stroke: pal.ink, fill: pal.sheet, alpha: clamp(S.card)});
  }
  const forkK = clamp(S.fork * 1.6);
  for (const fl of L.forkLabels) {
    if (forkK > 0) drawEdgeLabel(ctx, S, pal, fl.cx, fl.cy, fl.text, {size: 12, mono: fl.mono, alpha: forkK});
  }
  // Wide layout: the exporter helper rests beside its own fork instead of inside the operator box.
  if (L.kind === 'wide' && clamp(S.tools) >= 1) glyphWrench(ctx, ...L.toolTargets[1], L.glyph, pal.ink);

  drawCaptions(ctx, L, S, pal);
  drawBook(ctx, L, S, pal);
  drawRequest(ctx, L, S, pal);

  const ai = L.ai;
  const glow = moving(S.ai) ? Math.sin(Math.PI * S.ai) : 0;
  sheet(ctx, ai, pal, {r: 6, lw: 1 + glow * 1.4, fill: pal.sheet});
  label(ctx, S, 'AIが執筆', ai.x + ai.w / 2, ai.y + ai.h / 2, {size: 15, floor: 14, weight: 600, color: pal.ink, align: 'center'});

  drawPaper(ctx, L, S, pal, model);
  drawOperator(ctx, L, S, pal);
  drawOutputs(ctx, L, S, pal, model);

  // Tokens: the same shapes travel along the connectors.
  if (moving(S.inflow)) {
    const [bx, by] = pointAt(L.edges.bookAI.pts, S.inflow);
    miniPage(ctx, bx, by, 14, 17, pal, S);
    const [rx, ry] = pointAt(L.edges.reqAI.pts, S.inflow);
    stripsToken(ctx, {x: rx - 10, y: ry - 7, w: 20, h: 14}, pal, S, false);
  }
  if (moving(S.unfold)) {
    const lanes = paperLanes(L);
    const target = {x: lanes[0].x, y: lanes[0].y, w: lanes[0].w, h: lanes[0].h * 3};
    const k = ease(S.unfold);
    const [px, py] = pointAt(L.edges.aiPaper.pts, Math.min(1, k * 1.6));
    const small = {x: px - 10, y: py - 7, w: 20, h: 14};
    stripsToken(ctx, k < 0.62 ? small : lerpRect(small, target, (k - 0.62) / 0.38), pal, S, k > 0.9);
  }
  if (moving(S.tools)) {
    for (let i = 0; i < 2; i++) {
      const [sx, sy] = bookToolPos(L, i);
      const [tx, ty] = L.toolTargets[i];
      const k = ease(S.tools);
      glyphWrench(ctx, lerp(sx, tx, k), lerp(sy, ty, k) - Math.sin(Math.PI * k) * 18, L.glyph * 1.2, pal.ink);
    }
  }
  if (moving(S.toOp)) {
    const [x, y] = pointAt(L.edges.paperOp.pts, S.toOp);
    miniPage(ctx, x, y, 16, 20, pal, S, 'HTML');
  }
  if (moving(S.fork)) {
    for (const [name, tag] of [['html', 'HTML'], ['svg', 'SVG'], ['png', 'PNG']]) {
      const [x, y] = pointAt(L.edges[name].pts, S.fork);
      miniPage(ctx, x, y, 14, 17, pal, S, tag);
    }
  }

  if (S.part && S.ring !== false) {
    const r = partTarget(L, S.part);
    ctx.strokeStyle = pal.accent;
    ctx.lineWidth = 1.6;
    rrect(ctx, r.x - 4, r.y - 4, r.w + 8, r.h + 8, 5);
    ctx.stroke();
  }
  ctx.restore();
}

/* ---------- Page (index.html) ---------- */

const STAGE_MS = 2600;
const STAGE_NOTES = ['指針と依頼を同じAIへ渡す', 'AIが描き、制作担当が点検・書出し', '保存済みの図を開き、編集に使う'];
const STAGE_NAMES = ['渡す', '描く', '使う'];

function stageValues(k, f) {
  if (k === 0) {
    return {
      tabs: clamp(f / 0.35), bookMarks: clamp((f - 0.05) / 0.3), request: clamp((f - 0.15) / 0.3),
      chips: clamp((f - 0.35) / 0.2), inflow: f < 0.55 ? 0 : clamp((f - 0.55) / 0.3), ai: clamp((f - 0.85) / 0.15)
    };
  }
  if (k === 1) {
    return {
      card: clamp(f / 0.18), unfold: clamp((f - 0.15) / 0.3), lanes: clamp((f - 0.35) / 0.15), units: clamp((f - 0.42) / 0.25),
      returns: clamp((f - 0.65) / 0.12), toOp: clamp((f - 0.75) / 0.13), check: clamp((f - 0.88) / 0.12), ack: clamp((f - 0.9) / 0.1)
    };
  }
  return {
    fork: clamp(f / 0.35), tags: clamp((f - 0.25) / 0.15), figure: clamp((f - 0.3) / 0.2),
    routeK: clamp((f - 0.5) / 0.35), action: clamp((f - 0.85) / 0.15)
  };
}

function boot() {
  const $ = id => document.getElementById(id);
  const root = document.documentElement;
  const canvas = $('concept-map');
  const wrap = $('map-wrap');
  const ctx = canvas.getContext('2d');
  const status = $('load-status');
  const retry = $('retry');
  const replay = $('replay');
  const stageNote = $('stage-note');
  const summary = $('map-summary');
  const presets = Array.from(document.querySelectorAll('button[data-preset]'));
  const stages = Array.from(document.querySelectorAll('button[data-stage]'));
  const partButtons = Array.from(document.querySelectorAll('button[data-part]'));
  const copyButton = $('copy-request');
  const copyStatus = $('copy-status');
  const requestText = $('request-text');
  const themeButton = $('theme');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const LAYOUTS = {portrait: portraitLayout(), wide: wideLayout()};
  const LINK_IDS = ['open-figure', 'save-svg', 'save-png', 'save-html', 'open-desk', 'save-record'];
  const TEXT_IDS = ['part-label', 'part-meaning', 'part-quote', 'record-meta', 'record-content', 'record-edges', 'run-tools', 'run-counts', 'assumptions'];

  let gen = 0;
  let controller = null;
  let model = null;
  let raf = 0;
  const view = {route: 'route-main', stage: 2, part: 'choose', partShown: false, anim: null, routeAnim: null, size: null};

  /* Theme: the page's own light/dark; only the choice is stored. */
  const THEME_KEY = 'studio-yebisu-theme';
  const storedTheme = () => {
    try {
      const v = window.localStorage.getItem(THEME_KEY);
      return v === 'light' || v === 'dark' ? v : null;
    } catch (_) {
      return null;
    }
  };
  const theme = () => root.dataset.theme || (darkQuery.matches ? 'dark' : 'light');
  function applyTheme(value, save) {
    if (value) root.dataset.theme = value;
    else delete root.dataset.theme;
    if (save) {
      try { window.localStorage.setItem(THEME_KEY, value); } catch (_) { /* private mode */ }
    }
    const dark = theme() === 'dark';
    themeButton.setAttribute('aria-pressed', String(dark));
    themeButton.textContent = dark ? '明るく' : '暗く';
    themeButton.setAttribute('aria-label', dark ? '明るい表示にする' : '暗い表示にする');
    kick();
  }
  themeButton.addEventListener('click', () => applyTheme(theme() === 'dark' ? 'light' : 'dark', true));
  darkQuery.addEventListener('change', () => applyTheme(root.dataset.theme || null, false));
  applyTheme(storedTheme(), false);

  /* Size: a native phone layout under 760 CSS px, the wide layout above. */
  function measure() {
    const W = Math.max(240, Math.round(wrap.clientWidth));
    const L = W >= 760 ? LAYOUTS.wide : LAYOUTS.portrait;
    const cap = L.kind === 'wide' ? 520 : W < 600 ? 380 : 480;
    const H = Math.round(Math.min(W * L.h / L.w, cap));
    const s = Math.min(W / L.w, H / L.h);
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.style.height = H + 'px';
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    view.size = {W, H, s, dpr, L, ox: (W - L.w * s) / 2, oy: (H - L.h * s) / 2};
  }

  function render(S) {
    const {W, H, s, dpr, L, ox, oy} = view.size;
    const pal = PALETTES[theme()];
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.translate(ox, oy);
    ctx.scale(s, s);
    drawNetwork(ctx, L, S, pal, model);
    ctx.restore();
  }

  function stateAt(now) {
    const S = restState();
    S.scale = view.size.s;
    S.zone = view.stage;
    S.part = view.partShown ? view.part : null;
    S.routeK = 1;
    let running = false;
    if (view.anim) {
      const P = view.anim.from + (now - view.anim.start) / STAGE_MS;
      if (P >= view.anim.to + 1) view.anim = null;
      else {
        running = true;
        for (let k = view.anim.from; k <= view.anim.to; k++) Object.assign(S, stageValues(k, clamp(P - k)));
        S.zone = Math.min(view.anim.to, Math.floor(P));
      }
    }
    if (view.routeAnim) {
      const k = (now - view.routeAnim.start) / 900;
      if (k >= 1) view.routeAnim = null;
      else {
        running = true;
        S.routeK = Math.min(S.routeK, ease(k));
      }
    }
    S.route = {id: view.route, k: S.routeK};
    S.running = running;
    return S;
  }

  function frame(now) {
    raf = 0;
    if (!model || !view.size) return;
    const S = stateAt(now);
    render(S);
    if (S.running) raf = window.requestAnimationFrame(frame);
  }
  function kick() {
    if (!raf && model) raf = window.requestAnimationFrame(frame);
  }
  function animate(anim) {
    if (reduce.matches) return;
    view.anim = anim;
    kick();
  }

  /* Controls depend on verified data; on failure only #retry stays usable. */
  function setControls(on) {
    for (const b of [...presets, ...stages, ...partButtons, replay, copyButton]) b.disabled = !on;
    requestText.disabled = !on;
  }
  function setLink(id, href, download) {
    const a = $(id);
    a.setAttribute('href', href);
    if (download) a.setAttribute('download', download);
    else a.removeAttribute('download');
    a.removeAttribute('aria-disabled');
  }
  function clearAll() {
    if (raf) window.cancelAnimationFrame(raf);
    raf = 0;
    view.anim = null;
    view.routeAnim = null;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const id of LINK_IDS) {
      const a = $(id);
      a.removeAttribute('href');
      a.removeAttribute('download');
      a.setAttribute('aria-disabled', 'true');
    }
    for (const id of ['part-source', 'part-local']) {
      const a = $(id);
      a.removeAttribute('href');
      a.textContent = '';
    }
    for (const id of TEXT_IDS) $(id).textContent = '';
    requestText.value = '';
    copyStatus.textContent = '';
    summary.textContent = '';
    stageNote.textContent = '';
    releaseModel(model);
    model = null;
  }

  function fail(err) {
    clearAll();
    setControls(false);
    root.dataset.state = 'error';
    const message = err instanceof AssetError ? err.message : '保存済みのファイルを確認できませんでした。';
    status.textContent = `${message} 表示を止めました。`;
    retry.hidden = false;
    retry.disabled = false;
  }

  async function load() {
    const my = ++gen;
    if (controller) controller.abort();
    controller = new AbortController();
    clearAll();
    setControls(false);
    root.dataset.state = 'loading';
    status.textContent = '保存済みの27ファイルを照合しています…';
    retry.hidden = true;
    retry.disabled = true;
    try {
      const m = await loadVerified({signal: controller.signal});
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      if (my !== gen) {
        releaseModel(m);
        return;
      }
      model = m;
      populate();
      root.dataset.state = 'ready';
      status.textContent = '27ファイルを照合しました（目録と各ファイルの大きさ・SHA-256が一致）。';
      setControls(true);
      measure();
      fromHash(true);
    } catch (err) {
      if (my !== gen) return;
      fail(err);
    }
  }

  /* Populate DOM from verified data only (textContent, no HTML strings). */
  function li(parent, text, cls) {
    const el = document.createElement('li');
    el.textContent = text;
    if (cls) el.className = cls;
    parent.append(el);
    return el;
  }
  function dlRow(dl, term, desc) {
    const div = document.createElement('div');
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    dt.textContent = term;
    dd.textContent = desc;
    div.append(dt, dd);
    dl.append(div);
  }

  function populate() {
    setLink('open-figure', 'diagrams/intake.html');
    setLink('save-svg', 'diagrams/intake.svg', 'intake.svg');
    setLink('save-png', 'diagrams/intake.png', 'intake.png');
    setLink('save-html', 'diagrams/intake.html', 'intake.html');
    requestText.value = model.request;

    const tools = $('run-tools');
    for (const t of model.tools) li(tools, `${t.tool.split('/').pop()} ${t.options.join(' ')}`.trim() + ` — 終了コード ${t.exit_code}`);
    li(tools, `ブラウザーで撮影（倍率${model.run.exports.png.device_scale_factor}・${model.run.exports.png.output_size.join('×')}）`);

    const counts = $('run-counts');
    const c = model.structure.counts;
    const d = model.data;
    dlRow(counts, '図', `スイムレーン1枚（原典の${c.visual_types_at_pin}種類から）・意味の型${c.semantic_patterns_at_pin}つは不採用`);
    dlRow(counts, '量', `工程${d.budget.nodes.used}/${d.budget.nodes.max}・矢印${d.budget.edges.used}/${d.budget.edges.max}・段${d.budget.lanes.used}/${d.budget.lanes.max}`);
    dlRow(counts, '受け渡し', `段をまたぐ矢印${c.cross_lane_edges}本・戻り道${c.return_edges}本・朱は${d.budget.accent_elements.which.join('と')}だけ`);
    dlRow(counts, '依頼', `断片${c.input_fragments}件（業務の事実${c.business_facts}件）。照合した条件${c.original_checked_conditions}件とは別の数`);
    dlRow(counts, '大きさ', `HTML ${model.sizes.html.toLocaleString('ja-JP')}B・SVG ${model.sizes.svg.toLocaleString('ja-JP')}B・PNG ${model.sizes.png.toLocaleString('ja-JP')}B（2560×1440）`);

    const assumptions = $('assumptions');
    for (const a of d.assumptions) li(assumptions, `${a.id}：${a.text}`);

    selectPart(view.part, false);
  }

  function selectPart(id, show) {
    const part = model && model.parts.find(p => p.id === id);
    if (!part) return;
    view.part = id;
    if (show) view.partShown = true;
    for (const b of partButtons) b.setAttribute('aria-pressed', String(b.dataset.part === id));
    $('part-label').textContent = `${part.tab}｜${part.label}`;
    $('part-meaning').textContent = part.meaning;
    $('part-quote').textContent = part.quote;
    const src = $('part-source');
    src.href = part.url;
    src.textContent = `${part.upstream}#L${part.line}（固定コミット ${PIN.slice(0, 7)}）`;
    const local = $('part-local');
    local.href = part.local;
    local.textContent = `${part.local}:${part.line}`;
    kick();
  }

  function selectRoute(id, o = {}) {
    if (!model || !model.routes[id]) return;
    const r = model.routes[id];
    view.route = id;
    for (const b of presets) b.setAttribute('aria-pressed', String(b.dataset.preset === id));
    setStage(2, {animate: false});
    setLink('open-desk', `desk.html#${id}`);
    setLink('save-record', r.path, `${id}.json`);

    const meta = $('record-meta');
    meta.textContent = '';
    dlRow(meta, '経路ID', r.id);
    dlRow(meta, '名前', `${r.name}（${r.short}）`);
    dlRow(meta, `工程（${r.nodes.length}）`, r.nodes.join(' → '));
    dlRow(meta, `矢印（${r.edges.length}）`, r.edges.join('・'));
    if (r.conditions) dlRow(meta, '完了の条件', r.conditions.join(' ／ '));

    const list = $('record-edges');
    list.textContent = '';
    for (const eid of r.edges) {
      const e = model.edgeById.get(eid);
      const from = model.nodeById.get(e.from), to = model.nodeById.get(e.to);
      li(list, `${e.id}　${e.from} ${from.name} → ${e.to} ${to.name}${e.label ? `「${e.label}」` : ''}${e.kind === 'return' ? '（戻り・破線）' : ''}`, e.style === 'accent' ? 'is-accent' : '');
    }
    $('record-content').textContent = r.text;
    if (o.hash) history.replaceState(null, '', `#${id}`);
    if (o.animate && !reduce.matches) {
      view.routeAnim = {start: performance.now()};
    }
    describe();
    kick();
  }

  function setStage(k, o = {}) {
    view.stage = k;
    for (const b of stages) b.setAttribute('aria-pressed', String(Number(b.dataset.stage) === k));
    stageNote.textContent = `${k + 1} ${STAGE_NAMES[k]}：${STAGE_NOTES[k]}`;
    if (o.animate) animate({from: k, to: k, start: performance.now()});
    describe();
    kick();
  }

  function describe() {
    if (!model) return;
    const r = model.routes[view.route];
    summary.textContent = '';
    const p = document.createElement('p');
    p.textContent = '図の内容：';
    const ol = document.createElement('ol');
    li(ol, '指針（Diagram Design）：6つの見出し（選ぶ・配色・描く・分量・点検・書出）がある手順書と参照・ひな形・Pythonの補助。');
    li(ol, '依頼（架空）：顧客・受付・専門担当の3段、分岐と戻りの印、目的・不足・戻り・完了。');
    li(ol, '指針と依頼が1つのAIへ入り、AIがスイムレーンを選び、SVG入りのHTMLを書く。');
    li(ol, 'HTMLが別の制作担当へ。点検のあと、HTMLは正本のまま、export_svg.pyでSVG、ブラウザーでPNGを作る。12条件の照合は検査とは別。');
    li(ol, `3つのファイルが実際の図（diagrams/intake.png）につながり、開く・編集に使う。表示中の経路：${r.id}（${r.short}）工程 ${r.nodes.join('→')}、矢印 ${r.edges.join('・')}。`);
    summary.append(p, ol);
  }

  function fromHash(initial) {
    const id = location.hash.slice(1);
    if (ROUTE_IDS.includes(id)) selectRoute(id, {animate: !initial});
    else if (id === 'intake-flow') selectRoute('route-main');
    else if (initial) {
      selectRoute('route-main');
      animate({from: 0, to: 2, start: performance.now()});
    }
    kick();
  }

  presets.forEach(b => b.addEventListener('click', () => selectRoute(b.dataset.preset, {hash: true, animate: true})));
  stages.forEach(b => b.addEventListener('click', () => setStage(Number(b.dataset.stage), {animate: true})));
  replay.addEventListener('click', () => {
    setStage(view.stage);
    if (reduce.matches) return;
    animate({from: 0, to: 2, start: performance.now()});
  });
  partButtons.forEach(b => b.addEventListener('click', () => selectPart(b.dataset.part, true)));
  retry.addEventListener('click', () => load());
  window.addEventListener('hashchange', () => {
    if (model) fromHash(false);
  });

  copyButton.addEventListener('click', async () => {
    if (!model) return;
    const text = model.request;
    const my = gen;
    copyStatus.textContent = '';
    try {
      if (!navigator.clipboard || !window.isSecureContext) throw new Error('unavailable');
      await navigator.clipboard.writeText(text);
      if (my === gen && model) copyStatus.textContent = '依頼文をコピーしました。';
    } catch (_) {
      if (my !== gen || !model) return;
      requestText.focus();
      requestText.select();
      copyStatus.textContent = 'コピーできませんでした。枠の文章を選んだので、Ctrl+C（Macは⌘+C）でコピーしてください。';
    }
  });

  let resizeTimer = 0;
  new ResizeObserver(() => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      measure();
      kick();
    }, 60);
  }).observe(wrap);

  measure();
  load();
}

if (typeof document !== 'undefined' && document.getElementById('concept-map')) boot();
