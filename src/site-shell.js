/* Navigation state and query-aware canonical URLs shared by every guide. */
(() => {
  'use strict';
  const page = document.body.dataset.sitePage;
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

  if (page === 'index.html') {
    const mainSections = new Set(['', '#top', '#main', '#guides', '#start', '#fields', '#howto']);
    const updateNavigation = () => {
      const section = location.hash === '#cases' ? 'cases' : mainSections.has(location.hash) ? 'home' : 'catalog';
      for (const anchor of document.querySelectorAll('[data-site-nav]')) {
        if (anchor.dataset.siteNav === section) anchor.setAttribute('aria-current', section === 'home' ? 'page' : 'location');
        else anchor.removeAttribute('aria-current');
      }
    };
    updateNavigation();
    addEventListener('hashchange', updateNavigation);
    addEventListener('popstate', updateNavigation);
    document.addEventListener('click', () => queueMicrotask(updateNavigation));
    document.addEventListener('submit', () => queueMicrotask(updateNavigation));
  }

  const editing = element => element instanceof HTMLElement &&
    (element.isContentEditable || element.matches('textarea,input:not([type="button"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]):not([type="range"])'));
  document.addEventListener('focusin', event => {
    document.documentElement.classList.toggle('is-editing', editing(event.target));
  });
  document.addEventListener('focusout', () => {
    queueMicrotask(() => document.documentElement.classList.toggle('is-editing', editing(document.activeElement)));
  });

  const crumb = document.querySelector('.sy-breadcrumb [aria-current="page"]');
  if (crumb && ['case.html', 'guides/slides/case.html', 'guides/slides/repository.html'].includes(page)) {
    const update = () => { crumb.textContent = document.title.split('｜')[0]; };
    const title = document.querySelector('title');
    if (title) new MutationObserver(update).observe(title, {childList: true, subtree: true, characterData: true});
  }
})();
