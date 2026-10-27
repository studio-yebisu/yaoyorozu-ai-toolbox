/* yomiyasu の作例 — 八百万図AIツールボックス (MIT).
   Reads the saved rewrites from samples.json and lays them out for reading. Nothing here calls an AI. */
(() => {
  'use strict';

  const tabsEl = document.getElementById('tabs');
  const panel = document.getElementById('panel');
  let samples = [];
  let current = 0;
  let keptIndex = -1;
  let marksOn = true;

  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs || {})) {
      if (value === null || value === undefined || value === false) continue;
      if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
      else el.setAttribute(key, value === true ? '' : String(value));
    }
    for (const child of children.flat(Infinity)) {
      if (child === null || child === undefined || child === false) continue;
      el.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return el;
  }

  /* ---------- Locating quoted spans ---------- */

  // Finds each part in order; a part that is not found after the previous one is searched from the start.
  function locate(text, parts) {
    let cursor = 0;
    return parts.map(part => {
      if (!part) return null;
      let start = text.indexOf(part, cursor);
      if (start < 0) start = text.indexOf(part);
      if (start < 0) return null;
      cursor = start + part.length;
      return {start, end: start + part.length};
    });
  }

  // Splits the text into runs that share the same change number and kept flag.
  function runs(text, changeRanges, keptRange) {
    const change = new Array(text.length).fill(-1);
    changeRanges.forEach((range, i) => {
      if (range) for (let p = range.start; p < range.end; p++) change[p] = i;
    });
    const kept = p => !!keptRange && p >= keptRange.start && p < keptRange.end;
    const out = [];
    for (let p = 0; p < text.length; p++) {
      const last = out[out.length - 1];
      if (last && last.change === change[p] && last.kept === kept(p)) last.text += text[p];
      else out.push({text: text[p], change: change[p], kept: kept(p), start: p});
    }
    return out;
  }

  function renderText(text, changeRanges, markClass, keptRange) {
    const p = h('p', {class: 'text'});
    for (const run of runs(text, changeRanges, keptRange)) {
      const classes = [run.change >= 0 ? markClass : '', run.kept ? 'is-kept' : ''].filter(Boolean).join(' ');
      p.append(classes ? h('span', {class: classes}, run.text) : document.createTextNode(run.text));
      const range = run.change >= 0 ? changeRanges[run.change] : null;
      if (range && run.start + run.text.length === range.end) {
        p.append(h('sup', {class: 'mark-n', 'aria-hidden': 'true'}, String(run.change + 1)));
      }
    }
    return p;
  }

  /* ---------- Actions ---------- */

  function announce(message) {
    const status = panel.querySelector('.status');
    if (status) status.textContent = message;
  }

  async function copyOutput(sample) {
    try {
      await navigator.clipboard.writeText(sample.output);
    } catch (_) {
      const area = h('textarea', {readonly: true, 'aria-hidden': 'true', style: 'position:fixed;left:-9999px;top:0'});
      area.value = sample.output;
      document.body.append(area);
      area.select();
      const ok = document.execCommand && document.execCommand('copy');
      area.remove();
      if (!ok) { announce('コピーできませんでした。推敲後の文を選択してコピーしてください。'); return; }
    }
    announce('推敲後の文をコピーしました。');
  }

  function saveJSON(sample) {
    const data = {format: 'input-output', synthetic: true, samples: [sample]};
    const blob = new Blob([JSON.stringify(data, null, 2) + '\n'], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const link = h('a', {href: url, download: 'yomiyasu-' + sample.id + '.json'});
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    announce('yomiyasu-' + sample.id + '.json を保存しました。');
  }

  /* ---------- Rendering ---------- */

  function renderTabs() {
    tabsEl.replaceChildren(...samples.map((sample, i) => h('button', {
      type: 'button', role: 'tab', class: 'tab', id: 'tab-' + sample.id,
      'aria-selected': i === current ? 'true' : 'false', 'aria-controls': 'panel',
      tabindex: i === current ? '0' : '-1',
      onclick: () => select(i, false)
    }, h('span', {class: 'tab-n'}, String(i + 1).padStart(2, '0')), h('span', {class: 'tab-label'}, sample.label))));
  }

  function outputRanges(sample) {
    return locate(sample.output, (sample.changes || []).map(c => c.after));
  }

  function keptRangeOf(sample) {
    const item = (sample.preserved || [])[keptIndex];
    return item ? locate(sample.output, [item.excerpt])[0] : null;
  }

  function refreshOutput(sample) {
    const holder = panel.querySelector('.sheet-out .text');
    if (holder) holder.replaceWith(renderText(sample.output, outputRanges(sample), 'mark-ins', keptRangeOf(sample)));
    panel.querySelectorAll('.kept button').forEach((button, i) => button.setAttribute('aria-pressed', i === keptIndex ? 'true' : 'false'));
  }

  function renderPanel() {
    const sample = samples[current];
    panel.setAttribute('aria-labelledby', 'tab-' + sample.id);
    panel.classList.toggle('marks-off', !marksOn);
    const changes = sample.changes || [];
    const preserved = sample.preserved || [];

    panel.replaceChildren(
      h('div', {class: 'meta'},
        h('p', {class: 'context'}, h('b', {}, '用途'), sample.context || ''),
        h('label', {class: 'toggle'},
          h('input', {type: 'checkbox', checked: marksOn, onchange: event => {
            marksOn = event.target.checked;
            panel.classList.toggle('marks-off', !marksOn);
          }}),
          '直した箇所に印を付ける')),
      h('div', {class: 'reading'},
        h('section', {class: 'sheet sheet-in', 'aria-labelledby': 'h-in'},
          h('div', {class: 'sheet-head'}, h('h2', {id: 'h-in'}, '原文'), h('small', {}, '渡した文章のまま')),
          renderText(sample.input, locate(sample.input, changes.map(c => c.before)), 'mark-del', null)),
        h('section', {class: 'sheet sheet-out', 'aria-labelledby': 'h-out'},
          h('div', {class: 'sheet-head'}, h('h2', {id: 'h-out'}, '推敲後'), h('small', {}, 'yomiyasu を使った制作時の出力')),
          renderText(sample.output, outputRanges(sample), 'mark-ins', keptRangeOf(sample)),
          h('div', {class: 'actions'},
            h('button', {type: 'button', class: 'btn', onclick: () => copyOutput(sample)}, '推敲後をコピー'),
            h('button', {type: 'button', class: 'btn btn-line', onclick: () => saveJSON(sample)}, 'この例のJSONを保存'),
            h('span', {class: 'status', role: 'status'})))),
      h('div', {class: 'notes'},
        h('section', {'aria-labelledby': 'h-changes'},
          h('h2', {id: 'h-changes'}, '変えたところ'),
          changes.length
            ? h('ol', {class: 'changes'}, changes.map(c => h('li', {},
                h('p', {class: 'pair'}, h('del', {}, c.before), h('span', {class: 'arrow', 'aria-hidden': 'true'}, '→'), h('ins', {}, c.after)),
                h('p', {class: 'reason'}, c.reason))))
            : h('p', {}, 'なし')),
        h('section', {'aria-labelledby': 'h-kept'},
          h('h2', {id: 'h-kept'}, '残した条件'),
          h('p', {class: 'hint'}, '条件を選ぶと、推敲後の文の該当する箇所を囲みます。制作時に一つずつ照らし合わせた記録で、自動の判定ではありません。'),
          h('ul', {class: 'kept'}, preserved.map((item, i) => h('li', {},
            h('button', {type: 'button', 'aria-pressed': i === keptIndex ? 'true' : 'false', onclick: () => {
              keptIndex = keptIndex === i ? -1 : i;
              refreshOutput(sample);
            }},
              h('span', {class: 'cond'}, item.condition),
              h('span', {class: 'excerpt'}, '「' + item.excerpt + '」'))))))));
  }

  function select(i, focusTab) {
    current = (i + samples.length) % samples.length;
    keptIndex = -1;
    renderTabs();
    renderPanel();
    history.replaceState(null, '', '#' + samples[current].id);
    if (focusTab) tabsEl.children[current].focus();
  }

  tabsEl.addEventListener('keydown', event => {
    const moves = {ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: samples.length - 1};
    if (!(event.key in moves) || !samples.length) return;
    event.preventDefault();
    select(moves[event.key], true);
  });

  window.addEventListener('hashchange', () => {
    const i = samples.findIndex(s => '#' + s.id === location.hash);
    if (i >= 0 && i !== current) select(i, false);
  });

  fetch('samples.json')
    .then(response => { if (!response.ok) throw new Error(response.status); return response.json(); })
    .then(data => {
      samples = Array.isArray(data.samples) ? data.samples : [];
      if (!samples.length) throw new Error('empty');
      const fromHash = samples.findIndex(s => '#' + s.id === location.hash);
      current = fromHash >= 0 ? fromHash : 0;
      renderTabs();
      renderPanel();
    })
    .catch(() => {
      panel.replaceChildren(h('p', {class: 'error'}, 'samples.json を読み込めませんでした。ファイルを直接開いた場合は、ローカルのHTTPサーバー経由で開いてください。'));
    });
})();
