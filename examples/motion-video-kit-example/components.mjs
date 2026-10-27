// 八百万図AIツールボックス サイト紹介（20秒・無音）で再利用する2つの部品：SelectionFrame と MaterializeFrame。
// どちらも「時刻・決まった設定・データ」だけから SVG の文字列や rect を返す純粋関数。
// DOM、壁時計、乱数、前フレームの積算、CSS アニメーションは使わない。外部ライブラリなし。

export const COLOR = { paper: '#F6F3EB', face: '#FBF9F3', ink: '#17282B', teal: '#0B615E', ochre: '#F1BE47' };
export const FONT = {
  serif: "'Yu Mincho','YuMincho','Hiragino Mincho ProN','Noto Serif JP',serif",
  sans: "'Yu Gothic','YuGothic','Hiragino Sans','Noto Sans JP',sans-serif",
};

export const clamp01 = v => Math.min(1, Math.max(0, v));
/** t0–t1 の進み具合（0–1）。t0 === t1 は、その時刻で切り替わる。 */
export const between = (t, t0, t1) => (t1 <= t0 ? (t >= t0 ? 1 : 0) : clamp01((t - t0) / (t1 - t0)));
export const smoother = p => (p = clamp01(p), p * p * p * (p * (p * 6 - 15) + 10));
/** 速く出て、長く減速して着地する。k までは二次で加速し、その先は三次で減速する（速度は連続）。 */
export function glide(p, k = 0.25) {
  p = clamp01(p);
  const a = 1 / (k * k + (2 * k * (1 - k)) / 3), b = (2 * a * k) / (3 * (1 - k) ** 2);
  return p < k ? a * p * p : 1 - b * (1 - p) ** 3;
}
export const lerp = (a, b, p) => a + (b - a) * p;
/** rect = [x, y, w, h, 角丸?]。片方に角丸がなければ、もう片方の値を保つ。 */
export const lerpRect = (a, b, p) => a.map((v, i) => lerp(v, b[i] ?? v, p));

/**
 * 時刻 t の rect。stops[0] = { rect }、以降 = { t0, t1, rect, k? }（時刻順）。
 * rect は固定の配列か、動いて入ってくる対象を追う (t) => rect。
 */
export function trackRect(t, stops) {
  const at = r => (typeof r === 'function' ? r(t) : r);
  let rect = at(stops[0].rect);
  for (const s of stops.slice(1)) {
    if (t < s.t0) break;
    rect = lerpRect(rect, at(s.rect), glide(between(t, s.t0, s.t1), s.k));
  }
  return rect;
}

const n = v => Math.round(v * 100) / 100;
const box = r => `x="${n(r[0])}" y="${n(r[1])}" width="${n(Math.max(0, r[2]))}" height="${n(Math.max(0, r[3]))}"`;
export const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
export const rectEl = (r, attrs = '') => `<rect ${box(r)} ${attrs}/>`;

/** 1行の文字。family は 'sans' | 'serif'。 */
export function text(x, y, str, { size = 28, weight = 500, fill = COLOR.ink, family = 'sans', anchor = 'start', opacity = 1 } = {}) {
  const extra = (anchor !== 'start' ? ` text-anchor="${anchor}"` : '') + (opacity < 1 ? ` opacity="${n(opacity)}"` : '');
  return `<text x="${n(x)}" y="${n(y)}" font-family="${FONT[family]}" font-size="${size}" font-weight="${weight}" fill="${fill}"${extra}>${esc(str)}</text>`;
}

/**
 * SelectionFrame：frame0 から CTA まで残る、1本の角丸の輪郭。
 * rect は画面座標（カメラの拡大の外で描くので、線幅はいつも stroke px のまま）。
 * face：輪郭と同じ形の面（受け渡し中だけ渡す）。fill：{ rect, color, opacity? } を輪郭の内側に切り抜いて塗る。
 * inner：輪郭の内側に切り抜いて、塗りの上・線の下に描く SVG（広がる間に一緒に運ぶ名前や行の骨組み）。
 * orbit：{ phase, length } 周を回る短い線分。phase は呼び出し側が時刻から決める（例：t * 0.3）。
 * 受け渡しの約束：輪郭が動く間、通り道にある文字は呼び出し側が先に消し、通過後に戻す。着地先の部品は自分の選択の線を描かない
 * （選択は常にこの1本）。輪郭を不透明な中身の下へ回して交差を隠さない。
 */
export function selectionFrame({ id, rect, stroke = 4, color = COLOR.teal, face = null, fill = null, inner = '', orbit = null }) {
  const r = Math.max(0, Math.min(rect[4] ?? 20, rect[2] / 2, rect[3] / 2));
  const shape = `${box(rect)} rx="${n(r)}"`;
  let svg = '<g>';
  if (face) svg += `<rect ${shape} fill="${face}"/>`;
  if (fill && (fill.opacity ?? 1) > 0) {
    svg += `<clipPath id="${id}-fill"><rect ${shape}/></clipPath>`;
    svg += `<rect ${box(fill.rect)} fill="${fill.color}" opacity="${n(fill.opacity ?? 1)}" clip-path="url(#${id}-fill)"/>`;
  }
  if (inner) svg += `<clipPath id="${id}-inner"><rect ${shape}/></clipPath><g clip-path="url(#${id}-inner)">${inner}</g>`;
  svg += `<rect ${shape} fill="none" stroke="${color}" stroke-width="${stroke}"/>`;
  if (orbit) {
    const len = n(orbit.length * 1000), off = n(-(((orbit.phase % 1) + 1) % 1) * 1000);
    svg += `<rect ${shape} fill="none" stroke="${orbit.color ?? COLOR.ochre}" stroke-width="${stroke}" pathLength="1000" stroke-dasharray="${len} ${n(1000 - len)}" stroke-dashoffset="${off}"/>`;
  }
  return svg + '</g>';
}

/** 中身の座標を外枠へ置く位置。inset の内側へ、縦横比を保って左上に収める。 */
export function placeContent(frameRect, content) {
  const [top, right, bottom, left] = content.inset ?? [0, 0, 0, 0];
  const s = Math.min((frameRect[2] - left - right) / content.w, (frameRect[3] - top - bottom) / content.h);
  return { x: frameRect[0] + left, y: frameRect[1] + top, s };
}
/** 中身の座標の rect → 画面の rect。SelectionFrame を中身の一部（例：frame0 のカード）へ受け渡すときに使う。 */
export function contentRect(frameRect, content, r) {
  const p = placeContent(frameRect, content);
  return [p.x + r[0] * p.s, p.y + r[1] * p.s, r[2] * p.s, r[3] * p.s, ...(r.length > 4 ? [r[4] * p.s] : [])];
}

/**
 * MaterializeFrame：外枠が先に着き、そのあと本物の中身の領域が順に組み上がる。
 * rect：外枠の画面の rect（動かすときは trackRect の結果を渡す）。shellAt：外枠が現れ始める時刻（-1 なら frame0 から在る）。
 * contents[i] = { w, h, inset?, at, stagger?, dur?, out?, outDur?, opacity?, regions: [{ svg, rect?, at?, reveal: 'wipe' | 'rise' }] }
 *   region.svg は中身自身の座標（w×h）で描いた画面。本編の結果の枠には、本編の frame0 を描く関数が返す領域を
 *   そのまま渡す（この部品は中身を作らない）。'wipe' は rect の左から右へ現れ、'rise' は 12px 上がりながら現れる。
 *   'wipe' は線や面だけに使う。文字（特に日本語）は字の途中で切れるので、行ごとに 'rise' で出す。
 *   region.at は stagger の順番より優先する開始時刻（輪郭の通り道にある文字を、通過後に着地させるときに使う）。
 *   out の時刻で中身だけが消え、外枠は残る（そのあと呼び出し側が外枠を縮めたり、次の中身を渡したりできる）。
 *   opacity は呼び出し側が時刻から決める倍率（輪郭が通る間だけ中身を消して戻す）。
 * label：外枠の左上の名前。note：{ text, at } 名前の右に続く説明。labelOpacity：名前と説明の倍率（opacity と同じ用途）。
 */
export function materializeFrame(t, { id, rect, shellAt = -1, shellDur = 0.3, label = '', labelOpacity = 1, note = null, contents = [] }) {
  const shell = smoother(between(t, shellAt, shellAt + shellDur));
  if (shell <= 0) return '';
  let svg = `<g opacity="${n(shell)}">` + rectEl(rect, `rx="20" fill="${COLOR.face}" stroke="${COLOR.ink}" stroke-opacity="0.16" stroke-width="2"`);
  if (label && labelOpacity > 0) svg += text(rect[0] + 32, rect[1] + 58, label, { weight: 700, opacity: labelOpacity });
  const noteOpacity = note ? labelOpacity * smoother(between(t, note.at, note.at + 0.2)) : 0;
  if (noteOpacity > 0) svg += text(rect[0] + 56 + label.length * 28, rect[1] + 58, note.text, { opacity: noteOpacity });
  contents.forEach((c, ci) => {
    const outAt = c.out ?? Infinity, out = (1 - smoother(between(t, outAt, outAt + (c.outDur ?? 0.14)))) * (c.opacity ?? 1);
    if (out <= 0) return;
    const place = placeContent(rect, c);
    c.regions.forEach((g, i) => {
      const start = g.at ?? (c.at ?? -1) + i * (c.stagger ?? 0.12), p = smoother(between(t, start, start + (c.dur ?? 0.34)));
      if (p <= 0) return;
      const cid = `${id}-${ci}-${i}`;
      const inner = g.reveal === 'wipe'
        ? `<clipPath id="${cid}">${rectEl([g.rect[0], g.rect[1], g.rect[2] * p, g.rect[3]])}</clipPath><g clip-path="url(#${cid})" opacity="${n(out)}">${g.svg}</g>`
        : `<g transform="translate(0 ${n(((1 - p) * 12) / place.s)})" opacity="${n(p * out)}">${g.svg}</g>`;
      svg += `<g transform="translate(${n(place.x)} ${n(place.y)}) scale(${+place.s.toFixed(5)})">${inner}</g>`;
    });
  });
  return svg + '</g>';
}
