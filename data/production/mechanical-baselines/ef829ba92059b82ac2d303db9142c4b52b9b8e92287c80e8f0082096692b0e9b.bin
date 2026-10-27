/* 本文を取り出す読書室 — 八百万図AIツールボックス (MIT).
   Runs the bundled Defuddle (vendor/defuddle/defuddle.full.js) on the three fictional pages in samples.json,
   in this browser, with useAsync:false. Nothing is fetched from the network except the local samples.json.
   Extracted text is always written with textContent; it is never inserted as HTML. */
(() => {
  'use strict';

  const PREVIEW_CSP = "default-src 'none'; style-src 'unsafe-inline'";
  const $ = id => document.getElementById(id);
  const el = {
    samples: $('samples'), extract: $('extract'), status: $('status'),
    sourceUrl: $('source-url'), preview: $('preview'), sourceCode: $('source-code'),
    empty: $('result-empty'), meta: $('result-meta'), title: $('result-title'), author: $('result-author'),
    markdown: $('markdown'), copy: $('copy'), download: $('download'), actionStatus: $('action-status'),
    summary: $('check-summary'), kept: $('kept-list'), removed: $('removed-list')
  };

  let samples = [];
  let current = null;
  // The result of the last extraction in this page, or null. Cleared whenever the input changes.
  let extracted = null;

  /* ---------- Small DOM helpers (text only) ---------- */

  function node(tag, className, text) {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  // The preview frame gets its own CSP on top of sandbox="" (no scripts, no same-origin).
  function previewHtml(html) {
    const meta = '<meta http-equiv="Content-Security-Policy" content="' + PREVIEW_CSP + '">';
    const head = /<head[^>]*>/i;
    return head.test(html) ? html.replace(head, match => match + meta) : meta + html;
  }

  /* ---------- Checks ---------- */

  const VERDICT = {
    kept: {pending: '未確認', pass: '残っている', fail: '見つからない'},
    removed: {pending: '未確認', pass: '含まれない', fail: '含まれている'}
  };

  function checkItem(kind, text, ok) {
    const li = node('li');
    li.append(node('span', 'quote', '「' + text + '」'));
    const state = ok === null ? 'pending' : ok ? 'pass' : 'fail';
    li.append(node('span', 'verdict' + (state === 'pending' ? '' : ' is-' + state), VERDICT[kind][state]));
    return li;
  }

  function showPendingChecks(sample, message) {
    el.kept.replaceChildren(...sample.kept.map(q => checkItem('kept', q, null)));
    el.removed.replaceChildren(...sample.removed.map(q => checkItem('removed', q, null)));
    el.summary.className = 'check-summary';
    el.summary.textContent = message;
  }

  /* ---------- State changes ---------- */

  function clearResult() {
    extracted = null;
    el.meta.hidden = true;
    el.title.textContent = '';
    el.author.textContent = '';
    el.markdown.replaceChildren();
    el.markdown.hidden = true;
    el.empty.hidden = false;
    el.copy.disabled = true;
    el.download.disabled = true;
    el.actionStatus.textContent = '';
    el.status.classList.remove('is-error');
    if (current) showPendingChecks(current, 'まだ照らし合わせていません。取り出したあとに、このブラウザーで出た結果を調べます。');
  }

  function selectSample(id, updateHash) {
    const sample = samples.find(s => s.id === id) || samples[0];
    current = sample;
    for (const label of el.samples.querySelectorAll('.choice')) {
      const input = label.querySelector('input');
      input.checked = input.value === sample.id;
      label.classList.toggle('is-selected', input.checked);
    }
    el.sourceUrl.textContent = sample.url + '　（' + sample.fixture + '）';
    el.preview.title = '「' + sample.label + '」の元のページの見え方（操作できない表示）';
    el.preview.srcdoc = previewHtml(sample.input);
    el.sourceCode.textContent = sample.input;
    clearResult();
    el.status.textContent = '「' + sample.label + '」を選びました。まだ取り出していません。「本文を取り出す」を押してください。';
    if (updateHash && location.hash !== '#' + sample.id) history.replaceState(null, '', '#' + sample.id);
  }

  function fail(message) {
    el.status.classList.add('is-error');
    el.status.textContent = message;
    if (current) showPendingChecks(current, '取り出せなかったため、照らし合わせていません。');
  }

  function extract() {
    if (!current) return;
    const sample = current;
    clearResult();
    el.status.textContent = '「' + sample.label + '」から本文を取り出しています。';

    const Defuddle = window.Defuddle && (window.Defuddle.default || window.Defuddle);
    if (typeof Defuddle !== 'function') {
      fail('vendor/defuddle/defuddle.full.js を読み込めなかったため、取り出せませんでした。');
      return;
    }
    let parsed;
    try {
      const doc = new DOMParser().parseFromString(sample.input, 'text/html');
      parsed = new Defuddle(doc, {url: sample.url, markdown: true, useAsync: false, removeImages: true}).parse();
    } catch (error) {
      fail('Defuddleの実行中にエラーが出ました（' + (error && error.message ? error.message : String(error)) + '）。');
      return;
    }

    const content = parsed && typeof parsed.content === 'string' ? parsed.content : '';
    extracted = {
      sample,
      title: parsed && typeof parsed.title === 'string' ? parsed.title : '',
      author: parsed && typeof parsed.author === 'string' ? parsed.author : '',
      content,
      kept: sample.kept.map(text => ({text, ok: content.includes(text)})),
      removed: sample.removed.map(text => ({text, ok: !content.includes(text)}))
    };
    showResult(extracted);
  }

  // Marks every kept phrase that really occurs in the Markdown. Built from text nodes only.
  function fillMarkdown(content, phrases) {
    const ranges = [];
    for (const phrase of phrases) {
      for (let i = content.indexOf(phrase); i !== -1; i = content.indexOf(phrase, i + phrase.length)) {
        ranges.push([i, i + phrase.length]);
      }
    }
    ranges.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
    const merged = [];
    for (const range of ranges) {
      const last = merged[merged.length - 1];
      if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
      else merged.push(range.slice());
    }
    const parts = [];
    let pos = 0;
    for (const [start, end] of merged) {
      if (start > pos) parts.push(document.createTextNode(content.slice(pos, start)));
      parts.push(node('mark', '', content.slice(start, end)));
      pos = end;
    }
    if (pos < content.length) parts.push(document.createTextNode(content.slice(pos)));
    el.markdown.replaceChildren(...parts);
  }

  function showResult(r) {
    // Judge first, from the returned content; only then show the text and the verdict together.
    const keptPass = r.kept.filter(k => k.ok).length;
    const removedPass = r.removed.filter(k => k.ok).length;
    const empty = !r.content.trim();
    const allPass = !empty && keptPass === r.kept.length && removedPass === r.removed.length;

    let summary;
    if (empty) {
      summary = 'Defuddleが返したMarkdownは空でした。本文を取り出せていません。';
    } else if (allPass) {
      summary = '本文の条件' + r.kept.length + '件はすべてMarkdownに残り、本文の外にあった' + r.removed.length + 'つの文言はどれも含まれていませんでした。';
    } else {
      const missing = r.kept.filter(k => !k.ok).map(k => '「' + k.text + '」');
      const leaked = r.removed.filter(k => !k.ok).map(k => '「' + k.text + '」');
      summary = '一致しない項目があります。' +
        (missing.length ? 'Markdownに見つからない条件：' + missing.join('、') + '。' : '') +
        (leaked.length ? 'Markdownに入っていた本文の外の文言：' + leaked.join('、') + '。' : '');
    }

    el.kept.replaceChildren(...r.kept.map(k => checkItem('kept', k.text, empty ? false : k.ok)));
    el.removed.replaceChildren(...r.removed.map(k => checkItem('removed', k.text, k.ok)));
    el.summary.className = 'check-summary ' + (allPass ? 'is-pass' : 'is-fail');
    el.summary.textContent = summary + '（このブラウザーでいま取り出した結果を調べています）';

    el.title.textContent = r.title || '（空でした）';
    el.author.textContent = r.author || '（空でした）';
    el.meta.hidden = false;
    el.empty.hidden = true;
    fillMarkdown(r.content, r.kept.filter(k => k.ok).map(k => k.text));
    el.markdown.hidden = false;
    el.copy.disabled = empty;
    el.download.disabled = empty;

    el.status.textContent = '「' + r.sample.label + '」の取り出しが終わりました。照らし合わせ：' + summary;
  }

  /* ---------- Copy and download ---------- */

  function fallbackCopy(text) {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.className = 'clipboard-buffer';
    document.body.append(area);
    area.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
    area.remove();
    el.copy.focus();
    return ok;
  }

  async function copyMarkdown() {
    if (!extracted) return;
    const r = extracted;
    let ok = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(r.content);
        ok = true;
      }
    } catch (_) { ok = false; }
    if (!ok) ok = fallbackCopy(r.content);
    if (extracted !== r) return;
    el.actionStatus.textContent = ok
      ? '「' + r.sample.label + '」のMarkdownをコピーしました。'
      : 'コピーできませんでした。Markdownの欄を選択してコピーしてください。';
  }

  function downloadMarkdown() {
    if (!extracted) return;
    const r = extracted;
    const url = URL.createObjectURL(new Blob([r.content], {type: 'text/markdown;charset=utf-8'}));
    const a = document.createElement('a');
    a.href = url;
    a.download = r.sample.id + '.md';
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    el.actionStatus.textContent = r.sample.id + '.md の保存を始めました。';
  }

  /* ---------- Setup ---------- */

  function buildChoices() {
    el.samples.replaceChildren(...samples.map((sample, i) => {
      const label = node('label', 'choice');
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'sample';
      input.value = sample.id;
      label.append(input,
        node('span', 'choice-no', String(i + 1).padStart(2, '0') + '　' + sample.fixture),
        node('span', 'choice-title', sample.label),
        node('span', 'choice-url', sample.url));
      return label;
    }));
  }

  el.samples.addEventListener('change', event => {
    if (event.target.name === 'sample') selectSample(event.target.value, true);
  });
  el.samples.addEventListener('keydown', event => {
    if (event.key === 'Enter' && event.target.name === 'sample') {
      event.preventDefault();
      if (!event.target.checked) selectSample(event.target.value, true);
      extract();
    }
  });
  el.extract.addEventListener('click', extract);
  el.copy.addEventListener('click', copyMarkdown);
  el.download.addEventListener('click', downloadMarkdown);
  window.addEventListener('hashchange', () => {
    const id = location.hash.slice(1);
    if (samples.length && (!current || current.id !== id)) selectSample(id, false);
  });

  fetch('samples.json', {cache: 'no-cache'})
    .then(response => {
      if (!response.ok) throw new Error(String(response.status));
      return response.json();
    })
    .then(data => {
      samples = (data && Array.isArray(data.samples) ? data.samples : [])
        .filter(s => s && typeof s.input === 'string' && Array.isArray(s.kept) && Array.isArray(s.removed));
      if (!samples.length) throw new Error('no samples');
      buildChoices();
      el.extract.disabled = false;
      selectSample(location.hash.slice(1), false);
    })
    .catch(() => {
      fail('samples.json を読み込めませんでした。このフォルダをローカルのHTTPサーバーで配信して index.html を開いてください。');
    });
})();
