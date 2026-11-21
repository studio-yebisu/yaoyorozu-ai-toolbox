/* Yaoyorozu AI ToolBox — open-weight model guide (open-models.html). Load after ui.js.
   Reads data/open-models.json and data/categories.json only; every value from JSON is set as text.
   URL: ?q=<words>&field=<task_category>&access=open|gated&license=permissive|conditional&env=cpu|gpu&view=cards|matrix#<model id>.
   A model hash always switches to cards view and clears hiding filters. Nothing here changes window.SY. */
(() => {
  'use strict';

  const {$, h, safeHref, isExternal, displayUrl, loadJSON, norm, scrollBehavior, announce} = window.SY;

  const form = $('[data-ow-form]');
  const input = $('[data-ow-q]');
  const fieldsEl = $('[data-ow-fields]');
  const statusEl = $('[data-ow-status]');
  const resetBtn = $('[data-ow-reset]');
  const toggleAllBtn = $('[data-ow-toggle-all]');
  const list = $('[data-ow-list]');
  const matrixWrap = $('[data-ow-matrix]');
  const emptyEl = $('[data-ow-empty]');
  const errorEl = $('[data-ow-error]');
  const zoomDialog = $('[data-ow-zoom]');
  const zoomCloseBtn = $('[data-ow-zoom-close]');
  const zoomMetaEl = $('[data-ow-zoom-meta]');
  const zoomTitleEl = $('[data-ow-zoom-title]');
  const zoomFrameEl = $('[data-ow-zoom-frame]');
  const zoomNoteEl = $('[data-ow-zoom-note]');
  const zoomAltEl = $('[data-ow-zoom-alt]');
  const zoomActionsEl = $('[data-ow-zoom-actions]');
  const zoomLiveEl = $('[data-ow-zoom-live]');
  if (!form || !input || !list) return;

  const ID_RE = /^[a-z0-9][a-z0-9-]*$/;
  const ACCESS_OPTS = new Set(['all', 'open', 'gated']);
  const LICENSE_OPTS = new Set(['all', 'permissive', 'conditional']);
  const ENV_OPTS = new Set(['all', 'cpu', 'gpu']);
  const VIEW_OPTS = new Set(['cards', 'matrix']);
  const coarsePointer = matchMedia('(pointer: coarse)');

  const EXAMPLE_KIND = {
    'linked-demo': {heading: '公開されている作例', badge: '外部の公開作例', pill: '公式公開作例'},
    'introduced-workflow': {heading: '紹介した使い方', badge: '投稿に書いた利用例', pill: '紹介利用例'},
    'illustrative-use': {heading: '使いどころの例', badge: '説明用・実行結果ではない', pill: '仕組み説明'}
  };

  let models = [];            // [{model, card, detailsEl, hay, taskField, access, licenseKind, hasCpu, hasGpu}]
  let byId = new Map();
  let labels = new Map();     // category id -> label
  let fieldOrder = [];        // task_category ids present in models, in categories.json order
  let state = {q: '', field: 'all', access: 'all', license: 'all', env: 'all', view: 'cards'};
  let loading = false;
  let composing = false;
  let typingTimer = 0;
  let toastEl = null;
  let toastTimer = 0;
  let zoomInvoker = null;

  const text = value => (typeof value === 'string' ? value.trim() : '');
  const list0 = value => (Array.isArray(value) ? value : []);
  const taskCategoryOf = model => text(model.task_category) || text(model.category);

  const foldSearch = typeof window.SY.normSearch === 'function'
    ? window.SY.normSearch
    : value => norm(value).replace(/[\u30a1-\u30f6]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60));

  function classifyLicense(name) {
    const clean = text(name).toLowerCase();
    if (!clean) return 'conditional';
    return /^(?:mit|apache-2\.0|apache 2\.0|bsd-\d(?:-clause)?|isc|cc0-1\.0|unlicense|mpl-2\.0)$/i.test(clean)
      ? 'permissive'
      : 'conditional';
  }

  function showToast(message) {
    announce(message);
    if (typeof window.SY.toast === 'function') {
      window.SY.toast(message);
      return;
    }
    if (!toastEl) {
      toastEl = h('p', {class: 'ow-toast', role: 'status', 'aria-live': 'polite', hidden: true});
      document.body.append(toastEl);
    }
    toastEl.textContent = message;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { if (toastEl) toastEl.hidden = true; }, 2400);
  }

  async function copyText(value) {
    if (navigator.clipboard && window.isSecureContext) {
      try { await navigator.clipboard.writeText(value); return true; } catch (_) { /* Fallback below. */ }
    }
    const field = h('textarea', {class: 'ow-copy-buffer', readonly: true, tabindex: '-1', 'aria-hidden': 'true'});
    field.value = value;
    document.body.append(field);
    field.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
    field.remove();
    return ok;
  }

  // ---------- URL state ----------

  function readURL() {
    const params = new URLSearchParams(location.search);
    const field = params.get('field') || 'all';
    const access = params.get('access') || 'all';
    const license = params.get('license') || 'all';
    const env = params.get('env') || 'all';
    const view = params.get('view') || 'cards';
    return {
      q: params.get('q') || '',
      field: fieldOrder.includes(field) ? field : 'all',
      access: ACCESS_OPTS.has(access) ? access : 'all',
      license: LICENSE_OPTS.has(license) ? license : 'all',
      env: ENV_OPTS.has(env) ? env : 'all',
      view: VIEW_OPTS.has(view) ? view : 'cards'
    };
  }

  function urlFor(next, hash) {
    const params = new URLSearchParams();
    if (next.q.trim()) params.set('q', next.q.trim());
    if (next.field !== 'all') params.set('field', next.field);
    if (next.access !== 'all') params.set('access', next.access);
    if (next.license !== 'all') params.set('license', next.license);
    if (next.env !== 'all') params.set('env', next.env);
    if (next.view !== 'cards') params.set('view', next.view);
    const qs = params.toString();
    return location.pathname + (qs ? '?' + qs : '') + (hash ? '#' + hash : '');
  }

  function commit(mode, hash = '') {
    const url = urlFor(state, hash);
    if (url === location.pathname + location.search + location.hash) return;
    try {
      history[mode === 'push' ? 'pushState' : 'replaceState'](null, '', url);
    } catch (_) { /* Safari rate-limits history calls; filters remain active on the page. */ }
  }

  function currentHash() {
    try { return decodeURIComponent(location.hash.slice(1)); } catch { return ''; }
  }

  // ---------- Filtering ----------

  function tokens(q) { return foldSearch(q).split(/\s+/).filter(Boolean); }

  function matches(item, words, s) {
    if (s.field !== 'all' && item.taskField !== s.field) return false;
    if (s.access !== 'all' && item.access !== s.access) return false;
    if (s.license !== 'all' && item.licenseKind !== s.license) return false;
    if (s.env === 'cpu' && !item.hasCpu) return false;
    if (s.env === 'gpu' && !item.hasGpu) return false;
    return words.every(word => item.hay.includes(word));
  }

  function countWith(overrides, words) {
    const candidate = {...state, ...overrides};
    let count = 0;
    for (const item of models) if (matches(item, words, candidate)) count += 1;
    return count;
  }

  const isFiltered = () => Boolean(state.q.trim()) || state.field !== 'all'
    || state.access !== 'all' || state.license !== 'all' || state.env !== 'all';

  function syncToggleAll() {
    if (!toggleAllBtn) return;
    const visibleItems = models.filter(item => !item.card.hidden && item.detailsEl);
    const showBtn = state.view === 'cards' && visibleItems.length > 0;
    toggleAllBtn.hidden = !showBtn;
    if (!showBtn) return;
    const allOpen = visibleItems.every(item => item.detailsEl.open);
    toggleAllBtn.setAttribute('aria-pressed', String(allOpen));
    toggleAllBtn.textContent = allOpen ? '詳細をすべて閉じる' : '詳細をすべて開く';
  }

  function apply() {
    if (!models.length) return;
    const words = tokens(state.q);
    const visibleItems = [];
    for (const item of models) {
      const visible = matches(item, words, state);
      item.card.hidden = !visible;
      if (visible) visibleItems.push(item);
    }
    const isMatrix = state.view === 'matrix';
    list.hidden = isMatrix || visibleItems.length === 0;
    if (matrixWrap) {
      if (isMatrix && visibleItems.length > 0) {
        renderMatrix(visibleItems);
        matrixWrap.hidden = false;
      } else {
        matrixWrap.hidden = true;
        matrixWrap.replaceChildren();
      }
    }
    syncControls(words);
    renderStatus(visibleItems.length);
    syncToggleAll();
    emptyEl.hidden = visibleItems.length > 0;
    resetBtn.hidden = !isFiltered();
  }

  function renderStatus(shown) {
    const parts = [
      h('span', {class: 'ow-status-total'}, '全' + models.length + '件のうち'),
      h('span', {class: 'ow-status-main'}, h('strong', {}, String(shown)), '件を表示')
    ];
    const filters = [];
    if (state.q.trim()) filters.push('「' + state.q.trim() + '」');
    if (state.field !== 'all') filters.push(labels.get(state.field) || state.field);
    if (state.access === 'open') filters.push('同意不要');
    if (state.access === 'gated') filters.push('要同意');
    if (state.license === 'permissive') filters.push('MIT・Apache等');
    if (state.license === 'conditional') filters.push('条件付き・独自');
    if (state.env === 'cpu') filters.push('CPU対応記載');
    if (state.env === 'gpu') filters.push('GPU・CUDA記載');
    if (filters.length) parts.push(h('span', {class: 'ow-status-filters'}, filters.join('・') + 'で絞り込み'));
    statusEl.replaceChildren(...parts);
  }

  function updateChipCount(button, count) {
    let badge = button.querySelector('.chip-count');
    if (!badge) {
      badge = h('span', {class: 'chip-count'});
      button.append(badge);
    }
    badge.textContent = String(count);
  }

  function syncControls(words) {
    if (document.activeElement !== input && input.value !== state.q) input.value = state.q;
    for (const chip of fieldsEl.querySelectorAll('[data-field]')) {
      const id = chip.dataset.field;
      chip.setAttribute('aria-pressed', String(id === state.field));
      updateChipCount(chip, countWith({field: id}, words));
    }
    for (const btn of form.querySelectorAll('[data-ow-access]')) {
      const val = btn.dataset.owAccess;
      btn.setAttribute('aria-pressed', String(val === state.access));
      updateChipCount(btn, countWith({access: val}, words));
    }
    for (const btn of form.querySelectorAll('[data-ow-license]')) {
      const val = btn.dataset.owLicense;
      btn.setAttribute('aria-pressed', String(val === state.license));
      updateChipCount(btn, countWith({license: val}, words));
    }
    for (const btn of form.querySelectorAll('[data-ow-env]')) {
      const val = btn.dataset.owEnv;
      btn.setAttribute('aria-pressed', String(val === state.env));
      updateChipCount(btn, countWith({env: val}, words));
    }
    for (const btn of form.querySelectorAll('[data-ow-view]')) {
      btn.setAttribute('aria-pressed', String(btn.dataset.owView === state.view));
    }
  }

  function setState(next, mode, hash = '') {
    state = next;
    apply();
    commit(mode, hash);
  }

  function resetAll() {
    clearTimeout(typingTimer);
    input.value = '';
    setState({...state, q: '', field: 'all', access: 'all', license: 'all', env: 'all'}, 'push');
    input.focus();
  }

  // ---------- Hash: one model ----------

  function showModel(id, {focus = true, smooth = true} = {}) {
    const item = byId.get(id);
    if (!item) return false;
    let changed = false;
    const next = {...state};
    if (item.card.hidden) {
      Object.assign(next, {q: '', field: 'all', access: 'all', license: 'all', env: 'all'});
      input.value = '';
      changed = true;
    }
    if (next.view !== 'cards') {
      next.view = 'cards';
      changed = true;
    }
    if (changed) {
      state = next;
      apply();
      try {
        history.replaceState(null, '', urlFor(state, id));
      } catch (_) {}
      announce('絞り込みを外して、' + item.model.name + 'を表示しました。');
    }
    item.card.scrollIntoView({behavior: smooth ? scrollBehavior() : 'auto', block: 'start'});
    if (focus) item.card.focus({preventScroll: true});
    return true;
  }

  // ---------- Building blocks ----------

  function extLink(url, label, className) {
    const href = safeHref(url);
    if (!href) return null;
    return h('a', {href, class: className || null}, label);
  }

  function urlLine(url) {
    const href = safeHref(url);
    return href ? h('span', {class: 'ow-url'}, isExternal(href) ? displayUrl(href) : href) : null;
  }

  function formatDay(value) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(text(value));
    return m ? m[1] + '年' + Number(m[2]) + '月' + Number(m[3]) + '日' : '';
  }

  function formatPosted(value) {
    const date = new Date(text(value));
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('ja-JP', {timeZone: 'Asia/Tokyo', year: 'numeric', month: 'long', day: 'numeric'});
  }

  function haystack(model) {
    const fieldId = taskCategoryOf(model);
    const parts = [
      model.name, model.provider, model.task, model.headline, model.summary,
      model.input?.label, model.input?.text, model.process?.label, model.process?.text,
      model.output?.label, model.output?.text,
      model.requirements, ...list0(model.limitations),
      model.license?.name, model.license?.note, model.weights?.model_id,
      ...list0(model.explanation).flatMap(part => [part.title, part.text]),
      model.diagram_note, model.concept_alt,
      model.example?.title, model.example?.description, model.example?.credit,
      labels.get(fieldId), fieldId, labels.get(model.category)
    ];
    return foldSearch(parts.filter(v => typeof v === 'string').join(' '));
  }

  function flow(model) {
    const steps = [['入力', model.input, 'is-in'], ['処理', model.process, 'is-run'], ['出力', model.output, 'is-out']];
    const items = steps.filter(([, step]) => step && (text(step.label) || text(step.text)))
      .map(([role, step, cls]) => h('li', {class: 'ow-step ' + cls},
        h('span', {class: 'ow-step-role'}, role),
        h('span', {class: 'ow-step-label'}, text(step.label)),
        text(step.text) ? h('span', {class: 'ow-step-text'}, text(step.text)) : null));
    return items.length ? h('ol', {class: 'ow-flow', 'aria-label': '入力から出力まで'}, items) : null;
  }

  function explanation(model) {
    const parts = list0(model.explanation).filter(part => text(part?.title) && text(part?.text));
    if (!parts.length) return flow(model);
    return h('div', {class: 'ow-explanation'}, parts.map(part => h('section', {class: 'ow-explain-part'},
      h('h4', {}, text(part.title)), h('p', {}, text(part.text)))));
  }

  // ---------- Zoom Lightbox ----------

  function closeZoom() {
    if (zoomDialog && zoomDialog.open) zoomDialog.close();
  }

  function openZoom(model, trigger) {
    const href = safeHref(model.concept);
    if (!href || isExternal(href)) return;
    if (!zoomDialog || typeof zoomDialog.showModal !== 'function') {
      location.href = href;
      return;
    }
    zoomInvoker = trigger || document.activeElement;
    const fieldLabel = labels.get(taskCategoryOf(model)) || '';
    const modelName = text(model.name) || model.id;
    const file = href.split('/').pop() || model.id + '.svg';

    if (zoomMetaEl) zoomMetaEl.textContent = [text(model.task), fieldLabel].filter(Boolean).join(' · ');
    if (zoomTitleEl) zoomTitleEl.textContent = modelName + ' の模式図';
    if (zoomNoteEl) zoomNoteEl.textContent = text(model.diagram_note) || 'モデルの働きを説明する模式図です。';
    if (zoomAltEl) zoomAltEl.textContent = text(model.concept_alt) || '';
    if (zoomAltEl) zoomAltEl.hidden = !zoomAltEl.textContent;

    if (zoomFrameEl) {
      const img = h('img', {
        src: href,
        alt: text(model.concept_alt) || '模式図：' + modelName,
        width: '880',
        height: '540',
        decoding: 'async'
      });
      img.addEventListener('error', () => {
        zoomFrameEl.replaceChildren(h('p', {class: 'ow-figure-missing'}, '図を読み込めませんでした。'));
      }, {once: true});
      zoomFrameEl.replaceChildren(img);
    }

    if (zoomActionsEl) {
      zoomActionsEl.replaceChildren(
        h('a', {class: 'btn btn-line', href, 'aria-label': modelName + 'の模式図（SVG）を別画面で開く'}, 'SVGを開く'),
        h('a', {class: 'btn btn-line', href, download: file, 'aria-label': modelName + 'の模式図（SVG）を保存'}, 'SVGを保存')
      );
    }

    document.documentElement.classList.add('has-ow-zoom');
    zoomDialog.showModal();
    zoomCloseBtn?.focus({preventScroll: true});
    if (zoomLiveEl) zoomLiveEl.textContent = modelName + 'の模式図を拡大表示しました。';
  }

  if (zoomDialog) {
    zoomCloseBtn?.addEventListener('click', closeZoom);
    let pressedOutside = false;
    zoomDialog.addEventListener('pointerdown', event => { pressedOutside = event.target === zoomDialog; });
    zoomDialog.addEventListener('click', event => {
      if (event.target === zoomDialog && pressedOutside) closeZoom();
      pressedOutside = false;
    });
    zoomDialog.addEventListener('close', () => {
      document.documentElement.classList.remove('has-ow-zoom');
      if (zoomFrameEl) zoomFrameEl.replaceChildren();
      if (zoomLiveEl) zoomLiveEl.textContent = '';
      const invoker = zoomInvoker;
      zoomInvoker = null;
      if (invoker && invoker.isConnected) invoker.focus({preventScroll: true});
    });
  }

  function figure(model, index) {
    const href = safeHref(model.concept);
    if (!href || isExternal(href)) return null;
    const modelName = text(model.name) || model.id;
    const frame = h('div', {class: 'ow-figure-frame'});
    const img = h('img', {
      src: href, alt: text(model.concept_alt) || '模式図：' + modelName,
      width: '880', height: '540', decoding: 'async', loading: index < 2 ? 'eager' : 'lazy'
    });
    const zoomThumbBtn = h('button', {
      type: 'button', class: 'ow-figure-zoom-btn',
      'aria-label': modelName + 'の模式図を拡大して見る',
      onclick: () => openZoom(model, zoomThumbBtn)
    }, img);
    img.addEventListener('error', () => {
      frame.replaceChildren(h('p', {class: 'ow-figure-missing'}, '図を読み込めませんでした。'));
    }, {once: true});
    frame.append(zoomThumbBtn);
    const file = href.split('/').pop() || model.id + '.svg';
    const zoomTextBtn = h('button', {
      type: 'button', class: 'ow-figcap-zoom',
      'aria-label': modelName + 'の模式図を拡大して見る',
      onclick: () => openZoom(model, zoomTextBtn)
    }, '拡大して見る');
    return h('figure', {class: 'ow-figure'},
      frame,
      h('figcaption', {class: 'ow-figcap'},
        h('span', {class: 'ow-figcap-tag'}, '模式図'),
        h('span', {class: 'ow-figcap-text'}, text(model.diagram_note) || 'モデルの働きを説明する図です。'),
        h('span', {class: 'ow-figcap-links'},
          zoomTextBtn,
          h('a', {href, 'aria-label': modelName + 'の模式図（SVG）を開く'}, 'SVGを開く'),
          h('a', {href, download: file, 'aria-label': modelName + 'の模式図（SVG）を保存'}, 'SVGを保存'))));
  }

  function example(model) {
    const ex = model.example;
    if (!ex || typeof ex !== 'object') return null;
    const kind = EXAMPLE_KIND[ex.kind] || {heading: '関連リンク', badge: ''};
    const link = extLink(ex.url, text(ex.label) || '作例を見る', 'btn btn-line ow-example-link');
    return h('div', {class: 'ow-example is-' + (EXAMPLE_KIND[ex.kind] ? ex.kind : 'other')},
      h('p', {class: 'ow-example-head'},
        h('span', {class: 'ow-example-heading'}, kind.heading),
        kind.badge && ex.kind !== 'linked-demo' ? h('span', {class: 'ow-badge'}, kind.badge) : null),
      text(ex.title) ? h('h4', {class: 'ow-example-title'}, text(ex.title)) : null,
      text(ex.description) ? h('p', {class: 'ow-example-desc'}, text(ex.description)) : null,
      link ? h('div', {class: 'ow-example-act'}, link, urlLine(ex.url)) : null,
      text(ex.credit) ? h('p', {class: 'ow-example-credit'}, '出典：' + text(ex.credit)) : null);
  }

  function fact(term, ...desc) {
    const items = desc.flat().filter(Boolean);
    return items.length ? h('div', {class: 'ow-fact'}, h('dt', {}, term), h('dd', {}, items)) : null;
  }

  function weightsBlock(w) {
    if (!w || typeof w !== 'object') return null;
    const access = w.gated === true
      ? '取得前に、公開ページで利用条件への同意が必要（ゲート付き）。'
      : w.gated === false ? 'アクセス申請なしで取得できる公開リポジトリ。' : '';
    const status = w.availability === 'published' ? '公開中' : text(w.availability);
    const filesCount = Number.isFinite(w.weight_files_count) ? w.weight_files_count + '件' : '';
    return h('dl', {class: 'ow-facts'},
      fact('モデルID', text(w.model_id) ? h('code', {class: 'ow-code'}, text(w.model_id)) : null),
      fact('取得条件', access || null),
      fact('状態', status || null),
      fact('重みファイル数', filesCount || null),
      fact('固定した版', text(w.revision) ? h('code', {class: 'ow-code'}, text(w.revision)) : null),
      fact('配布ページ', extLink(w.url, '公開されている重みを見る'), urlLine(w.url)));
  }

  function details(model) {
    const limits = list0(model.limitations).map(text).filter(Boolean);
    const post = model.post || {};
    const license = model.license || {};
    const sources = list0(model.sources).filter(s => s && safeHref(s.url));
    const v = model.verification || {};
    const posted = formatPosted(post.posted_at);
    const checked = formatDay(v.checked_on);

    const sections = [
      text(model.example?.note) && h('section', {class: 'ow-d-sec'},
        h('h4', {}, '作例について'), h('p', {}, text(model.example.note))),
      text(model.requirements) && h('section', {class: 'ow-d-sec'},
        h('h4', {}, '動かすのに必要なもの'), h('p', {}, text(model.requirements))),
      limits.length && h('section', {class: 'ow-d-sec'},
        h('h4', {}, 'このモデルで気をつけること'), h('ul', {class: 'ow-limits'}, limits.map(t => h('li', {}, t)))),
      safeHref(post.url) && h('section', {class: 'ow-d-sec'},
        h('h4', {}, 'Xでの紹介'),
        text(post.context) ? h('p', {}, text(post.context)) : null,
        h('p', {class: 'ow-d-link'}, extLink(post.url, '紹介投稿を読む'), posted ? h('span', {class: 'ow-d-meta'}, posted + 'の投稿') : null)),
      model.weights && h('section', {class: 'ow-d-sec'}, h('h4', {}, '公開されている重み'), weightsBlock(model.weights)),
      (text(license.name) || safeHref(license.url)) && h('section', {class: 'ow-d-sec'},
        h('h4', {}, 'ライセンス'),
        text(license.name) ? h('p', {class: 'ow-license-name'}, text(license.name)) : null,
        text(license.note) ? h('p', {}, text(license.note)) : null,
        safeHref(license.url) ? h('p', {class: 'ow-d-link'}, extLink(license.url, '固定した版の原文を読む'), urlLine(license.url)) : null),
      (sources.length || checked) && h('section', {class: 'ow-d-sec ow-d-check'},
        h('h4', {}, '原典確認'),
        sources.length ? h('ul', {class: 'ow-sources'}, sources.map(s =>
          h('li', {}, extLink(s.url, text(s.label) || '原典'), urlLine(s.url)))) : null,
        checked || v.inference === 'not-run' ? h('p', {class: 'ow-d-meta'},
          (checked ? checked + 'に原典を確認。' : '') + (v.inference === 'not-run' ? '今回の追加ではモデルの推論を実行していません。' : '')) : null)
    ].filter(Boolean);

    if (!sections.length) return null;
    const detailsEl = h('details', {class: 'ow-more'},
      h('summary', {}, h('span', {class: 'ow-more-label'}, '環境・注意点・重み・ライセンス'), h('span', {class: 'ow-more-icon', 'aria-hidden': 'true'})),
      h('div', {class: 'ow-more-body'}, sections));
    detailsEl.addEventListener('toggle', syncToggleAll);
    return detailsEl;
  }

  function copyModelIdButton(modelId) {
    const cleanId = text(modelId);
    if (!cleanId) return null;
    const stateLabel = h('span', {class: 'ow-copy-state'}, 'コピー');
    let resetTimer = 0;
    const btn = h('button', {
      type: 'button',
      class: 'ow-pill ow-pill-copy',
      'aria-label': 'モデルIDをコピー：' + cleanId,
      title: 'モデルIDをコピー'
    }, h('code', {class: 'ow-pill-code'}, cleanId), stateLabel);

    btn.addEventListener('click', async event => {
      event.stopPropagation();
      const ok = await copyText(cleanId);
      clearTimeout(resetTimer);
      if (ok) {
        btn.dataset.copied = 'true';
        stateLabel.textContent = 'コピー済み';
        showToast('モデルIDをコピーしました：' + cleanId);
        resetTimer = setTimeout(() => {
          delete btn.dataset.copied;
          stateLabel.textContent = 'コピー';
        }, 2000);
      } else {
        showToast('コピーできませんでした：' + cleanId);
      }
    });
    return btn;
  }

  function specPills(model) {
    const fieldId = taskCategoryOf(model);
    const fieldLabel = labels.get(fieldId) || fieldId;
    const gated = model.weights?.gated;
    const licenseName = text(model.license?.name);
    const exKind = EXAMPLE_KIND[model.example?.kind];
    const copyBtn = copyModelIdButton(model.weights?.model_id);

    const items = [
      fieldLabel ? h('span', {class: 'ow-pill ow-pill-field'}, fieldLabel) : null,
      gated === true
        ? h('span', {class: 'ow-pill ow-pill-gated'}, 'HF要同意')
        : gated === false ? h('span', {class: 'ow-pill ow-pill-open'}, '即取得可') : null,
      licenseName ? h('span', {class: 'ow-pill ow-pill-lic'}, licenseName) : null,
      exKind ? h('span', {class: 'ow-pill ow-pill-ex is-' + model.example.kind}, exKind.pill) : null,
      copyBtn
    ].filter(Boolean);

    return items.length ? h('div', {class: 'ow-pills', 'aria-label': 'モデルの仕様'}, items) : null;
  }

  function cardActions(model) {
    const itemActionsEl = window.SY.itemActions?.create('owm-' + model.id, model.name, 'open-models.html#' + encodeURIComponent(model.id));
    const briefHref = safeHref('prompt-studio.html?tool=' + encodeURIComponent('owm-' + model.id));
    const briefLink = briefHref
      ? h('a', {class: 'btn btn-line ow-brief-link', href: briefHref}, '依頼ブリーフ作成')
      : null;
    return h('div', {class: 'ow-card-actions'}, itemActionsEl, briefLink);
  }

  function card(model, index) {
    const nameId = 'ow-name-' + model.id;
    const fieldId = taskCategoryOf(model);
    const cat = labels.get(fieldId) || fieldId;
    const detailsEl = details(model);
    const cardEl = h('li', {class: 'ow-card', id: model.id, tabindex: '-1'},
      h('header', {class: 'ow-card-head'},
        h('p', {class: 'ow-kicker'},
          h('span', {class: 'ow-num', 'aria-hidden': 'true'}, String(index + 1).padStart(2, '0')),
          text(model.task) ? h('span', {class: 'ow-task'}, text(model.task)) : null,
          cat ? h('span', {class: 'ow-cat'}, cat) : null),
        h('h3', {class: 'ow-name', id: nameId}, text(model.name) || model.id),
        text(model.provider) ? h('p', {class: 'ow-provider'}, text(model.provider)) : null,
        specPills(model),
        text(model.headline) ? h('p', {class: 'ow-headline'}, text(model.headline)) : null,
        cardActions(model),
        h('a', {class: 'ow-anchor', href: '#' + model.id, 'aria-label': (text(model.name) || model.id) + 'へのリンク'}, '#')),
      figure(model, index),
      h('div', {class: 'ow-card-body'},
        text(model.summary) ? h('p', {class: 'ow-summary'}, text(model.summary)) : null,
        explanation(model),
        example(model),
        detailsEl));
    return {cardEl, detailsEl};
  }

  function renderMatrix(visibleItems) {
    if (!matrixWrap) return;
    const headers = [
      'モデル名', '用途分野', '提供元', 'ライセンス',
      '取得条件', '重みファイル数', '必要な環境', '作例区分', '実行状態'
    ];
    const rows = visibleItems.map(item => {
      const m = item.model;
      const fieldLabel = labels.get(item.taskField) || item.taskField || '—';
      const filesCount = Number.isFinite(m.weights?.weight_files_count) ? m.weights.weight_files_count + '件' : '—';
      const exKind = EXAMPLE_KIND[m.example?.kind]?.pill || '関連リンク';
      const checked = formatDay(m.verification?.checked_on);
      const verifyText = m.verification?.inference === 'not-run'
        ? '未実行・原典確認' + (checked ? '（' + checked + '）' : '')
        : '原典確認';
      const hfHref = safeHref(m.weights?.url);

      const jumpBtn = h('button', {
        type: 'button',
        class: 'ow-matrix-jump',
        onclick: () => showModel(m.id, {focus: true, smooth: true})
      }, text(m.name) || m.id);

      return h('tr', {},
        h('th', {scope: 'row', class: 'ow-matrix-sticky'},
          jumpBtn,
          text(m.weights?.model_id) ? h('code', {class: 'ow-matrix-id'}, text(m.weights.model_id)) : null,
          hfHref ? h('a', {class: 'ow-matrix-hf', href: hfHref}, 'Hugging Faceで見る') : null),
        h('td', {}, fieldLabel, text(m.task) ? h('span', {class: 'ow-matrix-sub'}, text(m.task)) : null),
        h('td', {}, text(m.provider) || '—'),
        h('td', {}, text(m.license?.name) || '—'),
        h('td', {}, h('span', {class: item.access === 'gated' ? 'ow-pill ow-pill-gated' : 'ow-pill ow-pill-open'},
          item.access === 'gated' ? 'HF要同意' : '即取得可')),
        h('td', {class: 'ow-matrix-num'}, filesCount),
        h('td', {class: 'ow-matrix-env'}, text(m.requirements) || '—'),
        h('td', {}, exKind),
        h('td', {}, verifyText));
    });

    const table = h('table', {class: 'ow-matrix-table'},
      h('thead', {}, h('tr', {}, headers.map((label, idx) =>
        h('th', {scope: 'col', class: idx === 0 ? 'ow-matrix-sticky' : null}, label)))),
      h('tbody', {}, rows));

    matrixWrap.replaceChildren(
      h('p', {class: 'ow-matrix-note'}, '比較表の項目は、固定したモデルカードとライセンスの原典確認にもとづく情報です（モデルの推論は未実行）。モデル名を押すとカード表示へ移動します。'),
      h('div', {class: 'ow-matrix-scroll', tabindex: '0', role: 'region', 'aria-label': 'OpenWeight比較マトリクス'}, table));
  }

  function chips() {
    const counts = new Map();
    for (const item of models) counts.set(item.taskField, (counts.get(item.taskField) || 0) + 1);
    const make = (id, label, count) => h('button', {
      type: 'button', class: 'chip', 'data-field': id, 'aria-pressed': String(state.field === id),
      onclick: () => { if (state.field !== id) setState({...state, field: id}, 'push'); }
    }, label, h('span', {class: 'chip-count'}, String(count)));
    fieldsEl.replaceChildren(
      make('all', 'すべて', models.length),
      ...fieldOrder.map(id => make(id, labels.get(id) || id, counts.get(id) || 0)));
    fieldsEl.hidden = fieldOrder.length < 2;
  }

  // ---------- Loading ----------

  function fillCopy(data) {
    const pairs = [['[data-ow-intro]', data.intro], ['[data-ow-definition]', data.definition], ['[data-ow-evidence]', data.evidence_note]];
    for (const [sel, value] of pairs) {
      const el = $(sel);
      if (el && text(value)) el.textContent = text(value);
    }
    const updated = $('[data-ow-updated]');
    if (updated) updated.textContent = formatDay(data.updated_on) || '—';
  }

  function build(data, categories) {
    labels = new Map();
    for (const c of list0(categories)) if (c && typeof c.id === 'string' && text(c.label)) labels.set(c.id, text(c.label));

    const seen = new Set();
    const valid = list0(data.models).filter(m => m && m.model_axis === 'task-specialist' && typeof m.id === 'string' && ID_RE.test(m.id)
      && !seen.has(m.id) && seen.add(m.id));
    if (!valid.length) return false;

    const present = new Set(valid.map(taskCategoryOf).filter(Boolean));
    fieldOrder = list0(categories).map(c => c && c.id).filter(id => present.has(id) && labels.has(id));
    for (const id of present) {
      if (!fieldOrder.includes(id)) fieldOrder.push(id);
    }

    models = valid.map((model, i) => {
      const {cardEl, detailsEl} = card(model, i);
      const req = text(model.requirements);
      const gated = model.weights?.gated;
      return {
        model,
        card: cardEl,
        detailsEl,
        hay: haystack(model),
        taskField: taskCategoryOf(model),
        access: gated === true ? 'gated' : gated === false ? 'open' : 'unknown',
        licenseKind: classifyLicense(model.license?.name),
        hasCpu: /\bcpu\b/i.test(req),
        hasGpu: /\b(?:gpu|cuda)\b/i.test(req)
      };
    });
    byId = new Map(models.map(item => [item.model.id, item]));

    fillCopy(data);
    state = readURL();
    input.value = state.q;
    chips();
    list.replaceChildren(...models.map(item => item.card));
    list.setAttribute('aria-busy', 'false');
    apply();

    const id = currentHash();
    if (byId.has(id)) requestAnimationFrame(() => showModel(id, {smooth: false}));
    return true;
  }

  async function load() {
    if (loading) return;
    loading = true;
    emptyEl.hidden = true;
    if (matrixWrap) matrixWrap.hidden = true;
    if (toggleAllBtn) toggleAllBtn.hidden = true;
    list.hidden = false;
    list.setAttribute('aria-busy', 'true');
    if (!list.children.length) {
      const skel = () => h('li', {class: 'ow-skel', 'aria-hidden': 'true'}, h('span'), h('span'), h('span'));
      list.replaceChildren(skel(), skel());
    }
    statusEl.textContent = 'モデルを読み込んでいます…';
    const [modelsRes, catsRes] = await Promise.allSettled([loadJSON('data/open-models.json'), loadJSON('data/categories.json')]);
    loading = false;
    const data = modelsRes.status === 'fulfilled' ? modelsRes.value : null;
    let built = false;
    if (data && Array.isArray(data.models)) {
      try { built = build(data, catsRes.status === 'fulfilled' ? catsRes.value?.categories : []); } catch { built = false; }
    }
    if (!built) {
      models = [];
      byId = new Map();
      list.replaceChildren();
      list.hidden = true;
      list.setAttribute('aria-busy', 'false');
      if (matrixWrap) matrixWrap.hidden = true;
      fieldsEl.hidden = true;
      statusEl.textContent = '読み込めませんでした。';
      errorEl.hidden = false;
    } else {
      errorEl.hidden = true;
    }
  }

  // ---------- Events ----------

  function scheduleSearch() {
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      typingTimer = 0;
      setState({...state, q: input.value}, 'replace');
    }, 150);
  }

  input.addEventListener('compositionstart', () => {
    composing = true;
    clearTimeout(typingTimer);
    typingTimer = 0;
  });
  input.addEventListener('compositionend', () => {
    composing = false;
    scheduleSearch();
  });
  input.addEventListener('input', event => {
    if (!composing && !event.isComposing) scheduleSearch();
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (composing) return;
    clearTimeout(typingTimer);
    typingTimer = 0;
    setState({...state, q: input.value}, 'push');
    if (coarsePointer.matches) {
      input.blur();
      statusEl.scrollIntoView({behavior: scrollBehavior(), block: 'start'});
    }
  });

  form.addEventListener('click', event => {
    const accessBtn = event.target.closest('[data-ow-access]');
    if (accessBtn) {
      const val = accessBtn.dataset.owAccess;
      if (ACCESS_OPTS.has(val) && state.access !== val) setState({...state, access: val}, 'push');
      return;
    }
    const licenseBtn = event.target.closest('[data-ow-license]');
    if (licenseBtn) {
      const val = licenseBtn.dataset.owLicense;
      if (LICENSE_OPTS.has(val) && state.license !== val) setState({...state, license: val}, 'push');
      return;
    }
    const envBtn = event.target.closest('[data-ow-env]');
    if (envBtn) {
      const val = envBtn.dataset.owEnv;
      if (ENV_OPTS.has(val) && state.env !== val) setState({...state, env: val}, 'push');
      return;
    }
    const viewBtn = event.target.closest('[data-ow-view]');
    if (viewBtn) {
      const val = viewBtn.dataset.owView;
      if (VIEW_OPTS.has(val) && state.view !== val) setState({...state, view: val}, 'push');
    }
  });

  toggleAllBtn?.addEventListener('click', () => {
    const visibleItems = models.filter(item => !item.card.hidden && item.detailsEl);
    if (!visibleItems.length) return;
    const shouldOpen = !visibleItems.every(item => item.detailsEl.open);
    for (const item of visibleItems) item.detailsEl.open = shouldOpen;
    syncToggleAll();
    announce(shouldOpen ? '表示中のモデルの詳細をすべて開きました。' : '表示中のモデルの詳細をすべて閉じました。');
  });

  resetBtn.addEventListener('click', resetAll);
  $('[data-ow-empty-reset]')?.addEventListener('click', resetAll);
  const owRetry = $('[data-ow-retry]');
  owRetry?.addEventListener('click', () => {
    const restore = document.activeElement === owRetry;
    load().then(() => {
      if (!restore || !errorEl.hidden) return;
      const active = document.activeElement;
      if (active === document.body || errorEl.contains(active)) $('#ow-gallery')?.focus({preventScroll: true});
    });
  });

  document.addEventListener('keydown', event => {
    if (event.defaultPrevented || event.isComposing || event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
    if (zoomDialog?.open) return;
    const active = document.activeElement;
    if (active && (active.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName))) return;
    event.preventDefault();
    input.focus();
  });

  window.addEventListener('popstate', () => {
    clearTimeout(typingTimer);
    composing = false;
    closeZoom();
    if (!models.length) return;
    state = readURL();
    input.value = state.q;
    apply();
    const id = currentHash();
    if (byId.get(id)?.card.hidden) showModel(id, {smooth: false});
  });

  window.addEventListener('hashchange', () => {
    const id = currentHash();
    showModel(id);
  });

  load();
})();
