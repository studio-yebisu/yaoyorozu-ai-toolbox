/* Personal bookmarks stay in this browser. Share controls never post automatically. */
(() => {
  'use strict';
  const {h, loadJSON, safeHref} = window.SY;
  const KEY = 'yaoyorozu-saved-items-v1';
  const ID = /^[a-z0-9][a-z0-9-]*$/;
  let saved = new Set();
  let siteBase;
  let projectPromise;

  function readSaved() {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return new Set();
    const value = JSON.parse(raw);
    if (!Array.isArray(value) || value.length > 2000 || value.some(id => typeof id !== 'string' || !ID.test(id))) {
      throw new Error('保存リストを読み込めませんでした。');
    }
    return new Set(value);
  }
  try { saved = readSaved(); } catch (_) { /* Reading still works without browser storage. */ }

  function project() {
    if (!projectPromise) projectPromise = loadJSON('data/projects.json').then(value => {
      const url = new URL(value.site_url);
      if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('Invalid site URL');
      siteBase = url.href;
    }).catch(error => { projectPromise = null; throw error; });
    return projectPromise;
  }
  // Prepare the URL before a tap so the native share sheet retains user activation.
  project().catch(() => {});

  function icon(kind) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    el.setAttribute('viewBox', '0 0 24 24');
    el.setAttribute('aria-hidden', 'true');
    for (const d of kind === 'save' ? ['M6 3.5h12v17l-6-4-6 4z'] : ['M12 15V3', 'M7.5 7.5 12 3l4.5 4.5', 'M5 12v8h14v-8']) {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      el.append(path);
    }
    return el;
  }

  function paintButton(button) {
    const active = saved.has(button.dataset.saveId);
    button.setAttribute('aria-pressed', String(active));
    button.setAttribute('aria-label', button.dataset.itemTitle + (active ? 'を保存したものから外す' : 'をあとで試すものに保存'));
    button.querySelector('[data-save-label]').textContent = active ? '保存済み' : 'あとで試す';
  }

  // Re-paint every save button under `scope` (the page by default). Cards cached while detached
  // miss live updates, so repaint them when they are reattached.
  function refresh(scope) {
    for (const button of (scope || document).querySelectorAll('[data-save-id]')) paintButton(button);
  }

  function changed() {
    refresh();
    window.dispatchEvent(new CustomEvent('sy:savedchange'));
  }

  function toggle(id, status) {
    try {
      const fresh = readSaved();
      const remove = fresh.has(id);
      if (remove) fresh.delete(id); else fresh.add(id);
      localStorage.setItem(KEY, JSON.stringify([...fresh]));
      saved = readSaved();
      if (saved.has(id) === remove) throw new Error('Unconfirmed bookmark');
      status.replaceChildren(remove ? '保存したものから外しました。' : '保存しました。');
      if (!remove) status.append(h('a', {href: './?saved=1#cases'}, '保存したものを見る'));
      changed();
    } catch (_) {
      status.textContent = '保存できませんでした。ブラウザーのサイトデータ保存を有効にして、もう一度お試しください。';
    }
  }

  async function copyURL(url, container) {
    if (navigator.clipboard && window.isSecureContext) {
      try { await navigator.clipboard.writeText(url); return true; } catch (_) { /* Local fallback. */ }
    }
    const field = h('textarea', {class: 'video-copy-buffer', readonly: true, 'aria-label': '共有リンク'});
    field.value = url;
    container.append(field);
    field.select();
    let copied = false;
    try { copied = document.execCommand('copy'); } catch (_) { /* Show the URL instead. */ }
    field.remove();
    return copied;
  }

  function create(id, title, path) {
    const name = title || id;
    const status = h('p', {class: 'item-action-status', role: 'status', 'aria-live': 'polite'});
    const save = h('button', {class: 'item-action item-save', type: 'button', 'data-save-id': id, 'data-item-title': name,
      title: 'このブラウザーに保存して、あとで見返す', onclick: event => { event.stopPropagation(); toggle(id, status); }},
      icon('save'), h('span', {'data-save-label': ''}, 'あとで試す'));
    paintButton(save);
    const share = h('button', {class: 'item-action item-share', type: 'button', 'aria-label': name + 'をシェア',
      title: '共有メニューを開くか、リンクをコピー'}, icon('share'));
    const wrapper = h('div', {class: 'item-actions-wrap'},
      h('div', {class: 'item-actions', role: 'group', 'aria-label': name + 'の操作'}, window.SY.likes.create(id, name), save, share), status);
    share.addEventListener('click', async event => {
      event.stopPropagation();
      if (share.disabled) return;
      share.disabled = true;
      status.textContent = '';
      let url;
      try {
        if (!siteBase) await project();
        const relative = safeHref(path);
        if (!relative || /^https?:/i.test(relative) || relative.startsWith('/')) throw new Error('Invalid share path');
        url = new URL(relative, siteBase).href;
        if (navigator.share && matchMedia('(pointer: coarse)').matches) {
          try { await navigator.share({title: name, text: name + '\nYaoyorozu AI ToolBox · @studio_yebisu', url}); return; }
          catch (error) { if (error.name === 'AbortError') return; }
        }
        status.textContent = await copyURL(url, wrapper) ? 'リンクをコピーしました。' : 'リンクを選択してコピーしてください：' + url;
      } catch (_) { status.textContent = '共有リンクを準備できませんでした。もう一度お試しください。'; }
      finally { share.disabled = false; }
    });
    return wrapper;
  }

  window.addEventListener('storage', event => {
    if (event.key !== KEY && event.key !== null) return;
    try { saved = readSaved(); changed(); } catch (_) { /* Retain the last confirmed state. */ }
  });
  window.SY.itemActions = {create, refresh, isSaved: id => saved.has(id), savedCount: () => saved.size};
})();
