# Diagram Design の作例：問い合わせ対応のスイムレーン図

架空の共同作業スペース「よりみちラボ」の問い合わせ業務を、顧客・受付・専門担当の3段のスイムレーン図にした作例です。Diagram Design の SKILL.md と参照資料に沿って、Opus 5.5（`claude-opus-5-5`）が依頼の文章（`request.txt`）から `diagrams/intake.html` を直接書きました。

Diagram Design は、図の選び方・配色・文字・矢印の規則を書いた**手順書（スキル）**です。図を自動で描くプログラムやAPIではありません。作例の画面（`index.html`）も、保存した図を表示するだけで、その場で図を生成したりAIを動かしたりはしません。

## 構成

| パス | 内容 |
| --- | --- |
| `request.txt` | 渡した依頼の文章（架空の業務） |
| `diagrams/intake.html` | 図の正本。スクリプトのない静的なHTMLに、インラインのSVGとCSS |
| `diagrams/intake.svg` | `intake.html` から原典の `export_svg.py` で書き出すSVG（下の手順5） |
| `diagrams/intake.png` | `intake.html` のSVG要素だけをブラウザーで撮影するPNG（下の手順5） |
| `diagram-data.json` | 工程・矢印・ラベルの位置、依頼の各文と図の対応、仮の条件、確かめる基準 |
| `samples.json` | 入力（`request.txt` と同じ文字列）と結果の要約 |
| `design-profile.md` | 図に当てはめた 八百万図AIツールボックス の配色と書体 |
| `index.html`・`styles.css`・`app.js` | 結果を見せる画面。`app.js` は経路の切り替えと依頼文のコピーだけ |
| `video/` | 28秒の解説動画のソース（`index.html`・`scene.js`） |
| `vendor/diagram-design/` | 原典から選んだファイル（SKILL.md、references/、assets/ のひな形、scripts/、README.md、LICENSE、THIRD_PARTY_LICENSES.md）。変更していません |

SVG の要素には、工程は `id="node-R2" data-node="R2" data-lane="intake"`、矢印は `id="edge-E03" data-from="R2" data-to="C2"`、ラベルは `id="label-E03" data-label-for="E03"` のようにIDとデータ属性を付けています。`diagram-data.json` の `element_id` と同じです。

## 再現の手順

`EX` はこの作例のフォルダ、`DD` は原典のリポジトリのフォルダです。Windows では `python3` を `python` に読み替えてください。

### 1. 原典を固定版で用意する

```bash
git clone https://github.com/cathrynlavery/diagram-design.git DD
cd DD
git checkout d97c5c7477e54cee17cfa6459190610da0643a05
```

この固定版の `skills/diagram-design/SKILL.md` は metadata の version が `2.6`、`.claude-plugin/plugin.json` の version が `2.6.99` です。`vendor/diagram-design/` には、このうち必要なファイルを変更せずに置いています。スキル本体・参照資料・assets/・同梱scripts/を、ルートのREADMEとライセンス通知とともに収録しています。リポジトリ直下の `scripts/verify-geometry.py` は同梱スキルの外にあるため、この検査には checkout した原典を使います。

### 2. AIに読ませる

AIに次を読ませてから、図を書いてもらいます。

- `skills/diagram-design/SKILL.md`
- `references/type-swimlane.md`（選んだ図の種類）、`references/semantic-patterns.md`（型を選ぶかの判断）
- `references/style-guide.md`、`references/primitives-core.md`、`references/layout-budget.md`、`references/output-spec.md`、`references/export.md`
- `assets/template.html`（ひな形）。`assets/example-swimlane.html` は書き方の参考として読み、写していません
- `EX/design-profile.md`（配色と書体）と `EX/request.txt`（業務の事実）

決めた条件は、スイムレーン・doc-wide（1280×720）・読む人は mixed・Webフォントなし（system）・スクリプトなしの静的な図、です。

### 3. 図を書く

AIは `assets/template.html` を元に、`EX/diagrams/intake.html` を手で書きます。SVG のファイルを直接書いたり、別の描画ツールを使ったりはしません。

### 4. 原典の検査を実行する（checkout したリポジトリから）

```bash
cd DD
python3 skills/diagram-design/scripts/self_check.py --offline EX/diagrams/intake.html
python3 scripts/verify-geometry.py EX/diagrams/intake.html
```

`self_check.py --offline` は、SVGの読み上げ用の題名と説明、外部の読み込みがないこと、スクリプトがないこと、描いたものが viewBox の中にあることを調べます。`verify-geometry.py` は、矢印が直角か、箱の縁を走っていないか、角に付いていないか、同じ辺の付け根が近すぎないか、矢印が重なっていないか、ラベルの下地があとの箱に隠れていないかを調べます。

日本語のラベルは原典の決まりどおり12pxで下地の高さを16pxにしており、`verify-geometry.py` が下地として見つける高さ（8〜14px）の外です。下地と線の間（8px）と箱との重なりがないことは、`diagram-data.json` の `label_mask` に値を残しています。

### 5. SVGとPNGを書き出す

SVG は原典の書き出し用スクリプトで作ります（`references/export.md` の手順）。Webフォントを使わない図なので `--system-fonts` を付けます。

```bash
cd DD
python3 skills/diagram-design/scripts/export_svg.py EX/diagrams/intake.html EX/diagrams/intake.svg --system-fonts
```

PNG は `references/export.md` の「Rasterize」の Playwright の手順で、`intake.html` の SVG 要素だけを撮影します。倍率2で 2560×1440 になります。Playwright は自動では入れません。

### 6. 画面を開く

```bash
cd EX
python3 -m http.server 8000   # http://127.0.0.1:8000/index.html
```

- `#intake-flow` で図の場所、`#route-missing`・`#route-unresolved`・`#route-complete` で経路の説明を開きます。経路のタブは左右の矢印キー・Home・End でも切り替えられます。
- 図は1280pxの幅を保ち、狭い画面では図の中だけを横にスクロールします。印刷では幅の固定を外し、図全体を縮めて収めます。

### 7. 解説動画を書き出す

`video/index.html` と `video/scene.js` は Motion Reel（Studio Yebisu、MIT）の時間の契約に沿った、28秒・1280×720・30fps・音声なしのソースです。`window.seek(秒)` が、その時刻の画面だけを描きます。図は `../diagrams/intake.png` を、拡大の位置や経路の番号は `../diagram-data.json` を読み込むので、手順5のあとで作例のフォルダ全体を配信して書き出します。画像やJSONがない・大きさが合わない場合は `motionReady` が失敗し、代わりの図は描きません。

八百万図AIツールボックス のリポジトリをcheckoutし、そのルートから、既存の統合用レンダースクリプトを使います。Node.js・Chrome・FFmpeg・ffprobeと、導入済みMotion Reelのレンダー環境が必要です。

```text
python scripts/render_case.py diagram-design-example --renderer <motion-reel>/scripts/render.mjs
```

このコマンドは作例全体を専用の一時フォルダへコピーし、入口を `video/` 基準にしてから、Motion ReelでMP4・代表フレーム・コンタクトシートを作ります。`EX/video` だけをレンダラーのprojectに渡すと、親フォルダの実画像とJSONが配信範囲から外れるため、この統合スクリプトを使ってください。元のHTML・画像・JSONは同じ相対配置に保ちます。

## 制作の記録

- 図のHTML、`diagram-data.json`、`samples.json`、画面、動画のソース、この README は、Opus 5.5 が書きました。
- `diagram-data.json` の基準（criteria）は、制作時に図の座標とIDを手で照らし合わせたものです。
- 統合側で原典の self_check.py --offline・verify-geometry.py・export_svg.py --system-fonts を実行しました。PNGは原典export.mdの既存Playwright環境によるSVG要素の撮影（倍率2、2560×1440）です。入力の各条件と実SVGを照合し、単独SVG、390px/1280px、内部スクロール、4経路とキー操作、依頼文のコピーのOS読み戻し、SVG保存のバイト一致を確認しました。28秒の無音MP4は最終フレーム・contact/stripと実再生を確認し、16.8秒の描画は異なる順序と新しいページで一致しました。これは制作担当と自動検査による確認で、人の承認を示すものではありません。

## 作例の範囲

- 業務は架空です。所要日数・自動処理・達成率は描いていません。
- 試すのはスイムレーン1種類と、Webフォントを使わないSVGの書き出しです。原典が扱うほかの図の種類、draw.io・Mermaid・Excalidraw からの取り込み、動きのある図（template-motion.html）は扱っていません。
- 書体はOSに入っているものを使うため、OSによって文字の幅や見え方が少し変わります。

## ライセンス

- この作例の画面・図・文言・記録・動画のソースは 八百万図AIツールボックス の独自制作で、MIT License です（`LICENSE`）。
- `vendor/diagram-design/` は Diagram Design（cathrynlavery/diagram-design、固定コミット `d97c5c7477e54cee17cfa6459190610da0643a05`）で、上流の MIT License（Copyright (c) 2025 Cathryn Lavery）に従います。`vendor/diagram-design/LICENSE` と、原典が同梱する第三者の利用条件 `THIRD_PARTY_LICENSES.md` をそのまま残しています。
- 図に第三者のアイコン・画像・フォントは使っていません。
