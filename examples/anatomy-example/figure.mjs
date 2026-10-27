// トークンバケットの卓上装置（図の幾何モジュール）。
// 上流 Anatomy の kit/iso-kit.mjs だけで描く。ページ・動画・build.mjs が同じ関数を使う。
// renderFigure(state, {width, height, ...}) は state（model.mjs の状態 + progress）から SVG 文字列を返す。
// 世界座標は約1単位=図の1px、x・y が台の上、z が上。部品表と座標は README.md にある。

import * as k from './vendor/anatomy/kit/iso-kit.mjs';

export const FIGURE = Object.freeze({width: 600, height: 470});
// 動きの長さ（秒）。補充は「1秒の経過」を表し、着地した時点でモデルの値が変わる。
export const TIMING = Object.freeze({accept: 0.75, refuse: 0.7, refill: 1.8});
export const REFILL_LAND = 0.58;

const AZIMUTH = 38;

// 台
const PLATE = {x: -74, y: -96, w: 166, d: 132, r: 6};
const PLATE_H = 9;
const FOOT_H = 6;

// 収納筒（縦のマガジン）
const FLOOR = 12;          // 台座の上面＝筒の底
const HALF = 9;            // トークンの半幅（18角）
const TOKEN_H = 4;
const PITCH = 4.6;         // 積み重ねの間隔
const CAGE = 9.2;          // 角アングルの内面
const LEG = 1.4;           // アングルの厚さ
const SLOT_TOP = 17;       // ±x側のアングルはここから上。下に1枚分の通り口が残る
const MAG_TOP = 58;
const COLLAR_TOP = 61;
const PED = {x: -16, y: -16, w: 32, d: 32, r: 2};

// 補充側
const HOPPER = {x: -13, y: -60, w: 26, d: 26, r: 2};
const HOPPER_TOP = 52;
const RIM = {x: -14.2, y: -61.2, w: 28.4, d: 28.4, r: 2.4};
const RIM_TOP = 55;
const PARK = -47;          // 台車の待機位置（補給箱の上）
const DROP = 0;            // 筒の真上
const CUP_BOTTOM = 65;
const CUP_FLOOR = 66.4;    // 台車の受け皿に乗るトークンの下面

// 押し出し側
const REST = -14.4;        // 押し板の待機位置
const PUSH = 8.8;          // 押し切った位置
const HEAD_W = 2.2;
const CHUTE = {x: 16, y: -10, w: 30, d: 20, r: 1};
const CHUTE_Z = 10.4;
const BIN = {x: 47, y: -14, w: 28, d: 28, r: 2};
const BIN_TOP = 10.4;
const BIN_X = 61;

const clamp01 = (value) => Math.max(0, Math.min(1, value));
const ease = (value) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};
const span = (p, from, to) => ease((p - from) / (to - from));
const lerp = (a, b, t) => a + (b - a) * t;
const plan = (x, y, w, d, r = 0.6) => ({x, y, w, d, r});

const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);

function slab(P, box, z, h, {tone = 'mid', steps = 3, bevel = 0, crease, lit, cls, inner} = {}) {
  return S(k.slabOf(box, z, h, P, steps, bevel), {tone, crease, lit, className: cls, inner});
}

function face(P, points) {
  return k.pathOf(points.map((point) => k.iso(point, P)), true);
}

const byDepth = (points, P) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

// ---- 静的な部品（投影ごとに一度だけ作る） ----

function base(P) {
  const at = (point) => k.iso(point, P);
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  const z0 = -PLATE_H - FOOT_H;
  for (const [x, y] of byDepth(k.corners(PLATE, 16), P)) {
    out.push(slab(P, plan(x - 7, y - 7, 14, 14, 2), z0, 1.6, {tone: 'lo'}));
    out.push(slab(P, plan(x - 5.2, y - 5.2, 10.4, 10.4, 1.6), z0 + 1.6, FOOT_H - 1.6));
  }
  out.push(slab(P, PLATE, -PLATE_H, PLATE_H, {steps: 8, bevel: 1.4}));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), {tone: 'lo'}));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(''), {tone: 'lo'}));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), {size: 0.5}));

  // 手前の定規（目盛りは帯の縁から生える）
  const strip = plan(-58, 22, 98, 7, 1);
  out.push(slab(P, strip, 0, 0.6, {tone: 'lo', crease: 'none'}));
  const ticks = k.topTicks(strip.x + 3, strip.x + strip.w - 3, 4, 5, strip.y, 0.6, [1.2, 2], P);
  out.push(L(ticks.minor, {tone: 'lo'}), L(ticks.major, {tone: 'mid'}));
  out.push(D([at([strip.x + 1.6, strip.y + 3.5, 0.6]), at([strip.x + strip.w - 1.6, strip.y + 3.5, 0.6])], {size: 0.45}));

  // 銘板（3本の罫は印字の代わり）
  const label = plan(48, 17, 34, 12, 1.5);
  out.push(slab(P, label, 0, 0.8, {tone: 'mid', steps: 4}));
  out.push(L(k.planOutline(k.insetPlan(label, 1.6), 0.8, P, 4), {tone: 'faint'}));
  out.push(L(k.lineOnTop([label.x + 5, label.y + 4], [label.x + 26, label.y + 4], 0.8, P), {tone: 'lo', free: true}));
  out.push(L(k.lineOnTop([label.x + 5, label.y + 6.4], [label.x + 21, label.y + 6.4], 0.8, P), {tone: 'lo', free: true}));
  out.push(L(k.lineOnTop([label.x + 5, label.y + 8.8], [label.x + 15, label.y + 8.8], 0.8, P), {tone: 'lo', free: true}));
  out.push(D([at([label.x + 2.6, label.y + 6, 0.8]), at([label.x + label.w - 2.6, label.y + 6, 0.8])], {size: 0.45}));
  return out.join('');
}

const COLUMN = plan(-40, -86, 12, 12, 1.5);
const FLANGE = plan(-43, -89, 18, 18, 2);

function gantryBack(P) {
  const at = (point) => k.iso(point, P);
  const out = [];
  out.push(slab(P, FLANGE, 0, 3, {steps: 4, bevel: 0.5}));
  out.push(D(k.corners(FLANGE, 2.6).map(([x, y]) => at([x, y, 3])), {size: 0.45}));
  out.push(slab(P, COLUMN, 3, 77, {steps: 4, bevel: 0.6, inner: L(k.sideSeam(COLUMN, 44, P, 4), {tone: 'faint'})}));
  out.push(slab(P, plan(-37, -74, 6, 12, 0.5), 68, 12, {bevel: 0.3}));
  return out.join('');
}

const BEAM = plan(-40, -86, 12, 100, 1.5);
const RAIL = plan(-36.5, -83, 5, 94, 0.8);

function beam(P) {
  const at = (point) => k.iso(point, P);
  const out = [];
  out.push(slab(P, BEAM, 80, 6, {steps: 4, bevel: 0.6}));
  out.push(slab(P, RAIL, 86, 2.4, {bevel: 0.3}));
  out.push(D([-78, -54, -30, -6].map((y) => at([-34, y, 88.4])), {size: 0.4}));
  out.push(slab(P, plan(-38, -86, 8, 3, 0.6), 86, 5, {bevel: 0.3}));
  return out.join('');
}

function frontStop(P) {
  return slab(P, plan(-38, 11, 8, 3, 0.6), 86, 5, {bevel: 0.3});
}

function hopper(P) {
  const at = (point) => k.iso(point, P);
  const out = [];
  out.push(slab(P, HOPPER, 0, HOPPER_TOP, {steps: 4, bevel: 0.8, inner: L(k.sideSeam(HOPPER, 14, P, 4), {tone: 'faint'})}));
  // 正面の覗き窓：中の在庫の縁が見える
  const y = HOPPER.y + HOPPER.d;
  const slot = face(P, [[-3.5, y, 18], [3.5, y, 18], [3.5, y, 44], [-3.5, y, 44]]);
  out.push(`<path class="yb-slot" d="${slot}"/>`);
  const edges = [];
  for (let z = 20.3; z < 43; z += PITCH) edges.push(k.segment([-3.5, y, z], [3.5, y, z], P));
  out.push(L(edges.join(''), {tone: 'lo'}));
  out.push(L(slot, {tone: 'lo'}));
  out.push(slab(P, RIM, HOPPER_TOP, RIM_TOP - HOPPER_TOP, {steps: 4, bevel: 0.6}));
  const opening = k.insetPlan(RIM, 4.4);
  out.push(`<path class="yb-cavity" d="${k.planOutline(opening, RIM_TOP, P, 4)}"/>`);
  out.push(slab(P, plan(-HALF, PARK - HALF, 18, 18, 1.2), RIM_TOP - 0.6, 0.6, {tone: 'hi', crease: 'lo', cls: 'yb-brass'}));
  out.push(L(k.planOutline(opening, RIM_TOP, P, 4), {tone: 'lo'}));
  out.push(D(k.corners(RIM, 2.2).map(([x, yy]) => at([x, yy, RIM_TOP])), {size: 0.45}));
  return out.join('');
}

const BODY = plan(-55.6, -6, 25.6, 12, 1.5);

function actuator(P) {
  const at = (point) => k.iso(point, P);
  const out = [];
  const bracket = plan(-58, -9, 30, 18, 1.5);
  out.push(slab(P, bracket, 0, 9, {steps: 4, bevel: 0.6}));
  out.push(D([at([-31, -7.6, 9]), at([-31, 7.6, 9]), at([-55, 7.6, 9])], {size: 0.45}));
  out.push(slab(P, plan(-58.6, -7, 3, 14, 1), 9, 11.4, {bevel: 0.4}));
  out.push(slab(P, BODY, 9, 10.4, {steps: 4, bevel: 0.6, inner: L(k.sideSeam(BODY, 14.2, P, 4), {tone: 'faint'})}));
  out.push(D([at([-50, 0, 19.4]), at([-36, 0, 19.4])], {size: 0.45}));
  out.push(slab(P, plan(-30, -4.5, 2.4, 9, 0.8), 10.6, 7.2, {bevel: 0.3}));
  return out.join('');
}

function pedestal(P) {
  const at = (point) => k.iso(point, P);
  const out = [];
  out.push(slab(P, PED, 0, FLOOR, {steps: 4, bevel: 0.8}));
  out.push(D(k.corners(PED, 2.8).map(([x, y]) => at([x, y, FLOOR])), {size: 0.45}));
  const y = PED.y + PED.d;
  const pane = face(P, [[-7, y, 2.6], [7, y, 2.6], [7, y, 9.6], [-7, y, 9.6]]);
  out.push(`<path class="yb-window" d="${pane}"/>`, L(pane, {tone: 'mid'}));
  return out.join('');
}

// 角アングル。leg X は ±x 面（下に通り口）、leg Y は ±y 面（全高）。
function legX(P, sx, sy) {
  const box = plan(sx > 0 ? CAGE : -CAGE - LEG, sy > 0 ? 4 : -CAGE - LEG, LEG, CAGE + LEG - 4, 0.3);
  return slab(P, box, SLOT_TOP, MAG_TOP - SLOT_TOP, {bevel: 0.2});
}

function legY(P, sx, sy) {
  const box = plan(sx > 0 ? 4 : -CAGE, sy > 0 ? CAGE : -CAGE - LEG, CAGE - 4, LEG, 0.3);
  return slab(P, box, FLOOR, MAG_TOP - FLOOR, {bevel: 0.2});
}

function cageBack(P) {
  return [
    legY(P, -1, -1), legX(P, -1, -1),
    legY(P, 1, -1),
    slab(P, plan(-CAGE - LEG, -CAGE - LEG, 2 * (CAGE + LEG), LEG, 0.3), MAG_TOP, COLLAR_TOP - MAG_TOP, {bevel: 0.2}),
    slab(P, plan(-CAGE - LEG, -CAGE, LEG, 2 * CAGE, 0.3), MAG_TOP, COLLAR_TOP - MAG_TOP, {bevel: 0.2}),
  ].join('');
}

function cageFront(P) {
  const at = (point) => k.iso(point, P);
  const c = CAGE + LEG / 2;
  return [
    legX(P, -1, 1), legY(P, -1, 1),
    legX(P, 1, -1),
    legY(P, 1, 1), legX(P, 1, 1),
    slab(P, plan(CAGE, -CAGE, LEG, 2 * CAGE, 0.3), MAG_TOP, COLLAR_TOP - MAG_TOP, {bevel: 0.2}),
    slab(P, plan(-CAGE - LEG, CAGE, 2 * (CAGE + LEG), LEG, 0.3), MAG_TOP, COLLAR_TOP - MAG_TOP, {bevel: 0.2}),
    D([[-c, -c], [c, -c], [-c, c], [c, c]].map(([x, y]) => at([x, y, COLLAR_TOP])), {size: 0.45}),
  ].join('');
}

function chute(P) {
  const at = (point) => k.iso(point, P);
  const out = [];
  out.push(slab(P, plan(24, -8, 5, 16), 0, CHUTE_Z, {bevel: 0.3}));
  out.push(slab(P, plan(38, -8, 5, 16), 0, CHUTE_Z, {bevel: 0.3}));
  out.push(slab(P, CHUTE, CHUTE_Z, FLOOR - CHUTE_Z, {bevel: 0.3}));
  out.push(slab(P, plan(16, -11.4, 30, LEG, 0.3), CHUTE_Z, 4, {bevel: 0.2}));
  out.push(D([at([44, -10.7, 14.4]), at([18, -10.7, 14.4])], {size: 0.4}));
  // 受け箱：上面の口の中に奥の内壁が見える
  out.push(slab(P, BIN, 0, BIN_TOP, {steps: 4, bevel: 0.8}));
  const open = k.insetPlan(BIN, 2.4);
  const mouth = k.planOutline(open, BIN_TOP, P, 4);
  const x0 = open.x, y0 = open.y, x1 = open.x + open.w, y1 = open.y + open.d;
  const wallX = face(P, [[x0, y0, BIN_TOP], [x0, y1, BIN_TOP], [x0, y1, 2], [x0, y0, 2]]);
  const wallY = face(P, [[x0, y0, BIN_TOP], [x1, y0, BIN_TOP], [x1, y0, 2], [x0, y0, 2]]);
  out.push(`<clipPath id="yb-bin-mouth"><path d="${mouth}"/></clipPath>`);
  out.push(`<g clip-path="url(#yb-bin-mouth)"><path class="yb-cavity" d="${mouth}"/><path class="yb-cavity-wall" d="${wallX}"/><path class="yb-cavity-wall" data-side="y" d="${wallY}"/></g>`);
  out.push(L(mouth, {tone: 'lo'}));
  out.push(D(k.corners(BIN, 1.2).map(([x, y]) => at([x, y, BIN_TOP])), {size: 0.45}));
  return out.join('');
}

function gateFrame(P) {
  const at = (point) => k.iso(point, P);
  return [
    slab(P, plan(10.6, -CAGE - LEG, 3, LEG, 0.3), FLOOR, SLOT_TOP - FLOOR, {bevel: 0.2}),
    slab(P, plan(10.6, -CAGE - LEG, 3, 2 * (CAGE + LEG), 0.4), SLOT_TOP, 3.4, {bevel: 0.3}),
    slab(P, plan(10.6, CAGE, 3, LEG, 0.3), FLOOR, SLOT_TOP - FLOOR, {bevel: 0.2}),
    D([at([12.1, -8.6, 20.4]), at([12.1, 8.6, 20.4])], {size: 0.45}),
    slab(P, plan(11.2, -6.4, 1.8, 2, 0.3), 20.4, 3.6, {bevel: 0.2}),
  ].join('');
}

function frontRail(P) {
  return slab(P, plan(16, 10, 30, LEG, 0.3), CHUTE_Z, 4, {bevel: 0.2});
}

// ---- 動く部品 ----

function token(P, cx, cy, z, {alpha = 1, spent = false} = {}) {
  const box = plan(cx - HALF, cy - HALF, 18, 18, 1.2);
  const top = z + TOKEN_H;
  const body = [
    S(k.slabOf(box, z, TOKEN_H, P, 3, 0.5), {tone: 'hi', crease: 'lo', className: spent ? 'yb-brass yb-spent' : 'yb-brass'}),
    L(k.planOutline(k.insetPlan(box, 3), top, P, 3), {tone: 'mid', className: 'yb-brass-line'}),
    D([k.iso([cx, cy, top], P)], {size: 0.6, tone: 'mid'}),
  ].join('');
  if (alpha >= 0.999) return body;
  if (alpha <= 0.01) return '';
  return `<g opacity="${alpha.toFixed(2)}">${body}</g>`;
}

function pusher(P, hx) {
  const rodLength = Math.max(0.4, hx - (-27.6));
  return [
    slab(P, plan(-27.6, -1.6, rodLength, 3.2, 0.6), 13, 2.2, {tone: 'hi', lit: true}),
    slab(P, plan(hx, -6, HEAD_W, 12, 0.6), 12.6, 3.2, {tone: 'hi', lit: true, bevel: 0.2}),
  ].join('');
}

function flag(P, up) {
  const height = lerp(1.4, 8.2, up);
  return slab(P, plan(11.2, -3.6, 1.8, 7.2, 0.4), 20.4, height, {tone: up > 0.5 ? 'hi' : 'mid', bevel: 0.2, cls: up > 0.02 ? 'yb-flag is-up' : 'yb-flag'});
}

function bushingBack(P, cy) {
  return slab(P, plan(-43, cy - 7, 3, 14, 0.6), 83, 5.4, {bevel: 0.2});
}

function carriage(P, cy, cupTokens) {
  const at = (point) => k.iso(point, P);
  const carPlate = plan(-43, cy - 9, 18, 18, 2);
  const out = [
    slab(P, plan(-28, cy - 7, 3, 14, 0.6), 83, 5.4, {bevel: 0.2}),
    slab(P, carPlate, 88.4, 3.6, {steps: 4, bevel: 0.5}),
    D(k.corners(carPlate, 2.6).map(([x, y]) => at([x, y, 92])), {size: 0.45}),
    slab(P, plan(-11, cy - 9.4, LEG, 18.8, 0.3), CUP_BOTTOM, 78.6 - CUP_BOTTOM, {bevel: 0.2}),
    slab(P, plan(-9.6, cy - 9.4, 1.8, 18.8, 0.3), CUP_BOTTOM, 1.4),
  ];
  for (const item of cupTokens) out.push(token(P, 0, cy, item.z, {alpha: item.alpha ?? 1}));
  out.push(
    slab(P, plan(7.8, cy - 9.4, 1.8, 18.8, 0.3), CUP_BOTTOM, 1.4),
    slab(P, plan(9.6, cy - 9.4, LEG, 18.8, 0.3), CUP_BOTTOM, 78.6 - CUP_BOTTOM, {bevel: 0.2}),
    slab(P, plan(-11, cy - 9.4, 22, 18.8, 1), 78.6, 1.4, {bevel: 0.3}),
    slab(P, plan(-3, cy - 3, 6, 6, 0.8), 80, 8.4, {bevel: 0.2}),
    slab(P, plan(-25, cy - 3, 29, 6, 1), 88.4, 3, {bevel: 0.3}),
    D([at([-20, cy, 91.4]), at([0, cy, 91.4])], {size: 0.45}),
  );
  return out.join('');
}

// ---- 状態から姿勢へ ----

// 表示用の状態。補充は「1秒の経過」なので、トークンが着地するまでは前の値を見せる。
export function displayState(state) {
  const p = clamp01(state.progress ?? 1);
  const last = state.last;
  if (last && last.kind === 'refill' && last.added > 0 && p < REFILL_LAND) return {...state, ...last.before};
  return state;
}

function cupSlots(count) {
  return Array.from({length: count}, (_, index) => ({z: CUP_FLOOR + index * PITCH}));
}

export function poseOf(state) {
  const p = clamp01(state.progress ?? 1);
  const last = state.last;
  const shown = displayState(state);
  const pose = {
    hx: REST,
    cy: PARK,
    stack: shown.tokens,
    lift: 0,
    spent: null,
    falling: [],
    cup: cupSlots(2),
    flag: last && last.kind === 'refuse' ? 1 : 0,
  };
  if (!last || p >= 1) return pose;

  if (last.kind === 'accept') {
    const out = p < 0.42;
    pose.hx = out ? lerp(REST, PUSH, span(p, 0, 0.42)) : lerp(PUSH, REST, span(p, 0.42, 0.8));
    let cx = out ? Math.max(0, pose.hx + HEAD_W + HALF) : lerp(PUSH + HEAD_W + HALF, BIN_X, span(p, 0.42, 0.78));
    let z = FLOOR;
    let alpha = 1;
    if (p > 0.78) {
      cx = BIN_X;
      z = lerp(FLOOR, BIN_TOP - 3, span(p, 0.78, 0.95));
      alpha = 1 - span(p, 0.8, 0.97);
    }
    pose.spent = {cx, z, alpha};
    pose.lift = p < 0.78 ? PITCH : PITCH * (1 - span(p, 0.78, 0.88));
  } else if (last.kind === 'refuse') {
    pose.hx = p < 0.5 ? lerp(REST, -3, span(p, 0, 0.5)) : lerp(-3, REST, span(p, 0.5, 1));
    pose.flag = span(p, 0.12, 0.4);
  } else if (last.kind === 'refill' && last.added > 0) {
    const added = Math.min(2, last.added);
    const before = last.before.tokens;
    if (p < 0.34) pose.cy = lerp(PARK, DROP, span(p, 0, 0.34));
    else if (p < 0.62) pose.cy = DROP;
    else pose.cy = lerp(DROP, PARK, span(p, 0.62, 0.9));

    const remain = 2 - added;
    if (p < 0.36) {
      pose.cup = cupSlots(2);
    } else {
      // 残った分は受け皿の下段へ降りる
      const settle = span(p, 0.4, 0.5);
      pose.cup = Array.from({length: remain}, (_, index) => ({z: CUP_FLOOR + (index + added) * PITCH - added * PITCH * settle}));
    }
    if (p >= 0.36 && p < REFILL_LAND) {
      const f = clamp01((p - 0.36) / (REFILL_LAND - 0.36));
      for (let index = 0; index < added; index++) {
        const start = CUP_FLOOR + index * PITCH;
        const target = FLOOR + (before + index) * PITCH;
        pose.falling.push({z: start - (start - target) * f * f});
      }
    }
    if (p > 0.9) {
      const f = span(p, 0.9, 1);
      for (let index = 0; index < added; index++) {
        pose.cup.push({z: lerp(RIM_TOP, CUP_FLOOR + (remain + index) * PITCH, f), alpha: span(p, 0.9, 0.94)});
      }
    }
  }
  return pose;
}

// ---- 組み立て ----

const cache = new Map();

function setup(width, height) {
  const key = `${width}x${height}`;
  if (cache.has(key)) return cache.get(key);
  const points = [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    ...k.boxCorners(FLANGE, 0, 92),
    ...k.boxCorners(plan(-43, PARK - 9.4, 47, 70, 0), 83, 92),
  ];
  const P = k.fitProjection(points, width, height, {pad: 16, azimuth: AZIMUTH});
  const statics = {
    base: base(P),
    gantry: gantryBack(P),
    beam: beam(P),
    frontStop: frontStop(P),
    hopper: hopper(P),
    actuator: actuator(P),
    pedestal: pedestal(P),
    cageBack: cageBack(P),
    chute: chute(P),
    cageFront: cageFront(P),
    gate: gateFrame(P),
    frontRail: frontRail(P),
  };
  const entry = {P, statics};
  cache.set(key, entry);
  return entry;
}

export function labelOf(state) {
  const shown = displayState(state);
  return `トークンバケットを卓上の装置にした図。奥の補給箱から台車が真鍮のトークンを運び、1秒ごとに2枚ずつ縦の収納筒へ落とす。上限は8枚。手前の押し棒がリクエスト1件ごとに一番下の1枚をゲートから送り出し、トークンがなければ赤い旗が上がって拒否する。いま筒には${shown.tokens}枚、許可${shown.accepted}件、拒否${shown.refused}件。`;
}

export function renderFigure(state, {width = FIGURE.width, height = FIGURE.height, standalone = false, css = '', className = ''} = {}) {
  const {P, statics} = setup(width, height);
  const pose = poseOf(state);
  const shown = displayState(state);
  const parts = [];
  if (standalone && css) parts.push(`<style>${css}</style>`);

  parts.push(statics.base, statics.gantry, bushingBack(P, pose.cy), statics.beam, statics.hopper, statics.actuator, statics.pedestal);
  const digit = `<text class="yb-digit" transform="${k.sideMatrix([0, PED.y + PED.d], 4, P, 'left')}" font-size="6.2" text-anchor="middle">${shown.tokens}</text>`;
  parts.push(digit, statics.cageBack, pusher(P, pose.hx), statics.chute);

  if (pose.spent) parts.push(token(P, pose.spent.cx, 0, pose.spent.z, {alpha: pose.spent.alpha, spent: true}));
  for (let index = 0; index < pose.stack; index++) parts.push(token(P, 0, 0, FLOOR + pose.lift + index * PITCH));
  const above = [];
  for (const item of pose.falling) {
    if (item.z < COLLAR_TOP) parts.push(token(P, 0, 0, item.z));
    else above.push({z: item.z});
  }

  parts.push(statics.cageFront, statics.gate, flag(P, pose.flag), statics.frontRail);
  // 台車の受け皿：まだ皿の中にある落下中のトークンもここで描く
  const inCup = [...above.map((item) => ({z: item.z})), ...pose.cup].sort((a, b) => a.z - b.z);
  parts.push(carriage(P, pose.cy, inCup), statics.frontStop);

  let svg = k.figureSvg({
    width,
    height,
    label: labelOf(state),
    body: parts,
    standalone: standalone ? 'light' : false,
    className: `yb-figure${className ? ` ${className}` : ''}`,
  });
  if (standalone) svg = svg.replace('<svg ', `<svg width="${width}" height="${height}" `);
  return svg;
}

// 部品の数（README の部品表と合わせて確認するため）
export const PART_GROUPS = Object.freeze([
  ['台と脚', 1 + 8 + 1 + 1],
  ['門型の支柱・梁・レール・止め', 7],
  ['補給箱', 3],
  ['押し出しシリンダー', 6],
  ['収納筒（台座・角アングル8・上枠4）', 13],
  ['真鍮トークン（最大）', 8],
  ['送り出しゲートと拒否の旗', 5],
  ['滑り台と受け箱', 6],
  ['補充台車（受け皿・腕・軸受）', 10],
  ['台車で運ぶトークン', 2],
]);
