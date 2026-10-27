/* Pretty Mermaid の作例 — 八百万図AIツールボックス original (MIT).
   Reads samples.json and shows the files the upstream CLI wrote to assets/. Nothing is rendered or generated in the page. */
(() => {
  'use strict';

  const TYPES = {flowchart: '流れ図', sequenceDiagram: 'シーケンス図', 'stateDiagram-v2': '状態遷移図'};
  const THEMES = {light: {label: 'ライト', name: 'github-light'}, dark: {label: 'ダーク', name: 'github-dark'}};
  const ZOOMS = [1, 1.5, 2, 3];
  // A line that declares an arrow in flowchart, sequence, or state syntax.
  const ARROW = /-->>|->>|-->|--x|-x|--\)|-\)/;
  const TOKEN = /(-->>|->>|-->|\|[^|]+\||:\s.*$|\[\*\]|stateDiagram-v2|\b(?:flowchart|LR|sequenceDiagram|participant|as)\b)/;

  const $ = id => document.getElementById(id);
  const state = {samples: [], index: 0, theme: 'light', zoom: 0, line: null, ascii: new Map()};

  const pad2 = n => String(n).padStart(2, '0');
  const keywordOf = sample => sample.input.split('\n')[0].trim().split(/\s+/)[0];
  const linesOf = sample => sample.input.replace(/\n$/, '').split('\n');

  function el(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (key.startsWith('data-') || key.startsWith('aria-') || key === 'role') node.setAttribute(key, value);
      else node[key] = value;
    }
    for (const child of [].concat(children)) if (child) node.append(child);
    return node;
  }

  /* ---------- Roving focus for the tab list and the theme switch ---------- */

  function rove(event, items, current, choose) {
    const last = items.length - 1;
    const next = {ArrowRight: current + 1, ArrowDown: current + 1, ArrowLeft: current - 1, ArrowUp: current - 1, Home: 0, End: last}[event.key];
    if (next === undefined) return;
    event.preventDefault();
    const index = (next + items.length) % items.length;
    choose(index);
    items[index].focus();
  }

  /* ---------- Tabs ---------- */

  function buildTabs() {
    const tabs = $('tabs');
    state.samples.forEach((sample, i) => {
      const keyword = keywordOf(sample);
      const tab = el('button', {type: 'button', role: 'tab', id: 'tab-' + sample.id, 'aria-controls': 'plate', class: 'plate-tab'}, [
        el('span', {class: 'tab-no', text: pad2(i + 1)}),
        el('span', {class: 'tab-type', text: TYPES[keyword] || keyword}),
        el('span', {class: 'tab-key', text: keyword})
      ]);
      tab.addEventListener('click', () => select(i));
      tabs.append(tab);
    });
    tabs.addEventListener('keydown', event => rove(event, [...tabs.children], state.index, select));
  }

  function select(index, updateHash = true) {
    state.index = index;
    state.line = null;
    [...$('tabs').children].forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
    });
    const sample = state.samples[index];
    $('plate').setAttribute('aria-labelledby', 'tab-' + sample.id);
    if (updateHash) history.replaceState(null, '', '#' + sample.id);
    renderPlate(sample, index);
  }

  /* ---------- Source and the correspondence table ---------- */

  function tokens(line, first) {
    const out = [];
    for (const piece of line.split(TOKEN)) {
      if (!piece) continue;
      let cls = '';
      if (/^-/.test(piece)) cls = 'tok-arrow';
      else if (/^\||^:\s/.test(piece)) cls = 'tok-label';
      else if (piece === '[*]') cls = 'tok-mark';
      else if (TOKEN.test(piece) && (first || /^(participant|as)$/.test(piece))) cls = 'tok-kw';
      out.push(cls ? el('span', {class: cls, text: piece}) : document.createTextNode(piece));
    }
    return out;
  }

  function setLine(n) {
    state.line = state.line === n ? null : n;
    for (const node of document.querySelectorAll('[data-line]')) {
      const on = Number(node.dataset.line) === state.line;
      node.classList.toggle('is-active', on);
      const button = node.querySelector('button');
      if (button) button.setAttribute('aria-pressed', String(on));
    }
  }

  function renderSource(sample) {
    const code = $('code');
    const pairs = $('pairs');
    code.replaceChildren();
    pairs.replaceChildren();
    const lines = linesOf(sample);
    const arrows = [];
    lines.forEach((line, i) => { if (i > 0 && ARROW.test(line)) arrows.push(i + 1); });
    // relationships are written in the same order as the arrow lines of the source.
    const paired = arrows.length === sample.relationships.length;

    lines.forEach((line, i) => {
      const n = i + 1;
      const body = el('code', {}, tokens(line, i === 0));
      const k = arrows.indexOf(n);
      const item = el('li', {'data-line': n, class: k >= 0 ? 'is-arrow' : ''}, [el('span', {class: 'ln', text: String(n), 'aria-hidden': 'true'})]);
      if (k >= 0 && paired) {
        const button = el('button', {type: 'button', 'aria-pressed': 'false', 'aria-label': n + '行目　' + sample.relationships[k]}, [body]);
        button.addEventListener('click', () => setLine(n));
        item.append(button);
      } else {
        item.append(body);
      }
      code.append(item);
    });

    sample.relationships.forEach((relation, k) => {
      const n = paired ? arrows[k] : null;
      const cell = n
        ? el('button', {type: 'button', class: 'pair-no', 'aria-pressed': 'false', 'aria-label': n + '行目を示す', text: pad2(n)})
        : el('span', {class: 'pair-no', text: '—'});
      if (n) cell.addEventListener('click', () => setLine(n));
      pairs.append(el('tr', n ? {'data-line': n} : {}, [
        el('td', {}, [cell]),
        el('td', {}, [el('code', {text: n ? lines[n - 1].trim() : ''})]),
        el('td', {text: relation})
      ]));
    });
  }

  /* ---------- Figures (saved outputs only) ---------- */

  function missing(path) {
    return el('div', {class: 'missing'}, [
      el('p', {class: 'missing-path', text: path}),
      el('p', {text: 'このファイルはまだありません。原典CLIで書き出すと、ここに表示されます。'})
    ]);
  }

  function renderMats(sample) {
    const mats = $('mats');
    $('plate').dataset.diagram = keywordOf(sample);
    mats.replaceChildren();
    mats.dataset.mode = state.theme;
    const themes = state.theme === 'both' ? ['light', 'dark'] : [state.theme];
    for (const key of themes) {
      const path = key === 'light' ? sample.svg_light : sample.svg_dark;
      const img = el('img', {src: path, alt: sample.output + '（' + THEMES[key].name + '）', decoding: 'async'});
      const viewport = el('div', {class: 'viewport', tabIndex: 0, role: 'region', 'aria-label': THEMES[key].label + 'の図'}, [img]);
      img.addEventListener('error', () => viewport.replaceChildren(missing(path)), {once: true});
      mats.append(el('figure', {class: 'mat mat-' + key}, [
        viewport,
        el('figcaption', {}, [el('span', {class: 'cap-theme', text: '--theme ' + THEMES[key].name}), el('span', {class: 'cap-path', text: path})])
      ]));
    }
    applyZoom();
  }

  function applyZoom() {
    const z = ZOOMS[state.zoom];
    $('mats').style.setProperty('--zoom', String(z));
    $('zoom-level').value = Math.round(z * 100) + '%';
    $('zoom-out').disabled = state.zoom === 0;
    $('zoom-in').disabled = state.zoom === ZOOMS.length - 1;
  }

  function setTheme(index) {
    const buttons = [...$('themes').children];
    state.theme = buttons[index].dataset.theme;
    buttons.forEach((button, i) => {
      button.setAttribute('aria-checked', String(i === index));
      button.tabIndex = i === index ? 0 : -1;
    });
    renderMats(state.samples[state.index]);
  }

  function renderAscii(sample) {
    const pre = $('ascii');
    $('ascii-file').textContent = sample.ascii_file;
    const show = text => {
      if (state.samples[state.index] !== sample) return;
      pre.classList.toggle('is-missing', text === null);
      pre.textContent = text === null ? sample.ascii_file + '\nこのファイルはまだありません。原典CLIで書き出すと、ここに表示されます。' : text;
    };
    if (state.ascii.has(sample.id)) return show(state.ascii.get(sample.id));
    pre.textContent = '';
    fetch(sample.ascii_file)
      .then(response => (response.ok ? response.text() : null))
      .catch(() => null)
      .then(text => {
        if (text !== null) state.ascii.set(sample.id, text);
        show(text);
      });
  }

  function renderFiles(sample) {
    const source = 'inputs/' + sample.stem + '.mmd';
    const rows = [
      {path: sample.svg_light, format: 'SVG ライト', flag: '--theme github-light', use: 'README・文書・Web。拡大しても線がにじまない。'},
      {path: sample.svg_dark, format: 'SVG ダーク', flag: '--theme github-dark', use: '暗い背景のページやスライド。'},
      {path: sample.png, format: 'PNG', flag: '--format png --width 1200', use: 'チャットやプレビューなど、画像しか受け付けない場所。'},
      {path: sample.ascii_file, format: '文字図', flag: '--format ascii --color-mode none', use: '端末・ログ・プレーンテキストの文書。'},
      {path: source, format: '元ソース', flag: '.mmd', use: '書き換えて描き直すときの入力。'}
    ];
    $('files').replaceChildren(...rows.map(row => el('li', {}, [
      el('a', {href: row.path, download: row.path.split('/').pop()}, [
        el('span', {class: 'file-format', text: row.format}),
        el('span', {class: 'file-name', text: row.path.split('/').pop()})
      ]),
      el('code', {class: 'file-flag', text: row.flag}),
      el('p', {class: 'file-use', text: row.use})
    ])));
  }

  function renderPlate(sample, index) {
    const keyword = keywordOf(sample);
    $('plate-no').textContent = '図版 ' + pad2(index + 1) + ' / ' + pad2(state.samples.length) + '　' + (TYPES[keyword] || keyword);
    $('plate-title').textContent = sample.label;
    $('plate-output').textContent = sample.output;
    $('source-file').textContent = 'inputs/' + sample.stem + '.mmd';
    renderSource(sample);
    renderMats(sample);
    renderAscii(sample);
    renderFiles(sample);
  }

  /* ---------- Start ---------- */

  function start(data) {
    state.samples = data.samples;
    $('status').remove();
    for (const node of document.querySelectorAll('.sheet [hidden]')) node.hidden = false;
    buildTabs();

    const themes = $('themes');
    [...themes.children].forEach((button, i) => button.addEventListener('click', () => setTheme(i)));
    themes.addEventListener('keydown', event => {
      const buttons = [...themes.children];
      rove(event, buttons, buttons.findIndex(b => b.dataset.theme === state.theme), setTheme);
    });
    $('zoom-in').addEventListener('click', () => { state.zoom = Math.min(ZOOMS.length - 1, state.zoom + 1); applyZoom(); });
    $('zoom-out').addEventListener('click', () => { state.zoom = Math.max(0, state.zoom - 1); applyZoom(); });

    const fromHash = () => Math.max(0, state.samples.findIndex(s => '#' + s.id === location.hash));
    window.addEventListener('hashchange', () => select(fromHash(), false));
    const buttons = [...themes.children];
    buttons.forEach((button, i) => { button.setAttribute('aria-checked', String(i === 0)); button.tabIndex = i === 0 ? 0 : -1; });
    select(fromHash(), Boolean(location.hash));
  }

  fetch('samples.json')
    .then(response => { if (!response.ok) throw new Error(String(response.status)); return response.json(); })
    .then(start)
    .catch(() => {
      $('status').textContent = 'samples.json を読み込めませんでした。ファイルを直接開くと読み込めないブラウザーがあります。ローカルのWebサーバーからこのページを開いてください。';
    });
})();
