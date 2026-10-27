/* Scenario 3D Collection 作例 — 26秒・無音の説明映像。Studio Yebisu, MIT.
   実際に取得した3つのGLBをWebGLで描き、2Dの motion canvas へ毎フレーム転写する。
   seekのたびに「どのモデルを表示するか・姿勢・ワイヤー・カメラ」を時刻tだけで完全に定め、
   描画は同じタスク内で clear → render → drawImage を済ませる（前フレームや壁時計に依存しない）。
   素材: Scenario / CC BY 4.0。GLB本体は無改変（表示の正規化・照明・カメラは見た目の変更）。 */
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const canvas = document.getElementById('film');
const ctx = canvas.getContext('2d', {willReadFrequently: true});
const cfg = window.motionConfig;
const boot = window.__filmBoot;

const PAPER = '#f2eee3', FIELD = '#fbf9f3', INK = '#17150f', MUTED = '#6b6455';
const RULE = 'rgba(23,21,15,0.2)', ACCENT = '#ff4f00', SOFT = '#e7e1d0', BLUE = '#2749c9', LIME = '#cbef3a';
const MINCHO = '"Hiragino Mincho ProN","Yu Mincho","YuMincho","BIZ UDPMincho","Noto Serif JP",serif';
const SANS = '"Hiragino Sans","Hiragino Kaku Gothic ProN","Yu Gothic UI","Yu Gothic","YuGothic",Meiryo,"Noto Sans JP",system-ui,sans-serif';
const MONO = '"Cascadia Mono",Consolas,"Courier New",monospace';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const lerp = (a, b, k) => a + (b - a) * k;
const fmt = n => n.toLocaleString('ja-JP');

let data = null;
const byId = {};
const thumbs = {};   // key -> HTMLImageElement (input.png)
const pivots = {};   // key -> THREE.Group（表示正規化済みのピボット。glScene直下）
const meshes = {};   // key -> [mesh...]（ワイヤー切替用）

// ---------- WebGL側（オフスクリーン・固定サイズ・seek内で完結） ----------
const GL_W = 720, GL_H = 720;
const glCanvas = document.createElement('canvas');
glCanvas.width = GL_W; glCanvas.height = GL_H;
let glRenderer = null, glScene = null, glCamera = null;
// 2Dへの転写は drawImage 直接ではなく readPixels→行反転→CPU2Dキャンバス経由にする
// （直接転写は別フレーム描画後のラスター化を変え、再現性を損なうことがある）
const readbackCanvas = document.createElement('canvas');
readbackCanvas.width = GL_W; readbackCanvas.height = GL_H;
const readbackCtx = readbackCanvas.getContext('2d', {willReadFrequently: true});
const pixels = new Uint8Array(GL_W * GL_H * 4);
const imageData = readbackCtx.createImageData(GL_W, GL_H);

function initGL() {
  glRenderer = new THREE.WebGLRenderer({canvas: glCanvas, antialias: true, alpha: true, preserveDrawingBuffer: true});
  glRenderer.setSize(GL_W, GL_H, false);
  glRenderer.setClearColor(0x000000, 0);
  glScene = new THREE.Scene();
  glCamera = new THREE.PerspectiveCamera(36, 1, 0.01, 100);
  const hemi = new THREE.HemisphereLight(0xfff8ec, 0x8f8878, 1.15);
  const dir = new THREE.DirectionalLight(0xffffff, 1.8);
  dir.position.set(2.4, 3.2, 2.2);
  glScene.add(hemi, dir);
}

// ピボットで包み、geometryの中心がピボット原点に来るようにする。回転は常にピボットに対して行う。
function makePivot(root) {
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const max = Math.max(size.x, size.y, size.z) || 1;
  const s = 1.9 / max;
  root.scale.setScalar(s);
  root.position.set(-center.x * s, -center.y * s, -center.z * s);
  const inner = new THREE.Group();
  inner.add(root);
  const pivot = new THREE.Group();
  pivot.add(inner);
  pivot.visible = false;
  return pivot;
}

function collectMeshes(pivot) {
  const list = [];
  pivot.traverse(o => { if (o.isMesh) list.push(o); });
  return list;
}

// 1回の呼び出しで「他を隠す→姿勢→ワイヤー→カメラ→描画→転写」を同じタスク内で済ませる。
// 転写は正方形のまま行い、指定矩形の中央に min(dw,dh) の正方形として置く（縦横比を保つ）。
function paintModel(key, t, wire, dx, dy, dw, dh, alpha) {
  const pivot = pivots[key];
  if (!glRenderer || !pivot) return;
  for (const k in pivots) pivots[k].visible = (k === key);
  pivot.rotation.y = 0.55 + Math.max(0, t - 6.4) * 0.6;
  pivot.rotation.x = 0.05 * Math.sin(t * 0.5);
  for (const m of meshes[key]) {
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    for (const mt of mats) mt.wireframe = wire;
  }
  const camA = 0.9 + t * 0.12;
  // 距離は回転中の全外形が収まる余裕を持たせる（宝箱など横幅のある模型の切れを防ぐ）
  glCamera.position.set(Math.sin(camA) * 4.0, 0.55 + 0.15 * Math.sin(t * 0.35), Math.cos(camA) * 4.0);
  glCamera.lookAt(0, 0, 0);
  glRenderer.clear();
  glRenderer.render(glScene, glCamera);
  const gl = glRenderer.getContext();
  gl.finish();
  gl.readPixels(0, 0, GL_W, GL_H, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  for (let row = 0; row < GL_H; row++)
    imageData.data.set(pixels.subarray(row * GL_W * 4, (row + 1) * GL_W * 4), (GL_H - row - 1) * GL_W * 4);
  readbackCtx.putImageData(imageData, 0, 0);
  ctx.save();
  ctx.globalAlpha = alpha;
  const s = Math.min(dw, dh);
  ctx.drawImage(readbackCanvas, dx + (dw - s) / 2, dy + (dh - s) / 2, s, s);
  ctx.restore();
}

// ---------- 2D helpers ----------
function text(str, x, y, size, color, align, weight, family) {
  ctx.fillStyle = color;
  ctx.font = (weight || 600) + ' ' + size + 'px ' + (family || SANS);
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}
function wrap(str, maxW, size, family, weight) {
  ctx.font = (weight || 500) + ' ' + size + 'px ' + (family || SANS);
  const lines = [];
  let line = '';
  for (const ch of str) {
    if (line && ctx.measureText(line + ch).width > maxW) { lines.push(line); line = ch.trim() ? ch : ''; }
    else line += ch;
  }
  if (line) lines.push(line);
  return lines;
}
function rrect(x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
function panel(x, y, w, h, r, fill, stroke, lw) {
  rrect(x, y, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke(); }
}
function chip(x, y, str, size, filled, fg) {
  ctx.font = '700 ' + size + 'px ' + MONO;
  const w = ctx.measureText(str).width + size * 1.2, h = size * 1.7;
  panel(x, y, w, h, h / 2, filled ? (fg || ACCENT) : FIELD, filled ? null : INK, 1.5);
  text(str, x + size * 0.6, y + h / 2 + 1, size, filled ? '#fff' : INK, 'left', 700, MONO);
  return w;
}
function seal(cx, cy, r, u, main, sub) {
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = ACCENT; ctx.fill();
  ctx.strokeStyle = PAPER; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, r - 5 * u, 0, Math.PI * 2); ctx.stroke();
  text(main, cx, cy - 8 * u, 15 * u, PAPER, 'center', 800);
  if (sub) text(sub, cx, cy + 12 * u, 19 * u, PAPER, 'center', 800);
  ctx.restore();
}
function drawThumb(img, x, y, w) {
  if (!img) return;
  const sc = Math.max(w / img.width, w / img.height);
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, w); ctx.clip();
  ctx.drawImage(img, x + (w - img.width * sc) / 2, y + (w - img.height * sc) / 2, img.width * sc, img.height * sc);
  ctx.restore();
  ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, w - 1);
}

// ---------- 場面 ----------
const ORDER = ['frog', 'chest', 'lantern'];

function drawHeader(t, W, L, tall) {
  const u = L.u;
  text('STUDIO YEBISU 作例・無音の説明映像', L.m, 30 * u, 12 * u, MUTED, 'left', 700);
  ctx.fillStyle = ACCENT; ctx.fillRect(L.m, 40 * u, 30 * u, 3.5 * u);
  text('公開の3D素材を、照合して回す。', L.m, 66 * u, tall ? 28 * u : 24 * u, INK, 'left', 700, MINCHO);
}

// 0–3s：出典の提示（入力画像3枚。既存データであることだけを伝える）
function drawSources(t, W, H, L) {
  const u = L.u, tall = L.tall;
  text('Scenario が公開している3Dデータセットの、すでにあるデータです。', L.m, 108 * u, 16 * u, INK, 'left', 700);
  text('今回は3件だけを取得・照合します。新しい3D生成はしていません。', L.m, 132 * u, 14 * u, MUTED, 'left', 600);
  const cw = tall ? (W - 2 * L.m - 24 * u) / 3 : 190 * u;
  const total = 3 * cw + 24 * u;
  const x0 = tall ? L.m : (W - total) / 2;
  const y0 = tall ? 168 * u : 150 * u;
  ORDER.forEach((k, i) => {
    const s = byId[k];
    const x = x0 + i * (cw + 12 * u);
    const p = smooth((t - 0.6 - i * 0.25) / 0.6);
    ctx.save(); ctx.globalAlpha = p;
    panel(x, y0, cw, cw + 44 * u, 10 * u, FIELD, INK, 2);
    drawThumb(thumbs[k], x + 8 * u, y0 + 8 * u, cw - 16 * u);
    text(s.label, x + cw / 2, y0 + cw + 22 * u, 20 * u, INK, 'center', 800);
    ctx.restore();
  });
  const noteY = y0 + cw + 44 * u + 30 * u;
  const exN = data.dataset_examples ? fmt(data.dataset_examples) : '1,342';
  const outN = data.dataset_output_files ? fmt(data.dataset_output_files) : '1,500';
  text('収録は作例' + exN + '件・出力ファイル' + outN + '点。入力画像は配布メタデータのものです。', L.m, noteY, 13 * u, MUTED, 'left', 600);
}

// 3–6.4s：固定リビジョンからの取得と、SHA-256照合
function drawVerify(t, W, H, L) {
  const u = L.u;
  text('1／固定リビジョンから取得して、SHA-256で照合', L.m, 108 * u, 15 * u, ACCENT, 'left', 800);
  chip(L.m, 128 * u, 'revision 55b4c002…（固定）', 12 * u, false);
  ORDER.forEach((k, i) => {
    const s = byId[k];
    const y = 168 * u + i * 66 * u;
    const p = smooth((t - 3.4 - i * 0.5) / 0.5);
    if (p <= 0) return;
    ctx.save(); ctx.globalAlpha = p;
    panel(L.m, y, Math.min(W - 2 * L.m, 520 * u), 54 * u, 10 * u, FIELD, INK, 1.5);
    drawThumb(thumbs[k], L.m + 6 * u, y + 5 * u, 44 * u);
    text(s.label + '（' + (s.settings.quality || '—') + '）', L.m + 62 * u, y + 18 * u, 17 * u, INK, 'left', 800);
    ctx.font = '600 ' + 12 * u + 'px ' + MONO;
    text('output.glb・SHA-256 一致 ' + s.sha256.slice(0, 12) + '…', L.m + 62 * u, y + 40 * u, 12 * u, BLUE, 'left', 600, MONO);
    seal(L.m + Math.min(W - 2 * L.m, 520 * u) - 34 * u, y + 27 * u, 20 * u, u, '✓', null);
    ctx.restore();
  });
  const sp = smooth((t - 5.4) / 0.5);
  if (sp > 0) {
    ctx.save(); ctx.globalAlpha = sp;
    seal(W / 2, 430 * u, 56 * u, u, '3件', 'すべて一致');
    ctx.restore();
  }
}

// 単体表示のステージ矩形
function stageRect(W, H, L) {
  const u = L.u;
  if (L.tall) return {x: L.m, y: 128 * u, w: W - 2 * L.m, h: Math.min(W - 2 * L.m, 400 * u)};
  const s = H - 150 * u;
  return {x: W - L.m - s, y: 96 * u, w: s, h: s};
}

function modelLabel(k, L) {
  const s = byId[k];
  return s.label + '・' + (s.settings.quality || '—') + '・SHA-256一致';
}

// 6.4s以降：実物GLBを大きく回す。切替は0.5sのクロスフェード。
const SEG = [
  {key: 'frog', a: 6.4, b: 10.4},
  {key: 'chest', a: 10.4, b: 14.0},
  {key: 'lantern', a: 14.0, b: 17.6},
];
function segAt(t) {
  for (let i = 0; i < SEG.length; i++) {
    if (t < SEG[i].a) return {cur: SEG[Math.max(0, i - 1)].key, next: null, f: 0};
    if (t < SEG[i].b) {
      const nxt = SEG[i + 1];
      if (nxt && t > nxt.a - 0.5) return {cur: SEG[i].key, next: nxt.key, f: smooth((t - (nxt.a - 0.5)) / 0.5)};
      return {cur: SEG[i].key, next: null, f: 0};
    }
  }
  return {cur: SEG[SEG.length - 1].key, next: null, f: 0};
}

function drawModelView(t, W, H, L) {
  const u = L.u;
  const st = stageRect(W, H, L);
  text('2／実物のGLBを回して見る（ドラッグ相当の自動回転）', L.m, 108 * u, 15 * u, ACCENT, 'left', 800);
  panel(st.x - 8 * u, st.y - 8 * u, st.w + 16 * u, st.h + 16 * u, 12 * u, FIELD, INK, 2);
  const g = segAt(t);
  // 先頭モデルだけ、最初の1秒はワイヤーフレームから着彩へ（実メッシュの形状を見せる）
  const wire = t < 7.5; // One wire-to-texture change, without repeated flashing.
  paintModel(g.cur, t, wire, st.x, st.y, st.w, st.h, g.next ? 1 - g.f : 1);
  if (g.next) paintModel(g.next, t, false, st.x, st.y, st.w, st.h, g.f);
  if (t < 8.6) text('ワイヤーフレーム → テクスチャ着彩', st.x + st.w / 2, st.y + st.h + 22 * u, 13 * u, MUTED, 'center', 700);

  const s = byId[g.next && g.f > 0.5 ? g.next : g.cur];
  // 短い和文ラベル：名前・記録された設定・検証済みファイル
  const label = modelLabel(s.id, L);
  if (L.tall) {
    const ly = st.y + st.h + 52 * u;
    text(label, L.m, ly, 24 * u, INK, 'left', 800);
    drawThumb(thumbs[s.id], L.m, ly + 22 * u, 64 * u);
    text('入力画像', L.m + 32 * u, ly + 96 * u, 12 * u, MUTED, 'center', 700);
    let cx = L.m + 84 * u;
    cx += chip(cx, ly + 26 * u, '三角形 ' + fmt(s.statistics.triangles), 13 * u, false) + 10 * u;
    cx += chip(cx, ly + 26 * u, '頂点 ' + fmt(s.statistics.vertices), 13 * u, false) + 10 * u;
    chip(cx, ly + 26 * u, 'テクスチャ画像 ' + s.statistics.images + '点', 13 * u, false);
    text('表示の正規化・照明・カメラは見た目の変更。GLB本体のバイトは無改変です。', L.m, ly + 128 * u, 13 * u, MUTED, 'left', 600);
  } else {
    const ly = st.y + 34 * u;   // 手順テキスト（108u）と重ならない位置から
    text(label, L.m, ly + 10 * u, 20 * u, INK, 'left', 800);
    drawThumb(thumbs[s.id], L.m, ly + 30 * u, 72 * u);
    text('入力画像', L.m + 36 * u, ly + 112 * u, 12 * u, MUTED, 'center', 700);
    let cx = L.m;
    const cy = ly + 140 * u;
    cx += chip(cx, cy, '三角形 ' + fmt(s.statistics.triangles), 12 * u, false) + 8 * u;
    cx += chip(cx, cy, '頂点 ' + fmt(s.statistics.vertices), 12 * u, false) + 8 * u;
    chip(cx, cy, 'GLB本体無改変', 12 * u, false, BLUE);
  }
}

// 3体並び（17.6s–終盤もこのまま。クレジットだけ重ねる）。模型は正方形カードで並べる。
function threeRects(W, H, L) {
  const u = L.u;
  if (L.tall) {
    // 上段2枚＋下段1枚の正方形カード
    const s = (W - 2 * L.m - 16 * u) / 2;
    return [
      {k: ORDER[0], x: L.m, y: 150 * u, w: s, h: s},
      {k: ORDER[1], x: L.m + s + 16 * u, y: 150 * u, w: s, h: s},
      {k: ORDER[2], x: (W - s) / 2, y: 150 * u + s + 66 * u, w: s, h: s},
    ];
  }
  // 横：3枚の大きな正方形カードを1列に
  const s = 270 * u;
  const total = 3 * s + 2 * 14 * u;
  const x0 = (W - total) / 2;
  return ORDER.map((k, i) => ({k, x: x0 + i * (s + 14 * u), y: 88 * u, w: s, h: s}));
}
function drawThreeUp(t, W, H, L) {
  const u = L.u;
  for (const r of threeRects(W, H, L)) {
    const p = smooth((t - 17.6 - ORDER.indexOf(r.k) * 0.3) / 0.6);
    if (p <= 0) continue;
    panel(r.x - 6 * u, r.y - 6 * u, r.w + 12 * u, r.h + 12 * u, 10 * u, FIELD, INK, 2);
    paintModel(r.k, t + ORDER.indexOf(r.k) * 1.7, false, r.x, r.y, r.w, r.h, p);
    text(byId[r.k].label, r.x + r.w / 2, r.y + r.h + 24 * u, 22 * u, INK, 'center', 800);
    ctx.font = '600 ' + 11 * u + 'px ' + MONO;
    text(byId[r.k].settings.quality || '—', r.x + r.w / 2, r.y + r.h + 46 * u, 11 * u, MUTED, 'center', 600, MONO);
  }
}

// 終盤：実物3体の上に小さなクレジット（実モデルで締める）
function drawFinalCredit(t, W, H, L) {
  const u = L.u;
  const p = smooth((t - 21.8) / 0.8);
  if (p <= 0) return;
  ctx.save(); ctx.globalAlpha = p;
  const bw = L.tall ? W - 2 * L.m : 620 * u;
  const bh = 96 * u;
  const bx = L.tall ? L.m : (W - bw) / 2;
  const by = H - bh - 26 * u;
  panel(bx, by, bw, bh, 12 * u, INK, null);
  text('素材：Scenario ／ CC BY 4.0・八百万図AIツールボックス', bx + 18 * u, by + 22 * u, 15 * u, PAPER, 'left', 800);
  text('GLB本体は無改変。表示の正規化・照明・カメラは見た目の変更です。', bx + 18 * u, by + 46 * u, 12 * u, 'rgba(242,238,227,0.8)', 'left', 600);
  text('scenario-labs/3d-collection @55b4c002… ／ made by studio_yebisu', bx + 18 * u, by + 72 * u, 11 * u, LIME, 'left', 700);
  ctx.restore();
}

function drawFrame(t) {
  const W = cfg.width, H = cfg.height, tall = H >= W;
  canvas.width = W; canvas.height = H;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
  if (!data) {
    text('素材と記録を読み込んでいます…', W / 2, H / 2, 16, MUTED, 'center', 600);
    return;
  }
  const L = {u: tall ? W / 540 : H / 540, m: tall ? 28 : 44, tall};
  drawHeader(t, W, L, tall);
  if (t < 3) drawSources(t, W, H, L);
  else if (t < 6.4) drawVerify(t, W, H, L);
  else if (t < 17.6) drawModelView(t, W, H, L);
  else {
    drawThreeUp(t, W, H, L);
    drawFinalCredit(t, W, H, L);
  }
}

window.seek = s => {
  const t = clamp(Number(s) || 0, 0, cfg.duration);
  window.__seekAt = t;
  drawFrame(t);
};

(async () => {
  try {
    const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    const r = await fetch('../samples.json');
    if (!r.ok) throw new Error('samples.json を読めませんでした（HTTP ' + r.status + '）');
    data = await r.json();
    for (const s of data.samples) byId[s.id] = s;
    initGL();
    const loader = new GLTFLoader();
    // GLBとテクスチャがそろうまで待つ（motionReadyが全素材の完了を表す）
    await Promise.all(data.samples.map(async s => {
      const gltf = await loader.loadAsync('../' + s.model_url);
      const pivot = makePivot(gltf.scene);
      pivots[s.id] = pivot;
      meshes[s.id] = collectMeshes(pivot);
      glScene.add(pivot);
      const img = new Image();
      img.src = '../' + s.input_image;
      await img.decode();
      thumbs[s.id] = img;
    }));
    await fontsReady;
    drawFrame(window.__seekAt || 0);
    boot.resolve();
  } catch (e) {
    try { drawFrame(0); } catch (_) { /* 空でも有効なキャンバスを残す */ }
    boot.reject(e instanceof Error ? e : new Error(String(e)));
  }
})();
