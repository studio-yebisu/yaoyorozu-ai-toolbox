// 八百万図AIツールボックス — Letta Code 記憶の点検の作例（図のページ）。MIT License, Copyright (c) 2026 Studio Yebisu.
// 制作時に固定版 Letta Code の検査と実際の Git で実行して保存した記録を読み、図で見せるページ。ブラウザーで Letta Code・Git・AI は動かさない。
// 図の状態（案内の有無・つながり・stage の件数・点検の停止と通過・保存の点）は、照合を通った記録の値から決める。記録の代わりになる値は持たない。
// 保存の成否は git_commit と committed だけで決め、検査APIの結果だけからは決めない。記録の文字列は textContent で書き、HTML として解釈しない。
"use strict";

(() => {
  const FILES = Object.freeze({
    record: "outputs/memory-runs.json",
    changes: "input/memory-changes.json",
    expected: "input/expected.json",
    lock: "vendor-lock.json",
  });
  const REQUEST = "request.txt";
  const COMPARE = "comparison.html";
  // comparison.js と同じ固定値。記録そのものの SHA-256 は、独立照合と再現確認（outputs/*-checks.json）にある固定済みの値。
  const PIN = Object.freeze({
    format: "studio-yebisu-letta-memory-runs-v1",
    inputFormat: "studio-yebisu-letta-memory-changes-v1",
    upstream: Object.freeze({
      repository: "letta-ai/letta-code",
      commit: "316e4c0545b549c453e0f85cc81d3540404eff74",
      version: "0.34.14",
      license: "Apache-2.0",
    }),
    sha256: Object.freeze({
      "outputs/memory-runs.json": "af6e58cb1f8ef95efc44ae266c51713aa1bad06bcc025cda5d42e4cd3bd49570",
      "input/memory-changes.json": "852d6c0708eb9c42d31f71ad6fc6f8fcb95849d0d1eb72f4094e60a3e20311e0",
      "input/expected.json": "0f61d8dd6a58b99100759421295ea24a7436a32cb91304111c78b0cb5227a1a8",
      "vendor-lock.json": "a62fbf74fa35f609756adf4b9ef2bbfcfe7e46cfd291058be455601bbc8d4d57",
    }),
    vendorFiles: 8,
    checks: 208,
    summary: Object.freeze({ total: 8, committed: 2, blocked: 6 }),
    policy: Object.freeze({ version: 1, maxDepth: 2, maxFileCharacters: 900, maxCoreMemoryCharacters: 1200, readOnlyFiles: Object.freeze(["persona.md"]) }),
    repairPair: Object.freeze(["L02", "L03"]),
  });
  const IDS = Object.freeze(["L01", "L02", "L03", "L04", "L05", "L06", "L07", "L08"]);
  const SCENES = Object.freeze(["L02", "L03", "L04", "L08"]);
  const DEFAULT_ID = "L02";
  const GUIDE = "bookclub/MEMORY.md";
  const DETAIL = "bookclub/schedule.md";
  const CONFIG = ".memfs.config.json";
  const NS = "http://www.w3.org/2000/svg";

  const $ = (id) => document.getElementById(id);
  const ui = {
    diagram: $("diagram"),
    chips: Array.from(document.querySelectorAll(".choice")),
    status: $("status"),
    retry: $("retry"),
    pair: $("pair"),
    save: $("save-record"),
    saveId: $("save-id"),
    compare: $("compare"),
    actionStatus: $("action-status"),
    caption: $("caption"),
    caseNote: $("case-note"),
    caseNoteText: $("case-note-text"),
    caseNoteLink: $("case-note-link"),
    factsIntro: $("facts-intro"),
    facts: $("facts"),
    rawGit: $("raw-git"),
    rawCli: $("raw-cli"),
    rawApi: $("raw-api"),
    rawInput: $("raw-input"),
    factsCompare: $("facts-compare"),
    tally: $("tally"),
    allList: $("all-list"),
    filmCompare: $("film-compare"),
    runFacts: $("run-facts"),
    copy: $("copy"),
    copyStatus: $("copy-status"),
    fallback: $("fallback"),
    fallbackLabel: $("fallback-label"),
  };

  // ページの状態。boot() と show() だけが書き換える。
  const state = {
    rows: null,       // id → 照合済みの記録の1件
    views: null,      // 図の4場面の id → 図の状態（記録から作る）
    record: null,
    id: null,         // 表示中の記録の id（不明な id のときは null）
    previous: null,   // 直前に描いた図の状態
    ready: false,
    loading: false,
    animateNext: false, // 場面のボタンを押したときだけ、切り替えの動きをつける
    request: null,
  };
  const wide = window.matchMedia("(min-width: 700px)");

  class LoadError extends Error {}
  const need = (ok, message) => { if (!ok) throw new LoadError(message); };
  const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
  const isString = (v) => typeof v === "string";
  const obj = (v) => (isObject(v) ? v : {});
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const short = (commit) => (isString(commit) ? commit.slice(0, 7) : "");
  const codePoints = (text) => Array.from(text).length;

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

  async function fetchBytes(path) {
    let response;
    try {
      response = await fetch(path, { cache: "no-store", credentials: "same-origin" });
    } catch {
      throw new LoadError(`${path} を読み込めませんでした。ローカルで開くときは HTTP サーバー経由で開いてください。`);
    }
    need(response.ok, `${path} を読み込めませんでした（HTTP ${response.status}）。`);
    return response.arrayBuffer();
  }

  function decode(buffer, path) {
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    } catch {
      throw new LoadError(`${path} が UTF-8 として読めません。`);
    }
  }

  function parseJson(text, path) {
    try {
      return JSON.parse(text);
    } catch {
      throw new LoadError(`${path} が JSON として読めません。`);
    }
  }

  async function sha256Hex(buffer) {
    need(window.crypto && window.crypto.subtle, "このブラウザーでは SHA-256 を計算できないため、記録を確かめられません。https か localhost で開いてください。");
    const digest = await window.crypto.subtle.digest("SHA-256", buffer);
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  }

  const isChange = (c) => isObject(c) && isString(c.status) && isString(c.path);

  // comparison.js の validateResultShape と同じ形に、図が読む項目（理由の行・stage・文字数・設定）を足したもの。
  function checkRow(item) {
    const git = obj(item.git_commit);
    const cli = obj(item.cli);
    const api = obj(item.api);
    const tree = obj(api.tree);
    need(isString(item.label) && isString(item.reason_ja) && typeof item.committed === "boolean"
      && isObject(item.input) && isObject(item.input.accepted_files) && isObject(item.input.proposed_files)
      && isObject(item.baseline) && isString(item.baseline.commit)
      && typeof git.exit_code === "number" && isString(git.stdout) && isString(git.stderr)
      && Array.isArray(git.reported_errors) && git.reported_errors.every(isString)
      && isString(git.head_before) && isString(git.head_after)
      && Array.isArray(git.staged_changes_before) && git.staged_changes_before.every(isChange)
      && Array.isArray(git.staged_changes_after) && git.staged_changes_after.every(isChange)
      && typeof cli.exit_code === "number" && isString(cli.stdout) && isString(cli.stderr)
      && isObject(api.tree) && Array.isArray(tree.errors) && tree.errors.every(isString)
      && Array.isArray(api.frontmatter) && Array.isArray(api.projected_paths) && Array.isArray(api.not_projected_paths)
      && isObject(api.trusted_config) && isObject(api.staged_config)
      && isObject(item.unicode) && isObject(item.unicode.files),
    `${item.id || "記録の1件"} の形が実行記録の形式と合いません。`);
  }

  function changedPaths(a, b) {
    return [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((p) => a[p] !== b[p]).sort();
  }

  // 図の4場面が依って立つ、記録の中の事実。合わなければ図を描かない。
  function checkScenes(rows) {
    const l02 = rows.get("L02");
    const l03 = rows.get("L03");
    const l04 = rows.get("L04");
    const l08 = rows.get("L08");
    const g2 = l02.git_commit;
    const g3 = l03.git_commit;

    need(!l02.committed && g2.exit_code === 1 && g2.head_after === g2.head_before
      && !own(l02.input.proposed_files, GUIDE) && own(l02.input.accepted_files, GUIDE)
      && deepEqual(changedPaths(l02.input.accepted_files, l02.input.proposed_files), [GUIDE, DETAIL])
      && deepEqual(g2.staged_changes_after, [{ status: "D", path: GUIDE }, { status: "M", path: DETAIL }])
      && g2.reported_errors.length === 2 && g2.reported_errors.every((line) => line.endsWith(`missing required index ${GUIDE}`)),
    "L02 の記録が「案内 bookclub/MEMORY.md を消して止まり、変更2件が stage に残った1件」になっていません。");

    const diff = changedPaths(l02.input.proposed_files, l03.input.proposed_files);
    need(l03.committed && g3.exit_code === 0 && g3.head_after !== g3.head_before && g3.parent_after === l03.baseline.commit
      && l03.baseline.commit === l02.baseline.commit && deepEqual(l03.input.accepted_files, l02.input.accepted_files)
      && deepEqual(diff, [GUIDE]) && l03.input.proposed_files[GUIDE] === l02.input.accepted_files[GUIDE]
      && deepEqual(g3.staged_changes_before, [{ status: "M", path: DETAIL }]) && g3.staged_changes_after.length === 0
      && g3.reported_errors.length === 0,
    "L03 の記録が「L02 と同じ変更で案内だけを残し、保存された別の試行」になっていません。");

    const limit = l04.api.trusted_config.maxFileCharacters;
    const chars = obj(l04.unicode.files[DETAIL]).code_points;
    need(!l04.committed && limit === PIN.policy.maxFileCharacters && chars === codePoints(l04.input.proposed_files[DETAIL])
      && chars > limit && deepEqual(changedPaths(l04.input.accepted_files, l04.input.proposed_files), [DETAIL])
      && l04.git_commit.reported_errors.some((line) => line.startsWith(`${DETAIL}: ${chars} characters exceeds ${limit}`))
      && deepEqual(l04.git_commit.staged_changes_after, [{ status: "M", path: DETAIL }]),
    "L04 の記録が「上限を超えた1つのメモで止まった1件」になっていません。");

    const sc = obj(l08.api.staged_config);
    const parsed = obj(sc.parsed);
    need(!l08.committed && l08.git_commit.exit_code === 1 && l08.api.tree.errors.length === 0 && l08.api.tree.thrown === null
      && sc.differs_from_trusted === true && sc.error === null && Number.isSafeInteger(parsed.maxFileCharacters)
      && l08.api.trusted_config.maxFileCharacters === PIN.policy.maxFileCharacters && parsed.maxFileCharacters !== PIN.policy.maxFileCharacters
      && deepEqual(l08.git_commit.reported_errors, [`${CONFIG} is protected and requires human approval to change`])
      && l08.git_commit.staged_changes_after.some((c) => c.path === CONFIG),
    "L08 の記録が「検査APIの指摘は0件でも、原典の Git の点検が設定の保護で止めた1件」になっていません。");
  }

  function validate(files, hashes) {
    const { record, changes, expected, lock } = files;
    for (const [path, pinned] of Object.entries(PIN.sha256)) {
      need(hashes[path] === pinned, `${path} の SHA-256 が、固定した値と一致しません。`);
    }
    need(isObject(record) && record.format === PIN.format, "実行記録の形式が違います。");
    const up = obj(record.upstream);
    need(Object.keys(PIN.upstream).every((k) => up[k] === PIN.upstream[k]) && up.vendor_lock_sha256 === PIN.sha256["vendor-lock.json"],
      "実行記録の Letta Code の固定版が一致しません。");
    const recorded = obj(record.input_sha256);
    for (const path of ["input/memory-changes.json", "input/expected.json", "vendor-lock.json"]) {
      need(recorded[path] === PIN.sha256[path], `実行記録にある ${path} の SHA-256 が一致しません。`);
    }
    need(isObject(lock) && Object.keys(PIN.upstream).every((k) => lock[k] === PIN.upstream[k])
      && Array.isArray(lock.files) && lock.files.length === PIN.vendorFiles && lock.files.every(isObject),
    `vendor-lock.json の固定版・原典${PIN.vendorFiles}ファイルが一致しません。`);
    const lockFiles = lock.files.map((f) => ({ path: f.path, sha256: f.sha256, bytes: f.bytes, git_blob_sha1: f.git_blob_sha1 }));
    need(deepEqual(up.files, lockFiles), "実行記録の原典ファイルの照合が vendor-lock.json と一致しません。");

    need(isObject(changes) && changes.format === PIN.inputFormat && changes.fictional === true && Array.isArray(changes.cases),
      "input/memory-changes.json の形が違います。");
    need(deepEqual(changes.trusted_policy, PIN.policy) && deepEqual(record.trusted_policy, changes.trusted_policy),
      "初期方針が、実行前に固定した値と一致しません。");
    need(deepEqual(changes.cases.map((c) => c && c.id), IDS), "入力の変更が L01〜L08 の8件ではありません。");

    const results = record.results;
    need(Array.isArray(results) && results.length === IDS.length && results.every(isObject), "実行記録が8件ではありません。");
    const ids = results.map((r) => r.id);
    need(new Set(ids).size === IDS.length && ids.every((id, i) => id === IDS[i]), "実行記録が L01〜L08 の8件（重複なし）ではありません。");
    need(isObject(expected) && isObject(expected.commit_success) && deepEqual(Object.keys(expected.commit_success), IDS)
      && deepEqual(expected.repair_pair, PIN.repairPair), "input/expected.json の形が違います。");

    results.forEach((item, index) => {
      checkRow(item);
      const source = changes.cases[index];
      need(item.label === source.label && deepEqual(item.input, { accepted_files: source.accepted_files, proposed_files: source.proposed_files }),
        `${item.id} の入力ファイルが input/memory-changes.json と一致しません。`);
      const git = item.git_commit;
      const headChanged = git.head_after !== git.head_before;
      need(item.committed === (git.exit_code === 0) && item.committed === headChanged && git.head_before === item.baseline.commit,
        `${item.id} の commit の結果と HEAD の記録が合いません。`);
      need(item.committed ? git.staged_changes_after.length === 0 : git.staged_changes_after.length > 0,
        `${item.id} の stage の記録が commit の結果と合いません。`);
      need(expected.commit_success[item.id] === item.committed, `${item.id} の実結果が、実行前に決めた期待と一致しません。`);
    });

    const committed = results.filter((r) => r.committed).length;
    const counts = { total: results.length, committed, blocked: results.length - committed };
    need(deepEqual(record.summary, counts) && deepEqual(counts, PIN.summary), "実行記録の件数のまとめが、8件から数えた値と一致しません。");
    need(expected.case_count === counts.total && expected.successful_commits === counts.committed && expected.blocked_commits === counts.blocked,
      "成功と停止の数が、実行前に決めた期待と一致しません。");
    const v = obj(record.verification);
    need(v.status === "passed" && Array.isArray(v.checks) && v.checks.length === PIN.checks && v.total === PIN.checks
      && v.checks.every((c) => isObject(c) && isString(c.name) && c.passed === true),
    `実行記録の${PIN.checks}件の確認がすべて合格になっていません。`);

    const rows = new Map(results.map((r) => [r.id, r]));
    checkScenes(rows);
    return rows;
  }

  // --- 図の状態（記録の値から） ------------------------------------------------------------

  function cardKind(change, row) {
    if (change.path === GUIDE && change.status === "D") return "guide";
    if (change.path === CONFIG) return "config";
    if (change.path === DETAIL && row.id === "L04") return "long";
    return "change";
  }

  function viewOf(row) {
    const git = row.git_commit;
    const view = {
      id: row.id,
      committed: row.committed,
      guide: own(row.input.proposed_files, GUIDE),
      count: git.staged_changes_after.length,
      cards: git.staged_changes_after.map((c) => cardKind(c, row)),
      before: short(git.head_before),
      after: row.committed ? short(git.head_after) : "",
      apiErrors: row.api.tree.errors.length,
      trial: row.id === PIN.repairPair[1],
      overflow: null,
      config: null,
    };
    if (row.id === "L04") view.overflow = { chars: row.unicode.files[DETAIL].code_points, limit: row.api.trusted_config.maxFileCharacters };
    if (row.id === "L08") view.config = { from: row.api.trusted_config.maxFileCharacters, to: row.api.staged_config.parsed.maxFileCharacters };
    return view;
  }

  function captionOf(view) {
    if (view.id === "L02") return `案内（${GUIDE}）を消した変更は、点検で止まりました。保存は ${view.before} のまま。変更${view.count}件は stage に残っています。`;
    if (view.id === "L03") return `別の試行 L03：L02 と同じ変更で、案内だけを残したもの。点検を通り、保存が ${view.before} から ${view.after} へ進みました。`;
    if (view.id === "L04") return `1つのメモが ${view.overflow.chars}文字で、上限 ${view.overflow.limit}文字を超えて止まりました。変更${view.count}件は残っています。`;
    if (view.id === "L08") return `上限の設定を ${view.config.from} から ${view.config.to} に変える変更。形の指摘は${view.apiErrors}件でも、原典の Git の点検が設定の保護で止めました。`;
    return "";
  }

  function ariaOf(view) {
    if (!view) return "記憶のメモ、stage の変更、Letta の点検、Git の保存の関係の図。いまは場面を表示していません。";
    const parts = [view.trial ? `別の試行 ${view.id} の図。` : `記録 ${view.id} の図。`];
    parts.push(view.guide
      ? "上のルートから案内へ、案内から2つの詳細メモへつながっています。"
      : "案内が抜けて空いた枠になり、案内から2つの詳細メモへのつながりが切れています。");
    if (view.overflow) parts.push(`詳細メモの1つが${view.overflow.chars}文字で、上限${view.overflow.limit}文字の線からはみ出しています。`);
    if (view.config) parts.push(`stage に上限の設定（${view.config.from}から${view.config.to}）の変更があります。形の指摘は${view.apiErrors}件ですが、点検の門は設定の保護の錠で閉じています。`);
    if (view.committed) {
      parts.push(`変更は点検の門を通り、Git に新しい保存の点 ${view.after} が増えました。stage は${view.count}件です。`);
      if (view.trial) parts.push("形の点検は通りましたが、詳細メモの中身の正しさには「？」が付いたままです。");
    } else {
      parts.push(`点検の門は閉じて止まり、stage には変更が${view.count}件残っています。Git は前の点 ${view.before} のままで、新しい保存はありません。`);
    }
    return parts.join("");
  }

  // --- 図（SVG）：動画と同じ配置の座標 ---------------------------------------------------------

  const GEO = {
    tall: {
      view: [0, 206, 720, 908],
      root: { cx: 360, cy: 270, w: 178, h: 112 }, rootLabel: { x: 150, y: 284, size: 38 },
      slot: { cx: 360, cy: 452, w: 200, h: 120 }, guideLabel: { x: 150, y: 468, size: 44 },
      details: [{ cx: 168, cy: 640, w: 200, h: 134 }, { cx: 552, cy: 640, w: 200, h: 134 }], detailLabel: { x: 360, y: 656, size: 44 },
      tray: { x: 32, y: 792, w: 252, h: 318, r: 36 }, trayLabel: { x: 62, y: 852, size: 44 }, count: { cx: 244, cy: 832, r: 28, size: 32 },
      card: { w: 92, h: 116 }, trayX: { center: 158, a: 104, b: 214 }, trackY: 958,
      gate: {
        cx: 410, lintel: { x: 316, y: 800, w: 188, h: 54 },
        posts: [{ x: 330, y: 854, w: 22, h: 236 }, { x: 468, y: 854, w: 22, h: 236 }],
        barrier: { x: 352, y: 866, w: 116, h: 180 }, lamp: { cx: 476, cy: 827, r: 15 },
        labelX: 392, labelY: 841, labelSize: 40,
        plate: { cx: 410, cy: 958, w: 150, h: 62, size: 36 }, shape: { cx: 410, cy: 958, w: 120, h: 66, size: 40 },
      },
      git: { x: 606, labelY: 808, labelSize: 44, top: 836, bottom: 1100, oldY: 1056, oldR: 24, newY: 958, newR: 30, hashSize: 24 },
      rootLink: [360, 326, 360, 392],
      detailLinks: [[310, 512, 310, 548, 168, 540, 168, 573], [410, 512, 410, 548, 552, 540, 552, 573]],
      origin: [168, 707, 158, 792],
      tags: {
        reason: { cx: 360, cy: 738, w: 236, h: 62, size: 36 },
        gate: { cx: 410, cy: 752, w: 250, h: 60, size: 34 },
        overflow: { cx: 380, cy: 752, w: 200, h: 60, size: 34 },
        trial: { cx: 580, cy: 452, w: 236, h: 62, size: 32 },
        api: { cx: 580, cy: 452, w: 236, h: 62, size: 30 },
        keep: { cx: 158, cy: 1066, w: 150, h: 58, size: 34 },
      },
      q: { r: 30, size: 40 },
      overflow: { h: 34, size: 24 },
    },
    wide: {
      view: [20, 186, 1240, 506],
      root: { cx: 118, cy: 430, w: 150, h: 100 }, rootLabel: { x: 118, y: 524, size: 34 },
      slot: { cx: 318, cy: 430, w: 160, h: 104 }, guideLabel: { x: 318, y: 362, size: 40 },
      details: [{ cx: 520, cy: 286, w: 172, h: 120 }, { cx: 520, cy: 574, w: 172, h: 120 }], detailLabel: { x: 520, y: 444, size: 40 },
      tray: { x: 640, y: 236, w: 232, h: 388, r: 34 }, trayLabel: { x: 664, y: 290, size: 40 }, count: { cx: 836, cy: 274, r: 24, size: 28 },
      card: { w: 88, h: 112 }, trayX: { center: 756, a: 704, b: 808 }, trackY: 430,
      gate: {
        cx: 1002, lintel: { x: 912, y: 232, w: 180, h: 50 },
        posts: [{ x: 924, y: 282, w: 20, h: 318 }, { x: 1060, y: 282, w: 20, h: 318 }],
        barrier: { x: 944, y: 300, w: 116, h: 260 }, lamp: { cx: 1068, cy: 257, r: 13 },
        labelX: 988, labelY: 270, labelSize: 36,
        plate: { cx: 1002, cy: 430, w: 140, h: 58, size: 34 }, shape: { cx: 1002, cy: 430, w: 112, h: 60, size: 36 },
      },
      git: { x: 1180, labelY: 224, labelSize: 40, top: 250, bottom: 612, oldY: 552, oldR: 22, newY: 430, newR: 26, hashSize: 22 },
      rootLink: [193, 430, 238, 430],
      detailLinks: [[398, 410, 424, 410, 404, 286, 434, 286], [398, 450, 424, 450, 404, 574, 434, 574]],
      origin: [606, 286, 640, 330],
      tags: {
        reason: { cx: 318, cy: 548, w: 214, h: 56, size: 34 },
        gate: { cx: 1002, cy: 648, w: 240, h: 52, size: 32 },
        overflow: { cx: 318, cy: 290, w: 200, h: 54, size: 32 },
        trial: { cx: 318, cy: 290, w: 236, h: 54, size: 30 },
        api: { cx: 318, cy: 290, w: 236, h: 54, size: 28 },
        keep: { cx: 756, cy: 560, w: 140, h: 54, size: 32 },
      },
      q: { r: 26, size: 36 },
      overflow: { h: 30, size: 22 },
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

  const boxOf = (b) => ({ x: b.cx - b.w / 2, y: b.cy - b.h / 2, w: b.w, h: b.h });

  function memoD(x, y, w, h, f) {
    const r = Math.min(10, w * 0.06);
    return `M${x + r} ${y}H${x + w - f}L${x + w} ${y + f}V${y + h - r}Q${x + w} ${y + h} ${x + w - r} ${y + h}H${x + r}Q${x} ${y + h} ${x} ${y + h - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`;
  }

  // 詳細メモ（折り角のある紙）。edited は今回の変更で足した1行（ピーチ）。
  function memoShape(parent, b, o = {}) {
    const { x, y, w, h } = boxOf(b);
    const f = 0.2 * Math.min(w, h);
    const g = el("g", { class: `d-memo${o.cls ? ` ${o.cls}` : ""}` }, parent);
    el("path", { class: "d-shadow", d: memoD(x + 4, y + 7, w, h, f) }, g);
    el("path", { class: "d-memo-body", d: memoD(x, y, w, h, f) }, g);
    el("path", { class: "d-memo-fold", d: `M${x + w - f} ${y}V${y + f}H${x + w}Z` }, g);
    const bh = Math.max(5, 0.075 * h);
    const bar = (k, len, cls = "d-bar") => el("rect", { class: cls, x: x + 0.13 * w, y: y + k * h, width: len * w, height: bh, rx: bh / 2 }, g);
    bar(0.3, 0.46);
    bar(0.48, 0.72);
    bar(0.66, 0.72);
    if (o.edited) bar(0.82, 0.56, "d-bar-edit");
    return g;
  }

  // ルートの案内（閉じた本・しおり）。
  function bookShape(parent, b) {
    const { x, y, w, h } = boxOf(b);
    const g = el("g", { class: "d-book" }, parent);
    el("rect", { class: "d-shadow", x: x + 4, y: y + 8, width: w, height: h, rx: 12 }, g);
    el("rect", { class: "d-book-pages", x: x + 10, y: y + 9, width: w - 10, height: h - 9, rx: 10 }, g);
    el("rect", { class: "d-book-cover", x, y, width: w - 10, height: h - 8, rx: 12 }, g);
    const s = 0.17 * w;
    el("path", { class: "d-book-spine", d: `M${x + 12} ${y}H${x + s}V${y + h - 8}H${x + 12}Q${x} ${y + h - 8} ${x} ${y + h - 20}V${y + 12}Q${x} ${y} ${x + 12} ${y}Z` }, g);
    el("rect", { class: "d-book-bar", x: x + 0.3 * w, y: y + 0.28 * h, width: 0.46 * w, height: 0.09 * h, rx: 0.045 * h }, g);
    el("rect", { class: "d-book-bar", x: x + 0.3 * w, y: y + 0.46 * h, width: 0.3 * w, height: 0.09 * h, rx: 0.045 * h }, g);
    const rx = x + 0.7 * w;
    el("path", { class: "d-ribbon", d: `M${rx} ${y + h - 10}v${0.24 * h}l${0.045 * w} ${-0.07 * h}l${0.045 * w} ${0.07 * h}v${-0.24 * h}Z` }, g);
    return g;
  }

  // 子フォルダーの案内（見出しのつまみと、2つの詳細への行）。
  function indexShape(parent, b, o = {}) {
    const { x, y, w, h } = boxOf(b);
    const g = el("g", { class: `d-index${o.ghost ? " is-ghost" : ""}${o.cls ? ` ${o.cls}` : ""}` }, parent);
    if (!o.ghost) el("rect", { class: "d-shadow", x: x + 4, y: y + 8, width: w, height: h, rx: 12 }, g);
    el("rect", { class: "d-index-tab", x: x + 0.1 * w, y: y - 0.13 * h, width: 0.34 * w, height: 0.22 * h, rx: 0.06 * h }, g);
    el("rect", { class: "d-index-body", x, y, width: w, height: h, rx: 12 }, g);
    const r = Math.min(0.055 * w, 0.07 * h);
    for (const k of [0.4, 0.72]) {
      el("circle", { class: "d-index-dot", cx: x + 0.18 * w, cy: y + k * h, r }, g);
      el("rect", { class: "d-bar", x: x + 0.3 * w, y: y + k * h - 0.045 * h, width: 0.54 * w, height: 0.09 * h, rx: 0.045 * h }, g);
    }
    return g;
  }

  function badgeEdit(parent, cx, cy, r) {
    const g = el("g", { class: "d-badge-edit" }, parent);
    el("circle", { class: "d-badge", cx, cy, r }, g);
    const p = el("g", { transform: `rotate(-45 ${cx} ${cy})` }, g);
    el("rect", { class: "d-pencil", x: cx - 0.62 * r, y: cy - 0.17 * r, width: 0.9 * r, height: 0.34 * r, rx: 0.06 * r }, p);
    el("path", { class: "d-pencil", d: `M${cx + 0.3 * r} ${cy - 0.17 * r}L${cx + 0.64 * r} ${cy}L${cx + 0.3 * r} ${cy + 0.17 * r}Z` }, p);
  }

  function badgeMinus(parent, cx, cy, r) {
    el("circle", { class: "d-badge-stop", cx, cy, r }, parent);
    el("rect", { class: "d-badge-mark", x: cx - 0.5 * r, y: cy - 0.12 * r, width: r, height: 0.24 * r, rx: 0.1 * r }, parent);
  }

  function gearShape(parent, cx, cy, r) {
    const g = el("g", { class: "d-gear" }, parent);
    for (let i = 0; i < 8; i++) {
      el("rect", { x: cx - 0.17 * r, y: cy - r, width: 0.34 * r, height: 0.42 * r, rx: 0.07 * r, transform: `rotate(${i * 45} ${cx} ${cy})` }, g);
    }
    el("circle", { cx, cy, r: 0.74 * r }, g);
    el("circle", { class: "d-gear-hole", cx, cy, r: 0.3 * r }, g);
  }

  function lockShape(parent, cx, cy, s) {
    const g = el("g", { class: "d-lock" }, parent);
    el("path", { class: "d-lock-shackle", d: `M${cx - 0.28 * s} ${cy}V${cy - 0.26 * s}A${0.28 * s} ${0.28 * s} 0 0 1 ${cx + 0.28 * s} ${cy - 0.26 * s}V${cy}` }, g);
    el("rect", { class: "d-lock-body", x: cx - 0.46 * s, y: cy - 0.04 * s, width: 0.92 * s, height: 0.72 * s, rx: 0.12 * s }, g);
    el("circle", { class: "d-lock-hole", cx, cy: cy + 0.3 * s, r: 0.09 * s }, g);
  }

  // stage の1件の札。kind：change（変更したメモ）・long（上限を超えたメモ）・guide（消した案内）・config（保護された設定）。
  function cardShape(parent, kind, cx, cy, G, cls) {
    const c = G.card;
    const b = { cx, cy, w: c.w, h: c.h };
    const g = el("g", { class: `d-card${cls ? ` ${cls}` : ""}` }, parent);
    const corner = { x: cx - c.w / 2 + 4, y: cy - c.h / 2 + 4, r: c.w * 0.21 };
    if (kind === "guide") {
      indexShape(g, { cx, cy, w: c.w, h: c.h * 0.8 }, { ghost: true });
      badgeMinus(g, corner.x, corner.y, corner.r);
    } else if (kind === "config") {
      const { x, y, w, h } = boxOf(b);
      el("rect", { class: "d-shadow", x: x + 4, y: y + 7, width: w, height: h, rx: 12 }, g);
      el("rect", { class: "d-config-body", x, y, width: w, height: h, rx: 12 }, g);
      gearShape(g, cx, cy + 0.06 * h, 0.3 * w);
      lockShape(g, corner.x + 2, corner.y + 4, corner.r * 1.5);
    } else {
      memoShape(g, b, { edited: true });
      if (kind === "long") {
        el("rect", { class: "d-overflow", x: b.cx - c.w / 2 + 6, y: b.cy + c.h / 2 - 2, width: c.w - 12, height: G.overflow.h * 0.6, rx: 6 }, g);
      }
      badgeEdit(g, corner.x, corner.y, corner.r);
    }
    return g;
  }

  function pill(parent, p, str, cls, extra) {
    const g = el("g", { class: `d-pill${extra ? ` ${extra}` : ""}` }, parent);
    el("rect", { class: `d-tag ${cls || ""}`.trim(), x: p.cx - p.w / 2, y: p.cy - p.h / 2, width: p.w, height: p.h, rx: p.h / 2 }, g);
    label(g, str, p.cx, p.cy + p.size * 0.36, p.size, "d-tag-text");
    return g;
  }

  function leader(parent, x1, y1, x2, y2, cls = "d-leader") {
    el("path", { class: cls, d: `M${x1} ${y1}L${x2} ${y2}` }, parent);
    el("circle", { class: `${cls}-end`, cx: x2, cy: y2, r: 5 }, parent);
  }

  function bez(c, t) {
    const [x0, y0, x1, y1, x2, y2, x3, y3] = c;
    const v = 1 - t;
    return [v * v * v * x0 + 3 * v * v * t * x1 + 3 * v * t * t * x2 + t * t * t * x3, v * v * v * y0 + 3 * v * v * t * y1 + 3 * v * t * t * y2 + t * t * t * y3];
  }

  function bezPart(c, a, b) {
    const pts = [];
    for (let i = 0; i <= 16; i++) pts.push(bez(c, a + ((b - a) * i) / 16));
    return `M${pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join("L")}`;
  }

  function stripesPattern(defs) {
    const pattern = el("pattern", { id: "d-stripes", width: 28, height: 28, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, defs);
    el("rect", { width: 28, height: 28, fill: "#f7a86e" }, pattern);
    el("rect", { width: 12, height: 28, fill: "#fffdf6", opacity: 0.72 }, pattern);
  }

  // view が null のときは、関係の形だけを薄く描く（どの記録の状態も描かない）。
  function buildDiagram(view, animate) {
    const key = wide.matches ? "wide" : "tall";
    const G = GEO[key];
    ui.diagram.dataset.layout = key;
    ui.diagram.hidden = false;
    const svg = el("svg", { viewBox: G.view.join(" "), "aria-hidden": "true", focusable: "false" });
    stripesPattern(el("defs", {}, svg));
    const idle = !view;
    const root = el("g", { class: idle ? "d-idle" : "" }, svg);
    const enter = (name) => (animate ? ` is-enter is-enter-${name}` : "");
    const guide = idle || view.guide;
    const blocked = !idle && !view.committed;

    // つながり：ルート → 案内 → 2つの詳細。案内がないと、案内からの線が切れる。
    el("path", { class: `d-link${guide ? "" : " is-warn"}`, d: `M${G.rootLink[0]} ${G.rootLink[1]}L${G.rootLink[2]} ${G.rootLink[3]}` }, root);
    for (const c of G.detailLinks) {
      if (guide) {
        el("path", { class: `d-link${!idle && view.guide && animate && state.previous && !state.previous.guide ? enter("draw") : ""}`, d: bezPart(c, 0, 1), pathLength: 1 }, root);
      } else {
        const g = el("g", { class: `d-broken${enter("fade")}` }, root);
        el("path", { class: "d-link is-broken", d: bezPart(c, 0, 0.34) }, g);
        el("path", { class: "d-link is-broken", d: bezPart(c, 0.66, 1) }, g);
        for (const t of [0.34, 0.66]) {
          const [x, y] = bez(c, t);
          el("circle", { class: "d-link-cap", cx: x, cy: y, r: 7 }, g);
        }
      }
    }
    const o = G.origin;
    el("path", { class: "d-origin", d: `M${o[0]} ${o[1]}L${o[2]} ${o[3]}` }, root);

    bookShape(root, G.root);
    label(root, "ルート", G.rootLabel.x, G.rootLabel.y, G.rootLabel.size, "d-label-muted");

    const sb = boxOf(G.slot);
    el("rect", { class: `d-slot${guide ? "" : " is-empty"}`, x: sb.x, y: sb.y, width: sb.w, height: sb.h, rx: 14 }, root);
    if (guide) indexShape(root, G.slot, { cls: !idle && animate && state.previous && !state.previous.guide ? enter("rise") : "" });

    G.details.forEach((d, i) => {
      memoShape(root, d, { edited: i === 0 && !idle });
      if (i === 0 && !idle && view.overflow) {
        const b = boxOf(d);
        const ov = G.overflow;
        const g = el("g", { class: enter("fade").trim() }, root);
        el("rect", { class: "d-overflow", x: b.x + 8, y: b.y + b.h - 2, width: b.w - 16, height: ov.h, rx: 8 }, g);
        el("path", { class: "d-limit", d: `M${b.x - 14} ${b.y + b.h}H${b.x + b.w + 14}` }, g);
        label(g, `${view.overflow.chars} > ${view.overflow.limit}`, d.cx, b.y + b.h + ov.h * 0.72, ov.size, "d-overflow-text");
      }
      if (!idle && view.trial) {
        const b = boxOf(d);
        const g = el("g", { class: `d-q${enter("pop")}` }, root);
        el("circle", { class: "d-q-ring", cx: b.x + b.w - 10, cy: b.y + 4, r: G.q.r }, g);
        label(g, "?", b.x + b.w - 10, b.y + 4 + G.q.size * 0.36, G.q.size, "d-q-text");
      }
    });
    label(root, "案内", G.guideLabel.x, G.guideLabel.y, G.guideLabel.size, "d-label");
    label(root, "詳細", G.detailLabel.x, G.detailLabel.y, G.detailLabel.size, "d-label");

    // stage（変更の台）。止まった変更は札のまま残る。
    const tr = G.tray;
    el("rect", { class: `d-tray${blocked ? " is-kept" : ""}`, x: tr.x, y: tr.y, width: tr.w, height: tr.h, rx: tr.r }, root);
    label(root, "変更", G.trayLabel.x, G.trayLabel.y, G.trayLabel.size, "d-label", "start");
    if (!idle) {
      const cg = el("g", { class: enter("pop").trim() }, root);
      el("circle", { class: `d-count${view.count > 0 ? " is-kept" : ""}`, cx: G.count.cx, cy: G.count.cy, r: G.count.r }, cg);
      label(cg, String(view.count), G.count.cx, G.count.cy + G.count.size * 0.36, G.count.size, "d-count-text");
      const xs = view.cards.length === 1 ? [G.trayX.center] : [G.trayX.a, G.trayX.b];
      view.cards.slice(0, 2).forEach((kind, i) => {
        cardShape(root, kind, xs[i], G.trackY, G, enter(i === 0 ? "fall" : "fall-late").trim());
      });
      if (view.cards.length > 2) label(root, `+${view.cards.length - 2}`, G.trayX.b, G.trackY + G.card.h * 0.7, 26, "d-label-muted");
    }

    // 変更 → 点検 → 保存 の道。
    const g = G.gate;
    const startX = tr.x + tr.w;
    if (!idle && view.committed) {
      el("path", { class: "d-track is-pass", d: `M${startX} ${G.trackY}H${G.git.x - G.git.newR}` }, root);
    } else if (!idle) {
      el("path", { class: "d-track is-stop", d: `M${startX} ${G.trackY}H${g.posts[0].x}` }, root);
      el("path", { class: "d-track", d: `M${g.posts[1].x + g.posts[1].w} ${G.trackY}H${G.git.x - G.git.newR}` }, root);
    } else {
      el("path", { class: "d-track", d: `M${startX} ${G.trackY}H${G.git.x - G.git.newR}` }, root);
    }

    // Git の保存の点。
    const gt = G.git;
    label(root, "保存", gt.x, gt.labelY, gt.labelSize, "d-label");
    el("path", { class: "d-git-line", d: `M${gt.x} ${gt.bottom}V${gt.oldY}` }, root);
    el("path", { class: !idle && view.committed ? "d-git-line is-new" : "d-git-future", d: `M${gt.x} ${gt.oldY}V${gt.top}` }, root);
    el("circle", { class: "d-dot", cx: gt.x, cy: gt.oldY, r: gt.oldR }, root);
    if (!idle) label(root, view.before, gt.x, gt.oldY + gt.oldR + gt.hashSize + 2, gt.hashSize, "d-hash");
    if (!idle && view.committed) {
      const ng = el("g", { class: enter("pop-late").trim() }, root);
      el("circle", { class: "d-dot is-new", cx: gt.x, cy: gt.newY, r: gt.newR }, ng);
      label(ng, view.after, gt.x, gt.newY + gt.newR + gt.hashSize + 2, gt.hashSize, "d-hash is-new");
    } else if (!idle) {
      el("circle", { class: `d-dot-ghost${enter("fade")}`, cx: gt.x, cy: gt.newY, r: gt.newR }, root);
    }

    // Letta の点検（門）。
    for (const p of g.posts) el("rect", { class: "d-post", x: p.x, y: p.y, width: p.w, height: p.h, rx: p.w / 2 }, root);
    if (blocked) {
      const bg = el("g", { class: enter("drop").trim() }, root);
      const b = g.barrier;
      el("rect", { class: "d-barrier", x: b.x, y: b.y, width: b.w, height: b.h, rx: 8 }, bg);
      const pl = g.plate;
      el("rect", { class: "d-plate", x: pl.cx - pl.w / 2, y: pl.cy - pl.h / 2, width: pl.w, height: pl.h, rx: 10 }, bg);
      label(bg, "止まる", pl.cx, pl.cy + pl.size * 0.36, pl.size, "d-plate-text");
      if (view.config) lockShape(bg, g.cx, pl.cy - pl.h / 2 - 34, 46);
    }
    const li = g.lintel;
    el("rect", { class: "d-lintel", x: li.x, y: li.y, width: li.w, height: li.h, rx: 14 }, root);
    label(root, "点検", g.labelX, g.labelY, g.labelSize, "d-lintel-text");
    el("circle", { class: `d-lamp${idle ? "" : view.committed ? " is-ok" : " is-stop"}`, cx: g.lamp.cx, cy: g.lamp.cy, r: g.lamp.r }, root);
    if (!idle && view.trial) {
      const s = g.shape;
      const sg = el("g", { class: enter("pop-late").trim() }, root);
      el("rect", { class: "d-shape-plate", x: s.cx - s.w / 2, y: s.cy - s.h / 2, width: s.w, height: s.h, rx: 12 }, sg);
      label(sg, "形", s.cx - s.w * 0.17, s.cy + s.size * 0.36, s.size, "d-shape-text");
      el("path", { class: "d-check", d: `M${s.cx + s.w * 0.06} ${s.cy + 2}l${s.w * 0.09} ${s.h * 0.17}l${s.w * 0.17} ${-s.h * 0.36}` }, sg);
    }

    // 短い札。
    if (!idle) {
      const T = G.tags;
      const tg = el("g", { class: enter("pop-late").trim() }, root);
      if (view.id === "L02") {
        const t = T.reason;
        leader(tg, t.cx, t.cy - t.h / 2, t.cx, sb.y + sb.h + 6, "d-leader-stop");
        if (key === "tall") el("path", { class: "d-leader-dash", d: `M${t.cx} ${t.cy + t.h / 2}L${t.cx} ${g.lintel.y}` }, tg);
        pill(tg, t, "案内がない", "is-stop");
      }
      if (view.overflow) {
        const t = T.overflow;
        const b = boxOf(G.details[0]);
        if (key === "tall") leader(tg, t.cx - t.w / 2, t.cy, b.x + b.w - 4, b.y + b.h + G.overflow.h * 0.5, "d-leader-stop");
        else leader(tg, t.cx + t.w / 2, t.cy, b.x + 12, b.y + b.h + G.overflow.h * 0.5, "d-leader-stop");
        pill(tg, t, "長すぎる", "is-stop");
      }
      if (view.config) {
        const t = T.gate;
        if (key === "tall") leader(tg, t.cx, t.cy + t.h / 2, t.cx, g.lintel.y, "d-leader-stop");
        else leader(tg, t.cx, t.cy - t.h / 2, t.cx, g.posts[0].y + g.posts[0].h, "d-leader-stop");
        pill(tg, t, "設定は保護", "is-stop");
        pill(tg, T.api, `形の指摘 ${view.apiErrors}件`, "is-ok");
      }
      if (view.trial) pill(tg, T.trial, `別の試行 ${view.id}`, "is-trial");
      if (!view.committed) pill(tg, T.keep, "残る", "is-keep");
    }

    ui.diagram.replaceChildren(svg);
    ui.diagram.setAttribute("aria-label", ariaOf(view));
  }

  function clearDiagram(message) {
    ui.diagram.replaceChildren();
    ui.diagram.hidden = true;
    ui.diagram.setAttribute("aria-label", message);
  }

  // --- 表示 ----------------------------------------------------------------------------------

  function setStatus(kind, message) {
    ui.status.dataset.state = kind;
    ui.status.textContent = message;
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

  const changeList = (list) => (list.length ? list.map((c) => `${c.status} ${c.path}`).join("\n") : "なし");

  function renderFacts(row) {
    const git = row.git_commit;
    const api = row.api;
    ui.facts.replaceChildren();
    ui.factsIntro.textContent = `${row.id}「${row.label}」：制作時に原典の検査と実際の git commit が返した値です。`;
    addFact("結果", row.committed
      ? `保存された（git commit 終了コード ${git.exit_code}・HEAD が進んだ）`
      : `止まった（git commit 終了コード ${git.exit_code}・HEAD は変わらない）`);
    addFact("原典の理由（pre-commit が出した行）", git.reported_errors.length ? git.reported_errors.join("\n") : "なし", true);
    addFact("HEAD", git.head_after === git.head_before ? `${short(git.head_before)} のまま` : `${short(git.head_before)} → ${short(git.head_after)}`, true);
    addFact("stage に入れた変更", changeList(git.staged_changes_before), true);
    addFact("stage に残った変更", changeList(git.staged_changes_after), true);
    addFact("検査API（形の点検）の指摘", api.tree.errors.length ? `${api.tree.errors.length}件\n${api.tree.errors.join("\n")}` : "0件", true);
    addFact("原典の検査スクリプトを直接実行", `終了コード ${row.cli.exit_code}`);
    addFact("記録の説明", row.reason_ja);
    ui.rawGit.textContent = [`$ ${git.command || "git commit"}`, `終了コード ${git.exit_code}`, "", "stdout:", git.stdout || "（空）", "stderr:", git.stderr || "（空）"].join("\n");
    ui.rawCli.textContent = [`$ ${row.cli.command || ""}`, `終了コード ${row.cli.exit_code}`, "", "stdout:", row.cli.stdout || "（空）", "stderr:", row.cli.stderr || "（空）"].join("\n");
    ui.rawApi.textContent = JSON.stringify({ trusted_config: api.trusted_config, tree: api.tree, staged_config: api.staged_config, projected_paths: api.projected_paths, not_projected_paths: api.not_projected_paths, frontmatter: api.frontmatter }, null, 2);
    ui.rawInput.textContent = JSON.stringify(row.input, null, 2);
  }

  function renderAll(record, rows) {
    const { total, committed, blocked } = record.summary;
    ui.tally.textContent = `${total}件：保存された ${committed}件 ／ 止まった ${blocked}件（それぞれ別の新しいリポジトリで、同じ基準の commit から試した記録）`;
    const items = IDS.map((id) => {
      const row = rows.get(id);
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = `#${id}`;
      a.textContent = `${id}「${row.label}」${row.committed ? "保存" : "停止"}・stage ${row.git_commit.staged_changes_after.length}件${SCENES.includes(id) ? "（図）" : ""}`;
      const b = document.createElement("a");
      b.href = `${COMPARE}#${id}`;
      b.className = "secondary";
      b.textContent = "元の記録";
      li.append(a, " ", b);
      return li;
    });
    ui.allList.replaceChildren(...items);
    const runtime = obj(record.runtime);
    ui.runFacts.textContent = `Node ${runtime.node || "?"}・${runtime.git || "Git ?"}・導入したパッケージ ${runtime.packages_installed ?? "?"}件・確認 ${record.verification.total}件すべて合格`;
  }

  function clearView() {
    ui.caption.textContent = "";
    ui.caseNote.hidden = true;
    ui.caseNoteText.textContent = "";
    ui.pair.hidden = true;
    ui.save.disabled = true;
    ui.saveId.textContent = "";
    ui.actionStatus.textContent = "";
    ui.facts.replaceChildren();
    for (const pre of [ui.rawGit, ui.rawCli, ui.rawApi, ui.rawInput]) pre.textContent = "";
    ui.factsIntro.textContent = "記録を読み込むと、選んだ記録の実際の値を表示します。";
    for (const link of [ui.compare, ui.factsCompare, ui.filmCompare]) link.href = COMPARE;
    for (const chip of ui.chips) chip.setAttribute("aria-pressed", "false");
  }

  function show(raw) {
    if (!state.ready) return;
    const animate = state.animateNext && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    state.animateNext = false;
    clearView();
    setStatus("ready", "");
    ui.retry.hidden = true;
    const row = state.rows.get(raw);
    if (!row) {
      // 知らない id：図は場面なしのまま。代わりの結果は出さない。
      state.id = null;
      buildDiagram(null, false);
      state.previous = null;
      ui.caseNoteText.textContent = `「${raw}」に当たる記録はありません。上の4つから場面を選ぶか、`;
      ui.caseNoteLink.href = COMPARE;
      ui.caseNoteLink.textContent = "8件の記録を開く";
      ui.caseNote.hidden = false;
      return;
    }

    state.id = row.id;
    for (const link of [ui.compare, ui.factsCompare, ui.filmCompare]) link.href = `${COMPARE}#${row.id}`;
    renderFacts(row);
    ui.save.disabled = false;
    ui.saveId.textContent = row.id;
    for (const chip of ui.chips) chip.setAttribute("aria-pressed", String(chip.dataset.case === row.id));

    const view = state.views.get(row.id) || null;
    if (view) {
      buildDiagram(view, animate && Boolean(state.previous) && state.previous.id !== view.id);
      state.previous = view;
      ui.caption.textContent = captionOf(view);
      const [broken, repaired] = PIN.repairPair;
      if (row.id === broken || row.id === repaired) {
        ui.pair.dataset.target = row.id === broken ? repaired : broken;
        ui.pair.textContent = row.id === broken ? "案内ありと比べる" : "案内なしと比べる";
        ui.pair.hidden = false;
      }
    } else {
      // 図の4場面にない記録：図は場面なしにして、記録の要点と元の記録へのリンクを出す。
      buildDiagram(null, false);
      state.previous = null;
      const n = row.git_commit.staged_changes_after.length;
      ui.caseNoteText.textContent = row.committed
        ? `${row.id}「${row.label}」は保存された記録です（HEAD ${short(row.git_commit.head_before)} → ${short(row.git_commit.head_after)}・stage ${n}件）。この図の4場面には入っていないため、入力と出力は`
        : `${row.id}「${row.label}」は止まった記録です（stage に${n}件が残り、HEAD は ${short(row.git_commit.head_before)} のまま）。この図の4場面には入っていないため、入力と理由は`;
      ui.caseNoteLink.href = `${COMPARE}#${row.id}`;
      ui.caseNoteLink.textContent = `元の記録の ${row.id} で見る`;
      ui.caseNote.hidden = false;
    }
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
    clearView();
    for (const chip of ui.chips) chip.disabled = true;
    ui.tally.textContent = "記録を読み込むと、件数を表示します。";
    ui.allList.replaceChildren();
    ui.runFacts.textContent = "記録を読み込むと表示します。";
  }

  // --- 操作 ----------------------------------------------------------------------------------

  function go(id) {
    if (!state.ready || id === state.id) return;
    state.animateNext = true;
    location.hash = id; // hashchange が表示を切り替え、戻る・進むにも残る
  }

  for (const chip of ui.chips) chip.addEventListener("click", () => go(chip.dataset.case));
  ui.pair.addEventListener("click", () => go(ui.pair.dataset.target));
  window.addEventListener("hashchange", route);
  wide.addEventListener("change", () => {
    if (!state.ready) return;
    const view = state.id ? state.views.get(state.id) || null : null;
    buildDiagram(view, false);
  });

  // comparison.js と同じ保存：選んだ1件をそのまま2字下げの JSON と末尾の改行にして、letta-<id>.json の名前で渡す。
  ui.save.addEventListener("click", () => {
    if (!state.ready) return;
    const item = state.rows.get(state.id);
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
    ui.actionStatus.textContent = `${name} の保存をブラウザーに渡しました。`;
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
      const text = decode(await fetchBytes(REQUEST), REQUEST);
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
    clearDiagram("記憶のメモ、stage の変更、Letta の点検、Git の保存の関係の図。記録を確かめるまで表示しません。");
    ui.retry.hidden = true;
    ui.retry.disabled = true;
    setStatus("loading", "保存済みの実行結果と固定版のハッシュを確かめています…");
    try {
      const entries = await Promise.all(Object.entries(FILES).map(async ([key, path]) => [key, await fetchBytes(path)]));
      const raw = Object.fromEntries(entries);
      const hashes = {};
      for (const [key, path] of Object.entries(FILES)) hashes[path] = await sha256Hex(raw[key]);
      const files = {};
      for (const [key, path] of Object.entries(FILES)) files[key] = parseJson(decode(raw[key], path), path);
      const rows = validate(files, hashes);
      state.record = files.record;
      state.rows = rows;
      state.views = new Map(SCENES.map((id) => [id, viewOf(rows.get(id))]));
      renderAll(files.record, rows);
      for (const chip of ui.chips) chip.disabled = false;
      state.ready = true;
      setStatus("ready", "");
      route();
    } catch (error) {
      lock();
      clearDiagram("記録を確かめられなかったため、図を表示していません。");
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
