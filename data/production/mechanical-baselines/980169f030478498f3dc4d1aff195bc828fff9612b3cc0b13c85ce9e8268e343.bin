// 八百万図AIツールボックス — Letta Code 作例の実行CLI。MIT License, Copyright (c) 2026 Studio Yebisu.
//
//   node run.mjs --artifact-dir <このフォルダーの外の、まだ無いフォルダー>
//
// 固定版 letta-ai/letta-code の記憶検査（改変なし）を、架空の読書会の記憶へ使う。
//   1. 原典8ファイル・ロック・入力のハッシュを照合してから、原典の .ts を Node の型除去で読み込む
//   2. 8件それぞれに新しい非公開リポジトリを作り、基準の commit の後に原典の検査スクリプトを pre-commit にする
//   3. 変更を stage し、検査API・原典CLIの直接実行・実際の git commit の結果を別々に残す
//   4. 実結果を得た後でだけ input/expected.json と照合し、全確認が通ったときだけ outputs/memory-runs.json を1回書く
// 依存パッケージ・通信・認証は使わない。.git・hook・ログは --artifact-dir の中だけに置く。

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { delimiter, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { registerVendorResolver } from "./loader.mjs";

const SITE = dirname(fileURLToPath(import.meta.url));
const VENDOR = join(SITE, "vendor", "letta-code");
const OUTPUT_REL = "outputs/memory-runs.json";
const RECORD_FORMAT = "studio-yebisu-letta-memory-runs-v1";
const INPUT_FORMAT = "studio-yebisu-letta-memory-changes-v1";

const UPSTREAM = Object.freeze({
  repository: "letta-ai/letta-code",
  commit: "316e4c0545b549c453e0f85cc81d3540404eff74",
  version: "0.34.14",
  license: "Apache-2.0",
});
// Frozen by the production step before execution (runtime/frozen-inputs.json).
const PINNED_SHA256 = Object.freeze({
  "input/memory-changes.json": "852d6c0708eb9c42d31f71ad6fc6f8fcb95849d0d1eb72f4094e60a3e20311e0",
  "input/expected.json": "0f61d8dd6a58b99100759421295ea24a7436a32cb91304111c78b0cb5227a1a8",
  "vendor-lock.json": "a62fbf74fa35f609756adf4b9ef2bbfcfe7e46cfd291058be455601bbc8d4d57",
});
const VENDOR_FILES = Object.freeze([
  "vendor/letta-code/LICENSE",
  "vendor/letta-code/README.md",
  "vendor/letta-code/package.json",
  "vendor/letta-code/src/agent/memory-constraints.ts",
  "vendor/letta-code/src/agent/memory-format.ts",
  "vendor/letta-code/src/memory-constraints.ts",
  "vendor/letta-code/src/memory-frontmatter.ts",
  "vendor/letta-code/src/skills/builtin/initializing-memory/SKILL.md",
]);
const CASE_IDS = Object.freeze(["L01", "L02", "L03", "L04", "L05", "L06", "L07", "L08"]);
// Fictional initial policy, fixed before execution. Stricter than upstream defaults; not adopted by any real agent.
const POLICY = Object.freeze({
  version: 1,
  maxDepth: 2,
  maxFileCharacters: 900,
  maxCoreMemoryCharacters: 1200,
  readOnlyFiles: ["persona.md"],
});
const CONFIG_PATH = ".memfs.config.json";
const UPDATE_ENV = "LETTA_MEMORY_CONSTRAINTS_UPDATE";
const VALIDATOR_NAME = "letta-memory-constraints.cjs";
const VALIDATOR_REL = `.git/${VALIDATOR_NAME}`;
const HOOK_REL = ".git/hooks/pre-commit";
const HOOK_TEXT = "#!/bin/sh\nexec node .git/letta-memory-constraints.cjs --layout root-marker\n";
const CLI_ARGS = Object.freeze([VALIDATOR_REL, "--layout", "root-marker"]);
const CLI_COMMAND = "node .git/letta-memory-constraints.cjs --layout root-marker";
const GIT_USER = Object.freeze({ name: "八百万図AIツールボックス fictional memory", email: "fictional@example.invalid" });
const BASELINE_DATE = "2026-10-17T09:00:00+09:00";
const ATTEMPT_DATE = "2026-10-17T09:10:00+09:00";
const BASELINE_MESSAGE = "Baseline fictional book-club memory";
const MAX_BUFFER = 64 * 1024 * 1024;

class Refusal extends Error {}

function refuse(message) {
  throw new Refusal(message);
}

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const gitBlobSha1 = (bytes) => createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");

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
  if (existsSync(target)) refuse("The artifact dir already exists. Give a new folder; previous repositories are never reused.");
  for (const site of [SITE, siteReal]) {
    if (within(site, target) || within(target, site)) {
      refuse("The artifact dir must be outside this site, and must not contain it.");
    }
  }
  mkdirSync(target, { recursive: true });
  const root = realpathSync(target);
  if (within(siteReal, root) || within(root, siteReal)) refuse("The artifact dir resolves inside this site.");
  if (readdirSync(root).length !== 0) refuse("The artifact dir is not empty.");

  const dirs = {
    root,
    repos: join(root, "repos"),
    home: join(root, "home"),
    tmp: join(root, "tmp"),
    template: join(root, "git-template-empty"),
    globalConfig: join(root, "git-global-empty.config"),
  };
  for (const key of ["repos", "home", "tmp", "template"]) mkdirSync(dirs[key]);
  writeFileSync(dirs.globalConfig, "", { flag: "wx" });
  return dirs;
}

// --- 原典と入力の照合 --------------------------------------------------------------------------

function readSiteFile(relativePath) {
  return readFileSync(join(SITE, ...relativePath.split("/")));
}

function verifyVendor() {
  const lockBytes = readSiteFile("vendor-lock.json");
  const lockSha = sha256(lockBytes);
  if (lockSha !== PINNED_SHA256["vendor-lock.json"]) refuse("vendor-lock.json SHA-256 differs from the frozen value.");
  const lock = JSON.parse(lockBytes.toString("utf8"));
  for (const key of ["repository", "commit", "version", "license"]) {
    if (lock[key] !== UPSTREAM[key]) refuse(`vendor-lock.json ${key} differs from the pinned upstream.`);
  }
  if (!Array.isArray(lock.files)) refuse("vendor-lock.json has no file list.");
  const listed = lock.files.map((file) => file && file.path);
  if (!deepEqual([...listed].sort(), [...VENDOR_FILES].sort())) refuse("vendor-lock.json does not list exactly the eight original files.");

  const files = lock.files.map((file) => {
    const bytes = readSiteFile(file.path);
    const actual = { path: file.path, sha256: sha256(bytes), bytes: bytes.length, git_blob_sha1: gitBlobSha1(bytes) };
    if (actual.sha256 !== file.sha256 || actual.bytes !== file.bytes || actual.git_blob_sha1 !== file.git_blob_sha1) {
      refuse(`${file.path} differs from vendor-lock.json (sha256, size or Git blob).`);
    }
    return actual;
  });
  const pkg = JSON.parse(readSiteFile("vendor/letta-code/package.json").toString("utf8"));
  if (pkg.name !== "@letta-ai/letta-code" || pkg.version !== UPSTREAM.version || pkg.license !== UPSTREAM.license) {
    refuse("vendor package.json name, version or license differs from the pin.");
  }
  return { lockSha, files };
}

function readInput(relativePath) {
  const bytes = readSiteFile(relativePath);
  const digest = sha256(bytes);
  if (digest !== PINNED_SHA256[relativePath]) refuse(`${relativePath} SHA-256 differs from the frozen value.`);
  return { digest, value: JSON.parse(bytes.toString("utf8")) };
}

const RESERVED_NAME = /^(?:con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i;

function assertFixturePath(path) {
  const ok = typeof path === "string"
    && path.length > 0
    && path.length <= 160
    && !path.startsWith("/")
    && !path.includes("\\")
    && !path.includes(":")
    && path.split("/").every((segment) => /^[A-Za-z0-9_.-]+$/.test(segment)
      && segment !== "."
      && segment !== ".."
      && segment.toLowerCase() !== ".git"
      && !segment.endsWith(".")
      && !RESERVED_NAME.test(segment));
  if (!ok) refuse(`Unsafe fixture path: ${JSON.stringify(path)}`);
  return path;
}

function fixtureTarget(repo, path) {
  assertFixturePath(path);
  const target = resolve(repo, ...path.split("/"));
  if (target === repo || !within(repo, target)) refuse(`Fixture path escapes its repository: ${path}`);
  return target;
}

function validateInputs(changes, expected) {
  if (!isPlainObject(changes) || changes.format !== INPUT_FORMAT || changes.fictional !== true) {
    refuse("input/memory-changes.json has an unexpected format.");
  }
  if (!deepEqual(changes.trusted_policy, POLICY)) refuse("The frozen fictional policy differs from the pinned policy.");
  if (!Array.isArray(changes.cases) || !deepEqual(changes.cases.map((item) => item && item.id), CASE_IDS)) {
    refuse("input/memory-changes.json must hold exactly L01-L08.");
  }
  for (const item of changes.cases) {
    if (typeof item.label !== "string" || !item.label) refuse(`${item.id}: missing label.`);
    for (const key of ["accepted_files", "proposed_files"]) {
      const files = item[key];
      if (!isPlainObject(files) || Object.keys(files).length === 0) refuse(`${item.id}: ${key} must be a file map.`);
      for (const [path, content] of Object.entries(files)) {
        assertFixturePath(path);
        if (typeof content !== "string") refuse(`${item.id}: ${key} ${path} must be text.`);
      }
    }
    const config = item.accepted_files[CONFIG_PATH];
    if (typeof config !== "string" || !deepEqual(JSON.parse(config), POLICY)) {
      refuse(`${item.id}: the accepted ${CONFIG_PATH} is not the frozen policy.`);
    }
  }
  if (!isPlainObject(expected) || !isPlainObject(expected.commit_success) || !isPlainObject(expected.reason_substrings)
    || !deepEqual(Object.keys(expected.commit_success), CASE_IDS)) {
    refuse("input/expected.json has an unexpected shape.");
  }
}

// --- 子プロセス ----------------------------------------------------------------------------------

function childEnv(dirs, date) {
  // Built from an allowlist: no GIT_DIR / GIT_INDEX_FILE / user config / home directory reaches Git or the hook.
  const env = {
    PATH: [dirname(process.execPath), process.env.PATH || ""].filter(Boolean).join(delimiter),
    HOME: dirs.home,
    USERPROFILE: dirs.home,
    XDG_CONFIG_HOME: join(dirs.home, ".config"),
    TMP: dirs.tmp,
    TEMP: dirs.tmp,
    TMPDIR: dirs.tmp,
    LC_ALL: "C",
    LANG: "C",
    LANGUAGE: "C",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: dirs.globalConfig,
    GIT_CEILING_DIRECTORIES: dirs.repos,
    GIT_TERMINAL_PROMPT: "0",
    GIT_AUTHOR_DATE: date,
    GIT_COMMITTER_DATE: date,
  };
  for (const key of ["SYSTEMROOT", "WINDIR", "COMSPEC", "PATHEXT"]) {
    if (process.env[key]) env[key] = process.env[key];
  }
  return env;
}

const FORBIDDEN_ENV = new Set([UPDATE_ENV, "GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_OBJECT_DIRECTORY", "GIT_CONFIG_PARAMETERS"]);

function run(dirs, command, args, cwd, date) {
  if (!within(dirs.root, cwd)) refuse("Refused a subprocess outside the artifact dir.");
  const env = childEnv(dirs, date);
  if (Object.keys(env).some((key) => FORBIDDEN_ENV.has(key.toUpperCase()))) refuse("Refused an unsafe child environment.");
  const result = spawnSync(command, args, {
    cwd,
    env,
    encoding: "buffer",
    shell: false,
    windowsHide: true,
    timeout: 120_000,
    maxBuffer: MAX_BUFFER,
  });
  if (result.error) throw result.error;
  return { status: result.status, signal: result.signal, stdout: result.stdout, stderr: result.stderr };
}

function git(dirs, repo, args, { date = BASELINE_DATE, allowFail = false } = {}) {
  const result = run(dirs, "git", args, repo, date);
  if (!allowFail && result.status !== 0) {
    throw new Error(`git ${args[0]} exited ${result.status}: ${result.stderr.toString("utf8").trim()}`);
  }
  return result;
}

const text = (bytes) => bytes.toString("utf8");

function revParse(dirs, repo, rev) {
  return text(git(dirs, repo, ["rev-parse", "--verify", rev]).stdout).trim();
}

function lsStage(dirs, repo) {
  return text(git(dirs, repo, ["ls-files", "--stage", "-z"]).stdout).split("\0").filter(Boolean).map((entry) => {
    const tab = entry.indexOf("\t");
    const [mode, object, stage] = entry.slice(0, tab).split(" ");
    return { mode, object, stage: Number(stage), path: entry.slice(tab + 1) };
  });
}

function lsTree(dirs, repo, rev) {
  return text(git(dirs, repo, ["ls-tree", "-r", "-z", rev]).stdout).split("\0").filter(Boolean).map((entry) => {
    const tab = entry.indexOf("\t");
    const [mode, type, object] = entry.slice(0, tab).split(" ");
    return { mode, type, object, path: entry.slice(tab + 1) };
  });
}

function stagedChanges(dirs, repo) {
  const parts = text(git(dirs, repo, ["diff", "--cached", "--no-renames", "--name-status", "-z"]).stdout).split("\0");
  const changes = [];
  for (let index = 0; index + 1 < parts.length && parts[index]; index += 2) {
    changes.push({ status: parts[index], path: parts[index + 1] });
  }
  return changes;
}

function porcelain(dirs, repo) {
  return text(git(dirs, repo, ["status", "--porcelain=v1", "-z", "--untracked-files=all", "--no-renames"]).stdout)
    .split("\0")
    .filter(Boolean)
    .map((entry) => ({ xy: entry.slice(0, 2), path: entry.slice(3) }));
}

function gitBlob(dirs, repo, spec) {
  if (git(dirs, repo, ["cat-file", "-e", spec], { allowFail: true }).status !== 0) return null;
  return git(dirs, repo, ["show", spec]).stdout;
}

// The two MemoryTreeReader objects handed to the original API: real Git index and real HEAD.
function stagedReader(dirs, repo) {
  return {
    async listFiles() {
      return lsStage(dirs, repo).map(({ path, mode }) => ({ path, mode }));
    },
    async readFile(path) {
      return gitBlob(dirs, repo, `:${path}`);
    },
  };
}

function revisionReader(dirs, repo, revision) {
  return {
    async listFiles() {
      return lsTree(dirs, repo, revision).map(({ path, mode }) => ({ path, mode }));
    },
    async readFile(path) {
      return gitBlob(dirs, repo, `${revision}:${path}`);
    },
  };
}

// --- 読みやすい理由（実際に返った行から作る） --------------------------------------------------------

function reportedErrors(stderr) {
  return stderr.split(/\r?\n/).filter((line) => /^ {2}\S/.test(line)).map((line) => line.slice(2));
}

function explainLine(line) {
  let match;
  if (line === "MEMORY.md: root memory index is required for MemFS v2") {
    return "ルートの案内 MEMORY.md がありません。";
  }
  if ((match = /^(.+): missing required index (.+)$/.exec(line))) {
    return `${match[1]} を記憶として読むための案内 ${match[2]} がありません。`;
  }
  if ((match = /^core memory: (\d+) characters exceeds (\d+) from maxCoreMemoryCharacters$/.exec(line))) {
    return `ルート直下の Markdown（毎回読み込む記憶）の合計が ${match[1]} 文字で、上限の ${match[2]} 文字を超えています。`;
  }
  if ((match = /^(.+): (\d+) characters exceeds (\d+) from (.+)$/.exec(line))) {
    return `${match[1]} は ${match[2]} 文字で、1ファイルの上限 ${match[3]} 文字を超えています。`;
  }
  if ((match = /^(.+): depth (\d+) exceeds maxDepth (\d+)$/.exec(line))) {
    return `${match[1]} はルートから ${match[2]} 階層下にあり、上限の ${match[3]} 階層を超えています。`;
  }
  if ((match = /^(.+): read-only file cannot be created, changed or removed$/.exec(line))) {
    return `${match[1]} は保護ファイル（readOnlyFiles）なので、作成・変更・削除できません。`;
  }
  if ((match = /^(.+) is protected and requires human approval to change$/.exec(line))) {
    return `${match[1]}（上限の設定）は保護されていて、人の承認なしには変えられません。`;
  }
  return `原典の検査が返した理由：${line}`;
}

function textStats(value) {
  return { code_points: [...value].length, utf16_units: value.length, utf8_bytes: Buffer.byteLength(value, "utf8") };
}

// SKILL.md「9. Verify」の foo.md と foo/ を並べない条件を、stage のパスに当てはめる（原典のコードではない）。
function stemConflicts(paths) {
  const directories = new Set();
  for (const path of paths) {
    const parts = path.split("/");
    for (let index = 1; index < parts.length; index++) directories.add(parts.slice(0, index).join("/"));
  }
  return paths.filter((path) => path.endsWith(".md") && directories.has(path.slice(0, -3))).sort();
}

const short = (commit) => commit.slice(0, 7);

// --- 1件の実行 --------------------------------------------------------------------------------

async function runCase(item, api, scriptBytes, dirs, check) {
  const { id } = item;
  const accepted = item.accepted_files;
  const proposed = item.proposed_files;
  const repo = join(dirs.repos, id);
  if (existsSync(repo)) refuse(`${id}: repository folder already exists.`);
  mkdirSync(repo);

  // New private repository with local-only settings.
  git(dirs, repo, ["init", "-q", "-b", "main", `--template=${dirs.template}`]);
  const toplevel = text(git(dirs, repo, ["rev-parse", "--show-toplevel"]).stdout).trim();
  const gitDir = text(git(dirs, repo, ["rev-parse", "--git-dir"]).stdout).trim();
  if (relative(realpathSync(resolve(toplevel)), realpathSync(repo)) !== "" || gitDir !== ".git") {
    refuse(`${id}: Git did not resolve the new private repository.`);
  }
  check(`${id}: 新しい非公開リポジトリの toplevel と .git が一致`, true);
  for (const [key, value] of [
    ["core.autocrlf", "false"],
    ["user.name", GIT_USER.name],
    ["user.email", GIT_USER.email],
    ["commit.gpgsign", "false"],
    ["core.hooksPath", ".git/hooks"],
  ]) {
    git(dirs, repo, ["config", "--local", key, value]);
  }
  const hooksDir = join(repo, ".git", "hooks");
  if (!existsSync(hooksDir)) mkdirSync(hooksDir);
  const hooksEmpty = readdirSync(hooksDir).length === 0;
  check(`${id}: 基準の commit の前の hook フォルダーが空`, hooksEmpty);
  const localConfig = text(git(dirs, repo, ["config", "--local", "--list"]).stdout).split(/\r?\n/).filter(Boolean);

  // Baseline commit from accepted_files (no hook installed yet).
  const acceptedPaths = Object.keys(accepted).sort();
  for (const path of acceptedPaths) {
    const target = fixtureTarget(repo, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, Buffer.from(accepted[path], "utf8"), { flag: "wx" });
  }
  git(dirs, repo, ["add", "--", ...acceptedPaths]);
  const baselineCommit = git(dirs, repo, ["commit", "-q", "-m", BASELINE_MESSAGE], { date: BASELINE_DATE });
  const baseline = {
    commit: revParse(dirs, repo, "HEAD"),
    tree: revParse(dirs, repo, "HEAD^{tree}"),
    exit_code: baselineCommit.status,
    files: lsTree(dirs, repo, "HEAD"),
  };
  const baselineMatches = deepEqual(baseline.files.map((file) => file.path).sort(), acceptedPaths)
    && acceptedPaths.every((path) => {
      const bytes = gitBlob(dirs, repo, `HEAD:${path}`);
      return bytes !== null && bytes.equals(Buffer.from(accepted[path], "utf8"));
    });
  check(`${id}: 基準の commit の内容が accepted_files とバイト一致`, baselineMatches);

  // Trusted initial policy: read from the baseline commit by the original parser.
  const trustedConfig = api.parseMemoryConstraintsConfig(text(gitBlob(dirs, repo, `HEAD:${CONFIG_PATH}`)));
  check(`${id}: 基準の ${CONFIG_PATH} を原典の parse で読んだ方針が固定方針と一致`, deepEqual(trustedConfig, POLICY));

  // Install the original validator unchanged, and the minimal hook that calls it.
  const validatorPath = join(repo, ".git", VALIDATOR_NAME);
  const hookPath = join(hooksDir, "pre-commit");
  writeFileSync(validatorPath, scriptBytes, { flag: "wx" });
  writeFileSync(hookPath, HOOK_TEXT, { flag: "wx", mode: 0o755 });
  chmodSync(hookPath, 0o755);
  const validatorBytes = readFileSync(validatorPath);
  const hookBytes = readFileSync(hookPath);
  check(`${id}: 書いた検査スクリプトが原典の MEMORY_CONSTRAINTS_VALIDATOR_SCRIPT とバイト一致`, validatorBytes.equals(scriptBytes));
  check(`${id}: pre-commit が最小の2行と一致`, hookBytes.equals(Buffer.from(HOOK_TEXT, "utf8")));

  // Apply proposed_files: remove only this case's own accepted files that are absent, then stage explicit names.
  const removed = acceptedPaths.filter((path) => !Object.hasOwn(proposed, path));
  for (const path of removed) {
    const target = fixtureTarget(repo, path);
    if (!lstatSync(target).isFile()) refuse(`${id}: ${path} is not a regular fixture file.`);
    unlinkSync(target);
    git(dirs, repo, ["rm", "--cached", "--quiet", "--", path]);
  }
  const written = Object.keys(proposed).sort().filter((path) => accepted[path] !== proposed[path]);
  for (const path of written) {
    const target = fixtureTarget(repo, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, Buffer.from(proposed[path], "utf8"));
  }
  if (written.length) git(dirs, repo, ["add", "--", ...written]);

  const headBefore = revParse(dirs, repo, "HEAD");
  const stageBefore = lsStage(dirs, repo);
  const changesBefore = stagedChanges(dirs, repo);
  const statusBefore = porcelain(dirs, repo);
  const proposedPaths = Object.keys(proposed).sort();
  const stageMatches = deepEqual(stageBefore.map((entry) => entry.path).sort(), proposedPaths)
    && stageBefore.every((entry) => entry.stage === 0)
    && proposedPaths.every((path) => {
      const bytes = gitBlob(dirs, repo, `:${path}`);
      return bytes !== null && bytes.equals(Buffer.from(proposed[path], "utf8"));
    });
  check(`${id}: stage の内容が proposed_files とバイト一致`, stageMatches);
  check(`${id}: commit の前の HEAD が基準の commit`, headBefore === baseline.commit);

  // Layer 1: original tree API, trusted initial policy, real index and real HEAD.
  const tree = { errors: null, thrown: null };
  try {
    tree.errors = await api.validateMemoryTreeConstraints(stagedReader(dirs, repo), {
      config: trustedConfig,
      layout: "root-marker",
      requireRootMarker: true,
      acceptedTree: revisionReader(dirs, repo, headBefore),
    });
  } catch (error) {
    tree.thrown = error instanceof Error ? error.message : String(error);
  }

  // The proposed policy file, parsed by the original parser (recorded only; the tree API keeps the trusted policy).
  const stagedConfig = { differs_from_trusted: false, parsed: null, error: null };
  const stagedConfigBytes = gitBlob(dirs, repo, `:${CONFIG_PATH}`);
  if (stagedConfigBytes !== null) {
    stagedConfig.differs_from_trusted = stagedConfigBytes.toString("utf8") !== accepted[CONFIG_PATH];
    try {
      stagedConfig.parsed = api.parseMemoryConstraintsConfig(text(stagedConfigBytes));
    } catch (error) {
      stagedConfig.error = error instanceof Error ? error.message : String(error);
    }
  }

  // Layer 2: original frontmatter API on every projected non-skills Markdown file.
  const memoryFormat = api.detectMemoryFormat(repo, true);
  const allPaths = new Set(stageBefore.map((entry) => entry.path));
  const markdownPaths = [...allPaths].filter((path) => path.endsWith(".md")).sort();
  const projectedPaths = markdownPaths.filter((path) => api.isProjectedMemoryPath(path, allPaths, memoryFormat));
  const frontmatterFormat = memoryFormat === "memfs-v2" ? "memfs-v2" : "legacy";
  const frontmatter = projectedPaths.map((path) => {
    const previous = gitBlob(dirs, repo, `${headBefore}:${path}`);
    const errors = api.validateMemoryFileFrontmatter({
      path,
      content: text(gitBlob(dirs, repo, `:${path}`)),
      previousContent: previous === null ? null : text(previous),
      format: frontmatterFormat,
    });
    return { path, format: frontmatterFormat, previous_present: previous !== null, errors };
  });

  // Layer 3a: the original validator CLI, run directly once.
  const cliRun = run(dirs, process.execPath, [...CLI_ARGS], repo, ATTEMPT_DATE);
  const cli = {
    command: CLI_COMMAND,
    exit_code: cliRun.status,
    signal: cliRun.signal,
    stdout: text(cliRun.stdout),
    stderr: text(cliRun.stderr),
    stdout_sha256: sha256(cliRun.stdout),
    stderr_sha256: sha256(cliRun.stderr),
  };
  cli.reported_errors = reportedErrors(cli.stderr);
  cli.head_unchanged = revParse(dirs, repo, "HEAD") === headBefore;
  cli.stage_unchanged = deepEqual(lsStage(dirs, repo), stageBefore);
  check(`${id}: 原典CLIの直接実行の後も HEAD と stage が同じ`, cli.head_unchanged && cli.stage_unchanged);

  // Layer 3b: a real git commit, which runs the same original validator as the pre-commit hook.
  const commitMessage = `Fixture attempt ${id}`;
  const commitRun = git(dirs, repo, ["commit", "-m", commitMessage], { date: ATTEMPT_DATE, allowFail: true });
  const headAfter = revParse(dirs, repo, "HEAD");
  const stageAfter = lsStage(dirs, repo);
  const changesAfter = stagedChanges(dirs, repo);
  const statusAfter = porcelain(dirs, repo);
  const committed = commitRun.status === 0;
  const parentAfter = committed ? revParse(dirs, repo, "HEAD^") : null;
  const headFilesAfter = lsTree(dirs, repo, "HEAD");
  const gitCommit = {
    command: `git commit -m "${commitMessage}"`,
    exit_code: commitRun.status,
    signal: commitRun.signal,
    stdout: text(commitRun.stdout),
    stderr: text(commitRun.stderr),
    stdout_sha256: sha256(commitRun.stdout),
    stderr_sha256: sha256(commitRun.stderr),
    head_before: headBefore,
    head_after: headAfter,
    head_changed: headAfter !== headBefore,
    parent_after: parentAfter,
    stage_before: stageBefore,
    stage_after: stageAfter,
    stage_retained: !committed && deepEqual(stageAfter, stageBefore) && deepEqual(changesAfter, changesBefore) && changesAfter.length > 0,
    staged_changes_before: changesBefore,
    staged_changes_after: changesAfter,
    status_before: statusBefore,
    status_after: statusAfter,
  };
  gitCommit.reported_errors = reportedErrors(gitCommit.stderr);

  check(`${id}: 原典CLIの終了コード0と git commit の成功が一致`, (cli.exit_code === 0) === committed);
  check(`${id}: 原典CLIと pre-commit が同じ理由の行を出した`, deepEqual(cli.reported_errors, gitCommit.reported_errors));
  if (committed) {
    const headTree = headFilesAfter.map(({ mode, object, path }) => ({ mode, object, path }));
    const staged = stageBefore.map(({ mode, object, path }) => ({ mode, object, path }));
    check(`${id}: 成功後は HEAD が進み、親が基準の commit`, gitCommit.head_changed && parentAfter === baseline.commit);
    check(`${id}: 成功後の HEAD の木が commit 前の stage と一致`, deepEqual(headTree, staged));
    check(`${id}: 成功後は stage と作業ツリーに変更が残らない`, changesAfter.length === 0 && statusAfter.length === 0);
  } else {
    check(`${id}: 止まった後も HEAD は基準の commit のまま`, !gitCommit.head_changed && headAfter === baseline.commit);
    check(`${id}: 止まった後も stage の変更がそのまま残る`, gitCommit.stage_retained);
    check(`${id}: 止まった後の HEAD の内容は accepted_files のまま`, deepEqual(headFilesAfter, baseline.files));
  }

  const unicodeFiles = {};
  for (const path of proposedPaths.filter((name) => name.endsWith(".md"))) unicodeFiles[path] = textStats(proposed[path]);
  const rootMarkdownCodePoints = proposedPaths
    .filter((path) => path.endsWith(".md") && !path.includes("/"))
    .reduce((sum, path) => sum + unicodeFiles[path].code_points, 0);

  const reasonLines = gitCommit.reported_errors;
  let reasonJa;
  if (committed) {
    reasonJa = `commit が作られました。原典の検査は理由を返していません。HEAD は ${short(headBefore)} から ${short(headAfter)} へ進み、stage に残った変更は${changesAfter.length === 0 ? "ありません" : `${changesAfter.length}件あります`}。`;
  } else {
    const explained = reasonLines.length
      ? reasonLines.map(explainLine).join(" ")
      : `pre-commit が終了コード ${commitRun.status} で止めました（理由の行はありません。stderr を確認してください）。`;
    const headText = gitCommit.head_changed
      ? `HEAD は ${short(headBefore)} から ${short(headAfter)} へ変わりました`
      : `HEAD は ${short(headAfter)} のまま変わらず`;
    const stageText = gitCommit.stage_retained
      ? `stage の${changesAfter.length}件の変更は残っています。stage に残った変更は、まだ記憶として保存されていません。`
      : "stage の変更は残っていません。";
    reasonJa = `commit は止まりました。${explained} ${headText}、${stageText}`;
  }

  return {
    id,
    label: item.label,
    input: { accepted_files: accepted, proposed_files: proposed },
    repository: {
      directory: `repos/${id}`,
      branch: "main",
      hooks_path: ".git/hooks",
      hooks_dir_empty_before_baseline: hooksEmpty,
      local_config: localConfig,
      validator: { path: VALIDATOR_REL, sha256: sha256(validatorBytes), bytes: validatorBytes.length },
      hook: { path: HOOK_REL, text: HOOK_TEXT, sha256: sha256(hookBytes) },
    },
    baseline,
    change: { removed, written, staged_name_status: changesBefore },
    unicode: { files: unicodeFiles, root_markdown_code_points: rootMarkdownCodePoints },
    skill_structure: {
      note: "initializing-memory SKILL.md 9. Verify の「foo.md と foo/ を並べない」条件を stage のパスへ当てはめた 八百万図AIツールボックス の照合。原典のコードではない。",
      stem_conflicts: stemConflicts([...allPaths]),
    },
    api: {
      trusted_config: trustedConfig,
      trusted_config_source: `HEAD:${CONFIG_PATH}（基準の commit）`,
      layout: "root-marker",
      require_root_marker: true,
      accepted_tree: `HEAD ${headBefore}`,
      tree,
      staged_config: stagedConfig,
      memory_format: memoryFormat,
      markdown_paths: markdownPaths,
      projected_paths: projectedPaths,
      not_projected_paths: markdownPaths.filter((path) => !projectedPaths.includes(path)),
      frontmatter,
    },
    cli,
    git_commit: gitCommit,
    committed,
    head_files_after: headFilesAfter,
    reason_ja: reasonJa,
    reason_basis: committed
      ? "git commit の終了コード0、HEAD の変化、空の stage"
      : "git commit の stderr に原典の pre-commit が出した理由の行、終了コード、HEAD と stage",
  };
}

// --- 結果の照合 ---------------------------------------------------------------------------------

const byId = (results) => new Map(results.map((result) => [result.id, result]));

function caseChecks(results, check) {
  const map = byId(results);
  for (const result of results) {
    const frontmatterErrors = result.api.frontmatter.flatMap((entry) => entry.errors);
    check(`${result.id}: frontmatter API のエラーが投影された全ファイルで空`, result.api.frontmatter.length > 0 && frontmatterErrors.length === 0);
    check(`${result.id}: 検査APIが例外を出さずエラー一覧を返した`, Array.isArray(result.api.tree.errors) && result.api.tree.thrown === null);
    check(`${result.id}: 記憶の形式が memfs-v2`, result.api.memory_format === "memfs-v2");
    check(`${result.id}: SKILL の「foo.md と foo/」の重なりがない`, result.skill_structure.stem_conflicts.length === 0);
    if (result.id !== "L08") {
      check(`${result.id}: 検査APIのエラーと原典CLIの理由の行が一致`, deepEqual(result.api.tree.errors, result.cli.reported_errors));
    }
  }

  for (const id of ["L01", "L03"]) {
    const result = map.get(id);
    check(`${id}: 検査APIのエラーが空、原典CLIの stdout・stderr が空`, result.api.tree.errors.length === 0 && result.cli.stdout === "" && result.cli.stderr === "");
  }

  const l02 = map.get("L02");
  const l03 = map.get("L03");
  const index = "bookclub/MEMORY.md";
  const l02Proposed = l02.input.proposed_files;
  const l03Proposed = l03.input.proposed_files;
  const sameOtherwise = deepEqual(Object.fromEntries(Object.entries(l03Proposed).filter(([path]) => path !== index)), l02Proposed);
  check("L02/L03: 違いは bookclub/MEMORY.md だけで、L03 はそれを基準と同じ内容で残す", !Object.hasOwn(l02Proposed, index)
    && sameOtherwise && l03Proposed[index] === l03.input.accepted_files[index] && deepEqual(l02.input.accepted_files, l03.input.accepted_files));
  check("L02: stage の変更に bookclub/MEMORY.md の削除がある", l02.change.staged_name_status.some((entry) => entry.status === "D" && entry.path === index));
  const l02Stage = l02.git_commit.stage_before.map(({ mode, object, path }) => ({ mode, object, path }));
  const l03Stage = l03.git_commit.stage_before.map(({ mode, object, path }) => ({ mode, object, path }));
  check("L02/L03: L03 の stage は L02 の stage に同じ blob の bookclub/MEMORY.md を足したもの", deepEqual(l03Stage.filter((entry) => entry.path !== index), l02Stage)
    && l03Stage.some((entry) => entry.path === index && entry.object === l03.baseline.files.find((file) => file.path === index)?.object));
  check("L02: bookclub/ の詳細は投影されず、L03 では投影される", !l02.api.projected_paths.some((path) => path.startsWith("bookclub/"))
    && l03.api.projected_paths.includes("bookclub/schedule.md") && l03.api.projected_paths.includes("bookclub/reading.md"));
  check("L02 は止まり、L03 は commit された", !l02.committed && l03.committed);

  const l04 = map.get("L04");
  const l04Stats = l04.unicode.files["bookclub/schedule.md"];
  const l04Error = l04.api.tree.errors.find((line) => line.startsWith("bookclub/schedule.md: ") && line.includes(" characters exceeds "));
  check("L04: bookclub/schedule.md は 901 コードポイントで、UTF-8 のバイト数とは違う", l04Stats.code_points === 901 && l04Stats.utf8_bytes > 901);
  check("L04: 検査APIの文字数が独立に数えたコードポイントと一致", Boolean(l04Error) && Number(/: (\d+) characters/.exec(l04Error)?.[1]) === l04Stats.code_points);

  const l05 = map.get("L05");
  check("L05: bookclub/archive/2025/notes.md の深さ3を検査APIが返した", l05.api.tree.errors.includes("bookclub/archive/2025/notes.md: depth 3 exceeds maxDepth 2"));
  check("L05: 深い階層にも各フォルダーの MEMORY.md があり、投影される", l05.api.projected_paths.includes("bookclub/archive/2025/notes.md"));

  const l06 = map.get("L06");
  const l06Error = l06.api.tree.errors.find((line) => line.startsWith("core memory: "));
  check("L06: ルート直下の Markdown の合計は独立に数えて 1201 コードポイント", l06.unicode.root_markdown_code_points === 1201);
  check("L06: 検査APIの合計文字数が独立の合計と一致", Boolean(l06Error) && Number(/^core memory: (\d+) characters/.exec(l06Error)?.[1]) === l06.unicode.root_markdown_code_points);

  const l07 = map.get("L07");
  check("L07: 検査APIが persona.md の保護を返した", l07.api.tree.errors.includes("persona.md: read-only file cannot be created, changed or removed"));

  const l08 = map.get("L08");
  check("L08: 初期方針の検査APIはエラーなし、それでも原典CLIは止めた", l08.api.tree.errors.length === 0 && l08.cli.exit_code !== 0 && !l08.committed);
  check("L08: stage の設定は原典の parse で読め、maxFileCharacters は 1100", l08.api.staged_config.differs_from_trusted === true
    && l08.api.staged_config.error === null && l08.api.staged_config.parsed?.maxFileCharacters === 1100);
  check("L08: 原典CLIの理由に設定の保護の行がある", l08.cli.reported_errors.includes(`${CONFIG_PATH} is protected and requires human approval to change`));
  for (const result of results.filter((entry) => entry.id !== "L08")) {
    check(`${result.id}: stage の設定は基準と同じ`, result.api.staged_config.differs_from_trusted === false);
  }

  const baselineTrees = new Set(results.map((result) => result.baseline.tree));
  check("8件の基準の commit の木が同じ", baselineTrees.size === 1);
}

function oracleComparison(results, expected, check) {
  const map = byId(results);
  const commitSuccess = CASE_IDS.map((id) => {
    const actual = map.get(id).committed;
    const match = actual === expected.commit_success[id];
    check(`${id}: commit の成否が実行前の期待と一致`, match);
    return { id, expected: expected.commit_success[id], actual, match };
  });
  const reasonSubstrings = Object.entries(expected.reason_substrings).map(([id, substring]) => {
    const result = map.get(id);
    const foundInGit = Boolean(result) && result.git_commit.stderr.includes(substring);
    const foundInCli = Boolean(result) && result.cli.stderr.includes(substring);
    check(`${id}: 実行前に決めた理由の一部が git commit と原典CLIの stderr にある`, foundInGit && foundInCli);
    return { id, substring, found_in_git_commit_stderr: foundInGit, found_in_cli_stderr: foundInCli };
  });
  const committed = results.filter((result) => result.committed).length;
  const actualCounts = { total: results.length, committed, blocked: results.length - committed };
  const expectedCounts = { total: expected.case_count, committed: expected.successful_commits, blocked: expected.blocked_commits };
  check("件数・成功・停止の数が実行前の期待と一致", deepEqual(actualCounts, expectedCounts));
  check("実行前の修復の組が L02 と L03", deepEqual(expected.repair_pair, ["L02", "L03"]));
  return {
    source: "input/expected.json（実行の前に固定。実結果を得た後の照合だけに使い、結果や理由の作成には使っていない）",
    commit_success: commitSuccess,
    reason_substrings: reasonSubstrings,
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
  writeFileSync(join(dirs.root, name), `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
}

// --- 本体 -----------------------------------------------------------------------------------

async function main() {
  const artifactArg = parseArgs(process.argv.slice(2));
  const outputPath = join(SITE, ...OUTPUT_REL.split("/"));
  if (existsSync(outputPath)) {
    refuse(`${OUTPUT_REL} already exists and is never overwritten. In a copied folder, rename the captured record first.`);
  }
  if (Object.keys(process.env).some((key) => key.toUpperCase() === UPDATE_ENV)) {
    refuse(`${UPDATE_ENV} is set. This example never approves policy changes; unset it.`);
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
  const log = [];

  try {
    const vendor = verifyVendor();
    check("原典8ファイルの SHA-256・バイト数・Git blob が vendor-lock.json と一致", true);
    check("vendor-lock.json の SHA-256 と固定版（repository・commit・version・license）が一致", true);
    const changesInput = readInput("input/memory-changes.json");
    const expectedInput = readInput("input/expected.json");
    check("入力2ファイルの SHA-256 が実行前に固定した値と一致", true);
    validateInputs(changesInput.value, expectedInput.value);
    check("入力が L01〜L08 の8件で、パスが安全な相対パス", true);

    const gitVersionRun = run(dirs, "git", ["--version"], dirs.tmp, BASELINE_DATE);
    const gitVersion = text(gitVersionRun.stdout).trim();
    const versionMatch = /^git version (\d+)\.(\d+)/.exec(gitVersion);
    if (gitVersionRun.status !== 0 || !versionMatch || Number(versionMatch[1]) * 1000 + Number(versionMatch[2]) < 2032) {
      refuse("Git 2.32 or newer is required (init -b and GIT_CONFIG_GLOBAL).");
    }

    // Only now: register the resolver and import the original TypeScript, unmodified.
    const resolver = registerVendorResolver(VENDOR);
    const url = (...parts) => pathToFileURL(join(VENDOR, "src", ...parts)).href;
    const constraints = await import(url("memory-constraints.ts"));
    const frontmatterModule = await import(url("memory-frontmatter.ts"));
    const validatorModule = await import(url("agent", "memory-constraints.ts"));
    const formatModule = await import(url("agent", "memory-format.ts"));
    const api = {
      parseMemoryConstraintsConfig: constraints.parseMemoryConstraintsConfig,
      validateMemoryTreeConstraints: constraints.validateMemoryTreeConstraints,
      validateMemoryFileFrontmatter: constraints.validateMemoryFileFrontmatter,
      detectMemoryFormat: formatModule.detectMemoryFormat,
      isProjectedMemoryPath: formatModule.isProjectedMemoryPath,
    };
    for (const [name, value] of Object.entries(api)) {
      if (typeof value !== "function") refuse(`Original export ${name} is not a function.`);
    }
    const script = validatorModule.MEMORY_CONSTRAINTS_VALIDATOR_SCRIPT;
    if (typeof script !== "string" || !script.length) refuse("MEMORY_CONSTRAINTS_VALIDATOR_SCRIPT is not a string.");
    const scriptBytes = Buffer.from(script, "utf8");

    check("validateMemoryFileFrontmatter は memory-constraints.ts の再export と memory-frontmatter.ts で同じ関数", constraints.validateMemoryFileFrontmatter === frontmatterModule.validateMemoryFileFrontmatter);
    check("検査スクリプトに、APIと同じ parseMemoryConstraintsConfig の原典がそのまま入っている", script.includes(`const parseMemoryConstraintsConfig = ${constraints.parseMemoryConstraintsConfig.toString()};`));
    check("検査スクリプトに、APIと同じ validateMemoryTreeConstraints の原典がそのまま入っている", script.includes(`const validateMemoryTreeConstraints = ${constraints.validateMemoryTreeConstraints.toString()};`));
    check("検査スクリプトの既定値が原典の DEFAULT_MEMORY_CONSTRAINTS_CONFIG", script.includes(`const DEFAULT_CONFIG = ${JSON.stringify(constraints.DEFAULT_MEMORY_CONSTRAINTS_CONFIG)};`));
    check("原典の設定ファイル名・スクリプト名・承認の環境変数名が想定どおり", constraints.MEMORY_CONSTRAINTS_CONFIG_PATH === CONFIG_PATH
      && validatorModule.MEMORY_CONSTRAINTS_VALIDATOR_NAME === VALIDATOR_NAME && validatorModule.MEMORY_CONSTRAINTS_UPDATE_ENV === UPDATE_ENV);
    check(`子プロセスの環境に ${UPDATE_ENV} を入れていない`, !Object.keys(childEnv(dirs, ATTEMPT_DATE)).some((key) => key.toUpperCase() === UPDATE_ENV));
    check("固定方針は原典の既定値と重ねても変わらない（3つの上限を自分で持つ）", deepEqual({ ...constraints.DEFAULT_MEMORY_CONSTRAINTS_CONFIG, ...POLICY }, POLICY));
    check("固定方針は原典の既定値より厳しい", POLICY.maxFileCharacters < constraints.DEFAULT_MEMORY_CONSTRAINTS_CONFIG.maxFileCharacters
      && POLICY.maxCoreMemoryCharacters < constraints.DEFAULT_MEMORY_CONSTRAINTS_CONFIG.maxCoreMemoryCharacters);

    const results = [];
    for (const item of changesInput.value.cases) {
      const result = await runCase(item, api, scriptBytes, dirs, check);
      results.push(result);
      log.push(`${result.id} ${result.committed ? "committed" : "blocked"} cli=${result.cli.exit_code} commit=${result.git_commit.exit_code}`);
    }

    const resolutions = resolver.resolutions.map((entry) => ({ ...entry }));
    check("読み込み補助が解決したのは原典 src の .ts だけ", resolutions.length > 0
      && resolutions.every((entry) => entry.from.startsWith("vendor/letta-code/src/") && entry.to.startsWith("vendor/letta-code/src/") && entry.to.endsWith(".ts")));
    check("「@/」と拡張子なし相対 import の両方を原典のまま解決した", resolutions.some((entry) => entry.specifier.startsWith("@/"))
      && resolutions.some((entry) => entry.specifier.startsWith("./")));

    caseChecks(results, check);
    const oracle = oracleComparison(results, expectedInput.value, check);

    const after = verifyVendor();
    check("実行の後も原典8ファイルとロックが同じ", deepEqual(after, vendor));

    const committedCount = results.filter((result) => result.committed).length;
    const record = {
      format: RECORD_FORMAT,
      notice: "架空の読書会の記憶と初期方針（実行前に固定）を使った、固定版 Letta Code の記憶検査の実行記録。エージェントとの会話・モデルの推論・Cloud・同期・/init・個人の記憶は使っていない。",
      upstream: { ...UPSTREAM, vendor_lock_sha256: vendor.lockSha, files: vendor.files },
      input_sha256: {
        "input/memory-changes.json": changesInput.digest,
        "input/expected.json": expectedInput.digest,
        "vendor-lock.json": vendor.lockSha,
      },
      trusted_policy: changesInput.value.trusted_policy,
      runtime: {
        node: process.version,
        typescript: process.features.typescript,
        git: gitVersion,
        platform: process.platform,
        arch: process.arch,
        packages_installed: 0,
        module_resolution: resolutions,
        child_env_keys: Object.keys(childEnv(dirs, ATTEMPT_DATE)).sort(),
      },
      validator_script: {
        source: "vendor/letta-code/src/agent/memory-constraints.ts の MEMORY_CONSTRAINTS_VALIDATOR_SCRIPT（実行時の文字列をそのまま書いたもの）",
        written_to: VALIDATOR_REL,
        hook: { path: HOOK_REL, text: HOOK_TEXT },
        sha256: sha256(scriptBytes),
        bytes: scriptBytes.length,
      },
      api_entrypoints: [
        { name: "parseMemoryConstraintsConfig", source: "vendor/letta-code/src/memory-constraints.ts" },
        { name: "validateMemoryTreeConstraints", source: "vendor/letta-code/src/memory-constraints.ts" },
        { name: "validateMemoryFileFrontmatter", source: "vendor/letta-code/src/memory-frontmatter.ts（memory-constraints.ts から再export）" },
        { name: "detectMemoryFormat", source: "vendor/letta-code/src/agent/memory-format.ts" },
        { name: "isProjectedMemoryPath", source: "vendor/letta-code/src/agent/memory-format.ts" },
        { name: "MEMORY_CONSTRAINTS_VALIDATOR_SCRIPT", source: "vendor/letta-code/src/agent/memory-constraints.ts" },
      ],
      results,
      summary: { total: results.length, committed: committedCount, blocked: results.length - committedCount },
      oracle_comparison: oracle,
    };

    const leaked = containsPrivatePath(JSON.stringify(record), privatePathNeedles(dirs, artifactArg));
    check("記録に手元の絶対パスが含まれない", !leaked);

    const failed = checks.filter((entry) => !entry.passed);
    record.verification = { status: failed.length === 0 ? "passed" : "failed", checks, total: checks.length };
    if (failed.length) {
      writePrivate(dirs, "failure-report.json", {
        status: "failed",
        failed_checks: failed.map((entry) => entry.name),
        absolute_path_found: leaked,
        record,
      });
      writeFileSync(join(dirs.root, "run-log.txt"), `${log.join("\n")}\nfailed checks: ${failed.length}/${checks.length}\n`, { flag: "wx" });
      process.stderr.write(`letta-code-example: ${failed.length} of ${checks.length} checks failed. No public record was written.\n`);
      if (leaked) process.stderr.write("letta-code-example: an absolute path appeared in the record; kept privately for review.\n");
      for (const entry of failed) process.stderr.write(`  failed: ${entry.name}\n`);
      process.exitCode = 1;
      return;
    }

    const serialized = `${JSON.stringify(record, null, 2)}\n`;
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(join(dirs.root, "memory-runs.json"), serialized, { flag: "wx" });
    writeFileSync(outputPath, serialized, { flag: "wx" });
    const publicDigest = sha256(readFileSync(outputPath));
    const privateDigest = sha256(readFileSync(join(dirs.root, "memory-runs.json")));
    writeFileSync(join(dirs.root, "run-log.txt"), `${log.join("\n")}\nchecks: ${checks.length}/${checks.length}\nrecord sha256: ${publicDigest}\n`, { flag: "wx" });
    if (publicDigest !== privateDigest) {
      process.stderr.write("letta-code-example: the public and private records differ.\n");
      process.exitCode = 1;
      return;
    }

    for (const result of results) {
      const first = result.git_commit.reported_errors[0];
      process.stdout.write(`${result.id} ${result.committed ? "committed" : "blocked  "} ${first ?? ""}\n`.replace(/ +\n$/, "\n"));
    }
    process.stdout.write(`committed ${record.summary.committed} / blocked ${record.summary.blocked} / checks ${checks.length} passed\n`);
    process.stdout.write(`wrote ${OUTPUT_REL} (sha256 ${publicDigest})\n`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    writePrivate(dirs, "failure-report.json", { status: "error", message, checks });
    throw error;
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`letta-code-example: stopped. ${message}\n`);
  process.exitCode = error instanceof Refusal ? 2 : 1;
});
