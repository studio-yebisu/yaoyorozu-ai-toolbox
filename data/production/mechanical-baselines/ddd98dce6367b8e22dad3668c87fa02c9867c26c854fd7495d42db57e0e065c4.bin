# Pretty Mermaid の作例：記述と出力を読み比べる

Pretty Mermaid の原典CLIで書き出した図を、元の Mermaid の記述と並べて読む静的な作例です。流れ図・シーケンス図・状態遷移図の3つを切り替え、記述の矢印の行と図の矢印の対応、ライトとダーク、端末用の文字図を見比べ、SVG・PNG・文字図・元の `.mmd` を保存できます。

ページは `samples.json` と `assets/` の保存済みファイルを読み込むだけです。図をその場で描画・生成したり、AIを実行したりすることはありません。

## 構成

| パス | 内容 |
| --- | --- |
| `inputs/*.mmd` | 3つの図の記述（八百万図AIツールボックス の独自制作） |
| `samples.json` | 各図の入力（`.mmd` と同じ文字列）、図の説明、出力ファイルのパス、確かめる矢印の対応 |
| `assets/` | 原典CLIが書き出すSVG・PNG・文字図（下の手順で生成） |
| `index.html`・`styles.css`・`app.js` | 読み比べる画面 |
| `video/` | 28秒の解説動画のソース |
| `vendor/pretty-mermaid/` | 固定版の SKILL.md・参照資料・README・LICENSE（変更なし） |

`samples.json` の `relationships` は、記述の矢印の行と同じ順に書いています。画面はこの順で行と対応表を結びます。

## 原典CLIで描画する

`vendor/pretty-mermaid/` に置いたのは SKILL.md と参照資料だけで、描画スクリプトと依存は含みません。SKILL.md だけを入れても図は描けないため、原典リポジトリを固定版でcheckoutして環境を用意します。Node.js が必要です。

```bash
git clone https://github.com/imxv/Pretty-mermaid-skills.git
cd Pretty-mermaid-skills
git checkout e234ab73c2992f03c36db04fd55ebb90abca9c45
npm ci --ignore-scripts
```

そのフォルダで、3つの記述をそれぞれ書き出します。`EX` はこの作例のフォルダです。

```bash
EX=/path/to/pretty-mermaid-first-diagram
for stem in review-flow request-sequence job-state; do
  node scripts/render.mjs --input "$EX/inputs/$stem.mmd" --output "$EX/assets/$stem-light.svg" --theme github-light --font 'Yu Gothic'
  node scripts/render.mjs --input "$EX/inputs/$stem.mmd" --output "$EX/assets/$stem-dark.svg" --theme github-dark --font 'Yu Gothic'
  node scripts/render.mjs --input "$EX/inputs/$stem.mmd" --output "$EX/assets/$stem-light.png" --format png --width 1200 --theme github-light --font 'Yu Gothic'
  node scripts/render.mjs --input "$EX/inputs/$stem.mmd" --output "$EX/assets/$stem.txt" --format ascii --color-mode none
done
```

書き出したら、SKILL.md の Validation に沿って、コマンドの終了、SVG が `<svg` で始まること、PNG が開けること、文字図に図が出ていること、日本語のラベル・矢印の向き・条件が記述どおりであることを確かめます。ファイル名は画面と動画が読み込む名前なので変えないでください。

## 画面を開く

`samples.json` を読み込むため、ファイルを直接開くと動かないブラウザーがあります。この作例のフォルダでローカルのWebサーバーを起動して開きます。

```bash
python -m http.server 8000   # http://127.0.0.1:8000/index.html
```

- `#flow`・`#sequence`・`#state` で開くと、その図を表示します。
- 図の種類とテーマは、左右の矢印キー・Home・End でも切り替えられます。
- 図は枠の中だけで拡大・横スクロールし、ページ全体は横に広がりません。

## 作例の範囲

- 図の題材（申込の確認、受付のやり取り、ジョブの状態）はすべて架空です。受付APIなどの仕組みは作っていません。
- 自分の `.mmd` を読み込んで描画する機能はありません。
- 試すのは flowchart・sequenceDiagram・stateDiagram-v2 の3種類と、github-light・github-dark の2テーマです。class・ER・XY chart、ほかのテーマ、`batch.mjs` は扱っていません。
- 日本語を含む文字図には罫線のずれが見られ、端末やフォントによっても見え方が変わります。正確に共有する場合はSVG/PNGを使用してください。

## 解説動画

`video/index.html` と `video/scene.js` が、28秒・1280×720・30fps・音声なしの動画のソースです。`window.seek(秒)` で任意の時刻を描きます。図は `../assets/` の実際のSVG・PNG・文字図を、記述は `../samples.json` を読み込みます。ファイルがない場合は代わりの図を描かず「未描画」と表示します。

動画は親フォルダの `../assets/` と `../samples.json` を読むため、書き出すときは作例のフォルダ全体を配信し、`video/index.html` を開いてください。

## ライセンス

- `inputs/`、`samples.json`、画面、`video/` の構成・文言・記述は 八百万図AIツールボックス の独自制作で、MIT License です。
- `vendor/pretty-mermaid/` は Pretty Mermaid（MIT License、Copyright (c) 2026 Beautiful-Mermaid Contributors）の固定版 `e234ab73c2992f03c36db04fd55ebb90abca9c45` です。`vendor/pretty-mermaid/LICENSE` をそのまま残しています。
- `assets/` の図は、上の手順で原典CLIが書き出した出力です。

## 今回の実行と確認

固定版の原典CLIを12回実行し、3つの入力から明暗SVG・PNG・文字図を生成しました。入力と出力のハッシュを制作記録に残しています。SVG/PNGは日本語ラベルと矢印の対応を確認し、図の切替・テーマ比較・キーボード・PNG保存をブラウザーで試しました。横長の流れ図は読みやすい大きさを保ち、狭い画面では図の中だけを横スクロールできます。

原典が出力したSVGは変更していません。SVGにはGoogle Fontsの参照が残り、単独で開く環境では外部フォントへアクセスする場合があります。動画で位置を測る一時的なSVGからだけ、その参照を除いています。

統合サイト内で映像を書き出す場合は `python scripts/render_case.py pretty-mermaid-first-diagram` を使います。ケース全体のファイル配置を一時領域に保って `video/` を基準URLにし、Motion Reelのインストール済みレンダラーへ渡すため、親フォルダーの画像・JSONを変更せず読み込めます。


## 概念構造版 visual-r1

新しい入口はindex.html、元の全文/実図/文字図はdesk.html、旧28秒はvideo/legacy.htmlへ保全しました。旧節のindex.html/video/index.htmlと28秒という記述は元制作時点の構成です。現在の32秒無音紹介にはrender-visual.pyとvisual-guide.mdを使います。原モデル/12CLI描画は再実行せず、元の3入力と12実出力は同じbytesで保持しています。新しい確認はvisual-verification.jsonです。

元の7原典資料は変更していないCRLFの写しです。公式LFとrawbytesが異なり、CRLFだけ正規化した内容/Gitblobが一致します。追加の原典4ソースは公式rawbytes一致。--format asciiの出力はUnicode罫線を含み、純ASCIIオプションは未使用です。
