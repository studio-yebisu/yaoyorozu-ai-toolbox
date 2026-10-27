// 八百万図AIツールボックス — OpenHands Agent Canvas 作例の実行CLI。MIT License, Copyright (c) 2026 Studio Yebisu.
//
//   node run.mjs --artifact-dir <このフォルダーの外の、まだ無いフォルダー>
//
// 固定版 OpenHands Agent Canvas 1.27.1 の自動化ファイルの入出力API（改変なし）を、架空の8つの設定へ使う。
//   1. 原典12ファイル・@openhands/extensions 0.30.0 の29ファイル・ロック・入力のハッシュを照合する
//   2. 照合の後でだけ、原典の .ts を Node の型除去で読み込む（npm の導入なし）
//   3. serializeAutomation・getAutomationExportFilename・parseAutomationFile を呼び、実際のファイル・読み戻し・誤りを残す
//   4. 実結果を得た後でだけ input/expected.json と照合し、全確認が通ったときだけ outputs/ に1回書く
// 通信・認証・子プロセス・eval は使わない。エージェント・モデル・予定の登録・Webhook・リポジトリの取得は行わない。

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { format } from "node:util";

import { registerVendorResolver } from "./loader.mjs";

const SITE = dirname(fileURLToPath(import.meta.url));
const VENDOR_OPENHANDS = join(SITE, "vendor", "openhands");
const VENDOR_EXTENSIONS = join(SITE, "vendor", "extensions");
const OUTPUT_REL = "outputs/automation-runs.json";
const EXPORTS_REL = "outputs/exports";
const RECORD_FORMAT = "studio-yebisu-openhands-automation-runs-v1";
const INPUT_FORMAT = "studio-yebisu-openhands-settings-v1";

const UPSTREAM = Object.freeze({
  repository: "OpenHands/OpenHands",
  commit: "e4775b4ba61a83ba80af5f7b0b826201b8e8ea05",
  version: "1.27.1",
  license: "MIT",
});
const DEPENDENCY = Object.freeze({
  name: "@openhands/extensions",
  version: "0.30.0",
  license: "MIT",
  resolved: "https://registry.npmjs.org/@openhands/extensions/-/extensions-0.30.0.tgz",
  integrity: "sha512-lPyH0iqSow+ARTX4cumR75e3BJmuqpj2YbKm1cqDcI1SQDXfDTr+/wSVH9dQsOmddEP4Zn+uMoLXpKSO/moonA==",
  archive_sha256: "8a5eb885cc2bdb9170bc9a561aa5bcab52f8d662ac9fd38b69769b0f5f538356",
});
// Frozen by the production step before execution (runtime/frozen-inputs.json). Copied here; that file is not read at runtime.
const PINNED_SHA256 = Object.freeze({
  "input/automation-settings.json": "e982b4ca83fd92d9f012a44e98f35dc58b9dfc48a95eede6bb7daff57ce0be6b",
  "input/expected.json": "d2e9892831156aa52d87eff81b7b28ce15caaafbde900d828a8763d66064d460",
  "vendor-lock.json": "34149d29d4d4cb0181f41f0b8ac998a5c8baa0c3e13e0af341338eae1dddea02",
});
const ORIGINAL_FILES = Object.freeze([
  "vendor/openhands/LICENSE",
  "vendor/openhands/README.md",
  "vendor/openhands/package-lock.json",
  "vendor/openhands/package.json",
  "vendor/openhands/src/manifests/automation-interface.ts",
  "vendor/openhands/src/manifests/interface-validation.ts",
  "vendor/openhands/src/manifests/manifest-registry.ts",
  "vendor/openhands/src/manifests/manifest-sources.ts",
  "vendor/openhands/src/manifests/manifest-validation.ts",
  "vendor/openhands/src/manifests/types.ts",
  "vendor/openhands/src/types/automation.ts",
  "vendor/openhands/src/utils/automation-export.ts",
]);
const PACKAGE_PREFIX = "vendor/extensions/";
const PACKAGE_FILE_COUNT = 29;
const PACKAGE_REQUIRED = Object.freeze([
  "vendor/extensions/LICENSE",
  "vendor/extensions/package.json",
  "vendor/extensions/automations/index.js",
  "vendor/extensions/automations/interface.json",
  "vendor/extensions/automations/catalog-index.js",
  "vendor/extensions/automations/bundle-index.js",
]);
const CASE_IDS = Object.freeze(["O01", "O02", "O03", "O04", "O05", "O06", "O07", "O08"]);
const MODES = Object.freeze(["export-roundtrip", "import"]);
const REPAIR_PAIR = Object.freeze(["O03", "O04"]);
// Fields an Automation from the service carries that a portable file must not.
const SERVER_FIELDS = Object.freeze(["id", "created_at", "last_run"]);
const FICTIONAL_HOST = "example.invalid";

class Refusal extends Error {}

function refuse(message) {
  throw new Refusal(message);
}

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const gitBlobSha1 = (bytes) => createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
// The bytes of every saved file: pretty JSON with a final newline.
const fileText = (value) => `${JSON.stringify(value, null, 2)}\n`;

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

// --- 引数と出力先 ----------------------------------------------------------------------------

function parseArgs(argv) {
  if (argv.length !== 2 || argv[0] !== "--artifact-dir" || !argv[1] || argv[1].startsWith("--")) {
    refuse("Usage: node run.mjs --artifact-dir <new folder outside this site>");
  }
  return resolve(argv[1]);
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
  const exportsDir = join(root, "exports");
  mkdirSync(exportsDir);
  return { root, exports: exportsDir };
}

// --- 原典と入力の照合 --------------------------------------------------------------------------

function readSiteFile(relativePath) {
  return readFileSync(join(SITE, ...relativePath.split("/")));
}

function readSiteJson(relativePath) {
  return JSON.parse(readSiteFile(relativePath).toString("utf8"));
}

function assertVendorPath(path) {
  const ok = typeof path === "string"
    && (path.startsWith("vendor/openhands/") || path.startsWith(PACKAGE_PREFIX))
    && !path.includes("\\")
    && !path.includes(":")
    && path.split("/").every((segment) => segment !== "" && segment !== "." && segment !== "..");
  if (!ok) refuse(`Unsafe vendor path in vendor-lock.json: ${JSON.stringify(path)}`);
  return path;
}

function verifyVendor() {
  const lockBytes = readSiteFile("vendor-lock.json");
  const lockSha = sha256(lockBytes);
  if (lockSha !== PINNED_SHA256["vendor-lock.json"]) refuse("vendor-lock.json SHA-256 differs from the frozen value.");
  const lock = JSON.parse(lockBytes.toString("utf8"));
  for (const key of Object.keys(UPSTREAM)) {
    if (lock[key] !== UPSTREAM[key]) refuse(`vendor-lock.json ${key} differs from the pinned upstream.`);
  }
  if (!isPlainObject(lock.dependency)) refuse("vendor-lock.json has no dependency record.");
  for (const key of Object.keys(DEPENDENCY)) {
    if (lock.dependency[key] !== DEPENDENCY[key]) refuse(`vendor-lock.json dependency ${key} differs from the pin.`);
  }
  if (!Array.isArray(lock.files)) refuse("vendor-lock.json has no file list.");
  const paths = lock.files.map((file) => assertVendorPath(file && file.path));
  if (new Set(paths).size !== paths.length) refuse("vendor-lock.json lists a file twice.");
  const original = paths.filter((path) => path.startsWith("vendor/openhands/"));
  const packaged = paths.filter((path) => path.startsWith(PACKAGE_PREFIX));
  if (!deepEqual([...original].sort(), [...ORIGINAL_FILES].sort())) refuse("vendor-lock.json does not list exactly the twelve original files.");
  if (packaged.length !== PACKAGE_FILE_COUNT || original.length + packaged.length !== paths.length) {
    refuse(`vendor-lock.json does not list exactly ${PACKAGE_FILE_COUNT} package files.`);
  }
  for (const path of PACKAGE_REQUIRED) {
    if (!packaged.includes(path)) refuse(`vendor-lock.json is missing ${path}.`);
  }

  const files = lock.files.map((file) => {
    const bytes = readSiteFile(file.path);
    const actual = { path: file.path, sha256: sha256(bytes), bytes: bytes.length };
    if (file.path.startsWith("vendor/openhands/")) {
      if (typeof file.git_blob_sha1 !== "string") refuse(`${file.path} has no Git blob in vendor-lock.json.`);
      actual.git_blob_sha1 = gitBlobSha1(bytes);
      if (actual.git_blob_sha1 !== file.git_blob_sha1) refuse(`${file.path} differs from vendor-lock.json (Git blob).`);
    } else {
      const member = `package/${file.path.slice(PACKAGE_PREFIX.length)}`;
      if (file.npm_member !== member) refuse(`${file.path} is not mapped to ${member} in vendor-lock.json.`);
      actual.npm_member = member;
    }
    if (actual.sha256 !== file.sha256 || actual.bytes !== file.bytes) {
      refuse(`${file.path} differs from vendor-lock.json (sha256 or size).`);
    }
    return actual;
  });

  const appPackage = readSiteJson("vendor/openhands/package.json");
  if (appPackage.name !== "@openhands/agent-canvas" || appPackage.version !== UPSTREAM.version || appPackage.license !== UPSTREAM.license
    || !isPlainObject(appPackage.dependencies) || appPackage.dependencies[DEPENDENCY.name] !== DEPENDENCY.version) {
    refuse("vendor/openhands/package.json name, version, license or the pinned @openhands/extensions differs.");
  }
  const appLock = readSiteJson("vendor/openhands/package-lock.json");
  const locked = isPlainObject(appLock.packages) ? appLock.packages[`node_modules/${DEPENDENCY.name}`] : undefined;
  if (!isPlainObject(locked) || locked.version !== DEPENDENCY.version || locked.resolved !== DEPENDENCY.resolved
    || locked.integrity !== DEPENDENCY.integrity) {
    refuse("vendor/openhands/package-lock.json does not lock @openhands/extensions to the pinned version, resolved URL and integrity.");
  }
  const extPackage = readSiteJson("vendor/extensions/package.json");
  if (extPackage.name !== DEPENDENCY.name || extPackage.version !== DEPENDENCY.version || extPackage.license !== DEPENDENCY.license) {
    refuse("vendor/extensions/package.json name, version or license differs from the pin.");
  }
  return { lockSha, files };
}

function readInput(relativePath) {
  const bytes = readSiteFile(relativePath);
  const digest = sha256(bytes);
  if (digest !== PINNED_SHA256[relativePath]) refuse(`${relativePath} SHA-256 differs from the frozen value.`);
  return { digest, value: JSON.parse(bytes.toString("utf8")) };
}

function validateInputs(settings, expected) {
  if (!isPlainObject(settings) || settings.format !== INPUT_FORMAT || settings.fictional !== true) {
    refuse("input/automation-settings.json has an unexpected format.");
  }
  if (!Array.isArray(settings.cases) || !deepEqual(settings.cases.map((item) => item && item.id), CASE_IDS)) {
    refuse("input/automation-settings.json must hold exactly O01-O08.");
  }
  for (const item of settings.cases) {
    if (typeof item.label !== "string" || !item.label) refuse(`${item.id}: missing label.`);
    if (!MODES.includes(item.mode)) refuse(`${item.id}: unknown mode ${JSON.stringify(item.mode)}.`);
    if (!isPlainObject(item.input)) refuse(`${item.id}: input must be an object.`);
    if (item.mode === "export-roundtrip" && (typeof item.input.id !== "string" || typeof item.input.name !== "string")) {
      refuse(`${item.id}: an export-roundtrip input needs an id and a name.`);
    }
  }
  if (!isPlainObject(expected) || typeof expected.case_count !== "number"
    || !Array.isArray(expected.accepted_ids) || !Array.isArray(expected.rejected_ids)
    || !isPlainObject(expected.issue_substrings)) {
    refuse("input/expected.json has an unexpected shape.");
  }
}

function collectStrings(value, out = []) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((item) => collectStrings(item, out));
  else if (isPlainObject(value)) Object.values(value).forEach((item) => collectStrings(item, out));
  return out;
}

function fixtureUrls(settings) {
  return collectStrings(settings.cases.map((item) => item.input))
    .filter((text) => /^[a-z][a-z0-9+.-]*:\/\//i.test(text))
    .map((text) => {
      let host = null;
      try {
        host = new URL(text).hostname;
      } catch {
        host = null;
      }
      return { url: text, host };
    });
}

// --- 原典の呼び出し --------------------------------------------------------------------------

// Only the original AutomationFileValidationError is turned into data. Anything else stops the run.
function attemptParse(api, value) {
  try {
    return { spec: api.parseAutomationFile(value), error: null };
  } catch (error) {
    if (error instanceof api.AutomationFileValidationError) {
      return { spec: null, error: { name: error.name, message: error.message, issues: [...error.issues] } };
    }
    throw error;
  }
}

function diffPaths(before, after, path = "") {
  if (deepEqual(before, after)) return [];
  if (isPlainObject(before) && isPlainObject(after)) {
    const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
    return keys.flatMap((key) => {
      const next = path ? `${path}.${key}` : key;
      if (!Object.hasOwn(before, key)) return [{ path: next, change: "added", after: after[key] }];
      if (!Object.hasOwn(after, key)) return [{ path: next, change: "removed", before: before[key] }];
      return diffPaths(before[key], after[key], next);
    });
  }
  return [{ path: path || "(root)", change: "changed", before, after }];
}

const sourceSettings = (item) => (item.mode === "export-roundtrip" ? item.input : item.input.spec);

// Facts read off the actual input, file and parsed spec. Nothing here is taken from input/expected.json.
function observe(item, file, parsed, error) {
  const source = sourceSettings(item);
  const observations = {};
  if (isPlainObject(source)) {
    observations.source_enabled = { value: source.enabled, type: typeof source.enabled };
  }
  if (error) {
    observations.issue_count = error.issues.length;
    observations.issue_paths = error.issues.map((issue) => issue.split(":")[0]);
  }
  if (file) {
    observations.file_keys = Object.keys(file);
    observations.spec_keys = Object.keys(file.spec);
    if (item.mode === "export-roundtrip") {
      observations.removed_from_input = Object.keys(item.input).filter((key) => !Object.hasOwn(file.spec, key));
    }
  }
  if (!parsed || !isPlainObject(source)) return observations;

  observations.enabled = parsed.enabled;
  observations.model = { present: Object.hasOwn(parsed, "model"), value: Object.hasOwn(parsed, "model") ? parsed.model : null };
  observations.timeout = { input: source.timeout ?? null, parsed: parsed.timeout ?? null };
  const trigger = parsed.trigger;
  observations.trigger = { type: trigger.type, timezone: trigger.timezone ?? null, spec_timezone: parsed.timezone ?? null };
  if (typeof trigger.schedule === "string") {
    observations.schedule = {
      value: trigger.schedule,
      input_value: isPlainObject(source.trigger) ? source.trigger.schedule ?? null : null,
      whitespace_fields: trigger.schedule.trim().split(/\s+/).length,
      accepted_by_parser: true,
      // parseAutomationFile only requires a non-empty string for cron/schedule; no cron grammar or scheduler ran here.
      cron_grammar_validated: false,
    };
  }
  if (trigger.type === "event" && isPlainObject(source.trigger)) {
    observations.event = {
      source: trigger.source ?? null,
      on: trigger.on ?? null,
      filter: trigger.filter ?? null,
      on_unchanged: deepEqual(trigger.on, source.trigger.on),
      filter_unchanged: trigger.filter === source.trigger.filter,
      webhook_delivered: false,
    };
  }
  observations.prompt = {
    unchanged: parsed.prompt === source.prompt,
    code_points: [...parsed.prompt].length,
    contains: {
      script_tag: parsed.prompt.includes("<script>"),
      template_braces: /\{\{[^{}]*\}\}/.test(parsed.prompt),
      newline: parsed.prompt.includes("\n"),
    },
  };
  if (Array.isArray(source.repositories)) {
    const exported = { repository: file.spec.repository ?? null, branch: file.spec.branch ?? null };
    observations.repositories = {
      source: source.repositories,
      deprecated_top_level: { repository: source.repository ?? null, branch: source.branch ?? null },
      exported,
      dropped: source.repositories.filter((entry) => !(entry.url === exported.repository && entry.ref === exported.branch)),
      deprecated_overridden: source.repository !== exported.repository || source.branch !== exported.branch,
      fetched: false,
    };
  }
  return observations;
}

function runCase(item, api) {
  const { id, label, mode, input } = item;
  let file = null;
  let text = null;
  let filename = null;
  let filenameSource = null;
  let parsed = null;
  let error = null;
  let roundtrip = null;

  if (mode === "export-roundtrip") {
    // Service-shaped settings → original serializer → bytes → JSON.parse → original parser.
    file = api.serializeAutomation(input);
    text = fileText(file);
    filenameSource = { id: input.id, name: input.name };
    filename = api.getAutomationExportFilename(filenameSource);
    ({ spec: parsed, error } = attemptParse(api, JSON.parse(text)));
    if (parsed) {
      const second = api.serializeAutomation(parsed);
      const secondText = fileText(second);
      const again = attemptParse(api, JSON.parse(secondText));
      roundtrip = {
        steps: ["serializeAutomation(input)", "JSON.stringify → JSON.parse", "parseAutomationFile → parsed", "serializeAutomation(parsed)", "JSON.stringify → JSON.parse", "parseAutomationFile → reparsed"],
        reparsed: again.spec,
        error: again.error,
        reparsed_equals_parsed: again.spec !== null && deepEqual(again.spec, parsed) && JSON.stringify(again.spec) === JSON.stringify(parsed),
        reserialized_equals_file: secondText === text,
        reserialized_sha256: sha256(Buffer.from(secondText, "utf8")),
      };
    }
  } else {
    // A file as found → original parser; if accepted, original serializer → bytes → original parser again.
    ({ spec: parsed, error } = attemptParse(api, input));
    if (parsed) {
      file = api.serializeAutomation(parsed);
      text = fileText(file);
      filenameSource = { id, name: parsed.name };
      filename = api.getAutomationExportFilename(filenameSource);
      const again = attemptParse(api, JSON.parse(text));
      const secondText = again.spec ? fileText(api.serializeAutomation(again.spec)) : null;
      roundtrip = {
        steps: ["parseAutomationFile(input) → parsed", "serializeAutomation(parsed)", "JSON.stringify → JSON.parse", "parseAutomationFile → reparsed", "serializeAutomation(reparsed)"],
        reparsed: again.spec,
        error: again.error,
        reparsed_equals_parsed: again.spec !== null && deepEqual(again.spec, parsed) && JSON.stringify(again.spec) === JSON.stringify(parsed),
        reserialized_equals_file: secondText === text,
        reserialized_sha256: secondText === null ? null : sha256(Buffer.from(secondText, "utf8")),
      };
    }
  }

  const accepted = parsed !== null;
  return {
    id,
    label,
    mode,
    input,
    accepted,
    file,
    file_path: accepted ? `${EXPORTS_REL}/${id}.automation.json` : null,
    file_sha256: accepted ? sha256(Buffer.from(text, "utf8")) : null,
    filename: accepted ? filename : null,
    filename_source: accepted ? filenameSource : null,
    parsed,
    roundtrip,
    error,
    observations: observe(item, file, parsed, error),
  };
}

function runAll(cases, api) {
  const results = cases.map((item) => runCase(item, api));
  const map = new Map(results.map((result) => [result.id, result]));
  const [brokenId, repairedId] = REPAIR_PAIR;
  const broken = map.get(brokenId);
  const repaired = map.get(repairedId);
  if (broken && repaired) {
    const inputDiff = diffPaths(broken.input, repaired.input);
    broken.observations.repair = { role: "broken", partner: repairedId, input_diff: inputDiff };
    repaired.observations.repair = { role: "repaired", partner: brokenId, input_diff: inputDiff };
  }
  return results;
}

// --- 結果の照合 ---------------------------------------------------------------------------------

const byId = (results) => new Map(results.map((result) => [result.id, result]));

function caseChecks(results, envelope, check) {
  const map = byId(results);
  for (const result of results) {
    const { id } = result;
    const source = sourceSettings(result);
    if (result.accepted) {
      const { file, parsed } = result;
      check(`${id}: 書き出したファイルの最上位が version・kind・spec の3つ`, deepEqual(Object.keys(file), ["version", "kind", "spec"]));
      check(`${id}: 封筒が version ${envelope.fileVersion}（数値）・kind "${envelope.fileKind}"`, typeof file.version === "number"
        && file.version === envelope.fileVersion && file.kind === envelope.fileKind);
      check(`${id}: ファイル名が原典の接尾辞 ${envelope.filenameSuffix} で終わり、フォルダーを含まない`, typeof result.filename === "string"
        && result.filename.endsWith(envelope.filenameSuffix) && result.filename.length > envelope.filenameSuffix.length
        && !/[\\/:]/.test(result.filename));
      check(`${id}: もう一度書き出して読み直しても、ファイルの bytes と設定が同じ`, result.roundtrip.error === null
        && result.roundtrip.reparsed_equals_parsed === true && result.roundtrip.reserialized_equals_file === true);
      check(`${id}: enabled は false のまま（予定の登録・実行はしていない）`, parsed.enabled === false && file.spec.enabled === false);
      check(`${id}: model の null がファイルと読み戻しに残る`, Object.hasOwn(file.spec, "model") && file.spec.model === null
        && Object.hasOwn(parsed, "model") && parsed.model === null);
      check(`${id}: timeout が入力と同じ`, typeof source.timeout === "number" && file.spec.timeout === source.timeout && parsed.timeout === source.timeout);
      check(`${id}: name と prompt が入力と1文字も違わない`, parsed.name === source.name && parsed.prompt === source.prompt
        && file.spec.name === source.name && file.spec.prompt === source.prompt);
      check(`${id}: ファイルと読み戻しに id・created_at・last_run・repositories が無い`, [...SERVER_FIELDS, "repositories"].every((key) => !Object.hasOwn(file, key)
        && !Object.hasOwn(file.spec, key) && !Object.hasOwn(parsed, key)));
      if (result.mode === "export-roundtrip") {
        check(`${id}: 元の設定の id・created_at・last_run は書き出しで外れた`, SERVER_FIELDS.every((key) => Object.hasOwn(result.input, key)
          && result.observations.removed_from_input.includes(key)));
      }
      if (parsed.trigger.type === "cron" || parsed.trigger.type === "schedule") {
        check(`${id}: schedule と timezone が入力と同じ`, parsed.trigger.schedule === source.trigger.schedule
          && parsed.trigger.timezone === source.trigger.timezone && parsed.timezone === source.timezone);
      }
    } else {
      const error = result.error;
      check(`${id}: 誤りは原典の AutomationFileValidationError で、message は issues の改行つなぎ`, isPlainObject(error)
        && error.name === "AutomationFileValidationError" && Array.isArray(error.issues) && error.issues.length > 0
        && error.issues.every((issue) => typeof issue === "string") && error.message === error.issues.join("\n"));
      if (result.mode === "import") {
        check(`${id}: 形が通らなかったので、ファイルも名前も読み戻しも作っていない`, result.file === null && result.filename === null
          && result.parsed === null && result.roundtrip === null);
      }
    }
  }

  const o01 = map.get("O01");
  check("O01: 毎週土曜9時（0 9 * * 6・Asia/Tokyo）の cron がファイルに残る", o01.accepted && o01.file.spec.trigger.type === "cron"
    && o01.file.spec.trigger.schedule === "0 9 * * 6" && o01.file.spec.trigger.timezone === "Asia/Tokyo" && o01.file.spec.timezone === "Asia/Tokyo");

  const o02 = map.get("O02");
  const o02Source = o02.input.trigger;
  check("O02: event の source・on の配列・filter が、ファイルと読み戻しでそのまま", o02.accepted
    && Array.isArray(o02Source.on) && o02Source.on.length > 1
    && deepEqual(o02.file.spec.trigger.on, o02Source.on) && deepEqual(o02.parsed.trigger.on, o02Source.on)
    && o02.file.spec.trigger.filter === o02Source.filter && o02.parsed.trigger.filter === o02Source.filter
    && o02.parsed.trigger.source === o02Source.source);

  const o03 = map.get("O03");
  const o04 = map.get("O04");
  const diff = o04.observations.repair ? o04.observations.repair.input_diff : [];
  check("O03/O04: 入力の違いは spec.trigger.schedule の追加1か所だけ", diff.length === 1
    && diff[0].path === "spec.trigger.schedule" && diff[0].change === "added" && typeof diff[0].after === "string"
    && deepEqual(o03.observations.repair && o03.observations.repair.input_diff, diff));
  check("O04: 読み戻した schedule が、足した値と同じ", o04.accepted && diff.length === 1 && o04.parsed.trigger.schedule === diff[0].after);

  const o05 = map.get("O05");
  check("O05: 入力の enabled は真偽値ではなく文字列", typeof o05.input.spec.enabled === "string"
    && o05.observations.source_enabled.type === "string");

  const o06 = map.get("O06");
  check("O06: cron の形でない schedule がそのまま形を通った（原典は空でない文字列かだけを見る）", o06.accepted
    && o06.parsed.trigger.schedule === o06.input.spec.trigger.schedule && o06.file.spec.trigger.schedule === o06.input.spec.trigger.schedule
    && o06.observations.schedule.whitespace_fields !== 5 && o06.observations.schedule.cron_grammar_validated === false);

  const o07 = map.get("O07");
  const repos = o07.input.repositories;
  const o07Text = o07.accepted ? fileText(o07.file) : "";
  check("O07: 書き出した参照先は、先頭の1件の url と ref だけ", o07.accepted && Array.isArray(repos) && repos.length === 2
    && o07.file.spec.repository === repos[0].url && o07.file.spec.branch === repos[0].ref
    && o07.parsed.repository === repos[0].url && o07.parsed.branch === repos[0].ref);
  check("O07: 2件目の参照先はファイルに残らない", o07.accepted && !o07Text.includes(repos[1].url) && !o07Text.includes(`"${repos[1].ref}"`)
    && deepEqual(o07.observations.repositories.dropped, [repos[1]]));
  check("O07: 古い repository・branch は先頭の参照先で上書きされた", o07.accepted && !o07Text.includes(o07.input.repository)
    && o07.file.spec.branch !== o07.input.branch && o07.observations.repositories.deprecated_overridden === true);

  const o08 = map.get("O08");
  const literal = o08.input.prompt;
  check("O08: 入力の prompt に <script> タグ・{{form.repository}}・改行がある", literal.includes("<script>")
    && literal.includes("{{form.repository}}") && literal.includes("\n"));
  check("O08: その prompt がファイル・読み戻し・2回目の読み戻しで同じ文字のまま", o08.accepted
    && JSON.parse(fileText(o08.file)).spec.prompt === literal && o08.parsed.prompt === literal
    && o08.roundtrip.reparsed && o08.roundtrip.reparsed.prompt === literal);
}

function oracleComparison(results, expected, check) {
  const map = byId(results);
  const actualAccepted = results.filter((result) => result.accepted).map((result) => result.id);
  const actualRejected = results.filter((result) => !result.accepted).map((result) => result.id);
  check("件数が実行前の期待と一致", results.length === expected.case_count);
  check("形が通った件が実行前の期待と一致", deepEqual(actualAccepted, expected.accepted_ids));
  check("止まった件が実行前の期待と一致", deepEqual(actualRejected, expected.rejected_ids));

  const issueSubstrings = Object.entries(expected.issue_substrings).map(([id, list]) => {
    const result = map.get(id);
    const issues = result && result.error ? result.error.issues : [];
    const substrings = Array.isArray(list) ? list : [];
    const found = substrings.map((substring) => ({ substring, found: issues.some((issue) => issue.includes(substring)) }));
    check(`${id}: 実行前に決めた理由の一部が、すべて原典の issues にある`, found.length > 0 && found.every((entry) => entry.found));
    check(`${id}: 原典の issues と実行前の理由が1行ずつ対応する（${substrings.length}件）`, issues.length === substrings.length
      && issues.every((issue) => substrings.filter((substring) => issue.includes(substring)).length === 1));
    return { id, substrings: found, issue_count: issues.length };
  });

  check("実行前の修復の組が O03 と O04", deepEqual(expected.repair_pair, REPAIR_PAIR));
  for (const key of ["non_grammar_validation", "first_repository_only", "literal_text"]) {
    const id = expected[key];
    check(`実行前に決めた ${key} の ${id} は形が通った`, typeof id === "string" && map.has(id) && map.get(id).accepted === true);
  }

  const actualCounts = { total: results.length, accepted: actualAccepted.length, rejected: actualRejected.length };
  const expectedCounts = { total: expected.case_count, accepted: expected.accepted_ids.length, rejected: expected.rejected_ids.length };
  check("形が通った数・止まった数が実行前の期待と一致", deepEqual(actualCounts, expectedCounts));
  return {
    source: "input/expected.json（実行の前に固定。実結果を得た後の照合だけに使い、結果・誤り・観察の作成には使っていない）",
    accepted_ids: { expected: expected.accepted_ids, actual: actualAccepted },
    rejected_ids: { expected: expected.rejected_ids, actual: actualRejected },
    issue_substrings: issueSubstrings,
    counts: { expected: expectedCounts, actual: actualCounts },
  };
}

function privatePathNeedles(dirs, artifactArg) {
  const roots = [dirs.root, artifactArg, SITE, realpathSync(SITE), homedir(), tmpdir(), process.cwd(), dirname(process.execPath)];
  const needles = new Set();
  for (const root of roots) {
    if (typeof root !== "string" || root.length < 4) continue;
    for (const variant of [root, root.replaceAll("\\", "/"), JSON.stringify(root).slice(1, -1)]) needles.add(variant);
  }
  return [...needles];
}

function containsPrivatePath(serialized, needles) {
  const haystack = process.platform === "win32" ? serialized.toLowerCase() : serialized;
  const hit = needles.some((needle) => haystack.includes(process.platform === "win32" ? needle.toLowerCase() : needle));
  const drive = /(?<![A-Za-z0-9])[A-Za-z]:(?:\\\\|\/(?!\/))/.test(serialized);
  const posix = /(?:^|[\s"'(=])\/(?:Users|home|tmp|var|private|root|mnt|Volumes|opt)\//.test(serialized);
  return hit || drive || posix;
}

function writePrivate(dirs, name, value) {
  writeFileSync(join(dirs.root, name), fileText(value), { flag: "wx" });
}

// --- 本体 -----------------------------------------------------------------------------------

async function main() {
  const artifactArg = parseArgs(process.argv.slice(2));
  const outputPath = join(SITE, ...OUTPUT_REL.split("/"));
  const exportsPath = join(SITE, ...EXPORTS_REL.split("/"));
  if (existsSync(outputPath) || existsSync(exportsPath)) {
    refuse(`${OUTPUT_REL} or ${EXPORTS_REL}/ already exists and is never overwritten. In a copied folder, rename the captured outputs first.`);
  }
  const nodeMajor = Number(process.versions.node.split(".")[0]);
  if (!(nodeMajor >= 24) || !process.features || !process.features.typescript) {
    refuse("Node 24 with built-in TypeScript type stripping is required.");
  }

  const dirs = prepareArtifactDir(artifactArg);
  const checks = [];
  const check = (name, passed) => {
    checks.push({ name, passed: passed === true });
    return passed === true;
  };

  try {
    const vendor = verifyVendor();
    check(`原典${ORIGINAL_FILES.length}ファイルの SHA-256・バイト数・Git blob が vendor-lock.json と一致`, true);
    check(`${DEPENDENCY.name} ${DEPENDENCY.version} の${PACKAGE_FILE_COUNT}ファイルの SHA-256・バイト数・npm の中の位置が vendor-lock.json と一致`, true);
    check("vendor-lock.json の SHA-256、固定版（repository・commit・version・license）と依存の記録が一致", true);
    check(`原典の package.json と package-lock.json が ${DEPENDENCY.name} ${DEPENDENCY.version} を同じ resolved・integrity で固定`, true);
    const settingsInput = readInput("input/automation-settings.json");
    const expectedInput = readInput("input/expected.json");
    check("入力2ファイルの SHA-256 が実行前に固定した値と一致", true);
    validateInputs(settingsInput.value, expectedInput.value);
    check("入力が O01〜O08 の8件で、試し方が export-roundtrip か import", true);
    const urls = fixtureUrls(settingsInput.value);
    check(`入力のURLはすべて架空の ${FICTIONAL_HOST}（取得しない）`, urls.length > 0 && urls.every((entry) => entry.host === FICTIONAL_HOST));
    const fixtureBefore = JSON.stringify(settingsInput.value);

    // Only now: register the resolver and import the original TypeScript and the vendored package, unmodified.
    const resolver = registerVendorResolver({ site: SITE, openhands: VENDOR_OPENHANDS, extensions: VENDOR_EXTENSIONS });
    const url = (...parts) => pathToFileURL(join(VENDOR_OPENHANDS, "src", ...parts)).href;
    const warnings = [];
    const consoleWarn = console.warn;
    console.warn = (...args) => {
      warnings.push(format(...args));
    };
    let exportModule;
    let interfaceModule;
    try {
      exportModule = await import(url("utils", "automation-export.ts"));
      interfaceModule = await import(url("manifests", "automation-interface.ts"));
    } finally {
      console.warn = consoleWarn;
    }
    const api = {
      serializeAutomation: exportModule.serializeAutomation,
      getAutomationExportFilename: exportModule.getAutomationExportFilename,
      parseAutomationFile: exportModule.parseAutomationFile,
      AutomationFileValidationError: exportModule.AutomationFileValidationError,
      hasAutomationInterface: interfaceModule.hasAutomationInterface,
      getImportExportSpec: interfaceModule.getImportExportSpec,
    };
    for (const [name, value] of Object.entries(api)) {
      if (typeof value !== "function") refuse(`Original export ${name} is not a function.`);
    }

    const admitted = api.hasAutomationInterface();
    check("hasAutomationInterface() が true（同梱パッケージの interface manifest が原典の審査を通った）", admitted === true);
    if (admitted !== true) refuse("The vendored interface manifest was not admitted by the original host; the file APIs cannot run.");
    check("読み込み中に interface manifest を拒否する警告が出ていない", !warnings.some((line) => line.includes("Rejected the automation interface manifest")));
    const envelope = api.getImportExportSpec();
    const packageInterface = readSiteJson("vendor/extensions/automations/interface.json");
    check("getImportExportSpec() が同梱の interface.json の importExport と一致", deepEqual(envelope, packageInterface.importExport));
    check("封筒が fileVersion 1（数値）・fileKind \"automation\"・filenameSuffix \".automation.json\"", typeof envelope.fileVersion === "number"
      && envelope.fileVersion === 1 && envelope.fileKind === "automation" && envelope.filenameSuffix === ".automation.json");

    const results = runAll(settingsInput.value.cases, api);
    const repeated = runAll(settingsInput.value.cases, api);
    check("同じ入力で2回目に呼んでも、8件の結果がすべて同じ", JSON.stringify(results) === JSON.stringify(repeated));
    check("原典を呼んだ後も、入力の内容が変わっていない", JSON.stringify(settingsInput.value) === fixtureBefore);

    const resolutions = resolver.resolutions
      .map((entry) => ({ ...entry }))
      .sort((a, b) => {
        const left = `${a.from}\0${a.specifier}`;
        const right = `${b.from}\0${b.specifier}`;
        return left < right ? -1 : left > right ? 1 : 0;
      });
    check("読み込み補助が解決したのは同梱の原典とパッケージのファイル（と Node の組み込み）だけ", resolutions.length > 0
      && resolutions.every((entry) => (entry.to.startsWith("vendor/openhands/src/") && entry.to.endsWith(".ts"))
        || entry.to.startsWith(PACKAGE_PREFIX) || entry.to.startsWith("node:")));
    check("「#/」・拡張子なし相対 import・@openhands/extensions/automations をそれぞれ原典のまま解決した", resolutions.some((entry) => entry.specifier.startsWith("#/"))
      && resolutions.some((entry) => entry.specifier.startsWith("./") && entry.from.startsWith("vendor/openhands/"))
      && resolutions.some((entry) => entry.specifier === "@openhands/extensions/automations" && entry.to === "vendor/extensions/automations/index.js"));

    caseChecks(results, envelope, check);
    const oracle = oracleComparison(results, expectedInput.value, check);

    const after = verifyVendor();
    check("実行の後も原典とパッケージの41ファイルとロックが同じ", deepEqual(after, vendor) && after.files.length === ORIGINAL_FILES.length + PACKAGE_FILE_COUNT);

    const acceptedCount = results.filter((result) => result.accepted).length;
    const record = {
      format: RECORD_FORMAT,
      notice: "架空の8つの自動化の設定（実行前に固定）を、固定版 OpenHands Agent Canvas の自動化ファイルの入出力APIで書き出し・読み戻した実行記録。形の検査であり、Agent Canvas のアプリ・サーバー、エージェント・モデル、予定の登録、Webhook、リポジトリの取得、Cloud は使っていない。example.invalid の参照先は架空で、取得していない。",
      upstream: { ...UPSTREAM, vendor_lock_sha256: vendor.lockSha, files: vendor.files.filter((file) => file.path.startsWith("vendor/openhands/")) },
      dependency: {
        ...DEPENDENCY,
        source: "vendor/openhands/package-lock.json が固定する npm の tgz から、automations/index.js から届くファイルと package.json・LICENSE を改変せずに置いたもの",
        files: vendor.files.filter((file) => file.path.startsWith(PACKAGE_PREFIX)),
      },
      input_sha256: {
        "input/automation-settings.json": settingsInput.digest,
        "input/expected.json": expectedInput.digest,
        "vendor-lock.json": vendor.lockSha,
      },
      runtime: {
        node: process.version,
        typescript: process.features.typescript,
        packages_installed: 0,
        network: false,
        module_resolution: resolutions,
        console_warnings: warnings,
      },
      api_entrypoints: [
        { name: "serializeAutomation", source: "vendor/openhands/src/utils/automation-export.ts" },
        { name: "getAutomationExportFilename", source: "vendor/openhands/src/utils/automation-export.ts" },
        { name: "parseAutomationFile", source: "vendor/openhands/src/utils/automation-export.ts" },
        { name: "AutomationFileValidationError", source: "vendor/openhands/src/utils/automation-export.ts" },
        { name: "hasAutomationInterface", source: "vendor/openhands/src/manifests/automation-interface.ts" },
        { name: "getImportExportSpec", source: "vendor/openhands/src/manifests/automation-interface.ts" },
      ],
      interface: {
        admitted,
        envelope,
        source: "vendor/extensions/automations/index.js の AUTOMATION_INTERFACE（interface.json）を、原典の validateInterfaceManifest が審査して通したもの",
      },
      results,
      summary: { total: results.length, accepted: acceptedCount, rejected: results.length - acceptedCount },
      oracle_comparison: oracle,
    };

    const leaked = containsPrivatePath(JSON.stringify(record), privatePathNeedles(dirs, artifactArg));
    check("記録に手元の絶対パスが含まれない", !leaked);

    const failed = checks.filter((entry) => !entry.passed);
    record.verification = { status: failed.length === 0 ? "passed" : "failed", checks, total: checks.length };
    if (failed.length) {
      writePrivate(dirs, "failure-report.json", { status: "failed", failed_checks: failed.map((entry) => entry.name), absolute_path_found: leaked, record });
      process.stderr.write(`openhands-example: ${failed.length} of ${checks.length} checks failed. No public record was written.\n`);
      if (leaked) process.stderr.write("openhands-example: an absolute path appeared in the record; kept privately for review.\n");
      for (const entry of failed) process.stderr.write(`  failed: ${entry.name}\n`);
      process.exitCode = 1;
      return;
    }

    // Private copies first, then the public exports, then the public record last.
    const serialized = fileText(record);
    const exported = results.filter((result) => result.accepted).map((result) => ({ result, text: fileText(result.file) }));
    writeFileSync(join(dirs.root, "automation-runs.json"), serialized, { flag: "wx" });
    for (const { result, text } of exported) {
      writeFileSync(join(dirs.exports, `${result.id}.automation.json`), text, { flag: "wx" });
    }
    mkdirSync(dirname(exportsPath), { recursive: true });
    mkdirSync(exportsPath);
    for (const { result, text } of exported) {
      writeFileSync(join(SITE, ...result.file_path.split("/")), text, { flag: "wx" });
    }
    writeFileSync(outputPath, serialized, { flag: "wx" });

    const publicDigest = sha256(readFileSync(outputPath));
    const privateDigest = sha256(readFileSync(join(dirs.root, "automation-runs.json")));
    const exportsMatch = exported.every(({ result }) => sha256(readFileSync(join(SITE, ...result.file_path.split("/")))) === result.file_sha256
      && sha256(readFileSync(join(dirs.exports, `${result.id}.automation.json`))) === result.file_sha256);
    const log = results.map((result) => `${result.id} ${result.accepted ? "accepted" : "rejected"} ${result.accepted ? result.filename : `${result.error.issues.length} issue(s)`}`);
    writeFileSync(join(dirs.root, "run-log.txt"), `${log.join("\n")}\nchecks: ${checks.length}/${checks.length}\nrecord sha256: ${publicDigest}\n`, { flag: "wx" });
    if (publicDigest !== privateDigest || !exportsMatch) {
      process.stderr.write("openhands-example: the written files differ from the record. Review them before use.\n");
      process.exitCode = 1;
      return;
    }

    for (const result of results) {
      const detail = result.accepted ? `${result.filename} -> ${result.file_path}` : result.error.issues[0];
      process.stdout.write(`${result.id} ${result.accepted ? "accepted" : "rejected"} ${detail}\n`);
    }
    process.stdout.write(`file shape accepted ${record.summary.accepted} / rejected ${record.summary.rejected} / checks ${checks.length} passed\n`);
    process.stdout.write(`wrote ${OUTPUT_REL} (sha256 ${publicDigest}) and ${exported.length} files in ${EXPORTS_REL}/\n`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    writePrivate(dirs, "failure-report.json", { status: "error", message, checks });
    throw error;
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`openhands-example: stopped. ${message}\n`);
  process.exitCode = error instanceof Refusal ? 2 : 1;
});
