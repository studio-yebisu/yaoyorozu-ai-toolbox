// 八百万図AIツールボックス — Dify 作例ページ（図で読む版）。MIT License, Copyright (c) 2026 Studio Yebisu.
// 保存した実行記録を読むだけのページ。分岐をブラウザーで計算し直さず、記録の値（route の判定結果・通った線・
// 実際のメモ）を1枚の図に描く。データはすべて textContent と SVG の文字で書き、HTML として解釈しない。
// 図・ページ・このコードは Claude Opus 5.5 が書いた。記録の値は graphon のエンジンが返したもの。
"use strict";

(() => {
  const EXPECTED = {
    format: "studio-yebisu-dify-run-v1",
    recordSha256: "692cc2f8b07ca77a8b3ccdae0a8abc4359e8a8804985bc4b75db1b56241e6694",
    repository: "langgenius/dify",
    commit: "f77facfe6520ed379d723288aed0b4806ad76143",
    version: "1.17.1",
    graphonName: "graphon",
    graphonVersion: "0.7.0",
    wheelSha256: "6f7608aaaa65607c4935735137ed4b7029b1e6ca80202cbe829af3370cf4404e",
    lockSha256: "e454e2189985857c0ac82258dc23b01f0010deecc1cc7bf737ff214d685696ff",
    lockFileCount: 292,
    inputSha256: {
      "input/tickets.json": "b752f26d73d9fc3f48f8a3389fe876b88d273f2780bc316fdd15232a4d0cdc83",
      "input/expected.json": "0ef127da5302698a91ad9ceb1e7dcbd79863c037057fe07e514428213946b5be",
    },
    checks: 196,
    events: 160,
    counts: { urgent: 3, billing: 1, false: 4 },
    ids: ["D01", "D02", "D03", "D04", "D05", "D06", "D07", "D08"],
    nodes: ["start", "route", "urgent-note", "billing-note", "support-note", "merge", "end"],
    nodeTypes: ["start", "if-else", "template-transform", "template-transform", "template-transform", "variable-aggregator", "end"],
    edges: [
      ["start", "route", "source"],
      ["route", "urgent-note", "urgent"],
      ["route", "billing-note", "billing"],
      ["route", "support-note", "false"],
      ["urgent-note", "merge", "source"],
      ["billing-note", "merge", "source"],
      ["support-note", "merge", "source"],
      ["merge", "end", "source"],
    ],
    defaultId: "D02",
  };
  const FILES = {
    record: "outputs/workflow-runs.json",
    tickets: "input/tickets.json",
    expected: "input/expected.json",
    workflow: "workflow.yml",
    lock: "vendor-lock.json",
    request: "request.txt",
  };
  const ROUTES = ["urgent", "billing", "false"];
  const ROUTE_LABELS = { urgent: "優先対応", billing: "請求窓口", false: "通常窓口" };
  const MEMO_NODES = { urgent: "urgent-note", billing: "billing-note", false: "support-note" };
  const SLOT_OF = { urgent: 0, billing: 1, false: 2 };
  const RULE_LINES = [["至急", "100人以上"], ["請求"], ["ほか"]];
  // Pairs shown by the contextual comparison button. Other records offer the 99/100 pair.
  const PAIRS = { D02: "D06", D06: "D02", D04: "D05", D05: "D04" };
  const HEX64 = /^[0-9a-f]{64}$/;

  const $ = (id) => document.getElementById(id);
  const el = {
    status: $("status"),
    errorBox: $("error-box"),
    errorText: $("error-text"),
    retry: $("retry"),
    caseList: $("case-list"),
    figure: $("figure"),
    diagram: $("diagram"),
    diagramTitle: $("diagram-title"),
    diagramDesc: $("diagram-desc"),
    root: $("diagram-root"),
    compare: $("compare"),
    download: $("download-record"),
    caseTag: $("case-tag"),
    caption: $("caption-text"),
    actionStatus: $("action-status"),
    memoSummaryId: $("memo-summary-id"),
    memo: $("memo-text"),
    input: $("input-text"),
    output: $("output-text"),
    eventsCount: $("events-count"),
    events: $("events-text"),
    checksCount: $("checks-count"),
    checks: $("case-checks"),
    comparisonLink: $("comparison-link"),
    recordList: $("record-list"),
    dslFacts: $("dsl-facts"),
    downloadDsl: $("download-dsl"),
    dslStatus: $("dsl-status"),
    copy: $("copy-request"),
    copyStatus: $("copy-status"),
    copyFallback: $("copy-fallback"),
    copyFallbackText: $("copy-fallback-text"),
    runFacts: $("run-facts"),
    probes: $("probe-list"),
    topology: $("topology-text"),
  };
  for (const [name, node] of Object.entries(el)) {
    if (!node) throw new Error(`index.html に必要な要素がありません：${name}`);
  }
  const caseButtons = [...el.caseList.querySelectorAll("button[data-id]")];

  const state = {
    ready: false, loading: false, record: null, byId: new Map(), facts: new Map(), current: null,
    request: "", dslBytes: null, counts: null, animateNext: false, raf: 0,
  };

  class LoadError extends Error {}
  function fail(message) {
    throw new LoadError(message);
  }
  function check(condition, message) {
    if (!condition) fail(message);
  }

  const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

  function deepEqual(a, b) {
    if (a === b) return true;
    if (Array.isArray(a)) {
      return Array.isArray(b) && a.length === b.length && a.every((item, i) => deepEqual(item, b[i]));
    }
    if (isObject(a) && isObject(b)) {
      const keys = Object.keys(a);
      return keys.length === Object.keys(b).length && keys.every((key) => own(b, key) && deepEqual(a[key], b[key]));
    }
    return false;
  }

  async function sha256Hex(buffer) {
    if (!window.crypto || !window.crypto.subtle) {
      fail("このブラウザーでは SHA-256 の照合（Web Crypto）が使えないため、記録を確かめられません。https または localhost で開いてください。");
    }
    const digest = await window.crypto.subtle.digest("SHA-256", buffer);
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  async function fetchBytes(path) {
    let response;
    try {
      response = await fetch(path, { cache: "no-store" });
    } catch (error) {
      fail(window.location.protocol === "file:"
        ? "ファイルとして直接開いているため、記録を読み込めません。https か http://localhost で開いてください。"
        : `${path} を取得できませんでした。`);
    }
    if (!response.ok) fail(`${path} を取得できませんでした（HTTP ${response.status}）。`);
    const buffer = await response.arrayBuffer();
    let text;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    } catch (error) {
      fail(`${path} が UTF-8 として読めません。`);
    }
    return { buffer, text };
  }

  function parseJson(path, text) {
    try {
      return JSON.parse(text);
    } catch (error) {
      return fail(`${path} が JSON として読めません。`);
    }
  }

  // --- 照合 --------------------------------------------------------------------------------

  const edgeKey = (e) => `${e[0]}>${e[1]}>${e[2]}`;
  const pathEdges = (route) => [
    ["start", "route", "source"],
    ["route", MEMO_NODES[route], route],
    [MEMO_NODES[route], "merge", "source"],
    ["merge", "end", "source"],
  ];

  // The original DSL bytes are read as text; these fixed facts need no YAML parser.
  function dslFacts(text) {
    const src = text.replace(/\r\n/g, "\n");
    check(/^kind: app$/m.test(src) && /^version: 0\.3\.0$/m.test(src) && /^  mode: workflow$/m.test(src), "workflow.yml が kind: app・version 0.3.0・mode: workflow ではありません。");
    const edgesAt = src.indexOf("\n    edges:\n");
    const nodesAt = src.indexOf("\n    nodes:\n");
    const viewAt = src.indexOf("\n    viewport:\n");
    check(edgesAt > 0 && nodesAt > edgesAt && viewAt > nodesAt, "workflow.yml のグラフの区切りが読めません。");
    const edgePart = src.slice(edgesAt, nodesAt);
    const nodePart = src.slice(nodesAt, viewAt);
    const unquote = (v) => v.replace(/^'(.*)'$/, "$1");
    const edges = [...edgePart.matchAll(/^      source: (\S+)\n      sourceHandle: (\S+)\n      target: (\S+)$/gm)]
      .map((m) => [m[1], m[3], unquote(m[2])]);
    const nodes = [...nodePart.matchAll(/^      id: (\S+)$/gm)].map((m) => m[1]);
    const types = [...nodePart.matchAll(/^        type: (\S+)$/gm)].map((m) => m[1]);
    const cases = [...nodePart.matchAll(/^        - case_id: (\S+)$/gm)].map((m) => m[1]);
    check(deepEqual(nodes, EXPECTED.nodes) && deepEqual(types, EXPECTED.nodeTypes), "workflow.yml の7ノードの ID・種類が固定値と一致しません。");
    check(deepEqual(edges.map(edgeKey).sort(), EXPECTED.edges.map(edgeKey).sort()), "workflow.yml の8本の線が固定値と一致しません。");
    check(deepEqual(cases, ["urgent", "billing"]), "workflow.yml の判定の順が urgent → billing ではありません。");
    for (const needle of ["value: 至急", "comparison_operator: ≥", "value: '100'", "logical_operator: or", "value: 請求"]) {
      check(src.includes(needle), `workflow.yml に「${needle}」がありません。`);
    }
    return { nodes, edges };
  }

  // One record reduced to the values the diagram draws; each one is checked against the events.
  function readCase(item, route) {
    const id = item.id;
    const input = item.input;
    const output = item.output;
    const events = item.events;
    const last = events[events.length - 1];
    check(last.data?.outputs?.text === output.text && last.data.outputs.selected_case_id === route, `${id} の最終イベントが記録のメモ・分岐と一致しません。`);
    const succeeded = events.filter((e) => e.type === "NodeRunSucceededEvent").map((e) => e.data.node_id);
    check(deepEqual(succeeded, output.node_path), `${id} の成功したノードの順が記録と一致しません。`);
    const edgeOf = (e) => [e.data.source_node_id, e.data.target_node_id, e.data.source_handle];
    const taken = events.filter((e) => e.type === "GraphEdgeTakenEvent").map(edgeOf);
    const skipped = events.filter((e) => e.type === "GraphEdgeSkippedEvent").map(edgeOf);
    check(deepEqual(taken.map(edgeKey), pathEdges(route).map(edgeKey)), `${id} の通った線が記録の分岐と一致しません。`);
    const memoNode = events.find((e) => e.type === "NodeRunSucceededEvent" && e.data.node_id === MEMO_NODES[route]);
    check(memoNode?.data?.node_run_result?.outputs?.output === output.text, `${id} のメモが担当のノードの実際の出力と一致しません。`);
    const routeNode = events.find((e) => e.type === "NodeRunSucceededEvent" && e.data.node_id === "route")?.data?.node_run_result;
    check(routeNode?.outputs?.selected_case_id === route, `${id} の route の選択が記録と一致しません。`);
    const groups = (routeNode.process_data?.condition_results ?? []).map((g) => ({ id: g.group?.case_id, results: g.results, final: g.final_result }));
    const expectGroups = { urgent: [true], billing: [false, true], false: [false, false] }[route];
    check(groups.length === expectGroups.length && groups.every((g, i) => g.id === ["urgent", "billing"][i] && g.final === expectGroups[i]
      && Array.isArray(g.results) && g.results.length > 0 && g.results.every((r) => typeof r === "boolean")),
    `${id} の route の判定結果が上から順の記録になっていません。`);
    // Graphon keeps inputs.conditions for the LAST evaluated group. Earlier group values
    // come from the fixed original input and its recorded condition descriptor/results.
    const threshold = routeNode.process_data.condition_results[0].group.conditions.find((c) => c.comparison_operator === "≥");
    check(threshold?.value === "100" && deepEqual(threshold.variable_selector, ["start", "affected_users"]), `${id} の人数の条件が固定版と一致しません。`);
    const cmp = (routeNode.inputs?.conditions ?? []).find((c) => c.comparison_operator === "≥");
    if (cmp) check(cmp.actual_value === input.affected_users && cmp.expected_value === threshold.value, `${id} の人数の実入力が一致しません。`);
    const users = groups[0].results.length === 2 ? { actual: input.affected_users, expected: threshold.value, ok: groups[0].results[1] } : null;
    if (users) check(users.actual === input.affected_users && users.expected === "100", `${id} の人数の比較の値が記録と一致しません。`);
    const lines = output.text.split("\n");
    check(lines[0] === `【担当】${ROUTE_LABELS[route]}` && lines[1] === `問い合わせ：${input.ticket_id}` && lines[2] === `件名：${input.subject}`,
      `${id} のメモの1〜3行目が記録の形と合いません。`);
    return { id, route, groups, users, taken, skipped, head: lines[0], subjectLine: lines[2] };
  }

  function validate(files, hashes) {
    const { record, tickets, expected, lock } = files;
    if (hashes.record !== EXPECTED.recordSha256) fail("outputs/workflow-runs.json の SHA-256 が固定値と一致しません。");
    if (!isObject(record) || record.format !== EXPECTED.format) fail("実行記録の形式が違います。");

    const source = record.source || {};
    if (source.repository !== EXPECTED.repository || source.commit !== EXPECTED.commit || source.version !== EXPECTED.version) {
      fail("実行記録の Dify の固定版が一致しません。");
    }
    const dep = record.runtime_dependency || {};
    if (dep.name !== EXPECTED.graphonName || dep.version !== EXPECTED.graphonVersion || dep.wheel_sha256 !== EXPECTED.wheelSha256) {
      fail("実行記録の graphon の版または wheel の SHA-256 が一致しません。");
    }

    if (hashes.lock !== EXPECTED.lockSha256 || record.source_lock_sha256 !== EXPECTED.lockSha256) {
      fail("vendor-lock.json の SHA-256 が一致しません。");
    }
    const lockDep = isObject(lock) ? lock.runtime_dependency || {} : {};
    if (!isObject(lock) || lock.repository !== EXPECTED.repository || lock.commit !== EXPECTED.commit
      || lock.version !== EXPECTED.version || lockDep.version !== EXPECTED.graphonVersion
      || lockDep.wheel_sha256 !== EXPECTED.wheelSha256) {
      fail("vendor-lock.json の固定版が一致しません。");
    }
    if (!Array.isArray(lock.files) || lock.files.length !== EXPECTED.lockFileCount) {
      fail(`vendor-lock.json の対象が${EXPECTED.lockFileCount}ファイルではありません。`);
    }

    const inputHashes = record.input_sha256 || {};
    for (const [path, value] of Object.entries(EXPECTED.inputSha256)) {
      const actual = path === "input/tickets.json" ? hashes.tickets : hashes.expected;
      if (inputHashes[path] !== value || actual !== value) fail(`${path} の SHA-256 が一致しません。`);
    }
    if (!HEX64.test(inputHashes["workflow.yml"] || "") || inputHashes["workflow.yml"] !== hashes.workflow) {
      fail("workflow.yml の SHA-256 が実行記録と一致しません。");
    }

    const runtime = record.runtime || {};
    if (runtime.network_attempts !== 0 || runtime.process_attempts !== 0) {
      fail("実行中の通信または子プロセスの試みが0件ではありません。");
    }
    if (runtime.server_started !== false || runtime.llm_called !== false) {
      fail("実行記録が、サーバーやモデルを使っていない実行であることを示していません。");
    }

    const checks = record.checks || {};
    if (checks.passed !== true || !Array.isArray(checks.items) || checks.items.length !== EXPECTED.checks || checks.count !== checks.items.length) {
      fail(`実行記録の${EXPECTED.checks}の自動確認が合格になっていません。`);
    }

    if (!isObject(tickets) || tickets.fictional !== true || !Array.isArray(tickets.cases)) fail("input/tickets.json の形が違います。");
    const oracle = isObject(expected) ? expected.selected_case_ids : null;
    if (!isObject(oracle)) fail("input/expected.json の形が違います。");
    const ticketIds = tickets.cases.map((c) => c && c.id);
    if (!deepEqual(ticketIds, EXPECTED.ids) || !deepEqual(Object.keys(oracle), EXPECTED.ids)) {
      fail("入力の問い合わせが D01〜D08 の8件ではありません。");
    }

    const cases = record.cases;
    if (!Array.isArray(cases) || !deepEqual(cases.map((c) => c && c.id), EXPECTED.ids) || new Set(cases.map((c) => c.id)).size !== EXPECTED.ids.length) {
      fail("実行記録の問い合わせが D01〜D08 の8件ではありません。");
    }
    const facts = [];
    let eventTotal = 0;
    cases.forEach((item, index) => {
      const ticket = tickets.cases[index];
      const output = item.output || {};
      const route = output.selected_case_id;
      const path = output.node_path;
      if (!deepEqual(item.input, ticket.input) || item.label !== ticket.label) {
        fail(`${item.id} の入力が input/tickets.json と一致しません。`);
      }
      if (route !== oracle[item.id] || !own(ROUTE_LABELS, route)) {
        fail(`${item.id} の分岐が input/expected.json と一致しません。`);
      }
      if (typeof output.text !== "string" || !Array.isArray(path)
        || !deepEqual(path, ["start", "route", MEMO_NODES[route], "merge", "end"])) {
        fail(`${item.id} の出力または通った順が記録の形と合いません。`);
      }
      if (!Array.isArray(item.events) || item.events.length === 0 || item.events[0].type !== "GraphRunStartedEvent"
        || item.events[item.events.length - 1].type !== "GraphRunSucceededEvent") {
        fail(`${item.id} のイベントが成功で終わっていません。`);
      }
      if (!Array.isArray(item.checks) || item.checks.length === 0) fail(`${item.id} の確認がありません。`);
      eventTotal += item.events.length;
      facts.push(readCase(item, route));
    });
    if (eventTotal !== EXPECTED.events) fail(`実行記録のイベントが合計${EXPECTED.events}件ではありません。`);
    const counts = Object.fromEntries(ROUTES.map((r) => [r, facts.filter((f) => f.route === r).length]));
    if (!deepEqual(counts, EXPECTED.counts)) fail("担当ごとの件数が 優先対応3・請求窓口1・通常窓口4 ではありません。");

    const dsl = dslFacts(files.workflowText);
    const seen = new Set(facts.flatMap((f) => [...f.taken, ...f.skipped].map(edgeKey)));
    if (!deepEqual([...seen].sort(), dsl.edges.map(edgeKey).sort())) fail("実行イベントの線が workflow.yml の8本と一致しません。");
    return { facts, counts, dsl };
  }

  // --- 図（SVG） -----------------------------------------------------------------------------

  const NS = "http://www.w3.org/2000/svg";
  const COLOR = {
    paper: "#fffcf5", ivory: "#f6f1e6", ink: "#1c2333", muted: "#5d6475", line: "#cbbfa6", rail: "#ddd3bf",
    accent: "#c8641e", accentSoft: "#fbe3cc", accentInk: "#9a4712", reject: "#9e3324",
    urgent: { main: "#2747c2", soft: "#e3e8fb" },
    billing: { main: "#0f7a72", soft: "#dbefec" },
    false: { main: "#86590f", soft: "#f3e8d2" },
  };
  // One geometry for every record: the same 7 nodes and 8 lines, top to bottom.
  const SLOTS = [{ x: 15, y: 135, w: 136, h: 106 }, { x: 157, y: 135, w: 91, h: 106 }, { x: 254, y: 135, w: 91, h: 106 }];
  const CX = SLOTS.map((s) => s.x + s.w / 2);
  const LANE_Y = 117;
  const G = {
    home: { x: 20, y: 2, w: 320, h: 85 },
    frame: { x: 10, y: 96, w: 340, h: 150 },
    lane: CX.map((x) => [x, LANE_Y]),
    slots: SLOTS,
    desks: SLOTS.map((s) => ({ x: s.x, y: 270, w: s.w, h: 82 })),
    merge: { x: 180, y: 381, r: 9 },
    memo: { x: 24, y: 405, w: 312, h: 78 },
    token: { w: 52, h: 30 },
    edges: {
      "start>route": [[CX[0], 87], [CX[0], LANE_Y]],
      "route>urgent-note": [[CX[0], 241], [CX[0], 270]],
      "route>billing-note": [[CX[1], 241], [CX[1], 270]],
      "route>support-note": [[CX[2], 241], [CX[2], 270]],
      "urgent-note>merge": [[CX[0], 352], [CX[0], 364], [180, 364], [180, 372]],
      "billing-note>merge": [[CX[1], 352], [CX[1], 364], [180, 364], [180, 372]],
      "support-note>merge": [[CX[2], 352], [CX[2], 364], [180, 364], [180, 372]],
      "merge>end": [[180, 390], [180, 405]],
    },
  };

  function svg(tag, attrs = {}, parent = null) {
    const node = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
    if (parent) parent.append(node);
    return node;
  }

  function label(parent, x, y, str, attrs = {}) {
    const node = svg("text", { x, y, ...attrs }, parent);
    node.textContent = str;
    return node;
  }

  // Text widths are estimated (CJK ≈ 1em, ASCII ≈ 0.58em) so the figure never depends on layout timing.
  const estWidth = (str, size) => Array.from(str).reduce((w, ch) => w + (ch.charCodeAt(0) < 0x2000 ? 0.58 : 1) * size, 0);
  const pointsOf = (poly) => poly.map((p) => p.join(",")).join(" ");

  function line(parent, poly, color, width, { dash = null, opacity = 1, arrow = true } = {}) {
    svg("polyline", {
      points: pointsOf(poly), fill: "none", stroke: color, "stroke-width": width, "stroke-linecap": "round",
      "stroke-linejoin": "round", opacity, ...(dash ? { "stroke-dasharray": dash } : {}),
    }, parent);
    if (!arrow) return;
    const [a, b] = poly.slice(-2);
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const k = Math.max(4.5, width * 1.8);
    const pts = [b, [b[0] - Math.cos(ang - 0.5) * k, b[1] - Math.sin(ang - 0.5) * k], [b[0] - Math.cos(ang + 0.5) * k, b[1] - Math.sin(ang + 0.5) * k]];
    svg("polygon", { points: pointsOf(pts), fill: color, opacity }, parent);
  }

  function markIcon(parent, cx, cy, r, ok, color) {
    svg("circle", { cx, cy, r, fill: ok ? color : COLOR.reject }, parent);
    const d = ok
      ? `M${cx - r * 0.45} ${cy} L${cx - r * 0.1} ${cy + r * 0.38} L${cx + r * 0.5} ${cy - r * 0.38}`
      : `M${cx - r * 0.4} ${cy - r * 0.4} L${cx + r * 0.4} ${cy + r * 0.4} M${cx + r * 0.4} ${cy - r * 0.4} L${cx - r * 0.4} ${cy + r * 0.4}`;
    svg("path", { d, fill: "none", stroke: COLOR.paper, "stroke-width": r * 0.24, "stroke-linecap": "round", "stroke-linejoin": "round" }, parent);
  }

  function icon(parent, kind, x, y, s, color) {
    const g = svg("g", { transform: `translate(${x} ${y}) scale(${s})` }, parent);
    if (kind === "bill") {
      svg("path", { d: "M0.13 0 H0.62 L0.87 0.26 V1 H0.13 Z M0.29 0.46 H0.71 M0.29 0.64 H0.71 M0.29 0.82 H0.71", fill: "none", stroke: color, "stroke-width": 1.6, "vector-effect": "non-scaling-stroke", "stroke-linejoin": "round", "stroke-linecap": "round" }, g);
    } else if (kind === "bolt") {
      svg("polygon", { points: "0.58,0 0.16,0.58 0.46,0.58 0.36,1 0.86,0.38 0.56,0.38 0.68,0", fill: color }, g);
    } else {
      svg("circle", { cx: 0.34, cy: 0.28, r: 0.16, fill: color }, g);
      svg("circle", { cx: 0.7, cy: 0.33, r: 0.13, fill: color }, g);
      svg("path", { d: "M0.07 0.92 A0.27 0.3 0 0 1 0.61 0.92 Z M0.48 0.92 A0.22 0.3 0 0 1 0.92 0.92 Z", fill: color }, g);
    }
  }

  function pillTag(parent, x, cy, str, size, { fill, color, align = "left", stroke = null, mono = false }) {
    const pad = size * 0.5, h = size * 1.5;
    const w = estWidth(str, size) + pad * 2;
    const left = align === "right" ? x - w : align === "center" ? x - w / 2 : x;
    svg("rect", { x: left, y: cy - h / 2, width: w, height: h, rx: h / 2, fill, ...(stroke ? { stroke, "stroke-width": 1 } : {}) }, parent);
    label(parent, left + pad, cy + size * 0.36, str, { "font-size": size, fill: color, ...(mono ? { class: "mono" } : {}) });
    return w;
  }

  function literalOf(input) {
    return input.subject.match(/^\{\{[^}]*\}\}/)?.[0] ?? null;
  }

  function drawDiagram(item, fact, partner) {
    stopAnimation();
    const route = fact.route;
    const sel = SLOT_OF[route];
    const col = COLOR[route];
    el.root.replaceChildren();
    const layer = (name) => svg("g", { "data-layer": name }, el.root);
    const base = layer("base"), trail = layer("trail"), under = layer("under"), nodes = layer("nodes");
    const envelope = layer("envelope"), memo = layer("memo"), over = layer("over");

    // Route switch frame and the lane where the envelope waits while rules are read in order.
    svg("rect", { x: G.frame.x, y: G.frame.y, width: G.frame.w, height: G.frame.h, rx: 11, fill: COLOR.paper, stroke: COLOR.ink, "stroke-width": 1.5 }, base);
    line(base, [G.lane[0], G.lane[2]], COLOR.rail, 2, { dash: "5 6", arrow: false });
    for (const poly of Object.values(G.edges)) line(base, poly, COLOR.line, 2.2);

    // The other record of the pair, drawn as a dashed earlier path.
    if (partner) {
      const node = MEMO_NODES[partner.fact.route];
      for (const key of [`route>${node}`, `${node}>merge`]) line(trail, G.edges[key], COLOR[partner.fact.route].main, 2.6, { dash: "4 4", opacity: 0.6 });
    }
    // The actual edges this record took (GraphEdgeTakenEvent).
    const node = MEMO_NODES[route];
    line(trail, G.edges["start>route"], COLOR.accent, 4);
    for (const key of [`route>${node}`, `${node}>merge`, "merge>end"]) line(trail, G.edges[key], col.main, 4);

    // Ordered rules inside the one switch, with the recorded condition results.
    G.slots.forEach((r, i) => {
      const g = svg("g", { opacity: i > sel ? 0.42 : 1 }, nodes);
      const lit = i === sel;
      svg("rect", { x: r.x, y: r.y, width: r.w, height: r.h, rx: 8, fill: lit ? COLOR[ROUTES[i]].soft : COLOR.paper, stroke: lit ? COLOR[ROUTES[i]].main : COLOR.ink, "stroke-width": lit ? 3 : 1 }, g);
      svg("circle", { cx: r.x + 15, cy: r.y + 17, r: 10, fill: COLOR.ink }, g);
      label(g, r.x + 15, r.y + 21.3, String(i + 1), { "font-size": 12, fill: COLOR.paper, "text-anchor": "middle" });
      const ys = i === 0 ? [52, 78] : [66];
      RULE_LINES[i].forEach((ln, k) => label(g, r.x + 10, r.y + ys[k], ln, { "font-size": 20, fill: COLOR.ink }));
      const evaluated = i < 2 ? fact.groups[i] : (route === "false" ? { final: true, results: [] } : null);
      if (evaluated) markIcon(g, r.x + r.w - 15, r.y + 17, 10, evaluated.final, COLOR[ROUTES[i]].main);
      if (i === 0) {
        fact.groups[0].results.forEach((res, k) => {
          const y = r.y + ys[k];
          const w = estWidth(RULE_LINES[0][k], 20);
          svg("line", { x1: r.x + 9, x2: r.x + 11 + w, y1: res ? y + 5 : y - 7, y2: res ? y + 5 : y - 7, stroke: res ? COLOR.urgent.main : COLOR.muted, "stroke-width": res ? 3 : 1.6, "stroke-linecap": "round" }, g);
        });
        if (fact.users) {
          const t = label(g, r.x + 10, r.y + 98, "", { "font-size": 13 });
          const a = svg("tspan", { fill: COLOR.ink }, t);
          a.textContent = `${fact.users.actual}人 `;
          const b = svg("tspan", { fill: fact.users.ok ? COLOR.urgent.main : COLOR.reject }, t);
          b.textContent = `${fact.users.ok ? "≥" : "＜"} ${fact.users.expected}人`;
        }
      }
      if (i > sel) label(g, r.x + r.w - 8, r.y + r.h - 8, "判定なし", { "font-size": 11, fill: COLOR.muted, "text-anchor": "end" });
    });

    // Owner desks: the person and the desk colour; small actual counts from the 8 records.
    G.desks.forEach((r, i) => {
      const rt = ROUTES[i];
      const c = COLOR[rt];
      const lit = i === sel;
      const cx = r.x + r.w / 2;
      svg("rect", { x: r.x, y: r.y, width: r.w, height: r.h, rx: 9, fill: lit ? c.soft : COLOR.paper, stroke: c.main, "stroke-width": lit ? 3.5 : 1.5 }, nodes);
      const figure = rt === "false" ? COLOR.ink : c.main;
      svg("circle", { cx, cy: r.y + 19, r: 9, fill: figure }, nodes);
      svg("path", { d: `M${cx - 16} ${r.y + 44} A16 13 0 0 1 ${cx + 16} ${r.y + 44} Z`, fill: figure }, nodes);
      svg("rect", { x: r.x + 8, y: r.y + 45, width: r.w - 16, height: 6, rx: 3, fill: c.main }, nodes);
      label(nodes, cx, r.y + 72, ROUTE_LABELS[rt], { "font-size": 20, fill: c.main, "text-anchor": "middle" });
      pillTag(nodes, r.x + r.w - 6, r.y, `${state.counts[rt]}件`, 11, { fill: c.main, color: COLOR.paper, align: "right" });
    });
    if (partner) {
      const r = G.desks[SLOT_OF[partner.fact.route]];
      pillTag(nodes, r.x + 6, r.y, partner.item.id, 11, { fill: COLOR.paper, color: COLOR[partner.fact.route].main, stroke: COLOR[partner.fact.route].main });
    }
    svg("circle", { cx: G.merge.x, cy: G.merge.y, r: G.merge.r, fill: COLOR.paper, stroke: COLOR.ink, "stroke-width": 2 }, nodes);
    svg("path", { d: `M${G.merge.x - 4} ${G.merge.y} H${G.merge.x + 4} M${G.merge.x} ${G.merge.y - 4} V${G.merge.y + 4}`, stroke: COLOR.ink, "stroke-width": 2, "stroke-linecap": "round" }, nodes);
    label(nodes, G.merge.x + 15, G.merge.y + 4, "まとめる", { "font-size": 12, fill: COLOR.muted });

    // The envelope: this record's three routing values.
    const h = G.home;
    svg("rect", { x: h.x, y: h.y, width: h.w, height: h.h, rx: 9, fill: COLOR.paper, stroke: COLOR.ink, "stroke-width": 1.5 }, envelope);
    svg("polyline", { points: `${h.x + 2},${h.y + 1.5} ${h.x + h.w / 2},${h.y + 21} ${h.x + h.w - 2},${h.y + 1.5}`, fill: "none", stroke: COLOR.ink, "stroke-width": 1.2, "stroke-linejoin": "round" }, envelope);
    label(envelope, h.x + 12, h.y + 37, item.id, { "font-size": 17, fill: COLOR.ink });
    label(envelope, h.x + 12 + estWidth(item.id, 17) + 8, h.y + 37, item.input.ticket_id, { "font-size": 14, fill: COLOR.muted });
    const values = [item.input.issue, item.input.urgency, `${item.input.affected_users}人`];
    ["bill", "bolt", "people"].forEach((kind, i) => {
      const sx = h.x + 12 + i * 102, sy = h.y + 46;
      svg("rect", { x: sx, y: sy, width: 94, height: 33, rx: 6, fill: COLOR.ivory, stroke: COLOR.ink, "stroke-width": 1 }, envelope);
      icon(envelope, kind, sx + 6, sy + 7, 19, COLOR.ink);
      label(envelope, sx + 31, sy + 23, values[i], { "font-size": 18, fill: COLOR.ink });
    });
    const literal = literalOf(item.input);
    if (literal) pillTag(envelope, h.x + h.w - 12, h.y + 31, literal, 13, { fill: COLOR.accentSoft, color: COLOR.ink, stroke: COLOR.accent, align: "right", mono: true });

    // The actual memo returned at the end node.
    const m = G.memo;
    const card = svg("g", { "data-memo": "1" }, memo);
    svg("rect", { x: m.x, y: m.y, width: m.w, height: m.h, rx: 9, fill: COLOR.paper, stroke: COLOR.ink, "stroke-width": 1.5 }, card);
    svg("rect", { x: m.x + 8, y: m.y, width: m.w - 16, height: 5, rx: 2.5, fill: col.main }, card);
    label(card, m.x + 12, m.y + 29, fact.head, { "font-size": 20, fill: col.main });
    const subject = label(card, m.x + 12, m.y + 52, "", { "font-size": 15, fill: COLOR.ink });
    if (literal) {
      const pre = svg("tspan", {}, subject);
      pre.textContent = "件名：";
      const lit = svg("tspan", { class: "mono", fill: COLOR.accentInk }, subject);
      lit.textContent = literal;
      const rest = svg("tspan", {}, subject);
      rest.textContent = item.input.subject.slice(literal.length);
      pillTag(card, m.x + m.w - 10, m.y + 24, "文字のまま", 11, { fill: COLOR.accentSoft, color: COLOR.accentInk, align: "right" });
    } else {
      subject.textContent = fact.subjectLine;
    }
    const bw = pillTag(card, m.x + 12, m.y + 66, "実際のメモ", 11, { fill: COLOR.ink, color: COLOR.paper });
    label(card, m.x + 12 + bw + 7, m.y + 70, `${item.id} ・ ${item.input.ticket_id}`, { "font-size": 12, fill: COLOR.ink });

    // Travelling envelope used only when the reader presses a button.
    const token = svg("g", { "data-token": "1", display: "none" }, over);
    svg("rect", { x: 0, y: 0, width: G.token.w, height: G.token.h, rx: 5, fill: COLOR.paper, stroke: COLOR.ink, "stroke-width": 1.5 }, token);
    svg("polyline", { points: `2,1.5 ${G.token.w / 2},${G.token.h * 0.42} ${G.token.w - 2},1.5`, fill: "none", stroke: COLOR.ink, "stroke-width": 1.2 }, token);
    svg("rect", { x: 0, y: G.token.h - 5, width: G.token.w, height: 5, rx: 2, fill: COLOR.accent, "data-stripe": "1" }, token);
    label(token, G.token.w / 2, G.token.h * 0.78, item.id, { "font-size": 10, fill: COLOR.ink, "text-anchor": "middle" });
    return { under, over, token, card, route, sel };
  }

  // --- 封筒の動き（押したときだけ） -----------------------------------------------------------

  const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
  const reducedMotion = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function pointAlong(poly, p) {
    const lens = poly.slice(1).map((pt, i) => Math.hypot(pt[0] - poly[i][0], pt[1] - poly[i][1]));
    let target = lens.reduce((a, b) => a + b, 0) * Math.max(0, Math.min(1, p));
    for (let i = 0; i < lens.length; i += 1) {
      if (target <= lens[i] || i === lens.length - 1) {
        const q = lens[i] === 0 ? 1 : Math.min(1, target / lens[i]);
        return [poly[i][0] + (poly[i + 1][0] - poly[i][0]) * q, poly[i][1] + (poly[i + 1][1] - poly[i][1]) * q];
      }
      target -= lens[i];
    }
    return poly[poly.length - 1];
  }

  function stopAnimation() {
    if (state.raf) cancelAnimationFrame(state.raf);
    state.raf = 0;
  }

  function animate(drawn, fact) {
    if (reducedMotion()) return;
    const node = MEMO_NODES[fact.route];
    const visited = fact.groups.map((_, i) => i);
    if (fact.route === "false") visited.push(2);
    const re = G.edges[`route>${node}`], de = G.edges[`${node}>merge`], me = G.edges["merge>end"];
    const segs = [{ poly: G.edges["start>route"], dur: 260 }];
    visited.forEach((slot, k) => {
      if (k > 0) segs.push({ poly: [G.lane[visited[k - 1]], G.lane[slot]], dur: 200 });
      segs.push({ poly: [G.lane[slot], G.lane[slot]], dur: 180 });
    });
    segs.push({ poly: [G.lane[drawn.sel], re[0]], dur: 200, under: true });
    segs.push({ poly: re, dur: 160 });
    segs.push({ poly: [re[re.length - 1], de[0]], dur: 220, under: true, tint: true });
    segs.push({ poly: [...de, me[0]], dur: 300, tint: true });
    segs.push({ poly: me, dur: 160, tint: true });
    const total = segs.reduce((n, s) => n + s.dur, 0);
    const unfold = 260;
    const stripe = drawn.token.querySelector("[data-stripe]");
    const m = G.memo;
    const cx = m.x + m.w / 2, cy = m.y;
    drawn.card.setAttribute("opacity", "0");
    drawn.token.setAttribute("display", "inline");
    const begin = performance.now();
    const step = (now) => {
      const elapsed = now - begin;
      if (elapsed < total) {
        let acc = 0;
        let seg = segs[segs.length - 1];
        let p = 1;
        for (const s of segs) {
          if (elapsed < acc + s.dur) { seg = s; p = (elapsed - acc) / s.dur; break; }
          acc += s.dur;
        }
        const [x, y] = pointAlong(seg.poly, ease(p));
        drawn.token.setAttribute("transform", `translate(${x - G.token.w / 2} ${y - G.token.h / 2})`);
        stripe.setAttribute("fill", seg.tint ? COLOR[fact.route].main : COLOR.accent);
        const parent = seg.under ? drawn.under : drawn.over;
        if (drawn.token.parentNode !== parent) parent.append(drawn.token);
      } else {
        drawn.token.setAttribute("display", "none");
        const k = Math.min(1, (elapsed - total) / unfold);
        const s = 0.25 + 0.75 * ease(k);
        drawn.card.setAttribute("opacity", String(ease(k)));
        drawn.card.setAttribute("transform", `translate(${cx} ${cy}) scale(${s} ${s}) translate(${-cx} ${-cy})`);
        if (k >= 1) {
          drawn.card.removeAttribute("transform");
          drawn.card.setAttribute("opacity", "1");
          state.raf = 0;
          return;
        }
      }
      state.raf = requestAnimationFrame(step);
    };
    state.raf = requestAnimationFrame(step);
  }

  // --- 表示 --------------------------------------------------------------------------------

  function setStatus(kind, message) {
    el.status.dataset.state = kind;
    el.status.textContent = message;
  }

  function setControls(enabled) {
    for (const b of [...caseButtons, el.compare, el.download, el.downloadDsl, el.copy]) b.disabled = !enabled;
    for (const a of el.recordList.querySelectorAll("a")) a.setAttribute("aria-disabled", String(!enabled));
  }

  function clearResult() {
    stopAnimation();
    el.figure.hidden = true;
    el.root.replaceChildren();
    for (const node of [el.diagramTitle, el.diagramDesc, el.caseTag, el.caption, el.actionStatus, el.memo, el.input, el.output,
      el.events, el.topology, el.dslFacts, el.dslStatus, el.copyStatus]) {
      node.textContent = "";
    }
    el.memoSummaryId.textContent = "—";
    el.eventsCount.textContent = "0";
    el.checksCount.textContent = "0";
    el.checks.replaceChildren();
    el.recordList.replaceChildren();
    el.runFacts.replaceChildren();
    el.probes.replaceChildren();
    el.compare.textContent = "比べる";
    el.comparisonLink.href = "comparison.html";
    el.comparisonLink.textContent = "表形式の前の版で見る（comparison.html）";
    el.copyFallback.hidden = true;
    el.copyFallbackText.value = "";
    for (const b of caseButtons) b.setAttribute("aria-pressed", "false");
  }

  function textItem(tag, text) {
    const node = document.createElement(tag);
    node.textContent = text;
    return node;
  }

  function addFact(label, value) {
    const row = document.createElement("div");
    row.className = "kv-row";
    row.append(textItem("dt", label), textItem("dd", value));
    el.runFacts.append(row);
  }

  function renderStatic(record, dsl) {
    const runtime = record.runtime || {};
    addFact("Dify の固定版", `${record.source.repository} ${record.source.commit}（${record.source.version}）`);
    addFact("実行に使った依存", `${record.runtime_dependency.name} ${record.runtime_dependency.version}（wheel SHA-256 ${record.runtime_dependency.wheel_sha256}）`);
    addFact("実行記録の SHA-256", EXPECTED.recordSha256);
    addFact("vendor-lock.json の SHA-256", `${record.source_lock_sha256}（${EXPECTED.lockFileCount}ファイル）`);
    for (const [path, value] of Object.entries(record.input_sha256)) addFact(`${path} の SHA-256`, value);
    addFact("Python・環境", `${runtime.python || ""} ${runtime.implementation || ""} / ${runtime.platform || ""}`);
    if (Array.isArray(runtime.api_entrypoints)) {
      addFact("呼び出した API と置き場所", runtime.api_entrypoints.map((e) => `${e.name} — ${e.source}`).join("\n"));
    }
    addFact("通信・子プロセスの試み", `通信 ${runtime.network_attempts}件・子プロセス ${runtime.process_attempts}件`);
    addFact("通信の拒否の範囲", runtime.network_guard_scope || "");
    addFact("サーバー・モデル", `サーバーの起動 ${runtime.server_started ? "あり" : "なし"}・LLM の呼び出し ${runtime.llm_called ? "あり" : "なし"}`);
    addFact("確認の合計", `${record.checks.count}件すべて合格・イベント合計${EXPECTED.events}件`);
    addFact("担当ごとの件数", ROUTES.map((r) => `${ROUTE_LABELS[r]} ${state.counts[r]}件`).join("・"));

    for (const probe of Array.isArray(record.dsl_probes) ? record.dsl_probes : []) {
      const error = probe.error || {};
      el.probes.append(textItem("li", `${probe.id}：${probe.input_description} → ${error.name}（${error.code}）「${error.message}」`));
    }
    el.topology.textContent = JSON.stringify(record.topology, null, 2);
    el.dslFacts.textContent = `元のバイト列のまま保存できます。${dsl.nodes.length}ノード・${dsl.edges.length}本の線で、8件の実行イベントに現れた線の集合と一致することを確かめました。`;

    for (const item of record.cases) {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = `#${item.id}`;
      a.dataset.id = item.id;
      const id = textItem("span", item.id);
      id.className = "case-id";
      a.append(id, `${item.label}（${ROUTE_LABELS[item.output.selected_case_id]}）`);
      li.append(a);
      el.recordList.append(li);
    }
  }

  function routingDiff(a, b) {
    const names = { issue: "種類", urgency: "緊急度", affected_users: "人数" };
    return Object.keys(names).filter((k) => a.input[k] !== b.input[k]).map((k) => names[k]);
  }

  function captionFor(item, fact) {
    const route = fact.route;
    const head = `${item.input.ticket_id}：`;
    let body;
    if (route === "urgent") {
      body = fact.groups[0].results[0]
        ? "ルール1の「至急」に一致。"
        : `影響${item.input.affected_users}人がルール1の「100人以上」に一致。`;
      if (item.input.issue === "請求") body += "種類は請求でも、ルール2は判定されていません。";
    } else if (route === "billing") {
      body = "ルール1は不一致、ルール2の「請求」に一致。";
    } else {
      body = "ルール1・2とも不一致で「ほか」。";
    }
    body += `${ROUTE_LABELS[route]}のメモになりました。`;
    if (literalOf(item.input) || /[<>]/.test(item.input.body)) body += "件名・本文の記号は文字のまま入りました。";
    if (item.input.body === "") body += "本文が空でもメモができました。";
    const pairId = PAIRS[item.id];
    if (pairId) {
      const other = state.byId.get(pairId);
      const diff = routingDiff(item, other);
      body += ` ${pairId}とは件名・本文も違う別の記録で、担当を決める3項目のうち違うのは${diff.join("と")}${diff.length === 1 ? "だけ" : ""}です。`;
    }
    return head + body;
  }

  function render(id) {
    const item = state.byId.get(id);
    const fact = state.facts.get(id);
    if (!item || !fact) return;
    state.current = id;
    const animateNow = state.animateNext;
    state.animateNext = false;

    for (const b of caseButtons) b.setAttribute("aria-pressed", String(b.dataset.id === id));
    for (const a of el.recordList.querySelectorAll("a")) {
      if (a.dataset.id === id) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    }

    const pairId = PAIRS[id];
    const partner = pairId ? { item: state.byId.get(pairId), fact: state.facts.get(pairId) } : null;
    const drawn = drawDiagram(item, fact, partner);
    el.diagramTitle.textContent = `${item.id}（${item.input.ticket_id}）は${ROUTE_LABELS[fact.route]}へ`;
    el.diagramDesc.textContent = `封筒の値は 種類 ${item.input.issue}・緊急度 ${item.input.urgency}・影響${item.input.affected_users}人。上から順の判定で ${fact.head} のメモになった保存済みの実行結果。${captionFor(item, fact)}`;

    el.compare.textContent = pairId ? `${pairId} と比べる` : "D04・D05を比べる";
    el.compare.dataset.target = pairId || "D04";
    el.caseTag.textContent = item.id;
    el.caption.textContent = captionFor(item, fact);

    el.memoSummaryId.textContent = item.id;
    el.memo.textContent = item.output.text;
    el.input.textContent = JSON.stringify(item.input, null, 2);
    el.output.textContent = JSON.stringify(item.output, null, 2);
    el.eventsCount.textContent = String(item.events.length);
    el.events.textContent = JSON.stringify(item.events, null, 2);
    el.checksCount.textContent = String(item.checks.length);
    el.checks.replaceChildren(...item.checks.map((text) => textItem("li", text)));
    el.comparisonLink.href = `comparison.html#${item.id}`;
    el.comparisonLink.textContent = `表形式の前の版で見る（comparison.html#${item.id}）`;

    el.actionStatus.textContent = "";
    if (animateNow) animate(drawn, fact);
  }

  function idFromHash() {
    let raw = "";
    try {
      raw = decodeURIComponent(window.location.hash.slice(1));
    } catch (error) {
      raw = "";
    }
    return state.byId.has(raw) ? raw : null;
  }

  function go(id, withMotion) {
    if (!state.ready || !state.byId.has(id)) return;
    state.animateNext = Boolean(withMotion);
    if (window.location.hash === `#${id}`) {
      render(id);
    } else {
      window.location.hash = id; // hashchange が表示を切り替え、戻る・進むにも残る
    }
  }

  window.addEventListener("hashchange", () => {
    if (!state.ready) return;
    const id = idFromHash();
    if (id) {
      render(id);
    } else if (state.current) {
      history.replaceState(null, "", `#${state.current}`);
    }
  });

  for (const b of caseButtons) b.addEventListener("click", () => go(b.dataset.id, true));
  el.compare.addEventListener("click", () => go(el.compare.dataset.target, true));

  // --- 操作 --------------------------------------------------------------------------------

  function saveBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  el.download.addEventListener("click", () => {
    const item = state.byId.get(state.current);
    if (!item) return;
    saveBlob(new Blob([JSON.stringify(item, null, 2) + "\n"], { type: "application/json" }), `dify-${item.id}.json`);
    el.actionStatus.textContent = `dify-${item.id}.json の保存をブラウザーに渡しました。`;
  });

  el.downloadDsl.addEventListener("click", () => {
    if (!state.dslBytes) return;
    saveBlob(new Blob([state.dslBytes], { type: "application/x-yaml" }), "workflow.yml");
    el.dslStatus.textContent = `workflow.yml（${state.dslBytes.byteLength.toLocaleString("en-US")} bytes・照合済みの元のバイト列）の保存をブラウザーに渡しました。`;
  });

  el.copy.addEventListener("click", async () => {
    el.copyFallback.hidden = true;
    try {
      if (!navigator.clipboard || !window.isSecureContext) throw new Error("clipboard unavailable");
      await navigator.clipboard.writeText(state.request);
      el.copyStatus.textContent = "依頼文をコピーしました。";
    } catch (error) {
      el.copyFallbackText.value = state.request;
      el.copyFallback.hidden = false;
      el.copyFallbackText.focus();
      el.copyFallbackText.select();
      el.copyStatus.textContent = "コピーできませんでした。下の欄の全文を選択しました。";
    }
  });

  el.retry.addEventListener("click", () => load());

  // --- 読み込み ------------------------------------------------------------------------------

  async function load() {
    if (state.loading) return;
    state.loading = true;
    state.ready = false;
    clearResult();
    setControls(false);
    el.errorBox.hidden = true;
    el.retry.disabled = true;
    setStatus("loading", "実行記録を読み込み、固定版とハッシュを確かめています…");
    try {
      const entries = await Promise.all(Object.entries(FILES).map(async ([key, path]) => [key, await fetchBytes(path)]));
      const raw = Object.fromEntries(entries);
      const hashes = {
        record: await sha256Hex(raw.record.buffer),
        tickets: await sha256Hex(raw.tickets.buffer),
        expected: await sha256Hex(raw.expected.buffer),
        workflow: await sha256Hex(raw.workflow.buffer),
        lock: await sha256Hex(raw.lock.buffer),
      };
      const files = {
        record: parseJson(FILES.record, raw.record.text),
        tickets: parseJson(FILES.tickets, raw.tickets.text),
        expected: parseJson(FILES.expected, raw.expected.text),
        lock: parseJson(FILES.lock, raw.lock.text),
        workflowText: raw.workflow.text,
      };
      const { facts, counts, dsl } = validate(files, hashes);
      if (!raw.request.text.trim()) fail("request.txt が空です。");

      state.record = files.record;
      state.request = raw.request.text;
      state.dslBytes = new Uint8Array(raw.workflow.buffer);
      state.counts = counts;
      state.byId = new Map(files.record.cases.map((item) => [item.id, item]));
      state.facts = new Map(facts.map((f) => [f.id, f]));
      renderStatic(files.record, dsl);

      const initial = idFromHash() || EXPECTED.defaultId;
      if (window.location.hash !== `#${initial}`) history.replaceState(null, "", `#${initial}`);
      state.ready = true;
      el.figure.hidden = false;
      render(initial);
      setControls(true);
      setStatus("ready", "8件の実行記録を照合し、図に描きました。");
    } catch (error) {
      state.ready = false;
      state.dslBytes = null;
      state.request = "";
      clearResult();
      setControls(false);
      const message = error instanceof LoadError ? error.message : "実行記録を表示できませんでした。";
      setStatus("error", "記録を確かめられなかったため、図を表示していません。");
      el.errorText.textContent = `${message} 古い内容は表示していません。`;
      el.errorBox.hidden = false;
    } finally {
      state.loading = false;
      el.retry.disabled = false;
    }
  }

  load();
})();
