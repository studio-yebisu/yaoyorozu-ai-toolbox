/*
 * 八百万図AIツールボックス — Mem0 OSS example, diagram page.
 * Copyright (c) 2026 Studio Yebisu. MIT License. Diagram and page authored by Claude Opus 5.5.
 *
 * Reads the saved run record (outputs/memory-run.json), the three frozen inputs and vendor-lock.json,
 * checks them with the same coverage as comparison.js plus exact file hashes, and draws one memory-store
 * picture from the actual records. Nothing here runs Mem0, Python, a model or an AI. There is no
 * built-in fallback data: if a check fails, the picture and every dependent action are cleared.
 */
(() => {
  "use strict";

  const FILES = {
    record: "outputs/memory-run.json",
    memories: "input/memories.json",
    scenarios: "input/scenarios.json",
    modelSource: "input/model-source.json",
    lock: "vendor-lock.json",
    request: "request.txt",
  };
  // Exact bytes of the published record and lock (same values as video/assets/manifest.json).
  const PIN = {
    record: { sha256: "a2ef19d1461611c28b56824a21f30839dd45210fe285c40695624ee4447750dc", bytes: 54026 },
    lock: { sha256: "5d9c8621c664d589a4be8d9b13cadd25370811ad1e5967409cd1e9feb83a1e94", bytes: 16677, files: 156 },
  };
  const FROZEN = {
    format: "studio-yebisu-mem0-run-v1",
    repository: "mem0ai/mem0",
    commit: "0724291bd864cf807e88ee8981c8226644e8fb42",
    version: "2.2.1",
    license: "Apache-2.0",
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
  const PRIMARY = ["M02", "M03", "M05", "M06", "M07"];
  const DEFAULT_ID = "M02";
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  const HEX64 = /^[0-9a-f]{64}$/;

  const USERS = { aya: "あや", ken: "けん" };
  const KEYS = { aya: ["A01", "A02", "A03", "A04"], ken: ["K01", "K02", "K03"] };
  // Picture headings for the stored sentences. Each must match the actual stored text, or the page stops.
  const SHORT = {
    A01: { mark: "短い段落", label: () => "短い段落" },
    A02: { mark: "音声なし", label: (n) => `無音${n}秒` },
    A03: { mark: "JSON", label: () => "JSON保存" },
    A04: { mark: "仮の打ち合わせ", label: () => "仮の予定" },
    K01: { mark: "図と詳しい説明", label: () => "図と詳細" },
    K02: { mark: "ナレーション付き", label: (n) => `語り${n}秒` },
    K03: { mark: "実装コード", label: () => "コード取得" },
  };
  const QUERY_SHORT = {
    "説明を見せるとき、どんな見せ方が好み？": "見せ方は？",
    "作例動画の長さと音声は？": "動画は？",
    "説明の好みは？": "好みは？",
  };
  const TOPIC_SHORT = { video: "動画" };
  const EVENT_JA = { ADD: "追加", UPDATE: "更新", DELETE: "削除" };
  const API_LABELS = {
    add: "Memory.add（infer=False）を7回・get_all",
    search: "Memory.search",
    update: "get → update → get → history → search",
    delete: "get → delete → get → get_all → history",
    reopen: "新しい Python プロセスで Memory.from_config → search・get_all・get・history",
    guard: "Memory.search（未登録の利用者と誤った呼び出し3件）",
  };

  const $ = (id) => document.getElementById(id);
  const ui = {
    status: $("status"),
    retry: $("retry"),
    diagram: $("diagram"),
    caption: $("caption"),
    caseNote: $("case-note"),
    caseNoteText: $("case-note-text"),
    caseNoteLink: $("case-note-link"),
    choices: Array.from(document.querySelectorAll(".choices .choice")),
    compare: $("compare"),
    save: $("save-record"),
    saveLabel: $("save-label"),
    original: $("original-link"),
    actionStatus: $("action-status"),
    factsIntro: $("facts-intro"),
    facts: $("facts"),
    rawInput: $("raw-input"),
    rawOutput: $("raw-output"),
    tally: $("tally"),
    allList: $("all-list"),
    copy: $("copy"),
    copyStatus: $("copy-status"),
    fallbackLabel: $("fallback-label"),
    fallback: $("fallback"),
    runFacts: $("run-facts"),
  };
  // Every controller element must exist in index.html; stop loudly instead of half-working.
  for (const [name, node] of Object.entries(ui)) {
    if (!node || (Array.isArray(node) && node.length !== PRIMARY.length)) {
      throw new Error(`index.html に必要な要素がありません：${name}`);
    }
  }

  const DIAGRAM_IDLE = "架空の2人の好み、ひとつの保存先、検索の流れの図。記録を確かめるまで表示しません。";
  const state = { record: null, byId: new Map(), states: null, current: null, loading: false, copying: false, requestText: null, picture: null };

  // --- DOM helpers (text only; nothing from the record is parsed as HTML) ---------------------

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

  // --- Loading and checks (coverage carried over from comparison.js) --------------------------

  function check(condition, message) {
    if (!condition) throw new Error(message);
  }
  const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

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
    const url = new URL(path, document.baseURI);
    check(url.origin === new URL(document.baseURI).origin, `${path} が同じ場所のファイルではありません。`);
    let response;
    try {
      response = await fetch(url.href, { cache: "no-cache", credentials: "same-origin" });
    } catch {
      throw new Error(`${path} を取得できませんでした（通信エラー）。ファイルを直接開いた場合は、作例のフォルダーをローカルの HTTP サーバーで開いてください。`);
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
      "この閲覧環境では SHA-256 を計算できないため、記録を照合できません（https か http://localhost で開いてください）。");
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
    check(Array.isArray(samples) && same(samples.map((s) => s && s.id), IDS) && new Set(samples.map((s) => s.id)).size === IDS.length,
      "実行記録の場面が M01〜M08 の順（重複なし）ではありません。");
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
    check(same(Object.keys(ids).sort(), rows.map((r) => r.key).sort()) && Object.values(ids).every((v) => UUID.test(v)) &&
      new Set(Object.values(ids)).size === rows.length, "M01 の ID の対応を確かめられません。");
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

  // The lock the record was verified against: same commit, 156 unmodified files.
  function validateLock(lock, record) {
    check(isObject(lock) && lock.repository === FROZEN.repository && lock.commit === FROZEN.commit && lock.license === FROZEN.license,
      "vendor-lock.json の原典が固定版と一致しません。");
    const files = isObject(lock.files_sha256) ? Object.entries(lock.files_sha256) : [];
    check(files.length === PIN.lock.files && files.every(([path, sum]) => path.length > 0 && HEX64.test(sum)),
      `vendor-lock.json が${PIN.lock.files}ファイルの SHA-256 になっていません。`);
    const source = record.source || {};
    const checks = record.checks || {};
    check(source.vendor_lock_sha256 === PIN.lock.sha256 && source.files_verified === PIN.lock.files && source.license === FROZEN.license &&
      checks.source_files_verified === PIN.lock.files && checks.vendor_unchanged_after_run === true,
      "実行記録が照合した原典のロックが vendor-lock.json と一致しません。");
    check(checks.network_attempts === 0 && checks.llm_calls === 0 && checks.inputs_verified === 3 && checks.model_files_verified === FROZEN.modelFiles,
      "実行記録の通信0件・LLM 呼び出し0回・照合件数を確かめられません。");
  }

  // --- The picture model: every token, count and change comes from the verified records -----

  function durationOf(text, key) {
    const found = text.match(/(\d+)秒/);
    check(found, `${key} の本文に秒数がありません。`);
    return found[1];
  }

  function labelOf(key, text) {
    const spec = SHORT[key];
    check(spec && typeof text === "string" && text.includes(spec.mark), `${key} の本文が図の見出しと対応しません。`);
    return spec.label(spec.label.length ? durationOf(text, key) : "");
  }

  function shortQuery(query) {
    check(own(QUERY_SHORT, query), "検索の問いが想定と違います。");
    return QUERY_SHORT[query];
  }

  function keyOf(item, ids, what) {
    check(isObject(item) && isObject(item.metadata), `${what} の metadata がありません。`);
    const key = item.metadata.source_key;
    check(typeof key === "string" && own(ids, key) && ids[key] === item.id, `${what} の ID が M01 で保存した ID と一致しません。`);
    return key;
  }

  function userOfKey(key) {
    return KEYS.aya.includes(key) ? "aya" : "ken";
  }

  function activeFrom(getAll, ids, what) {
    const active = {};
    for (const user of ["aya", "ken"]) {
      for (const item of getAll[user].response.results) {
        const key = keyOf(item, ids, what);
        check(item.user_id === user && KEYS[user].includes(key) && !own(active, key), `${what} の一覧の利用者または重複が想定と違います。`);
        active[key] = item.memory;
      }
    }
    return active;
  }

  function countsOf(active) {
    return { aya: KEYS.aya.filter((k) => own(active, k)).length, ken: KEYS.ken.filter((k) => own(active, k)).length };
  }

  function resultsFrom(results, ids, filters, what) {
    return results.map((item) => {
      const key = keyOf(item, ids, what);
      check(item.user_id === filters.user_id && (!filters.topic || item.metadata.topic === filters.topic),
        `${what} の結果が絞り込みの範囲の外です。`);
      return { key, text: item.memory };
    });
  }

  function eventsOf(rows, id, expected, what) {
    check(Array.isArray(rows) && rows.every((r) => isObject(r) && r.memory_id === id) && same(rows.map((r) => r.event), expected),
      `${what} の履歴が ${expected.join("・")} になっていません。`);
    return rows.map((r) => r.event);
  }

  function buildStates(s) {
    const ids = s.M01.output.memory_ids;
    const stored = activeFrom(s.M01.output.get_all, ids, "M01");
    check(same(countsOf(stored), { aya: 4, ken: 3 }) && s.M01.input.calls.every((c) => stored[c.key] === c.messages),
      "M01 の保存結果が aya 4件・ken 3件の入力の本文になっていません。");
    const states = {};
    states.M01 = { kind: "add", active: stored, removed: null, filter: null, query: null, output: null, history: [], tray: "stored" };

    for (const id of ["M02", "M03", "M04"]) {
      const call = s[id].input.call;
      const output = resultsFrom(s[id].output.response.results, ids, call.filters, id);
      check(output.length > 0 && output.every((o) => stored[o.key] === o.text) && same(output.map((o) => o.key), s[id].output.result_keys),
        `${id} の結果が保存した本文・result_keys と一致しません。`);
      states[id] = { kind: "search", active: stored, removed: null, filter: call.filters, query: shortQuery(call.query), output, history: [] };
    }
    const ayaIds = new Set(states.M02.output.map((o) => ids[o.key]));
    check(states.M03.output.every((o) => !ayaIds.has(ids[o.key])), "M02 と M03 の結果に同じ ID があります。");

    // M05: same id, text replaced by the explicit update; the follow-up search returns the new text.
    const m05 = s.M05;
    const before = m05.output.before;
    const after = m05.output.after;
    check(before.id === ids.A02 && after.id === ids.A02 && before.memory === stored.A02 && after.memory === m05.input.update_call.text &&
      after.memory !== before.memory && before.created_at === after.created_at, "M05 の更新が「同じ ID のまま本文だけ置き換え」になっていません。");
    const h05 = eventsOf(m05.output.history, ids.A02, ["ADD", "UPDATE"], "M05");
    check(m05.output.history[1].old_memory === before.memory && m05.output.history[1].new_memory === after.memory,
      "M05 の UPDATE の履歴が更新の前後と一致しません。");
    const active05 = { ...stored, A02: after.memory };
    const out05 = resultsFrom(m05.output.search_response.results, ids, m05.input.search_call.filters, "M05");
    check(out05.length === 1 && out05[0].key === "A02" && out05[0].text === after.memory, "M05 の更新後の検索が新しい本文を返していません。");
    states.M05 = {
      kind: "update", active: active05, removed: null, filter: m05.input.search_call.filters, query: shortQuery(m05.input.search_call.query),
      output: out05, history: [{ key: "A02", events: h05 }],
      changed: { key: "A02", id: ids.A02, from: durationOf(before.memory, "A02"), to: durationOf(after.memory, "A02"), persisted: false },
    };

    // M06: get is None, A04 leaves the active lists, the history keeps ADD and DELETE.
    const m06 = s.M06;
    check(m06.output.before.id === ids.A04 && m06.output.before.memory === stored.A04 && m06.output.after === null,
      "M06 の削除の前後が想定と違います。");
    const active06 = activeFrom(m06.output.get_all, ids, "M06");
    check(!own(active06, "A04") && same(countsOf(active06), { aya: 3, ken: 3 }) && active06.A02 === after.memory,
      "M06 の一覧が「A04 なし・aya 3件・ken 3件」になっていません。");
    const h06 = eventsOf(m06.output.history, ids.A04, ["ADD", "DELETE"], "M06");
    check(m06.output.history[1].old_memory === stored.A04 && m06.output.history[1].is_deleted === true,
      "M06 の DELETE の履歴に削除前の本文が残っていません。");
    const removed = { key: "A04", text: stored.A04 };
    states.M06 = { kind: "delete", active: active06, removed, filter: null, query: null, output: null, history: [{ key: "A04", events: h06 }], tray: "getNull" };

    // M07: a fresh Python process reopened the same closed store.
    const m07 = s.M07;
    const active07 = activeFrom(m07.output.get_all, ids, "M07");
    check(!own(active07, "A04") && same(countsOf(active07), { aya: 3, ken: 3 }) && active07.A02 === after.memory &&
      m07.output.get_updated.id === ids.A02 && m07.output.get_updated.memory === after.memory && m07.output.get_deleted === null,
      "M07 の開き直しが「30秒のまま・A04 なし・aya 3件・ken 3件」になっていません。");
    const hu = eventsOf(m07.output.history_updated, ids.A02, ["ADD", "UPDATE"], "M07 A02");
    const hd = eventsOf(m07.output.history_deleted, ids.A04, ["ADD", "DELETE"], "M07 A04");
    const out07 = resultsFrom(m07.output.search_response.results, ids, m07.input.search_call.filters, "M07");
    check(out07.length === 1 && out07[0].key === "A02" && out07[0].text === after.memory, "M07 の検索が更新後の本文を返していません。");
    states.M07 = {
      kind: "reopen", active: active07, removed, filter: m07.input.search_call.filters, query: shortQuery(m07.input.search_call.query),
      output: out07, history: [{ key: "A04", events: hd }, { key: "A02", events: hu }], restart: true,
      changed: { key: "A02", id: ids.A02, from: states.M05.changed.from, to: durationOf(after.memory, "A02"), persisted: true },
    };

    // M08 ran in the same fresh process after M07, so the store is drawn as M07 left it.
    const m08 = s.M08;
    const errors = m08.output.validation_errors;
    check(m08.output.unknown_user_response.results.length === 0 && errors.length === 3 && errors.every((e) => e.type === "ValueError"),
      "M08 が「0件・ValueError 3件」になっていません。");
    states.M08 = {
      kind: "guard", active: active07, removed, filter: m08.input.unknown_user_call.filters, query: shortQuery(m08.input.unknown_user_call.query),
      output: [], history: [], errors: errors.length,
    };

    for (const id of IDS) {
      const st = states[id];
      st.id = id;
      st.counts = countsOf(st.active);
      st.labels = {};
      for (const key of [...KEYS.aya, ...KEYS.ken]) {
        const text = own(st.active, key) ? st.active[key] : st.removed && st.removed.key === key ? st.removed.text : null;
        check(text !== null, `${id} で ${key} の位置を決められません。`);
        st.labels[key] = labelOf(key, text);
      }
      st.caption = captionOf(st, s[id]);
    }
    return states;
  }

  function filterLabel(filters) {
    if (!filters) return "";
    const who = USERS[filters.user_id] || filters.user_id;
    if (!filters.topic) return own(USERS, filters.user_id) ? `${who}だけ` : who;
    check(own(TOPIC_SHORT, filters.topic), "絞り込みの topic が想定と違います。");
    return `${who}＋${TOPIC_SHORT[filters.topic]}`;
  }

  function captionOf(st, sample) {
    const list = (out) => out.map((o) => st.labels[o.key]).join("・");
    const c = st.counts;
    switch (st.id) {
      case "M01": return `M01 保存：あや${c.aya}件・けん${c.ken}件（infer=False・LLM なし）`;
      case "M02":
      case "M03": return `${st.id} ${USERS[st.filter.user_id]}の記録から${st.output.length}件：${list(st.output)}`;
      case "M04": return `M04 ${filterLabel(st.filter)}の絞り込みで${st.output.length}件：${list(st.output)}`;
      case "M05": return `M05 同じID ${st.changed.id.slice(0, 8)}… のまま ${st.changed.from}秒→${st.changed.to}秒（明示的な update）`;
      case "M06": return `M06 ${st.labels[st.removed.key]}を一覧から外す：get はなし・あや${c.aya}件・けん${c.ken}件・履歴は残る`;
      case "M07": return `M07 新しい Python プロセスで同じ保存先を開き直し：${st.labels.A02}のまま・あや${c.aya}件・けん${c.ken}件`;
      case "M08": return `M08 未登録の ${sample.input.unknown_user_call.filters.user_id} は${st.output.length}件・誤った呼び出し${st.errors}件は ValueError`;
      default: return "";
    }
  }

  // --- The picture (SVG; one connected drawing, authored for narrow and wide) ----------------

  const NS = "http://www.w3.org/2000/svg";
  const COLOR = {
    ink: "#1f2430", muted: "#5b6070", paper: "#fffdf8", ivory: "#f7f3ea", rule: "#ddd5c4",
    aya: "#0f7a70", ayaWash: "#dcefea", ken: "#6a4fc6", kenWash: "#ebe5fa", warm: "#d9692a", warmWash: "#fbe2cf", warmDeep: "#9c4416",
  };

  function sectionSlots(sec, cols, w, h, gx, gy, top) {
    return (i) => ({ x: sec.x + 8 + (i % cols) * (w + gx), y: sec.y + top + Math.floor(i / cols) * (h + gy) });
  }

  const LAYOUTS = {
    narrow: (() => {
      const sec = { aya: { x: 22, y: 130, w: 144, h: 186 }, ken: { x: 174, y: 130, w: 144, h: 186 } };
      return {
        name: "narrow", w: 340, h: 458,
        person: { aya: { x: 34, y: 30, lx: 56, anchor: "start" }, ken: { x: 306, y: 30, lx: 284, anchor: "end" }, size: 20 },
        inflow: { aya: "M34 54 L12 78 L12 200 L22 200", ken: "M306 54 L328 78 L328 200 L318 200" },
        bubble: { cx: 170, cy: 30, w: 126, h: 42, size: 17 },
        funnel: { cx: 170, cy: 90, lx: 190, ly: 96, size: 16 },
        tab: { x: 14, y: 98, w: 64, h: 24, size: 14 },
        store: { x: 14, y: 122, w: 312, h: 202 },
        sec, token: { w: 128, h: 36, size: 17, min: 12 },
        slot: { aya: sectionSlots(sec.aya, 1, 128, 36, 0, 6, 10), ken: sectionSlots(sec.ken, 1, 128, 36, 0, 6, 10) },
        routeTo: { aya: { x: 72, y: 130 }, ken: { x: 268, y: 130 } },
        drawer: { x: 14, y: 330, w: 312, h: 46, tx: 24, ty: 359, size: 15, slot: { x: 56, y: 335, k: 0.86 }, lx: 182, ly: [349, 367], lsize: 12 },
        tray: { tx: 18, ty: 398, size: 16, slots: [{ x: 8, y: 406 }, { x: 119, y: 406 }, { x: 230, y: 406 }], w: 102, h: 46, label: 16, msgSize: 17, stack: true },
        outArrow: null,
        restart: { cx: 232, cy: 122, r: 14 },
      };
    })(),
    wide: (() => {
      const sec = { aya: { x: 50, y: 148, w: 286, h: 134 }, ken: { x: 344, y: 148, w: 286, h: 134 } };
      return {
        name: "wide", w: 960, h: 372,
        person: { aya: { x: 200, y: 36, lx: 226, anchor: "start" }, ken: { x: 580, y: 36, lx: 606, anchor: "start" }, size: 26 },
        inflow: { aya: "M200 62 L200 148", ken: "M580 62 L580 148" },
        bubble: { cx: 372, cy: 36, w: 172, h: 48, size: 21 },
        funnel: { cx: 372, cy: 92, lx: 394, ly: 100, size: 20 },
        tab: { x: 40, y: 110, w: 100, h: 30, size: 19 },
        store: { x: 40, y: 140, w: 600, h: 150 },
        sec, token: { w: 133, h: 44, size: 19, min: 13 },
        slot: { aya: sectionSlots(sec.aya, 2, 133, 44, 6, 10, 16), ken: sectionSlots(sec.ken, 2, 133, 44, 6, 10, 16) },
        routeTo: { aya: { x: 230, y: 148 }, ken: { x: 452, y: 148 } },
        drawer: { x: 40, y: 298, w: 600, h: 56, tx: 56, ty: 333, size: 19, slot: { x: 112, y: 304, k: 1 }, lx: 268, ly: [322, 344], lsize: 15 },
        tray: { tx: 690, ty: 140, size: 22, slots: [{ x: 690, y: 156 }, { x: 690, y: 210 }, { x: 690, y: 264 }], w: 240, h: 44, label: 19, msgSize: 22, stack: false },
        outArrow: "M644 215 L680 215",
        restart: { cx: 484, cy: 36, r: 18 },
      };
    })(),
  };

  function svg(tag, attrs, parent) {
    const node = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs || {})) node.setAttribute(k, String(v));
    if (parent) parent.append(node);
    return node;
  }

  function stext(str, attrs, parent) {
    const node = svg("text", attrs, parent);
    node.textContent = str;
    return node;
  }

  // Rough width for one line of system Japanese text (CJK ≈ 1em, ASCII ≈ 0.6em).
  function measure(str, size) {
    let em = 0;
    for (const ch of str) em += ch.charCodeAt(0) < 0x80 ? 0.6 : 1;
    return em * size;
  }

  function fit(str, max, size, min) {
    let s = size;
    while (s > min && measure(str, s) > max) s -= 0.5;
    return s;
  }

  function place(node, x, y, k = 1) {
    node.style.transform = `translate(${x}px, ${y}px) scale(${k})`;
  }

  function person(g, x, y, color) {
    svg("circle", { cx: x, cy: y - 9, r: 10, fill: color }, g);
    svg("path", { d: `M${x - 17} ${y + 20} Q${x - 17} ${y + 3} ${x} ${y + 3} Q${x + 17} ${y + 3} ${x + 17} ${y + 20} Z`, fill: color }, g);
  }

  function arrowHead(defs, id, color) {
    const m = svg("marker", { id, viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" }, defs);
    svg("path", { d: "M1 1 L9 5 L1 9", fill: "none", stroke: color, "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round" }, m);
  }

  function tabPath(T, w) {
    return `M${T.x} ${T.y + T.h} L${T.x} ${T.y + 8} Q${T.x} ${T.y} ${T.x + 8} ${T.y} L${T.x + w - 12} ${T.y} L${T.x + w} ${T.y + T.h} Z`;
  }

  function buildPicture(L) {
    const root = svg("svg", { viewBox: `0 0 ${L.w} ${L.h}`, "aria-hidden": "true", focusable: "false", class: `is-${L.name}` });
    const defs = svg("defs", {}, root);
    arrowHead(defs, "ah-aya", COLOR.aya);
    arrowHead(defs, "ah-ken", COLOR.ken);
    arrowHead(defs, "ah-ink", COLOR.ink);
    const p = { root, L, tokens: {}, outs: [] };

    // People and their inflow into their own section.
    for (const user of ["aya", "ken"]) {
      const c = COLOR[user];
      const g = svg("g", {}, root);
      const at = L.person[user];
      person(g, at.x, at.y, c);
      stext(USERS[user], { x: at.lx, y: at.y + L.person.size * 0.36, "font-size": L.person.size, "font-weight": 800, fill: c, "text-anchor": at.anchor }, g);
      p[`in-${user}`] = svg("path", { d: L.inflow[user], fill: "none", stroke: c, "stroke-width": 2.5, "stroke-linecap": "round", "stroke-linejoin": "round", "marker-end": `url(#ah-${user})`, class: "fade" }, root);
    }

    // Query / operation bubble with its handmade icon.
    const B = L.bubble;
    p.bubble = svg("g", { class: "fade" }, root);
    svg("rect", { x: B.cx - B.w / 2, y: B.cy - B.h / 2, width: B.w, height: B.h, rx: B.h / 2, fill: COLOR.paper, stroke: COLOR.ink, "stroke-width": 2 }, p.bubble);
    svg("path", { d: `M${B.cx - 7} ${B.cy + B.h / 2 - 1} L${B.cx} ${B.cy + B.h / 2 + 8} L${B.cx + 7} ${B.cy + B.h / 2 - 1}`, fill: COLOR.paper, stroke: COLOR.ink, "stroke-width": 2, "stroke-linejoin": "round" }, p.bubble);
    p.bubbleIcon = svg("g", {}, p.bubble);
    p.bubbleText = stext("", { x: B.cx + 12, y: B.cy + B.size * 0.36, "font-size": B.size, "font-weight": 800, fill: COLOR.ink, "text-anchor": "middle" }, p.bubble);

    // Restart mark (fresh process).
    const R = L.restart;
    p.restart = svg("g", { class: "fade" }, root);
    svg("circle", { cx: R.cx, cy: R.cy, r: R.r, fill: COLOR.warm }, p.restart);
    svg("path", { d: `M${R.cx + R.r * 0.5} ${R.cy - R.r * 0.25} A${R.r * 0.55} ${R.r * 0.55} 0 1 0 ${R.cx + R.r * 0.55} ${R.cy + R.r * 0.2}`, fill: "none", stroke: COLOR.paper, "stroke-width": 2.6, "stroke-linecap": "round" }, p.restart);
    svg("path", { d: `M${R.cx + R.r * 0.18} ${R.cy - R.r * 0.42} L${R.cx + R.r * 0.56} ${R.cy - R.r * 0.24} L${R.cx + R.r * 0.42} ${R.cy - R.r * 0.66}`, fill: "none", stroke: COLOR.paper, "stroke-width": 2.4, "stroke-linecap": "round", "stroke-linejoin": "round" }, p.restart);

    // Filter funnel and the route it opens.
    const F = L.funnel;
    p.route = svg("path", { d: "", fill: "none", "stroke-width": 3, "stroke-linecap": "round", class: "fade" }, root);
    p.routeStop = svg("g", { class: "fade" }, root);
    p.funnel = svg("g", { class: "fade" }, root);
    p.funnelShape = svg("path", { d: `M${F.cx - 16} ${F.cy - 13} L${F.cx + 16} ${F.cy - 13} L${F.cx + 4} ${F.cy + 3} L${F.cx + 4} ${F.cy + 13} L${F.cx - 4} ${F.cy + 13} L${F.cx - 4} ${F.cy + 3} Z`, "stroke-linejoin": "round" }, p.funnel);
    p.funnelText = stext("", { x: F.lx, y: F.ly, "font-size": F.size, "font-weight": 800 }, p.funnel);
    svg("line", { x1: B.cx, y1: B.cy + B.h / 2 + 8, x2: F.cx, y2: F.cy - 13, stroke: COLOR.ink, "stroke-width": 2.5, "stroke-linecap": "round" }, p.funnel);

    // One persistent store with two scoped sections.
    const T = L.tab;
    const st = L.store;
    p.store = svg("g", {}, root);
    p.tab = svg("path", { d: tabPath(T, T.w), fill: COLOR.ink }, p.store);
    p.tabText = stext("保存先", { x: T.x + 8, y: T.y + T.h / 2 + T.size * 0.38, "font-size": T.size, "font-weight": 800, fill: COLOR.paper }, p.store);
    p.storeBox = svg("rect", { x: st.x, y: st.y, width: st.w, height: st.h, rx: 16, fill: COLOR.paper, stroke: COLOR.ink, "stroke-width": 3 }, p.store);
    p.sections = {};
    p.counts = {};
    for (const user of ["aya", "ken"]) {
      const s = L.sec[user];
      p.sections[user] = svg("rect", { x: s.x, y: s.y, width: s.w, height: s.h, rx: 12, fill: COLOR[`${user}Wash`], stroke: COLOR[user], "stroke-width": 2, class: "fade" }, p.store);
      const badge = svg("g", {}, root);
      // Count badge on the section's bottom edge, away from the route and the rank marks.
      svg("rect", { x: s.x + s.w - 52, y: s.y + s.h - 12, width: 46, height: 24, rx: 12, fill: COLOR[user] }, badge);
      p.counts[user] = stext("", { x: s.x + s.w - 29, y: s.y + s.h + 5, "font-size": 15, "font-weight": 800, fill: COLOR.paper, "text-anchor": "middle" }, badge);
    }

    // History drawer (SQLite history) under the store.
    const D = L.drawer;
    svg("rect", { x: D.x, y: D.y, width: D.w, height: D.h, rx: 12, fill: COLOR.ivory, stroke: COLOR.muted, "stroke-width": 1.6, "stroke-dasharray": "6 5" }, root);
    stext("履歴", { x: D.tx, y: D.ty, "font-size": D.size, "font-weight": 800, fill: COLOR.muted }, root);
    p.histLines = D.ly.map((y) => stext("", { x: D.lx, y, "font-size": D.lsize, "font-weight": 700, fill: COLOR.ink }, root));

    // Output tray.
    const O = L.tray;
    p.trayTitle = stext("", { x: O.tx, y: O.ty, "font-size": O.size, "font-weight": 800, fill: COLOR.ink }, root);
    p.trayMsg = stext("", { x: O.tx, y: O.slots[0].y + O.h * 0.7, "font-size": O.msgSize, "font-weight": 800, fill: COLOR.ink, class: "fade" }, root);
    if (L.outArrow) p.outArrow = svg("path", { d: L.outArrow, stroke: COLOR.ink, "stroke-width": 3, fill: "none", "marker-end": "url(#ah-ink)", class: "fade" }, root);

    // Tokens (same objects in every state).
    for (const user of ["aya", "ken"]) {
      for (const key of KEYS[user]) p.tokens[key] = buildToken(root, key, user, L.token.w, L.token.h, L.token.size);
    }
    for (let i = 0; i < 3; i++) p.outs.push(buildToken(root, "", "aya", O.w, O.h, O.label, O.stack));
    return p;
  }

  // A token: key badge + short heading. `stack` puts the key above the heading (narrow output tray).
  function buildToken(root, key, user, w, h, size, stack = false) {
    const g = svg("g", { class: "mv" }, root);
    const box = svg("rect", { x: 0, y: 0, width: w, height: h, rx: 10, fill: COLOR.paper, stroke: COLOR[user], "stroke-width": 2 }, g);
    const kb = stack
      ? svg("rect", { x: 6, y: 5, width: 28, height: 16, rx: 5, fill: COLOR[user] }, g)
      : svg("rect", { x: 5, y: (h - 20) / 2, width: 30, height: 20, rx: 6, fill: COLOR[user] }, g);
    const kt = stack
      ? stext(key, { x: 20, y: 17, "font-size": 10, "font-weight": 800, fill: COLOR.paper, "text-anchor": "middle" }, g)
      : stext(key, { x: 20, y: h / 2 + 4, "font-size": 11, "font-weight": 800, fill: COLOR.paper, "text-anchor": "middle" }, g);
    const label = stack
      ? stext("", { x: 8, y: h - 9, "font-size": size, "font-weight": 800, fill: COLOR.ink }, g)
      : stext("", { x: 41, y: h / 2 + size * 0.36, "font-size": size, "font-weight": 800, fill: COLOR.ink }, g);
    const tag = svg("g", { display: "none" }, g);
    const tagBox = svg("rect", { x: -6, y: -12, width: 60, height: 20, rx: 10, fill: COLOR.warm }, tag);
    const tagText = stext("", { x: 24, y: 2.5, "font-size": 13, "font-weight": 800, fill: COLOR.paper, "text-anchor": "middle" }, tag);
    const rank = svg("g", { display: "none" }, g);
    svg("circle", { cx: w - 2, cy: 2, r: 11, fill: COLOR.ink }, rank);
    const rankText = stext("", { x: w - 2, y: 6.5, "font-size": 13, "font-weight": 800, fill: COLOR.paper, "text-anchor": "middle" }, rank);
    return { g, box, kb, kt, label, tag, tagBox, tagText, rank, rankText, w, h, size, room: stack ? w - 16 : w - 47 };
  }

  function setTokenFace(t, key, user, labelText, maxSize, minSize) {
    t.kt.textContent = key;
    t.kb.setAttribute("fill", COLOR[user]);
    t.box.setAttribute("stroke", COLOR[user]);
    t.label.textContent = labelText;
    t.label.setAttribute("font-size", fit(labelText, t.room, maxSize, minSize));
  }

  // The tag sits on the top-left corner so it never covers the rank mark on the top-right.
  function setTag(t, str, fill) {
    if (!str) {
      t.tag.setAttribute("display", "none");
      return;
    }
    const w = measure(str, 13) + 18;
    t.tagBox.setAttribute("width", w);
    t.tagBox.setAttribute("fill", fill);
    t.tagText.setAttribute("x", -6 + w / 2);
    t.tagText.textContent = str;
    t.tag.setAttribute("display", "inline");
  }

  function setRank(t, n) {
    t.rank.setAttribute("display", n ? "inline" : "none");
    t.rankText.textContent = n ? String(n) : "";
  }

  function bubbleIcon(g, kind, x, y) {
    g.replaceChildren();
    const stroke = { fill: "none", stroke: COLOR.ink, "stroke-width": 2.4, "stroke-linecap": "round", "stroke-linejoin": "round" };
    if (kind === "search" || kind === "update" || kind === "reopen" || kind === "guard") {
      svg("circle", { cx: x - 2, cy: y - 2, r: 6.5, ...stroke }, g);
      svg("path", { d: `M${x + 3} ${y + 3} L${x + 8} ${y + 8}`, ...stroke }, g);
    } else if (kind === "add") {
      svg("path", { d: `M${x} ${y - 8} L${x} ${y + 8} M${x - 8} ${y} L${x + 8} ${y}`, ...stroke }, g);
    } else if (kind === "delete") {
      svg("path", { d: `M${x - 6} ${y - 6} L${x + 6} ${y + 6} M${x + 6} ${y - 6} L${x - 6} ${y + 6}`, ...stroke }, g);
    }
  }

  function historyText(entry) {
    return `${entry.key} ${entry.events.map((e) => EVENT_JA[e] || e).join("→")}`;
  }

  function drawState(st, animate) {
    const p = state.picture;
    if (!p) return;
    const L = p.L;
    ui.diagram.classList.toggle("still", !animate);
    const searching = Array.isArray(st.output) && st.filter;

    // People inflow: strong when saving, quiet otherwise.
    for (const user of ["aya", "ken"]) p[`in-${user}`].style.opacity = st.kind === "add" ? "1" : "0.35";

    // Bubble.
    const B = L.bubble;
    const op = { add: "7件を保存", delete: "ID で削除" }[st.kind] || st.query;
    p.bubbleText.textContent = op;
    p.bubbleText.setAttribute("font-size", fit(op, B.w - 44, B.size, 12));
    bubbleIcon(p.bubbleIcon, st.kind, B.cx - B.w / 2 + 20, B.cy);
    p.restart.style.opacity = st.restart ? "1" : "0";
    p.storeBox.setAttribute("stroke", st.restart ? COLOR.warm : COLOR.ink);
    const tabLabel = st.restart && L.name === "wide" ? "同じ保存先" : "保存先";
    p.tabText.textContent = tabLabel;
    p.tab.setAttribute("d", tabPath(L.tab, Math.max(L.tab.w, measure(tabLabel, L.tab.size) + 20)));

    // Filter and route.
    if (searching) {
      const F = L.funnel;
      const user = st.filter.user_id;
      const color = COLOR[user] || COLOR.ink;
      p.funnel.style.opacity = "1";
      p.funnelShape.setAttribute("fill", color);
      p.funnelText.setAttribute("fill", color);
      p.funnelText.textContent = filterLabel(st.filter);
      const to = L.routeTo[user];
      if (to) {
        p.route.setAttribute("d", `M${F.cx} ${F.cy + 13} C${F.cx} ${F.cy + 30} ${to.x} ${to.y - 22} ${to.x} ${to.y}`);
        p.route.setAttribute("stroke", color);
        p.route.setAttribute("marker-end", `url(#ah-${user})`);
        p.route.style.opacity = "1";
        p.routeStop.style.opacity = "0";
      } else {
        p.route.style.opacity = "0";
        const y = F.cy + 22;
        p.routeStop.replaceChildren();
        svg("path", { d: `M${F.cx - 7} ${y - 7} L${F.cx + 7} ${y + 7} M${F.cx + 7} ${y - 7} L${F.cx - 7} ${y + 7}`, stroke: COLOR.ink, "stroke-width": 3, "stroke-linecap": "round" }, p.routeStop);
        p.routeStop.style.opacity = "1";
      }
    } else {
      p.funnel.style.opacity = "0";
      p.route.style.opacity = "0";
      p.routeStop.style.opacity = "0";
    }

    // Sections and counts.
    for (const user of ["aya", "ken"]) {
      const scoped = !searching || st.filter.user_id === user;
      p.sections[user].style.opacity = scoped ? "1" : "0.4";
      p.sections[user].setAttribute("stroke-width", searching && scoped ? 3.5 : 2);
      p.counts[user].textContent = `${st.counts[user]}件`;
    }

    // Tokens: the same objects move, change in place, or leave for the history drawer.
    const hits = new Map((searching ? st.output : []).map((o, i) => [o.key, i + 1]));
    const T = L.token;
    for (const user of ["aya", "ken"]) {
      KEYS[user].forEach((key, i) => {
        const t = p.tokens[key];
        const active = own(st.active, key);
        setTokenFace(t, key, user, st.labels[key], T.size, T.min);
        const changed = st.changed && st.changed.key === key;
        t.box.setAttribute("fill", changed ? COLOR.warmWash : active ? COLOR.paper : COLOR.ivory);
        t.box.setAttribute("stroke", changed ? COLOR.warm : COLOR[user]);
        t.box.setAttribute("stroke-width", hits.has(key) ? 3.5 : 2);
        t.box.setAttribute("stroke-dasharray", active ? "" : "5 4");
        if (changed) setTag(t, st.changed.persisted ? `${st.changed.to}秒のまま` : `${st.changed.from}→${st.changed.to}`, COLOR.warm);
        else setTag(t, active ? "" : "一覧の外", COLOR.muted);
        setRank(t, hits.get(key) || 0);
        if (active) {
          const at = L.slot[user](i);
          place(t.g, at.x, at.y, 1);
          t.g.style.opacity = searching && !hits.has(key) ? "0.4" : "1";
        } else {
          place(t.g, L.drawer.slot.x, L.drawer.slot.y, L.drawer.slot.k);
          t.g.style.opacity = "0.85";
        }
      });
    }

    // History drawer lines.
    p.histLines.forEach((line, i) => {
      const entry = st.history[i];
      line.textContent = entry ? historyText(entry) : "";
      line.setAttribute("fill", entry ? COLOR[userOfKey(entry.key)] : COLOR.ink);
    });

    // Output tray: copies start at the stored token and travel out (only after a user action).
    const O = L.tray;
    p.trayTitle.textContent = { add: "保存した", delete: "削除のあとの get" }[st.kind] || "引き出した";
    let msg = "";
    if (st.tray === "stored") msg = `あや${st.counts.aya}件・けん${st.counts.ken}件`;
    else if (st.tray === "getNull") msg = `${st.removed.key} → なし（None）`;
    else if (st.kind === "guard") msg = `0件 ・ ValueError ×${st.errors}`;
    p.trayMsg.textContent = msg;
    p.trayMsg.setAttribute("font-size", fit(msg, L.name === "wide" ? 250 : 320, O.msgSize, 12));
    p.trayMsg.style.opacity = msg ? "1" : "0";
    if (p.outArrow) p.outArrow.style.opacity = searching && st.output.length ? "1" : "0.25";

    p.outs.forEach((t, i) => {
      const item = searching ? st.output[i] : null;
      if (!item) {
        t.g.style.opacity = "0";
        t.g.setAttribute("visibility", "hidden");
        return;
      }
      const user = userOfKey(item.key);
      t.g.setAttribute("visibility", "visible");
      setTokenFace(t, item.key, user, labelOf(item.key, item.text), O.label, 11);
      const changed = st.changed && st.changed.key === item.key;
      t.box.setAttribute("fill", changed ? COLOR.warmWash : COLOR.paper);
      t.box.setAttribute("stroke", changed ? COLOR.warm : COLOR[user]);
      setRank(t, i + 1);
      const to = O.slots[i];
      if (animate) {
        const idx = KEYS[user].indexOf(item.key);
        const from = L.slot[user](idx);
        t.g.classList.remove("mv");
        place(t.g, from.x, from.y, 1);
        t.g.style.opacity = "0";
        void t.g.getBoundingClientRect();
        t.g.classList.add("mv");
      }
      place(t.g, to.x, to.y, 1);
      t.g.style.opacity = "1";
    });
  }

  const narrowQuery = window.matchMedia("(max-width: 719px)");

  function mountPicture() {
    const L = narrowQuery.matches ? LAYOUTS.narrow : LAYOUTS.wide;
    state.picture = buildPicture(L);
    ui.diagram.classList.add("still");
    ui.diagram.replaceChildren(state.picture.root);
  }

  function clearPicture() {
    state.picture = null;
    ui.diagram.replaceChildren();
    ui.diagram.setAttribute("aria-label", DIAGRAM_IDLE);
  }

  // --- Facts for the selected case (actual values, text only) ---------------------------------

  function factRows(sample, st) {
    const inp = sample.input;
    const out = sample.output;
    const rows = [["場面", `${sample.id} ${sample.label}`], ["記録の要約", sample.summary], ["呼んだ API", API_LABELS[sample.operation] || sample.operation]];
    const call = inp.call || inp.search_call || inp.unknown_user_call;
    if (call) {
      rows.push(["問い（query）", call.query]);
      rows.push(["絞り込み（filters）", JSON.stringify(call.filters)]);
    }
    if (sample.operation === "add") {
      for (const c of inp.calls) rows.push([`${c.key}（${c.user_id}）`, `${c.messages}　ID ${out.memory_ids[c.key]}`]);
    }
    if (sample.operation === "update") {
      rows.push(["対象の ID", inp.memory_id], ["更新前", out.before.memory], ["更新後", out.after.memory], ["履歴", out.history.map((h) => h.event).join(" → ")]);
    }
    if (sample.operation === "delete") {
      rows.push(["対象の ID", inp.memory_id], ["削除した本文", out.before.memory], ["削除後の get", "None"],
        ["一覧の件数", `aya ${st.counts.aya}件・ken ${st.counts.ken}件`], ["履歴", out.history.map((h) => h.event).join(" → ")]);
    }
    if (sample.operation === "reopen") {
      rows.push(["実行", `${inp.command}（終了コード ${out.worker.exit_code}・新しいプロセス）`], ["A02 の get", out.get_updated.memory],
        ["A04 の get", "None"], ["一覧の件数", `aya ${st.counts.aya}件・ken ${st.counts.ken}件`]);
    }
    if (Array.isArray(st.output) && st.filter) {
      if (st.output.length === 0) rows.push(["返った記録", "0件（results: []）"]);
      const results = (out.response || out.search_response || out.unknown_user_response).results;
      results.forEach((r, i) => rows.push([`${i + 1}位 ${r.metadata.source_key}`, `${r.memory}　ID ${r.id}　Mem0スコア ${r.score}（順位の値・確率ではありません）`]));
    }
    if (sample.operation === "guard") {
      for (const e of out.validation_errors) rows.push([`誤った呼び出し：${e.case}`, `${e.module}.${e.type}: ${e.message}`]);
    }
    return rows;
  }

  function renderFacts(sample, st) {
    ui.factsIntro.textContent = "記録 outputs/memory-run.json のこの場面の値です。ID・スコアは丸めていません。";
    ui.facts.replaceChildren(...factRows(sample, st).map(([k, v]) => el("div", null, [el("dt", { text: k }), el("dd", { text: v })])));
    ui.rawInput.textContent = JSON.stringify(sample.input, null, 2);
    ui.rawOutput.textContent = JSON.stringify(sample.output, null, 2);
  }

  function renderStatic(record) {
    const checks = record.checks;
    const ev = checks.history_db.history_rows_by_event;
    ui.runFacts.textContent =
      `原典 ${record.source.files_verified} ファイル・入力 ${checks.inputs_verified} 件・モデル ${record.model.files_verified} ファイルを照合。` +
      `実行中の通信の試み ${record.network.total_attempts} 件・LLM の呼び出し ${checks.llm_calls} 回。` +
      `別プロセスでの読み直しの終了コード ${record.worker.exit_code}。履歴 ADD ${ev.ADD}・UPDATE ${ev.UPDATE}・DELETE ${ev.DELETE} 行。` +
      `実行 ${record.started_at}（UTC）・Python ${record.environment.python}・CPU。このページでも記録と入力の SHA-256 を計算し直して確かめています。`;
    ui.tally.textContent = "図の場面は「図」、全文は「元の記録」で開きます。";
    ui.allList.replaceChildren(...IDS.map((id) => {
      const sample = state.byId.get(id);
      return el("li", null, [
        el("a", { href: `#${id}`, text: `${id} ${sample.label}（図）` }),
        "　",
        el("a", { href: `comparison.html#${id}`, text: "元の記録" }),
      ]);
    }));
  }

  // --- Selection ------------------------------------------------------------------------------

  function idFromHash() {
    let raw = "";
    try {
      raw = decodeURIComponent(location.hash.replace(/^#/, ""));
    } catch {
      return null;
    }
    const id = raw.toUpperCase();
    return IDS.includes(id) ? id : null;
  }

  function select(id, { animate = false } = {}) {
    const sample = state.byId.get(id);
    const st = state.states && state.states[id];
    if (!sample || !st) return;
    state.current = id;
    for (const button of ui.choices) button.setAttribute("aria-pressed", String(button.dataset.case === id));
    drawState(st, animate);
    ui.caption.textContent = st.caption;
    ui.diagram.setAttribute("aria-label", `${st.caption}。図の短い言葉は、保存した本文を縮めた見出しです。`);
    const primary = PRIMARY.includes(id);
    ui.caseNote.hidden = primary;
    ui.caseNoteText.textContent = primary ? "" : `${id}「${sample.label}」は主な5場面の外です。図はこの記録の値で描いています。`;
    ui.caseNoteLink.href = `comparison.html#${id}`;
    const target = id === "M02" ? "M03" : "M02";
    ui.compare.dataset.target = target;
    ui.compare.textContent = id === "M02" ? "同じ問いをけんに" : id === "M03" ? "同じ問いをあやに" : "あやとけんを比べる";
    ui.saveLabel.textContent = `${id} の記録を保存`;
    ui.original.href = `comparison.html#${id}`;
    ui.original.textContent = `${id} を元の記録で見る`;
    renderFacts(sample, st);
    ui.actionStatus.textContent = "";
  }

  function go(id) {
    if (!state.states) return;
    if (history.replaceState) history.replaceState(null, "", `#${id}`);
    select(id, { animate: true });
  }

  for (const button of ui.choices) button.addEventListener("click", () => go(button.dataset.case));
  ui.compare.addEventListener("click", () => go(ui.compare.dataset.target || "M03"));

  window.addEventListener("hashchange", () => {
    const id = idFromHash();
    if (id && state.states) select(id, { animate: true });
  });

  narrowQuery.addEventListener("change", () => {
    if (!state.states || !state.current) return;
    mountPicture();
    select(state.current, { animate: false });
  });

  // --- Load, failure and retry ----------------------------------------------------------------

  function setStatus(name, text) {
    ui.status.dataset.state = name;
    ui.status.textContent = text;
  }

  function setActionsEnabled(enabled) {
    for (const button of ui.choices) button.disabled = !enabled;
    ui.compare.disabled = !enabled;
    ui.save.disabled = !enabled;
    ui.copy.disabled = !enabled;
  }

  function clearAll() {
    state.record = null;
    state.byId = new Map();
    state.states = null;
    state.current = null;
    setActionsEnabled(false);
    clearPicture();
    ui.caption.textContent = "";
    ui.caseNote.hidden = true;
    ui.caseNoteText.textContent = "";
    for (const button of ui.choices) button.setAttribute("aria-pressed", "false");
    ui.saveLabel.textContent = "この場面の記録を保存";
    ui.original.href = "comparison.html";
    ui.original.textContent = "元の記録で見る";
    ui.actionStatus.textContent = "";
    ui.factsIntro.textContent = "記録を読み込むと、選んだ場面の実際の値を表示します。";
    ui.facts.replaceChildren();
    ui.rawInput.textContent = "";
    ui.rawOutput.textContent = "";
    ui.tally.textContent = "記録を読み込むと、場面の一覧を表示します。";
    ui.allList.replaceChildren();
    ui.runFacts.textContent = "記録を読み込むと表示します。";
    ui.copyStatus.textContent = "";
    ui.fallbackLabel.hidden = true;
    ui.fallback.hidden = true;
    ui.fallback.value = "";
  }

  async function load() {
    if (state.loading) return;
    state.loading = true;
    ui.retry.hidden = true;
    ui.retry.disabled = true;
    clearAll();
    setStatus("loading", "保存済みの実行結果を確かめています…");
    try {
      const paths = [FILES.record, FILES.memories, FILES.scenarios, FILES.modelSource, FILES.lock];
      const bytes = await Promise.all(paths.map(fetchBytes));
      const recordSum = await sha256Hex(bytes[0]);
      check(recordSum === PIN.record.sha256 && bytes[0].byteLength === PIN.record.bytes,
        `${FILES.record} の SHA-256 またはバイト数が公開した記録と一致しません。`);
      const lockSum = await sha256Hex(bytes[4]);
      check(lockSum === PIN.lock.sha256 && bytes[4].byteLength === PIN.lock.bytes,
        `${FILES.lock} の SHA-256 またはバイト数が固定した値と一致しません。`);
      const [record, memories, scenarios, modelSource, lock] = bytes.map((b, i) => parseJson(b, paths[i]));
      const hashes = {};
      for (const [i, path] of paths.entries()) {
        if (path in FROZEN.inputs) hashes[path] = await sha256Hex(bytes[i]);
      }
      const byId = validate(record, memories, scenarios, modelSource, hashes);
      validateLock(lock, record);
      let states;
      try {
        states = buildStates(byId);
      } catch (error) {
        throw new Error(`図に使う値を確かめられません：${error instanceof Error ? error.message : String(error)}`);
      }
      state.record = record;
      state.byId = new Map(Object.entries(byId));
      state.states = states;
      renderStatic(record);
      mountPicture();
      setActionsEnabled(true);
      select(idFromHash() || DEFAULT_ID, { animate: false });
      setStatus("ready", "照合済み：記録・入力3件・原典156ファイルのロック。保存済みの実行結果を図にしています。");
    } catch (error) {
      clearAll();
      setStatus("error", `記録を表示できません：${error instanceof Error ? error.message : String(error)} 内蔵の代わりのデータは使いません。`);
      ui.retry.hidden = false;
    } finally {
      state.loading = false;
      ui.retry.disabled = false;
    }
  }

  // --- Actions --------------------------------------------------------------------------------

  function announce(node, text) {
    node.textContent = "";
    // A new text node after clearing lets screen readers announce repeated messages.
    requestAnimationFrame(() => { node.textContent = text; });
  }

  // Same envelope as comparison.js: the selected original sample, 2-space JSON and a final newline.
  ui.save.addEventListener("click", () => {
    const sample = state.current && state.byId.get(state.current);
    if (!sample || !state.record) return;
    const name = `mem0-${sample.id}.json`;
    const blob = new Blob([JSON.stringify(sample, null, 2) + "\n"], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = el("a", { href: url, download: name, hidden: true });
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    announce(ui.actionStatus, `${name} の保存を要求しました。`);
  });

  ui.copy.addEventListener("click", async () => {
    if (state.copying || !state.record) return;
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
        ui.fallback.value = text;
        ui.fallbackLabel.hidden = false;
        ui.fallback.hidden = false;
        ui.fallback.focus();
        ui.fallback.select();
        try {
          copied = document.execCommand("copy") === true;
        } catch {
          copied = false;
        }
      }
      if (copied) {
        ui.fallbackLabel.hidden = true;
        ui.fallback.hidden = true;
        announce(ui.copyStatus, "依頼文をコピーしました。");
      } else {
        ui.fallback.select();
        announce(ui.copyStatus, "自動でコピーできませんでした。表示した全文を長押し（または選択）してコピーしてください。");
      }
    } catch (error) {
      announce(ui.copyStatus, error instanceof Error ? error.message : "依頼文を読み込めませんでした。");
    } finally {
      state.copying = false;
      ui.copy.disabled = !state.record;
    }
  });

  ui.retry.addEventListener("click", load);
  load();
})();
