# 寸法を4つ変えても、穴は中央、壁は3 mmのまま

SolidCraft で架空の小物トレーを作り、寸法を変えて計算し直し、実測して、編集できる設計・STEP・STL で保存した作例です。依頼・工房「よりみちラボ」・用途はすべて架空です。

- 初期：幅120 × 奥行80 × 高さ18 mm、底の中央に直径8 mmの貫通穴（`tray-default`）
- 変更後：幅150 × 奥行90 × 高さ24 mm、穴径12 mm（`tray-resized`）
- 壁と底はどちらも3 mmで固定

`index.html` は、保存した2つの状態の画像・実測値・ファイルを切り替えて見るページです。**ページの中で CAD や AI は動きません。** 寸法を入れて計算し直す機能もありません。`measurements.json` を読み込むため、ファイルを直接開くのではなく、このフォルダーをローカルの Web サーバーで開いてください（例：`py -3 -m http.server 8000 --bind 127.0.0.1` を実行して `http://127.0.0.1:8000/` を開く）。

## 流れ

1. **寸法を決める**　依頼文（`request.txt`）から、名前付きの寸法 `width`・`depth`・`height`・`hole_diameter` と、固定の `wall`・`floor_thickness` を決めました。使える範囲は各パラメーターのコメントに書いています。SolidCraft は範囲を強制しません。
2. **先に計算する**　体積・表面積・重心・外接箱を式で求め、`cad/expected.json` に書きました。`cad/plan.md` は実行の前に書いた計画書で、中の数値は予測値です（「PENDING」の表記は実行前の記録としてそのまま残しています）。
3. **作る**　`cad/build.json` を、外形（`TrayBlock`）・くぼみ（`Pocket`）・穴（`DrainHole`）の3段で実行し、段ごとに測った値を期待値と比べました。
4. **画像を撮って保存する**　等角と上面の画像を撮り、編集できる設計 `.json`、STEP、STL を書き出しました。
5. **寸法を変える**　保存した設計に `cad/resize.json`（`parameters.change` を4つ）を1回だけ実行し、同じように測定・画像・保存をしました。形は作り直していません。
6. **範囲の端を往復する**　`cad/walk.json` で寸法を1つずつ上の端へ動かして戻し、最後に4つ同時に動かして戻しました。11状態のすべてで期待値と照合しています。

実測の結果は `measurements.json` にまとめています。

## ファイル

| 場所 | 内容 |
|---|---|
| `index.html`・`app.js`・`styles.css` | 保存結果を見るページ |
| `request.txt` | 架空の依頼文（入力） |
| `samples.json` | 2つの状態の入力と結果 |
| `measurements.json` | 実測値、解析値、許容差、確認の結果 |
| `cad/build.json` | 空の状態から作るコマンド |
| `cad/resize.json` | 4つの寸法を変えるコマンド |
| `cad/walk.json` | 範囲の端を往復するコマンド |
| `cad/expected.json` | 解析式と期待値（実行前に記入） |
| `cad/check_design.py` | 期待値と照合するチェッカー（Python の標準ライブラリだけ） |
| `cad/plan.md` | 実行前の計画書 |
| `outputs/tray-default.json`・`tray-resized.json` | 編集できる設計。寸法の式とタイムラインが残る |
| `outputs/*.step` | STEP。開くと1つの固体になり、寸法の式は残らない |
| `outputs/*.stl` | STL（バイナリ）。三角形に分けた形で、寸法の式は残らない |
| `renders/*.png` | SolidCraft のモデル描画（1280×960）。等角と上面 |
| `video/` | 28秒の解説動画のソース（`index.html`・`brief.md`） |
| `vendor/solidcraft/` | 上流の README・docs/mcp.md・3つのスキル・LICENSE・NOTICE（変更なし） |
| `LICENSE` | この作例の MIT License |

`tray-resized.json` の中の `name` が `tray-default` なのは、初期の設計を開いて変更し、別名で保存したためです。

画像は状態ごとにモデルへ合わせて収めているため、画像の中の大きさの違いは寸法の違いを表しません。大きさは `measurements.json` の外接箱で比べてください。

## 使った版

二つの版を別々に固定しています。同じものではありません。

- **参照した原典**：`tangency-labs/solidcraft` のコミット `16c49c3e860a954e9f27309927d6848bcba9c607`。スキル・README・docs/mcp.md・LICENSE はこの版から `vendor/solidcraft/` に同梱しています。
- **実行した公式リリース**：SolidCraft **0.11.1**（コミット `b01b9689c8999a4415b4a6daaa2f8aae8a1a2f25`、<https://github.com/tangency-labs/solidcraft/releases/tag/v0.11.1>）。Windows x64 のポータブル版 `solidcraft-0.11.1-windows-x64-portable.zip`、SHA-256 `6c5e285d3d6ee3bbdaa39de9019b5a36fd894c4a335f92de7193e1340996727d`（公式のチェックサムと一致）。このリリースは上の参照コミットからビルドしたものではありません。

設計の `.json` は 0.11.1 で保存し、0.11.1 で開き直して確かめました。ほかの版（古い 0.3.1 など）で開けるかは確かめていないので、0.11.1 を使ってください。

## 再現する

### 準備（Windows の PowerShell）

```powershell
# 公式リリースの zip を確かめて展開する
Get-FileHash .\solidcraft-0.11.1-windows-x64-portable.zip -Algorithm SHA256
Expand-Archive .\solidcraft-0.11.1-windows-x64-portable.zip -DestinationPath C:\tools

$sc = "C:\tools\solidcraft-0.11.1-windows-x64-portable"   # solidcraft-cli.exe のあるフォルダー
$env:Path = "$sc;$env:Path"                       # 原典の run.py は PATH の solidcraft-cli を使う
$env:SOLIDCRAFT_CLI = "$sc\solidcraft-cli.exe"    # cad/check_design.py が使う
solidcraft-cli --version                          # solidcraft-cli 0.11.1
```

`SOLIDCRAFT_CLI` は、`cad/check_design.py` が呼び出す `solidcraft-cli` の場所を指定する環境変数です。指定しないと PATH の `solidcraft-cli` を使います。原典の `run.py` はこの変数を読まないので、PATH にも入れておきます。展開先のフォルダーは例です。

以下はこの作例のフォルダーで実行します。公開しているファイルを上書きしないよう、作り直した結果は `repro/` に書き出します。

### 作る・変える・書き出す（CLI）

```powershell
New-Item -ItemType Directory repro | Out-Null

# 空の状態から作り、編集できる設計・STEP・STL を保存する
solidcraft-cli run cad/build.json --save repro/tray-default.json --out repro/tray-default.step --out repro/tray-default.stl

# 保存した設計の寸法を4つ変えて、別名で保存する
solidcraft-cli run cad/resize.json --in repro/tray-default.json --save repro/tray-resized.json --out repro/tray-resized.step --out repro/tray-resized.stl

# 画像を撮る（view は iso または top）
solidcraft-cli snapshot repro/tray-default.json --out repro/tray-default-iso.png --width 1280 --height 960 --view iso
solidcraft-cli snapshot repro/tray-default.json --out repro/tray-default-top.png --width 1280 --height 960 --view top

# 書き出したファイルを開き直して測る
solidcraft-cli eval repro/tray-default.step
```

公開している4枚の画像は、下の MCP の `screenshot` で撮ったものです。`snapshot` で撮り直した画像が同じ画素になるとは限りません。

### 期待値と照合する

```powershell
py -3 cad/check_design.py --sequence build --expectations cad/expected.json
py -3 cad/check_design.py --sequence resize --design outputs/tray-default.json --expectations cad/expected.json
py -3 cad/check_design.py --design outputs/tray-default.json --expectations cad/expected.json   # 既定は walk
```

結果は JSON で出ます。終了コードは、すべて合格で0、不合格があると1、実行できないと2です。`cad/check_design.py` は実行の前に、`expected.json` の数値を式から計算し直して照合し、範囲の外の値やコマンドとの食い違いがあれば止まります。

原典のチェックスキルの `run.py` でも同じスクリプトを確かめられます。

```powershell
py -3 vendor/solidcraft/skills/solidcraft-checking/scripts/run.py cad/build.json
py -3 vendor/solidcraft/skills/solidcraft-checking/scripts/run.py cad/walk.json --in outputs/tray-default.json
```

### MCP から作る

公開している結果は、この順に MCP で作りました。サーバーは画面を持たない headless で起動し、ほかのアプリのデザインには接続していません。

```powershell
$caseFolder = (Get-Location).Path
solidcraft-cli mcp --allow-path "$caseFolder"
# Claude Code に登録する場合も同じフォルダーを許可する
claude mcp add solidcraft -- solidcraft-cli mcp --allow-path "$caseFolder"
```

1. `inspect_design {"measure":false,"sketches":false}` で空であることを確かめる
2. `cad/build.json` のコマンドを、外形・くぼみ・穴の3回の `batch` に分けて送り、毎回 `inspect_design` と `measure` で期待値と比べる
3. `screenshot {"source":"model","view":"iso","width":1280,"height":960}` と、`"view":"top"` で同じ大きさの画像を撮る
4. `save {"path":"<絶対パス>/outputs/tray-default.json"}`、`export {"path":"<絶対パス>/outputs/tray-default.step","format":"step"}`、`export {"path":"<絶対パス>/outputs/tray-default.stl","format":"stl"}`
5. `cad/resize.json` の4つの `parameters.change` を1回の `batch` で送り、`inspect_design` と `measure` で照合する
6. 3と4を `tray-resized` の名前で繰り返す

MCP のサーバーが読み書きできるのは、開いている設計のフォルダー（ホームフォルダーの中で、隠しフォルダーではない場所）と `--allow-path` で指定したフォルダーだけです。`save` と `export` には絶対パスを渡します（`vendor/solidcraft/docs/mcp.md`）。

### 解説動画を書き出す

動画のソース `video/index.html` は、隣の `../renders/` の画像と `../measurements.json` を読みます。`video/` だけを別の場所へ写すと素材が見つからないので、統合したリポジトリのルートで、作例全体を使って書き出してください。

```powershell
py -3 scripts/render_case.py solidcraft-example --renderer <Motion Reel スキルの絶対パス>/scripts/render.mjs
```

Node.js 20 以上、Chrome、FFmpeg と ffprobe が必要です。初回だけ、`render.mjs` の隣で `npm install --ignore-scripts` を実行します。動画は 1280×720・30fps・28秒・音声なしです。

## 確かめたこと・確かめていないこと

| 区分 | 内容 | 状態 |
|---|---|---|
| 解析値との照合 | 2つの状態で、ボディは1つ、タイムライン3件の error・warning はなし。外接箱は差0、体積・表面積は相対 2×10⁻⁴、重心と外接箱は 0.022 mm（変更後は 0.026 mm）の許容差の中。許容差は実行の前に決めた | 合格 |
| 作る途中の3段 | 外形・くぼみ・穴の各段の体積・重心・外接箱 | 3段とも合格 |
| 範囲の端の往復 | 各寸法の上の端（下の端は初期値と同じ）と、4つ同時の上の端、その都度初期値へ戻した11状態だけ。範囲の途中の値やほかの組み合わせは試していない | 11状態で合格 |
| 書き出しの開き直し | `.json`・STEP・STL を 0.11.1 で開き直し、ボディ1つと外接箱を確認。STL は三角形の閉じた面（どの辺も三角形2枚で共有） | 合格 |
| 上面の画像 | 画像の線の位置から、穴の中心が外形の中心と1ピクセル以内、穴径と壁の誤差が0.3 mm未満 | 合格 |
| 画像の見た目 | AI の制作工程が4枚を見て、上が開いた1つのトレーで、中央に穴があることを確かめた | 人による承認ではない |
| ページと動画 | ブラウザーでの表示と操作、動画の書き出しと視聴 | 390px/1280px・2状態4画像・キー切替・コピーとSTEP保存の一致、28秒無音MP4のフレームレビューと終端再生を確認（制作担当の確認、人の承認ではない） |
| 製造 | 強度、耐荷重、3Dプリントの品質、寸法精度、水はけ | 確かめていない |

STL は三角形に分けた形なので、体積が解析値より少し大きく出ます（初期で約0.7 mm³、変更後で約1.1 mm³）。STEP と STL には寸法の式が残らず、寸法を変えられるのは `.json` の設計だけです。

## ライセンス

- この作例の文章・画面・依頼文・CAD のコマンドと設計・書き出したファイルと画像・動画のソースは 八百万図AIツールボックス の独自制作で、MIT License です（`LICENSE`）。
- `vendor/solidcraft/` は上流の SolidCraft のファイルを変更せずに置いたものです。上流は MIT OR Apache-2.0 のどちらかを選べ、この作例では **Apache-2.0** を選んで再配布しています（`vendor/solidcraft/LICENSE-APACHE`、`vendor/solidcraft/NOTICE`）。上流の `LICENSE-MIT` もそのまま残しています。
- SolidCraft の本体（実行ファイル）は同梱していません。公式リリースから取得してください。


## 概念構造版 visual-r1

現在のindex.htmlは構造図、元の保存結果ビューアはdesk.html、元28秒編集/MP4はvideo/legacy.htmlとlegacy.mp4へ保持。上の28秒や入口の説明は元制作時点です。現在の32秒縦横無音紹介はrender-visual.pyとvisual-guide.mdを使います。元CAD/CLI/MCP/推論は再実行なし。18同梱CRLFは公式LFと生bytesが違い、CRLFだけ正規化した内容/Gitblob一致を区別します。新しい確認はvisual-verification.jsonです。
