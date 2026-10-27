// 八百万図AIツールボックス — OpenVoice 声色変換の作例ページ。MIT License, Copyright (c) 2026 Studio Yebisu.
// 制作時に保存した記録と WAV を読むだけのページ。ブラウザーで OpenVoice は動かさない。
// WAV は記録のバイト数・SHA-256 と照合したバイト列だけを Blob にし、再生と保存に使う。自動では再生しない。
// 記録の文字列は textContent で書き、HTML として解釈しない。
"use strict";

const RECORD = "outputs/voice-runs.json";
const REQUEST = "request.txt";
const PIN = Object.freeze({
  format: "studio-yebisu-openvoice-runs-v1",
  repository: "myshell-ai/OpenVoice",
  commit: "74a1d147b17a8c3092dd5430504bd83ef6c7eb23",
  license: "MIT",
  model: "myshell-ai/OpenVoiceV2",
  revision: "f36e7edfe1684461a8343844af60babc2efbb727",
  checks: 83,
  message: "SYEBISU!",
  sampleRate: 22050,
  binSamples: 2205,
});
const CASES = Object.freeze({
  V01: { source: "welcome", reference: "ichiro", output: "outputs/welcome-ichiro.wav" },
  V02: { source: "closing", reference: "ichiro", output: "outputs/closing-ichiro.wav" },
  V03: { source: "welcome", reference: "sayaka", output: "outputs/welcome-sayaka.wav" },
});
const VOICES = Object.freeze({
  welcome: { role: "source", path: "input/welcome.wav", label: "ようこそ案内" },
  closing: { role: "source", path: "input/closing.wav", label: "閉館案内" },
  ichiro: { role: "reference", path: "input/reference-ichiro.wav", label: "落ち着いた声" },
  sayaka: { role: "reference", path: "input/reference-sayaka.wav", label: "明るい声" },
});
// 7本の WAV の SHA-256（outputs/independent-checks.json と同じ値）。記録がこの値と一致しなければ使わない。
const WAV_SHA256 = Object.freeze({
  "input/welcome.wav": "8cd28d707ddc422bb09a8600e653611ef278bd20a148f792fc7833b49bca6f41",
  "input/closing.wav": "eeae9d454ac82fec6115c7449fb20606909c66867f0cfb41cc2f4caa1d9b6d31",
  "input/reference-ichiro.wav": "f174b3955c2fd5738fd1c4d03a0960ea08826dffbe39e825ab6e4f9dd3dd309b",
  "input/reference-sayaka.wav": "69615532abd471782d1221423bec1b44925cd1d6bd4bdcf75623d229be0b073c",
  "outputs/welcome-ichiro.wav": "a09b52043ce5927c8fda41655d2c0c449a00dfd190b8fa0d8cfa2b33841dc3e0",
  "outputs/closing-ichiro.wav": "4c65c734c183daf61bc992fdc94dd4d91a459b4d576bfada4e521547130d8bfd",
  "outputs/welcome-sayaka.wav": "c75498332de417428421f2706fd94e582a7d0e2930dbfbe8be0e0bf911ac9e78",
});
const DEFAULT_ID = "V01";
const ROLES = ["source", "reference", "output"];
const ROLE_NAME = { source: "元の音声", reference: "声色の見本", output: "変換後" };
const BAR_COLOR = { source: "#7772ce", ichiro: "#d48b56", sayaka: "#bd7e8d", output: "#609184" };
const BARS = { source: 42, reference: 42, output: 56 };
const NS = "http://www.w3.org/2000/svg";

const $ = (id) => document.getElementById(id);
const ui = {
  diagram: $("diagram"),
  chips: [$("choose-ichiro"), $("choose-sayaka")],
  caseNote: $("case-note"),
  sourceName: $("source-name"),
  referenceName: $("reference-name"),
  outputNote: $("output-note"),
  duration: $("duration"),
  status: $("status"),
  retry: $("retry"),
  stop: $("stop"),
  download: $("download"),
  player: $("player"),
  copy: $("copy"),
  copyStatus: $("copy-status"),
  fallback: $("fallback"),
  fallbackLabel: $("fallback-label"),
  textWelcome: $("text-welcome"),
  textClosing: $("text-closing"),
};
const node = Object.fromEntries(ROLES.map((role) => [role, {
  button: $(`play-${role}`),
  wave: $(`wave-${role}`),
  icon: $(`play-${role}`).querySelector(".play-icon"),
  clip: null,
}]));

// ページの状態。boot() と select() だけが記録と音声を差し替える。
const state = {
  results: null,
  assets: null,
  id: DEFAULT_ID,
  ready: false,
  loading: false,
  generation: 0,
  urls: null,
  playing: null,
  playToken: 0,
  request: null,
};
const verified = new Map(); // path → 照合済みの Blob URL
const pending = new Map();  // path → 照合中の Promise
let frame = 0;

class LoadError extends Error {}
const need = (ok, message) => { if (!ok) throw new LoadError(message); };
const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isString = (v) => typeof v === "string" && v.length > 0;
const isNumber = (v) => typeof v === "number" && Number.isFinite(v);
const HEX64 = /^[0-9a-f]{64}$/;
const leaf = (path) => path.split("/").pop();

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

async function sha256Hex(buffer) {
  need(window.crypto && window.crypto.subtle, "このブラウザーでは SHA-256 を計算できないため、音声を確かめられません。https か localhost で開いてください。");
  const digest = await window.crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

function checkAudio(audio, label) {
  need(isObject(audio) && HEX64.test(audio.file_sha256) && Number.isInteger(audio.file_bytes) && audio.file_bytes > 44,
    `${label}のファイルの記録が読めません。`);
  need(audio.format === "WAV" && audio.subtype === "PCM_16" && audio.sample_rate === PIN.sampleRate && audio.channels === 1,
    `${label}が 22050Hz・モノラル・PCM16 の WAV として記録されていません。`);
  need(Number.isInteger(audio.frames) && audio.frames > 0 && isNumber(audio.duration_seconds)
    && Math.abs(audio.duration_seconds - audio.frames / PIN.sampleRate) < 1e-5, `${label}の長さの記録が食い違っています。`);
  const w = audio.waveform;
  need(isObject(w) && w.bin_seconds === 0.1 && w.bin_samples === PIN.binSamples && Array.isArray(w.rms)
    && w.rms.length === Math.ceil(audio.frames / PIN.binSamples) && w.rms.every((v) => isNumber(v) && v >= 0 && v <= 1)
    && w.rms.some((v) => v > 0), `${label}の波形の記録が読めません。`);
}

function validate(record) {
  need(isObject(record) && record.format === PIN.format && record.status === "completed", "変換の記録の形式が違うか、完了していません。");
  const up = isObject(record.upstream) ? record.upstream : {};
  need(up.repository === PIN.repository && up.commit === PIN.commit && up.license === PIN.license, "記録の OpenVoice の固定版が一致しません。");
  const model = isObject(record.model) ? record.model : {};
  need(model.repository === PIN.model && model.revision === PIN.revision && model.version === "v2" && model.sampling_rate === PIN.sampleRate,
    "記録のモデルの固定リビジョンが一致しません。");
  const runtime = isObject(record.runtime) ? record.runtime : {};
  need(runtime.device === "cpu" && runtime.enable_watermark === true, "記録の実行条件が想定と違います。");
  need(Array.isArray(record.checks) && record.checks.length === PIN.checks && record.check_count === PIN.checks
    && record.checks_passed === PIN.checks && record.checks.every((c) => isObject(c) && isString(c.name) && c.passed === true),
  "記録の確認がすべて通った記録になっていません。");
  const summary = isObject(record.summary) ? record.summary : {};
  need(summary.conversions === 3 && summary.sources === 2 && summary.references === 2, "記録の件数が想定と違います。");
  need(isObject(record.verification) && record.verification.human_approval === false, "記録の確認の範囲が読めません。");

  need(Array.isArray(record.assets) && record.assets.length === Object.keys(VOICES).length, "記録の入力が4本ではありません。");
  const assets = new Map();
  for (const [id, voice] of Object.entries(VOICES)) {
    const a = record.assets.find((x) => isObject(x) && x.id === id);
    need(a && a.role === voice.role && a.path === voice.path && a.synthetic === true && isString(a.text) && isString(a.voice_name),
      `入力「${voice.label}」の記録が想定と違います。`);
    checkAudio(a.audio, `入力「${voice.label}」`);
    need(a.audio.file_sha256 === WAV_SHA256[a.path], `入力「${voice.label}」の SHA-256 が固定した値と一致しません。`);
    assets.set(id, a);
  }

  need(Array.isArray(record.results) && record.results.length === Object.keys(CASES).length, "記録が V01〜V03 の3件ではありません。");
  const results = new Map();
  for (const [id, plan] of Object.entries(CASES)) {
    const r = record.results.find((x) => isObject(x) && x.id === id);
    need(r && r.operation === "tone_color_conversion" && isObject(r.input)
      && r.input.source_id === plan.source && r.input.reference_id === plan.reference
      && r.input.source_path === VOICES[plan.source].path && r.input.reference_path === VOICES[plan.reference].path
      && r.input.source_text === assets.get(plan.source).text, `${id} の入力が想定と違います。`);
    need(isObject(r.output) && r.output.path === plan.output, `${id} の出力の場所が想定と違います。`);
    checkAudio(r.output, id);
    need(r.output.file_sha256 === WAV_SHA256[plan.output], `${id} の SHA-256 が固定した値と一致しません。`);
    const mark = r.output.watermark_detection;
    need(isObject(mark) && mark.matches === true && mark.decoded_message === PIN.message, `${id} の透かしの記録が想定と違います。`);
    results.set(id, r);
  }
  return { assets, results };
}

// 照合したバイト列だけを Blob URL にする。失敗したものは覚えないので、再試行で取り直す。
function verifiedUrl(path, sha256, bytes) {
  if (verified.has(path)) return Promise.resolve(verified.get(path));
  if (pending.has(path)) return pending.get(path);
  const job = (async () => {
    const response = await fetchOk(path);
    const buffer = await response.arrayBuffer();
    need(buffer.byteLength === bytes, `${leaf(path)} の大きさが記録と違います。`);
    const head = new Uint8Array(buffer, 0, 12);
    need(String.fromCharCode(...head.slice(0, 4)) === "RIFF" && String.fromCharCode(...head.slice(8, 12)) === "WAVE",
      `${leaf(path)} を WAV として読めません。`);
    need(await sha256Hex(buffer) === sha256, `${leaf(path)} の SHA-256 が記録と一致しません。`);
    const url = URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
    verified.set(path, url);
    return url;
  })();
  pending.set(path, job);
  job.then(() => pending.delete(path), () => pending.delete(path));
  return job;
}

// --- 表示 ----------------------------------------------------------------------------------

function svg(name, attributes = {}) {
  const el = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attributes)) el.setAttribute(key, String(value));
  return el;
}

function clearWave(role) {
  const box = node[role].wave.viewBox.baseVal;
  node[role].wave.replaceChildren(svg("line", { class: "wave-empty", x1: 2, x2: box.width - 2, y1: box.height / 2, y2: box.height / 2 }));
  node[role].clip = null;
}

// 0.1秒ごとの実測 RMS を、棒ごとに区間の最大値でまとめて描く。高さはその音声の最大値が基準。
function drawWave(role, rms, color) {
  const svgEl = node[role].wave;
  const box = svgEl.viewBox.baseVal;
  const n = BARS[role];
  const groups = Array.from({ length: n }, (_, i) => {
    const a = Math.floor((i * rms.length) / n);
    const b = Math.max(Math.floor(((i + 1) * rms.length) / n), a + 1);
    return Math.max(0, ...rms.slice(a, b));
  });
  const max = Math.max(1e-6, ...groups);
  const clipId = `clip-${role}`;
  const clipRect = svg("rect", { x: 0, y: -2, width: box.width, height: box.height + 4 });
  const defs = svg("defs");
  const clipPath = svg("clipPath", { id: clipId });
  clipPath.append(clipRect);
  defs.append(clipPath);
  const base = svg("g", { class: "bars-base", fill: color });
  const played = svg("g", { class: "bars-played", fill: color, "clip-path": `url(#${clipId})` });
  const step = box.width / n;
  groups.forEach((v, i) => {
    const h = 3 + (v / max) * (box.height - 8);
    const bar = { x: i * step + 1, y: (box.height - h) / 2, width: Math.max(1.5, step - 2.2), height: h, rx: 1.3 };
    base.append(svg("rect", bar));
    played.append(svg("rect", bar));
  });
  svgEl.replaceChildren(defs, base, played);
  node[role].clip = clipRect;
}

function setProgress(role, ratio) {
  const clip = node[role].clip;
  if (!clip) return;
  const width = node[role].wave.viewBox.baseVal.width;
  clip.setAttribute("width", String(Math.max(0, Math.min(1, ratio)) * width));
}

function setStatus(kind, message) {
  ui.status.dataset.state = kind;
  ui.status.textContent = message;
}

function setDownload(url, filename) {
  if (url) {
    ui.download.href = url;
    ui.download.download = filename;
    ui.download.removeAttribute("aria-disabled");
  } else {
    ui.download.removeAttribute("href");
    ui.download.removeAttribute("download");
    ui.download.setAttribute("aria-disabled", "true");
  }
}

function info(id, role) {
  const r = state.results.get(id);
  if (role === "output") return { path: r.output.path, audio: r.output };
  const asset = state.assets.get(role === "source" ? r.input.source_id : r.input.reference_id);
  return { path: asset.path, audio: asset.audio };
}

// 選んだ組み合わせの名前・色・チップを、音声の照合より先に描く。
function paintCase(id) {
  const plan = CASES[id];
  const source = VOICES[plan.source].label;
  const reference = VOICES[plan.reference].label;
  ui.diagram.dataset.tone = plan.reference;
  ui.sourceName.textContent = source;
  ui.referenceName.textContent = reference;
  ui.outputNote.textContent = `${source} × ${reference} の声色`;
  node.source.button.setAttribute("aria-label", `元の音声（${source}）を再生`);
  node.reference.button.setAttribute("aria-label", `声色の見本（${reference}）を再生`);
  node.output.button.setAttribute("aria-label", `変換後（${source} × ${reference} の声色）を再生`);
  for (const chip of ui.chips) chip.setAttribute("aria-pressed", String(chip.dataset.case === id));
  ui.caseNote.hidden = id !== "V02";
  ui.duration.textContent = "";
}

function lockPlayback() {
  state.ready = false;
  state.urls = null;
  for (const role of ROLES) {
    node[role].button.disabled = true;
    clearWave(role);
  }
  setDownload("", "");
  ui.retry.hidden = true;
}

// --- 再生 ----------------------------------------------------------------------------------

function stopAudio() {
  state.playToken += 1;
  const player = ui.player;
  if (!player.paused) player.pause();
  if (player.getAttribute("src")) {
    player.removeAttribute("src");
    player.load();
  }
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
  if (state.playing) setProgress(state.playing, 1);
  state.playing = null;
  ui.diagram.dataset.playing = "none";
  for (const role of ROLES) {
    node[role].button.setAttribute("aria-pressed", "false");
    node[role].icon.textContent = "▶";
  }
  ui.stop.disabled = true;
}

function tick() {
  frame = 0;
  const role = state.playing;
  if (!role) return;
  const duration = info(state.id, role).audio.duration_seconds;
  setProgress(role, (ui.player.currentTime || 0) / duration);
  frame = requestAnimationFrame(tick);
}

// クリックの処理の中で、照合済みの Blob URL をそのまま再生する（iPhone の Safari の操作条件のため）。
function play(role) {
  if (!state.ready || !state.urls) return;
  if (state.playing === role) {
    stopAudio();
    setStatus("ready", "▶ を押すと聞けます。");
    return;
  }
  stopAudio();
  const token = state.playToken;
  state.playing = role;
  ui.player.src = state.urls[role];
  ui.diagram.dataset.playing = role;
  node[role].button.setAttribute("aria-pressed", "true");
  node[role].icon.textContent = "Ⅱ";
  ui.stop.disabled = false;
  setProgress(role, 0);
  setStatus("playing", `${ROLE_NAME[role]}を再生中`);
  const attempt = ui.player.play();
  if (attempt && typeof attempt.catch === "function") {
    attempt.catch((error) => {
      if (token !== state.playToken || (error && error.name === "AbortError")) return;
      stopAudio();
      setStatus("error", "再生できませんでした。もう一度押すか、WAVを保存して聞いてください。");
    });
  }
  frame = requestAnimationFrame(tick);
}

ui.player.addEventListener("ended", () => {
  stopAudio();
  if (state.ready) setStatus("ready", "▶ を押すと聞けます。");
});
ui.player.addEventListener("error", () => {
  if (!state.playing) return;
  stopAudio();
  setStatus("error", "このブラウザーでは再生できませんでした。WAVを保存して聞いてください。");
});

// --- 組み合わせの切り替え ------------------------------------------------------------------

async function select(id) {
  const generation = ++state.generation;
  stopAudio();
  state.id = id;
  lockPlayback();
  paintCase(id);
  if (!state.results) return;
  setStatus("loading", "音声を確かめています…");
  try {
    const infos = Object.fromEntries(ROLES.map((role) => [role, info(id, role)]));
    const urls = Object.fromEntries(await Promise.all(ROLES.map(async (role) => {
      const x = infos[role];
      return [role, await verifiedUrl(x.path, x.audio.file_sha256, x.audio.file_bytes)];
    })));
    if (generation !== state.generation) return;
    const reference = CASES[id].reference;
    drawWave("source", infos.source.audio.waveform.rms, BAR_COLOR.source);
    drawWave("reference", infos.reference.audio.waveform.rms, BAR_COLOR[reference]);
    drawWave("output", infos.output.audio.waveform.rms, BAR_COLOR.output);
    ui.duration.textContent = `${infos.output.audio.duration_seconds.toFixed(1)} 秒`;
    state.urls = urls;
    setDownload(urls.output, leaf(infos.output.path));
    for (const role of ROLES) node[role].button.disabled = false;
    state.ready = true;
    setStatus("ready", "▶ を押すと聞けます。");
  } catch (error) {
    if (generation !== state.generation) return;
    lockPlayback();
    setStatus("error", `${error instanceof LoadError ? error.message : "音声を確かめられませんでした。"} この音声は再生・保存に使いません。`);
    ui.retry.hidden = false;
  }
}

function idFromHash() {
  const id = location.hash.slice(1);
  return Object.prototype.hasOwnProperty.call(CASES, id) ? id : null;
}

for (const chip of ui.chips) {
  chip.addEventListener("click", () => {
    const id = chip.dataset.case;
    if (!state.results || (id === state.id && (state.ready || state.loading))) return;
    history.replaceState(null, "", `#${id}`);
    select(id);
  });
}
for (const role of ROLES) node[role].button.addEventListener("click", () => play(role));
ui.stop.addEventListener("click", () => {
  stopAudio();
  if (state.ready) setStatus("ready", "▶ を押すと聞けます。");
});
ui.download.addEventListener("click", (event) => {
  if (ui.download.getAttribute("aria-disabled") === "true") event.preventDefault();
});
window.addEventListener("hashchange", () => {
  const id = idFromHash();
  if (!id || !state.results || id === state.id) return;
  select(id);
  ui.diagram.scrollIntoView({ block: "nearest" });
});

// --- 依頼文のコピー ---------------------------------------------------------------------------

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
  state.generation += 1;
  stopAudio();
  lockPlayback();
  for (const chip of ui.chips) chip.disabled = true;
  state.id = idFromHash() || state.id;
  paintCase(state.id);
  setStatus("loading", "記録と音声を確かめています…");
  ui.retry.disabled = true;
  try {
    const response = await fetchOk(RECORD);
    let record;
    try {
      record = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(await response.arrayBuffer()));
    } catch {
      throw new LoadError(`${RECORD} を JSON として読めません。`);
    }
    const checked = validate(record);
    state.results = checked.results;
    state.assets = checked.assets;
    ui.textWelcome.textContent = checked.assets.get("welcome").text;
    ui.textClosing.textContent = checked.assets.get("closing").text;
    for (const chip of ui.chips) chip.disabled = false;
    state.loading = false;
    await select(state.id);
  } catch (error) {
    state.results = null;
    state.assets = null;
    lockPlayback();
    setStatus("error", `${error instanceof LoadError ? error.message : "記録を読み込めませんでした。"} 音声は再生・保存に使いません。`);
    ui.retry.hidden = false;
  } finally {
    state.loading = false;
    ui.retry.disabled = false;
  }
}

ui.retry.addEventListener("click", () => {
  if (state.results) select(state.id);
  else boot();
});

boot();
loadRequest();
