// 八百万図AIツールボックス: Effekseer VFX concept map (visual-r1).
// One connected diagram of what the skill is, what is inside it, how a request reaches the author AI and real tools,
// and what comes back. The browser only reads frozen files next to this module: it never runs Python, Effekseer
// Core, Godot, a model or a review. Every effect pixel drawn here is a pixel of a saved Godot PNG.
// video/video.js imports this same module for the 32 s film, so loading, checks and drawing are shared.

const BASE = new URL('./', import.meta.url);
const MANIFEST_PATH = 'concept/manifest.json';
const MANIFEST_SHA = '605460bc81b15be72ca2c52eb2f04df8c63d74a9b06411f066b72e463de1c233';
const PIN = 'c28919890f0483c0f968a884ea03979803d3b528';
const NOTICE_PIN = '208922ef192220322c2a79e1243ed51ff7d2b7af';
export const REPO = 'kanaworksai-hue/effekseer-vfx-skill';
export const FIRST_PASS = 'assets/first-pass-f016.png';
export const CAPTURE_FRAMES = [...Array(31).keys(), 36];
export const PART_IDS = ['brief', 'recipe', 'build', 'render', 'iterate', 'independent'];
export const PRESETS = [
  {id: 'f02', frame: 2, label: '輪郭'},
  {id: 'f06', frame: 6, label: '接点'},
  {id: 'f10', frame: 10, label: '波紋'},
  {id: 'f16', frame: 16, label: '破片'},
  {id: 'f23', frame: 23, label: '消える途中'},
  {id: 'f30', frame: 30, label: '消失'},
];
// Same capture-pixel rectangles as the original styles.css (a crop of the saved PNG, not a new render).
export const CROPS = {defender: [240, 296, 360, 288], compare: [290, 330, 270, 240]};

export const framePath = frame => `assets/frames/guard-f${String(frame).padStart(3, '0')}.png`;
export const assetURL = path => new URL(path, BASE).href;
export const frameTime = frame => (frame / 60).toFixed(3) + '秒';

const EXPECTED = [
  'concept/structure.json', 'concept/request.txt', 'concept/original-run.json', 'capture-manifest.json',
  'library/vfx/briefs/VFX_Yebisu_Guard.json', 'library/vfx/recipes/VFX_Yebisu_Guard.json',
  'library/vfx/src/VFX_Yebisu_Guard.py', 'library/vfx/vfx_manifest.json',
  'library/vfx/exports/VFX_Yebisu_Guard.efk', 'library/vfx/effects/VFX_Yebisu_Guard.efkefc',
  FIRST_PASS, ...CAPTURE_FRAMES.map(framePath),
  'vendor/LICENSE', 'vendor/effekseer-vfx/THIRD_PARTY_NOTICES.md', 'vendor/effekseer-vfx/SKILL.md',
  'vendor/vfx-review/SKILL.md', 'vendor/effekseer-vfx/references/review.md',
  'vendor/effekseer-vfx/references/engine-conventions.md',
  'vendor/effekseer-vfx/scripts/effekseer_ai/authoring.py', 'effect-library.zip',
];

export class LoadError extends Error {}
const fail = message => new LoadError(message);
const check = (ok, message) => { if (!ok) throw fail(message); };
const utf8 = new TextDecoder('utf-8', {fatal: true});

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

// Loads the 51 frozen files named by concept/manifest.json, checks size, SHA-256 and meaning, then decodes the
// 33 Godot PNGs (f0–f30, f36 and the first-pass f16) once. Nothing is fetched again per frame.
export async function loadAssets({signal, onProgress = () => {}} = {}) {
  if (!globalThis.crypto || !crypto.subtle) {
    throw fail('SHA-256を確かめるには、HTTPS か localhost で開いてください（crypto.subtle を使えません）');
  }
  const local = new AbortController();
  const abort = () => local.abort();
  if (signal) { if (signal.aborted) local.abort(); else signal.addEventListener('abort', abort, {once: true}); }
  const images = new Map();
  const report = info => { if (!local.signal.aborted) onProgress(info); };
  try {
    const manifestBuffer = await fetchBytes(MANIFEST_PATH, local.signal);
    check(await sha256(manifestBuffer) === MANIFEST_SHA, 'concept/manifest.json のSHA-256が固定値と違います');
    const manifest = readJSON(MANIFEST_PATH, readText(MANIFEST_PATH, manifestBuffer));
    const entries = Array.isArray(manifest.files) ? manifest.files : [];
    const listed = new Set(entries.map(entry => entry.path));
    check(manifest.case_id === 'effekseer-vfx-example' && entries.length === 51 && listed.size === 51 &&
      EXPECTED.every(path => listed.has(path)), '確認する51件の一覧が違います');

    const bytes = new Map();
    const hashes = new Map(entries.map(entry => [entry.path, entry.sha256]));
    let done = 0;
    report({phase: 'files', done, total: 51});
    await Promise.all(entries.map(async entry => {
      const buffer = await fetchBytes(entry.path, local.signal);
      check(buffer.byteLength === entry.bytes, `${entry.path}：大きさが違います（${buffer.byteLength}／${entry.bytes}バイト）`);
      check(await sha256(buffer) === entry.sha256, `${entry.path}：SHA-256が違います`);
      bytes.set(entry.path, buffer);
      report({phase: 'files', done: ++done, total: 51});
    }).map(task => task.catch(error => { local.abort(); throw error; })));

    const texts = new Map();
    const text = path => {
      if (!texts.has(path)) texts.set(path, readText(path, bytes.get(path)));
      return texts.get(path);
    };
    const data = validate(text, path => readJSON(path, text(path)), hashes, bytes);

    const imagePaths = [...CAPTURE_FRAMES.map(framePath), FIRST_PASS];
    let decoded = 0;
    report({phase: 'images', done: decoded, total: imagePaths.length});
    await Promise.all(imagePaths.map(async path => {
      let bitmap;
      try {
        bitmap = await createImageBitmap(new Blob([bytes.get(path)], {type: 'image/png'}));
      } catch {
        throw fail(`${path}：画像として読めません`);
      }
      if (local.signal.aborted) { bitmap.close(); return; }
      images.set(path, bitmap);
      check(bitmap.width === 1280 && bitmap.height === 800, `${path}：1280×800ではありません`);
      report({phase: 'images', done: ++decoded, total: imagePaths.length});
    }).map(task => task.catch(error => { local.abort(); throw error; })));
    if (local.signal.aborted) throw signal && signal.aborted ? new DOMException('aborted', 'AbortError') : fail('読み込みを中断しました');

    return {
      ...data,
      images,
      frame: n => images.get(framePath(n)),
      firstPass: images.get(FIRST_PASS),
      close() { for (const bitmap of images.values()) bitmap.close(); images.clear(); },
    };
  } catch (error) {
    local.abort();
    for (const bitmap of images.values()) bitmap.close();
    images.clear();
    throw error;
  } finally {
    if (signal) signal.removeEventListener('abort', abort);
  }
}

// Meaning checks on the saved records. They read what the original run recorded; they are not a new build,
// render, review or effect-verify.
function validate(text, json, hashes, bytes) {
  const structure = json('concept/structure.json');
  check(structure.format === 'effekseer-vfx-structure/v1' && structure.case_id === 'effekseer-vfx-example' &&
    structure.source_commit === PIN, 'structure.json の形式か固定コミットが違います');
  const parts = Array.isArray(structure.parts) ? structure.parts : [];
  check(parts.map(part => part.id).join() === PART_IDS.join(), 'structure.json の6部品が違います');
  for (const part of parts) {
    check(hashes.has(part.source_path) && part.upstream_path === 'skills/' + part.source_path.replace(/^vendor\//, ''),
      `${part.id}：引用元のパスが違います`);
    // The checkout keeps Windows CRLF line endings, so split on either.
    const line = text(part.source_path).split(/\r?\n/)[part.line_start - 1];
    check(typeof line === 'string' && typeof part.quote === 'string' && part.quote && line.includes(part.quote),
      `${part.source_path}:${part.line_start} に引用の文がありません`);
  }

  const capture = json('capture-manifest.json');
  check(capture.effect_id === 'VFX_Yebisu_Guard' && capture.synthetic === true && capture.source_commit === PIN &&
    capture.fps === 60 && capture.effect_duration === 0.5 && String(capture.resolution) === '1280,800',
    'capture-manifest.json の効果・60FPS・0.5秒・1280×800が違います');
  const frames = Array.isArray(capture.frames) ? capture.frames : [];
  check(frames.map(f => f.frame).join() === CAPTURE_FRAMES.join(), '元の撮影は f0〜f30 と f36 の32件のはずです');
  for (const f of frames) {
    check(f.path === framePath(f.frame) && f.sha256 === hashes.get(f.path) && Math.abs(f.time_seconds - f.frame / 60) < 1e-9,
      `capture-manifest.json の f${f.frame} が一覧と違います`);
  }
  const presets = Array.isArray(structure.presets) ? structure.presets : [];
  check(presets.length === 6 && PRESETS.every((preset, i) => presets[i].id === preset.id &&
    presets[i].frame === preset.frame && presets[i].label === preset.label &&
    presets[i].path === framePath(preset.frame) && presets[i].sha256 === hashes.get(presets[i].path)),
    'structure.json の6つの要所フレームが違います');

  const m = capture.manifest || {};
  check(m.id === 'VFX_Yebisu_Guard' && m.seed === 1729 && m.layers === 15 && m.particle_budget === 27 && m.duration === 0.5,
    'capture-manifest.json の効果の記録が違います');
  const verification = capture.verification || {};
  check(verification.verified === true && verification.independent_review && verification.independent_review.verdict === 'ship',
    '元の記録の verified / ship が読めません');

  const library = json('library/vfx/vfx_manifest.json');
  check(Array.isArray(library) && library.length === 1 && library[0].id === 'VFX_Yebisu_Guard' && library[0].seed === 1729 &&
    library[0].layers === 15 && library[0].particle_budget === 27, 'vfx_manifest.json は1つの効果・種1729・15層・上限27のはずです');

  const recipe = json('library/vfx/recipes/VFX_Yebisu_Guard.json');
  const entries = [];
  const walk = list => { for (const layer of Array.isArray(list) ? list : []) { entries.push(layer); walk(layer.children); } };
  walk(recipe.layers);
  const pivots = entries.filter(layer => layer.renderer === 'None').length;
  const shards = entries.filter(layer => /^Plate shard \d$/.test(layer.name)).length;
  const textures = new Set(entries.flatMap(layer => [layer.texture, layer.alpha_texture]).filter(Boolean));
  check(recipe.id === 'VFX_Yebisu_Guard' && recipe.seed === 1729 && entries.length === 15 && pivots === 2 && shards === 6 &&
    textures.size === 5, '展開したレシピは15項目（基準点2・破片6・テクスチャ5）のはずです');

  const brief = json('library/vfx/briefs/VFX_Yebisu_Guard.json');
  check(brief.effect_id === 'VFX_Yebisu_Guard' && Array.isArray(brief.beats) &&
    brief.beats.map(beat => beat.frame).join() === '2,5,10,16,18,23,30', 'ブリーフの7場面が違います');

  const original = json('concept/original-run.json');
  const run = original.runtime || {};
  const api = run.api || {};
  check(run.status === 'passed' && run.sample_count === 1 && run.authoring_build_render_rounds === 3 &&
    api.api_checks === 12 && api.status === 'passed' && run.effect_verify && run.effect_verify.verified === true &&
    run.independent_ai_review && run.independent_ai_review.verdict === 'ship' && run.human_approval === false &&
    run.device_performance_tested === false, 'original-run.json の元の記録が違います');
  const upstream = original.upstream || {};
  check(upstream.repository === REPO && upstream.commit === PIN && upstream.skill_version === '0.2.0' && upstream.license === 'MIT',
    '原典の固定コミット・版・ライセンスが違います');

  const request = text('concept/request.txt');
  check(request.includes('薄い盾の輪郭→短い白い接点→青い面の波紋→隙間を開けた破片→消失'), 'concept/request.txt の依頼が違います');

  const license = text('vendor/LICENSE');
  check(license.includes('MIT License') && license.includes('Copyright (c) 2026 KanaWorks_AI'), 'vendor/LICENSE が違います');
  const notices = text('vendor/effekseer-vfx/THIRD_PARTY_NOTICES.md');
  check(notices.includes('effekseer-ai') && notices.includes(NOTICE_PIN) && notices.includes('MIT'), 'THIRD_PARTY_NOTICES.md が違います');
  check(text('vendor/effekseer-vfx/SKILL.md').includes('version: "0.2.0"'), 'SKILL.md の版が違います');

  // The Ring colour rule this page explains: the compiler writes color_curve only for Sprite/Model, and a Ring
  // draws its fixed outer/center/inner vertex colours. Read from the frozen source, not executed.
  const compiler = text('vendor/effekseer-vfx/scripts/effekseer_ai/authoring.py').split(/\r?\n/);
  check(compiler[276] && compiler[276].includes("if renderer in ['Sprite','Model']") &&
    compiler.some(line => line.includes("('OuterColor','outer_color')")), 'authoring.py の色の規則が見つかりません');
  check(text('vendor/effekseer-vfx/references/engine-conventions.md').includes('tilt=(0,58,0)'), 'engine-conventions.md が違います');
  check(text('library/vfx/src/VFX_Yebisu_Guard.py').includes('The compiler writes color_curve only for Sprite/Model'),
    'レシピのPythonが違います');
  const zip = new Uint8Array(bytes.get('effect-library.zip'), 0, 4);
  check(zip[0] === 0x50 && zip[1] === 0x4b && zip[2] === 0x03 && zip[3] === 0x04, 'effect-library.zip がZIPではありません');

  return {
    structure,
    parts,
    capture,
    captureText: text('capture-manifest.json'),
    request,
    original,
    counts: {entries: entries.length, pivots, shards, textures: textures.size},
  };
}

// ---- Diagram -------------------------------------------------------------------------------------------------
// Warm paper and ink with a vermilion accent; blue is kept for things tied to the actual VFX colours.

export const PALETTES = {
  light: {bg: '#f3eee3', card: '#fbf8f1', ink: '#1e1b17', sub: '#5f574b', rule: '#b9ad97', lane: '#e8dfcd',
    verm: '#c23b17', blue: '#2d5fc4', stage: '#d9d4ca'},
  dark: {bg: '#171512', card: '#221f1a', ink: '#eee6d6', sub: '#aca08d', rule: '#554c3f', lane: '#26221b',
    verm: '#f06a42', blue: '#83a8f2', stage: '#2c2924'},
};

export const FONT = '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic UI", "Yu Gothic", "Noto Sans JP", Meiryo, sans-serif';

// Design space: portrait 300×420, wide 640×300. Positions scale uniformly; labels never drop below 11 px.
export const LAYOUTS = {
  portrait: {
    w: 300, h: 420,
    book: {x: 8, y: 10, w: 76, h: 80}, tabs: {x: 84, y: 13, w: 42, h: 12, gap: 1},
    request: {x: 194, y: 8, w: 98, h: 86},
    ai: {cx: 150, cy: 122, r: 19, label: 'left'},
    brief: {x: 10, y: 160, w: 92, h: 66}, recipe: {x: 110, y: 154, w: 104, h: 82},
    eye: {cx: 284, cy: 166, label: 'left'}, rounds: {x: 222, y: 208, dx: 13},
    lane: {x: 4, y: 250, w: 292, h: 94, labelAt: [10, 263]},
    tex: {x: 12, y: 286, s: 10, gap: 3, labelAt: [12, 314]},
    core: {cx: 110, cy: 290, r: 19, label: 'below'}, chip: {x: 140, y: 282, w: 30, h: 18},
    godot: {x: 184, y: 256, w: 104, h: 83},
    rubric: {x: 262, y: 356, w: 32, h: 28}, rev: {cx: 232, cy: 370, r: 14},
    review: {x: 150, y: 356, w: 52, h: 30}, proof: {x: 84, y: 360, w: 54, h: 22},
    lib: {x: 8, y: 352, w: 66, h: 38}, action: {x: 8, y: 397, w: 196, h: 21},
    zoom: {x: 25, y: 104, w: 250, h: 200},
    edges: {
      'book-ai': [[126, 51], [140, 51], [140, 104]],
      'req-ai': [[194, 51], [160, 51], [160, 104]],
      'ai-brief': [[137, 136], [137, 146], [56, 146], [56, 160]],
      'ai-recipe': [[157, 140], [157, 154]],
      'recipe-core': [[116, 236], [116, 271]],
      'tex-core': [[74, 291], [88, 291]],
      'core-godot': [[131, 291], [184, 291]],
      'loop': [[284, 256], [284, 124], [170, 124]],
      'godot-rev': [[232, 339], [232, 356]],
      'rubric-rev': [[262, 370], [246, 370]],
      'rev-review': [[218, 371], [202, 371]],
      'review-proof': [[150, 371], [138, 371]],
      'proof-lib': [[84, 371], [74, 371]],
      'lib-action': [[41, 390], [41, 397]],
      'build-lib': [[155, 300], [155, 347], [41, 347], [41, 352]],
    },
  },
  wide: {
    w: 640, h: 300,
    book: {x: 12, y: 14, w: 76, h: 80}, tabs: {x: 88, y: 17, w: 42, h: 12, gap: 1},
    request: {x: 12, y: 118, w: 98, h: 86},
    ai: {cx: 190, cy: 104, r: 19, label: 'right'},
    brief: {x: 138, y: 170, w: 92, h: 66}, recipe: {x: 250, y: 150, w: 104, h: 82},
    eye: {cx: 420, cy: 40, label: 'below'}, rounds: {x: 478, y: 58, dx: 13},
    lane: {x: 368, y: 92, w: 268, h: 136, labelAt: [374, 105]},
    tex: {x: 392, y: 188, s: 10, gap: 3, labelAt: [392, 214]},
    core: {cx: 420, cy: 150, r: 19, label: 'above'}, chip: {x: 448, y: 141, w: 30, h: 18},
    godot: {x: 494, y: 104, w: 120, h: 96},
    rubric: {x: 596, y: 240, w: 36, h: 28}, rev: {cx: 554, cy: 254, r: 14},
    review: {x: 470, y: 240, w: 54, h: 30}, proof: {x: 390, y: 244, w: 56, h: 22},
    lib: {x: 300, y: 236, w: 66, h: 38}, action: {x: 96, y: 250, w: 188, h: 22},
    zoom: {x: 195, y: 30, w: 250, h: 200},
    edges: {
      'book-ai': [[130, 55], [172, 55], [172, 92]],
      'req-ai': [[110, 161], [140, 161], [140, 104], [171, 104]],
      'ai-brief': [[184, 122], [184, 170]],
      'ai-recipe': [[198, 121], [198, 136], [300, 136], [300, 150]],
      'recipe-core': [[354, 170], [380, 170], [380, 150], [399, 150]],
      'tex-core': [[423, 188], [423, 171]],
      'core-godot': [[441, 150], [494, 150]],
      'loop': [[554, 104], [554, 40], [190, 40], [190, 85]],
      'godot-rev': [[554, 200], [554, 240]],
      'rubric-rev': [[596, 254], [568, 254]],
      'rev-review': [[540, 255], [524, 255]],
      'review-proof': [[470, 255], [446, 255]],
      'proof-lib': [[390, 255], [366, 255]],
      'lib-action': [[300, 261], [284, 261]],
      'build-lib': [[463, 159], [463, 232], [333, 232], [333, 236]],
    },
  },
};

// Which part of the graph each control lights up. Every stage keeps the whole graph on screen.
export const STAGE_FOCUS = [
  ['book', 'tabs', 'request', 'ai', 'brief', 'recipe', 'e:book-ai', 'e:req-ai', 'e:ai-brief', 'e:ai-recipe'],
  ['recipe', 'lane', 'tex', 'core', 'chip', 'godot', 'eye', 'rounds', 'ai', 'e:recipe-core', 'e:tex-core', 'e:core-godot', 'e:loop'],
  ['godot', 'rubric', 'rev', 'review', 'proof', 'lib', 'action', 'e:godot-rev', 'e:rubric-rev', 'e:rev-review',
    'e:review-proof', 'e:proof-lib', 'e:lib-action', 'e:build-lib'],
];
export const PART_FOCUS = {
  brief: ['tabs', 'brief', 'ai', 'e:ai-brief'],
  recipe: ['tabs', 'recipe', 'ai', 'tex', 'e:ai-recipe'],
  build: ['tabs', 'lane', 'tex', 'core', 'chip', 'e:recipe-core', 'e:tex-core', 'e:core-godot'],
  render: ['tabs', 'lane', 'godot', 'e:core-godot'],
  iterate: ['tabs', 'godot', 'eye', 'rounds', 'ai', 'e:loop'],
  independent: ['tabs', 'godot', 'rubric', 'rev', 'review', 'proof', 'e:godot-rev', 'e:rubric-rev', 'e:rev-review', 'e:review-proof'],
};
const TAB_LABELS = ['設計', 'レシピ', 'ビルド', '描画', '直す', '別AI'];
const BEATS = ['輪郭', '接点', '波紋', '破片', '消失'];
// Recipe palette roles of the 15 entries in order (null = invisible pivot, drawn dashed). Diagram swatches only.
const STACK = [
  [0, null], [1, '#c8e8ff'], [1, '#5096ff'], [1, '#96cdff'], [1, '#3c7dff'], [1, '#3c7dff'], [1, '#3c7dff'],
  [1, '#3c7dff'], [1, '#3c7dff'], [1, '#3c7dff'], [0, null], [1, '#f0f8ff'], [1, '#6eafff'], [1, '#ebf6ff'], [1, '#7da0d2'],
];
const BRIEF_BEATS = [2, 5, 10, 16, 18, 23, 30];

// The complete, resting state: everything shown, no token in flight.
export function restingState(overrides = {}) {
  return {
    show: {}, ghost: 0.16, bookOpen: 1, tabs: 6, beats: 5, stackLit: 1, gear: 0, rounds: 3, roundHot: -1,
    tokens: [], focus: null, part: -1, actionPulse: 0, aiPulse: 0,
    view: {image: null, crop: 'defender', label: '', tag: '', zoom: 0},
    ...overrides,
  };
}

const EDGE_ENDS = {
  'book-ai': ['book', 'ai'], 'req-ai': ['request', 'ai'], 'ai-brief': ['ai', 'brief'], 'ai-recipe': ['ai', 'recipe'],
  'recipe-core': ['recipe', 'core'], 'tex-core': ['tex', 'core'], 'core-godot': ['core', 'godot'], 'loop': ['godot', 'eye'],
  'godot-rev': ['godot', 'rev'], 'rubric-rev': ['rubric', 'rev'], 'rev-review': ['rev', 'review'],
  'review-proof': ['review', 'proof'], 'proof-lib': ['proof', 'lib'], 'lib-action': ['lib', 'action'], 'build-lib': ['chip', 'lib'],
};

export const clamp01 = x => x <= 0 ? 0 : x >= 1 ? 1 : x;
export const seg = (t, a, b) => clamp01((t - a) / (b - a));
export const ease = x => { const c = clamp01(x); return c * c * (3 - 2 * c); };
const lerp = (a, b, p) => a + (b - a) * p;

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

// Draws a cover-fit part of a saved 1280×800 Godot PNG. The crop is a rectangle of the capture; nothing is redrawn.
function drawCrop(ctx, image, crop, x, y, w, h) {
  let [sx, sy, sw, sh] = CROPS[crop] || CROPS.defender;
  const aspect = w / h;
  if (sw / sh > aspect) { const nw = sh * aspect; sx += (sw - nw) / 2; sw = nw; } else { const nh = sw / aspect; sy += (sh - nh) / 2; sh = nh; }
  ctx.drawImage(image, sx, sy, sw, sh, x, y, w, h);
}

// Draws the whole connected diagram for state `s` into `rect` (canvas units). `pxPerUnit` is how many output
// pixels (CSS pixels on the page, video pixels in the film) one canvas unit becomes, so labels stay at least 11.
export function drawMap(ctx, kind, rect, s, pal, pxPerUnit = 1) {
  const L = LAYOUTS[kind];
  const k = Math.min(rect.w / L.w, rect.h / L.h);
  const unit = k * pxPerUnit;
  const size = n => Math.max(n, 11 / unit);
  const shown = id => { const v = s.show[id]; return v === undefined ? 1 : v; };
  const hot = id => !!(s.focus && s.focus.includes(id));
  const alpha = id => {
    const a = s.ghost + (1 - s.ghost) * shown(id);
    return s.focus && !s.focus.includes(id) ? a * 0.86 : a;
  };
  const font = (n, weight = 500) => `${weight} ${size(n)}px ${FONT}`;
  const text = (str, x, y, n, {weight = 500, align = 'left', color = pal.ink, max} = {}) => {
    ctx.font = font(n, weight); ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = color;
    if (max) ctx.fillText(str, x, y, max); else ctx.fillText(str, x, y);
  };
  // A pill path without CanvasRenderingContext2D.roundRect, which older iOS Safari lacks.
  const pill = (x, y, w, h) => {
    const r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(x + r, y + h); ctx.arc(x + r, y + r, r, Math.PI / 2, Math.PI * 1.5); ctx.closePath();
  };
  const card = (x, y, w, h, id, {fill = pal.card, fold = 0} = {}) => {
    ctx.beginPath();
    if (fold) {
      ctx.moveTo(x, y); ctx.lineTo(x + w - fold, y); ctx.lineTo(x + w, y + fold); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath();
    } else {
      ctx.rect(x, y, w, h);
    }
    ctx.fillStyle = fill; ctx.fill();
    ctx.lineWidth = hot(id) ? 2.2 : 1.3; ctx.strokeStyle = hot(id) ? pal.verm : pal.ink; ctx.stroke();
    if (fold) { ctx.beginPath(); ctx.moveTo(x + w - fold, y); ctx.lineTo(x + w - fold, y + fold); ctx.lineTo(x + w, y + fold); ctx.lineWidth = 1; ctx.stroke(); }
  };
  const viewport = (x, y, w, h, big) => {
    ctx.fillStyle = pal.stage; ctx.fillRect(x, y, w, h);
    if (s.view.image) drawCrop(ctx, s.view.image, s.view.crop, x, y, w, h);
    else text('実描画', x + w / 2, y + h / 2 + 4, 11, {align: 'center', color: pal.sub});
    const n = big ? 14 : 11;
    const tagH = size(n) + 5;
    ctx.font = font(n, 700);
    const tagW = ctx.measureText('Godot').width + 8;
    ctx.fillStyle = pal.card; ctx.fillRect(x, y, tagW, tagH);
    text('Godot', x + 4, y + tagH - 4, n, {weight: 700});
    const note = s.view.tag || s.view.label;
    if (note) {
      ctx.fillStyle = pal.card; ctx.fillRect(x, y + h - tagH, w, tagH);
      text(note, x + 4, y + h - 4, n, {weight: 700, max: w - 8});
    }
    ctx.lineWidth = hot('godot') ? 2.4 : 1.6; ctx.strokeStyle = hot('godot') ? pal.verm : pal.ink; ctx.strokeRect(x, y, w, h);
  };

  ctx.save();
  ctx.translate(rect.x + (rect.w - L.w * k) / 2, rect.y + (rect.h - L.h * k) / 2);
  ctx.scale(k, k);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';

  // Lane of the operator: the person or process that actually ran the tools in the original run.
  const lane = L.lane;
  ctx.globalAlpha = alpha('lane');
  ctx.fillStyle = pal.lane; ctx.fillRect(lane.x, lane.y, lane.w, lane.h);
  if (hot('lane')) { ctx.lineWidth = 1.6; ctx.strokeStyle = pal.verm; ctx.strokeRect(lane.x, lane.y, lane.w, lane.h); }
  text('制作担当が実行', lane.labelAt[0], lane.labelAt[1], 11, {weight: 700, color: pal.sub});

  // Edges under the nodes.
  for (const [id, points] of Object.entries(L.edges)) {
    const [from, to] = EDGE_ENDS[id];
    const own = s.show['e:' + id];
    const reveal = own === undefined ? Math.min(shown(from), shown(to)) : own;
    let a = s.ghost + (1 - s.ghost) * reveal;
    const isHot = hot('e:' + id);
    if (s.focus && !isHot) a *= 0.86;
    ctx.globalAlpha = a;
    const loop = id === 'loop';
    ctx.strokeStyle = isHot ? pal.verm : loop ? pal.ink : pal.sub;
    ctx.lineWidth = loop ? (isHot ? 4.2 : 3.4) : isHot ? 2.4 : 1.4;
    ctx.setLineDash(id === 'build-lib' ? [4, 4] : []);
    ctx.beginPath();
    points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.stroke();
    ctx.setLineDash([]);
    const [x1, y1] = points[points.length - 2], [x2, y2] = points[points.length - 1];
    const angle = Math.atan2(y2 - y1, x2 - x1), head = loop ? 7 : 5;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - head * Math.cos(angle - 0.5), y2 - head * Math.sin(angle - 0.5));
    ctx.lineTo(x2 - head * Math.cos(angle + 0.5), y2 - head * Math.sin(angle + 0.5));
    ctx.closePath(); ctx.fillStyle = ctx.strokeStyle; ctx.fill();
  }

  // Book: the skill's instructions and references, with six explanatory tabs.
  const book = L.book;
  const openW = book.w * (0.55 + 0.45 * s.bookOpen);
  ctx.globalAlpha = alpha('book');
  card(book.x, book.y, openW, book.h, 'book');
  if (s.bookOpen > 0.3) {
    ctx.globalAlpha = alpha('book') * ease((s.bookOpen - 0.3) / 0.7);
    ctx.beginPath(); ctx.moveTo(book.x + openW / 2, book.y + 6); ctx.lineTo(book.x + openW / 2, book.y + book.h - 6);
    ctx.strokeStyle = pal.rule; ctx.lineWidth = 1; ctx.stroke();
    text('Markdown', book.x + openW / 2, book.y + 52, 11, {align: 'center', color: pal.sub, max: openW - 6});
    text('＋CLI', book.x + openW / 2, book.y + 68, 11, {align: 'center', color: pal.sub, max: openW - 6});
  }
  ctx.globalAlpha = alpha('book');
  text('手順書', book.x + openW / 2, book.y + 30, 14, {weight: 700, align: 'center', max: openW - 4});
  const tabs = L.tabs;
  ctx.globalAlpha = alpha('tabs');
  for (let i = 0; i < 6; i++) {
    const out = clamp01(s.tabs - i);
    if (out <= 0) continue;
    const tx = book.x + openW, ty = tabs.y + i * (tabs.h + tabs.gap), tw = tabs.w * ease(out);
    const on = s.part === i;
    ctx.fillStyle = on ? pal.verm : pal.lane; ctx.fillRect(tx, ty, tw, tabs.h);
    ctx.lineWidth = 1; ctx.strokeStyle = on ? pal.verm : pal.ink; ctx.strokeRect(tx, ty, tw, tabs.h);
    if (out > 0.7) text(TAB_LABELS[i], tx + 4, ty + tabs.h - 2, 11, {weight: on ? 700 : 500, color: on ? pal.card : pal.ink, max: tw - 6});
  }

  // Request page with the five time beats.
  const req = L.request;
  ctx.globalAlpha = alpha('request');
  card(req.x, req.y, req.w, req.h, 'request', {fold: 10});
  text('依頼', req.x + 8, req.y + 19, 14, {weight: 700});
  text('約0.5秒', req.x + req.w - 12, req.y + 19, 11, {align: 'right', color: pal.sub});
  for (let i = 0; i < 5; i++) {
    const on = clamp01(s.beats - i);
    const by = req.y + 33 + i * 12;
    ctx.globalAlpha = alpha('request') * (0.25 + 0.75 * on);
    if (i < 4) { ctx.beginPath(); ctx.moveTo(req.x + 13, by); ctx.lineTo(req.x + 13, by + 12); ctx.strokeStyle = pal.rule; ctx.lineWidth = 1; ctx.stroke(); }
    ctx.beginPath(); ctx.arc(req.x + 13, by, 3, 0, Math.PI * 2); ctx.fillStyle = on > 0.5 ? pal.verm : pal.rule; ctx.fill();
    text(BEATS[i], req.x + 22, by + 4, 11);
  }

  // Author AI: writes the brief and recipe, and later the fixes.
  const ai = L.ai;
  ctx.globalAlpha = alpha('ai');
  if (s.aiPulse > 0 && s.aiPulse < 1) {
    ctx.beginPath(); ctx.arc(ai.cx, ai.cy, ai.r + 9 * s.aiPulse, 0, Math.PI * 2);
    ctx.strokeStyle = pal.verm; ctx.lineWidth = 2; ctx.globalAlpha = alpha('ai') * (1 - s.aiPulse); ctx.stroke(); ctx.globalAlpha = alpha('ai');
  }
  ctx.beginPath(); ctx.arc(ai.cx, ai.cy, ai.r, 0, Math.PI * 2); ctx.fillStyle = pal.card; ctx.fill();
  ctx.lineWidth = hot('ai') ? 2.4 : 1.6; ctx.strokeStyle = hot('ai') ? pal.verm : pal.ink; ctx.stroke();
  text('AI', ai.cx, ai.cy + 5, 14, {weight: 700, align: 'center'});
  if (ai.label === 'left') {
    text('制作AI', ai.cx - ai.r - 6, ai.cy - 1, 14, {weight: 700, align: 'right'});
    text('書く・直す', ai.cx - ai.r - 6, ai.cy + 13, 11, {align: 'right', color: pal.sub});
  } else {
    text('制作AI', ai.cx + ai.r + 6, ai.cy - 1, 14, {weight: 700});
    text('書く・直す', ai.cx + ai.r + 6, ai.cy + 13, 11, {color: pal.sub});
  }

  // Brief: the design memo with seven beats on a 0–30 frame line.
  const brief = L.brief;
  ctx.globalAlpha = alpha('brief');
  card(brief.x, brief.y, brief.w, brief.h, 'brief', {fold: 8});
  text('設計メモ', brief.x + 8, brief.y + 19, 14, {weight: 700, max: brief.w - 18});
  const lineY = brief.y + 36, x0 = brief.x + 10, x1 = brief.x + brief.w - 10;
  ctx.beginPath(); ctx.moveTo(x0, lineY); ctx.lineTo(x1, lineY); ctx.strokeStyle = pal.rule; ctx.lineWidth = 1; ctx.stroke();
  for (const f of BRIEF_BEATS) { ctx.beginPath(); ctx.arc(lerp(x0, x1, f / 30), lineY, 2.4, 0, Math.PI * 2); ctx.fillStyle = pal.ink; ctx.fill(); }
  text('7つの場面', brief.x + 8, brief.y + 56, 11, {color: pal.sub});

  // Recipe: Python code whose 15 entries become a coloured layer stack; dashed rows are invisible pivots.
  const rec = L.recipe;
  ctx.globalAlpha = alpha('recipe');
  card(rec.x, rec.y, rec.w, rec.h, 'recipe', {fold: 8});
  text('Pythonレシピ', rec.x + 6, rec.y + 18, 14, {weight: 700, max: rec.w - 16});
  STACK.forEach(([visible, colour], i) => {
    const by = rec.y + 25 + i * 3.6, indent = visible ? 6 : 0, bx = rec.x + 8 + indent, bw = 56 - indent;
    if (!visible) {
      ctx.setLineDash([2, 2]); ctx.lineWidth = 0.8; ctx.strokeStyle = pal.sub; ctx.strokeRect(bx, by, bw, 2.4); ctx.setLineDash([]);
      return;
    }
    ctx.globalAlpha = alpha('recipe') * (0.3 + 0.7 * s.stackLit);
    ctx.fillStyle = colour; ctx.fillRect(bx, by, bw, 2.6);
    ctx.globalAlpha = alpha('recipe');
  });
  text('15', rec.x + rec.w - 34, rec.y + 50, 16, {weight: 700});
  text('項目', rec.x + rec.w - 34, rec.y + 65, 11, {color: pal.sub});

  // Five textures and the official Effekseer Core compiler, run by the operator.
  const tex = L.tex;
  ctx.globalAlpha = alpha('tex');
  for (let i = 0; i < 5; i++) {
    const x = tex.x + i * (tex.s + tex.gap), y = tex.y, c = tex.s / 2;
    ctx.fillStyle = pal.card; ctx.fillRect(x, y, tex.s, tex.s);
    ctx.lineWidth = hot('tex') ? 1.6 : 0.9; ctx.strokeStyle = hot('tex') ? pal.verm : pal.ink; ctx.strokeRect(x, y, tex.s, tex.s);
    ctx.fillStyle = pal.sub; ctx.strokeStyle = pal.sub; ctx.lineWidth = 0.9; ctx.beginPath();
    if (i === 0) { for (const [dx, dy] of [[3, 3], [7, 4], [5, 7]]) { ctx.moveTo(x + dx + 0.9, y + dy); ctx.arc(x + dx, y + dy, 0.9, 0, Math.PI * 2); } ctx.fill(); }
    if (i === 1) { ctx.moveTo(x + 2, y + c); ctx.lineTo(x + tex.s - 2, y + c); ctx.moveTo(x + c, y + 2); ctx.lineTo(x + c, y + tex.s - 2); ctx.stroke(); }
    if (i === 2) { ctx.arc(x + c, y + c, 3, 0, Math.PI * 2); ctx.stroke(); }
    if (i === 3) { ctx.moveTo(x + 2, y + tex.s - 2); ctx.lineTo(x + tex.s - 2, y + 2); ctx.stroke(); }
    if (i === 4) { ctx.moveTo(x + c, y + 2); ctx.lineTo(x + tex.s - 2, y + tex.s - 2); ctx.lineTo(x + 2, y + tex.s - 3); ctx.closePath(); ctx.stroke(); }
  }
  text('5テクスチャ', tex.labelAt[0], tex.labelAt[1], 11, {color: pal.sub});

  const core = L.core;
  ctx.globalAlpha = alpha('core');
  ctx.save();
  ctx.translate(core.cx, core.cy); ctx.rotate(s.gear);
  ctx.beginPath();
  for (let i = 0; i < 20; i++) {
    const r = i % 2 ? core.r - 1 : core.r + 4, a0 = (i / 20) * Math.PI * 2, a1 = ((i + 1) / 20) * Math.PI * 2;
    ctx.lineTo(Math.cos(a0) * r, Math.sin(a0) * r); ctx.lineTo(Math.cos(a1) * r, Math.sin(a1) * r);
  }
  ctx.closePath(); ctx.fillStyle = pal.card; ctx.fill();
  ctx.lineWidth = hot('core') ? 2.2 : 1.4; ctx.strokeStyle = hot('core') ? pal.verm : pal.ink; ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, core.r * 0.42, 0, Math.PI * 2); ctx.lineWidth = 1.2; ctx.stroke();
  ctx.restore();
  text('Core', core.cx, core.label === 'above' ? core.cy - core.r - 9 : core.cy + core.r + 17, 14, {weight: 700, align: 'center'});

  const chip = L.chip;
  ctx.globalAlpha = alpha('chip');
  card(chip.x, chip.y, chip.w, chip.h, 'chip', {fold: 5});
  text('.efk', chip.x + chip.w / 2 - 2, chip.y + chip.h - 5, 11, {weight: 700, align: 'center', max: chip.w - 6});

  // Godot viewport: the saved PNG of the real render.
  const gd = L.godot;
  ctx.globalAlpha = alpha('godot');
  viewport(gd.x, gd.y, gd.w, gd.h, false);

  // Eye on the feedback loop and the three original rounds.
  const eye = L.eye;
  ctx.globalAlpha = alpha('eye');
  ctx.beginPath(); ctx.ellipse(eye.cx, eye.cy, 13, 9, 0, 0, Math.PI * 2); ctx.fillStyle = pal.card; ctx.fill();
  ctx.beginPath();
  ctx.moveTo(eye.cx - 11, eye.cy); ctx.quadraticCurveTo(eye.cx, eye.cy - 10, eye.cx + 11, eye.cy);
  ctx.quadraticCurveTo(eye.cx, eye.cy + 10, eye.cx - 11, eye.cy);
  ctx.lineWidth = 1.6; ctx.strokeStyle = hot('eye') ? pal.verm : pal.ink; ctx.stroke();
  ctx.beginPath(); ctx.arc(eye.cx, eye.cy, 3.4, 0, Math.PI * 2); ctx.fillStyle = hot('eye') ? pal.verm : pal.ink; ctx.fill();
  if (eye.label === 'left') {
    text('見て、', eye.cx - 16, eye.cy - 2, 11, {weight: 700, align: 'right'});
    text('1種類直す', eye.cx - 16, eye.cy + 12, 11, {weight: 700, align: 'right'});
  } else {
    text('見て、1種類直す', eye.cx, eye.cy + 22, 11, {weight: 700, align: 'center'});
  }
  const rounds = L.rounds;
  ctx.globalAlpha = alpha('rounds');
  for (let i = 0; i < 3; i++) {
    const on = clamp01(s.rounds - i), x = rounds.x + i * rounds.dx;
    ctx.beginPath(); ctx.arc(x, rounds.y, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = pal.card; ctx.fill();
    if (on > 0) { ctx.globalAlpha = alpha('rounds') * on; ctx.fillStyle = pal.verm; ctx.fill(); ctx.globalAlpha = alpha('rounds'); }
    ctx.lineWidth = s.roundHot === i ? 2.2 : 1; ctx.strokeStyle = s.roundHot === i ? pal.ink : pal.rule; ctx.stroke();
  }
  text('3回', rounds.x + 3 * rounds.dx - 3, rounds.y + 4, 11, {color: pal.sub});

  // Independent branch: images and the rubric only (no recipe) go to a different AI.
  const rub = L.rubric;
  ctx.globalAlpha = alpha('rubric');
  card(rub.x, rub.y, rub.w, rub.h, 'rubric', {fold: 6});
  ctx.beginPath(); for (let i = 0; i < 2; i++) { ctx.moveTo(rub.x + 5, rub.y + 7 + i * 5); ctx.lineTo(rub.x + rub.w - 9, rub.y + 7 + i * 5); }
  ctx.strokeStyle = pal.rule; ctx.lineWidth = 1; ctx.stroke();
  text('基準', rub.x + rub.w / 2, rub.y + rub.h - 4, 11, {align: 'center', max: rub.w - 4});

  const rev = L.rev;
  ctx.globalAlpha = alpha('rev');
  ctx.beginPath(); ctx.arc(rev.cx, rev.cy, rev.r, 0, Math.PI * 2); ctx.fillStyle = pal.card; ctx.fill();
  ctx.lineWidth = hot('rev') ? 2.4 : 1.6; ctx.strokeStyle = hot('rev') ? pal.verm : pal.ink; ctx.stroke();
  ctx.beginPath(); ctx.arc(rev.cx, rev.cy, rev.r + 3.5, 0, Math.PI * 2); ctx.setLineDash([2, 3]); ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);
  text('AI', rev.cx, rev.cy + 4, 11, {weight: 700, align: 'center'});
  text('別のAI', rev.cx, rev.cy + rev.r + 16, 11, {weight: 700, align: 'center'});

  const review = L.review;
  ctx.globalAlpha = alpha('review');
  card(review.x, review.y, review.w, review.h, 'review', {fold: 6});
  ctx.beginPath(); ctx.moveTo(review.x + 6, review.y + 9); ctx.lineTo(review.x + 9, review.y + 12); ctx.lineTo(review.x + 15, review.y + 5);
  ctx.strokeStyle = pal.verm; ctx.lineWidth = 1.4; ctx.stroke();
  text('レビュー', review.x + review.w / 2, review.y + review.h - 5, 11, {align: 'center', max: review.w - 4});

  const proof = L.proof;
  ctx.globalAlpha = alpha('proof');
  card(proof.x, proof.y, proof.w, proof.h, 'proof');
  ctx.strokeStyle = pal.rule; ctx.lineWidth = 0.8; ctx.strokeRect(proof.x + 2.5, proof.y + 2.5, proof.w - 5, proof.h - 5);
  text('証拠確認', proof.x + proof.w / 2, proof.y + proof.h - 6, 11, {align: 'center', max: proof.w - 6});

  const lib = L.lib;
  ctx.globalAlpha = alpha('lib');
  ctx.beginPath();
  ctx.moveTo(lib.x, lib.y + 6); ctx.lineTo(lib.x + 20, lib.y + 6); ctx.lineTo(lib.x + 25, lib.y); ctx.lineTo(lib.x + lib.w, lib.y);
  ctx.lineTo(lib.x + lib.w, lib.y + lib.h); ctx.lineTo(lib.x, lib.y + lib.h); ctx.closePath();
  ctx.fillStyle = pal.card; ctx.fill(); ctx.lineWidth = hot('lib') ? 2.2 : 1.3; ctx.strokeStyle = hot('lib') ? pal.verm : pal.ink; ctx.stroke();
  text('効果一式', lib.x + lib.w / 2, lib.y + lib.h - 10, 11, {weight: 700, align: 'center', max: lib.w - 6});

  const act = L.action;
  ctx.globalAlpha = alpha('action');
  if (s.actionPulse > 0 && s.actionPulse < 1) {
    pill(act.x - 4 * s.actionPulse, act.y - 4 * s.actionPulse, act.w + 8 * s.actionPulse, act.h + 8 * s.actionPulse);
    ctx.strokeStyle = pal.verm; ctx.lineWidth = 1.6; ctx.globalAlpha = alpha('action') * (1 - s.actionPulse); ctx.stroke(); ctx.globalAlpha = alpha('action');
  }
  pill(act.x, act.y, act.w, act.h);
  ctx.fillStyle = pal.verm; ctx.fill();
  text('開く / 保存して使う', act.x + act.w / 2, act.y + act.h - 5, 14, {weight: 700, align: 'center', color: pal.card, max: act.w - 12});

  // Tokens: the same small shapes travel along the edges.
  ctx.globalAlpha = 1;
  for (const token of s.tokens) {
    if (!(token.p > 0 && token.p < 1)) continue;
    const [x, y] = pointAt(L.edges[token.edge], token.p);
    ctx.globalAlpha = Math.min(1, token.p * 8, (1 - token.p) * 8);
    drawToken(ctx, token, x, y, pal);
  }

  // A larger look at the same viewport, for the film and replays.
  if (s.view.zoom > 0) {
    const z = s.view.zoom, zr = L.zoom;
    ctx.globalAlpha = 0.86 * z; ctx.fillStyle = pal.bg; ctx.fillRect(0, 0, L.w, L.h);
    ctx.globalAlpha = 1;
    viewport(lerp(gd.x, zr.x, z), lerp(gd.y, zr.y, z), lerp(gd.w, zr.w, z), lerp(gd.h, zr.h, z), z > 0.5);
  }
  ctx.restore();
}

function drawToken(ctx, token, x, y, pal) {
  const paper = (w, h, lines, mark) => {
    ctx.fillStyle = pal.card; ctx.fillRect(x - w / 2, y - h / 2, w, h);
    ctx.lineWidth = 1.2; ctx.strokeStyle = pal.ink; ctx.strokeRect(x - w / 2, y - h / 2, w, h);
    ctx.beginPath();
    for (let i = 0; i < lines; i++) { ctx.moveTo(x - w / 2 + 3, y - h / 2 + 4 + i * 3.5); ctx.lineTo(x + w / 2 - 3, y - h / 2 + 4 + i * 3.5); }
    ctx.strokeStyle = pal.rule; ctx.lineWidth = 1; ctx.stroke();
    if (mark) { ctx.beginPath(); ctx.moveTo(x - 3, y + 3); ctx.lineTo(x - 1, y + 5); ctx.lineTo(x + 3, y + 1); ctx.strokeStyle = pal.verm; ctx.lineWidth = 1.4; ctx.stroke(); }
  };
  switch (token.kind) {
    case 'stack':
      ctx.fillStyle = pal.card; ctx.fillRect(x - 9, y - 8, 18, 16); ctx.lineWidth = 1.2; ctx.strokeStyle = pal.ink; ctx.strokeRect(x - 9, y - 8, 18, 16);
      ['#c8e8ff', '#5096ff', '#3c7dff', '#7da0d2'].forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(x - 6, y - 5 + i * 3, 12, 2); });
      break;
    case 'tex':
      for (let i = 0; i < 3; i++) { ctx.fillStyle = pal.card; ctx.fillRect(x - 8 + i * 5, y - 4 + (i % 2) * 2, 6, 6); ctx.lineWidth = 0.9; ctx.strokeStyle = pal.ink; ctx.strokeRect(x - 8 + i * 5, y - 4 + (i % 2) * 2, 6, 6); }
      break;
    case 'file':
      paper(12, 14, 2, false); ctx.fillStyle = pal.blue; ctx.fillRect(x - 4, y + 2, 8, 2);
      break;
    case 'image':
      if (token.image) {
        ctx.fillStyle = pal.stage; ctx.fillRect(x - 14, y - 11, 28, 22);
        drawCrop(ctx, token.image, token.crop || 'defender', x - 14, y - 11, 28, 22);
      }
      ctx.lineWidth = 1.4; ctx.strokeStyle = pal.ink; ctx.strokeRect(x - 14, y - 11, 28, 22);
      break;
    case 'review':
      paper(14, 17, 2, true);
      break;
    case 'rubric':
      paper(14, 17, 3, false);
      break;
    default:
      paper(13, 16, 3, false);
  }
}

// ---- Page stages ------------------------------------------------------------------------------------------------
// 渡す / 作って見る / 使う: the same graph, a different part lit, and a short travel of tokens (skipped when the
// reader prefers reduced motion). The endpoint always shows the selected saved PNG.

export const STAGE_DURATION = [2.6, 3.4, 3.0];
const TOOTH = Math.PI / 5;

export function stageState(stage, elapsed, assets, frame) {
  const e = elapsed;
  const s = restingState({focus: STAGE_FOCUS[stage]});
  const still = assets.frame(frame);
  s.view = {image: still, crop: 'defender', label: `f${frame} · ${frameTime(frame)}`, tag: '', zoom: 0};
  const move = (edge, kind, a, b, extra = {}) => s.tokens.push({edge, kind, p: seg(e, a, b), ...extra});
  if (stage === 0) {
    move('book-ai', 'page', 0, 0.9);
    move('req-ai', 'page', 0.1, 1.0);
    s.aiPulse = seg(e, 0.9, 1.4);
    move('ai-brief', 'page', 1.1, 2.0);
    move('ai-recipe', 'stack', 1.1, 2.0);
    s.stackLit = lerp(0.3, 1, ease(seg(e, 1.9, 2.5)));
  } else if (stage === 1) {
    move('recipe-core', 'stack', 0, 0.8);
    move('tex-core', 'tex', 0, 0.8);
    s.gear = ease(seg(e, 0.6, 1.4)) * TOOTH * 4;
    move('core-godot', 'file', 1.2, 1.8);
    if (e >= 1.8 && e < 2.3) {
      // f0–f30 once at the original 0.5 s pace, then back to the selected frame.
      const f = Math.min(30, Math.floor((e - 1.8) * 60));
      s.view.image = assets.frame(f);
      s.view.label = `f${f} · ${frameTime(f)}`;
    }
    move('loop', 'image', 2.3, 3.1, {image: still});
    s.rounds = 3 * seg(e, 2.4, 3.1);
  } else {
    move('godot-rev', 'image', 0, 0.8, {image: still});
    move('rubric-rev', 'rubric', 0, 0.8);
    move('rev-review', 'review', 0.9, 1.3);
    move('review-proof', 'review', 1.3, 1.7);
    move('proof-lib', 'review', 1.7, 2.1);
    move('build-lib', 'file', 1.7, 2.3);
    s.actionPulse = seg(e, 2.3, 3.0);
  }
  return s;
}

function initPage() {
  const root = document.documentElement;
  const $ = id => document.getElementById(id);
  const canvas = $('concept-map');
  const ctx = canvas.getContext('2d');
  const figure = canvas.parentElement;
  const presetButtons = [...document.querySelectorAll('button[data-preset]')];
  const stageButtons = [...document.querySelectorAll('button[data-stage]')];
  const partButtons = [...document.querySelectorAll('button[data-part]')];
  const assetLinks = [...document.querySelectorAll('a[data-asset-link]')];
  const summarySteps = [...document.querySelectorAll('#map-summary [data-step]')];
  const replay = $('replay'), retry = $('retry'), status = $('load-status'), meta = $('frame-meta');
  const requestText = $('request-text'), copyButton = $('copy-request'), copyStatus = $('copy-status');
  const openFrame = $('open-frame');
  const partFields = ['part-label', 'part-meaning', 'part-quote'].map($);
  const partSource = $('part-source'), partLocal = $('part-local');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const dark = matchMedia('(prefers-color-scheme: dark)');
  const controls = [...presetButtons, ...stageButtons, ...partButtons, replay, copyButton];

  let assets = null, generation = 0, controller = null;
  let preset = PRESETS[2], stage = 0, part = -1, anim = null, raf = 0;

  const schedule = () => { if (!raf) raf = requestAnimationFrame(paint); };

  function paint(now) {
    raf = 0;
    const box = canvas.getBoundingClientRect();
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(box.width * dpr)), h = Math.max(1, Math.round(box.height * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (!assets) return;
    const current = stage === null ? 0 : stage;
    const elapsed = anim ? (now - anim.start) / 1000 : Infinity;
    const s = stageState(current, elapsed, assets, preset.frame);
    if (stage === null) s.focus = null;
    if (part >= 0) { s.focus = PART_FOCUS[PART_IDS[part]]; s.part = part; }
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Canvas units are CSS pixels here, so the 11 px label floor is in CSS pixels.
    drawMap(ctx, canvas.dataset.layout, {x: 0, y: 0, w: box.width, h: box.height}, s, dark.matches ? PALETTES.dark : PALETTES.light, 1);
    ctx.restore();
    if (anim && elapsed < STAGE_DURATION[current]) raf = requestAnimationFrame(paint);
    else anim = null;
  }

  function fitLayout() {
    const layout = figure.clientWidth >= 600 ? 'wide' : 'portrait';
    if (canvas.dataset.layout !== layout) canvas.dataset.layout = layout;
    schedule();
  }

  function selectPreset(next, writeHash) {
    preset = next;
    for (const button of presetButtons) button.setAttribute('aria-pressed', String(button.dataset.preset === next.id));
    meta.textContent = `f${next.frame} · ${frameTime(next.frame)} · ${next.label}`;
    if (assets) {
      openFrame.href = framePath(next.frame);
      openFrame.textContent = `f${next.frame}のPNGを開く`;
    }
    if (writeHash) history.replaceState(null, '', '#' + next.id);
    schedule();
  }

  function selectStage(next, animate) {
    stage = next;
    part = -1;
    for (const button of partButtons) button.setAttribute('aria-pressed', 'false');
    for (const button of stageButtons) button.setAttribute('aria-pressed', String(Number(button.dataset.stage) === next));
    for (const step of summarySteps) {
      if (next !== null && Number(step.dataset.step) === next) step.setAttribute('aria-current', 'step');
      else step.removeAttribute('aria-current');
    }
    anim = animate && next !== null && !reduced.matches ? {start: performance.now()} : null;
    schedule();
  }

  function fillPart(index) {
    const p = assets.parts[index];
    partFields[0].textContent = p.label;
    partFields[1].textContent = p.meaning;
    partFields[2].textContent = p.quote;
    partSource.href = `https://github.com/${REPO}/blob/${assets.structure.source_commit}/${p.upstream_path}#L${p.line_start}`;
    partSource.textContent = `GitHub ${p.upstream_path}:${p.line_start}`;
    partLocal.href = p.source_path;
    partLocal.textContent = `${p.source_path}:${p.line_start}`;
  }

  function selectPart(index) {
    part = index;
    for (const button of partButtons) button.setAttribute('aria-pressed', String(PART_IDS.indexOf(button.dataset.part) === index));
    fillPart(index);
    anim = null;
    schedule();
  }

  function fromHash() {
    const id = decodeURIComponent(location.hash.slice(1));
    const found = PRESETS.find(p => p.id === id);
    if (found) { selectPreset(found, false); return; }
    if (id === 'yebisu-guard') { selectPreset(PRESETS[2], false); selectStage(null, false); }
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
    for (const field of partFields) field.textContent = '';
    for (const link of [partSource, partLocal]) { link.removeAttribute('href'); link.textContent = ''; }
    openFrame.removeAttribute('href');
    requestText.value = '';
    copyStatus.textContent = '';
    $('record-content').textContent = '';
  }

  function ready() {
    root.dataset.state = 'ready';
    setControls(true);
    requestText.value = assets.request;
    $('record-content').textContent = assets.captureText;
    // Short on purpose: it shares one line with the frame readout on a 320 px phone. Details are below the fold.
    status.textContent = '51件を確認済み';
    fillPart(0);
    selectPreset(preset, false);
    const id = location.hash.slice(1);
    if (id === 'yebisu-guard') fromHash();
    else { fromHash(); selectStage(0, true); }
  }

  function failed(error) {
    root.dataset.state = 'error';
    clearResults();
    setControls(false);
    const reason = error instanceof LoadError ? error.message : '読み込み中に予期しないエラーが起きました';
    status.textContent = `読み込みを止めました。${reason}。図・画像・引用・依頼文は表示していません。`;
    retry.hidden = false;
    retry.disabled = false;
  }

  async function load() {
    const mine = ++generation;
    if (controller) controller.abort();
    controller = new AbortController();
    if (assets) { assets.close(); assets = null; }
    root.dataset.state = 'loading';
    clearResults();
    setControls(false);
    retry.hidden = true;
    retry.disabled = true;
    status.textContent = '確認中 0/51';
    try {
      const loaded = await loadAssets({signal: controller.signal, onProgress(info) {
        if (mine !== generation) return;
        status.textContent = info.phase === 'files' ? `確認中 ${info.done}/51` : `画像 ${info.done}/${info.total}`;
      }});
      if (mine !== generation) { loaded.close(); return; }
      assets = loaded;
      ready();
    } catch (error) {
      if (mine !== generation) return;
      failed(error);
    }
  }

  for (const button of presetButtons) {
    button.addEventListener('click', () => selectPreset(PRESETS.find(p => p.id === button.dataset.preset), true));
  }
  for (const button of stageButtons) button.addEventListener('click', () => selectStage(Number(button.dataset.stage), true));
  for (const button of partButtons) button.addEventListener('click', () => selectPart(PART_IDS.indexOf(button.dataset.part)));
  replay.addEventListener('click', () => selectStage(stage === null ? 0 : stage, true));
  retry.addEventListener('click', load);
  copyButton.addEventListener('click', async () => {
    copyStatus.textContent = '';
    try {
      await navigator.clipboard.writeText(assets.request);
      copyStatus.textContent = '依頼の文をコピーしました。';
    } catch {
      requestText.focus();
      requestText.select();
      copyStatus.textContent = 'コピーできませんでした。文を選んだので、長押しか Ctrl+C でコピーしてください。';
    }
  });
  window.addEventListener('hashchange', () => { if (assets) fromHash(); });
  dark.addEventListener('change', schedule);
  new ResizeObserver(fitLayout).observe(figure);
  fitLayout();
  load();
}

if (document.getElementById('concept-map')) initPage();
