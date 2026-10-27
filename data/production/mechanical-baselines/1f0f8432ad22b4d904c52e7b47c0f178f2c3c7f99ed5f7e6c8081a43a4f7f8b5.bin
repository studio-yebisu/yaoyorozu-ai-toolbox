/*
 * 八百万図AIツールボックス — Claude-Mem 作例・図で読む保存済みの実行結果
 * Copyright (c) 2026 Studio Yebisu. MIT License.
 *
 * Reads the saved original run record (outputs/memory-run.json), the two frozen inputs and
 * vendor-lock.json, checks bytes, pins and schema, then draws ONE connected library picture for the
 * chosen scenario: a query lens, one SQLite store with two project shelves, three gates
 * 題名 → 前後 → 本文, and the tray where the returned notes land. Every title, ID, order, count and
 * error code is read from the record. Nothing here runs Claude-Mem, Bun or a model, and there is no
 * built-in fallback data: if a check fails, the picture and the record stay hidden.
 * Record text is written with textContent only.
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
    recordSha256: "efd1001c68b48e7ccde9fc3858defac43175f43a73086c538062d13c1a9b931c",
    lockSha256: "d0f19c3060cc9d95443974a6916b07880b7f6e6fda9ae1c32888f582edbe5a89",
    lockFiles: 194,
    inputs: {
      "input/notes.json": "615600356841c0f3a7d8bf55773f2a6869da320a9c03ae2c9552df15be38e5f3",
      "input/scenarios.json": "29f4d0ad731aae355a160a6896c799af502236221f7bff2736038f5a044fd3fd",
    },
  };
  const IDS = ["C01", "C02", "C03", "C04", "C05", "C06", "C07", "C08"];
  const NOTE_KEYS = ["N01", "N02", "N03", "N04", "N05"];
  const DEFAULT_ID = "C03";
  // The main button walks the guided route, then compares scopes and the reopened store.
  const NEXT = {
    C01: ["C03", "題名から見る"],
    C02: ["C03", "題名から見る"],
    C03: ["C04", "次へ：前後を見る"],
    C04: ["C05", "次へ：本文を開く"],
    C05: ["C06", "別の案件と比べる"],
    C06: ["C07", "開き直して探す"],
    C07: ["C03", "題名に戻る"],
    C08: ["C03", "題名から見る"],
  };
  const CASE_TAG = {
    C01: "C01 保存の前", C02: "C02 保存", C03: "C03 題名", C04: "C04 前後",
    C05: "C05 本文", C06: "C06 案件", C07: "C07 開き直す", C08: "C08 拒否",
  };
  // Picture labels. Each is checked at load to be a literal part of the actual title or note.
  const SPINE = { N01: "下余白", N02: "動画", N03: "JSON", N04: "図", N05: "PDF" };
  const EXCERPT = { N01: "ボタンは44px以上にし、本文をバーで隠さない。", N02: "playsinline と controls を付ける。" };
  const PROJECT_JA = { "sakura-site": "さくらサイト", "tsubaki-docs": "つばき資料" };
  const PROJECT_ORDER = ["sakura-site", "tsubaki-docs"];
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
  const GUARD_JA = {
    foreign_selected_id: "前の索引にないID",
    modified_continuation: "1文字変えた合図",
    changed_scope: "途中で案件を変える",
    too_long_query: "501文字の質問",
    unregistered_project: "未登録の案件",
  };

  const $ = (id) => document.getElementById(id);
  const ui = {
    status: $("status"),
    errorBox: $("error-box"),
    errorText: $("error-text"),
    retry: $("retry"),
    figure: $("figure"),
    svg: $("diagram"),
    svgTitle: $("diagram-title"),
    svgDesc: $("diagram-desc"),
    root: $("diagram-root"),
    cases: Array.from(document.querySelectorAll("#case-list .case")),
    next: $("next-step"),
    download: $("download-record"),
    actionStatus: $("action-status"),
    caseTag: $("case-tag"),
    captionText: $("caption-text"),
    summary: $("summary"),
    toolText: $("tool-text"),
    inputText: $("input-text"),
    outputText: $("output-text"),
    comparison: $("comparison-link"),
    recordLinks: Array.from(document.querySelectorAll("#record-list a[data-id]")),
    copy: $("copy-request"),
    copyStatus: $("copy-status"),
    copyFallback: $("copy-fallback"),
    copyFallbackText: $("copy-fallback-text"),
    runFacts: $("run-facts"),
  };
  for (const [name, node] of Object.entries(ui)) {
    if (!node || (Array.isArray(node) && node.length === 0)) throw new Error(`index.html に必要な要素がありません：${name}`);
  }

  const state = {
    record: null, notes: null, byId: new Map(), keyById: new Map(), noteByKey: new Map(),
    current: idFromHash() ?? DEFAULT_ID, loading: false, copying: false, requestText: null, rects: new Map(),
  };
  const reducedMotion = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: true };

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

  // Same checks as comparison.js, plus the pinned bytes of the record itself.
  function validate(record, notes, scenarios, lock, digests) {
    check(digests.record === FROZEN.recordSha256, "outputs/memory-run.json の SHA-256 が固定値と一致しません。");
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

    validatePicture(record, notes);
  }

  // What the picture relies on: the five keys, two scopes, short labels and excerpts must be
  // literally present in the actual record, and every drawn row must map back to a saved note.
  function validatePicture(record, notes) {
    check(Object.keys(record.ids ?? {}).join(",") === NOTE_KEYS.join(",") && notes.notes.map((n) => n.key).join(",") === NOTE_KEYS.join(","),
      "記録の N01〜N05 が入力と同じ順になっていません。");
    const keyById = new Map(Object.entries(record.ids).map(([key, id]) => [String(id), key]));
    check(keyById.size === NOTE_KEYS.length, "記録の ID が重複しています。");
    for (const note of notes.notes) {
      check(PROJECT_ORDER.includes(note.project), `${note.key} の案件が図の2案件にありません。`);
      check(note.text.includes(`「${PROJECT_JA[note.project]}」`), `${note.key} の本文に案件名「${PROJECT_JA[note.project]}」がありません。`);
      check(note.title.includes(SPINE[note.key]), `${note.key} の短い見出しが題名の一部ではありません。`);
    }
    const audit = record.samples[1].output.sql_audit_after;
    const counts = Object.fromEntries(PROJECT_ORDER.map((p) => [p, notes.notes.filter((n) => n.project === p).length]));
    check(audit && audit.observations === notes.notes.length
      && PROJECT_ORDER.every((p) => audit.observations_by_project?.[p] === counts[p]), "C02 の保存後の件数が入力と一致しません。");
    const rowsOk = (rows) => Array.isArray(rows) && rows.every((row) => keyById.has(String(row.id)));
    const result = (id, name) => callMap(record.samples[IDS.indexOf(id)].output.calls).get(name);
    for (const [id, name] of [["C01", "empty_search"], ["C03", "index"], ["C04", "context"], ["C05", "details"],
      ["C06", "auto:sakura-site"], ["C06", "auto:tsubaki-docs"], ["C07", "worker_auto"], ["C08", "unregistered_project"]]) {
      const r = result(id, name)?.result;
      check(r && rowsOk(r.index) && rowsOk(r.observations), `${id} の ${name} の戻り値が図に描ける形ではありません。`);
    }
    const body = (id, name, key) => result(id, name).result.observations.find((row) => keyById.get(String(row.id)) === key)?.content ?? "";
    check(body("C05", "details", "N01").includes(EXCERPT.N01), "C05 の本文に図の抜粋がありません。");
    check(body("C07", "worker_auto", "N02").includes(EXCERPT.N02), "C07 の本文に図の抜粋がありません。");
    check(result("C07", "worker_old_continuation")?.error?.code === "invalid_continuation", "C07 の前の合図の結果が違います。");
    check(record.samples[6].output.worker?.fresh_process === true && record.samples[6].output.worker?.sql_audit?.observations === notes.notes.length,
      "C07 の新しいプロセスの件数がありません。");
  }

  function setStatus(kind, text) {
    ui.status.dataset.state = kind;
    ui.status.textContent = text;
    ui.status.hidden = kind === "ready";
  }

  function setReady(ready) {
    for (const button of ui.cases) button.disabled = !ready;
    ui.next.disabled = !ready;
    ui.download.disabled = !ready;
    ui.copy.disabled = !ready || state.copying;
    for (const link of ui.recordLinks) link.setAttribute("aria-disabled", String(!ready));
    if (!ready) {
      ui.figure.hidden = true;
      ui.root.replaceChildren();
      ui.svgTitle.textContent = "";
      ui.svgDesc.textContent = "";
      ui.caseTag.textContent = "";
      ui.captionText.textContent = "";
      ui.summary.textContent = "";
      ui.toolText.replaceChildren();
      ui.inputText.textContent = "";
      ui.outputText.textContent = "";
      ui.runFacts.replaceChildren();
      ui.actionStatus.textContent = "";
      ui.copyStatus.textContent = "";
      ui.copyFallback.hidden = true;
      state.rects = new Map();
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
      const [recordSha, notesSha, scenariosSha, lockSha] = await Promise.all([recordBytes, notesBytes, scenariosBytes, lockBytes].map(sha256Hex));
      const record = parseJson(recordBytes, FILES.record);
      const notes = parseJson(notesBytes, FILES.notes);
      const scenarios = parseJson(scenariosBytes, FILES.scenarios);
      const lock = parseJson(lockBytes, FILES.lock);
      validate(record, notes, scenarios, lock, { record: recordSha, "input/notes.json": notesSha, "input/scenarios.json": scenariosSha, lock: lockSha });

      state.record = record;
      state.notes = notes;
      state.byId = new Map(record.samples.map((item) => [item.id, item]));
      state.keyById = new Map(Object.entries(record.ids).map(([key, id]) => [String(id), key]));
      state.noteByKey = new Map(notes.notes.map((note) => [note.key, note]));
      setStatus("ready", "");
      renderFacts(record);
      setReady(true);
      ui.figure.hidden = false;
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

  // --- Picture: one store, two shelves, a lens, three gates and a tray (viewBox 360 × 448) -------

  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1c2333", PAPER = "#fffcf5", IVORY = "#f6f1e6", LINE = "#cbbfa6", MUTED = "#5d6475";
  const ACCENT = "#c8641e", ACCENT_SOFT = "#fbe3cc", REJECT = "#9e3324";
  const COLOR = { "sakura-site": { main: "#2745c4", soft: "#e4e8fb" }, "tsubaki-docs": { main: "#157a74", soft: "#dcefec" } };
  const CAB = { x: 6, y: 62, w: 348, h: 152 };
  const SHELF = { "sakura-site": { x: 14, w: 204, bookW: 60 }, "tsubaki-docs": { x: 226, w: 120, bookW: 52 } };
  const SHELF_Y = 90, BOOK_Y = 96, BOOK_H = 84;
  const GATES = [
    { x: 6, label: "題名" },
    { x: 126, label: "前後" },
    { x: 246, label: "本文" },
  ].map((gate, i) => ({ ...gate, n: i + 1, y: 228, w: 108, h: 50 }));
  const TRAY_Y = 294;

  function s(tag, attrs, children) {
    const node = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attrs ?? {})) {
      if (value == null || value === false) continue;
      if (key === "text") node.textContent = String(value);
      else node.setAttribute(key, String(value));
    }
    for (const child of [].concat(children ?? [])) if (child) node.append(child);
    return node;
  }

  const textW = (text, size) => Array.from(text).reduce((w, ch) => w + (ch.charCodeAt(0) < 0x2000 ? size * 0.57 : size), 0);

  function wrap(text, maxWidth, size) {
    const lines = [];
    let line = "", w = 0;
    for (const ch of Array.from(text)) {
      const cw = textW(ch, size);
      if (w + cw > maxWidth && line && !"。、」）".includes(ch)) {
        lines.push(line);
        line = "";
        w = 0;
      }
      line += ch;
      w += cw;
    }
    if (line) lines.push(line);
    return lines;
  }

  function label(x, y, text, { size = 14, weight = 400, fill = INK, anchor = "start", cls } = {}) {
    return s("text", { x, y, "font-size": size, "font-weight": weight, fill, "text-anchor": anchor, class: cls, text });
  }

  function lines(x, y, list, { size = 14, gap = 1.35, ...rest } = {}) {
    return list.map((line, i) => label(x, y + i * size * gap, line, { size, ...rest }));
  }

  function noteOf(key) { return state.noteByKey.get(key); }
  function keyOf(id) { return state.keyById.get(String(id)) ?? null; }

  function slotRect(key) {
    const note = noteOf(key);
    const shelf = SHELF[note.project];
    const index = state.notes.notes.filter((n) => n.project === note.project).findIndex((n) => n.key === key);
    return { x: shelf.x + 8 + index * (shelf.bookW + 6), y: BOOK_Y, w: shelf.bookW, h: BOOK_H };
  }

  function spine(key, mode) {
    const note = noteOf(key);
    const c = COLOR[note.project];
    const r = slotRect(key);
    const lift = mode && mode !== "x" ? -8 : 0;
    const g = s("g", { class: `spine${lift ? " is-pulled" : ""}`, transform: lift ? `translate(0 ${lift})` : null, "data-key": key });
    if (mode === "accent") g.append(s("rect", { x: r.x - 3, y: r.y - 3, width: r.w + 6, height: r.h + 6, rx: 7, fill: "none", stroke: ACCENT, "stroke-width": 3 }));
    g.append(
      s("rect", { x: r.x, y: r.y, width: r.w, height: r.h, rx: 4, fill: c.main }),
      s("rect", { x: r.x + 5, y: r.y + 6, width: r.w - 10, height: 3, rx: 1.5, fill: PAPER, opacity: 0.55 }),
      label(r.x + r.w / 2, r.y + 28, key, { size: 15, weight: 700, fill: PAPER, anchor: "middle" }),
      label(r.x + r.w / 2, r.y + 50, SPINE[key], { size: 13, weight: 600, fill: PAPER, anchor: "middle" }),
      label(r.x + r.w / 2, r.y + r.h - 9, `ID ${state.record.ids[key]}`, { size: 11, fill: PAPER, anchor: "middle", cls: "dim" }),
    );
    if (mode === "x") g.append(cross(r.x + r.w - 4, r.y + 4, 9));
    return g;
  }

  function cross(cx, cy, r) {
    return s("g", { class: "cross" }, [
      s("circle", { cx, cy, r, fill: REJECT, stroke: PAPER, "stroke-width": 2 }),
      s("path", { d: `M${cx - r * 0.42} ${cy - r * 0.42}L${cx + r * 0.42} ${cy + r * 0.42}M${cx + r * 0.42} ${cy - r * 0.42}L${cx - r * 0.42} ${cy + r * 0.42}`, stroke: PAPER, "stroke-width": 2.4, "stroke-linecap": "round" }),
    ]);
  }

  function arrowHead(x, y, color) {
    return s("path", { d: `M${x - 5} ${y - 8}L${x + 5} ${y - 8}L${x} ${y}Z`, fill: color });
  }

  function route(d, color, end, { dashed = false, width = 3 } = {}) {
    return s("g", { class: "route" }, [
      s("path", { d, fill: "none", stroke: color, "stroke-width": width, "stroke-linecap": "round", "stroke-dasharray": dashed ? "5 6" : null }),
      end ? arrowHead(end[0], end[1], color) : null,
    ]);
  }

  function drawBase(sc) {
    const root = ui.root;
    // Lens and query token.
    const chipW = textW(sc.query, 17) + 26;
    root.append(
      s("g", { class: "lens" }, [
        s("circle", { cx: 26, cy: 29, r: 14, fill: PAPER, stroke: INK, "stroke-width": 3 }),
        s("circle", { cx: 21, cy: 24, r: 4, fill: IVORY }),
        s("path", { d: "M36 39L46 49", stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }),
      ]),
      s("rect", { x: 54, y: 13, width: chipW, height: 32, rx: 16, fill: INK }),
      label(54 + chipW / 2, 35, sc.query, { size: 17, weight: 700, fill: PAPER, anchor: "middle" }),
      sc.scope ? label(54 + chipW + 10, 34, sc.scope, { size: 13, fill: MUTED }) : null,
    );
    // Routes from the lens into shelves.
    for (const project of sc.routes) {
      const tx = SHELF[project].x + SHELF[project].w / 2;
      root.append(route(`M46 52C46 72 ${tx} 64 ${tx} ${SHELF_Y - 2}`, COLOR[project].main, [tx, SHELF_Y]));
    }
    // One store, two shelves.
    root.append(
      s("rect", { x: CAB.x, y: CAB.y, width: CAB.w, height: CAB.h, rx: 10, fill: PAPER, stroke: INK, "stroke-width": 2 }),
      s("path", { d: `M${CAB.x} ${CAB.y + 22}H${CAB.x + CAB.w}`, stroke: INK, "stroke-width": 1, opacity: 0.35 }),
      label(CAB.x + 10, CAB.y + 16, sc.cabHead, { size: 13, weight: 700 }),
      label(CAB.x + CAB.w - 10, CAB.y + 16, sc.cabCount, { size: 13, weight: 700, anchor: "end" }),
    );
    for (const project of PROJECT_ORDER) {
      const shelf = SHELF[project];
      const c = COLOR[project];
      const count = state.notes.notes.filter((n) => n.project === project).length;
      root.append(
        s("rect", { x: shelf.x, y: SHELF_Y, width: shelf.w, height: 116, rx: 6, fill: c.soft }),
        s("path", { d: `M${shelf.x + 4} ${BOOK_Y + BOOK_H + 2}H${shelf.x + shelf.w - 4}`, stroke: c.main, "stroke-width": 3, "stroke-linecap": "round" }),
        label(shelf.x + 8, 201, `${PROJECT_JA[project]}${sc.empty ? "" : ` ${count}`}`, { size: 13, weight: 700, fill: c.main }),
      );
    }
    for (const note of state.notes.notes) {
      if (sc.empty) {
        const r = slotRect(note.key);
        root.append(s("rect", { x: r.x, y: r.y, width: r.w, height: r.h, rx: 4, fill: "none", stroke: COLOR[note.project].main, "stroke-width": 1.5, "stroke-dasharray": "4 4", opacity: 0.6 }));
      } else {
        root.append(spine(note.key, sc.books[note.key]));
      }
    }
    // Shelf → active gate.
    for (const [key, gateIndex] of sc.feeds) {
      const r = slotRect(key);
      const gate = GATES[gateIndex];
      const gx = gate.x + 34; // left of the gate's count tab
      root.append(route(`M${r.x + r.w / 2} ${r.y + r.h - 6}C${r.x + r.w / 2} ${gate.y - 10} ${gx} ${gate.y - 22} ${gx} ${gate.y - 2}`,
        COLOR[noteOf(key).project].main, [gx, gate.y], { width: 2.5 }));
    }
    // Three gates, connected.
    GATES.forEach((gate, i) => {
      const st = sc.gates[i] ?? {};
      const on = st.state === "active";
      const done = st.state === "done";
      root.append(
        s("rect", { x: gate.x, y: gate.y, width: gate.w, height: gate.h, rx: 9, fill: on ? ACCENT_SOFT : PAPER, stroke: on || done ? INK : LINE, "stroke-width": on ? 2.5 : 1.5 }),
        s("path", { d: `M${gate.x + gate.w / 2 - 12} ${gate.y + gate.h - 7}H${gate.x + gate.w / 2 + 12}`, stroke: on || done ? INK : LINE, "stroke-width": 3, "stroke-linecap": "round" }),
        s("circle", { cx: gate.x + 17, cy: gate.y + 22, r: 10, fill: on ? ACCENT : done ? INK : LINE }),
        label(gate.x + 17, gate.y + 27, String(gate.n), { size: 13, weight: 700, fill: PAPER, anchor: "middle" }),
        label(gate.x + 33, gate.y + 28, gate.label, { size: 17, weight: 700, fill: on || done ? INK : MUTED }),
        st.cross ? cross(gate.x + 4, gate.y + 2, 9) : null,
      );
      if (st.badge) {
        const bw = textW(st.badge, 12) + 14;
        root.append(
          s("rect", { x: gate.x + gate.w - bw - 6, y: gate.y - 10, width: bw, height: 20, rx: 10, fill: on ? ACCENT : PAPER, stroke: on ? ACCENT : LINE, "stroke-width": 1.5 }),
          label(gate.x + gate.w - 6 - bw / 2, gate.y + 4.5, st.badge, { size: 12, weight: 700, fill: on ? PAPER : MUTED, anchor: "middle" }),
        );
      }
      if (i < GATES.length - 1) {
        const x = gate.x + gate.w + 1;
        root.append(s("path", { d: `M${x + 2} ${gate.y + 18}L${x + 9} ${gate.y + 25}L${x + 2} ${gate.y + 32}`, fill: "none", stroke: INK, "stroke-width": 2.2, "stroke-linecap": "round", "stroke-linejoin": "round", opacity: 0.6 }));
      }
    });
  }

  // Tray items that represent a note carry its key so the same note can glide between cases.
  function item(key, rect, children) {
    const g = s("g", { class: "tray-item", "data-key": key }, children);
    g.__rect = rect;
    return g;
  }

  function titleTab(key, rect, { order, title, accent, flag }) {
    const c = COLOR[noteOf(key).project];
    return item(key, rect, [
      s("rect", { x: rect.x, y: rect.y, width: rect.w, height: rect.h, rx: 7, fill: PAPER, stroke: accent ? ACCENT : LINE, "stroke-width": accent ? 3 : 1.5 }),
      s("rect", { x: rect.x + 1.5, y: rect.y + 1.5, width: 10, height: rect.h - 3, rx: 5, fill: c.main }),
      order ? label(rect.x + 22, rect.y + 20, String(order), { size: 13, weight: 700, fill: MUTED }) : null,
      label(rect.x + (order ? 36 : 22), rect.y + 21, key, { size: 15, weight: 700, fill: c.main }),
      label(rect.x + 22, rect.y + 42, title, { size: 15 }),
      flag ? s("rect", { x: rect.x + rect.w - textW(flag, 12) - 22, y: rect.y + 6, width: textW(flag, 12) + 14, height: 22, rx: 11, fill: accent ? ACCENT : IVORY }) : null,
      flag ? label(rect.x + rect.w - 15, rect.y + 21.5, flag, { size: 12, weight: 700, fill: accent ? PAPER : MUTED, anchor: "end" }) : null,
    ]);
  }

  function openBook(key, rect, { title, id, excerpt, accent }) {
    const c = COLOR[noteOf(key).project];
    const half = rect.w / 2;
    const left = rect.x + 12;
    const right = rect.x + half + 12;
    return item(key, rect, [
      s("rect", { x: rect.x, y: rect.y, width: rect.w, height: rect.h, rx: 8, fill: c.main }),
      s("rect", { x: rect.x + 5, y: rect.y + 5, width: half - 6, height: rect.h - 10, rx: 4, fill: PAPER }),
      s("rect", { x: rect.x + half + 1, y: rect.y + 5, width: half - 6, height: rect.h - 10, rx: 4, fill: PAPER }),
      s("path", { d: `M${rect.x + half} ${rect.y + 6}V${rect.y + rect.h - 6}`, stroke: INK, "stroke-width": 1, opacity: 0.4 }),
      accent ? s("rect", { x: rect.x - 3, y: rect.y - 3, width: rect.w + 6, height: rect.h + 6, rx: 10, fill: "none", stroke: ACCENT, "stroke-width": 3 }) : null,
      label(left, rect.y + 27, key, { size: 16, weight: 700, fill: c.main }),
      label(left + 40, rect.y + 27, `ID ${id}`, { size: 12, fill: MUTED }),
      ...lines(left, rect.y + 50, wrap(title, half - 26, 14), { size: 14, weight: 600 }),
      label(left, rect.y + rect.h - 14, "保存した本文", { size: 11, fill: MUTED }),
      ...lines(right, rect.y + 30, wrap(`「${excerpt}」`, half - 24, 15), { size: 15, weight: 600, gap: 1.4 }),
    ]);
  }

  function scopeCard(key, rect, { title, steps }) {
    const note = noteOf(key);
    const c = COLOR[note.project];
    return item(key, rect, [
      s("rect", { x: rect.x, y: rect.y, width: rect.w, height: rect.h, rx: 8, fill: PAPER, stroke: c.main, "stroke-width": 2 }),
      s("path", { d: `M${rect.x} ${rect.y + 24}V${rect.y + 8}a8 8 0 0 1 8-8H${rect.x + rect.w - 8}a8 8 0 0 1 8 8V${rect.y + 24}Z`, fill: c.main }),
      label(rect.x + 10, rect.y + 17, PROJECT_JA[note.project], { size: 13, weight: 700, fill: PAPER }),
      label(rect.x + 10, rect.y + 46, key, { size: 16, weight: 700, fill: c.main }),
      label(rect.x + 52, rect.y + 46, "本文 1件", { size: 12, weight: 700, fill: MUTED }),
      ...lines(rect.x + 10, rect.y + 68, wrap(title, rect.w - 20, 14), { size: 14, weight: 600 }),
      label(rect.x + 10, rect.y + rect.h - 10, steps, { size: 12, fill: MUTED }),
    ]);
  }

  function chipLine(y, text, { color = INK, x = 180, anchor = "middle" } = {}) {
    return s("g", { class: "fade-in" }, [label(x, y, text, { size: 14, weight: 700, fill: color, anchor })]);
  }

  function opJa(trace) {
    const ja = { search: "題名", timeline: "前後", fetch: "本文" };
    return trace.map((step) => ja[step.operation] ?? step.operation).join("→");
  }

  // --- Scenes: what each saved scenario puts on the same picture -------------------------------

  function scene(id) {
    const record = state.record;
    const sample = state.byId.get(id);
    const out = callMap(sample.output.calls);
    const args = (name) => callMap(sample.input.calls).get(name)?.args ?? {};
    const total = record.samples[1].output.sql_audit_after.observations;
    const base = { query: "", scope: "", routes: [], books: {}, feeds: [], gates: [], cabHead: "保存先（SQLite・1つ）", cabCount: `${total}件`, empty: false };
    const tray = [];
    const sakura = `→ ${PROJECT_JA["sakura-site"]}`;

    if (id === "C01") {
      const r = out.get("empty_search").result;
      tray.push(s("g", { class: "fade-in" }, [
        s("rect", { x: 14, y: TRAY_Y + 6, width: 332, height: 104, rx: 10, fill: "none", stroke: LINE, "stroke-width": 2, "stroke-dasharray": "6 6" }),
        label(180, TRAY_Y + 52, `題名 ${r.index.length}件 ・ 本文 ${r.observations.length}件`, { size: 18, weight: 700, anchor: "middle" }),
        label(180, TRAY_Y + 80, `保存の前（reason: ${r.reason}）`, { size: 13, fill: MUTED, anchor: "middle" }),
      ]));
      return { ...base, query: r.query, scope: sakura, routes: [r.project], empty: true, cabCount: `${record.samples[0].output.sql_audit_before.observations}件`,
        gates: [{ state: "active", badge: `${r.index.length}件` }], tray,
        caption: `保存の前は、題名${r.index.length}件・本文${r.observations.length}件。` };
    }

    if (id === "C02") {
      const replay = out.get("replay:N01").result;
      const audit = sample.output.sql_audit_after;
      PROJECT_ORDER.forEach((project, row) => {
        state.notes.notes.filter((n) => n.project === project).forEach((note, i) => {
          const saved = out.get(`save:${note.key}`).result;
          const c = COLOR[project];
          const x = 14 + i * 112, y = TRAY_Y + 4 + row * 44;
          tray.push(s("g", { class: "fade-in" }, [
            s("rect", { x, y, width: 106, height: 36, rx: 8, fill: c.soft, stroke: c.main, "stroke-width": 1.5 }),
            label(x + 10, y + 23, note.key, { size: 14, weight: 700, fill: c.main }),
            label(x + 96, y + 23, `ID ${saved.id}`, { size: 14, weight: 700, anchor: "end" }),
          ]));
        });
      });
      tray.push(s("g", { class: "fade-in" }, [
        s("rect", { x: 14, y: TRAY_Y + 96, width: 332, height: 36, rx: 8, fill: "none", stroke: ACCENT, "stroke-width": 2, "stroke-dasharray": "5 4" }),
        label(26, TRAY_Y + 119, `N01を再送 → 同じ ID ${replay.id}`, { size: 14, weight: 700 }),
        label(334, TRAY_Y + 119, `duplicate: ${replay.duplicate}`, { size: 12, fill: ACCENT, anchor: "end" }),
      ]));
      tray.push(chipLine(TRAY_Y + 146, `合計 ${audit.observations}件のまま（${PROJECT_ORDER.map((p) => audit.observations_by_project[p]).join("＋")}）`));
      return { ...base, query: `${state.notes.notes.length}件を保存`, scope: "各件の前に検索", routes: PROJECT_ORDER,
        books: { N01: "accent" }, tray, cabCount: `${audit.observations}件`,
        caption: `${audit.observations}件を保存（${PROJECT_ORDER.map((p) => `${PROJECT_JA[p]}${audit.observations_by_project[p]}`).join("・")}）。N01の再送は同じID ${replay.id}。` };
    }

    if (id === "C03") {
      const r = out.get("index").result;
      const chosen = callMap(state.byId.get("C04").input.calls).get("context").args.selectedIds.map(keyOf);
      r.index.forEach((row, i) => {
        const key = keyOf(row.id);
        const pick = chosen.includes(key);
        tray.push(titleTab(key, { x: 6, y: TRAY_Y + 4 + i * 58, w: 348, h: 52 }, { order: i + 1, title: row.title, accent: pick, flag: pick ? "呼び出し側が選択" : null }));
      });
      tray.push(chipLine(TRAY_Y + 134, `本文 ${r.observations.length}件 ・ 題名だけが返る`, { color: MUTED }));
      const books = Object.fromEntries(r.index.map((row) => [keyOf(row.id), chosen.includes(keyOf(row.id)) ? "accent" : "pulled"]));
      return { ...base, query: r.query, scope: sakura, routes: [r.project], books, feeds: r.index.map((row) => [keyOf(row.id), 0]),
        gates: [{ state: "active", badge: `${r.index.length}件` }], tray,
        caption: `「${r.query}」で、題名${r.index.length}件だけ。本文はまだ${r.observations.length}件。` };
    }

    if (id === "C04") {
      const r = out.get("context").result;
      const chosen = args("context").selectedIds.map(keyOf);
      r.index.forEach((row, i) => {
        const key = keyOf(row.id);
        const pick = chosen.includes(key);
        tray.push(titleTab(key, { x: 6, y: TRAY_Y + 8 + i * 52, w: 348, h: 52 }, { title: row.title, accent: pick, flag: pick ? "選んだ1件" : "前後" }));
      });
      tray.push(chipLine(TRAY_Y + 134, `${chosen.join("・")}の前後${sample.input.scenario.depthBefore}件 ・ 本文 ${r.observations.length}件`, { color: MUTED }));
      const books = Object.fromEntries(r.index.map((row) => [keyOf(row.id), chosen.includes(keyOf(row.id)) ? "accent" : "pulled"]));
      return { ...base, query: r.query, scope: sakura, routes: [r.project], books, feeds: chosen.map((key) => [key, 1]),
        gates: [{ state: "done" }, { state: "active", badge: `${r.index.length}件` }], tray,
        caption: `選んだ${chosen.join("・")}と前後で、題名${r.index.length}件。本文はまだ${r.observations.length}件。` };
    }

    if (id === "C05") {
      const r = out.get("details").result;
      const chosen = args("details").selectedIds.map(keyOf);
      r.observations.forEach((row) => {
        const key = keyOf(row.id);
        tray.push(openBook(key, { x: 14, y: TRAY_Y + 6, w: 332, h: 112 }, { title: row.title, id: row.id, excerpt: EXCERPT[key], accent: true }));
      });
      const opened = new Set(r.observations.map((row) => keyOf(row.id)));
      const closed = state.notes.notes.filter((n) => !opened.has(n.key)).length;
      tray.push(chipLine(TRAY_Y + 140, `本文 ${r.observations.length}件 ・ ほかの${closed}件は閉じたまま`, { color: MUTED }));
      return { ...base, query: r.query, scope: sakura, routes: [r.project], books: Object.fromEntries(chosen.map((k) => [k, "accent"])),
        feeds: chosen.map((key) => [key, 2]), gates: [{ state: "done" }, { state: "done" }, { state: "active", badge: `${r.observations.length}件` }], tray,
        caption: `選んだ${chosen.join("・")}だけ、本文${r.observations.length}件。保存した文で、生成した答えではありません。` };
    }

    if (id === "C06") {
      const books = {};
      const feeds = [];
      const queries = new Set();
      PROJECT_ORDER.forEach((project, i) => {
        const r = out.get(`auto:${project}`).result;
        queries.add(r.query);
        r.observations.forEach((row) => {
          const key = keyOf(row.id);
          books[key] = "accent";
          feeds.push([key, 2]);
          tray.push(scopeCard(key, { x: 6 + i * 178, y: TRAY_Y + 4, w: 170, h: 120 }, { title: row.title, steps: opJa(r.trace) }));
        });
      });
      const query = [...queries].join("・");
      tray.push(chipLine(TRAY_Y + 146, `同じ「${query}」→ 案件ごとに別の1件`, { color: MUTED }));
      return { ...base, query, scope: "→ 2案件", routes: PROJECT_ORDER, books, feeds,
        gates: [{ state: "done" }, { state: "done" }, { state: "active", badge: "1件ずつ" }], tray,
        caption: `同じ「${query}」でも、案件ごとに別の1件が開く。` };
    }

    if (id === "C07") {
      const worker = sample.output.worker;
      const r = out.get("worker_auto").result;
      const old = out.get("worker_old_continuation").error;
      const audit = worker.sql_audit;
      const split = PROJECT_ORDER.map((p) => audit.observations_by_project[p]).join("＋");
      tray.push(s("g", { class: "fade-in" }, [
        s("rect", { x: 6, y: TRAY_Y + 2, width: 348, height: 28, rx: 14, fill: "none", stroke: REJECT, "stroke-width": 1.5, "stroke-dasharray": "5 4" }),
        cross(22, TRAY_Y + 16, 9),
        label(38, TRAY_Y + 21, "前のプロセスの合図は使えない", { size: 13, weight: 700, fill: REJECT }),
        label(346, TRAY_Y + 21, old.code, { size: 11, fill: REJECT, anchor: "end" }),
      ]));
      r.observations.forEach((row) => {
        const key = keyOf(row.id);
        tray.push(openBook(key, { x: 14, y: TRAY_Y + 38, w: 332, h: 94 }, { title: row.title, id: row.id, excerpt: EXCERPT[key], accent: true }));
      });
      const ids = r.observations.map((row) => `ID ${row.id}`).join("・");
      tray.push(chipLine(TRAY_Y + 148, `${audit.observations}件（${split}）のまま ・ 保存時と同じ ${ids}`, { color: MUTED }));
      const books = Object.fromEntries(r.observations.map((row) => [keyOf(row.id), "accent"]));
      return { ...base, query: r.query, scope: sakura, routes: [r.project], books, feeds: Object.keys(books).map((k) => [k, 2]),
        cabHead: worker.fresh_process ? "新しいプロセスで開き直した保存先" : "保存先", cabCount: `${audit.observations}件`,
        gates: [{ state: "done" }, { state: "done", cross: true }, { state: "active", badge: `${r.observations.length}件` }], tray,
        caption: `新しいプロセスでも${audit.observations}件（${split}）。「${r.query}」で同じ${ids}。前の合図は使えない。` };
    }

    // C08: each guarded call, as it actually returned.
    const rows = sample.output.calls;
    const errors = rows.filter((call) => call.error);
    const foreign = callMap(sample.input.calls).get("foreign_selected_id")?.args?.selectedIds?.map(keyOf) ?? [];
    rows.forEach((call, i) => {
      const y = TRAY_Y + 2 + i * 29;
      const bad = Boolean(call.error);
      const r = call.result;
      tray.push(s("g", { class: "fade-in" }, [
        s("rect", { x: 6, y, width: 348, height: 25, rx: 6, fill: bad ? PAPER : IVORY, stroke: bad ? REJECT : LINE, "stroke-width": 1.2 }),
        bad ? cross(19, y + 12.5, 8) : label(19, y + 17, `${r.index.length}`, { size: 13, weight: 700, anchor: "middle" }),
        label(34, y + 17.5, GUARD_JA[call.name] ?? call.name, { size: 13, weight: 700 }),
        label(346, y + 17, bad ? call.error.code : `${r.index.length}件（${r.reason}）`, { size: 11, fill: bad ? REJECT : MUTED, anchor: "end" }),
      ]));
    });
    const books = Object.fromEntries(foreign.map((key) => [key, "x"]));
    return { ...base, query: "拒否の確認", scope: "", routes: ["sakura-site"], books,
      gates: [{ state: "done" }, { state: "active", cross: true, badge: `${errors.length}件拒否` }], tray,
      caption: `決まりに合わない続け方は${errors.length}件とも拒否。未登録の案件は0件。` };
  }

  function draw(id) {
    const before = state.rects;
    const sc = scene(id);
    ui.root.replaceChildren();
    drawBase(sc);
    // Gate → tray connector.
    const active = sc.gates.findIndex((g) => g.state === "active");
    if (active >= 0) {
      const gate = GATES[active];
      ui.root.append(s("path", { d: `M${gate.x + gate.w / 2} ${gate.y + gate.h}V${TRAY_Y + 2}`, stroke: INK, "stroke-width": 2, opacity: 0.5 }));
    }
    const trayGroup = s("g", { class: "tray" }, sc.tray);
    ui.root.append(trayGroup);
    const next = new Map();
    const glide = !reducedMotion.matches && typeof Element.prototype.animate === "function";
    for (const node of sc.tray) {
      const key = node.getAttribute?.("data-key");
      if (!key || !node.__rect) continue;
      const to = node.__rect;
      next.set(key, to);
      if (!glide) continue;
      const from = before.get(key) ?? slotRect(key);
      const sx = from.w / to.w, sy = from.h / to.h;
      const dx = from.x - to.x * sx, dy = from.y - to.y * sy;
      if (Math.abs(dx) + Math.abs(dy) + Math.abs(sx - 1) + Math.abs(sy - 1) < 0.5) continue;
      node.style.transformBox = "view-box";
      node.style.transformOrigin = "0 0";
      node.animate([
        { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, opacity: before.has(key) ? 1 : 0.2 },
        { transform: "translate(0px, 0px) scale(1, 1)", opacity: 1 },
      ], { duration: 560, easing: "cubic-bezier(.2,.7,.2,1)" });
    }
    state.rects = next;
    return sc;
  }

  // --- Rendering ------------------------------------------------------------------------------

  function idFromHash() {
    let id = "";
    try { id = decodeURIComponent(location.hash.replace(/^#/, "")).toUpperCase(); } catch { return null; }
    return IDS.includes(id) ? id : null;
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
      const figure = document.createElement("figure");
      figure.className = call.tool_error ? "tool-block is-error" : "tool-block";
      const caption = document.createElement("figcaption");
      caption.textContent = captionFor(call.name, inputs.get(call.name)?.args);
      const pre = document.createElement("pre");
      pre.tabIndex = 0;
      pre.textContent = text;
      figure.append(caption, pre);
      blocks.push(figure);
    }
    if (blocks.length === 0) {
      const p = document.createElement("p");
      p.className = "fold-note";
      p.textContent = "この場面の呼び出しは、ツールの文を返さない関数（saveMemory）です。返った値は下の output にあります。";
      blocks.push(p);
    }
    ui.toolText.replaceChildren(...blocks);
  }

  function render(sample) {
    const id = sample.id;
    for (const button of ui.cases) button.setAttribute("aria-pressed", String(button.dataset.id === id));
    for (const link of ui.recordLinks) {
      if (link.dataset.id === id) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    }
    const sc = draw(id);
    ui.svgTitle.textContent = `${CASE_TAG[id]}：${sc.caption}`;
    ui.svgDesc.textContent = sample.summary;
    ui.caseTag.textContent = CASE_TAG[id];
    ui.captionText.textContent = sc.caption;
    const [nextId, nextLabel] = NEXT[id];
    ui.next.textContent = nextLabel;
    ui.next.dataset.target = nextId;
    ui.download.textContent = `${id} の記録をJSONで保存`;
    ui.comparison.href = `comparison.html#${id}`;
    ui.comparison.textContent = `表形式の記録で見る（comparison.html#${id}）`;
    ui.summary.textContent = sample.summary;
    renderToolText(sample);
    ui.inputText.textContent = JSON.stringify(sample.input, null, 2);
    ui.outputText.textContent = JSON.stringify(sample.output, null, 2);
    ui.actionStatus.textContent = "";
  }

  function renderFacts(record) {
    const rows = [
      ["実行環境", `Bun ${record.runtime.bun} ・ ${record.runtime.platform} ${record.runtime.arch}`],
      ["依存", Object.entries(record.runtime.dependencies).map(([name, version]) => `${name} ${version}`).join("、")],
      ["原典の照合", `${record.source_files_verified.count}ファイル（SHA-256・サイズ・Git blob）`],
      ["自動確認", `${record.checks.total}件すべて合格（8場面）`],
      ["通信の試み", `${record.guards.network_attempts_total}件（親と新しいプロセスの合計）`],
      ["実行の順", record.execution_order.join(" → ")],
      ["記録の作成", record.generated_at],
    ];
    ui.runFacts.replaceChildren(...rows.map(([name, value]) => {
      const row = document.createElement("div");
      row.className = "kv-row";
      const dt = document.createElement("dt");
      dt.textContent = name;
      const dd = document.createElement("dd");
      dd.textContent = value;
      row.append(dt, dd);
      return row;
    }));
  }

  function select(id) {
    state.current = IDS.includes(id) ? id : DEFAULT_ID;
    const sample = state.byId.get(state.current);
    if (sample) render(sample);
  }

  function go(id) {
    if (!state.record) return;
    if (location.hash === `#${id}`) select(id);
    else location.hash = id;
  }

  // --- Actions --------------------------------------------------------------------------------

  // Same envelope and serialization as comparison.js: the original sample object, 2-space JSON.
  function downloadRecord() {
    const sample = state.byId.get(state.current);
    if (!sample) return;
    const name = `claude-mem-${sample.id}.json`;
    const url = URL.createObjectURL(new Blob([JSON.stringify(sample, null, 2) + "\n"], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.hidden = true;
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
    ui.copyStatus.textContent = "依頼文を読み込んでいます…";
    try {
      if (state.requestText === null) state.requestText = decode(await fetchBytes(FILES.request), FILES.request);
    } catch (error) {
      ui.copyStatus.textContent = error instanceof Error ? error.message : String(error);
      state.copying = false;
      ui.copy.disabled = !state.record;
      return;
    }
    try {
      if (!navigator.clipboard?.writeText) throw new Error("clipboard unavailable");
      await navigator.clipboard.writeText(state.requestText);
      ui.copyStatus.textContent = "依頼文をコピーしました。";
    } catch {
      ui.copyFallbackText.value = state.requestText;
      ui.copyFallback.hidden = false;
      ui.copyFallbackText.focus();
      ui.copyFallbackText.select();
      let copied = false;
      try { copied = document.execCommand("copy"); } catch { copied = false; }
      ui.copyStatus.textContent = copied ? "依頼文をコピーしました。" : "自動ではコピーできませんでした。下の文を選んでコピーしてください。";
      if (copied) ui.copyFallback.hidden = true;
    } finally {
      state.copying = false;
      ui.copy.disabled = !state.record;
    }
  }

  for (const button of ui.cases) button.addEventListener("click", () => go(button.dataset.id));
  for (const link of ui.recordLinks) {
    link.addEventListener("click", (event) => {
      if (!state.record) event.preventDefault();
    });
  }
  ui.next.addEventListener("click", () => {
    const target = ui.next.dataset.target;
    if (IDS.includes(target)) go(target);
  });
  window.addEventListener("hashchange", () => {
    const id = idFromHash();
    if (id && state.record) select(id);
  });
  ui.retry.addEventListener("click", load);
  ui.download.addEventListener("click", downloadRecord);
  ui.copy.addEventListener("click", copyRequest);

  load();
})();
