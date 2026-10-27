// 八百万図AIツールボックス — OpenHands Agent Canvas 作例ページ。MIT License, Copyright (c) 2026 Studio Yebisu.
// 保存した実行記録を読むだけのページ。原典の検査をブラウザーで計算し直さず、記録の値をそのまま表示する。
// データはすべて textContent とテキストノードで書き、HTML として解釈しない（O08 のタグも文字のまま）。
"use strict";

(() => {
  const EXPECTED = {
    format: "studio-yebisu-openhands-automation-runs-v1",
    inputFormat: "studio-yebisu-openhands-settings-v1",
    upstream: {
      repository: "OpenHands/OpenHands",
      commit: "e4775b4ba61a83ba80af5f7b0b826201b8e8ea05",
      version: "1.27.1",
      license: "MIT",
    },
    dependency: {
      name: "@openhands/extensions",
      version: "0.30.0",
      license: "MIT",
      resolved: "https://registry.npmjs.org/@openhands/extensions/-/extensions-0.30.0.tgz",
      integrity: "sha512-lPyH0iqSow+ARTX4cumR75e3BJmuqpj2YbKm1cqDcI1SQDXfDTr+/wSVH9dQsOmddEP4Zn+uMoLXpKSO/moonA==",
      archive_sha256: "8a5eb885cc2bdb9170bc9a561aa5bcab52f8d662ac9fd38b69769b0f5f538356",
    },
    inputSha256: {
      "input/automation-settings.json": "e982b4ca83fd92d9f012a44e98f35dc58b9dfc48a95eede6bb7daff57ce0be6b",
      "input/expected.json": "d2e9892831156aa52d87eff81b7b28ce15caaafbde900d828a8763d66064d460",
      "vendor-lock.json": "34149d29d4d4cb0181f41f0b8ac998a5c8baa0c3e13e0af341338eae1dddea02",
    },
    originalFileCount: 12,
    packageFileCount: 29,
    envelope: { fileVersion: 1, fileKind: "automation", filenameSuffix: ".automation.json" },
    errorName: "AutomationFileValidationError",
    ids: ["O01", "O02", "O03", "O04", "O05", "O06", "O07", "O08"],
    modes: ["export-roundtrip", "import"],
    defaultId: "O03",
    repairPair: ["O03", "O04"],
  };
  const FILES = {
    record: "outputs/automation-runs.json",
    settings: "input/automation-settings.json",
    expected: "input/expected.json",
    lock: "vendor-lock.json",
    request: "request.txt",
  };
  const HASHED = { settings: "input/automation-settings.json", expected: "input/expected.json", lock: "vendor-lock.json" };
  const ORIGINAL_PREFIX = "vendor/openhands/";
  const PACKAGE_PREFIX = "vendor/extensions/";

  const $ = (id) => document.getElementById(id);
  const el = {
    status: $("status"),
    statusText: $("status-text"),
    retry: $("retry"),
    tally: $("tally"),
    select: $("sample-select"),
    viewer: $("viewer"),
    kicker: $("sample-kicker"),
    title: $("sample-title"),
    state: $("result-state"),
    diagnosisBox: document.querySelector(".diagnosis-box"),
    diagnosisNote: $("diagnosis-note"),
    diagnosis: $("diagnosis"),
    caveat: $("caveat"),
    caveatList: $("caveat-list"),
    repair: $("repair"),
    repairText: $("repair-text"),
    repairLink: $("repair-link"),
    facts: $("facts"),
    downloadFile: $("download-file"),
    downloadRecord: $("download-record"),
    copy: $("copy-request"),
    actionStatus: $("action-status"),
    fallback: $("request-fallback"),
    fallbackLabel: $("request-fallback-label"),
    rawFileNote: $("raw-file-note"),
    rawFile: $("raw-file"),
    rawInputNote: $("raw-input-note"),
    rawInput: $("raw-input"),
    rawOutput: $("raw-output"),
    runFacts: $("run-facts"),
  };

  // The one owner of page state. Only load(), clearResult() and render() change it.
  const state = { ready: false, loading: false, record: null, byId: new Map(), current: null, request: "" };

  class LoadError extends Error {}

  function fail(message) {
    throw new LoadError(message);
  }

  const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
  const isString = (value) => typeof value === "string";
  const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  // The same bytes run.mjs wrote to outputs/exports/ and the record: pretty JSON with a final newline.
  const fileText = (value) => `${JSON.stringify(value, null, 2)}\n`;

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

  function lockEntries(lock, prefix, extra) {
    return lock.files
      .filter((file) => isObject(file) && isString(file.path) && file.path.startsWith(prefix))
      .map((file) => ({ path: file.path, sha256: file.sha256, bytes: file.bytes, [extra]: file[extra] }));
  }

  function validateResultShape(item) {
    const id = isObject(item) ? item.id : null;
    const base = isObject(item)
      && isString(item.id) && isString(item.label) && EXPECTED.modes.includes(item.mode)
      && typeof item.accepted === "boolean" && isObject(item.input) && isObject(item.observations);
    if (!base) fail(`${id || "記録の1件"} の形が実行記録の形式と合いません。`);
    if (item.accepted) {
      const file = item.file;
      const ok = isObject(file) && isObject(file.spec)
        && file.version === EXPECTED.envelope.fileVersion && file.kind === EXPECTED.envelope.fileKind
        && isString(item.filename) && item.filename.endsWith(EXPECTED.envelope.filenameSuffix)
        && item.file_path === `outputs/exports/${item.id}.automation.json`
        && isString(item.file_sha256) && isObject(item.parsed) && isObject(item.roundtrip) && item.error === null;
      if (!ok) fail(`${id} は形が通った記録ですが、ファイル・名前・読み戻しの記録がそろっていません。`);
    } else {
      const error = item.error;
      const ok = item.parsed === null && item.filename === null && item.file_path === null
        && isObject(error) && error.name === EXPECTED.errorName
        && Array.isArray(error.issues) && error.issues.length > 0 && error.issues.every(isString)
        && error.message === error.issues.join("\n");
      if (!ok) fail(`${id} は止まった記録ですが、原典の誤り（name・message・issues）の記録が合いません。`);
    }
  }

  async function validate(files, hashes) {
    const { record, settings, expected, lock } = files;
    if (!isObject(record) || record.format !== EXPECTED.format) fail("実行記録の形式が違います。");

    const upstream = isObject(record.upstream) ? record.upstream : {};
    for (const key of Object.keys(EXPECTED.upstream)) {
      if (upstream[key] !== EXPECTED.upstream[key]) fail("実行記録の OpenHands の固定版が一致しません。");
    }
    const dependency = isObject(record.dependency) ? record.dependency : {};
    for (const key of Object.keys(EXPECTED.dependency)) {
      if (dependency[key] !== EXPECTED.dependency[key]) fail("実行記録の @openhands/extensions の固定版が一致しません。");
    }

    const recorded = isObject(record.input_sha256) ? record.input_sha256 : {};
    for (const [path, pinned] of Object.entries(EXPECTED.inputSha256)) {
      if (hashes[path] !== pinned) fail(`${path} の SHA-256 が、実行前に固定した値と一致しません。`);
      if (recorded[path] !== pinned) fail(`実行記録にある ${path} の SHA-256 が一致しません。`);
    }
    if (upstream.vendor_lock_sha256 !== EXPECTED.inputSha256["vendor-lock.json"]) fail("実行記録の vendor-lock.json の SHA-256 が一致しません。");

    if (!isObject(lock) || Object.keys(EXPECTED.upstream).some((key) => lock[key] !== EXPECTED.upstream[key])
      || !isObject(lock.dependency) || Object.keys(EXPECTED.dependency).some((key) => lock.dependency[key] !== EXPECTED.dependency[key])) {
      fail("vendor-lock.json の固定版が一致しません。");
    }
    if (!Array.isArray(lock.files) || lock.files.length !== EXPECTED.originalFileCount + EXPECTED.packageFileCount) {
      fail(`vendor-lock.json の対象が${EXPECTED.originalFileCount + EXPECTED.packageFileCount}ファイルではありません。`);
    }
    const originalFiles = lockEntries(lock, ORIGINAL_PREFIX, "git_blob_sha1");
    const packageFiles = lockEntries(lock, PACKAGE_PREFIX, "npm_member");
    if (originalFiles.length !== EXPECTED.originalFileCount || packageFiles.length !== EXPECTED.packageFileCount) {
      fail("vendor-lock.json の原典と依存のファイル数が合いません。");
    }
    if (!deepEqual(upstream.files, originalFiles)) fail("実行記録の原典ファイルの照合が vendor-lock.json と一致しません。");
    if (!deepEqual(dependency.files, packageFiles)) fail("実行記録の依存ファイルの照合が vendor-lock.json と一致しません。");

    if (!isObject(settings) || settings.format !== EXPECTED.inputFormat || settings.fictional !== true || !Array.isArray(settings.cases)) {
      fail("input/automation-settings.json の形が違います。");
    }
    if (!deepEqual(settings.cases.map((item) => item && item.id), EXPECTED.ids)) fail("入力の設定が O01〜O08 の8件ではありません。");

    const iface = record.interface;
    if (!isObject(iface) || iface.admitted !== true || !isObject(iface.envelope)
      || Object.keys(EXPECTED.envelope).some((key) => iface.envelope[key] !== EXPECTED.envelope[key])) {
      fail("実行記録の interface manifest の審査結果、またはファイルの封筒が合いません。");
    }

    const results = record.results;
    if (!Array.isArray(results) || !deepEqual(results.map((item) => item && item.id), EXPECTED.ids)) {
      fail("実行記録が O01〜O08 の8件ではありません。");
    }
    for (let index = 0; index < results.length; index++) {
      const item = results[index];
      validateResultShape(item);
      const source = settings.cases[index];
      if (item.label !== source.label || item.mode !== source.mode || !deepEqual(item.input, source.input)) {
        fail(`${item.id} の入力が input/automation-settings.json と一致しません。`);
      }
      if (item.accepted) {
        const digest = await sha256Hex(new TextEncoder().encode(fileText(item.file)));
        if (digest !== item.file_sha256) fail(`${item.id} の .automation.json の SHA-256 が記録と一致しません。`);
      }
    }

    const accepted = results.filter((item) => item.accepted).map((item) => item.id);
    const rejected = results.filter((item) => !item.accepted).map((item) => item.id);
    const counts = { total: results.length, accepted: accepted.length, rejected: rejected.length };
    if (!deepEqual(record.summary, counts)) fail("実行記録の件数のまとめが、8件から数えた値と一致しません。");
    if (!isObject(expected) || !Array.isArray(expected.accepted_ids) || !Array.isArray(expected.rejected_ids)
      || !deepEqual(expected.repair_pair, EXPECTED.repairPair)) {
      fail("input/expected.json の形が違います。");
    }
    if (expected.case_count !== counts.total || !deepEqual(expected.accepted_ids, accepted) || !deepEqual(expected.rejected_ids, rejected)) {
      fail("形が通った件・止まった件が、実行前に決めた期待と一致しません。");
    }

    const verification = record.verification;
    if (!isObject(verification) || verification.status !== "passed" || !Array.isArray(verification.checks)
      || verification.checks.length === 0
      || !verification.checks.every((entry) => isObject(entry) && isString(entry.name) && entry.passed === true)
      || verification.total !== verification.checks.length) {
      fail("実行記録の確認がすべて合格になっていません。");
    }
  }

  // --- 読み方（実際に返った行から作る） -------------------------------------------------------------

  function explainIssue(issue) {
    let match;
    if ((match = /^version: expected (.+)$/.exec(issue))) return `ファイルの封筒の version が ${match[1]}（数値）ではありません。`;
    if ((match = /^kind: expected "(.+)"$/.exec(issue))) return `ファイルの封筒の kind が「${match[1]}」ではありません。`;
    if (issue === "file: expected a JSON object") return "ファイル全体が JSON のオブジェクトではありません。";
    if (issue === "spec: expected an object") return "設定の本体 spec がオブジェクトではありません。";
    if (issue === "spec.trigger: expected an object") return "きっかけ trigger がオブジェクトではありません。";
    if (/^spec\.trigger\.type: expected one of /.test(issue)) return "きっかけの種類 type が cron・schedule・event のどれでもありません。";
    if (issue === "spec.trigger.schedule: required for a scheduled trigger") return "時刻で動く設定（cron・schedule）なのに、いつ動くかを書く schedule がありません。";
    if (issue === "spec.trigger.source: required for an event trigger") return "event の設定に、出来事の出どころ source がありません。";
    if (issue === "spec.trigger.on: required for an event trigger") return "event の設定に、反応する出来事 on がありません。";
    if (/^spec\.trigger\.on: expected /.test(issue)) return "on が、文字列か、空でない文字列の配列ではありません。";
    if (issue === "spec.enabled: expected a boolean") return "enabled が true／false の真偽値ではありません。\"false\" のような文字列は通りません。";
    if (issue === "spec.timeout: expected a positive integer") return "timeout が1以上の整数ではありません。";
    if (issue === "spec.plugins: expected an array of non-empty strings") return "plugins が、空でない文字列だけの配列ではありません。";
    if (issue === "spec.model: expected a non-empty string or null") return "model が、空でない文字列か null ではありません。";
    if ((match = /^(spec\.[\w.]+): expected a non-empty string$/.exec(issue))) return `${match[1]} が、空でない文字列ではありません。`;
    if ((match = /^(spec\.[\w.]+): expected a string$/.exec(issue))) return `${match[1]} が文字列ではありません。`;
    return "原典が返した理由です（このページの読み方はまだ用意していません）。";
  }

  const showValue = (value) => (isString(value) ? value : JSON.stringify(value));

  // How the repaired input differs from the broken one ("forward"), or the reverse.
  function describeDiff(entry, forward) {
    if (entry.change === "added") {
      return forward ? `${entry.path}「${showValue(entry.after)}」を足した` : `${entry.path}「${showValue(entry.after)}」を除いた`;
    }
    if (entry.change === "removed") {
      return forward ? `${entry.path} を消した` : `${entry.path}「${showValue(entry.before)}」を足した`;
    }
    return forward
      ? `${entry.path} を「${showValue(entry.after)}」にした`
      : `${entry.path} を「${showValue(entry.before)}」にした`;
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
    el.downloadRecord.disabled = !enabled;
    el.copy.disabled = !enabled;
    const item = enabled ? state.byId.get(state.current) : null;
    el.downloadFile.disabled = !(item && item.accepted && isObject(item.file));
  }

  function clearResult() {
    el.viewer.hidden = true;
    el.tally.hidden = true;
    el.repair.hidden = true;
    el.caveat.hidden = true;
    for (const node of [el.kicker, el.title, el.state, el.diagnosisNote, el.repairText, el.repairLink,
      el.rawFileNote, el.rawFile, el.rawInputNote, el.rawInput, el.rawOutput, el.actionStatus]) {
      node.textContent = "";
    }
    el.state.dataset.state = "";
    el.diagnosisBox.dataset.state = "";
    for (const node of [el.tally, el.diagnosis, el.caveatList, el.facts, el.select, el.runFacts]) {
      node.replaceChildren();
    }
    el.fallback.hidden = true;
    el.fallbackLabel.hidden = true;
    el.fallback.value = "";
    state.record = null;
    state.byId = new Map();
    state.current = null;
    state.request = "";
  }

  function node(tag, text, className) {
    const item = document.createElement(tag);
    if (text !== undefined) item.textContent = text;
    if (className) item.className = className;
    return item;
  }

  function addFact(list, label, value, mono) {
    const row = document.createElement("div");
    row.append(node("dt", label), node("dd", value, mono ? "mono" : undefined));
    list.append(row);
  }

  function buildPicker(results) {
    for (const item of results) {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = `${item.id}［${item.accepted ? "形が通った" : "止まった"}］${item.label}`;
      el.select.append(option);
    }
  }

  function renderTally(record) {
    const { total, accepted, rejected } = record.summary;
    el.tally.replaceChildren(
      document.createTextNode(`設定${total}件：形が通った `),
      node("strong", String(accepted)),
      document.createTextNode(" ／ 止まった "),
      node("strong", String(rejected)),
      node("span", `設定の形を検査。予定の登録は行っていません。`, "tally-note"),
    );
    el.tally.hidden = false;
  }

  function renderRunFacts(record) {
    const runtime = isObject(record.runtime) ? record.runtime : {};
    const envelope = record.interface.envelope;
    const add = (label, value) => {
      const row = node("div", undefined, "kv-row");
      row.append(node("dt", label), node("dd", value));
      el.runFacts.append(row);
    };
    add("実行環境", `Node ${runtime.node || "?"}（型除去 ${runtime.typescript || "?"}）・導入したパッケージ ${runtime.packages_installed ?? "?"}件・通信 ${runtime.network === false ? "なし" : "?"}`);
    add("ファイルの封筒", `version ${envelope.fileVersion}・kind ${envelope.fileKind}・接尾辞 ${envelope.filenameSuffix}（getImportExportSpec() の実際の値）`);
    add("読み込みの解決", `${Array.isArray(runtime.module_resolution) ? runtime.module_resolution.length : "?"}件（同梱の原典とパッケージの中だけ）`);
    add("読み込み時の警告", `${Array.isArray(runtime.console_warnings) ? runtime.console_warnings.length : "?"}件（原典が console.warn に出したもの。記録に全文）`);
    add("vendor-lock.json の SHA-256", record.upstream.vendor_lock_sha256);
    for (const [path, value] of Object.entries(record.input_sha256)) {
      if (path !== "vendor-lock.json") add(`${path} の SHA-256`, value);
    }
    add("確認の合計", `${record.verification.total}件すべて合格（記録の checks から数えた数）`);
  }

  function renderDiagnosis(item) {
    el.diagnosis.replaceChildren();
    el.diagnosisBox.dataset.state = item.accepted ? "accepted" : "rejected";
    if (!item.accepted) {
      const issues = item.error.issues;
      el.diagnosisNote.textContent = `原典のエラー${issues.length}件・日本語の読み方`;
      for (const issue of issues) {
        const row = document.createElement("li");
        row.append(node("span", issue, "issue"), node("span", explainIssue(issue), "issue-ja"));
        el.diagnosis.append(row);
      }
      return;
    }

    const obs = item.observations;
    el.diagnosisNote.textContent = "誤りは0件。返った設定から読めること";
    const lines = ["parseAutomationFile は誤りを返さず、設定（spec）を返しました。"];
    const rt = item.roundtrip;
    lines.push(rt.reparsed_equals_parsed === true && rt.reserialized_equals_file === true
      ? "もう一度書き出して読み戻しても、ファイルの中身と設定は同じでした。"
      : "2回目の書き出し・読み戻しで違いが出ました。下の記録を確かめてください。");
    if (Array.isArray(obs.removed_from_input) && obs.removed_from_input.length) {
      lines.push(`元の設定のうち、ファイルに入らなかった項目：${obs.removed_from_input.join("・")}`);
    }
    if (isObject(obs.event)) {
      const on = Array.isArray(obs.event.on) ? obs.event.on : [obs.event.on];
      const kept = obs.event.on_unchanged && obs.event.filter_unchanged ? "そのまま残りました" : "元と違っています";
      lines.push(`event の source「${obs.event.source}」・on ${on.length}件（${on.join("・")}）・filter「${obs.event.filter}」は${kept}。Webhook は配信していません。`);
    }
    if (isObject(obs.prompt) && isObject(obs.prompt.contains)) {
      const parts = [];
      if (obs.prompt.contains.script_tag) parts.push("<script> タグ");
      if (obs.prompt.contains.template_braces) parts.push("波かっこ {{…}}");
      if (obs.prompt.contains.newline) parts.push("改行");
      if (parts.length) {
        lines.push(`prompt の${parts.join("・")}は、ファイルと読み戻しで${obs.prompt.unchanged ? "同じ文字のまま" : "元と違う文字"}でした。このページでも、実行せずに文字として表示しています。`);
      }
    }
    for (const line of lines) el.diagnosis.append(node("li", line, "issue-ja"));
  }

  function renderCaveat(item) {
    el.caveatList.replaceChildren();
    const obs = item.observations;
    const notes = [];
    if (item.accepted && isObject(obs.schedule) && obs.schedule.whitespace_fields !== 5) {
      notes.push(`schedule「${obs.schedule.value}」は cron の5つの欄の形ではありませんが、形は通りました。parseAutomationFile は schedule が空でない文字列かだけを見ていて、cron の書き方や、実際にいつ動くかは確かめていません。予定の登録もしていません。`);
    }
    if (item.accepted && isObject(obs.repositories) && Array.isArray(obs.repositories.dropped) && obs.repositories.dropped.length) {
      const repos = obs.repositories;
      const urls = repos.source.map((entry) => `${entry.url}（${entry.ref}）`).join("・");
      const dropped = repos.dropped.map((entry) => `${entry.url}（${entry.ref}）`).join("・");
      notes.push(`元の設定の参照先は${repos.source.length}件：${urls}。ファイルに入ったのは先頭の1件（${repos.exported.repository}・${repos.exported.branch}）だけで、${dropped} は落ちました。`);
      if (repos.deprecated_overridden) {
        notes.push(`古い repository／branch（${repos.deprecated_top_level.repository}・${repos.deprecated_top_level.branch}）も、先頭の参照先の値で上書きされています。`);
      }
      notes.push(`このファイルは、${repos.source.length}件の参照先を持つ設定の完全な控えではありません。参照先はどれも架空で、取得していません。`);
    }
    for (const note of notes) el.caveatList.append(node("li", note));
    el.caveat.hidden = notes.length === 0;
  }

  function renderRepair(item) {
    el.repair.hidden = true;
    el.repairLink.hidden = true;
    el.repairText.textContent = "";
    el.repairLink.textContent = "";
    const repair = item.observations.repair;
    if (!isObject(repair) || !state.byId.has(repair.partner) || !Array.isArray(repair.input_diff)) return;
    const partner = state.byId.get(repair.partner);
    const outcome = (result) => (result.accepted ? "形が通りました" : "止まりました");
    const count = repair.input_diff.length;
    if (repair.role === "broken") {
      const change = repair.input_diff.map((entry) => describeDiff(entry, true)).join("・");
      el.repairText.textContent = `${partner.id} は、この入力に ${change}ものを、別に呼んだ結果です（違いは${count}か所）。${partner.id} は${outcome(partner)}。`;
      el.repairLink.textContent = `${partner.id} の再確認を見る`;
    } else {
      const change = repair.input_diff.map((entry) => describeDiff(entry, false)).join("・");
      el.repairText.textContent = `${partner.id} は、この入力から ${change}ものです（違いは${count}か所）。${partner.id} は${outcome(partner)}。直す内容は AI が考えたものではなく、実行前に固定した入力です。`;
      el.repairLink.textContent = `${partner.id} を見る`;
    }
    el.repairLink.href = `#${partner.id}`;
    el.repairLink.hidden = false;
    el.repair.hidden = false;
  }

  function filenameNote(item) {
    const source = item.filename_source;
    if (!isObject(source)) return "";
    const fromName = /[A-Za-z0-9]/.test(source.name);
    const basis = fromName
      ? `名前「${source.name}」の英数字から原典が付けた名前`
      : `名前「${source.name}」に英数字が無いため、id「${source.id}」から原典が付けた名前`;
    return item.mode === "import" && !fromName
      ? `${basis}（ファイルには id が無いので、作例の番号を id として渡しました）`
      : basis;
  }

  function renderFacts(item) {
    el.facts.replaceChildren();
    if (!item.accepted) {
      addFact(el.facts, "誤り", `${item.error.issues.length}件`);
      addFact(el.facts, "ファイル", "作られていません（形が通らないので書き出していません）");
      const enabled = item.observations.source_enabled;
      if (isObject(enabled)) {
        addFact(el.facts, "入力の enabled", `${JSON.stringify(enabled.value)}（${enabled.type === "string" ? "文字列" : enabled.type}）`, true);
      }
      return;
    }
    const parsed = item.parsed;
    const trigger = parsed.trigger;
    addFact(el.facts, "ファイル名", item.filename, true);
    addFact(el.facts, "名前の付き方", filenameNote(item));
    addFact(el.facts, "有効", parsed.enabled === false
      ? "false（無効のまま。予定の登録も実行もしていません）"
      : `${JSON.stringify(parsed.enabled)}`);
    if (trigger.type === "event") {
      const on = Array.isArray(trigger.on) ? trigger.on.join(", ") : trigger.on;
      addFact(el.facts, "きっかけ", `event・${trigger.source}・${on}`, true);
    } else {
      addFact(el.facts, "きっかけ", `${trigger.type}・${trigger.schedule}・${trigger.timezone || parsed.timezone || ""}`, true);
    }
    addFact(el.facts, "model・timeout", `model ${JSON.stringify(own(parsed, "model") ? parsed.model : undefined)}・timeout ${parsed.timeout ?? "なし"}`, true);
    if (isString(parsed.repository)) {
      addFact(el.facts, "参照先", `${parsed.repository}（${parsed.branch || ""}）・架空、取得していません`);
    }
  }

  function render(id) {
    const item = state.byId.get(id);
    if (!item) return;
    state.current = id;
    const index = EXPECTED.ids.indexOf(id);

    el.select.value = id;
    el.kicker.textContent = `${item.id} ・ 8件中${index + 1}件目 ・ ${item.mode === "export-roundtrip" ? "設定から書き出して読み戻す" : "ファイルを読み込む"}`;
    el.title.textContent = `${item.id}　${item.label}`;
    el.state.dataset.state = item.accepted ? "accepted" : "rejected";
    el.state.textContent = item.accepted
      ? "形が通った：ファイルの形式"
      : "止まった：設定に不足・不備";

    renderDiagnosis(item);
    renderCaveat(item);
    renderRepair(item);
    renderFacts(item);

    if (item.accepted) {
      el.rawFileNote.textContent = `${item.file_path} と同じ内容です（SHA-256 ${item.file_sha256}）。原典が付けた名前は ${item.filename}。`;
      el.rawFile.textContent = fileText(item.file);
    } else {
      el.rawFileNote.textContent = "形が通らなかったため、ファイルは作られていません。";
      el.rawFile.textContent = "";
    }
    el.rawInputNote.textContent = item.mode === "export-roundtrip"
      ? "サービス側の形（Automation）の架空の設定です。serializeAutomation にそのまま渡しました。"
      : ".automation.json の形の架空のファイルです。parseAutomationFile にそのまま渡しました。";
    el.rawInput.textContent = JSON.stringify(item.input, null, 2);
    el.rawOutput.textContent = JSON.stringify(item, null, 2);

    el.downloadFile.disabled = !(state.ready && item.accepted && isObject(item.file));
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

  function saveText(name, text) {
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    el.actionStatus.textContent = `${name} の保存をブラウザーに渡しました。`;
  }

  const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/;

  el.downloadFile.addEventListener("click", () => {
    if (!state.ready) return;
    const item = state.byId.get(state.current);
    if (!item || !item.accepted || !isObject(item.file)) return;
    const base = SAFE_NAME.test(item.filename) && item.filename.endsWith(EXPECTED.envelope.filenameSuffix)
      ? item.filename
      : `${item.id}${EXPECTED.envelope.filenameSuffix}`;
    saveText(`openhands-${item.id}-${base}`, fileText(item.file));
  });

  el.downloadRecord.addEventListener("click", () => {
    if (!state.ready) return;
    const item = state.byId.get(state.current);
    if (!item) return;
    saveText(`openhands-${item.id}-record.json`, fileText(item));
  });

  el.copy.addEventListener("click", async () => {
    if (!state.ready || !state.request) return;
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
    setStatus("loading", "保存した実行記録を読み込み、固定版とハッシュを確かめています…");
    try {
      const entries = await Promise.all(Object.entries(FILES).map(async ([key, path]) => [key, await fetchBytes(path)]));
      const raw = Object.fromEntries(entries);
      const hashes = {};
      for (const [key, path] of Object.entries(HASHED)) hashes[path] = await sha256Hex(raw[key].buffer);
      const files = {
        record: parseJson(FILES.record, raw.record.text),
        settings: parseJson(FILES.settings, raw.settings.text),
        expected: parseJson(FILES.expected, raw.expected.text),
        lock: parseJson(FILES.lock, raw.lock.text),
      };
      await validate(files, hashes);
      if (!raw.request.text.trim()) fail("request.txt が空です。");

      state.record = files.record;
      state.request = raw.request.text;
      state.byId = new Map(files.record.results.map((item) => [item.id, item]));
      buildPicker(files.record.results);
      renderTally(files.record);
      renderRunFacts(files.record);

      const initial = idFromHash() || EXPECTED.defaultId;
      if (window.location.hash !== `#${initial}`) history.replaceState(null, "", `#${initial}`);
      state.ready = true;
      render(initial);
      el.viewer.hidden = false;
      setControls(true);
      setStatus("ready", "入力・固定版を照合済み。");
    } catch (error) {
      state.ready = false;
      clearResult();
      setControls(false);
      const message = error instanceof LoadError ? error.message : "実行記録を表示できませんでした。";
      setStatus("error", `${message} 古い内容や代わりの結果は表示していません。`);
    } finally {
      state.loading = false;
      if (el.status.dataset.state === "error") el.retry.disabled = false;
    }
  }

  load();
})();
