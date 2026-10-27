// 無音24秒の解説動画。寸法と投影は ../dims.mjs（画面と同じ）から作る。CADは実行しない。
// seek(t) は t だけから1枚の絵を描き直す。書き出し時はタイマーも操作欄も使わない。
// 「説明用・CAD未実行」の表示は全フレームに出す。

import {DEFAULT, WIDE, caseDims, caseFaces, fixedView, project, fmt} from '../dims.mjs';

const FILM = {duration: 24, fps: 30, posterTime: 12};
const BASE = {portrait: [720, 1280], wide: [1280, 720]};
const RENDER = Boolean(window.__MOTION_RENDER__) || /[?&]render(=|&|$)/.test(location.search);
const given = window.renderConfig || {};
const positive = (value) => Number.isFinite(value) && value > 0;

let [width, height] = new URLSearchParams(location.search).get('orient') === 'wide' ? BASE.wide : BASE.portrait;
if (positive(given.width) && positive(given.height)) {
  width = Math.round(given.width);
  height = Math.round(given.height);
}
const fps = positive(given.fps) ? Math.round(given.fps) : FILM.fps;
window.motionConfig = {duration: FILM.duration, fps, width, height, posterTime: FILM.posterTime, audioEvents: []};
if (RENDER) document.documentElement.classList.add('render');

const JP = '"Hiragino Sans","Hiragino Kaku Gothic ProN","Yu Gothic UI","Yu Gothic","Meiryo","Noto Sans JP",system-ui,sans-serif';
const MONO = 'Consolas,"SF Mono",Menlo,ui-monospace,monospace';
const C = {
  paper: '#f2eee3', card: '#f7f4ec', white: '#fffdf7', ink: '#25241f', muted: '#6b665d', line: '#d6cfc0',
  accent: '#a54528', accentSoft: '#f6e6de',
  floor: '#e8e1d1', innerX: '#d8cfbd', innerY: '#cdc4b0', outerX: '#c9bfaa', outerY: '#ddd5c3', rim: '#f6efe0',
};

const STEPS = [
  {from: 0, title: '寸法を決める', sub: '外形・壁・底の4つの値'},
  {from: 4, title: '外形の箱', sub: 'bd.Box（底面を z = 0 にそろえる）'},
  {from: 9, title: 'くぼみの箱を引く', sub: '底の厚さだけ上げて、外形から引く'},
  {from: 14, title: '幅だけ 100 → 130', sub: '壁と底は 2.4 mm のまま'},
  {from: 20, title: '持ち帰れるもの', sub: 'CADカーネルはまだ動かしていない'},
];

const clamp01 = (value) => Math.max(0, Math.min(1, value));
const ease = (value) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};
const lerp = (a, b, t) => a + (b - a) * t;
const font = (size, weight = 400, family = JP) => `${weight} ${size}px ${family}`;
const stepAt = (t) => STEPS.reduce((found, step, index) => (t >= step.from ? index : found), 0);

function fitFont(ctx, text, maxWidth, size, weight, family = JP, min = 14) {
  let current = size;
  ctx.font = font(current, weight, family);
  while (current > min && ctx.measureText(text).width > maxWidth) {
    current -= 0.5;
    ctx.font = font(current, weight, family);
  }
  return current;
}

// ---- 時刻 → 寸法と形の状態 ----
function stateAt(t) {
  const widthNow = lerp(DEFAULT.width, WIDE.width, ease((t - 14.6) / 4.4));
  const shown = caseDims({...DEFAULT, width: Math.round(widthNow)});
  // 形は少数の幅で描き、数字は 1 mm 刻みの caseDims から出す（どちらも壁 2.4）
  const geometry = {
    outer: {width: widthNow, depth: shown.outer.depth, height: shown.outer.height},
    wall: shown.wall,
    floor: shown.floor,
    inner: {width: widthNow - 2 * shown.wall, depth: shown.inner.depth, height: shown.inner.height},
  };
  const rise = ease((t - 4.4) / 2.2);
  const cavity = ease((t - 10.6) / 2.0);
  const ghostDrop = ease((t - 9.2) / 1.4);
  const ghostFade = 1 - ease((t - 12.6) / 0.8);
  return {shown, geometry, rise, cavity, ghostDrop, ghostFade};
}

// ---- 投影した箱を描く ----
const FILL = {floor: C.floor, 'inner-x': C.innerX, 'inner-y': C.innerY, 'outer-x': C.outerX, 'outer-y': C.outerY, rim: C.rim, top: C.rim};

function pathOf(ctx, points, view) {
  points.forEach((point, index) => {
    const [x, y] = project(point, view);
    if (index) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  });
  ctx.closePath();
}

function drawCase(ctx, state, view) {
  const g = state.geometry;
  if (state.rise <= 0) return;
  const dims = {...g, outer: {...g.outer, height: g.outer.height * state.rise}};
  const cavity = state.rise >= 1 ? state.cavity : 0;
  if (cavity > 0) {
    dims.inner = {...g.inner};
  }
  const faces = caseFaces(dims, {cavity});
  ctx.lineJoin = 'round';
  for (const face of faces) {
    if (face.role === 'inner-x-far' || face.role === 'inner-y-far') continue;
    ctx.beginPath();
    pathOf(ctx, face.points, view);
    if (face.hole) pathOf(ctx, [...face.hole].reverse(), view);
    ctx.fillStyle = FILL[face.role];
    ctx.fill('evenodd');
    ctx.lineWidth = face.role === 'rim' ? 3 : 2;
    ctx.strokeStyle = face.role === 'rim' ? C.accent : C.ink;
    ctx.stroke();
  }
}

// くぼみの箱（引く道具）：外形の上から下りてきて、底の厚さの高さで止まる
function drawGhost(ctx, state, view) {
  const g = state.geometry;
  if (state.rise < 1 || state.ghostDrop <= 0 || state.ghostFade <= 0) return;
  const t = g.wall;
  const W = g.outer.width;
  const D = g.outer.depth;
  const H = g.outer.height;
  const tall = H - g.floor + 1;
  const bottom = lerp(H + 14, lerp(H, g.floor, state.cavity), state.ghostDrop);
  const x0 = t;
  const y0 = t;
  const x1 = W - t;
  const y1 = D - t;
  const top = bottom + tall;
  const faces = [
    [[x1, y0, bottom], [x1, y1, bottom], [x1, y1, top], [x1, y0, top]],
    [[x0, y1, bottom], [x1, y1, bottom], [x1, y1, top], [x0, y1, top]],
    [[x0, y0, top], [x1, y0, top], [x1, y1, top], [x0, y1, top]],
  ];
  ctx.globalAlpha = state.ghostFade;
  for (const points of faces) {
    ctx.beginPath();
    pathOf(ctx, points, view);
    ctx.fillStyle = 'rgba(165,69,40,0.16)';
    ctx.fill();
    ctx.setLineDash([8, 6]);
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = C.accent;
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.globalAlpha = 1;
}

function dimension(ctx, a, b, label, color, view, offset, size) {
  const [x1, y1] = project(a, view);
  const [x2, y2] = project(b, view);
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const nx = -Math.sin(angle) * 8;
  const ny = Math.cos(angle) * 8;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.moveTo(x1 - nx, y1 - ny);
  ctx.lineTo(x1 + nx, y1 + ny);
  ctx.moveTo(x2 - nx, y2 - ny);
  ctx.lineTo(x2 + nx, y2 + ny);
  ctx.stroke();
  ctx.font = font(size, 800);
  ctx.textAlign = 'center';
  ctx.lineWidth = 7;
  ctx.strokeStyle = C.paper;
  const mx = (x1 + x2) / 2 + offset[0];
  const my = (y1 + y2) / 2 + offset[1];
  ctx.strokeText(label, mx, my);
  ctx.fillStyle = color;
  ctx.fillText(label, mx, my);
}

function annotations(ctx, t, state, view, size) {
  const g = state.geometry;
  const s = state.shown;
  const W = g.outer.width;
  const D = g.outer.depth;
  const H = g.outer.height;
  const show = (from) => ease((t - from) / 0.6);
  if (state.rise >= 1) {
    ctx.globalAlpha = show(6.6);
    dimension(ctx, [0, D + 12, 0], [W, D + 12, 0], `幅 ${fmt(s.outer.width)}`, C.ink, view, [-10, size + 10], size);
    dimension(ctx, [W + 12, 0, 0], [W + 12, D, 0], `奥行 ${fmt(s.outer.depth)}`, C.ink, view, [size * 2.2, size * 0.6], size);
    dimension(ctx, [W + 8, D + 8, 0], [W + 8, D + 8, H], `高さ ${fmt(s.outer.height)}`, C.ink, view, [size * 2.4, 4], size);
    ctx.globalAlpha = 1;
  }
  if (state.cavity >= 1) {
    const a = show(12.8);
    ctx.globalAlpha = a;
    dimension(ctx, [g.wall, g.wall + 7, H], [W - g.wall, g.wall + 7, H], `内寸 ${fmt(s.inner.width)}`, C.accent, view, [0, -14], size);
    const [wx, wy] = project([W * 0.5, D - g.wall / 2, H], view);
    ctx.fillStyle = C.accent;
    ctx.beginPath();
    ctx.arc(wx, wy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(wx, wy);
    ctx.lineTo(wx - 46, wy + 78);
    ctx.stroke();
    ctx.font = font(size, 800);
    ctx.textAlign = 'center';
    ctx.lineWidth = 7;
    ctx.strokeStyle = C.paper;
    const label = `壁・底 ${fmt(s.wall)}`;
    ctx.strokeText(label, wx - 50, wy + 78 + size);
    ctx.fillStyle = C.accent;
    ctx.fillText(label, wx - 50, wy + 78 + size);
    ctx.globalAlpha = 1;
  }
}

// ---- 画面の部品 ----
function badge(ctx, x, y, size) {
  const text = '説明用・CAD未実行';
  ctx.font = font(size, 800);
  const w = ctx.measureText(text).width + size * 1.2;
  const h = size * 1.7;
  ctx.fillStyle = C.ink;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = C.paper;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + size * 0.6, y + h / 2 + 1);
  ctx.textBaseline = 'alphabetic';
}

function stepBlock(ctx, x, y, t, scale, maxWidth) {
  const index = stepAt(t);
  const step = STEPS[index];
  ctx.textAlign = 'left';
  ctx.fillStyle = C.muted;
  ctx.font = font(20 * scale, 700, MONO);
  ctx.fillText(`${index + 1} / ${STEPS.length}`, x, y);
  ctx.fillStyle = index === 3 ? C.accent : C.ink;
  const size = fitFont(ctx, step.title, maxWidth, 38 * scale, 800);
  ctx.font = font(size, 800);
  ctx.fillText(step.title, x, y + 46 * scale);
  ctx.fillStyle = C.muted;
  const sub = fitFont(ctx, step.sub, maxWidth, 22 * scale, 600);
  ctx.font = font(sub, 600);
  ctx.fillText(step.sub, x, y + 80 * scale);
}

// 4つの値の札。0〜4秒で現れ、4秒以降は形の横で値を出し続ける
function tags(ctx, x, y, t, state, columns, cardW, cardH, gap, size) {
  const s = state.shown;
  const items = [
    ['幅', `${fmt(s.outer.width)}`, t >= 14.6 && t < 19.4],
    ['奥行', `${fmt(s.outer.depth)}`, false],
    ['高さ', `${fmt(s.outer.height)}`, false],
    ['壁・底', `${fmt(s.wall)}`, t >= 14],
  ];
  items.forEach(([label, value, hot], index) => {
    const show = ease((t - 0.5 - index * 0.6) / 0.6);
    if (show <= 0) return;
    const col = index % columns;
    const row = Math.floor(index / columns);
    const left = x + col * (cardW + gap);
    const top = y + row * (cardH + gap) + (1 - show) * 16;
    ctx.globalAlpha = show;
    ctx.fillStyle = hot ? C.accentSoft : C.white;
    ctx.fillRect(left, top, cardW, cardH);
    ctx.lineWidth = hot ? 3 : 2;
    ctx.strokeStyle = hot ? C.accent : C.ink;
    ctx.strokeRect(left, top, cardW, cardH);
    ctx.textAlign = 'left';
    ctx.fillStyle = C.muted;
    ctx.font = font(size * 0.7, 700);
    ctx.fillText(label, left + 12, top + size * 0.95);
    ctx.fillStyle = hot ? C.accent : C.ink;
    ctx.font = font(size * 1.15, 800, MONO);
    ctx.fillText(value, left + 12, top + cardH - 12);
    const vw = ctx.measureText(value).width;
    ctx.fillStyle = C.muted;
    ctx.font = font(size * 0.7, 700);
    ctx.fillText('mm', left + 18 + vw, top + cardH - 12);
    ctx.globalAlpha = 1;
  });
}

function innerReadout(ctx, x, y, t, state, size) {
  const show = ease((t - 12.8) / 0.6);
  if (show <= 0) return;
  const s = state.shown;
  ctx.globalAlpha = show;
  ctx.textAlign = 'left';
  ctx.fillStyle = C.muted;
  ctx.font = font(size * 0.75, 700);
  ctx.fillText('内寸（幅×奥行×高さ）', x, y);
  ctx.fillStyle = C.accent;
  ctx.font = font(size * 1.45, 800, MONO);
  ctx.fillText(`${fmt(s.inner.width)} × ${fmt(s.inner.depth)} × ${fmt(s.inner.height)}`, x, y + size * 1.6);
  ctx.globalAlpha = 1;
}

function takeaways(ctx, x, y, w, t, size) {
  const rows = [
    {text: '持ち帰れるもの：寸法JSON・未実行Pythonコード', sub: 'parameters.json ・ model-proposal.py', dashed: false},
    {text: 'STEP / STL：未生成', sub: 'cadgen・build123d・OCP は実行していない', dashed: true},
  ];
  let top = y;
  rows.forEach((row, index) => {
    ctx.font = font(size * 1.05, 800);
    const split = ctx.measureText(row.text).width > w - 32 && row.text.includes('：');
    const lines = split ? [`${row.text.split('：')[0]}：`, row.text.split('：')[1]] : [row.text];
    const h = size * (2.4 + lines.length * 1.25);
    const show = ease((t - 20.2 - index * 0.6) / 0.6);
    if (show > 0) {
      const shift = (1 - show) * 14;
      ctx.globalAlpha = show;
      ctx.fillStyle = row.dashed ? '#fbf3ee' : C.white;
      ctx.fillRect(x, top + shift, w, h);
      ctx.lineWidth = 3;
      ctx.strokeStyle = row.dashed ? C.accent : C.ink;
      if (row.dashed) ctx.setLineDash([10, 7]);
      ctx.strokeRect(x, top + shift, w, h);
      ctx.setLineDash([]);
      ctx.textAlign = 'left';
      ctx.fillStyle = row.dashed ? C.accent : C.ink;
      lines.forEach((line, i) => {
        const titleSize = fitFont(ctx, line, w - 32, size * 1.05, 800);
        ctx.font = font(titleSize, 800);
        ctx.fillText(line, x + 16, top + shift + size * (1.55 + i * 1.25));
      });
      ctx.fillStyle = C.muted;
      const subSize = fitFont(ctx, row.sub, w - 32, size * 0.78, 600);
      ctx.font = font(subSize, 600);
      ctx.fillText(row.sub, x + 16, top + shift + size * (1.65 + lines.length * 1.25));
      ctx.globalAlpha = 1;
    }
    top += h + 14;
  });
}

// ---- 1枚を描く ----
const canvas = document.getElementById('film');

function layoutOf() {
  const wide = width > height;
  const [bw, bh] = wide ? BASE.wide : BASE.portrait;
  const scale = Math.min(width / bw, height / bh);
  const area = wide ? {x: 10, y: 130, w: 790, h: 560} : {x: 20, y: 380, w: 680, h: 580};
  const view = fixedView(area.w, area.h, {pad: 70});
  view.ox += area.x;
  view.oy += area.y;
  return {wide, scale, offsetX: (width - bw * scale) / 2, offsetY: (height - bh * scale) / 2, view};
}

function drawPortrait(ctx, t, state, view) {
  badge(ctx, 40, 34, 26);
  ctx.textAlign = 'left';
  ctx.fillStyle = C.ink;
  ctx.font = font(36, 800);
  ctx.fillText('小物ケースの寸法を、CADの前に', 40, 134);
  stepBlock(ctx, 40, 178, t, 1, 640);
  if (t < 20) tags(ctx, 40, 282, t, state, 4, 148, 78, 16, 26);
  drawCase(ctx, state, view);
  drawGhost(ctx, state, view);
  annotations(ctx, t, state, view, 24);
  if (t < 20) innerReadout(ctx, 40, 1030, t, state, 30);
  else {
    innerReadout(ctx, 40, 984, t, state, 26);
    takeaways(ctx, 40, 1056, 640, t, 24);
  }
}

function drawWide(ctx, t, state, view) {
  badge(ctx, 40, 28, 22);
  ctx.textAlign = 'left';
  ctx.fillStyle = C.ink;
  ctx.font = font(32, 800);
  ctx.fillText('小物ケースの寸法を、CADの前に', 40, 110);
  drawCase(ctx, state, view);
  drawGhost(ctx, state, view);
  annotations(ctx, t, state, view, 20);
  const x = 830;
  stepBlock(ctx, x, 150, t, 0.9, 410);
  if (t < 20) {
    tags(ctx, x, 260, t, state, 2, 198, 70, 12, 24);
    innerReadout(ctx, x, 460, t, state, 25);
  } else {
    innerReadout(ctx, x, 270, t, state, 24);
    takeaways(ctx, x, 360, 410, t, 22);
  }
}

function paint(t) {
  const layout = layoutOf();
  const state = stateAt(t);
  const ctx = canvas.getContext('2d');
  // Reset every Canvas drawing state so arbitrary seeks cannot inherit a prior frame.
  if (typeof ctx.reset === 'function') ctx.reset();
  else canvas.width = canvas.width;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(layout.scale, 0, 0, layout.scale, layout.offsetX, layout.offsetY);
  if (layout.wide) drawWide(ctx, t, state, layout.view);
  else drawPortrait(ctx, t, state, layout.view);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

const clampTime = (value) => Math.min(FILM.duration, Math.max(0, Number(value) || 0));

window.motionReady = (async () => {
  if (document.fonts && document.fonts.ready) await document.fonts.ready;
  // 既定値が parameters.json の2案と同じかを確かめる（合わなければ描かない）
  const response = await fetch('../parameters.json', {cache: 'no-store'});
  if (!response.ok) throw new Error(`parameters.json を読めません（${response.status}）`);
  const data = await response.json();
  const byId = Object.fromEntries((data.cases || []).map((item) => [item.id, item]));
  for (const [id, expected] of [['small', DEFAULT], ['wide', WIDE]]) {
    const item = byId[id];
    if (!item || item.width !== expected.width || item.depth !== expected.depth || item.height !== expected.height || item.wall !== expected.wall || item.floor !== expected.wall) {
      throw new Error(`parameters.json の ${id} が dims.mjs と合いません`);
    }
  }
  const check = caseDims(DEFAULT);
  if (check.inner.width !== 95.2 || check.inner.depth !== 65.2 || check.inner.height !== 21.6 || caseDims(WIDE).inner.width !== 125.2) {
    throw new Error('内寸の計算が説明の値（95.2×65.2×21.6、幅広125.2）と合いません');
  }
})();

window.seek = async (seconds) => {
  await window.motionReady;
  const t = clampTime(seconds);
  paint(t);
  return t;
};

// ---- プレビュー（書き出しでは使わない） ----
function sizeCanvas() {
  canvas.width = width;
  canvas.height = height;
  window.motionConfig.width = width;
  window.motionConfig.height = height;
  if (RENDER) {
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    return;
  }
  fit();
}

function fit() {
  const stage = document.getElementById('stage');
  const room = Math.max(240, window.innerHeight - 40);
  const k = Math.min(1, (stage.clientWidth || window.innerWidth) / width, room / height);
  canvas.style.width = `${Math.floor(width * k)}px`;
  canvas.style.height = `${Math.floor(height * k)}px`;
}

sizeCanvas();

if (!RENDER) {
  const status = document.getElementById('status');
  const play = document.getElementById('play');
  const rewind = document.getElementById('rewind');
  const time = document.getElementById('time');
  const clock = document.getElementById('clock');
  const jumps = Array.from(document.querySelectorAll('[data-jump]'));
  const orients = Array.from(document.querySelectorAll('[data-orient]'));
  let current = FILM.posterTime;
  let playing = false;
  let startedAt = 0;
  let raf = 0;

  const show = (t) => {
    current = clampTime(t);
    time.value = current.toFixed(1);
    clock.textContent = `${current.toFixed(1)} / ${FILM.duration.toFixed(1)} 秒`;
    window.seek(current).catch(() => {});
  };
  const stop = () => {
    playing = false;
    cancelAnimationFrame(raf);
    play.textContent = '再生';
    play.setAttribute('aria-pressed', 'false');
  };
  const loop = (now) => {
    if (!playing) return;
    const t = (now - startedAt) / 1000;
    if (t >= FILM.duration) {
      show(FILM.duration);
      stop();
      return;
    }
    show(t);
    raf = requestAnimationFrame(loop);
  };
  const start = () => {
    if (current >= FILM.duration - 0.05) current = 0;
    playing = true;
    startedAt = performance.now() - current * 1000;
    play.textContent = '一時停止';
    play.setAttribute('aria-pressed', 'true');
    raf = requestAnimationFrame(loop);
  };

  play.addEventListener('click', () => (playing ? stop() : start()));
  rewind.addEventListener('click', () => { stop(); show(0); });
  time.addEventListener('input', () => { stop(); show(Number(time.value)); });
  jumps.forEach((button) => button.addEventListener('click', () => { stop(); show(Number(button.dataset.jump)); }));
  orients.forEach((button) => button.addEventListener('click', () => {
    [width, height] = button.dataset.orient === 'wide' ? BASE.wide : BASE.portrait;
    orients.forEach((other) => other.setAttribute('aria-pressed', String(other === button)));
    sizeCanvas();
    show(current);
  }));
  orients.forEach((button) => button.setAttribute('aria-pressed', String((button.dataset.orient === 'wide') === (width > height))));
  window.addEventListener('resize', fit);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (event) => { if (event.matches) stop(); });

  window.motionReady.then(() => {
    status.dataset.state = 'ready';
    status.textContent = `準備完了：${width}×${height}・${fps}fps・${FILM.duration}秒・無音（説明用・CAD未実行）`;
    [play, rewind, time, ...jumps].forEach((control) => { control.disabled = false; });
    show(current);
  }, (error) => {
    status.dataset.state = 'error';
    status.textContent = `描画できません：${error && error.message ? error.message : error}`;
  });
}
