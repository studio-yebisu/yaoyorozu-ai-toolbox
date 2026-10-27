/* TanStack AI 作例 — 26秒・無音の説明映像。Studio Yebisu, MIT.
   質問 → 入力の型 → 道具 → 商品 の1つの流れを画面に保ち、../samples.json の実記録をそのまま再生する。
   ミニ再生の区切り（道具の呼び出し・応答の開始など）は実イベントの秒から導く。
   すべてのフレームは時刻tと実記録だけから決定的に描く。音声・乱数・壁時計・前フレームの状態には依存しない。 */
(() => {
  'use strict';

  const canvas = document.getElementById('film');
  const ctx = canvas.getContext('2d', {willReadFrequently: true});
  const cfg = window.motionConfig;
  const boot = window.__filmBoot;

  const PAPER = '#f2eee3', FIELD = '#fbf9f3', INK = '#17150f', MUTED = '#6b6455';
  const RULE = 'rgba(23,21,15,0.2)', ACCENT = '#ff4f00', BLUE = '#2749c9', SOFT = '#e7e1d0';
  const MUG = {blue: '#2749c9', red: '#c93a27'};
  const MINCHO = '"Hiragino Mincho ProN","Yu Mincho","YuMincho","BIZ UDPMincho","Noto Serif JP",serif';
  const SANS = '"Hiragino Sans","Hiragino Kaku Gothic ProN","Yu Gothic UI","Yu Gothic","YuGothic",Meiryo,"Noto Sans JP",system-ui,sans-serif';
  const MONO = '"Cascadia Mono",Consolas,"Courier New",monospace';

  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const smooth = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const lerp = (a, b, k) => a + (b - a) * k;
  const yen = n => n.toLocaleString('ja-JP');

  let data = null;
  const samples = {};

  // ---------- drawing helpers ----------
  function text(str, x, y, size, color, align, weight, family) {
    ctx.fillStyle = color;
    ctx.font = (weight || 600) + ' ' + size + 'px ' + (family || SANS);
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(str, x, y);
  }
  function wrap(str, maxW, size, family, weight) {
    ctx.font = (weight || 500) + ' ' + size + 'px ' + (family || SANS);
    const lines = [];
    let line = '';
    for (const ch of str) {
      if (line && ctx.measureText(line + ch).width > maxW) { lines.push(line); line = ch.trim() ? ch : ''; }
      else line += ch;
    }
    if (line) lines.push(line);
    return lines;
  }
  function rrect(x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
  function panel(x, y, w, h, r, fill, stroke, lw) {
    rrect(x, y, w, h, r);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke(); }
  }
  function chip(x, y, str, size, filled, fg) {
    ctx.font = '700 ' + size + 'px ' + MONO;
    const w = ctx.measureText(str).width + size * 1.2, h = size * 1.7;
    panel(x, y, w, h, h / 2, filled ? (fg || INK) : FIELD, filled ? null : INK, 1.5);
    text(str, x + size * 0.6, y + h / 2 + 1, size, filled ? '#fff' : INK, 'left', 700, MONO);
    return w;
  }
  // 線の上を点が進む矢印（時刻tだけで決まる）
  function arrow(x1, y1, x2, y2, t, color) {
    ctx.strokeStyle = color || MUTED; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    const a = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - 9 * Math.cos(a - 0.42), y2 - 9 * Math.sin(a - 0.42));
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - 9 * Math.cos(a + 0.42), y2 - 9 * Math.sin(a + 0.42));
    ctx.stroke();
    const k = (t * 0.55) % 1;
    const dx = lerp(x1, x2, k), dy = lerp(y1, y2, k);
    ctx.beginPath(); ctx.arc(dx, dy, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = ACCENT; ctx.fill();
  }
  // 曲がって下る矢印（上の行から下の行へ戻る返り値の流れ）
  function elbowArrow(pts, t, color) {
    ctx.strokeStyle = color || MUTED; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
    const n = pts.length;
    const a = Math.atan2(pts[n - 1].y - pts[n - 2].y, pts[n - 1].x - pts[n - 2].x);
    const e = pts[n - 1];
    ctx.beginPath();
    ctx.moveTo(e.x, e.y);
    ctx.lineTo(e.x - 9 * Math.cos(a - 0.42), e.y - 9 * Math.sin(a - 0.42));
    ctx.moveTo(e.x, e.y);
    ctx.lineTo(e.x - 9 * Math.cos(a + 0.42), e.y - 9 * Math.sin(a + 0.42));
    ctx.stroke();
    let total = 0; const lens = [];
    for (let i = 1; i < n; i++) {
      const l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      lens.push(l); total += l;
    }
    let d = ((t * 0.55) % 1) * total;
    for (let i = 0; i < lens.length; i++) {
      if (d <= lens[i] || i === lens.length - 1) {
        const k = lens[i] ? d / lens[i] : 0;
        const x = lerp(pts[i].x, pts[i + 1].x, k), y = lerp(pts[i].y, pts[i + 1].y, k);
        ctx.beginPath(); ctx.arc(x, y, 3.2, 0, Math.PI * 2);
        ctx.fillStyle = ACCENT; ctx.fill();
        break;
      }
      d -= lens[i];
    }
  }
  function drawMug(cx, cy, s, color) {
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, s * 0.64, 0, Math.PI * 2);
    ctx.fillStyle = SOFT; ctx.fill();
    ctx.fillStyle = color;
    rrect(cx - s * 0.30, cy - s * 0.34, s * 0.60, s * 0.68, s * 0.09); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.30)';
    rrect(cx - s * 0.30, cy - s * 0.34, s * 0.60, s * 0.10, s * 0.05); ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = s * 0.085; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx + s * 0.365, cy + s * 0.02, s * 0.165, -Math.PI / 2, Math.PI / 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.42)';
    rrect(cx - s * 0.215, cy - s * 0.20, s * 0.075, s * 0.42, s * 0.037); ctx.fill();
    ctx.restore();
  }

  // ---------- 実記録から段階の時刻を導く ----------
  function derive(s, segA, segB) {
    const ev = s.events || [];
    const dur = s.recorded_duration_seconds || 1;
    const at = type => { const e = ev.find(e => e.type === type); return e ? e.seconds : null; };
    const span = segB - segA;
    return {
      dur, segA, segB, span,
      map: r => segA + (r / dur) * span,
      unmap: t => (t - segA) / span * dur,
      toolStart: at('TOOL_CALL_START'),
      toolResult: at('TOOL_CALL_RESULT'),
      textStart: at('TEXT_MESSAGE_START'),
      textEnd: at('TEXT_MESSAGE_END'),
    };
  }
  function streamedText(s, recT) {
    let out = '';
    for (const e of s.events) {
      if (e.type !== 'TEXT_MESSAGE_CONTENT') continue;
      if (e.seconds > recT) break;
      out += e.delta || '';
    }
    return out;
  }
  function streamedArgs(s, recT) {
    let out = '';
    for (const e of s.events) {
      if (e.type !== 'TOOL_CALL_ARGS') continue;
      if (e.seconds > recT) break;
      out += e.delta || '';
    }
    return out;
  }

  // ---------- 配置（縦は垂直フロー、横は水平フロー） ----------
  function layout(W, H, tall) {
    const u = tall ? W / 540 : H / 540;
    if (tall) {
      const m = 28 * u;
      const q = {x: m, y: 128 * u, w: W - 2 * m, h: 58 * u};
      const gap = 22 * u;
      const gate = {x: m, y: q.y + q.h + gap, w: W - 2 * m, h: 118 * u};
      const tool = {x: m, y: gate.y + gate.h + gap, w: W - 2 * m, h: 96 * u};
      const stage = {x: m, y: tool.y + tool.h + gap, w: W - 2 * m, h: H - 96 * u - (tool.y + tool.h + gap)};
      return {u, m, q, gate, tool, stage, tall};
    }
    const q = {x: 40 * u, y: 128 * u, w: 232 * u, h: 118 * u};
    const gate = {x: 316 * u, y: 128 * u, w: 252 * u, h: 118 * u};
    const tool = {x: 612 * u, y: 128 * u, w: 308 * u, h: 118 * u};
    const stage = {x: 40 * u, y: 306 * u, w: W - 80 * u, h: 174 * u};
    return {u, m: 40 * u, q, gate, tool, stage, tall};
  }

  // ---------- 各部品 ----------
  function drawHeader(t, W, L, tall) {
    const u = L.u;
    text('STUDIO YEBISU 作例・無音の説明映像', L.m, 30 * u, 12 * u, MUTED, 'left', 700);
    ctx.fillStyle = ACCENT; ctx.fillRect(L.m, 40 * u, 30 * u, 3.5 * u);
    text('チャットに、型付きの道具を足す。', L.m, 66 * u, tall ? 28 * u : 25 * u, INK, 'left', 700, MINCHO);
    // バージョンは上のメタ情報行に置き、タイトルとは重ねない（ページ側にも表示あり）
    const ver = '@tanstack/ai 1.0.0';
    ctx.font = '700 ' + 11 * u + 'px ' + MONO;
    const cw = ctx.measureText(ver).width + 11 * u * 1.2;
    chip(W - L.m - cw, 21 * u, ver, 11 * u, false);
    void cw;
    const step = t < 12.6 ? '1／質問が、入力の型を通って道具を呼ぶ' : (t < 20.8 ? '2／予算の条件を足して、もう一度' : '3／今回の実行のまとめ');
    text(step, L.m, 106 * u, 15 * u, ACCENT, 'left', 800);
  }

  function drawQuestion(L, label, activeP) {
    const u = L.u, q = L.q;
    ctx.save();
    ctx.globalAlpha = 1;
    panel(q.x, q.y, q.w, q.h, 14 * u, FIELD, activeP > 0.5 ? ACCENT : INK, activeP > 0.5 ? 2.5 : 2);
    text('質問', q.x + 16 * u, q.y + 18 * u, 12 * u, MUTED, 'left', 800);
    text(label, q.x + 16 * u, q.y + q.h / 2 + 11 * u, 20 * u, INK, 'left', 800);
    ctx.restore();
  }

  //  gate：入力の型。v1=queryの値、v2=maxPriceの値（未使用はnull）
  function drawGate(L, v1, v2) {
    const u = L.u, g = L.gate;
    panel(g.x, g.y, g.w, g.h, 12 * u, FIELD, INK, 2.5);
    text('入力の型（ここを通るだけ）', g.x + 14 * u, g.y + 16 * u, 12 * u, MUTED, 'left', 700);
    const gap = 10 * u;
    const sw = (g.w - 28 * u - gap) / 2, sh = g.h - 44 * u, sy = g.y + 34 * u;
    const slots = [
      {x: g.x + 14 * u, name: 'query', type: 'string', v: v1},
      {x: g.x + 14 * u + sw + gap, name: 'maxPrice?', type: 'number', v: v2},
    ];
    for (const s of slots) {
      ctx.save();
      if (s.v === null) ctx.globalAlpha = 0.62;
      panel(s.x, sy, sw, sh, 8 * u, PAPER, s.v !== null ? BLUE : RULE, s.v !== null ? 2 : 1.5);
      text(s.name, s.x + 10 * u, sy + 13 * u, 14 * u, INK, 'left', 800, MONO);
      text(s.type, s.x + sw - 10 * u, sy + (L.tall ? 13 : 32) * u, 11 * u, MUTED, 'right', 600, MONO);
      if (s.v !== null) text(s.v, s.x + 10 * u, sy + sh - 15 * u, 20 * u, BLUE, 'left', 700, MONO);
      else text('—', s.x + 10 * u, sy + sh - 15 * u, 18 * u, MUTED, 'left', 700, MONO);
      ctx.restore();
    }
  }

  function drawTool(L, s, d, recT, t) {
    const u = L.u, c = L.tool;
    panel(c.x, c.y, c.w, c.h, 12 * u, FIELD, INK, 2.5);
    text('道具（サーバー側・読み取り専用）', c.x + 14 * u, c.y + 15 * u, 12 * u, MUTED, 'left', 700);
    text('get_products', c.x + 14 * u, c.y + 36 * u, 19 * u, BLUE, 'left', 800, MONO);
    // 引数は実ストリームどおりに流す
    const args = streamedArgs(s, recT);
    const argStr = args ? args.replace(/\s+/g, ' ') : '';
    const aLines = wrap(argStr || '{ … }', c.w - 28 * u, 13 * u, MONO, 600).slice(0, 2);
    aLines.forEach((ln, i) => text(ln, c.x + 14 * u, c.y + 60 * u + i * 17 * u, 13 * u, INK, 'left', 600, MONO));
    if (t > d.map(d.toolResult)) {
      const n = s.products.length;
      text('→ 返り値：Product[]（' + n + '件）', c.x + 14 * u, c.y + c.h - 14 * u, 14 * u, ACCENT, 'left', 800, MONO);
    } else if (t > d.map(d.toolStart)) {
      ctx.fillStyle = ACCENT;
      const blink = 0.5 + 0.5 * Math.sin(t * 10);
      ctx.globalAlpha = blink;
      ctx.fillRect(c.x + 14 * u, c.y + c.h - 20 * u, 10 * u, 13 * u);
      ctx.globalAlpha = 1;
      text('実行中…', c.x + 30 * u, c.y + c.h - 14 * u, 13 * u, MUTED, 'left', 700);
    }
  }

  // 値チップが質問からゲートへ移動する
  function drawTravel(L, val, p, from, to) {
    if (p <= 0 || p >= 1) return;
    const u = L.u, k = smooth(p);
    const x = lerp(from.x, to.x, k), y = lerp(from.y, to.y, k);
    ctx.save();
    ctx.font = '700 ' + 15 * u + 'px ' + MONO;
    const w = ctx.measureText(val).width + 22 * u, h = 26 * u;
    panel(x - w / 2, y - h / 2, w, h, 13 * u, BLUE, null);
    text(val, x, y + 1, 15 * u, '#fff', 'center', 700, MONO);
    ctx.restore();
  }

  function productCard(x, y, w, h, pdt, u, big) {
    panel(x, y, w, h, 12 * u, FIELD, INK, 2.5);
    const ms = big ? Math.min(w * 0.46, h * 0.50) : Math.min(w * 0.44, h * 0.42);
    drawMug(x + w / 2, y + h * (big ? 0.36 : 0.34), ms, MUG[pdt.color] || INK);
    text(pdt.name, x + w / 2, y + h * (big ? 0.70 : 0.66), big ? 30 * u : 21 * u, INK, 'center', 800);
    text(yen(pdt.price) + '円', x + w / 2, y + h * (big ? 0.85 : 0.82), big ? 38 * u : 27 * u, ACCENT, 'center', 800);
  }

  // 横型カード（横画面）：左に大きなマグ、右に名前と価格
  function productCardH(x, y, w, h, pdt, u) {
    panel(x, y, w, h, 12 * u, FIELD, INK, 2.5);
    const ms = h * 0.56;
    drawMug(x + h * 0.62, y + h / 2, ms, MUG[pdt.color] || INK);
    const tx = x + h * 1.18;
    text(pdt.name, tx, y + h * 0.36, 28 * u, INK, 'left', 800);
    text(yen(pdt.price) + '円', tx, y + h * 0.72, 34 * u, ACCENT, 'left', 800);
  }

  function drawStage(t, W, H, L, s1, s2, d1, d2) {
    const u = L.u, st = L.stage;
    panel(st.x, st.y, st.w, st.h, 14 * u, PAPER, INK, 2.5);
    const r1In = smooth((t - (d1.map(d1.toolResult) + 0.2)) / 0.6);
    const p2 = smooth((t - 12.6) / 0.6);            // 質問2への切替
    const r2In = smooth((t - (d2.map(d2.toolResult) + 0.2)) / 0.6);
    if (L.tall) text('返り値の商品カード（実測の値）', st.x + 14 * u, st.y + 16 * u, 12 * u, MUTED, 'left', 700);
    else text('返り値の商品カード（実測の値）', L.m, 270 * u, 12 * u, MUTED, 'left', 700);

    // 回答の再生窓（縦のみ。全文はページの再生で。横では応答全文を省略）
    const cur = t < 12.6 ? {s: s1, d: d1} : {s: s2, d: d2};
    const win = cur.d;
    const showAns = L.tall && t > win.map(win.textStart) - 0.2;
    const ansH = showAns ? 58 * u : 0;
    const cardZone = L.tall
      ? {x: st.x + 12 * u, y: st.y + 30 * u, w: st.w - 24 * u, h: st.h - 44 * u - ansH}
      : {x: st.x + 16 * u, y: st.y + 12 * u, w: st.w - 32 * u, h: st.h - 24 * u};

    if (r1In <= 0) {
      // まだ返っていない：枠だけ先に見せる
      ctx.save(); ctx.setLineDash([6 * u, 5 * u]); ctx.globalAlpha = 0.7;
      panel(cardZone.x + cardZone.w * 0.5 - 160 * u, cardZone.y + cardZone.h * 0.5 - 75 * u, 320 * u, 150 * u, 12 * u, null, MUTED, 1.5);
      ctx.restore();
      text('ここに商品カードが返る', st.x + st.w / 2, cardZone.y + cardZone.h * 0.5, 15 * u, MUTED, 'center', 700);
      return;
    }

    const pdt1 = s1.products[0];
    if (p2 <= 0) {
      // 質問1：1枚の大きなカード
      const w = L.tall ? Math.min(cardZone.w * 0.86, 360 * u) : 520 * u;
      const h = L.tall ? cardZone.h * 0.96 : 150 * u;
      const grow = lerp(0.7, 1, r1In);
      ctx.save();
      ctx.translate(st.x + st.w / 2, cardZone.y + cardZone.h / 2);
      ctx.scale(grow, grow); ctx.globalAlpha = r1In;
      if (L.tall) productCard(-w / 2, -h / 2, w, h, pdt1, u, true);
      else productCardH(-w / 2, -h / 2, w, h, pdt1, u);
      ctx.restore();
    } else {
      // 質問2：1枚が小さく退き、2枚目が入る（位置・大きさで連続。縦は左右、横は左右）
      let single, left, right;
      if (L.tall) {
        const cw = (cardZone.w - 14 * u) / 2, ch = cardZone.h * 0.96;
        single = {x: st.x + st.w / 2 - Math.min(cardZone.w * 0.86, 360 * u) / 2, y: cardZone.y + cardZone.h / 2 - ch / 2, w: Math.min(cardZone.w * 0.86, 360 * u), h: ch};
        left = {x: cardZone.x, y: cardZone.y + cardZone.h / 2 - ch / 2, w: cw, h: ch};
        right = {x: cardZone.x + cw + 14 * u, y: cardZone.y + cardZone.h / 2 - ch / 2, w: cw, h: ch};
      } else {
        const cw = (cardZone.w - 18 * u) / 2, ch = 150 * u;
        single = {x: st.x + st.w / 2 - 520 * u / 2, y: cardZone.y + cardZone.h / 2 - ch / 2, w: 520 * u, h: ch};
        left = {x: cardZone.x, y: cardZone.y + cardZone.h / 2 - ch / 2, w: cw, h: ch};
        right = {x: cardZone.x + cw + 18 * u, y: cardZone.y + cardZone.h / 2 - ch / 2, w: cw, h: ch};
      }
      const m = smooth(p2);
      const r1 = {x: lerp(single.x, left.x, m), y: lerp(single.y, left.y, m), w: lerp(single.w, left.w, m), h: lerp(single.h, left.h, m)};
      ctx.save(); ctx.globalAlpha = Math.max(r1In, 0.001);
      if (L.tall) productCard(r1.x, r1.y, r1.w, r1.h, s2.products[0], u, false);
      else productCardH(r1.x, r1.y, r1.w, r1.h, s2.products[0], u);
      ctx.restore();
      const pdt2 = s2.products[1];
      ctx.save();
      ctx.translate(right.x + right.w / 2, right.y + right.h / 2);
      const g2 = lerp(0.7, 1, r2In);
      ctx.scale(g2, g2); ctx.globalAlpha = r2In;
      if (L.tall) productCard(-right.w / 2, -right.h / 2, right.w, right.h, pdt2, u, false);
      else productCardH(-right.w / 2, -right.h / 2, right.w, right.h, pdt2, u);
      ctx.restore();
      // 予算の条件チップ
      if (p2 > 0.9) {
        ctx.save(); ctx.globalAlpha = smooth((t - 13.2) / 0.5);
        ctx.font = '700 ' + 12 * u + 'px ' + MONO;
        const label = 'maxPrice = 2500';
        const mw = ctx.measureText(label).width + 12 * u * 1.2;
        if (L.tall) chip(st.x + st.w - mw - 8 * u, st.y + 8 * u, label, 12 * u, false, BLUE);
        else chip(W - L.m - mw, 256 * u, label, 12 * u, false, BLUE);
        ctx.restore();
      }
    }

    // 実際の応答テキスト（短く整えて表示。全文はページの再生で）
    if (showAns) {
      const recT = clamp(win.unmap(t), 0, win.dur);
      const full = cur.s.output;
      const shown = t >= win.map(win.textEnd) ? full : streamedText(cur.s, recT);
      const bx = st.x + 12 * u, bw = st.w - 24 * u, by = st.y + st.h - ansH - 4 * u;
      panel(bx, by, bw, ansH - 6 * u, 10 * u, FIELD, RULE, 1.5);
      text('応答', bx + 12 * u, by + 13 * u, 11 * u, MUTED, 'left', 800);
      const lines = wrap(shown, bw - 24 * u, 14 * u, SANS, 600).slice(0, 2);
      lines.forEach((ln, i) => text(ln, bx + 12 * u, by + 30 * u + i * 18 * u, 14 * u, INK, 'left', 600));
      if (t < win.map(win.textEnd) && t > win.map(win.textStart)) {
        const lx = bx + 12 * u + ctx.measureText(lines[lines.length - 1] || '').width + 6;
        ctx.fillStyle = ACCENT;
        ctx.fillRect(Math.min(lx, bx + bw - 16), by + 24 * u, 9, 14);
      }
    }
  }

  function drawNote(t, W, H, L) {
    const u = L.u;
    const p = smooth((t - 21.0) / 0.8);
    if (p <= 0) return;
    ctx.save(); ctx.globalAlpha = p;
    if (L.tall) {
      text('2問・2回の道具実行', L.m, H - 84 * u, 16 * u, INK, 'left', 800);
      text('実行記録の再生（2026-10-24・claude-opus-5-5）', L.m, H - 58 * u, 16 * u, INK, 'left', 800);
      text('TanStack/ai @98055ca01af9…・MIT ／ 八百万図AIツールボックス', L.m, H - 30 * u, 11 * u, MUTED, 'left', 600);
    } else {
      text('2問・2回の道具実行・実行記録の再生', L.m, H - 46 * u, 16 * u, INK, 'left', 800);
      text('TanStack/ai @98055ca…・MIT ／ 八百万図AIツールボックス', W - L.m, H - 46 * u, 11 * u, MUTED, 'right', 600);
    }
    ctx.restore();
  }

  function drawFrame(t) {
    const W = cfg.width, H = cfg.height, tall = H >= W;
    canvas.width = W; canvas.height = H;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
    if (!data) {
      text('実行記録を読み込んでいます…', W / 2, H / 2, 16, MUTED, 'center', 600);
      return;
    }
    const L = layout(W, H, tall);
    const s1 = samples['blue-mug'], s2 = samples['budget'];
    if (!s1 || !s2) {
      text('実行記録の中身が足りません（samples.json）', W / 2, H / 2, 16, MUTED, 'center', 600);
      return;
    }
    const u = L.u;
    // ミニ再生の時間配分：質問1 → [1.0, 11.2]、質問2 → [12.6, 20.8]（実記録の長さに比例）
    const d1 = derive(s1, 1.0, 11.2);
    const d2 = derive(s2, 12.6, 20.8);

    drawHeader(t, W, L, tall);

    // 質問チップ（質問2の開始で切替）
    const qLabel = t < 12.6 ? s1.label : s2.label;
    const qActive = (t > 1.0 && t < d1.map(d1.toolStart)) || (t > 12.6 && t < d2.map(d2.toolStart));
    drawQuestion(L, qLabel, qActive ? 1 : 0.25);

    // ゲートの値の状態
    const vQuery = t < 12.6
      ? (t > d1.map(d1.toolStart) - 0.3 ? '"blue"' : null)
      : (t > 12.9 ? '"all"' : '"blue"');
    const vMax = t < 12.6 ? null : (t > d2.map(d2.toolStart) - 0.3 ? '2500' : null);
    drawGate(L, vQuery, vMax);

    // 道具カード（実行中は質問1、質問2それぞれの再生位置を使う）
    const active = t < 12.6 ? d1 : d2;
    const actS = t < 12.6 ? s1 : s2;
    const recT = clamp(active.unmap(t), 0, active.dur);
    drawTool(L, actS, active, recT, t);

    // 値チップの移動
    const slotQ = {x: L.gate.x + 14 * u + (L.gate.w - 28 * u - 10 * u) / 4, y: L.gate.y + L.gate.h - 24 * u};
    const slotM = {x: L.gate.x + 14 * u + (L.gate.w - 28 * u - 10 * u) * 0.75 + 5 * u, y: L.gate.y + L.gate.h - 24 * u};
    const qMid = {x: L.q.x + L.q.w / 2, y: L.q.y + L.q.h / 2};
    if (t < 12.6) {
      drawTravel(L, 'query = "blue"', clamp((t - (d1.map(d1.toolStart) - 2.2)) / 1.9, 0, 1), qMid, slotQ);
    } else {
      drawTravel(L, 'maxPrice = 2500', clamp((t - (d2.map(d2.toolStart) - 2.2)) / 1.9, 0, 1), qMid, slotM);
    }

    // 接続矢印（点が流れる）
    if (L.tall) {
      arrow(L.q.x + L.q.w / 2, L.q.y + L.q.h + 3 * u, L.gate.x + L.gate.w / 2, L.gate.y - 4 * u, t);
      arrow(L.gate.x + L.gate.w / 2, L.gate.y + L.gate.h + 3 * u, L.tool.x + L.tool.w / 2, L.tool.y - 4 * u, t + 0.4);
      arrow(L.tool.x + L.tool.w / 2, L.tool.y + L.tool.h + 3 * u, L.stage.x + L.stage.w / 2, L.stage.y - 4 * u, t + 0.8);
    } else {
      arrow(L.q.x + L.q.w + 4 * u, L.q.y + L.q.h / 2, L.gate.x - 4 * u, L.gate.y + L.gate.h / 2, t);
      arrow(L.gate.x + L.gate.w + 4 * u, L.gate.y + L.gate.h / 2, L.tool.x - 4 * u, L.tool.y + L.tool.h / 2, t + 0.4);
      // 道具から下の結果行へ曲がって戻る返り値の矢印
      const tc = {x: L.tool.x + L.tool.w / 2, y: L.tool.y + L.tool.h};
      elbowArrow([
        {x: tc.x, y: tc.y + 4 * u},
        {x: tc.x, y: 284 * u},
        {x: 268 * u, y: 284 * u},
        {x: 268 * u, y: 298 * u},
      ], t + 0.8);
    }

    drawStage(t, W, H, L, s1, s2, d1, d2);
    drawNote(t, W, H, L);
  }

  // 同期seek：読み込み前は stub（bootが時刻を保管）のまま、読み込み後は即描画。
  window.seek = s => {
    const t = clamp(Number(s) || 0, 0, cfg.duration);
    window.__seekAt = t;
    drawFrame(t);
  };

  (async () => {
    try {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      const r = await fetch('../samples.json');
      if (!r.ok) throw new Error('samples.json を読めませんでした（HTTP ' + r.status + '）');
      data = await r.json();
      for (const s of data.samples) samples[s.id] = s;
      drawFrame(window.__seekAt || 0);
      boot.resolve();
    } catch (e) {
      drawFrame(0);
      boot.reject(e instanceof Error ? e : new Error(String(e)));
    }
  })();
})();
