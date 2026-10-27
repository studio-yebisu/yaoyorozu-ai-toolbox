// 八百万図AIツールボックス — Dify 作例ページ。MIT License, Copyright (c) 2026 Studio Yebisu.
// 保存した実行記録を読むだけのページ。分岐をブラウザーで計算し直さず、記録の値をそのまま表示する。
// データはすべて textContent で書き、HTML として解釈しない。
"use strict";

(() => {
  const EXPECTED = {
    format: "studio-yebisu-dify-run-v1",
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
    ids: ["D01", "D02", "D03", "D04", "D05", "D06", "D07", "D08"],
    defaultId: "D05",
  };
  const FILES = {
    record: "outputs/workflow-runs.json",
    tickets: "input/tickets.json",
    expected: "input/expected.json",
    workflow: "workflow.yml",
    lock: "vendor-lock.json",
    request: "request.txt",
  };
  const ROUTE_LABELS = { urgent: "優先対応", billing: "請求窓口", false: "通常窓口" };
  const MEMO_NODES = { urgent: "urgent-note", billing: "billing-note", false: "support-note" };
  const HEX64 = /^[0-9a-f]{64}$/;

  const $ = (id) => document.getElementById(id);
  const el = {
    status: $("status"),
    statusText: $("status-text"),
    retry: $("retry"),
    select: $("sample-select"),
    list: $("sample-list"),
    result: $("result"),
    title: $("sample-title"),
    summary: $("summary"),
    subject: $("ticket-subject"),
    issue: $("ticket-issue"),
    urgency: $("ticket-urgency"),
    users: $("ticket-users"),
    routeLabel: $("route-label"),
    memo: $("memo-text"),
    pathText: $("path-text"),
    download: $("download-record"),
    copy: $("copy-request"),
    actionStatus: $("action-status"),
    fallback: $("request-fallback"),
    fallbackLabel: $("request-fallback-label"),
    checks: $("case-checks"),
    input: $("input-text"),
    output: $("output-text"),
    eventsCount: $("events-count"),
    events: $("events-text"),
    tech: $("tech-list"),
    probes: $("probe-list"),
    topology: $("topology-text"),
  };

  const state = { ready: false, loading: false, record: null, byId: new Map(), current: null, request: "" };

  class LoadError extends Error {}

  function fail(message) {
    throw new LoadError(message);
  }

  function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function deepEqual(a, b) {
    if (a === b) return true;
    if (Array.isArray(a)) {
      return Array.isArray(b) && a.length === b.length && a.every((item, i) => deepEqual(item, b[i]));
    }
    if (isObject(a) && isObject(b)) {
      const keys = Object.keys(a);
      return keys.length === Object.keys(b).length
        && keys.every((key) => Object.prototype.hasOwnProperty.call(b, key) && deepEqual(a[key], b[key]));
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
      fail(`${path} を取得できませんでした。`);
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

  function validate(files, hashes) {
    const { record, tickets, expected, lock } = files;
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
    if (checks.passed !== true || !Array.isArray(checks.items) || checks.items.length === 0 || checks.count !== checks.items.length) {
      fail("実行記録の確認が合格になっていません。");
    }

    if (!isObject(tickets) || !Array.isArray(tickets.cases)) fail("input/tickets.json の形が違います。");
    const oracle = isObject(expected) ? expected.selected_case_ids : null;
    if (!isObject(oracle)) fail("input/expected.json の形が違います。");
    const ticketIds = tickets.cases.map((c) => c && c.id);
    if (!deepEqual(ticketIds, EXPECTED.ids) || !deepEqual(Object.keys(oracle), EXPECTED.ids)) {
      fail("入力の問い合わせが D01〜D08 の8件ではありません。");
    }

    const cases = record.cases;
    if (!Array.isArray(cases) || !deepEqual(cases.map((c) => c && c.id), EXPECTED.ids)) {
      fail("実行記録の問い合わせが D01〜D08 の8件ではありません。");
    }
    cases.forEach((item, index) => {
      const ticket = tickets.cases[index];
      const output = item.output || {};
      const route = output.selected_case_id;
      const path = output.node_path;
      if (!deepEqual(item.input, ticket.input) || item.label !== ticket.label) {
        fail(`${item.id} の入力が input/tickets.json と一致しません。`);
      }
      if (route !== oracle[item.id] || !Object.prototype.hasOwnProperty.call(ROUTE_LABELS, route)) {
        fail(`${item.id} の分岐が input/expected.json と一致しません。`);
      }
      if (typeof output.text !== "string" || !Array.isArray(path)
        || !deepEqual(path, ["start", "route", MEMO_NODES[route], "merge", "end"])) {
        fail(`${item.id} の出力または通った順が記録の形と合いません。`);
      }
      if (!Array.isArray(item.events) || item.events.length === 0
        || item.events[item.events.length - 1].type !== "GraphRunSucceededEvent") {
        fail(`${item.id} のイベントが成功で終わっていません。`);
      }
      if (!Array.isArray(item.checks) || item.checks.length === 0) fail(`${item.id} の確認がありません。`);
    });
  }

  // --- 表示 --------------------------------------------------------------------------------

  function setStatus(kind, message) {
    el.status.dataset.state = kind;
    el.statusText.textContent = message;
    el.retry.hidden = kind !== "error";
    el.retry.disabled = kind === "loading";
  }

  function setControls(enabled) {
    el.select.disabled = !enabled;
    el.download.disabled = !enabled;
    el.copy.disabled = !enabled;
    for (const button of el.list.querySelectorAll("button")) button.disabled = !enabled;
  }

  function clearResult() {
    el.result.hidden = true;
    for (const node of [el.title, el.summary, el.subject, el.issue, el.urgency, el.users, el.routeLabel,
      el.memo, el.pathText, el.input, el.output, el.events, el.topology, el.actionStatus]) {
      node.textContent = "";
    }
    el.eventsCount.textContent = "0";
    el.checks.replaceChildren();
    el.tech.replaceChildren();
    el.probes.replaceChildren();
    el.select.replaceChildren();
    el.list.replaceChildren();
    el.fallback.hidden = true;
    el.fallbackLabel.hidden = true;
    el.fallback.value = "";
  }

  function textItem(tag, text) {
    const node = document.createElement(tag);
    node.textContent = text;
    return node;
  }

  function buildPicker(cases) {
    for (const item of cases) {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = `${item.id}　${item.label}`;
      el.select.append(option);

      const button = document.createElement("button");
      button.type = "button";
      button.dataset.id = item.id;
      button.textContent = item.id;
      button.title = item.label;
      button.setAttribute("aria-pressed", "false");
      button.addEventListener("click", () => go(item.id));
      el.list.append(button);
    }
  }

  function addTech(label, value) {
    const row = document.createElement("div");
    row.append(textItem("dt", label), textItem("dd", value));
    el.tech.append(row);
  }

  function renderTech(record) {
    const runtime = record.runtime || {};
    addTech("Dify の固定版", `${record.source.repository} ${record.source.commit}（${record.source.version}）`);
    addTech("実行に使った依存", `${record.runtime_dependency.name} ${record.runtime_dependency.version}（wheel SHA-256 ${record.runtime_dependency.wheel_sha256}）`);
    addTech("vendor-lock.json の SHA-256", `${record.source_lock_sha256}（${EXPECTED.lockFileCount}ファイル）`);
    for (const [path, value] of Object.entries(record.input_sha256)) addTech(`${path} の SHA-256`, value);
    addTech("Python・環境", `${runtime.python || ""} ${runtime.implementation || ""} / ${runtime.platform || ""}`);
    if (Array.isArray(runtime.api_entrypoints)) {
      addTech("呼び出した API と置き場所", runtime.api_entrypoints.map((e) => `${e.name} — ${e.source}`).join("\n"));
    }
    addTech("通信・子プロセスの試み", `通信 ${runtime.network_attempts}件・子プロセス ${runtime.process_attempts}件`);
    addTech("通信の拒否の範囲", runtime.network_guard_scope || "");
    addTech("サーバー・モデル", `サーバーの起動 ${runtime.server_started ? "あり" : "なし"}・LLM の呼び出し ${runtime.llm_called ? "あり" : "なし"}`);
    addTech("確認の合計", `${record.checks.count}件すべて合格`);

    for (const probe of Array.isArray(record.dsl_probes) ? record.dsl_probes : []) {
      const error = probe.error || {};
      el.probes.append(textItem("li", `${probe.id}：${probe.input_description} → ${error.name}（${error.code}）「${error.message}」`));
    }
    el.topology.textContent = JSON.stringify(record.topology, null, 2);
  }

  function render(id) {
    const item = state.byId.get(id);
    if (!item) return;
    state.current = id;
    const input = item.input;
    const output = item.output;
    const route = output.selected_case_id;

    el.select.value = id;
    for (const button of el.list.querySelectorAll("button")) {
      button.setAttribute("aria-pressed", String(button.dataset.id === id));
    }

    el.title.textContent = `${item.id}　${item.label}`;
    el.summary.textContent = `問い合わせ ${input.ticket_id} は、${ROUTE_LABELS[route]}へ回りました。`;
    el.subject.textContent = input.subject;
    el.issue.textContent = input.issue;
    el.urgency.textContent = input.urgency;
    el.users.textContent = `${input.affected_users}人`;

    el.routeLabel.textContent = ROUTE_LABELS[route];
    el.memo.textContent = output.text;

    const passed = new Set(output.node_path);
    for (const node of document.querySelectorAll(".flow-node")) {
      const nodeId = node.dataset.node;
      node.dataset.state = passed.has(nodeId) ? "done" : (node.classList.contains("branch") ? "skipped" : "");
    }
    el.pathText.textContent = output.node_path.join(" → ");

    el.checks.replaceChildren(...item.checks.map((label) => textItem("li", label)));
    el.input.textContent = JSON.stringify(input, null, 2);
    el.output.textContent = JSON.stringify(output, null, 2);
    el.eventsCount.textContent = String(item.events.length);
    el.events.textContent = JSON.stringify(item.events, null, 2);

    el.actionStatus.textContent = "";
    el.fallback.hidden = true;
    el.fallbackLabel.hidden = true;
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

  function go(id) {
    if (!state.ready || !state.byId.has(id)) return;
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

  el.select.addEventListener("change", () => go(el.select.value));

  // --- 操作 --------------------------------------------------------------------------------

  el.download.addEventListener("click", () => {
    const item = state.byId.get(state.current);
    if (!item) return;
    const blob = new Blob([JSON.stringify(item, null, 2) + "\n"], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `dify-${item.id}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    el.actionStatus.textContent = `dify-${item.id}.json の保存をブラウザーに渡しました。`;
  });

  el.copy.addEventListener("click", async () => {
    el.fallback.hidden = true;
    el.fallbackLabel.hidden = true;
    try {
      if (!navigator.clipboard || !window.isSecureContext) throw new Error("clipboard unavailable");
      await navigator.clipboard.writeText(state.request);
      el.actionStatus.textContent = "依頼文をコピーしました。";
    } catch (error) {
      el.fallback.value = state.request;
      el.fallback.hidden = false;
      el.fallbackLabel.hidden = false;
      el.fallback.focus();
      el.fallback.select();
      el.actionStatus.textContent = "コピーできませんでした。下の欄の全文を選択したので、長押しでコピーしてください。";
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
    setStatus("loading", "実行記録を読み込み、固定版とハッシュを確かめています…");
    try {
      const entries = await Promise.all(Object.entries(FILES).map(async ([key, path]) => [key, await fetchBytes(path)]));
      const raw = Object.fromEntries(entries);
      const hashes = {
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
      };
      validate(files, hashes);
      if (!raw.request.text.trim()) fail("request.txt が空です。");

      state.record = files.record;
      state.request = raw.request.text;
      state.byId = new Map(files.record.cases.map((item) => [item.id, item]));
      buildPicker(files.record.cases);
      renderTech(files.record);

      const initial = idFromHash() || EXPECTED.defaultId;
      if (window.location.hash !== `#${initial}`) history.replaceState(null, "", `#${initial}`);
      state.ready = true;
      render(initial);
      el.result.hidden = false;
      setControls(true);
      setStatus("ready", "8件の実行記録を表示しています。");
    } catch (error) {
      state.ready = false;
      clearResult();
      setControls(false);
      const message = error instanceof LoadError ? error.message : "実行記録を表示できませんでした。";
      setStatus("error", `${message} 古い内容は表示していません。`);
    } finally {
      state.loading = false;
      el.retry.disabled = false;
    }
  }

  load();
})();
