/*
 * 八百万図AIツールボックス — Mem0 OSS example viewer.
 * Copyright (c) 2026 Studio Yebisu. MIT License.
 *
 * Reads the saved run record (outputs/memory-run.json) and the three frozen inputs, checks
 * them, and shows each scenario's actual input and output. Nothing here runs Mem0, Python or a
 * model, and there is no built-in fallback data: if a check fails, results stay hidden.
 */
(() => {
  "use strict";

  const FILES = {
    record: "outputs/memory-run.json",
    memories: "input/memories.json",
    scenarios: "input/scenarios.json",
    modelSource: "input/model-source.json",
    request: "request.txt",
  };
  const FROZEN = {
    format: "studio-yebisu-mem0-run-v1",
    repository: "mem0ai/mem0",
    commit: "0724291bd864cf807e88ee8981c8226644e8fb42",
    version: "2.2.1",
    modelRepository: "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
    modelCommit: "e8f8c211226b894fcb81acc59f3b34ba3efd5f42",
    dimensions: 384,
    modelFiles: 11,
    inputs: {
      "input/memories.json": "ef9f585026e5cb4e5c0f32fa02af0117ede2dd2d7b0b5d9a4fb6fe87386c161c",
      "input/model-source.json": "4e51d6fc32c2b93c5c5dfdad32bc870ebeb379548ea87e90cd50bd10f5fcd9af",
      "input/scenarios.json": "ec089d59c70d1442313fe797349acbbbb9999e7ec6ba2c04131df02bf8a2acdb",
    },
  };
  const IDS = ["M01", "M02", "M03", "M04", "M05", "M06", "M07", "M08"];
  const DEFAULT_ID = "M02";
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

  const OPERATION_LABELS = {
    add: "保存 ・ Memory.add",
    search: "検索 ・ Memory.search",
    update: "更新 ・ Memory.update",
    delete: "削除 ・ Memory.delete",
    reopen: "別プロセスで読み直し ・ Memory.from_config",
    guard: "未登録の利用者と誤った呼び出し ・ Memory.search",
  };
  const CASE_LABELS = {
    missing_filters: "filters を渡さない",
    top_level_user_id: "user_id を filters の外に渡す",
    threshold_out_of_range: "threshold を 0〜1 の外にする",
  };
  const NOTES = {
    M01: "infer=False なので、7件は入力の文のまま1件ずつ保存されます。ID は Mem0 が付けた UUID です。LLM は使っていません。",
    M02: "Mem0スコアは並び順を決める値で、確率や確信度ではありません。上位の件数は top_k、足切りは threshold で決まります。",
    M03: "同じ問いでも、filters の user_id が ken なので ken の記録だけが返ります。アプリが渡す条件による分離で、認証ではありません。",
    M04: "metadata の topic も filters に入れると、その値を持つ記録だけに絞られます。",
    M05: "ID はそのまま、本文だけが置き換わります。履歴には ADD と UPDATE が残ります。書き換えは実行スクリプトが update を呼んだ結果です。",
    M06: "get は None になり一覧からも外れますが、SQLite の履歴には削除前の本文と DELETE が残ります。物理的な消去は確かめていません。",
    M07: "最初のプロセスで SQLite と Qdrant を閉じてから、同じ保存先を新しい Python プロセスで開き直しました。",
    M08: "例外の種類と文面は、Mem0 が実際に返したものをそのまま表示しています。",
  };

  const $ = (id) => document.getElementById(id);
  const ui = {
    status: $("status"),
    errorBox: $("error-box"),
    errorText: $("error-text"),
    retry: $("retry"),
    viewer: $("viewer"),
    picks: Array.from(document.querySelectorAll("#sample-list .pick")),
    operation: $("operation-label"),
    title: $("sample-title"),
    summary: $("summary"),
    inputView: $("input-view"),
    memoryList: $("memory-list"),
    note: $("sample-note"),
    inputText: $("input-text"),
    outputText: $("output-text"),
    download: $("download-record"),
    copy: $("copy-request"),
    actionStatus: $("action-status"),
    copyFallback: $("copy-fallback"),
    copyFallbackText: $("copy-fallback-text"),
    pinList: $("pin-list"),
    factsList: $("facts-list"),
    scoreNote: $("score-note"),
    vectorNote: $("vector-note"),
  };
  const state = { record: null, byId: new Map(), current: null, loading: false, copying: false, requestText: null };

  // --- DOM helpers (text only; no HTML from data is parsed) ---------------------------------

  function el(tag, props, children) {
    const node = document.createElement(tag);
    if (props) {
      for (const [key, value] of Object.entries(props)) {
        if (value == null || value === false) continue;
        if (key === "class") node.className = value;
        else if (key === "text") node.textContent = value;
        else node.setAttribute(key, value === true ? "" : String(value));
      }
    }
    for (const child of [].concat(children ?? [])) {
      if (child == null || child === false) continue;
      node.append(typeof child === "string" ? document.createTextNode(child) : child);
    }
    return node;
  }

  function code(text) {
    return el("code", { class: "id", text });
  }

  function inlineJson(value) {
    return el("code", { class: "inline-json", text: JSON.stringify(value) });
  }

  function inlineCode(text) {
    return el("code", { class: "inline-json", text });
  }

  function kv(rows) {
    return el("dl", { class: "kv" }, rows.filter(Boolean).map(([label, value]) =>
      el("div", { class: "kv-row" }, [el("dt", { text: label }), el("dd", null, [value])])));
  }

  function score(value) {
    return typeof value === "number" && Number.isFinite(value) ? value.toFixed(3) : String(value);
  }

  // --- Loading and checks ---------------------------------------------------------------------

  function check(condition, message) {
    if (!condition) throw new Error(message);
  }

  function canon(value) {
    if (Array.isArray(value)) return value.map(canon);
    if (value && typeof value === "object") {
      const out = {};
      for (const key of Object.keys(value).sort()) out[key] = canon(value[key]);
      return out;
    }
    return value;
  }

  function same(a, b) {
    return JSON.stringify(canon(a)) === JSON.stringify(canon(b));
  }

  async function fetchBytes(path) {
    let response;
    try {
      response = await fetch(path, { cache: "no-cache" });
    } catch {
      throw new Error(`${path} を取得できませんでした（通信エラー）。`);
    }
    if (!response.ok) throw new Error(`${path} を取得できませんでした（HTTP ${response.status}）。`);
    return new Uint8Array(await response.arrayBuffer());
  }

  function decode(bytes, path) {
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      throw new Error(`${path} が UTF-8 として読めません。`);
    }
  }

  function parseJson(bytes, path) {
    try {
      return JSON.parse(decode(bytes, path));
    } catch (error) {
      if (error instanceof SyntaxError) throw new Error(`${path} が JSON として読めません。`);
      throw error;
    }
  }

  async function sha256Hex(bytes) {
    check(globalThis.crypto && crypto.subtle,
      "この閲覧環境では SHA-256 を計算できないため、入力を照合できません（https で開いてください）。");
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  }

  function searchCallOf(scenario) {
    return {
      query: scenario.query,
      filters: scenario.filters,
      top_k: scenario.top_k,
      threshold: scenario.threshold,
      explain: scenario.explain,
    };
  }

  function resultsOf(response, what) {
    check(response && Array.isArray(response.results), `${what} の results がありません。`);
    return response.results;
  }

  function validate(record, memories, scenarios, modelSource, hashes) {
    check(record && record.format === FROZEN.format, "実行記録の形式が違います。");
    const source = record.source || {};
    check(source.repository === FROZEN.repository && source.commit === FROZEN.commit && source.version === FROZEN.version,
      "実行記録の原典（リポジトリ・コミット・版）が固定版と一致しません。");
    const model = record.model || {};
    check(model.repository === FROZEN.modelRepository && model.commit === FROZEN.modelCommit &&
      modelSource.repository === FROZEN.modelRepository && modelSource.commit === FROZEN.modelCommit,
      "埋め込みモデルの固定版が一致しません。");
    check(model.dimensions === FROZEN.dimensions && model.files_verified === FROZEN.modelFiles && model.device === "cpu",
      "埋め込みモデルの次元・照合ファイル数・実行先が想定と違います。");
    const config = record.config || {};
    check(config.infer === false && config.telemetry === false && config.network_blocked === true,
      "実行記録の設定（infer=False・送信停止・通信拒否）を確かめられません。");
    const network = record.network || {};
    check(network.total_attempts === 0 && Array.isArray(network.parent_attempts) && network.parent_attempts.length === 0 &&
      Array.isArray(network.worker_attempts) && network.worker_attempts.length === 0,
      "実行中の通信の試みが0件ではない、または記録がありません。");
    check(record.checks && record.checks.passed === true, "実行記録の検証が通っていません。");
    check(record.worker && record.worker.exit_code === 0 && record.worker.fresh_process === true,
      "別プロセスでの読み直しの記録を確かめられません。");

    for (const [path, expected] of Object.entries(FROZEN.inputs)) {
      check(hashes[path] === expected, `${path} の SHA-256 が固定した値と一致しません。`);
      check(record.input_sha256 && record.input_sha256[path] === expected, `記録にある ${path} の SHA-256 が一致しません。`);
    }

    const rows = memories.memories;
    check(memories.fictional === true && Array.isArray(rows) && rows.length === 7, "input/memories.json の形が違います。");
    const listed = scenarios.scenarios;
    check(Array.isArray(listed) && same(listed.map((s) => s.id), IDS), "input/scenarios.json の場面が M01〜M08 ではありません。");
    const samples = record.samples;
    check(Array.isArray(samples) && same(samples.map((s) => s && s.id), IDS), "実行記録の場面が M01〜M08 の順ではありません。");
    const scenario = Object.fromEntries(listed.map((s) => [s.id, s]));
    const sample = Object.fromEntries(samples.map((s) => [s.id, s]));
    for (const id of IDS) {
      check(sample[id].label === scenario[id].label && sample[id].operation === scenario[id].operation,
        `${id} のラベルまたは操作が入力と一致しません。`);
      check(sample[id].input && sample[id].output && typeof sample[id].summary === "string", `${id} の入力・出力がありません。`);
    }

    // M01: the seven calls are the frozen rows, and every returned id is a UUID.
    const m01 = sample.M01;
    check(Array.isArray(m01.input.calls) && m01.input.calls.length === rows.length, "M01 の呼び出しが7件ではありません。");
    rows.forEach((row, i) => {
      const call = m01.input.calls[i];
      check(call.key === row.key && call.messages === row.text && call.user_id === row.user_id &&
        same(call.metadata, row.metadata) && call.infer === false, `M01 の ${row.key} が入力と一致しません。`);
    });
    const ids = m01.output.memory_ids || {};
    check(same(Object.keys(ids).sort(), rows.map((r) => r.key).sort()) && Object.values(ids).every((v) => UUID.test(v)),
      "M01 の ID の対応を確かめられません。");
    check(Array.isArray(m01.output.responses) && m01.output.responses.length === 7, "M01 の応答が7件ではありません。");
    for (const user of ["aya", "ken"]) resultsOf(m01.output.get_all?.[user]?.response, `M01 get_all ${user}`);

    for (const id of ["M02", "M03", "M04"]) {
      check(same(sample[id].input.call, searchCallOf(scenario[id])), `${id} の検索条件が入力と一致しません。`);
      resultsOf(sample[id].output.response, id);
    }

    const m05 = sample.M05;
    check(m05.input.key === scenario.M05.key && m05.input.memory_id === ids[scenario.M05.key] &&
      m05.input.update_call?.text === scenario.M05.text && same(m05.input.search_call, searchCallOf(scenario.M04)),
      "M05 の対象・新しい本文・検索条件が入力と一致しません。");
    check(m05.output.before && m05.output.after && Array.isArray(m05.output.history), "M05 の出力が足りません。");
    resultsOf(m05.output.search_response, "M05");

    const m06 = sample.M06;
    check(m06.input.key === scenario.M06.key && m06.input.memory_id === ids[scenario.M06.key], "M06 の対象が入力と一致しません。");
    check(m06.output.before && m06.output.after === null && Array.isArray(m06.output.history), "M06 の出力が足りません。");
    for (const user of ["aya", "ken"]) resultsOf(m06.output.get_all?.[user]?.response, `M06 get_all ${user}`);

    const m07 = sample.M07;
    check(same(m07.input.search_call, searchCallOf(scenario.M07)) &&
      m07.input.memory_ids?.[scenario.M05.key] === ids[scenario.M05.key] &&
      m07.input.memory_ids?.[scenario.M06.key] === ids[scenario.M06.key], "M07 の条件または ID が一致しません。");
    check(m07.output.worker?.exit_code === 0 && m07.output.worker?.process_is_new === true &&
      m07.output.get_updated && m07.output.get_deleted === null && Array.isArray(m07.output.history_updated),
      "M07 の出力が足りません。");
    resultsOf(m07.output.search_response, "M07");
    for (const user of ["aya", "ken"]) resultsOf(m07.output.get_all?.[user]?.response, `M07 get_all ${user}`);

    const m08 = sample.M08;
    check(same(m08.input.unknown_user_call, searchCallOf(scenario.M08)), "M08 の検索条件が入力と一致しません。");
    check(Array.isArray(m08.input.validation_calls) &&
      same(m08.input.validation_calls.map((c) => c.case), scenario.M08.validation_cases), "M08 の誤った呼び出しが入力と一致しません。");
    check(Array.isArray(m08.output.validation_errors) &&
      same(m08.output.validation_errors.map((e) => e.case), scenario.M08.validation_cases), "M08 の例外の記録が足りません。");
    resultsOf(m08.output.unknown_user_response, "M08");
    return sample;
  }

  function setStatus(name, text) {
    ui.status.dataset.state = name;
    ui.status.textContent = text;
  }

  function setActionsEnabled(enabled) {
    for (const button of ui.picks) button.disabled = !enabled;
    ui.download.disabled = !enabled;
    ui.copy.disabled = !enabled;
  }

  async function load() {
    if (state.loading) return;
    state.loading = true;
    ui.retry.disabled = true;
    state.record = null;
    state.current = null;
    setActionsEnabled(false);
    ui.viewer.hidden = true;
    ui.errorBox.hidden = true;
    setStatus("loading", "保存済みの記録を読み込んでいます…");
    try {
      const paths = [FILES.record, FILES.memories, FILES.scenarios, FILES.modelSource];
      const bytes = await Promise.all(paths.map(fetchBytes));
      const [record, memories, scenarios, modelSource] = bytes.map((b, i) => parseJson(b, paths[i]));
      const hashes = {};
      for (const [i, path] of paths.entries()) {
        if (path in FROZEN.inputs) hashes[path] = await sha256Hex(bytes[i]);
      }
      const byId = validate(record, memories, scenarios, modelSource, hashes);
      state.record = record;
      state.byId = new Map(Object.entries(byId));
      renderStatic(record);
      for (const button of ui.picks) {
        button.querySelector(".pick-label").textContent = state.byId.get(button.dataset.id).label;
      }
      ui.viewer.hidden = false;
      setActionsEnabled(true);
      select(idFromHash() || DEFAULT_ID, { focus: false });
      setStatus("ready", "8場面・照合済み");
    } catch (error) {
      ui.viewer.hidden = true;
      setActionsEnabled(false);
      ui.errorText.textContent = error instanceof Error ? error.message : String(error);
      ui.errorBox.hidden = false;
      setStatus("error", "読み込めませんでした");
    } finally {
      state.loading = false;
      ui.retry.disabled = false;
    }
  }

  // --- Static parts filled from the record ----------------------------------------------------

  function renderStatic(record) {
    const env = record.environment || {};
    const extra = [
      ["実行", `${record.started_at}（UTC）`],
      ["実行環境", `Python ${env.python} ・ torch ${env.torch} ・ sentence-transformers ${env.sentence_transformers} ・ transformers ${env.transformers} ・ qdrant-client ${env.qdrant_client} ・ ollama ${env.ollama}`],
      ["保存先", "埋め込み型の Qdrant（ディスク）と SQLite の履歴。どちらも非公開の作業フォルダーに置き、公開していません"],
    ];
    ui.pinList.querySelectorAll("[data-run]").forEach((node) => node.remove());
    for (const [label, value] of extra) {
      ui.pinList.append(el("div", { "data-run": "" }, [el("dt", { text: label }), el("dd", { text: value })]));
    }

    const vector = record.samples[0].output.vector_check || {};
    ui.vectorNote.textContent =
      `${record.model.repository} が CPU で計算した ${record.model.dimensions} 次元のベクトルです。` +
      `A01 で実測 ${vector.dimensions} 次元・${vector.all_finite ? "すべて有限値" : "有限値か未確認"}、` +
      `保存されたベクトルとのコサイン ${typeof vector.stored_vs_fresh_cosine === "number" ? vector.stored_vs_fresh_cosine.toFixed(6) : "—"}。` +
      "このモデルが Mem0 の文章を書いたわけではなく、近さの計算だけを担います。";

    const searched = [];
    const s = state.byId;
    for (const id of ["M02", "M03", "M04"]) searched.push(...s.get(id).output.response.results);
    searched.push(...s.get("M05").output.search_response.results, ...s.get("M07").output.search_response.results);
    const plain = searched.length > 0 && searched.every((r) => r.score_details &&
      r.score_details.bm25_score === 0 && r.score_details.entity_boost === 0 && r.score === r.score_details.semantic_score);
    ui.scoreNote.textContent = "検索の並び順を決める Mem0 の値で、確率や確信度ではありません。" + (plain
      ? `この記録の検索結果 ${searched.length} 件はすべて、BM25 と固有表現の加点が 0 で、スコアは意味の近さ（semantic_score）と同じ値です。`
      : "内訳（score_details）は各カードに表示しています。");

    const checks = record.checks || {};
    const db = checks.history_db || {};
    const ev = db.history_rows_by_event || {};
    const storage = record.storage?.after_worker?.files || [];
    const facts = [
      `原典 ${record.source.files_verified} ファイル・入力 ${checks.inputs_verified} 件・モデル ${record.model.files_verified} ファイルをハッシュで照合。入力3件は、このページでも SHA-256 を計算し直して一致を確かめています。`,
      `実行中の通信の試み ${record.network.total_attempts} 件（最初のプロセス ${record.network.parent_attempts.length} 件・別プロセス ${record.network.worker_attempts.length} 件）。LLM の呼び出し ${checks.llm_calls} 回。`,
      `別プロセスでの読み直し：終了コード ${record.worker.exit_code}、新しいプロセスで実行。`,
      `履歴の SQLite（非公開）：ADD ${ev.ADD} 行・UPDATE ${ev.UPDATE} 行・DELETE ${ev.DELETE} 行、会話メッセージ ${db.messages_rows} 行。`,
      `保存ファイル（非公開）${storage.length} 個のサイズと SHA-256 を、閉じた後に記録。`,
    ];
    ui.factsList.replaceChildren(...facts.map((text) => el("li", { text })));
  }

  // --- Cards -----------------------------------------------------------------------------------

  function memoryCard(item, options = {}) {
    const meta = item.metadata || {};
    const head = el("p", { class: "card-head" }, [
      options.rank ? el("span", { class: "rank", text: `${options.rank}位` }) : null,
      el("span", { class: "key", text: meta.source_key || "—" }),
      el("span", { class: "tag", text: item.user_id ?? "—" }),
      options.tag ? el("span", { class: `tag ${options.tone ? `tag-${options.tone}` : ""}`, text: options.tag }) : null,
      typeof item.score === "number" ? el("span", { class: "tag", text: `スコア ${score(item.score)}` }) : null,
    ]);
    const rows = [
      ["ID", code(item.id)],
      ["利用者ID", item.user_id ?? "—"],
      ["話題", meta.topic ?? "—"],
    ];
    if (typeof item.score === "number") {
      const detail = item.score_details;
      rows.push(["Mem0スコア", el("span", null, [
        el("strong", { class: "score", text: score(item.score) }),
        detail ? el("span", { class: "score-detail", text:
          ` 内訳：意味 ${score(detail.semantic_score)} ・ BM25 ${score(detail.bm25_score)} ・ 固有表現 ${score(detail.entity_boost)}` }) : null,
      ])]);
    }
    if (options.times) {
      rows.push(["作成", item.created_at ?? "—"]);
      rows.push(["更新", item.updated_at ?? "—"]);
    }
    return el("li", { class: `card ${options.tone ? `card-${options.tone}` : ""}` }, [
      head,
      el("p", { class: "memory-text", text: item.memory }),
      el("details", { class: "card-meta" }, [
        el("summary", { text: "ID・スコアなどを確認" }),
        kv(rows),
      ]),
    ]);
  }

  function historyCard(row) {
    return el("li", { class: `card card-history ${row.event === "DELETE" ? "card-deleted" : ""}` }, [
      el("p", { class: "card-head" }, [el("span", { class: "event", text: row.event })]),
      kv([
        ["前の本文", row.old_memory ?? "（なし）"],
        ["後の本文", row.new_memory ?? "（なし）"],
        ["is_deleted", String(row.is_deleted)],
        ["作成", row.created_at ?? "—"],
        ["更新", row.updated_at ?? "—"],
      ]),
    ]);
  }

  function noneCard(text) {
    return el("li", { class: "card card-none" }, [el("p", { class: "none-text", text })]);
  }

  function errorCard(error) {
    return el("li", { class: "card card-error" }, [
      el("p", { class: "card-head" }, [
        el("span", { class: "key", text: CASE_LABELS[error.case] || error.case }),
        el("span", { class: "tag tag-error", text: error.type }),
      ]),
      el("p", { class: "error-message", text: error.message }),
      kv([["例外のクラス", `${error.module}.${error.type}`]]),
    ]);
  }

  function group(title, cards, options = {}) {
    const list = el(options.ordered ? "ol" : "ul", { class: "cards" }, cards);
    const body = [el("h4", { class: "group-h", text: title }), options.lead ? el("p", { class: "group-lead", text: options.lead }) : null, list];
    if (options.collapsed) {
      return el("details", { class: "group group-more" }, [el("summary", { text: title }), options.lead ? el("p", { class: "group-lead", text: options.lead }) : null, list]);
    }
    return el("section", { class: "group" }, body);
  }

  function resultCards(results) {
    return results.map((item, i) => memoryCard(item, { rank: i + 1 }));
  }

  function countLine(listings) {
    return ["aya", "ken"].map((u) => `${u} ${listings[u].response.results.length}件`).join(" ・ ");
  }

  // --- Per-scenario views -----------------------------------------------------------------------

  function searchInput(call, extra = []) {
    return kv([
      ["問い（query）", call.query],
      ["絞り込み（filters）", inlineJson(call.filters)],
      ["件数と足切り", `top_k ${call.top_k} ・ threshold ${call.threshold} ・ explain ${call.explain}`],
      ...extra,
    ]);
  }

  const VIEWS = {
    add(sample) {
      const calls = sample.input.calls;
      const input = [
        kv([["呼び出し", inlineCode("Memory.add(text, user_id=…, metadata=…, infer=False)")], ["回数", `${calls.length}回（1件ずつ）`]]),
        el("ol", { class: "call-list" }, calls.map((c) =>
          el("li", null, [el("span", { class: "key", text: c.key }), ` ${c.user_id} ・ ${c.metadata.topic} ・ `, el("span", { class: "call-text", text: c.messages })]))),
      ];
      const out = sample.output;
      const vector = out.vector_check;
      const groups = ["aya", "ken"].map((u) => group(`${u} の記録（get_all・${out.get_all[u].response.results.length}件）`,
        out.get_all[u].response.results.map((item) => memoryCard(item)), { lead: "保存直後に一覧した結果です。並びは保存先の順で、保存した順ではありません。" }));
      if (vector) {
        groups.push(el("section", { class: "group" }, [
          el("h4", { class: "group-h", text: `埋め込みの確認（${vector.key}）` }),
          kv([
            ["呼び出し", inlineCode(vector.call)],
            ["次元・有限値", `${vector.dimensions} 次元 ・ ${vector.all_finite ? "すべて有限" : "未確認"}`],
            ["L2ノルム", vector.l2_norm.toFixed(6)],
            ["先頭8つの値", inlineJson(vector.first8.map((x) => Number(x.toFixed(6))))],
            ["保存済みとのコサイン", vector.stored_vs_fresh_cosine.toFixed(6)],
            ["ベクトルの SHA-256", code(vector.sha256_of_json)],
          ]),
        ]));
      }
      return { input, output: groups };
    },

    search(sample) {
      const results = sample.output.response.results;
      return {
        input: [searchInput(sample.input.call)],
        output: [results.length
          ? group(`返った ${results.length} 件（Mem0スコアの順）`, resultCards(results), { ordered: true })
          : group("返った記録", [noneCard("0件（results: []）")])],
      };
    },

    update(sample) {
      const inp = sample.input;
      const out = sample.output;
      return {
        input: [kv([
          ["対象", el("span", null, [el("span", { class: "key", text: inp.key }), " ", code(inp.memory_id)])],
          ["新しい本文（text）", inp.update_call.text],
          ["続けて検索", el("span", null, [`${inp.search_call_from} と同じ問い：${inp.search_call.query} `, inlineJson(inp.search_call.filters)])],
        ])],
        output: [
          group("更新の前と後（get）", [
            memoryCard(out.before, { tag: "更新前", tone: "before", times: true }),
            memoryCard(out.after, { tag: "更新後", tone: "after", times: true }),
          ], { lead: `update の戻り値：${JSON.stringify(out.update_response)}` }),
          group(`履歴（history・${out.history.length}件）`, out.history.map(historyCard)),
          group("更新後の検索", resultCards(out.search_response.results), { ordered: true }),
        ],
      };
    },

    delete(sample) {
      const inp = sample.input;
      const out = sample.output;
      const user = out.before.user_id;
      return {
        input: [kv([
          ["対象", el("span", null, [el("span", { class: "key", text: inp.key }), " ", code(inp.memory_id)])],
          ["呼び出し", inlineCode(`Memory.delete("${inp.memory_id}")`)],
        ])],
        output: [
          group("削除した記録", [
            memoryCard(out.before, { tag: "削除前の get", tone: "deleted" }),
            noneCard("削除後の get の戻り値：None"),
          ], { lead: `delete の戻り値：${JSON.stringify(out.delete_response)}` }),
          group(`${user} の有効な記録（get_all・${out.get_all[user].response.results.length}件）`,
            out.get_all[user].response.results.map((item) => memoryCard(item)), { lead: `一覧の件数：${countLine(out.get_all)}` }),
          group(`履歴（history・${out.history.length}件）— 削除後も残る`, out.history.map(historyCard),
            { lead: "有効な検索・一覧からは外れても、履歴には削除前の本文が残っています。" }),
        ],
      };
    },

    reopen(sample) {
      const inp = sample.input;
      const out = sample.output;
      const all = ["aya", "ken"].flatMap((u) => out.get_all[u].response.results);
      return {
        input: [
          kv([
            ["実行", `新しい Python プロセス（終了コード ${out.worker.exit_code}）`],
            ["コマンド", inlineCode(inp.command)],
          ]),
          searchInput(inp.search_call),
        ],
        output: [
          group("開き直した保存先での検索", resultCards(out.search_response.results), { ordered: true }),
          group("更新した記録と削除した記録（get）", [
            memoryCard(out.get_updated, { tag: "更新後のまま", tone: "after" }),
            noneCard(`削除した ${Object.keys(inp.memory_ids).find((k) => inp.memory_ids[k] !== out.get_updated.id) || ""} の get：None`),
          ]),
          group(`有効な記録（get_all・${countLine(out.get_all)}）`, all.map((item) => memoryCard(item)), { collapsed: true }),
        ],
      };
    },

    guard(sample) {
      const inp = sample.input;
      const out = sample.output;
      const results = out.unknown_user_response.results;
      return {
        input: [
          searchInput(inp.unknown_user_call),
          el("ol", { class: "call-list" }, inp.validation_calls.map((c) =>
            el("li", null, [el("span", { class: "key", text: CASE_LABELS[c.case] || c.case }), " ", inlineJson(c.call)]))),
        ],
        output: [
          group("未登録の利用者の検索", results.length ? resultCards(results) : [noneCard(`${results.length}件（results: []）`)]),
          group(`誤った呼び出し（${out.validation_errors.length}件）`, out.validation_errors.map(errorCard)),
        ],
      };
    },
  };

  // --- Selection ------------------------------------------------------------------------------

  function idFromHash() {
    const id = decodeURIComponent(location.hash.replace(/^#/, "")).toUpperCase();
    return IDS.includes(id) ? id : null;
  }

  // Scroll only the horizontal chooser (never the page) so the chosen button is visible.
  function revealInRow(button) {
    const row = button.parentElement;
    const left = button.offsetLeft;
    const right = left + button.offsetWidth;
    if (left < row.scrollLeft) row.scrollLeft = Math.max(0, left - 8);
    else if (right > row.scrollLeft + row.clientWidth) row.scrollLeft = right - row.clientWidth + 8;
  }

  function select(id, { focus = false } = {}) {
    const sample = state.byId.get(id);
    if (!sample) return;
    state.current = sample;
    for (const button of ui.picks) {
      const on = button.dataset.id === id;
      button.setAttribute("aria-pressed", String(on));
      if (on) revealInRow(button);
    }
    ui.operation.textContent = `${sample.id} ・ ${OPERATION_LABELS[sample.operation] || sample.operation}`;
    ui.title.textContent = sample.label;
    ui.summary.textContent = sample.summary;
    const view = VIEWS[sample.operation](sample);
    ui.inputView.replaceChildren(...view.input);
    ui.memoryList.replaceChildren(...view.output);
    ui.note.textContent = NOTES[sample.id] || "";
    ui.inputText.textContent = JSON.stringify(sample.input, null, 2);
    ui.outputText.textContent = JSON.stringify(sample.output, null, 2);
    ui.actionStatus.textContent = "";
    if (focus) ui.title.focus();
  }

  for (const button of ui.picks) {
    button.addEventListener("click", () => {
      const id = button.dataset.id;
      if (history.replaceState) history.replaceState(null, "", `#${id}`);
      select(id);
    });
  }

  window.addEventListener("hashchange", () => {
    const id = idFromHash();
    if (id && state.record) select(id, { focus: true });
  });

  // --- Actions --------------------------------------------------------------------------------

  function announce(text) {
    ui.actionStatus.textContent = "";
    // A new text node after clearing lets screen readers announce repeated messages.
    requestAnimationFrame(() => { ui.actionStatus.textContent = text; });
  }

  ui.download.addEventListener("click", () => {
    const sample = state.current;
    if (!sample) return;
    const name = `mem0-${sample.id}.json`;
    const blob = new Blob([JSON.stringify(sample, null, 2) + "\n"], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = el("a", { href: url, download: name, hidden: true });
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    announce(`${name} の保存を要求しました。`);
  });

  ui.copy.addEventListener("click", async () => {
    if (state.copying) return;
    state.copying = true;
    ui.copy.disabled = true;
    try {
      if (state.requestText == null) state.requestText = decode(await fetchBytes(FILES.request), FILES.request);
      const text = state.requestText;
      let copied = false;
      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(text);
          copied = true;
        } catch {
          copied = false;
        }
      }
      if (!copied) {
        ui.copyFallbackText.value = text;
        ui.copyFallback.hidden = false;
        ui.copyFallbackText.focus();
        ui.copyFallbackText.select();
        try {
          copied = document.execCommand("copy") === true;
        } catch {
          copied = false;
        }
      }
      if (copied) {
        ui.copyFallback.hidden = true;
        announce("依頼文をコピーしました。");
      } else {
        ui.copyFallbackText.select();
        announce("自動でコピーできませんでした。表示した全文を長押し（または選択）してコピーしてください。");
      }
    } catch (error) {
      announce(error instanceof Error ? error.message : "依頼文を読み込めませんでした。");
    } finally {
      state.copying = false;
      ui.copy.disabled = !state.record;
    }
  });

  ui.retry.addEventListener("click", load);
  load();
})();
