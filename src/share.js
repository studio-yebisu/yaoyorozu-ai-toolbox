/* Credit and sharing controls. X receives nothing until the visitor opens the compose link. */
(() => {
  'use strict';
  const {h, safeHref, loadJSON} = window.SY;
  const CREDIT = 'Yaoyorozu AI ToolBox · @studio_yebisu';
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
    const credit = h('pre', {class: 'video-credit', tabindex: '0', 'aria-label': '動画のクレジット'}, CREDIT);
    const status = h('p', {class: 'video-share-status', role: 'status', 'aria-live': 'polite'});
    const copyButton = h('button', {class: 'btn btn-line', type: 'button'}, 'クレジットをコピー');
    const introCopy = h('button', {class: 'btn btn-line', type: 'button', disabled: true}, '紹介文とカードURLをコピー');
    const xLink = h('a', {class: 'btn btn-line', target: '_blank', rel: 'noopener noreferrer', hidden: true}, 'Xで紹介');
    let copyText = CREDIT;
    let settings = null;
    let introText = '';
    const intro = h('pre', {class: 'video-credit', tabindex: '0', 'aria-label': 'X用の紹介文'});
    const introDetails = h('details', {class: 'video-share-intro'}, h('summary', {}, 'X用の紹介文を見る'), intro);
    function cardURL() {
      return new URL('share/' + encodeURIComponent(item.id) + '-card.html', settings.site_url).href;
    }
    function updateIntro() {
      if (!settings) return;
      const url = cardURL();
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
    const section = h('section', {class: 'video-share', 'aria-label': '動画の利用と紹介'},
      h('p', {class: 'video-share-heading'}, '動画の利用にはクレジット表記が必須です。'),
      h('p', {class: 'video-share-note'}, '商用利用・編集・再配布OK。Xの投稿本文には ',
        h('a', {href: 'https://x.com/studio_yebisu'}, '@studio_yebisu'), ' を記載してください。 ',
        h('a', {href: 'media-rights.html'}, '動画の利用条件')),
      credit, actions, versions, sharedPages,
      h('p', {class: 'video-share-note'}, '保存用MP4には引用元の透かしが入ります。「Xで紹介」は画像カード用のURL・クレジット・メンションを入れた投稿画面を開きます。カードのリンク先で動画を見られます。'),
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
