/* 受け止めた瞬間の、青い防御ヒット — capture viewer. 八百万図AIツールボックス original (MIT).
   Shows the PNGs Godot rendered during production (capture-manifest.json). It does not run Godot or Effekseer
   and draws nothing of the effect itself. */
(() => {
  'use strict';

  const LAST = 30;
  const FPS = 60;
  const START = 10; // a readable still: the blue face after the contact star has gone

  // What is on screen, from the brief's beats and the real captures. Frame ranges are inclusive.
  const PHASES = [
    {from: 0, to: 1, name: '開始前', text: 'まだ何も出ていません。f0とf1は、効果のない舞台と同じ画像です。'},
    {from: 2, to: 3, name: '輪郭', text: '薄い盾の輪郭が、下から両側へ伸びていきます。塗りも星もまだありません。'},
    {from: 4, to: 5, name: '接点', text: '輪郭がほぼ一周し、f5で受け止めた位置に短い白い星が出ます。'},
    {from: 6, to: 8, name: '接点から青い面へ', text: '白い星の下に青い面が現れます。いちばん明るい数フレームです。'},
    {from: 9, to: 12, name: '波紋', text: '星は消え、青い面の上を波紋が広がり、模様が流れます。左のダミーは面の横と奥に見えています。'},
    {from: 13, to: 17, name: '割れる', text: '面が穴のあいた形に崩れ、暗い隙間で6枚の破片に分かれます。小さな欠片も出ます。'},
    {from: 18, to: 23, name: '破片', text: '破片が離れながら向きを変え、薄く、穴が増えていきます。'},
    {from: 24, to: 29, name: '消えていく', text: '残った青い破片と欠片が薄れて消えます。'},
    {from: 30, to: 30, name: '消失', text: '効果は残っていません。ダミーだけが立っています。'}
  ];
  const ALT = {
    0: '効果が出る前の舞台。左に防御する側、右に攻撃する側のダミー。',
    2: '左のダミーの横に、下半分だけの白く細い弧。',
    6: '左のダミーの横の楕円に、白い星と青い面。',
    10: '左のダミーの横で、青い面に波紋が広がっている。',
    16: '面が崩れ、隙間を挟んだ6枚の青い破片になっている。',
    23: '青い破片が離れて散り、薄くなっている。',
    30: '効果は消え、二体のダミーだけが立っている。'
  };

  const $ = id => document.getElementById(id);
  const img = $('frame'), stage = $('stage'), scrub = $('scrub');
  const playBtn = $('play'), prevBtn = $('prev'), nextBtn = $('next');
  const viewFull = $('view-full'), viewCrop = $('view-crop'), cropTag = $('crop-tag');
  const outFrame = $('readout-frame'), outTime = $('readout-time'), outPhase = $('readout-phase');
  const phaseText = $('phase-text'), loadStatus = $('load-status'), marker = $('track-marker');
  const keyButtons = Array.from(document.querySelectorAll('#keys [data-frame]'));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Paths come from capture-manifest.json; the same names are the fallback when it cannot be fetched (file://).
  const pad = n => String(n).padStart(3, '0');
  let paths = Array.from({length: LAST + 1}, (_, f) => 'assets/frames/guard-f' + pad(f) + '.png');
  const loaded = [];

  let frame = START;
  let playing = false, raf = 0, t0 = 0, fromFrame = 0;

  const phaseOf = f => PHASES.find(p => f >= p.from && f <= p.to);
  const seconds = f => (f / FPS).toFixed(3) + '秒';
  const speed = () => Number((document.querySelector('input[name="speed"]:checked') || {}).value || 1);

  const altFor = f => 'Godotで描画したf' + f + '（' + seconds(f) + '）。' + (ALT[f] || phaseOf(f).text);

  function show(f, announce) {
    frame = Math.max(0, Math.min(LAST, f | 0));
    img.src = loaded[frame] ? loaded[frame].src : paths[frame];
    img.alt = altFor(frame);
    const p = phaseOf(frame);
    scrub.value = String(frame);
    scrub.setAttribute('aria-valuetext', 'f' + frame + '、' + seconds(frame) + '、' + p.name);
    outFrame.value = 'f' + frame;
    outTime.value = seconds(frame);
    outPhase.textContent = p.name;
    marker.style.left = ((frame + 0.5) / (LAST + 1) * 100) + '%';
    for (const b of keyButtons) {
      if (Number(b.dataset.frame) === frame) b.setAttribute('aria-current', 'true');
      else b.removeAttribute('aria-current');
    }
    // Announce only when the user moves; during playback the text would be read out 30 times.
    if (announce) phaseText.textContent = 'f' + frame + '：' + p.text;
  }

  function setPlayLabel() {
    playBtn.textContent = playing ? '一時停止' : '最初から再生';
    playBtn.setAttribute('aria-pressed', playing ? 'true' : 'false');
  }

  function stop() {
    if (!playing) return;
    playing = false;
    cancelAnimationFrame(raf);
    setPlayLabel();
    show(frame, true);
  }

  // The shown frame is derived from elapsed time and the chosen speed, never accumulated.
  function tick(now) {
    if (!playing) return;
    const f = fromFrame + Math.floor((now - t0) / 1000 * FPS * speed());
    if (f >= LAST) { show(LAST, false); stop(); return; }
    if (f !== frame) show(f, false);
    raf = requestAnimationFrame(tick);
  }

  function play() {
    if (playing) { stop(); return; }
    show(0, false);
    playing = true;
    fromFrame = frame;
    t0 = performance.now();
    setPlayLabel();
    raf = requestAnimationFrame(tick);
  }

  function seek(f) { stop(); show(f, true); setPlayLabel(); }

  function setView(view) {
    stage.dataset.view = view;
    viewFull.setAttribute('aria-pressed', view === 'full' ? 'true' : 'false');
    viewCrop.setAttribute('aria-pressed', view === 'crop' ? 'true' : 'false');
    cropTag.hidden = view !== 'crop';
  }

  playBtn.addEventListener('click', play);
  prevBtn.addEventListener('click', () => seek(frame - 1));
  nextBtn.addEventListener('click', () => seek(frame + 1));
  scrub.addEventListener('input', () => seek(Number(scrub.value)));
  for (const b of keyButtons) b.addEventListener('click', () => seek(Number(b.dataset.frame)));
  // A speed change restarts the clock from the current frame so the picture does not jump.
  for (const r of document.querySelectorAll('input[name="speed"]')) {
    r.addEventListener('change', () => { if (playing) { fromFrame = frame; t0 = performance.now(); } });
  }
  viewFull.addEventListener('click', () => setView('full'));
  viewCrop.addEventListener('click', () => setView('crop'));

  stage.addEventListener('keydown', e => {
    const to = {ArrowLeft: frame - 1, ArrowRight: frame + 1, Home: 0, End: LAST}[e.key];
    if (to === undefined) return;
    e.preventDefault();
    seek(to);
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });

  // Phones start on the crop so the defender is large; the full stage stays one button away.
  if (window.matchMedia('(max-width: 640px)').matches) setView('crop');
  // With reduced motion, playback (when the user starts it) defaults to the slower speed.
  if (reduce.matches) {
    const slow = document.querySelector('input[name="speed"][value="0.25"]');
    if (slow) slow.checked = true;
  }
  show(START, false);

  /* ---------- Preload every frame before playback ---------- */

  function preload(src) {
    return new Promise(resolve => {
      const im = new Image();
      im.onload = () => (im.decode ? im.decode().catch(() => {}) : Promise.resolve()).then(() => resolve(im));
      im.onerror = () => resolve(null);
      im.src = src;
    });
  }

  function readManifest() {
    return fetch('capture-manifest.json')
      .then(r => (r.ok ? r.json() : null))
      .then(m => {
        if (!m || !Array.isArray(m.frames)) return;
        const byFrame = new Map(m.frames.map(x => [x.frame, x.path]));
        paths = paths.map((p, f) => byFrame.get(f) || p);
      })
      .catch(() => {});
  }

  readManifest().then(() => {
    let done = 0;
    loadStatus.textContent = 'フレームを読み込んでいます（0/' + (LAST + 1) + '）。';
    return Promise.all(paths.map((src, f) => preload(src).then(im => {
      loaded[f] = im;
      done += 1;
      loadStatus.textContent = 'フレームを読み込んでいます（' + done + '/' + (LAST + 1) + '）。';
    })));
  }).then(() => {
    const missing = loaded.map((im, f) => (im ? -1 : f)).filter(f => f >= 0);
    if (missing.length) {
      loadStatus.textContent = '読み込めなかったフレームがあります：' + missing.map(f => 'f' + f).join('、') + '。再生はできません。1枚ずつの表示は、読み込めたフレームだけ正しく出ます。';
      loadStatus.classList.add('error');
      return;
    }
    loadStatus.textContent = '31枚のフレームを読み込みました。再生は f30 で止まります。';
    playBtn.disabled = false;
    setPlayLabel();
  });

  /* ---------- Copy the request ---------- */

  const copyBtn = $('copy'), copyStatus = $('copy-status'), requestText = $('request-text');
  copyBtn.addEventListener('click', () => {
    copyStatus.className = 'copy-status';
    copyStatus.textContent = '';
    const fail = () => {
      copyStatus.classList.add('error');
      copyStatus.textContent = 'コピーできませんでした。文章を選択して、手動でコピーしてください。';
    };
    if (!navigator.clipboard || !navigator.clipboard.writeText) { fail(); return; }
    navigator.clipboard.writeText(requestText.textContent).then(() => {
      copyStatus.classList.add('ok');
      copyStatus.textContent = 'コピーしました。';
    }, fail);
  });
})();
