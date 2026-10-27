// 無音24秒の解説動画。図は ../figure.mjs の renderFigure、数は ../model.mjs から作る。
// seek(t) は t だけから1枚の絵を描き直す（前の絵・呼んだ順番・壁時計・fps に左右されない）。
// 書き出し（window.__MOTION_RENDER__ または ?render）ではタイマーも操作欄も使わない。

import {createBucket, request, advance} from '../model.mjs';
import {renderFigure, displayState} from '../figure.mjs';

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
const C = {paper: '#f2eee3', card: '#f7f4ec', ink: '#25241f', muted: '#6b665d', line: '#d6cfc0', accent: '#a54528', brass: '#d9b878', brassEdge: '#5a4316'};

// ---- 台本：モデルへの操作と時刻 ----
const EVENTS = [
  ...[2.0, 2.65, 3.3, 3.95, 4.6, 5.25, 5.9, 6.55].map((at) => ({at, op: 'request', dur: 0.62})),
  {at: 8.4, op: 'request', dur: 1.2},
  {at: 10.6, op: 'advance', dur: 2.6},
  {at: 14.0, op: 'request', dur: 0.8},
  {at: 15.0, op: 'request', dur: 0.8},
  {at: 16.8, op: 'request', dur: 1.2},
];
const BEATS = [
  {from: 0, to: 2, label: '満タン：トークン8枚'},
  {from: 2, to: 8.2, label: '8件まとめて → 8件とも通過'},
  {from: 8.2, to: 10.4, label: '9件目：0枚なので拒否'},
  {from: 10.4, to: 13.6, label: '1秒たつと 2枚だけ補充'},
  {from: 13.6, to: 16.6, label: '補充した2枚で 2件通過'},
  {from: 16.6, to: 19, label: '次の1件は また拒否'},
  {from: 19, to: 24, label: '一度に最大8件・その後は毎秒2件'},
];

const STATES = [];
{
  let state = createBucket();
  for (const event of EVENTS) {
    state = event.op === 'advance' ? advance(state, 1) : request(state);
    STATES.push(state);
  }
}

function frameAt(t) {
  let index = -1;
  for (let i = 0; i < EVENTS.length; i++) if (EVENTS[i].at <= t) index = i;
  if (index < 0) return {state: {...createBucket(), progress: 1}, index};
  const event = EVENTS[index];
  return {state: {...STATES[index], progress: Math.min(1, (t - event.at) / event.dur)}, index};
}

const beatAt = (t) => BEATS.findIndex((beat, i) => t >= beat.from && (t < beat.to || i === BEATS.length - 1));

// ---- 図の画像（同じ renderFigure の単体SVG） ----
let figureCss = '';

async function figureImage(state, w, h) {
  const svg = renderFigure(state, {width: Math.round(w), height: Math.round(h), standalone: true, css: figureCss, className: 'yb-film'});
  const url = URL.createObjectURL(new Blob([svg], {type: 'image/svg+xml'}));
  try {
    const image = new Image();
    image.decoding = 'sync';
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ---- 描画の部品 ----
const font = (size, weight = 400, family = JP) => `${weight} ${size}px ${family}`;

function fitFont(ctx, text, maxWidth, size, weight, min = 18) {
  let current = size;
  ctx.font = font(current, weight);
  while (current > min && ctx.measureText(text).width > maxWidth) {
    current -= 1;
    ctx.font = font(current, weight);
  }
  return current;
}

function box(ctx, x, y, w, h, fill, stroke, lineWidth = 2) {
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

function tokenRow(ctx, x, y, size, gap, count) {
  for (let i = 0; i < 8; i++) {
    const left = x + i * (size + gap);
    if (i < count) box(ctx, left, y, size, size, C.brass, C.brassEdge, 2);
    else {
      ctx.setLineDash([4, 4]);
      box(ctx, left, y, size, size, null, '#b0a999', 2);
      ctx.setLineDash([]);
    }
  }
}

function counters(ctx, x, y, w, shown, scale = 1) {
  const third = (w - 24) / 3;
  const h = 118 * scale;
  const items = [
    {label: '残りトークン', value: `${shown.tokens}`, unit: '/8'},
    {label: '許可', value: `${shown.accepted}`, unit: '件'},
    {label: '拒否', value: `${shown.refused}`, unit: '件', alert: shown.refused > 0},
  ];
  items.forEach((item, i) => {
    const left = x + i * (third + 12);
    box(ctx, left, y, third, h, C.card, null);
    ctx.fillStyle = item.alert ? C.accent : C.ink;
    ctx.fillRect(left, y, third, 4);
    ctx.fillStyle = C.muted;
    ctx.font = font(22 * scale, 600);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(item.label, left + 14, y + 36 * scale);
    ctx.fillStyle = item.alert ? C.accent : C.ink;
    ctx.font = font(52 * scale, 700, MONO);
    ctx.fillText(item.value, left + 14, y + 96 * scale);
    const valueWidth = ctx.measureText(item.value).width;
    ctx.fillStyle = C.muted;
    ctx.font = font(24 * scale, 600);
    ctx.fillText(item.unit, left + 20 + valueWidth, y + 96 * scale);
  });
}

function chips(ctx, x, y, size, gap, t) {
  let n = 0;
  EVENTS.forEach((event, i) => {
    if (event.op !== 'request') return;
    const left = x + n * (size + gap);
    n += 1;
    if (event.at > t) {
      ctx.setLineDash([3, 4]);
      box(ctx, left, y, size, size, null, C.line, 2);
      ctx.setLineDash([]);
      return;
    }
    const refused = STATES[i].last.kind === 'refuse';
    box(ctx, left, y, size, size, refused ? C.paper : C.ink, refused ? C.accent : C.ink, refused ? 3 : 2);
    ctx.fillStyle = refused ? C.accent : C.paper;
    ctx.font = font(size * 0.46, 700, MONO);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(refused ? '×' : String(n), left + size / 2, y + size / 2 + 1);
  });
  ctx.textBaseline = 'alphabetic';
}

function timeline(ctx, x, y, w, t) {
  const at = (sec) => x + (sec / FILM.duration) * w;
  box(ctx, x, y, w, 8, C.line, null);
  box(ctx, x, y, at(t) - x, 8, C.ink, null);
  BEATS.forEach((beat) => {
    ctx.fillStyle = C.paper;
    ctx.fillRect(at(beat.from) - 1, y - 2, 2, 12);
  });
  EVENTS.forEach((event, i) => {
    const refused = STATES[i].last.kind === 'refuse';
    ctx.fillStyle = event.at <= t ? (refused ? C.accent : event.op === 'advance' ? '#3f7a78' : C.ink) : '#b0a999';
    ctx.beginPath();
    ctx.arc(at(event.at), y + 22, event.op === 'advance' ? 6 : 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

function legend(ctx, x, y, scale) {
  const rows = [
    ['brass', '真鍮のトークン＝あと何件通せるか'],
    ['ink', '押し棒＝リクエスト1件'],
    ['accent', '赤い旗＝拒否'],
  ];
  rows.forEach(([kind, label], i) => {
    const top = y + i * 34 * scale;
    if (kind === 'brass') box(ctx, x, top - 14 * scale, 22 * scale, 14 * scale, C.brass, C.brassEdge, 2);
    if (kind === 'ink') box(ctx, x, top - 14 * scale, 22 * scale, 14 * scale, '#fffdf7', C.ink, 2.5);
    if (kind === 'accent') box(ctx, x, top - 14 * scale, 22 * scale, 14 * scale, C.accent, '#6e2a16', 2);
    ctx.fillStyle = C.ink;
    ctx.font = font(21 * scale, 600);
    ctx.textAlign = 'left';
    ctx.fillText(label, x + 34 * scale, top);
  });
}

function drawPortrait(ctx, t, frame, image, fig) {
  const shown = displayState(frame.state);
  ctx.fillStyle = C.muted;
  ctx.font = font(24, 600);
  ctx.textAlign = 'left';
  ctx.fillText('API制限の説明モデル', 40, 60);
  ctx.fillStyle = C.ink;
  ctx.font = font(46, 800);
  ctx.fillText('トークンバケット', 40, 112);
  ctx.fillStyle = C.muted;
  ctx.font = font(24, 600, MONO);
  ctx.textAlign = 'right';
  ctx.fillText(`モデル時刻 ${shown.seconds}秒`, 680, 112);

  ctx.drawImage(image, fig.x, fig.y, fig.w, fig.h);

  const beat = beatAt(t);
  ctx.textAlign = 'center';
  ctx.fillStyle = C.muted;
  ctx.font = font(22, 700, MONO);
  ctx.fillText(`${beat + 1} / ${BEATS.length}`, 360, 868);
  ctx.fillStyle = beat === 2 || beat === 5 ? C.accent : C.ink;
  const size = fitFont(ctx, BEATS[beat].label, 660, 42, 800);
  ctx.font = font(size, 800);
  ctx.fillText(BEATS[beat].label, 360, 918);

  counters(ctx, 40, 952, 640, shown);
  tokenRow(ctx, 40, 1088, 34, 8, shown.tokens);
  ctx.fillStyle = C.muted;
  ctx.font = font(20, 600);
  ctx.textAlign = 'left';
  ctx.fillText('筒の中', 384, 1112);
  chips(ctx, 40, 1140, 44, 10.6, t);
  timeline(ctx, 40, 1200, 640, t);
  ctx.fillStyle = C.muted;
  ctx.font = font(21, 600);
  ctx.textAlign = 'center';
  ctx.fillText('説明用モデル・実際のAPIには接続しません', 360, 1262);
}

function drawWide(ctx, t, frame, image, fig) {
  const shown = displayState(frame.state);
  ctx.drawImage(image, fig.x, fig.y, fig.w, fig.h);
  const x = 832;
  ctx.textAlign = 'left';
  ctx.fillStyle = C.muted;
  ctx.font = font(20, 600);
  ctx.fillText('API制限の説明モデル', x, 58);
  ctx.fillStyle = C.ink;
  ctx.font = font(38, 800);
  ctx.fillText('トークンバケット', x, 102);
  ctx.fillStyle = C.muted;
  ctx.font = font(20, 600, MONO);
  ctx.fillText(`モデル時刻 ${shown.seconds}秒`, x, 136);

  const beat = beatAt(t);
  ctx.fillStyle = C.muted;
  ctx.font = font(18, 700, MONO);
  ctx.fillText(`${beat + 1} / ${BEATS.length}`, x, 186);
  ctx.fillStyle = beat === 2 || beat === 5 ? C.accent : C.ink;
  const size = fitFont(ctx, BEATS[beat].label, 420, 32, 800);
  ctx.font = font(size, 800);
  ctx.fillText(BEATS[beat].label, x, 226);

  counters(ctx, x, 258, 416, shown, 0.8);
  tokenRow(ctx, x, 370, 26, 6, shown.tokens);
  chips(ctx, x, 420, 32, 6.6, t);
  timeline(ctx, x, 480, 416, t);
  legend(ctx, x, 560, 0.85);
  ctx.fillStyle = C.muted;
  ctx.font = font(18, 600);
  ctx.fillText('説明用モデル・実際のAPIには接続しません', x, 690);
}

// ---- 1枚を描く ----
const canvas = document.getElementById('film');
let ticket = 0;

function layoutOf() {
  const wide = width > height;
  const [bw, bh] = wide ? BASE.wide : BASE.portrait;
  const scale = Math.min(width / bw, height / bh);
  const offsetX = (width - bw * scale) / 2;
  const offsetY = (height - bh * scale) / 2;
  const fig = wide ? {x: 10, y: 30, w: 800, h: 660} : {x: 10, y: 136, w: 700, h: 700};
  return {wide, scale, offsetX, offsetY, fig};
}

async function paint(t) {
  const mine = ++ticket;
  const frame = frameAt(t);
  const layout = layoutOf();
  const image = await figureImage(frame.state, layout.fig.w * layout.scale, layout.fig.h * layout.scale);
  if (mine !== ticket) return;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(layout.scale, 0, 0, layout.scale, layout.offsetX, layout.offsetY);
  ctx.lineJoin = 'round';
  if (layout.wide) drawWide(ctx, t, frame, image, layout.fig);
  else drawPortrait(ctx, t, frame, image, layout.fig);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

const clampTime = (value) => Math.min(FILM.duration, Math.max(0, Number(value) || 0));

window.motionReady = (async () => {
  if (document.fonts && document.fonts.ready) await document.fonts.ready;
  const response = await fetch('../figure.css', {cache: 'no-store'});
  if (!response.ok) throw new Error(`figure.css を読めません（${response.status}）`);
  figureCss = await response.text();
})();

window.seek = async (seconds) => {
  await window.motionReady;
  const t = clampTime(seconds);
  await paint(t);
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
    status.textContent = `準備完了：${width}×${height}・${fps}fps・${FILM.duration}秒・無音`;
    [play, rewind, time, ...jumps].forEach((control) => { control.disabled = false; });
    show(current);
  }, (error) => {
    status.dataset.state = 'error';
    status.textContent = `描画できません：${error && error.message ? error.message : error}`;
  });
}
