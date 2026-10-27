// 八百万図AIツールボックス サイト紹介の本編（20秒・1920×1080・60fps・無音）。画面は紹介用に再構成した模式図で、実際の操作の録画ではない。
// 部品は検証済みの ../components.mjs（SelectionFrame・MaterializeFrame）と表紙の cover()（../lab/lab.mjs）を変えずに使い、
// 本編用の時刻とデータだけを渡す。画面はすべて seek(t) の純粋関数で、壁時計・乱数・前フレームの積算・CSS アニメーションを使わない。
// 描画は site/render.py が site/ 全体を使い捨ての根へ写し、入口の HTML だけに <base href="film/"> を入れて行う。
import { COLOR, between, smoother, glide, lerp, lerpRect, trackRect, selectionFrame, materializeFrame, text, rectEl } from '../components.mjs';
import { cover } from '../lab/lab.mjs';

const { paper, face, ink, teal, ochre } = COLOR;
const fade = (t, a, d = 0.16) => smoother(between(t, a, a + d));
const group = (o, body, dy = 0, dx = 0) => (o <= 0 ? '' : `<g opacity="${+o.toFixed(3)}"${dx || dy ? ` transform="translate(${+dx.toFixed(2)} ${+dy.toFixed(2)})"` : ''}>${body}</g>`);
const rise = (t, a, body, d = 0.28, o = 1) => { const p = fade(t, a, d); return group(p * o, body, (1 - p) * 12); };
const bar = (r, o = 0.12) => rectEl(r, `rx="${r[3] / 2}" fill="${ink}" opacity="${o}"`);
const hairline = `fill="none" stroke="${ink}" stroke-opacity="0.12" stroke-width="2"`;
const shellFace = `rx="20" fill="${face}" stroke="${ink}" stroke-opacity="0.16" stroke-width="2"`;
const quote = (x, y, str, size) => text(x, y, str, { size, weight: 600, family: 'serif' });
const LABEL = text(96, 1044, '紹介用に再構成した画面', { size: 20, opacity: 0.72 });

// ---- カメラ：画面 = o + (世界 − o) × s。輪郭は画面座標で描くので、寄っても線幅は 4px のまま。
const cam = (s, ox, oy) => ({ s, ox, oy });
const pt = (c, x, y) => [c.ox + (x - c.ox) * c.s, c.oy + (y - c.oy) * c.s];
const onScreen = (c, r) => [...pt(c, r[0], r[1]), r[2] * c.s, r[3] * c.s, ...(r.length > 4 ? [r[4] * c.s] : [])];
const view = (c, body) => (c.s === 1 || !body ? body
  : `<g transform="translate(${+(c.ox * (1 - c.s)).toFixed(3)} ${+(c.oy * (1 - c.s)).toFixed(3)}) scale(${+c.s.toFixed(5)})">${body}</g>`);
const cam1 = t => cam(1 + 0.02 * between(t, 0, 2.3), 1242, 570);     // S01 表紙の寄り
const cam2 = t => cam(1 + 0.015 * between(t, 2.7, 3.95), 1184, 561); // S02 カードの接写の寄り
const cam8 = t => cam(1 + 0.03 * between(t, 17.12, 20), 960, 540);   // S08 CTA の寄り

// ---- 輪郭の着地先（rect = [x, y, w, h, 角丸]）
const MOTION = [1056, 444, 372, 252, 20], CLOSE = [592, 160, 1184, 802, 20], WS = [560, 96, 1264, 888, 20], BAND = [560, 96, 1264, 120];
const BADGE = [1424, 288, 328, 72, 20], PAGE_IN = [600, 432, 580, 472, 20], PAGE_OUT = [1204, 432, 580, 472];
const EXPANDED = [592, 160, 1176, 672, 20], PUSHED = [...onScreen(cam(1.03, 1180, 496), EXPANDED).slice(0, 4), 20], STRIP = [592, 112, 1200, 104, 20];
const RESULT_AT = [592, 240, 1200, 744], COPY = [1420, 452, 360, 88, 16], BUTTON = [176, 640, 656, 176, 24];
const MINI = { w: 1920, h: 1080, inset: [96, 48, 24, 48] }; // 結果の枠の中の frame0

// S06 → S07：記事が1画面ぶん上へ送られる（輪郭と枠も同じ glide）。
const up = t => -1080 * glide(between(t, 14.2, 14.7));
const lift = r => [r[0], r[1] - 1080, ...r.slice(2)];
// 入力の枠：記事の「入力」→ 依頼文の外枠（8.65 着地）→ 読む間の 1.00→1.03 の寄り → 帯 → 上へ送られる。
const pushRect = t => lerpRect(EXPANDED, PUSHED, between(t, 8.65, 11.15));
const INPUT = [{ rect: PAGE_IN }, { t0: 8.25, t1: 8.65, rect: EXPANDED }, { t0: 8.65, t1: 8.65, rect: pushRect },
  { t0: 11.15, t1: 11.55, rect: STRIP }, { t0: 14.2, t1: 14.7, rect: lift(STRIP) }];
// 引用の置き場所（inset = 上・右・下・左）。枠と同じ時刻・同じ glide で縮尺が変わり、引用は消えずに 記事 → 大写し → 帯 へ運ばれる。
const QUOTE_AT = [{ rect: [200, 32, 70, 32] }, { t0: 8.25, t1: 8.65, rect: [246, 12, 182, 64] }, { t0: 11.15, t1: 11.55, rect: [8, 0, 8, 120] }];
// 結果の枠：記事の「結果」（中身は frame0）→ 中身を消してから下の画面外へ → 中身を持ったまま下から着く → 読む間の 1.00→1.02 の寄り → 上へ送られる。
const resultPush = t => onScreen(cam(1 + 0.02 * between(t, 11.65, 14.1), 1192, 612), RESULT_AT);
const RESULT = [{ rect: PAGE_OUT }, { t0: 8.15, t1: 8.45, rect: [1204, 1120, 580, 472] }, { t0: 9, t1: 9, rect: [592, 1120, 1200, 744] },
  { t0: 11.25, t1: 11.65, rect: resultPush }, { t0: 14.2, t1: 14.7, rect: t => lift(resultPush(t)) }];
// S06 の輪郭：帯と結果をまとめて外側から囲む。結果は輪郭の下の辺が画面外へ出たあとに入ってくるので、輪郭はどちらの文字も横切らない。
const pair = t => {
  const a = trackRect(t, INPUT), b = trackRect(t, RESULT), x = Math.min(a[0], b[0]), y = Math.min(a[1], b[1]);
  return [x, y, Math.max(a[0] + a[2], b[0] + b[2]) - x, Math.max(a[1] + a[3], b[1] + b[3]) - y, 20];
};
const copyRect = t => [COPY[0], COPY[1] + 1080 + up(t), COPY[2], COPY[3], COPY[4]];

// 1本の輪郭：表紙のカード → 接写 → 一覧 → 印 → 記事 → 入力 → 入力と結果 →「依頼文をコピー」→「作例を見る」。
const OUTLINE = [
  { rect: t => onScreen(cam1(t), MOTION) },
  { t0: 2.3, t1: 2.7, rect: t => onScreen(cam2(t), CLOSE) },
  { t0: 4.0, t1: 4.48, rect: WS },
  { t0: 5.78, t1: 6.16, rect: BADGE },
  { t0: 6.28, t1: 6.81, rect: WS },
  { t0: 8.25, t1: 8.65, rect: t => trackRect(t, INPUT) },
  { t0: 11.15, t1: 11.55, rect: pair },
  { t0: 14.2, t1: 14.7, rect: copyRect },
  { t0: 16.55, t1: 16.95, rect: t => onScreen(cam8(t), BUTTON) },
];
// 選んだ状態の塗り：S02 は黄土が左から満ちて、一覧の帯へ縮む。S08 はティールがボタンを左から塗る。
const SWEEP = [{ rect: t => onScreen(cam2(t), [592, 160, 0, 802]) }, { t0: 2.8, t1: 3.18, rect: t => onScreen(cam2(t), CLOSE) }, { t0: 4.0, t1: 4.48, rect: BAND }];
const PRESS = [{ rect: [176, 640, 0, 176] }, { t0: 16.85, t1: 17.0, rect: BUTTON }];

// ---- S01 表紙（frame0 は完成した構図）。cover() は結果の枠の中身と同じ関数で、選択の線は輪郭1本だけ。
function opening(t) {
  if (t >= 2.7) return '';
  const c = cover({ selected: false }), e = smoother(between(t, 2.1, 2.3));
  let s = group(1 - e, c.brand + c.headline, 0, -80 * e);
  s += group(1 - fade(t, 2.12, 0.18), c.cards + c.names.join(''));
  if (t < 2.3) s += c.motion + c.motionName; // 2.30 からは輪郭の面と内側の名前が、同じ画素で引き継ぐ
  return view(cam1(t), s);
}

// カード名「モーション」は消さずに運ぶ：表紙のカード → 接写（112px）→ 一覧の帯の見出し（48px）。
function carriedName(t, o = 1) {
  let x, y, size;
  if (t < 2.7) {
    const c = cam1(2.3), [ax, ay] = pt(c, 1092, 528), p = glide(between(t, 2.3, 2.7));
    [x, y, size] = [lerp(ax, 656, p), lerp(ay, 330, p), lerp(40 * c.s, 112, p)];
  } else {
    const c = cam2(t), [ax, ay] = pt(c, 656, 330), p = glide(between(t, 4.0, 4.48));
    [x, y, size] = [lerp(ax, 608, p), lerp(ay, 176, p), lerp(112 * c.s, 48, p)];
  }
  return group(o, text(x, y, 'モーション', { size: +size.toFixed(2), weight: 700 }));
}

// ---- S03 紹介の一覧（名前のない模式の行）。「作例付きは一部」を最初の一覧で示す。
// 輪郭が印へ縮む 5.78–6.16 は、通り道の文字が先に消え（5.60–5.76）、辺が通り過ぎた 5.92 から戻る。印の文字は消さない。
function rows(t) {
  const words = fade(t, 4.4), clear = 1 - fade(t, 5.6) + fade(t, 5.92), page = 1 - fade(t, 6.22, 0.14);
  let s = group(words * clear * page, text(1776, 178, '作例付きは一部', { size: 52, weight: 700, anchor: 'end' }));
  for (let i = 0; i < 4; i++) {
    const y = 248 + i * 176, p = fade(t, 4.24 + i * 0.05, 0.24);
    let row = rectEl([600, y, 1184, 152], `rx="16" ${hairline}`);
    row += i === 0
      ? bar([640, y + 100, 380, 14], 0.09) + rectEl([1432, y + 48, 312, 56], `rx="12" fill="${teal}" fill-opacity="0.1"`)
        + group(words * clear, text(640, y + 80, '作例のある紹介', { size: 40, weight: 700 }))
        + group(words, text(1588, y + 87, '制作した作例あり', { size: 30, weight: 700, fill: teal, anchor: 'middle' }))
      : bar([640, y + 52, 460, 24]) + bar([640, y + 94, 300, 14], 0.09);
    s += group(p * page, row, (1 - p) * 12);
  }
  return s;
}

// S02 の接写の中身（輪郭の内側に切り抜く）。説明は輪郭が広がる前に消え、一覧の行は広がる間から組み上がる。
function cardInner(t) {
  const desc = text(656, 760, '文字と図形を動かして、', { size: 56, weight: 600 }) + text(656, 846, '仕組みを伝える。', { size: 56, weight: 600 });
  return carriedName(t) + view(cam2(t), rise(t, 3.0, desc, 0.3, 1 - fade(t, 3.95, 0.14))) + (t >= 4.2 ? rows(t) : '');
}

// ---- S03・S04 の外枠（一覧 → 記事の模式図）。外枠は同じ rect のまま中身だけ入れ替わる。
function workspace(t) {
  if (t < 4.48 || t >= 8.25) return '';
  const clear = 1 - fade(t, 5.6) + fade(t, 5.92), page = 1 - fade(t, 6.22, 0.14);
  let s = group(1 - fade(t, 8.1, 0.15), rectEl(WS, shellFace) + group(page, `<clipPath id="ws-clip">${rectEl(WS, 'rx="20"')}</clipPath>`
    + rectEl(BAND, `fill="${ochre}" clip-path="url(#ws-clip)"`)));
  if (t < 6.36) s += carriedName(t, clear * page) + rows(t);
  // 記事の面は一覧が消えるのと入れ替わりに先に在り、文字は輪郭が記事の縁へ着いたあと 6.74 から入る。
  const leave = 1 - fade(t, 8.1, 0.14);
  s += group(fade(t, 6.26, 0.2) * leave, bar([608, 196, 620, 26]) + bar([608, 238, 420, 18], 0.09));
  s += rise(t, 6.74, text(608, 168, 'トップ ／ モーション', { size: 24, opacity: 0.68 }) + quote(608, 388, '実入力と結果', 72), 0.28, leave);
  return s;
}

// ---- S04–S06 入力の枠（MaterializeFrame）。記事の入力の枠に入った引用が、そのまま大写しになり、帯へ縮む（途中で消さない）。
// 拭き取りは黄土の下線だけ。「実際の依頼文より」は大写しの間だけの添え書きで、帯へ縮む前に消える。
function inputFrame(t) {
  const leave = 1 - fade(t, 14.1, 0.14);
  return materializeFrame(t, { id: 'in', rect: trackRect(t, INPUT), shellAt: 6.26, shellDur: 0.2, label: '入力', labelOpacity: fade(t, 6.74) * leave, contents: [
    { w: 1100, h: 244, inset: trackRect(t, QUOTE_AT), opacity: leave, regions: [
      { reveal: 'rise', at: 6.74, svg: quote(0, 84, '「20秒の短いコード動画を', 84) },
      { reveal: 'rise', at: 6.8, svg: quote(0, 204, '作ってください。」', 84) },
      { reveal: 'wipe', at: 8.55, rect: [0, 230, 600, 14], svg: rectEl([0, 232, 588, 10], `fill="${ochre}"`) }] },
    { w: 1176, h: 672, out: 11.05, regions: [{ reveal: 'rise', at: 8.55, svg: text(64, 196, '実際の依頼文より', { size: 30, opacity: 0.68 }) }] },
  ] });
}

// ---- S04–S06 結果の枠。中身はこの映像の frame0 を描く cover() の領域そのもの（有限の1段だけで、seek は呼ばない）。
// 記事の結果の枠で組み上がり、画面外へ出る前に消え、S06 では組み上がった状態のまま下から着く（着いてから待たせない）。
// S06 → S07 の送り（14.2–14.7）では、輪郭の左の辺と上の辺が届く直前に、中身を消す。左寄せの見出しは 14.26 まで、
// カード名は上の段から 14.30・14.325・14.35 まで残り、次の節の文字が入るまで読む対象を切らさない。
function resultFrame(t) {
  const m = cover({ selected: false }), o = t < 9 ? 1 - fade(t, 8.06, 0.14) : 1 - fade(t, 14.1, 0.14);
  const gone = a => (t < 9 ? 1 : 1 - fade(t, a, 0.1));
  return materializeFrame(t, { id: 'res', rect: trackRect(t, RESULT), shellAt: 6.26, shellDur: 0.2, label: '結果',
    labelOpacity: fade(t, 6.74) * o, note: { text: 'この20秒の映像', at: 6.8 }, contents: [
      { ...MINI, at: 6.6, stagger: 0.06, dur: 0.3, opacity: t < 9 ? o : 1, regions: [
        { reveal: 'wipe', rect: [0, 0, 1920, 1080], svg: group(gone(14.25), rectEl([0, 0, 1920, 1080], `fill="${paper}"`)) },
        { reveal: 'rise', svg: group(gone(14.25), m.cards) }, { reveal: 'rise', svg: group(gone(14.25), m.motion) },
        { reveal: 'rise', at: 6.74, svg: group(gone(14.16), m.brand + LABEL) + group(gone(14.2), m.names[0] + m.names[1])
          + group(gone(14.225), m.names[2] + m.motionName) + group(gone(14.25), m.names[3] + m.names[4]) },
        { reveal: 'rise', at: 6.8, svg: group(gone(14.16), m.headline) }] },
    ] });
}

// ---- S07 記事の下の節。面は下から送られてきて、文字は面と同じ送りで動く（面の座標に付いたまま）。
// 輪郭（帯と結果の外枠 →「依頼文をコピー」、面の座標では左下の角が (580,−88) → (1420,540) へ直線で進む）が通らない
// 「依頼文の例」と下の2枠の文字は最初から面に在る。通り道の文字は、その位置を辺が過ぎた時刻から入る：
// 見出しは左下の角が右端を過ぎた 14.35、依頼文の1・2行目は上の辺が過ぎた 14.53、3行目は左の辺が過ぎた 14.56、
// ボタンの名前は下の辺が過ぎた 14.58。
// 依頼文の例は request.txt の3行、注意と出典は作例記事の本文からそのまま抜粋する。
const REQUEST = ['事業と目的：【事業名、何をしているか、見た人にしてほしい一つの行動】', '確かな事実：【映像で言ってよい事実と、その根拠】', '言わないこと：【価格・実績・保証など、出さない主張】'];
function section(t) {
  if (t < 14.2 || t >= 16.8) return '';
  const out = 1 - fade(t, 16.4, 0.15), line = (x, y, str) => text(x, y, str, { size: 26 }), at = 1080 + up(t);
  const onFace = (a, body) => { const p = a ? fade(t, a, 0.2) : 1; return group(p * out, body, at + (1 - p) * 12); };
  let s = group(1 - fade(t, 16.55, 0.17), rectEl([560, 120, 1264, 456], shellFace) + rectEl([608, 288, 1168, 140], `rx="12" fill="${ink}" opacity="0.05"`)
    + rectEl(COPY, `rx="16" fill="${ink}"`) + rectEl([560, 608, 620, 220], shellFace) + rectEl([1204, 608, 620, 220], shellFace), at);
  s += onFace(0, text(608, 270, '依頼文の例', { size: 24, opacity: 0.68 })
    + text(600, 676, 'できないことと注意', { size: 32, weight: 700, opacity: 0.8 }) + line(600, 728, '無音です。') + line(600, 770, '2Dの図形と文字だけです。')
    + text(1244, 676, '出典とライセンス', { size: 32, weight: 700, opacity: 0.8 }) + line(1244, 728, 'Motion Reel（Studio Yebisu、MIT）') + line(1244, 770, '参考映像は使っていません。'));
  s += onFace(14.35, quote(608, 208, 'AIへの頼み方', 56));
  s += onFace(14.53, REQUEST.slice(0, 2).map((str, i) => text(640, 330 + i * 42, str, { size: 28 })).join(''));
  s += onFace(14.56, text(640, 414, REQUEST[2], { size: 28 }));
  s += onFace(14.58, text(1600, 509, '依頼文をコピー', { size: 36, weight: 700, fill: paper, anchor: 'middle' }));
  return s;
}

// ---- 左の手順（残る道筋）。強調だけが替わり、最後は線が曲がって「作例を見る」の左端に入る。
const STEPS = ['用途を選ぶ', '紹介を選ぶ', '記事を開く', '実際の入力', 'できた結果', '依頼文で試す'];
const stepY = i => 262 + i * 126;
const MOVES = [4.35, 6.36, 8.15, 11.25, 14.25];
function rail(t) {
  const o = fade(t, 2.5, 0.26);
  if (o <= 0) return '';
  const pos = MOVES.reduce((p, a) => p + glide(between(t, a, a + 0.35)), 0), active = Math.round(pos);
  const bend = glide(between(t, 16.55, 17.0));
  let s = rectEl([119, 232, 2, lerp(660, 472, bend)], `fill="${ink}" opacity="0.2"`);
  if (bend > 0) s += `<path d="M120 704Q120 728 176 728" fill="none" stroke="${ink}" stroke-opacity="0.2" stroke-width="2" pathLength="1" stroke-dasharray="${+bend.toFixed(4)} 1"/>`;
  let steps = '';
  STEPS.forEach((label, i) => {
    steps += `<circle cx="120" cy="${stepY(i)}" r="6" fill="${paper}" stroke="${teal}" stroke-width="2"/>`
      + text(152, stepY(i) + 9, String(i + 1).padStart(2, '0'), { size: 22, weight: 700, fill: teal })
      + text(196, stepY(i) + 11, label, { size: 30, weight: i === active ? 700 : 500, opacity: i === active ? 1 : 0.68 });
  });
  s += group(1 - fade(t, 16.4, 0.15), steps);
  let x = 120, y = stepY(pos);
  if (bend > 0) {
    if (bend < 0.7) y = lerp(stepY(5), 704, bend / 0.7);
    else { const u = (bend - 0.7) / 0.3; x = (1 - u) ** 2 * 120 + 2 * u * (1 - u) * 120 + u * u * 176; y = (1 - u) ** 2 * 704 + (1 - (1 - u) ** 2) * 728; }
  }
  return group(o, s + group(1 - fade(t, 16.9, 0.12), `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="11" fill="${ochre}"/>`));
}

// ---- S08 CTA。行き先（カードの面・ボタンの受け皿）は輪郭が動き出す前に在り、カード名は輪郭が通り過ぎた 16.87 から、
// 見出しは 16.90 から入る。移動の間も行き先が読めるよう、同じ名前を左上の空きに出し、ボタンの名前が着いてから消す。
function cta(t) {
  if (t < 16.45) return '';
  const c = cover({ motionFill: ochre, selected: false, labels: fade(t, 16.87) });
  let s = group(fade(t, 16.45, 0.2), c.cards + c.motion) + c.names.join('') + c.motionName;
  s += group(fade(t, 16.55), rectEl(BUTTON, `rx="24" fill="${face}" stroke="${ink}" stroke-opacity="0.16" stroke-width="2"`));
  s += group(fade(t, 16.55, 0.15) * (1 - fade(t, 17.16, 0.16)), text(176, 160, '作例を見る', { size: 64, weight: 700, fill: teal }));
  s += rise(t, 16.9, text(176, 250, '八百万図AIツールボックス', { size: 32, weight: 700, fill: teal })
    + quote(176, 430, '用途から選び、', 96) + quote(176, 556, '作例を見て試す。', 96), 0.2);
  return s + group(fade(t, 16.98, 0.14), text(176, 880, 'studio-yebisu.github.io/studio-yebisu/', { size: 28, opacity: 0.68 }));
}

function selectionFill(t) {
  if (t >= 2.8 && t < 4.48) return { rect: trackRect(t, SWEEP), color: ochre };
  if (t >= 16.85) return { rect: onScreen(cam8(t), trackRect(t, PRESS)), color: teal };
  return null;
}

/** 時刻 t の完成した画面（SVG の中身）。 */
export function draw(t) {
  const card = t >= 2.3 && t < 4.48;
  let s = rectEl([0, 0, 1920, 1080], `fill="${paper}"`) + opening(t) + workspace(t);
  if (t >= 6.26 && t < 14.7) s += resultFrame(t) + inputFrame(t);
  s += section(t) + view(cam8(t), rail(t) + cta(t));
  s += selectionFrame({ id: 'sel', rect: trackRect(t, OUTLINE), face: card ? face : null, fill: selectionFill(t), inner: card ? cardInner(t) : '', orbit: { phase: t * 0.3, length: 0.06 } });
  s += view(cam8(t), group(fade(t, 16.96, 0.14), text(504, 763, '作例を見る', { size: 96, weight: 700, fill: paper, anchor: 'middle' })));
  s += group(fade(t, 6.81, 0.2) * (1 - fade(t, 16.4, 0.15)), text(96, 72, '作例記事の模式図', { size: 24, weight: 700, fill: teal }));
  return s + LABEL;
}

export const SCENES = [
  { id: 'S01', start: 0, title: '表紙' }, { id: 'S02', start: 2.4, title: 'カードの接写' }, { id: 'S03', start: 4.2, title: '紹介の一覧' },
  { id: 'S04', start: 6.55, title: '作例記事の模式図' }, { id: 'S05', start: 8.3, title: '依頼文の引用' }, { id: 'S06', start: 11.35, title: '入力と結果' },
  { id: 'S07', start: 14.4, title: '依頼文の節' }, { id: 'S08', start: 16.85, title: '作例を見る' },
];

// ---- 時間の契約（Motion Reel）と、ページだけの再生操作。書き出しの画は seek(t) だけで決まる。
export function start() {
  const rc = window.renderConfig || {};
  const config = { duration: 20, fps: rc.fps || 60, width: rc.width || 1920, height: rc.height || 1080, posterTime: 13, audioEvents: [] };
  window.motionConfig = config;
  const stage = document.getElementById('stage'), range = document.getElementById('time');
  const readout = document.getElementById('readout'), play = document.getElementById('play'), scene = document.getElementById('scene');
  let now = 0, raf = 0, last = 0;
  const sceneAt = t => SCENES.reduce((k, s, i) => (t >= s.start ? i : k), 0);
  window.seek = t => {
    now = Math.min(config.duration, Math.max(0, Number(t) || 0));
    stage.innerHTML = draw(now);
    range.value = String(now);
    readout.value = now.toFixed(2) + '秒';
    scene.value = String(sceneAt(now));
  };
  SCENES.forEach((s, i) => scene.add(new Option(`${s.id}　${s.start.toFixed(2)}秒　${s.title}`, String(i))));
  window.seek(0);
  const fonts = ['600 96px "Yu Mincho"', '700 40px "Yu Gothic"', '500 30px "Yu Gothic"'].map(f => document.fonts.load(f).catch(() => []));
  window.motionReady = Promise.all(fonts).then(() => document.fonts.ready).then(() => window.seek(now));
  if (window.__MOTION_RENDER__) { document.documentElement.classList.add('render'); return; }

  // プレビューだけ：再生中は rAF で seek を呼ぶ。
  range.max = String(config.duration);
  range.step = String(1 / config.fps);
  const stop = () => { cancelAnimationFrame(raf); raf = 0; last = 0; play.textContent = '再生'; play.setAttribute('aria-pressed', 'false'); };
  const tick = ts => {
    if (window.__MOTION_RENDER__) return stop();
    if (last) {
      const next = now + (ts - last) / 1000;
      if (next >= config.duration) { window.seek(config.duration); return stop(); }
      window.seek(next);
    }
    last = ts;
    raf = requestAnimationFrame(tick);
  };
  const toggle = () => {
    if (raf) return stop();
    if (now >= config.duration) window.seek(0);
    play.textContent = '一時停止';
    play.setAttribute('aria-pressed', 'true');
    raf = requestAnimationFrame(tick);
  };
  play.addEventListener('click', toggle);
  range.addEventListener('input', () => { stop(); window.seek(range.value); });
  scene.addEventListener('change', () => { stop(); window.seek(SCENES[Number(scene.value)].start); });
  stage.addEventListener('keydown', e => {
    const step = e.shiftKey ? 1 : 1 / config.fps;
    const keys = { ' ': () => toggle(), k: () => toggle(), ArrowLeft: () => window.seek(now - step), ArrowRight: () => window.seek(now + step),
      Home: () => window.seek(0), End: () => window.seek(config.duration) };
    if (!keys[e.key]) return;
    e.preventDefault();
    if (e.key !== ' ' && e.key !== 'k') stop();
    keys[e.key]();
  });
}
