/* Yaoyorozu AI ToolBox — helpers shared by index.html and case.html. Load before app.js / case.js.
   Exposes window.SY. No network access other than the relative data paths passed to loadJSON. */
(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  // Element builder. Text is always set as text, never parsed as HTML.
  // null / undefined / false children are skipped, because append() would turn them into the words "null" etc.
  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs || {})) {
      if (value === null || value === undefined || value === false) continue;
      if (key === 'class') el.className = value;
      else if (key === 'text') el.textContent = value;
      else if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
      else el.setAttribute(key, value === true ? '' : value);
    }
    for (const child of children.flat(Infinity)) {
      if (child === null || child === undefined || child === false) continue;
      el.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return el;
  }

  // Allow http(s) URLs and same-site relative paths only. Browsers drop tabs and newlines inside URLs
  // and read "/\" like "//", so values containing control characters or backslashes are refused outright.
  function safeHref(value) {
    if (typeof value !== 'string') return null;
    const url = value.trim();
    if (!url || /[\u0000-\u001F\u007F\\]/.test(url)) return null;
    if (/^https?:\/\/[^/]/i.test(url)) return url;
    if (/^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith('//')) return null;
    return url;
  }

  const isExternal = url => /^https?:/i.test(url);
  const displayUrl = url => url.replace(/^https?:\/\//i, '');

  // Title lines are written for wide screens. On phones they run together as one sentence; a space is
  // kept only where a line ending in a word meets a line starting with a Latin letter or digit.
  const needsSpace = (before, after) => /[^\s、。，．・：！？」』）)]$/.test(before) && /^[A-Za-z0-9]/.test(after);
  const joinLines = lines => lines.reduce((text, line, i) => text + (i && needsSpace(lines[i - 1], line) ? ' ' : '') + line, '');
  const lineNodes = (lines, className) => lines.flatMap((line, i) => [
    i && needsSpace(lines[i - 1], line) ? h('span', {class: 'tl-sep'}, ' ') : null,
    h('span', {class: className}, line)
  ]);

  async function loadJSON(url) {
    const response = await fetch(url, {cache: 'no-cache'});
    if (!response.ok) throw new Error(url + ' ' + response.status);
    return response.json();
  }

  const norm = value => String(value ?? '').normalize('NFKC').toLowerCase();
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const scrollBehavior = () => (reduceMotion.matches ? 'auto' : 'smooth');

  function announce(message) {
    const announcer = $('[data-announce]');
    if (!announcer) return;
    announcer.textContent = '';
    setTimeout(() => { announcer.textContent = message; }, 30);
  }

  // Outline icons on a 24px grid, drawn with currentColor (1.5px stroke beside regular text).
  const ICONS = {
    home: ['M4 10.5 12 4l8 6.5', 'M6 9v11h4.5v-6h3v6H18V9'],
    fields: ['M4 4h6.5v6.5H4z', 'M13.5 4H20v6.5h-6.5z', 'M4 13.5h6.5V20H4z', 'M13.5 13.5H20V20h-6.5z'],
    cases: ['M3.5 5.5h17v13h-17z', 'M10 9.2v5.6l4.8-2.8z'],
    search: ['M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13z', 'M15.3 15.3 20 20'],
    list: ['M8.5 6.5H20', 'M8.5 12H20', 'M8.5 17.5H20', 'M4 6.5h1', 'M4 12h1', 'M4 17.5h1'],
    demo: ['M13.5 4H20v6.5', 'M20 4l-8.5 8.5', 'M17 14v6H4V7h6'],
    prompt: ['M6 3.5h8.5L18 7v13.5H6z', 'M9 11h6', 'M9 14.5h6', 'M9 18h3.5'],
    guide: ['M4 5.5c2.7-1 5.3-1 8 .7 2.7-1.7 5.3-1.7 8-.7v13c-2.7-1-5.3-1-8 .7-2.7-1.7-5.3-1.7-8-.7z', 'M12 6.2v13.2'],
    source: ['M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1', 'M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1']
  };
  const SVG_NS = 'http://www.w3.org/2000/svg';
  function icon(name) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '24');
    svg.setAttribute('height', '24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('class', 'icon');
    for (const d of ICONS[name] || []) {
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', d);
      svg.append(path);
    }
    return svg;
  }

  // Bottom bar: one row of up to four anchors. Each item is [label, href, iconName, external?].
  function setTabbar(items) {
    const bar = $('[data-tabbar]');
    if (!bar) return;
    const usable = items.filter(item => item && safeHref(item[1]));
    if (!usable.length) return;
    bar.replaceChildren(...usable.slice(0, 4).map(([label, href, name]) =>
      h('a', {href: safeHref(href), class: 'tab'}, icon(name), h('span', {}, label))));
  }

  // While a text field has focus, hide the fixed bottom bar so it never sits on top of the
  // software keyboard. No keyboard-height math: the class follows focus only.
  const TEXT_TYPES = /^(text|search|email|url|tel|number|password)$/i;
  const isEditable = el => Boolean(el) && (el.isContentEditable || el.tagName === 'TEXTAREA'
    || (el.tagName === 'INPUT' && TEXT_TYPES.test(el.type || 'text') && !el.readOnly));
  const rootEl = document.documentElement;
  document.addEventListener('focusin', event => {
    if (isEditable(event.target)) rootEl.classList.add('is-editing');
  });
  document.addEventListener('focusout', () => {
    // Focus may move straight to another field; check after the move settles.
    setTimeout(() => { if (!isEditable(document.activeElement)) rootEl.classList.remove('is-editing'); }, 0);
  });

  window.SY = {$, $$, h, safeHref, isExternal, displayUrl, joinLines, lineNodes, loadJSON, norm, reduceMotion, scrollBehavior, announce, icon, setTabbar};
})();
