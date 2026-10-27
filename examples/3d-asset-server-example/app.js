// 八百万図AIツールボックス — 3D Asset Server 作例ページ。MIT License, Copyright (c) 2026 Studio Yebisu.
// 保存した実行記録を読むだけのページ。ブラウザーから検索・取得はせず、記録の値をそのまま表示する。
// データはすべて textContent とテキストノードで書き、HTML として解釈しない。
// 3D は A08 を開いたときだけ model-view.js を読み込み、1回だけ組み立てる。

const EXPECTED = Object.freeze({
  format: "studio-yebisu-3d-asset-runs-v1",
  inputFormat: "studio-yebisu-3d-asset-input-v1",
  upstream: {
    repository: "arielshad/3d-asset-server",
    commit: "f605df3425011bae55ade114c9e7b276f5b1297b",
    version: "0.1.0",
    license: "Apache-2.0",
  },
  three: {
    version: "0.180.0",
    license: "MIT",
    archive_sha256: "ad66d724565ee29a2467277fa84daa5ed0211d6b8d446e9ef29f6bae0cd14144",
  },
  sha256: {
    "input/asset-requests.json": "cced85c1dc314fb7c516bac22c3c8f23fe6caf95df6c4a854acbc0e1cd7bc019",
    "input/expected.json": "92f1ee4e97b19fc26a93fe05d4c4feb91d16ef73fd0c3d61e78c62d5d5dee9ef",
    "vendor-lock.json": "67f280672c4268d5a06b401e9e91b2c3010968c1e78211b29724b132b9266973",
  },
  lockFiles: 115,
  userAgent: "Studio-Yebisu-3D-example/1.0 (+https://studio-yebisu.github.io/yaoyorozu-ai-toolbox/)",
  providers: ["polyhaven", "fab"],
  operations: {
    A01: "search",
    A02: "details",
    A03: "select",
    A04: "budget",
    A05: "invalid-id",
    A06: "unknown-provider",
    A07: "search",
    A08: "download",
  },
  defaultId: "A08",
  assetsPrefix: "outputs/assets/",
});
const IDS = Object.keys(EXPECTED.operations);
const FILES = {
  record: "outputs/asset-runs.json",
  requests: "input/asset-requests.json",
  expected: "input/expected.json",
  lock: "vendor-lock.json",
  request: "request.txt",
};
const HASHED = { requests: "input/asset-requests.json", expected: "input/expected.json", lock: "vendor-lock.json" };
const BUNDLE_ZIP = "outputs/model-bundle.zip";
const POLYHAVEN_API = "https://api.polyhaven.com/";
const OPERATION_LABEL = {
  search: "検索（AssetService.search）",
  details: "詳細と利用条件（AssetService.getAsset）",
  select: "取得前の選択と容量（selectFiles・totalBytes・expandFiles）",
  budget: "予算付きの取得（downloadFiles・maxBytes）",
  "invalid-id": "形式の違うID（AssetService.getAsset）",
  "unknown-provider": "未登録の配信元（AssetService.getAsset）",
  download: "実際の取得（downloadFiles）",
};

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
  modelStage: $("model-stage"),
  modelView: $("model-view"),
  modelStatus: $("model-status"),
  modelRetry: $("model-retry"),
  modelCredit: $("model-credit"),
  modelBundle: $("model-bundle"),
  rotateLeft: $("rotate-left"),
  rotateRight: $("rotate-right"),
  resetModel: $("reset-model"),
  wireframe: $("wireframe"),
  diagnosisNote: $("diagnosis-note"),
  diagnosis: $("diagnosis"),
  caseLinks: $("case-links"),
  facts: $("facts"),
  manifestBox: $("manifest-box"),
  manifestSummary: $("manifest-summary"),
  manifestNote: $("manifest-note"),
  manifest: $("manifest"),
  downloadRecord: $("download-record"),
  downloadBundle: $("download-bundle"),
  copy: $("copy-request"),
  actionStatus: $("action-status"),
  fallback: $("request-fallback"),
  fallbackLabel: $("request-fallback-label"),
  rawInput: $("raw-input"),
  rawOutput: $("raw-output"),
  runFacts: $("run-facts"),
  checksSummary: $("checks-summary"),
  checksList: $("checks-list"),
};

// The one owner of page state. Only load(), clearResult() and render() change it.
const state = {
  ready: false,
  loading: false,
  record: null,
  recordSha: "",
  byId: new Map(),
  current: null,
  request: "",
  bundleAvailable: false,
};
const model = { view: null, pending: null, loadedFor: "" };

class LoadError extends Error {}

function fail(message) {
  throw new LoadError(message);
}

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isString = (value) => typeof value === "string";
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const fileText = (value) => `${JSON.stringify(value, null, 2)}\n`;
const formatInt = (n) => Number(n).toLocaleString("ja-JP");
const bytesText = (n) => `${formatInt(n)} bytes`;
const mib = (n) => (n / 1048576).toFixed(2);
const HEX64 = /^[0-9a-f]{64}$/;

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

const safeAssetPath = (path) => isString(path) && path.startsWith(EXPECTED.assetsPrefix)
  && !path.split("/").some((part) => part === ".." || part === "") && !path.includes("\\") && !/^[a-z]+:/i.test(path);

// --- 照合 --------------------------------------------------------------------------------

function validate(files, hashes) {
  const { record, requests, expected, lock } = files;

  for (const [path, pinned] of Object.entries(EXPECTED.sha256)) {
    if (hashes[path] !== pinned) fail(`${path} の SHA-256 が、実行前に固定した値と一致しません。`);
  }
  if (!isObject(lock) || Object.keys(EXPECTED.upstream).some((key) => lock[key] !== EXPECTED.upstream[key])) {
    fail("vendor-lock.json の固定版が一致しません。");
  }
  if (!isObject(lock.three) || Object.keys(EXPECTED.three).some((key) => lock.three[key] !== EXPECTED.three[key])) {
    fail("vendor-lock.json の three の固定版が一致しません。");
  }
  if (!Array.isArray(lock.files) || lock.files.length !== EXPECTED.lockFiles) {
    fail(`vendor-lock.json の対象が${EXPECTED.lockFiles}ファイルではありません。`);
  }

  if (!isObject(record) || record.format !== EXPECTED.format) fail("実行記録の形式が違います。");
  const upstream = isObject(record.upstream) ? record.upstream : {};
  if (Object.keys(EXPECTED.upstream).some((key) => upstream[key] !== EXPECTED.upstream[key])) {
    fail("実行記録の 3D Asset Server の固定版が一致しません。");
  }
  if (upstream.vendor_lock_sha256 !== EXPECTED.sha256["vendor-lock.json"] || upstream.vendor_files_verified !== EXPECTED.lockFiles) {
    fail("実行記録の vendor-lock.json の照合が一致しません。");
  }
  if (!deepEqual(record.input_sha256, EXPECTED.sha256)) fail("実行記録にある入力とロックの SHA-256 が一致しません。");
  if (!isObject(record.three) || !deepEqual(record.three, EXPECTED.three)) fail("実行記録の three の固定版が一致しません。");
  const runtime = isObject(record.runtime) ? record.runtime : {};
  if (runtime.user_agent !== EXPECTED.userAgent || !deepEqual(runtime.providers, EXPECTED.providers)) {
    fail("実行記録の User-Agent か、有効にした配信元が一致しません。");
  }

  if (!isObject(requests) || requests.format !== EXPECTED.inputFormat || !Array.isArray(requests.cases)
    || !deepEqual(requests.cases.map((item) => item && item.id), IDS)) {
    fail("input/asset-requests.json が A01〜A08 の8件ではありません。");
  }
  const results = record.results;
  if (!Array.isArray(results) || !deepEqual(results.map((item) => item && item.id), IDS)) {
    fail("実行記録が A01〜A08 の8件ではありません。");
  }
  results.forEach((item, index) => {
    const source = requests.cases[index];
    if (!isObject(item) || item.label !== source.label || item.operation !== EXPECTED.operations[item.id]
      || item.operation !== source.operation || !deepEqual(item.input, source) || !isObject(item.observations)) {
      fail(`${source.id} の入力が input/asset-requests.json と一致しません。`);
    }
  });

  const verification = record.verification;
  if (!isObject(verification) || verification.status !== "passed" || !Array.isArray(verification.checks)
    || verification.checks.length === 0
    || !verification.checks.every((entry) => isObject(entry) && isString(entry.name) && entry.passed === true)
    || verification.total !== verification.checks.length || verification.passed !== verification.checks.length) {
    fail("実行記録の確認がすべて合格になっていません。");
  }

  const byId = Object.fromEntries(results.map((item) => [item.id, item]));
  const a08 = byId.A08.output;
  if (byId.A08.error || !isObject(a08) || !Array.isArray(a08.manifest) || !a08.manifest.length || !safeAssetPath(a08.model_entry)
    || !isObject(a08.gltf) || !isObject(a08.asset) || !isObject(a08.bundle)) {
    fail("A08 に取得したファイルの記録がそろっていません。");
  }
  for (const file of a08.manifest) {
    if (!isObject(file) || !safeAssetPath(file.public_path) || !Number.isInteger(file.bytes) || !HEX64.test(file.sha256)) {
      fail("A08 のファイル一覧に、読めない行があります。");
    }
  }
  if (!a08.manifest.some((file) => file.public_path === a08.model_entry)) fail("A08 の glTF の入り口が、ファイル一覧にありません。");
  const total = a08.manifest.reduce((sum, file) => sum + file.bytes, 0);
  const summary = record.summary;
  if (!isObject(summary) || summary.operations !== results.length || summary.files !== a08.manifest.length
    || summary.bytes !== total || summary.downloaded_models !== 1
    || summary.checks_total !== verification.total || summary.checks_passed !== verification.passed) {
    fail("実行記録のまとめが、記録から数えた値と一致しません。");
  }

  if (!isObject(expected) || expected.cases !== results.length) fail("input/expected.json の形が違います。");
  const a01 = byId.A01.output;
  const status = (result) => Object.fromEntries((result.output?.providers ?? []).map((report) => [report.provider, report.status]));
  if (!isObject(a01) || !Array.isArray(a01.results) || !a01.results.some((asset) => asset.id === expected.search_contains)
    || !deepEqual(status(byId.A01), expected.search_provider_status)) {
    fail("A01 の検索結果が、実行前に決めた期待と一致しません。");
  }
  if (a08.manifest.length !== expected.one_k_files || total !== expected.one_k_bytes || a08.asset.id !== expected.search_contains
    || a08.asset.author !== expected.chosen_author || a08.asset.license?.name !== expected.chosen_asset_license
    || a08.gltf.version !== expected.gltf_version) {
    fail("A08 の取得結果が、実行前に決めた期待と一致しません。");
  }
  if (!byId.A04.error || !(byId.A04.output?.totalBytes > byId.A04.input.max_bytes)
    || byId.A05.error?.name !== expected.invalid_id_error || byId.A06.error?.name !== expected.unknown_provider_error
    || status(byId.A07).fab !== expected.direct_only_fab_status) {
    fail("A04〜A07 の結果が、実行前に決めた期待と一致しません。");
  }
}

// --- 表示の部品 ------------------------------------------------------------------------------

function node(tag, text, className) {
  const item = document.createElement(tag);
  if (text !== undefined && text !== null) item.textContent = text;
  if (className) item.className = className;
  return item;
}

function mono(text) {
  return node("span", text, "mono");
}

function line(...parts) {
  const item = document.createElement("li");
  for (const part of parts) item.append(typeof part === "string" ? document.createTextNode(part) : part);
  return item;
}

function addFact(label, value, isMono) {
  const row = document.createElement("div");
  row.append(node("dt", label), node("dd", value, isMono ? "mono" : undefined));
  el.facts.append(row);
}

function link(href, text) {
  const a = node("a", text);
  a.href = href;
  return a;
}

function externalLink(href, text) {
  const a = link(href, text);
  a.rel = "noopener noreferrer";
  return a;
}

const fileCalls = (item) => (item.observations.network?.calls ?? []).filter((call) => !String(call.url).startsWith(POLYHAVEN_API));

function bundleText(output) {
  const contents = output.bundle.contents || {};
  const parts = [];
  if (contents.gltf) parts.push("glTF");
  if (contents.bin) parts.push(contents.bin === 1 ? "bin" : `bin ${contents.bin}個`);
  if (contents.images) parts.push(`${contents.images}枚の画像`);
  const res = Array.isArray(output.bundle.resolution) ? output.bundle.resolution.join("・") : "";
  return `${res}・${parts.join(" + ")}・約${mib(output.bundle.total_bytes)}MiB`;
}

function creditText(asset) {
  return `${asset.title} — ${asset.author} / ${asset.provider} / ${asset.license.name}`;
}

// --- 操作ごとの読み方（記録の値から作る） --------------------------------------------------------

function describeProvider(report) {
  if (report.status === "ok") {
    return line(node("strong", `${report.name}：ok`), `　この検索で ${report.count}件（一致 ${report.total ?? "?"}件）・${report.tookMs}ms（実行時の実測。再実行で変わります）`);
  }
  if (report.status === "link") {
    return line(node("strong", `${report.name}：link`), "　候補 0件。原典はサイト内検索の URL を作るだけで、Fab へは通信していません：", mono(report.searchUrl || ""));
  }
  if (report.status === "skipped") {
    return line(node("strong", `${report.name}：skipped（対象外）`), "　原典の理由「", mono(report.error || ""), "」。失敗（error）や時間切れ（timeout）とは別の状態です。");
  }
  return line(node("strong", `${report.name}：${report.status}`), "　", mono(report.error || ""));
}

function renderSearch(item) {
  const output = item.output;
  const chosen = state.byId.get("A08").output.asset.id;
  const allSkipped = output.providers.length > 0 && output.providers.every((report) => report.status === "skipped");
  const kind = output.results.length ? "ok" : allSkipped ? "skipped" : "info";
  const stateText = output.results.length
    ? `候補 ${output.results.length}件・${output.providers.map((report) => `${report.name} ${report.status}`).join("／")}`
    : allSkipped ? "対象外（skipped）：エラーではありません" : "候補 0件";
  const items = [];
  for (const asset of output.results) {
    const meta = `${asset.license?.name ?? "ライセンス不明"}・作者 ${asset.author ?? "不明"}・${asset.price?.free ? "無料" : "有料"}・${asset.downloadable ? "直接取得できる" : "直接取得なし"}・score ${asset.score}`;
    const row = line(node("strong", asset.title), " ", mono(asset.id), node("span", meta, "meta"));
    if (asset.id === chosen) {
      row.append(node("span", "取得して3Dで確かめたのは、この1件だけです。", "tag"), " ", link("#A08", "A08 で3Dを見る"));
    } else {
      row.append(node("span", "候補として返っただけで、取得していません。", "meta"));
    }
    row.className = "candidate";
    items.push(row);
  }
  if (!output.results.length) items.push(line("候補は0件でした。"));
  for (const report of output.providers) items.push(describeProvider(report));
  items.push(line(`問い合わせ：「${output.query}」・種類 ${(output.types || []).join(", ")}・${item.input.request.freeOnly ? "無料だけ" : "有料も含む"}${item.input.request.downloadableOnly ? "・直接取得できるものだけ" : ""}・上限 ${item.input.request.limit}件。この操作の通信 ${item.observations.network.requests}件。`));
  const facts = [
    ["配信元に指定", item.input.request.providers.join(", "), true],
    ["返った候補の ID", output.results.map((asset) => asset.id).join(", ") || "なし", true],
  ];
  return { kind, stateText, note: "上位の候補と、配信元ごとの状態", items, facts, links: [] };
}

function renderDetails(item) {
  const d = item.output;
  const lic = d.license || {};
  const gltfRes = item.observations.gltf_resolutions || [];
  const items = [
    line(node("strong", `${lic.name}`), `：商用 ${lic.commercialUse ? "可" : "不可"}・帰属表示 ${lic.attributionRequired ? "必要" : "不要"}（原典が返した値）。不要でも、このページは作者と Poly Haven を表示します。`),
    line(`作者 ${d.author}・配布元 Poly Haven：`, externalLink(d.url, d.url)),
    line(`形式 ${(d.formats || []).join("・")}。Web の three.js には glTF を選びます（原典の SKILL.md の形式の規則）。`),
    line(`glTF の解像度 ${gltfRes.join("・")}・ファイルの候補 ${d.files.length}件。次の A03 で、1k の中身と容量を取得の前に見ます。この操作の通信 ${item.observations.network.requests}件（info と files の API）。`),
  ];
  const facts = [
    ["タイトル", d.title],
    ["ID", d.id, true],
    ["解像度", (d.resolutions || []).join("・")],
    ["ポリゴン数（メタデータ）", d.polyCount !== undefined ? formatInt(d.polyCount) : "なし"],
    ["種類", d.type, true],
  ];
  return {
    kind: "ok",
    stateText: `${lic.name}・作者 ${d.author}・glTF あり`,
    note: "ライセンス・作者・形式",
    items,
    facts,
    links: [["#A03", "A03 で1kの容量を見る"]],
  };
}

function renderSelect(item) {
  const o = item.output;
  const total = o.totalBytes;
  const max = item.observations.max_bytes;
  const items = o.expanded.map((file) => line(mono(file.path), `　${bytesText(file.sizeBytes)}`));
  items.push(line(node("strong", `合計 ${bytesText(total)}（約${mib(total)}MiB）`), `・予算 ${bytesText(max)}（${mib(max)}MiB）${item.observations.within_budget ? "以内" : "を超える"}。`));
  items.push(line(`まだ取得していません。この段階のファイルの通信は ${fileCalls(item).length}件です。`));
  return {
    kind: "ok",
    stateText: `取得前に確認：${o.expanded.length}ファイル・約${mib(total)}MiB`,
    note: "取得する予定の全ファイルと合計（原典の totalBytes）",
    items,
    facts: [
      ["解像度", item.observations.resolution.join("・")],
      ["主ファイル", o.selection.map((f) => f.filename).join(", "), true],
      ["一緒に置くファイル", String(o.expanded.length - o.selection.length)],
    ],
    links: [["#A04", "A04 で8kを試す"], ["#A08", "A08 で実物を見る"]],
  };
}

function renderBudget(item) {
  const o = item.output;
  const obs = item.observations;
  const res = o.selection_resolution.join("・");
  const items = [
    line(node("strong", `${res} の合計 ${bytesText(o.totalBytes)}（約${mib(o.totalBytes)}MiB）`)),
    line(`予算 maxBytes ${bytesText(o.maxBytes)}（${mib(o.maxBytes)}MiB）・超過 ${bytesText(obs.exceeds_by_bytes)}`),
    line("原典の例外：", mono(`${item.error.name}: ${item.error.message}`)),
    line(`原典の downloadFiles は、合計が分かっていれば通信の前に止めます。取得の通信 ${obs.download_requests}件・保存フォルダーは${obs.budget_dir_created ? "作られました" : "作られていません"}。`),
  ];
  return {
    kind: "stopped",
    stateText: `止まった：${res}は予算超過・取得の通信 ${obs.download_requests}件`,
    note: "取得の前に容量で止まった例",
    items,
    facts: [["ファイル数", String(o.expanded.length)], ["例外の名前", item.error.name, true]],
    links: [["#A03", `A03 で1kの容量を見る`], ["#A08", "A08 で1kの実物を見る"]],
  };
}

function renderError(item) {
  const error = item.error;
  const reading = error.name === "InvalidAssetIdError"
    ? "ID は「配信元:素材のID」の形が必要です（例 polyhaven:wooden_crate_01）。配信元が無いので、どこにも問い合わせずに止まりました。"
    : error.name === "UnknownProviderError"
      ? `この作例で登録した配信元は ${EXPECTED.providers.join(" と ")} の2つだけです。「${(error.ids || []).join(", ")}」は登録されていないので、通信せずに止まりました。`
      : "原典が返した例外です。";
  return {
    kind: "stopped",
    stateText: `止まった：${error.name}`,
    note: "原典の例外をそのまま",
    items: [
      line("原典の例外：", mono(`${error.name}: ${error.message}`)),
      line(reading),
      line(`この操作の通信 ${item.observations.network.requests}件。`),
    ],
    facts: [["渡した ID", item.input.asset_id, true]],
    links: [],
  };
}

function renderDownload(item) {
  const o = item.output;
  const g = o.gltf;
  const asset = o.asset;
  const matched = o.manifest.filter((file) => file.bytes === file.api_size && file.md5 === String(file.api_md5).toLowerCase()).length;
  const same = g.scene.triangles === asset.poly_count_metadata;
  const items = [
    line(node("strong", bundleText(o)), `。相対パスを保ったまま ${o.folder}/ に保存しました（原典の downloadFiles が返した bytes は ${formatInt(o.download.bytes)}）。`),
    line(`${o.manifest.length}ファイル中 ${matched}ファイルで、バイト数が Poly Haven の files API の size と、MD5 が md5 と一致しました。`),
    line(`glTF ${g.version}・buffer ${g.buffers.length}・画像 ${g.images.length}。参照はすべて同じフォルダーの実ファイルを指し、使われないファイルは ${g.unreferenced_files.length}件です。`),
    line(`メッシュ ${g.counts.meshes}（描画 ${g.scene.primitive_instances}）・三角形 ${formatInt(g.scene.triangles)}・頂点 ${formatInt(g.scene.vertices)}。glTF のアクセサーから数えた値です。Poly Haven のメタデータの polycount は ${asset.poly_count_metadata !== null ? formatInt(asset.poly_count_metadata) : "なし"}${asset.poly_count_metadata === null ? "" : same ? "（同じ値）" : "（数え方の違う別の値）"}。`),
    line(`取得の通信 ${item.observations.download_requests}件・予算 maxBytes ${bytesText(item.input.max_bytes)}。`),
  ];
  return {
    kind: "ok",
    stateText: `取得済み：${o.manifest.length}ファイル・${bytesText(o.bundle.total_bytes)}`,
    note: "取得した実ファイルを確かめた結果",
    items,
    facts: [
      ["glTF の入り口", o.model_entry, true],
      ["作成ツール（glTF の記載）", g.generator || "なし"],
      ["使っている拡張", g.extensions_used.length ? g.extensions_used.join(", ") : "なし", true],
      ["出典", asset.source_url, true],
      ["表示している出典", creditText(asset)],
    ],
    links: [],
  };
}

const RENDERERS = {
  search: renderSearch,
  details: renderDetails,
  select: renderSelect,
  budget: renderBudget,
  "invalid-id": renderError,
  "unknown-provider": renderError,
  download: renderDownload,
};

function shortState(item) {
  if (item.error) return "止まった";
  if (item.operation === "search") return item.output.results.length ? `候補${item.output.results.length}件` : "対象外";
  if (item.operation === "download") return "取得済み";
  if (item.operation === "select") return "容量を確認";
  return "結果";
}

// --- 表示 --------------------------------------------------------------------------------

function setStatus(kind, message) {
  el.status.dataset.state = kind;
  el.statusText.textContent = message;
  el.retry.hidden = kind !== "error";
  el.retry.disabled = kind === "loading";
}

function setBundleLink(active) {
  const a = el.downloadBundle;
  if (active && state.bundleAvailable) {
    a.href = BUNDLE_ZIP;
    a.setAttribute("download", "polyhaven-wooden_crate_01-1k.zip");
    a.removeAttribute("aria-disabled");
    a.textContent = "モデル一式（ZIP）を保存";
  } else {
    a.removeAttribute("href");
    a.removeAttribute("download");
    a.setAttribute("aria-disabled", "true");
    a.textContent = active ? "モデル一式ZIP（準備中）" : "モデル一式ZIP（A08のみ）";
  }
}

function setControls(enabled) {
  el.select.disabled = !enabled;
  el.downloadRecord.disabled = !enabled;
  el.copy.disabled = !enabled;
  setBundleLink(enabled && state.current === "A08");
}

function clearResult() {
  el.viewer.hidden = true;
  el.tally.hidden = true;
  el.modelStage.hidden = true;
  el.caseLinks.hidden = true;
  el.manifestBox.hidden = true;
  for (const item of [el.kicker, el.title, el.state, el.diagnosisNote, el.modelCredit, el.modelBundle,
    el.rawInput, el.rawOutput, el.actionStatus, el.manifestNote, el.checksSummary]) {
    item.textContent = "";
  }
  el.state.dataset.state = "";
  for (const item of [el.tally, el.diagnosis, el.caseLinks, el.facts, el.manifest, el.select, el.runFacts, el.checksList]) {
    item.replaceChildren();
  }
  el.fallback.hidden = true;
  el.fallbackLabel.hidden = true;
  el.fallback.value = "";
  state.record = null;
  state.recordSha = "";
  state.byId = new Map();
  state.current = null;
  state.request = "";
  setBundleLink(false);
}

function buildPicker(results) {
  for (const item of results) {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = `${item.id}　${item.label}（${shortState(item)}）`;
    el.select.append(option);
  }
}

function renderTally(record) {
  const s = record.summary;
  el.tally.textContent = `${s.operations}操作の記録・${s.downloaded_models}モデル・${s.files}ファイルを取得`;
  el.tally.hidden = false;
}

function renderRunFacts(record) {
  const add = (label, value) => {
    const row = node("div", undefined, "kv-row");
    row.append(node("dt", label), node("dd", value));
    el.runFacts.append(row);
  };
  const net = record.network || {};
  add("実行環境", `Node ${record.runtime.node}・配信元 ${record.runtime.providers.join(", ")}`);
  add("通信", `${net.requests}件（Poly Haven の API ${net.api_requests}件・ファイル ${net.file_requests}件）・接続先 ${(net.hosts || []).join(", ")}`);
  add("原典の照合", `${record.upstream.vendor_files_verified}ファイル（${Object.entries(record.upstream.vendor_file_kinds || {}).map(([k, v]) => `${k} ${v}`).join("・")}）`);
  add("使った原典のモジュール", record.upstream.modules.join(", "));
  add("依存（npm ci・package-lock どおり）", record.upstream.runtime_dependencies.map((d) => `${d.name} ${d.version}`).join("・"));
  add("vendor-lock.json の SHA-256", record.upstream.vendor_lock_sha256);
  for (const [path, value] of Object.entries(record.input_sha256)) {
    if (path !== "vendor-lock.json") add(`${path} の SHA-256`, value);
  }
  add("この記録の SHA-256", state.recordSha);
  for (const [key, capture] of Object.entries(record.api_captures || {})) {
    add(`${capture.path}（${key} API の応答）`, `${formatInt(capture.bytes)} bytes・SHA-256 ${capture.sha256}`);
  }
  add("再現について", "検索結果・メタデータ・tookMs は Poly Haven 側で変わりえます。固定しているのは原典・入力・この記録と取得ファイルのハッシュです。");

  const checks = record.verification.checks;
  el.checksSummary.textContent = `記録にある確認 ${checks.length}件（すべて合格）`;
  for (const entry of checks) el.checksList.append(line(mono(entry.name), "　合格"));
}

function renderManifest(item) {
  el.manifest.replaceChildren();
  if (item.operation !== "download") {
    el.manifestBox.hidden = true;
    return;
  }
  const files = item.output.manifest;
  el.manifestSummary.textContent = `${files.length}ファイルの一覧（バイト数・SHA-256・MD5）`;
  el.manifestNote.textContent = "取得したファイルを、改変せずにそのまま置いています。各ファイルは単独でも開けますが、glTF は同じフォルダーの bin と画像を参照します。";
  for (const file of files) {
    const row = document.createElement("li");
    const open = link(file.public_path, "開く");
    open.setAttribute("download", "");
    row.append(
      node("span", file.path, "mono manifest-path"),
      node("span", bytesText(file.bytes), "manifest-bytes"),
      node("span", `SHA-256 ${file.sha256}`, "hash"),
      node("span", `MD5 ${file.md5}（Poly Haven ${file.api_md5}）`, "hash"),
      open,
    );
    el.manifest.append(row);
  }
  el.manifestBox.hidden = false;
}

function modelSpec(output) {
  return {
    entry: output.model_entry,
    files: output.manifest.map(({ path, public_path, bytes, sha256 }) => ({ path, public_path, bytes, sha256 })),
    expected: { triangles: output.gltf.scene.triangles, meshes: output.gltf.scene.primitive_instances },
  };
}

function setModelStatus(kind, message) {
  el.modelStatus.dataset.state = kind;
  el.modelStatus.textContent = message;
}

async function showModel(output) {
  el.modelStage.hidden = false;
  el.modelCredit.replaceChildren(
    document.createTextNode("モデル："),
    node("strong", creditText(output.asset)),
    document.createTextNode("（帰属表示は不要ですが、作者と配布元を表示しています）・"),
    externalLink(output.asset.source_url, "Poly Haven で見る"),
  );
  el.modelBundle.textContent = bundleText(output);

  if (!model.view) {
    if (!model.pending) {
      setModelStatus("loading", "3D表示の部品（three.js）を読み込んでいます…");
      model.pending = import("./model-view.js").then((module) => module.mountModelView({
        view: el.modelView,
        status: el.modelStatus,
        retry: el.modelRetry,
        rotateLeft: el.rotateLeft,
        rotateRight: el.rotateRight,
        reset: el.resetModel,
        wireframe: el.wireframe,
      }, sha256Hex));
    }
    try {
      model.view = await model.pending;
    } catch (error) {
      model.pending = null;
      setModelStatus("error", "3D表示の部品（同梱の three.js）を読み込めませんでした。下の記録と5ファイルの保存はこのまま使えます。");
      el.modelRetry.hidden = false;
      return;
    }
  }
  if (model.loadedFor !== state.recordSha) {
    model.loadedFor = state.recordSha;
    model.view.load(modelSpec(output));
  } else {
    model.view.show();
  }
}

el.modelRetry.addEventListener("click", () => {
  // Before the viewer exists, retrying means importing it again. Afterwards model-view.js owns this button.
  if (model.view || !state.ready || state.current !== "A08") return;
  el.modelRetry.hidden = true;
  showModel(state.byId.get("A08").output);
});

function render(id) {
  const item = state.byId.get(id);
  if (!item) return;
  state.current = id;
  const view = RENDERERS[item.operation](item);

  el.select.value = id;
  el.kicker.textContent = `${IDS.indexOf(id) + 1} / ${IDS.length}　${OPERATION_LABEL[item.operation].split("（")[0]}`;
  el.title.textContent = `${item.id}　${item.label}`;
  el.state.dataset.state = view.kind;
  el.state.textContent = view.stateText;

  el.diagnosisNote.textContent = view.note;
  el.diagnosis.replaceChildren(...view.items);
  el.caseLinks.replaceChildren();
  view.links.forEach(([href, text], index) => {
    if (index) el.caseLinks.append(document.createTextNode("　"));
    el.caseLinks.append(link(href, text));
  });
  el.caseLinks.hidden = view.links.length === 0;
  el.facts.replaceChildren();
  for (const [label, value, isMono] of view.facts) addFact(label, value, isMono);
  renderManifest(item);

  el.rawInput.textContent = JSON.stringify(item.input, null, 2);
  el.rawOutput.textContent = JSON.stringify(item, null, 2);

  if (item.operation === "download") {
    showModel(item.output);
  } else {
    el.modelStage.hidden = true; // the mounted viewer is kept, only hidden
  }
  setBundleLink(state.ready && id === "A08");
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

el.downloadRecord.addEventListener("click", () => {
  if (!state.ready) return;
  const item = state.byId.get(state.current);
  if (!item) return;
  const name = `3d-asset-server-${item.id}.json`;
  const url = URL.createObjectURL(new Blob([fileText(item)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  el.actionStatus.textContent = `${name} の保存をブラウザーに渡しました。`;
});

el.downloadBundle.addEventListener("click", (event) => {
  if (!el.downloadBundle.hasAttribute("href")) event.preventDefault();
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

async function checkBundle() {
  try {
    const response = await fetch(BUNDLE_ZIP, { method: "HEAD", cache: "no-store" });
    state.bundleAvailable = response.ok;
  } catch (error) {
    state.bundleAvailable = false;
  }
  if (state.ready) setBundleLink(state.current === "A08");
}

async function load() {
  if (state.loading) return;
  state.loading = true;
  state.ready = false;
  clearResult();
  setControls(false);
  setStatus("loading", "保存した記録・入力・ロックを読み込み、固定版と SHA-256 を確かめています…");
  try {
    const entries = await Promise.all(Object.entries(FILES).map(async ([key, path]) => [key, await fetchBytes(path)]));
    const raw = Object.fromEntries(entries);
    const hashes = {};
    for (const [key, path] of Object.entries(HASHED)) hashes[path] = await sha256Hex(raw[key].buffer);
    const files = {
      record: parseJson(FILES.record, raw.record.text),
      requests: parseJson(FILES.requests, raw.requests.text),
      expected: parseJson(FILES.expected, raw.expected.text),
      lock: parseJson(FILES.lock, raw.lock.text),
    };
    validate(files, hashes);
    if (!raw.request.text.trim()) fail("request.txt が空です。");

    state.record = files.record;
    state.recordSha = await sha256Hex(raw.record.buffer);
    state.request = raw.request.text;
    state.byId = new Map(files.record.results.map((item) => [item.id, item]));
    buildPicker(files.record.results);
    renderTally(files.record);
    renderRunFacts(files.record);

    const initial = idFromHash() || EXPECTED.defaultId;
    if (window.location.hash !== `#${initial}`) history.replaceState(null, "", `#${initial}`);
    state.ready = true;
    el.viewer.hidden = false;
    render(initial);
    setControls(true);
    setStatus("ready", "保存した記録を照合済み。いまの検索ではなく、実行したときの結果です。");
    checkBundle();
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
