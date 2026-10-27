/* Yaoyorozu AI ToolBox — homepage teaser for open-weight models (section#models). Load after ui.js.
   Reads data/open-models.json only and shows every `featured: true` model. It shares no state with the
   case gallery or catalog, so a failure there leaves this section working, and the reverse. */
(() => {
  'use strict';

  const root = document.getElementById('models');
  const mount = root && root.querySelector('[data-models-featured]');
  if (!mount) return;
  const errorEl = root.querySelector('[data-models-home-error]');
  const ID_RE = /^[a-z0-9][a-z0-9-]*$/;
  const text = value => (typeof value === 'string' ? value.trim() : '');

  function done(error) {
    mount.setAttribute('aria-busy', 'false');
    if (error) mount.replaceChildren();
    if (errorEl) errorEl.hidden = !error;
  }

  const SY = window.SY;
  if (!SY) { done(true); return; }
  const {h, safeHref, isExternal, loadJSON} = SY;

  function teaser(model, index) {
    const src = safeHref(model.concept);
    const local = src && !isExternal(src) ? src : null;
    const nameId = 'ow-home-name-' + model.id;
    const frame = local ? h('div', {class: 'ow-home-frame', 'aria-hidden': 'true'},
      h('img', {src: local, alt: '', width: '880', height: '540', decoding: 'async', loading: index < 2 ? 'eager' : 'lazy'})) : null;
    if (frame) frame.firstChild.addEventListener('error', () => frame.remove(), {once: true});
    return h('li', {class: 'ow-home-card'},
      frame,
      h('div', {class: 'ow-home-body'},
        text(model.task) ? h('p', {class: 'ow-home-task'}, text(model.task)) : null,
        h('h3', {class: 'ow-home-name', id: nameId},
          h('a', {class: 'ow-home-link', href: 'open-models.html#' + model.id}, text(model.name) || model.id)),
        text(model.headline) ? h('p', {class: 'ow-home-headline'}, text(model.headline)) : null));
  }

  async function load() {
    try {
      const data = await loadJSON('data/open-models.json');
      const models = Array.isArray(data && data.models) ? data.models : [];
      const featured = models.filter(m => m && m.model_axis === 'task-specialist' && m.featured === true && typeof m.id === 'string' && ID_RE.test(m.id));
      mount.replaceChildren(...(featured.length ? [h('ul', {class: 'ow-home-grid', 'aria-labelledby': 'models-title'}, featured.map(teaser))] : []));
      done(false);
    } catch {
      done(true);
    }
  }

  load();
})();
