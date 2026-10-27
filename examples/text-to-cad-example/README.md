# 小物ケースの寸法を、CADの前に決める（text-to-cad の未実行の作例）

**CADを実行していない作例・考え方のガイドです。** 上面が開いた小物ケースの寸法を、ブラウザーで動かして検討する説明プレビューと、text-to-cad の `cad` スキルの書き方に合わせた未実行のPythonコード、寸法JSON、無音24秒の説明動画のソースです。

- 外形 100 × 70 × 24 mm、壁と底 2.4 mm → 内寸 **95.2 × 65.2 × 21.6 mm**。
- 幅広案：外形の幅 130 mm → 内寸の幅 **125.2 mm**（壁と底は 2.4 mm のまま）。
- 持ち帰れるもの：寸法JSON（`parameters.json`、画面の「いまの寸法をJSONで保存」）と未実行のPythonコード（`model-proposal.py`）。
- **STEP / STL：未生成。** `STEP/parts-case.step` は存在しません。

## なぜ実行していないか

親工程（制作担当）の Python では `cadgen`・`build123d`・`OCP` がインストールされていないことが `importlib.util.find_spec` で確かめられています。この作例では、上流のネイティブコードを実行せず、インストールも、認証情報も、安全設定の変更もしていません。Windows 11 では OCP の署名のないネイティブモジュールが安全機能に止められることがあると上流の README は書いていますが、その設定は変えておらず、回避もしていません。

## 画面（index.html・app.js・style.css）

- スライダー：外形の幅 100〜130、奥行 60〜90、高さ 20〜35（1 mm 刻み）、壁と底の厚さ 2〜3（0.1 mm 刻み、壁と底は同じ厚さ）。
- 同じ `dims.mjs` の `caseDims` が、内寸（幅・奥行は外形 − 壁×2、高さは外形 − 底）、入る量（内寸の積）、材料の体積（外形の積 − 内寸の積）を出します。どれも単純計算で、角の丸み・抜き勾配・公差・材料の収縮は入れていません。
- 投影：上から見た等角の「透かし」（手前の外壁を半透明にして、くぼみの見えない壁を破線で示す）と「不透明」、正面（幅×高さ）と側面（奥行×高さ）の断面。縮尺は最大の 130×90×35 に合わせて固定しているので、幅を変えると絵の大きさも変わります。
- 図の上の表示は常に「寸法検討の説明プレビュー · CAD未実行」。これは**説明のための投影で、CADカーネルの出力ではありません。**
- 「標準」「幅広」のボタンは `parameters.json` の2案を読み込み、`dims.mjs` の既定値と同じかを確かめて表示します。
- 「この値を model-proposal.py の定数にすると」はスライダーの値を定数の形で見せるだけで、ファイルは書き換えず、実行もしません。

## model-proposal.py（未実行）

`skills/cad/SKILL.md` の「装飾つきの引数なし関数が build123d の形を返す」書き方に合わせました。

- `from cadgen import build123d as bd`・`from cadgen import step`、`@step(out="STEP/parts-case.step")`。
- 外形：`bd.Box(width, depth, height, align=(CENTER, CENTER, MIN))`（底面が z = 0）。
- くぼみ：同じ揃え方の `bd.Box(width − 2×wall, depth − 2×wall, height − floor + 1)` を `bd.Pos(0, 0, floor)` で床の厚さだけ上げ、外形から引く。上へ 1 mm 余分に伸ばすのは、上面と同じ高さの面を残さないためで、形は変わりません。
- `bd` の属性はモジュールの読み込み時には使わず、関数の中で使います（上流の「モジュール本体は軽く」に合わせるため）。
- 上流はスクリプトと出力の名前の語幹をそろえることを勧めているので、実際のプロジェクトに入れるときは `parts-case.py` に名前を変えてください。
- 定数（100.0・70.0・24.0・2.4・2.4）は `dims.mjs` の `DEFAULT` と `parameters.json` の `small` と同じ値です。

cadgen が使える環境であれば、上流の手順では次のように実行して STEP を書き出し、必要なら STL・3MF・GLB を作り、スナップショットで形を確かめます。**この作例ではどれも実行していません。**

```bash
# 上流の SKILL.md の手順（未実行）
python model-proposal.py                 # → STEP/parts-case.step
cadgen stl build STEP/parts-case.step    # → STL（任意）
cadgen step snapshot STEP/parts-case.step tmp/review.png
```

text-to-cad はローカルで動くCADの手順（スキルと cadgen のCLI、build123d と Open CASCADE）で、形を作るホスト型のAIサービスではありません。この作例でもAIサービスは使っていません。

## 実行する前に知っておくこと（上流 README から）

- **利用統計**：配布されるCADアプリ（プラグインの `cad` サーバー）・ブラウザーのビューア（`cadgen viewer`）・それらのためのビルドデーモンは、既定で利用統計とクラッシュ報告を送ります（上流は、ファイル名・パス・中身・プロンプトは送らないと説明）。1つのプロセスだけ止めるなら `DO_NOT_TRACK=1` または `CADGEN_TELEMETRY=0`。設定として止める方法も上流 README にあります。
- **更新の確認**：cadgen は新しい版を1日1回まで問い合わせます。`CADGEN_UPDATE_CHECK=0` で止まります。
- **Windows**：上の「なぜ実行していないか」のとおり。安全設定を変える手順はこの作例では勧めません。
- この作例では、環境変数・全体の設定・認証情報・インストールのどれにも触れていません。

## 動画（video/）

- `window.motionConfig = {duration: 24, fps: 30, width: 720, height: 1280, posterTime: 12, audioEvents: []}`。`window.renderConfig` の `width`・`height`・`fps` を優先し、横長なら横の配置で組み直します。
- `window.motionReady` はフォントの準備のあと、`../parameters.json` の2案が `dims.mjs` と同じこと、内寸が 95.2×65.2×21.6・幅広 125.2 になることを確かめてから解決します。合わなければ描きません。
- `window.seek(t)` は t だけから1枚を描きます。書き出し時（`window.__MOTION_RENDER__` または `?render`）は操作欄もタイマーも使いません。
- 「説明用・CAD未実行」の表示は全フレームに出ます。成功を示すしるしは使っていません。

| 秒 | 場面 |
|---|---|
| 0 | 4つの値の札（幅100・奥行70・高さ24・壁と底2.4） |
| 4 | 外形の箱が立ち上がり、幅・奥行・高さの寸法線 |
| 9 | くぼみの箱が上から下り、床の厚さで止まって外形から引かれる。内寸と「壁・底 2.4」 |
| 14 | 幅だけ 100 → 130。壁と底は 2.4 のまま、内寸の幅 95.2 → 125.2 |
| 20 | 持ち帰れるもの：寸法JSON・未実行Pythonコード／STEP / STL：未生成 |

```powershell
# 作例フォルダーで（確認用。Opus執筆時点では未実行）
py -3 -m http.server 8000 --bind 127.0.0.1
# http://127.0.0.1:8000/index.html
# http://127.0.0.1:8000/video/index.html （横は ?orient=wide）
```

## ファイル

| ファイル | 内容 |
|---|---|
| `index.html`・`app.js`・`style.css` | 寸法を検討する画面 |
| `dims.mjs` | 寸法の計算と説明用の投影（画面と動画が共通で使う。cadgen は読み込まない） |
| `model-proposal.py` | 未実行のPythonコード |
| `parameters.json` | 2案の寸法（既存のファイル。この作業では変更していません） |
| `video/index.html`・`video/scene.js`・`video/video.css` | 無音24秒の動画ソース |
| `samples.json`・`request.txt` | 入出力の例・架空の依頼 |
| `vendor/text-to-cad/` | 上流の README・LICENSE・`skills/cad/SKILL.md`・`packages/cadgen/pyproject.toml`・`README.md`・`telemetry.py` |

## Opus執筆時点の確認状態

このフォルダーの画面・動画・README・Python を書いた時点（Claude Opus 5.5、`claude-opus-5-5`）では、ブラウザーでの表示・操作、動画の書き出し、`model-proposal.py` の実行（構文の確認を含む）をどれも行っていません。

## 出典とライセンス

- 原典：<https://github.com/earthtojake/text-to-cad/tree/2f793659fb7bab537e2f00836e06448fc4087cb2>（`vendor/text-to-cad/source.json`、取得 2026-10-22）。リポジトリ直下のコードは MIT License（Copyright (c) 2026 Thompson Labs LLC、`vendor/text-to-cad/LICENSE`）。`packages/cadgen/pyproject.toml` も `license = "MIT"`（cadgen 0.7.26）。依存の build123d・cadquery-ocp-novtk（OCP）などはそれぞれの条件で、この作例には含めていません。
- 寸法・`dims.mjs`・`model-proposal.py`・画面・動画ソース・文章は八百万図AIツールボックスの制作（Claude Opus 5.5）で、MIT として扱います。依頼と用途は架空です。

## 制作後の確認（2026-10-22）

制作担当が保存後のファイルを別に検査しました。[VERIFICATION.json](VERIFICATION.json) に実行した範囲・UI検査・制約を記録しています。原典やCADの全機能を実行したという意味ではありません。縦横の24秒無音MP4はサイトのmedia/に保存し、任意時刻の再描画一致と代表フレームを確認しました。独自コードは同梱LICENSE、完成メディアはMEDIA-LICENSE.mdの条件に従います。
