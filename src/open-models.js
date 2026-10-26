/* Yaoyorozu AI ToolBox — open-weight model guide (open-models.html). Load after ui.js.
   Reads data/open-models.json and data/categories.json only; every value from JSON is set as text.
   URL: ?q=<words>&field=<category id>#<model id>. Typing replaces the history entry, field chips and
   reset add one. A model hash always wins over filters that would hide it. Nothing here changes window.SY. */
(() => {
  'use strict';

  const {$, h, safeHref, isExternal, displayUrl, loadJSON, norm, scrollBehavior, announce} = window.SY;

  const form = $('[data-ow-form]');
  const input = $('[data-ow-q]');
  const fieldsEl = $('[data-ow-fields]');
  const statusEl = $('[data-ow-status]');
  const resetBtn = $('[data-ow-reset]');
  const list = $('[data-ow-list]');
  const emptyEl = $('[data-ow-empty]');
  const errorEl = $('[data-ow-error]');
  if (!form || !input || !list) return;

  const ID_RE = /^[a-z0-9][a-z0-9-]*$/;
  const EXAMPLE_KIND = {
    'linked-demo': {heading: '公開されている作例', badge: '外部の公開作例'},
    'introduced-workflow': {heading: '紹介した使い方', badge: '投稿に書いた利用例'},
    'illustrative-use': {heading: '使いどころの例', badge: '説明用・実行結果ではない'}
  };

  let models = [];            // [{model, card, hay}]
  let byId = new Map();
  let labels = new Map();     // category id -> label
  let fieldOrder = [];        // category ids present in models, in categories.json order
  let state = {q: '', field: 'all'};
  let loading = false;

  const text = value => (typeof value === 'string' ? value.trim() : '');
  const list0 = value => (Array.isArray(value) ? value : []);

  // ---------- URL state ----------

  function readURL() {
    const params = new URLSearchParams(location.search);
    const field = params.get('field') || 'all';
    return {q: params.get('q') || '', field: fieldOrder.includes(field) ? field : 'all'};
  }

  function urlFor(next, hash) {
    const params = new URLSearchParams();
    if (next.q.trim()) params.set('q', next.q.trim());
    if (next.field !== 'all') params.set('field', next.field);
    const qs = params.toString();
    return location.pathname + (qs ? '?' + qs : '') + (hash ? '#' + hash : '');
  }

  function commit(mode) {
    const url = urlFor(state, '');
    if (url === location.pathname + location.search + location.hash) return;
    history[mode === 'push' ? 'pushState' : 'replaceState'](null, '', url);
  }

  function currentHash() {
    try { return decodeURIComponent(location.hash.slice(1)); } catch { return ''; }
  }

  // ---------- Filtering ----------

  function tokens(q) { return norm(q).split(/\s+/).filter(Boolean); }

  function matches(item, words, field) {
    if (field !== 'all' && item.model.category !== field) return false;
    return words.every(word => item.hay.includes(word));
  }

  function apply() {
    // Before the list arrives, typing only updates the URL; build() reads it back.
    if (!models.length) return;
    const words = tokens(state.q);
    let shown = 0;
    for (const item of models) {
      const visible = matches(item, words, state.field);
      item.card.hidden = !visible;
      if (visible) shown += 1;
    }
    syncControls();
    renderStatus(shown);
    emptyEl.hidden = shown > 0;
    resetBtn.hidden = !isFiltered();
  }

  const isFiltered = () => Boolean(state.q.trim()) || state.field !== 'all';

  function renderStatus(shown) {
    const parts = [
      h('span', {class: 'ow-status-total'}, '全' + models.length + '件のうち'),
      h('span', {class: 'ow-status-main'}, h('strong', {}, String(shown)), '件を表示')
    ];
    const filters = [];
    if (state.q.trim()) filters.push('「' + state.q.trim() + '」');
    if (state.field !== 'all') filters.push(labels.get(state.field) || state.field);
    if (filters.length) parts.push(h('span', {class: 'ow-status-filters'}, filters.join('・') + 'で絞り込み'));
    statusEl.replaceChildren(...parts);
  }

  function syncControls() {
    if (input.value !== state.q) input.value = state.q;
    for (const chip of fieldsEl.querySelectorAll('[data-field]')) {
      chip.setAttribute('aria-pressed', String(chip.dataset.field === state.field));
    }
  }

  function setState(next, mode) {
    state = next;
    apply();
    commit(mode);
  }

  function resetAll() {
    setState({q: '', field: 'all'}, 'push');
    input.focus();
  }

  // ---------- Hash: one model ----------

  function showModel(id, {focus = true, smooth = true} = {}) {
    const item = byId.get(id);
    if (!item) return false;
    if (item.card.hidden) {
      state = {q: '', field: 'all'};
      apply();
      history.replaceState(null, '', urlFor(state, id));
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
    const parts = [
      model.name, model.provider, model.task, model.headline, model.summary,
      model.input?.label, model.input?.text, model.process?.label, model.process?.text,
      model.output?.label, model.output?.text,
      model.license?.name, model.license?.note, model.weights?.model_id,
      ...list0(model.explanation).flatMap(part => [part.title, part.text]), model.diagram_note,
      labels.get(model.category)
    ];
    return norm(parts.filter(v => typeof v === 'string').join(' '));
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

  function figure(model, index) {
    const href = safeHref(model.concept);
    if (!href || isExternal(href)) return null;
    const frame = h('div', {class: 'ow-figure-frame'});
    const img = h('img', {
      src: href, alt: text(model.concept_alt) || '模式図：' + text(model.name),
      width: '880', height: '540', decoding: 'async', loading: index < 2 ? 'eager' : 'lazy'
    });
    img.addEventListener('error', () => {
      frame.replaceChildren(h('p', {class: 'ow-figure-missing'}, '図を読み込めませんでした。'));
    }, {once: true});
    frame.append(img);
    const file = href.split('/').pop() || model.id + '.svg';
    return h('figure', {class: 'ow-figure'},
      frame,
      h('figcaption', {class: 'ow-figcap'},
        h('span', {class: 'ow-figcap-tag'}, '模式図'),
        h('span', {class: 'ow-figcap-text'}, text(model.diagram_note) || 'モデルの働きを説明する図です。'),
        h('span', {class: 'ow-figcap-links'},
          h('a', {href, 'aria-label': text(model.name) + 'の模式図（SVG）を開く'}, 'SVGを開く'),
          h('a', {href, download: file, 'aria-label': text(model.name) + 'の模式図（SVG）を保存'}, 'SVGを保存'))));
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
    return h('dl', {class: 'ow-facts'},
      fact('モデルID', text(w.model_id) ? h('code', {class: 'ow-code'}, text(w.model_id)) : null),
      fact('取得条件', access || null),
      fact('状態', status || null),
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
    return h('details', {class: 'ow-more'},
      h('summary', {}, h('span', {class: 'ow-more-label'}, '環境・注意点・重み・ライセンス'), h('span', {class: 'ow-more-icon', 'aria-hidden': 'true'})),
      h('div', {class: 'ow-more-body'}, sections));
  }

  function card(model, index) {
    const nameId = 'ow-name-' + model.id;
    const license = text(model.license?.name);
    const cat = labels.get(model.category);
    return h('li', {class: 'ow-card', id: model.id, tabindex: '-1'},
      h('header', {class: 'ow-card-head'},
        h('p', {class: 'ow-kicker'},
          h('span', {class: 'ow-num', 'aria-hidden': 'true'}, String(index + 1).padStart(2, '0')),
          text(model.task) ? h('span', {class: 'ow-task'}, text(model.task)) : null,
          cat ? h('span', {class: 'ow-cat'}, cat) : null),
        h('h3', {class: 'ow-name', id: nameId}, text(model.name) || model.id),
        h('p', {class: 'ow-meta'},
          text(model.provider) ? h('span', {}, text(model.provider)) : null,
          license ? h('span', {class: 'ow-lic'}, license) : null,
          model.weights?.gated === true ? h('span', {class: 'ow-gated'}, '取得に同意が必要') : null),
        text(model.headline) ? h('p', {class: 'ow-headline'}, text(model.headline)) : null,
        window.SY.itemActions.create('owm-' + model.id, model.name, 'open-models.html#' + encodeURIComponent(model.id)),
        h('a', {class: 'ow-anchor', href: '#' + model.id, 'aria-label': (text(model.name) || model.id) + 'へのリンク'}, '#')),
      figure(model, index),
      h('div', {class: 'ow-card-body'},
        text(model.summary) ? h('p', {class: 'ow-summary'}, text(model.summary)) : null,
        explanation(model),
        example(model),
        details(model)));
  }

  function chips() {
    const counts = new Map();
    for (const {model} of models) counts.set(model.category, (counts.get(model.category) || 0) + 1);
    const make = (id, label, count) => h('button', {
      type: 'button', class: 'chip', 'data-field': id, 'aria-pressed': String(state.field === id),
      onclick: () => { if (state.field !== id) setState({q: state.q, field: id}, 'push'); }
    }, label, h('span', {class: 'chip-count'}, String(count)));
    fieldsEl.replaceChildren(
      make('all', 'すべて', models.length),
      ...fieldOrder.map(id => make(id, labels.get(id), counts.get(id))));
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
    const present = new Set(valid.map(m => m.category));
    fieldOrder = list0(categories).map(c => c && c.id).filter(id => present.has(id) && labels.has(id));

    models = valid.map((model, i) => ({model, card: card(model, i), hay: haystack(model)}));
    byId = new Map(models.map(item => [item.model.id, item]));

    fillCopy(data);
    state = readURL();
    chips();
    list.replaceChildren(...models.map(item => item.card));
    list.setAttribute('aria-busy', 'false');
    apply();

    const id = currentHash();
    if (document.getElementById(id)) requestAnimationFrame(() => showModel(id, {smooth: false}));
    return true;
  }

  async function load() {
    if (loading) return;
    loading = true;
    errorEl.hidden = true;
    emptyEl.hidden = true;
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
      // Category labels are optional: without them the models still show, only the chips are left out.
      try { built = build(data, catsRes.status === 'fulfilled' ? catsRes.value?.categories : []); } catch { built = false; }
    }
    if (!built) {
      models = [];
      byId = new Map();
      list.replaceChildren();
      list.hidden = true;
      list.setAttribute('aria-busy', 'false');
      fieldsEl.hidden = true;
      statusEl.textContent = '読み込めませんでした。';
      errorEl.hidden = false;
    }
  }

  // ---------- Events ----------

  form.addEventListener('submit', event => {
    event.preventDefault();
    setState({q: input.value, field: state.field}, 'push');
  });
  input.addEventListener('input', () => setState({q: input.value, field: state.field}, 'replace'));
  resetBtn.addEventListener('click', resetAll);
  $('[data-ow-empty-reset]')?.addEventListener('click', resetAll);
  $('[data-ow-retry]')?.addEventListener('click', load);

  window.addEventListener('popstate', () => {
    if (!models.length) return;
    state = readURL();
    apply();
    // The browser restores scroll on traversal; only step in when the restored filters hide the hash target.
    const id = currentHash();
    if (byId.get(id)?.card.hidden) showModel(id, {smooth: false});
  });
  window.addEventListener('hashchange', () => {
    const id = currentHash();
    showModel(id);
  });

  load();
})();
