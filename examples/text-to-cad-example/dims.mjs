// 上面が開いた小物ケースの寸法計算と、説明用の投影（CADカーネルではない）。
// 画面・動画・model-proposal.py の定数が同じ値になるようにここを正本にする。
// cadgen・build123d は読み込まない。計算は外形から壁と底を引くだけ。

export const UNIT = 'mm';

// [最小, 最大, 刻み]
export const LIMITS = Object.freeze({
  width: Object.freeze([100, 130, 1]),
  depth: Object.freeze([60, 90, 1]),
  height: Object.freeze([20, 35, 1]),
  wall: Object.freeze([2, 3, 0.1]),
});

// parameters.json の "small" と同じ値。壁と底は同じ厚さ。
export const DEFAULT = Object.freeze({width: 100, depth: 70, height: 24, wall: 2.4});
// parameters.json の "wide"：幅だけ130にする
export const WIDE = Object.freeze({...DEFAULT, width: 130});

const round1 = (value) => Math.round(value * 10) / 10;
const clamp = (value, [low, high]) => Math.min(high, Math.max(low, value));
const snap = (value, [low, , step]) => round1(low + Math.round((value - low) / step) * step);

export function normalize(input = {}) {
  const out = {};
  for (const key of Object.keys(LIMITS)) {
    const raw = Number(input[key] ?? DEFAULT[key]);
    out[key] = snap(clamp(Number.isFinite(raw) ? raw : DEFAULT[key], LIMITS[key]), LIMITS[key]);
  }
  return out;
}

// 外形・壁・底から内寸を出す。数字は0.1 mmに丸める。
export function caseDims(input = {}) {
  const {width, depth, height, wall} = normalize(input);
  const floor = wall;
  const inner = {
    width: round1(width - 2 * wall),
    depth: round1(depth - 2 * wall),
    height: round1(height - floor),
  };
  const outerVolume = width * depth * height;
  const cavity = inner.width * inner.depth * inner.height;
  return Object.freeze({
    unit: UNIT,
    outer: Object.freeze({width, depth, height}),
    wall,
    floor,
    inner: Object.freeze(inner),
    cavityMl: round1(cavity / 1000),
    materialCm3: round1((outerVolume - cavity) / 1000),
  });
}

export const fmt = (value) => (Number.isInteger(value) ? String(value) : value.toFixed(1));
export const sizeText = ({width, depth, height}) => `${fmt(width)}×${fmt(depth)}×${fmt(height)}`;

// model-proposal.py の定数ブロックと同じ形の文字列（画面で値を見せるだけ。実行しない）
export function pythonConstants(dims) {
  const f = (value) => value.toFixed(1);
  return [
    `OUTER_WIDTH = ${f(dims.outer.width)}`,
    `OUTER_DEPTH = ${f(dims.outer.depth)}`,
    `OUTER_HEIGHT = ${f(dims.outer.height)}`,
    `WALL = ${f(dims.wall)}`,
    `FLOOR = ${f(dims.floor)}`,
    `# 内寸 ${fmt(dims.inner.width)} × ${fmt(dims.inner.depth)} × ${fmt(dims.inner.height)} mm`,
  ].join('\n');
}

export function paramsJson(dims) {
  return {
    unit: UNIT,
    note: '説明プレビューの値。CADは実行しておらず、STEP / STL は生成していません。',
    width: dims.outer.width,
    depth: dims.outer.depth,
    height: dims.outer.height,
    wall: dims.wall,
    floor: dims.floor,
    inner: {...dims.inner},
  };
}

// ---- 説明用の等角投影（視点は +x +y の上から） ----

const COS30 = Math.cos(Math.PI / 6);
const SIN30 = 0.5;

export function project([x, y, z], view) {
  return [view.ox + (x - y) * COS30 * view.k, view.oy + ((x + y) * SIN30 - z) * view.k];
}

const rect = (x0, y0, x1, y1, z) => [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]];

// 面の一覧（3D点の列）。描く順番に並べてある：奥 → 手前。
export function caseFaces(dims, {cavity = 1} = {}) {
  const W = dims.outer.width;
  const D = dims.outer.depth;
  const H = dims.outer.height;
  const t = dims.wall;
  const f = dims.floor;
  // cavity は 0（くり抜く前）〜1（くり抜いたあと）。途中はくぼみの上端が上から下りる途中ではなく、
  // 「くぼみの深さ」を 0 から H−f まで伸ばして見せる。
  const depth = (H - f) * cavity;
  const bottom = H - depth;
  const faces = [];
  if (cavity > 0) {
    faces.push({role: 'floor', points: rect(t, t, W - t, D - t, bottom)});
    faces.push({role: 'inner-x', points: [[t, t, H], [t, D - t, H], [t, D - t, bottom], [t, t, bottom]]});
    faces.push({role: 'inner-y', points: [[t, t, H], [W - t, t, H], [W - t, t, bottom], [t, t, bottom]]});
    faces.push({role: 'inner-x-far', points: [[W - t, t, H], [W - t, D - t, H], [W - t, D - t, bottom], [W - t, t, bottom]]});
    faces.push({role: 'inner-y-far', points: [[t, D - t, H], [W - t, D - t, H], [W - t, D - t, bottom], [t, D - t, bottom]]});
  }
  faces.push({role: 'outer-x', points: [[W, 0, 0], [W, D, 0], [W, D, H], [W, 0, H]]});
  faces.push({role: 'outer-y', points: [[0, D, 0], [W, D, 0], [W, D, H], [0, D, H]]});
  if (cavity > 0) {
    faces.push({role: 'rim', points: rect(0, 0, W, D, H), hole: rect(t, t, W - t, D - t, H)});
  } else {
    faces.push({role: 'top', points: rect(0, 0, W, D, H)});
  }
  return faces;
}

// 見えない奥の外形の辺（透かし表示で細い破線にする）
export function hiddenEdges(dims) {
  const W = dims.outer.width;
  const D = dims.outer.depth;
  const H = dims.outer.height;
  return [
    [[0, 0, 0], [W, 0, 0]],
    [[0, 0, 0], [0, D, 0]],
    [[0, 0, 0], [0, 0, H]],
  ];
}

// 断面（正面＝幅×高さ、側面＝奥行×高さ）。U字の外形を2D点で返す。
export function sectionU(span, height, wall, floor) {
  return [
    [0, 0], [span, 0], [span, height], [span - wall, height],
    [span - wall, floor], [wall, floor], [wall, height], [0, height],
  ];
}

// 最大の箱（130×90×35）が入る投影。値が変わっても縮尺は変えないので、大きさの違いが見える。
export function fixedView(width, height, {pad = 24, k} = {}) {
  const maxBox = {outer: {width: LIMITS.width[1], depth: LIMITS.depth[1], height: LIMITS.height[1]}};
  const corners = [];
  for (const x of [0, maxBox.outer.width]) for (const y of [0, maxBox.outer.depth]) for (const z of [0, maxBox.outer.height]) corners.push([x, y, z]);
  const unit = {ox: 0, oy: 0, k: 1};
  const flat = corners.map((point) => project(point, unit));
  const xs = flat.map(([x]) => x);
  const ys = flat.map(([, y]) => y);
  const left = Math.min(...xs);
  const right = Math.max(...xs);
  const top = Math.min(...ys);
  const bottom = Math.max(...ys);
  const scale = k ?? Math.min((width - pad * 2) / (right - left), (height - pad * 2) / (bottom - top));
  return {ox: width / 2 - ((left + right) / 2) * scale, oy: height / 2 - ((top + bottom) / 2) * scale, k: scale};
}
