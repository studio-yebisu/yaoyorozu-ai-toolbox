# Defuddle の作例：本文を取り出す読書室

Webページから記事の本文・タイトル・著者を取り出すライブラリ Defuddle を、架空の3つの記事（読書会の案内、記録ノートの保存手順、検索画面のテスト）に使う静的な作例です。記事を選んで「本文を取り出す」を押すと、同梱の Defuddle がブラウザーの中で動き、元のページの見え方と、取り出した Markdown を見比べられます。

Defuddle は SKILL.md を持つスキルではなく、JavaScript のライブラリと CLI です。この作例でもスキル文書は作っていません。

## 開き方

`samples.json` を `fetch` で読むため、ファイルを直接開くのではなく、このフォルダをローカルのHTTPサーバーで配信して `index.html` を開きます。

```bash
python -m http.server 8000   # http://127.0.0.1:8000/index.html
```

- `#reading`・`#operation`・`#research` で開くと、その記事を選んだ状態になります。
- 記事は矢印キーで選べます。選んだ記事で Enter を押すか、「本文を取り出す」を押すと取り出します。
- 記事を切り替えると、前の結果は消えます。取り出したあとに、本文の条件が Markdown に残っているかと、本文の外の文言が入っていないかを調べて表示します。
- 「Markdownをコピー」で `content` をそのままコピーし、「.mdで保存」で `reading.md` などとして保存します。

本文抽出の入力は `samples.json` の3記事で、実行するライブラリは同梱の `vendor/defuddle/defuddle.full.js` です。表示用のHTML・CSS・JavaScriptもこの作例に含まれ、外部ページやAIサービスへ接続せず動きます。

## ブラウザーでの呼び出し

```js
const doc = new DOMParser().parseFromString(sample.input, 'text/html');
const result = new Defuddle(doc, {
  url: sample.url,          // https://example.test/reading など、公開されていないサンプルのURL
  markdown: true,           // content を Markdown で返す（full 版に含まれる変換）
  useAsync: false,          // 本文が取れないときに外部APIへ切り替える機能を使わない
  removeImages: true
}).parse();
// 表示するのは result.title・result.author・result.content だけ
```

- 取り出した結果は `textContent` と `<pre>` で表示し、HTMLとして挿入しません。
- 元のページは `sandbox=""` の iframe に、`default-src 'none'; style-src 'unsafe-inline'` の CSP を加えて表示します。スクリプトは動かず、外部の読み込みもできず、枠の中は操作できません。元のHTMLはコードとしても読めます。
- `parseTime` は表示していません。性能の指標としては扱いません。

## 使ったライブラリ

- 原典：[kepano/defuddle](https://github.com/kepano/defuddle/tree/556d74e8c8fd68c49912d4b11a4ae9ec04d7b2b5)
- 固定コミット：`556d74e8c8fd68c49912d4b11a4ae9ec04d7b2b5`（v0.19.5、MIT License）
- 同梱：`vendor/defuddle/` に README・LICENSE・package.json・package-lock.json、この固定ソースと lockfile からビルドした full 版のブラウザー用バンドル `defuddle.full.js`（Markdown 変換を含む）、バンドルに含まれるライブラリの `THIRD_PARTY_NOTICES.txt` を置いています。生成したバンドルは変更していません。範囲は `vendor/defuddle/UPSTREAM.json` に記録しています。

### バンドルを作り直す

固定コミットを取得し、依存をインストールスクリプトなしで入れてから、ビルドを1段ずつ実行します（`npm run build` は先頭の `rm -rf dist` が環境によって動かないため、分けて実行します）。

```bash
git clone https://github.com/kepano/defuddle.git
cd defuddle
git checkout 556d74e8c8fd68c49912d4b11a4ae9ec04d7b2b5
npm ci --ignore-scripts
npm run build:types
npm run build:node
npm run build:js
```

`build:js`（webpack）が出力する full 版が、`package.json` の `defuddle/full` が指す `dist/index.full.js` です。

## Node API で同じ3件を取り出す

保存用の実出力は、ブラウザーではなく Node API で作ります。jsdom で作った `Document` と URL を渡します。ビルドした上のフォルダを、`"type": "module"` の別フォルダから使う例です。

```bash
cd ..                       # defuddle/ の隣に作る
mkdir defuddle-run && cd defuddle-run
npm init -y
npm pkg set type=module
npm install ../defuddle jsdom --ignore-scripts
```

```js
// extract.mjs
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { Defuddle } from 'defuddle/node';

const { samples } = JSON.parse(await readFile('path/to/samples.json', 'utf8'));
for (const sample of samples) {
  const dom = new JSDOM(sample.input, { url: sample.url });
  const result = await Defuddle(dom.window.document, sample.url, {
    markdown: true,
    useAsync: false,
    removeImages: true
  });
  console.log(sample.id, result.title, result.author, result.wordCount);
  console.log(result.content);
}
```

## 保存するもの

- `fixtures/*.html`：入力の元HTML。`samples.json` の各 `input` は、このファイルの全文と同じ文字列です。
- `samples.json`：`{format, synthetic, samples: [{id, label, input, output, fixture, url, kept, removed}]}`。`kept` は本文にある条件の短い引用、`removed` は本文の外に置いた3つの文言です。`output` には、Node API で取り出した実際の Markdown を手を加えずに入れます。
- `extraction-results.json`：Node API の実出力。`{engine: "Defuddle", commit, options: {markdown: true, useAsync: false, removeImages: true}, results: [{id, title, author, content, wordCount, kept, removed}]}`。ページの「extraction-results.json」のリンクと解説動画は、このファイルを読みます。ページ上で取り出した結果は、このファイルとは別に、その場で計算したものです。

## 作例の範囲

- 3つの記事は、この作例のために書いた架空のページです。実在の催し・アプリ・調査ではありません。
- この3件で本文を取り出せても、インターネット上のどのページでも同じように取り出せるとは限りません。原典の README にも、Defuddle はまだ開発中だと書かれています。
- Markdown にすると、元のページの色・配置・文字の大きさは残りません。残るのは見出し・段落・リストなどの文章の構造です。
- 照らし合わせは、決めた語句が Markdown に文字どおり含まれるかどうかだけを調べます。ほかの文の抜けや読みやすさは判定しません。
- `useAsync: false` で外部APIによる補完を無効化しています。Node APIは内部で `parseAsync()` を呼びますが、原典コードのこのオプションの分岐により外部の補完処理へ進みません。CLI、HTMLでの出力、数式・脚注の変換も、この作例では試していません。

## 解説動画

`video/index.html` と `video/scene.js` が、28秒・1280×720・30fps・音声なしの動画のソースです。`window.seek(秒)` で任意の時刻の画面だけを描き、`window.motionConfig`・`window.motionReady`・`window.renderConfig`・`window.__MOTION_RENDER__` は Motion Reel の契約に従います。

- `motionReady` は、フォント、`../samples.json`、`../extraction-results.json` の読み込みを待ちます。`extraction-results.json` がない、または `reading` の `content` が空の場合は、動画を描かずに `motionReady` を失敗させます。
- 入力のページは、`samples.json` の reading の HTML から描いた構造の図です。ブラウザー画面の撮影ではありません。
- タイトル・著者・オプション・Markdown の各行は `extraction-results.json` から引用します。条件が残ったか、本文の外の文言が含まれないかは、保存した `content` から調べ直して描きます。残らなかった語句があれば、そのまま「見つからない」と描きます。
- フォントは端末にある日本語フォント（游ゴシック・游明朝・BIZ UDゴシックなど）を使い、外部フォントや CDN は読み込みません。

## ライセンス

- `vendor/defuddle/` は Defuddle（MIT License、Copyright (c) 2025 Steph Ango (@kepano)）です。`vendor/defuddle/LICENSE` をそのまま残しています。
- `defuddle.full.js` に含まれる turndown・mathml-to-latex・temml・@xmldom/xmldom の利用条件は、`vendor/defuddle/THIRD_PARTY_NOTICES.txt` にまとめています。
- `index.html`・`styles.css`・`app.js`・`samples.json`・`fixtures/`・`video/`・この README は 八百万図AIツールボックス の独自制作で、MIT License です。

## 今回の実行と確認

固定ソースから上記3段のビルドを実行し、fullバンドル（dist/index.full.js）の生成バイトを変えずにvendor/defuddle/defuddle.full.jsという名前で同梱しました。固定checkoutのNode APIから3件を抽出し、ブラウザーでも各記事を実行。本文・タイトル・著者が一致しています。本文の指定10条件と、各記事の本文外の3文言を照合し、切替時のリセット、矢印キーとEnter、コピーのブラウザー内での読み戻し、.md保存を確認しました。別の消費プロジェクトでのnpm導入はこの確認に含みません。
