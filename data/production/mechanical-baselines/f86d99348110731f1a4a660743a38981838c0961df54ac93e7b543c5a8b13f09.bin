// Pretty Mermaid の仕組み図：共有ローダー・描画・概念ページの初期化。
// 画面と映像のソースは 八百万図AIツールボックス の独自制作（MIT License）。
// このファイルは保存済みの原出力を検証して読むだけで、図の生成・モデル呼び出し・CLI実行はしない。

export const ROOT = new URL('./', import.meta.url);
export const MANIFEST_PATH = 'concept/manifest.json';
export const MANIFEST_SHA256 = 'e93441dd589f2f45e6c81913a2c38b62fec4805235d3ade16ee7c3e0dcc133ed';
export const MANIFEST_FILE_COUNT = 28;
export const SOURCE_COMMIT = 'e234ab73c2992f03c36db04fd55ebb90abca9c45';
export const CASE_IDS = ['flow', 'sequence', 'state'];
export const PART_IDS = ['instructions', 'types', 'theme', 'source', 'render', 'check'];
const RELATION_COUNTS = [5, 5, 6];
const PNG_WIDTH = 1200;
const UPSTREAM_BLOB = `https://github.com/imxv/Pretty-mermaid-skills/blob/${SOURCE_COMMIT}/`;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const SAFE_PATH = /^(?:[A-Za-z0-9_-][A-Za-z0-9_.-]*\/)*[A-Za-z0-9_-][A-Za-z0-9_.-]*$/;

export class LoadError extends Error {
  constructor(message) {
    super(message);
    this.name = 'LoadError';
  }
}

const toHex = buffer => [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, '0')).join('');
export async function sha256Hex(bytes) {
  return toHex(await crypto.subtle.digest('SHA-256', bytes));
}

async function fetchBytes(path) {
  let response;
  try {
    response = await fetch(new URL(path, ROOT), { cache: 'no-store' });
  } catch {
    throw new LoadError(`${path} を読み込めませんでした。ページをWebサーバーから開いているか確認してください。`);
  }
  if (!response.ok) throw new LoadError(`${path} が見つかりません（HTTP ${response.status}）。`);
  return new Uint8Array(await response.arrayBuffer());
}

function decodeText(path, bytes) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new LoadError(`${path} をUTF-8の文字として読めません。`);
  }
}

function parseJson(path, bytes) {
  const text = decodeText(path, bytes);
  try {
    return JSON.parse(text);
  } catch {
    throw new LoadError(`${path} のJSONが壊れています。`);
  }
}

function decodeImage(path, bytes, type) {
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const image = new Image();
  image.decoding = 'async';
  image.src = url;
  return image.decode().then(
    () => ({ image, url }),
    () => {
      URL.revokeObjectURL(url);
      throw new LoadError(`${path} を画像として開けません。`);
    },
  );
}

function readManifest(manifest) {
  const list = manifest?.files;
  if (!Array.isArray(list) || list.length !== MANIFEST_FILE_COUNT) {
    throw new LoadError(`目録 ${MANIFEST_PATH} のファイル数が${MANIFEST_FILE_COUNT}件ではありません。`);
  }
  const seen = new Set();
  for (const entry of list) {
    const ok = entry && typeof entry.path === 'string' && SAFE_PATH.test(entry.path) && !seen.has(entry.path)
      && Number.isInteger(entry.bytes) && entry.bytes > 0
      && typeof entry.sha256 === 'string' && /^[0-9a-f]{64}$/.test(entry.sha256);
    if (!ok) throw new LoadError(`目録 ${MANIFEST_PATH} に不正な項目があります。`);
    seen.add(entry.path);
  }
  return list;
}

// 目録の28ファイルを全て取得し、バイト数とSHA-256を確かめてから意味の照合へ進む。
export async function loadVerifiedBundle({ onProgress } = {}) {
  if (!globalThis.crypto?.subtle) {
    throw new LoadError('このブラウザーではWebCryptoが使えないため、ファイルを検証できません。httpsかlocalhostで開いてください。');
  }
  let failed = false;
  const report = (done, total) => { if (!failed) onProgress?.(done, total); };

  try {
    const manifestBytes = await fetchBytes(MANIFEST_PATH);
    if (manifestBytes.byteLength === 0 || await sha256Hex(manifestBytes) !== MANIFEST_SHA256) {
      throw new LoadError(`${MANIFEST_PATH} のSHA-256が記録と一致しません。`);
    }
    const list = readManifest(parseJson(MANIFEST_PATH, manifestBytes));
    const files = new Map();
    let done = 0;
    report(0, list.length);
    await Promise.all(list.map(async entry => {
      const bytes = await fetchBytes(entry.path);
      if (failed) return;
      if (bytes.byteLength !== entry.bytes) {
        throw new LoadError(`${entry.path} の大きさが記録と違います（${bytes.byteLength}／${entry.bytes}バイト）。`);
      }
      if (await sha256Hex(bytes) !== entry.sha256) throw new LoadError(`${entry.path} のSHA-256が記録と一致しません。`);
      files.set(entry.path, { path: entry.path, bytes, size: entry.bytes, sha256: entry.sha256 });
      done += 1;
      report(done, list.length);
    }).map(task => task.catch(error => { failed = true; throw error; })));
    const bundle = await verifyBundle(files);
    if (failed) throw new LoadError('ファイルの検証が途中で失敗しました。');
    return bundle;
  } catch (error) {
    failed = true;
    if (error instanceof LoadError) throw error;
    throw new LoadError(`保存済みファイルを確かめられませんでした（${error?.message || '不明なエラー'}）。`);
  }
}

async function verifyBundle(files) {
  const need = path => {
    const file = files.get(path);
    if (!file) throw new LoadError(`目録に ${path} がありません。`);
    return file;
  };
  const text = path => {
    const file = need(path);
    if (file.text === undefined) file.text = decodeText(path, file.bytes);
    return file.text;
  };
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  const structure = parseJson('concept/structure.json', need('concept/structure.json').bytes);
  const run = parseJson('concept/original-run.json', need('concept/original-run.json').bytes);
  const samplesDoc = parseJson('samples.json', need('samples.json').bytes);
  const request = text('request.txt');
  if (!request.trim()) throw new LoadError('request.txt が空です。');
  if (structure?.source_commit !== SOURCE_COMMIT) throw new LoadError('structure.json の固定版が e234ab7 ではありません。');

  const samples = samplesDoc?.samples;
  const structureSamples = structure?.samples;
  if (!Array.isArray(samples) || !same(samples.map(s => s?.id), CASE_IDS)) {
    throw new LoadError('samples.json の作例IDが flow・sequence・state の3件ではありません。');
  }
  if (!Array.isArray(structureSamples) || !same(structureSamples.map(s => s?.id), CASE_IDS)) {
    throw new LoadError('structure.json の作例IDが flow・sequence・state の3件ではありません。');
  }
  if (!same(structure.relationships_count, RELATION_COUNTS)) throw new LoadError('関係の本数が5・5・6になっていません。');

  const runtime = run?.runtime;
  const diagrams = runtime?.diagrams;
  if (runtime?.original_cli_calls !== 12 || !Array.isArray(diagrams) || diagrams.length !== 3
    || diagrams.flatMap(d => d?.outputs ?? []).length !== 12) {
    throw new LoadError('元の実行記録に12回分のCLI出力がありません。');
  }
  const structureRun = structure.original_run?.diagrams;
  if (!Array.isArray(structureRun) || structureRun.length !== 3) throw new LoadError('structure.json に元の実行記録がありません。');

  const cases = CASE_IDS.map((id, index) => {
    const sample = samples[index];
    const twin = structureSamples[index];
    const stem = sample.stem;
    if (typeof stem !== 'string' || !/^[a-z-]+$/.test(stem) || twin.stem !== stem) {
      throw new LoadError(`作例 ${id} のファイル名が記録と合いません。`);
    }
    const mmdPath = `inputs/${stem}.mmd`;
    const mmd = text(mmdPath);
    if (mmd !== sample.input || mmd !== twin.input) throw new LoadError(`${mmdPath} の記述が作例の入力と一致しません。`);
    const relationships = sample.relationships;
    if (!Array.isArray(relationships) || relationships.length !== RELATION_COUNTS[index] || !same(relationships, twin.relationships)) {
      throw new LoadError(`作例 ${id} の関係が${RELATION_COUNTS[index]}本ではありません。`);
    }

    const paths = {
      svgLight: `assets/${stem}-light.svg`,
      svgDark: `assets/${stem}-dark.svg`,
      png: `assets/${stem}-light.png`,
      text: `assets/${stem}.txt`,
    };
    const declared = { svgLight: sample.svg_light, svgDark: sample.svg_dark, png: sample.png, text: sample.ascii_file };
    const twinDeclared = { svgLight: twin.svg_light, svgDark: twin.svg_dark, png: twin.png, text: twin.ascii_file };
    if (!same(paths, declared) || !same(paths, twinDeclared)) throw new LoadError(`作例 ${id} の出力ファイル名が記録と合いません。`);

    const diagram = diagrams[index];
    const mmdFile = need(mmdPath);
    if (diagram?.input !== mmdPath || diagram.input_sha256 !== mmdFile.sha256
      || structureRun[index]?.input_sha256 !== mmdFile.sha256) {
      throw new LoadError(`${mmdPath} のハッシュが元の実行記録と一致しません。`);
    }
    const outputs = {};
    for (const [key, path] of Object.entries(paths)) {
      const file = need(path);
      const record = diagram.outputs.find(o => o?.path === path);
      const twinRecord = structureRun[index].outputs?.find(o => o?.path === path);
      if (!record || record.sha256 !== file.sha256 || record.bytes !== file.size
        || !twinRecord || twinRecord.sha256 !== file.sha256 || twinRecord.bytes !== file.size) {
        throw new LoadError(`${path} が元の実行記録のハッシュ・大きさと一致しません。`);
      }
      const command = record.command;
      if (!Array.isArray(command) || command[0] !== 'node' || command[1] !== 'scripts/render.mjs'
        || command[command.indexOf('--input') + 1] !== mmdPath || command[command.indexOf('--output') + 1] !== path) {
        throw new LoadError(`${path} の元のコマンド記録が想定と違います。`);
      }
      outputs[key] = { file, command };
    }
    for (const key of ['svgLight', 'svgDark']) {
      if (!text(paths[key]).startsWith('<svg')) throw new LoadError(`${paths[key]} が <svg で始まっていません。`);
    }
    const terminal = text(paths.text);
    if (!terminal.trim() || !/[─-╿]/.test(terminal)) throw new LoadError(`${paths.text} に文字図が見当たりません。`);
    const pngBytes = outputs.png.file.bytes;
    const view = new DataView(pngBytes.buffer, pngBytes.byteOffset, pngBytes.byteLength);
    if (pngBytes.byteLength < 24 || PNG_SIGNATURE.some((b, i) => pngBytes[i] !== b) || view.getUint32(16) !== PNG_WIDTH) {
      throw new LoadError(`${paths.png} が幅${PNG_WIDTH}のPNGとして読めません。`);
    }

    return {
      id, index, stem, label: sample.label, summary: sample.output,
      mmd, mmdPath, mmdFile, relationships: [...relationships],
      outputs, terminal, images: {}, urls: {},
    };
  });

  const parts = structure.parts;
  if (!Array.isArray(parts) || !same(parts.map(p => p?.id), PART_IDS)) throw new LoadError('structure.json の6部品が揃っていません。');
  const verifiedParts = parts.map(part => {
    const sourceText = text(part.source_path);
    const lines = sourceText.split(/\r?\n/);
    if (!Number.isInteger(part.line_start) || part.line_start < 1 || lines[part.line_start - 1] !== part.quote) {
      throw new LoadError(`${part.source_path} の${part.line_start}行目が部品「${part.label}」の引用と一致しません。`);
    }
    const upstreamPath = part.source_path.replace(/^vendor\/pretty-mermaid\//, '');
    if (part.source_url !== `${UPSTREAM_BLOB}${upstreamPath}#L${part.line_start}`) {
      throw new LoadError(`部品「${part.label}」の原典URLが固定版の該当行ではありません。`);
    }
    return { ...part };
  });

  const images = [];
  try {
    await Promise.all(cases.map(async item => {
      const png = await decodeImage(item.outputs.png.file.path, item.outputs.png.file.bytes, 'image/png');
      images.push(png.url);
      if (png.image.naturalWidth !== PNG_WIDTH) throw new LoadError(`${item.outputs.png.file.path} の幅が${PNG_WIDTH}ではありません。`);
      const light = await decodeImage(item.outputs.svgLight.file.path, item.outputs.svgLight.file.bytes, 'image/svg+xml');
      images.push(light.url);
      const dark = await decodeImage(item.outputs.svgDark.file.path, item.outputs.svgDark.file.bytes, 'image/svg+xml');
      images.push(dark.url);
      item.images = { png: png.image, svgLight: light.image, svgDark: dark.image };
      item.urls = { png: png.url, svgLight: light.url, svgDark: dark.url };
      item.pngSize = { width: png.image.naturalWidth, height: png.image.naturalHeight };
    }));
  } catch (error) {
    images.forEach(url => URL.revokeObjectURL(url));
    throw error;
  }

  return {
    structure, run, request, files, cases, parts: verifiedParts,
    caseById: Object.fromEntries(cases.map(c => [c.id, c])),
    partById: Object.fromEntries(verifiedParts.map(p => [p.id, p])),
  };
}

export function releaseBundle(bundle) {
  for (const item of bundle?.cases ?? []) Object.values(item.urls ?? {}).forEach(url => URL.revokeObjectURL(url));
}

// ───────── 図の配置 ─────────
// 6部品は説明用の整理で、原典の共通スキーマではない。描くのは「指示書＋依頼→作者AI→.mmd→制作担当→CLI→3経路→読む→使う」。

export const SANS = '"Yu Gothic UI","Yu Gothic","Hiragino Sans","Noto Sans JP",Meiryo,sans-serif';
export const SERIF = '"Yu Mincho","Hiragino Mincho ProN","Noto Serif JP","YuMincho",serif';
export const MONO = 'ui-monospace,"Cascadia Mono",Consolas,"Noto Sans Mono",monospace';

export const PALETTES = {
  light: {
    bg: '#f2ede2', paper: '#fbf8f1', ink: '#1d2129', sub: '#565b63', faint: 'rgba(29,33,41,0.16)',
    edge: '#3a3f47', accent: '#b23c17', author: '#9a3412', operator: '#1d5b75', reader: '#3d6a2c',
    bandAuthor: '#ebe1cc', bandOperator: '#dde4e5', bandReader: '#e0e8d8', cli: '#1d2129', cliText: '#f6f1e6',
    cliPart: '#2c323c', cross: '#8d96a1',
    marks: ['#b23c17', '#8a5a00', '#5b3f8c', '#1d5b75', '#3d6a2c', '#7c2d55'],
  },
  dark: {
    bg: '#15171b', paper: '#20232a', ink: '#ece6d8', sub: '#aaa597', faint: 'rgba(236,230,216,0.18)',
    edge: '#c9c3b5', accent: '#f08a5d', author: '#f0a070', operator: '#7cc0dc', reader: '#9fcc84',
    bandAuthor: '#29251e', bandOperator: '#1b2528', bandReader: '#1d251a', cli: '#0e1013', cliText: '#ece6d8',
    cliPart: '#252a32', cross: '#8d96a1',
    marks: ['#f08a5d', '#e2b149', '#b49cf0', '#7cc0dc', '#9fcc84', '#e58db8'],
  },
};

const LAYOUTS = {
  square: {
    strip: null,
    cli: 'down',
    tiles: 'row',
    bands: [
      { role: 'author', label: '作者AIの作業', rects: [[0, 0, 1, 0.375]] },
      { role: 'operator', label: '制作担当の作業', rects: [[0, 0.38, 1, 0.4], [0, 0.78, 0.645, 0.22]] },
      { role: 'reader', label: '読む・使う', rects: [[0.65, 0.785, 0.35, 0.215]] },
    ],
    nodes: {
      book: [0.01, 0.045, 0.31, 0.32], author: [0.36, 0.045, 0.28, 0.13], request: [0.67, 0.035, 0.32, 0.18],
      source: [0.36, 0.205, 0.28, 0.16], settings: [0.67, 0.235, 0.32, 0.13], operator: [0.33, 0.405, 0.34, 0.07],
      cli: [0.01, 0.495, 0.98, 0.27], outputs: [0.01, 0.8, 0.625, 0.19], check: [0.66, 0.8, 0.165, 0.19],
      use: [0.835, 0.8, 0.155, 0.19],
    },
    routes: {
      'book-settings': { from: [0.32, 0.33], c1: [0.5, 0.39], c2: [0.6, 0.3], to: [0.67, 0.3] },
      'source-check': { from: [0.64, 0.33], c1: [0.995, 0.37], c2: [0.995, 0.76], to: [0.74, 0.8] },
    },
  },
  tall: {
    strip: [0, 0, 1, 0.045],
    cli: 'down',
    tiles: 'row',
    bands: [
      { role: 'author', label: '作者AIの作業', rects: [[0, 0.05, 1, 0.415]] },
      { role: 'operator', label: '制作担当の作業', rects: [[0, 0.47, 1, 0.365]] },
      { role: 'reader', label: '読む・使う', rects: [[0, 0.84, 1, 0.16]] },
    ],
    nodes: {
      book: [0.03, 0.075, 0.46, 0.2], request: [0.53, 0.075, 0.44, 0.15], author: [0.33, 0.29, 0.34, 0.07],
      source: [0.03, 0.37, 0.44, 0.085], settings: [0.53, 0.37, 0.44, 0.085], operator: [0.3, 0.49, 0.4, 0.06],
      cli: [0.03, 0.57, 0.94, 0.18], outputs: [0.03, 0.765, 0.94, 0.065], check: [0.03, 0.855, 0.58, 0.135],
      use: [0.64, 0.855, 0.33, 0.135],
    },
    routes: {
      'book-settings': { from: [0.49, 0.25], c1: [0.62, 0.25], c2: [0.86, 0.28], to: [0.86, 0.37] },
      'source-check': { from: [0.03, 0.42], c1: [0.004, 0.5], c2: [0.004, 0.86], to: [0.03, 0.9] },
    },
  },
  wide: {
    strip: [0, 0, 1, 0.05],
    cli: 'right',
    tiles: 'column',
    bands: [
      { role: 'author', label: '作者AIの作業', rects: [[0, 0.055, 0.755, 0.415]] },
      { role: 'operator', label: '制作担当の作業', rects: [[0, 0.475, 0.755, 0.525]] },
      { role: 'reader', label: '読む・使う', rects: [[0.765, 0.055, 0.235, 0.945]] },
    ],
    nodes: {
      book: [0.015, 0.09, 0.215, 0.36], author: [0.26, 0.095, 0.13, 0.15], request: [0.42, 0.09, 0.16, 0.2],
      source: [0.26, 0.29, 0.13, 0.16], settings: [0.42, 0.32, 0.16, 0.13], operator: [0.2, 0.5, 0.36, 0.085],
      cli: [0.015, 0.615, 0.6, 0.37], outputs: [0.635, 0.5, 0.115, 0.485], check: [0.78, 0.09, 0.205, 0.53],
      use: [0.78, 0.645, 0.205, 0.34],
    },
    routes: {
      'book-settings': { from: [0.2, 0.45], c1: [0.24, 0.49], c2: [0.4, 0.49], to: [0.45, 0.45] },
      'source-check': { from: [0.325, 0.45], c1: [0.4, 0.462], c2: [0.72, 0.462], to: [0.78, 0.5] },
    },
  },
};

export function layoutKind(width, height) {
  const ratio = width / height;
  if (ratio > 1.35) return 'wide';
  if (ratio < 0.8) return 'tall';
  return 'square';
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const lerp = (a, b, t) => a + (b - a) * t;
export const ease = t => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
export const span = (t, a, b) => ease((t - a) / (b - a));

const EDGES = [
  { id: 'book-author', from: 'book', to: 'author', label: '手順' },
  { id: 'request-author', from: 'request', to: 'author', label: '依頼' },
  { id: 'author-source', from: 'author', to: 'source', label: '保存' },
  { id: 'book-source', from: 'book', to: 'source', dash: true, label: '書き方' },
  { id: 'request-settings', from: 'request', to: 'settings', label: '出力指定' },
  { id: 'book-settings', from: 'book', to: 'settings', dash: true, label: '出力の表' },
  { id: 'source-operator', from: 'source', to: 'operator', label: '同じ.mmd' },
  { id: 'settings-operator', from: 'settings', to: 'operator', label: '設定' },
  { id: 'operator-cli', from: 'operator', to: 'cli.read', label: 'node 12回' },
  { id: 'read-bm', from: 'cli.read', to: 'cli.bm' },
  { id: 'bm-svg', from: 'cli.bm', to: 'cli.svg' },
  { id: 'bm-ascii', from: 'cli.bm', to: 'cli.ascii' },
  { id: 'svg-png', from: 'cli.svg', to: 'cli.png' },
  { id: 'png-resvg', from: 'cli.png', to: 'cli.resvg' },
  { id: 'svg-tileL', from: 'cli.svg', to: 'tile.svgLight' },
  { id: 'svg-tileD', from: 'cli.svg', to: 'tile.svgDark' },
  { id: 'resvg-tileP', from: 'cli.resvg', to: 'tile.png' },
  { id: 'ascii-tileT', from: 'cli.ascii', to: 'tile.text' },
  { id: 'tiles-check', from: 'outputs', to: 'check', label: '実ファイル' },
  { id: 'source-check', from: 'source', to: 'check', dash: true, label: '原文' },
  { id: 'check-use', from: 'check', to: 'use', label: '使い分け' },
];

export const TILE_KEYS = ['svgLight', 'svgDark', 'png', 'text'];

function cliParts(box, mode) {
  const head = Math.max(box.h * (mode === 'right' ? 0.13 : 0.15), 14);
  const inner = { x: box.x + box.w * 0.015, y: box.y + head, w: box.w * 0.97, h: box.h - head - box.h * 0.03 };
  const at = (x0, x1, y0, y1) => ({ x: inner.x + inner.w * x0, y: inner.y + inner.h * y0, w: inner.w * (x1 - x0), h: inner.h * (y1 - y0) });
  if (mode === 'right') {
    return {
      head,
      parts: {
        read: at(0.0, 0.17, 0.33, 0.58), bm: at(0.22, 0.42, 0.33, 0.58),
        svg: at(0.48, 0.76, 0.02, 0.24), png: at(0.48, 0.7, 0.36, 0.56), resvg: at(0.75, 0.97, 0.36, 0.56),
        ascii: at(0.48, 0.76, 0.66, 0.86),
      },
      deps: at(0.0, 0.42, 0.72, 0.97),
    };
  }
  return {
    head,
    parts: {
      read: at(0.02, 0.3, 0.02, 0.22), bm: at(0.36, 0.7, 0.02, 0.22),
      svg: at(0.02, 0.48, 0.3, 0.5), ascii: at(0.75, 0.98, 0.3, 0.5),
      png: at(0.52, 0.73, 0.55, 0.74), resvg: at(0.52, 0.73, 0.8, 0.99),
    },
    deps: null,
  };
}

export function computeLayout(width, height, kind = layoutKind(width, height)) {
  const spec = LAYOUTS[kind];
  const rect = ([x, y, w, h]) => ({ x: x * width, y: y * height, w: w * width, h: h * height });
  const nodes = {};
  for (const [id, r] of Object.entries(spec.nodes)) nodes[id] = rect(r);
  const f = kind === 'wide' ? clamp(width / 72, 11, 20) : kind === 'tall' ? clamp(width / 32, 11, 24) : clamp(width / 30, 11, 16);

  const out = nodes.outputs;
  const tiles = {};
  TILE_KEYS.forEach((key, i) => {
    if (spec.tiles === 'row') {
      const gap = out.w * 0.02, w = (out.w - gap * 3) / 4;
      tiles[key] = { x: out.x + i * (w + gap), y: out.y, w, h: out.h };
    } else {
      const gap = out.h * 0.02, h = (out.h - gap * 3) / 4;
      tiles[key] = { x: out.x, y: out.y + i * (h + gap), w: out.w, h };
    }
    nodes[`tile.${key}`] = tiles[key];
  });

  const cli = cliParts(nodes.cli, spec.cli);
  for (const [id, r] of Object.entries(cli.parts)) nodes[`cli.${id}`] = r;

  const routes = spec.routes ?? {};
  const edges = {};
  for (const edge of EDGES) {
    const a = nodes[edge.from], b = nodes[edge.to];
    const route = routes[edge.id];
    let curve;
    if (route) {
      const p = ([x, y]) => [x * width, y * height];
      curve = [p(route.from), p(route.c1), p(route.c2), p(route.to)];
    } else {
      curve = autoCurve(a, b, kind === 'square' ? 10 : f * 0.9);
    }
    edges[edge.id] = { ...edge, curve };
  }
  return {
    kind, width, height, f, nodes, tiles, edges, cliMode: spec.cli, cliHead: cli.head, deps: cli.deps,
    bands: spec.bands.map(b => ({ ...b, rects: b.rects.map(rect) })),
    strip: spec.strip ? rect(spec.strip) : null,
  };
}

function sideOf(r, side) {
  if (side === 'left') return [r.x, r.y + r.h / 2];
  if (side === 'right') return [r.x + r.w, r.y + r.h / 2];
  if (side === 'top') return [r.x + r.w / 2, r.y];
  return [r.x + r.w / 2, r.y + r.h];
}
const DIRS = { left: [-1, 0], right: [1, 0], top: [0, -1], bottom: [0, 1] };

function autoCurve(a, b, minReach) {
  const xGap = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w));
  const yGap = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h));
  const dx = b.x + b.w / 2 - (a.x + a.w / 2), dy = b.y + b.h / 2 - (a.y + a.h / 2);
  const sides = yGap > xGap ? (dy > 0 ? ['bottom', 'top'] : ['top', 'bottom']) : (dx > 0 ? ['right', 'left'] : ['left', 'right']);
  const p0 = sideOf(a, sides[0]), p3 = sideOf(b, sides[1]);
  const d0 = DIRS[sides[0]], d1 = DIRS[sides[1]];
  const reach = Math.max(minReach, Math.hypot(p3[0] - p0[0], p3[1] - p0[1]) * 0.38);
  return [p0, [p0[0] + d0[0] * reach, p0[1] + d0[1] * reach], [p3[0] + d1[0] * reach, p3[1] + d1[1] * reach], p3];
}

export function curvePoint([p0, p1, p2, p3], t) {
  const u = 1 - t;
  const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]];
}

// ───────── 共通の時間軸（秒） ─────────
// 映像と概念ページの再生は同じ移動表を使う。値は描く時刻から直接求め、前の描画結果に依存しない。

export const STAGES = [
  { id: 0, label: '指示書と入力', window: [0, 8], nodes: ['book', 'request', 'author', 'source', 'settings'] },
  { id: 1, label: 'ローカルCLIの3経路', window: [8, 20], nodes: ['operator', 'settings', 'source', 'cli', 'cli.read', 'cli.bm', 'cli.svg', 'cli.ascii', 'cli.png', 'cli.resvg', 'tiles'] },
  { id: 2, label: '読んで照合し、使う', window: [20, 29], nodes: ['check', 'use', 'source', 'tiles'] },
];

export const PART_NODES = {
  instructions: ['book'],
  types: ['book', 'source'],
  theme: ['book', 'settings', 'tile.svgLight', 'tile.svgDark'],
  source: ['author', 'source'],
  render: ['operator', 'cli'],
  check: ['check'],
};

export const MARKS = ['種類', '目的', '用語', '関係', '出力', 'テーマ'];
const GUIDES = ['短いラベル', '条件ラベル', '戻り道'];

export const TRIPS = [
  ...[0, 1, 2, 3].flatMap(i => [
    { kind: 'mark', mark: i, edge: 'request-author', t0: 4.2 + i * 0.18, t1: 5.5 + i * 0.18 },
    { kind: 'mark-line', mark: i, edge: 'author-source', t0: 5.9 + i * 0.12, t1: 6.9 + i * 0.12 },
  ]),
  { kind: 'mark', mark: 4, edge: 'request-settings', t0: 4.6, t1: 5.8 },
  { kind: 'mark', mark: 5, edge: 'request-settings', t0: 4.85, t1: 6.05 },
  ...GUIDES.map((label, j) => ({ kind: 'guide', label, edge: 'book-author', t0: 4.0 + j * 0.22, t1: 5.3 + j * 0.22 })),
  { kind: 'guide', label: '出力の表', edge: 'book-settings', t0: 4.8, t1: 6.0 },
  { kind: 'guide', label: '書き方', edge: 'book-source', t0: 6.1, t1: 7.1 },
  { kind: 'paper', edge: 'source-operator', t0: 7.2, t1: 8.4 },
  { kind: 'settings', edge: 'settings-operator', t0: 7.4, t1: 8.5 },
  { kind: 'paper', edge: 'operator-cli', t0: 8.8, t1: 10.0 },
  { kind: 'settings', edge: 'operator-cli', t0: 8.95, t1: 10.15 },
  { kind: 'paper-graph', edge: 'read-bm', t0: 10.6, t1: 11.8 },
  { kind: 'svg', edge: 'bm-svg', t0: 14.0, t1: 14.9 },
  { kind: 'text', edge: 'bm-ascii', t0: 14.0, t1: 15.0 },
  { kind: 'svg', edge: 'svg-tileL', t0: 15.1, t1: 15.9 },
  { kind: 'svg-dark', edge: 'svg-tileD', t0: 15.3, t1: 16.1 },
  { kind: 'text', edge: 'ascii-tileT', t0: 15.2, t1: 16.0 },
  { kind: 'svg', edge: 'svg-png', t0: 15.6, t1: 16.4 },
  { kind: 'css', edge: 'png-resvg', t0: 16.5, t1: 17.2 },
  { kind: 'png', edge: 'resvg-tileP', t0: 17.3, t1: 18.0 },
  { kind: 'svg', edge: 'tiles-check', t0: 20.3, t1: 21.4 },
  { kind: 'png', edge: 'tiles-check', t0: 20.5, t1: 21.6 },
  { kind: 'text', edge: 'tiles-check', t0: 20.7, t1: 21.8 },
  { kind: 'paper', edge: 'source-check', t0: 20.4, t1: 21.9 },
  ...['paper', 'svg', 'png', 'text'].map((kind, k) => ({ kind, edge: 'check-use', t0: 26.2 + k * 0.2, t1: 27.2 + k * 0.2 })),
];

// 部品が「届いた」時刻。到着後は部品の中の表示が変わり、移動中の印は消える。
export const ARRIVALS = {
  sourceLine: i => 6.9 + i * 0.12,
  settingsMark: i => (i === 4 ? 5.8 : 6.05),
  requestLeave: i => (i < 4 ? 4.2 + i * 0.18 : i === 4 ? 4.6 : 4.85),
  schematic: 7.0,
  tile: { svgLight: 15.9, svgDark: 16.1, png: 18.0, text: 16.0 },
  checkList: k => 22.2 + k * 0.45,
  relations: [23.0, 25.6],
  use: k => 27.2 + k * 0.2,
  desk: 28.2,
};

export const GLOWS = {
  author: [5.2, 7.0], operator: [8.3, 10.2], 'cli.read': [9.9, 11.0], 'cli.bm': [11.6, 14.2],
  'cli.svg': [14.8, 16.0], 'cli.ascii': [14.9, 16.0], 'cli.png': [16.3, 17.0], 'cli.resvg': [17.1, 17.9],
  check: [21.8, 25.8], use: [27.0, 28.8],
};

// ───────── 描画の基本 ─────────

const fontOf = (px, weight = 500, family = SANS) => `${weight} ${px}px ${family}`;

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// 1行に収まらなければ最小字の大きさまで縮め、それでも溢れる場合だけ折り返す。
function drawLabel(ctx, text, x, y, maxW, size, opts = {}) {
  const { color, weight = 500, family = SANS, align = 'center', min = 11, lines = 2, lineGap = 1.18 } = opts;
  let s = Math.max(min, size);
  ctx.font = fontOf(s, weight, family);
  while (s > min && ctx.measureText(text).width > maxW) {
    s = Math.max(min, s - 0.5);
    ctx.font = fontOf(s, weight, family);
  }
  const rows = [];
  if (ctx.measureText(text).width <= maxW || lines <= 1) {
    rows.push(text);
  } else {
    let row = '';
    for (const ch of text) {
      if (row && ctx.measureText(row + ch).width > maxW && rows.length < lines - 1) {
        rows.push(row);
        row = '';
      }
      row += ch;
    }
    rows.push(row);
  }
  if (color) ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  const lh = s * lineGap;
  rows.forEach((row, i) => ctx.fillText(row, x, y + (i - (rows.length - 1) / 2) * lh));
  return { size: s, height: rows.length * lh };
}

function card(ctx, r, P, { fill = P.paper, stroke = P.ink, lw = 1, radius = 6, dash = null, glow = 0, ring = 0, ringColor = P.accent } = {}) {
  if (glow > 0) {
    ctx.save();
    ctx.globalAlpha *= 0.28 * glow;
    ctx.fillStyle = ringColor;
    roundRect(ctx, r.x - 5, r.y - 5, r.w + 10, r.h + 10, radius + 5);
    ctx.fill();
    ctx.restore();
  }
  roundRect(ctx, r.x, r.y, r.w, r.h, radius);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.save();
    if (dash) ctx.setLineDash(dash);
    ctx.lineWidth = lw + glow * 1.5;
    ctx.strokeStyle = glow > 0.35 ? ringColor : stroke;
    ctx.stroke();
    ctx.restore();
  }
  if (ring > 0) {
    ctx.save();
    ctx.globalAlpha *= ring;
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = ringColor;
    roundRect(ctx, r.x - 4, r.y - 4, r.w + 8, r.h + 8, radius + 4);
    ctx.stroke();
    ctx.restore();
  }
}

function arrowHead(ctx, [x, y], angle, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-size, -size * 0.55);
  ctx.lineTo(-size, size * 0.55);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function strokeCurve(ctx, curve) {
  const [p0, p1, p2, p3] = curve;
  ctx.beginPath();
  ctx.moveTo(p0[0], p0[1]);
  ctx.bezierCurveTo(p1[0], p1[1], p2[0], p2[1], p3[0], p3[1]);
  ctx.stroke();
}

const pulse = (t, [a, b]) => (t <= a || t >= b ? 0 : Math.sin(Math.PI * (t - a) / (b - a)));

// 強調の重み（0〜1）。映像は S.focusWeight で場面の切り替わりを時刻から滑らかに求める。
function focusWeight(S, id, group) {
  if (S.focusWeight) return S.focusWeight(id, group);
  return !S.focus || S.focus.has(id) || (group && S.focus.has(group)) ? 1 : 0;
}

function look(S, id, group) {
  const rev = S.reveal ? S.reveal(id) : 1;
  const glowWindow = GLOWS[id];
  return {
    rev,
    alpha: rev * (0.76 + 0.24 * focusWeight(S, id, group)),
    glow: glowWindow ? pulse(S.clock, glowWindow) : 0,
    ring: S.partNodes?.has(id) ? 1 : 0,
  };
}

const small = L => Math.max(11, L.f * 0.74);

// ───────── 題材の図（ラベルなしの形だけ） ─────────
// 申込フロー・受付APIのやり取り・ジョブ状態は「図の題材」で、実在の処理ではない。

function nodeShape(ctx, shape, cx, cy, w, h) {
  ctx.beginPath();
  if (shape === 'diamond') {
    ctx.moveTo(cx, cy - h * 0.75); ctx.lineTo(cx + w / 2, cy); ctx.lineTo(cx, cy + h * 0.75); ctx.lineTo(cx - w / 2, cy); ctx.closePath();
  } else if (shape === 'stadium') {
    roundRect(ctx, cx - w / 2, cy - h / 2, w, h, h / 2);
  } else if (shape === 'cylinder') {
    const e = h * 0.18;
    ctx.ellipse(cx, cy - h / 2 + e, w / 2, e, 0, 0, Math.PI * 2);
    ctx.moveTo(cx - w / 2, cy - h / 2 + e); ctx.lineTo(cx - w / 2, cy + h / 2 - e);
    ctx.ellipse(cx, cy + h / 2 - e, w / 2, e, 0, Math.PI, 0, true);
    ctx.lineTo(cx + w / 2, cy - h / 2 + e);
  } else if (shape === 'dot') {
    ctx.arc(cx, cy, h / 2, 0, Math.PI * 2);
  } else if (shape === 'ring') {
    ctx.arc(cx, cy, h / 2, 0, Math.PI * 2);
    ctx.moveTo(cx + h * 0.28, cy);
    ctx.arc(cx, cy, h * 0.28, 0, Math.PI * 2);
  } else {
    roundRect(ctx, cx - w / 2, cy - h / 2, w, h, shape === 'round' ? h * 0.3 : 1);
  }
}

function link(ctx, pts, color, lw, dashed) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  if (dashed) ctx.setLineDash([lw * 2.5, lw * 2]);
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  if (pts.length === 4) ctx.bezierCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1], pts[3][0], pts[3][1]);
  else for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]);
  ctx.stroke();
  ctx.restore();
  const a = pts[pts.length - 2], b = pts[pts.length - 1];
  arrowHead(ctx, b, Math.atan2(b[1] - a[1], b[0] - a[0]), lw * 3.6 + 2, color);
}

export function drawSchematic(ctx, r, caseId, P, { lit = 0, ink = P.ink, fill = P.paper, hot = P.accent } = {}) {
  const lw = Math.max(1, Math.min(r.w, r.h) / 60);
  const col = k => (k < lit ? hot : ink);
  const lwOf = k => (k < lit ? lw * 1.8 : lw);
  ctx.save();
  ctx.lineJoin = 'round';
  const shapeAt = (shape, cx, cy, w, h) => {
    nodeShape(ctx, shape, cx, cy, w, h);
    ctx.fillStyle = shape === 'dot' ? ink : fill;
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = lw;
    ctx.stroke();
  };
  if (caseId === 'flow') {
    const w = r.w * 0.13, h = Math.min(r.h * 0.26, w * 0.62), cy = r.y + r.h * 0.38;
    const xs = [0, 1, 2, 3, 4].map(i => r.x + r.w * (0.1 + i * 0.2));
    const half = [w / 2, w / 2, w / 2, w / 2, w / 2];
    link(ctx, [[xs[0] + half[0], cy], [xs[1] - half[1] - lw * 2, cy]], col(0), lwOf(0));
    link(ctx, [[xs[1] + half[1], cy], [xs[2] - half[2] - lw * 2, cy]], col(1), lwOf(1));
    const by = cy + h * 0.75 + r.h * 0.22;
    link(ctx, [[xs[2], cy + h * 0.75], [xs[2], by], [xs[0], by], [xs[0], cy + h / 2 + lw * 2]], col(2), lwOf(2));
    link(ctx, [[xs[2] + half[2], cy], [xs[3] - half[3] - lw * 2, cy]], col(3), lwOf(3));
    link(ctx, [[xs[3] + half[3], cy], [xs[4] - half[4] - lw * 2, cy]], col(4), lwOf(4));
    ['stadium', 'rect', 'diamond', 'cylinder', 'stadium'].forEach((shape, i) => shapeAt(shape, xs[i], cy, w, h));
  } else if (caseId === 'sequence') {
    const xs = [0.18, 0.5, 0.82].map(f => r.x + r.w * f);
    const top = r.y + r.h * 0.1, bottom = r.y + r.h * 0.95, bw = r.w * 0.2, bh = Math.max(4, r.h * 0.13);
    ctx.save();
    ctx.strokeStyle = ink;
    ctx.globalAlpha *= 0.55;
    ctx.lineWidth = lw;
    ctx.setLineDash([lw * 2, lw * 2]);
    xs.forEach(x => { ctx.beginPath(); ctx.moveTo(x, top + bh); ctx.lineTo(x, bottom); ctx.stroke(); });
    ctx.restore();
    xs.forEach(x => shapeAt('rect', x, top + bh / 2, bw, bh));
    const ys = [0.36, 0.5, 0.63, 0.76, 0.89].map(f => r.y + r.h * f);
    const g = lw * 2.5;
    link(ctx, [[xs[0], ys[0]], [xs[1] - g, ys[0]]], col(0), lwOf(0));
    const loop = r.w * 0.09;
    link(ctx, [[xs[1], ys[1] - r.h * 0.04], [xs[1] + loop, ys[1] - r.h * 0.04], [xs[1] + loop, ys[1] + r.h * 0.04], [xs[1] + g, ys[1] + r.h * 0.04]], col(1), lwOf(1));
    link(ctx, [[xs[1], ys[2]], [xs[2] - g, ys[2]]], col(2), lwOf(2));
    link(ctx, [[xs[2], ys[3]], [xs[1] + g, ys[3]]], col(3), lwOf(3), true);
    link(ctx, [[xs[1], ys[4]], [xs[0] + g, ys[4]]], col(4), lwOf(4), true);
  } else {
    const cy = r.y + r.h * 0.32, w = r.w * 0.15, h = Math.min(r.h * 0.24, w * 0.6), d = Math.max(5, h * 0.55);
    const x = { start: 0.05, wait: 0.24, run: 0.5, done: 0.76, end: 0.95 };
    for (const k of Object.keys(x)) x[k] = r.x + r.w * x[k];
    const failY = r.y + r.h * 0.78;
    link(ctx, [[x.start + d / 2, cy], [x.wait - w / 2 - lw * 2, cy]], col(0), lwOf(0));
    link(ctx, [[x.wait + w / 2, cy], [x.run - w / 2 - lw * 2, cy]], col(1), lwOf(1));
    link(ctx, [[x.run + w / 2, cy], [x.done - w / 2 - lw * 2, cy]], col(2), lwOf(2));
    link(ctx, [[x.run, cy + h / 2], [x.run, failY - h / 2 - lw * 2]], col(3), lwOf(3));
    link(ctx, [[x.run - w / 2, failY], [x.wait, failY], [x.wait, cy + h], [x.wait, cy + h / 2 + lw * 2]], col(4), lwOf(4));
    link(ctx, [[x.done + w / 2, cy], [x.end - d / 2 - lw * 2, cy]], col(5), lwOf(5));
    shapeAt('dot', x.start, cy, d, d);
    shapeAt('round', x.wait, cy, w, h);
    shapeAt('round', x.run, cy, w, h);
    shapeAt('round', x.done, cy, w, h);
    shapeAt('round', x.run, failY, w, h);
    shapeAt('ring', x.end, cy, d * 1.2, d * 1.2);
  }
  ctx.restore();
}

// ───────── 部品 ─────────

const STEP_LABELS = ['判別', '図種と形式', '資料を読む', '.mmdに保存', '描画', '見直す', '返す'];
const BOOK_TABS = [
  { part: 'types', long: '図種の表（6種）', short: '図種' },
  { part: 'theme', long: '出力とテーマ', short: '出力' },
  { part: null, long: '書き方の指針', short: '書き方' },
  { part: 'check', long: '確認の手順', short: '確認' },
];
const REFS = [
  { long: 'DIAGRAM_TYPES', short: '文法' },
  { long: 'THEMES', short: '配色' },
  { long: 'api_reference', short: 'API' },
];

function fits(ctx, text, maxW, px, weight = 500, family = SANS) {
  ctx.font = fontOf(px, weight, family);
  return ctx.measureText(text).width <= maxW;
}

function drawBook(ctx, L, S) {
  const r = L.nodes.book, P = S.P, f = L.f, s = small(L), lk = look(S, 'book');
  if (lk.rev <= 0) return;
  ctx.save();
  ctx.globalAlpha = lk.alpha;
  const titleH = Math.max(f * 1.6, 16);
  const refsH = Math.max(r.h * 0.2, s * 1.9);
  drawLabel(ctx, 'SKILL.md', r.x + 2, r.y + titleH * 0.45, r.w, f * 1.05, { align: 'left', weight: 700, family: SERIF, color: P.ink, lines: 1 });
  ctx.font = fontOf(f * 1.05, 700, SERIF);
  const titleW = ctx.measureText('SKILL.md').width;
  if (fits(ctx, 'AIが読む指示書', r.w - titleW - 12, s)) {
    drawLabel(ctx, 'AIが読む指示書', r.x + r.w, r.y + titleH * 0.48, r.w, s, { align: 'right', color: P.sub, lines: 1 });
  }

  const pages = { x: r.x, y: r.y + titleH, w: r.w, h: r.h - titleH - refsH };
  card(ctx, pages, P, { radius: 3, lw: 1.2, glow: lk.glow, ring: lk.ring });
  ctx.strokeStyle = P.ink;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(pages.x + pages.w / 2, pages.y);
  ctx.lineTo(pages.x + pages.w / 2, pages.y + pages.h);
  ctx.stroke();

  const pad = Math.max(3, pages.w * 0.03);
  const lp = { x: pages.x + pad, y: pages.y + pad, w: pages.w / 2 - pad * 2, h: pages.h - pad * 2 };
  const rp = { x: pages.x + pages.w / 2 + pad, y: lp.y, w: lp.w, h: lp.h };
  const rowH = lp.h / 7;
  const stepHot = k => S.part === 'instructions' || (S.part === 'source' && k === 3);
  if (rowH >= s * 1.15 && fits(ctx, '9 資料を読む', lp.w, s)) {
    STEP_LABELS.forEach((label, k) => {
      const cy = lp.y + rowH * (k + 0.5);
      const lit = S.clock > 0.6 + k * 0.4;
      const hot = stepHot(k);
      const rad = Math.min(rowH * 0.42, s * 0.78);
      ctx.beginPath();
      ctx.arc(lp.x + rad, cy, rad, 0, Math.PI * 2);
      ctx.fillStyle = hot ? P.accent : lit ? P.ink : P.faint;
      ctx.fill();
      drawLabel(ctx, String(k + 1), lp.x + rad, cy, rad * 2, Math.max(11, rad * 1.2), { color: P.paper, weight: 700, lines: 1 });
      drawLabel(ctx, label, lp.x + rad * 2 + 4, cy, lp.w - rad * 2 - 4, s, { align: 'left', color: hot ? P.accent : lit ? P.ink : P.sub, lines: 1 });
    });
  } else {
    const cols = 4, cellW = lp.w / cols, dotsH = lp.h - s * 1.4;
    const cellH = dotsH / 2;
    for (let k = 0; k < 7; k += 1) {
      const cx = lp.x + cellW * ((k % cols) + 0.5) + (k >= cols ? cellW / 2 : 0);
      const cy = lp.y + cellH * (Math.floor(k / cols) + 0.5);
      const lit = S.clock > 0.6 + k * 0.4;
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(2.5, Math.min(cellW, cellH) * 0.3), 0, Math.PI * 2);
      ctx.fillStyle = stepHot(k) ? P.accent : lit ? P.ink : P.faint;
      ctx.fill();
    }
    drawLabel(ctx, '7手順', lp.x + lp.w / 2, lp.y + lp.h - s * 0.6, lp.w + pad, s, { color: P.ink, weight: 700, lines: 1 });
  }

  const tabH = rp.h / BOOK_TABS.length;
  const useShort = !fits(ctx, BOOK_TABS[0].long, rp.w - 8, s);
  BOOK_TABS.forEach((tab, k) => {
    const box = { x: rp.x, y: rp.y + tabH * k + tabH * 0.1, w: rp.w, h: tabH * 0.8 };
    const hot = tab.part && S.part === tab.part;
    card(ctx, box, P, { fill: hot ? P.accent : null, stroke: hot ? P.accent : P.faint, radius: 3, lw: 1 });
    drawLabel(ctx, useShort ? tab.short : tab.long, box.x + box.w / 2, box.y + box.h / 2, box.w - 4, s,
      { color: hot ? P.paper : P.ink, lines: 1 });
  });

  const gap = Math.max(3, r.w * 0.025);
  const refW = (r.w - gap * 2) / 3;
  const refY = pages.y + pages.h + 3;
  const longRefs = REFS.every(ref => fits(ctx, ref.long, refW - 6, 11, 500, MONO));
  REFS.forEach((ref, k) => {
    const box = { x: r.x + k * (refW + gap), y: refY, w: refW, h: refsH - 3 };
    const hot = S.part === 'types' && k === 0 || S.part === 'theme' && k === 1;
    card(ctx, box, P, { fill: P.paper, stroke: hot ? P.accent : P.sub, radius: 2, lw: hot ? 2 : 1 });
    ctx.fillStyle = hot ? P.accent : P.sub;
    ctx.fillRect(box.x, box.y, 3, box.h);
    drawLabel(ctx, longRefs ? ref.long : ref.short, box.x + box.w / 2 + 1.5, box.y + box.h / 2, box.w - 6, longRefs ? Math.min(s, 13) : s,
      { color: P.ink, family: longRefs ? MONO : SANS, lines: 1 });
  });
  ctx.restore();
}

function drawRequest(ctx, L, S) {
  const r = L.nodes.request, P = S.P, f = L.f, s = small(L), lk = look(S, 'request');
  if (lk.rev <= 0) return;
  ctx.save();
  ctx.globalAlpha = lk.alpha;
  card(ctx, r, P, { radius: 3, lw: 1.2, glow: lk.glow, ring: lk.ring });
  const fold = Math.min(r.w, r.h) * 0.16;
  ctx.fillStyle = P.bg;
  ctx.beginPath();
  ctx.moveTo(r.x + r.w - fold, r.y);
  ctx.lineTo(r.x + r.w, r.y + fold);
  ctx.lineTo(r.x + r.w, r.y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = P.ink;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(r.x + r.w - fold, r.y);
  ctx.lineTo(r.x + r.w - fold, r.y + fold);
  ctx.lineTo(r.x + r.w, r.y + fold);
  ctx.stroke();

  const pad = Math.max(4, r.w * 0.04);
  const headH = Math.max(f * 1.5, 15);
  drawLabel(ctx, '架空の依頼', r.x + pad, r.y + headH * 0.55, r.w - fold - pad * 2, f * 0.95, { align: 'left', weight: 700, color: P.ink, lines: 1 });
  ctx.font = fontOf(f * 0.95, 700);
  const used = ctx.measureText('架空の依頼').width;
  if (fits(ctx, 'request.txt', r.w - used - fold - pad * 3, 11, 500, MONO)) {
    drawLabel(ctx, 'request.txt', r.x + pad * 2 + used, r.y + headH * 0.58, r.w, 11, { align: 'left', family: MONO, color: P.sub, lines: 1 });
  }
  const area = { x: r.x + pad, y: r.y + headH + pad * 0.3, w: r.w - pad * 2, h: r.h - headH - pad * 1.3 };
  const gap = Math.max(3, area.w * 0.03);
  const cw = (area.w - gap * 2) / 3, ch = Math.min((area.h - gap) / 2, s * 2.1);
  const top = area.y + (area.h - (ch * 2 + gap)) / 2;
  MARKS.forEach((mark, i) => {
    const box = { x: area.x + (i % 3) * (cw + gap), y: top + Math.floor(i / 3) * (ch + gap), w: cw, h: ch };
    const gone = S.clock >= ARRIVALS.requestLeave(i);
    const color = P.marks[i];
    if (gone) {
      card(ctx, box, P, { fill: null, stroke: color, dash: [3, 3], radius: ch / 2, lw: 1 });
      ctx.save();
      ctx.globalAlpha *= 0.6;
      drawLabel(ctx, mark, box.x + cw / 2, box.y + ch / 2, cw - 4, s, { color, lines: 1 });
      ctx.restore();
    } else {
      card(ctx, box, P, { fill: color, stroke: null, radius: ch / 2 });
      drawLabel(ctx, mark, box.x + cw / 2, box.y + ch / 2, cw - 4, s, { color: '#ffffff', weight: 700, lines: 1 });
    }
  });
  ctx.restore();
}

function figure(ctx, cx, cy, size, color, square) {
  ctx.save();
  ctx.fillStyle = color;
  const head = size * 0.22;
  if (square) roundRect(ctx, cx - head, cy - size * 0.42, head * 2, head * 2, head * 0.35);
  else {
    ctx.beginPath();
    ctx.arc(cx, cy - size * 0.2, head, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.38, cy + size * 0.45);
  ctx.quadraticCurveTo(cx - size * 0.36, cy + size * 0.06, cx, cy + size * 0.06);
  ctx.quadraticCurveTo(cx + size * 0.36, cy + size * 0.06, cx + size * 0.38, cy + size * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawPerson(ctx, L, S, id, { title, compact, sub, subShort, sub2, color, square }) {
  const r = L.nodes[id], P = S.P, f = L.f, s = small(L), lk = look(S, id);
  if (lk.rev <= 0) return;
  ctx.save();
  ctx.globalAlpha = lk.alpha;
  card(ctx, r, P, { stroke: color, lw: 1.6, radius: square ? 4 : r.h / 2.4, glow: lk.glow, ring: lk.ring, ringColor: color });
  const size = Math.min(r.h * 0.82, r.w * 0.3);
  const cx = r.x + size * 0.5 + r.h * 0.12;
  figure(ctx, cx, r.y + r.h / 2, size, color, square);
  const tx = cx + size * 0.55, tw = r.x + r.w - tx - 4;
  // 収まる行だけを積む。最小11pxでも入らない補足は省き、図の下の説明文で補う。
  const rows = [];
  if (r.h >= f * 2.5) {
    rows.push({ text: title, weight: 700, color: P.ink, px: f * 0.95 });
    const second = [sub, subShort].find(text => text && fits(ctx, text, tw, 11));
    if (second) rows.push({ text: second, weight: 500, color, px: s });
    if (sub2 && rows.length === 2 && r.h >= f * 3.6 && fits(ctx, sub2, tw, 11)) rows.push({ text: sub2, weight: 500, color: P.sub, px: s });
  } else {
    const one = [compact, title].find(text => text && fits(ctx, text, tw, 11, 700)) ?? title;
    rows.push({ text: one, weight: 700, color: P.ink, px: f * 0.92 });
  }
  const lh = r.h / (rows.length + 0.6);
  const y0 = r.y + r.h / 2 - lh * (rows.length - 1) / 2;
  rows.forEach((row, i) => drawLabel(ctx, row.text, tx, y0 + lh * i, tw, row.px, { align: 'left', weight: row.weight, color: row.color, lines: 1 }));
  ctx.restore();
}

function drawSource(ctx, L, S) {
  const r = L.nodes.source, P = S.P, f = L.f, s = small(L), lk = look(S, 'source');
  const c = S.caseData;
  if (lk.rev <= 0 || !c) return;
  ctx.save();
  ctx.globalAlpha = lk.alpha;
  card(ctx, r, P, { radius: 2, lw: 1.3, glow: lk.glow, ring: lk.ring });
  const headH = Math.max(f * 1.35, 15);
  ctx.fillStyle = P.ink;
  roundRect(ctx, r.x, r.y, r.w, headH, 2);
  ctx.fill();
  drawLabel(ctx, `${c.stem}.mmd`, r.x + r.w / 2, r.y + headH / 2, r.w - 8, Math.min(f * 0.85, 15), { color: P.paper, family: MONO, lines: 1 });

  const body = { x: r.x + 5, y: r.y + headH + 4, w: r.w - 10, h: r.h - headH - 8 };
  const side = body.w > body.h * 1.25;
  const bars = side ? { x: body.x, y: body.y, w: body.w * 0.5, h: body.h } : { x: body.x, y: body.y, w: body.w, h: body.h * 0.45 };
  const pic = side ? { x: body.x + body.w * 0.54, y: body.y, w: body.w * 0.46, h: body.h } : { x: body.x, y: body.y + body.h * 0.5, w: body.w, h: body.h * 0.5 };
  const lines = c.mmd.split('\n').filter(line => line.length);
  const longest = Math.max(...lines.map(line => line.length));
  const rowH = bars.h / lines.length;
  const barH = Math.max(2, Math.min(rowH * 0.5, f * 0.45));
  lines.forEach((line, k) => {
    const indent = line.startsWith(' ') ? bars.w * 0.1 : 0;
    const w = Math.max(bars.w * 0.15, (bars.w - indent) * (line.trim().length / longest));
    const filledAt = k < 4 ? ARRIVALS.sourceLine(k) : ARRIVALS.sourceLine(3) + 0.25;
    ctx.fillStyle = S.clock >= filledAt ? (k < 4 ? P.marks[k] : P.ink) : P.faint;
    roundRect(ctx, bars.x + indent, bars.y + rowH * (k + 0.5) - barH / 2, w, barH, barH / 2);
    ctx.fill();
  });
  const appear = span(S.clock, ARRIVALS.schematic, ARRIVALS.schematic + 0.6);
  if (appear > 0) {
    ctx.save();
    ctx.globalAlpha *= appear;
    drawSchematic(ctx, pic, c.id, P);
    ctx.restore();
  }
  ctx.restore();
}

const SETTING_CHIPS = [
  { key: 'light', long: 'github-light', short: '明', mark: 5 },
  { key: 'dark', long: 'github-dark', short: '暗', mark: 5 },
  { key: 'font', long: 'Yu Gothic', short: 'Yu Gothic', mark: 5 },
  { key: 'png', long: 'PNG 幅1200', short: '1200', mark: 4 },
  { key: 'text', long: '文字図 色なし', short: '色なし', mark: 4 },
];

const COMPACT_CHIPS = [
  { key: 'light', short: '明', mark: 5 },
  { key: 'dark', short: '暗', mark: 5 },
  { key: 'png', short: 'PNG', mark: 4 },
  { key: 'text', short: '文字', mark: 4 },
];

function selectedSettings(S) {
  if (!S.format) return new Set();
  if (S.format === 'svg') return new Set([S.theme]);
  if (S.format === 'png') return new Set(['png', 'light']);
  if (S.format === 'text') return new Set(['text']);
  return new Set();
}

function flowChips(ctx, area, labels, h, px, gap) {
  const boxes = [];
  let x = area.x, y = area.y;
  for (const label of labels) {
    ctx.font = fontOf(px);
    const w = ctx.measureText(label).width + px * 1.1;
    if (x > area.x && x + w > area.x + area.w) {
      x = area.x;
      y += h + gap;
    }
    boxes.push({ x, y, w: Math.min(w, area.w), h });
    x += w + gap;
  }
  const bottom = y + h;
  return { boxes, ok: bottom <= area.y + area.h + 0.5 };
}

function drawSettings(ctx, L, S) {
  const r = L.nodes.settings, P = S.P, f = L.f, s = small(L), lk = look(S, 'settings');
  if (lk.rev <= 0) return;
  ctx.save();
  ctx.globalAlpha = lk.alpha;
  card(ctx, r, P, { radius: 4, lw: 1.2, glow: lk.glow, ring: lk.ring });
  const pad = Math.max(4, r.w * 0.035);
  const headW = Math.max(f * 2.6, 30);
  const vertical = r.w < r.h * 2.3;
  const head = vertical ? { x: r.x + pad, y: r.y + pad, w: r.w - pad * 2, h: f * 1.2 } : { x: r.x + pad, y: r.y, w: headW, h: r.h };
  drawLabel(ctx, '設定', head.x, head.y + head.h / 2, head.w, f * 0.9, { align: 'left', weight: 700, color: P.ink, lines: 1 });
  const area = vertical
    ? { x: r.x + pad, y: head.y + head.h + 2, w: r.w - pad * 2, h: r.h - head.h - pad * 2 - 2 }
    : { x: r.x + pad + headW, y: r.y + pad, w: r.w - headW - pad * 2, h: r.h - pad * 2 };
  const chipH = Math.max(s * 1.5, 15), gap = 3;
  let chips = SETTING_CHIPS;
  let labels = chips.map(c => c.long);
  let layout = flowChips(ctx, area, labels, chipH, s, gap);
  if (!layout.ok) {
    labels = chips.map(c => c.short);
    layout = flowChips(ctx, area, labels, chipH, s, gap);
  }
  if (!layout.ok) {
    // 狭い図では2×2の札にする（フォント指定は図の下の説明文で補う）。
    chips = COMPACT_CHIPS;
    labels = chips.map(c => c.short);
    const cw = (area.w - gap) / 2, ch = Math.min(chipH, (area.h - gap) / 2);
    layout = { boxes: chips.map((_, i) => ({ x: area.x + (i % 2) * (cw + gap), y: area.y + Math.floor(i / 2) * (ch + gap), w: cw, h: ch })) };
  }
  const rows = new Set(layout.boxes.map(b => b.y)).size;
  const rowH = layout.boxes[0].h;
  const offset = Math.max(0, (area.h - (rows * rowH + (rows - 1) * gap)) / 2);
  const chosen = selectedSettings(S);
  chips.forEach((chip, i) => {
    const box = { ...layout.boxes[i], y: layout.boxes[i].y + offset };
    const filled = S.clock >= ARRIVALS.settingsMark(chip.mark);
    const hot = chosen.has(chip.key);
    card(ctx, box, P, {
      fill: hot ? P.accent : null,
      stroke: hot ? P.accent : filled ? P.marks[chip.mark] : P.faint,
      dash: filled ? null : [3, 3], radius: box.h / 2, lw: filled ? 1.4 : 1,
    });
    drawLabel(ctx, labels[i], box.x + box.w / 2, box.y + box.h / 2, box.w - 2, s, { color: hot ? P.paper : P.ink, lines: 1 });
  });
  ctx.restore();
}

const CLI_PARTS = {
  read: { long: '.mmdを読む', short: '読込', sub: 'readFileSync' },
  bm: { long: 'beautiful-mermaid', short: 'b-mermaid', sub: '解析と配置' },
  svg: { long: 'renderMermaidSVG', short: 'SVG化', sub: 'テーマ・フォント' },
  ascii: { long: 'renderMermaidASCII', short: '文字図化', sub: 'SVGとは別の経路' },
  png: { long: 'png.mjs CSS整理', short: 'CSS整理', sub: '同じSVGから' },
  resvg: { long: 'Resvg 画像化', short: 'Resvg', sub: '幅1200' },
};

function drawCli(ctx, L, S) {
  const r = L.nodes.cli, P = S.P, f = L.f, s = small(L), lk = look(S, 'cli');
  if (lk.rev <= 0) return;
  ctx.save();
  ctx.globalAlpha = lk.alpha;
  card(ctx, r, P, { fill: P.cli, stroke: P.cli, radius: 8, glow: lk.glow, ring: lk.ring, ringColor: P.operator });
  const headY = r.y + L.cliHead / 2 + 1;
  const titleSize = Math.min(f, Math.max(11, L.cliHead * 0.62));
  drawLabel(ctx, 'ローカル Node CLI', r.x + 8, headY, r.w * 0.6, titleSize, { align: 'left', weight: 700, color: P.cliText, lines: 1 });
  ctx.font = fontOf(titleSize, 700);
  let x = r.x + 8 + ctx.measureText('ローカル Node CLI').width + 10;
  if (fits(ctx, 'scripts/render.mjs', r.x + r.w * 0.62 - x, 11, 500, MONO)) {
    drawLabel(ctx, 'scripts/render.mjs', x, headY, r.w, Math.min(s, 15), { align: 'left', family: MONO, color: P.cliText, lines: 1 });
    ctx.font = fontOf(Math.min(s, 15), 500, MONO);
    x += ctx.measureText('scripts/render.mjs').width + 10;
  }
  const notes = L.deps ? ['ブラウザ・DOM不要'] : ['npm依存は別途・ブラウザ不要', '＋npm依存'];
  for (const note of notes) {
    if (fits(ctx, note, r.x + r.w - 8 - x, Math.min(s, 15))) {
      ctx.save();
      ctx.globalAlpha *= 0.8;
      drawLabel(ctx, note, r.x + r.w - 8, headY, r.w, Math.min(s, 15), { align: 'right', color: P.cliText, lines: 1 });
      ctx.restore();
      break;
    }
  }
  if (L.deps) {
    const d = L.deps;
    ctx.save();
    ctx.globalAlpha *= 0.85;
    ctx.strokeStyle = P.cliText;
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 1;
    roundRect(ctx, d.x, d.y, d.w, d.h, 4);
    ctx.stroke();
    const rows = ['要：固定checkoutとnpm依存', 'beautiful-mermaid・@resvg/resvg-js', 'この作例には同梱していない'];
    const lh = d.h / (rows.length + 0.4);
    rows.forEach((row, i) => drawLabel(ctx, row, d.x + 6, d.y + lh * (i + 0.7), d.w - 10, Math.min(s, 14), { align: 'left', color: P.cliText, lines: 1 }));
    ctx.restore();
  }

  drawEdges(ctx, L, S, edge => edge.from.startsWith('cli.') || edge.to.startsWith('cli.'));

  for (const [id, meta] of Object.entries(CLI_PARTS)) {
    const box = L.nodes[`cli.${id}`];
    const pk = look(S, `cli.${id}`, 'cli');
    if (pk.rev <= 0) continue;
    ctx.save();
    ctx.globalAlpha = lk.alpha * pk.rev;
    card(ctx, box, P, { fill: P.cliPart, stroke: P.cliText, lw: 0.8, radius: Math.min(6, box.h / 3), glow: pk.glow, ringColor: P.accent });
    const label = fits(ctx, meta.long, box.w - 8, 11, 600) ? meta.long : meta.short;
    const room = box.h >= s * 2.6;
    if (room) {
      drawLabel(ctx, label, box.x + box.w / 2, box.y + box.h * 0.36, box.w - 8, Math.min(s * 1.05, 17), { color: P.cliText, weight: 600, lines: 1 });
      ctx.globalAlpha *= 0.75;
      drawLabel(ctx, meta.sub, box.x + box.w / 2, box.y + box.h * 0.72, box.w - 8, Math.min(s * 0.9, 14), { color: P.cliText, lines: 1 });
    } else {
      drawLabel(ctx, label, box.x + box.w / 2, box.y + box.h / 2, box.w - 6, Math.min(s, 16), { color: P.cliText, weight: 600, lines: 1 });
    }
    ctx.restore();
  }
  ctx.restore();
}

const TILE_LABELS = { svgLight: 'SVG 明', svgDark: 'SVG 暗', png: 'PNG 1200', text: '文字図' };
const TILE_SUBS = { svgLight: 'github-light', svgDark: 'github-dark', png: 'github-light', text: '色なし' };
const textThumbs = new WeakMap();

export function textThumb(caseData) {
  if (textThumbs.has(caseData)) return textThumbs.get(caseData);
  const rows = caseData.terminal.replace(/\n+$/, '').split('\n');
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const px = 16, lh = 19;
  ctx.font = `${px}px ${MONO}`;
  const width = Math.ceil(Math.max(...rows.map(row => ctx.measureText(row).width))) + 24;
  canvas.width = width;
  canvas.height = rows.length * lh + 20;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#1f2328';
  ctx.font = `${px}px ${MONO}`;
  ctx.textBaseline = 'top';
  rows.forEach((row, i) => ctx.fillText(row, 12, 10 + i * lh));
  textThumbs.set(caseData, canvas);
  return canvas;
}

function fitImage(ctx, image, box, iw, ih) {
  const k = Math.min(box.w / iw, box.h / ih);
  const w = iw * k, h = ih * k;
  ctx.drawImage(image, box.x + (box.w - w) / 2, box.y + (box.h - h) / 2, w, h);
}

function outputImage(c, key) {
  if (key === 'text') {
    const t = textThumb(c);
    return { image: t, w: t.width, h: t.height };
  }
  const image = c.images[key];
  return image ? { image, w: image.naturalWidth || image.width, h: image.naturalHeight || image.height } : null;
}

function drawTiles(ctx, L, S) {
  const P = S.P, s = small(L), c = S.caseData;
  for (const key of TILE_KEYS) {
    const r = L.tiles[key], lk = look(S, `tile.${key}`, 'tiles');
    if (lk.rev <= 0 || !c) continue;
    ctx.save();
    ctx.globalAlpha = lk.alpha;
    const filled = S.clock >= ARRIVALS.tile[key];
    const chosen = S.selected === key;
    card(ctx, r, P, { fill: P.paper, stroke: chosen ? P.accent : filled ? P.ink : P.faint, lw: chosen ? 2.4 : 1, dash: filled ? null : [4, 3], radius: 4, glow: lk.glow, ring: lk.ring });
    const headH = Math.min(Math.max(s * 1.45, 14), r.h * 0.34);
    const sub = r.w >= s * 11 && fits(ctx, `${TILE_LABELS[key]}  ${TILE_SUBS[key]}`, r.w - 8, s);
    drawLabel(ctx, sub ? `${TILE_LABELS[key]}  ${TILE_SUBS[key]}` : TILE_LABELS[key], r.x + r.w / 2, r.y + headH / 2 + 1, r.w - 4, s,
      { color: chosen ? P.accent : P.ink, weight: 700, lines: 1 });
    const box = { x: r.x + 3, y: r.y + headH, w: r.w - 6, h: r.h - headH - 3 };
    if (filled) {
      const out = outputImage(c, key);
      if (out) {
        ctx.save();
        ctx.globalAlpha *= span(S.clock, ARRIVALS.tile[key], ARRIVALS.tile[key] + 0.4);
        fitImage(ctx, out.image, box, out.w, out.h);
        ctx.restore();
      }
    }
    ctx.restore();
  }
}

function magnifier(ctx, cx, cy, size, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.5, size * 0.14);
  ctx.beginPath();
  ctx.arc(cx - size * 0.1, cy - size * 0.1, size * 0.32, 0, Math.PI * 2);
  ctx.moveTo(cx + size * 0.14, cy + size * 0.14);
  ctx.lineTo(cx + size * 0.42, cy + size * 0.42);
  ctx.stroke();
  ctx.restore();
}

export function relationsLit(clock, n) {
  const [a, b] = ARRIVALS.relations;
  if (clock < a) return 0;
  if (clock >= b) return n;
  return Math.min(n, Math.floor((clock - a) / ((b - a) / n)) + 1);
}

const CHECKS = ['12回 正常終了', '<svg で開始', 'PNG 幅1200', '文字図に図'];
const CHECKS_SHORT = ['12回', '<svg', 'PNG', '文字'];

function drawCheck(ctx, L, S) {
  const r = L.nodes.check, P = S.P, f = L.f, s = small(L), lk = look(S, 'check'), c = S.caseData;
  if (lk.rev <= 0 || !c) return;
  ctx.save();
  ctx.globalAlpha = lk.alpha;
  card(ctx, r, P, { stroke: P.reader, lw: 1.6, radius: 6, glow: lk.glow, ring: lk.ring, ringColor: P.reader });
  const pad = Math.max(4, Math.min(r.w, r.h) * 0.05);
  const headH = Math.max(f * 1.5, 16);
  const icon = Math.min(headH * 0.8, f * 1.2);
  magnifier(ctx, r.x + pad + icon / 2, r.y + pad * 0.5 + headH / 2, icon, P.reader);
  const n = c.relationships.length, lit = relationsLit(S.clock, n);
  const arrived = S.clock >= 21.9;
  const titleX = r.x + pad + icon + 4;
  const large = r.w >= f * 9 && r.h >= f * 6;
  drawLabel(ctx, large ? '読んで照合' : '照合', titleX, r.y + pad * 0.5 + headH / 2, r.x + r.w - titleX - pad, f * 0.92,
    { align: 'left', weight: 700, color: P.ink, lines: 1 });
  ctx.font = fontOf(f * 0.92, 700);
  const titleW = ctx.measureText(large ? '読んで照合' : '照合').width;
  if (large && fits(ctx, '制作担当・別工程', r.w - (titleX - r.x) - titleW - pad * 2, s)) {
    drawLabel(ctx, '制作担当・別工程', r.x + r.w - pad, r.y + pad * 0.5 + headH / 2, r.w, s, { align: 'right', color: P.operator, lines: 1 });
  }
  const body = { x: r.x + pad, y: r.y + headH + pad * 0.6, w: r.w - pad * 2, h: r.h - headH - pad * 1.6 };

  if (!large) {
    const pic = { x: body.x, y: body.y, w: body.w, h: body.h * 0.6 };
    drawSchematic(ctx, pic, c.id, P, { lit });
    drawLabel(ctx, `${lit}/${n}`, body.x + body.w / 2, body.y + body.h * 0.82, body.w, s, { color: lit === n ? P.reader : P.ink, weight: 700, lines: 1 });
    ctx.restore();
    return;
  }

  const side = body.w > body.h * 1.15;
  const compareH = body.h * (side ? 0.6 : 0.62);
  const capH = s * 1.4;
  const panels = side
    ? [{ x: body.x, y: body.y, w: body.w * 0.46, h: compareH }, { x: body.x + body.w * 0.54, y: body.y, w: body.w * 0.46, h: compareH }]
    : [{ x: body.x, y: body.y, w: body.w, h: compareH * 0.47 }, { x: body.x, y: body.y + compareH * 0.53, w: body.w, h: compareH * 0.47 }];
  const captions = ['原文 .mmd', S.theme === 'dark' ? '実出力 SVG 暗' : '実出力 SVG 明'];
  panels.forEach((p, i) => {
    card(ctx, p, P, { fill: P.bg, stroke: arrived ? P.sub : P.faint, dash: arrived ? null : [4, 3], radius: 3, lw: 1 });
    drawLabel(ctx, captions[i], p.x + 4, p.y + capH / 2 + 1, p.w - 8, s, { align: 'left', color: P.sub, lines: 1 });
    const inner = { x: p.x + 4, y: p.y + capH, w: p.w - 8, h: p.h - capH - 4 };
    if (!arrived) return;
    if (i === 0) drawSchematic(ctx, inner, c.id, P, { lit, fill: P.paper });
    else {
      const out = outputImage(c, S.theme === 'dark' ? 'svgDark' : 'svgLight');
      if (out) fitImage(ctx, out.image, inner, out.w, out.h);
    }
  });
  if (side) drawLabel(ctx, '⇄', body.x + body.w / 2, body.y + compareH / 2, body.w * 0.08, f, { color: P.reader, weight: 700, lines: 1 });

  const list = { x: body.x, y: body.y + compareH + pad * 0.6, w: body.w, h: body.h - compareH - pad * 0.6 };
  const cols = 2, rowsN = 3;
  const cellW = list.w / cols, cellH = list.h / rowsN;
  const useShortChecks = !fits(ctx, CHECKS[0], cellW - s * 1.6, s);
  CHECKS.forEach((label, k) => {
    const cx = list.x + (k % cols) * cellW, cy = list.y + cellH * (Math.floor(k / cols) + 0.5);
    const ok = S.clock >= ARRIVALS.checkList(k);
    const bs = Math.min(cellH * 0.62, s);
    ctx.strokeStyle = ok ? P.reader : P.faint;
    ctx.lineWidth = 1.4;
    ctx.strokeRect(cx, cy - bs / 2, bs, bs);
    if (ok) {
      ctx.beginPath();
      ctx.moveTo(cx + bs * 0.2, cy);
      ctx.lineTo(cx + bs * 0.42, cy + bs * 0.25);
      ctx.lineTo(cx + bs * 0.82, cy - bs * 0.3);
      ctx.stroke();
    }
    drawLabel(ctx, useShortChecks ? CHECKS_SHORT[k] : label, cx + bs + 4, cy, cellW - bs - 6, s, { align: 'left', color: ok ? P.ink : P.sub, lines: 1 });
  });
  const lastY = list.y + cellH * 2.5;
  const relText = `関係 ${lit}/${n}（ラベル・向き・条件）`;
  drawLabel(ctx, fits(ctx, relText, list.w, s) ? relText : `関係 ${lit}/${n}`, list.x, lastY, list.w, s,
    { align: 'left', weight: 700, color: lit === n ? P.reader : P.ink, lines: 1 });
  ctx.restore();
}

const USES = [
  { key: 'mmd', label: '.mmd', sub: '編集する', short: '編集' },
  { key: 'svg', label: 'SVG', sub: '資料・拡大', short: '資料' },
  { key: 'png', label: 'PNG', sub: '共有する', short: '共有' },
  { key: 'text', label: '文字図', sub: '端末で読む', short: '端末' },
];

function drawUse(ctx, L, S) {
  const r = L.nodes.use, P = S.P, f = L.f, s = small(L), lk = look(S, 'use');
  if (lk.rev <= 0) return;
  ctx.save();
  ctx.globalAlpha = lk.alpha;
  card(ctx, r, P, { stroke: P.reader, lw: 1.3, radius: 6, glow: lk.glow, ring: lk.ring, ringColor: P.reader });
  const pad = Math.max(3, Math.min(r.w, r.h) * 0.05);
  const large = r.h >= f * 6 && r.w >= f * 6;
  const headH = Math.max(f * 1.35, 15);
  drawLabel(ctx, '使う', r.x + pad, r.y + headH / 2 + 2, r.w - pad * 2, f * 0.92, { align: 'left', weight: 700, color: P.ink, lines: 1 });
  const body = { x: r.x + pad, y: r.y + headH + 2, w: r.w - pad * 2, h: r.h - headH - pad - 2 };
  const chosen = S.format;
  if (large) {
    const rows = USES.length + 1, rh = body.h / rows;
    USES.forEach((use, k) => {
      const y = body.y + rh * k;
      const lit = S.clock >= ARRIVALS.use(k);
      const hot = chosen === use.key;
      const box = { x: body.x, y: y + rh * 0.08, w: body.w, h: rh * 0.84 };
      card(ctx, box, P, { fill: hot ? P.accent : lit ? P.bg : null, stroke: hot ? P.accent : lit ? P.reader : P.faint, radius: 3, lw: 1 });
      const lw = Math.min(body.w * 0.36, s * 4.2);
      drawLabel(ctx, use.label, box.x + 5, box.y + box.h / 2, lw - 6, s, { align: 'left', weight: 700, color: hot ? P.paper : P.ink, lines: 1 });
      drawLabel(ctx, use.sub, box.x + lw, box.y + box.h / 2, box.w - lw - 4, s, { align: 'left', color: hot ? P.paper : P.sub, lines: 1 });
    });
    const desk = { x: body.x, y: body.y + rh * USES.length + rh * 0.08, w: body.w, h: rh * 0.84 };
    const deskLit = S.clock >= ARRIVALS.desk;
    card(ctx, desk, P, { fill: deskLit ? P.reader : null, stroke: deskLit ? P.reader : P.faint, radius: 3 });
    drawLabel(ctx, '元の読み比べ画面', desk.x + desk.w / 2, desk.y + desk.h / 2, desk.w - 6, s, { color: deskLit ? P.paper : P.sub, weight: 700, lines: 1 });
  } else {
    const cw = body.w / 2, ch = body.h / 2;
    USES.forEach((use, k) => {
      const box = { x: body.x + (k % 2) * cw + 1, y: body.y + Math.floor(k / 2) * ch + 1, w: cw - 2, h: ch - 2 };
      const lit = S.clock >= ARRIVALS.use(k);
      const hot = chosen === use.key;
      card(ctx, box, P, { fill: hot ? P.accent : lit ? P.bg : null, stroke: hot ? P.accent : lit ? P.reader : P.faint, radius: 3, lw: 1 });
      drawLabel(ctx, use.short, box.x + box.w / 2, box.y + box.h / 2, box.w, 11, { color: hot ? P.paper : P.ink, lines: 1 });
    });
  }
  ctx.restore();
}

// ───────── 線と動く印 ─────────

function revealOf(S, id) {
  if (!S.reveal) return 1;
  return S.reveal(id === 'outputs' ? 'tile.svgLight' : id);
}

function focused(S, id) {
  const group = id.startsWith('tile.') || id === 'outputs' ? 'tiles' : id.startsWith('cli.') ? 'cli' : null;
  return focusWeight(S, id, group);
}

function edgeActive(S, id) {
  return TRIPS.some(trip => trip.edge === id && S.clock >= trip.t0 && S.clock <= trip.t1);
}

function drawEdges(ctx, L, S, filter) {
  const P = S.P;
  for (const edge of Object.values(L.edges)) {
    if (!filter(edge)) continue;
    const rev = Math.min(revealOf(S, edge.from), revealOf(S, edge.to));
    if (rev <= 0) continue;
    const inner = edge.from.startsWith('cli.') && edge.to.startsWith('cli.');
    const cross = !inner && (edge.from.startsWith('cli.') || edge.to.startsWith('cli.'));
    const active = edgeActive(S, edge.id);
    const on = Math.max(focused(S, edge.from), focused(S, edge.to));
    const color = active ? P.accent : inner ? P.cliText : cross ? P.cross : P.edge;
    const lw = Math.max(1, L.f * 0.075) * (active ? 2 : 1);
    ctx.save();
    ctx.globalAlpha = rev * lerp(0.3, inner ? 0.75 : 0.85, on);
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    if (edge.dash) ctx.setLineDash([lw * 4, lw * 3]);
    strokeCurve(ctx, edge.curve);
    ctx.setLineDash([]);
    const p3 = edge.curve[3];
    const tail = curvePoint(edge.curve, 0.95);
    arrowHead(ctx, p3, Math.atan2(p3[1] - tail[1], p3[0] - tail[0]), lw * 3 + 4, color);
    if (edge.label && !inner && !cross && L.kind !== 'square' && !(L.kind === 'tall' && edge.id === 'source-check')) {
      const [rawX, y] = curvePoint(edge.curve, edge.id === 'book-settings' ? 0.22 : 0.5);
      const px = Math.max(11, L.f * 0.66);
      ctx.font = fontOf(px, 600);
      const w = ctx.measureText(edge.label).width + px * 0.8;
      const x = clamp(rawX, w / 2 + 4, L.width - w / 2 - 4);
      ctx.fillStyle = P.bg;
      roundRect(ctx, x - w / 2, y - px * 0.75, w, px * 1.5, px * 0.75);
      ctx.fill();
      drawLabel(ctx, edge.label, x, y, w, px, { color: active ? P.accent : P.sub, weight: 600, lines: 1 });
    }
    ctx.restore();
  }
}

function chip(ctx, x, y, text, px, { fill, stroke, color, family = SANS, weight = 700, dash = null }) {
  ctx.font = fontOf(px, weight, family);
  const w = ctx.measureText(text).width + px * 1.1, h = px * 1.6;
  roundRect(ctx, x - w / 2, y - h / 2, w, h, h / 2);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.save();
    if (dash) ctx.setLineDash(dash);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();
  }
  drawLabel(ctx, text, x, y, w + 4, px, { color, family, weight, lines: 1 });
  return { w, h };
}

function paperIcon(ctx, x, y, px, P, label = '.mmd') {
  const w = Math.max(px * 3.2, 34), h = px * 2.6, fold = h * 0.28;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y - h / 2);
  ctx.lineTo(x + w / 2 - fold, y - h / 2);
  ctx.lineTo(x + w / 2, y - h / 2 + fold);
  ctx.lineTo(x + w / 2, y + h / 2);
  ctx.lineTo(x - w / 2, y + h / 2);
  ctx.closePath();
  ctx.fillStyle = P.paper;
  ctx.fill();
  ctx.strokeStyle = P.ink;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  drawLabel(ctx, label, x, y + px * 0.1, w, px, { color: P.ink, family: MONO, weight: 700, lines: 1 });
}

function graphIcon(ctx, x, y, px, P) {
  const w = px * 3.4, h = px * 1.8;
  ctx.fillStyle = P.paper;
  roundRect(ctx, x - w / 2, y - h / 2, w, h, 4);
  ctx.fill();
  ctx.strokeStyle = P.ink;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  const pts = [[-0.32, 0], [0, -0.18], [0.32, 0.12]];
  ctx.beginPath();
  ctx.moveTo(x + pts[0][0] * w, y + pts[0][1] * h * 2);
  pts.slice(1).forEach(p => ctx.lineTo(x + p[0] * w, y + p[1] * h * 2));
  ctx.stroke();
  pts.forEach(([a, b], i) => {
    nodeShape(ctx, i === 1 ? 'diamond' : 'rect', x + a * w, y + b * h * 2, px * 0.75, px * 0.5);
    ctx.fillStyle = P.accent;
    ctx.fill();
  });
}

function drawTokens(ctx, L, S) {
  const P = S.P, px = small(L);
  for (const trip of TRIPS) {
    const lead = 0.15;
    if (S.clock < trip.t0 - lead || S.clock > trip.t1 + lead) continue;
    const edge = L.edges[trip.edge];
    if (!edge) continue;
    const u = ease((S.clock - trip.t0) / (trip.t1 - trip.t0));
    const [x, y] = curvePoint(edge.curve, u);
    const fade = clamp(Math.min((S.clock - (trip.t0 - lead)) / lead, (trip.t1 + lead - S.clock) / lead), 0, 1);
    ctx.save();
    ctx.globalAlpha = fade * revealOf(S, edge.from);
    switch (trip.kind) {
      case 'mark':
        chip(ctx, x, y, MARKS[trip.mark], px, { fill: P.marks[trip.mark], color: '#ffffff' });
        break;
      case 'mark-line': {
        ctx.font = fontOf(px, 700);
        const cw = ctx.measureText(MARKS[trip.mark]).width + px * 1.1;
        const w = lerp(cw, L.f * 1.8, u), h = lerp(px * 1.6, Math.max(3, L.f * 0.32), u);
        ctx.fillStyle = P.marks[trip.mark];
        roundRect(ctx, x - w / 2, y - h / 2, w, h, h / 2);
        ctx.fill();
        if (u < 0.6) {
          ctx.globalAlpha *= 1 - u / 0.6;
          drawLabel(ctx, MARKS[trip.mark], x, y, w, px, { color: '#ffffff', weight: 700, lines: 1 });
        }
        break;
      }
      case 'guide': {
        const size = chip(ctx, x, y, trip.label, px, { fill: P.paper, stroke: P.accent, color: P.accent });
        ctx.fillStyle = P.accent;
        ctx.fillRect(x - size.w / 2 + size.h * 0.3, y - size.h / 2 - 3, size.h * 0.35, 5);
        break;
      }
      case 'paper':
        paperIcon(ctx, x, y, px, P);
        break;
      case 'settings':
        chip(ctx, x, y, '設定', px, { fill: P.ink, color: P.paper });
        break;
      case 'paper-graph':
        ctx.save();
        ctx.globalAlpha *= 1 - u;
        paperIcon(ctx, x, y, px, P);
        ctx.restore();
        ctx.globalAlpha *= u;
        graphIcon(ctx, x, y, px, P);
        break;
      case 'svg':
        chip(ctx, x, y, 'SVG', px, { fill: '#ffffff', stroke: '#0969da', color: '#0969da' });
        break;
      case 'svg-dark':
        chip(ctx, x, y, 'SVG', px, { fill: '#0d1117', stroke: '#4493f8', color: '#4493f8' });
        break;
      case 'png':
        chip(ctx, x, y, 'PNG', px, { fill: P.paper, stroke: P.ink, color: P.ink });
        break;
      case 'text':
        chip(ctx, x, y, '┼ 文字', px, { fill: P.paper, stroke: P.ink, color: P.ink, family: MONO });
        break;
      case 'css':
        chip(ctx, x, y, 'CSS整理', px, { fill: P.paper, stroke: P.operator, color: P.operator, dash: [3, 2] });
        break;
      default:
        break;
    }
    ctx.restore();
  }
}

function drawBands(ctx, L, S) {
  const P = S.P;
  const colors = { author: P.bandAuthor, operator: P.bandOperator, reader: P.bandReader };
  const text = { author: P.author, operator: P.operator, reader: P.reader };
  const anchors = { author: 'book', operator: 'operator', reader: 'check' };
  for (const band of L.bands) {
    const rev = S.reveal ? S.reveal(anchors[band.role]) : 1;
    if (rev <= 0) continue;
    ctx.save();
    ctx.globalAlpha = rev;
    ctx.fillStyle = colors[band.role];
    band.rects.forEach(r => ctx.fillRect(r.x, r.y, r.w, r.h));
    const first = band.rects[0];
    const px = Math.max(11, L.f * 0.68);
    const firstNodeGap = L.kind === 'square' && band.role === 'reader' ? 0 : 1;
    if (firstNodeGap) {
      ctx.font = fontOf(px, 700);
      drawLabel(ctx, band.label, first.x + Math.max(6, L.width * 0.012), first.y + px * 0.85, first.w * 0.5, px,
        { align: 'left', weight: 700, color: text[band.role], lines: 1 });
    }
    ctx.restore();
  }
}

function drawStrip(ctx, L, S) {
  if (!L.strip) return;
  const P = S.P, r = L.strip, f = L.f;
  const y = r.y + r.h / 2;
  drawLabel(ctx, 'Pretty Mermaid', r.x + L.width * 0.03, y, r.w * 0.4, f * 1.05, { align: 'left', weight: 700, family: SERIF, color: P.ink, lines: 1 });
  ctx.font = fontOf(f * 1.05, 700, SERIF);
  const used = ctx.measureText('Pretty Mermaid').width;
  const restX = r.x + L.width * 0.03 + used + f * 0.6;
  const tagline = '＝ AIが読む指示書 ＋ 手元のNode CLI';
  if (S.title) {
    const total = S.title.total, dot = Math.max(4, f * 0.26), gap = dot * 2.6;
    const dotsW = total * gap;
    const right = r.x + r.w - L.width * 0.03;
    const label = `${S.title.index + 1}/${total} ${S.title.label}`;
    ctx.font = fontOf(Math.max(11, f * 0.8), 700);
    const labelW = ctx.measureText(label).width;
    for (let i = 0; i < total; i += 1) {
      ctx.beginPath();
      ctx.arc(right - dotsW + gap * (i + 0.5), y, dot, 0, Math.PI * 2);
      ctx.fillStyle = i === S.title.index ? P.accent : i < S.title.index ? P.ink : P.faint;
      ctx.fill();
    }
    drawLabel(ctx, label, right - dotsW - f * 0.5, y, labelW + 2, Math.max(11, f * 0.8), { align: 'right', weight: 700, color: P.accent, lines: 1 });
    const room = right - dotsW - f - labelW - restX;
    if (fits(ctx, tagline, room, Math.max(11, f * 0.74))) drawLabel(ctx, tagline, restX, y, room, Math.max(11, f * 0.74), { align: 'left', color: P.sub, lines: 1 });
  } else {
    drawLabel(ctx, tagline, restX, y, r.w * 0.45, Math.max(11, f * 0.74), { align: 'left', color: P.sub, lines: 1 });
    if (S.note) drawLabel(ctx, S.note, r.x + r.w - L.width * 0.02, y, r.w * 0.4, Math.max(11, f * 0.68), { align: 'right', color: P.sub, lines: 1 });
  }
}

// S: { P, clock, nodeClock?, reveal, focus, part, partNodes, caseData, theme, format, selected, title, note }
// nodeClock があれば部品ごとの表示時刻をそこから取る（概念ページで1段階だけ再生するため）。動く印は常に S.clock。
export function drawConcept(ctx, L, S) {
  const at = id => (S.nodeClock ? { ...S, clock: S.nodeClock(id) } : S);
  ctx.save();
  ctx.fillStyle = S.P.bg;
  ctx.fillRect(0, 0, L.width, L.height);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  drawBands(ctx, L, S);
  drawStrip(ctx, L, S);
  drawEdges(ctx, L, S, edge => !edge.from.startsWith('cli.') && !edge.to.startsWith('cli.'));
  drawBook(ctx, L, at('book'));
  drawRequest(ctx, L, at('request'));
  drawPerson(ctx, L, at('author'), 'author', { title: '作者AI', compact: '作者AI', sub: 'Opus 5.5・受領1件', subShort: 'Opus 5.5', sub2: 'CLIは実行しない', color: S.P.author, square: false });
  drawSource(ctx, L, at('source'));
  drawSettings(ctx, L, at('settings'));
  drawPerson(ctx, L, at('operator'), 'operator', { title: '制作担当', compact: '制作担当 ×12', sub: 'node scripts/render.mjs ×12', subShort: 'node ×12', sub2: null, color: S.P.operator, square: true });
  drawCli(ctx, L, at('cli'));
  drawTiles(ctx, L, at('tiles'));
  drawCheck(ctx, L, at('check'));
  drawUse(ctx, L, at('use'));
  drawTokens(ctx, L, S);
  ctx.restore();
}

// ───────── 概念ページ ─────────

export const SETTLED_CLOCK = 29;
const FORMATS = {
  svg: { label: 'SVG', mime: 'image/svg+xml' },
  png: { label: 'PNG', mime: 'image/png' },
  text: { label: '文字図', mime: 'text/plain;charset=utf-8' },
  mmd: { label: '.mmd', mime: 'text/plain;charset=utf-8' },
};
const PART_STAGE = { instructions: 0, types: 0, theme: 0, source: 0, render: 1, check: 2 };
const PHASE_NOTES = [
  '指示書と必要な構文・テーマの参照、架空の依頼が、同じ作者AIへ入ります。作者AIは.mmdを保存するだけで、CLIは動かしていません。',
  '制作担当が同じ.mmdと設定をローカルのNode CLIへ渡します。SVGはbeautiful-mermaid、PNGは同じSVGをpng.mjsで整えてResvgで画像化、文字図はrenderMermaidASCIIの別経路です。',
  '書き出した12ファイルを別工程で読み、原文のラベル・矢印の向き・条件と照合します。自動の意味保証や人の承認ではありません。用途に合わせて.mmd・SVG・PNG・文字図を使い分けます。',
];

export function recordFor(caseData, format, theme) {
  if (format === 'svg') {
    const key = theme === 'dark' ? 'svgDark' : 'svgLight';
    const out = caseData.outputs[key];
    return { key, file: out.file, command: out.command, kind: `SVG・github-${theme === 'dark' ? 'dark' : 'light'}`, note: '' };
  }
  if (format === 'png') {
    const out = caseData.outputs.png;
    return {
      key: 'png', file: out.file, command: out.command, kind: 'PNG・github-light・幅1200',
      note: theme === 'dark' ? 'ダークのPNGは元の制作で書き出していません。保存されるのは github-light のPNGです。' : 'PNGは元の github-light だけです。',
    };
  }
  if (format === 'text') {
    const out = caseData.outputs.text;
    return { key: 'text', file: out.file, command: out.command, kind: '文字図・色なし（Unicode罫線）', note: '文字図はテーマで変わりません。' };
  }
  return { key: 'mmd', file: caseData.mmdFile, command: null, kind: 'Mermaidの記述（作者AIが執筆）', note: '.mmdはテーマで変わりません。' };
}

function initConcept() {
  const $ = id => document.getElementById(id);
  const html = document.documentElement;
  const el = {
    status: $('load-status'), retry: $('retry'), canvas: $('concept-map'), meta: $('case-meta'), phase: $('phase-note'),
    desk: $('open-desk'), save: $('save-record'), saveStatus: $('save-status'), recordName: $('record-name'),
    recordContent: $('record-content'), format: $('save-format'), replay: $('replay'), themeNote: $('theme-note'),
    preview: $('record-preview'), previewText: $('record-preview-text'),
    request: $('request-text'), copy: $('copy-request'), copyStatus: $('copy-status'),
    partLabel: $('part-label'), partMeaning: $('part-meaning'), partQuote: $('part-quote'), partSource: $('part-source'), partLocal: $('part-local'),
  };
  const all = selector => [...document.querySelectorAll(selector)];
  const caseButtons = all('button[data-case]');
  const stageButtons = all('button[data-stage]');
  const themeButtons = all('button[data-theme]');
  const partButtons = all('button[data-part]');
  const dependents = [...caseButtons, ...stageButtons, ...themeButtons, ...partButtons, el.replay, el.save, el.format, el.copy];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const darkScheme = matchMedia('(prefers-color-scheme: dark)');
  const hashCase = () => {
    const id = decodeURIComponent(location.hash.slice(1));
    return CASE_IDS.includes(id) ? id : null;
  };
  const state = {
    bundle: null, caseId: hashCase() || 'flow', stage: 0, theme: 'light', format: 'svg', part: 'instructions',
    clock: SETTLED_CLOCK, animStage: null, raf: 0, attempt: 0, size: { w: 0, h: 0, dpr: 1 }, played: false,
  };

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const toTop = () => { if (hashCase()) window.scrollTo(0, 0); };
  toTop();
  window.addEventListener('load', toTop, { once: true });

  const current = () => state.bundle?.caseById[state.caseId];

  function measure() {
    const width = Math.max(260, Math.round(el.canvas.parentElement.getBoundingClientRect().width));
    const height = width < 640 ? Math.round(width * 0.96) : Math.round(width * 0.5625);
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    el.canvas.style.height = `${height}px`;
    const pw = Math.round(width * dpr), ph = Math.round(height * dpr);
    if (el.canvas.width !== pw || el.canvas.height !== ph) {
      el.canvas.width = pw;
      el.canvas.height = ph;
    }
    state.size = { w: width, h: height, dpr };
  }

  function selectedTile() {
    if (state.format === 'svg') return state.theme === 'dark' ? 'svgDark' : 'svgLight';
    return state.format === 'png' || state.format === 'text' ? state.format : null;
  }

  function draw() {
    const ctx = el.canvas.getContext('2d');
    const { w, h, dpr } = state.size;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (!state.bundle || !w) return;
    const stageNodes = state.animStage === null ? null : new Set(STAGES[state.animStage].nodes);
    drawConcept(ctx, computeLayout(w, h), {
      P: darkScheme.matches ? PALETTES.dark : PALETTES.light,
      clock: state.clock,
      nodeClock: id => (stageNodes && stageNodes.has(id) ? state.clock : SETTLED_CLOCK),
      reveal: null,
      focus: new Set(STAGES[state.stage].nodes),
      part: state.part,
      partNodes: new Set(PART_NODES[state.part] ?? []),
      caseData: current(),
      theme: state.theme,
      format: state.format,
      selected: selectedTile(),
      note: '保存済みの原出力を表示・その場で生成しない',
    });
  }

  function stopAnimation() {
    cancelAnimationFrame(state.raf);
    state.raf = 0;
    state.animStage = null;
    state.clock = SETTLED_CLOCK;
  }

  function showStage(stage, animate) {
    stopAnimation();
    state.stage = stage;
    stageButtons.forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.stage) === stage)));
    el.phase.textContent = PHASE_NOTES[stage];
    if (!animate || reduce.matches || !state.bundle) {
      draw();
      return;
    }
    const [a, b] = STAGES[stage].window;
    const started = performance.now();
    const duration = 2200 + (b - a) * 90;
    state.animStage = stage;
    const tick = now => {
      if (!state.bundle) return;
      const k = Math.min(1, (now - started) / duration);
      state.clock = a + (b - a) * k;
      if (k >= 1) {
        stopAnimation();
        draw();
        return;
      }
      draw();
      state.raf = requestAnimationFrame(tick);
    };
    state.raf = requestAnimationFrame(tick);
  }

  function fillArticles() {
    for (const c of state.bundle.cases) {
      const article = document.getElementById(c.id);
      if (!article) continue;
      const slot = name => article.querySelector(`[data-slot="${name}"]`);
      if (slot('summary')) slot('summary').textContent = c.summary;
      if (slot('mmd')) slot('mmd').textContent = c.mmd;
      if (slot('count')) slot('count').textContent = `関係${c.relationships.length}本`;
      const list = slot('relations');
      if (list) list.replaceChildren(...c.relationships.map(text => Object.assign(document.createElement('li'), { textContent: text })));
      const files = slot('files');
      if (files) files.textContent = [c.mmdPath, ...TILE_KEYS.map(k => c.outputs[k].file.path)].join('　');
    }
  }

  function clearArticles() {
    for (const id of CASE_IDS) {
      document.getElementById(id)?.querySelectorAll('[data-slot]').forEach(node => node.replaceChildren());
    }
  }

  function renderCase() {
    const c = current();
    caseButtons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.case === state.caseId)));
    for (const id of CASE_IDS) document.getElementById(id)?.classList.toggle('is-current', id === state.caseId);
    el.desk.href = `desk.html#${state.caseId}`;
    if (!c) return;
    el.meta.textContent = `${c.label}・${c.mmd.split('\n')[0]}・関係${c.relationships.length}本・出力4種（SVG明／暗・PNG・文字図）`;
    renderRecord();
  }

  function renderRecord() {
    const c = current();
    if (!c) return;
    const rec = recordFor(c, state.format, state.theme);
    const name = rec.file.path.split('/').pop();
    themeButtons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.theme === state.theme)));
    el.format.value = state.format;
    el.save.textContent = `${FORMATS[state.format].label}を保存`;
    el.save.setAttribute('aria-describedby', 'record-name');
    el.recordName.textContent = `保存するファイル：${name}（${rec.kind}・${rec.file.size}バイト）`;
    el.themeNote.textContent = rec.note;
    const rows = [
      ['パス', rec.file.path],
      ['大きさ', `${rec.file.size}バイト`],
      ['SHA-256', rec.file.sha256],
      ['由来', rec.command ? '元の制作で制作担当が原典CLIを実行して書き出した出力（再実行していない）' : '元のOpus 5.5の制作で作者AIが執筆した記述'],
      ['元のコマンド', rec.command ? rec.command.map(part => (/\s/.test(part) ? `'${part}'` : part)).join(' ') : 'なし（CLIの入力として使われた）'],
    ];
    el.recordContent.replaceChildren(...rows.flatMap(([k, v]) => [
      Object.assign(document.createElement('dt'), { textContent: k }),
      Object.assign(document.createElement('dd'), { textContent: v }),
    ]));
    if (rec.key === 'svgLight' || rec.key === 'svgDark' || rec.key === 'png') {
      el.preview.src = c.urls[rec.key];
      el.preview.alt = `${c.label}の${rec.kind}（保存済みの原出力）`;
      el.preview.hidden = false;
      el.previewText.hidden = true;
      el.previewText.textContent = '';
    } else {
      el.preview.removeAttribute('src');
      el.preview.alt = '';
      el.preview.hidden = true;
      el.previewText.hidden = false;
      el.previewText.textContent = rec.key === 'text' ? c.terminal : c.mmd;
    }
    el.saveStatus.textContent = '';
    draw();
  }

  function renderPart() {
    const p = state.bundle?.partById[state.part];
    partButtons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.part === state.part)));
    if (!p) return;
    const upstream = p.source_path.replace(/^vendor\/pretty-mermaid\//, '');
    el.partLabel.textContent = p.label;
    el.partMeaning.textContent = p.meaning;
    el.partQuote.textContent = p.quote;
    el.partSource.href = p.source_url;
    el.partSource.textContent = `原典 ${upstream} の${p.line_start}行目（固定版 e234ab7）`;
    el.partLocal.href = p.source_path;
    el.partLocal.textContent = `同梱の写し ${p.source_path}`;
  }

  function clearOutputs() {
    stopAnimation();
    el.request.value = '';
    el.meta.textContent = '';
    el.recordName.textContent = '';
    el.recordContent.replaceChildren();
    el.themeNote.textContent = '';
    el.saveStatus.textContent = '';
    el.copyStatus.textContent = '';
    el.preview.removeAttribute('src');
    el.preview.hidden = true;
    el.previewText.textContent = '';
    el.previewText.hidden = true;
    for (const node of [el.partLabel, el.partMeaning, el.partQuote, el.partSource, el.partLocal]) node.textContent = '';
    el.partSource.removeAttribute('href');
    el.partLocal.removeAttribute('href');
    clearArticles();
    draw();
  }

  function setEnabled(on) {
    dependents.forEach(control => { control.disabled = !on; });
  }

  async function load() {
    const attempt = ++state.attempt;
    releaseBundle(state.bundle);
    state.bundle = null;
    html.dataset.state = 'loading';
    el.retry.hidden = true;
    setEnabled(false);
    clearOutputs();
    el.status.textContent = `保存済みの${MANIFEST_FILE_COUNT}ファイルを検証しています…`;
    try {
      const bundle = await loadVerifiedBundle({
        onProgress: (done, total) => {
          if (attempt === state.attempt && html.dataset.state === 'loading') el.status.textContent = `保存済みのファイルを検証しています… ${done}/${total}`;
        },
      });
      if (attempt !== state.attempt) {
        releaseBundle(bundle);
        return;
      }
      state.bundle = bundle;
      html.dataset.state = 'ready';
      el.status.textContent = '28ファイルのSHA-256・12出力・3記述・6引用を確認済み。図は保存済みの原出力です。';
      el.request.value = bundle.request;
      fillArticles();
      renderPart();
      setEnabled(true);
      renderCase();
      toTop();
      const animate = !state.played;
      state.played = true;
      showStage(state.stage, animate);
    } catch (error) {
      if (attempt !== state.attempt) return;
      state.bundle = null;
      html.dataset.state = 'error';
      setEnabled(false);
      clearOutputs();
      el.status.textContent = `表示を止めました：${error instanceof LoadError ? error.message : '保存済みファイルを確かめられませんでした。'}`;
      el.retry.hidden = false;
    }
  }

  async function saveRecord() {
    const c = current();
    if (!c) return;
    const rec = recordFor(c, state.format, state.theme);
    const name = rec.file.path.split('/').pop();
    el.saveStatus.textContent = 'ファイルの内容をもう一度確かめています…';
    let digest = '';
    try {
      digest = await sha256Hex(rec.file.bytes);
    } catch {
      digest = '';
    }
    if (current() !== c) return;
    if (digest !== rec.file.sha256 || rec.file.bytes.byteLength !== rec.file.size) {
      el.saveStatus.textContent = `${name} の内容が検証時と一致しないため、保存へ渡しませんでした。`;
      return;
    }
    const url = URL.createObjectURL(new Blob([rec.file.bytes], { type: FORMATS[state.format].mime }));
    const anchor = Object.assign(document.createElement('a'), { href: url, download: name, rel: 'noopener' });
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    el.saveStatus.textContent = `${name}（${rec.file.size}バイト・SHA-256一致）をブラウザーの保存へ渡しました。保存できたかはブラウザーの表示で確かめてください。`;
  }

  async function copyRequest() {
    if (!state.bundle) return;
    const text = state.bundle.request;
    try {
      await navigator.clipboard.writeText(text);
      el.copyStatus.textContent = '依頼文をコピーしました。【】の部分を自分の手順に書き換えて使います。';
    } catch {
      el.request.focus();
      el.request.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      el.copyStatus.textContent = ok ? '依頼文をコピーしました。' : '自動でコピーできませんでした。選択された依頼文を手動でコピーしてください。';
    }
  }

  function selectCase(id, { updateHash }) {
    if (!CASE_IDS.includes(id)) return;
    state.caseId = id;
    if (updateHash) history.replaceState(null, '', `#${id}`);
    renderCase();
  }

  caseButtons.forEach(button => button.addEventListener('click', () => selectCase(button.dataset.case, { updateHash: true })));
  stageButtons.forEach(button => button.addEventListener('click', () => showStage(Number(button.dataset.stage), true)));
  el.replay.addEventListener('click', () => showStage(state.stage, true));
  themeButtons.forEach(button => button.addEventListener('click', () => {
    state.theme = button.dataset.theme === 'dark' ? 'dark' : 'light';
    renderRecord();
  }));
  el.format.addEventListener('change', () => {
    state.format = Object.hasOwn(FORMATS, el.format.value) ? el.format.value : 'svg';
    renderRecord();
  });
  partButtons.forEach(button => button.addEventListener('click', () => {
    state.part = button.dataset.part;
    renderPart();
    showStage(PART_STAGE[state.part] ?? state.stage, false);
  }));
  el.save.addEventListener('click', saveRecord);
  el.copy.addEventListener('click', copyRequest);
  el.retry.addEventListener('click', load);
  window.addEventListener('hashchange', () => {
    const id = hashCase();
    if (id && id !== state.caseId) selectCase(id, { updateHash: false });
  });
  darkScheme.addEventListener?.('change', draw);
  new ResizeObserver(() => { measure(); draw(); }).observe(el.canvas.parentElement);

  measure();
  renderCase();
  load();
}

if (typeof document !== 'undefined' && document.body?.dataset.view === 'concept') initConcept();
