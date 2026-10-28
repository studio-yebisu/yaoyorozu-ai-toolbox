/* Credit and sharing controls. X receives nothing until the visitor opens the compose link. */
(() => {
  'use strict';
  const {h, safeHref, loadJSON} = window.SY;
  const CREDIT = 'Yaoyorozu AI ToolBox · @studio_yebisu';
  const CURRENT_LABELS = ['save_label', 'intro_copy_label', 'intro_summary_label', 'share_note'];
  let projectPromise;

  function project() {
    if (!projectPromise) projectPromise = loadJSON('data/projects.json').catch(error => { projectPromise = null; throw error; });
    return projectPromise;
  }

  function articleURL(settings, item) {
    const base = new URL(settings.site_url);
    if (base.protocol !== 'https:' || /^(localhost|127\.|\[?::1\]?)/.test(base.hostname)) throw new Error('Public site URL required');
    const url = new URL('case.html', base);
    url.searchParams.set('id', item.id);
    return url.href;
  }

  // Opt-in: share the primary video itself and the article, never the older orientation/card files.
  function currentMode(item) {
    const labels = item.video_share_copy;
    if (item.video_share_mode !== 'primary-current' || item.video_primary !== true || !safeHref(item.video)) return null;
    if (!labels || typeof labels !== 'object') return null;
    return CURRENT_LABELS.every(key => typeof labels[key] === 'string' && labels[key].trim()) ? labels : null;
  }

  async function copy(text, button, status, label = 'クレジット') {
    let copied = false;
    if (navigator.clipboard && window.isSecureContext) {
      try { await navigator.clipboard.writeText(text); copied = true; } catch (_) { /* Try local fallback. */ }
    }
    if (!copied) {
      const buffer = h('textarea', {class: 'video-copy-buffer', readonly: true, 'aria-label': 'コピー用のクレジット'});
      buffer.value = text;
      button.parentElement.append(buffer);
      buffer.select();
      try { copied = document.execCommand('copy'); } catch (_) { copied = false; }
      buffer.remove();
      button.focus({preventScroll: true});
    }
    status.textContent = copied ? label + 'をコピーしました。' : 'コピーできませんでした。表示した' + label + 'を選択してコピーしてください。';
    return copied;
  }

  function create(item) {
    const current = currentMode(item);
    const credit = h('pre', {class: 'video-credit', tabindex: '0', 'aria-label': '動画のクレジット'}, CREDIT);
    const status = h('p', {class: 'video-share-status', role: 'status', 'aria-live': 'polite'});
    const copyButton = h('button', {class: 'btn btn-line', type: 'button'}, 'クレジットをコピー');
    const introCopy = h('button', {class: 'btn btn-line', type: 'button', disabled: true}, current ? current.intro_copy_label : '紹介文とカードURLをコピー');
    const xLink = h('a', {class: 'btn btn-line', target: '_blank', rel: 'noopener noreferrer', hidden: true}, 'Xで紹介');
    let copyText = CREDIT;
    let settings = null;
    let introText = '';
    const intro = h('pre', {class: 'video-credit', tabindex: '0', 'aria-label': 'X用の紹介文'});
    const introDetails = h('details', {class: 'video-share-intro'}, h('summary', {}, current ? current.intro_summary_label : 'X用の紹介文を見る'), intro);
    function cardURL() {
      return new URL('share/' + encodeURIComponent(item.id) + '-card.html', settings.site_url).href;
    }
    function updateIntro() {
      if (!settings) return;
      const url = current ? articleURL(settings, item) : cardURL();
      const text = String(item.title || 'AIスキル・ツール') + '\n' + CREDIT;
      introText = text + '\n' + url;
      intro.textContent = introText;
      const intent = new URL('https://x.com/intent/tweet');
      intent.searchParams.set('text', text);
      intent.searchParams.set('url', url);
      xLink.href = intent.href;
    }
    copyButton.addEventListener('click', () => copy(copyText, copyButton, status));
    introCopy.addEventListener('click', async () => {
      updateIntro();
      if (!await copy(introText, introCopy, status, '紹介文')) introDetails.open = true;
    });
    introDetails.addEventListener('toggle', () => { if (introDetails.open) updateIntro(); });
    xLink.addEventListener('click', updateIntro);
    const actions = h('div', {class: 'video-share-actions'}, copyButton, introCopy, xLink);
    let parts;
    if (current) {
      // The same primary MP4 on every viewport; its label must not claim an embedded source watermark.
      actions.prepend(h('a', {class: 'btn btn-ink', href: safeHref(item.video), download: ''}, current.save_label));
      parts = [credit, actions, h('p', {class: 'video-share-note'}, current.share_note)];
    } else {
      const downloadHref = () => safeHref(matchMedia('(max-width: 699px)').matches ? item.video_download_portrait : item.video_download_landscape);
      if (downloadHref()) {
        const save = h('a', {class: 'btn btn-ink', href: downloadHref(), download: ''}, '動画を保存（引用元入り）');
        save.addEventListener('click', () => { save.href = downloadHref(); });
        actions.prepend(save);
      }
      const versions = h('p', {class: 'video-share-note'}, '別の向きで保存： ');
      for (const [key, label] of [['video_download_landscape', '横向きMP4を保存'], ['video_download_portrait', '縦向きMP4を保存']]) {
        const href = safeHref(item[key]);
        if (href) versions.append(h('a', {href, download: ''}, label), '　');
      }
      const sharedPages = h('p', {class: 'video-share-note'},
        h('a', {href: 'share/' + encodeURIComponent(item.id) + '-card.html'}, '画像カードの共有ページ'), ' ／ ',
        h('a', {href: 'share/' + encodeURIComponent(item.id) + '-landscape.html'}, '横向き'), ' ／ ',
        h('a', {href: 'share/' + encodeURIComponent(item.id) + '-portrait.html'}, '縦向き'));
      parts = [credit, actions, versions, sharedPages,
        h('p', {class: 'video-share-note'}, '保存用MP4には引用元の透かしが入ります。「Xで紹介」は画像カード用のURL・クレジット・メンションを入れた投稿画面を開きます。カードのリンク先で動画を見られます。')];
    }
    const section = h('section', {class: 'video-share', 'aria-label': '動画の利用と紹介'},
      h('p', {class: 'video-share-heading'}, '動画の利用にはクレジット表記が必須です。'),
      h('p', {class: 'video-share-note'}, '商用利用・編集・再配布OK。Xの投稿本文には ',
        h('a', {href: 'https://x.com/studio_yebisu'}, '@studio_yebisu'), ' を記載してください。 ',
        h('a', {href: 'media-rights.html'}, '動画の利用条件')),
      ...parts,
      introDetails, status);
    project().then(value => {
      const url = articleURL(value, item);
      settings = value;
      copyText = CREDIT + '\n' + url;
      credit.textContent = copyText;
      updateIntro();
      introCopy.disabled = false;
      xLink.hidden = false;
    }).catch(() => { status.textContent = '記事の共有リンクを読み込めませんでした。クレジットはコピーできます。'; });
    return section;
  }

  window.SY.videoShare = {create};
})();

/* Opt-in launch links for a produced case (primary_actions / app_downloads), kept outside the pinned
   case.js. case.js calls SY.videoShare.create(item) while building the article and attaches the page
   synchronously afterwards, so a microtask scheduled here runs once the article is in place. Cases
   without valid opt-in fields are never touched. All labels come from case data; links pass safeHref. */
(() => {
  'use strict';
  const {h, safeHref} = window.SY;
  const share = window.SY.videoShare;
  if (!share || typeof share.create !== 'function') return;

  const text = value => typeof value === 'string' && value.trim() ? value : null;

  function rows(list, keys) {
    if (!Array.isArray(list) || !list.length || list.length > 4) return null;
    const result = [];
    for (const row of list) {
      if (!row || typeof row !== 'object') return null;
      const href = safeHref(row.href);
      const values = keys.map(key => text(row[key]));
      if (!href || values.some(value => value === null)) return null;
      result.push([...values, href]);
    }
    return result;
  }

  // [kind, label, href] with exactly one leading primary action, or null.
  function actions(item) {
    const list = rows(item.primary_actions, ['kind', 'label']);
    if (!list || list[0][0] !== 'primary' || list.filter(([kind]) => kind === 'primary').length !== 1) return null;
    return list.every(([kind]) => kind === 'primary' || kind === 'secondary') ? list : null;
  }

  const kids = el => Array.from(el.children || []);
  const hasClass = (el, name) => String(el.className || '').split(/\s+/).includes(name);
  function find(el, test) {
    for (const child of kids(el)) {
      if (test(child)) return child;
      const found = find(child, test);
      if (found) return found;
    }
    return null;
  }

  function apply(item, launch) {
    const root = window.SY.$('[data-root]');
    const head = root && kids(root).find(el => el.tagName === 'HEADER' && hasClass(el, 'article-head'));
    if (!head) return;
    // case.js always ends the header with dl.facts (it always has the category row); its demo/prompt
    // bar, when present, is the element directly before it. Other header elements are not touched.
    const children = kids(head);
    const facts = children.find(el => el.tagName === 'DL' && hasClass(el, 'facts'));
    if (!facts) return;
    const previous = children[children.indexOf(facts) - 1];
    const old = previous && previous.tagName === 'DIV' && hasClass(previous, 'actions') ? previous : null;
    // Existing demo/prompt links keep their labels and targets and become secondary.
    const kept = old ? kids(old).filter(el => el.tagName === 'A') : [];
    for (const link of kept) link.className = 'btn btn-line';
    const bar = h('div', {class: 'actions'},
      launch.map(([kind, label, href]) => h('a', {class: kind === 'primary' ? 'btn btn-ink' : 'btn btn-line', href}, label)),
      kept);
    if (old) old.replaceWith(bar); else head.insertBefore(bar, facts);
    const note = text(item.primary_actions_note);
    if (note) bar.after(h('p', {class: 'd-note'}, note));
    const downloads = rows(item.app_downloads, ['label', 'note']);
    const section = find(root, el => el.id === 'downloads');
    const list = section && find(section, el => el.tagName === 'UL' && hasClass(el, 'downloads'));
    // App rows go first and never carry a download attribute (the target is another site).
    if (list && downloads) list.prepend(...downloads.map(([label, rowNote, href]) =>
      h('li', {}, h('a', {href}, h('strong', {}, label), h('span', {}, rowNote)))));
  }

  const create = share.create;
  window.SY.videoShare = {...share, create(item) {
    const section = create(item);
    const launch = item && actions(item);
    if (launch) queueMicrotask(() => apply(item, launch));
    return section;
  }};
})();
