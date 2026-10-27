// 八百万図AIツールボックス — OpenHands Agent Canvas 作例の読み込み補助。MIT License, Copyright (c) 2026 Studio Yebisu.
// 固定版の原典 .ts を Node の型除去でそのまま読み込むため、解決だけを補う。
//   ・原典（vendor/openhands）の中からの「#/名前」 → vendor/openhands/src/名前.ts
//   ・原典の中からの拡張子なし相対 import（./x, ../x） → 同じ原典フォルダー内の x.ts
//   ・原典の中からの「@openhands/extensions/automations」 → 同梱の vendor/extensions/automations/index.js（実物）
//   ・同梱パッケージ（vendor/extensions）の中の相対 import → Node の既定の解決。ただしパッケージの外へは出さない
// 原典・同梱パッケージからのそれ以外の指定（導入済みの npm パッケージなど）は拒否する。load フックは登録せず、
// ソースを書き換えたり、関数や manifest を別の実装へ差し替えたりはしない。
import { existsSync, statSync } from "node:fs";
import { registerHooks } from "node:module";
import { dirname, extname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const PACKAGE_SUBPATH = "@openhands/extensions/automations";

function inside(root, target) {
  const rel = relative(root, target);
  return rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);
}

function isRelative(specifier) {
  return specifier.startsWith("./") || specifier.startsWith("../");
}

function safeRequest(request) {
  return typeof request === "string"
    && request.length > 0
    && !request.includes("\\")
    && !request.includes("\0")
    && !request.includes("?")
    && !request.includes("#", 1)
    && extname(request) === "";
}

function fileParent(parentURL) {
  return typeof parentURL === "string" && parentURL.startsWith("file:") ? fileURLToPath(parentURL) : null;
}

/**
 * Register the resolver for the two vendor roots. Returns the list of resolutions it made,
 * as site-relative names only, so the runner can record them without private paths.
 */
export function registerVendorResolver({ site, openhands, extensions }) {
  if (typeof registerHooks !== "function") {
    throw new Error("node:module registerHooks is unavailable; run with Node 24.");
  }
  const siteRoot = resolve(site);
  const ohRoot = resolve(openhands);
  const ohSrc = resolve(ohRoot, "src");
  const extRoot = resolve(extensions);
  const packageEntry = resolve(extRoot, "automations", "index.js");
  const resolutions = [];
  const label = (path) => relative(siteRoot, path).split(sep).join("/");

  if (!existsSync(packageEntry) || !statSync(packageEntry).isFile()) {
    throw new Error(`Vendor package entry not found: ${label(packageEntry)}`);
  }

  function typescriptFile(base, request, boundary) {
    const target = resolve(base, `${request}.ts`);
    if (!inside(boundary, target)) {
      throw new Error(`Refused vendor import outside ${label(boundary)}: ${request}`);
    }
    if (!existsSync(target) || !statSync(target).isFile()) {
      throw new Error(`Vendor module not found: ${request}`);
    }
    return target;
  }

  registerHooks({
    resolve(specifier, context, nextResolve) {
      const parentPath = fileParent(context.parentURL);
      const fromOpenhands = parentPath !== null && inside(ohRoot, parentPath);
      const fromExtensions = parentPath !== null && inside(extRoot, parentPath);
      if (!fromOpenhands && !fromExtensions) return nextResolve(specifier, context);

      if (specifier.startsWith("node:")) {
        resolutions.push({ from: label(parentPath), specifier, to: specifier });
        return nextResolve(specifier, context);
      }

      if (fromExtensions) {
        if (!isRelative(specifier)) {
          throw new Error(`Refused import from the vendored package: ${specifier} (no installed packages are used)`);
        }
        const result = nextResolve(specifier, context);
        const targetPath = fileParent(result.url);
        if (targetPath === null || !inside(extRoot, targetPath)) {
          throw new Error(`Refused vendored package import outside ${label(extRoot)}: ${specifier}`);
        }
        resolutions.push({ from: label(parentPath), specifier, to: label(targetPath) });
        return result;
      }

      let target = null;
      if (specifier === PACKAGE_SUBPATH) {
        target = packageEntry;
      } else if (specifier.startsWith("#/")) {
        const request = specifier.slice(2);
        if (!safeRequest(request) || request.split("/").some((part) => part === "" || part === "." || part === "..")) {
          throw new Error(`Refused vendor alias: ${specifier}`);
        }
        target = typescriptFile(ohSrc, request, ohSrc);
      } else if (isRelative(specifier) && safeRequest(specifier)) {
        target = typescriptFile(dirname(parentPath), specifier, ohRoot);
      }
      if (target === null) {
        throw new Error(`Refused import from the original source: ${specifier} (no installed packages are used)`);
      }

      resolutions.push({ from: label(parentPath), specifier, to: label(target) });
      return { url: pathToFileURL(target).href, shortCircuit: true };
    },
  });

  return { resolutions };
}
