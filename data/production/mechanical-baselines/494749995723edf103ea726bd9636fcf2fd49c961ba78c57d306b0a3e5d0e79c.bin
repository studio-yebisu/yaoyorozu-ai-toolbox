/*
 * 八百万図AIツールボックス — Claude-Mem example viewer.
 * Copyright (c) 2026 Studio Yebisu. MIT License.
 *
 * Reads the saved run record (outputs/memory-run.json), the two frozen inputs and
 * vendor-lock.json, checks them, and shows each scenario's actual tool output and returned
 * memories. Nothing here runs Claude-Mem, Bun or a model, and there is no built-in fallback
 * data: if a check fails, results stay hidden. Data is written with textContent only.
 */
(() => {
  "use strict";

  const FILES = {
    record: "outputs/memory-run.json",
    notes: "input/notes.json",
    scenarios: "input/scenarios.json",
    lock: "vendor-lock.json",
    request: "request.txt",
  };
  const FROZEN = {
    format: "studio-yebisu-claude-mem-run-v1",
    repository: "thedotmack/claude-mem",
    commit: "fef3402e674bebbf72a23aeb735e91c92cd34afd",
    version: "13.39.0",
    lockSha256: "d0f19c3060cc9d95443974a6916b07880b7f6e6fda9ae1c32888f582edbe5a89",
    lockFiles: 194,
    inputs: {
      "input/notes.json": "615600356841c0f3a7d8bf55773f2a6869da320a9c03ae2c9552df15be38e5f3",
      "input/scenarios.json": "29f4d0ad731aae355a160a6896c799af502236221f7bff2736038f5a044fd3fd",
    },
  };
  const IDS = ["C01", "C02", "C03", "C04", "C05", "C06", "C07", "C08"];
  const DEFAULT_ID = "C03";
  const STAGES = {
    C01: ["index"], C02: [], C03: ["index"], C04: ["context"], C05: ["details"],
    C06: ["index", "context", "details"], C07: ["index", "context", "details"], C08: [],
  };
  const KICKERS = {
    C01: "手順1 索引 ・ 保存の前",
    C02: "保存 ・ 関連検索のあとで saveMemory",
    C03: "手順1 索引 ・ 題名だけ",
    C04: "手順2 文脈 ・ 前後の題名",
    C05: "手順3 本文 ・ 選んだ1件",
    C06: "自動モード ・ 3段階をまとめて実行",
    C07: "新しいプロセス ・ 同じ保存先",
    C08: "拒否の確認",
  };
  const CAPTIONS = {
    empty_search: "保存前の索引",
    index: "手順1 索引",
    context: "手順2 前後の文脈",
    details: "手順3 選んだ本文",
    parent_control_before_close: "閉じる直前・同じプロセスで C03 の合図を使う",
    worker_guided_index: "新しいプロセス・索引",
    worker_old_continuation: "新しいプロセス・前のプロセスの合図を使う",
    foreign_selected_id: "前の索引にない N04 の ID を選ぶ",
    modified_continuation: "合図を1文字だけ変える",
    changed_scope: "続きの途中で project を変える",
    too_long_query: "501文字の質問",
    unregistered_project: "未登録のプロジェクトを自動検索",
  };
  const OPERATION_JA = { search: "索引", timeline: "文脈", fetch: "本文" };

  const $ = (id) => document.getElementById(id);
  const ui = {
    status: $("status"),
    errorBox: $("error-box"),
    errorText: $("error-text"),
    retry: $("retry"),
    viewer: $("viewer"),
    picks: Array.from(document.querySelectorAll("#sample-list .pick")),
    picker: $("sample-select"),
    stages: Array.from(document.querySelectorAll(".stage")),
    kicker: $("sample-kicker"),
    title: $("sample-title"),
    summary: $("summary"),
    toolText: $("tool-text"),
    memoryList: $("memory-list"),
    download: $("download-record"),
    copy: $("copy-request"),
    actionStatus: $("action-status"),
    copyFallback: $("copy-fallback"),
    copyFallbackText: $("copy-fallback-text"),
    inputText: $("input-text"),
    outputText: $("output-text"),
    runFacts: $("run-facts"),
  };
  const state = { record: null, byId: new Map(), keyById: new Map(), current: idFromHash() ?? DEFAULT_ID, loading: false, copying: false, requestText: null };

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

  function chip(text, variant) {
    return el("span", { class: variant ? `chip ${variant}` : "chip", text });
  }

  function memoryCard({ title, key, project, meta, body, variant, flags }) {
    return el("div", { class: variant ? `memory ${variant}` : "memory" }, [
      el("p", { class: "memory-head" }, [
        el("span", { class: "memory-title", text: title }),
        key ? chip(key, "is-key") : null,
        project ? chip(project) : null,
        ...(flags ?? []).map((flag) => chip(flag, "is-flag")),
      ]),
      meta ? el("p", { class: "memory-meta", text: meta }) : null,
      body ? el("p", { class: "memory-body", text: body }) : null,
    ]);
  }

  function totalLine(text) {
    return el("p", { class: "memory-total", text });
  }

  // --- Loading and checks ---------------------------------------------------------------------

  function check(condition, message) {
    if (!condition) throw new Error(message);
  }

  async function fetchBytes(url) {
    let response;
    try {
      response = await fetch(url, { cache: "no-store" });
    } catch {
      throw new Error(`${url} を読み込めませんでした（通信できませんでした）。`);
    }
    if (!response.ok) throw new Error(`${url} を読み込めませんでした（HTTP ${response.status}）。`);
    return new Uint8Array(await response.arrayBuffer());
  }

  function decode(bytes, name) {
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      throw new Error(`${name} が UTF-8 の文字として読めません。`);
    }
  }

  function parseJson(bytes, name) {
    try {
      return JSON.parse(decode(bytes, name));
    } catch (error) {
      if (error instanceof SyntaxError) throw new Error(`${name} が正しい JSON ではありません。`);
      throw error;
    }
  }

  async function sha256Hex(bytes) {
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  function callMap(list) {
    return new Map((Array.isArray(list) ? list : []).map((item) => [item.name, item]));
  }

  function validate(record, notes, scenarios, lock, digests) {
    check(record && typeof record === "object", "実行記録が空です。");
    check(record.format === FROZEN.format, "実行記録の形式が違います。");
    const source = record.source ?? {};
    check(source.repository === FROZEN.repository && source.commit === FROZEN.commit && source.version === FROZEN.version,
      "実行記録の原典・固定コミット・版が、このページの固定版と一致しません。");
    check(record.source_lock_sha256 === FROZEN.lockSha256 && digests.lock === FROZEN.lockSha256,
      "vendor-lock.json の SHA-256 が実行記録と一致しません。");
    check(lock.repository === FROZEN.repository && lock.commit === FROZEN.commit && lock.version === FROZEN.version
      && Array.isArray(lock.files) && lock.files.length === FROZEN.lockFiles, "vendor-lock.json の固定版または件数が違います。");
    const inputs = record.input_sha256 ?? {};
    check(Object.keys(inputs).sort().join(",") === Object.keys(FROZEN.inputs).sort().join(","), "実行記録の入力ハッシュの項目が違います。");
    for (const [name, expected] of Object.entries(FROZEN.inputs)) {
      check(inputs[name] === expected, `${name} の SHA-256 が実行記録と固定値で一致しません。`);
      check(digests[name] === expected, `読み込んだ ${name} の SHA-256 が固定値と一致しません。`);
    }
    check(notes.format === "studio-yebisu-claude-mem-notes-v1" && notes.fictional === true && Array.isArray(notes.notes) && notes.notes.length === 5,
      "input/notes.json の形が違います。");
    check(scenarios.format === "studio-yebisu-claude-mem-scenarios-v1" && Array.isArray(scenarios.scenarios)
      && scenarios.scenarios.map((item) => item.id).join(",") === IDS.join(","), "input/scenarios.json の場面が C01〜C08 ではありません。");

    check(Array.isArray(record.samples) && record.samples.length === IDS.length, "実行記録の場面が8件ではありません。");
    const ids = record.samples.map((item) => item.id);
    check(ids.join(",") === IDS.join(",") && new Set(ids).size === IDS.length, "実行記録の場面IDが C01〜C08 の順になっていません。");
    record.samples.forEach((item, index) => {
      check(item.label === scenarios.scenarios[index].label, `${item.id} の名前が input/scenarios.json と一致しません。`);
      check(item.input && typeof item.input === "object" && item.output && typeof item.output === "object", `${item.id} に入力または出力がありません。`);
      check(typeof item.summary === "string" && item.summary.length > 0, `${item.id} に要約がありません。`);
      check(Array.isArray(item.checks) && item.checks.length > 0 && item.checks.every((entry) => entry.passed === true), `${item.id} の確認が合格していません。`);
    });

    const checks = record.checks ?? {};
    check(checks.passed === true, "実行記録の確認が合格になっていません。");
    check(Number.isInteger(checks.total) && checks.total > 0 && checks.total === checks.expected_total, "確認の件数が予定の件数と一致しません。");
    check(Array.isArray(checks.items) && checks.items.length === checks.total && checks.items.every((item) => item.passed === true), "確認の一覧が合計と一致しないか、不合格があります。");
    for (const item of record.samples) {
      check(checks.by_sample?.[item.id] === item.checks.length, `${item.id} の確認件数が一覧と一致しません。`);
    }
    check(record.guards?.all_attempts_total === 0 && record.guards?.network_attempts_total === 0, "通信・サーバー・プロセスの試みが0件ではありません。");
    check(record.process?.fresh_process === true && record.process?.own_worker_spawns === 1, "新しいプロセスでの読み直しが確認されていません。");

    const saves = callMap(record.samples[1].output.calls);
    notes.notes.forEach((note) => {
      const saved = saves.get(`save:${note.key}`)?.result;
      check(saved && saved.title === note.title && saved.project === note.project && String(saved.id) === record.ids?.[note.key],
        `C02 の ${note.key} の保存結果が入力と一致しません。`);
    });
  }

  function setStatus(kind, text) {
    ui.status.dataset.state = kind;
    ui.status.textContent = text;
  }

  function setReady(ready) {
    for (const pick of ui.picks) pick.disabled = !ready;
    ui.picker.disabled = !ready;
    ui.download.disabled = !ready;
    ui.copy.disabled = !ready || state.copying;
    if (!ready) {
      ui.viewer.hidden = true;
      ui.toolText.replaceChildren();
      ui.memoryList.replaceChildren();
      ui.inputText.textContent = "";
      ui.outputText.textContent = "";
      ui.runFacts.replaceChildren();
      ui.actionStatus.textContent = "";
      ui.copyFallback.hidden = true;
    }
  }

  async function load() {
    if (state.loading) return;
    state.loading = true;
    state.record = null;
    state.byId = new Map();
    ui.retry.disabled = true;
    ui.errorBox.hidden = true;
    setReady(false);
    setStatus("loading", "実行記録と入力を読み込み、照合しています…");
    try {
      if (!globalThis.crypto?.subtle) {
        throw new Error("このブラウザーでは SHA-256 を計算できないため、記録を確かめられません。https または localhost で開いてください。");
      }
      const [recordBytes, notesBytes, scenariosBytes, lockBytes] = await Promise.all(
        [FILES.record, FILES.notes, FILES.scenarios, FILES.lock].map(fetchBytes));
      const [notesSha, scenariosSha, lockSha] = await Promise.all([notesBytes, scenariosBytes, lockBytes].map(sha256Hex));
      const record = parseJson(recordBytes, FILES.record);
      const notes = parseJson(notesBytes, FILES.notes);
      const scenarios = parseJson(scenariosBytes, FILES.scenarios);
      const lock = parseJson(lockBytes, FILES.lock);
      validate(record, notes, scenarios, lock, { "input/notes.json": notesSha, "input/scenarios.json": scenariosSha, lock: lockSha });

      state.record = record;
      state.byId = new Map(record.samples.map((item) => [item.id, item]));
      state.keyById = new Map(Object.entries(record.ids).map(([key, id]) => [String(id), key]));
      setStatus("ready", "8場面の実行記録を表示しています。");
      renderFacts(record);
      setReady(true);
      select(idFromHash() ?? state.current);
    } catch (error) {
      state.record = null;
      setReady(false);
      setStatus("error", "実行記録を表示できません。");
      ui.errorText.textContent = error instanceof Error ? error.message : String(error);
      ui.errorBox.hidden = false;
    } finally {
      state.loading = false;
      ui.retry.disabled = false;
    }
  }

  // --- Rendering ------------------------------------------------------------------------------

  function idFromHash() {
    let id = "";
    try { id = decodeURIComponent(location.hash.replace(/^#/, "")).toUpperCase(); } catch { return null; }
    return IDS.includes(id) ? id : null;
  }

  function keyOf(id) {
    return state.keyById.get(String(id)) ?? null;
  }

  function captionFor(name, args) {
    if (name.startsWith("related_search:")) return `${name.slice(15)} を保存する前の関連検索「${args?.query ?? ""}」`;
    if (name.startsWith("auto:")) return `自動モード・${name.slice(5)}「${args?.query ?? ""}」`;
    if (name === "worker_auto") return `新しいプロセス・自動検索「${args?.query ?? ""}」`;
    return CAPTIONS[name] ?? name;
  }

  function renderToolText(sample) {
    const inputs = callMap(sample.input.calls);
    const blocks = [];
    for (const call of sample.output.calls) {
      const payload = call.tool_result ?? call.tool_error;
      const text = payload?.content?.[0]?.text;
      if (typeof text !== "string") continue;
      blocks.push(el("figure", { class: call.tool_error ? "tool-block is-error" : "tool-block" }, [
        el("figcaption", { text: captionFor(call.name, inputs.get(call.name)?.args) }),
        el("pre", { tabindex: "0", text }),
      ]));
    }
    ui.toolText.replaceChildren(...blocks);
  }

  function indexCards(rows, options = {}) {
    return rows.map((row) => memoryCard({
      title: row.title,
      key: keyOf(row.id),
      project: row.project,
      meta: `ID ${row.id}`,
      variant: options.variant,
      flags: options.selected?.includes(row.id) ? ["選んだ記録"] : [],
    }));
  }

  function bodyCard(row, flags, meta) {
    return memoryCard({
      title: row.title, key: keyOf(row.id), project: row.project,
      meta: meta ?? `ID ${row.id}${row.truncated ? " ・ 予算に合わせて短縮" : ""}`,
      body: row.content, flags,
    });
  }

  const RENDERERS = {
    C01(sample, out) {
      const result = out.get("empty_search").result;
      return [memoryCard({
        title: `見つかった記憶 ${result.index.length}件`, variant: "is-empty",
        meta: `本文 ${result.observations.length}件 ・ complete: ${result.complete} ・ reason: ${result.reason}`,
      })];
    },
    C02(sample, out) {
      const record = state.record;
      const cards = [];
      for (const key of Object.keys(record.ids)) {
        const saved = out.get(`save:${key}`).result;
        const related = out.get(`related_search:${key}`).result;
        const found = related.index.map((row) => `${keyOf(row.id) ?? row.id}「${row.title}」`).join("、");
        cards.push(memoryCard({
          title: saved.title, key, project: saved.project,
          meta: `ID ${saved.id} ・ 保存前の関連検索「${related.query}」${related.index.length}件${found ? `：${found}` : ""}`,
        }));
      }
      const replay = out.get("replay:N01").result;
      cards.push(memoryCard({
        title: "N01 を同じ依頼で再送", variant: "is-context",
        flags: [`duplicate: ${replay.duplicate}`],
        meta: `ID ${replay.id} ・ ${replay.message}`,
      }));
      const audit = sample.output.sql_audit_after;
      const projects = Object.entries(audit.observations_by_project).map(([name, n]) => `${name} ${n}件`).join(" ・ ");
      cards.push(totalLine(`保存後の件数（SQLでの監査）：${audit.observations}件（${projects}）。要約 ${audit.session_summaries}件・プロンプト ${audit.user_prompts}件。`));
      return cards;
    },
    C03(sample, out) {
      const result = out.get("index").result;
      return [...indexCards(result.index), totalLine(`本文 ${result.observations.length}件。この段階では題名と ID だけが返ります。`)];
    },
    C04(sample, out) {
      const result = out.get("context").result;
      const selected = sample.input.calls.find((call) => call.name === "context").args.selectedIds.map(String);
      return [...indexCards(result.index, { variant: "is-context", selected }), totalLine(`本文 ${result.observations.length}件。選んだ記録の前後${result.index.length - 1}件の題名です。`)];
    },
    C05(sample, out) {
      const result = out.get("details").result;
      return result.observations.map((row) => bodyCard(row));
    },
    C06(sample, out) {
      const cards = [];
      for (const call of sample.output.calls) {
        const result = call.result;
        for (const row of result.observations) {
          cards.push(bodyCard(row, [], `ID ${row.id} ・ 実行した段階：${result.trace.map((item) => OPERATION_JA[item.operation] ?? item.operation).join(" → ")}`));
        }
      }
      cards.push(totalLine("project の指定は検索範囲を分けるもので、認証やアクセス制御ではありません。"));
      return cards;
    },
    C07(sample, out) {
      const record = state.record;
      const worker = sample.output.worker;
      const cards = [];
      const control = out.get("parent_control_before_close").result;
      cards.push(totalLine(`閉じる直前の同じプロセスでは、C03 の合図で手順${control.step}へ進めました。その後データベースを閉じ、新しいプロセス（${worker.fresh_process ? "PID が異なることを確認" : "未確認"}）で開き直しています。`));
      for (const row of out.get("worker_auto").result.observations) {
        cards.push(bodyCard(row, row.id === record.ids.N02 ? ["保存時と同じ ID"] : []));
      }
      const guided = out.get("worker_guided_index").result;
      cards.push(...indexCards(guided.index, { variant: "is-context" }));
      const old = out.get("worker_old_continuation").error;
      cards.push(memoryCard({ title: "前のプロセスの合図", variant: "is-rejected", flags: [old.code], body: old.message }));
      const audit = worker.sql_audit;
      const projects = Object.entries(audit.observations_by_project).map(([name, n]) => `${name} ${n}件`).join(" ・ ");
      cards.push(totalLine(`新しいプロセスで数えた件数：${audit.observations}件（${projects}）。`));
      return cards;
    },
    C08(sample, out) {
      const inputs = callMap(sample.input.calls);
      const cards = [];
      for (const call of sample.output.calls) {
        if (call.error) {
          cards.push(memoryCard({ title: captionFor(call.name, inputs.get(call.name)?.args), variant: "is-rejected", flags: [call.error.code], body: call.error.message }));
        } else if (call.result) {
          cards.push(memoryCard({
            title: captionFor(call.name, inputs.get(call.name)?.args), variant: "is-empty",
            meta: `索引 ${call.result.index.length}件 ・ 本文 ${call.result.observations.length}件 ・ reason: ${call.result.reason}`,
          }));
        }
      }
      return cards;
    },
  };

  function render(sample) {
    ui.picker.value = sample.id;
    for (const pick of ui.picks) pick.setAttribute("aria-pressed", String(pick.dataset.id === sample.id));
    const stages = STAGES[sample.id] ?? [];
    for (const stage of ui.stages) {
      if (stages.includes(stage.dataset.stage)) stage.setAttribute("aria-current", "step");
      else stage.removeAttribute("aria-current");
    }
    ui.kicker.textContent = `${sample.id} ・ ${KICKERS[sample.id] ?? ""}`;
    ui.title.textContent = sample.label;
    ui.summary.textContent = sample.summary;
    renderToolText(sample);
    ui.memoryList.replaceChildren(...RENDERERS[sample.id](sample, callMap(sample.output.calls)));
    ui.inputText.textContent = JSON.stringify(sample.input, null, 2);
    ui.outputText.textContent = JSON.stringify(sample.output, null, 2);
    ui.actionStatus.textContent = "";
    ui.copyFallback.hidden = true;
    ui.viewer.hidden = false;
  }

  function renderFacts(record) {
    const rows = [
      ["実行環境", `Bun ${record.runtime.bun} ・ ${record.runtime.platform} ${record.runtime.arch}`],
      ["依存", Object.entries(record.runtime.dependencies).map(([name, version]) => `${name} ${version}`).join("、")],
      ["原典の照合", `${record.source_files_verified.count}ファイル（SHA-256・サイズ・Git blob）`],
      ["通信の試み", `${record.guards.network_attempts_total}件（親と新しいプロセスの合計）`],
      ["実行の順", record.execution_order.join(" → ")],
      ["記録の作成", record.generated_at],
    ];
    ui.runFacts.replaceChildren(...rows.map(([label, value]) =>
      el("div", { class: "kv-row" }, [el("dt", { text: label }), el("dd", { text: value })])));
  }

  function select(id) {
    state.current = IDS.includes(id) ? id : DEFAULT_ID;
    const sample = state.byId.get(state.current);
    if (sample) render(sample);
  }

  // --- Actions --------------------------------------------------------------------------------

  function downloadRecord() {
    const sample = state.byId.get(state.current);
    if (!sample) return;
    const name = `claude-mem-${sample.id}.json`;
    const url = URL.createObjectURL(new Blob([JSON.stringify(sample, null, 2) + "\n"], { type: "application/json" }));
    const link = el("a", { href: url, download: name, hidden: true });
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    ui.actionStatus.textContent = `${name} の保存をブラウザーに渡しました。`;
  }

  async function copyRequest() {
    if (state.copying || !state.record) return;
    state.copying = true;
    ui.copy.disabled = true;
    ui.copyFallback.hidden = true;
    ui.actionStatus.textContent = "依頼文を読み込んでいます…";
    try {
      if (state.requestText === null) state.requestText = decode(await fetchBytes(FILES.request), FILES.request);
    } catch (error) {
      ui.actionStatus.textContent = error instanceof Error ? error.message : String(error);
      state.copying = false;
      ui.copy.disabled = !state.record;
      return;
    }
    try {
      if (!navigator.clipboard?.writeText) throw new Error("clipboard unavailable");
      await navigator.clipboard.writeText(state.requestText);
      ui.actionStatus.textContent = "依頼文をコピーしました。";
    } catch {
      ui.copyFallbackText.value = state.requestText;
      ui.copyFallback.hidden = false;
      ui.copyFallbackText.focus();
      ui.copyFallbackText.select();
      let copied = false;
      try { copied = document.execCommand("copy"); } catch { copied = false; }
      ui.actionStatus.textContent = copied ? "依頼文をコピーしました。" : "自動ではコピーできませんでした。";
      if (copied) ui.copyFallback.hidden = true;
    } finally {
      state.copying = false;
      ui.copy.disabled = !state.record;
    }
  }

  for (const pick of ui.picks) {
    pick.addEventListener("click", () => {
      const id = pick.dataset.id;
      if (location.hash === `#${id}`) select(id);
      else location.hash = id;
    });
  }
  ui.picker.addEventListener("change", () => {
    const id = ui.picker.value;
    if (location.hash === `#${id}`) select(id);
    else location.hash = id;
  });
  window.addEventListener("hashchange", () => {
    const id = idFromHash();
    if (id) select(id);
  });
  ui.retry.addEventListener("click", load);
  ui.download.addEventListener("click", downloadRecord);
  ui.copy.addEventListener("click", copyRequest);

  load();
})();
