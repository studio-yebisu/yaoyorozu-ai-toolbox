/* HatchZip 作例 — 26秒・無音の説明映像。Studio Yebisu, MIT.
   ZIP・4,096ファイルの実測トレース（../samples.json）だけから決定的に描く。
   原本（保持）・使い捨てコピー（削られる）・出力（育つ）の大きな図を画面に保ち、
   カウンタと比較を同じ図の中で読ませる。音声・乱数・壁時計・前フレームの状態には依存しない。 */
(() => {
  'use strict';

  const canvas = document.getElementById('film');
  const ctx = canvas.getContext('2d', {willReadFrequently: true});
  const cfg = window.motionConfig;
  const boot = window.__filmBoot;

  const PAPER = '#f2eee3', FIELD = '#fbf9f3', INK = '#17150f', MUTED = '#6b6455';
  const RULE = 'rgba(23,21,15,0.2)', ACCENT = '#ff4f00', SOFT = '#e7e1d0', BLUE = '#2749c9', LIME = '#cbef3a';
  const MINCHO = '"Hiragino Mincho ProN","Yu Mincho","YuMincho","BIZ UDPMincho","Noto Serif JP",serif';
  const SANS = '"Hiragino Sans","Hiragino Kaku Gothic ProN","Yu Gothic UI","Yu Gothic","YuGothic",Meiryo,"Noto Sans JP",system-ui,sans-serif';
  const MONO = '"Cascadia Mono",Consolas,"Courier New",monospace';

  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const smooth = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const lerp = (a, b, k) => a + (b - a) * k;
  const fmt = n => n.toLocaleString('ja-JP');
  const mib = n => (n / 1048576).toFixed(2);

  let data = null, sample = null; // zip-stored（最大のトレース）を使う

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
  function seal(cx, cy, r, u, main, sub) {
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = ACCENT; ctx.fill();
    ctx.strokeStyle = PAPER; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, r - 5 * u, 0, Math.PI * 2); ctx.stroke();
    text(main, cx, cy - (sub ? 8 * u : 0), sub ? 15 * u : 16 * u, PAPER, 'center', 800);
    if (sub) text(sub, cx, cy + 12 * u, 19 * u, PAPER, 'center', 800);
    ctx.restore();
  }
  function checkBadge(x, y, u, str, p) {
    if (p <= 0) return;
    ctx.save(); ctx.globalAlpha = p;
    ctx.beginPath(); ctx.arc(x + 10 * u, y, 10 * u, 0, Math.PI * 2);
    ctx.fillStyle = ACCENT; ctx.fill();
    text('✓', x + 10 * u, y + 1, 12 * u, '#fff', 'center', 800);
    text(str, x + 26 * u, y + 1, 15 * u, INK, 'left', 800);
    ctx.restore();
    return ctx.measureText(str).width + 34 * u;
  }

  // 実測トレースの補間
  function at(time) {
    const tr = sample.trace;
    if (time <= tr[0].seconds) return tr[0];
    const last = tr[tr.length - 1];
    if (time >= last.seconds) return last;
    for (let i = 1; i < tr.length; i++) {
      if (tr[i].seconds >= time) {
        const a = tr[i - 1], b = tr[i];
        const k = (time - a.seconds) / (b.seconds - a.seconds || 1);
        return {
          seconds: time,
          archive_bytes: a.archive_bytes + (b.archive_bytes - a.archive_bytes) * k,
          output_bytes: a.output_bytes + (b.output_bytes - a.output_bytes) * k,
          sidecar_bytes: a.sidecar_bytes + (b.sidecar_bytes - a.sidecar_bytes) * k,
          total_bytes: a.total_bytes + (b.total_bytes - a.total_bytes) * k,
          output_files: a.output_files,
        };
      }
    }
    return last;
  }

  // ---------- 配置 ----------
  function layout(W, H, tall) {
    const u = tall ? W / 540 : H / 540;
    if (tall) {
      const m = 28 * u;
      return {u, m, tall,
        orig: {x: m, w: 140 * u, h: 88 * u},
        copy: {x: 206 * u, w: 170 * u, hMax: 380 * u},
        out: {x: 404 * u},
        gridTop: 200 * u, ground: 620 * u,
        cnt1Y: 136 * u, cnt2Y: 170 * u,
        progY: 698 * u, capY: 716 * u,
        cmp1LabelY: 748 * u, cmp1BarY: 758 * u, cmp2LabelY: 800 * u, cmp2BarY: 810 * u,
        barH: 28 * u, caveatY: 862 * u, noteY: 884 * u, statY: 908 * u, creditY: 932 * u};
    }
    const m = 40 * u;
    return {u, m, tall,
      orig: {x: m, w: 130 * u, h: 64 * u},
      copy: {x: 210 * u, w: 150 * u, hMax: 150 * u},
      out: {x: 398 * u},
      gridTop: 160 * u, ground: 330 * u,
      cntY: 118 * u,
      progY: 396 * u, capY: 414 * u, noteY: 432 * u,
      cmp1LabelY: 448 * u, cmp1BarY: 458 * u, cmp2LabelY: 488 * u, cmp2BarY: 498 * u,
      barH: 20 * u, statX: 210 * u, statYs: [204 * u, 240 * u, 276 * u], creditY: 432 * u};
  }

  function drawHeader(t, W, L) {
    const u = L.u;
    text('STUDIO YEBISU 作例・無音の説明映像', L.m, 30 * u, 12 * u, MUTED, 'left', 700);
    ctx.fillStyle = ACCENT; ctx.fillRect(L.m, 40 * u, 30 * u, 3.5 * u);
    text('アーカイブを縮めて、出力を育てる。', L.m, 64 * u, L.tall ? 27 * u : 23 * u, INK, 'left', 700, MINCHO);
    const step = t < 9.2 ? '1／使い捨てコピーを展開する（実測トレース）'
      : t < 12.6 ? '2／展開できたものを照合する'
      : t < 16.4 ? '3／観測した最大と、従来どおり展開した場合'
      : '4／この実行の結論';
    text(step, L.m, (L.tall ? 104 : 88) * u, 15 * u, ACCENT, 'left', 800);
  }

  // ---------- 1つの図：原本・コピー・出力 ----------
  function drawDiagram(t, W, H, L) {
    const u = L.u;
    const init = sample.trace[0];
    const dur = sample.duration_seconds;
    // トレース再生：film [0.7, 9.2] → record [0, dur]
    const recT = clamp((t - 0.7) / 8.5, 0, 1) * dur;
    const cur = at(recT);
    const done = t >= 9.2;

    // カウンタ（2行に分けて重ならないように。数値はサンプルから導く）
    const c1v = fmt(sample.result.file_count) + '件中 ' + fmt(cur.output_files) + '件';
    const c2v = mib(Math.round(cur.archive_bytes)) + ' MiB';
    if (L.tall) {
      ctx.font = '700 ' + 13 * u + 'px ' + SANS;
      const l1 = ctx.measureText('出力ファイル').width;
      text('出力ファイル', L.m, L.cnt1Y, 13 * u, MUTED, 'left', 700);
      text(c1v, L.m + l1 + 14 * u, L.cnt1Y, 26 * u, INK, 'left', 800, MONO);
      const l2 = ctx.measureText('残コピー').width;
      text('残コピー', L.m, L.cnt2Y, 13 * u, MUTED, 'left', 700);
      text(c2v, L.m + l2 + 14 * u, L.cnt2Y, 26 * u, cur.archive_bytes < 1000 ? MUTED : ACCENT, 'left', 800, MONO);
    } else {
      ctx.font = '700 ' + 13 * u + 'px ' + SANS;
      const l1 = ctx.measureText('出力ファイル').width;
      text('出力ファイル', L.m, L.cntY, 13 * u, MUTED, 'left', 700);
      text(c1v, L.m + l1 + 12 * u, L.cntY, 24 * u, INK, 'left', 800, MONO);
      ctx.font = '800 ' + 24 * u + 'px ' + MONO;
      const vw = ctx.measureText(c2v).width;
      ctx.font = '700 ' + 13 * u + 'px ' + SANS;
      const l2 = ctx.measureText('残コピー').width;
      text(c2v, W - L.m - vw, L.cntY, 24 * u, cur.archive_bytes < 1000 ? MUTED : ACCENT, 'left', 800, MONO);
      text('残コピー', W - L.m - vw - 12 * u - l2, L.cntY, 13 * u, MUTED, 'left', 700);
    }

    const ground = L.ground;

    // 原本（常に保持。動かさない）
    const o = L.orig;
    panel(o.x, ground - o.h, o.w, o.h, 8 * u, FIELD, INK, 2);
    text('原本', o.x + 14 * u, ground - o.h + 20 * u, 19 * u, INK, 'left', 800);
    const bw = chip(o.x + o.w - 52 * u, ground - o.h + 8 * u, '保持', 11 * u, false, ACCENT);
    void bw;
    text('原本アーカイブ', o.x + o.w / 2, ground + 18 * u, 13 * u, INK, 'center', 800);
    ctx.font = '600 ' + 10 * u + 'px ' + MONO;
    text('SHA-256 ' + sample.archive.archive_sha256.slice(0, 10) + '…', o.x + o.w / 2, ground + 36 * u, 10 * u, BLUE, 'center', 600, MONO);
    text(mib(sample.archive.archive_bytes) + ' MiB', o.x + o.w / 2, ground + 52 * u, 11 * u, MUTED, 'center', 600, MONO);

    // コピー（トレースどおり縮む）
    const c = L.copy;
    const frac = cur.archive_bytes / init.archive_bytes;
    const ch = Math.max(2 * u, c.hMax * frac);
    ctx.fillStyle = ACCENT;
    ctx.fillRect(c.x, ground - ch, c.w, ch);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let y = ground - ch; y < ground; y += 7 * u) { ctx.moveTo(c.x, y); ctx.lineTo(c.x + c.w, y + c.w * 0.45); }
    ctx.stroke();
    const cLbl = mib(Math.round(cur.archive_bytes)) + ' MiB';
    if (ch > 46 * u) text(cLbl, c.x + c.w / 2, ground - ch / 2, L.tall ? 20 * u : 16 * u, '#fff', 'center', 800, MONO);
    else if (!done || cur.archive_bytes > 0) text(cLbl, c.x + c.w / 2, ground - ch - 14 * u, L.tall ? 16 * u : 14 * u, ACCENT, 'center', 800, MONO);
    text('使い捨てコピー', c.x + c.w / 2, ground + 18 * u, 13 * u, INK, 'center', 800);
    text('（展開とともに削れる）', c.x + c.w / 2, ground + 36 * u, 10 * u, MUTED, 'center', 600);

    // コピー → 出力 の矢印
    const ay = ground - c.hMax * 0.4;
    ctx.strokeStyle = MUTED; ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(c.x + c.w + 8 * u, ay); ctx.lineTo(L.out.x - 10 * u, ay);
    ctx.lineTo(L.out.x - 18 * u, ay - 7 * u);
    ctx.moveTo(L.out.x - 10 * u, ay); ctx.lineTo(L.out.x - 18 * u, ay + 7 * u);
    ctx.stroke();
    const k = (t * 0.6) % 1;
    ctx.beginPath(); ctx.arc(lerp(c.x + c.w + 10 * u, L.out.x - 12 * u, k), ay, 3.2 * u, 0, Math.PI * 2);
    ctx.fillStyle = ACCENT; ctx.fill();

    // 出力（育つ）
    const o2 = L.out;
    const R = W - L.m - o2.x;
    ctx.strokeStyle = RULE; ctx.lineWidth = 1.5;
    ctx.strokeRect(o2.x, L.gridTop, R, ground - L.gridTop);
    const cols = L.tall ? 5 : 12;
    const cap = L.tall ? 40 : 60;
    const ts = Math.min(L.tall ? 19 * u : 20 * u, (R - 12 * u) / cols - 3 * u);
    const filled = Math.min(cap, Math.ceil(sample.result.file_count ? cur.output_files / sample.result.file_count * cap : 0));
    for (let i = 0; i < filled; i++) {
      const cxx = o2.x + 6 * u + (i % cols) * (ts + 3 * u);
      const cyy = ground - 6 * u - ts - Math.floor(i / cols) * (ts + 3 * u);
      if (cyy < L.gridTop + 3 * u) break;
      ctx.fillStyle = INK;
      ctx.fillRect(cxx, cyy, ts, ts);
    }
    text(mib(Math.round(cur.output_bytes)) + ' MiB', o2.x + R / 2, ground + 18 * u, L.tall ? 20 * u : 18 * u, INK, 'center', 800, MONO);
    text('出力（' + fmt(sample.result.file_count) + '件）', o2.x + R / 2, ground + 38 * u, 12 * u, INK, 'center', 800);
    text('原本のコピーから展開したもの', o2.x + R / 2, ground + 54 * u, 10 * u, MUTED, 'center', 600);

    // 完了の印
    if (done) {
      const p = smooth((t - 9.4) / 0.5);
      if (p > 0) {
        ctx.save(); ctx.globalAlpha = p;
        seal(o2.x + R / 2, (L.gridTop + ground) / 2 - 12 * u, 46 * u, u, fmt(sample.result.file_count) + '件', null);
        text('SHA-256 一致', o2.x + R / 2, (L.gridTop + ground) / 2 + 52 * u, 14 * u, INK, 'center', 800);
        ctx.restore();
      }
    }

    // 進捗バー
    ctx.fillStyle = SOFT;
    ctx.fillRect(L.m, L.progY, W - 2 * L.m, 6 * u);
    ctx.fillStyle = LIME;
    ctx.fillRect(L.m, L.progY, (W - 2 * L.m) * clamp(recT / dur, 0, 1), 6 * u);
    text('実測トレース（このPCの実行記録。速度の比較ではありません）', L.m, L.capY, 11 * u, MUTED, 'left', 600);
  }

  // ---------- 観測最大と従来の比較（同じ図の下） ----------
  function drawCompare(t, W, H, L) {
    const u = L.u;
    const peak = sample.observed_peak_bytes;
    const conv = sample.conventional_final_coexistence_bytes;
    const max = Math.max(peak, conv);
    const rows = [
      {name: '観測最大', sub: 'この実行の観測最大', v: peak, color: ACCENT, start: 12.8, labelY: L.cmp1LabelY, barY: L.cmp1BarY},
      {name: '元ZIPと出力の共存', sub: '従来どおり展開した場合', v: conv, color: INK, start: 13.4, labelY: L.cmp2LabelY, barY: L.cmp2BarY},
    ];
    rows.forEach(r => {
      text(r.name, L.m, r.labelY, L.tall ? 13 * u : 12 * u, INK, 'left', 800);
      text(r.sub, L.m + ctx.measureText(r.name).width + 12 * u, r.labelY, 10 * u, MUTED, 'left', 600);
      const barW = W - 2 * L.m;
      panel(L.m, r.barY, barW, L.barH, L.barH / 2, SOFT, RULE, 1);
      const w = barW * (r.v / max) * smooth((t - r.start) / 1.2);
      ctx.fillStyle = r.color;
      if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(L.m, r.barY, w, L.barH, L.barH / 2); ctx.fill(); }
      else ctx.fillRect(L.m, r.barY, w, L.barH);
      const p = smooth((t - r.start - 1.0) / 0.4);
      if (p > 0) {
        ctx.save(); ctx.globalAlpha = p;
        const val = mib(r.v) + ' MiB';
        const vs = L.tall ? 16 * u : 14 * u;
        if (w > 120 * u) text(val, L.m + w - 10 * u, r.barY + L.barH / 2 + 1, vs, '#fff', 'right', 800, MONO);
        else text(val, L.m + w + 10 * u, r.barY + L.barH / 2 + 1, vs, r.color, 'left', 800, MONO);
        ctx.restore();
      }
    });
    // 測り方の注記と圧縮ZIPの短い留保（詳細はページ）
    if (L.tall) {
      const zp = smooth((t - 16.6) / 0.6);
      if (zp > 0) {
        ctx.save(); ctx.globalAlpha = zp;
        text('圧縮率が高いZIPでは効果が小さい。', L.m, L.caveatY, 13 * u, INK, 'left', 700);
        ctx.restore();
      }
      text('論理サイズの観測値であり、物理ディスク使用量の保証ではありません。', L.m, L.noteY, 10 * u, MUTED, 'left', 600);
    } else {
      text('論理サイズの観測値（物理ディスク保証ではありません）／ 圧縮率が高いZIPでは効果が小さい。', L.m, L.noteY, 10 * u, MUTED, 'left', 600);
    }
  }

  // ---------- 結論のバッジとクレジット ----------
  function drawConclusion(t, W, H, L) {
    const u = L.u;
    const p = smooth((t - 19.8) / 0.7);
    if (p <= 0) return;
    const credit = 'HatchZip v0.1.2 @2b754c85…・MIT OR Apache-2.0 ／ 八百万図AIツールボックス';
    const items = ['コピー消費', '出力一致', '原本保持'];
    ctx.save(); ctx.globalAlpha = p;
    if (L.tall) {
      let x = L.m;
      for (const s of items) {
        const w = checkBadge(x, L.statY, u, s, p);
        x += (w || 110 * u) + 16 * u;
      }
      text(credit, W - L.m, L.creditY, 10 * u, MUTED, 'right', 600);
    } else {
      // 横では消費されて空いたコピー列の中に縦並びで置く（注記とは重ねない）
      items.forEach((s, i) => checkBadge(L.statX, L.statYs[i], u, s, p));
      text(credit, W - L.m, L.creditY, 10 * u, MUTED, 'right', 600);
    }
    ctx.restore();
  }

  function drawFrame(t) {
    const W = cfg.width, H = cfg.height, tall = H >= W;
    canvas.width = W; canvas.height = H;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
    if (!data || !sample) {
      text('実測記録を読み込んでいます…', W / 2, H / 2, 16, MUTED, 'center', 600);
      return;
    }
    const L = layout(W, H, tall);
    drawHeader(t, W, L);
    drawDiagram(t, W, H, L);
    if (t > 12.4) drawCompare(t, W, H, L);
    drawConclusion(t, W, H, L);
  }

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
      sample = data.samples.find(s => s.id === 'zip-stored') || data.samples[0];
      drawFrame(window.__seekAt || 0);
      boot.resolve();
    } catch (e) {
      drawFrame(0);
      boot.reject(e instanceof Error ? e : new Error(String(e)));
    }
  })();
})();
