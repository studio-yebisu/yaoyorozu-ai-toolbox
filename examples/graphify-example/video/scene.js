// 無音24秒の解説動画。ノード・エッジ・影響の深さは保存結果（../outputs/）から読み、
// 配置はページと同じ ../graph-data.mjs の LAYOUTS を使う。Graphify はここでは動かさない。
// seek(t) は t だけから1枚の絵を描き直す。書き出し時はタイマーも操作欄も使わない。

import {loadSaved, LAYOUTS, NODE_TEXT, EXPECTED, edgePoints} from '../graph-data.mjs';

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
const C = {paper: '#f2eee3', card: '#f7f4ec', white: '#fffdf7', ink: '#25241f', muted: '#6b665d', line: '#d6cfc0', accent: '#a54528', accentSoft: '#f6e6de', teal: '#3f7a78', tealSoft: '#e3eeec'};

const APPEAR = {
  shipping_fee: 0.6,
  checkout_total: 3.0,
  delivery_estimate: 3.6,
  'shipping-policy.md': 8.0,
  'checkout-spec.md': 9.0,
  'estimate-spec.md': 9.6,
};
const GROW = 1.2;
const STEPS = [
  {from: 0, title: '起点：shipping_fee', sub: '送料を決める関数。ここを変えたい'},
  {from: 3, title: 'コードの呼び出し：独自AST', sub: 'Python標準の ast で読んだ2本（実線）'},
  {from: 8, title: '仕様書との対応：人が手で記入', sub: '自動抽出ではない3本（点線・「手動」）'},
  {from: 13, title: '逆向きにたどる：公式 affected.py', sub: '深さ1で3件、深さ2で2件'},
  {from: 19, title: '残るファイル', sub: 'CLI・tree-sitter・LLM抽出・MCPは未実行'},
];
const FILES = [
  ['outputs/result.json', '影響5件・範囲・実行結果'],
  ['outputs/graph.json', '6ノード・5エッジ'],
  ['outputs/affected.txt', 'format_affected の出力'],
  ['run.py', '独自AST・手動の対応表'],
  ['fixture/', '架空のコード3・仕様書3'],
  ['vendor/graphify/', 'affected.py・LICENSE 2種'],
];

let data = null;
let travel = [];

const clamp01 = (value) => Math.max(0, Math.min(1, value));
const ease = (value) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};
const font = (size, weight = 400, family = JP) => `${weight} ${size}px ${family}`;

function fitFont(ctx, text, maxWidth, size, weight, family = JP, min = 12) {
  let current = size;
  ctx.font = font(current, weight, family);
  while (current > min && ctx.measureText(text).width > maxWidth) {
    current -= 0.5;
    ctx.font = font(current, weight, family);
  }
  return current;
}

// 逆向き探索のアニメーション：保存結果の hits の順と深さだけで時刻を決める
function planTravel() {
  const counters = {1: 0, 2: 0, 3: 0};
  travel = data.result.hits.map((hit) => {
    const edge = data.graph.edges.find((item) => item.source === hit.node_id && item.relation === hit.via_relation && item.source_file === hit.via_file && String(item.source_location) === String(hit.via_location));
    if (!edge) throw new Error(`${hit.node_id} の根拠のエッジが graph.json にない`);
    const order = counters[hit.depth]++;
    const start = (hit.depth === 1 ? 13.3 : 15.9) + order * 0.5;
    return {hit, edge, start, arrive: start + 1.0};
  });
}

const stepAt = (t) => STEPS.reduce((found, step, index) => (t >= step.from ? index : found), 0);

function layoutOf() {
  const wide = width > height;
  const [bw, bh] = wide ? BASE.wide : BASE.portrait;
  const scale = Math.min(width / bw, height / bh);
  return {
    wide,
    scale,
    offsetX: (width - bw * scale) / 2,
    offsetY: (height - bh * scale) / 2,
    graph: wide
      ? {source: LAYOUTS.wide, k: 1.1, x: 18, y: 150, box: {w: 188, h: 70}, id: 19, gloss: 15}
      : {source: LAYOUTS.tall, k: 1.5, x: 90, y: 168, box: {w: 238, h: 88}, id: 22, gloss: 18},
  };
}

function place(graph, id) {
  const [x, y] = graph.source.pos[id];
  return [graph.x + x * graph.k, graph.y + y * graph.k];
}

function arrow(ctx, from, to, color, size) {
  const angle = Math.atan2(to[1] - from[1], to[0] - from[0]);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(to[0], to[1]);
  ctx.lineTo(to[0] - size * Math.cos(angle - 0.42), to[1] - size * Math.sin(angle - 0.42));
  ctx.lineTo(to[0] - size * Math.cos(angle + 0.42), to[1] - size * Math.sin(angle + 0.42));
  ctx.closePath();
  ctx.fill();
}

function drawEdges(ctx, t, graph) {
  for (const edge of data.graph.edges) {
    const start = APPEAR[edge.source] + 0.7;
    const grow = ease((t - start) / GROW);
    if (grow <= 0) continue;
    const [a, b] = edgePoints(place(graph, edge.source), place(graph, edge.target), {w: graph.box.w + 14, h: graph.box.h + 14});
    const end = [a[0] + (b[0] - a[0]) * grow, a[1] + (b[1] - a[1]) * grow];
    const call = edge.relation === 'calls';
    ctx.strokeStyle = call ? C.ink : C.teal;
    ctx.lineWidth = call ? 4 : 3.4;
    ctx.setLineDash(call ? [] : [11, 8]);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(end[0], end[1]);
    ctx.stroke();
    ctx.setLineDash([]);
    if (grow > 0.98) arrow(ctx, a, b, call ? C.ink : C.teal, 16);
  }
}

function drawPulses(ctx, t, graph) {
  for (const item of travel) {
    const p = (t - item.start) / (item.arrive - item.start);
    if (p <= 0 || p >= 1.25) continue;
    const [a, b] = edgePoints(place(graph, item.edge.source), place(graph, item.edge.target), {w: graph.box.w + 14, h: graph.box.h + 14});
    const q = ease(Math.min(1, p));
    // 逆向き：呼ばれる側（target）から、呼ぶ側・参照する側（source）へ
    const x = b[0] + (a[0] - b[0]) * q;
    const y = b[1] + (a[1] - b[1]) * q;
    const fade = p > 1 ? 1 - (p - 1) / 0.25 : 1;
    ctx.globalAlpha = fade;
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(b[0], b[1]);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.fillStyle = C.accent;
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function tag(ctx, x, y, text, fill, size) {
  ctx.font = font(size, 700);
  const w = ctx.measureText(text).width + size * 0.9;
  const h = size * 1.5;
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + size * 0.45, y + h / 2 + 1);
  ctx.textBaseline = 'alphabetic';
  return w;
}

function drawNodes(ctx, t, graph) {
  for (const node of data.graph.nodes) {
    const appear = ease((t - APPEAR[node.id]) / 0.6);
    if (appear <= 0) continue;
    const [cx, cy] = place(graph, node.id);
    const {w, h} = graph.box;
    const x = cx - w / 2;
    const y = cy - h / 2 + (1 - appear) * 14;
    const doc = node.kind === 'document';
    const seed = node.id === EXPECTED.seed;
    const trip = travel.find((item) => item.hit.node_id === node.id);
    const reached = trip && t >= trip.arrive;
    ctx.globalAlpha = appear;

    let fill = C.white;
    let stroke = C.ink;
    if (doc) {
      fill = '#f9fbfa';
      stroke = C.teal;
    }
    if (reached) {
      fill = C.accentSoft;
      stroke = C.accent;
    }
    if (seed) {
      fill = C.ink;
      stroke = C.ink;
    }
    ctx.lineWidth = reached ? 4 : 2.6;
    ctx.strokeStyle = stroke;
    ctx.fillStyle = fill;
    if (doc) {
      const fold = 18;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + w - fold, y);
      ctx.lineTo(x + w, y + fold);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x, y + h);
      ctx.closePath();
      ctx.fill();
      ctx.setLineDash([9, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = C.teal;
      ctx.beginPath();
      ctx.moveTo(x + w - fold, y);
      ctx.lineTo(x + w - fold, y + fold);
      ctx.lineTo(x + w, y + fold);
      ctx.stroke();
    } else {
      roundRect(ctx, x, y, w, h, 8);
      ctx.fill();
      ctx.stroke();
    }

    const idSize = fitFont(ctx, node.id, w - 20, graph.id, 700, MONO);
    ctx.font = font(idSize, 700, MONO);
    ctx.fillStyle = seed ? C.paper : C.ink;
    ctx.textAlign = 'center';
    ctx.fillText(node.id, cx, y + h / 2 - 2);
    ctx.font = font(graph.gloss, 600);
    ctx.fillStyle = seed ? '#d9d3c5' : C.muted;
    ctx.fillText(NODE_TEXT[node.id].gloss, cx, y + h / 2 + graph.gloss + 4);

    if (doc) tag(ctx, x + 8, y - graph.gloss * 0.8, '手動', C.teal, graph.gloss * 0.85);
    if (seed) tag(ctx, x + w - graph.gloss * 3.2, y - graph.gloss * 0.8, '起点', C.accent, graph.gloss * 0.85);
    if (reached) {
      const pop = ease((t - trip.arrive) / 0.3);
      ctx.globalAlpha = appear * pop;
      tag(ctx, x + w - graph.gloss * 3.9, y + h - graph.gloss * 0.6, `深さ${trip.hit.depth}`, C.accent, graph.gloss * 0.85);
    }
    ctx.globalAlpha = 1;
  }
}

function countAt(t) {
  return travel.filter((item) => t >= item.arrive).length;
}

function counter(ctx, x, y, t, scale) {
  const count = countAt(t);
  ctx.textAlign = 'left';
  ctx.fillStyle = C.muted;
  ctx.font = font(22 * scale, 700);
  ctx.fillText('影響', x, y + 46 * scale);
  ctx.fillStyle = C.accent;
  ctx.font = font(72 * scale, 700, MONO);
  ctx.fillText(String(count), x + 56 * scale, y + 62 * scale);
  ctx.fillStyle = C.ink;
  ctx.font = font(26 * scale, 700);
  ctx.fillText(`／ グラフ ${data.result.node_count}ノード・${data.result.edge_count}エッジ`, x + 112 * scale, y + 54 * scale);
  ctx.fillStyle = C.muted;
  ctx.font = font(19 * scale, 600);
  ctx.fillText(`起点を除く・深さ${data.result.depth}まで`, x + 112 * scale, y + 84 * scale);
}

function files(ctx, x, y, w, t, columns, scale) {
  const gap = 12 * scale;
  const cardW = (w - gap * (columns - 1)) / columns;
  const cardH = 70 * scale;
  FILES.forEach(([name, note], index) => {
    const show = ease((t - 19.2 - index * 0.35) / 0.5);
    if (show <= 0) return;
    const col = index % columns;
    const row = Math.floor(index / columns);
    const left = x + col * (cardW + gap);
    const top = y + row * (cardH + gap) + (1 - show) * 12;
    ctx.globalAlpha = show;
    ctx.fillStyle = C.white;
    ctx.fillRect(left, top, cardW, cardH);
    ctx.fillStyle = C.ink;
    ctx.fillRect(left, top, 5 * scale, cardH);
    ctx.textAlign = 'left';
    const nameSize = fitFont(ctx, name, cardW - 24 * scale, 21 * scale, 700, MONO);
    ctx.font = font(nameSize, 700, MONO);
    ctx.fillText(name, left + 16 * scale, top + 30 * scale);
    ctx.fillStyle = C.muted;
    const noteSize = fitFont(ctx, note, cardW - 24 * scale, 17 * scale, 600);
    ctx.font = font(noteSize, 600);
    ctx.fillText(note, left + 16 * scale, top + 56 * scale);
    ctx.globalAlpha = 1;
  });
}

function legend(ctx, x, y, scale) {
  ctx.lineWidth = 4;
  ctx.strokeStyle = C.ink;
  ctx.beginPath();
  ctx.moveTo(x, y - 7 * scale);
  ctx.lineTo(x + 46 * scale, y - 7 * scale);
  ctx.stroke();
  ctx.fillStyle = C.ink;
  ctx.font = font(19 * scale, 600);
  ctx.textAlign = 'left';
  ctx.fillText('呼び出し（独自AST）', x + 56 * scale, y);
  const second = x + 56 * scale + ctx.measureText('呼び出し（独自AST）').width + 26 * scale;
  ctx.strokeStyle = C.teal;
  ctx.lineWidth = 3.4;
  ctx.setLineDash([11, 8]);
  ctx.beginPath();
  ctx.moveTo(second, y - 7 * scale);
  ctx.lineTo(second + 46 * scale, y - 7 * scale);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillText('参照（手動で対応）', second + 56 * scale, y);
}

function header(ctx, x, y, scale, maxWidth) {
  ctx.textAlign = 'left';
  ctx.fillStyle = C.muted;
  ctx.font = font(22 * scale, 600);
  ctx.fillText('Graphify の影響探索（保存結果）', x, y);
  ctx.fillStyle = C.ink;
  const size = fitFont(ctx, '送料の関数を変えると、どこに響く？', maxWidth, 40 * scale, 800);
  ctx.font = font(size, 800);
  ctx.fillText('送料の関数を変えると、どこに響く？', x, y + 50 * scale);
}

// 返り値は書いた最後の行の下端
function stepBlock(ctx, x, y, t, scale, maxWidth, split = false) {
  const index = stepAt(t);
  const step = STEPS[index];
  ctx.textAlign = 'left';
  ctx.fillStyle = C.muted;
  ctx.font = font(20 * scale, 700, MONO);
  ctx.fillText(`${index + 1} / ${STEPS.length}`, x, y);
  ctx.fillStyle = index === 2 ? C.teal : index === 3 ? C.accent : C.ink;
  const lines = split && step.title.includes('：') ? [`${step.title.split('：')[0]}：`, step.title.split('：')[1]] : [step.title];
  let bottom = y;
  lines.forEach((line, i) => {
    const size = fitFont(ctx, line, maxWidth, 34 * scale, 800);
    ctx.font = font(size, 800);
    bottom = y + (44 + i * 40) * scale;
    ctx.fillText(line, x, bottom);
  });
  ctx.fillStyle = C.muted;
  const sub = fitFont(ctx, step.sub, maxWidth, 22 * scale, 600);
  ctx.font = font(sub, 600);
  bottom += 34 * scale;
  ctx.fillText(step.sub, x, bottom);
  return bottom;
}

function badge(ctx, x, y, t, scale) {
  const show = ease((t - 13) / 0.5);
  if (show <= 0) return;
  ctx.globalAlpha = show;
  tag(ctx, x, y, '影響探索は公式コードを実行', C.ink, 19 * scale);
  ctx.globalAlpha = 1;
}

function drawPortrait(ctx, t, layout) {
  header(ctx, 40, 58, 1, 640);
  badge(ctx, 40, 128, t, 1);
  drawEdges(ctx, t, layout.graph);
  drawPulses(ctx, t, layout.graph);
  drawNodes(ctx, t, layout.graph);
  if (t < 19) {
    stepBlock(ctx, 40, 1012, t, 1, 640);
    if (t >= 13) counter(ctx, 40, 1104, t, 1);
  } else {
    stepBlock(ctx, 40, 990, t, 1, 640);
    files(ctx, 40, 1090, 640, t, 3, 0.8);
  }
  legend(ctx, 40, 1262, 1);
}

function drawWide(ctx, t, layout) {
  header(ctx, 40, 56, 0.95, 780);
  badge(ctx, 40, 122, t, 0.9);
  drawEdges(ctx, t, layout.graph);
  drawPulses(ctx, t, layout.graph);
  drawNodes(ctx, t, layout.graph);
  const x = 890;
  stepBlock(ctx, x, 180, t, 0.9, 360, true);
  if (t >= 13 && t < 19) counter(ctx, x, 316, t, 0.72);
  if (t >= 19) files(ctx, x, 316, 360, t, 1, 0.72);
  legend(ctx, 40, 690, 0.9);
}

const canvas = document.getElementById('film');

async function paint(t) {
  const layout = layoutOf();
  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(layout.scale, 0, 0, layout.scale, layout.offsetX, layout.offsetY);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (layout.wide) drawWide(ctx, t, layout);
  else drawPortrait(ctx, t, layout);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

const clampTime = (value) => Math.min(FILM.duration, Math.max(0, Number(value) || 0));

window.motionReady = (async () => {
  if (document.fonts && document.fonts.ready) await document.fonts.ready;
  data = await loadSaved('..');
  planTravel();
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
    status.textContent = `保存結果を確認：${data.result.node_count}ノード・${data.result.edge_count}エッジ・影響${data.result.hits.length}件｜${width}×${height}・${fps}fps・${FILM.duration}秒・無音`;
    [play, rewind, time, ...jumps].forEach((control) => { control.disabled = false; });
    show(current);
  }, (error) => {
    status.dataset.state = 'error';
    status.textContent = `描画できません：${error && error.message ? error.message : error}`;
  });
}
