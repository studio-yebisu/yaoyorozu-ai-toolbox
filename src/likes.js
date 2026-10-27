/* Shared anonymous likes. Only the API's confirmed result changes a displayed total. */
(() => {
  'use strict';
  const {h, loadJSON} = window.SY;
  const KEY = 'yaoyorozu-likes-visitor-v1';
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const states = new Map();
  const queue = new Set();
  let scheduled = false;
  let configPromise;
  let configured = false;
  let api;
  let channel;
  try { channel = new BroadcastChannel('yaoyorozu-likes'); } catch (_) { /* Optional tab sync. */ }

  function visitor(create = false) {
    try {
      const saved = localStorage.getItem(KEY);
      if (UUID.test(saved || '')) return saved;
      if (!create) return null;
      const token = crypto.randomUUID();
      localStorage.setItem(KEY, token);
      if (localStorage.getItem(KEY) === token) return token;
    } catch (_) { /* Counts still work when browser storage is unavailable. */ }
    if (create) throw new Error('いいねを保存するには、ブラウザーのサイトデータ保存を有効にしてください。');
    return null;
  }

  function config() {
    if (!configPromise) configPromise = loadJSON('data/likes.json').then(value => {
      if (!value.api_url) return null;
      const url = new URL(value.api_url);
      const loopback = host => ['127.0.0.1', 'localhost', '[::1]'].includes(host);
      const local = loopback(location.hostname) && loopback(url.hostname) && url.protocol === 'http:';
      if ((!local && url.protocol !== 'https:') || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
        throw new Error('Invalid likes endpoint');
      }
      api = url.origin;
      return api;
    }).catch(() => null).finally(() => { configured = true; });
    return configPromise;
  }

  function stateFor(id) {
    if (!states.has(id)) states.set(id, {id, count: null, liked: false, loaded: false, loading: false, pending: false, error: '', version: 0});
    return states.get(id);
  }

  function paintOne(el, state) {
    const button = el.querySelector('button');
    const unavailable = configured && !api;
    const busy = !configured || state.loading || state.pending;
    const retry = !state.loaded && !busy && Boolean(state.error);
    button.disabled = busy || unavailable;
    button.classList.toggle('is-unavailable', unavailable);
    button.setAttribute('aria-pressed', String(state.liked));
    button.setAttribute('aria-busy', String(busy));
    button.setAttribute('aria-label', `${el.dataset.likeTitle}：${unavailable ? 'いいね（準備中）' : retry ? 'いいね数を再読み込み' : state.liked ? 'いいねを取り消す' : 'いいね'}${state.count === null ? '' : `、${state.count}件`}`);
    button.title = unavailable ? 'いいねは現在準備中です。' : retry ? 'いいね数を再読み込み' : '同じブラウザーから1件。もう一度押すと取り消せます。';
    el.querySelector('[data-like-label]').textContent = retry ? '再試行' : 'いいね';
    const count = el.querySelector('[data-like-count]');
    count.textContent = unavailable ? '準備中' : state.count === null ? '—' : state.count.toLocaleString('ja-JP');
    count.classList.toggle('is-unavailable', unavailable);
    el.querySelector('[data-like-message]').textContent = state.error;
  }

  function paint(state) {
    for (const el of document.querySelectorAll('[data-like-id]')) {
      if (el.dataset.likeId === state.id) paintOne(el, state);
    }
  }

  async function request(path, token, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const headers = new Headers(options.headers);
      if (token) headers.set('X-Visitor-ID', token);
      const response = await fetch(api + path, {...options, headers, signal: controller.signal, credentials: 'omit', cache: 'no-store'});
      if (!response.ok) throw new Error('API unavailable');
      return await response.json();
    } finally { clearTimeout(timer); }
  }

  function valid(item, id) {
    return item?.id === id && Number.isSafeInteger(item.count) && item.count >= 0 && typeof item.liked === 'boolean';
  }

  function schedule(id, force = false) {
    const state = stateFor(id);
    if (state.loading || state.pending || (state.loaded && !force)) return;
    state.loading = true;
    state.error = '';
    queue.add(id);
    paint(state);
    if (!scheduled) {
      scheduled = true;
      setTimeout(flush, 0);
    }
  }

  async function flush() {
    scheduled = false;
    const ids = [...queue];
    queue.clear();
    if (!await config()) {
      for (const id of ids) { const state = stateFor(id); state.loading = false; paint(state); }
      return;
    }
    for (const id of ids) paint(stateFor(id));
    const token = visitor();
    await Promise.all(Array.from({length: Math.ceil(ids.length / 40)}, async (_, index) => {
      const batch = ids.slice(index * 40, (index + 1) * 40);
      const versions = batch.map(id => stateFor(id).version);
      try {
        const result = await request('/v1/likes?ids=' + encodeURIComponent(batch.join(',')), token);
        if (!Array.isArray(result.items) || result.items.length !== batch.length) throw new Error('Invalid total');
        const values = new Map(result.items.map(item => [item.id, item]));
        if (!batch.every(id => valid(values.get(id), id))) throw new Error('Invalid total');
        batch.forEach((id, i) => {
          const state = stateFor(id);
          if (state.version !== versions[i]) return;
          Object.assign(state, values.get(id), {loaded: true, loading: false, token, error: ''});
          paint(state);
        });
      } catch (_) {
        batch.forEach((id, i) => {
          const state = stateFor(id);
          if (state.version !== versions[i]) return;
          state.loading = false;
          state.error = 'いいね数を読み込めませんでした。もう一度お試しください。';
          paint(state);
        });
      }
    }));
  }

  async function toggle(id) {
    const state = stateFor(id);
    if (!api || state.pending || state.loading) return;
    if (!state.loaded) { schedule(id, true); return; }
    let token;
    try { token = visitor(true); }
    catch (error) { state.error = error.message; paint(state); return; }
    if (state.token && state.token !== token) { state.loaded = false; schedule(id, true); return; }
    const liked = !state.liked;
    const version = ++state.version;
    state.pending = true;
    state.error = '';
    paint(state);
    try {
      const result = await request('/v1/likes/' + encodeURIComponent(id), token, {
        method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({liked})
      });
      if (!valid(result, id) || result.liked !== liked) throw new Error('Unconfirmed save');
      if (state.version !== version) return;
      Object.assign(state, result, {token, error: ''});
      channel?.postMessage({id});
    } catch (_) {
      if (state.version === version) state.error = '保存を確認できませんでした。もう一度お試しください。';
    } finally {
      if (state.version === version) { state.pending = false; paint(state); }
    }
  }

  function create(id, title) {
    const state = stateFor(id);
    const heart = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    heart.setAttribute('viewBox', '0 0 24 24');
    heart.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0l-1 1-1-1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z');
    heart.append(path);
    const button = h('button', {class: 'like-button', type: 'button', onclick: event => { event.stopPropagation(); toggle(id); }},
      heart, h('span', {'data-like-label': ''}, 'いいね'), h('span', {class: 'like-count', 'data-like-count': ''}, '—'));
    const el = h('span', {class: 'like-control', 'data-like-id': id, 'data-like-title': title || id},
      button, h('span', {class: 'like-message', 'data-like-message': '', role: 'status', 'aria-live': 'polite'}));
    paintOne(el, state);
    schedule(id);
    return el;
  }

  if (channel) channel.onmessage = event => {
    const id = event.data?.id;
    if (typeof id === 'string' && states.has(id)) schedule(id, true);
  };
  window.addEventListener('storage', event => {
    if (event.key !== KEY && event.key !== null) return;
    for (const state of states.values()) {
      state.version++;
      Object.assign(state, {loaded: false, loading: false, pending: false, liked: false, count: null, token: null});
      schedule(state.id, true);
    }
  });
  window.SY.likes = {create, caseID: item => item.catalog_entry?.id || 'case-' + item.id};
})();
