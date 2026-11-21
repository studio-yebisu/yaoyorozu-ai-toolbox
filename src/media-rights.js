/* Credit and X post composition helper on media-rights.html. */
(() => {
  'use strict';
  const {$, h, loadJSON, announce} = window.SY;
  const CREDIT = 'Yaoyorozu AI ToolBox · @studio_yebisu';
  const DEFAULT_BASE = 'https://studio-yebisu.github.io/yaoyorozu-ai-toolbox/';

  const caseSelect = $('[data-rights-case]');
  const formatRadios = Array.from(document.querySelectorAll('[data-rights-format]'));
  const preview = $('[data-rights-preview]');
  const copyBtn = $('[data-rights-copy]');
  const xLink = $('[data-rights-x]');
  const statusEl = $('[data-rights-status]');
  if (!caseSelect || !preview || !copyBtn || !xLink) return;

  const state = {
    cases: [],
    baseUrl: DEFAULT_BASE,
    caseId: '',
    format: 'line'
  };

  function caseUrl(id) {
    if (!id) return state.baseUrl;
    const url = new URL('case.html', state.baseUrl);
    url.searchParams.set('id', id);
    return url.href;
  }

  function currentCase() {
    return state.cases.find(item => item.id === state.caseId) || null;
  }

  function buildCopyText() {
    const item = currentCase();
    const title = item ? String(item.title || item.id) : '';
    const url = caseUrl(state.caseId);
    const rightsUrl = new URL('media-rights.html', state.baseUrl).href;

    if (state.format === 'two-line') {
      return (title ? title + '｜' : '') + CREDIT + '\n' + url;
    }
    if (state.format === 'description') {
      const lines = [
        '動画引用：' + (title ? title + '（' + CREDIT + '）' : CREDIT),
        '紹介ページ：' + url,
        '動画の利用条件：' + rightsUrl
      ];
      return lines.join('\n');
    }
    return title ? title + '｜' + CREDIT : CREDIT;
  }

  function buildXUrl() {
    const item = currentCase();
    const title = item ? String(item.title || item.id) : '';
    const url = caseUrl(state.caseId);
    const intent = new URL('https://x.com/intent/tweet');
    // X posts must include @studio_yebisu in the body even when the video is watermarked.
    const body = title ? title + '\n' + CREDIT : CREDIT;
    intent.searchParams.set('text', body);
    intent.searchParams.set('url', url);
    return intent.href;
  }

  function render() {
    const text = buildCopyText();
    preview.textContent = text;
    xLink.href = buildXUrl();
  }

  function notify(message) {
    if (statusEl) statusEl.textContent = message;
    announce(message);
    if (typeof window.SY.toast === 'function') {
      window.SY.toast(message);
    }
  }

  async function copyText() {
    const text = buildCopyText();
    let copied = false;
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        copied = true;
      } catch (_) {
        /* Fallback to hidden textarea when Clipboard API is blocked. */
      }
    }
    if (!copied) {
      const buffer = h('textarea', {
        class: 'video-copy-buffer',
        readonly: true,
        'aria-label': 'コピー用クレジット'
      });
      buffer.value = text;
      copyBtn.parentElement.append(buffer);
      buffer.select();
      try {
        copied = document.execCommand('copy');
      } catch (_) {
        copied = false;
      }
      buffer.remove();
      copyBtn.focus({preventScroll: true});
    }
    notify(copied ? 'クレジット文をコピーしました。' : 'コピーできませんでした。上の枠内の文面を選択してコピーしてください。');
  }

  caseSelect.addEventListener('change', () => {
    state.caseId = caseSelect.value;
    render();
    if (statusEl) statusEl.textContent = '';
  });

  for (const radio of formatRadios) {
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      state.format = radio.value;
      render();
      if (statusEl) statusEl.textContent = '';
    });
  }

  copyBtn.addEventListener('click', copyText);

  Promise.allSettled([
    loadJSON('data/cases.json'),
    loadJSON('data/projects.json')
  ]).then(([casesResult, projectResult]) => {
    if (projectResult.status === 'fulfilled' && projectResult.value && projectResult.value.site_url) {
      try {
        const parsed = new URL(projectResult.value.site_url);
        if (parsed.protocol === 'https:') state.baseUrl = parsed.href;
      } catch (_) {
        /* Keep default base URL. */
      }
    }
    if (casesResult.status === 'fulfilled' && Array.isArray(casesResult.value && casesResult.value.cases)) {
      state.cases = casesResult.value.cases.slice().sort((a, b) =>
        String(a.title || a.id).localeCompare(String(b.title || b.id), 'ja')
      );
      const options = [h('option', {value: ''}, '汎用 / 任意の動画')];
      for (const item of state.cases) {
        options.push(h('option', {value: item.id}, String(item.title || item.id)));
      }
      caseSelect.replaceChildren(...options);
    }
    render();
  });

  render();
})();
