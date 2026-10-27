// 保存済みの実行結果（outputs/result.json・outputs/graph.json）を読み、
// ページと動画で同じ配置・同じ言葉で描くための共通モジュール。
// ブラウザーでは Graphify を実行しない。読むだけ。

export const EXPECTED = Object.freeze({seed: 'shipping_fee', depth: 3, nodes: 6, edges: 5, hits: 5});

export const SOURCE = Object.freeze({
  repository: 'Graphify-Labs/graphify',
  commit: '847a93f3cab5e2c82ea9170014b21cd2c52a4417',
  url: 'https://github.com/Graphify-Labs/graphify/tree/847a93f3cab5e2c82ea9170014b21cd2c52a4417',
});

// 日本語の短い説明（図のラベル）
export const NODE_TEXT = Object.freeze({
  shipping_fee: {gloss: '送料を決める関数', short: '送料'},
  checkout_total: {gloss: '注文合計（送料を足す）', short: '注文合計'},
  delivery_estimate: {gloss: '注文前の送料見積もり', short: '見積もり'},
  'shipping-policy.md': {gloss: '送料仕様', short: '送料仕様'},
  'checkout-spec.md': {gloss: '注文確定仕様', short: '注文確定仕様'},
  'estimate-spec.md': {gloss: '事前見積もり仕様', short: '見積もり仕様'},
});

export const EVIDENCE = Object.freeze({
  'stdlib-ast-adapter': {
    short: '独自AST',
    long: '独自の小さなアダプター（Python標準ライブラリ ast）が関数定義と呼び出しを読み取った関係。Graphify の抽出器（tree-sitter）ではありません。',
    where: 'run.py 16〜24行目',
  },
  'human-authored-correspondence': {
    short: '手動',
    long: '人が書いた対応表（どの仕様書がどの関数の説明か）。自動抽出でもLLMの推定でもありません。',
    where: 'run.py 25〜27行目',
  },
});

export const RELATION_TEXT = Object.freeze({calls: '呼び出し', references: '参照（手動の対応）'});

// 2つの配置。tall は縦長（スマートフォン・縦動画）、wide は横長。
// 列や段の並びは同じ：仕様書 → 関数 → 起点 → 送料仕様。
export const LAYOUTS = Object.freeze({
  tall: {
    width: 360,
    height: 540,
    box: {w: 158, h: 58},
    pos: {
      'checkout-spec.md': [92, 62],
      'estimate-spec.md': [268, 62],
      checkout_total: [92, 212],
      delivery_estimate: [268, 212],
      shipping_fee: [180, 352],
      'shipping-policy.md': [180, 486],
    },
  },
  wide: {
    width: 760,
    height: 400,
    box: {w: 164, h: 60},
    pos: {
      'checkout-spec.md': [96, 100],
      'estimate-spec.md': [96, 300],
      checkout_total: [290, 100],
      delivery_estimate: [290, 300],
      shipping_fee: [486, 200],
      'shipping-policy.md': [672, 200],
    },
  },
});

async function json(url) {
  const response = await fetch(url, {cache: 'no-store'});
  if (!response.ok) throw new Error(`${url} を読めません（${response.status}）`);
  return response.json();
}

// 保存結果の形と数が、この作例の説明と一致するかを確かめる。合わなければ描かない。
export function check(result, graph) {
  const problems = [];
  if (result.status !== 'passed') problems.push('result.json の status が passed ではない');
  if (result.seed !== EXPECTED.seed) problems.push('起点が shipping_fee ではない');
  if (result.depth !== EXPECTED.depth) problems.push('深さが3ではない');
  if (result.upstream_commit !== SOURCE.commit) problems.push('上流のコミットが違う');
  if (!Array.isArray(graph.nodes) || graph.nodes.length !== EXPECTED.nodes) problems.push('graph.json のノード数が6ではない');
  if (!Array.isArray(graph.edges) || graph.edges.length !== EXPECTED.edges) problems.push('graph.json のエッジ数が5ではない');
  if (result.node_count !== EXPECTED.nodes || result.edge_count !== EXPECTED.edges) problems.push('result.json の数がグラフと合わない');
  if (!Array.isArray(result.hits) || result.hits.length !== EXPECTED.hits) problems.push('影響ノードが5件ではない');
  const ids = new Set((graph.nodes || []).map((node) => node.id));
  for (const id of Object.keys(NODE_TEXT)) if (!ids.has(id)) problems.push(`ノード ${id} がない`);
  for (const hit of result.hits || []) if (!ids.has(hit.node_id)) problems.push(`影響ノード ${hit.node_id} がグラフにない`);
  if (problems.length) throw new Error(problems.join('／'));
}

export async function loadSaved(base = '.') {
  const [result, graph] = await Promise.all([json(`${base}/outputs/result.json`), json(`${base}/outputs/graph.json`)]);
  check(result, graph);
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  const hits = new Map(result.hits.map((hit) => [hit.node_id, hit]));
  return {result, graph, nodes, hits};
}

// 箱の縁で止まる線の端点（中心から中心への線を、箱の外形で切る）
export function edgePoints(from, to, box) {
  const [x1, y1] = from;
  const [x2, y2] = to;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const cut = (sx, sy) => {
    const tx = sx ? box.w / 2 / Math.abs(sx) : Infinity;
    const ty = sy ? box.h / 2 / Math.abs(sy) : Infinity;
    return Math.min(tx, ty);
  };
  const a = cut(dx, dy);
  const b = cut(-dx, -dy);
  return [[x1 + dx * a, y1 + dy * a], [x2 - dx * b, y2 - dy * b]];
}
