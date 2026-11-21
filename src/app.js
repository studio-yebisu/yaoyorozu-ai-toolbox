/* Yaoyorozu AI ToolBox — home page. Loads data/catalog.json, data/cases.json, and optional data/tag-aliases.json.
   Categories come only from catalog.categories (fallback: data/categories.json), so adding or
   removing a category needs no change here.
   URL contract: ./?q=<words>&cat=<id>&kind=skill|support&stage=runtime|source|model&tag=<tag>&sort=updated|likes|name&case=1&saved=1#<category id | section id>.
   Old links such as #agents still select that field. Picking a field or submitting the top search
   adds a history entry; typing, the select, the gallery chips and the toggles replace the current one.
   The words and the field apply to both the case gallery and the catalog; kind, stage, tag, sort and case apply to the
   catalog. Opening a case card shows a preview dialog (gallery.js) without touching the URL. */
(() => {
  'use strict';

  const {$, $$, h, safeHref, joinLines, loadJSON, norm, scrollBehavior, announce} = window.SY;
  const normSearch = value => (window.SY.normSearch || norm)(value);

  const PAGE_SIZE = 12;
  const GALLERY_PAGE_SIZE = 9;
  const FIRST_ROW = 3;
  const VIEW_KEY = 'yaoyorozu-view-v1';
  const VIDEO_EXT = /\.(mp4|webm|mov|m4v)(\?|#|$)/i;
  const KINDS = new Set(['all', 'skill', 'support']);
  const STAGES = new Set(['all', 'runtime', 'source', 'model']);
  const SORTS = new Set(['default', 'updated', 'likes', 'name']);
  const VIEWS = new Set(['list', 'grid']);
  // Soft frame tints for the case posters, one per field in data order.
  const HUES = [28, 46, 150, 196, 258, 330, 88, 172];
  const coarsePointer = matchMedia('(pointer: coarse)');

  // Lookup tables keyed by data ids use null prototypes so ids such as "constructor" stay plain keys.
  const table = () => Object.create(null);
  const isSkill = entry => /^スキル/.test(String(entry.kind || '').trim());

  let initialView = 'list';
  try {
    const storedView = localStorage.getItem(VIEW_KEY);
    if (VIEWS.has(storedView)) initialView = storedView;
  } catch (_) { /* Storage optional. */ }

  const state = {
    entries: [], categoryList: [], categories: table(), totals: table(), caseTotals: table(), caseByEntry: table(),
    aliases: [], topTags: [],
    cases: undefined, galleryCases: [], loaded: false,
    q: '', cat: 'all', kind: 'all', stage: 'all', tag: '', sort: 'default',
    withCase: false, savedOnly: false, viewMode: initialView,
    limit: PAGE_SIZE, galleryLimit: GALLERY_PAGE_SIZE
  };

  let typingTimer = 0;
  let urlTimer = 0;
  let likesRenderTimer = 0;
  let composing = false;
  let lastCatalogMatched = 0;
  let currentGalleryList = [];

  const list = $('[data-entries]');
  const status = $('[data-status]');
  const empty = $('[data-empty]');
  const errorBox = $('[data-error]');
  const search = $('[data-search]');
  const heroSearch = $('[data-hero-q]');
  const heroClear = $('[data-hero-clear]');
  const intentChips = $$('[data-intent-q]');
  const catSelect = $('[data-cat-select]');
  const sortSelect = $('[data-sort]');
  const catDesc = $('[data-cat-desc]');
  const fieldMap = $('[data-field-map]');
  const more = $('[data-more]');
  const withCaseBox = $('[data-with-case]');
  const activeFilters = $('[data-active-filters]');
  const topTagsBar = $('[data-top-tags]');
  const viewButtons = $$('[data-view-mode]');
  const gallery = $('[data-gallery]');
  const galleryChips = $('[data-gallery-chips]');
  const galleryCount = $('[data-gallery-count]');
  const galleryQuery = $('[data-gallery-query]');
  const galleryEmpty = $('[data-gallery-empty]');
  const galleryMoreWrap = $('[data-gallery-more-wrap]');
  const galleryMoreBtn = $('[data-gallery-more]');
  const galleryAllBtn = $('[data-gallery-all]');
  const savedFilter = $('[data-saved-only]');
  const savedToolbar = $('.saved-toolbar');
  const studioTray = $('[data-studio-tray]');
  const traySavedBtn = $('[data-tray-saved]');
  const traySavedCount = $('[data-tray-saved-count]');
  const trayCompareLink = $('[data-tray-compare-link]');
  const trayCompareCount = $('[data-tray-compare-count]');

  function currentSavedCount() {
    const actions = window.SY.itemActions;
    if (!state.loaded) return actions.savedCount();
    const entryIds = new Set(state.entries.map(entry => entry.id));
    let count = state.entries.filter(entry => actions.isSaved(entry.id)).length;
    if (Array.isArray(state.cases)) {
      for (const item of state.cases) {
        const id = window.SY.likes.caseID(item);
        if (!entryIds.has(id) && actions.isSaved(id)) count++;
      }
    }
    return count;
  }

  function updateStudioTray(savedCount) {
    if (!studioTray) return;
    const actions = window.SY.itemActions;
    const compareIds = actions.getCompareIds ? actions.getCompareIds() : [];
    const hideTray = savedCount === 0 && compareIds.length === 0 && !state.savedOnly;
    if (hideTray && !studioTray.hidden && studioTray.contains(document.activeElement)) {
      $('#main').focus({preventScroll: true});
    }
    studioTray.hidden = hideTray;
    if (traySavedCount) traySavedCount.textContent = String(savedCount);
    if (traySavedBtn) traySavedBtn.setAttribute('aria-pressed', String(state.savedOnly));
    if (trayCompareCount) trayCompareCount.textContent = String(compareIds.length);
    if (trayCompareLink) {
      trayCompareLink.hidden = compareIds.length === 0;
      if (compareIds.length) {
        trayCompareLink.href = 'workbench.html?compare=' + encodeURIComponent(compareIds.join(','));
      }
    }
  }

  function updateSavedFilter() {
    const count = currentSavedCount();
    const hideToolbar = count === 0 && !state.savedOnly;
    if (hideToolbar && !savedToolbar.hidden && savedToolbar.contains(document.activeElement)) {
      $('#cases').focus({preventScroll: true});
    }
    savedToolbar.hidden = hideToolbar;
    savedFilter.hidden = false;
    savedFilter.setAttribute('aria-pressed', String(state.savedOnly));
    $('[data-saved-count]').textContent = String(count);
    updateStudioTray(count);
  }

  function categoryLabel(id) {
    return (state.categories[id] && state.categories[id].label) || id || '分類なし';
  }

  // Categories in data order, grouped by `group` in order of first appearance.
  function groupedCategories() {
    const groups = [];
    for (const category of state.categoryList) {
      const name = category.group || '';
      let group = groups.find(item => item.name === name);
      if (!group) groups.push(group = {name, items: []});
      group.items.push(category);
    }
    return groups;
  }

  async function readCategories(data, entries) {
    let source = Array.isArray(data.categories) ? data.categories : [];
    if (!source.length) {
      try {
        const extra = await loadJSON('data/categories.json');
        source = Array.isArray(extra.categories) ? extra.categories : [];
      } catch (_) { source = []; }
    }
    const result = [];
    const seen = new Set();
    for (const category of source) {
      if (!category || typeof category.id !== 'string' || !category.id || seen.has(category.id)) continue;
      seen.add(category.id);
      result.push(category);
    }
    for (const entry of entries) {
      if (entry.category && !seen.has(entry.category)) {
        seen.add(entry.category);
        result.push({id: String(entry.category), label: String(entry.category)});
      }
    }
    return result;
  }

  /* ---------- Search normalization & aliases ---------- */

  function repoSlug(url) {
    if (typeof url !== 'string') return '';
    const match = /^https?:\/\/github\.com\/([^/\s]+\/[^/\s]+)/i.exec(url.trim());
    return match ? match[1] : '';
  }

  function buildAliases(raw) {
    const out = [];
    const map = raw && typeof raw.aliases === 'object' ? raw.aliases : null;
    if (!map) return out;
    for (const [key, list] of Object.entries(map)) {
      const nk = normSearch(key);
      if (!nk || !Array.isArray(list)) continue;
      const syns = list.map(s => normSearch(s)).filter(Boolean);
      if (syns.length) out.push({key: nk, syns, joined: [nk, ...syns].join(' ')});
    }
    return out;
  }

  function termHitsText(term, baseNorm, tokens, tagSet) {
    if (tagSet.has(term)) return true;
    if (term.length <= 2 && /^[a-z0-9]+$/i.test(term)) return tokens.has(term);
    return baseNorm.includes(term);
  }

  function expandAliasText(baseNorm, tags) {
    if (!state.aliases.length) return '';
    const tagSet = new Set((tags || []).map(t => normSearch(t)).filter(Boolean));
    const tokens = new Set(baseNorm.split(/[^a-z0-9\u3040-\u30ff\u4e00-\u9fff]+/i).filter(Boolean));
    const extra = [];
    for (const alias of state.aliases) {
      const hit = termHitsText(alias.key, baseNorm, tokens, tagSet)
        || alias.syns.some(s => termHitsText(s, baseNorm, tokens, tagSet));
      if (hit) extra.push(alias.joined);
    }
    return extra.join(' ');
  }

  function stageOf(entry) {
    if (state.caseByEntry[entry.id] || entry.verification_stage === 'runtime-reviewed' || entry.verification_stage === 'concept-demo') {
      return 'runtime';
    }
    if (entry.resource_type === 'open-weight-model' || entry.verification_stage === 'model-source-reviewed') {
      return 'model';
    }
    return 'source';
  }

  function stageBadge(entry) {
    const stage = stageOf(entry);
    if (stage === 'runtime') return {label: '実制作デモ', cls: 'is-runtime'};
    if (stage === 'model') return {label: 'OpenWeight', cls: 'is-model'};
    if (entry.verification_stage === 'source-reviewed') return {label: '原典確認済み', cls: 'is-source'};
    if (typeof entry.guide_url === 'string' && entry.guide_url.startsWith('guides/')) return {label: 'ガイド収録', cls: 'is-guide'};
    return {label: '原典確認済み', cls: 'is-source'};
  }

  function indexEntryTexts() {
    for (const entry of state.entries) {
      const category = state.categories[entry.category];
      const badge = stageBadge(entry);
      const reqText = Array.isArray(entry.requirements) ? entry.requirements.join(' ') : String(entry.requirements || '');
      const base = normSearch([
        entry.id, entry.name, entry.tagline, entry.summary, entry.use_case,
        (entry.tags || []).join(' '), entry.kind, entry.category, entry.license,
        repoSlug(entry.source_url), reqText,
        entry.verification_stage, badge.label,
        category && category.label, category && category.group
      ].join(' '));
      const aliasExtra = expandAliasText(base, entry.tags);
      entry._text = aliasExtra ? base + ' ' + aliasExtra : base;
    }
    for (const item of (state.cases || [])) item._text = undefined;
  }

  /* ---------- Filtering & sorting ---------- */

  const termsOf = q => normSearch(q).split(/\s+/).filter(Boolean);

  function matches(entry, filter, terms) {
    if (filter.cat !== 'all' && entry.category !== filter.cat) return false;
    if (filter.kind !== 'all' && (filter.kind === 'skill') !== isSkill(entry)) return false;
    if (filter.stage !== 'all' && stageOf(entry) !== filter.stage) return false;
    if (filter.withCase && !state.caseByEntry[entry.id]) return false;
    if (filter.savedOnly && !window.SY.itemActions.isSaved(entry.id)) return false;
    if (filter.tag) {
      const target = normSearch(filter.tag);
      const tags = Array.isArray(entry.tags) ? entry.tags : [];
      if (!tags.some(t => normSearch(t) === target)) return false;
    }
    return terms.every(term => entry._text.includes(term));
  }

  function countWith(overrides, terms) {
    const filter = {
      cat: state.cat, kind: state.kind, stage: state.stage, tag: state.tag,
      withCase: state.withCase, savedOnly: state.savedOnly, ...overrides
    };
    let total = 0;
    for (const entry of state.entries) if (matches(entry, filter, terms)) total++;
    return total;
  }

  const hasFilters = () => state.cat !== 'all' || state.kind !== 'all' || state.stage !== 'all'
    || Boolean(state.tag) || state.withCase || state.savedOnly || Boolean(state.q.trim());

  function entryUpdated(entry) {
    const item = state.caseByEntry[entry.id];
    return String(entry.updated_on || (item && item.updated_on) || '');
  }

  function likeCountOf(entry) {
    if (window.SY.likes && typeof window.SY.likes.getCount === 'function') {
      const n = window.SY.likes.getCount(entry.id);
      if (typeof n === 'number') return n;
    }
    return -1;
  }

  function sortEntries(entries) {
    if (state.sort === 'default') return entries;
    const copy = entries.slice();
    if (state.sort === 'updated') {
      copy.sort((a, b) => entryUpdated(b).localeCompare(entryUpdated(a)) || a._idx - b._idx);
    } else if (state.sort === 'likes') {
      copy.sort((a, b) => (likeCountOf(b) - likeCountOf(a)) || a._idx - b._idx);
    } else if (state.sort === 'name') {
      copy.sort((a, b) => String(a.name || a.id).localeCompare(String(b.name || b.id), 'ja') || a._idx - b._idx);
    }
    return copy;
  }

  /* ---------- Catalog rows ---------- */

  const caseHref = item => 'case.html?id=' + encodeURIComponent(item.id);
  const entryHref = entry => {
    const item = state.caseByEntry[entry.id];
    return item ? caseHref(item) : entry.resource_type === 'open-weight-model' && safeHref(entry.guide_url)
      ? safeHref(entry.guide_url) : 'case.html?entry=' + encodeURIComponent(entry.id || '');
  };

  function syncRowTags(row) {
    const active = normSearch(state.tag);
    for (const btn of row.querySelectorAll('[data-tag-pick]')) {
      btn.setAttribute('aria-pressed', String(Boolean(active) && normSearch(btn.dataset.tagPick) === active));
    }
  }

  function rowFor(entry) {
    if (entry._row) {
      window.SY.itemActions.refresh(entry._row);
      if (window.SY.likes && window.SY.likes.refresh) window.SY.likes.refresh(entry._row);
      syncRowTags(entry._row);
      return entry._row;
    }
    const skill = isSkill(entry);
    const produced = state.caseByEntry[entry.id];
    const badge = stageBadge(entry);
    const image = safeHref(entry.image);
    let thumb = null;
    if (image && !VIDEO_EXT.test(image)) {
      const img = h('img', {src: image, alt: '', loading: 'lazy', decoding: 'async', width: '160', height: '90'});
      thumb = h('div', {class: 'entry-thumb', 'aria-hidden': 'true'}, img);
      img.addEventListener('error', () => { thumb.remove(); row.classList.remove('has-thumb'); });
    }
    const tags = Array.isArray(entry.tags) && entry.tags.length
      ? h('ul', {class: 'tags', 'aria-label': 'タグ'}, entry.tags.slice(0, 5).map(tag =>
          h('li', {}, h('button', {type: 'button', class: 'tag-btn', 'data-tag-pick': tag, 'aria-pressed': 'false'}, tag))))
      : null;
    const row = h('li', {class: 'entry ' + (skill ? 'is-skill' : 'is-support') + (thumb ? ' has-thumb' : '')},
      h('p', {class: 'entry-meta'},
        h('span', {class: 'entry-kind'}, h('span', {class: 'mark ' + (skill ? 'mark-skill' : 'mark-support'), 'aria-hidden': 'true'}), entry.kind || 'その他'),
        h('span', {}, categoryLabel(entry.category)),
        h('span', {class: 'entry-stage ' + badge.cls}, badge.label),
        produced ? h('span', {class: 'entry-case'}, '動画・デモあり') : null),
      h('h3', {class: 'entry-name'}, h('a', {href: entryHref(entry)}, entry.name || entry.id)),
      entry.tagline ? h('p', {class: 'entry-overview'}, entry.tagline) : null,
      entry.summary ? h('p', {class: 'entry-summary'}, entry.summary) : null,
      entry.use_case ? h('p', {class: 'entry-use'}, h('span', {class: 'entry-use-label'}, '使いどころ'), entry.use_case) : null,
      tags,
      window.SY.itemActions.create(entry.id, entry.name, entryHref(entry)),
      thumb);
    syncRowTags(row);
    entry._row = row;
    return row;
  }

  function showPlaceholders() {
    list.replaceChildren(...Array.from({length: 4}, () => h('li', {class: 'placeholder-row', 'aria-hidden': 'true'}, h('span'), h('span'), h('span'))));
    list.setAttribute('aria-busy', 'true');
  }

  function renderFieldMap() {
    fieldMap.replaceChildren(...groupedCategories().map(group => h('div', {class: 'field-group'},
      group.name ? h('h3', {class: 'field-group-name'}, group.name, h('span', {}, group.items.length + '分野')) : null,
      h('ul', {class: 'field-list'}, group.items.map(category => {
        const caseTotal = state.caseTotals[category.id] || 0;
        return h('li', {},
          h('a', {class: 'field-link', href: '#' + encodeURIComponent(category.id), 'data-cat-link': category.id},
            h('span', {class: 'field-name'}, category.label || category.id),
            h('span', {class: 'field-count'}, h('span', {'data-field-count': category.id}, String(state.totals[category.id] || 0)), h('span', {class: 'sr-only'}, '件')),
            caseTotal > 0 ? h('span', {class: 'field-case-badge'}, '解説付き ' + caseTotal + '件') : null,
            category.description ? h('span', {class: 'field-desc'}, category.description) : null));
      })))));
    fieldMap.removeAttribute('aria-busy');
  }

  function renderCategorySelect() {
    const option = category => h('option', {value: category.id, 'data-label': category.label || category.id}, category.label || category.id);
    catSelect.replaceChildren(
      h('option', {value: 'all', 'data-label': 'すべての分野'}, 'すべての分野'),
      ...groupedCategories().flatMap(group => group.name
        ? [h('optgroup', {label: group.name}, group.items.map(option))]
        : group.items.map(option)));
  }

  function computeTopTags() {
    const counts = new Map();
    for (const entry of state.entries) {
      const seenInEntry = new Set();
      for (const raw of (Array.isArray(entry.tags) ? entry.tags : [])) {
        const label = String(raw || '').trim();
        const key = normSearch(label);
        if (!key || seenInEntry.has(key)) continue;
        seenInEntry.add(key);
        const existing = counts.get(key);
        if (existing) existing.count++;
        else counts.set(key, {key, label, count: 1});
      }
    }
    state.topTags = [...counts.values()]
      .sort((a, b) => (b.count - a.count) || a.label.localeCompare(b.label, 'ja'))
      .slice(0, 10);
  }

  function renderTopTags() {
    if (!topTagsBar) return;
    if (!state.loaded || !state.topTags.length) {
      topTagsBar.hidden = true;
      return;
    }
    const active = normSearch(state.tag);
    const items = state.topTags.slice();
    if (active && !items.some(item => item.key === active)) {
      items.unshift({key: active, label: state.tag, count: countWith({tag: state.tag}, termsOf(state.q))});
    }
    topTagsBar.hidden = false;
    topTagsBar.replaceChildren(
      h('span', {class: 'top-tags-label'}, 'タグ'),
      ...items.map(item => h('button', {
        type: 'button',
        class: 'tag-chip',
        'data-tag-pick': item.label,
        'aria-pressed': String(Boolean(active) && item.key === active)
      }, item.label, h('span', {class: 'tag-chip-count'}, String(item.count)))));
  }

  function renderActiveFilters() {
    if (!activeFilters) return;
    const pills = [];
    const stageLabels = {runtime: '実制作デモ', source: '原典・ガイド', model: 'OpenWeight'};
    if (state.q.trim()) pills.push({key: 'q', label: '検索：' + state.q.trim()});
    if (state.cat !== 'all') pills.push({key: 'cat', label: '分野：' + categoryLabel(state.cat)});
    if (state.kind !== 'all') pills.push({key: 'kind', label: '種類：' + (state.kind === 'skill' ? 'スキル' : 'ツール・モデルなど')});
    if (state.stage !== 'all') pills.push({key: 'stage', label: '確認：' + (stageLabels[state.stage] || state.stage)});
    if (state.tag) pills.push({key: 'tag', label: 'タグ：' + state.tag});
    if (state.withCase) pills.push({key: 'withCase', label: '動画・デモあり'});
    if (state.savedOnly) pills.push({key: 'savedOnly', label: '保存したもの'});

    if (!pills.length) {
      activeFilters.hidden = true;
      activeFilters.replaceChildren();
      return;
    }
    activeFilters.hidden = false;
    activeFilters.replaceChildren(
      ...pills.map(p => h('button', {
        type: 'button',
        class: 'filter-pill',
        'data-clear-filter': p.key,
        'aria-label': p.label + ' を解除'
      }, h('span', {}, p.label), h('span', {class: 'filter-pill-x', 'aria-hidden': 'true'}, '×'))),
      pills.length >= 2 ? h('button', {type: 'button', class: 'filter-pill is-clear-all', 'data-clear-filter': 'all'}, 'すべて解除') : null);
  }

  function applyViewMode() {
    list.classList.toggle('is-grid', state.viewMode === 'grid');
    for (const btn of viewButtons) {
      btn.setAttribute('aria-pressed', String(btn.dataset.viewMode === state.viewMode));
    }
  }

  // The words and the field are shared, so every change redraws both lists.
  function render() {
    updateSavedFilter();
    renderCatalog();
    renderGallery();
  }

  function renderCatalog() {
    if (!state.loaded) return;
    if (state.sort === 'likes' && window.SY.likes && typeof window.SY.likes.prefetch === 'function') {
      window.SY.likes.prefetch(state.entries.map(e => e.id));
    }
    applyViewMode();
    const terms = termsOf(state.q);
    const casesAvailable = Array.isArray(state.cases);
    withCaseBox.disabled = !casesAvailable && !state.withCase;
    withCaseBox.checked = state.withCase;
    if (!casesAvailable && state.withCase) {
      list.replaceChildren();
      list.removeAttribute('aria-busy');
      empty.hidden = true;
      more.hidden = true;
      catDesc.hidden = true;
      $('[data-case-count]').textContent = '—';
      for (const button of $$('.toolbar [data-reset]')) button.hidden = false;
      status.textContent = '動画・デモの一覧を読み込めないため、この絞り込みは表示できません。上の「もう一度読み込む」か、動画・デモの絞り込みを外してください。';
      renderActiveFilters();
      return;
    }
    const matched = sortEntries(state.entries.filter(entry => matches(entry, state, terms)));
    lastCatalogMatched = matched.length;
    const shown = matched.slice(0, state.limit);
    list.replaceChildren(...shown.map(rowFor));
    list.removeAttribute('aria-busy');

    const remaining = matched.length - shown.length;
    more.hidden = remaining <= 0;
    if (remaining > 0) {
      more.replaceChildren('さらに' + Math.min(PAGE_SIZE, remaining) + '件を表示', h('span', {class: 'more-rest'}, '残り' + remaining + '件'));
    }

    for (const option of catSelect.options) {
      option.textContent = option.dataset.label + '（' + countWith({cat: option.value}, terms) + '）';
    }
    catSelect.value = state.cat;
    if (sortSelect) sortSelect.value = state.sort;
    for (const el of $$('[data-kind-count]')) el.textContent = String(countWith({kind: el.dataset.kindCount}, terms));
    for (const el of $$('[data-stage-count]')) el.textContent = String(countWith({stage: el.dataset.stageCount}, terms));
    $('[data-case-count]').textContent = casesAvailable ? String(countWith({withCase: true}, terms)) : '—';
    const narrowed = terms.length > 0 || state.kind !== 'all' || state.stage !== 'all' || Boolean(state.tag) || state.withCase || state.savedOnly;
    for (const el of $$('[data-field-count]')) {
      const id = el.dataset.fieldCount;
      el.textContent = String(narrowed ? countWith({cat: id}, terms) : (state.totals[id] || 0));
    }
    $('[data-fields-note]').textContent = narrowed
      ? '数字は、いまの絞り込み条件で当てはまる件数です。'
      : '数字は掲載している件数です。選ぶと、下のカタログがその分野に絞られます。';

    const parts = [];
    if (state.savedOnly) parts.push('保存したもの');
    if (state.cat !== 'all') parts.push(categoryLabel(state.cat));
    if (state.kind === 'skill') parts.push('スキル');
    if (state.kind === 'support') parts.push('ツール・モデルなど');
    if (state.stage === 'runtime') parts.push('実制作デモ');
    if (state.stage === 'source') parts.push('原典・ガイド');
    if (state.stage === 'model') parts.push('OpenWeight');
    if (state.tag) parts.push('#' + state.tag);
    if (state.withCase) parts.push('動画・デモあり');
    if (state.q.trim()) parts.push('「' + state.q.trim() + '」');
    status.replaceChildren(...[
      h('span', {class: 'status-main'}, h('strong', {}, String(matched.length)), '件が該当'),
      h('span', {}, '全' + state.entries.length + '件中' + (matched.length ? '・' + shown.length + '件を表示' : '')),
      parts.length ? h('span', {class: 'status-filters'}, '条件：' + parts.join('、')) : null].filter(Boolean));

    renderActiveFilters();
    renderTopTags();

    empty.hidden = matched.length !== 0;
    if (!matched.length) {
      $('[data-empty-detail]').textContent = !state.entries.length
        ? 'まだ掲載しているものがありません。'
        : state.cat !== 'all' && !state.totals[state.cat]
          ? 'この分野には、まだ掲載している項目がありません。ほかの分野を選ぶか、絞り込みを外してください。'
          : '別の言葉で探すか、分野・種類・確認状況・タグの絞り込みを外してください。';
    }

    const info = state.cat !== 'all' && state.categories[state.cat];
    catDesc.hidden = !info;
    if (info) {
      catDesc.replaceChildren(...[
        info.group ? h('span', {class: 'category-group'}, info.group) : null,
        h('strong', {}, categoryLabel(state.cat)),
        info.description ? h('span', {}, info.description) : null,
        h('span', {class: 'category-total'}, '掲載' + (state.totals[state.cat] || 0) + '件')].filter(Boolean));
    }

    const filtered = hasFilters();
    for (const button of $$('.toolbar [data-reset]')) button.hidden = !filtered;
    for (const button of $$('[data-kind]')) button.setAttribute('aria-pressed', String(button.dataset.kind === state.kind));
    for (const button of $$('[data-stage]')) button.setAttribute('aria-pressed', String(button.dataset.stage === state.stage));
    withCaseBox.checked = state.withCase;
    for (const link of $$('[data-cat-link]')) {
      if (link.dataset.catLink === state.cat) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
  }

  /* ---------- Cases ---------- */

  function skillName(item) {
    if (item.catalog_entry && item.catalog_entry.name) return item.catalog_entry.name;
    const first = Array.isArray(item.applied_skills) && item.applied_skills[0];
    return (first && first.name) || '';
  }

  function titleLines(item) {
    if (item.catalog_entry && item.catalog_entry.tagline) return [String(item.catalog_entry.tagline)];
    if (Array.isArray(item.title_lines) && item.title_lines.length) return item.title_lines.map(String);
    if (item.id === 'brief-to-demo') return ['ひと言を、', '作れる依頼に。'];
    return [item.title || item.id];
  }

  const categoryOrder = () => (state.categoryList.length ? state.categoryList.map(category => category.id) : Object.keys(state.categories));

  function hueOf(id) {
    const index = categoryOrder().indexOf(id);
    return HUES[Math.max(0, index) % HUES.length];
  }

  function caseCategoryIds() {
    const used = new Set(state.galleryCases.map(item => item.category).filter(Boolean));
    const ids = categoryOrder().filter(id => used.has(id));
    for (const id of used) if (!ids.includes(id)) ids.push(id);
    return ids;
  }

  function caseText(item) {
    if (item._text === undefined) {
      const category = state.categories[item.category];
      const entry = item.catalog_entry || {};
      const applied = Array.isArray(item.applied_skills) ? item.applied_skills.map(skill => skill && skill.name) : [];
      const sources = Array.isArray(item.sources) ? item.sources.map(s => s && repoSlug(s.url)) : [];
      const reqs = Array.isArray(item.requirements) ? item.requirements : (Array.isArray(entry.requirements) ? entry.requirements : []);
      const base = normSearch([
        item.id, item.title, titleLines(item).join(''), item.summary, skillName(item), item.category,
        item.license, item.verification_stage, sources.join(' '), reqs.join(' '),
        category && category.label, category && category.group, entry.id, entry.name, entry.tagline, entry.summary, entry.use_case,
        repoSlug(entry.source_url), Array.isArray(entry.tags) ? entry.tags.join(' ') : '', applied.join(' ')
      ].join(' '));
      const aliasExtra = expandAliasText(base, entry.tags);
      item._text = aliasExtra ? base + ' ' + aliasExtra : base;
    }
    return item._text;
  }

  function galleryCard(item, index) {
    if (item._card) {
      window.SY.itemActions.refresh(item._card);
      if (window.SY.likes && window.SY.likes.refresh) window.SY.likes.refresh(item._card);
      return item._card;
    }
    const skill = skillName(item);
    const title = joinLines(titleLines(item));
    const summary = (item.catalog_entry && item.catalog_entry.summary) || item.summary;
    const poster = safeHref(item.poster);
    const hasDemo = Boolean(safeHref(item.demo));
    const hasRequest = typeof item.request === 'string' && item.request.trim() !== '';
    const frame = h('div', {class: 'gallery-frame', 'data-fallback': skill || title});
    if (safeHref(item.video) && window.SY.media) {
      frame.append(window.SY.media.create(item, {controls: false, title: skill || title}));
    } else if (poster) {
      const img = h('img', {loading: index < FIRST_ROW ? 'eager' : 'lazy', fetchpriority: index === 0 ? 'high' : null,
        src: poster, alt: '', width: '1280', height: '720', decoding: 'async'});
      img.addEventListener('error', () => { img.remove(); frame.classList.add('is-missing'); });
      frame.append(img);
    } else {
      frame.classList.add('is-missing');
    }
    const caps = (hasDemo || hasRequest) ? h('div', {class: 'gallery-caps'},
      hasDemo ? h('span', {class: 'gallery-cap is-demo'}, '対話デモあり') : null,
      hasRequest ? h('span', {class: 'gallery-cap'}, '依頼文あり') : null) : null;
    item._card = h('li', {class: 'gallery-card', style: '--g-hue: ' + hueOf(item.category)},
      frame,
      h('div', {class: 'gallery-body'},
        h('div', {class: 'gallery-card-top'},
          h('p', {class: 'gallery-cat'}, categoryLabel(item.category)),
          caps),
        h('h3', {class: 'gallery-name'},
          h('a', {class: 'gallery-link', href: caseHref(item), 'data-case-id': item.id,
            'aria-haspopup': window.SY.casePreview && window.SY.casePreview.supported ? 'dialog' : null},
            skill ? h('span', {class: 'gallery-skill'}, skill) : null,
            h('span', {class: 'gallery-title'}, title))),
        summary ? h('p', {class: 'gallery-summary'}, summary) : null,
        window.SY.itemActions.create(window.SY.likes.caseID(item), skill || title, caseHref(item))));
    return item._card;
  }

  function showGalleryPlaceholders() {
    if (Array.isArray(state.cases)) return;
    for (const old of $$('.is-placeholder', gallery)) old.remove();
    const missing = Math.max(0, FIRST_ROW - gallery.children.length);
    gallery.append(...Array.from({length: missing}, () => h('li', {class: 'gallery-card is-placeholder', 'aria-hidden': 'true'},
      h('div', {class: 'gallery-frame'}), h('div', {class: 'gallery-body'}, h('span'), h('span'), h('span')))));
    gallery.setAttribute('aria-busy', 'true');
  }

  let chipKey = '';
  function renderChips(matched) {
    const ids = ['all', ...caseCategoryIds()];
    if (state.cat !== 'all' && !ids.includes(state.cat)) ids.push(state.cat);
    if (ids.join(' ') !== chipKey) {
      chipKey = ids.join(' ');
      const focused = galleryChips.contains(document.activeElement) ? document.activeElement.dataset.galleryCat : null;
      galleryChips.replaceChildren(...ids.map(id => h('button', {type: 'button', class: 'gallery-chip', 'data-gallery-cat': id, 'aria-pressed': 'false'},
        h('span', {}, id === 'all' ? 'すべて' : categoryLabel(id)),
        h('span', {class: 'gallery-chip-count'}), h('span', {class: 'sr-only'}, '件'))));
      const again = focused && Array.from(galleryChips.children).find(chip => chip.dataset.galleryCat === focused);
      if (again) again.focus();
    }
    for (const chip of galleryChips.children) {
      const id = chip.dataset.galleryCat;
      $('.gallery-chip-count', chip).textContent = String(id === 'all' ? matched.length : matched.filter(item => item.category === id).length);
      chip.setAttribute('aria-pressed', String(id === state.cat));
    }
  }

  function catalogLinkContent() {
    return state.loaded ? ['カタログで探す', h('span', {class: 'gallery-link-count'}, '（' + countWith({}, termsOf(state.q)) + '件）')] : ['カタログで探す'];
  }

  let galleryShown = 0;
  function renderGallery() {
    if (!Array.isArray(state.cases)) return;
    const terms = termsOf(state.q);
    const total = state.galleryCases.length;
    const matched = state.galleryCases.filter(item => (!state.savedOnly || window.SY.itemActions.isSaved(window.SY.likes.caseID(item)))
      && terms.every(term => caseText(item).includes(term)));
    const shownAll = state.cat === 'all' ? matched : matched.filter(item => item.category === state.cat);
    currentGalleryList = shownAll;
    galleryShown = shownAll.length;

    const autoExpand = terms.length > 0 || state.cat !== 'all' || state.savedOnly;
    const visible = autoExpand ? shownAll : shownAll.slice(0, state.galleryLimit);

    gallery.replaceChildren(...visible.map((item, idx) => galleryCard(item, idx)));
    gallery.removeAttribute('aria-busy');

    const remaining = shownAll.length - visible.length;
    if (galleryMoreWrap) {
      galleryMoreWrap.hidden = remaining <= 0;
      if (remaining > 0 && galleryMoreBtn) {
        galleryMoreBtn.textContent = 'さらに' + Math.min(GALLERY_PAGE_SIZE, remaining) + '件を表示（残り' + remaining + '件）';
      }
      if (galleryAllBtn) galleryAllBtn.hidden = remaining <= GALLERY_PAGE_SIZE;
    }

    galleryChips.hidden = !total;
    if (total) renderChips(matched);

    const filtered = terms.length > 0 || state.cat !== 'all' || state.savedOnly;
    galleryCount.replaceChildren(...(filtered
      ? [h('strong', {}, String(shownAll.length)), '件が該当', h('span', {class: 'gallery-count-total'}, '全' + total + '件中')]
      : [h('strong', {}, String(total)), '件', visible.length < total ? h('span', {class: 'gallery-count-total'}, visible.length + '件を表示中') : null].filter(Boolean)));

    const q = state.q.trim();
    galleryQuery.hidden = !q;
    if (q) {
      galleryQuery.replaceChildren(
        h('p', {class: 'gallery-query-text'}, '「' + q + '」で探しています'),
        h('button', {type: 'button', class: 'text-btn', 'data-gallery-clear': ''}, '検索を外す'),
        h('a', {class: 'gallery-to-catalog', href: '#catalog', 'data-to-catalog': ''}, ...catalogLinkContent()));
    }

    galleryEmpty.hidden = shownAll.length > 0;
    if (!shownAll.length) {
      const noneInField = state.cat !== 'all' && !state.galleryCases.some(item => item.category === state.cat);
      $('[data-gallery-empty-detail]').textContent = state.savedOnly
        ? 'この条件に合う保存済みの動画・デモはありません。カタログも確認するか、「保存したもの」を外して探せます。'
        : !total
        ? 'まだ掲載している項目がありません。カタログから探せます。'
        : noneInField
          ? '「' + categoryLabel(state.cat) + '」の動画・デモはまだありません。カタログでは、この分野の項目を探せます。'
          : '別の言葉で探すか、分野の絞り込みを外してください。';
      $('[data-gallery-reset]').hidden = !filtered;
      $('[data-to-catalog]', galleryEmpty).replaceChildren(...catalogLinkContent());
    }
  }

  const galleryStatus = () => (galleryShown ? 'スキル・ツールを' + galleryShown + '件表示しています。' : '当てはまる項目がありません。');

  function renderCases() {
    const cases = state.cases;
    for (const el of $$('[data-case-total]')) el.textContent = Array.isArray(cases) ? String(cases.length) : '—';
    $('[data-cases-error]').hidden = cases !== null;
    if (!Array.isArray(cases)) {
      for (const el of $$('.is-placeholder', gallery)) el.remove();
      gallery.removeAttribute('aria-busy');
      galleryCount.textContent = '';
      galleryChips.hidden = true;
      galleryQuery.hidden = true;
      galleryEmpty.hidden = true;
      if (galleryMoreWrap) galleryMoreWrap.hidden = true;
      return;
    }
    state.galleryCases = cases.map((item, index) => ({item, index}))
      .sort((a, b) => String(b.item.updated_on || '').localeCompare(String(a.item.updated_on || '')) || a.index - b.index)
      .map(({item}) => item);
    chipKey = '';
    renderGallery();
  }

  /* ---------- URL and history ---------- */

  function categoryFromHash() {
    let id = '';
    try { id = decodeURIComponent(location.hash.replace(/^#/, '')); } catch (_) { return null; }
    return state.categories[id] ? id : null;
  }

  function readURL(saved = history.state) {
    const params = new URLSearchParams(location.search);
    const kind = params.get('kind');
    const stage = params.get('stage');
    const sort = params.get('sort');
    const cat = params.get('cat');
    return {
      q: params.get('q') || '',
      kind: KINDS.has(kind) ? kind : 'all',
      stage: STAGES.has(stage) ? stage : 'all',
      tag: (params.get('tag') || '').trim(),
      sort: SORTS.has(sort) ? sort : 'default',
      withCase: params.get('case') === '1',
      savedOnly: params.get('saved') === '1',
      cat: categoryFromHash() || (state.categories[cat] && cat) || 'all',
      limit: saved && saved.sy === 1 && Number.isInteger(saved.limit) && saved.limit >= PAGE_SIZE
        ? Math.min(saved.limit, Math.max(PAGE_SIZE, Math.ceil(state.entries.length / PAGE_SIZE) * PAGE_SIZE)) : PAGE_SIZE,
      galleryLimit: saved && saved.sy === 1 && Number.isInteger(saved.galleryLimit) && saved.galleryLimit >= GALLERY_PAGE_SIZE
        ? saved.galleryLimit : GALLERY_PAGE_SIZE
    };
  }

  function urlFor(forceHash) {
    const params = new URLSearchParams();
    const q = state.q.trim();
    if (q) params.set('q', q);
    if (state.cat !== 'all') params.set('cat', state.cat);
    if (state.kind !== 'all') params.set('kind', state.kind);
    if (state.stage !== 'all') params.set('stage', state.stage);
    if (state.tag) params.set('tag', state.tag);
    if (state.sort !== 'default') params.set('sort', state.sort);
    if (state.withCase) params.set('case', '1');
    if (state.savedOnly) params.set('saved', '1');
    const query = params.toString();
    let hash = location.hash;
    if (forceHash) hash = forceHash;
    else if (state.cat !== 'all' && (!hash || categoryFromHash())) hash = '#' + encodeURIComponent(state.cat);
    else if (categoryFromHash() || (query && !hash)) hash = '#catalog';
    return location.pathname + (query ? '?' + query : '') + hash;
  }

  function writeURL(push, forceHash) {
    clearTimeout(urlTimer);
    try {
      history[push ? 'pushState' : 'replaceState']({
        sy: 1, cat: state.cat, limit: state.limit, galleryLimit: state.galleryLimit
      }, '', urlFor(forceHash));
    } catch (_) { /* Safari rate-limits history calls; the filters still apply on the page. */ }
  }

  function writeURLSoon() {
    clearTimeout(urlTimer);
    urlTimer = setTimeout(() => writeURL(false), 400);
  }

  function syncHeroUI() {
    if (heroClear) heroClear.hidden = !heroSearch.value;
    const qNorm = normSearch(state.q.trim());
    for (const chip of intentChips) {
      chip.setAttribute('aria-pressed', String(Boolean(qNorm) && normSearch(chip.dataset.intentQ) === qNorm));
    }
  }

  function syncInputs(force = false) {
    if (force || document.activeElement !== search) search.value = state.q;
    if (force || document.activeElement !== heroSearch) heroSearch.value = state.q;
    syncHeroUI();
  }

  function cancelPendingSearch() {
    clearTimeout(typingTimer);
    clearTimeout(urlTimer);
    typingTimer = 0;
  }

  function readSearch() {
    cancelPendingSearch();
    state.q = search.value;
    heroSearch.value = state.q;
    syncHeroUI();
  }

  function scrollToSection(selector, smooth = true) {
    const section = $(selector);
    if (!section.hasAttribute('tabindex')) section.setAttribute('tabindex', '-1');
    section.scrollIntoView({behavior: smooth ? scrollBehavior() : 'auto', block: 'start'});
    section.focus({preventScroll: true});
  }

  const scrollToCatalog = (smooth = true) => scrollToSection('#catalog', smooth);

  function settleInitialScroll() {
    const nav = performance.getEntriesByType ? performance.getEntriesByType('navigation')[0] : null;
    if (nav && nav.type !== 'navigate') return;
    if (categoryFromHash()) return scrollToCatalog(false);
    const id = location.hash.slice(1);
    const target = /^[a-z][a-z0-9-]*$/i.test(id) ? document.getElementById(id) : null;
    if (target && id !== 'top') target.scrollIntoView({block: 'start'});
  }

  let restoredFromHistory = false;
  window.addEventListener('popstate', event => {
    cancelPendingSearch();
    composing = false;
    if (window.SY.casePreview) window.SY.casePreview.close();
    restoredFromHistory = Boolean(event.state && event.state.sy === 1);
    if (!state.loaded && !Array.isArray(state.cases)) return;
    const next = readURL(event.state);
    if (restoredFromHistory) next.cat = state.categories[event.state.cat] ? event.state.cat : 'all';
    Object.assign(state, next);
    syncInputs(true);
    render();
  });

  window.addEventListener('hashchange', () => {
    const fromHistory = restoredFromHistory;
    restoredFromHistory = false;
    const cat = categoryFromHash();
    if (!cat || !state.loaded || fromHistory) return;
    state.cat = cat;
    state.limit = PAGE_SIZE;
    render();
    writeURL(false);
    scrollToCatalog();
  });

  /* ---------- Loading ---------- */

  async function fetchCases() {
    try {
      const data = await loadJSON('data/cases.json');
      return (Array.isArray(data) ? data : (Array.isArray(data.cases) ? data.cases : []))
        .filter(item => item && typeof item.id === 'string' && item.id);
    } catch (_) {
      return null;
    }
  }

  async function fetchAliases() {
    try {
      const data = await loadJSON('data/tag-aliases.json');
      return buildAliases(data);
    } catch (_) {
      return [];
    }
  }

  async function loadCatalog() {
    const data = await loadJSON('data/catalog.json');
    const entries = (Array.isArray(data) ? data : (Array.isArray(data.entries) ? data.entries : []))
      .filter(entry => entry && (entry.id || entry.name));
    state.categoryList = await readCategories(Array.isArray(data) ? {} : data, entries);
    state.categories = table();
    for (const category of state.categoryList) state.categories[category.id] = category;
    state.entries = entries;
    state.totals = table();
    entries.forEach((entry, idx) => {
      entry._idx = idx;
      state.totals[entry.category] = (state.totals[entry.category] || 0) + 1;
    });
    computeTopTags();
    if (!Array.isArray(data) && data.updated_on) $('[data-updated]').textContent = data.updated_on;
  }

  async function loadCategoryLabels() {
    try {
      const extra = await loadJSON('data/categories.json');
      for (const category of Array.isArray(extra.categories) ? extra.categories : []) {
        if (category && typeof category.id === 'string' && category.id) state.categories[category.id] = category;
      }
    } catch (_) { /* ids are shown instead */ }
  }

  function mapCases() {
    state.caseByEntry = table();
    state.caseTotals = table();
    const cases = state.cases || [];
    for (const item of cases) {
      const id = item.catalog_entry && item.catalog_entry.id;
      if (id) state.caseByEntry[id] = item;
    }
    for (const entry of state.entries) {
      entry._row = null;
      if (!state.caseByEntry[entry.id] && typeof entry.guide_url === 'string') {
        const match = /^case\.html\?id=([a-z0-9._-]+)(?:[&#]|$)/i.exec(entry.guide_url.trim());
        const item = match && cases.find(c => c.id === match[1]);
        if (item) state.caseByEntry[entry.id] = item;
      }
      if (state.caseByEntry[entry.id]) {
        state.caseTotals[entry.category] = (state.caseTotals[entry.category] || 0) + 1;
      }
    }
  }

  function showCatalogError() {
    list.replaceChildren();
    list.removeAttribute('aria-busy');
    status.textContent = 'カタログを読み込めませんでした。';
    errorBox.hidden = false;
    fieldMap.replaceChildren(h('p', {class: 'field-error'}, '分野の一覧を読み込めませんでした。カタログの「もう一度読み込む」から読み込み直せます。'));
    fieldMap.removeAttribute('aria-busy');
    $('[data-tally-note]').hidden = false;
  }

  let firstRun = true;
  async function start() {
    empty.hidden = true;
    more.hidden = true;
    status.textContent = 'カタログを読み込んでいます…';
    showPlaceholders();
    showGalleryPlaceholders();
    fieldMap.setAttribute('aria-busy', 'true');

    const casesTask = Array.isArray(state.cases) ? Promise.resolve(state.cases) : fetchCases();
    const aliasesTask = state.aliases.length ? Promise.resolve(state.aliases) : fetchAliases();
    let catalogOk = true;
    try { await loadCatalog(); } catch (_) { catalogOk = false; }
    state.cases = await casesTask;
    state.aliases = await aliasesTask;
    if (!catalogOk) await loadCategoryLabels();
    mapCases();
    indexEntryTexts();
    const fromURL = readURL();
    Object.assign(state, fromURL);
    syncInputs(true);
    renderCases();
    if (!catalogOk) return showCatalogError();
    errorBox.hidden = true;

    state.loaded = true;
    $('[data-tally-note]').hidden = Array.isArray(state.cases);
    for (const el of $$('[data-total]')) el.textContent = String(state.entries.length);
    for (const el of $$('[data-cat-total]')) el.textContent = String(state.categoryList.length);
    renderFieldMap();
    renderCategorySelect();

    render();
    writeURL(false);
    if (firstRun) settleInitialScroll();
    firstRun = false;
  }

  /* ---------- Events ---------- */

  const plainClick = event => event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

  function runHeroSearch(query) {
    cancelPendingSearch();
    Object.assign(state, {
      q: query, cat: 'all', kind: 'all', stage: 'all', tag: '',
      withCase: false, savedOnly: false, limit: PAGE_SIZE, galleryLimit: GALLERY_PAGE_SIZE
    });
    syncInputs(true);
    render();
    const target = Array.isArray(state.cases) && (galleryShown > 0 || lastCatalogMatched === 0) ? '#cases' : '#catalog';
    writeURL(true, target);
    scrollToSection(target);
  }

  $('[data-hero-form]').addEventListener('submit', event => {
    event.preventDefault();
    runHeroSearch(heroSearch.value);
  });

  heroSearch.addEventListener('input', () => {
    if (heroClear) heroClear.hidden = !heroSearch.value;
  });

  if (heroClear) {
    heroClear.addEventListener('click', () => {
      cancelPendingSearch();
      state.q = '';
      state.limit = PAGE_SIZE;
      state.galleryLimit = GALLERY_PAGE_SIZE;
      syncInputs(true);
      render();
      writeURL(false);
      heroSearch.focus();
      announce('検索文字を消しました。');
    });
  }

  for (const chip of intentChips) {
    chip.addEventListener('click', () => {
      runHeroSearch(chip.dataset.intentQ || '');
    });
  }

  function clearGallery(fields) {
    cancelPendingSearch();
    Object.assign(state, fields, {limit: PAGE_SIZE, galleryLimit: GALLERY_PAGE_SIZE});
    syncInputs(true);
    render();
    writeURL(false, '#cases');
  }

  function toggleSavedView(fromTray = false) {
    readSearch();
    state.savedOnly = !state.savedOnly;
    state.limit = PAGE_SIZE;
    state.galleryLimit = GALLERY_PAGE_SIZE;
    render();
    const target = state.savedOnly && galleryShown === 0 && lastCatalogMatched > 0 ? '#catalog' : '#cases';
    writeURL(false, target);
    if (fromTray && state.savedOnly) scrollToSection(target);
    announce(state.savedOnly ? '保存したものだけを表示しています。' : 'すべての項目を表示しています。');
  }

  savedFilter.addEventListener('click', () => toggleSavedView(false));
  if (traySavedBtn) traySavedBtn.addEventListener('click', () => toggleSavedView(true));

  window.addEventListener('sy:savedchange', () => {
    updateSavedFilter();
    if (state.savedOnly) {
      const previousFocus = document.activeElement;
      render();
      if (previousFocus && !previousFocus.isConnected) savedFilter.focus({preventScroll: true});
    }
  });

  window.addEventListener('sy:comparechange', () => {
    updateStudioTray(currentSavedCount());
  });

  window.addEventListener('sy:likeschange', () => {
    if (state.sort !== 'likes' || !state.loaded) return;
    clearTimeout(likesRenderTimer);
    likesRenderTimer = setTimeout(() => renderCatalog(), 80);
  });

  $('#cases').addEventListener('click', event => {
    const chip = event.target.closest('[data-gallery-cat]');
    if (chip) {
      readSearch();
      state.cat = chip.dataset.galleryCat || 'all';
      state.limit = PAGE_SIZE;
      state.galleryLimit = GALLERY_PAGE_SIZE;
      render();
      writeURL(false, '#cases');
      announce(galleryStatus());
      return;
    }
    if (event.target.closest('[data-gallery-more]')) {
      const before = gallery.children.length;
      state.galleryLimit += GALLERY_PAGE_SIZE;
      renderGallery();
      writeURL(false);
      const next = gallery.children[before];
      const link = next && $('a[data-case-id]', next);
      if (link) link.focus();
      return;
    }
    if (event.target.closest('[data-gallery-all]')) {
      const before = gallery.children.length;
      state.galleryLimit = Math.max(state.galleryCases.length, GALLERY_PAGE_SIZE);
      renderGallery();
      writeURL(false);
      const next = gallery.children[before];
      const link = next && $('a[data-case-id]', next);
      if (link) link.focus();
      return;
    }
    if (event.target.closest('[data-gallery-reset]')) {
      clearGallery({q: '', cat: 'all', savedOnly: false});
      const all = $('[data-gallery-cat="all"]', galleryChips);
      if (all) all.focus();
      announce('動画・デモの絞り込みを外しました。' + galleryStatus());
      return;
    }
    if (event.target.closest('[data-gallery-clear]')) {
      clearGallery({q: ''});
      heroSearch.focus();
      announce('検索を外しました。' + galleryStatus());
      return;
    }
    if (event.target.closest('[data-to-catalog]')) {
      if (!plainClick(event)) return;
      event.preventDefault();
      scrollToCatalog();
      return;
    }
    const link = event.target.closest('a[data-case-id]');
    const preview = window.SY.casePreview;
    if (!link || !plainClick(event) || !preview || !preview.supported) return;
    const item = state.galleryCases.find(c => c.id === link.dataset.caseId);
    if (!item) return;
    event.preventDefault();
    const listItems = currentGalleryList.length ? currentGalleryList : state.galleryCases;
    const items = listItems.map(c => ({
      item: c,
      meta: {
        title: joinLines(titleLines(c)),
        skill: skillName(c),
        category: categoryLabel(c.category),
        href: caseHref(c)
      }
    }));
    const index = Math.max(0, listItems.indexOf(item));
    preview.open(item, {
      invoker: link,
      title: joinLines(titleLines(item)),
      skill: skillName(item),
      category: categoryLabel(item.category),
      href: caseHref(item),
      items,
      index
    });
  });

  function scheduleSearch() {
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      typingTimer = 0;
      state.q = search.value;
      state.limit = PAGE_SIZE;
      heroSearch.value = search.value;
      syncHeroUI();
      render();
      writeURLSoon();
    }, 150);
  }
  search.addEventListener('compositionstart', () => {
    composing = true;
    cancelPendingSearch();
  });
  search.addEventListener('compositionend', () => {
    composing = false;
    scheduleSearch();
  });
  search.addEventListener('input', event => {
    if (!composing && !event.isComposing) scheduleSearch();
  });

  $('[data-catalog-form]').addEventListener('submit', event => {
    event.preventDefault();
    if (composing) return;
    readSearch();
    state.limit = PAGE_SIZE;
    render();
    writeURL(false);
    if (coarsePointer.matches) {
      search.blur();
      status.scrollIntoView({behavior: scrollBehavior(), block: 'start'});
    }
  });

  catSelect.addEventListener('change', () => {
    readSearch();
    state.cat = state.categories[catSelect.value] ? catSelect.value : 'all';
    state.limit = PAGE_SIZE;
    render();
    writeURL(false);
  });

  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      readSearch();
      state.sort = SORTS.has(sortSelect.value) ? sortSelect.value : 'default';
      state.limit = PAGE_SIZE;
      renderCatalog();
      writeURL(false);
    });
  }

  for (const button of $$('[data-kind]')) {
    button.addEventListener('click', () => {
      readSearch();
      state.kind = KINDS.has(button.dataset.kind) ? button.dataset.kind : 'all';
      state.limit = PAGE_SIZE;
      render();
      writeURL(false);
    });
  }

  for (const button of $$('[data-stage]')) {
    button.addEventListener('click', () => {
      readSearch();
      state.stage = STAGES.has(button.dataset.stage) ? button.dataset.stage : 'all';
      state.limit = PAGE_SIZE;
      renderCatalog();
      writeURL(false);
    });
  }

  withCaseBox.addEventListener('change', () => {
    readSearch();
    state.withCase = withCaseBox.checked;
    state.limit = PAGE_SIZE;
    render();
    writeURL(false);
  });

  for (const button of viewButtons) {
    button.addEventListener('click', () => {
      const mode = VIEWS.has(button.dataset.viewMode) ? button.dataset.viewMode : 'list';
      if (state.viewMode === mode) return;
      state.viewMode = mode;
      try { localStorage.setItem(VIEW_KEY, mode); } catch (_) { /* Optional persistence. */ }
      applyViewMode();
    });
  }

  function resetAllFilters() {
    cancelPendingSearch();
    Object.assign(state, {
      q: '', cat: 'all', kind: 'all', stage: 'all', tag: '', sort: 'default',
      withCase: false, savedOnly: false, limit: PAGE_SIZE, galleryLimit: GALLERY_PAGE_SIZE
    });
    syncInputs(true);
    render();
  }

  $('#catalog').addEventListener('click', event => {
    const tagBtn = event.target.closest('[data-tag-pick]');
    if (tagBtn) {
      readSearch();
      const picked = tagBtn.dataset.tagPick || '';
      state.tag = normSearch(state.tag) === normSearch(picked) ? '' : picked;
      state.limit = PAGE_SIZE;
      renderCatalog();
      writeURL(false);
      announce(state.tag ? 'タグ「' + state.tag + '」で絞り込みました。' : 'タグの絞り込みを外しました。');
      return;
    }
    const clearBtn = event.target.closest('[data-clear-filter]');
    if (clearBtn) {
      const key = clearBtn.dataset.clearFilter;
      if (key === 'all') {
        resetAllFilters();
        writeURL(false, '#catalog');
        announce('絞り込みをすべて外しました。');
        return;
      }
      if (key === 'q') state.q = '';
      else if (key === 'cat') state.cat = 'all';
      else if (key === 'kind') state.kind = 'all';
      else if (key === 'stage') state.stage = 'all';
      else if (key === 'tag') state.tag = '';
      else if (key === 'withCase') state.withCase = false;
      else if (key === 'savedOnly') state.savedOnly = false;
      state.limit = PAGE_SIZE;
      syncInputs(true);
      render();
      writeURL(false);
      announce('絞り込み条件を1件外しました。');
    }
  });

  fieldMap.addEventListener('click', event => {
    const link = event.target.closest('[data-cat-link]');
    if (!link || !plainClick(event)) return;
    event.preventDefault();
    readSearch();
    state.cat = state.categories[link.dataset.catLink] ? link.dataset.catLink : 'all';
    state.limit = PAGE_SIZE;
    render();
    writeURL(true, '#' + encodeURIComponent(state.cat));
    scrollToCatalog();
  });

  more.addEventListener('click', () => {
    const before = state.limit;
    state.limit += PAGE_SIZE;
    renderCatalog();
    writeURL(false);
    const next = list.children[before];
    const link = next && $('.entry-name a', next);
    if (link) link.focus();
  });

  for (const button of $$('[data-reset]')) {
    button.addEventListener('click', () => {
      resetAllFilters();
      writeURL(false, '#catalog');
      search.focus();
      announce('絞り込みをすべて外しました。');
    });
  }

  const retryButton = $('[data-retry]');
  retryButton.addEventListener('click', () => {
    const restore = document.activeElement === retryButton;
    start().then(() => {
      if (!restore || !errorBox.hidden) return;
      const active = document.activeElement;
      if (active === document.body || errorBox.contains(active)) $('#catalog').focus({preventScroll: true});
    });
  });

  $('[data-cases-retry]').addEventListener('click', async () => {
    showGalleryPlaceholders();
    state.cases = await fetchCases();
    mapCases();
    indexEntryTexts();
    renderCases();
    if (state.loaded) {
      $('[data-tally-note]').hidden = Array.isArray(state.cases);
      renderFieldMap();
      render();
    }
    if (Array.isArray(state.cases)) $('#cases').focus({preventScroll: true});
  });

  document.addEventListener('click', event => {
    if (event.defaultPrevented || !plainClick(event)) return;
    const link = event.target.closest('a[href]');
    const hash = link && link.getAttribute('href');
    if (!/^#(?:top|cases|feature|fields|catalog|howto)$/.test(hash || '')) return;
    if (!state.loaded && !Array.isArray(state.cases)) return;
    event.preventDefault();
    if (typingTimer && !composing) {
      readSearch();
      state.limit = PAGE_SIZE;
      render();
      writeURL(false);
    }
    writeURL(true, hash);
    const target = hash === '#feature' ? '#cases' : hash;
    scrollToSection(target);
  });

  document.addEventListener('keydown', event => {
    if (event.defaultPrevented || event.isComposing || event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
    if (document.documentElement.classList.contains('has-preview')) return;
    const active = document.activeElement;
    if (active && (active.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName))) return;
    event.preventDefault();
    search.focus();
  });

  start();
})();
