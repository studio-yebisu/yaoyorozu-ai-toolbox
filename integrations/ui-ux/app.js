/* Search helpers are shared with the dependency-free Node checks. */
(function () {
  'use strict';
  function normalize(value) {
    return String(value).normalize('NFKC').toLocaleLowerCase('ja').trim();
  }
  function matches(entry, query, category, origin) {
    if (category !== 'all' && entry.category !== category) return false;
    if (origin !== 'all' && entry.origin !== origin) return false;
    const haystack = normalize([entry.name, entry.repo, entry.headline, entry.summary,
      entry.best_for, entry.requirements, entry.limits, entry.kind_label,
      entry.category_label, ...entry.tags].join(' '));
    return normalize(query).split(/\s+/u).filter(Boolean).every(term => haystack.includes(term));
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { normalize, matches };
  if (typeof document === 'undefined') return;
  const entries = JSON.parse(document.getElementById('catalog-data').textContent);
  const form = document.getElementById('filters');
  const search = document.getElementById('search');
  const heroQ = document.getElementById('hero-q');
  const origin = document.getElementById('origin');
  const count = document.getElementById('result-count');
  const empty = document.getElementById('empty');
  const status = document.getElementById('copy-status');
  const categoryButtons = [...document.querySelectorAll('[data-category]')];
  let category = 'all';
  let statusTimer;
  // Category chips carry totals, like the main gallery's filter pills.
  categoryButtons.forEach(button => {
    const total = button.dataset.category === 'all'
      ? entries.length
      : entries.filter(entry => entry.category === button.dataset.category).length;
    const chipCount = document.createElement('span');
    chipCount.className = 'chip-count';
    chipCount.textContent = String(total);
    button.appendChild(chipCount);
  });
  // Both visible search fields represent one query; keep them in sync
  // without moving focus (no focus stealing while typing).
  function syncHero() { if (heroQ) heroQ.value = search.value; }
  function applyFilters() {
    let visible = 0;
    entries.forEach(entry => {
      const show = matches(entry, search.value, category, origin.value);
      document.getElementById(entry.id).hidden = !show;
      if (show) visible++;
    });
    count.textContent = `${visible} / ${entries.length} 件`;
    empty.hidden = visible !== 0;
    categoryButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.category === category)));
  }
  form.addEventListener('submit', event => event.preventDefault());
  // The intro search hands its query to the catalog and moves focus there.
  const heroForm = document.querySelector('[data-hero-form]');
  if (heroForm) {
    heroForm.addEventListener('submit', event => {
      event.preventDefault();
      search.value = heroQ ? heroQ.value : '';
      applyFilters();
      const catalog = document.getElementById('catalog');
      catalog.scrollIntoView({ block: 'start' });
      catalog.focus({ preventScroll: true });
    });
  }
  // While a text field has focus the bottom bar steps aside, as on the main site.
  document.addEventListener('focusin', event => {
    if (event.target.matches('input, textarea')) document.documentElement.classList.add('is-editing');
  });
  document.addEventListener('focusout', () => {
    document.documentElement.classList.remove('is-editing');
  });
  search.addEventListener('input', () => { syncHero(); applyFilters(); });
  origin.addEventListener('change', applyFilters);
  categoryButtons.forEach(button => button.addEventListener('click', () => {
    category = button.dataset.category;
    applyFilters();
  }));
  form.addEventListener('reset', event => {
    event.preventDefault();
    search.value = '';
    syncHero();
    origin.value = 'all';
    category = 'all';
    applyFilters();
  });
  // A guide/compare link must still reveal its target after filtering.
  document.querySelectorAll('a[href^="#"]').forEach(anchor => anchor.addEventListener('click', () => {
    const target = document.getElementById(anchor.getAttribute('href').slice(1));
    if (target && target.matches('[data-resource]') && target.hidden) form.reset();
  }));
  document.querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click', async () => {
    const source = document.getElementById(button.dataset.copy);
    let message;
    try {
      if (!navigator.clipboard || !window.isSecureContext) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(source.textContent);
      message = '依頼文をコピーしました。';
    } catch (_error) {
      const range = document.createRange();
      range.selectNodeContents(source);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      message = '依頼文を選択しました。Ctrl+C（Macは⌘C）でコピーしてください。';
    }
    clearTimeout(statusTimer);
    status.textContent = message;
    statusTimer = setTimeout(() => { status.textContent = ''; }, 6000);
  }));
  applyFilters();
}());
