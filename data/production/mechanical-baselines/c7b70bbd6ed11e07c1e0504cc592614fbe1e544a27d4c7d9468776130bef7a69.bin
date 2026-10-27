// 八百万図AIツールボックス — Letta Code 作例ページ。MIT License, Copyright (c) 2026 Studio Yebisu.
// 保存した実行記録を読むだけのページ。検査をブラウザーで計算し直さず、記録の値をそのまま表示する。
// データはすべて textContent とテキストノードで書き、HTML として解釈しない。
"use strict";

(() => {
  const EXPECTED = {
    format: "studio-yebisu-letta-memory-runs-v1",
    inputFormat: "studio-yebisu-letta-memory-changes-v1",
    upstream: {
      repository: "letta-ai/letta-code",
      commit: "316e4c0545b549c453e0f85cc81d3540404eff74",
      version: "0.34.14",
      license: "Apache-2.0",
    },
    inputSha256: {
      "input/memory-changes.json": "852d6c0708eb9c42d31f71ad6fc6f8fcb95849d0d1eb72f4094e60a3e20311e0",
      "input/expected.json": "0f61d8dd6a58b99100759421295ea24a7436a32cb91304111c78b0cb5227a1a8",
      "vendor-lock.json": "a62fbf74fa35f609756adf4b9ef2bbfcfe7e46cfd291058be455601bbc8d4d57",
    },
    vendorFileCount: 8,
    policy: { version: 1, maxDepth: 2, maxFileCharacters: 900, maxCoreMemoryCharacters: 1200, readOnlyFiles: ["persona.md"] },
    ids: ["L01", "L02", "L03", "L04", "L05", "L06", "L07", "L08"],
    defaultId: "L02",
    repairPair: ["L02", "L03"],
  };
  const FILES = {
    record: "outputs/memory-runs.json",
    changes: "input/memory-changes.json",
    expected: "input/expected.json",
    lock: "vendor-lock.json",
    request: "request.txt",
  };
  const HASHED = { changes: "input/memory-changes.json", expected: "input/expected.json", lock: "vendor-lock.json" };

  const $ = (id) => document.getElementById(id);
  const el = {
    status: $("status"),
    statusText: $("status-text"),
    retry: $("retry"),
    tally: $("tally"),
    select: $("sample-select"),
    buttons: $("sample-buttons"),
    viewer: $("viewer"),
    kicker: $("sample-kicker"),
    title: $("sample-title"),
    state: $("result-state"),
    reason: $("reason"),
    diagnosis: $("diagnosis"),
    facts: $("git-facts"),
    repair: $("repair"),
    repairText: $("repair-text"),
    repairLink: $("repair-link"),
    tree: $("tree-diff"),
    fileList: $("file-list"),
    beforeMeta: $("before-meta"),
    beforeContent: $("before-content"),
    afterMeta: $("after-meta"),
    afterContent: $("after-content"),
    download: $("download-record"),
    copy: $("copy-request"),
    actionStatus: $("action-status"),
    fallback: $("request-fallback"),
    fallbackLabel: $("request-fallback-label"),
    apiTree: $("api-tree"),
    apiFrontmatter: $("api-frontmatter"),
    cliExit: $("cli-exit"),
    cliStdout: $("cli-stdout"),
    cliStdoutEmpty: $("cli-stdout-empty"),
    cliStderr: $("cli-stderr"),
    cliStderrEmpty: $("cli-stderr-empty"),
    gitExit: $("git-exit"),
    gitStdout: $("git-stdout"),
    gitStdoutEmpty: $("git-stdout-empty"),
    gitStderr: $("git-stderr"),
    gitStderrEmpty: $("git-stderr-empty"),
    rawInput: $("raw-input"),
    rawOutput: $("raw-output"),
    runFacts: $("run-facts"),
  };

  const state = { ready: false, loading: false, record: null, byId: new Map(), current: null, file: null, request: "" };

  class LoadError extends Error {}

  function fail(message) {
    throw new LoadError(message);
  }

  const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
  const isString = (value) => typeof value === "string";
  const short = (commit) => (isString(commit) ? commit.slice(0, 7) : "");
  const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

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

  function validateResultShape(item) {
    const id = item && item.id;
    const git = item && item.git_commit;
    const cli = item && item.cli;
    const api = item && item.api;
    const ok = isObject(item)
      && isString(item.label)
      && isString(item.reason_ja)
      && typeof item.committed === "boolean"
      && isObject(item.input) && isObject(item.input.accepted_files) && isObject(item.input.proposed_files)
      && isObject(item.baseline) && isString(item.baseline.commit)
      && isObject(git) && typeof git.exit_code === "number" && isString(git.stdout) && isString(git.stderr)
      && Array.isArray(git.reported_errors) && isString(git.head_before) && isString(git.head_after)
      && Array.isArray(git.staged_changes_before) && Array.isArray(git.staged_changes_after)
      && isObject(cli) && typeof cli.exit_code === "number" && isString(cli.stdout) && isString(cli.stderr)
      && isObject(api) && isObject(api.tree) && Array.isArray(api.frontmatter)
      && Array.isArray(api.projected_paths) && Array.isArray(api.not_projected_paths);
    if (!ok) fail(`${id || "記録の1件"} の形が実行記録の形式と合いません。`);
  }

  function validate(files, hashes) {
    const { record, changes, expected, lock } = files;
    if (!isObject(record) || record.format !== EXPECTED.format) fail("実行記録の形式が違います。");

    const upstream = isObject(record.upstream) ? record.upstream : {};
    for (const key of Object.keys(EXPECTED.upstream)) {
      if (upstream[key] !== EXPECTED.upstream[key]) fail("実行記録の Letta Code の固定版が一致しません。");
    }

    const recorded = isObject(record.input_sha256) ? record.input_sha256 : {};
    for (const [path, pinned] of Object.entries(EXPECTED.inputSha256)) {
      if (hashes[path] !== pinned) fail(`${path} の SHA-256 が、実行前に固定した値と一致しません。`);
      if (recorded[path] !== pinned) fail(`実行記録にある ${path} の SHA-256 が一致しません。`);
    }
    if (upstream.vendor_lock_sha256 !== EXPECTED.inputSha256["vendor-lock.json"]) fail("実行記録の vendor-lock.json の SHA-256 が一致しません。");

    if (!isObject(lock) || Object.keys(EXPECTED.upstream).some((key) => lock[key] !== EXPECTED.upstream[key])) {
      fail("vendor-lock.json の固定版が一致しません。");
    }
    if (!Array.isArray(lock.files) || lock.files.length !== EXPECTED.vendorFileCount) {
      fail(`vendor-lock.json の対象が${EXPECTED.vendorFileCount}ファイルではありません。`);
    }
    const lockFiles = lock.files.map((file) => ({ path: file.path, sha256: file.sha256, bytes: file.bytes, git_blob_sha1: file.git_blob_sha1 }));
    if (!deepEqual(upstream.files, lockFiles)) fail("実行記録の原典ファイルの照合が vendor-lock.json と一致しません。");

    if (!isObject(changes) || changes.format !== EXPECTED.inputFormat || changes.fictional !== true || !Array.isArray(changes.cases)) {
      fail("input/memory-changes.json の形が違います。");
    }
    if (!deepEqual(changes.trusted_policy, EXPECTED.policy) || !deepEqual(record.trusted_policy, changes.trusted_policy)) {
      fail("初期方針が、実行前に固定した値と一致しません。");
    }
    if (!deepEqual(changes.cases.map((item) => item && item.id), EXPECTED.ids)) fail("入力の変更が L01〜L08 の8件ではありません。");

    const results = record.results;
    if (!Array.isArray(results) || !deepEqual(results.map((item) => item && item.id), EXPECTED.ids)) {
      fail("実行記録が L01〜L08 の8件ではありません。");
    }
    if (!isObject(expected) || !isObject(expected.commit_success) || !deepEqual(Object.keys(expected.commit_success), EXPECTED.ids)
      || !deepEqual(expected.repair_pair, EXPECTED.repairPair)) {
      fail("input/expected.json の形が違います。");
    }

    results.forEach((item, index) => {
      validateResultShape(item);
      const source = changes.cases[index];
      if (item.label !== source.label
        || !deepEqual(item.input, { accepted_files: source.accepted_files, proposed_files: source.proposed_files })) {
        fail(`${item.id} の入力ファイルが input/memory-changes.json と一致しません。`);
      }
      const git = item.git_commit;
      const headChanged = git.head_after !== git.head_before;
      if (item.committed !== (git.exit_code === 0) || item.committed !== headChanged || git.head_before !== item.baseline.commit) {
        fail(`${item.id} の commit の結果と HEAD の記録が合いません。`);
      }
      if (item.committed ? git.staged_changes_after.length !== 0 : git.staged_changes_after.length === 0) {
        fail(`${item.id} の stage の記録が commit の結果と合いません。`);
      }
      if (expected.commit_success[item.id] !== item.committed) {
        fail(`${item.id} の実結果が、実行前に決めた期待と一致しません。`);
      }
    });

    const committed = results.filter((item) => item.committed).length;
    const counts = { total: results.length, committed, blocked: results.length - committed };
    if (!deepEqual(record.summary, counts)) fail("実行記録の件数のまとめが、8件から数えた値と一致しません。");
    if (expected.case_count !== counts.total || expected.successful_commits !== counts.committed || expected.blocked_commits !== counts.blocked) {
      fail("成功と停止の数が、実行前に決めた期待と一致しません。");
    }

    const verification = record.verification;
    if (!isObject(verification) || verification.status !== "passed" || !Array.isArray(verification.checks)
      || verification.checks.length === 0
      || !verification.checks.every((entry) => isObject(entry) && isString(entry.name) && entry.passed === true)
      || verification.total !== verification.checks.length) {
      fail("実行記録の確認がすべて合格になっていません。");
    }
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
    el.fileList.disabled = !enabled;
    el.download.disabled = !enabled;
    el.copy.disabled = !enabled;
    for (const button of el.buttons.querySelectorAll("button")) button.disabled = !enabled;
  }

  function clearResult() {
    el.viewer.hidden = true;
    el.tally.hidden = true;
    el.repair.hidden = true;
    for (const node of [el.kicker, el.title, el.state, el.reason, el.repairText, el.repairLink, el.beforeMeta, el.afterMeta,
      el.apiTree, el.apiFrontmatter, el.cliExit, el.cliStdout, el.cliStderr, el.gitExit, el.gitStdout, el.gitStderr,
      el.rawInput, el.rawOutput, el.actionStatus]) {
      node.textContent = "";
    }
    el.state.dataset.state = "";
    for (const node of [el.tally, el.diagnosis, el.facts, el.tree, el.fileList, el.beforeContent, el.afterContent,
      el.select, el.buttons, el.runFacts]) {
      node.replaceChildren();
    }
    for (const node of [el.cliStdoutEmpty, el.cliStderrEmpty, el.gitStdoutEmpty, el.gitStderrEmpty]) node.hidden = true;
    el.fallback.hidden = true;
    el.fallbackLabel.hidden = true;
    el.fallback.value = "";
    state.record = null;
    state.byId = new Map();
    state.current = null;
    state.file = null;
    state.request = "";
  }

  function node(tag, text, className) {
    const item = document.createElement(tag);
    if (text !== undefined) item.textContent = text;
    if (className) item.className = className;
    return item;
  }

  function addFact(list, label, value) {
    const row = document.createElement("div");
    row.append(node("dt", label), node("dd", value));
    list.append(row);
  }

  function buildPicker(results) {
    for (const item of results) {
      const outcome = item.committed ? "保存" : "停止";
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = `${item.id}［${outcome}］${item.label}`;
      el.select.append(option);

      const button = document.createElement("button");
      button.type = "button";
      button.className = "sample-button";
      button.dataset.id = item.id;
      button.dataset.outcome = item.committed ? "committed" : "blocked";
      button.setAttribute("aria-pressed", "false");
      button.append(node("span", `${item.id}　${outcome}`, "sample-button-id"), node("span", item.label));
      button.addEventListener("click", () => go(item.id));
      el.buttons.append(button);
    }
  }

  function renderTally(record) {
    const { total, committed, blocked } = record.summary;
    el.tally.replaceChildren(
      document.createTextNode(`${total}件：commit 成功 `),
      node("strong", String(committed)),
      document.createTextNode(" ／ 停止 "),
      node("strong", String(blocked)),
      document.createTextNode("。"),
    );
    el.tally.hidden = false;
  }

  function renderRunFacts(record) {
    const runtime = isObject(record.runtime) ? record.runtime : {};
    const script = isObject(record.validator_script) ? record.validator_script : {};
    const add = (label, value) => {
      const row = node("div", undefined, "kv-row");
      row.append(node("dt", label), node("dd", value));
      el.runFacts.append(row);
    };
    add("実行環境", `Node ${runtime.node || "?"}（型除去 ${runtime.typescript || "?"}）・${runtime.git || "Git ?"}・${runtime.platform || "?"}`);
    add("導入したパッケージ", `${runtime.packages_installed ?? "?"}件`);
    add("検査スクリプト", `${script.written_to || ""}（SHA-256 ${script.sha256 || "?"}・${script.bytes ?? "?"}バイト）`);
    add("vendor-lock.json の SHA-256", record.upstream.vendor_lock_sha256);
    for (const [path, value] of Object.entries(record.input_sha256)) {
      if (path !== "vendor-lock.json") add(`${path} の SHA-256`, value);
    }
    add("確認の合計", `${record.verification.total}件すべて合格（記録の checks から数えた数）`);
  }

  function codePoints(text) {
    return Array.from(text).length;
  }

  function utf8Bytes(text) {
    return new TextEncoder().encode(text).length;
  }

  function fileKinds(item) {
    const accepted = item.input.accepted_files;
    const proposed = item.input.proposed_files;
    const paths = [...new Set([...Object.keys(accepted), ...Object.keys(proposed)])].sort();
    return paths.map((path) => {
      let kind = "same";
      if (!own(proposed, path)) kind = "removed";
      else if (!own(accepted, path)) kind = "added";
      else if (accepted[path] !== proposed[path]) kind = "modified";
      return { path, kind };
    });
  }

  const KIND_LABEL = { removed: "削除", added: "追加", modified: "変更", same: "同じ" };

  function diagnosedPath(line, path) {
    return line.startsWith(`${path}:`) || line.startsWith(`${path} `);
  }

  function pickFile(item, kinds) {
    const lines = item.git_commit.reported_errors;
    const changed = kinds.filter((entry) => entry.kind !== "same");
    return (changed.find((entry) => entry.kind === "removed")
      || changed.find((entry) => lines.some((line) => diagnosedPath(line, entry.path)))
      || changed.find((entry) => entry.kind === "added")
      || changed[0]
      || kinds[0]).path;
  }

  function renderTree(item, kinds) {
    const lines = item.git_commit.reported_errors;
    for (const { path, kind } of kinds) {
      const row = document.createElement("li");
      const mark = node("span", KIND_LABEL[kind], "tree-mark");
      mark.dataset.kind = kind;
      row.append(mark, node("span", path, "tree-path"));
      const notes = [];
      if (lines.some((line) => diagnosedPath(line, path))) notes.push("診断に出たファイル");
      if (item.api.not_projected_paths.includes(path)) notes.push("途中の MEMORY.md が無く、記憶として投影されない（frontmatter は検査対象外）");
      if (notes.length) row.append(node("span", notes.join("・"), "tree-note"));
      el.tree.append(row);
    }
    for (const { path, kind } of kinds) {
      const option = document.createElement("option");
      option.value = path;
      option.textContent = `${KIND_LABEL[kind]}　${path}`;
      el.fileList.append(option);
    }
  }

  function renderContent(pre, meta, value, other, side) {
    pre.replaceChildren();
    if (value === null) {
      pre.append(node("span", side === "before" ? "（基準の commit にはありません）" : "（この変更で削除しました）", "absent"));
      meta.textContent = "";
      return;
    }
    meta.textContent = `${codePoints(value)}文字・${utf8Bytes(value)}バイト`;
    const others = new Set(other === null ? [] : other.split("\n"));
    const lines = value.split("\n");
    if (lines.length > 1 && lines[lines.length - 1] === "") lines.pop();
    for (const line of lines) {
      const row = node("span", undefined, "line");
      const changed = !others.has(line);
      if (changed) row.dataset.mark = side === "after" ? "added" : "removed";
      row.append(node("span", changed ? (side === "after" ? "＋" : "−") : "", "mark"), document.createTextNode(line));
      pre.append(row);
    }
  }

  function renderFile(path) {
    const item = state.byId.get(state.current);
    if (!item) return;
    const accepted = item.input.accepted_files;
    const proposed = item.input.proposed_files;
    if (!own(accepted, path) && !own(proposed, path)) return;
    state.file = path;
    el.fileList.value = path;
    const before = own(accepted, path) ? accepted[path] : null;
    const after = own(proposed, path) ? proposed[path] : null;
    renderContent(el.beforeContent, el.beforeMeta, before, after, "before");
    renderContent(el.afterContent, el.afterMeta, after, before, "after");
  }

  function setRaw(pre, emptyMark, value) {
    pre.textContent = value;
    emptyMark.hidden = value !== "";
  }

  function renderRepair(item) {
    const [broken, repaired] = EXPECTED.repairPair;
    el.repair.hidden = true;
    el.repairLink.hidden = true;
    el.repairText.textContent = "";
    el.repairLink.textContent = "";
    if (item.id === broken || item.id === repaired) {
      const a = state.byId.get(broken);
      const b = state.byId.get(repaired);
      const paths = [...new Set([...Object.keys(a.input.proposed_files), ...Object.keys(b.input.proposed_files)])]
        .filter((path) => a.input.proposed_files[path] !== b.input.proposed_files[path]);
      const diff = paths.length === 1 ? paths[0] : paths.join("・");
      const outcome = (result) => (result.committed ? "commit されました" : "止まりました");
      if (item.id === broken) {
        el.repairText.textContent = `${repaired} は、同じ変更のまま ${diff} だけを基準と同じ内容で残した、別の新しいリポジトリでの試みです。${repaired} は${outcome(b)}。`;
        el.repairLink.textContent = `${repaired} の再検査を見る`;
        el.repairLink.href = `#${repaired}`;
      } else {
        el.repairText.textContent = `${broken} では同じ変更から ${diff} を消していて、${outcome(a)}。違いはこの${paths.length}ファイルだけです。直す判断は AI ではなく、この作例の入力として実行前に決めたものです。`;
        el.repairLink.textContent = `${broken} を見る`;
        el.repairLink.href = `#${broken}`;
      }
      el.repairLink.hidden = false;
      el.repair.hidden = false;
    } else if (!item.committed && Array.isArray(item.api.tree.errors) && item.api.tree.errors.length === 0) {
      el.repairText.textContent = "検査API（実行前に決めた初期方針で検査）は理由を返していません。止めたのは原典の検査スクリプトです。stage にある設定ファイルの変更そのものを、人の承認なしでは認めません。";
      el.repair.hidden = false;
    }
  }

  function render(id) {
    const item = state.byId.get(id);
    if (!item) return;
    state.current = id;
    const index = EXPECTED.ids.indexOf(id);
    const git = item.git_commit;
    const cli = item.cli;
    const api = item.api;

    el.select.value = id;
    for (const button of el.buttons.querySelectorAll("button")) {
      button.setAttribute("aria-pressed", String(button.dataset.id === id));
    }

    el.kicker.textContent = `${item.id} ・ 8件中${index + 1}件目 ・ 架空の読書会の記憶`;
    el.title.textContent = `${item.id}　${item.label}`;
    el.state.dataset.state = item.committed ? "committed" : "blocked";
    el.state.textContent = item.committed ? "commit された（保存できた）" : "止まった（commit されなかった）";
    el.reason.textContent = item.reason_ja;

    el.diagnosis.replaceChildren();
    if (git.reported_errors.length) {
      for (const line of git.reported_errors) el.diagnosis.append(node("li", line));
    } else {
      el.diagnosis.append(node("li", item.committed
        ? "理由の行はありません（pre-commit は何も出さずに通りました）。"
        : "理由の行はありません。下の git commit の stderr を確かめてください。", "is-empty"));
    }

    el.facts.replaceChildren();
    addFact(el.facts, "HEAD", git.head_after !== git.head_before
      ? `進んだ　${short(git.head_before)} → ${short(git.head_after)}`
      : `変わらない　${short(git.head_before)}（基準の commit のまま）`);
    addFact(el.facts, "stage", git.staged_changes_after.length === 0
      ? "空（変更はすべて commit に入った）"
      : `残ったまま（${git.staged_changes_after.length}件の変更）。まだ記憶ではありません`);
    addFact(el.facts, "検査API", api.tree.thrown
      ? `例外：${api.tree.thrown}`
      : `初期方針で理由 ${api.tree.errors.length}件`);
    const frontmatterErrors = api.frontmatter.reduce((sum, entry) => sum + (Array.isArray(entry.errors) ? entry.errors.length : 0), 0);
    addFact(el.facts, "frontmatter", `投影 ${api.projected_paths.length}ファイル・エラー ${frontmatterErrors}件`);
    addFact(el.facts, "原典CLI", `終了コード ${cli.exit_code}`);
    addFact(el.facts, "git commit", `終了コード ${git.exit_code}`);

    renderRepair(item);

    el.tree.replaceChildren();
    el.fileList.replaceChildren();
    const kinds = fileKinds(item);
    renderTree(item, kinds);
    renderFile(pickFile(item, kinds));

    el.apiTree.textContent = JSON.stringify({
      trusted_config: api.trusted_config,
      layout: api.layout,
      require_root_marker: api.require_root_marker,
      accepted_tree: api.accepted_tree,
      result: api.tree,
      staged_config: api.staged_config,
    }, null, 2);
    el.apiFrontmatter.textContent = JSON.stringify({
      memory_format: api.memory_format,
      projected_paths: api.projected_paths,
      not_projected_paths: api.not_projected_paths,
      results: api.frontmatter,
    }, null, 2);
    el.cliExit.textContent = `${cli.command || ""} ・ 終了コード ${cli.exit_code}`;
    setRaw(el.cliStdout, el.cliStdoutEmpty, cli.stdout);
    setRaw(el.cliStderr, el.cliStderrEmpty, cli.stderr);
    el.gitExit.textContent = `${git.command || ""} ・ 終了コード ${git.exit_code}`;
    setRaw(el.gitStdout, el.gitStdoutEmpty, git.stdout);
    setRaw(el.gitStderr, el.gitStderrEmpty, git.stderr);

    el.rawInput.textContent = JSON.stringify(item.input, null, 2);
    const rest = {};
    for (const [key, value] of Object.entries(item)) if (key !== "input") rest[key] = value;
    el.rawOutput.textContent = JSON.stringify(rest, null, 2);

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
  el.fileList.addEventListener("change", () => {
    if (state.ready) renderFile(el.fileList.value);
  });

  // --- 操作 --------------------------------------------------------------------------------

  el.download.addEventListener("click", () => {
    if (!state.ready) return;
    const item = state.byId.get(state.current);
    if (!item) return;
    const name = `letta-${item.id}.json`;
    const blob = new Blob([`${JSON.stringify(item, null, 2)}\n`], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    el.actionStatus.textContent = `${name} の保存をブラウザーに渡しました。`;
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
        changes: parseJson(FILES.changes, raw.changes.text),
        expected: parseJson(FILES.expected, raw.expected.text),
        lock: parseJson(FILES.lock, raw.lock.text),
      };
      validate(files, hashes);
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
      setStatus("ready", "8件の実行記録を照合済み。");
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
