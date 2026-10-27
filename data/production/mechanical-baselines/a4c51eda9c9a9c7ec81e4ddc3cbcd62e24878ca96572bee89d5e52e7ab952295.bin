// 八百万図AIツールボックス — OpenHands 自動化の設定ファイルの作例（図のページ）。MIT License, Copyright (c) 2026 Studio Yebisu.
// 制作時に固定版の原典の関数で実行して保存した記録を読み、図で見せるページ。ブラウザーで原典・エージェント・AI は動かさない。
// 図の状態（時計・ゲート・保存・参照先）は、照合を通った記録の値から決める。記録の代わりになる値は持たない。
// ファイルは記録の SHA-256 とバイト数に合ったバイト列だけを保存に使う。記録の文字列は textContent で書き、HTML として解釈しない。
"use strict";

(() => {
  const RECORD = "outputs/automation-runs.json";
  const REQUEST = "request.txt";
  const COMPARE = "comparison.html";
  const PIN = Object.freeze({
    format: "studio-yebisu-openhands-automation-runs-v1",
    repository: "OpenHands/OpenHands",
    commit: "e4775b4ba61a83ba80af5f7b0b826201b8e8ea05",
    version: "1.27.1",
    license: "MIT",
    vendorLock: "34149d29d4d4cb0181f41f0b8ac998a5c8baa0c3e13e0af341338eae1dddea02",
    dependency: "@openhands/extensions",
    dependencyVersion: "0.30.0",
    integrity: "sha512-lPyH0iqSow+ARTX4cumR75e3BJmuqpj2YbKm1cqDcI1SQDXfDTr+/wSVH9dQsOmddEP4Zn+uMoLXpKSO/moonA==",
    originalFiles: 12,
    packageFiles: 29,
    checks: 107,
    summary: { total: 8, accepted: 6, rejected: 2 },
    errorName: "AutomationFileValidationError",
    envelope: { fileVersion: 1, fileKind: "automation", filenameSuffix: ".automation.json" },
  });
  const IDS = Object.freeze(["O01", "O02", "O03", "O04", "O05", "O06", "O07", "O08"]);
  const MODES = Object.freeze(["export-roundtrip", "import"]);
  const SCENES = Object.freeze(["O03", "O04", "O06", "O07"]);
  const DEFAULT_ID = "O03";
  // 直した設定 O04 から書き出された実際のファイル（記録の file_sha256 と同じ値）。
  const O04_FILE = Object.freeze({
    path: "outputs/exports/O04.automation.json",
    filename: "O04.automation.json",
    bytes: 602,
    sha256: "5e1ae14b8273237d308dceb6fdad445ce7c6e5e210f4e3b6cadcee951d7a5aa3",
  });
  const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/;
  const HEX64 = /^[0-9a-f]{64}$/;
  const NS = "http://www.w3.org/2000/svg";

  const $ = (id) => document.getElementById(id);
  const ui = {
    diagram: $("diagram"),
    chips: Array.from(document.querySelectorAll(".choice")),
    caption: $("caption"),
    caseNote: $("case-note"),
    caseNoteText: $("case-note-text"),
    caseNoteLink: $("case-note-link"),
    status: $("status"),
    retry: $("retry"),
    repair: $("repair-action"),
    save: $("save-file"),
    saveLabel: $("save-label"),
    compare: $("compare"),
    actionStatus: $("action-status"),
    factsIntro: $("facts-intro"),
    facts: $("facts"),
    factsCompare: $("facts-compare"),
    saveRecord: $("save-record"),
    tally: $("tally"),
    allList: $("all-list"),
    runFacts: $("run-facts"),
    copy: $("copy"),
    copyStatus: $("copy-status"),
    fallback: $("fallback"),
    fallbackLabel: $("fallback-label"),
  };

  // ページの状態。boot() と show() だけが書き換える。
  const state = {
    rows: null,        // id → 照合済みの記録の1件
    views: null,       // 場面の id → 図の状態（記録から作る）
    record: null,
    id: null,          // 表示中の記録の id（不明な id のときは null）
    ready: false,
    loading: false,
    generation: 0,     // ファイル照合の世代。古い結果を捨てる
    previous: null,    // 直前に描いた図の状態（切り替えの動きのため）
    recordUrl: "",
    request: null,
  };
  const fileUrls = new Map(); // file_path → 照合済みの Blob URL
  const pending = new Map();  // file_path → 照合中の Promise
  const wide = window.matchMedia("(min-width: 700px)");

  class LoadError extends Error {}
  const need = (ok, message) => { if (!ok) throw new LoadError(message); };
  const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
  const isString = (v) => typeof v === "string" && v.length > 0;
  const obj = (v) => (isObject(v) ? v : {});
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  // run.mjs が outputs/exports/ と記録に書いたのと同じバイト列：2字下げの JSON と末尾の改行。
  const fileText = (value) => `${JSON.stringify(value, null, 2)}\n`;
  const utf8 = (text) => new TextEncoder().encode(text);

  function deepEqual(a, b) {
    if (a === b) return true;
    if (Array.isArray(a)) return Array.isArray(b) && a.length === b.length && a.every((x, i) => deepEqual(x, b[i]));
    if (isObject(a) && isObject(b)) {
      const keys = Object.keys(a);
      return keys.length === Object.keys(b).length && keys.every((k) => own(b, k) && deepEqual(a[k], b[k]));
    }
    return false;
  }

  // --- 読み込みと照合 -----------------------------------------------------------------------

  async function fetchOk(path) {
    let response;
    try {
      response = await fetch(path, { cache: "no-store", credentials: "same-origin" });
    } catch {
      throw new LoadError(`${path} を読み込めませんでした。ローカルで開くときは HTTP サーバー経由で開いてください。`);
    }
    need(response.ok, `${path} を読み込めませんでした（HTTP ${response.status}）。`);
    return response;
  }

  async function sha256Hex(bytes) {
    need(window.crypto && window.crypto.subtle, "このブラウザーでは SHA-256 を計算できないため、記録を確かめられません。https か localhost で開いてください。");
    const digest = await window.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  }

  function checkRow(row) {
    const id = row.id;
    need(isString(row.label) && MODES.includes(row.mode) && typeof row.accepted === "boolean"
      && isObject(row.input) && isObject(row.observations), `${id} の形が実行記録の形式と合いません。`);
    if (row.accepted) {
      const rt = obj(row.roundtrip);
      need(isObject(row.file) && isObject(row.file.spec)
        && row.file.version === PIN.envelope.fileVersion && row.file.kind === PIN.envelope.fileKind
        && row.file_path === `outputs/exports/${id}.automation.json` && HEX64.test(row.file_sha256)
        && isString(row.filename) && SAFE_NAME.test(row.filename) && row.filename.endsWith(PIN.envelope.filenameSuffix)
        && isObject(row.parsed) && row.error === null
        && rt.reparsed_equals_parsed === true && rt.reserialized_equals_file === true && rt.reserialized_sha256 === row.file_sha256,
      `${id} は形式OKの記録ですが、ファイル・名前・読み戻しの記録がそろっていません。`);
      need(row.parsed.enabled === false && row.file.spec.enabled === false, `${id} の設定が無効（enabled: false）のままになっていません。`);
    } else {
      const error = obj(row.error);
      need(row.file === null && row.file_path === null && row.file_sha256 === null && row.filename === null && row.parsed === null
        && error.name === PIN.errorName && Array.isArray(error.issues) && error.issues.length > 0 && error.issues.every(isString)
        && error.message === error.issues.join("\n") && row.observations.issue_count === error.issues.length,
      `${id} は止まった記録ですが、原典の誤り（name・message・issues）の記録が合いません。`);
    }
  }

  // 図の4場面が依って立つ、記録の中の事実。合わなければ図を描かない。
  function checkScenes(rows) {
    const o3 = rows.get("O03");
    const o4 = rows.get("O04");
    const o6 = rows.get("O06");
    const o7 = rows.get("O07");

    const issues3 = obj(o3.error).issues;
    need(!o3.accepted && Array.isArray(issues3) && issues3.length === 1 && issues3[0].startsWith("spec.trigger.schedule:")
      && deepEqual(o3.observations.issue_paths, ["spec.trigger.schedule"])
      && !own(obj(obj(o3.input.spec).trigger), "schedule"),
    "O03 の記録が「時刻（schedule）の欠けで止まった1件」になっていません。");

    const repair4 = obj(o4.observations.repair);
    const diff = Array.isArray(repair4.input_diff) ? repair4.input_diff : [];
    const restored = JSON.parse(JSON.stringify(o4.input));
    const restoredTrigger = obj(obj(restored.spec).trigger);
    const added = restoredTrigger.schedule;
    delete restoredTrigger.schedule;
    need(o4.accepted && repair4.role === "repaired" && repair4.partner === "O03" && obj(o3.observations.repair).partner === "O04"
      && diff.length === 1 && diff[0].path === "spec.trigger.schedule" && diff[0].change === "added" && diff[0].after === added
      && isString(added) && deepEqual(restored, o3.input) && o4.parsed.trigger.schedule === added,
    "O04 の記録が「O03 に時刻をひとつ戻しただけの設定」になっていません。");
    need(o4.file_path === O04_FILE.path && o4.filename === O04_FILE.filename && o4.file_sha256 === O04_FILE.sha256
      && utf8(fileText(o4.file)).byteLength === O04_FILE.bytes,
    "O04 から書き出したファイルの名前・大きさ・SHA-256 が固定した値と一致しません。");

    const schedule6 = obj(o6.observations.schedule);
    need(o6.accepted && schedule6.whitespace_fields !== 5 && schedule6.accepted_by_parser === true
      && schedule6.cron_grammar_validated === false && isString(schedule6.value)
      && o6.parsed.trigger.schedule === schedule6.value && obj(obj(o6.input.spec).trigger).schedule === schedule6.value,
    "O06 の記録が「cron の形でない時刻でも形式OK」になっていません。");

    const repos = obj(o7.observations.repositories);
    const source = Array.isArray(repos.source) ? repos.source : [];
    const dropped = Array.isArray(repos.dropped) ? repos.dropped : [];
    need(o7.accepted && source.length === 2 && dropped.length === 1 && deepEqual(dropped[0], source[1])
      && deepEqual(o7.input.repositories, source) && isObject(repos.exported)
      && repos.exported.repository === source[0].url && repos.exported.branch === source[0].ref
      && o7.file.spec.repository === source[0].url && o7.file.spec.branch === source[0].ref
      && !fileText(o7.file).includes(source[1].url) && repos.fetched === false,
    "O07 の記録が「参照先ふたつのうち先頭だけが残る」になっていません。");

    need(obj(rows.get("O02").observations.event).webhook_delivered === false, "O02 の記録の Webhook の範囲が読めません。");
    const o8 = rows.get("O08");
    need(o8.accepted && o8.parsed.prompt === o8.input.prompt && obj(obj(o8.observations.prompt).contains).script_tag === true,
      "O08 の記録の文字の保持が読めません。");
  }

  async function validate(record) {
    need(isObject(record) && record.format === PIN.format, "実行記録の形式が違います。");
    const up = obj(record.upstream);
    need(up.repository === PIN.repository && up.commit === PIN.commit && up.version === PIN.version && up.license === PIN.license
      && up.vendor_lock_sha256 === PIN.vendorLock && Array.isArray(up.files) && up.files.length === PIN.originalFiles
      && up.files.every((f) => isObject(f) && isString(f.path) && f.path.startsWith("vendor/openhands/") && HEX64.test(f.sha256)),
    "実行記録の OpenHands の固定版（コミット・版・原典12ファイル）が一致しません。");
    const dep = obj(record.dependency);
    need(dep.name === PIN.dependency && dep.version === PIN.dependencyVersion && dep.license === PIN.license && dep.integrity === PIN.integrity
      && Array.isArray(dep.files) && dep.files.length === PIN.packageFiles
      && dep.files.every((f) => isObject(f) && isString(f.path) && f.path.startsWith("vendor/extensions/") && HEX64.test(f.sha256)),
    "実行記録の @openhands/extensions の固定版（29ファイル）が一致しません。");
    const iface = obj(record.interface);
    need(iface.admitted === true && isObject(iface.envelope)
      && Object.keys(PIN.envelope).every((k) => iface.envelope[k] === PIN.envelope[k]),
    "実行記録のファイルの封筒（version・kind・接尾辞）が合いません。");

    const results = record.results;
    need(Array.isArray(results) && results.length === IDS.length && results.every(isObject), "実行記録が8件ではありません。");
    const ids = results.map((r) => r.id);
    need(new Set(ids).size === IDS.length && ids.every((id, i) => id === IDS[i]), "実行記録が O01〜O08 の8件（重複なし）ではありません。");
    for (const row of results) {
      checkRow(row);
      if (row.accepted) {
        need(await sha256Hex(utf8(fileText(row.file))) === row.file_sha256, `${row.id} のファイルの中身が記録の SHA-256 と一致しません。`);
      }
    }

    const accepted = results.filter((r) => r.accepted).map((r) => r.id);
    const rejected = results.filter((r) => !r.accepted).map((r) => r.id);
    const counts = { total: results.length, accepted: accepted.length, rejected: rejected.length };
    need(deepEqual(record.summary, counts) && deepEqual(counts, PIN.summary), "実行記録の件数のまとめが、8件から数えた値と一致しません。");
    const oracle = obj(record.oracle_comparison);
    need(deepEqual(obj(oracle.accepted_ids).expected, accepted) && deepEqual(obj(oracle.accepted_ids).actual, accepted)
      && deepEqual(obj(oracle.rejected_ids).expected, rejected) && deepEqual(obj(oracle.rejected_ids).actual, rejected),
    "形式OKの件・止まった件が、実行前に決めた期待と一致しません。");
    const verification = obj(record.verification);
    need(verification.status === "passed" && Array.isArray(verification.checks) && verification.checks.length === PIN.checks
      && verification.total === PIN.checks && verification.checks.every((c) => isObject(c) && isString(c.name) && c.passed === true),
    `実行記録の${PIN.checks}件の確認がすべて合格になっていません。`);

    const rows = new Map(results.map((r) => [r.id, r]));
    checkScenes(rows);
    return rows;
  }

  // --- 図の状態（記録の値から） ------------------------------------------------------------

  function viewOf(row) {
    const obs = row.observations;
    const paths = Array.isArray(obs.issue_paths) ? obs.issue_paths : [];
    const schedule = obj(obs.schedule);
    const repos = obj(obs.repositories);
    let clock = "ok";
    if (!row.accepted && paths.includes("spec.trigger.schedule")) clock = "missing";
    else if (row.accepted && isString(schedule.value) && schedule.whitespace_fields !== 5 && schedule.cron_grammar_validated === false) clock = "question";
    const source = Array.isArray(repos.source) ? repos.source.length : 1;
    const dropped = Array.isArray(repos.dropped) ? repos.dropped.length : 0;
    return {
      id: row.id,
      accepted: row.accepted,
      clock,
      repaired: obj(obs.repair).role === "repaired",
      folders: Math.min(2, Math.max(1, source)),
      dropped: dropped > 0,
      run: clock === "question",
    };
  }

  function captionOf(row) {
    if (row.id === "O03") return "時刻が抜けた設定は、読み込みの点検で止まり、ファイルは作られません。";
    if (row.id === "O04") return `同じ設定に時刻「${row.parsed.trigger.schedule}」をひとつ戻すと形式OK。書き出された ${row.filename} を保存できます。`;
    if (row.id === "O06") return `時刻の欄が「${row.observations.schedule.value}」でも形式OK。時刻として正しいか、実際に動くかは確かめていません。`;
    if (row.id === "O07") {
      const repos = row.observations.repositories;
      return `参照先が${repos.source.length}件でも、ファイルに入るのは先頭の1件だけ。${repos.source.length}件目は残りません。`;
    }
    return "";
  }

  function ariaOf(view) {
    if (!view) return "設定ファイル、形式の点検、保存ファイルの関係の図。いまは場面を表示していません。";
    const parts = [`記録 ${view.id} の図。`];
    if (view.clock === "missing") parts.push("設定ファイルの時刻の部品が抜けています。形式の点検の棒が下りて止まり、保存ファイルはありません。");
    if (view.clock === "ok" && view.repaired) parts.push("同じ設定ファイルに時刻の部品が戻り、形式の点検を通って、保存ファイルができています。");
    if (view.clock === "question") parts.push("時刻の部品は埋まっていますが中身は「？」です。形式の点検は通り、保存ファイルができますが、実行の枠には入っていません。");
    if (view.folders === 2) parts.push("設定ファイルには参照先のフォルダーが2つあり、保存ファイルに入ったのは1つ目だけで、2つ目はゲートの外に残っています。");
    return parts.join("");
  }

  // --- 図（SVG） ------------------------------------------------------------------------------

  const LAYOUTS = {
    tall: {
      w: 360, h: 452, flow: "down",
      doc: { x: 104, y: 6, w: 112, h: 132 },
      docLabel: { x: 160, y: 158, size: 15 },
      tag: { cx: 50, cy: 40, w: 84, h: 26, size: 13 },
      gate: {
        postA: { x: 44, y: 180, w: 28, h: 120 }, postB: { x: 248, y: 180, w: 28, h: 120 },
        arm: { x: 72, y: 230, w: 176, h: 22 }, lamp: { cx: 262, cy: 194, r: 7 },
        plate: { cx: 160, cy: 241, w: 70, h: 24, size: 13 }, size: 15,
      },
      halt: { cx: 160, cy: 194, k: 0.5 },
      calendar: { x: 284, y: 180, w: 72, h: 120 },
      dropped: { x: 292, y: 222, w: 56, h: 32 },
      droppedTag: { cx: 320, cy: 282, w: 70, h: 24, size: 12 },
      tray: { x: 26, y: 318, w: 268, h: 130, r: 18 },
      trayLabel: { x: 42, y: 341, size: 15 },
      emblem: { cx: 276, cy: 337, r: 10 },
      saved: { cx: 160, cy: 392, k: 0.54 },
      keepTag: { cx: 76, cy: 404, w: 72, h: 24, size: 12 },
    },
    wide: {
      w: 720, h: 300, flow: "right",
      doc: { x: 70, y: 72, w: 120, h: 141 },
      docLabel: { x: 130, y: 236, size: 15 },
      tag: { cx: 70, cy: 44, w: 84, h: 26, size: 13 },
      gate: {
        postA: { x: 280, y: 58, w: 120, h: 28 }, postB: { x: 280, y: 200, w: 120, h: 28 },
        arm: { x: 329, y: 86, w: 22, h: 114 }, lamp: { cx: 388, cy: 214, r: 7 },
        plate: { cx: 340, cy: 143, w: 70, h: 24, size: 13 }, size: 15,
      },
      halt: { cx: 294, cy: 143, k: 0.5 },
      calendar: { x: 262, y: 240, w: 156, h: 56 },
      dropped: { x: 300, y: 246, w: 56, h: 30 },
      droppedTag: { cx: 404, cy: 261, w: 70, h: 24, size: 12 },
      tray: { x: 452, y: 58, w: 240, h: 170, r: 18 },
      trayLabel: { x: 470, y: 82, size: 15 },
      emblem: { cx: 674, cy: 78, r: 10 },
      saved: { cx: 572, cy: 143, k: 0.62 },
      keepTag: { cx: 572, cy: 256, w: 72, h: 24, size: 12 },
    },
  };

  function el(name, attrs, parent) {
    const node = document.createElementNS(NS, name);
    for (const [k, v] of Object.entries(attrs || {})) node.setAttribute(k, String(v));
    if (parent) parent.append(node);
    return node;
  }

  function label(parent, str, x, y, size, cls, anchor = "middle") {
    const t = el("text", { x, y, "font-size": size, class: cls, "text-anchor": anchor }, parent);
    t.textContent = str;
    return t;
  }

  function scaledBox(doc, at) {
    const w = doc.w * at.k;
    const h = doc.h * at.k;
    return { x: at.cx - w / 2, y: at.cy - h / 2, w, h };
  }

  // 書類の中の部品の位置（入力も保存ファイルも同じ比率）。
  function docGeo(box, folders) {
    const { x, y, w, h } = box;
    const clock = { cx: x + 0.28 * w, cy: y + 0.22 * h, r: 0.15 * w };
    const fy = y + 0.72 * h;
    const fh = 0.17 * h;
    const list = folders === 2
      ? [{ x: x + 0.12 * w, y: fy, w: 0.34 * w, h: fh }, { x: x + 0.54 * w, y: fy, w: 0.34 * w, h: fh }]
      : [{ x: x + 0.13 * w, y: fy, w: 0.4 * w, h: fh }];
    return { clock, folders: list };
  }

  function folderShape(parent, f, n, digit, cls = "") {
    const g = el("g", { class: cls }, parent);
    const t = 0.2 * f.h;
    el("path", {
      class: `d-folder-${n}`,
      d: `M${f.x} ${f.y + t}V${f.y + 2}q0-2 2-2H${f.x + 0.36 * f.w}l${0.1 * f.w} ${t}H${f.x + f.w - 2}q2 0 2 2V${f.y + f.h - 2}q0 2-2 2H${f.x + 2}q-2 0-2-2Z`,
    }, g);
    if (digit) label(g, String(n), f.x + f.w / 2, f.y + f.h * 0.84, f.h * 0.58, "d-digit");
    return g;
  }

  function clockShape(parent, c, kind, cls = "") {
    const g = el("g", { class: cls }, parent);
    if (kind === "missing" || kind === "idle") {
      el("circle", { class: "d-slot", cx: c.cx, cy: c.cy, r: c.r }, g);
      return g;
    }
    el("circle", { class: "d-clock", cx: c.cx, cy: c.cy, r: c.r }, g);
    el("circle", { class: "d-face", cx: c.cx, cy: c.cy, r: c.r * 0.7 }, g);
    if (kind === "question") {
      label(g, "?", c.cx, c.cy + c.r * 0.36, c.r, "d-q");
    } else {
      // 9時の形（記録の時刻を測った値ではなく、時計という部品の絵）。
      el("path", { class: "d-hand", d: `M${c.cx} ${c.cy}V${c.cy - c.r * 0.5}M${c.cx} ${c.cy}H${c.cx - c.r * 0.38}` }, g);
    }
    return g;
  }

  // opt: { out, ghost, clock, folders, digits, keep (表示する参照先の数), ring, newClock }
  function docShape(parent, box, opt, cls = "") {
    const { x, y, w, h } = box;
    const f = 0.2 * w;
    const g = el("g", { class: `${opt.out ? "is-out" : ""} ${opt.ghost ? "is-ghost" : ""} ${cls}`.trim() }, parent);
    el("path", { class: "d-shadow", d: `M${x + 3} ${y + 5}H${x + w - f + 3}L${x + w + 3} ${y + f + 5}V${y + h + 5}H${x + 3}Z` }, g);
    el("path", { class: "d-doc", d: `M${x} ${y}H${x + w - f}L${x + w} ${y + f}V${y + h}H${x}Z` }, g);
    el("path", { class: "d-fold", d: `M${x + w - f} ${y}V${y + f}H${x + w}Z` }, g);
    const bar = (bx, by, bw, bh) => el("rect", { class: "d-bar", x: bx, y: by, width: bw, height: bh, rx: bh / 2 }, g);
    bar(x + 0.52 * w, y + 0.15 * h, 0.22 * w, 0.045 * h);
    bar(x + 0.52 * w, y + 0.25 * h, 0.16 * w, 0.045 * h);
    bar(x + 0.13 * w, y + 0.42 * h, 0.74 * w, 0.04 * h);
    bar(x + 0.13 * w, y + 0.51 * h, 0.74 * w, 0.04 * h);
    bar(x + 0.13 * w, y + 0.6 * h, 0.46 * w, 0.04 * h);
    const geo = docGeo(box, opt.folders);
    clockShape(g, geo.clock, opt.clock, opt.newClock ? "is-new-clock" : "");
    if (opt.ring) el("circle", { class: "d-ring", cx: geo.clock.cx, cy: geo.clock.cy, r: geo.clock.r + 3.5 }, g);
    const keep = opt.keep === undefined ? geo.folders.length : opt.keep;
    geo.folders.slice(0, keep).forEach((fd, i) => folderShape(g, fd, i + 1, opt.digits));
    return geo;
  }

  function pill(parent, p, str, cls) {
    const g = el("g", {}, parent);
    el("rect", { class: `d-tag ${cls || ""}`.trim(), x: p.cx - p.w / 2, y: p.cy - p.h / 2, width: p.w, height: p.h, rx: p.h / 2 }, g);
    label(g, str, p.cx, p.cy + p.size * 0.36, p.size, "d-tag-text");
    return g;
  }

  function chevron(parent, x, y, dir, s = 6) {
    const d = dir === "down" ? `M${x - s} ${y - s / 2}L${x} ${y + s / 2}L${x + s} ${y - s / 2}` : `M${x - s / 2} ${y - s}L${x + s / 2} ${y}L${x - s / 2} ${y + s}`;
    el("path", { class: "d-chev", d }, parent);
  }

  function gateShape(parent, L, armMode, lamp, plate) {
    const G = L.gate;
    const g = el("g", {}, parent);
    for (const p of [G.postA, G.postB]) el("rect", { class: "d-post", x: p.x, y: p.y, width: p.w, height: p.h, rx: Math.min(p.w, p.h) / 2.4 }, g);
    const text = "形式の点検";
    if (L.flow === "down") {
      [...text].forEach((ch, i) => label(g, ch, G.postA.x + G.postA.w / 2, G.postA.y + 22 + i * 20, G.size, "d-post-text"));
    } else {
      label(g, text, G.postA.x + G.postA.w / 2, G.postA.y + G.postA.h / 2 + G.size * 0.36, G.size, "d-post-text");
    }
    el("circle", { class: `d-lamp ${lamp === "ok" ? "is-ok" : lamp === "stop" ? "is-stop" : ""}`.trim(), cx: G.lamp.cx, cy: G.lamp.cy, r: G.lamp.r }, g);
    const a = G.arm;
    if (armMode === "closed" || armMode === "retract") {
      const cls = armMode === "retract" ? (L.flow === "down" ? "d-arm d-arm-retract-x" : "d-arm d-arm-retract-y") : "d-arm";
      el("rect", { class: cls, x: a.x, y: a.y, width: a.w, height: a.h, rx: 3 }, g);
    }
    if (armMode === "closed") {
      if (L.flow === "down") {
        el("rect", { class: "d-arm-box", x: a.x + a.w / 2 - 28, y: a.y + 3, width: 56, height: a.h - 6, rx: 4 }, g);
        label(g, "止まる", a.x + a.w / 2, a.y + a.h / 2 + 4.5, 12.5, "d-arm-text");
      } else {
        el("rect", { class: "d-arm-box", x: a.x + 3, y: a.y + a.h / 2 - 27, width: a.w - 6, height: 54, rx: 4 }, g);
        [..."止まる"].forEach((ch, i) => label(g, ch, a.x + a.w / 2, a.y + a.h / 2 - 12 + i * 15, 12.5, "d-arm-text"));
      }
    }
    if (plate) {
      const p = G.plate;
      el("rect", { class: "d-plate", x: p.cx - p.w / 2, y: p.cy - p.h / 2, width: p.w, height: p.h, rx: p.h / 2 }, g);
      label(g, "形式OK", p.cx, p.cy + p.size * 0.36, p.size, "d-plate-text");
    }
  }

  function emblem(parent, e, ready) {
    el("circle", { class: `d-emblem${ready ? " is-ready" : ""}`, cx: e.cx, cy: e.cy, r: e.r }, parent);
    const s = e.r * 0.45;
    el("path", {
      class: `d-emblem-arrow${ready ? " is-ready" : ""}`,
      d: `M${e.cx} ${e.cy - s}V${e.cy + s * 0.5}M${e.cx - s * 0.6} ${e.cy}L${e.cx} ${e.cy + s * 0.6}L${e.cx + s * 0.6} ${e.cy}M${e.cx - s} ${e.cy + s * 1.05}H${e.cx + s}`,
    }, parent);
  }

  function calendarShape(parent, c, flow) {
    const g = el("g", {}, parent);
    el("rect", { class: "d-cal", x: c.x, y: c.y, width: c.w, height: c.h, rx: 10 }, g);
    if (flow === "down") {
      label(g, "実行", c.x + c.w / 2, c.y + 22, 14, "d-cal-head");
      for (let r = 0; r < 2; r++) for (let k = 0; k < 3; k++) {
        el("rect", { class: "d-cal-cell", x: c.x + 12 + k * 17, y: c.y + 32 + r * 14, width: 13, height: 10, rx: 2 }, g);
      }
      el("circle", { class: "d-slot", cx: c.x + c.w / 2, cy: c.y + 79, r: 11 }, g);
      label(g, "別の確認", c.x + c.w / 2, c.y + c.h - 10, 12, "d-cal-note");
    } else {
      el("circle", { class: "d-slot", cx: c.x + 24, cy: c.y + c.h / 2, r: 12 }, g);
      label(g, "実行", c.x + 46, c.y + 24, 14, "d-cal-head", "start");
      label(g, "別の確認", c.x + 46, c.y + 44, 12, "d-cal-note", "start");
      for (let r = 0; r < 2; r++) for (let k = 0; k < 2; k++) {
        el("rect", { class: "d-cal-cell", x: c.x + 112 + k * 18, y: c.y + 14 + r * 15, width: 14, height: 11, rx: 2 }, g);
      }
    }
  }

  function buildDiagram(view, animate, fileReady) {
    const key = wide.matches ? "wide" : "tall";
    const L = LAYOUTS[key];
    ui.diagram.dataset.layout = key;
    const svg = el("svg", { viewBox: `0 0 ${L.w} ${L.h}`, "aria-hidden": "true", focusable: "false" });
    const defs = el("defs", {}, svg);
    const pattern = el("pattern", { id: "d-stripes", width: 10, height: 10, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, defs);
    el("rect", { width: 10, height: 10, fill: "#f7a86e" }, pattern);
    el("rect", { width: 4.5, height: 10, fill: "#fffdf6", opacity: 0.75 }, pattern);

    const idle = !view;
    const prev = state.previous;
    const root = el("g", { class: idle ? "d-idle" : "" }, svg);
    const docBox = L.doc;
    const savedBox = scaledBox(L.doc, L.saved);

    // 流れの線：設定ファイル → 点検 → 保存ファイル。
    const flowCls = idle ? "d-flow" : "d-flow is-on";
    const passCls = idle ? "d-flow" : view.accepted ? "d-flow is-pass" : "d-flow is-off";
    if (L.flow === "down") {
      const x = docBox.x + docBox.w / 2;
      const gateMid = L.gate.arm.y + L.gate.arm.h / 2;
      el("path", { class: flowCls, d: `M${x} ${docBox.y + docBox.h + 26}V${gateMid}` }, root);
      el("path", { class: passCls, d: `M${x} ${gateMid}V${savedBox.y - 4}` }, root);
      chevron(root, x, docBox.y + docBox.h + 30, "down");
      chevron(root, x, L.tray.y - 6, "down");
    } else {
      const y = L.gate.plate.cy;
      const gateMid = L.gate.arm.x + L.gate.arm.w / 2;
      el("path", { class: flowCls, d: `M${docBox.x + docBox.w + 6} ${y}H${gateMid}` }, root);
      el("path", { class: passCls, d: `M${gateMid} ${y}H${savedBox.x - 4}` }, root);
      chevron(root, docBox.x + docBox.w + 40, y, "right");
      chevron(root, L.tray.x - 14, y, "right");
    }

    // 保存の台。
    el("rect", { class: "d-tray", x: L.tray.x, y: L.tray.y, width: L.tray.w, height: L.tray.h, rx: L.tray.r }, root);
    label(root, "保存ファイル", L.trayLabel.x, L.trayLabel.y, L.trayLabel.size, "d-tray-label", "start");
    emblem(root, L.emblem, !idle && view.accepted && fileReady);

    // 点検のゲート。
    let armMode = "none";
    let lamp = "idle";
    if (!idle) {
      if (!view.accepted) {
        armMode = "closed";
        lamp = "stop";
      } else {
        armMode = animate && prev && !prev.accepted ? "retract" : "none";
        lamp = "ok";
      }
    }
    gateShape(root, L, armMode, lamp, !idle && view.accepted);

    // 設定ファイル（入力）。
    const docGeoIn = docShape(root, docBox, {
      clock: idle ? "idle" : view.clock,
      folders: idle ? 1 : view.folders,
      digits: !idle && view.folders === 2,
      ring: !idle && view.repaired,
      newClock: !idle && view.repaired && animate && prev && prev.clock === "missing",
    });
    label(root, "設定ファイル", L.docLabel.x, L.docLabel.y, L.docLabel.size, "d-label");

    if (!idle && !view.accepted) {
      // 止まった写し：点検の棒の手前で止まる。保存の台には何もない。
      docShape(root, scaledBox(L.doc, L.halt), { clock: view.clock, folders: view.folders, ghost: true });
      el("rect", { class: "d-empty", x: savedBox.x, y: savedBox.y, width: savedBox.w, height: savedBox.h, rx: 4 }, root);
      label(root, "保存なし", L.saved.cx, L.saved.cy + 4, 12, "d-empty-text");
    } else if (!idle) {
      docShape(root, savedBox, {
        out: true,
        clock: view.clock,
        folders: 1, // 書き出したファイルに入る参照先は1件（O07 では先頭の1件）
        digits: view.folders === 2,
        keep: 1,
      }, animate ? "is-new-saved" : "");
    } else {
      el("rect", { class: "d-empty", x: savedBox.x, y: savedBox.y, width: savedBox.w, height: savedBox.h, rx: 4 }, root);
    }

    if (!idle && view.clock === "missing") {
      const c = docGeoIn.clock;
      const t = L.tag;
      if (L.flow === "down") el("path", { class: "d-leader", d: `M${t.cx + t.w / 2} ${t.cy}L${c.cx - c.r - 3} ${c.cy}` }, root);
      else el("path", { class: "d-leader", d: `M${t.cx} ${t.cy + t.h / 2}L${c.cx - c.r * 0.7} ${c.cy - c.r * 0.7}` }, root);
      pill(root, t, "時刻なし", "is-stop");
    }
    if (!idle && view.repaired) {
      const c = docGeoIn.clock;
      const t = L.tag;
      if (L.flow === "down") el("path", { class: "d-leader", d: `M${t.cx + t.w / 2} ${t.cy}L${c.cx - c.r - 5} ${c.cy}` }, root);
      else el("path", { class: "d-leader", d: `M${t.cx} ${t.cy + t.h / 2}L${c.cx - c.r * 0.75} ${c.cy - c.r * 0.75}` }, root);
      pill(root, t, "時刻を戻す", "is-ok");
    }
    if (!idle && view.run) calendarShape(root, L.calendar, L.flow);
    if (!idle && view.dropped) {
      const d = L.dropped;
      const g = el("g", { class: "d-dropped", transform: `rotate(-9 ${d.x + d.w / 2} ${d.y + d.h / 2})`, opacity: 0.85 }, root);
      folderShape(g, d, 2, true, animate ? "is-new-dropped" : "");
      pill(root, L.droppedTag, "残らない", "is-stop");
      const sf = docGeo(savedBox, 1).folders[0];
      const k = L.keepTag;
      if (L.flow === "down") el("path", { class: "d-leader", d: `M${k.cx + k.w / 2} ${k.cy}L${sf.x - 2} ${sf.y + sf.h / 2}` }, root);
      else el("path", { class: "d-leader", d: `M${k.cx} ${k.cy - k.h / 2}L${sf.x + sf.w / 2} ${savedBox.y + savedBox.h + 2}` }, root);
      pill(root, k, "先頭だけ", "is-ok");
    }

    ui.diagram.replaceChildren(svg);
    ui.diagram.setAttribute("aria-label", ariaOf(view));
  }

  // --- 表示 ----------------------------------------------------------------------------------

  function setStatus(kind, message) {
    ui.status.dataset.state = kind;
    ui.status.textContent = message;
  }

  function setLink(link, url, filename) {
    if (url) {
      link.href = url;
      link.download = filename;
      link.removeAttribute("aria-disabled");
    } else {
      link.removeAttribute("href");
      link.removeAttribute("download");
      link.setAttribute("aria-disabled", "true");
    }
  }

  function addFact(term, value, mono) {
    const row = document.createElement("div");
    const dt = document.createElement("dt");
    dt.textContent = term;
    const dd = document.createElement("dd");
    dd.textContent = value;
    if (mono) dd.className = "mono";
    row.append(dt, dd);
    ui.facts.append(row);
  }

  function triggerText(trigger) {
    if (!isObject(trigger)) return "（なし）";
    if (trigger.type === "event") {
      const on = Array.isArray(trigger.on) ? trigger.on.join(", ") : String(trigger.on);
      return `event ・ ${trigger.source} ・ ${on}`;
    }
    const schedule = own(trigger, "schedule") ? `「${trigger.schedule}」` : "時刻（schedule）なし";
    return `${trigger.type} ・ ${schedule}${trigger.timezone ? ` ・ ${trigger.timezone}` : ""}`;
  }

  function renderFacts(row) {
    ui.facts.replaceChildren();
    ui.factsIntro.textContent = row.mode === "export-roundtrip"
      ? `${row.id}「${row.label}」：架空の設定を serializeAutomation で書き出し、parseAutomationFile で読み戻した実際の値です。`
      : `${row.id}「${row.label}」：架空の .automation.json を parseAutomationFile にそのまま渡した実際の値です。`;
    const input = row.input;
    const inputTrigger = isObject(input.spec) ? input.spec.trigger : input.trigger;
    addFact("入力のきっかけ", triggerText(inputTrigger));
    if (Array.isArray(input.repositories)) {
      addFact("入力の参照先", input.repositories.map((r, i) => `${i + 1}. ${r.url}（${r.ref}）`).join("\n"), true);
    }
    if (row.accepted) {
      addFact("結果", "形式OK（parseAutomationFile が設定を返しました。予定の登録・実行はしていません）");
      addFact("書き出したファイル", row.file_path, true);
      addFact("原典が付けた名前", row.filename, true);
      addFact("大きさ", `${utf8(fileText(row.file)).byteLength} バイト`);
      addFact("SHA-256", row.file_sha256, true);
      addFact("ファイルのきっかけ", triggerText(row.file.spec.trigger));
      addFact("ファイルの参照先", `${row.file.spec.repository}（${row.file.spec.branch}）・架空、取得していません`, true);
      const removed = row.observations.removed_from_input;
      if (Array.isArray(removed) && removed.length) addFact("ファイルに入らなかった項目", removed.join("・"), true);
      const repos = row.observations.repositories;
      if (isObject(repos) && Array.isArray(repos.dropped) && repos.dropped.length) {
        addFact("残らなかった参照先", repos.dropped.map((r) => `${r.url}（${r.ref}）`).join("\n"), true);
      }
      const schedule = row.observations.schedule;
      if (isObject(schedule) && schedule.cron_grammar_validated === false) {
        addFact("時刻の点検", `空でない文字列かだけを見ています（cron の書き方は未確認・空白で区切った欄 ${schedule.whitespace_fields}個）`);
      }
    } else {
      addFact("結果", `止まりました（${row.error.name}・理由${row.error.issues.length}件）。ファイルは作られていません。`);
      addFact("原典の理由", row.error.issues.join("\n"), true);
    }
    const repair = row.observations.repair;
    if (isObject(repair) && Array.isArray(repair.input_diff)) {
      const diff = repair.input_diff.map((d) => `${d.path} ${d.change === "added" ? `に「${d.after}」を足す` : d.change}`).join("・");
      addFact(repair.role === "broken" ? `${repair.partner} との違い` : `${repair.partner} からの違い`, `${diff}（違いは${repair.input_diff.length}か所。実行前に固定した入力で、AI が考えた修正ではありません）`);
    }
  }

  function renderAll(record, rows) {
    const { total, accepted, rejected } = record.summary;
    ui.tally.textContent = `設定${total}件：形式OK ${accepted}件 ／ 止まった ${rejected}件（形の点検の結果。予定の登録はしていません）`;
    const items = IDS.map((id) => {
      const row = rows.get(id);
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = `#${id}`;
      a.textContent = `${id}「${row.label}」${row.accepted ? "形式OK" : "止まった"}${SCENES.includes(id) ? "（図）" : ""}`;
      li.append(a);
      return li;
    });
    ui.allList.replaceChildren(...items);
    const runtime = obj(record.runtime);
    ui.runFacts.textContent = `Node ${runtime.node || "?"}・通信 ${runtime.network === false ? "なし" : "?"}・導入したパッケージ ${runtime.packages_installed ?? "?"}件・確認 ${record.verification.total}件すべて合格`;
  }

  function clearView() {
    ui.caption.textContent = "";
    ui.caseNote.hidden = true;
    ui.caseNoteText.textContent = "";
    ui.repair.hidden = true;
    ui.save.hidden = true;
    setLink(ui.save, "", "");
    ui.actionStatus.textContent = "";
    ui.facts.replaceChildren();
    ui.factsIntro.textContent = "記録を読み込むと、選んだ場面の実際の値を表示します。";
    ui.factsCompare.href = COMPARE;
    ui.compare.href = COMPARE;
    ui.compare.textContent = "元の記録で見る";
    if (state.recordUrl) URL.revokeObjectURL(state.recordUrl);
    state.recordUrl = "";
    setLink(ui.saveRecord, "", "");
    for (const chip of ui.chips) chip.setAttribute("aria-pressed", "false");
  }

  function revokeFiles() {
    for (const url of fileUrls.values()) URL.revokeObjectURL(url);
    fileUrls.clear();
    pending.clear();
  }

  // 記録の file_path のバイト列を取り、記録から作った大きさと SHA-256 に合ったものだけを Blob URL にする。
  function verifiedFile(row) {
    if (fileUrls.has(row.file_path)) return Promise.resolve(fileUrls.get(row.file_path));
    if (pending.has(row.file_path)) return pending.get(row.file_path);
    const job = (async () => {
      const expected = utf8(fileText(row.file)).byteLength;
      const response = await fetchOk(row.file_path);
      const buffer = await response.arrayBuffer();
      need(buffer.byteLength === expected, `${row.file_path} の大きさが記録と違います（${buffer.byteLength} バイト・記録から ${expected} バイト）。`);
      if (row.id === "O04") need(buffer.byteLength === O04_FILE.bytes, `${row.file_path} が ${O04_FILE.bytes} バイトではありません。`);
      need(await sha256Hex(buffer) === row.file_sha256, `${row.file_path} の SHA-256 が記録と一致しません。`);
      const url = URL.createObjectURL(new Blob([buffer], { type: "application/json" }));
      fileUrls.set(row.file_path, url);
      return url;
    })();
    pending.set(row.file_path, job);
    job.then(() => pending.delete(row.file_path), () => pending.delete(row.file_path));
    return job;
  }

  // 図を描き直さずに、保存の印だけを切り替える（場面の切り替えの動きを途中で切らないため）。
  function setEmblem(ready) {
    for (const node of ui.diagram.querySelectorAll(".d-emblem, .d-emblem-arrow")) node.classList.toggle("is-ready", ready);
  }

  async function prepareSave(row) {
    const generation = ++state.generation;
    ui.save.hidden = false;
    setLink(ui.save, "", "");
    ui.saveLabel.textContent = "ファイルを確かめています…";
    try {
      const url = await verifiedFile(row);
      if (generation !== state.generation || state.id !== row.id) return;
      setLink(ui.save, url, row.filename);
      ui.saveLabel.textContent = `${row.filename} を保存`;
      setEmblem(state.views.has(row.id));
    } catch (error) {
      if (generation !== state.generation) return;
      setLink(ui.save, "", "");
      ui.save.hidden = true;
      setEmblem(false);
      ui.caption.textContent = "形式の点検は通りましたが、保存ファイルを照合できません。";
      setStatus("error", `${error instanceof LoadError ? error.message : "ファイルを確かめられませんでした。"} このファイルは保存に使いません。`);
      ui.retry.hidden = false;
    }
  }

  function show(raw) {
    if (!state.ready) return;
    clearView();
    state.generation += 1;
    setStatus("ready", "");
    ui.retry.hidden = true;
    const row = state.rows.get(raw);
    if (!row) {
      // 知らない id：図は場面なしのまま。代わりの結果は出さない。
      state.id = null;
      buildDiagram(null, false, false);
      state.previous = null;
      ui.caseNoteText.textContent = `「${raw}」に当たる記録はありません。上の4つから場面を選ぶか、`;
      ui.caseNoteLink.href = COMPARE;
      ui.caseNoteLink.textContent = "8件の記録を開く";
      ui.caseNote.hidden = false;
      return;
    }

    state.id = row.id;
    ui.compare.href = `${COMPARE}#${row.id}`;
    ui.factsCompare.href = `${COMPARE}#${row.id}`;
    renderFacts(row);
    state.recordUrl = URL.createObjectURL(new Blob([fileText(row)], { type: "application/json" }));
    setLink(ui.saveRecord, state.recordUrl, `openhands-${row.id}-record.json`);

    const view = state.views.get(row.id) || null;
    for (const chip of ui.chips) chip.setAttribute("aria-pressed", String(chip.dataset.case === row.id));
    if (view) {
      buildDiagram(view, Boolean(state.previous) && state.previous.id !== view.id, false);
      state.previous = view;
      ui.caption.textContent = captionOf(row);
      if (row.id === "O07") ui.compare.textContent = "元の設定と見比べる";
      if (row.id === "O03") ui.repair.hidden = false;
    } else {
      // 図の4場面にない記録：図は場面なしにして、記録の要点と8件の記録へのリンクを出す。
      buildDiagram(null, false, false);
      state.previous = null;
      ui.caseNoteText.textContent = row.accepted
        ? `${row.id}「${row.label}」は形式OKの記録です。この図の4場面には入っていないため、入力と出力は`
        : `${row.id}「${row.label}」は止まった記録です（理由${row.error.issues.length}件・ファイルなし）。この図の4場面には入っていないため、入力と理由は`;
      ui.caseNoteLink.href = `${COMPARE}#${row.id}`;
      ui.caseNoteLink.textContent = `8件の記録の ${row.id} で見る`;
      ui.caseNote.hidden = false;
    }
    if (row.accepted) prepareSave(row);
  }

  function rawHash() {
    const value = location.hash.slice(1);
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  function route() {
    if (!state.ready) return;
    const raw = rawHash();
    if (!raw) {
      history.replaceState(null, "", `#${DEFAULT_ID}`);
      show(DEFAULT_ID);
      return;
    }
    // ページの中の見出し（#film など）へのリンクは記録の id ではない。開いて、場面はそのままにする。
    const target = state.rows.has(raw) ? null : document.getElementById(raw);
    if (target) {
      if (target.tagName === "DETAILS") target.open = true;
      if (!state.id) show(DEFAULT_ID);
      return;
    }
    show(raw);
  }

  function lock() {
    state.ready = false;
    state.rows = null;
    state.views = null;
    state.record = null;
    state.id = null;
    state.previous = null;
    state.generation += 1;
    revokeFiles();
    clearView();
    for (const chip of ui.chips) chip.disabled = true;
    ui.tally.textContent = "記録を読み込むと、件数を表示します。";
    ui.allList.replaceChildren();
    ui.runFacts.textContent = "記録を読み込むと表示します。";
    buildDiagram(null, false, false);
  }

  // --- 操作 ----------------------------------------------------------------------------------

  for (const chip of ui.chips) {
    chip.addEventListener("click", () => {
      const id = chip.dataset.case;
      if (!state.ready || id === state.id) return;
      location.hash = id; // hashchange が表示を切り替え、戻る・進むにも残る
    });
  }
  ui.repair.addEventListener("click", () => {
    if (state.ready) location.hash = "O04";
  });
  window.addEventListener("hashchange", route);
  wide.addEventListener("change", () => {
    if (!state.ready) {
      buildDiagram(null, false, false);
      return;
    }
    const view = state.id ? state.views.get(state.id) || null : null;
    buildDiagram(view, false, Boolean(view && !ui.save.hasAttribute("aria-disabled")));
  });

  ui.save.addEventListener("click", (event) => {
    if (ui.save.getAttribute("aria-disabled") === "true") {
      event.preventDefault();
      return;
    }
    ui.actionStatus.textContent = `${ui.save.download} の保存をブラウザーに渡しました。`;
  });
  ui.saveRecord.addEventListener("click", (event) => {
    if (ui.saveRecord.getAttribute("aria-disabled") === "true") event.preventDefault();
  });

  function showFallback() {
    ui.fallback.value = state.request;
    ui.fallback.hidden = false;
    ui.fallbackLabel.hidden = false;
    ui.copyStatus.textContent = "";
    ui.fallback.focus();
    ui.fallback.select();
  }

  function legacyCopy(text) {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "0";
    area.style.opacity = "0";
    area.style.fontSize = "16px";
    document.body.append(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    area.remove();
    return ok;
  }

  ui.copy.addEventListener("click", () => {
    if (typeof state.request !== "string") return;
    ui.fallback.hidden = true;
    ui.fallbackLabel.hidden = true;
    const done = () => { ui.copyStatus.textContent = "依頼文をコピーしました。"; };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(state.request).then(done, showFallback);
    } else if (legacyCopy(state.request)) {
      done();
    } else {
      showFallback();
    }
  });

  async function loadRequest() {
    ui.copy.disabled = true;
    try {
      const response = await fetchOk(REQUEST);
      const text = new TextDecoder("utf-8", { fatal: true }).decode(await response.arrayBuffer());
      need(text.trim().length > 0, "request.txt が空です。");
      state.request = text;
      ui.copy.disabled = false;
      ui.copyStatus.textContent = "";
    } catch {
      state.request = null;
      ui.copyStatus.textContent = "依頼文を読み込めませんでした。上の request.txt から開けます。";
    }
  }

  // --- 起動 ----------------------------------------------------------------------------------

  async function boot() {
    if (state.loading) return;
    state.loading = true;
    lock();
    ui.retry.hidden = true;
    ui.retry.disabled = true;
    setStatus("loading", "保存済みの実行結果を確かめています…");
    try {
      const response = await fetchOk(RECORD);
      let record;
      try {
        record = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(await response.arrayBuffer()));
      } catch {
        throw new LoadError(`${RECORD} を JSON として読めません。`);
      }
      const rows = await validate(record);
      state.record = record;
      state.rows = rows;
      state.views = new Map(SCENES.map((id) => [id, viewOf(rows.get(id))]));
      renderAll(record, rows);
      for (const chip of ui.chips) chip.disabled = false;
      state.ready = true;
      setStatus("ready", "");
      route();
    } catch (error) {
      lock();
      setStatus("error", `${error instanceof LoadError ? error.message : "実行記録を表示できませんでした。"} 古い内容や代わりの結果は表示していません。`);
      ui.retry.hidden = false;
    } finally {
      state.loading = false;
      ui.retry.disabled = false;
    }
  }

  ui.retry.addEventListener("click", () => boot());

  boot();
  loadRequest();
})();
