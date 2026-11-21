/* Navigation state, theme switcher, header sync, scroll-spy, recent history, and global command palette. */
(() => {
  'use strict';

  const page = document.body.dataset.sitePage || '';
  const rootEl = document.documentElement;
  const SVG_NS = 'http://www.w3.org/2000/svg';

  function computeRootPrefix(sitePage) {
    const clean = String(sitePage || '').replace(/^\/+/, '');
    const parts = clean.split('/').filter(Boolean);
    const depth = Math.max(0, parts.length - 1);
    return depth === 0 ? './' : '../'.repeat(depth);
  }

  const rootPrefix = computeRootPrefix(page);

  function safeHref(value) {
    if (window.SY && typeof window.SY.safeHref === 'function') return window.SY.safeHref(value);
    if (typeof value !== 'string') return null;
    const url = value.trim();
    if (!url || /[\u0000-\u001F\u007F\\]/.test(url)) return null;
    if (/^https?:\/\/[^/]/i.test(url)) return url;
    if (/^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith('//')) return null;
    return url;
  }

  function rebaseHref(href) {
    const safe = safeHref(href);
    if (!safe) return null;
    if (/^https?:/i.test(safe)) return safe;
    if (safe.startsWith('#')) return rootPrefix + safe;
    return rootPrefix + safe.replace(/^\.\//, '').replace(/^\/+/, '');
  }

  function normSearch(value) {
    if (window.SY && typeof window.SY.normSearch === 'function') return window.SY.normSearch(value);
    return String(value ?? '')
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[\u30a1-\u30f6]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
  }

  function el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs || {})) {
      if (value === null || value === undefined || value === false) continue;
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
      else node.setAttribute(key, value === true ? '' : value);
    }
    for (const child of children.flat(Infinity)) {
      if (child === null || child === undefined || child === false) continue;
      node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return node;
  }

  function svgIcon(paths, className) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '20');
    svg.setAttribute('height', '20');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    if (className) svg.setAttribute('class', className);
    for (const d of paths) {
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', d);
      svg.append(path);
    }
    return svg;
  }

  /* ---------- Canonical URLs & dynamic breadcrumbs ---------- */

  const base = document.querySelector('meta[name="sy-public-base"]')?.content;
  const params = new URLSearchParams(location.search);
  let canonical;
  if (base && page === 'case.html') {
    const key = params.has('id') ? 'id' : 'entry';
    const id = params.get(key);
    if (id && /^[a-z0-9._-]+$/i.test(id)) {
      canonical = new URL(page, base);
      canonical.searchParams.set(key, id);
    }
  } else if (base && page === 'guides/slides/repository.html') {
    const repo = params.get('repo');
    if (repo && /^[a-z0-9_.-]+\/[a-z0-9_.-]+$/i.test(repo)) {
      canonical = new URL(page, base);
      canonical.searchParams.set('repo', repo);
    }
  }
  if (canonical) {
    let node = document.querySelector('link[rel="canonical"]');
    if (!node) {
      node = document.createElement('link');
      node.rel = 'canonical';
      document.head.append(node);
    }
    node.href = canonical.href;
  }

  const crumb = document.querySelector('.sy-breadcrumb [aria-current="page"]');
  if (crumb && ['case.html', 'guides/slides/case.html', 'guides/slides/repository.html'].includes(page)) {
    const updateCrumb = () => { crumb.textContent = document.title.split('｜')[0]; };
    const titleEl = document.querySelector('title');
    if (titleEl) new MutationObserver(updateCrumb).observe(titleEl, {childList: true, subtree: true, characterData: true});
  }

  /* ---------- Header height sync ---------- */

  const header = document.querySelector('.sy-header');
  if (header) {
    const syncHeaderHeight = () => {
      const h = Math.round(header.getBoundingClientRect().height);
      if (h > 0) rootEl.style.setProperty('--sy-header-actual-h', h + 'px');
    };
    syncHeaderHeight();
    if (typeof ResizeObserver === 'function') {
      new ResizeObserver(syncHeaderHeight).observe(header);
    } else {
      addEventListener('resize', syncHeaderHeight, {passive: true});
    }
  }

  /* ---------- Dock overflow fade mask ---------- */

  const dock = document.querySelector('.sy-dock');
  if (dock) {
    const syncDockOverflow = () => {
      if (dock.classList.contains('is-contextual')) {
        dock.removeAttribute('data-dock-overflow');
        return;
      }
      const maxScroll = dock.scrollWidth - dock.clientWidth;
      if (maxScroll <= 2) {
        dock.removeAttribute('data-dock-overflow');
        return;
      }
      const left = dock.scrollLeft > 4;
      const right = dock.scrollLeft < maxScroll - 4;
      const state = left && right ? 'both' : left ? 'left' : right ? 'right' : 'none';
      if (state === 'none') dock.removeAttribute('data-dock-overflow');
      else dock.setAttribute('data-dock-overflow', state);
    };
    syncDockOverflow();
    dock.addEventListener('scroll', syncDockOverflow, {passive: true});
    if (typeof ResizeObserver === 'function') new ResizeObserver(syncDockOverflow).observe(dock);
    else addEventListener('resize', syncDockOverflow, {passive: true});
  }

  /* ---------- Scroll-spy on index.html ---------- */

  if (page === 'index.html') {
    const NAV_IDS = new Set(['cases', 'fields', 'catalog']);
    const SECTION_IDS = ['cases', 'fields', 'catalog'];
    const HASH_SECTION = {'#cases': 'cases', '#feature': 'cases', '#fields': 'fields', '#catalog': 'catalog'};
    let hashLockUntil = 0;

    function sectionForHash(hash) {
      if (!hash || hash === '#top' || hash === '#main') return '';
      if (HASH_SECTION[hash]) return HASH_SECTION[hash];
      // Category hashes (e.g. #ui-ux, #slides, #agents) scroll to and filter #catalog.
      return 'catalog';
    }

    function setNavCurrent(activeSection) {
      for (const container of document.querySelectorAll('.sy-nav, .sy-dock')) {
        for (const anchor of container.querySelectorAll('[data-site-nav]')) {
          const id = anchor.dataset.siteNav;
          if (!NAV_IDS.has(id)) continue;
          if (activeSection && id === activeSection) anchor.setAttribute('aria-current', 'location');
          else anchor.removeAttribute('aria-current');
        }
      }
    }

    function syncFromHash() {
      const section = sectionForHash(location.hash);
      setNavCurrent(section);
      hashLockUntil = performance.now() + 600;
    }

    syncFromHash();
    addEventListener('hashchange', syncFromHash);
    addEventListener('popstate', syncFromHash);
    document.addEventListener('click', event => {
      const anchor = event.target instanceof Element ? event.target.closest('.sy-nav a[href*="#"], .sy-dock a[href*="#"]') : null;
      if (anchor) hashLockUntil = performance.now() + 600;
      queueMicrotask(() => {
        if (performance.now() <= hashLockUntil) setNavCurrent(sectionForHash(location.hash));
      });
    });

    if (typeof IntersectionObserver === 'function') {
      const visible = new Set();
      const targets = SECTION_IDS.map(id => document.getElementById(id)).filter(Boolean);
      if (targets.length) {
        const observer = new IntersectionObserver(entries => {
          for (const entry of entries) {
            if (entry.isIntersecting) visible.add(entry.target.id);
            else visible.delete(entry.target.id);
          }
          if (performance.now() < hashLockUntil) return;
          if (window.scrollY < 48 && !location.hash) {
            setNavCurrent('');
            return;
          }
          const active = SECTION_IDS.find(id => visible.has(id)) || '';
          if (active) setNavCurrent(active);
          else if (window.scrollY < 120) setNavCurrent('');
        }, {rootMargin: '-18% 0px -55% 0px', threshold: [0, 0.05]});
        for (const target of targets) observer.observe(target);
      }
    }
  }

  /* ---------- Active sub-page pill in .sy-guide-local ---------- */

  const guideLocal = document.querySelector('.sy-guide-local');
  if (guideLocal) {
    const normPath = pathname => pathname.replace(/\/index\.html$/, '/');
    const syncGuideLocal = () => {
      const currentPath = normPath(location.pathname);
      const currentHash = location.hash;
      const links = Array.from(guideLocal.querySelectorAll('a[href]'));
      const parsed = links.map(a => {
        try {
          const url = new URL(a.getAttribute('href'), location.href);
          return {a, sameOrigin: url.origin === location.origin, path: normPath(url.pathname), hash: url.hash};
        } catch (_) {
          return {a, sameOrigin: false, path: '', hash: ''};
        }
      });
      const hasHashMatch = Boolean(currentHash) && parsed.some(item =>
        item.sameOrigin && item.path === currentPath && item.hash === currentHash);
      for (const item of parsed) {
        const isMatch = item.sameOrigin && item.path === currentPath &&
          (hasHashMatch ? item.hash === currentHash : !item.hash);
        if (isMatch) item.a.setAttribute('aria-current', 'page');
        else item.a.removeAttribute('aria-current');
      }
    };
    syncGuideLocal();
    addEventListener('hashchange', syncGuideLocal);
    addEventListener('popstate', syncGuideLocal);
  }

  /* ---------- Clean is-editing toggle (keyboard focus) ---------- */

  const TEXT_TYPES = /^(text|search|email|url|tel|number|password)$/i;
  const isEditable = target => target instanceof HTMLElement && (
    target.isContentEditable ||
    target.tagName === 'TEXTAREA' ||
    (target.tagName === 'INPUT' && TEXT_TYPES.test(target.type || 'text') && !target.readOnly && !target.disabled)
  );
  const syncEditing = () => rootEl.classList.toggle('is-editing', isEditable(document.activeElement));
  document.addEventListener('focusin', event => {
    rootEl.classList.toggle('is-editing', isEditable(event.target));
  });
  document.addEventListener('focusout', () => {
    queueMicrotask(syncEditing);
  });

  /* ---------- Theme switcher (auto -> dark -> light) ---------- */

  const THEME_KEY = 'yaoyorozu-theme-v1';
  const THEME_ORDER = ['auto', 'dark', 'light'];
  const THEME_META = {
    auto: {
      label: '自動',
      nextLabel: 'ダークに切り替え',
      paths: ['M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9z', 'M12 3v18']
    },
    dark: {
      label: 'ダーク',
      nextLabel: 'ライトに切り替え',
      paths: ['M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z']
    },
    light: {
      label: 'ライト',
      nextLabel: '自動に切り替え',
      paths: [
        'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z',
        'M12 2v2', 'M12 20v2', 'M4.9 4.9l1.4 1.4', 'M17.7 17.7l1.4 1.4',
        'M2 12h2', 'M20 12h2', 'M4.9 19.1l1.4-1.4', 'M17.7 6.3l1.4-1.4'
      ]
    }
  };
  const darkMedia = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function readThemePreference() {
    try {
      const value = localStorage.getItem(THEME_KEY);
      return value === 'dark' || value === 'light' ? value : 'auto';
    } catch (_) {
      return 'auto';
    }
  }

  function writeThemePreference(mode) {
    try {
      if (mode === 'auto') localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, mode);
    } catch (_) {
      /* Storage unavailable; ignore. */
    }
  }

  function applyTheme(mode) {
    const current = THEME_META[mode] ? mode : 'auto';
    if (current === 'auto') rootEl.removeAttribute('data-theme');
    else rootEl.setAttribute('data-theme', current);

    const effective = current === 'auto' ? (darkMedia && darkMedia.matches ? 'dark' : 'light') : current;
    let themeMeta = document.querySelector('meta[name="theme-color"]');
    if (!themeMeta) {
      themeMeta = document.createElement('meta');
      themeMeta.name = 'theme-color';
      document.head.append(themeMeta);
    }
    themeMeta.content = effective === 'dark' ? '#14120e' : '#f2eee3';

    const schemeMeta = document.querySelector('meta[name="color-scheme"]');
    if (schemeMeta) schemeMeta.content = current === 'auto' ? 'light dark' : effective;

    const info = THEME_META[current];
    const ariaText = '表示テーマ：' + info.label + '（押すと' + info.nextLabel + '）';
    for (const btn of document.querySelectorAll('[data-theme-toggle]')) {
      btn.setAttribute('aria-label', ariaText);
      btn.setAttribute('title', ariaText);
      btn.dataset.themeState = current;
      btn.replaceChildren(
        svgIcon(info.paths),
        el('span', {class: 'sy-btn-label'}, info.label)
      );
    }
  }

  let themeMode = readThemePreference();
  applyTheme(themeMode);

  document.addEventListener('click', event => {
    const toggle = event.target instanceof Element ? event.target.closest('[data-theme-toggle]') : null;
    if (!toggle) return;
    const nextIdx = (THEME_ORDER.indexOf(themeMode) + 1) % THEME_ORDER.length;
    themeMode = THEME_ORDER[nextIdx];
    writeThemePreference(themeMode);
    applyTheme(themeMode);
    if (window.SY && typeof window.SY.announce === 'function') {
      window.SY.announce('表示テーマを「' + THEME_META[themeMode].label + '」に切り替えました。');
    }
  });

  if (darkMedia && typeof darkMedia.addEventListener === 'function') {
    darkMedia.addEventListener('change', () => {
      if (themeMode === 'auto') applyTheme('auto');
    });
  }

  addEventListener('storage', event => {
    if (event.key === THEME_KEY) {
      themeMode = readThemePreference();
      applyTheme(themeMode);
    }
  });

  /* ---------- Recent items helper (compatible with SY.recent) ---------- */

  const RECENT_KEY = 'yaoyorozu-recent-v1';
  const RECENT_MAX = 10;

  function readRecent() {
    if (window.SY && window.SY.recent) return window.SY.recent.list();
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      const out = [];
      const seen = new Set();
      for (const item of parsed) {
        if (!item || typeof item !== 'object') continue;
        const id = String(item.id || '').trim();
        const title = String(item.title || '').trim();
        const href = safeHref(item.href);
        if (!id || !title || !href || seen.has(id)) continue;
        seen.add(id);
        out.push({id, type: String(item.type || ''), title, href, cat: String(item.cat || ''), at: Number(item.at) || 0});
        if (out.length >= RECENT_MAX) break;
      }
      return out;
    } catch (_) {
      return [];
    }
  }

  function pushRecent(item) {
    if (window.SY && window.SY.recent) return window.SY.recent.push(item);
    const current = readRecent();
    if (!item || typeof item !== 'object') return current;
    const id = String(item.id || '').trim();
    const title = String(item.title || '').trim();
    const href = safeHref(item.href);
    if (!id || !title || !href) return current;
    const next = [{
      id,
      type: String(item.type || ''),
      title,
      href,
      cat: String(item.cat || ''),
      at: Number(item.at) || Date.now()
    }, ...current.filter(x => x.id !== id)].slice(0, RECENT_MAX);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch (_) {
      /* Ignore storage failure. */
    }
    return next;
  }

  const SKIP_TITLES = /^(スキル・ツールの紹介|読み込んでいます|紹介ページが見つかりません|紹介ページを読み込めませんでした|項目が見つかりません|カタログを読み込めませんでした|表示する項目が選ばれていません|ページを表示できませんでした)/;
  const DYNAMIC_RECENT_PAGES = new Set(['case.html', 'guides/slides/case.html', 'guides/slides/repository.html']);
  const STATIC_RECENT_PAGES = {
    'open-models.html': {type: 'open-weight', cat: 'OpenWeight'},
    'guides/ui-ux/index.html': {type: 'studio', cat: '制作ガイド'},
    'guides/slides/index.html': {type: 'studio', cat: '制作ガイド'},
    'guides/slides/guide.html': {type: 'studio', cat: 'AIスライド'},
    'guides/motion/index.html': {type: 'studio', cat: '制作ガイド'},
    'guides/motion/projects.html': {type: 'studio', cat: 'モーション'},
    'guides/motion/guide.html': {type: 'studio', cat: 'モーション'},
    'workbench.html': {type: 'studio', cat: 'スタジオ機能'},
    'finder.html': {type: 'studio', cat: 'スタジオ機能'},
    'prompt-studio.html': {type: 'studio', cat: 'スタジオ機能'}
  };

  function recordCurrentVisit() {
    const title = document.title.split('｜')[0].trim();
    if (!title || SKIP_TITLES.test(title)) return false;
    const cleanPage = page.replace(/\/index\.html$/, '/');
    const href = (cleanPage || 'index.html') + location.search;
    const meta = STATIC_RECENT_PAGES[page] || {};
    const type = meta.type || (params.get('id') ? 'case' : 'catalog');
    const cat = meta.cat || (params.get('id') ? '実制作デモ' : 'カタログ');
    pushRecent({
      id: 'visit:' + href,
      type,
      title,
      href,
      cat,
      at: Date.now()
    });
    return true;
  }

  if (DYNAMIC_RECENT_PAGES.has(page)) {
    if (!recordCurrentVisit()) {
      const titleEl = document.querySelector('title');
      if (titleEl) {
        const obs = new MutationObserver(() => {
          if (recordCurrentVisit()) obs.disconnect();
        });
        obs.observe(titleEl, {childList: true, subtree: true, characterData: true});
      }
    }
  } else if (STATIC_RECENT_PAGES[page]) {
    recordCurrentVisit();
  }

  /* ---------- Global Command Palette (Ctrl+K / Cmd+K) ---------- */

  const IS_MAC = /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent || '');
  const KBD_TEXT = IS_MAC ? '⌘K' : 'Ctrl+K';

  for (const btn of document.querySelectorAll('[data-cmd-open]')) {
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.setAttribute('aria-label', 'クイック検索を開く (' + KBD_TEXT + ')');
    btn.replaceChildren(
      svgIcon(['M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13z', 'M15.3 15.3 20 20']),
      el('span', {class: 'sy-btn-label'}, '検索'),
      el('kbd', {class: 'sy-kbd'}, KBD_TEXT)
    );
  }

  const STUDIO_SHORTCUTS = [
    {
      id: 'studio:finder',
      type: 'studio',
      title: '用途ファインダー',
      subtitle: '目的・利用環境・条件からぴったりの道具を絞り込む',
      category: 'studio',
      category_label: 'スタジオ機能',
      kind: '案内',
      stage: '',
      href: 'finder.html',
      search: '用途ファインダー finder 目的 環境 絞り込み 診断 おすすめ'
    },
    {
      id: 'studio:workbench',
      type: 'studio',
      title: '道具箱ワークベンチ',
      subtitle: '保存した道具の比較・メモ・AGENTS.md出力・まとめ依頼文作成',
      category: 'studio',
      category_label: 'スタジオ機能',
      kind: '比較・出力',
      stage: '',
      href: 'workbench.html',
      search: '道具箱ワークベンチ workbench 比較 メモ markdown agents.md 共有'
    },
    {
      id: 'studio:prompt',
      type: 'studio',
      title: '依頼ブリーフ作成',
      subtitle: 'SKILL.mdと入力条件からAIへ渡す依頼ブリーフを組み立てる',
      category: 'studio',
      category_label: 'スタジオ機能',
      kind: 'ブリーフ',
      stage: '',
      href: 'prompt-studio.html',
      search: '依頼ブリーフ作成 prompt studio プロンプト 依頼文 テンプレート'
    },
    {
      id: 'studio:openweight',
      type: 'studio',
      title: 'OpenWeight',
      subtitle: '画像・音声・文字起こし・予測など用途特化の重み公開モデル',
      category: 'owm-tools',
      category_label: 'OpenWeight',
      kind: 'モデル一覧',
      stage: '',
      href: 'open-models.html',
      search: 'openweight open weight モデル 画像生成 音声 文字起こし 予測'
    },
    {
      id: 'studio:guides',
      type: 'studio',
      title: '制作ガイド',
      subtitle: 'UI・UX / AIスライド / モーションの3つの専門制作ガイド',
      category: 'guides',
      category_label: '制作ガイド',
      kind: 'ガイド',
      stage: '',
      href: 'guides/',
      search: '制作ガイド guides ui ux スライド モーション まとめ'
    }
  ];

  const GROUP_ORDER = ['case', 'open-weight', 'catalog', 'studio'];
  const GROUP_LABELS = {
    recent: '最近見た項目',
    case: '実制作デモ',
    catalog: 'カタログ',
    'open-weight': 'OpenWeight',
    studio: 'スタジオ機能'
  };

  function normalizeType(rawType) {
    const t = String(rawType || '').toLowerCase();
    if (t === 'case' || t === 'demo') return 'case';
    if (t === 'open-weight' || t === 'open-weight-model' || t === 'model') return 'open-weight';
    if (t === 'studio' || t === 'shortcut' || t === 'guide' || t === 'page') return 'studio';
    return 'catalog';
  }

  let indexPromise = null;
  let indexItems = null;

  async function fetchJSON(url) {
    const res = await fetch(url, {cache: 'no-cache'});
    if (!res.ok) throw new Error(url + ' ' + res.status);
    return res.json();
  }

  function normalizeIndexItem(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const href = safeHref(raw.href);
    const title = String(raw.title || raw.name || raw.id || '').trim();
    if (!href || !title) return null;
    const type = normalizeType(raw.type);
    const subtitle = String(raw.subtitle || raw.tagline || raw.summary || '').trim();
    const category = String(raw.category || '');
    const categoryLabel = String(raw.category_label || category || '');
    const kind = String(raw.kind || '');
    const stage = String(raw.stage || '');
    const search = String(raw.search || '');
    return {
      id: String(raw.id || href),
      type,
      title,
      subtitle,
      category,
      category_label: categoryLabel,
      kind,
      stage,
      href,
      _titleNorm: normSearch(title),
      _metaNorm: normSearch([subtitle, categoryLabel, kind, stage].join(' ')),
      _hay: normSearch([title, subtitle, category, categoryLabel, kind, stage, search].join(' '))
    };
  }

  function normalizeCatalogFallback(data) {
    const categories = Object.create(null);
    const catList = Array.isArray(data?.categories) ? data.categories : [];
    for (const cat of catList) {
      if (cat && typeof cat.id === 'string' && cat.id) categories[cat.id] = cat.label || cat.id;
    }
    const entries = Array.isArray(data) ? data : (Array.isArray(data?.entries) ? data.entries : []);
    const out = [];
    for (const entry of entries) {
      if (!entry || !entry.id) continue;
      const isModel = entry.resource_type === 'open-weight-model';
      const guideUrl = safeHref(entry.guide_url);
      const href = isModel && guideUrl
        ? guideUrl
        : guideUrl && /^case\.html\?id=/i.test(guideUrl)
          ? guideUrl
          : 'case.html?entry=' + encodeURIComponent(entry.id);
      const type = isModel ? 'open-weight' : /^case\.html\?id=/i.test(href) ? 'case' : 'catalog';
      const item = normalizeIndexItem({
        id: entry.id,
        type,
        title: entry.name || entry.id,
        subtitle: entry.tagline || entry.summary || '',
        category: entry.category || '',
        category_label: categories[entry.category] || entry.category || '',
        kind: entry.kind || '',
        stage: entry.verification_stage || '',
        href,
        search: [entry.name, entry.id, entry.tagline, entry.summary, entry.use_case, ...(entry.tags || [])].join(' ')
      });
      if (item) out.push(item);
    }
    return out;
  }

  async function loadSearchIndex() {
    if (indexItems) return indexItems;
    if (!indexPromise) {
      indexPromise = (async () => {
        let items = [];
        try {
          const data = await fetchJSON(rootPrefix + 'data/search-index.json');
          const rawList = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
          items = rawList.map(normalizeIndexItem).filter(Boolean);
        } catch (_) {
          try {
            const fallback = await fetchJSON(rootPrefix + 'data/catalog.json');
            items = normalizeCatalogFallback(fallback);
          } catch (err) {
            indexPromise = null;
            throw err;
          }
        }
        const seenHref = new Set(items.map(item => item.href));
        for (const shortcut of STUDIO_SHORTCUTS) {
          if (!seenHref.has(shortcut.href)) {
            const normalized = normalizeIndexItem(shortcut);
            if (normalized) items.push(normalized);
          }
        }
        indexItems = items;
        return items;
      })();
    }
    return indexPromise;
  }

  let palette = null;
  let lastFocused = null;
  let activeIndex = -1;
  let renderedItems = [];

  function ensurePalette() {
    if (palette) return palette;
    const input = el('input', {
      type: 'search',
      class: 'sy-palette-input',
      placeholder: 'ツール名・用途・モデル・ガイドを検索…',
      autocomplete: 'off',
      spellcheck: 'false',
      role: 'combobox',
      'aria-expanded': 'true',
      'aria-autocomplete': 'list',
      'aria-controls': 'sy-palette-list',
      'aria-label': 'サイト内クイック検索'
    });
    const closeBtn = el('button', {
      type: 'button',
      class: 'sy-palette-close',
      'aria-label': '検索を閉じる'
    }, '閉じる');
    const meta = el('div', {class: 'sy-palette-meta', 'aria-live': 'polite'});
    const list = el('div', {
      id: 'sy-palette-list',
      class: 'sy-palette-list',
      role: 'listbox',
      'aria-label': '検索候補'
    });
    const foot = el('div', {class: 'sy-palette-foot'},
      el('span', {class: 'sy-palette-hints'}, '↑↓ 選択 · Enter 開く · Esc 閉じる'),
      el('span', {}, 'ローカル検索'));
    const dialog = el('dialog', {
      class: 'sy-palette',
      'aria-label': 'クイック検索'
    },
      el('div', {class: 'sy-palette-head'},
        svgIcon(['M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13z', 'M15.3 15.3 20 20'], 'sy-palette-search-icon'),
        input,
        closeBtn),
      meta,
      list,
      foot);

    closeBtn.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener('close', () => {
      if (lastFocused && typeof lastFocused.focus === 'function' && document.contains(lastFocused)) {
        lastFocused.focus({preventScroll: true});
      }
      lastFocused = null;
    });

    input.addEventListener('input', () => renderPaletteResults());
    input.addEventListener('keydown', event => {
      if (event.isComposing || event.keyCode === 229) return;
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        moveSelection(1);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        moveSelection(-1);
      } else if (event.key === 'Enter' && activeIndex >= 0 && renderedItems[activeIndex]) {
        event.preventDefault();
        activateItem(renderedItems[activeIndex]);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        dialog.close();
      }
    });

    document.body.append(dialog);
    palette = {dialog, input, meta, list};
    return palette;
  }

  function setSelection(nextIdx) {
    if (!palette) return;
    const options = palette.list.querySelectorAll('.sy-palette-item');
    if (!options.length) {
      activeIndex = -1;
      palette.input.removeAttribute('aria-activedescendant');
      return;
    }
    const clamped = ((nextIdx % options.length) + options.length) % options.length;
    activeIndex = clamped;
    options.forEach((opt, i) => {
      const selected = i === clamped;
      opt.setAttribute('aria-selected', selected ? 'true' : 'false');
      if (selected) {
        palette.input.setAttribute('aria-activedescendant', opt.id);
        opt.scrollIntoView({block: 'nearest'});
      }
    });
  }

  function moveSelection(delta) {
    if (!renderedItems.length) return;
    setSelection(activeIndex < 0 ? (delta > 0 ? 0 : renderedItems.length - 1) : activeIndex + delta);
  }

  function activateItem(entry) {
    const href = rebaseHref(entry.href);
    if (!href) return;
    pushRecent({
      id: entry.id,
      type: entry.type,
      title: entry.title,
      href: entry.href,
      cat: entry.category_label || entry.cat || GROUP_LABELS[entry.type] || '',
      at: Date.now()
    });
    if (palette) palette.dialog.close();
    location.assign(href);
  }

  function scoreItem(item, terms, rawNorm) {
    for (const term of terms) {
      if (!item._hay.includes(term)) return -1;
    }
    let score = 0;
    if (item._titleNorm === rawNorm) score += 120;
    else if (item._titleNorm.startsWith(rawNorm)) score += 70;
    else if (item._titleNorm.includes(rawNorm)) score += 40;
    for (const term of terms) {
      if (item._titleNorm.includes(term)) score += 20;
      else if (item._metaNorm.includes(term)) score += 10;
      else score += 4;
    }
    if (item.type === 'case') score += 4;
    else if (item.type === 'studio') score += 3;
    else if (item.type === 'open-weight') score += 2;
    return score;
  }

  function renderGroup(groupKey, label, items, startIndex) {
    const optionNodes = items.map((item, offset) => {
      const idx = startIndex + offset;
      const href = rebaseHref(item.href) || '#';
      const badgeText = item.category_label || item.cat || item.kind || '';
      const option = el('a', {
        id: 'sy-pal-opt-' + idx,
        class: 'sy-palette-item',
        role: 'option',
        href,
        'aria-selected': idx === 0 ? 'true' : 'false',
        onclick: event => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
          event.preventDefault();
          activateItem(item);
        }
      },
        el('span', {class: 'sy-palette-item-main'},
          el('span', {class: 'sy-palette-item-title'}, item.title),
          item.subtitle ? el('span', {class: 'sy-palette-item-sub'}, item.subtitle) : null),
        badgeText || item.kind ? el('span', {class: 'sy-palette-item-meta'},
          badgeText ? el('span', {class: 'sy-palette-badge'}, badgeText) : null,
          item.kind && item.kind !== badgeText ? el('span', {class: 'sy-palette-badge'}, item.kind) : null) : null);
      return option;
    });
    return el('section', {class: 'sy-palette-group', 'aria-label': label},
      el('p', {class: 'sy-palette-group-title'}, label),
      optionNodes);
  }

  function renderPaletteResults() {
    if (!palette) return;
    const rawQuery = palette.input.value.trim();
    const rawNorm = normSearch(rawQuery);
    const terms = rawNorm.split(/\s+/).filter(Boolean);
    renderedItems = [];
    activeIndex = -1;

    if (!terms.length) {
      const recentList = readRecent().slice(0, 5).map(item => ({
        id: item.id,
        type: item.type || 'catalog',
        title: item.title,
        subtitle: item.cat || '',
        category_label: item.cat || '',
        kind: '',
        href: item.href
      }));
      const sections = [];
      if (recentList.length) {
        sections.push(renderGroup('recent', GROUP_LABELS.recent, recentList, renderedItems.length));
        renderedItems.push(...recentList);
      }
      const shortcuts = STUDIO_SHORTCUTS.map(s => ({...s}));
      sections.push(renderGroup('studio', GROUP_LABELS.studio, shortcuts, renderedItems.length));
      renderedItems.push(...shortcuts);

      palette.meta.textContent = indexItems
        ? '全' + indexItems.length + '件を検索できます'
        : 'スタジオ機能と最近見た項目';
      palette.list.replaceChildren(...sections);
      setSelection(0);
      return;
    }

    const source = indexItems || STUDIO_SHORTCUTS.map(normalizeIndexItem).filter(Boolean);
    const matches = [];
    for (const item of source) {
      const s = scoreItem(item, terms, rawNorm);
      if (s >= 0) matches.push({item, score: s});
    }
    matches.sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title, 'ja'));
    const top = matches.slice(0, 40).map(m => m.item);

    if (!top.length) {
      palette.meta.textContent = '0件一致';
      palette.list.replaceChildren(
        el('div', {class: 'sy-palette-empty'},
          el('strong', {}, '「' + rawQuery + '」に一致する項目が見つかりません'),
          el('p', {}, 'ひらがな・カタカナ・英語・分野名など、別の短い言葉で試してください。'))
      );
      setSelection(-1);
      return;
    }

    const grouped = new Map();
    for (const key of GROUP_ORDER) grouped.set(key, []);
    for (const item of top) {
      const key = grouped.has(item.type) ? item.type : 'catalog';
      grouped.get(key).push(item);
    }

    const sections = [];
    for (const key of GROUP_ORDER) {
      const list = grouped.get(key);
      if (!list || !list.length) continue;
      sections.push(renderGroup(key, GROUP_LABELS[key] || key, list, renderedItems.length));
      renderedItems.push(...list);
    }

    palette.meta.textContent = matches.length + '件一致' + (matches.length > top.length ? '（上位' + top.length + '件を表示）' : '');
    palette.list.replaceChildren(...sections);
    setSelection(0);
  }

  async function openPalette(triggerEl) {
    if (document.querySelector('dialog[open]:not(.sy-palette)')) return;
    const ui = ensurePalette();
    if (ui.dialog.open) return;
    lastFocused = triggerEl || document.activeElement;
    renderPaletteResults();
    ui.dialog.showModal();
    ui.input.focus();
    ui.input.select();

    if (!indexItems) {
      ui.meta.textContent = '検索インデックスを読み込んでいます…';
      try {
        await loadSearchIndex();
        if (ui.dialog.open) renderPaletteResults();
      } catch (_) {
        if (ui.dialog.open) {
          ui.meta.textContent = '一部の検索データを読み込めませんでした（スタジオ機能は利用できます）';
        }
      }
    }
  }

  document.addEventListener('click', event => {
    const trigger = event.target instanceof Element ? event.target.closest('[data-cmd-open]') : null;
    if (!trigger) return;
    event.preventDefault();
    openPalette(trigger);
  });

  document.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (palette && palette.dialog.open) {
        palette.dialog.close();
      } else {
        openPalette(document.activeElement);
      }
    }
  });
})();
