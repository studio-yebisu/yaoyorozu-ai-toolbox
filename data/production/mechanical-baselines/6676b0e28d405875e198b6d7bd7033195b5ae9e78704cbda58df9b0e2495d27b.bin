// 八百万図AIツールボックス — Letta Code 作例の読み込み補助。MIT License, Copyright (c) 2026 Studio Yebisu.
// 固定版の原典 .ts を Node の型除去でそのまま読み込むため、解決だけを補う。
//   ・原典の中からの「@/名前」 → vendor/letta-code/src/名前.ts
//   ・原典の中からの拡張子なし相対 import（./x, ../x） → 同じ原典フォルダー内の x.ts
// それ以外の指定（node:fs など）は Node の既定の解決へ渡す。load フックは登録せず、
// 原典のソースを書き換えたり、原典の関数を別の実装へ差し替えたりはしない。
import { existsSync, statSync } from "node:fs";
import { registerHooks } from "node:module";
import { dirname, extname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

function inside(root, target) {
  const rel = relative(root, target);
  return rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);
}

function safeRequest(request) {
  return typeof request === "string"
    && request.length > 0
    && !request.includes("\\")
    && !request.includes("\0")
    && extname(request) === "";
}

/**
 * Register the resolver for one vendor root. Returns the list of resolutions it made,
 * as vendor-relative names only, so the runner can record them without private paths.
 */
export function registerVendorResolver(vendorRoot) {
  if (typeof registerHooks !== "function") {
    throw new Error("node:module registerHooks is unavailable; run with Node 24.");
  }
  const root = resolve(vendorRoot);
  const src = resolve(root, "src");
  const resolutions = [];
  const label = (path) => `vendor/letta-code/${relative(root, path).split(sep).join("/")}`;

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
      const parentURL = context.parentURL;
      const parentPath = typeof parentURL === "string" && parentURL.startsWith("file:")
        ? fileURLToPath(parentURL)
        : null;
      if (parentPath === null || !inside(root, parentPath)) return nextResolve(specifier, context);

      let target = null;
      if (specifier.startsWith("@/")) {
        const request = specifier.slice(2);
        if (!safeRequest(request) || request.split("/").some((part) => part === "" || part === "." || part === "..")) {
          throw new Error(`Refused vendor alias: ${specifier}`);
        }
        target = typescriptFile(src, request, src);
      } else if ((specifier.startsWith("./") || specifier.startsWith("../")) && safeRequest(specifier)) {
        target = typescriptFile(dirname(parentPath), specifier, root);
      }
      if (target === null) return nextResolve(specifier, context);

      resolutions.push({ from: label(parentPath), specifier, to: label(target) });
      return { url: pathToFileURL(target).href, shortCircuit: true };
    },
  });

  return { resolutions };
}
