// 八百万図AIツールボックス — 3D Asset Server 作例の実行CLI。MIT License, Copyright (c) 2026 Studio Yebisu.
//
//   node run.mjs --artifact-dir <このフォルダーの外の、まだ無いフォルダー>
//
// 固定版 arielshad/3d-asset-server f605df3（0.1.0・Apache-2.0）を、原典の build:server が出力した dist/ の JS のまま使う。
//   1. 原典・dist・three の115ファイル、ロック、入力2ファイルの SHA-256 を照合する
//   2. 照合の後でだけ、原典の AssetService・createHttpClient・polyhaven・fab・selectFiles・totalBytes・expandFiles・downloadFiles を読み込む
//   3. 実際の Poly Haven API に、識別できる User-Agent で、固定した8件の操作を順に行う。Fab は原典どおりリンクだけを返し、通信しない
//   4. 取得した5ファイルのバイト数・SHA-256・MD5・glTF の参照を確かめ、結果を得た後でだけ input/expected.json と照らし合わせる
//   5. 全確認が通ったときだけ outputs/ に1回書く。失敗したら非公開の証拠だけを残し、0以外で終わる
// fetch はレスポンスを複製して記録するだけで、内容も結果も変えない。全文の通信記録は --artifact-dir にだけ置く。

import { createHash } from "node:crypto";
import {
  constants as fsConstants,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, posix, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SITE = dirname(fileURLToPath(import.meta.url));
const VENDOR = join(SITE, "vendor", "3d-asset-server");
const RECORD_REL = "outputs/asset-runs.json";
const API_INFO_REL = "outputs/api-info.json";
const API_FILES_REL = "outputs/api-files.json";
const ASSETS_REL = "outputs/assets";
const RECORD_FORMAT = "studio-yebisu-3d-asset-runs-v1";
const INPUT_FORMAT = "studio-yebisu-3d-asset-input-v1";

const UPSTREAM = Object.freeze({
  repository: "arielshad/3d-asset-server",
  commit: "f605df3425011bae55ade114c9e7b276f5b1297b",
  version: "0.1.0",
  license: "Apache-2.0",
});
const THREE = Object.freeze({
  version: "0.180.0",
  license: "MIT",
  archive_sha256: "ad66d724565ee29a2467277fa84daa5ed0211d6b8d446e9ef29f6bae0cd14144",
});
// Frozen by the production step before execution (runtime/frozen-inputs.json). Copied here; that file is not read at runtime.
const PINNED_SHA256 = Object.freeze({
  "input/asset-requests.json": "cced85c1dc314fb7c516bac22c3c8f23fe6caf95df6c4a854acbc0e1cd7bc019",
  "input/expected.json": "92f1ee4e97b19fc26a93fe05d4c4feb91d16ef73fd0c3d61e78c62d5d5dee9ef",
  "vendor-lock.json": "67f280672c4268d5a06b401e9e91b2c3010968c1e78211b29724b132b9266973",
});
const LOCK_FILE_COUNT = 115;
const USER_AGENT = "Studio-Yebisu-3D-example/1.0 (+https://studio-yebisu.github.io/yaoyorozu-ai-toolbox/)";
const PROVIDER_IDS = Object.freeze(["polyhaven", "fab"]);
const POLYHAVEN_API = "https://api.polyhaven.com/";
const CASE_PLAN = Object.freeze({
  A01: "search",
  A02: "details",
  A03: "select",
  A04: "budget",
  A05: "invalid-id",
  A06: "unknown-provider",
  A07: "search",
  A08: "download",
});
// The only original modules this runner imports (all inside the hash-checked dist/).
const MODULES = Object.freeze({
  service: "dist/core/service.js",
  http: "dist/core/http.js",
  download: "dist/core/download.js",
  polyhaven: "dist/providers/polyhaven.js",
  linked: "dist/providers/linked.js",
});
// npm packages those modules import; their installed versions must equal the original package-lock.json.
const RUNTIME_DEPENDENCIES = Object.freeze(["lru-cache", "fflate"]);
// Settings the original code reads from the environment. A value here would change the original defaults.
const ORIGINAL_ENV = Object.freeze([
  "ASSET_SERVER_CACHE_TTL_MS",
  "ASSET_SERVER_HTTP_TIMEOUT_MS",
  "ASSET_SERVER_PROVIDER_TIMEOUT_MS",
  "ASSET_SERVER_MAX_DOWNLOAD_BYTES",
]);
// glTF extensions three's GLTFLoader cannot read without a separate decoder (not shipped with this example).
const NEEDS_DECODER = Object.freeze(["KHR_draco_mesh_compression", "KHR_texture_basisu", "EXT_meshopt_compression"]);
const COMPONENT_BYTES = Object.freeze({ 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 });
const TYPE_COMPONENTS = Object.freeze({ SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 });

class Refusal extends Error {}

function refuse(message) {
  throw new Refusal(message);
}

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const md5 = (bytes) => createHash("md5").update(bytes).digest("hex");
// The bytes of every saved JSON file: pretty JSON with a final newline.
const fileText = (value) => `${JSON.stringify(value, null, 2)}\n`;
const clone = (value) => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (Array.isArray(a)) {
    return Array.isArray(b) && a.length === b.length && a.every((item, index) => deepEqual(item, b[index]));
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length
      && keys.every((key) => Object.hasOwn(b, key) && deepEqual(a[key], b[key]));
  }
  return false;
}

function within(root, target) {
  const rel = relative(root, target);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

const sitePath = (rel) => join(SITE, ...rel.split("/"));

function describeError(error) {
  if (!(error instanceof Error)) return { name: typeof error, message: String(error) };
  const out = { name: error.name, message: error.message };
  for (const [key, value] of Object.entries(error)) {
    if (key === "stack") continue;
    try {
      out[key] = clone(value);
    } catch {
      out[key] = String(value);
    }
  }
  if (error.cause !== undefined) out.cause = describeError(error.cause);
  return out;
}

// --- 引数と出力先 ----------------------------------------------------------------------------

function parseArgs(argv) {
  if (argv.length !== 2 || argv[0] !== "--artifact-dir" || !argv[1] || argv[1].startsWith("--")) {
    refuse("Usage: node run.mjs --artifact-dir <new folder outside this site>");
  }
  return resolve(argv[1]);
}

function checkRuntime() {
  const major = Number(process.versions.node.split(".")[0]);
  if (!(major >= 24)) refuse(`Node 24 or newer is required (this is ${process.versions.node}).`);
  const set = ORIGINAL_ENV.filter((name) => process.env[name] !== undefined);
  if (set.length) refuse(`Unset ${set.join(", ")} so the original defaults apply.`);
  if (process.env.ASSET_SERVER_USER_AGENT !== undefined && process.env.ASSET_SERVER_USER_AGENT !== USER_AGENT) {
    refuse("ASSET_SERVER_USER_AGENT is set to another value. Unset it; this runner sets its own distinctive User-Agent.");
  }
}

function publicTargets() {
  return [RECORD_REL, API_INFO_REL, API_FILES_REL, `${ASSETS_REL}/polyhaven-wooden_crate_01`];
}

function checkOutputsAbsent() {
  for (const rel of publicTargets()) {
    if (existsSync(sitePath(rel))) {
      refuse(`${rel} already exists. Nothing is overwritten; run in a disposable copy after renaming the existing outputs.`);
    }
  }
}

function prepareArtifactDir(target) {
  const siteReal = realpathSync(SITE);
  if (existsSync(target)) refuse("The artifact dir already exists. Give a new folder; nothing is reused or overwritten.");
  for (const site of [SITE, siteReal]) {
    if (within(site, target) || within(target, site)) {
      refuse("The artifact dir must be outside this site, and must not contain it.");
    }
  }
  mkdirSync(target, { recursive: true });
  const root = realpathSync(target);
  if (within(siteReal, root) || within(root, siteReal)) refuse("The artifact dir resolves inside this site.");
  if (readdirSync(root).length !== 0) refuse("The artifact dir is not empty.");
  const network = join(root, "network");
  const raw = join(root, "raw");
  mkdirSync(network);
  mkdirSync(raw);
  return { root, network, raw, download: join(root, "download"), budget: join(root, "budget-8k") };
}

// --- 原典と入力の照合 --------------------------------------------------------------------------

function readPinned(rel) {
  const bytes = readFileSync(sitePath(rel));
  const digest = sha256(bytes);
  if (digest !== PINNED_SHA256[rel]) refuse(`${rel} does not match the SHA-256 frozen before execution.`);
  return bytes;
}

function verifyLock(lockBytes) {
  const lock = JSON.parse(lockBytes.toString("utf8"));
  for (const key of Object.keys(UPSTREAM)) {
    if (lock[key] !== UPSTREAM[key]) refuse(`vendor-lock.json ${key} is not the pinned value.`);
  }
  if (!isPlainObject(lock.three)) refuse("vendor-lock.json has no three entry.");
  for (const key of Object.keys(THREE)) {
    if (lock.three[key] !== THREE[key]) refuse(`vendor-lock.json three.${key} is not the pinned value.`);
  }
  if (!Array.isArray(lock.files) || lock.files.length !== LOCK_FILE_COUNT) {
    refuse(`vendor-lock.json must list ${LOCK_FILE_COUNT} files.`);
  }
  const seen = new Set();
  const kinds = {};
  for (const entry of lock.files) {
    if (!isPlainObject(entry) || typeof entry.path !== "string" || !entry.path.startsWith("vendor/")
      || entry.path.includes("..") || entry.path.includes("\\") || seen.has(entry.path)) {
      refuse("vendor-lock.json has an invalid or repeated path.");
    }
    seen.add(entry.path);
    const target = sitePath(entry.path);
    if (!within(SITE, target)) refuse(`${entry.path} is outside this site.`);
    const bytes = readFileSync(target);
    if (bytes.length !== entry.bytes || sha256(bytes) !== entry.sha256) {
      refuse(`${entry.path} does not match vendor-lock.json.`);
    }
    kinds[entry.kind] = (kinds[entry.kind] ?? 0) + 1;
  }
  for (const rel of Object.values(MODULES)) {
    if (!seen.has(`vendor/3d-asset-server/${rel}`)) refuse(`${rel} is not covered by vendor-lock.json.`);
  }
  const skill = lock.files.find((entry) => entry.path === "vendor/3d-asset-server/web/src/content/SKILL.md");
  const agents = lock.files.find((entry) => entry.path === "vendor/3d-asset-server/web/src/content/AGENTS.md");
  if (!skill || !agents) refuse("vendor-lock.json does not cover the original SKILL.md and AGENTS.md.");
  return { lock, kinds, skill, agents };
}

function verifyRuntimeDependencies() {
  const packageLock = JSON.parse(readFileSync(join(VENDOR, "package-lock.json"), "utf8"));
  return RUNTIME_DEPENDENCIES.map((name) => {
    const locked = packageLock.packages?.[`node_modules/${name}`];
    const installedPath = join(VENDOR, "node_modules", name, "package.json");
    if (!locked || !existsSync(installedPath)) {
      refuse(`${name} is not installed under vendor/3d-asset-server/node_modules. Run npm ci there first (see README.md).`);
    }
    const installed = JSON.parse(readFileSync(installedPath, "utf8"));
    if (installed.version !== locked.version) {
      refuse(`${name} ${installed.version} is installed, but the original package-lock.json pins ${locked.version}.`);
    }
    return { name, version: installed.version, locked_version: locked.version, integrity: locked.integrity, license: locked.license };
  });
}

function verifyInputs(requests, expected) {
  if (!isPlainObject(requests) || requests.format !== INPUT_FORMAT || !Array.isArray(requests.cases)) {
    refuse("input/asset-requests.json is not the expected format.");
  }
  if (requests.user_agent !== USER_AGENT) refuse("input/asset-requests.json names another User-Agent.");
  if (!deepEqual(requests.providers, PROVIDER_IDS)) refuse("input/asset-requests.json must enable exactly polyhaven and fab.");
  if (!Number.isInteger(requests.max_bytes) || requests.max_bytes <= 0) refuse("input/asset-requests.json max_bytes is invalid.");
  const ids = requests.cases.map((item) => item?.id);
  if (!deepEqual(ids, Object.keys(CASE_PLAN))) refuse("input/asset-requests.json must hold A01..A08 in order.");
  for (const item of requests.cases) {
    if (item.operation !== CASE_PLAN[item.id] || typeof item.label !== "string") {
      refuse(`${item.id} does not have the frozen operation ${CASE_PLAN[item.id]}.`);
    }
  }
  if (!isPlainObject(expected) || expected.cases !== requests.cases.length) refuse("input/expected.json is not for 8 cases.");
}

// --- 通信の記録（内容は変えない） ------------------------------------------------------------------

function headerValue(headers, name) {
  if (!headers) return null;
  if (typeof headers.get === "function") return headers.get(name);
  for (const [key, value] of Object.entries(headers)) if (key.toLowerCase() === name) return value;
  return null;
}

// Wraps Node's own fetch. Every call goes to the real network; the Response handed back is the one fetch
// returned, untouched. A clone of its body is read only to keep a private copy and its hashes.
function createCapture(networkDir) {
  const nativeFetch = globalThis.fetch;
  const entries = [];
  const bodies = new Map();
  let currentCase = null;

  async function capturingFetch(url, init = {}) {
    const entry = {
      seq: entries.length + 1,
      case: currentCase,
      method: init.method ?? "GET",
      url: String(url),
      user_agent: headerValue(init.headers, "user-agent"),
      accept: headerValue(init.headers, "accept"),
    };
    entries.push(entry);
    let response;
    try {
      response = await nativeFetch(url, init);
    } catch (error) {
      entry.error = describeError(error);
      throw error;
    }
    entry.status = response.status;
    entry.ok = response.ok;
    entry.final_url = response.url;
    entry.redirected = response.redirected;
    entry.content_type = response.headers.get("content-type");
    try {
      const body = Buffer.from(await response.clone().arrayBuffer());
      entry.bytes = body.length;
      entry.sha256 = sha256(body);
      entry.md5 = md5(body);
      entry.body_file = `network/${String(entry.seq).padStart(4, "0")}.body`;
      writeFileSync(join(networkDir, `${String(entry.seq).padStart(4, "0")}.body`), body, { flag: "wx" });
      bodies.set(entry.seq, body);
    } catch (error) {
      entry.body_error = describeError(error);
    }
    return response;
  }

  return {
    fetch: capturingFetch,
    entries,
    bodies,
    setCase(id) {
      currentCase = id;
    },
    writeIndex() {
      writeFileSync(join(networkDir, "index.json"), fileText(entries));
    },
  };
}

function summarizeRequests(list) {
  return {
    requests: list.length,
    calls: list.map((entry) => {
      const call = { url: entry.url, status: entry.status ?? null, bytes: entry.bytes ?? null, sha256: entry.sha256 ?? null, user_agent: entry.user_agent };
      if (entry.redirected) call.final_url = entry.final_url;
      if (entry.error) call.error = entry.error;
      return call;
    }),
  };
}

// --- glTF の中身を実ファイルから読む ----------------------------------------------------------------

function localTarget(baseDir, uri) {
  if (typeof uri !== "string" || uri === "" || /^[a-z][a-z0-9+.-]*:/i.test(uri) || uri.startsWith("/")) return null;
  let decoded;
  try {
    decoded = decodeURIComponent(uri);
  } catch {
    return null;
  }
  const joined = posix.normalize(posix.join(baseDir || ".", decoded));
  if (joined === ".." || joined.startsWith("../") || posix.isAbsolute(joined)) return null;
  return joined;
}

function readIndexMax(gltf, accessor, buffers) {
  const view = gltf.bufferViews?.[accessor.bufferView];
  const data = view ? buffers[view.buffer] : null;
  const size = COMPONENT_BYTES[accessor.componentType];
  if (!view || !data || accessor.type !== "SCALAR" || ![5121, 5123, 5125].includes(accessor.componentType)) return null;
  const stride = view.byteStride ?? size;
  const base = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let max = -1;
  for (let i = 0; i < accessor.count; i++) {
    const at = base + i * stride;
    const value = size === 1 ? dv.getUint8(at) : size === 2 ? dv.getUint16(at, true) : dv.getUint32(at, true);
    if (value > max) max = value;
  }
  return max;
}

function inspectGltf(manifest, readBytes) {
  const entry = manifest.find((file) => file.path.toLowerCase().endsWith(".gltf"));
  if (!entry) refuse("The downloaded selection has no .gltf file.");
  const gltf = JSON.parse(readBytes(entry.path).toString("utf8"));
  const baseDir = posix.dirname(entry.path) === "." ? "" : posix.dirname(entry.path);
  const byPath = new Map(manifest.map((file) => [file.path, file]));

  const buffers = (gltf.buffers ?? []).map((buffer, index) => {
    const path = localTarget(baseDir, buffer.uri);
    const file = path ? byPath.get(path) : undefined;
    return { index, uri: buffer.uri ?? null, path, byteLength: buffer.byteLength, file_bytes: file ? file.bytes : null, local: Boolean(file) };
  });
  const images = (gltf.images ?? []).map((image, index) => {
    const path = localTarget(baseDir, image.uri);
    const file = path ? byPath.get(path) : undefined;
    return { index, uri: image.uri ?? null, mimeType: image.mimeType ?? null, bufferView: image.bufferView ?? null, path, local: Boolean(file) };
  });
  const referenced = new Set([entry.path, ...buffers.filter((b) => b.local).map((b) => b.path), ...images.filter((i) => i.local).map((i) => i.path)]);
  const unreferenced = manifest.map((file) => file.path).filter((path) => !referenced.has(path));

  const bufferData = buffers.map((buffer) => (buffer.local ? readBytes(buffer.path) : null));
  const accessorProblems = [];
  (gltf.accessors ?? []).forEach((accessor, index) => {
    if (accessor.bufferView === undefined) return;
    const view = gltf.bufferViews?.[accessor.bufferView];
    const buffer = view ? buffers[view.buffer] : undefined;
    const element = (COMPONENT_BYTES[accessor.componentType] ?? 0) * (TYPE_COMPONENTS[accessor.type] ?? 0);
    if (!view || !buffer || !element) {
      accessorProblems.push(index);
      return;
    }
    const viewEnd = (view.byteOffset ?? 0) + view.byteLength;
    const stride = view.byteStride ?? element;
    const need = (accessor.byteOffset ?? 0) + Math.max(accessor.count - 1, 0) * stride + element;
    if (viewEnd > buffer.byteLength || need > view.byteLength) accessorProblems.push(index);
  });

  const meshes = (gltf.meshes ?? []).map((mesh, index) => {
    const primitives = (mesh.primitives ?? []).map((primitive) => {
      const mode = primitive.mode ?? 4;
      const position = gltf.accessors?.[primitive.attributes?.POSITION];
      const indices = primitive.indices !== undefined ? gltf.accessors?.[primitive.indices] : undefined;
      const count = indices ? indices.count : position?.count ?? 0;
      const triangles = mode === 4 ? count / 3 : mode === 5 || mode === 6 ? Math.max(count - 2, 0) : 0;
      return {
        mode,
        vertices: position?.count ?? null,
        indices: indices ? indices.count : null,
        triangles,
        max_index: indices ? readIndexMax(gltf, indices, bufferData) : null,
        material: primitive.material ?? null,
        position_min: position?.min ?? null,
        position_max: position?.max ?? null,
      };
    });
    return {
      index,
      name: mesh.name ?? null,
      primitives,
      triangles: primitives.reduce((sum, p) => sum + p.triangles, 0),
      vertices: primitives.reduce((sum, p) => sum + (p.vertices ?? 0), 0),
    };
  });

  // What the default scene actually draws: every node that points at a mesh, followed through children.
  const sceneIndex = gltf.scene ?? 0;
  const scene = { index: sceneIndex, mesh_instances: 0, primitive_instances: 0, triangles: 0, vertices: 0 };
  const visited = new Set();
  const walk = (nodeIndex) => {
    if (visited.has(nodeIndex)) return;
    visited.add(nodeIndex);
    const node = gltf.nodes?.[nodeIndex];
    if (!node) return;
    if (node.mesh !== undefined && meshes[node.mesh]) {
      const mesh = meshes[node.mesh];
      scene.mesh_instances += 1;
      scene.primitive_instances += mesh.primitives.length;
      scene.triangles += mesh.triangles;
      scene.vertices += mesh.vertices;
    }
    for (const child of node.children ?? []) walk(child);
  };
  for (const root of gltf.scenes?.[sceneIndex]?.nodes ?? []) walk(root);

  return {
    entry: entry.path,
    version: gltf.asset?.version ?? null,
    generator: gltf.asset?.generator ?? null,
    extensions_used: gltf.extensionsUsed ?? [],
    extensions_required: gltf.extensionsRequired ?? [],
    buffers,
    images,
    unreferenced_files: unreferenced,
    counts: {
      nodes: (gltf.nodes ?? []).length,
      meshes: meshes.length,
      primitives: meshes.reduce((sum, m) => sum + m.primitives.length, 0),
      materials: (gltf.materials ?? []).length,
      textures: (gltf.textures ?? []).length,
      images: images.length,
      accessors: (gltf.accessors ?? []).length,
      triangles: meshes.reduce((sum, m) => sum + m.triangles, 0),
      vertices: meshes.reduce((sum, m) => sum + m.vertices, 0),
    },
    meshes,
    scene,
    accessors_outside_buffers: accessorProblems,
  };
}

// Poly Haven's files endpoint lists every leaf with url / size / md5, including the companions under `include`.
function providerLeaves(filesJson) {
  const leaves = new Map();
  const walk = (value) => {
    if (!value || typeof value !== "object") return;
    if (typeof value.url === "string") leaves.set(value.url, { size: value.size ?? null, md5: value.md5 ?? null });
    for (const child of Object.values(value)) walk(child);
  };
  walk(filesJson);
  return leaves;
}

// --- 8件の操作 ------------------------------------------------------------------------------

// Results are pushed into the caller's array, so a refusal half-way still leaves the finished cases for failure.json.
async function runCases(ctx, results) {
  const { requests, capture, service, http, api, artifact } = ctx;
  const scratch = {};

  const begin = (item) => {
    capture.setCase(item.id);
    return capture.entries.length;
  };
  const finish = (item, start, output, error, observations) => {
    const result = { id: item.id, label: item.label, operation: item.operation, input: clone(item), output: clone(output) ?? null };
    if (error) result.error = error;
    result.observations = { ...observations, network: summarizeRequests(capture.entries.slice(start)) };
    results.push(result);
    return result;
  };

  for (const item of requests.cases) {
    const start = begin(item);
    let output = null;
    let error = null;
    const obs = {};
    try {
      if (item.operation === "search") {
        output = await service.search(clone(item.request));
        obs.result_ids = output.results.map((asset) => asset.id);
        obs.provider_status = Object.fromEntries(output.providers.map((report) => [report.provider, report.status]));
        obs.timing_note = "tookMs is the live time measured during this run; it changes on every run.";
      } else if (item.operation === "details") {
        const details = await service.getAsset(item.asset_id);
        output = details;
        if (details) {
          obs.license = details.license ?? null;
          obs.author = details.author ?? null;
          obs.formats = details.formats ?? [];
          obs.resolutions = details.resolutions ?? [];
          obs.poly_count = details.polyCount ?? null;
          obs.file_count = details.files.length;
          obs.gltf_resolutions = [...new Set(details.files.filter((f) => f.group === "gltf").map((f) => f.resolution))];
        }
      } else if (item.operation === "select") {
        const details = await service.getAsset(item.asset_id);
        const files = api.selectFiles(details, clone(item.selection));
        const total = api.totalBytes(files);
        const expanded = api.expandFiles(files);
        output = { selection: files, totalBytes: total ?? null, expanded };
        obs.main_files = files.length;
        obs.file_count = expanded.length;
        obs.sizes_known = expanded.every((f) => Number.isInteger(f.sizeBytes));
        obs.resolution = [...new Set(files.map((f) => f.resolution))];
        obs.max_bytes = requests.max_bytes;
        obs.within_budget = total !== undefined && total <= requests.max_bytes;
      } else if (item.operation === "budget") {
        const details = await service.getAsset(item.asset_id);
        const files = api.selectFiles(details, clone(item.selection));
        const total = api.totalBytes(files);
        const expanded = api.expandFiles(files);
        output = { selection_resolution: [...new Set(files.map((f) => f.resolution))], totalBytes: total ?? null, maxBytes: item.max_bytes, expanded };
        obs.budget_dir_existed_before = existsSync(artifact.budget);
        const beforeDownload = capture.entries.length;
        try {
          const unexpected = await api.downloadFiles(http, files, artifact.budget, { maxBytes: item.max_bytes });
          obs.unexpected_download = { files: unexpected.files.length, bytes: unexpected.bytes };
        } catch (thrown) {
          error = describeError(thrown);
        }
        obs.download_requests = capture.entries.length - beforeDownload;
        obs.budget_dir_created = existsSync(artifact.budget);
        obs.exceeds_by_bytes = total !== undefined ? total - item.max_bytes : null;
      } else if (item.operation === "invalid-id" || item.operation === "unknown-provider") {
        output = await service.getAsset(item.asset_id);
      } else if (item.operation === "download") {
        const details = await service.getAsset(item.asset_id);
        const files = api.selectFiles(details, clone(item.selection));
        const expanded = api.expandFiles(files);
        const folder = api.assetFolderName(details);
        const dest = join(artifact.download, folder);
        const beforeDownload = capture.entries.length;
        const result = await api.downloadFiles(http, files, dest, { maxBytes: item.max_bytes });
        writeFileSync(join(artifact.raw, "a08-download-result.json"), fileText(result), { flag: "wx" });
        const relFiles = result.files.map((file) => {
          if (!within(result.directory, file)) refuse("downloadFiles returned a path outside its directory.");
          return relative(result.directory, file).split(sep).join("/");
        });
        const downloadCalls = capture.entries.slice(beforeDownload);
        scratch.download = { details, files, expanded, folder, dest, result, relFiles, downloadCalls };
        output = { asset_id: details.id, folder, download: { files: relFiles, bytes: result.bytes } };
        obs.download_requests = downloadCalls.length;
      } else {
        refuse(`Unknown operation ${item.operation}.`);
      }
    } catch (thrown) {
      if (thrown instanceof Refusal) throw thrown;
      error = describeError(thrown);
    }
    finish(item, start, output, error, obs);
  }
  capture.setCase(null);
  return scratch;
}

// --- 取得したファイルを確かめる ---------------------------------------------------------------------

function buildDownloadEvidence(scratch, capture, providerName) {
  const { details, expanded, folder, dest, relFiles, result, downloadCalls } = scratch.download;
  const filesCapture = capture.entries.find((entry) => entry.ok && entry.url === `${POLYHAVEN_API}files/${encodeURIComponent(details.nativeId)}`);
  const infoCapture = capture.entries.find((entry) => entry.ok && entry.url === `${POLYHAVEN_API}info/${encodeURIComponent(details.nativeId)}`);
  if (!filesCapture || !infoCapture || !capture.bodies.has(filesCapture.seq) || !capture.bodies.has(infoCapture.seq)) {
    refuse("The Poly Haven info/files responses were not captured.");
  }
  const leaves = providerLeaves(JSON.parse(capture.bodies.get(filesCapture.seq).toString("utf8")));
  const readBytes = (path) => readFileSync(join(dest, ...path.split("/")));

  const manifest = expanded.map((item) => {
    const bytes = readBytes(item.path);
    const call = downloadCalls.find((entry) => entry.url === item.url);
    const leaf = leaves.get(item.url) ?? { size: null, md5: null };
    return {
      path: item.path,
      public_path: `${ASSETS_REL}/${folder}/${item.path}`,
      url: item.url,
      bytes: bytes.length,
      sha256: sha256(bytes),
      md5: md5(bytes),
      api_size: leaf.size,
      api_md5: leaf.md5,
      selection_size: item.sizeBytes ?? null,
      network: call ? { status: call.status, bytes: call.bytes ?? null, sha256: call.sha256 ?? null } : null,
    };
  });
  const gltf = inspectGltf(manifest, readBytes);
  const credit = `${details.title} by ${details.author} / ${providerName} / ${details.license?.name}`;
  const asset = {
    id: details.id,
    title: details.title,
    author: details.author ?? null,
    provider: providerName,
    license: details.license ?? null,
    source_url: details.url,
    poly_count_metadata: details.polyCount ?? null,
    credit,
  };
  const total = manifest.reduce((sum, file) => sum + file.bytes, 0);
  const lower = (path) => path.toLowerCase();
  const bundle = {
    format: "gltf",
    resolution: [...new Set(scratch.download.files.map((f) => f.resolution))],
    file_count: manifest.length,
    total_bytes: total,
    contents: {
      gltf: manifest.filter((f) => lower(f.path).endsWith(".gltf")).length,
      bin: manifest.filter((f) => lower(f.path).endsWith(".bin")).length,
      images: manifest.filter((f) => /\.(jpe?g|png|webp|avif|ktx2)$/.test(lower(f.path))).length,
    },
  };
  return {
    manifest,
    gltf,
    asset,
    bundle,
    relFiles,
    result,
    folder,
    dest,
    model_entry: `${ASSETS_REL}/${folder}/${gltf.entry}`,
    api: {
      info: { url: infoCapture.url, public_path: API_INFO_REL, bytes: infoCapture.bytes, sha256: infoCapture.sha256, body: capture.bodies.get(infoCapture.seq) },
      files: { url: filesCapture.url, public_path: API_FILES_REL, bytes: filesCapture.bytes, sha256: filesCapture.sha256, body: capture.bodies.get(filesCapture.seq) },
    },
  };
}

// --- 確認 ----------------------------------------------------------------------------------

function verify(ctx) {
  const { results, expected, requests, capture, evidence, userAgentInModule, lockInfo, dependencies, inputHashes } = ctx;
  const byId = Object.fromEntries(results.map((item) => [item.id, item]));
  const checks = [];
  const check = (name, test) => {
    let passed = false;
    try {
      passed = Boolean(test());
    } catch {
      passed = false;
    }
    checks.push({ name, passed });
  };
  const calls = (id) => byId[id]?.observations?.network?.requests;
  const a01 = byId.A01;
  const chosenId = expected.search_contains;
  const chosen = a01?.output?.results?.find((asset) => asset.id === chosenId);
  const a03 = byId.A03;
  const a04 = byId.A04;
  const a07 = byId.A07;
  const oneKUrls = new Set((a03?.output?.expanded ?? []).map((f) => f.url));
  const fileCalls = capture.entries.filter((entry) => !entry.url.startsWith(POLYHAVEN_API));
  const manifest = evidence?.manifest ?? [];
  const gltf = evidence?.gltf;

  check("node_24_or_newer", () => Number(process.versions.node.split(".")[0]) >= 24);
  check("input_and_lock_sha256_pinned", () => deepEqual(inputHashes, PINNED_SHA256));
  check(`vendor_files_sha256_${LOCK_FILE_COUNT}`, () => lockInfo.lock.files.length === LOCK_FILE_COUNT);
  check("runtime_dependencies_match_package_lock", () => dependencies.every((d) => d.version === d.locked_version));
  check("original_user_agent_is_distinctive", () => userAgentInModule === USER_AGENT
    && capture.entries.length > 0 && capture.entries.every((entry) => entry.user_agent === USER_AGENT));
  check("eight_frozen_cases_ran", () => results.length === expected.cases
    && deepEqual(results.map((r) => r.id), Object.keys(CASE_PLAN))
    && results.every((r, i) => deepEqual(r.input, requests.cases[i])));

  check("a01_search_contains_chosen_asset", () => Boolean(chosen) && a01.observations.result_ids.includes(chosenId));
  check("a01_provider_status_polyhaven_ok_fab_link", () => deepEqual(a01.observations.provider_status, expected.search_provider_status));
  check("a01_results_free_models_within_limit", () => a01.output.results.length > 0
    && a01.output.results.length <= a01.input.request.limit
    && a01.output.results.every((asset) => asset.type === "model" && asset.price?.free !== false));
  check("a01_chosen_licence_and_author", () => chosen.license?.name === expected.chosen_asset_license && chosen.author === expected.chosen_author);
  check("a01_fab_link_only_with_search_url", () => {
    const fab = a01.output.providers.find((report) => report.provider === "fab");
    return fab.status === "link" && fab.count === 0 && typeof fab.searchUrl === "string" && fab.searchUrl.startsWith("https://www.fab.com/search");
  });

  check("a02_details_licence_author_gltf", () => {
    const details = byId.A02.output;
    return !byId.A02.error && details.id === chosenId
      && details.license?.name === expected.chosen_asset_license && details.license.commercialUse === true
      && details.license.attributionRequired === false && details.author === expected.chosen_author
      && details.formats.includes("gltf") && details.files.some((f) => f.group === "gltf");
  });

  check("a03_one_k_bundle_has_expected_files", () => !a03.error && a03.output.expanded.length === expected.one_k_files
    && a03.observations.resolution.length === 1 && a03.observations.resolution[0] === a03.input.selection.resolution);
  check("a03_sizes_known_before_download", () => a03.observations.sizes_known && Number.isInteger(a03.output.totalBytes));
  check("a03_one_k_total_matches_expected", () => a03.output.totalBytes === expected.one_k_bytes
    && a03.output.expanded.reduce((sum, f) => sum + f.sizeBytes, 0) === expected.one_k_bytes);
  check("a03_no_file_requests", () => a03.observations.network.calls.every((call) => call.url.startsWith(POLYHAVEN_API)));

  check("a04_selection_exceeds_budget", () => expected.budget_should_reject
    && Number.isInteger(a04.output.totalBytes) && a04.output.totalBytes > a04.input.max_bytes);
  check("a04_original_size_limit_error", () => a04.error && a04.error.name === "Error"
    && /^Selection is .+, above the .+ limit\. Pick a lower resolution\.$/.test(a04.error.message));
  check("a04_no_download_request_or_directory", () => a04.observations.download_requests === 0
    && a04.observations.budget_dir_existed_before === false && a04.observations.budget_dir_created === false
    && !a04.observations.unexpected_download);

  check("a05_invalid_asset_id_error", () => byId.A05.error?.name === expected.invalid_id_error && calls("A05") === 0);
  check("a06_unknown_provider_error", () => byId.A06.error?.name === expected.unknown_provider_error
    && deepEqual(byId.A06.error.ids, ["not-a-provider"]) && calls("A06") === 0);
  check("a07_fab_skipped_not_error", () => {
    const reports = a07.output.providers;
    return !a07.error && a07.output.results.length === 0 && reports.length === 1
      && reports[0].provider === "fab" && reports[0].status === expected.direct_only_fab_status
      && reports[0].error === "no direct downloads" && calls("A07") === 0;
  });
  check("no_fab_requests", () => capture.entries.every((entry) => !/(^|\.)fab\.com$/i.test(new URL(entry.url).hostname)));
  check("api_requests_only_polyhaven", () => capture.entries.filter((entry) => entry.url.startsWith(POLYHAVEN_API)).length >= 3
    && capture.entries.every((entry) => entry.url.startsWith(POLYHAVEN_API) || oneKUrls.has(entry.url)));
  check("no_8k_download", () => expected.no_8k_download && fileCalls.every((entry) => entry.case === "A08" && oneKUrls.has(entry.url)));

  const a08 = byId.A08;
  check("a08_downloaded_expected_files", () => !a08.error && evidence.relFiles.length === expected.one_k_files
    && deepEqual([...evidence.relFiles].sort(), manifest.map((f) => f.path).sort())
    && deepEqual(manifest.map((f) => f.url).sort(), [...oneKUrls].sort()));
  check("a08_requests_are_exact_selection", () => a08.observations.download_requests === manifest.length
    && manifest.every((f) => f.network && f.network.status === 200));
  check("a08_bytes_match_expected", () => {
    const total = manifest.reduce((sum, f) => sum + f.bytes, 0);
    return total === expected.one_k_bytes && evidence.result.bytes === total && a03.output.totalBytes === total
      && expected.download_max_bytes === a08.input.max_bytes && total <= a08.input.max_bytes;
  });
  check("a08_sizes_match_provider_metadata", () => manifest.every((f) => f.bytes === f.api_size && f.bytes === f.selection_size));
  check("a08_md5_matches_provider_metadata", () => manifest.every((f) => typeof f.api_md5 === "string" && f.md5 === f.api_md5.toLowerCase()));
  check("a08_disk_matches_network_capture", () => manifest.every((f) => f.network.sha256 === f.sha256 && f.network.bytes === f.bytes));
  check("gltf_version_2_0", () => gltf.version === expected.gltf_version);
  check("gltf_local_references_complete", () => gltf.buffers.length > 0 && gltf.images.length > 0
    && gltf.buffers.every((b) => b.local) && gltf.images.every((i) => i.local) && gltf.unreferenced_files.length === 0);
  check("gltf_buffer_lengths_cover_byte_length", () => gltf.buffers.every((b) => b.file_bytes >= b.byteLength && b.file_bytes - b.byteLength < 4));
  check("gltf_accessors_within_buffers", () => gltf.accessors_outside_buffers.length === 0);
  check("gltf_indices_within_vertices", () => gltf.meshes.every((m) => m.primitives.every((p) => p.max_index === null || p.max_index < p.vertices)));
  check("gltf_meshes_and_triangles_counted", () => gltf.counts.meshes > 0 && gltf.scene.triangles > 0
    && Number.isInteger(gltf.scene.triangles) && Number.isInteger(gltf.counts.triangles));
  check("gltf_loadable_without_decoders", () => gltf.extensions_required.every((name) => !NEEDS_DECODER.includes(name)));
  check("source_credit_complete", () => evidence.asset.author === expected.chosen_author
    && evidence.asset.license?.name === expected.chosen_asset_license
    && evidence.asset.source_url === `https://polyhaven.com/a/${chosenId.split(":")[1]}`
    && evidence.asset.provider === "Poly Haven" && evidence.asset.credit.includes(evidence.asset.title));
  return checks;
}

// --- 書き出し（全確認が通ったときだけ、1回） ----------------------------------------------------------

function publish(record, evidence, artifact) {
  checkOutputsAbsent();
  mkdirSync(sitePath(ASSETS_REL), { recursive: true });
  const assetRoot = sitePath(`${ASSETS_REL}/${evidence.folder}`);
  mkdirSync(assetRoot); // fails if it appeared meanwhile; nothing is overwritten
  for (const file of evidence.manifest) {
    const target = join(assetRoot, ...file.path.split("/"));
    if (!within(assetRoot, target)) refuse(`Unsafe asset path ${file.path}.`);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(join(evidence.dest, ...file.path.split("/")), target, fsConstants.COPYFILE_EXCL);
    if (sha256(readFileSync(target)) !== file.sha256) refuse(`The public copy of ${file.path} differs from the download.`);
  }
  writeFileSync(sitePath(API_INFO_REL), evidence.api.info.body, { flag: "wx" });
  writeFileSync(sitePath(API_FILES_REL), evidence.api.files.body, { flag: "wx" });
  const text = fileText(record);
  writeFileSync(join(artifact.root, "asset-runs.json"), text, { flag: "wx" });
  writeFileSync(sitePath(RECORD_REL), text, { flag: "wx" });
  return sha256(Buffer.from(text, "utf8"));
}

// --- 本体 ----------------------------------------------------------------------------------

async function main() {
  const target = parseArgs(process.argv.slice(2));
  checkRuntime();
  checkOutputsAbsent();

  // Everything below happens before any network access or original import.
  const requestsBytes = readPinned("input/asset-requests.json");
  const expectedBytes = readPinned("input/expected.json");
  const lockBytes = readPinned("vendor-lock.json");
  const lockInfo = verifyLock(lockBytes);
  const dependencies = verifyRuntimeDependencies();
  const requests = JSON.parse(requestsBytes.toString("utf8"));
  const expected = JSON.parse(expectedBytes.toString("utf8"));
  verifyInputs(requests, expected);
  const artifact = prepareArtifactDir(target);

  // The original http.js reads its User-Agent from this variable when it is first imported.
  process.env.ASSET_SERVER_USER_AGENT = USER_AGENT;
  const load = (rel) => import(pathToFileURL(join(VENDOR, ...rel.split("/"))).href);
  const [serviceModule, httpModule, downloadModule, polyhavenModule, linkedModule] = await Promise.all([
    load(MODULES.service),
    load(MODULES.http),
    load(MODULES.download),
    load(MODULES.polyhaven),
    load(MODULES.linked),
  ]);

  const capture = createCapture(artifact.network);
  const http = httpModule.createHttpClient({ fetchImpl: capture.fetch });
  const service = new serviceModule.AssetService({ providers: [polyhavenModule.polyhaven, linkedModule.fab], http });
  const enabled = service.listProviders().map((p) => p.id);
  if (!deepEqual(enabled, PROVIDER_IDS)) refuse("The service did not register exactly polyhaven and fab.");
  const api = {
    selectFiles: downloadModule.selectFiles,
    totalBytes: downloadModule.totalBytes,
    expandFiles: downloadModule.expandFiles,
    downloadFiles: downloadModule.downloadFiles,
    assetFolderName: downloadModule.assetFolderName,
  };

  const results = [];
  let evidence = null;
  let checks = [];
  let stopped = null;
  try {
    const scratch = await runCases({ requests, capture, service, http, api, artifact }, results);
    if (scratch.download) {
      evidence = buildDownloadEvidence(scratch, capture, service.getProvider("polyhaven").name);
    }
    checks = verify({
      results,
      expected,
      requests,
      capture,
      evidence,
      userAgentInModule: httpModule.USER_AGENT,
      lockInfo,
      dependencies,
      inputHashes: {
        "input/asset-requests.json": sha256(requestsBytes),
        "input/expected.json": sha256(expectedBytes),
        "vendor-lock.json": sha256(lockBytes),
      },
    });
  } catch (error) {
    stopped = describeError(error);
  } finally {
    capture.writeIndex();
  }

  const passed = checks.filter((c) => c.passed).length;
  const a08 = results.find((r) => r.id === "A08");
  if (evidence && a08 && !a08.error) {
    a08.output = {
      ...a08.output,
      model_entry: evidence.model_entry,
      bundle: evidence.bundle,
      manifest: evidence.manifest,
      gltf: evidence.gltf,
      asset: evidence.asset,
    };
  }

  if (stopped || !evidence || checks.length === 0 || passed !== checks.length) {
    writeFileSync(join(artifact.root, "failure.json"), fileText({
      status: "failed",
      stopped,
      failed_checks: checks.filter((c) => !c.passed).map((c) => c.name),
      checks,
      results,
    }), { flag: "wx" });
    const reason = stopped ? `stopped: ${stopped.message}` : `${passed}/${checks.length} checks passed`;
    refuse(`Verification failed (${reason}). Private evidence is in the artifact dir; nothing public was written.`);
  }

  const record = {
    format: RECORD_FORMAT,
    title: "Webの小さなシーンに置くCC0の木箱を、容量を見てから取得し、実物を3Dで確かめる",
    reproducibility: "live: Poly Haven search results, metadata and tookMs can change between runs. The pinned source, inputs, this record and the downloaded file hashes identify this capture; they do not promise a frozen catalogue.",
    authored_by: "run.mjs and the page were written by Claude Opus 5.5. Every value in results comes from the original 3D Asset Server code and the live Poly Haven API, not from a model. The 3D model is by its credited author.",
    upstream: {
      ...UPSTREAM,
      vendor_lock_sha256: PINNED_SHA256["vendor-lock.json"],
      vendor_files_verified: lockInfo.lock.files.length,
      vendor_file_kinds: lockInfo.kinds,
      modules: Object.values(MODULES),
      runtime_dependencies: dependencies.map(({ name, version, license }) => ({ name, version, license })),
      skill: { path: "vendor/3d-asset-server/web/src/content/SKILL.md", sha256: lockInfo.skill.sha256 },
      agents_guide: { path: "vendor/3d-asset-server/web/src/content/AGENTS.md", sha256: lockInfo.agents.sha256 },
    },
    three: { ...THREE },
    input_sha256: { ...PINNED_SHA256 },
    runtime: {
      node: process.versions.node,
      providers: [...PROVIDER_IDS],
      user_agent: USER_AGENT,
      network: "live Poly Haven API and CDN; Fab is link-only and was not contacted",
      http_client: "original createHttpClient with fetchImpl = Node's fetch wrapped only to copy each response",
    },
    asset: evidence.asset,
    api_captures: {
      info: { url: evidence.api.info.url, path: API_INFO_REL, bytes: evidence.api.info.bytes, sha256: evidence.api.info.sha256 },
      files: { url: evidence.api.files.url, path: API_FILES_REL, bytes: evidence.api.files.bytes, sha256: evidence.api.files.sha256 },
    },
    results,
    network: {
      requests: capture.entries.length,
      api_requests: capture.entries.filter((e) => e.url.startsWith(POLYHAVEN_API)).length,
      file_requests: capture.entries.filter((e) => !e.url.startsWith(POLYHAVEN_API)).length,
      hosts: [...new Set(capture.entries.map((e) => new URL(e.url).hostname))],
    },
    summary: {
      operations: results.length,
      downloaded_models: results.filter((r) => r.operation === "download" && !r.error && r.output?.manifest).length,
      files: evidence.manifest.length,
      bytes: evidence.manifest.reduce((sum, f) => sum + f.bytes, 0),
      checks_total: checks.length,
      checks_passed: passed,
    },
    verification: { status: "passed", total: checks.length, passed, checks },
  };

  const recordSha = publish(record, evidence, artifact);
  process.stdout.write(`passed ${passed}/${checks.length} checks; wrote ${RECORD_REL} (sha256 ${recordSha}), `
    + `${evidence.manifest.length} files under ${ASSETS_REL}/${evidence.folder}/, ${API_INFO_REL}, ${API_FILES_REL}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Refusal ? "Refused" : "Failed"}: ${error.message}\n`);
  process.exitCode = 1;
});
