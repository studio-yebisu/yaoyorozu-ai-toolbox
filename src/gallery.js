/* Yaoyorozu AI ToolBox — home page case preview. A native <dialog> for one produced case: its responsive
   muted video, its local demo framed only on request, and its request text. Load after media.js, before
   app.js. Exposes SY.casePreview.open(item, meta) where meta = {invoker, title, skill, category, href}.
   Nothing here runs AI: the demo pages show samples produced in advance. */
(() => {
  'use strict';

  const {h, safeHref, isExternal} = window.SY;

  // Only demo pages shipped with this site are framed; anything else stays a plain link.
  const LOCAL_DEMO = /^examples\/[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*\.html?(?:#[A-Za-z0-9._-]*)?$/;
  const VIDEO_TYPES = {mp4: 'video/mp4', m4v: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime'};
  const DEMO_NOTE = 'デモには事前に制作したサンプルを表示します。このページ上でAIは実行しません。';
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const root = document.documentElement;

  function localDemo(url) {
    if (!url || !LOCAL_DEMO.test(url)) return null;
    if (url.split(/[/#]/).some(part => part === '.' || part === '..')) return null;
    try {
      const resolved = new URL(url, location.href);
      return resolved.protocol === location.protocol && resolved.host === location.host ? url : null;
    } catch (_) {
      return null;
    }
  }

  function videoType(url) {
    const match = /\.([a-z0-9]+)(?:[?#]|$)/i.exec(url);
    return (match && VIDEO_TYPES[match[1].toLowerCase()]) || null;
  }

  // Existing demos are standalone pages. Keep their internal navigation in the frame, but let
  // links back to the site leave it instead of nesting another home page inside this preview.
  function connectDemo(frame, demo) {
    frame.addEventListener('load', () => {
      let doc;
      try { doc = frame.contentDocument; } catch (_) { return; }
      if (!doc) return;
      const base = new URL('.', new URL(demo, location.href));
      doc.addEventListener('click', event => {
        if (event.defaultPrevented) return;
        const link = event.target.closest && event.target.closest('a[href]');
        if (!link || link.hasAttribute('download') || link.target === '_blank') return;
        const href = safeHref(link.getAttribute('href'));
        if (!href) return;
        const target = new URL(href, doc.baseURI);
        if (target.origin === base.origin && target.pathname.startsWith(base.pathname)) return;
        link.target = target.origin === base.origin ? '_top' : '_blank';
        if (link.target === '_blank') link.rel = 'noopener noreferrer';
      });
      doc.addEventListener('keydown', event => {
        if (event.key !== 'Escape' || event.defaultPrevented || !ui.dialog.open) return;
        const target = event.target;
        // Let native editing controls clear a search or dismiss their own picker first.
        if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
        event.preventDefault();
        ui.dialog.close();
      });
    });
  }

  const sentences = text => String(text || '').trim().match(/[^。]+(?:。|$)/g) || [];
  const firstSentence = text => sentences(text)[0] || '';

  // The opening sentences, about two lines' worth; the article holds the rest.
  function lead(text) {
    let result = '';
    for (const part of sentences(text)) {
      if (result && result.length + part.length > 110) break;
      result += part;
    }
    return result;
  }

  function closeIcon() {
    const svg = document.createElementNS(SVG_NS, 'svg');
    for (const [key, value] of Object.entries({viewBox: '0 0 24 24', width: '24', height: '24', 'aria-hidden': 'true', focusable: 'false', class: 'icon'})) svg.setAttribute(key, value);
    for (const d of ['M6 6l12 12', 'M18 6 6 18']) {
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', d);
      svg.append(path);
    }
    return svg;
  }

  /* ---------- Dialog frame (built once, on first open) ---------- */

  let ui = null;
  let current = null;
  let labelTimer = 0;

  function build() {
    const dialog = h('dialog', {class: 'preview', 'aria-labelledby': 'preview-title'});
    ui = {
      dialog,
      close: h('button', {type: 'button', class: 'preview-close', autofocus: true}, closeIcon(), h('span', {}, '閉じる')),
      meta: h('p', {class: 'preview-meta'}),
      title: h('h2', {id: 'preview-title', class: 'preview-title'}),
      switcher: h('div', {class: 'preview-switch', role: 'group', 'aria-label': '表示するもの'}),
      videoBtn: h('button', {type: 'button', class: 'preview-tab', 'aria-controls': 'preview-stage', 'aria-pressed': 'true'}),
      demoBtn: h('button', {type: 'button', class: 'preview-tab', 'aria-controls': 'preview-stage', 'aria-pressed': 'false'}, 'デモを試す'),
      stage: h('div', {class: 'preview-stage', id: 'preview-stage'}),
      caption: h('p', {class: 'preview-caption'}),
      share: h('div', {class: 'preview-share'}),
      summary: h('p', {class: 'preview-summary'}),
      itemActions: h('div', {class: 'preview-item-actions'}),
      note: h('p', {class: 'preview-note'}, DEMO_NOTE),
      copy: h('button', {type: 'button', class: 'btn btn-ink'}, '依頼文をコピー'),
      demoLink: h('a', {class: 'btn btn-line'}, 'デモを別ページで開く'),
      readLink: h('a', {class: 'btn btn-line'}, '記事を読む'),
      hint: h('p', {class: 'preview-hint'}),
      promptText: h('pre', {class: 'preview-prompt-text', tabindex: '0', 'aria-label': '依頼文'}),
      live: h('p', {class: 'sr-only', role: 'status', 'aria-live': 'polite'})
    };
    ui.prompt = h('details', {class: 'preview-prompt'}, h('summary', {}, '依頼文を表示'), ui.promptText);
    ui.switcher.append(ui.videoBtn, ui.demoBtn);
    ui.sheet = h('div', {class: 'preview-sheet'},
      h('div', {class: 'preview-bar'}, ui.meta, ui.close),
      h('div', {class: 'preview-body'},
        ui.title,
        ui.summary,
        h('div', {class: 'preview-media'}, ui.switcher, ui.stage, ui.caption),
        h('div', {class: 'preview-info'},
          ui.itemActions,
          ui.note,
          h('div', {class: 'preview-actions'}, ui.copy, ui.demoLink, ui.readLink),
          ui.hint,
          ui.prompt),
        ui.share),
      ui.live);
    dialog.append(ui.sheet);
    document.body.append(dialog);

    ui.close.addEventListener('click', () => dialog.close());
    ui.videoBtn.addEventListener('click', () => show('media'));
    ui.demoBtn.addEventListener('click', () => {
      show('demo');
      say('デモを表示しました。枠の中で操作できます。');
    });
    ui.copy.addEventListener('click', copyRequest);

    // A click that both starts and ends outside the sheet lands on the dialog itself: close.
    // Selecting text inside and releasing over the backdrop does not.
    let pressedOutside = false;
    dialog.addEventListener('pointerdown', event => { pressedOutside = event.target === dialog; });
    dialog.addEventListener('click', event => {
      if (event.target === dialog && pressedOutside) dialog.close();
      pressedOutside = false;
    });
    // Native dialog makes the page inert; keep boundary Tab presses in the sheet as well.
    dialog.addEventListener('keydown', event => {
      if (event.key !== 'Tab') return;
      const controls = Array.from(dialog.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), summary, iframe, video[controls], [tabindex]:not([tabindex="-1"])'))
        .filter(el => {
          const closed = el.closest('details:not([open])');
          return el.getClientRects().length && !el.closest('[hidden]') && (!closed || closed.querySelector('summary') === el);
        });
      const first = controls[0];
      const last = controls[controls.length - 1];
      if ((event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    });
    dialog.addEventListener('close', onClose);
  }

  function say(message) {
    // The page's own announcer is inert behind the modal, so the dialog keeps its own.
    ui.live.textContent = '';
    setTimeout(() => { ui.live.textContent = message; }, 30);
  }

  /* ---------- Media ---------- */

  function stopMedia() {
    window.SY.media.destroy(ui.stage);
    for (const player of ui.stage.querySelectorAll('video')) {
      player.pause();
      for (const source of player.querySelectorAll('source')) source.remove();
      player.removeAttribute('src');
      player.load(); // drops the buffered data and any pending request
    }
    ui.stage.replaceChildren(); // removing the iframe unloads the demo
  }

  function still(message) {
    const {item, meta} = current;
    const poster = safeHref(item.poster);
    const box = h('div', {class: 'preview-still'});
    if (poster) {
      const img = h('img', {src: poster, alt: meta.title + 'の画像', width: '1280', height: '720', decoding: 'async'});
      img.addEventListener('error', () => img.remove());
      box.append(img);
    }
    if (message) box.append(h('p', {class: 'preview-still-note'}, message));
    return box;
  }

  function show(mode) {
    stopMedia();
    const {item, meta} = current;
    const demo = mode === 'demo' && localDemo(safeHref(item.demo));
    ui.videoBtn.setAttribute('aria-pressed', String(!demo));
    ui.demoBtn.setAttribute('aria-pressed', String(Boolean(demo)));
    ui.stage.classList.toggle('is-demo', Boolean(demo));

    if (demo) {
      const frame = h('iframe', {src: demo, title: 'デモ：' + meta.title, allow: 'clipboard-write', referrerpolicy: 'same-origin'});
      connectDemo(frame, demo);
      ui.stage.append(frame);
      ui.caption.textContent = '枠の中でデモを操作できます。狭い画面では「デモを別ページで開く」が使いやすくなります。';
      return;
    }

    const video = safeHref(item.video);
    if (!video) {
      ui.stage.append(still(safeHref(item.poster) ? '' : 'ここで見られる画像や動画がありません。'));
      ui.caption.textContent = '';
      return;
    }
    ui.stage.append(window.SY.media.create(item, {title: meta.title}));
    ui.caption.textContent = '無音で自動再生します。音声がある動画はプレーヤーの操作で音を出せます。' + firstSentence(item.video_note);
  }

  /* ---------- Copy ---------- */

  function selectText(el) {
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  // Older browsers: copy through a hidden field inside the dialog (the page behind it is inert).
  function legacyCopy(text) {
    const buffer = h('textarea', {class: 'preview-copy-buffer', readonly: true, tabindex: '-1', 'aria-hidden': 'true'});
    buffer.value = text;
    ui.sheet.append(buffer);
    buffer.select();
    buffer.setSelectionRange(0, text.length);
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
    buffer.remove();
    ui.copy.focus({preventScroll: true});
    return ok;
  }

  // Success is reported only after the clipboard accepted the exact text.
  async function copyRequest() {
    const item = current && current.item;
    if (!item || typeof item.request !== 'string') return;
    const text = item.request;
    let ok = false;
    if (navigator.clipboard && window.isSecureContext) {
      try { await navigator.clipboard.writeText(text); ok = true; } catch (_) { ok = false; }
    }
    if (!current || current.item !== item || !ui.dialog.open) return;
    if (!ok) ok = legacyCopy(text);
    if (!current || current.item !== item) return; // closed or switched while waiting
    clearTimeout(labelTimer);
    if (ok) {
      ui.hint.hidden = true;
      ui.copy.textContent = 'コピーしました';
      say('依頼文をコピーしました。');
      labelTimer = setTimeout(() => { ui.copy.textContent = '依頼文をコピー'; }, 2200);
    } else {
      // Leave the full text open and selected so it can be copied from the system menu.
      ui.prompt.open = true;
      selectText(ui.promptText);
      ui.copy.textContent = 'コピーできませんでした';
      ui.hint.hidden = false;
      ui.hint.textContent = '自動でコピーできませんでした。下に開いた依頼文を長押しして選択し、コピーしてください（パソコンではドラッグして選択）。';
      say('依頼文を自動でコピーできませんでした。下に開いた依頼文を選択してコピーしてください。');
      labelTimer = setTimeout(() => { ui.copy.textContent = '依頼文をコピー'; }, 4000);
    }
  }

  /* ---------- Open and close ---------- */

  function fill(item, meta) {
    ui.share.replaceChildren(window.SY.videoShare.create(item));
    ui.itemActions.replaceChildren(window.SY.itemActions.create(window.SY.likes.caseID(item), meta.skill || meta.title, meta.href));
    ui.meta.replaceChildren(...[
      meta.category ? h('span', {class: 'card-cat'}, meta.category) : null,
      item.updated_on ? h('span', {}, String(item.updated_on) + ' 更新') : null].filter(Boolean));
    ui.title.replaceChildren(...[
      meta.skill ? h('span', {class: 'preview-skill'}, meta.skill) : null,
      h('span', {class: 'preview-case'}, meta.title)].filter(Boolean));
    ui.summary.textContent = (item.catalog_entry && item.catalog_entry.summary) || lead(item.summary);
    ui.summary.hidden = !ui.summary.textContent;

    const demo = safeHref(item.demo);
    const framed = localDemo(demo);
    ui.switcher.hidden = !framed;
    ui.videoBtn.textContent = safeHref(item.video) ? '動画' : '画像';
    ui.note.hidden = !demo;
    ui.demoLink.hidden = !demo;
    if (demo) {
      ui.demoLink.href = demo;
      ui.demoLink.textContent = isExternal(demo) ? 'デモを外部のページで開く' : 'デモを別ページで開く';
    }
    ui.readLink.href = meta.href;

    const hasRequest = typeof item.request === 'string' && item.request.trim() !== '';
    clearTimeout(labelTimer);
    ui.copy.textContent = '依頼文をコピー';
    ui.copy.hidden = !hasRequest;
    ui.prompt.hidden = !hasRequest;
    ui.prompt.open = false;
    ui.promptText.textContent = hasRequest ? item.request : '';
    ui.hint.hidden = true;
    ui.live.textContent = '';
  }

  function open(item, meta) {
    if (!ui) build();
    if (ui.dialog.open) return;
    current = {item, meta, invoker: meta.invoker || document.activeElement, x: window.scrollX, y: window.scrollY};
    fill(item, meta);
    show('media');
    // The page keeps its scroll position and width; the reserved gutter stops a sideways jump.
    root.classList.add('has-preview');
    ui.dialog.showModal();
    window.SY.media.setFocus(ui.dialog);
    ui.sheet.scrollTop = 0;
    ui.close.focus({preventScroll: true});
  }

  function onClose() {
    stopMedia();
    window.SY.media.setFocus(null);
    clearTimeout(labelTimer);
    const state = current;
    current = null;
    root.classList.remove('has-preview');
    if (!state) return;
    if (window.scrollX !== state.x || window.scrollY !== state.y) window.scrollTo(state.x, state.y);
    if (state.invoker && state.invoker.isConnected) state.invoker.focus({preventScroll: true});
  }

  window.SY.casePreview = {
    open,
    // A dialog element is required; very old browsers keep the plain link to the article.
    supported: typeof HTMLDialogElement === 'function' && 'showModal' in HTMLDialogElement.prototype
  };
})();
