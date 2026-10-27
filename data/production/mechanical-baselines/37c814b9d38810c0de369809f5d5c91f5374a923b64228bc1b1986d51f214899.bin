// 部品の検証ページ（各4秒・1920×1080・60fps・無音）。本編に入れる前に、SelectionFrame と MaterializeFrame を単独で確かめる。
// 画面は公開中の 八百万図AIツールボックス を紹介用に再構成した模式図で、実際の画面の録画ではない。
// 描画は site/render.py が site/ 全体を使い捨ての根へ写し、入口の HTML だけに <base href="lab/"> を入れて行うので、'../components.mjs' のまま動く。
import { COLOR, between, smoother, glide, lerp, trackRect, contentRect, selectionFrame, materializeFrame, text, rectEl } from '../components.mjs';

const { paper, face, ink, teal, ochre } = COLOR;
const fade = (t, a, d = 0.16) => smoother(between(t, a, a + d));
const group = (o, body, dy = 0) => (o <= 0 ? '' : `<g opacity="${+o.toFixed(3)}"${dy ? ` transform="translate(0 ${+dy.toFixed(2)})"` : ''}>${body}</g>`);
const rise = (t, a, body, d = 0.28) => { const p = fade(t, a, d); return group(p, body, (1 - p) * 12); };
const bar = (r, o = 0.12) => rectEl(r, `rx="${r[3] / 2}" fill="${ink}" opacity="${o}"`);
const hairline = 'fill="none" stroke="#17282B" stroke-opacity="0.12" stroke-width="2"';
const shellFace = `rx="20" fill="${face}" stroke="${ink}" stroke-opacity="0.16" stroke-width="2"`;

// ---- frame0（絵コンテ S01 の表紙）。selection の最初の状態と CTA の背景、materialize の結果の中身に使う。
// 本編では S01 自身がこの cover() を描き、同じ出力を結果の枠へ渡す（結果 = 本編の frame0）。
const CARDS = [['UI・UX', 1056, 168], ['AIスライド', 1452, 168], ['モーション', 1056, 444], ['画像・図解', 1452, 444], ['開発・テスト', 1056, 720], ['調査・Web収集', 1452, 720]];
const cardShell = ([, x, y], fill = face) => rectEl([x, y, 372, 252], `rx="20" fill="${fill}" stroke="${ink}" stroke-opacity="0.12" stroke-width="2"`);
const cardName = ([label, x, y], opacity = 1) => text(x + 36, y + 84, label, { size: 40, weight: 700, opacity });
/**
 * 表紙の部品（SVG 文字列）。names はモーション以外のカード名（CARDS の順）。labels はカード名の不透明度。
 * selected = false でモーションのカード自身の選択の線を描かない。SelectionFrame が受け渡しで入ってくる間と、
 * そのあとの結果の中では必ず false にし、選択の線を動いてきた1本だけにする（二重の輪郭を作らない）。
 */
export function cover({ motionFill = face, selected = true, labels = 1 } = {}) {
  const others = CARDS.filter((_, i) => i !== 2);
  return {
    brand: text(96, 250, '八百万図AIツールボックス', { size: 32, weight: 700, fill: teal }),
    headline: text(96, 470, 'AIスキルを、', { size: 120, weight: 600, family: 'serif' }) + text(96, 620, '用途から選ぶ。', { size: 120, weight: 600, family: 'serif' }),
    cards: others.map(c => cardShell(c)).join(''),
    names: others.map(c => cardName(c, labels)),
    motion: cardShell(CARDS[2], motionFill) + (selected ? rectEl([1056, 444, 372, 252], `rx="20" fill="none" stroke="${teal}" stroke-width="4"`) : ''),
    motionName: cardName(CARDS[2], labels),
  };
}

// ---- 左の手順（本編では部品にせず直接描く。ここでは構図を本編に近づけるために置く）。pos は 0–5 の連続値。
const STEPS = ['用途を選ぶ', '紹介を選ぶ', '記事を開く', '実際の入力', 'できた結果', '依頼文で試す'];
const stepY = i => 262 + i * 126;
function rail(pos, o) {
  const active = Math.round(pos);
  let s = rectEl([119, 232, 2, 660], `fill="${ink}" opacity="0.2"`);
  STEPS.forEach((label, i) => {
    s += `<circle cx="120" cy="${stepY(i)}" r="6" fill="${paper}" stroke="${teal}" stroke-width="2"/>`;
    s += text(152, stepY(i) + 9, String(i + 1).padStart(2, '0'), { size: 22, weight: 700, fill: teal });
    s += text(196, stepY(i) + 11, label, { size: 30, weight: i === active ? 700 : 500, opacity: i === active ? 1 : 0.68 });
  });
  return group(o, s + `<circle cx="120" cy="${stepY(pos).toFixed(2)}" r="11" fill="${ochre}"/>`);
}

// ---- 選択枠：カード → 一覧（広がる）→ 作例の印 → 「作例を見る」のボタン。輪郭は1本、線幅は常に4px。
const MOTION = [1056, 444, 372, 252, 20], WS = [560, 96, 1264, 888, 20], BAND = [560, 96, 1264, 120];
const BADGE = [1424, 288, 328, 72, 20], BUTTON = [176, 664, 560, 136, 20];
const OUTLINE = [{ rect: MOTION }, { t0: 0.76, t1: 1.24, rect: WS }, { t0: 1.8, t1: 2.18, rect: BADGE }, { t0: 2.6, t1: 3.04, rect: BUTTON }];
const SWEEP = [{ rect: [1056, 444, 0, 252] }, { t0: 0.12, t1: 0.5, rect: MOTION }, { t0: 0.76, t1: 1.24, rect: BAND }];
const PRESS = [{ rect: [176, 664, 0, 136] }, { t0: 3.0, t1: 3.2, rect: BUTTON }];

// 一覧の中身。f は外枠の rect、e は広がり（0–1、e = 1 で WS の座標と一致）。
// カード名「モーション」は帯の見出しへそのまま運び、行の骨組みは外枠が広がる間から組み上がる（文字は着地の直前から）。
// 輪郭が印へ縮む 1.80–2.18 は、通り道の文字（見出し・「作例付きは一部」・行の名前）が先に消え（1.62–1.78）、
// 輪郭が通り過ぎた 1.94 から戻る。受け渡し先の印は消さない。
function listing(t, f, e) {
  const kx = f[2] / WS[2], X = x => f[0] + (x - WS[0]) * kx, dy = f[1] + lerp(252, 120, e) - 216;
  const page = 1 - fade(t, 2.4), clear = 1 - fade(t, 1.62) + fade(t, 1.94), words = fade(t, 1.16);
  let s = group(clear * page, text(f[0] + lerp(36, 48, e), f[1] + lerp(84, 78, e), 'モーション', { size: +lerp(40, 48, e).toFixed(2), weight: 700 }));
  s += group(words * clear * page, text(X(1776), f[1] + 72, '作例付きは一部', { size: 30, weight: 700, anchor: 'end' }));
  for (let i = 0; i < 4; i++) {
    const y = 248 + i * 176 + dy, p = fade(t, 0.9 + i * 0.05, 0.24);
    let row = rectEl([X(600), y, 1184 * kx, 152], `rx="16" ${hairline}`);
    row += i === 0
      ? bar([X(640), y + 100, 380 * kx, 14], 0.09) + rectEl([X(1432), y + 48, 312 * kx, 56], `rx="12" fill="${teal}" fill-opacity="0.1"`)
        + group(words * clear, text(X(640), y + 80, '作例のある紹介', { size: 36, weight: 700 }))
        + group(words, text(X(1588), y + 86, '制作した作例あり', { size: 28, weight: 700, fill: teal, anchor: 'middle' }))
      : bar([X(640), y + 52, 460 * kx, 24]) + bar([X(640), y + 94, 300 * kx, 14], 0.09);
    s += group(p * page, row, (1 - p) * 12);
  }
  return s;
}

function workspace(t) {
  if (t < 1.24) return '';
  // 1.24 に輪郭の面・黄土の帯・内側の中身から、同じ形・同じ色の一覧へ入れ替える（画素は変わらない）。
  return group(1 - fade(t, 2.4), `<clipPath id="ws-clip">${rectEl(WS, 'rx="20"')}</clipPath>`
    + rectEl(WS, shellFace) + rectEl(BAND, `fill="${ochre}" clip-path="url(#ws-clip)"`)) + listing(t, WS, 1);
}

function selectionScene(t) {
  const c = cover(), cta = cover({ motionFill: ochre, selected: false, labels: fade(t, 2.92) });
  const rect = trackRect(t, OUTLINE), e = glide(between(t, 0.76, 1.24));
  // 表紙のモーション以外は、輪郭が広がり始める前に消える。
  let s = group(1 - fade(t, 0.58), c.brand + c.headline + c.cards + c.names.join(''));
  // 行き先を先に置く：CTA のカードの面は一覧の下に置き、一覧が消えると見える。ボタンの受け皿は手順が消えるのと入れ替わる。
  // カード名は、印からボタンへ向かう輪郭が通り過ぎた 2.92 から入る。
  s += group(fade(t, 2.3, 0.2), cta.cards + cta.names.join('') + cta.motion + cta.motionName) + group(fade(t, 2.44), rectEl(BUTTON, shellFace));
  s += workspace(t) + rail(1, fade(t, 0.86, 0.2) * (1 - fade(t, 2.4)));
  s += rise(t, 3.06, text(176, 250, '八百万図AIツールボックス', { size: 32, weight: 700, fill: teal })
    + text(176, 430, '用途から選び、', { size: 96, weight: 600, family: 'serif' }) + text(176, 556, '作例を見て試す。', { size: 96, weight: 600, family: 'serif' }));
  // 受け渡しの間（2.45–3.14）も行き先が読めるよう、同じ CTA の名前を左上の空き（手順の上・一覧の左・輪郭の通り道の外）に出し、ボタンの名前が着いてから消す。
  s += group(fade(t, 2.3, 0.15) * (1 - fade(t, 3.28, 0.16)), text(176, 160, '作例を見る', { size: 64, weight: 700, fill: teal }));
  s += group(fade(t, 3.2, 0.2), text(176, 872, 'studio-yebisu.github.io/studio-yebisu/', { size: 28, opacity: 0.68 }));
  const fill = t < 1.24 ? { rect: trackRect(t, SWEEP), color: ochre } : t >= 2.9 ? { rect: trackRect(t, PRESS), color: teal } : null;
  s += selectionFrame({ id: 'sel', rect, face: t < 1.24 ? face : null, fill, inner: t < 1.24 ? listing(t, rect, e) : '', orbit: { phase: t * 0.3, length: 0.06 } });
  return s + group(fade(t, 3.14, 0.14), text(456, 748, '作例を見る', { size: 48, weight: 700, fill: paper, anchor: 'middle' }));
}

// ---- 組み上げ枠：記事の模式図 → 入力の外枠が先に広がり、依頼文の行が埋まる → 帯へ縮み、結果の外枠が着いて frame0 が組み上がる。
const INPUT = [{ rect: [600, 432, 580, 472, 20] }, { t0: 0.4, t1: 0.8, rect: [592, 160, 1176, 672, 20] }, { t0: 2.05, t1: 2.4, rect: [592, 112, 1200, 104, 20] }];
const RESULT_AT = [592, 240, 1200, 744];
const RESULT = [{ rect: [1204, 432, 580, 472] }, { t0: 0.25, t1: 0.55, rect: [1204, 1120, 580, 472] },
  { t0: 2.15, t1: 2.15, rect: [592, 1120, 1200, 744] }, { t0: 2.15, t1: 2.55, rect: RESULT_AT }];
const quote = (x, y, str, size) => text(x, y, str, { size, weight: 600, family: 'serif' });
// 依頼文は行ごとに、字を切らずに上がりながら現れる。横の拭き取りは黄土の下線だけ。
const INPUT_CONTENTS = [
  { w: 580, h: 472, at: -1, out: 0.25, regions: [{ svg: bar([32, 112, 440, 20]) + bar([32, 152, 380, 20]) + bar([32, 192, 300, 20], 0.09) }] },
  { w: 1176, h: 672, at: 0.78, stagger: 0.1, dur: 0.32, out: 1.95, regions: [
    { reveal: 'rise', svg: text(64, 196, '実際の依頼文より', { size: 30, opacity: 0.68 }) },
    { reveal: 'rise', svg: quote(64, 330, '「20秒の短いコード動画を', 84) },
    { reveal: 'rise', svg: quote(64, 450, '作ってください。」', 84) },
    { reveal: 'wipe', rect: [64, 476, 600, 14], svg: rectEl([64, 478, 588, 10], `fill="${ochre}"`) }] },
];
const BAND_QUOTE = { w: 1056, h: 104, inset: [0, 24, 0, 120], at: 2.4, dur: 0.3, regions: [
  { reveal: 'rise', svg: quote(0, 66, '「20秒の短いコード動画を作ってください。」', 36) }] };
// 結果の中身 = frame0。選択の線は描かない（入ってくる輪郭を唯一の選択にする）。背景 → 通り道にない文字とカードの面 →
// 着地先のモーションのカードの面。輪郭（3.05–3.45）の通り道にある上の3枚と着地先のカード名、見出しの2行は、通過後に着地する。
const RESULT_COVER = cover({ selected: false });
const FRAME0 = { w: 1920, h: 1080, inset: [96, 48, 24, 48], at: 2.55, stagger: 0.12, dur: 0.34, regions: [
  { reveal: 'wipe', rect: [0, 0, 1920, 1080], svg: rectEl([0, 0, 1920, 1080], `fill="${paper}"`) },
  { reveal: 'rise', svg: RESULT_COVER.brand + RESULT_COVER.cards + RESULT_COVER.names.slice(3).join('') },
  { reveal: 'rise', svg: RESULT_COVER.motion },
  { reveal: 'rise', at: 3.32, svg: RESULT_COVER.names.slice(0, 3).join('') + RESULT_COVER.motionName },
  { reveal: 'rise', at: 3.38, svg: RESULT_COVER.headline }] };
const ANCHOR = contentRect(RESULT_AT, FRAME0, MOTION);
const RESULT_CONTENTS = [{ w: 580, h: 472, at: -1, out: 0.25, regions: [{ svg: rectEl([32, 96, 516, 330], `rx="12" fill="${ink}" opacity="0.07"`) }] }, FRAME0];
const inputRect = t => trackRect(t, INPUT);

function materializeScene(t) {
  // 輪郭が帯を出る前に、帯の名前と引用が消え（2.88–3.02）、輪郭が帯の下へ抜けた 3.14 から戻る。
  // 結果の名前と説明は、戻ってきた外枠では輪郭が通り過ぎた 3.20 に着地する。
  const band = 1 - fade(t, 2.88, 0.14) + fade(t, 3.14);
  let s = text(96, 72, '作例記事の模式図', { size: 24, weight: 700, fill: teal });
  s += group(1 - fade(t, 0.25, 0.15), rectEl(WS, shellFace)
    + text(608, 168, 'トップ ／ モーション', { size: 24, opacity: 0.68 }) + bar([608, 196, 620, 26]) + bar([608, 238, 420, 18], 0.09)
    + text(608, 372, '実入力と結果', { size: 64, weight: 600, family: 'serif' }));
  s += rail(2 + glide(between(t, 0.4, 0.7)) + glide(between(t, 2.15, 2.45)), 1);
  s += materializeFrame(t, { id: 'res', rect: trackRect(t, RESULT), label: '結果', labelOpacity: t < 2.15 ? 1 : fade(t, 3.2),
    note: { text: 'この20秒の映像', at: 3.2 }, contents: RESULT_CONTENTS });
  s += materializeFrame(t, { id: 'in', rect: inputRect(t), label: '入力', labelOpacity: band, contents: [...INPUT_CONTENTS, { ...BAND_QUOTE, opacity: band }] });
  return s + selectionFrame({ id: 'sel', rect: trackRect(t, [{ rect: inputRect }, { t0: 3.05, t1: 3.45, rect: ANCHOR }]), orbit: { phase: t * 0.3, length: 0.06 } });
}

// ---- 時間の契約（Motion Reel）と、ページだけの再生操作。
const SCENES = {
  selection: { draw: selectionScene, posterTime: 3.8, title: '部品の検証｜選択枠 SelectionFrame・4秒・無音' },
  materialize: { draw: materializeScene, posterTime: 3.8, title: '部品の検証｜組み上げ枠 MaterializeFrame・4秒・無音' },
};

export function start(kind) {
  const scene = SCENES[kind], rc = window.renderConfig || {};
  const config = { duration: 4, fps: rc.fps || 60, width: rc.width || 1920, height: rc.height || 1080, posterTime: scene.posterTime, audioEvents: [] };
  window.motionConfig = config;
  const stage = document.getElementById('stage'), range = document.getElementById('time');
  const readout = document.getElementById('readout'), play = document.getElementById('play');
  let now = 0, raf = 0, last = 0;
  window.seek = t => {
    now = Math.min(config.duration, Math.max(0, Number(t) || 0));
    stage.innerHTML = rectEl([0, 0, 1920, 1080], `fill="${paper}"`) + scene.draw(now)
      + text(1824, 60, scene.title, { size: 22, anchor: 'end', opacity: 0.68 }) + text(96, 1044, '紹介用に再構成した画面', { size: 20, opacity: 0.72 });
    range.value = String(now);
    readout.value = now.toFixed(2) + '秒';
  };
  window.seek(0);
  window.motionReady = document.fonts.ready.then(() => window.seek(now));
  if (window.__MOTION_RENDER__) { document.documentElement.classList.add('render'); return; }

  // プレビューだけ：再生中は rAF で seek を呼ぶ。書き出しの画は seek(t) だけで決まる。
  range.max = String(config.duration);
  range.step = String(1 / config.fps);
  const stop = () => { cancelAnimationFrame(raf); raf = 0; last = 0; play.textContent = '再生'; play.setAttribute('aria-pressed', 'false'); };
  const tick = ts => {
    if (window.__MOTION_RENDER__) return stop();
    if (last) window.seek(now + (ts - last) / 1000 >= config.duration ? 0 : now + (ts - last) / 1000);
    last = ts;
    raf = requestAnimationFrame(tick);
  };
  play.addEventListener('click', () => {
    if (raf) return stop();
    play.textContent = '一時停止';
    play.setAttribute('aria-pressed', 'true');
    raf = requestAnimationFrame(tick);
  });
  range.addEventListener('input', () => { stop(); window.seek(range.value); });
}
