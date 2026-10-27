// 寸法のスライダー → dims.mjs → 説明用の投影・断面・数字・Pythonの定数。
// CADは実行しない。cadgen・build123d は読み込まない。

import {DEFAULT, WIDE, LIMITS, caseDims, caseFaces, hiddenEdges, sectionU, fixedView, project, fmt, sizeText, pythonConstants, paramsJson} from './dims.mjs';

const form = document.getElementById('sliders');
const inputs = Object.fromEntries(['width', 'depth', 'height', 'wall'].map((key) => [key, document.getElementById(key)]));
const outs = Object.fromEntries(['width', 'depth', 'height', 'wall'].map((key) => [key, document.getElementById(`${key}-out`)]));
const iso = document.getElementById('iso');
const front = document.getElementById('front');
const side = document.getElementById('side');
const statusEl = document.getElementById('status');
const presetButtons = Array.from(document.querySelectorAll('[data-preset]'));
const viewButtons = Array.from(document.querySelectorAll('[data-view]'));

const ISO = {width: 640, height: 460};
const VIEW = fixedView(ISO.width, ISO.height, {pad: 50});
const SECTION_K = 2; // 1 mm = 2 単位（断面は2つとも同じ縮尺）

let presets = {small: DEFAULT, wide: WIDE};
let mode = 'clear';
let dims = caseDims(DEFAULT);

const esc = (text) => String(text).replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const pt = (point) => project(point, VIEW).map((value) => value.toFixed(1)).join(' ');
const poly = (points) => `M${points.map(pt).join('L')}Z`;

function dimLine(a, b, label, cls, offsetText = [0, 0]) {
  const [x1, y1] = project(a, VIEW);
  const [x2, y2] = project(b, VIEW);
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const nx = -Math.sin(angle) * 5;
  const ny = Math.cos(angle) * 5;
  const mx = (x1 + x2) / 2 + offsetText[0];
  const my = (y1 + y2) / 2 + offsetText[1];
  return `<g class="dim ${cls}">
    <path d="M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}M${(x1 - nx).toFixed(1)} ${(y1 - ny).toFixed(1)}L${(x1 + nx).toFixed(1)} ${(y1 + ny).toFixed(1)}M${(x2 - nx).toFixed(1)} ${(y2 - ny).toFixed(1)}L${(x2 + nx).toFixed(1)} ${(y2 + ny).toFixed(1)}"/>
    <text x="${mx.toFixed(1)}" y="${my.toFixed(1)}" text-anchor="middle">${esc(label)}</text>
  </g>`;
}

function isoSvg(d) {
  const W = d.outer.width;
  const D = d.outer.depth;
  const H = d.outer.height;
  const t = d.wall;
  const parts = [];
  if (mode === 'clear') {
    for (const [a, b] of hiddenEdges(d)) parts.push(`<path class="hidden-edge" d="M${pt(a)}L${pt(b)}"/>`);
  }
  for (const face of caseFaces(d)) {
    const far = face.role === 'inner-x-far' || face.role === 'inner-y-far';
    if (far && mode !== 'clear') continue;
    if (face.hole) {
      parts.push(`<path class="face ${face.role}" fill-rule="evenodd" d="${poly(face.points)}${poly([...face.hole].reverse())}"/>`);
    } else {
      parts.push(`<path class="face ${face.role}${mode === 'clear' ? ' see' : ''}" d="${poly(face.points)}"/>`);
    }
  }
  // 寸法線（床に沿って手前・右へ少し離す）
  parts.push(dimLine([0, D + 12, 0], [W, D + 12, 0], `幅 ${fmt(W)}`, 'outer', [-14, 22]));
  parts.push(dimLine([W + 12, 0, 0], [W + 12, D, 0], `奥行 ${fmt(D)}`, 'outer', [24, 16]));
  parts.push(dimLine([W + 8, D + 8, 0], [W + 8, D + 8, H], `高さ ${fmt(H)}`, 'outer', [40, 4]));
  // 内寸の幅：上縁の奥の内側に沿って
  parts.push(dimLine([t, t + 6, H], [W - t, t + 6, H], `内寸 ${fmt(d.inner.width)}`, 'inner', [0, -8]));
  // 壁の厚さ：手前の上縁の中ほど
  const [wx, wy] = project([W / 2, D - t / 2, H], VIEW);
  parts.push(`<g class="dim wall"><circle cx="${wx.toFixed(1)}" cy="${wy.toFixed(1)}" r="3.2"/><path d="M${wx.toFixed(1)} ${wy.toFixed(1)}L${(wx - 26).toFixed(1)} ${(wy + 40).toFixed(1)}"/><text x="${(wx - 30).toFixed(1)}" y="${(wy + 56).toFixed(1)}" text-anchor="middle">壁 ${fmt(t)}</text></g>`);
  const label = `上面が開いたケースの説明用の投影。外形 ${sizeText(d.outer)} mm、壁と底 ${fmt(t)} mm、内寸 ${sizeText(d.inner)} mm。CADの出力ではありません。`;
  return `<svg viewBox="0 0 ${ISO.width} ${ISO.height}" role="img" aria-label="${esc(label)}" class="iso-svg mode-${mode}">${parts.join('')}</svg>`;
}

function sectionSvg(span, height, wall, floor, inner, spanLabel, maxSpan) {
  const k = SECTION_K;
  const padX = 22;
  const padTop = 30;
  const w = maxSpan * k + padX * 2;
  const h = LIMITS.height[1] * k + padTop + 34;
  const ox = padX + ((maxSpan - span) * k) / 2;
  const base = padTop + LIMITS.height[1] * k;
  const P = ([x, z]) => `${(ox + x * k).toFixed(1)} ${(base - z * k).toFixed(1)}`;
  const shape = sectionU(span, height, wall, floor);
  const top = base - height * k;
  const parts = [
    `<path class="cut" d="M${shape.map(P).join('L')}Z"/>`,
    // 外形の幅（下）
    `<g class="sdim"><path d="M${P([0, -6])}L${P([span, -6])}M${P([0, -3.5])}L${P([0, -8.5])}M${P([span, -3.5])}L${P([span, -8.5])}"/><text x="${(ox + (span * k) / 2).toFixed(1)}" y="${(base + 26).toFixed(1)}" text-anchor="middle">${esc(spanLabel)} ${fmt(span)}</text></g>`,
    // 内寸（上）
    `<g class="sdim inner"><path d="M${P([wall, height + 5])}L${P([span - wall, height + 5])}M${P([wall, height + 2.5])}L${P([wall, height + 7.5])}M${P([span - wall, height + 2.5])}L${P([span - wall, height + 7.5])}"/><text x="${(ox + (span * k) / 2).toFixed(1)}" y="${(top - 14).toFixed(1)}" text-anchor="middle">内寸 ${fmt(inner)}</text></g>`,
    // 底の厚さ
    `<text class="tlabel" x="${(ox + (span * k) / 2).toFixed(1)}" y="${(base - floor * k - 6).toFixed(1)}" text-anchor="middle">底 ${fmt(floor)}</text>`,
  ];
  return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(`${spanLabel}方向の断面：外形 ${fmt(span)} mm、高さ ${fmt(height)} mm、壁 ${fmt(wall)} mm、底 ${fmt(floor)} mm、内寸 ${fmt(inner)} mm`)}">${parts.join('')}</svg>`;
}

function render() {
  iso.innerHTML = isoSvg(dims);
  front.innerHTML = sectionSvg(dims.outer.width, dims.outer.height, dims.wall, dims.floor, dims.inner.width, '幅', LIMITS.width[1]);
  side.innerHTML = sectionSvg(dims.outer.depth, dims.outer.height, dims.wall, dims.floor, dims.inner.depth, '奥行', LIMITS.width[1]);
  for (const key of Object.keys(inputs)) {
    const value = key === 'wall' ? dims.wall : dims.outer[key];
    if (Number(inputs[key].value) !== value) inputs[key].value = String(value);
    outs[key].textContent = `${fmt(value)} mm`;
    inputs[key].setAttribute('aria-valuetext', `${fmt(value)} ミリ`);
  }
  document.getElementById('inner').textContent = `${fmt(dims.inner.width)} × ${fmt(dims.inner.depth)} × ${fmt(dims.inner.height)} mm`;
  document.getElementById('outer').textContent = `${fmt(dims.outer.width)} × ${fmt(dims.outer.depth)} × ${fmt(dims.outer.height)} mm`;
  document.getElementById('thick').textContent = `${fmt(dims.wall)} mm・${fmt(dims.floor)} mm`;
  document.getElementById('cavity').textContent = `${fmt(dims.cavityMl)} mL`;
  document.getElementById('material').textContent = `${fmt(dims.materialCm3)} cm³`;
  document.getElementById('constants').textContent = pythonConstants(dims);
  for (const button of presetButtons) {
    const p = presets[button.dataset.preset];
    const same = p && p.width === dims.outer.width && p.depth === dims.outer.depth && p.height === dims.outer.height && p.wall === dims.wall;
    button.setAttribute('aria-pressed', String(Boolean(same)));
  }
}

function readForm() {
  dims = caseDims({width: inputs.width.value, depth: inputs.depth.value, height: inputs.height.value, wall: inputs.wall.value});
  render();
}

form.addEventListener('input', readForm);
form.addEventListener('submit', (event) => event.preventDefault());
presetButtons.forEach((button) => button.addEventListener('click', () => {
  const p = presets[button.dataset.preset];
  if (!p) return;
  dims = caseDims(p);
  render();
}));
viewButtons.forEach((button) => button.addEventListener('click', () => {
  mode = button.dataset.view;
  viewButtons.forEach((other) => other.setAttribute('aria-pressed', String(other === button)));
  render();
}));
document.getElementById('save-json').addEventListener('click', () => {
  const text = `${JSON.stringify(paramsJson(dims), null, 2)}\n`;
  const url = URL.createObjectURL(new Blob([text], {type: 'application/json'}));
  const link = document.createElement('a');
  link.href = url;
  link.download = `parts-case-${fmt(dims.outer.width)}x${fmt(dims.outer.depth)}x${fmt(dims.outer.height)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  statusEl.textContent = `いまの寸法（外形 ${sizeText(dims.outer)} mm）をJSONとして保存に回しました。CADは実行していません。`;
});

// parameters.json の2案を読み、dims.mjs の既定値と同じかを確かめる
fetch('parameters.json', {cache: 'no-store'})
  .then((response) => {
    if (!response.ok) throw new Error(`parameters.json を読めません（${response.status}）`);
    return response.json();
  })
  .then((data) => {
    const byId = Object.fromEntries((data.cases || []).map((item) => [item.id, item]));
    const pick = (id) => {
      const item = byId[id];
      if (!item) throw new Error(`parameters.json に ${id} がない`);
      if (item.wall !== item.floor) throw new Error(`${id} の壁と底が違う（この画面は同じ厚さとして扱う）`);
      return {width: item.width, depth: item.depth, height: item.height, wall: item.wall};
    };
    presets = {small: pick('small'), wide: pick('wide')};
    const agree = ['width', 'depth', 'height', 'wall'].every((key) => presets.small[key] === DEFAULT[key] && presets.wide[key] === WIDE[key]);
    presetButtons.forEach((button) => { button.disabled = false; });
    statusEl.textContent = agree
      ? `parameters.json の2案（${sizeText(presets.small)}・${sizeText(presets.wide)} mm）を読みました。model-proposal.py の定数と同じ値です。`
      : 'parameters.json の値が dims.mjs の既定値と違います。README の値を確かめてください。';
    if (!agree) statusEl.dataset.state = 'warn';
    render();
  })
  .catch((error) => {
    presetButtons.forEach((button) => { button.disabled = false; });
    statusEl.dataset.state = 'warn';
    statusEl.textContent = `${error.message}。案のボタンは dims.mjs の既定値を使います。`;
  });

render();
