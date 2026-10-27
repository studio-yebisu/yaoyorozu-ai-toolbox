/* Responsive, muted inline playback shared by cards, previews and articles. */
(() => {
  'use strict';
  const {h, safeHref} = window.SY;
  const narrow = matchMedia('(max-width: 699px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const players = new Map();
  let focusRoot = null;

  function variant(item) {
    const portrait = narrow.matches;
    const src = safeHref(portrait ? item.video_portrait : item.video_landscape) || safeHref(item.video);
    const hasVariant = safeHref(portrait ? item.video_portrait : item.video_landscape);
    return {
      src,
      poster: safeHref(portrait ? item.poster_portrait : item.poster_landscape) || safeHref(item.poster),
      width: hasVariant ? (portrait ? 720 : 1280) : (item.video_width || 1280),
      height: hasVariant ? (portrait ? 1280 : 720) : (item.video_height || 720),
      layout: portrait ? 'portrait' : 'landscape'
    };
  }

  function eligible(state) {
    return state.video.isConnected && state.visible && !document.hidden
      && (!focusRoot || focusRoot.contains(state.video));
  }

  function label(state) {
    const playing = !state.video.paused && !state.video.ended;
    state.toggle.textContent = playing ? '一時停止' : '再生';
    state.toggle.setAttribute('aria-label', state.title + 'の動画を' + (playing ? '一時停止' : '再生'));
    state.toggle.setAttribute('aria-pressed', String(playing));
    state.box.dataset.mediaState = playing ? 'playing' : 'paused';
  }

  function pause(state) {
    if (!state.video.paused) {
      state.managedPause = true;
      state.video.pause();
    }
    label(state);
  }

  function source(state) {
    const next = variant(state.item);
    state.box.dataset.mediaLayout = next.layout;
    state.box.style.setProperty('--media-ratio', next.width + ' / ' + next.height);
    state.video.width = next.width;
    state.video.height = next.height;
    if (next.poster) state.video.poster = next.poster;
    if (!state.loaded || state.src === next.src) return;
    const time = state.video.currentTime || 0;
    state.switching = true;
    state.src = next.src;
    state.video.src = next.src;
    state.video.addEventListener('loadedmetadata', () => {
      if (state.src !== next.src) return;
      if (time && Number.isFinite(state.video.duration)) {
        state.video.currentTime = Math.min(time, Math.max(0, state.video.duration - 0.05));
      }
      state.switching = false;
      sync(state);
    }, {once: true});
    state.video.load();
  }

  function sync(state) {
    const active = eligible(state) && !state.userPaused && (!reduced.matches || state.manual);
    state.video.autoplay = active;
    if (!active) { pause(state); return; }
    if (!state.loaded) {
      state.loaded = true;
      source(state);
    }
    if (!state.video.paused || state.pending) return;
    state.pending = true;
    Promise.resolve(state.video.play()).then(() => {
      if (!eligible(state) || state.userPaused) pause(state);
    }).catch(error => {
      if (error.name === 'NotAllowedError') state.box.dataset.mediaState = 'blocked';
      // Native controls and the explicit play button remain available.
    }).finally(() => { state.pending = false; label(state); });
  }

  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    for (const entry of entries) {
      const state = players.get(entry.target);
      if (!state) continue;
      state.visible = entry.isIntersecting && entry.intersectionRatio >= 0.15;
      sync(state);
    }
  }, {threshold: [0, 0.15]}) : null;

  function create(item, options = {}) {
    const title = options.title || item.title || item.id || '紹介動画';
    const video = h('video', {
      class: 'adaptive-video', playsinline: true, muted: true, loop: true,
      preload: 'none', controls: options.controls !== false,
      controlslist: 'nodownload',
      'aria-label': title + 'の解説動画', 'data-case-video': item.id || ''
    });
    // Set the live property before assigning any media URL (including on iOS).
    video.muted = true;
    video.defaultMuted = true;
    const toggle = h('button', {class: 'media-toggle', type: 'button'}, '再生');
    const box = h('div', {class: 'adaptive-media', 'data-media-case': item.id || ''}, video, toggle);
    const state = {item, title, video, toggle, box, visible: !observer, loaded: false,
      src: null, userPaused: false, manual: false, pending: false, switching: false, managedPause: false};
    players.set(video, state);
    source(state);
    label(state);
    toggle.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      state.userPaused = !video.paused;
      state.manual = true;
      sync(state);
    });
    video.addEventListener('play', () => {
      state.userPaused = false;
      if (reduced.matches) state.manual = true;
      if (!eligible(state)) pause(state);
      label(state);
    });
    video.addEventListener('pause', () => {
      if (state.managedPause) state.managedPause = false;
      else if (!state.switching && eligible(state)) state.userPaused = true;
      label(state);
    });
    video.addEventListener('error', () => {
      box.dataset.mediaState = 'error';
      toggle.textContent = '再生できません';
      toggle.setAttribute('aria-label', title + 'の動画を再生できません');
      toggle.disabled = true;
    });
    if (observer) observer.observe(video);
    else requestAnimationFrame(() => sync(state));
    return box;
  }

  function destroy(container) {
    for (const [video, state] of players) {
      if (!container.contains(video)) continue;
      if (observer) observer.unobserve(video);
      pause(state);
      players.delete(video);
      video.removeAttribute('src');
      video.load();
    }
  }

  function setFocus(container) {
    focusRoot = container;
    for (const state of players.values()) sync(state);
  }

  narrow.addEventListener('change', () => {
    for (const state of players.values()) { source(state); sync(state); }
  });
  reduced.addEventListener('change', () => {
    for (const state of players.values()) { state.manual = false; sync(state); }
  });
  document.addEventListener('visibilitychange', () => {
    for (const state of players.values()) sync(state);
  });
  window.SY.media = {create, destroy, setFocus, variant};
})();
