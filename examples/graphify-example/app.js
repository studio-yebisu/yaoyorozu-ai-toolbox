// 保存結果ビューア。outputs/ の実行結果と fixture/ の原文を読むだけで、Graphify は動かさない。

import {loadSaved, LAYOUTS, NODE_TEXT, EVIDENCE, RELATION_TEXT, EXPECTED, edgePoints} from './graph-data.mjs';

const NS = 'http://www.w3.org/2000/svg';
const graphHost = document.getElementById('graph');
const detail = document.getElementById('detail');
const pick = document.getElementById('pick');
const statusEl = document.getElementById('status');
const modeButtons = Array.from(document.querySelectorAll('[data-mode]'));
const narrow = window.matchMedia('(max-width: 700px)');

const view = {data: null, mode: 'docs', selected: EXPECTED.seed};
const files = new Map();

function svg(name, attrs = {}, children = []) {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attrs)) if (value !== undefined && value !== null) node.setAttribute(key, String(value));
  for (const child of children) node.append(child);
  return node;
}

function html(name, attrs = {}, children = []) {
  const node = document.createElement(name);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'text') node.textContent = value;
    else if (value !== undefined && value !== null) node.setAttribute(key, String(value));
  }
  for (const child of children) node.append(child);
  return node;
}

const isDoc = (id) => view.data.nodes.get(id).kind === 'document';
const visible = (id) => view.mode === 'docs' || !isDoc(id);

async function fileText(path) {
  if (!files.has(path)) {
    files.set(path, fetch(path, {cache: 'no-store'}).then((response) => {
      if (!response.ok) throw new Error(`${path} を読めません（${response.status}）`);
      return response.text();
    }));
  }
  return files.get(path);
}

// ---- 図 ----

function drawGraph(reveal = false) {
  const {graph, hits} = view.data;
  const layout = narrow.matches ? LAYOUTS.tall : LAYOUTS.wide;
  const {box, pos} = layout;
  const root = svg('svg', {viewBox: `0 0 ${layout.width} ${layout.height}`, class: `graph-map mode-${view.mode}${reveal ? ' reveal' : ''}`, role: 'img', 'aria-label': '影響探索のグラフ。下のボタンか図のノードを選ぶと、原文と根拠を表示します。'});
  const defs = svg('defs');
  defs.append(
    svg('marker', {id: 'arrow-call', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 8, markerHeight: 8, orient: 'auto-start-reverse'}, [svg('path', {d: 'M0 0L10 5L0 10Z', class: 'm-call'})]),
    svg('marker', {id: 'arrow-ref', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 8, markerHeight: 8, orient: 'auto-start-reverse'}, [svg('path', {d: 'M0 0L10 5L0 10Z', class: 'm-ref'})]),
  );
  root.append(defs);

  const edgeLayer = svg('g', {class: 'edges'});
  for (const edge of graph.edges) {
    const [a, b] = edgePoints(pos[edge.source], pos[edge.target], {w: box.w + 10, h: box.h + 10});
    const shown = visible(edge.source) && visible(edge.target);
    const line = svg('line', {
      x1: a[0].toFixed(1), y1: a[1].toFixed(1), x2: b[0].toFixed(1), y2: b[1].toFixed(1),
      class: `edge edge-${edge.relation}${shown ? '' : ' is-hidden'}`,
      'marker-end': `url(#arrow-${edge.relation === 'calls' ? 'call' : 'ref'})`,
    });
    line.append(svg('title', {}, [`${edge.source} → ${edge.target}（${RELATION_TEXT[edge.relation] || edge.relation}・${edge.source_file}:${edge.source_location}）`]));
    edgeLayer.append(line);
  }
  root.append(edgeLayer);

  const nodeLayer = svg('g', {class: 'nodes'});
  for (const node of graph.nodes) {
    const [cx, cy] = pos[node.id];
    const x = cx - box.w / 2;
    const y = cy - box.h / 2;
    const hit = hits.get(node.id);
    const doc = node.kind === 'document';
    const seed = node.id === EXPECTED.seed;
    const shown = visible(node.id);
    const classes = ['node', doc ? 'is-doc' : 'is-fn', seed ? 'is-seed' : '', hit && shown ? 'is-hit' : '', view.selected === node.id ? 'is-selected' : '', shown ? '' : 'is-hidden'].filter(Boolean).join(' ');
    const label = `${node.id}（${NODE_TEXT[node.id].gloss}）${seed ? '・起点' : hit ? `・影響 深さ${hit.depth}` : ''}`;
    const group = svg('g', {class: classes, tabindex: shown ? 0 : -1, role: 'button', 'aria-label': `${label}の原文と根拠を表示`, 'aria-pressed': String(view.selected === node.id), 'data-id': node.id});
    if (doc) {
      const fold = 12;
      group.append(svg('path', {class: 'frame', d: `M${x} ${y}H${x + box.w - fold}L${x + box.w} ${y + fold}V${y + box.h}H${x}Z`}));
      group.append(svg('path', {class: 'fold', d: `M${x + box.w - fold} ${y}V${y + fold}H${x + box.w}`}));
      const stamp = svg('g', {class: 'stamp-mark'});
      stamp.append(svg('rect', {x: x + 6, y: y - 9, width: 36, height: 17, rx: 2}), svg('text', {x: x + 24, y: y + 4, 'text-anchor': 'middle'}, ['手動']));
      group.append(stamp);
    } else {
      group.append(svg('rect', {class: 'frame', x, y, width: box.w, height: box.h, rx: 6}));
    }
    group.append(svg('text', {class: 'id', x: cx, y: cy - 4, 'text-anchor': 'middle'}, [node.id]));
    group.append(svg('text', {class: 'gloss', x: cx, y: cy + 15, 'text-anchor': 'middle'}, [NODE_TEXT[node.id].gloss]));
    if (seed) {
      group.append(svg('rect', {class: 'tag tag-seed', x: x + box.w - 44, y: y - 10, width: 40, height: 18, rx: 2}), svg('text', {class: 'tag-text', x: x + box.w - 24, y: y + 3, 'text-anchor': 'middle'}, ['起点']));
    } else if (hit && shown) {
      group.append(svg('rect', {class: 'tag tag-hit', x: x + box.w - 50, y: y + box.h - 8, width: 46, height: 18, rx: 2}), svg('text', {class: 'tag-text', x: x + box.w - 27, y: y + box.h + 5, 'text-anchor': 'middle'}, [`深さ${hit.depth}`]));
    }
    nodeLayer.append(group);
  }
  root.append(nodeLayer);
  graphHost.replaceChildren(root);
}

// ---- 件数 ----

function drawNumbers() {
  const {result} = view.data;
  const calls = result.hits.filter((hit) => hit.via_relation === 'calls').length;
  document.getElementById('n-hits').textContent = String(view.mode === 'docs' ? result.hits.length : calls);
  document.getElementById('n-nodes').textContent = String(result.node_count);
  document.getElementById('n-edges').textContent = String(result.edge_count);
  document.getElementById('numbers-note').textContent = view.mode === 'docs'
    ? `起点の shipping_fee を除く${result.hits.length}ノードが、深さ${result.depth}までの逆向き探索で見つかりました。`
    : `同じ保存結果${result.hits.length}件のうち、呼び出し（calls）でたどった${calls}件だけを表示しています。別の実行ではありません。`;
}

// ---- 選んだノードの詳細 ----

function snippet(path, text, marks, caption, start = 1) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n');
  const code = html('code');
  lines.forEach((line, index) => {
    const number = index + start;
    const row = html(marks.has(number) ? 'mark' : 'span', {class: 'line'});
    row.append(html('span', {class: 'num', 'aria-hidden': 'true', text: String(number).padStart(2, ' ')}), document.createTextNode(` ${line}\n`));
    code.append(row);
  });
  return html('figure', {class: 'snippet'}, [
    html('figcaption', {}, [html('a', {href: path, text: path}), document.createTextNode(caption)]),
    html('pre', {tabindex: '0'}, [code]),
  ]);
}

async function drawDetail() {
  const id = view.selected;
  const {nodes, hits, result} = view.data;
  const node = nodes.get(id);
  const hit = hits.get(id);
  const doc = node.kind === 'document';
  const evidence = EVIDENCE[node.evidence];
  const seed = id === EXPECTED.seed;

  const rows = [
    ['種類', doc ? '仕様書（Markdown・架空）' : '関数（Python・架空）'],
    ['関係の入力', `${evidence.short}：${evidence.long}（${evidence.where}）`],
    ['グラフ上の場所', `${node.source_file}:${node.source_location}`],
    ['影響探索', seed ? `起点（深さ${result.depth}まで逆向きにたどった）` : hit ? `深さ${hit.depth}・${RELATION_TEXT[hit.via_relation] || hit.via_relation}・根拠の行 ${hit.via_file}:${hit.via_location}` : '影響ノードではない'],
  ];
  const list = html('dl', {class: 'facts'});
  for (const [term, value] of rows) list.append(html('div', {}, [html('dt', {text: term}), html('dd', {text: value})]));

  const head = html('h3', {}, [html('code', {text: id}), html('small', {text: NODE_TEXT[id].gloss})]);
  const parts = [head, list];

  const marks = new Set([Number(node.source_location)]);
  if (hit && hit.via_location) marks.add(Number(hit.via_location));
  if (seed) marks.add(1);
  try {
    const text = await fileText(node.source_file);
    if (view.selected !== id) return;
    parts.push(snippet(node.source_file, text, marks, '（実ファイル全体・印は根拠の行）'));
    if (doc) {
      const runText = await fileText('run.py');
      if (view.selected !== id) return;
      const lines = runText.replace(/\r\n/g, '\n').split('\n').slice(24, 27).join('\n');
      parts.push(html('p', {class: 'small', text: 'この仕様書と関数の対応は、run.py に人が書いた次の行から入れました（自動抽出ではありません）。'}));
      parts.push(snippet('run.py', lines, new Set([25]), '（25〜27行目を抜き出し・25行目が手書きの対応表）', 25));
    }
  } catch (error) {
    parts.push(html('p', {class: 'error', text: `原文を読めません：${error.message}`}));
  }
  if (seed) {
    const table = html('table', {class: 'runs mini'});
    table.append(html('caption', {text: 'この関数を実際に呼んだ結果（result.json）'}));
    const body = html('tbody');
    for (const run of result.fixture_runs) {
      body.append(html('tr', {}, [html('td', {text: `${run.subtotal_yen.toLocaleString('ja-JP')}円`}), html('td', {text: `送料 ${run.shipping_yen.toLocaleString('ja-JP')}円`})]));
    }
    table.append(body);
    parts.push(table);
  }
  if (view.selected !== id) return;
  detail.replaceChildren(...parts);
}

function drawPicker() {
  const buttons = view.data.graph.nodes.map((node) => {
    const shown = visible(node.id);
    const button = html('button', {type: 'button', 'aria-pressed': String(view.selected === node.id), 'data-id': node.id, class: node.kind === 'document' ? 'is-doc' : 'is-fn'});
    button.append(html('code', {text: node.id}), html('span', {text: node.kind === 'document' ? ' 手動' : ''}));
    button.hidden = !shown;
    return button;
  });
  pick.replaceChildren(...buttons);
}

function drawChange() {
  const {result, hits, nodes} = view.data;
  const runs = document.getElementById('runs');
  runs.replaceChildren(...result.fixture_runs.map((run) => html('tr', {}, [
    html('td', {text: `${run.subtotal_yen.toLocaleString('ja-JP')}円`}),
    html('td', {text: `${run.shipping_yen.toLocaleString('ja-JP')}円`}),
    html('td', {text: `${run.total_yen.toLocaleString('ja-JP')}円`}),
  ])));
  const items = [...hits.values()].sort((a, b) => a.depth - b.depth).map((hit) => {
    const node = nodes.get(hit.node_id);
    const doc = node.kind === 'document';
    const button = html('button', {type: 'button', class: 'linkish', 'data-id': hit.node_id}, [html('code', {text: hit.node_id})]);
    return html('li', {}, [
      button,
      html('span', {class: 'meta', text: `${doc ? '仕様書・手動の対応' : '関数・独自AST'}｜深さ${hit.depth}｜${hit.via_file}:${hit.via_location}`}),
      html('span', {class: 'why', text: NODE_TEXT[hit.node_id].gloss}),
    ]);
  });
  document.getElementById('checklist').replaceChildren(...items);
}

function select(id) {
  if (!view.data.nodes.has(id)) return;
  if (!visible(id)) setMode('docs');
  view.selected = id;
  drawGraph();
  drawPicker();
  drawDetail();
}

function setMode(mode) {
  const reveal = mode === 'docs' && view.mode !== 'docs';
  view.mode = mode;
  modeButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.mode === mode)));
  if (!visible(view.selected)) view.selected = EXPECTED.seed;
  drawGraph(reveal);
  drawPicker();
  drawNumbers();
  drawDetail();
}

// ---- 入力 ----

graphHost.addEventListener('click', (event) => {
  const node = event.target.closest('[data-id]');
  if (node) select(node.dataset.id);
});
graphHost.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  const node = event.target.closest('[data-id]');
  if (!node) return;
  event.preventDefault();
  select(node.dataset.id);
  const again = graphHost.querySelector(`[data-id="${CSS.escape(node.dataset.id)}"]`);
  if (again) again.focus();
});
pick.addEventListener('click', (event) => {
  const button = event.target.closest('[data-id]');
  if (button) select(button.dataset.id);
});
document.getElementById('checklist').addEventListener('click', (event) => {
  const button = event.target.closest('[data-id]');
  if (!button) return;
  select(button.dataset.id);
  document.getElementById('graph-area').scrollIntoView({block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
});
modeButtons.forEach((button) => button.addEventListener('click', () => setMode(button.dataset.mode)));
narrow.addEventListener('change', () => view.data && drawGraph());

loadSaved('.').then((data) => {
  view.data = data;
  statusEl.textContent = `保存結果を確認しました：グラフ${data.result.node_count}ノード・${data.result.edge_count}エッジ、影響${data.result.hits.length}件（上流 ${data.result.upstream_commit.slice(0, 7)}）`;
  drawGraph();
  drawPicker();
  drawNumbers();
  drawChange();
  drawDetail();
}, (error) => {
  statusEl.dataset.state = 'error';
  statusEl.textContent = `保存結果を表示できません：${error.message}`;
  graphHost.replaceChildren();
});
