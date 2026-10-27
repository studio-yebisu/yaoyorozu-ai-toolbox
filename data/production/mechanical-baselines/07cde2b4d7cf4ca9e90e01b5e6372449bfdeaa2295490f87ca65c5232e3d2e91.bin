/* AssetFurnace example: shared loader, scenes, map drawer and real-GLB view for the page and the silent film.
   八百万図AIツールボックス, MIT. AssetFurnace (Bingeljell/image-to-3dlab) files keep Apache-2.0; three.js keeps MIT.
   Nothing here compresses, generates or calls a model: it reads the frozen files and draws them. */

export const MANIFEST_SHA256 = '6caba83d259fc7f8aa61c37ec918bd3d6b7fc3c2378650b0bd61aa76fa39d6dc';
export const ASSET_COUNT = 39;
export const FACTS_SCHEMA = 'assetfurnace-actual-facts@1';
export const SOURCE_COMMIT = '91879333e88a0571945b15b0e21e4bc95ec59e31';
export const THREE_VERSION = '0.180.0';
export const PART_IDS = ['app', 'container', 'roles', 'cap', 'gate', 'rebuild'];
export const CASE_IDS = ['cap1024', 'cap512', 'cap256'];
export const MODEL_IDS = ['input', 'cap1024', 'cap512', 'cap256'];
export const FILM = {duration: 32, fps: 30, width: 720, height: 1280, posterTime: 31, freezeAt: 30};

// Asset URLs resolve from this module, so the page (./) and the editor (video/) read the same files.
const ROOT = new URL('./', import.meta.url);
const VENDOR = 'vendor/assetfurnace/';
const BLOB = 'https://github.com/Bingeljell/image-to-3dlab/blob/' + SOURCE_COMMIT + '/';
const CLI = 'scripts/compress_glb_textures.py';
// Same slot list as the original CLI: a texture feeding one of these is read as numbers, not looked at.
const DATA_SLOTS = ['metallicRoughnessTexture', 'normalTexture', 'occlusionTexture'];
const THUMB = 96;

export class LoadFailure extends Error {
  constructor(message, detail) { super(message); this.name = 'LoadFailure'; this.detail = detail || ''; }
}
const fail = (message, detail) => { throw new LoadFailure(message, detail); };
function check(ok, message, detail) { if (!ok) fail(message, detail); }

/* ---------- loading and verification ---------- */

const hex = buf => Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('');
const sha256 = async data => hex(await crypto.subtle.digest('SHA-256', data));
const safePath = p => typeof p === 'string' && /^[A-Za-z0-9._\-/]+$/.test(p) && !p.startsWith('/') &&
  !p.split('/').some(s => s === '' || s === '.' || s === '..');

function same(a, b) {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every(k => Object.prototype.hasOwnProperty.call(b, k) && same(a[k], b[k]));
}
const without = (o, keys) => { const c = {...o}; for (const k of keys) delete c[k]; return c; };

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

// GLB 2.0 container: 12-byte header, then a JSON chunk and one BIN chunk.
function parseGlb(buf, path) {
  const v = new DataView(buf);
  check(buf.byteLength >= 20 && v.getUint32(0, true) === 0x46546C67 && v.getUint32(4, true) === 2 && v.getUint32(8, true) === buf.byteLength,
    'GLBの見出しが読めません', path);
  let o = 12, doc = null, bin = null;
  const chunks = [];
  while (o < buf.byteLength) {
    check(o + 8 <= buf.byteLength, 'GLBのチャンクが途中で切れています', path);
    const len = v.getUint32(o, true), kind = v.getUint32(o + 4, true);
    check(o + 8 + len <= buf.byteLength, 'GLBのチャンクが途中で切れています', path);
    if (kind === 0x4E4F534A) { check(!doc, 'GLBにJSONが2つあります', path); doc = json(buf.slice(o + 8, o + 8 + len), path); chunks.push({type: 'JSON', bytes: len}); }
    else if (kind === 0x004E4942) { check(!bin, 'GLBにBINが2つあります', path); bin = {offset: o + 8, length: len}; chunks.push({type: 'BIN', bytes: len}); }
    o += 8 + len + ((4 - len % 4) % 4);
  }
  check(doc && bin, 'GLBにJSONかBINがありません', path);
  return {doc, bin, chunks};
}

// Read the size straight from the embedded bytes (PNG IHDR or JPEG SOF), not from a record.
function imageHead(u8) {
  if (u8.length >= 24 && u8[0] === 0x89 && u8[1] === 0x50 && u8[2] === 0x4E && u8[3] === 0x47) {
    const v = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    return {format: 'PNG', mime: 'image/png', width: v.getUint32(16), height: v.getUint32(20)};
  }
  if (u8.length >= 4 && u8[0] === 0xFF && u8[1] === 0xD8) {
    let o = 2;
    while (o + 9 < u8.length) {
      if (u8[o] !== 0xFF) return null;
      const m = u8[o + 1];
      if (m === 0xFF) { o += 1; continue; }
      if (m === 0x01 || (m >= 0xD0 && m <= 0xD7)) { o += 2; continue; }
      if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC)
        return {format: 'JPEG', mime: 'image/jpeg', height: (u8[o + 5] << 8) | u8[o + 6], width: (u8[o + 7] << 8) | u8[o + 8]};
      if (m === 0xDA || m === 0xD9) return null;
      o += 2 + ((u8[o + 2] << 8) | u8[o + 3]);
    }
  }
  return null;
}

/** Re-read one real GLB and compare it with its recorded inspection: chunks, counts, slots, every image and every other view. */
async function inspectGlb(buf, path, expect) {
  const {doc, bin, chunks} = parseGlb(buf, path);
  check(same(chunks, expect.chunks), 'GLBのチャンクの大きさが記録と違います', path);
  const arr = k => (Array.isArray(doc[k]) ? doc[k] : []);
  const counts = {
    scenes: arr('scenes').length, nodes: arr('nodes').length, mesh_nodes: arr('nodes').filter(n => Number.isInteger(n.mesh)).length,
    meshes: arr('meshes').length, primitives: arr('meshes').reduce((s, m) => s + (m.primitives || []).length, 0),
    materials: arr('materials').length, textures: arr('textures').length, images: arr('images').length,
    accessors: arr('accessors').length, buffer_views: arr('bufferViews').length, buffers: arr('buffers').length
  };
  check(same(counts, expect.counts), 'GLBの中身の数が記録と違います', path);
  check(same(doc.extensionsUsed || [], expect.extensions_used) && same(doc.extensionsRequired || [], expect.extensions_required) &&
    (doc.asset || {}).generator === expect.generator, 'GLBの拡張か書き出し元が記録と違います', path);

  const slots = arr('images').map(() => []);
  const note = (name, slot) => {
    if (!slot || !Number.isInteger(slot.index)) return;
    const tex = arr('textures')[slot.index];
    if (tex && Number.isInteger(tex.source) && slots[tex.source]) slots[tex.source].push(name);
  };
  for (const m of arr('materials')) {
    const p = m.pbrMetallicRoughness || {};
    note('baseColorTexture', p.baseColorTexture);
    note('metallicRoughnessTexture', p.metallicRoughnessTexture);
    for (const k of ['normalTexture', 'occlusionTexture', 'emissiveTexture']) note(k, m[k]);
  }
  const views = arr('bufferViews');
  const slice = i => {
    const view = views[i];
    check(view && Number.isInteger(view.byteLength) && (view.buffer || 0) === 0, 'bufferViewが不正です', path + ' view ' + i);
    const start = bin.offset + (view.byteOffset || 0);
    check(start + view.byteLength <= bin.offset + bin.length, 'bufferViewがBINの外を指しています', path + ' view ' + i);
    return new Uint8Array(buf, start, view.byteLength);
  };

  const images = [];
  for (const [i, im] of arr('images').entries()) {
    const ex = expect.images[i];
    check(ex && ex.index === i && im.bufferView === ex.buffer_view && im.mimeType === ex.declared_mime && same(slots[i], ex.slots),
      '画像の割り当てが記録と違います', path + ' image ' + i);
    const u8 = slice(im.bufferView), head = imageHead(u8);
    check(head && head.format === ex.magic && head.mime === im.mimeType && head.width === ex.decoded.width && head.height === ex.decoded.height,
      '埋め込み画像の形式か寸法が記録と違います', path + ' image ' + i);
    const hash = await sha256(u8);
    check(u8.byteLength === ex.bytes && hash === ex.sha256, '埋め込み画像のバイト列が記録と違います', path + ' image ' + i);
    const data = slots[i].some(s => DATA_SLOTS.includes(s));
    check(ex.role === (data ? 'data' : 'colour') && ex.normal === slots[i].includes('normalTexture'), '画像の役割が割り当てと合いません', path + ' image ' + i);
    images.push({index: i, name: ex.name, role: ex.role, normal: ex.normal, slots: slots[i], mime: head.mime, format: head.format,
      width: head.width, height: head.height, bytes: u8.byteLength, sha256: hash, u8});
  }
  const roles = {
    colour: images.filter(x => x.role === 'colour').length, data: images.filter(x => x.role === 'data').length,
    normal_within_data: images.filter(x => x.normal).length,
    mixed: images.filter(x => x.slots.some(s => DATA_SLOTS.includes(s)) && x.slots.some(s => !DATA_SLOTS.includes(s))).length,
    unbound: images.filter(x => !x.slots.length).length
  };
  check(same(roles, expect.image_roles), '色と数値の画像の数が記録と違います', path);

  const imageViews = new Set(arr('images').map(im => im.bufferView));
  const nonImage = [];
  for (let i = 0; i < views.length; i++) if (!imageViews.has(i)) { const u8 = slice(i); nonImage.push({index: i, bytes: u8.byteLength, sha256: await sha256(u8)}); }
  check(same(nonImage, expect.non_image_buffer_views), '画像以外のbufferViewが記録と違います', path);
  const nonImageBytes = nonImage.reduce((s, x) => s + x.bytes, 0);
  check(nonImageBytes === expect.non_image_payload_bytes && images.reduce((s, x) => s + x.bytes, 0) === expect.image_payload_bytes,
    '画像と画像以外のバイト数が記録と違います', path);

  let triangles = 0;
  for (const m of arr('meshes')) for (const p of m.primitives || []) {
    const acc = arr('accessors')[p.indices];
    check((p.mode == null || p.mode === 4) && acc && acc.count % 3 === 0, '三角形でない面があります', path);
    triangles += acc.count / 3;
  }
  check(triangles === expect.geometry.triangles, '三角形の数が記録と違います', path);
  return {doc, chunks, images, nonImage, nonImageBytes, triangles};
}

// Everything but the image bytes, their MIME and the byte offsets must be the packed input's.
function sameStructure(a, b, path) {
  check(same(without(a.doc, ['images', 'bufferViews', 'buffers']), without(b.doc, ['images', 'bufferViews', 'buffers'])),
    '形・材料のJSONが入力GLBと違います', path);
  check(a.doc.images.length === b.doc.images.length && a.doc.images.every((im, i) => same(without(im, ['mimeType']), without(b.doc.images[i], ['mimeType']))),
    '画像の項目が入力GLBと違います', path);
  const imageViews = new Set(a.doc.images.map(im => im.bufferView));
  check(a.doc.bufferViews.length === b.doc.bufferViews.length && a.doc.bufferViews.every((v, i) => {
    const drop = imageViews.has(i) ? ['byteOffset', 'byteLength'] : ['byteOffset'];
    return same(without(v, drop), without(b.doc.bufferViews[i], drop));
  }), 'bufferViewの並びが入力GLBと違います', path);
  check(same(a.nonImage, b.nonImage), '画像以外のバイト列が入力GLBと違います', path);
}

async function thumbnails(info, path) {
  check(typeof createImageBitmap === 'function', 'この環境では画像を表示用に読めません', path);
  return Promise.all(info.images.map(async im => {
    try {
      return await createImageBitmap(new Blob([im.u8], {type: im.mime}),
        {resizeWidth: THUMB, resizeHeight: Math.max(1, Math.round(THUMB * im.height / im.width)), resizeQuality: 'high'});
    } catch (_) { fail('埋め込み画像を表示用に読めません', path + ' image ' + im.index); }
  }));
}

async function loadThree() {
  let THREE, GLTFLoader;
  try {
    // Resolved through the page's import map to the verified local vendor/three files.
    THREE = await import('three');
    ({GLTFLoader} = await import(new URL('vendor/three/examples/jsm/loaders/GLTFLoader.js', ROOT).href));
  } catch (e) { fail('three.js を読み込めませんでした', String((e && e.message) || e)); }
  check(THREE.REVISION === THREE_VERSION.split('.')[1], 'three.js の版が違います', 'r' + THREE.REVISION);
  return {THREE, GLTFLoader};
}

async function parseModel(THREE, loader, buf, path, info) {
  let gltf;
  try { gltf = await loader.parseAsync(buf.slice(0), ''); }
  catch (e) { fail('GLBを3Dとして読めません', path + '：' + String((e && e.message) || e)); }
  const scene = gltf.scene;
  check(scene, 'GLBに表示できるシーンがありません', path);
  let meshes = 0, triangles = 0;
  const mats = new Set();
  scene.traverse(o => {
    if (!o.isMesh) return;
    meshes++;
    const g = o.geometry;
    triangles += (g.index ? g.index.count : g.attributes.position.count) / 3;
    mats.add(o.material);
  });
  const model = {scene, meshes, triangles};
  check(meshes === 3 && triangles === info.triangles && mats.size === 1, '3Dのメッシュか三角形の数が記録と違います', path + '（' + meshes + '／' + triangles + '）');
  const mat = [...mats][0];
  const dim = tex => (tex && tex.image ? [tex.image.width, tex.image.height] : null);
  const by = slot => { const im = info.images.find(x => x.slots.includes(slot)); return [im.width, im.height]; };
  check(same(dim(mat.map), by('baseColorTexture')) && same(dim(mat.normalMap), by('normalTexture')) &&
    same(dim(mat.roughnessMap), by('metallicRoughnessTexture')) && !mat.aoMap,
    '3Dのテクスチャの寸法がGLBの画像と違います', path);
  scene.updateMatrixWorld(true);
  model.box = new THREE.Box3().setFromObject(scene);
  return model;
}

/** Release GPU objects and decoded thumbnails of one loaded data set. Safe to call twice. */
export function disposeData(d) {
  if (!d) return;
  for (const m of Object.values(d.models || {})) {
    m.scene.traverse(o => {
      if (!o.isMesh) return;
      o.geometry.dispose();
      for (const mat of [].concat(o.material)) {
        for (const v of Object.values(mat)) if (v && v.isTexture) { v.dispose(); if (v.image && v.image.close) v.image.close(); }
        mat.dispose();
      }
    });
  }
  for (const list of Object.values(d.thumbs || {})) for (const b of list) if (b && b.close) b.close();
  d.models = {}; d.thumbs = {};
}

/** Fetch the manifest (no-store), verify its fixed SHA-256, every asset, the facts, the six excerpts and all four real GLBs. */
export async function loadData() {
  if (!globalThis.crypto || !crypto.subtle) fail('この環境ではSHA-256を確かめられません', 'https か localhost で開いてください');
  const manifestPath = 'concept/manifest.json';
  const manifestBytes = await fetchBytes(manifestPath);
  check(await sha256(manifestBytes) === MANIFEST_SHA256, '素材一覧のSHA-256が固定値と合いません', manifestPath);
  const manifest = json(manifestBytes, manifestPath);
  check(manifest && manifest.schema === 'assetfurnace-assets@1' && Array.isArray(manifest.assets) && manifest.assets.length === ASSET_COUNT,
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
  check(facts.schema === FACTS_SCHEMA && facts.case_id === 'assetfurnace-example' && facts.catalog_id === 'resource-assetfurnace',
    '事実ファイルの種類が違います', 'concept/facts.json');
  const id = facts.identity || {};
  check(id.source_commit === SOURCE_COMMIT && id.source_repository === 'Bingeljell/image-to-3dlab' && id.license === 'Apache-2.0' &&
    id.six_parts_are_editorial === true && Array.isArray(id.not_executed), '固定版の原典の記録が違います', 'concept/facts.json');

  // Six editorial parts: every excerpt must equal the exact line range of the distributed source file.
  check(Array.isArray(facts.parts) && facts.parts.length === 6 && facts.parts.every((p, i) => p && p.id === PART_IDS[i]),
    '6つの部品の並びが違います', 'concept/facts.json');
  const sourceLines = new Map();
  for (const part of facts.parts) {
    const s = part.source || {};
    check(typeof s.path === 'string' && s.path.startsWith(VENDOR) && files.has(s.path), '引用元が一覧にありません', part.id);
    if (!sourceLines.has(s.path)) sourceLines.set(s.path, text(files.get(s.path), s.path).split(/\r?\n/));
    const lines = sourceLines.get(s.path);
    check(Number.isInteger(s.start_line) && Number.isInteger(s.end_line) && s.start_line >= 1 && s.end_line >= s.start_line && s.end_line <= lines.length,
      '引用の行番号が範囲外です', s.path);
    check(lines.slice(s.start_line - 1, s.end_line).join('\n') === part.excerpt, '引用が原典の行と一致しません', s.path + ' L' + s.start_line + '–' + s.end_line);
    check(s.url === BLOB + s.path.slice(VENDOR.length) + '#L' + s.start_line, '引用のリンクが固定版を指していません', part.id);
  }

  const jobs = json(need('inputs/jobs.json'), 'inputs/jobs.json');
  check(jobs.schema === 'studio-yebisu/assetfurnace-example/jobs@1' && jobs.catalog_id === facts.catalog_id && jobs.source.commit === SOURCE_COMMIT &&
    jobs.tool && jobs.tool.script === CLI && jobs.tool.modified === false && jobs.use_case.request_ja === facts.request.request_ja &&
    jobs.compression_common.format === 'png' && Array.isArray(jobs.jobs) && same(jobs.jobs.map(j => j.id), CASE_IDS),
    'ジョブの記録が想定と違います', 'inputs/jobs.json');

  const calls = facts.actual_calls || {};
  check(calls.blender_prepare.expected === 1 && calls.blender_prepare.actual === 1 &&
    calls.original_compress_cli.expected === 3 && calls.original_compress_cli.actual === 3, '実行の回数が想定と違います', 'concept/facts.json');
  const resultsBytes = need(facts.results);
  const results = json(resultsBytes, facts.results);
  check(results.schema === 'studio-yebisu/assetfurnace-example/results@1' && results.status === 'completed' && results.failure === null &&
    Array.isArray(results.failed_checks) && results.failed_checks.length === 0 && same(results.calls, calls) &&
    results.final_checks.every(c => c.passed === true) && results.source.tool === CLI && results.source.tool_modified === false &&
    same(results.jobs.map(j => j.id), CASE_IDS), '実測の記録が事実ファイルと合いません', facts.results);

  // Original five files, unchanged; Blender packed them once into the shared input GLB.
  const orig = facts.original_input;
  check(orig.license === 'CC0-1.0' && orig.files.length === 5 && orig.files.every(x => { const e = entry(x.path); return e && e.bytes === x.bytes && e.sha256 === x.sha256; }),
    '元の5ファイルが一覧と合いません', 'concept/facts.json');
  const prepBytes = need('outputs/preparation.json');
  const preparation = json(prepBytes, 'outputs/preparation.json');
  const packed = facts.packed_input;
  check(facts.preparation.record.sha256 === entry('outputs/preparation.json').sha256 && preparation.packed.sha256 === packed.sha256 &&
    preparation.packed.bytes === packed.bytes && preparation.imported.mesh_objects === 3 && preparation.imported.triangles === 6576 &&
    preparation.not_performed.includes('retopology') && facts.preparation.checks.every(c => c.passed === true),
    '入力の包装の記録が合いません', 'outputs/preparation.json');
  const pe = entry(packed.path);
  check(pe && pe.bytes === packed.bytes && pe.sha256 === packed.sha256, '入力GLBが一覧と合いません', packed.path);
  const packedBuf = need(packed.path);
  const made = {thumbs: {}, models: {}};
  try {
    const packedInfo = await inspectGlb(packedBuf, packed.path, packed.inspection);
    for (const m of facts.preparation.packed_images_vs_source_files) {
      const im = packedInfo.images[m.index], src = entry(m.same_bytes_as);
      check(im && src && im.sha256 === src.sha256 && im.bytes === src.bytes, '包装した画像が元のJPEGと同じバイト列ではありません', m.same_bytes_as);
    }
    // Display order: colour, then the other data map, then the normal map (still a data map, not a fourth kind).
    const rank = im => (im.role === 'colour' ? 0 : im.normal ? 2 : 1);
    const order = [...packedInfo.images].sort((a, b) => rank(a) - rank(b) || a.index - b.index).map(im => im.index);
    made.thumbs.input = await thumbnails(packedInfo, packed.path);

    check(Array.isArray(facts.cases) && same(facts.cases.map(c => c.id), CASE_IDS) && facts.independent_byte_checks.length === 3,
      '3つの設定の記録が違います', 'concept/facts.json');
    const cases = {};
    for (const [i, c] of facts.cases.entries()) {
      const job = jobs.jobs[i], rj = results.jobs[i], ib = facts.independent_byte_checks[i], req = c.request, common = jobs.compression_common;
      check(req.format === common.format && req.quality === common.quality && req.map_quality === common.map_quality &&
        req.max_size === job.max_size && req.map_size === job.map_size && req.normal_size === job.normal_size && same(rj.requested, req),
        '設定がジョブと合いません', c.id);
      check(same(c.command, rj.call.argv) && rj.call.exit_code === 0 && rj.call.timed_out === false && c.command[2] === '<upstream>/' + CLI &&
        c.command[3] === packed.path, '原典CLIの呼び出しの記録が合いません', c.id);
      const oe = entry(c.output.path);
      check(oe && oe.bytes === c.output.bytes && oe.sha256 === c.output.sha256 && rj.artifact.sha256 === c.output.sha256 && rj.artifact.bytes === c.output.bytes,
        '出力GLBが一覧と合いません', c.output.path);
      const identical = c.output.sha256 === packed.sha256;
      check(same(rj.summary, c.summary) && c.summary.glb_bytes === c.output.bytes && c.summary.packed_input_bytes === packed.bytes &&
        c.summary.byte_identical_to_packed_input === identical && rj.byte_identical_to_packed_input === identical && rj.checks.every(x => x.passed === true),
        '出力の要約が合いません', c.id);
      check(ib.id === c.id && ib.json_except_images_buffers_equal === true && ib.all_payload_bytes_equal === true && ib.non_image_buffer_views === 12 &&
        ib.non_image_payload_bytes === packedInfo.nonImageBytes, '形の照合の記録が合いません', c.id);
      const so = entry(c.stdout);
      check(so && so.sha256 === rj.call.stdout.sha256 && so.bytes === rj.call.stdout.bytes, '原典CLIの標準出力が実測の記録と合いません', c.stdout);
      const buf = need(c.output.path);
      const info = await inspectGlb(buf, c.output.path, c.inspection);
      sameStructure(packedInfo, info, c.output.path);
      check(Array.isArray(c.images) && c.images.length === 3 && same(rj.image_changes, c.images), '画像ごとの結果が合いません', c.id);
      let replaced = 0, payload = 0;
      const images = [];
      for (const im of c.images) {
        const before = packedInfo.images[im.index], after = info.images[im.index];
        const matches = (rec, real) => rec.sha256 === real.sha256 && rec.bytes === real.bytes && rec.mime === real.mime &&
          rec.format === real.format && rec.width === real.width && rec.height === real.height;
        check(before && after && matches(im.before, before) && matches(im.after, after) && im.requested_cap === req.max_size &&
          Math.max(after.width, after.height) <= im.requested_cap && im.role === before.role && im.normal === before.normal,
          '画像の前後が実ファイルと合いません', c.id + ' image ' + im.index);
        if (im.outcome === 'kept') check(after.sha256 === before.sha256, '保持した画像が元と違います', c.id + ' image ' + im.index);
        else if (im.outcome === 'replaced') {
          check(after.bytes < before.bytes && after.mime === 'image/' + req.format, '置き換えた画像が元より小さくありません', c.id + ' image ' + im.index);
          replaced++;
        } else fail('画像の結果が不明です', c.id);
        payload += after.bytes;
        images.push({...im, slots: before.slots, before: {...im.before}, after: {...im.after}});
      }
      check(replaced === c.summary.images_replaced && 3 - replaced === c.summary.images_kept && payload === c.summary.image_payload_bytes &&
        info.nonImageBytes === c.summary.non_image_payload_bytes && identical === (replaced === 0), '置換と保持の数が合いません', c.id);
      made.thumbs[c.id] = await thumbnails(info, c.output.path);
      cases[c.id] = {id: c.id, fact: c, job, result: rj, request: req, output: c.output, summary: c.summary, identical, buf, info,
        images, replaced, kept: 3 - replaced, stdout: text(need(c.stdout), c.stdout), stdoutPath: c.stdout, elapsed: rj.call.elapsed_seconds};
    }

    const threePkg = json(need('vendor/three/package.json'), 'vendor/three/package.json');
    check(threePkg.name === 'three' && threePkg.version === THREE_VERSION, 'three.js の版が違います', 'vendor/three/package.json');
    const {THREE, GLTFLoader} = await loadThree();
    const loader = new GLTFLoader();
    made.models.input = await parseModel(THREE, loader, packedBuf, packed.path, packedInfo);
    for (const cid of CASE_IDS) made.models[cid] = await parseModel(THREE, loader, cases[cid].buf, cases[cid].output.path, cases[cid].info);
    const box = made.models.input.box;
    for (const cid of CASE_IDS) {
      const b = made.models[cid].box;
      check(['x', 'y', 'z'].every(k => Math.abs(b.min[k] - box.min[k]) < 1e-6 && Math.abs(b.max[k] - box.max[k]) < 1e-6),
        '3Dの大きさが入力GLBと違います', cases[cid].output.path);
    }
    const sphere = box.getBoundingSphere(new THREE.Sphere());

    return {
      manifestSha: MANIFEST_SHA256,
      assets: manifest.assets.map(a => ({path: a.path, bytes: a.bytes, sha256: a.sha256})),
      facts, jobs, results, resultsBytes, preparation, order, cases,
      packed: {path: packed.path, bytes: packed.bytes, sha256: packed.sha256, buf: packedBuf, info: packedInfo},
      original: orig.files.map(x => ({...x})),
      three: THREE, models: made.models, thumbs: made.thumbs,
      frame: {center: sphere.center.clone(), radius: sphere.radius}
    };
  } catch (e) {
    disposeData(made);
    throw e;
  }
}

/* ---------- scenes (closed-form in t; geometry frozen from 30 s) ---------- */

export const SCENES = [
  {id: 'identity', start: 0, end: 4, message: 'AssetFurnaceは手元の3Dアプリ。今回は圧縮CLIだけを使う', focus: []},
  {id: 'author', start: 4, end: 7.5, message: '原典のREADME・CLIと架空の依頼から、作者AIがジョブを書く', focus: ['src', 'req', 'author']},
  {id: 'operator', start: 7.5, end: 11, message: '制作担当がBlenderで5ファイルを1つのGLBに包み、原典CLIを3回実行', focus: ['author', 'operator', 'orig', 'pack']},
  {id: 'split', start: 11, end: 14.5, message: '同じ入力GLBが、そのまま写す形と、画像3枚に分かれる', focus: ['pack', 'geo', 'tex']},
  {id: 'gate', start: 14.5, end: 21.5, message: '上限で縮めた候補が元より小さい時だけ、画像を置き換える', focus: ['tex', 'cap', 'gate']},
  {id: 'rejoin', start: 21.5, end: 26, message: '同じ形と選ばれた画像が、実際の出力GLBに戻る', focus: ['geo', 'gate', 'out']},
  {id: 'result', start: 26, end: 32, message: '実ファイルを同じ向きで比べ、保存して次の確認へ', focus: ['out', 'cmp', 'use']}
];

// Page stages: 何か / 渡す / 返る are moments of the same continuous scene.
export const STAGE_TIMES = [2, 13.8, 30];
export const STAGE_FOCUS = [['src', 'app'], ['author', 'operator', 'orig', 'pack', 'geo', 'tex'], ['cap', 'gate', 'out', 'cmp', 'use']];
// The film walks the three real settings through the same gate; the page shows the one the reader picked.
const FILM_PASSES = [[14.5, 16.8, 'cap1024'], [16.8, 19.1, 'cap512'], [19.1, 21.4, 'cap256']];
const PAGE_PASS = [14.5, 21.4];
const FILM_REJOIN = 'cap256';

const clamp01 = x => Math.max(0, Math.min(1, x));
const smooth = x => { x = clamp01(x); return x * x * (3 - 2 * x); };
const seg = (t, a, b) => smooth((t - a) / (b - a));
const lerp = (a, b, k) => a + (b - a) * k;

// Position along a list of legs [start, end, place]; before a leg starts the shape rests where the last one ended.
function track(g, first, legs) {
  let cur = first;
  for (const [a, b, next] of legs) {
    if (g < a) return {from: cur, to: cur, p: 0};
    if (g < b) return {from: cur, to: next, p: seg(g, a, b)};
    cur = next;
  }
  return {from: cur, to: cur, p: 0};
}

/** Complete state at time t. Same t (and case) always gives the same state, whatever was drawn before. opts: {data, caseId} */
export function sceneAt(t, opts = {}) {
  const data = opts.data;
  const time = Math.max(0, Math.min(FILM.duration, Number(t) || 0));
  const g = Math.min(time, FILM.freezeAt);
  const caseId = CASE_IDS.includes(opts.caseId) ? opts.caseId : null;
  let index = SCENES.findIndex(s => time >= s.start && time < s.end);
  if (index < 0) index = SCENES.length - 1;
  const passes = caseId ? [[PAGE_PASS[0], PAGE_PASS[1], caseId]] : FILM_PASSES;
  const rejoinCase = caseId || FILM_REJOIN;
  const carriers = [];

  // Documents: the README is read, the request becomes the jobs, the jobs go to the operator.
  carriers.push({kind: 'doc', key: 'readme', ...track(g, ['src', 'doc'], [[4.4, 5.6, ['author', 'doc']]]), form: 0, alpha: 1 - seg(g, 5.4, 5.9)});
  carriers.push({kind: 'doc', key: 'request', ...track(g, ['req', 'doc'], [[4.4, 5.6, ['author', 'doc']], [7.8, 8.8, ['operator', 'doc']]]),
    form: seg(g, 5.6, 6.4), alpha: 1 - seg(g, 10.5, 11.0)});

  // The five original files: three JPEGs become the three embedded images, .gltf and .bin become the geometry.
  for (let k = 0; k < 3; k++) {
    carriers.push({kind: 'tile', key: 'tex' + k, k, img: 'input', scale: 1, alpha: 1, tag: true,
      ...track(g, ['orig', 'file' + k], [[8.8, 9.8, ['operator', 'file' + k]], [9.9, 10.9, ['pack', 'tile' + k]],
        [11.4 + 0.15 * k, 12.8 + 0.15 * k, ['tex', 'row' + k]]])});
  }
  for (let k = 3; k < 5; k++) {
    carriers.push({kind: 'file', key: 'file' + k, ext: k === 3 ? 'gltf' : 'bin', alpha: 1 - seg(g, 10.5, 10.9),
      ...track(g, ['orig', 'file' + k], [[8.8, 9.8, ['operator', 'file' + k]], [9.9, 10.9, ['pack', 'geo']]])});
  }
  carriers.push({kind: 'geo', key: 'geo', alpha: seg(g, 10.5, 10.9), form: g < 17 ? seg(g, 11.3, 12.7) : 1 - seg(g, 21.8, 23.2),
    ...track(g, ['pack', 'geo'], [[11.3, 12.7, ['geo', 'bars']], [21.8, 23.2, ['out', 'geo']]])});

  // Each run starts again from the same input images: a candidate is re-encoded under the cap, then gated.
  let capCase = null, gateCase = null;
  passes.forEach(([a, b, cid], pi) => {
    const D = b - a, last = pi === passes.length - 1, next = passes[pi + 1];
    const deca = a + 0.72 * D, decb = a + 0.86 * D;
    if (g >= a) capCase = cid;
    if (g >= decb) gateCase = cid;
    const fadeNext = next ? seg(g, next[0] + 0.6 * (next[1] - next[0]), next[0] + 0.68 * (next[1] - next[0])) : 0;
    for (let k = 0; k < 3; k++) {
      const im = data ? data.cases[cid].images.find(x => x.index === data.order[k]) : null;
      const kept = im ? im.outcome === 'kept' : false;
      const sigma = im ? Math.max(im.after.width, im.after.height) / Math.max(im.before.width, im.before.height) : 1;
      const off = 0.04 * D * k;
      const sh = seg(g, a + 0.30 * D + off, a + 0.48 * D + off);
      carriers.push({kind: 'tile', key: 'cand' + pi + k, k, img: kept ? null : 'input', img2: kept ? null : cid, mix: sh,
        scale: 1 + (sigma - 1) * sh, dashed: kept, cross: kept ? seg(g, deca, decb) : 0, ok: kept ? 0 : seg(g, deca, decb),
        alpha: g < a ? 0 : seg(g, a + off, a + 0.08 * D + off) * (kept ? 1 - seg(g, deca + 0.5 * (decb - deca), decb + 0.06 * D) : (g < decb ? 1 : 0)),
        ...track(g, ['tex', 'row' + k], [[a + 0.08 * D + off, a + 0.30 * D + off, ['cap', 'row' + k]], [a + 0.50 * D + off, a + 0.68 * D + off, ['gate', 'row' + k]]])});
      carriers.push({kind: 'tile', key: 'chosen' + pi + k, k, img: cid, scale: sigma, ok: kept ? 0 : 1, keptMark: kept,
        alpha: (kept ? seg(g, deca, decb) : (g >= decb ? 1 : 0)) * (1 - fadeNext),
        ...track(g, ['gate', 'row' + k], last ? [[21.9 + 0.1 * k, 23.3 + 0.1 * k, ['out', 'tile' + k]]] : [])});
    }
  });
  if (caseId) capCase = caseId;

  carriers.push({kind: 'token', key: 'token', alpha: seg(g, 26.0, 26.3),
    ...track(g, ['out', 'full'], [[26.2, 27.2, ['cmp', 'full']], [27.6, 28.6, ['use', 'token']]])});

  let chip = null;
  if (g >= 26) chip = 'all';
  else if (g >= 21.5) chip = rejoinCase;
  else if (g >= FILM_PASSES[0][0]) chip = capCase;
  const yaw = g < 26.4 ? 0.62 + 0.3 * Math.sin(2 * Math.PI * g / 13.2) : 0.62 + 0.9 * smooth((g - 26.4) / 3.6);
  return {
    time, g, index, scene: SCENES[index], focus: SCENES[index].focus, carriers, caseId, capCase, gateCase, rejoinCase,
    outCase: g >= 23.2 ? rejoinCase : null, outRender: seg(g, 23.0, 23.8), cmpOn: seg(g, 26.8, 27.6), chip,
    trace: {p: seg(g, 0.6, 3.6), alpha: 1 - seg(g, 3.8, 4.4)},
    strip: {input: 1 - seg(g, 26.4, 27.4), trio: seg(g, 26.4, 27.4)},
    yaw, pitch: 0.36
  };
}

/* ---------- layout ---------- */

export const NODES = [
  {id: 'src', role: 'source', lines: ['原典README', '＋圧縮CLI']},
  {id: 'author', role: 'author', lines: ['作者AI 1体', '準備とジョブ']},
  {id: 'req', role: 'author', lines: ['架空の依頼', '木箱を3上限で']},
  {id: 'app', role: 'off', part: 'app', lines: ['生成・Finish', '今回は未実行']},
  {id: 'operator', role: 'operator', lines: ['制作担当', 'Blender1・CLI3']},
  {id: 'orig', role: 'input', lines: ['元の5ファイル', 'CC0の木箱']},
  {id: 'geo', role: 'geo', lines: ['形はそのまま', '画像以外12view']},
  {id: 'pack', role: 'input', part: 'container', lines: ['入力GLB', '']},
  {id: 'tex', role: 'tex', part: 'roles', lines: ['画像3枚', '色1・数値2']},
  {id: 'gate', role: 'tex', part: 'gate', lines: ['小さければ置換', '']},
  {id: 'cap', role: 'tex', part: 'cap', lines: ['上限', '']},
  {id: 'out', role: 'output', part: 'rebuild', lines: ['出力GLB', '']},
  {id: 'cmp', role: 'browser', lines: ['容量を比べる', '']},
  {id: 'use', role: 'browser', lines: ['回す・保存', '次は目で確認']}
];
export const EDGES = [['src', 'author'], ['req', 'author'], ['author', 'operator'], ['orig', 'operator'], ['operator', 'pack'],
  ['pack', 'geo'], ['pack', 'tex'], ['tex', 'cap'], ['cap', 'gate'], ['gate', 'out'], ['geo', 'out'], ['out', 'cmp'], ['cmp', 'use']];
// The wider application: same README, a generation branch that could also hand over a GLB. Not executed here.
export const CONTEXT_EDGES = [['src', 'app'], ['app', 'pack']];

// [row, col] in the tall grid. The wide grid is the tall grid transposed, so every relationship keeps its neighbours.
const TALL = {src: [0, 0], author: [0, 1], req: [0, 2], app: [1, 0], operator: [1, 1], orig: [1, 2],
  geo: [2, 0], pack: [2, 1], tex: [2, 2], gate: [3, 1], cap: [3, 2], out: [4, 0], cmp: [4, 1], use: [4, 2]};
const SPAN = {geo: 2}; // the geometry lane runs past the texture work
const U = {nodeW: 8, gapX: 1.0, margin: 0.35, label: 2.6, glyph: 1.4, pad: 0.3, gapY: 1.15};

/** Node rectangles in CSS px. Height is derived from width when `height` is null (page), or fitted (film). */
export function layoutConcept(width, height, opts = {}) {
  const orient = opts.orient || (height != null && width > height ? 'wide' : 'tall');
  const tall = orient === 'tall';
  const cols = tall ? 3 : 5, rows = tall ? 5 : 3;
  const nodeH0 = U.label + U.glyph + U.pad;
  const unitsH = 2 * U.margin + rows * nodeH0 + (rows - 1) * U.gapY;
  const unitsW = 2 * U.margin + cols * U.nodeW + (cols - 1) * U.gapX;
  let f = width / unitsW;
  if (height != null) f = Math.min(f, height / unitsH);
  f = Math.max(opts.minFont || 14, Math.min(opts.maxFont || 30, f));
  const H = height != null ? height : Math.round(Math.max(unitsH * f, Math.min(width * (tall ? 1.07 : 0.46), tall ? 480 : 560)));
  const extra = Math.max(0, H - unitsH * f);
  const glyphExtra = extra * 0.8 / rows, gapExtra = extra * 0.2 / (rows - 1);
  const m = U.margin * f, gapX = U.gapX * f;
  const nodeW = (width - 2 * m - (cols - 1) * gapX) / cols;
  const nodeH = nodeH0 * f + glyphExtra, gapY = U.gapY * f + gapExtra;
  const nodes = {};
  for (const n of NODES) {
    const [r0, c0] = TALL[n.id], span = SPAN[n.id] || 1;
    const [r, c, sr, sc] = tall ? [r0, c0, span, 1] : [c0, r0, 1, span];
    const x = m + c * (nodeW + gapX), y = m + r * (nodeH + gapY);
    const w = sc * nodeW + (sc - 1) * gapX, h = sr * nodeH + (sr - 1) * gapY;
    nodes[n.id] = {...n, x, y, w, h, cx: x + w / 2, cy: y + h / 2,
      glyph: {x: x + 0.3 * f, y: y + U.label * f, w: w - 0.6 * f, h: h - (U.label + U.pad) * f}};
  }
  return {width, height: H, f, orient, film: !!opts.film, nodes};
}

/* ---------- slots inside a node's glyph area ---------- */

const rowOf = (g, n, ratio, gapK) => {
  const s = Math.min(g.h, g.w / (n + (n - 1) * gapK) / ratio), gap = gapK * s, tw = n * s + (n - 1) * gap;
  const x0 = g.x + (g.w - tw) / 2, y = g.y + (g.h - s) / 2;
  return Array.from({length: n}, (_, i) => ({x: x0 + i * (s + gap), y, w: s, h: s}));
};
function glbSlots(g) {
  const s = Math.min(g.h * 0.86, g.w / 4.5), gap = 0.18 * s, geoW = 0.8 * s, tw = geoW + 3 * s + 3 * gap;
  const x0 = g.x + (g.w - tw) / 2, y = g.y + (g.h - s) / 2;
  return {geo: {x: x0, y, w: geoW, h: s}, tiles: [0, 1, 2].map(i => ({x: x0 + geoW + gap + i * (s + gap), y, w: s, h: s})),
    box: {x: x0 - 0.12 * s, y: y - 0.12 * s, w: tw + 0.24 * s, h: s * 1.24}};
}
function geoArea(L, n) {
  const g = n.glyph, f = L.f;
  if (g.h >= 4.5 * f) return {text: 'top', bars: {x: g.x, y: g.y + 2.5 * f, w: g.w, h: g.h - 2.5 * f}};
  if (g.w >= 14 * f) return {text: 'left', bars: {x: g.x + g.w * 0.42, y: g.y, w: g.w * 0.58, h: g.h}};
  return {text: null, bars: {...g}};
}
// The film puts the real render inside the output node; the page shows it in the viewer below the map.
const glyphMain = (L, n) => (L.film && n.id === 'out' ? {x: n.glyph.x, y: n.glyph.y, w: n.glyph.w * 0.46, h: n.glyph.h} : n.glyph);
const outRenderRect = n => ({x: n.glyph.x + n.glyph.w * 0.5, y: n.glyph.y, w: n.glyph.w * 0.5, h: n.glyph.h});
const useArea = g => ({icons: {x: g.x, y: g.y, w: g.w * 0.56, h: g.h}, token: {x: g.x + g.w * 0.62, y: g.y + g.h * 0.15, w: g.w * 0.36, h: g.h * 0.7}});

function slotRect(L, id, slot) {
  const n = L.nodes[id], g = glyphMain(L, n);
  if (slot === 'full') return {...n.glyph};
  if (slot === 'doc') { const h = g.h, w = Math.min(g.w, h * 0.78); return {x: g.x + (g.w - w) / 2, y: g.y, w, h}; }
  if (slot.startsWith('file')) return rowOf(g, 5, 1, 0.18)[Number(slot.slice(4))];
  if (slot.startsWith('row')) return rowOf(g, 3, 1, 0.2)[Number(slot.slice(3))];
  if (slot.startsWith('tile')) return glbSlots(g).tiles[Number(slot.slice(4))];
  if (slot === 'geo') return glbSlots(g).geo;
  if (slot === 'bars') return geoArea(L, n).bars;
  if (slot === 'token') return useArea(g).token;
  return {...g};
}
const lerpRect = (A, B, k) => ({x: lerp(A.x, B.x, k), y: lerp(A.y, B.y, k), w: lerp(A.w, B.w, k), h: lerp(A.h, B.h, k)});

/* ---------- drawing ---------- */

export const PALETTES = {
  light: {bg: '#f2eee6', paper: '#fbf9f4', ink: '#1d1b17', muted: '#57514a', line: '#8b8377', accent: '#b13c17',
    teal: '#1b6660', warm: '#8a5a0b', source: '#ece6da', author: '#f3e3cf', operator: '#eee1cd', input: '#e5e6e1',
    geo: '#dcebe6', tex: '#f2e6cf', output: '#e1ebe0', browser: '#ebe6da', off: '#f2eee6'},
  dark: {bg: '#16140f', paper: '#211e18', ink: '#f2ede2', muted: '#c4bba9', line: '#8f8674', accent: '#f08458',
    teal: '#6cc3b8', warm: '#e0a84a', source: '#29251e', author: '#352a1f', operator: '#32291f', input: '#25251f',
    geo: '#1b2c28', tex: '#30281b', output: '#1f2a1e', browser: '#26231d', off: '#16140f'}
};
export const SANS = '"Hiragino Sans","Hiragino Kaku Gothic ProN","Yu Gothic UI","Yu Gothic","Meiryo","Noto Sans JP",system-ui,sans-serif';
export const SERIF = '"Hiragino Mincho ProN","Yu Mincho","YuMincho","Noto Serif JP",serif';

const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
export function mix(a, b, k) {
  const A = rgb(a), B = rgb(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * clamp01(k)).toString(16).padStart(2, '0')).join('');
}
export const fmtInt = n => Number(n).toLocaleString('en-US');
export const pct = (a, b) => (100 * a / b).toFixed(1);

function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2))); else ctx.rect(x, y, w, h);
}
function haloText(ctx, value, x, y, maxW, halo, size) {
  if (!value) return;
  ctx.save(); ctx.lineJoin = 'round'; ctx.strokeStyle = halo; ctx.lineWidth = Math.max(3, size * 0.24);
  const w = ctx.measureText(value).width, k = w > maxW && w > 0 ? maxW / w : 1;
  // Condense horizontally instead of shrinking: the glyph height stays at the declared font size.
  ctx.translate(x, y); ctx.scale(k, 1); ctx.strokeText(value, 0, 0); ctx.fillText(value, 0, 0); ctx.restore();
}
function clipToRect(ax, ay, bx, by, r, gap) {
  const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
  const tx = dx ? (r.w / 2) / Math.abs(dx) : Infinity, ty = dy ? (r.h / 2) / Math.abs(dy) : Infinity, k = Math.min(tx, ty);
  return [ax + dx * k + dx / len * gap, ay + dy * k + dy / len * gap];
}
// Straight runs where two boxes share a row or column span; otherwise centre to centre, clipped to the boxes.
function route(A, B, gap) {
  const ox0 = Math.max(A.x, B.x), ox1 = Math.min(A.x + A.w, B.x + B.w);
  const oy0 = Math.max(A.y, B.y), oy1 = Math.min(A.y + A.h, B.y + B.h);
  if (ox1 - ox0 > 2 && (B.y >= A.y + A.h || A.y >= B.y + B.h)) {
    const x = (ox0 + ox1) / 2;
    return B.y > A.y ? [x, A.y + A.h + gap, x, B.y - gap] : [x, A.y - gap, x, B.y + B.h + gap];
  }
  if (oy1 - oy0 > 2 && (B.x >= A.x + A.w || A.x >= B.x + B.w)) {
    const y = (oy0 + oy1) / 2;
    return B.x > A.x ? [A.x + A.w + gap, y, B.x - gap, y] : [A.x - gap, y, B.x + B.w + gap, y];
  }
  const p1 = clipToRect(A.cx, A.cy, B.cx, B.cy, A, gap), p2 = clipToRect(B.cx, B.cy, A.cx, A.cy, B, gap);
  return [p1[0], p1[1], p2[0], p2[1]];
}
function arrow(ctx, x1, y1, x2, y2, size) {
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  const a = Math.atan2(y2 - y1, x2 - x1);
  ctx.save(); ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - size * Math.cos(a - 0.45), y2 - size * Math.sin(a - 0.45));
  ctx.lineTo(x2 - size * Math.cos(a + 0.45), y2 - size * Math.sin(a + 0.45));
  ctx.closePath(); ctx.fill(); ctx.restore();
}
function dashedRect(ctx, r, color, lw, f, radius = 2) {
  ctx.save(); ctx.setLineDash([Math.max(2, f * 0.18), Math.max(2, f * 0.16)]); ctx.strokeStyle = color; ctx.lineWidth = lw;
  rrect(ctx, r.x, r.y, r.w, r.h, radius); ctx.stroke(); ctx.restore();
}

const ROLE_SHORT = im => (im.role === 'colour' ? '色' : im.normal ? '法線' : '数値');
export function imageRole(im) {
  if (im.role === 'colour') return {short: '色', long: '色（baseColorTexture）', kind: '色の画像（見る画像）'};
  if (im.normal) return {short: '法線', long: '法線（normalTexture）', kind: '数値の画像の一つ（法線。4つ目の分類ではない）'};
  return {short: '数値', long: '金属・粗さ（metallicRoughnessTexture）', kind: '数値の画像（シェーダーが数として読む）'};
}

export function outcomeShort(data, cid) {
  const c = data.cases[cid];
  if (c.replaced === 3) return '3枚とも置換';
  if (c.kept === 3) return '3枚とも保持';
  return '置換' + c.replaced + '・保持' + c.kept;
}
const capOf = (data, cid) => data.cases[cid].request.max_size;

function nodeText(n, data, s) {
  switch (n.id) {
    case 'pack': return ['入力GLB', fmtInt(data.packed.bytes) + 'B'];
    case 'cap': return s.capCase ? ['上限 ' + capOf(data, s.capCase) + 'px', 'PNG指定'] : ['上限 3通り', '1024・512・256'];
    case 'gate': return ['小さければ置換', s.gateCase ? outcomeShort(data, s.gateCase) : '元と比べる'];
    case 'out': return ['出力GLB', s.outCase ? fmtInt(data.cases[s.outCase].output.bytes) + 'B' : '形と画像を戻す'];
    case 'cmp': {
      if (!s.outCase || s.cmpOn < 0.5) return ['容量を比べる', '実ファイル4つ'];
      if (!s.caseId && s.chip === 'all') return ['容量を比べる', '入力と出力3つ'];
      const c = data.cases[s.outCase];
      return ['容量を比べる', c.identical ? '入力と同一' : '入力比' + pct(c.output.bytes, data.packed.bytes) + '%'];
    }
    default: return n.lines;
  }
}

function drawDoc(ctx, r, form, pal, lw) {
  const col = mix(pal.ink, pal.accent, form);
  rrect(ctx, r.x, r.y, r.w, r.h, Math.min(4, r.w * 0.1));
  ctx.fillStyle = pal.paper; ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.stroke();
  ctx.fillStyle = col;
  for (let i = 0; i < 4; i++) {
    const indent = form * (i % 2 ? 0.18 : 0.06), y = r.y + r.h * (0.2 + i * 0.18);
    ctx.fillRect(r.x + r.w * (0.14 + indent), y, r.w * (0.72 - indent - (i === 3 ? 0.25 : 0)), Math.max(1, r.h * 0.06));
  }
}
function drawFileIcon(ctx, r, ext, pal, lw) {
  const fold = r.w * 0.28;
  ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(r.x + r.w - fold, r.y); ctx.lineTo(r.x + r.w, r.y + fold);
  ctx.lineTo(r.x + r.w, r.y + r.h); ctx.lineTo(r.x, r.y + r.h); ctx.closePath();
  ctx.fillStyle = pal.paper; ctx.fill(); ctx.strokeStyle = pal.teal; ctx.lineWidth = lw; ctx.stroke();
  ctx.fillStyle = pal.teal;
  if (ext === 'gltf') for (let i = 0; i < 3; i++) ctx.fillRect(r.x + r.w * 0.16, r.y + r.h * (0.38 + i * 0.18), r.w * (0.6 - i * 0.12), Math.max(1, r.h * 0.07));
  else for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) ctx.fillRect(r.x + r.w * (0.16 + j * 0.24), r.y + r.h * (0.36 + i * 0.2), r.w * 0.14, r.h * 0.11);
}
// Twelve elements: the twelve non-image bufferViews, scaled by their real byte lengths.
function drawGeo(ctx, r, k, data, pal) {
  const views = data.packed.info.nonImage, max = Math.max(...views.map(v => v.bytes)), n = views.length;
  ctx.fillStyle = pal.teal;
  views.forEach((v, i) => {
    const rel = v.bytes / max;
    const st = {x: r.x, y: r.y + i * r.h / n, w: r.w * (0.3 + 0.7 * rel), h: r.h / n * 0.74};
    const bh = r.h * (0.1 + 0.9 * rel);
    const bt = {x: r.x + i * r.w / n, y: r.y + r.h - bh, w: r.w / n * 0.7, h: bh};
    ctx.fillRect(lerp(st.x, bt.x, k), lerp(st.y, bt.y, k), Math.max(1, lerp(st.w, bt.w, k)), Math.max(1, lerp(st.h, bt.h, k)));
  });
}
function drawTile(ctx, r, c, data, pal, lw, f, film) {
  const s = Math.min(r.w, r.h) * c.scale, x = r.x + (r.w - s) / 2, y = r.y + (r.h - s) / 2;
  const idx = data.order[c.k];
  if (c.dashed) {
    dashedRect(ctx, {x, y, w: s, h: s}, pal.accent, lw, f);
    if (s >= 36) { ctx.save(); ctx.font = '600 14px ' + SANS; ctx.fillStyle = pal.accent; ctx.textAlign = 'center'; ctx.fillText('PNG', x + s / 2, y + s / 2); ctx.restore(); }
  } else {
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(data.thumbs[c.img][idx], x, y, s, s);
    if (c.img2 && c.mix > 0) { ctx.save(); ctx.globalAlpha *= c.mix; ctx.drawImage(data.thumbs[c.img2][idx], x, y, s, s); ctx.restore(); }
    ctx.strokeStyle = c.ok ? mix(pal.line, pal.teal, c.ok) : pal.line; ctx.lineWidth = c.ok ? lw * 1.6 : lw;
    ctx.strokeRect(x, y, s, s);
  }
  if (c.cross > 0) {
    ctx.save(); ctx.globalAlpha *= c.cross; ctx.strokeStyle = pal.accent; ctx.lineWidth = lw * 1.6;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + s, y + s); ctx.moveTo(x + s, y); ctx.lineTo(x, y + s); ctx.stroke(); ctx.restore();
  }
  if (film && c.tag && s >= 34) {
    ctx.save(); ctx.font = '700 ' + Math.max(14, Math.round(s * 0.28)) + 'px ' + SANS; ctx.textAlign = 'left'; ctx.fillStyle = pal.ink;
    const role = ROLE_SHORT(data.packed.info.images[idx]);
    haloText(ctx, role, x + s * 0.08, y + s * 0.82, s * 0.84, pal.paper, 14); ctx.restore();
  }
}
function drawToken(ctx, r, pal, lw) {
  const h = Math.min(r.h, r.w * 0.5), w = h * 1.7, x = r.x + (r.w - w) / 2, y = r.y + (r.h - h) / 2;
  rrect(ctx, x, y, w, h, h / 2); ctx.fillStyle = pal.output; ctx.fill(); ctx.strokeStyle = pal.teal; ctx.lineWidth = lw * 1.4; ctx.stroke();
  ctx.fillStyle = pal.teal; ctx.fillRect(x + w * 0.2, y + h * 0.3, w * 0.14, h * 0.4);
  for (let i = 0; i < 3; i++) ctx.fillRect(x + w * (0.42 + i * 0.13), y + h * 0.3, w * 0.09, h * 0.4);
}

function drawCarrier(ctx, c, data, L, pal, lw, film) {
  if (c.alpha <= 0.001) return;
  const r = lerpRect(slotRect(L, c.from[0], c.from[1]), slotRect(L, c.to[0], c.to[1]), c.p);
  ctx.save(); ctx.globalAlpha *= c.alpha;
  if (c.kind === 'doc') drawDoc(ctx, r, c.form, pal, lw);
  else if (c.kind === 'file') drawFileIcon(ctx, r, c.ext, pal, lw);
  else if (c.kind === 'geo') drawGeo(ctx, r, c.form, data, pal);
  else if (c.kind === 'tile') drawTile(ctx, r, c, data, pal, lw, L.f, film);
  else if (c.kind === 'token') drawToken(ctx, r, pal, lw);
  ctx.restore();
}

// Fixed art inside nodes: ghosts of the shapes that leave, the cap frames, the size bars and the next-step icons.
function drawNodeArt(ctx, n, data, s, L, pal, lw, film) {
  const f = L.f, g = glyphMain(L, n), faint = mix(pal.line, n.fill, 0.35);
  switch (n.id) {
    case 'src': case 'req': {
      // The README and the request stay where they are; what moves is what was read from them.
      const r = slotRect(L, n.id, 'doc'); ctx.save(); ctx.globalAlpha = 0.5; dashedRect(ctx, r, faint, lw, f, 3); ctx.restore(); break;
    }
    case 'orig':
      // The five original files are reused unchanged; their outlines stay after the copies move on.
      rowOf(g, 5, 1, 0.18).forEach(r => dashedRect(ctx, r, faint, lw, f)); break;
    case 'app': {
      const sz = Math.min(g.h, g.w / 3.4), y = g.y + (g.h - sz) / 2, x0 = g.x + (g.w - sz * 3) / 2;
      dashedRect(ctx, {x: x0, y, w: sz, h: sz}, pal.line, lw, f);
      ctx.save(); ctx.strokeStyle = pal.line; ctx.lineWidth = lw; ctx.setLineDash([f * 0.15, f * 0.15]);
      ctx.beginPath(); ctx.moveTo(x0 + sz * 0.15, y + sz * 0.8); ctx.lineTo(x0 + sz * 0.45, y + sz * 0.45); ctx.lineTo(x0 + sz * 0.85, y + sz * 0.8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x0 + sz * 1.2, y + sz / 2); ctx.lineTo(x0 + sz * 1.8, y + sz / 2); ctx.stroke();
      const cx = x0 + sz * 2.5, cy = y + sz / 2, q = sz * 0.42;
      ctx.beginPath(); ctx.moveTo(cx, cy - q); ctx.lineTo(cx + q, cy - q / 2); ctx.lineTo(cx + q, cy + q / 2); ctx.lineTo(cx, cy + q);
      ctx.lineTo(cx - q, cy + q / 2); ctx.lineTo(cx - q, cy - q / 2); ctx.closePath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + q); ctx.stroke();
      ctx.restore(); break;
    }
    case 'pack': case 'out': {
      const G = glbSlots(g);
      ctx.save(); ctx.strokeStyle = n.id === 'out' && s.outCase ? pal.teal : faint; ctx.lineWidth = lw;
      if (!(n.id === 'out' && s.outCase)) ctx.setLineDash([f * 0.2, f * 0.16]);
      rrect(ctx, G.box.x, G.box.y, G.box.w, G.box.h, G.box.h * 0.22); ctx.stroke(); ctx.restore();
      [G.geo, ...G.tiles].forEach(r => dashedRect(ctx, r, faint, lw, f));
      break;
    }
    case 'geo': {
      const A = geoArea(L, n);
      ctx.save(); ctx.strokeStyle = faint; ctx.lineWidth = lw; ctx.setLineDash([f * 0.18, f * 0.16]);
      ctx.beginPath(); ctx.moveTo(A.bars.x, A.bars.y + A.bars.h); ctx.lineTo(A.bars.x + A.bars.w, A.bars.y + A.bars.h); ctx.stroke(); ctx.restore();
      if (A.text) {
        const size = Math.max(14, Math.round(f * 0.9));
        ctx.save(); ctx.font = '600 ' + size + 'px ' + SANS; ctx.fillStyle = pal.muted; ctx.textAlign = 'left';
        const lines = [fmtInt(data.packed.info.nonImageBytes) + 'B', '三角形' + fmtInt(data.packed.info.triangles)];
        const tx = n.glyph.x, maxW = A.text === 'top' ? n.glyph.w : n.glyph.w * 0.4;
        const ty = A.text === 'top' ? n.glyph.y + 0.6 * f : n.glyph.y + n.glyph.h / 2 - 0.62 * size;
        lines.forEach((t, i) => haloText(ctx, t, tx, ty + i * 1.25 * size, maxW, n.fill, size));
        ctx.restore();
      }
      break;
    }
    case 'tex': case 'gate':
      rowOf(g, 3, 1, 0.2).forEach(r => dashedRect(ctx, r, faint, lw, f)); break;
    case 'cap': {
      // Outer frame: the 1024px image. Inner frame: the longest side the cap allows.
      const caps = s.capCase ? [capOf(data, s.capCase)] : CASE_IDS.map(cid => capOf(data, cid));
      rowOf(g, 3, 1, 0.2).forEach(r => {
        dashedRect(ctx, r, faint, lw, f);
        caps.forEach(cap => {
          const k = Math.min(1, cap / 1024), w = r.w * k;
          ctx.strokeStyle = s.capCase ? pal.accent : mix(pal.line, pal.accent, 0.4); ctx.lineWidth = lw;
          ctx.strokeRect(r.x + (r.w - w) / 2, r.y + (r.h - w) / 2, w, w);
        });
      });
      break;
    }
    case 'cmp': {
      const rows = [['入力', 'input', data.packed.bytes], ...CASE_IDS.map(cid => [String(capOf(data, cid)), cid, data.cases[cid].output.bytes])];
      const rowH = g.h / rows.length, size = Math.max(14, Math.min(Math.round(f * 0.8), Math.floor(rowH * 0.9)));
      const labels = rowH >= 15 && g.w >= 7 * size;
      ctx.save(); ctx.font = '600 ' + size + 'px ' + SANS; ctx.textAlign = 'left';
      const lab = labels ? Math.max(...rows.map(r => ctx.measureText(r[0]).width)) + size * 0.4 : 0;
      const full = g.w - lab;
      rows.forEach(([name, id, bytes], i) => {
        const y = g.y + i * rowH, bh = Math.max(2, rowH * 0.56);
        const sel = id !== 'input' && (s.caseId ? id === s.caseId : s.chip === 'all' || id === s.chip);
        const on = id === 'input' ? 1 : 0.3 + 0.7 * s.cmpOn;
        ctx.globalAlpha = on;
        ctx.fillStyle = id === 'input' ? mix(pal.line, n.fill, 0.3) : sel ? pal.accent : pal.line;
        ctx.fillRect(g.x + lab, y + (rowH - bh) / 2, Math.max(2, full * bytes / data.packed.bytes), bh);
        if (labels) { ctx.globalAlpha = 1; ctx.fillStyle = pal.muted; ctx.textBaseline = 'middle'; ctx.fillText(name, g.x, y + rowH / 2); }
      });
      ctx.restore(); break;
    }
    case 'use': {
      const A = useArea(g).icons, sz = Math.min(A.h, A.w / 2.4), y = A.y + (A.h - sz) / 2, cx1 = A.x + sz * 0.6, cy = y + sz / 2;
      ctx.save(); ctx.strokeStyle = ctx.fillStyle = pal.teal; ctx.lineWidth = Math.max(1.5, lw * 1.4);
      ctx.beginPath(); ctx.arc(cx1, cy, sz * 0.38, -Math.PI * 0.15, Math.PI * 1.45); ctx.stroke();
      const ax = cx1 + sz * 0.38 * Math.cos(-Math.PI * 0.15), ay = cy + sz * 0.38 * Math.sin(-Math.PI * 0.15);
      ctx.beginPath(); ctx.moveTo(ax + sz * 0.14, ay - sz * 0.02); ctx.lineTo(ax - sz * 0.06, ay - sz * 0.16); ctx.lineTo(ax - sz * 0.04, ay + sz * 0.1); ctx.closePath(); ctx.fill();
      const cx2 = A.x + sz * 1.75;
      ctx.beginPath(); ctx.moveTo(cx2, y + sz * 0.1); ctx.lineTo(cx2, y + sz * 0.62); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx2 - sz * 0.2, y + sz * 0.44); ctx.lineTo(cx2, y + sz * 0.66); ctx.lineTo(cx2 + sz * 0.2, y + sz * 0.44); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx2 - sz * 0.34, y + sz * 0.7); ctx.lineTo(cx2 - sz * 0.34, y + sz * 0.88); ctx.lineTo(cx2 + sz * 0.34, y + sz * 0.88); ctx.lineTo(cx2 + sz * 0.34, y + sz * 0.7); ctx.stroke();
      ctx.restore(); break;
    }
    default: break;
  }
}

/** Fit the current WebGL frame of a model view into a rectangle (contain), on the 2D canvas. */
export function drawModelInto(ctx, view, id, yaw, pitch, r, alpha = 1) {
  const c = view.render(id, yaw, pitch);
  const k = Math.min(r.w / c.width, r.h / c.height), w = c.width * k, h = c.height * k;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.drawImage(c, r.x + (r.w - w) / 2, r.y + (r.h - h) / 2, w, h); ctx.restore();
}

/**
 * Draw the connected map for one scene into a layout from layoutConcept.
 * opts: {layout, palette, mode:'page'|'film', x, y, focus, view (film: shared offscreen model view)}
 */
export function drawConcept(ctx, data, s, opts) {
  const L = opts.layout, pal = opts.palette || PALETTES.light, f = L.f, film = opts.mode === 'film';
  const focus = new Set(opts.focus || s.focus || []);
  const lw = Math.max(1.25, f / 11);
  const small = Math.max(14, Math.round(f * 0.92));
  ctx.save();
  ctx.translate(opts.x || 0, opts.y || 0);
  ctx.textBaseline = 'middle';

  // The wider app is context only: dashed, never lit, not on the executed path.
  ctx.save(); ctx.setLineDash([f * 0.3, f * 0.25]); ctx.strokeStyle = ctx.fillStyle = pal.line; ctx.lineWidth = lw; ctx.globalAlpha = 0.75;
  for (const [a, b] of CONTEXT_EDGES) { const r = route(L.nodes[a], L.nodes[b], 3); arrow(ctx, r[0], r[1], r[2], r[3], f * 0.36); }
  ctx.restore();

  // Executed relationships stay visible in every scene; only emphasis changes.
  const traceN = film ? s.trace.p * EDGES.length : -1;
  EDGES.forEach(([a, b], i) => {
    const r = route(L.nodes[a], L.nodes[b], 3);
    const both = focus.has(a) && focus.has(b), traced = film && s.trace.alpha > 0 && i < traceN;
    const c = both ? pal.accent : traced ? mix(pal.line, pal.accent, s.trace.alpha) : pal.line;
    ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = both || traced ? lw * 1.8 : lw;
    arrow(ctx, r[0], r[1], r[2], r[3], f * 0.42);
  });

  for (const n of Object.values(L.nodes)) {
    const on = focus.has(n.id);
    n.fill = mix(pal[n.role], pal.accent, on ? 0.12 : 0);
    rrect(ctx, n.x, n.y, n.w, n.h, f * 0.35);
    ctx.fillStyle = n.fill; ctx.fill();
    ctx.save();
    if (n.role === 'off') ctx.setLineDash([f * 0.3, f * 0.22]);
    ctx.strokeStyle = on ? pal.accent : pal.line; ctx.lineWidth = on ? lw * 2 : lw; ctx.stroke();
    ctx.restore();
    drawNodeArt(ctx, n, data, s, L, pal, lw, film);
  }

  for (const c of s.carriers) drawCarrier(ctx, c, data, L, pal, lw, film);

  // Film only: the real output GLB, rendered by the shared WebGL view, sits inside the output node.
  if (film && opts.view && s.outCase && s.outRender > 0) drawModelInto(ctx, opts.view, s.outCase, s.yaw, s.pitch, outRenderRect(L.nodes.out), s.outRender);

  // Labels on top with a halo, so a passing shape never hides them.
  ctx.textAlign = 'center';
  for (const n of Object.values(L.nodes)) {
    const [l1, l2] = nodeText(n, data, s), inner = n.w - 0.5 * f;
    ctx.font = '700 ' + f + 'px ' + SANS; ctx.fillStyle = n.role === 'off' ? pal.muted : pal.ink;
    haloText(ctx, l1, n.cx, n.y + 1.05 * f, inner, n.fill, f);
    ctx.font = '500 ' + small + 'px ' + SANS; ctx.fillStyle = pal.muted;
    haloText(ctx, l2, n.cx, n.y + 2.05 * f, inner, n.fill, small);
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

/* ---------- real GLB view (page viewer and film) ---------- */

/**
 * One WebGL renderer showing the verified GLB scenes with one camera and light rig.
 * Same bounds, camera and lighting for every case, so only the embedded textures differ.
 */
export function createModelView(data, {canvas, width, height, pixelRatio = 1, preserveDrawingBuffer = false}) {
  const THREE = data.three;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({canvas, antialias: true, alpha: true, preserveDrawingBuffer}); }
  catch (e) { throw new LoadFailure('この環境ではWebGLで3Dを描けません', String((e && e.message) || e)); }
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(width, height, false);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xfff4e6, 0x3a3328, 1.5));
  const camera = new THREE.PerspectiveCamera(30, width / height, 0.01, 50);
  // Lights ride with the camera, so a turned view is lit the same way for every case.
  const key = new THREE.DirectionalLight(0xffffff, 2.2), fill = new THREE.DirectionalLight(0xe6eeff, 0.7);
  key.position.set(1.5, 2.5, 2); fill.position.set(-2, 0.5, 1);
  camera.add(key, fill); scene.add(camera);
  const roots = {};
  for (const id of MODEL_IDS) { const grp = new THREE.Group(); grp.add(data.models[id].scene); grp.visible = false; scene.add(grp); roots[id] = grp; }
  const target = data.frame.center.clone(), radius = data.frame.radius;

  function render(id, yaw, pitch) {
    if (!roots[id]) fail('表示するGLBがありません', String(id));
    for (const k of MODEL_IDS) roots[k].visible = k === id;
    const v = THREE.MathUtils.degToRad(camera.fov), hfov = 2 * Math.atan(Math.tan(v / 2) * camera.aspect);
    const d = radius / Math.sin(Math.min(v, hfov) / 2) * 0.92;
    camera.position.set(target.x + d * Math.cos(pitch) * Math.sin(yaw), target.y + d * Math.sin(pitch), target.z + d * Math.cos(pitch) * Math.cos(yaw));
    camera.lookAt(target);
    camera.updateMatrixWorld();
    renderer.render(scene, camera);
    return renderer.domElement;
  }
  function resize(w, h, ratio) {
    if (ratio) renderer.setPixelRatio(ratio);
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  function dispose() {
    for (const grp of Object.values(roots)) { grp.clear(); scene.remove(grp); }
    renderer.dispose();
  }
  return {render, resize, dispose, canvas: renderer.domElement};
}

/* ---------- details shared by page and editor ---------- */

/** Facts for one of the six parts, read only from verified files. */
export function partInfo(data, id, caseId) {
  const i = PART_IDS.indexOf(id), part = data.facts.parts[i], f = data.facts, P = data.packed.info;
  const c = data.cases[CASE_IDS.includes(caseId) ? caseId : CASE_IDS[0]];
  const byOrder = list => data.order.map(ix => list.find(x => x.index === ix));
  const rows = {
    app: [
      ['何か', 'ローカルの3Dアプリ／パイプラインと、Pythonの補助CLI群。READMEは、文章や画像から3Dを作り、ゲーム向けに仕上げ、リグと動きを付ける流れを説明しています'],
      ['今回実行した', '持ち込んだGLBのテクスチャ圧縮（' + CLI + '）だけを、無改変で3回。入力をGLBにまとめたBlenderは、AssetFurnaceではない準備の工程です'],
      ['実行していない', f.identity.not_executed.join('・') + '。モデルの重みは取得も読み込みもしていません'],
      ['固定した版', 'コミット ' + SOURCE_COMMIT + '。CHANGELOGの最新は0.4.4（2026-10-14）ですが、READMEの冒頭は0.4.0の下書き注記のままなので、リリース名ではなくコミットで特定します']
    ],
    container: [
      ['入力GLB', fmtInt(data.packed.bytes) + 'B（JSON ' + fmtInt(P.chunks[0].bytes) + 'B／BIN ' + fmtInt(P.chunks[1].bytes) + 'B）。' + f.packed_input.inspection.generator + ' が書き出し'],
      ['中身', 'ノード' + P.doc.nodes.length + '・メッシュ' + P.doc.meshes.length + '・アクセサ' + P.doc.accessors.length + '・bufferView ' + P.doc.bufferViews.length + '（画像' + P.images.length + '＋その他' + P.nonImage.length + '）・マテリアル' + P.doc.materials.length + '・三角形' + fmtInt(P.triangles)],
      ['このページで', '4つのGLBのJSONとBINを読み直し、画像3枚のバイト列と、画像以外の' + P.nonImage.length + 'viewのSHA-256を記録と照合してから表示しています']
    ],
    roles: [
      ...byOrder(P.images).map(im => [imageRole(im).long, im.name + '：' + imageRole(im).kind]),
      ['使っていない割り当て', '元のファイル名にARM（AO・粗さ・金属）とあっても、割り当てはmetallicRoughnessTextureだけで、occlusionTextureはありません']
    ],
    cap: [
      ['この設定', c.request.max_size + '上限：--max-size（色）・--map-size（数値）・--normal-size（法線）すべて ' + c.request.max_size + '、--format png'],
      ['縮め方', '最長辺が上限より大きいときだけ、LANCZOSで縮めます。1024×1024の画像は、1024上限では縮めません'],
      ['quality 90', '--quality と --map-quality は引数として渡しましたが、PNGの保存（optimize=True）には使われません'],
      ['画素', 'PNGは渡された画素をそのまま保存しますが、縮小した時点で画素は変わります。見た目が劣化しないとは言いません']
    ],
    gate: [
      ...byOrder(c.images).map(im => [imageRole(im).short + '（image ' + im.index + '）',
        (im.outcome === 'kept' ? '保持：PNGの候補が元より大きく、元の' : '置換：') +
        im.after.format + ' ' + im.after.width + '×' + im.after.height + '・' + fmtInt(im.after.bytes) + 'B（元 ' + im.before.format + ' ' + fmtInt(im.before.bytes) + 'B）']),
      ['原典CLIの出力（全文）', c.stdout.trim()],
      ['記録していない', c.kept ? '捨てられた候補PNGのバイト数と画素は、原典が保存しないので記録がありません' : '縮小途中の画素や、捨てた候補はありません（3枚とも置換）']
    ],
    rebuild: [
      ['組み直し', '画像以外の' + P.nonImage.length + 'view（' + fmtInt(P.nonImageBytes) + 'B）はバイト列をそのまま写し、置き換えた画像の分だけoffsetと長さを組み直します。置換が0枚なら、入力をそのまま返します'],
      ['この出力', fmtInt(c.output.bytes) + 'B（入力比' + pct(c.output.bytes, data.packed.bytes) + '%）' + (c.identical ? '。入力GLBと全バイト同一' : '')],
      ['照合（制作担当）', '画像とbuffer以外のJSON一致、画像以外の全bufferViewのバイト一致、三角形と頂点の数の一致。このページでも同じ12viewのSHA-256と、画像以外のJSONを入力GLBと比べています'],
      ['言えないこと', '見た目が同じこと、ゲームでそのまま使えること、表示性能。ほかの入力の種類やライブラリ全般の正しさも示しません']
    ]
  }[id];
  return {n: i + 1, id, label: part.label, meaning: part.meaning, rows, source: part.source, excerpt: part.excerpt};
}
