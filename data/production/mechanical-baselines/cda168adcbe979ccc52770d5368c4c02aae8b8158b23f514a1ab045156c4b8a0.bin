// 八百万図AIツールボックス — OpenVoice V2 作例ページ。MIT License, Copyright (c) 2026 Studio Yebisu.
// 保存した実行記録と WAV を読むだけのページ。ブラウザーで OpenVoice は動かさない。
// データはすべて textContent とテキストノードで書き、HTML として解釈しない。
// WAV は記録の SHA-256 と照合したバイト列だけを Blob にし、<audio> と保存に使う。自動では再生しない。
"use strict";

const EXPECTED = Object.freeze({
  format: "studio-yebisu-openvoice-runs-v1",
  upstream: {
    repository: "myshell-ai/OpenVoice",
    commit: "74a1d147b17a8c3092dd5430504bd83ef6c7eb23",
    version: "0.0.0 (setup.py), converter V2",
    license: "MIT",
  },
  model: {
    repository: "myshell-ai/OpenVoiceV2",
    revision: "f36e7edfe1684461a8343844af60babc2efbb727",
  },
  sha256: {
    "vendor-lock.json": "53a17e009e9b0ba6545515523790bafb6946f4691bd93e7f53b4001a95e29e76",
    "input/voice-requests.json": "faf4d83cd845d9e0253e8c6fb94bbd0c1d10d1db81b8023c9b09445454cfc9e6",
    "input/expected.json": "3878f6bb62e3ed6d718c361a307b1ddcfeb58aa1f1ddcf6d2095b5b25d271308",
  },
  vendorFiles: 23,
  modelFiles: ["converter/config.json", "converter/checkpoint.pth"],
  conversion: {
    device: "cpu",
    threads: 4,
    seed: 20261017,
    tau: 0.3,
    enable_watermark: true,
    message: "SYEBISU!",
    source_commit: "74a1d147b17a8c3092dd5430504bd83ef6c7eb23",
    model_revision: "f36e7edfe1684461a8343844af60babc2efbb727",
  },
  voices: ["welcome", "closing", "ichiro", "sayaka"],
  cases: {
    V01: { source: "welcome", reference: "ichiro", output: "outputs/welcome-ichiro.wav" },
    V02: { source: "closing", reference: "ichiro", output: "outputs/closing-ichiro.wav" },
    V03: { source: "welcome", reference: "sayaka", output: "outputs/welcome-sayaka.wav" },
  },
  defaultId: "V02",
  sampleRate: 22050,
  binSeconds: 0.1,
});
const IDS = Object.keys(EXPECTED.cases);
const FILES = {
  record: "outputs/voice-runs.json",
  requests: "input/voice-requests.json",
  expected: "input/expected.json",
  lock: "vendor-lock.json",
  modelLock: "model-lock.json",
  request: "request.txt",
};
const BUNDLE_ZIP = "outputs/audio-bundle.zip";
const SOURCE_LABEL = { welcome: "ようこそ案内", closing: "閉館案内" };
const TRACKS = ["output", "source", "reference"];
const SAME_CONTENT = new Set(["output", "source"]);

const $ = (id) => document.getElementById(id);
const el = {
  status: $("status"),
  statusText: $("status-text"),
  retry: $("retry"),
  select: $("sample-select"),
  viewer: $("viewer"),
  kicker: $("sample-kicker"),
  title: $("sample-title"),
  state: $("result-state"),
  script: $("script-text"),
  referenceText: $("reference-text"),
  facts: $("facts"),
  downloadRecord: $("download-record"),
  copy: $("copy-request"),
  actionStatus: $("action-status"),
  fallback: $("request-fallback"),
  fallbackLabel: $("request-fallback-label"),
  rawInput: $("raw-input"),
  rawOutput: $("raw-output"),
  runFacts: $("run-facts"),
  checksSummary: $("checks-summary"),
  checksList: $("checks-list"),
  bundleItem: $("bundle-item"),
};
const track = Object.fromEntries(TRACKS.map((kind) => [kind, {
  section: $(`${kind}-track`),
  voice: $(`${kind}-voice`),
  wave: $(`${kind}-wave`),
  play: $(`play-${kind}`),
  time: $(`${kind}-time`),
  audio: $(`${kind}-audio`),
  status: kind === "output" ? $("audio-status") : $(`${kind}-status`),
  retry: $(`${kind}-retry`),
  download: kind === "output" ? $("download-wav") : $(`download-${kind}`),
  switchButton: $(`switch-${kind}`),
  info: null,
  waveRefs: null,
}]));

// The one owner of page state. Only load(), clearResult() and render() change it.
const state = {
  ready: false,
  loading: false,
  generation: 0,
  record: null,
  requests: null,
  expected: null,
  request: "",
  byId: new Map(),
  assets: new Map(),
  voices: new Map(),
  currentId: "",
  active: "",
};
// Verified WAVs, keyed by public path: { status, url, promise }.
const media = new Map();

class LoadError extends Error {}
class MediaError extends Error {}

function fail(message) {
  throw new LoadError(message);
}
function need(condition, message) {
  if (!condition) fail(message);
}

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isString = (value) => typeof value === "string";
const isNumber = (value) => typeof value === "number" && Number.isFinite(value);
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const fileText = (value) => `${JSON.stringify(value, null, 2)}\n`;
const formatInt = (n) => Number(n).toLocaleString("ja-JP");
const bytesText = (n) => `${formatInt(n)} bytes`;
const secondsText = (s) => `${s.toFixed(2)}秒`;
const signedSeconds = (s) => `${s > 0 ? "+" : s < 0 ? "−" : "±"}${Math.abs(s).toFixed(3)}秒`;
const leafName = (path) => path.split("/").pop();
const shortVoice = (name) => name.replace(/^Microsoft\s+/, "").replace(/\s+Desktop$/, "");
const HEX64 = /^[0-9a-f]{64}$/;
const SAFE_WAV = /^(input|outputs)\/[a-z0-9-]+\.wav$/;

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

function clockText(seconds) {
  const safe = Math.max(0, seconds || 0);
  const minutes = Math.floor(safe / 60);
  const rest = safe - minutes * 60;
  return `${minutes}:${rest.toFixed(1).padStart(4, "0")}`;
}

async function sha256Hex(buffer) {
  if (!window.crypto || !window.crypto.subtle) {
    throw new LoadError("このブラウザーでは SHA-256 の照合（Web Crypto）が使えないため、記録を確かめられません。https または localhost で開いてください。");
  }
  const digest = await window.crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function fetchText(path) {
  let response;
  try {
    response = await fetch(path, { cache: "no-store" });
  } catch (error) {
    fail(`${path} を取得できませんでした。ローカルで開くときは HTTP サーバー経由で開いてください。`);
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

function validateAudio(audio, label, expected, isOutput) {
  need(isObject(audio), `${label} の音声の記録がありません。`);
  need(HEX64.test(audio.file_sha256) && HEX64.test(audio.pcm_sha256), `${label} の SHA-256 が読めません。`);
  need(Number.isInteger(audio.file_bytes) && audio.file_bytes > 44, `${label} のバイト数が読めません。`);
  need(audio.format === "WAV" && audio.subtype === "PCM_16" && audio.sample_rate === expected.sample_rate
    && audio.channels === expected.channels, `${label} が 22050Hz・モノラル・PCM16 の WAV ではありません。`);
  need(Number.isInteger(audio.frames) && audio.frames > 0 && audio.frames === audio.header_frames
    && isNumber(audio.duration_seconds) && Math.abs(audio.duration_seconds - audio.frames / audio.sample_rate) < 1e-5,
  `${label} の長さが記録の中で食い違っています。`);
  need(audio.all_finite === true && Number.isInteger(audio.max_abs_pcm) && audio.max_abs_pcm > 0
    && (!isOutput || audio.max_abs_pcm <= expected.max_abs_pcm) && Number.isInteger(audio.clipped_samples) && isNumber(audio.rms),
  `${label} の振幅の記録が読めません。`);
  const wave = audio.waveform;
  need(isObject(wave) && wave.bin_seconds === EXPECTED.binSeconds && Number.isInteger(wave.bin_samples) && wave.bin_samples > 0
    && Array.isArray(wave.rms) && wave.rms.length === Math.ceil(audio.frames / wave.bin_samples)
    && wave.rms.every((v) => isNumber(v) && v >= 0 && v <= 1), `${label} の波形の記録が読めません。`);
}

function validate(files, hashes) {
  const { record, requests, expected, lock, modelLock } = files;

  for (const [path, pinned] of Object.entries(EXPECTED.sha256)) {
    need(hashes[path] === pinned, `${path} の SHA-256 が、実行前に固定した値と一致しません。`);
  }
  need(isObject(lock) && lock.repository === EXPECTED.upstream.repository && lock.commit === EXPECTED.upstream.commit
    && isObject(lock.files) && Object.keys(lock.files).length === EXPECTED.vendorFiles, "vendor-lock.json の固定版が一致しません。");

  // 入力（実行前に固定）
  need(isObject(requests) && requests.synthetic_only === true && deepEqual(requests.conversion, EXPECTED.conversion),
    "input/voice-requests.json の設定が想定と違います。");
  need(Array.isArray(requests.voices) && deepEqual(requests.voices.map((v) => v && v.id), EXPECTED.voices)
    && requests.voices.every((v) => SAFE_WAV.test(v.file) && v.file.startsWith("input/") && isString(v.text) && isString(v.voice_name)),
  "input/voice-requests.json の声が想定と違います。");
  need(Array.isArray(requests.cases) && deepEqual(requests.cases.map((c) => c && c.id), IDS)
    && requests.cases.every((c) => c.source_id === EXPECTED.cases[c.id].source && c.reference_id === EXPECTED.cases[c.id].reference
      && c.output === EXPECTED.cases[c.id].output && isString(c.label)), "input/voice-requests.json の3件が想定と違います。");
  need(isObject(expected) && deepEqual(expected.ids, IDS) && expected.conversion_count === 3 && expected.source_count === 2
    && expected.reference_count === 2 && expected.sample_rate === EXPECTED.sampleRate && expected.channels === 1
    && isNumber(expected.max_duration_delta_seconds) && isNumber(expected.min_duration_seconds)
    && isNumber(expected.max_duration_seconds) && Number.isInteger(expected.max_abs_pcm), "input/expected.json の形が違います。");
  const voices = new Map(requests.voices.map((v) => [v.id, v]));

  // 記録
  need(isObject(record) && record.format === EXPECTED.format && record.status === "completed", "実行記録の形式が違うか、完了していません。");
  const upstream = isObject(record.upstream) ? record.upstream : {};
  need(Object.keys(EXPECTED.upstream).every((key) => upstream[key] === EXPECTED.upstream[key]), "実行記録の OpenVoice の固定版が一致しません。");
  need(upstream.vendor_lock_sha256 === EXPECTED.sha256["vendor-lock.json"] && upstream.vendor_files_verified === EXPECTED.vendorFiles,
    "実行記録の vendor-lock.json の照合が一致しません。");
  const model = isObject(record.model) ? record.model : {};
  need(model.repository === EXPECTED.model.repository && model.revision === EXPECTED.model.revision && model.version === "v2"
    && model.sampling_rate === EXPECTED.sampleRate, "実行記録のモデルの固定リビジョンが一致しません。");
  need(isObject(modelLock) && modelLock.repository === EXPECTED.model.repository && modelLock.revision === EXPECTED.model.revision
    && isObject(modelLock.files) && isObject(model.files)
    && EXPECTED.modelFiles.every((name) => isObject(modelLock.files[name]) && isObject(model.files[name])
      && HEX64.test(modelLock.files[name].sha256) && modelLock.files[name].sha256 === model.files[name].sha256
      && modelLock.files[name].bytes === model.files[name].bytes),
  "model-lock.json と実行記録のモデルのハッシュが一致しません。");
  need(isObject(record.input_sha256) && deepEqual(record.input_sha256, { ...EXPECTED.sha256, "model-lock.json": hashes["model-lock.json"] }),
    "実行記録にある入力とロックの SHA-256 が一致しません。");
  const runtime = isObject(record.runtime) ? record.runtime : {};
  need(runtime.device === "cpu" && runtime.threads === EXPECTED.conversion.threads && runtime.seed === EXPECTED.conversion.seed
    && runtime.tau === EXPECTED.conversion.tau && runtime.enable_watermark === true, "実行記録の実行条件が一致しません。");
  need(isString(runtime.python) && isObject(runtime.packages) && isString(runtime.packages.torch)
    && Number.isInteger(model.parameters) && isObject(record.timing)
    && isNumber(record.timing.load_seconds) && isNumber(record.timing.total_seconds), "実行記録の実行環境と時間が読めません。");

  // 4本の入力
  need(Array.isArray(record.assets) && deepEqual(record.assets.map((a) => a && a.id), EXPECTED.voices), "実行記録の入力が4本ではありません。");
  for (const asset of record.assets) {
    const source = voices.get(asset.id);
    need(asset.role === source.role && asset.voice_name === source.voice_name && asset.text === source.text
      && asset.path === source.file && asset.synthetic === true, `入力 ${asset.id} が input/voice-requests.json と一致しません。`);
    validateAudio(asset.audio, `入力 ${asset.id}`, expected, false);
    need(isObject(asset.embedding) && asset.embedding.dims === 256 && asset.embedding.all_finite === true,
      `入力 ${asset.id} の声色の埋め込みが256次元の有限値ではありません。`);
  }
  const assets = new Map(record.assets.map((a) => [a.id, a]));

  // 3件の変換
  need(Array.isArray(record.results) && deepEqual(record.results.map((r) => r && r.id), IDS), "実行記録が V01〜V03 の3件ではありません。");
  for (const result of record.results) {
    const plan = requests.cases.find((c) => c.id === result.id);
    const source = voices.get(plan.source_id);
    const reference = voices.get(plan.reference_id);
    const input = isObject(result.input) ? result.input : {};
    need(result.label === plan.label && result.operation === "tone_color_conversion"
      && input.source_id === plan.source_id && input.reference_id === plan.reference_id
      && input.source_text === source.text && input.source_voice === source.voice_name
      && input.reference_voice === reference.voice_name && input.source_path === source.file
      && input.reference_path === reference.file && input.tau === EXPECTED.conversion.tau
      && input.seed === EXPECTED.conversion.seed, `${result.id} の入力が input/voice-requests.json と一致しません。`);
    const output = result.output;
    need(isObject(output) && output.path === plan.output && SAFE_WAV.test(output.path) && output.path.startsWith("outputs/"),
      `${result.id} の出力の場所が想定と違います。`);
    validateAudio(output, result.id, expected, true);
    const sourceAudio = assets.get(plan.source_id).audio;
    const delta = output.duration_seconds - sourceAudio.duration_seconds;
    need(isNumber(output.duration_delta_seconds) && Math.abs(output.duration_delta_seconds - delta) < 1e-5
      && Math.abs(delta) <= expected.max_duration_delta_seconds, `${result.id} の長さが元の音声と ${expected.max_duration_delta_seconds} 秒より大きく違います。`);
    need(output.duration_seconds >= expected.min_duration_seconds && output.duration_seconds <= expected.max_duration_seconds,
      `${result.id} の長さが想定の範囲外です。`);
    need(output.pcm_sha256 !== sourceAudio.pcm_sha256, `${result.id} の出力が元の音声と同じです。`);
  }
  const byId = new Map(record.results.map((r) => [r.id, r]));
  need(byId.get("V01").output.file_sha256 !== byId.get("V03").output.file_sha256, "V01 と V03 の出力が同じファイルです。");

  // まとめと確認
  const summary = record.summary;
  const sources = record.assets.filter((a) => a.role === "source").length;
  const references = record.assets.filter((a) => a.role === "reference").length;
  need(isObject(summary) && summary.conversions === record.results.length && summary.conversions === expected.conversion_count
    && summary.sources === sources && sources === expected.source_count
    && summary.references === references && references === expected.reference_count,
  "実行記録のまとめが、記録から数えた値と一致しません。");
  need(Array.isArray(record.checks) && record.checks.length > 0
    && record.checks.every((c) => isObject(c) && isString(c.name) && c.passed === true)
    && record.check_count === record.checks.length && record.checks_passed === record.checks.length,
  "実行記録の確認がすべて合格になっていません。");
  need(isObject(record.verification) && record.verification.human_approval === false, "実行記録の確認の範囲が読めません。");

  return { byId, assets, voices };
}

// --- 読み込み ------------------------------------------------------------------------------

function setStatus(kind, message) {
  el.status.dataset.state = kind;
  el.statusText.textContent = message;
  el.retry.hidden = kind !== "error";
}

function pauseAll() {
  for (const kind of TRACKS) {
    const audio = track[kind].audio;
    if (!audio.paused) audio.pause();
  }
}

function resetTrack(kind) {
  const t = track[kind];
  if (!t.audio.paused) t.audio.pause();
  if (t.audio.getAttribute("src")) {
    t.audio.removeAttribute("src");
    t.audio.load();
  }
  t.play.disabled = true;
  t.play.textContent = "再生";
  t.play.setAttribute("aria-label", "再生");
  t.retry.hidden = true;
  setDownload(t.download, "", "");
  t.switchButton.disabled = true;
  t.status.textContent = "";
  t.status.dataset.state = "idle";
}

function setDownload(anchor, url, filename) {
  if (url) {
    anchor.href = url;
    anchor.download = filename;
    anchor.removeAttribute("aria-disabled");
  } else {
    anchor.removeAttribute("href");
    anchor.removeAttribute("download");
    anchor.setAttribute("aria-disabled", "true");
  }
}

function revokeMedia() {
  for (const entry of media.values()) {
    if (entry.url) URL.revokeObjectURL(entry.url);
  }
  media.clear();
}

function clearResult() {
  state.ready = false;
  state.generation += 1;
  state.currentId = "";
  state.active = "";
  for (const kind of TRACKS) resetTrack(kind);
  revokeMedia();
  el.viewer.hidden = true;
  el.select.disabled = true;
  el.downloadRecord.disabled = true;
  el.copy.disabled = true;
  el.actionStatus.textContent = "";
  el.fallback.hidden = true;
  el.fallbackLabel.hidden = true;
}

async function load() {
  if (state.loading) return;
  state.loading = true;
  clearResult();
  el.retry.disabled = true;
  setStatus("loading", "保存した記録・入力・ロックを読み込み、固定版と SHA-256 を確かめています…");
  try {
    const raw = {};
    await Promise.all(Object.entries(FILES).map(async ([key, path]) => { raw[key] = await fetchText(path); }));
    const hashes = {};
    for (const key of ["requests", "expected", "lock", "modelLock"]) {
      hashes[FILES[key]] = await sha256Hex(raw[key].buffer);
    }
    const files = {
      record: parseJson(FILES.record, raw.record.text),
      requests: parseJson(FILES.requests, raw.requests.text),
      expected: parseJson(FILES.expected, raw.expected.text),
      lock: parseJson(FILES.lock, raw.lock.text),
      modelLock: parseJson(FILES.modelLock, raw.modelLock.text),
    };
    const checked = validate(files, hashes);
    need(raw.request.text.trim().length > 0, "request.txt が空です。");

    state.record = files.record;
    state.requests = files.requests;
    state.expected = files.expected;
    state.request = raw.request.text;
    state.byId = checked.byId;
    state.assets = checked.assets;
    state.voices = checked.voices;
    buildSelect();
    renderRunFacts();
    state.ready = true;
    el.select.disabled = false;
    el.downloadRecord.disabled = false;
    el.copy.disabled = false;
    setStatus("ready", "案内を選んで、変換後の声を再生できます。");
    render(caseFromHash() || EXPECTED.defaultId);
    checkBundle();
  } catch (error) {
    clearResult();
    const message = error instanceof LoadError ? error.message : "記録を読み込めませんでした。";
    setStatus("error", `${message} 結果は表示していません。「もう一度読み込む」で再試行できます。`);
    if (!(error instanceof LoadError)) console.error(error);
  } finally {
    state.loading = false;
    el.retry.disabled = false;
  }
}

async function checkBundle() {
  try {
    const response = await fetch(BUNDLE_ZIP, { method: "HEAD", cache: "no-store" });
    el.bundleItem.hidden = !response.ok;
  } catch (error) {
    el.bundleItem.hidden = true;
  }
}

// --- 表示 ----------------------------------------------------------------------------------

function caseLabel(result) {
  const source = SOURCE_LABEL[result.input.source_id] || result.input.source_id;
  return `${result.id}　${source} → ${shortVoice(result.input.reference_voice)} の声色`;
}

function buildSelect() {
  el.select.textContent = "";
  for (const id of IDS) {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = caseLabel(state.byId.get(id));
    el.select.append(option);
  }
}

function caseFromHash() {
  let id = "";
  try {
    id = decodeURIComponent(location.hash.slice(1));
  } catch (error) {
    return "";
  }
  return state.byId.has(id) ? id : "";
}

function addFact(list, term, value, className) {
  const row = document.createElement("div");
  row.className = "kv-row";
  const dt = document.createElement("dt");
  dt.textContent = term;
  const dd = document.createElement("dd");
  if (className) {
    const code = document.createElement("code");
    code.className = className;
    code.textContent = value;
    dd.append(code);
  } else {
    dd.textContent = value;
  }
  row.append(dt, dd);
  list.append(row);
}

function renderRunFacts() {
  const record = state.record;
  el.runFacts.textContent = "";
  addFact(el.runFacts, "実行環境", `CPU・${record.runtime.threads}スレッド・Python ${record.runtime.python}・torch ${record.runtime.packages.torch}・librosa ${record.runtime.packages.librosa}・numpy ${record.runtime.packages.numpy}`);
  addFact(el.runFacts, "変換器", `OpenVoice ${record.model.version}・${formatInt(record.model.sampling_rate)}Hz・パラメータ ${formatInt(record.model.parameters)} 個（重みと全テンソル一致を確認）`);
  addFact(el.runFacts, "重み（非公開）", record.model.files["converter/checkpoint.pth"].sha256, "hash");
  addFact(el.runFacts, "透かし", "原典の既定設定で付与。メッセージ SYEBISU!。圧縮や編集後の残存は未確認です。");
  addFact(el.runFacts, "時間（1回の実測）", `読み込み ${record.timing.load_seconds}秒・全体 ${record.timing.total_seconds}秒。速さの約束ではありません。`);
  el.checksSummary.textContent = `記録にある確認の一覧（${record.check_count}件・すべて合格）`;
  el.checksList.textContent = "";
  for (const check of record.checks) {
    const item = document.createElement("li");
    item.textContent = `合格　${check.name}`;
    el.checksList.append(item);
  }
}

function trackInfo(result, kind) {
  if (kind === "output") {
    return { path: result.output.path, audio: result.output, voice: result.input.reference_voice };
  }
  const asset = state.assets.get(kind === "source" ? result.input.source_id : result.input.reference_id);
  return { path: asset.path, audio: asset.audio, voice: asset.voice_name, text: asset.text };
}

function render(id) {
  if (!state.ready || !state.byId.has(id) || id === state.currentId) return;
  state.generation += 1;
  state.currentId = id;
  state.active = "";
  for (const kind of TRACKS) resetTrack(kind);
  const result = state.byId.get(id);
  el.select.value = id;
  el.viewer.hidden = false;

  const source = SOURCE_LABEL[result.input.source_id] || result.input.source_id;
  const refShort = shortVoice(result.input.reference_voice);
  el.kicker.textContent = `${id} ・ 元の案内声 → ${refShort}`;
  el.title.textContent = `${source}を、${refShort} の声色で`;
  el.state.textContent = `変換済み・${secondsText(result.output.duration_seconds)}・WAV`;
  el.script.textContent = result.input.source_text;

  const infos = Object.fromEntries(TRACKS.map((kind) => [kind, trackInfo(result, kind)]));
  const scale = Math.max(1e-6, ...TRACKS.flatMap((kind) => infos[kind].audio.waveform.rms));
  track.output.voice.textContent = `${shortVoice(result.input.source_voice)} の案内を、${refShort} の声色へ（AI で変換した合成音声）`;
  track.source.voice.textContent = `${result.input.source_voice}（Irodori-TTSの合成音声）`;
  track.reference.voice.textContent = `${result.input.reference_voice}（Irodori-TTSの合成音声）`;
  el.referenceText.textContent = infos.reference.text;
  for (const kind of TRACKS) {
    track[kind].info = infos[kind];
    track[kind].waveRefs = buildWave(track[kind].wave, infos[kind].audio, scale, kind);
    updatePlayhead(kind);
    attachTrack(kind);
  }

  renderFacts(result);
  const plan = state.requests.cases.find((c) => c.id === id);
  el.rawInput.textContent = fileText({
    case: plan,
    source: state.voices.get(plan.source_id),
    reference: state.voices.get(plan.reference_id),
    conversion: state.requests.conversion,
  });
  el.rawOutput.textContent = fileText(result);
  el.actionStatus.textContent = "";
}

function renderFacts(result) {
  const out = result.output;
  el.facts.textContent = "";
  addFact(el.facts, "組み合わせ", `${result.input.source_path} の声色を ${result.input.reference_path} へ`);
  addFact(el.facts, "設定", `tau ${result.input.tau}・seed ${result.input.seed}（変換の直前に設定）・CPU ${result.input.threads}スレッド・透かしなし`);
  addFact(el.facts, "長さ", `${secondsText(out.duration_seconds)}（${formatInt(out.frames)} サンプル）・元との差 ${signedSeconds(out.duration_delta_seconds)}`);
  addFact(el.facts, "形式", `${out.format}・${out.subtype}・${formatInt(out.sample_rate)}Hz・${out.channels}ch`);
  addFact(el.facts, "振幅", `最大 ${formatInt(out.max_abs_pcm)} / 32767・RMS ${out.rms_dbfs === null ? "—" : `${out.rms_dbfs} dBFS`}・上限に達したサンプル ${formatInt(out.clipped_samples)}`);
  addFact(el.facts, "ファイル", bytesText(out.file_bytes));
  addFact(el.facts, "SHA-256（ファイル）", out.file_sha256, "hash");
  addFact(el.facts, "SHA-256（PCM）", out.pcm_sha256, "hash");
  addFact(el.facts, "変換の時間", `${out.elapsed_seconds}秒（この1回の実測。速さの約束ではありません）`);
}

// --- 波形 ----------------------------------------------------------------------------------

const SVG_NS = "http://www.w3.org/2000/svg";
function svg(name, attributes) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  return node;
}

function buildWave(container, audio, scale, kind) {
  const bins = audio.waveform.rms;
  const n = bins.length;
  container.textContent = "";
  const root = svg("svg", { viewBox: `0 0 ${n} 100`, preserveAspectRatio: "none", class: "wave-svg", "aria-hidden": "true", focusable: "false" });
  const clipId = `wave-clip-${kind}`;
  const defs = svg("defs", {});
  const clipPath = svg("clipPath", { id: clipId });
  const clip = svg("rect", { x: 0, y: 0, width: 0, height: 100 });
  clipPath.append(clip);
  defs.append(clipPath);
  const base = svg("g", { class: "wave-base" });
  const played = svg("g", { class: "wave-played", "clip-path": `url(#${clipId})` });
  bins.forEach((value, i) => {
    const height = Math.max(2, (value / scale) * 94);
    const attributes = { x: i + 0.15, y: 50 - height / 2, width: 0.7, height };
    base.append(svg("rect", attributes));
    played.append(svg("rect", attributes));
  });
  const line = svg("line", { class: "wave-head", x1: 0, x2: 0, y1: 0, y2: 100, "vector-effect": "non-scaling-stroke" });
  root.append(defs, base, played, line);
  container.append(root);
  container.setAttribute("aria-label", `${container.getAttribute("aria-label").split("（")[0]}（${secondsText(audio.duration_seconds)}・0.1秒ごとの実測RMS）`);
  return { clip, line, n, duration: audio.duration_seconds };
}

function updatePlayhead(kind) {
  const t = track[kind];
  if (!t.waveRefs) return;
  const duration = t.waveRefs.duration;
  const current = Math.min(t.audio.currentTime || 0, duration);
  const x = duration > 0 ? (current / duration) * t.waveRefs.n : 0;
  t.waveRefs.clip.setAttribute("width", String(x));
  t.waveRefs.line.setAttribute("x1", String(x));
  t.waveRefs.line.setAttribute("x2", String(x));
  t.time.textContent = `${clockText(current)} / ${clockText(duration)}`;
}

let frame = 0;
function tick() {
  frame = 0;
  let playing = false;
  for (const kind of TRACKS) {
    updatePlayhead(kind);
    if (!track[kind].audio.paused) playing = true;
  }
  if (playing) frame = requestAnimationFrame(tick);
}
function startTicking() {
  if (!frame) frame = requestAnimationFrame(tick);
}

// --- 音声（照合してから使う） ---------------------------------------------------------------

function verifyMedia(path, sha256, bytes) {
  const cached = media.get(path);
  if (cached && cached.status !== "error") return cached.promise;
  const entry = { status: "loading", url: "", promise: null };
  entry.promise = (async () => {
    let response;
    try {
      response = await fetch(path, { cache: "no-store" });
    } catch (error) {
      throw new MediaError("音声ファイルを取得できませんでした。");
    }
    if (!response.ok) throw new MediaError(`音声ファイルを取得できませんでした（HTTP ${response.status}）。`);
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength !== bytes) throw new MediaError("音声ファイルの大きさが記録と違います。");
    const head = new TextDecoder("ascii").decode(new Uint8Array(buffer, 0, 12));
    if (head.slice(0, 4) !== "RIFF" || head.slice(8, 12) !== "WAVE") throw new MediaError("WAV ファイルとして読めません。");
    let actual;
    try {
      actual = await sha256Hex(buffer);
    } catch (error) {
      throw new MediaError("SHA-256 を計算できませんでした。");
    }
    if (actual !== sha256) throw new MediaError("音声ファイルの SHA-256 が記録と一致しません。");
    entry.url = URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
    entry.status = "ready";
    return entry;
  })();
  entry.promise.catch(() => {
    entry.status = "error";
  });
  media.set(path, entry);
  return entry.promise;
}

function setTrackStatus(kind, status, message) {
  track[kind].status.dataset.state = status;
  track[kind].status.textContent = message;
}

function attachTrack(kind) {
  const t = track[kind];
  const info = t.info;
  const generation = state.generation;
  setTrackStatus(kind, "loading", "音声を取得して、記録の SHA-256 と照合しています…");
  verifyMedia(info.path, info.audio.file_sha256, info.audio.file_bytes).then((entry) => {
    if (generation !== state.generation || t.info !== info) return;
    t.audio.src = entry.url;
    t.play.disabled = false;
    t.switchButton.disabled = false;
    t.retry.hidden = true;
    setDownload(t.download, entry.url, leafName(info.path));
    setTrackStatus(kind, "ready", `記録と同じ SHA-256 を確かめました（${info.path}・${bytesText(info.audio.file_bytes)}）。`);
  }).catch((error) => {
    if (generation !== state.generation || t.info !== info) return;
    const message = error instanceof MediaError ? error.message : "音声を確かめられませんでした。";
    setTrackStatus(kind, "error", `${message} この音声は再生・保存に使いません。「この音声をもう一度読み込む」で再試行できます。`);
    t.retry.hidden = false;
  });
}

function retryTrack(kind) {
  const t = track[kind];
  if (!state.ready || !t.info) return;
  const cached = media.get(t.info.path);
  if (cached && cached.status === "error") media.delete(t.info.path);
  t.retry.hidden = true;
  attachTrack(kind);
}

function setActive(kind) {
  state.active = kind;
  for (const other of TRACKS) {
    track[other].switchButton.setAttribute("aria-pressed", String(other === kind));
    track[other].section.dataset.active = String(other === kind);
  }
}

function togglePlay(kind) {
  const audio = track[kind].audio;
  if (!audio.getAttribute("src")) return;
  if (audio.paused) {
    startPlayback(kind);
  } else {
    audio.pause();
  }
}

function startPlayback(kind) {
  const audio = track[kind].audio;
  const promise = audio.play();
  if (promise && typeof promise.catch === "function") {
    promise.catch(() => setTrackStatus(kind, "error", "再生を始められませんでした。下の標準の再生ボタンか、保存した WAV で聞いてください。"));
  }
}

function switchTo(kind) {
  const target = track[kind].audio;
  if (!target.getAttribute("src")) return;
  const from = state.active;
  let position = 0;
  if (from && from !== kind && SAME_CONTENT.has(from) && SAME_CONTENT.has(kind)) {
    position = Math.min(track[from].audio.currentTime || 0, track[kind].info.audio.duration_seconds);
  } else if (from === kind) {
    position = target.currentTime || 0;
  }
  pauseAll();
  try {
    target.currentTime = position;
  } catch (error) {
    // メタデータ前に位置を変えられないブラウザーでは、はじめから再生する。
  }
  setActive(kind);
  startPlayback(kind);
}

for (const kind of TRACKS) {
  const t = track[kind];
  t.play.addEventListener("click", () => togglePlay(kind));
  t.switchButton.addEventListener("click", () => switchTo(kind));
  t.retry.addEventListener("click", () => retryTrack(kind));
  t.audio.addEventListener("play", () => {
    for (const other of TRACKS) {
      if (other !== kind && !track[other].audio.paused) track[other].audio.pause();
    }
    setActive(kind);
    t.play.textContent = "一時停止";
    t.play.setAttribute("aria-label", "一時停止");
    startTicking();
  });
  for (const type of ["pause", "ended", "emptied"]) {
    t.audio.addEventListener(type, () => {
      t.play.textContent = "再生";
      t.play.setAttribute("aria-label", "再生");
      updatePlayhead(kind);
    });
  }
  t.audio.addEventListener("timeupdate", () => updatePlayhead(kind));
  t.audio.addEventListener("seeked", () => updatePlayhead(kind));
  t.audio.addEventListener("error", () => {
    if (!t.audio.getAttribute("src")) return;
    setTrackStatus(kind, "error", "このブラウザーではこの WAV を再生できませんでした。照合済みの WAV は「保存」からそのまま使えます。");
  });
  t.download.addEventListener("click", (event) => {
    if (t.download.getAttribute("aria-disabled") === "true") event.preventDefault();
  });
}

// --- 保存とコピー ----------------------------------------------------------------------------

function saveBlob(text, filename, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

el.downloadRecord.addEventListener("click", () => {
  if (!state.ready || !state.currentId) return;
  saveBlob(fileText(state.byId.get(state.currentId)), `openvoice-${state.currentId}-record.json`, "application/json");
  el.actionStatus.textContent = `${state.currentId} の記録（JSON）をダウンロードに渡しました。`;
});

function showFallback() {
  el.fallback.value = state.request;
  el.fallback.hidden = false;
  el.fallbackLabel.hidden = false;
  el.fallback.focus();
  el.fallback.select();
  el.actionStatus.textContent = "";
}

function legacyCopy(text) {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.append(area);
  area.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch (error) {
    ok = false;
  }
  area.remove();
  return ok;
}

el.copy.addEventListener("click", () => {
  if (!state.ready) return;
  el.fallback.hidden = true;
  el.fallbackLabel.hidden = true;
  const done = () => {
    el.actionStatus.textContent = "依頼文をコピーしました。";
  };
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(state.request).then(done, showFallback);
  } else if (legacyCopy(state.request)) {
    done();
  } else {
    showFallback();
  }
});

// --- 選択と履歴 ------------------------------------------------------------------------------

el.select.addEventListener("change", () => {
  const id = el.select.value;
  if (!state.byId.has(id)) return;
  if (location.hash !== `#${id}`) {
    location.hash = id; // 履歴に残す。hashchange で表示する
  } else {
    render(id);
  }
});

window.addEventListener("hashchange", () => {
  const id = caseFromHash();
  if (id) render(id); // #about などの見出しへの移動では、選んだ件を変えない
});

el.retry.addEventListener("click", () => load());

load();
