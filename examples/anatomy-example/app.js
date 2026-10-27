// ボタン → model.mjs の状態 → figure.mjs の図・数字・説明文。
// どの表示も同じ状態（displayState）から作る。ネットワークには接続しない。

import {createBucket, request, advance, readoutOf, captionOf} from './model.mjs';
import {renderFigure, displayState, TIMING, FIGURE} from './figure.mjs';

const stage = document.getElementById('stage');
const readout = document.querySelector('[data-readout]');
const caption = document.getElementById('caption');
const announce = document.getElementById('announce');
const pending = document.getElementById('pending');
const meter = Array.from(document.querySelectorAll('#meter li'));
const counts = {
  tokens: document.getElementById('count-tokens'),
  accepted: document.getElementById('count-accepted'),
  refused: document.getElementById('count-refused'),
  seconds: document.getElementById('count-seconds'),
};
const buttons = {
  one: document.getElementById('send-one'),
  tick: document.getElementById('tick'),
  eight: document.getElementById('send-eight'),
  reset: document.getElementById('reset'),
};
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
const MAX_QUEUE = 32;

let state = createBucket();
let progress = 1;
let duration = 0;
let started = 0;
let frame = 0;
let queue = [];
let lastText = '';

const setText = (node, text) => {
  if (node.textContent !== text) node.textContent = text;
};

function draw() {
  const frameState = {...state, progress};
  stage.innerHTML = renderFigure(frameState, FIGURE);
  const shown = displayState(frameState);
  setText(readout, readoutOf(shown));
  setText(counts.tokens, String(shown.tokens));
  setText(counts.accepted, String(shown.accepted));
  setText(counts.refused, String(shown.refused));
  setText(counts.seconds, String(shown.seconds));
  meter.forEach((item, index) => item.classList.toggle('on', index < shown.tokens));
  const text = shown === frameState ? captionOf(state) : '1秒の経過を待っています。台車がトークンを運んでいます。';
  if (text !== lastText) {
    lastText = text;
    setText(caption, text);
  }
  setText(pending, queue.length ? `このあと ${queue.length} 件` : '');
}

function apply(op) {
  state = op === 'advance' ? advance(state, 1) : request(state);
}

function durationOf(last) {
  if (reduce.matches) return 0;
  if (last.kind === 'refill' && last.added === 0) return 0;
  return TIMING[last.kind] || 0;
}

function next() {
  if (!queue.length) {
    frame = 0;
    draw();
    announce.textContent = `${captionOf(state)}（${readoutOf(state)}）`;
    return;
  }
  apply(queue.shift());
  duration = durationOf(state.last);
  if (!duration) {
    progress = 1;
    draw();
    next();
    return;
  }
  progress = 0;
  started = performance.now();
  draw();
  frame = requestAnimationFrame(tick);
}

function tick(now) {
  progress = Math.min(1, (now - started) / 1000 / duration);
  draw();
  if (progress < 1) frame = requestAnimationFrame(tick);
  else next();
}

function enqueue(ops) {
  const room = MAX_QUEUE - queue.length;
  queue.push(...ops.slice(0, Math.max(0, room)));
  if (!frame) next();
  else draw();
}

buttons.one.addEventListener('click', () => enqueue(['request']));
buttons.tick.addEventListener('click', () => enqueue(['advance']));
buttons.eight.addEventListener('click', () => enqueue(Array.from({length: 8}, () => 'request')));
buttons.reset.addEventListener('click', () => {
  cancelAnimationFrame(frame);
  frame = 0;
  queue = [];
  state = createBucket();
  progress = 1;
  draw();
  announce.textContent = 'リセットしました。トークンは8枚、許可0件、拒否0件、0秒です。';
});

// 動きを減らす設定に切り替わったら、途中の動きを終わらせる
reduce.addEventListener('change', () => {
  if (reduce.matches && frame) {
    cancelAnimationFrame(frame);
    progress = 1;
    while (queue.length) apply(queue.shift());
    frame = 0;
    draw();
  }
});

draw();
