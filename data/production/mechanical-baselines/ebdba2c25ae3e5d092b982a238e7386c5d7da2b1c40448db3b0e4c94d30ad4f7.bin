/* Diagram Design の作例 — 八百万図AIツールボックス (MIT).
   Progressive enhancement only: the route tabs and the copy button.
   The diagram in the iframe is a static file; nothing here touches it. */
(() => {
  'use strict';

  /* ---------- Route tabs ---------- */

  const tablist = document.getElementById('route-tabs');
  const tabs = tablist ? Array.from(tablist.querySelectorAll('[role="tab"]')) : [];
  const panels = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));

  function select(index, focus) {
    tabs.forEach((tab, i) => {
      const on = i === index;
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
      tab.tabIndex = on ? 0 : -1;
      panels[i].hidden = !on;
    });
    if (focus) tabs[index].focus();
  }

  if (tabs.length && panels.every(Boolean)) {
    panels.forEach((panel, i) => {
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', tabs[i].id);
      panel.tabIndex = 0;
    });
    tablist.hidden = false;

    const fromHash = () => {
      const i = panels.findIndex(panel => '#' + panel.id === location.hash);
      return i >= 0 ? i : -1;
    };
    const initial = fromHash();
    select(initial >= 0 ? initial : 0, false);

    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(i, false));
      tab.addEventListener('keydown', event => {
        const last = tabs.length - 1;
        let next = -1;
        if (event.key === 'ArrowRight') next = i === last ? 0 : i + 1;
        else if (event.key === 'ArrowLeft') next = i === 0 ? last : i - 1;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = last;
        if (next < 0) return;
        event.preventDefault();
        select(next, true);
      });
    });

    window.addEventListener('hashchange', () => {
      const i = fromHash();
      if (i >= 0) {
        select(i, false);
        tablist.scrollIntoView({block: 'nearest'});
      }
    });
  }

  /* ---------- Copy the request ---------- */

  const button = document.getElementById('copy-request');
  const source = document.getElementById('request-text');
  const status = document.getElementById('copy-status');

  function report(ok, message) {
    status.textContent = message;
    status.classList.toggle('is-ok', ok);
    status.classList.toggle('is-error', !ok);
  }

  // Older browsers or non-secure pages: copy from a selection and trust only the browser's answer.
  function legacyCopy(text) {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;';
    document.body.append(area);
    area.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
    area.remove();
    return ok;
  }

  function selectSource() {
    const range = document.createRange();
    range.selectNodeContents(source);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }

  if (button && source && status) {
    button.addEventListener('click', async () => {
      const text = source.textContent;
      let ok = false;
      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(text);
          ok = true;
        } catch (_) {
          ok = false;
        }
      } else {
        ok = legacyCopy(text);
      }
      if (ok) {
        report(true, '依頼文をコピーしました。');
      } else {
        selectSource();
        report(false, 'コピーできませんでした。枠の中の文章を選んであるので、Ctrl+C（MacはCommand+C）でコピーしてください。');
      }
    });
  }
})();
