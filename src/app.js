/* Yaoyorozu AI ToolBox — home page. Loads data/catalog.json and data/cases.json (relative paths).
   Categories come only from catalog.categories (fallback: data/categories.json), so adding or
   removing a category needs no change here.
   URL contract: ./?q=<words>&kind=skill|support&case=1&saved=1#<category id | section id>.
   Old links such as #agents still select that field. Picking a field or submitting the top search
   adds a history entry; typing, the select, the gallery chips and the toggles replace the current one.
   The words and the field apply to both the case gallery and the catalog; kind and case only to the
   catalog. Opening a case card shows a preview dialog (gallery.js) without touching the URL. */
(() => {
  'use strict';

  const {$, $$, h, safeHref, joinLines, loadJSON, norm, scrollBehavior, announce} = window.SY;

  const PAGE_SIZE = 12;
  const FIRST_ROW = 3;
  const VIDEO_EXT = /\.(mp4|webm|mov|m4v)(\?|#|$)/i;
  const KINDS = new Set(['all', 'skill', 'support']);
  // Soft frame tints for the case posters, one per field in data order.
  const HUES = [28, 46, 150, 196, 258, 330, 88, 172];
  const coarsePointer = matchMedia('(pointer: coarse)');

  // Lookup tables keyed by data ids use null prototypes so ids such as "constructor" stay plain keys.
  const table = () => Object.create(null);
  const isSkill = entry => String(entry.kind || '').trim() === 'スキル';

  const state = {
    entries: [], categoryList: [], categories: table(), totals: table(), caseByEntry: table(),
    cases: undefined, galleryCases: [], loaded: false,
    q: '', cat: 'all', kind: 'all', withCase: false, savedOnly: false, limit: PAGE_SIZE
  };

  let typingTimer = 0;
  let urlTimer = 0;
  let composing = false;

  const list = $('[data-entries]');
  const status = $('[data-status]');
  const empty = $('[data-empty]');
  const errorBox = $('[data-error]');
  const search = $('[data-search]');
  const heroSearch = $('[data-hero-q]');
  const catSelect = $('[data-cat-select]');
  const catDesc = $('[data-cat-desc]');
  const fieldMap = $('[data-field-map]');
  const more = $('[data-more]');
  const withCaseBox = $('[data-with-case]');
  const gallery = $('[data-gallery]');
  const galleryChips = $('[data-gallery-chips]');
  const galleryCount = $('[data-gallery-count]');
  const galleryQuery = $('[data-gallery-query]');
  const galleryEmpty = $('[data-gallery-empty]');
  const savedFilter = $('[data-saved-only]');
  const savedToolbar = $('.saved-toolbar');

  function updateSavedFilter() {
    // Count saved items that are still present: catalog entries, plus active cases whose save id
    // (their own case id when no catalog entry points at them) is not already an entry id.
    // Orphan ids of removed items are not counted, and no entries are invented for them.
    let count;
    if (state.loaded) {
      const saved = window.SY.itemActions;
      const entryIds = new Set(state.entries.map(entry => entry.id));
      count = state.entries.filter(entry => saved.isSaved(entry.id)).length;
      if (Array.isArray(state.cases)) {
        for (const item of state.cases) {
          const id = window.SY.likes.caseID(item);
          if (!entryIds.has(id) && saved.isSaved(id)) count++;
        }
      }
    } else {
      count = window.SY.itemActions.savedCount();
    }
    // Nothing to filter until the first save; keep the bar when the (empty) filter is on so it can be switched off.
    const hideToolbar = count === 0 && !state.savedOnly;
    // Hiding the bar while its toggle holds focus (e.g. another tab removed the last save via
    // storage) would drop focus to the body; park it on the section before the bar disappears.
    if (hideToolbar && !savedToolbar.hidden && savedToolbar.contains(document.activeElement)) {
      $('#cases').focus({preventScroll: true});
    }
    savedToolbar.hidden = hideToolbar;
    savedFilter.hidden = false;
    savedFilter.setAttribute('aria-pressed', String(state.savedOnly));
    $('[data-saved-count]').textContent = String(count);
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
    // An entry whose category is not listed still gets an option, so nothing becomes unreachable.
    for (const entry of entries) {
      if (entry.category && !seen.has(entry.category)) {
        seen.add(entry.category);
        result.push({id: String(entry.category), label: String(entry.category)});
      }
    }
    return result;
  }

  /* ---------- Filtering ---------- */

  const termsOf = q => norm(q).split(/\s+/).filter(Boolean);

  function matches(entry, filter, terms) {
    if (filter.cat !== 'all' && entry.category !== filter.cat) return false;
    if (filter.kind !== 'all' && (filter.kind === 'skill') !== isSkill(entry)) return false;
    if (filter.withCase && !state.caseByEntry[entry.id]) return false;
    if (filter.savedOnly && !window.SY.itemActions.isSaved(entry.id)) return false;
    return terms.every(term => entry._text.includes(term));
  }

  // How many entries a filter would give if only `overrides` changed.
  function countWith(overrides, terms) {
    const filter = {cat: state.cat, kind: state.kind, withCase: state.withCase, savedOnly: state.savedOnly, ...overrides};
    let total = 0;
    for (const entry of state.entries) if (matches(entry, filter, terms)) total++;
    return total;
  }

  const hasFilters = () => state.cat !== 'all' || state.kind !== 'all' || state.withCase || state.savedOnly || Boolean(state.q.trim());

  /* ---------- Catalog rows ---------- */

  const caseHref = item => 'case.html?id=' + encodeURIComponent(item.id);
  const entryHref = entry => {
    const item = state.caseByEntry[entry.id];
    return item ? caseHref(item) : entry.resource_type === 'open-weight-model' && safeHref(entry.guide_url)
      ? safeHref(entry.guide_url) : 'case.html?entry=' + encodeURIComponent(entry.id || '');
  };

  // Rows are built on first display and cached, so hidden pages cost nothing and images load only when shown.
  function rowFor(entry) {
    if (entry._row) {
      // The cached row may have missed storage changes while detached; repaint its save button.
      window.SY.itemActions.refresh(entry._row);
      return entry._row;
    }
    const skill = isSkill(entry);
    const produced = state.caseByEntry[entry.id];
    const image = safeHref(entry.image);
    let thumb = null;
    if (image && !VIDEO_EXT.test(image)) {
      const img = h('img', {src: image, alt: '', loading: 'lazy', decoding: 'async', width: '160', height: '90'});
      thumb = h('div', {class: 'entry-thumb', 'aria-hidden': 'true'}, img);
      img.addEventListener('error', () => { thumb.remove(); row.classList.remove('has-thumb'); });
    }
    const tags = Array.isArray(entry.tags) && entry.tags.length
      ? h('ul', {class: 'tags', 'aria-label': 'タグ'}, entry.tags.slice(0, 5).map(tag => h('li', {}, tag)))
      : null;
    const row = h('li', {class: 'entry ' + (skill ? 'is-skill' : 'is-support') + (thumb ? ' has-thumb' : '')},
      h('p', {class: 'entry-meta'},
        h('span', {class: 'entry-kind'}, h('span', {class: 'mark ' + (skill ? 'mark-skill' : 'mark-support'), 'aria-hidden': 'true'}), entry.kind || 'その他'),
        h('span', {}, categoryLabel(entry.category)),
        produced ? h('span', {class: 'entry-case'}, '動画・デモあり') : null),
      h('h3', {class: 'entry-name'}, h('a', {href: entryHref(entry)}, entry.name || entry.id)),
      entry.tagline ? h('p', {class: 'entry-overview'}, entry.tagline) : null,
      entry.summary ? h('p', {class: 'entry-summary'}, entry.summary) : null,
      entry.use_case ? h('p', {class: 'entry-use'}, h('span', {class: 'entry-use-label'}, '使いどころ'), entry.use_case) : null,
      tags,
      window.SY.itemActions.create(entry.id, entry.name, entryHref(entry)),
      thumb);
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
      h('ul', {class: 'field-list'}, group.items.map(category => h('li', {},
        h('a', {class: 'field-link', href: '#' + encodeURIComponent(category.id), 'data-cat-link': category.id},
          h('span', {class: 'field-name'}, category.label || category.id),
          h('span', {class: 'field-count'}, h('span', {'data-field-count': category.id}, String(state.totals[category.id] || 0)), h('span', {class: 'sr-only'}, '件')),
          category.description ? h('span', {class: 'field-desc'}, category.description) : null)))))));
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

  // The words and the field are shared, so every change redraws both lists.
  function render() {
    updateSavedFilter();
    renderCatalog();
    renderGallery();
  }

  function renderCatalog() {
    if (!state.loaded) return;
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
      return;
    }
    const matched = state.entries.filter(entry => matches(entry, state, terms));
    const shown = matched.slice(0, state.limit);
    list.replaceChildren(...shown.map(rowFor));
    list.removeAttribute('aria-busy');

    const remaining = matched.length - shown.length;
    more.hidden = remaining <= 0;
    if (remaining > 0) {
      more.replaceChildren('さらに' + Math.min(PAGE_SIZE, remaining) + '件を表示', h('span', {class: 'more-rest'}, '残り' + remaining + '件'));
    }

    // Each control shows how many results it would give with the other conditions kept.
    for (const option of catSelect.options) {
      option.textContent = option.dataset.label + '（' + countWith({cat: option.value}, terms) + '）';
    }
    catSelect.value = state.cat;
    for (const el of $$('[data-kind-count]')) el.textContent = String(countWith({kind: el.dataset.kindCount}, terms));
    $('[data-case-count]').textContent = casesAvailable ? String(countWith({withCase: true}, terms)) : '—';
    const narrowed = terms.length > 0 || state.kind !== 'all' || state.withCase || state.savedOnly;
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
    if (state.withCase) parts.push('動画・デモあり');
    if (state.q.trim()) parts.push('「' + state.q.trim() + '」');
    status.replaceChildren(...[
      h('span', {class: 'status-main'}, h('strong', {}, String(matched.length)), '件が該当'),
      h('span', {}, '全' + state.entries.length + '件中' + (matched.length ? '・' + shown.length + '件を表示' : '')),
      parts.length ? h('span', {class: 'status-filters'}, '条件：' + parts.join('、')) : null].filter(Boolean));

    empty.hidden = matched.length !== 0;
    if (!matched.length) {
      $('[data-empty-detail]').textContent = !state.entries.length
        ? 'まだ掲載しているものがありません。'
        : state.cat !== 'all' && !state.totals[state.cat]
          ? 'この分野には、まだ掲載している項目がありません。ほかの分野を選ぶか、絞り込みを外してください。'
          : '別の言葉で探すか、分野・種類・動画・デモの絞り込みを外してください。';
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
    withCaseBox.checked = state.withCase;
    for (const link of $$('[data-cat-link]')) {
      if (link.dataset.catLink === state.cat) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
  }

  /* ---------- Cases ---------- */

  // The skill or tool the case is about: its catalog entry, else the first skill it applied.
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

  // Field order for chips and frame tints: the catalog's categories, else data/categories.json.
  const categoryOrder = () => (state.categoryList.length ? state.categoryList.map(category => category.id) : Object.keys(state.categories));

  function hueOf(id) {
    const index = categoryOrder().indexOf(id);
    return HUES[Math.max(0, index) % HUES.length];
  }

  // Gallery chips: only fields that have a case, in data order, then any field only a case uses.
  function caseCategoryIds() {
    const used = new Set(state.galleryCases.map(item => item.category).filter(Boolean));
    const ids = categoryOrder().filter(id => used.has(id));
    for (const id of used) if (!ids.includes(id)) ids.push(id);
    return ids;
  }

  // Cases are searched by their own text and by the catalog entry they demonstrate, if any.
  function caseText(item) {
    if (item._text === undefined) {
      const category = state.categories[item.category];
      const entry = item.catalog_entry || {};
      const applied = Array.isArray(item.applied_skills) ? item.applied_skills.map(skill => skill && skill.name) : [];
      item._text = norm([item.title, titleLines(item).join(''), item.summary, skillName(item), item.category,
        category && category.label, category && category.group, entry.name, entry.tagline, entry.summary, entry.use_case,
        Array.isArray(entry.tags) ? entry.tags.join(' ') : '', applied.join(' ')].join(' '));
    }
    return item._text;
  }

  // Cards are built once per case. Only the first row loads eagerly; the rest wait until scrolled near.
  function galleryCard(item, index) {
    if (item._card) {
      // The cached card may have missed storage changes while detached; repaint its save button.
      window.SY.itemActions.refresh(item._card);
      return item._card;
    }
    const skill = skillName(item);
    const title = joinLines(titleLines(item));
    const summary = (item.catalog_entry && item.catalog_entry.summary) || item.summary;
    const poster = safeHref(item.poster);
    const frame = h('div', {class: 'gallery-frame', 'data-fallback': skill || title});
    if (safeHref(item.video) && window.SY.media) {
      frame.append(window.SY.media.create(item, {controls: false, title: skill || title}));
    } else if (poster) {
      // loading is set before src, so a lazy image never starts its request early.
      const img = h('img', {loading: index < FIRST_ROW ? 'eager' : 'lazy', fetchpriority: index === 0 ? 'high' : null,
        src: poster, alt: '', width: '1280', height: '720', decoding: 'async'});
      img.addEventListener('error', () => { img.remove(); frame.classList.add('is-missing'); });
      frame.append(img);
    } else {
      frame.classList.add('is-missing');
    }
    item._card = h('li', {class: 'gallery-card', style: '--g-hue: ' + hueOf(item.category)},
      frame,
      h('div', {class: 'gallery-body'},
        h('p', {class: 'gallery-cat'}, categoryLabel(item.category)),
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

  // Chips are rebuilt only when the set of fields changes, so a focused chip keeps its focus.
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

  // "Search the catalog" with the catalog's own count for the current conditions, when it is loaded.
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
    const shown = state.cat === 'all' ? matched : matched.filter(item => item.category === state.cat);
    galleryShown = shown.length;
    gallery.replaceChildren(...shown.map(galleryCard));
    gallery.removeAttribute('aria-busy');

    galleryChips.hidden = !total;
    if (total) renderChips(matched);

    const filtered = terms.length > 0 || state.cat !== 'all' || state.savedOnly;
    galleryCount.replaceChildren(...(filtered
      ? [h('strong', {}, String(shown.length)), '件が該当', h('span', {class: 'gallery-count-total'}, '全' + total + '件中')]
      : [h('strong', {}, String(total)), '件']));

    const q = state.q.trim();
    galleryQuery.hidden = !q;
    if (q) {
      galleryQuery.replaceChildren(
        h('p', {class: 'gallery-query-text'}, '「' + q + '」で探しています'),
        h('button', {type: 'button', class: 'text-btn', 'data-gallery-clear': ''}, '検索を外す'),
        h('a', {class: 'gallery-to-catalog', href: '#catalog', 'data-to-catalog': ''}, ...catalogLinkContent()));
    }

    galleryEmpty.hidden = shown.length > 0;
    if (!shown.length) {
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
      // The static card in the HTML stays as a working link to one article.
      for (const el of $$('.is-placeholder', gallery)) el.remove();
      gallery.removeAttribute('aria-busy');
      galleryCount.textContent = '';
      galleryChips.hidden = true;
      galleryQuery.hidden = true;
      galleryEmpty.hidden = true;
      return;
    }
    // Newest first; undated cases keep their data order after the dated ones.
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
    const cat = params.get('cat');
    return {
      q: params.get('q') || '',
      kind: KINDS.has(kind) ? kind : 'all',
      withCase: params.get('case') === '1',
      savedOnly: params.get('saved') === '1',
      cat: categoryFromHash() || (state.categories[cat] && cat) || 'all',
      limit: saved && saved.sy === 1 && Number.isInteger(saved.limit) && saved.limit >= PAGE_SIZE
        ? Math.min(saved.limit, Math.max(PAGE_SIZE, Math.ceil(state.entries.length / PAGE_SIZE) * PAGE_SIZE)) : PAGE_SIZE
    };
  }

  function urlFor(forceHash) {
    const params = new URLSearchParams();
    const q = state.q.trim();
    if (q) params.set('q', q);
    if (state.cat !== 'all') params.set('cat', state.cat);
    if (state.kind !== 'all') params.set('kind', state.kind);
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
      history[push ? 'pushState' : 'replaceState']({sy: 1, cat: state.cat, limit: state.limit}, '', urlFor(forceHash));
    } catch (_) { /* Safari rate-limits history calls; the filters still apply on the page. */ }
  }

  function writeURLSoon() {
    clearTimeout(urlTimer);
    urlTimer = setTimeout(() => writeURL(false), 400);
  }

  function syncInputs(force = false) {
    if (force || document.activeElement !== search) search.value = state.q;
    if (force || document.activeElement !== heroSearch) heroSearch.value = state.q;
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
  }

  function scrollToSection(selector, smooth = true) {
    const section = $(selector);
    if (!section.hasAttribute('tabindex')) section.setAttribute('tabindex', '-1');
    section.scrollIntoView({behavior: smooth ? scrollBehavior() : 'auto', block: 'start'});
    section.focus({preventScroll: true});
  }

  const scrollToCatalog = (smooth = true) => scrollToSection('#catalog', smooth);

  // On a fresh visit to a deep link, the content above has only just been built, so scroll again.
  // Reload and back/forward keep the position the browser restores.
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

  async function loadCatalog() {
    const data = await loadJSON('data/catalog.json');
    const entries = (Array.isArray(data) ? data : (Array.isArray(data.entries) ? data.entries : []))
      .filter(entry => entry && (entry.id || entry.name));
    state.categoryList = await readCategories(Array.isArray(data) ? {} : data, entries);
    state.categories = table();
    for (const category of state.categoryList) state.categories[category.id] = category;
    state.entries = entries;
    state.totals = table();
    for (const entry of entries) {
      const category = state.categories[entry.category];
      entry._text = norm([entry.name, entry.tagline, entry.summary, entry.use_case, (entry.tags || []).join(' '), entry.kind,
        category && category.label, category && category.group].join(' '));
      state.totals[entry.category] = (state.totals[entry.category] || 0) + 1;
    }
    if (!Array.isArray(data) && data.updated_on) $('[data-updated]').textContent = data.updated_on;
  }

  // Labels for the case cards when the catalog itself could not be read.
  async function loadCategoryLabels() {
    try {
      const extra = await loadJSON('data/categories.json');
      for (const category of Array.isArray(extra.categories) ? extra.categories : []) {
        if (category && typeof category.id === 'string' && category.id) state.categories[category.id] = category;
      }
    } catch (_) { /* ids are shown instead */ }
  }

  // A catalog entry counts as produced only when a Yaoyorozu AI ToolBox case points to it.
  function mapCases() {
    state.caseByEntry = table();
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
    // The error box (with its retry button) stays in place while reloading so keyboard focus
    // there is never stranded; a successful load dismisses it below.
    empty.hidden = true;
    more.hidden = true;
    status.textContent = 'カタログを読み込んでいます…';
    showPlaceholders();
    showGalleryPlaceholders();
    fieldMap.setAttribute('aria-busy', 'true');

    const casesTask = Array.isArray(state.cases) ? Promise.resolve(state.cases) : fetchCases();
    let catalogOk = true;
    try { await loadCatalog(); } catch (_) { catalogOk = false; }
    state.cases = await casesTask;
    if (!catalogOk) await loadCategoryLabels();
    mapCases();
    // The words and field in the URL apply to the gallery even when the catalog failed.
    const fromURL = readURL();
    Object.assign(state, fromURL);
    syncInputs();
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

  // Top search: one explicit submit searches the cases in the chosen field and moves to the gallery,
  // where the catalog's matches are one link away. Catalog-only filters are cleared for a fresh search.
  // If the case list could not be read, it goes to the catalog as before.
  $('[data-hero-form]').addEventListener('submit', event => {
    event.preventDefault();
    cancelPendingSearch();
    Object.assign(state, {q: heroSearch.value, cat: 'all', kind: 'all', withCase: false, savedOnly: false, limit: PAGE_SIZE});
    search.value = heroSearch.value;
    render();
    const target = '#catalog';
    writeURL(true, target);
    scrollToSection(target); // focus moves to the section, which also closes the software keyboard
  });

  function clearGallery(fields) {
    cancelPendingSearch();
    Object.assign(state, fields, {limit: PAGE_SIZE});
    search.value = state.q;
    heroSearch.value = state.q;
    render();
    writeURL(false, '#cases');
  }

  savedFilter.addEventListener('click', () => {
    readSearch();
    state.savedOnly = !state.savedOnly;
    state.limit = PAGE_SIZE;
    render();
    writeURL(false, '#cases');
    announce(state.savedOnly ? '保存したものだけを表示しています。' : 'すべての項目を表示しています。');
  });
  window.addEventListener('sy:savedchange', () => {
    updateSavedFilter();
    if (state.savedOnly) {
      const previousFocus = document.activeElement;
      render();
      if (!previousFocus.isConnected) savedFilter.focus({preventScroll: true});
    }
  });

  // Gallery: field chips, clearing the words, the way down to the catalog, and opening a card.
  $('#cases').addEventListener('click', event => {
    const chip = event.target.closest('[data-gallery-cat]');
    if (chip) {
      readSearch();
      // The page stays at the gallery; the catalog below follows the same field.
      state.cat = chip.dataset.galleryCat || 'all';
      state.limit = PAGE_SIZE;
      render();
      writeURL(false, '#cases');
      announce(galleryStatus());
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
    // A card is a real link to its article; a plain click opens the preview instead.
    const link = event.target.closest('a[data-case-id]');
    const preview = window.SY.casePreview;
    if (!link || !plainClick(event) || !preview || !preview.supported) return;
    const item = state.galleryCases.find(c => c.id === link.dataset.caseId);
    if (!item) return;
    event.preventDefault();
    preview.open(item, {
      invoker: link,
      title: joinLines(titleLines(item)),
      skill: skillName(item),
      category: categoryLabel(item.category),
      href: caseHref(item)
    });
  });

  // Catalog search filters while typing, without moving the page.
  function scheduleSearch() {
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      typingTimer = 0;
      state.q = search.value;
      state.limit = PAGE_SIZE;
      heroSearch.value = search.value;
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

  // The keyboard's search key: apply now; on touch screens close the keyboard and show the results.
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

  for (const button of $$('[data-kind]')) {
    button.addEventListener('click', () => {
      readSearch();
      state.kind = KINDS.has(button.dataset.kind) ? button.dataset.kind : 'all';
      state.limit = PAGE_SIZE;
      render();
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

  // The field map is rebuilt from data, so its links are handled by delegation.
  fieldMap.addEventListener('click', event => {
    const link = event.target.closest('[data-cat-link]');
    if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
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
    // Continue from the first newly shown item.
    const next = list.children[before];
    const link = next && $('.entry-name a', next);
    if (link) link.focus();
  });

  for (const button of $$('[data-reset]')) {
    button.addEventListener('click', () => {
      cancelPendingSearch();
      Object.assign(state, {q: '', cat: 'all', kind: 'all', withCase: false, savedOnly: false, limit: PAGE_SIZE});
      search.value = '';
      heroSearch.value = '';
      render();
      writeURL(false, '#catalog');
      search.focus();
      announce('絞り込みをすべて外しました。');
    });
  }

  const retryButton = $('[data-retry]');
  retryButton.addEventListener('click', () => {
    // While retrying, the error box stays visible, so only a successful load — the one case that
    // hides it — can leave the keyboard stranded; move it to the catalog section.
    const restore = document.activeElement === retryButton;
    start().then(() => {
      if (!restore || !errorBox.hidden) return;
      // Hiding the box blurs its button asynchronously: here the active element may still be the
      // (hidden) retry button, or already the body. Both mean the focus is ours to restore; any
      // other element means the user moved it, so leave it alone.
      const active = document.activeElement;
      if (active === document.body || errorBox.contains(active)) $('#catalog').focus({preventScroll: true});
    });
  });

  $('[data-cases-retry]').addEventListener('click', async () => {
    showGalleryPlaceholders();
    state.cases = await fetchCases();
    mapCases();
    renderCases();
    if (state.loaded) {
      $('[data-tally-note]').hidden = Array.isArray(state.cases);
      render();
    }
    // The retry button hides itself on success; keep focus in the section.
    if (Array.isArray(state.cases)) $('#cases').focus({preventScroll: true});
  });

  // Keep filters in shareable URLs when navigation uses a section hash. Old category hashes
  // remain valid; a section and a selected category can now coexist after reload/back/forward.
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
