/* Personal bookmarks, compare tray, and tool notes stay in this browser. Share controls never post automatically. */
(() => {
  'use strict';
  const {h, loadJSON, safeHref, announce} = window.SY;
  const KEY = 'yaoyorozu-saved-items-v1';
  const COMPARE_KEY = 'yaoyorozu-compare-v1';
  const NOTES_KEY = 'yaoyorozu-saved-notes-v1';
  const ID = /^[a-z0-9][a-z0-9._-]{0,99}$/i;
  const MAX_COMPARE = 4;

  let saved = new Set();
  let compared = [];
  let notes = Object.create(null);
  let siteBase;
  let projectPromise;

  function parseIdList(key, maxLen, errorLabel) {
    const raw = localStorage.getItem(key);
    if (raw === null) return [];
    const value = JSON.parse(raw);
    if (!Array.isArray(value) || value.length > maxLen || value.some(id => typeof id !== 'string' || !ID.test(id))) {
      throw new Error(errorLabel);
    }
    return [...new Set(value)];
  }

  function readSaved() {
    return new Set(parseIdList(KEY, 2000, '保存リストを読み込めませんでした。'));
  }

  function readCompared() {
    return parseIdList(COMPARE_KEY, MAX_COMPARE, '比較リストを読み込めませんでした。').slice(0, MAX_COMPARE);
  }

  function readNotes() {
    const raw = localStorage.getItem(NOTES_KEY);
    if (raw === null) return Object.create(null);
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('メモを読み込めませんでした。');
    }
    const clean = Object.create(null);
    for (const [id, entry] of Object.entries(parsed)) {
      if (!ID.test(id) || !entry || typeof entry !== 'object') continue;
      if (typeof entry.note === 'string') {
        clean[id] = {note: entry.note, updatedAt: typeof entry.updatedAt === 'string' ? entry.updatedAt : ''};
      }
    }
    return clean;
  }

  try { saved = readSaved(); } catch (_) { /* Reading still works without browser storage. */ }
  try { compared = readCompared(); } catch (_) { /* Optional compare storage. */ }
  try { notes = readNotes(); } catch (_) { /* Optional notes storage. */ }

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

  const ICONS = {
    save: ['M6 3.5h12v17l-6-4-6 4z'],
    compare: ['M4 5.5h6.5v13H4z', 'M13.5 5.5H20v13h-6.5z'],
    share: ['M12 15V3', 'M7.5 7.5 12 3l4.5 4.5', 'M5 12v8h14v-8']
  };

  function icon(kind) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    el.setAttribute('viewBox', '0 0 24 24');
    el.setAttribute('aria-hidden', 'true');
    for (const d of ICONS[kind] || []) {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      el.append(path);
    }
    return el;
  }

  function notify(message, action, statusEl) {
    if (typeof window.SY.toast === 'function') {
      window.SY.toast(message, action);
      if (statusEl) statusEl.textContent = '';
      return;
    }
    announce(message);
    if (statusEl) {
      statusEl.replaceChildren(message);
      if (action && action.label && safeHref(action.href)) {
        statusEl.append(' ', h('a', {href: safeHref(action.href)}, action.label));
      }
    }
  }

  function paintSaveButton(button) {
    const active = saved.has(button.dataset.saveId);
    button.setAttribute('aria-pressed', String(active));
    button.setAttribute('aria-label', button.dataset.itemTitle + (active ? 'を保存したものから外す' : 'をあとで試すものに保存'));
    button.querySelector('[data-save-label]').textContent = active ? '保存済み' : 'あとで試す';
  }

  function paintCompareButton(button) {
    const active = compared.includes(button.dataset.compareId);
    button.setAttribute('aria-pressed', String(active));
    button.setAttribute('aria-label', button.dataset.itemTitle + (active ? 'を比較リストから外す' : 'を比較リストに追加'));
    button.querySelector('[data-compare-label]').textContent = active ? '比較中' : '比較';
  }

  // Re-paint every save and compare button under `scope`. Cached cards/rows miss live updates while detached.
  function refresh(scope) {
    const root = scope || document;
    for (const button of root.querySelectorAll('[data-save-id]')) paintSaveButton(button);
    for (const button of root.querySelectorAll('[data-compare-id]')) paintCompareButton(button);
  }

  function changedSaved() {
    refresh();
    window.dispatchEvent(new CustomEvent('sy:savedchange'));
  }

  function changedCompare() {
    refresh();
    window.dispatchEvent(new CustomEvent('sy:comparechange'));
  }

  function getSavedIds() {
    return [...saved];
  }

  function setSavedIds(ids) {
    if (!Array.isArray(ids)) throw new Error('Invalid saved ids');
    const clean = [...new Set(ids.filter(id => typeof id === 'string' && ID.test(id)))].slice(0, 2000);
    localStorage.setItem(KEY, JSON.stringify(clean));
    saved = readSaved();
    changedSaved();
    return [...saved];
  }

  function getCompareIds() {
    return [...compared];
  }

  function setCompareIds(ids) {
    if (!Array.isArray(ids)) throw new Error('Invalid compare ids');
    const clean = [...new Set(ids.filter(id => typeof id === 'string' && ID.test(id)))].slice(0, MAX_COMPARE);
    localStorage.setItem(COMPARE_KEY, JSON.stringify(clean));
    compared = readCompared();
    changedCompare();
    return [...compared];
  }

  function getNote(id) {
    if (typeof id !== 'string' || !ID.test(id)) return '';
    return notes[id] ? notes[id].note : '';
  }

  function setNote(id, text) {
    if (typeof id !== 'string' || !ID.test(id)) throw new Error('Invalid note id');
    const fresh = readNotes();
    const value = String(text ?? '');
    if (!value.trim()) {
      delete fresh[id];
    } else {
      fresh[id] = {note: value, updatedAt: new Date().toISOString()};
    }
    localStorage.setItem(NOTES_KEY, JSON.stringify(fresh));
    notes = readNotes();
    window.dispatchEvent(new CustomEvent('sy:noteschange', {detail: {id}}));
    return getNote(id);
  }

  function getNotes() {
    const copy = Object.create(null);
    for (const [id, entry] of Object.entries(notes)) copy[id] = {...entry};
    return copy;
  }

  function toggle(id, path, status) {
    if (!ID.test(id)) return;
    try {
      const fresh = readSaved();
      const remove = fresh.has(id);
      if (remove) fresh.delete(id); else fresh.add(id);
      localStorage.setItem(KEY, JSON.stringify([...fresh]));
      saved = readSaved();
      if (saved.has(id) === remove) throw new Error('Unconfirmed bookmark');
      changedSaved();
      if (remove) {
        notify('保存したものから外しました。', null, status);
      } else {
        const isCase = /^case\.html\?id=/i.test(String(path || '').trim());
        const action = isCase
          ? {label: 'ワークベンチを開く', href: 'workbench.html'}
          : {label: '保存一覧を見る', href: './?saved=1#catalog'};
        notify('保存しました（' + saved.size + '件）。', action, status);
      }
    } catch (_) {
      notify('保存できませんでした。ブラウザーのサイトデータ保存を有効にして、もう一度お試しください。', null, status);
    }
  }

  function toggleCompare(id, status) {
    if (!ID.test(id)) return {added: false, ids: [...compared]};
    try {
      const fresh = readCompared();
      const idx = fresh.indexOf(id);
      if (idx >= 0) {
        fresh.splice(idx, 1);
        localStorage.setItem(COMPARE_KEY, JSON.stringify(fresh));
        compared = readCompared();
        changedCompare();
        notify('比較リストから外しました。', null, status);
        return {added: false, ids: [...compared]};
      }
      if (fresh.length >= MAX_COMPARE) {
        notify('比較は最大' + MAX_COMPARE + '件までです。ワークベンチで入れ替えられます。', {
          label: '比較表を開く',
          href: 'workbench.html?compare=' + encodeURIComponent(fresh.join(','))
        }, status);
        return {added: false, ids: [...compared], limitReached: true};
      }
      fresh.push(id);
      localStorage.setItem(COMPARE_KEY, JSON.stringify(fresh));
      compared = readCompared();
      changedCompare();
      notify('比較リストに追加しました（' + compared.length + '/' + MAX_COMPARE + '）。', {
        label: '比較表を開く',
        href: 'workbench.html?compare=' + encodeURIComponent(compared.join(','))
      }, status);
      return {added: true, ids: [...compared]};
    } catch (_) {
      notify('比較リストを保存できませんでした。サイトデータ保存を有効にしてお試しください。', null, status);
      return {added: false, ids: [...compared]};
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
    const save = h('button', {
      class: 'item-action item-save',
      type: 'button',
      'data-save-id': id,
      'data-item-title': name,
      title: 'このブラウザーに保存して、あとで見返す',
      onclick: event => { event.stopPropagation(); toggle(id, path, status); }
    }, icon('save'), h('span', {'data-save-label': ''}, 'あとで試す'));
    paintSaveButton(save);

    const compare = h('button', {
      class: 'item-action item-compare',
      type: 'button',
      'data-compare-id': id,
      'data-item-title': name,
      title: '最大4件まで比較リストへ追加',
      onclick: event => { event.stopPropagation(); toggleCompare(id, status); }
    }, icon('compare'), h('span', {'data-compare-label': ''}, '比較'));
    paintCompareButton(compare);

    const share = h('button', {
      class: 'item-action item-share',
      type: 'button',
      'aria-label': name + 'をシェア',
      title: '共有メニューを開くか、リンクをコピー'
    }, icon('share'));

    const wrapper = h('div', {class: 'item-actions-wrap'},
      h('div', {class: 'item-actions', role: 'group', 'aria-label': name + 'の操作'},
        window.SY.likes.create(id, name), save, compare, share),
      status);

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
        if (await copyURL(url, wrapper)) {
          notify('リンクをコピーしました。', null, status);
        } else {
          status.textContent = 'リンクを選択してコピーしてください：' + url;
        }
      } catch (_) {
        notify('共有リンクを準備できませんでした。もう一度お試しください。', null, status);
      } finally {
        share.disabled = false;
      }
    });
    return wrapper;
  }

  window.addEventListener('storage', event => {
    if (event.key === KEY || event.key === null) {
      try { saved = readSaved(); changedSaved(); } catch (_) { /* Retain the last confirmed state. */ }
    }
    if (event.key === COMPARE_KEY || event.key === null) {
      try { compared = readCompared(); changedCompare(); } catch (_) { /* Retain the last confirmed state. */ }
    }
    if (event.key === NOTES_KEY || event.key === null) {
      try { notes = readNotes(); window.dispatchEvent(new CustomEvent('sy:noteschange')); } catch (_) { /* Retain last confirmed notes. */ }
    }
  });

  window.SY.itemActions = {
    create,
    refresh,
    isSaved: id => saved.has(id),
    savedCount: () => saved.size,
    getSavedIds,
    setSavedIds,
    isCompared: id => compared.includes(id),
    toggleCompare: id => toggleCompare(id),
    getCompareIds,
    setCompareIds,
    compareCount: () => compared.length,
    getNote,
    setNote,
    getNotes
  };
})();
