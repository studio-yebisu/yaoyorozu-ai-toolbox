# 3D Asset Server 作例：木箱を探して、実物まで持ってくる

Webの小さなシーンに置くCC0の木箱を、固定版 [3D Asset Server](https://github.com/arielshad/3d-asset-server/tree/f605df3425011bae55ade114c9e7b276f5b1297b)（arielshad/3d-asset-server f605df3・0.1.0・Apache-2.0）の原典コードで探し、利用条件と容量を取得の前に確かめてから、実物のファイル一式を取得して3Dで確かめる作例です。

- `run.mjs` が、原典の build:server が出力した `dist/` の JS をそのまま読み込み、実際の Poly Haven API に8件の操作を行います。
- `index.html` は、その保存記録と取得した5ファイルを照合してから表示するページです。ページを開いても検索や取得はしません。いまの Poly Haven を調べ直した結果ではなく、AI がその場で動いているわけでもありません。

## 何を確かめたか

原典のスキル（[`web/src/content/SKILL.md`](vendor/3d-asset-server/web/src/content/SKILL.md)）と手引き（[`AGENTS.md`](vendor/3d-asset-server/web/src/content/AGENTS.md)）の手順を、原典の関数で実際に行いました。

| ID | 操作 | 使った原典の関数 | 確かめること |
|---|---|---|---|
| A01 | 木箱を探す | `AssetService.search` | 短い語「wooden crate」・種類 model・無料・3件。候補・ライセンス・作者と、配信元ごとの状態（Poly Haven は ok、Fab は link） |
| A02 | 形式と利用条件を確認 | `AssetService.getAsset` | CC0・商用可・帰属表示不要・作者・形式。Web の three.js には glTF |
| A03 | 1kで容量を先に確認 | `selectFiles`・`totalBytes`・`expandFiles` | 取得の前に、glTF・bin・画像の全ファイルと合計バイト数 |
| A04 | 8kは予算を超えて止まる | `selectFiles`・`downloadFiles`（maxBytes 4194304） | 通信の前に止まる原典の例外。取得の通信0件、保存フォルダーなし |
| A05 | 形式の違うIDを渡す | `AssetService.getAsset` | `InvalidAssetIdError` |
| A06 | 未登録の配信元を指定 | `AssetService.getAsset` | `UnknownProviderError` |
| A07 | 直接取得だけに絞る | `AssetService.search`（Fab だけ・downloadableOnly） | Fab は skipped（エラーではない）。Fab へ通信しない |
| A08 | 実物を取得して3Dで見る | `downloadFiles`（maxBytes 4194304） | 5ファイルを相対パスのまま取得。バイト数・MD5 を Poly Haven の files API と、SHA-256 を通信の記録と照合。glTF 2.0 の参照・アクセサー・メッシュと三角形の数を実ファイルから確かめる |

素材は [Wooden Crate 01](https://polyhaven.com/a/wooden_crate_01)（James Ray Cock・Poly Haven・[CC0](https://polyhaven.com/license)）です。CC0 なので帰属表示は不要ですが、作者と配布元をページに表示しています。

## 確かめていないこと

- 有効にした配信元は Poly Haven（API）と Fab（リンクだけ）の2つです。原典が持つほかの配信元は試していません。Fab へは通信していません。
- 公開サーバー 3d.shep.bot、HTTP API（`serve`）、MCP の通信路、Web 画面、アカウント・API キー、有料素材や取得の制限の回避、Blender やゲームエンジン・本番サイトへの組み込みは使っていません。動かしたのは原典のライブラリの関数と、事前の CLI 検索（`node dist/cli.js search`）だけです。
- 3Dモデルの生成はしていません。原典は既にある素材を探して取得するもので、表示している木箱はモデル（Claude Opus 5.5）が作ったものではありません。
- 検索の順位・件数・`tookMs`・メタデータは Poly Haven の側で変わりえます。再実行で同じ記録になる約束ではありません。固定しているのは原典・入力・記録と取得ファイルのハッシュです。
- 確かめたのはファイルの一致と glTF の参照・構造です。見た目の品質・本番での性能・人による承認は確かめていません。

## ファイル

| ファイル | 内容 |
|---|---|
| `input/asset-requests.json` | 8件の操作（実行前に固定） |
| `input/expected.json` | 実行前に決めた期待。出力を作るためには使わず、結果を得た後で照らし合わせるだけ |
| `vendor-lock.json` | 原典58ファイル・原典の build:server が出力した dist/ の50ファイル・three の7ファイル、計115ファイルの SHA-256 |
| `vendor/3d-asset-server/` | 固定コミットの原典と dist/（改変なし）。`node_modules/` は配布に含めず、各自が `npm ci` で入れる |
| `vendor/three/` | npm の three 0.180.0 のファイル（改変なし） |
| `run.mjs` | 実行スクリプト |
| `outputs/asset-runs.json` | 8件の記録（実行が全確認に通ったときだけ書かれる） |
| `outputs/assets/polyhaven-wooden_crate_01/` | 実際に取得した1kの glTF 一式（改変なし） |
| `outputs/api-info.json`・`outputs/api-files.json` | Poly Haven の info・files API の実際の応答（カタログ全体の応答は公開しない） |
| `outputs/method.md` | 手順と読み方 |
| `index.html`・`app.js`・`style.css`・`model-view.js` | ページ |
| `request.txt`・`brief.json` | 依頼文と制作ブリーフ |

## 再実行

Node 24 以上と npm、Poly Haven への通信が要ります。アカウント・API キー・課金は要りません。

公開フォルダーでは実行しません。使い捨てのコピーを作り、その中で既存の記録の名前を変えてから実行します。既存の記録や取得ファイルは消しません（run.mjs も、出力先が既にあれば何も書かずに止まります）。

```sh
# 1. 使い捨てのコピーを作る（例。パスは自分の環境に合わせる）
cp -R examples/3d-asset-server-example /tmp/yebisu-3d-copy
cd /tmp/yebisu-3d-copy

# 2. 公開された記録を消さずに、名前だけ変えて退ける
mv outputs outputs.published
mkdir outputs

# 3. 原典の package-lock.json どおりに依存を入れ、原典の build:server で dist/ を作る
npm --prefix vendor/3d-asset-server ci --ignore-scripts --no-audit --no-fund
npm --prefix vendor/3d-asset-server run build:server

# 4. コピーの外の、まだ無いフォルダーを渡して実行する
node run.mjs --artifact-dir /tmp/yebisu-3d-artifacts-new
```

PowerShell では `Copy-Item -Recurse examples\3d-asset-server-example $env:TEMP\yebisu-3d-copy`、`Rename-Item outputs outputs.published`、`New-Item -ItemType Directory outputs` が同じ操作です。

- 原典の `tsconfig.json` はテストも含みますが、`build:server` は `tsconfig.build.json` を使い、テストを含めずに `dist/` を出力します。出力が `vendor-lock.json` の SHA-256 と違えば、run.mjs は原典を読み込まずに止まります。
- run.mjs は `ASSET_SERVER_USER_AGENT` に `Studio-Yebisu-3D-example/1.0 (+https://studio-yebisu.github.io/yaoyorozu-ai-toolbox/)` を入れてから原典の http を読み込みます。自分の作例として再実行するときは、Poly Haven の API の条件に合わせて、自分を識別できる名前へ変えてください（`input/asset-requests.json` と run.mjs の値の両方。入力の SHA-256 も変わるので、固定し直してから実行します）。
- 原典の既定値を変える `ASSET_SERVER_CACHE_TTL_MS`・`ASSET_SERVER_HTTP_TIMEOUT_MS`・`ASSET_SERVER_PROVIDER_TIMEOUT_MS`・`ASSET_SERVER_MAX_DOWNLOAD_BYTES` が設定されていると、run.mjs は止まります。
- 成功すると、`outputs/asset-runs.json`・`outputs/assets/polyhaven-wooden_crate_01/`・`outputs/api-info.json`・`outputs/api-files.json` を1回だけ書き、`--artifact-dir` に記録の同じ写しを置きます。
- `--artifact-dir` には、通信ごとの応答の全文（カタログ全体を含む）・原典の `downloadFiles` が返した絶対パス入りの値・取得したファイルが残ります。公開しないでください。
- 確認に1つでも通らなければ、`--artifact-dir/failure.json` に理由を残し、公開用のファイルは書かずに 0 以外で終わります。期待の合計バイト数と合わなくなったときも、成功とは書きません。
- 再実行の記録は、Poly Haven の側の変化や `tookMs` で公開版と違ってかまいません。取得した5ファイルが同じなら、SHA-256・MD5 は一致するはずです。

## ページを開く

モジュールと import map、`fetch` を使うため、`file://` では開けません。この作例のフォルダーで静的な HTTP サーバーを起動します。API のサーバーは要りません。

```sh
python -m http.server 8000 --bind 127.0.0.1
# http://127.0.0.1:8000/ を開く
```

SHA-256 の照合に Web Crypto を使うため、https か localhost（127.0.0.1）で開いてください。ページが読むのは同じフォルダーのファイルだけで、外部のフォント・CDN・計測・Poly Haven のサイトの画像は読み込みません（素材ページへのリンクだけがあります）。

## 利用条件

- 作例のコード（run.mjs・model-view.js・ページ）・文章・入力：MIT License（[`LICENSE`](LICENSE)・Copyright (c) 2026 Studio Yebisu）。Claude Opus 5.5 が書きました。
- 3D Asset Server の原典と dist/：Apache-2.0（[`vendor/3d-asset-server/LICENSE`](vendor/3d-asset-server/LICENSE)）。原典に含まれる Geist フォント（`src/og/fonts/`・`dist/og/fonts/`）は SIL Open Font License 1.1（同じフォルダーの `OFL.txt`）。
- three 0.180.0：MIT（[`vendor/three/LICENSE`](vendor/three/LICENSE)）。
- 取得した3Dモデル：Wooden Crate 01・James Ray Cock・Poly Haven・CC0（[Poly Haven のライセンス](https://polyhaven.com/license)）。再配布でき、帰属表示は不要です。
- Poly Haven のライブAPI：商用も含めて無料。識別できる User-Agent（または Referer）と、出どころが Poly Haven であることの表示が条件です。八百万図AIツールボックス は Poly Haven の公式の製品・提携先ではありません。
- 動画の制作に使う Motion Reel：MIT（`tools/motion-reel/LICENSE`）。

## 配布に含めないもの

`vendor/3d-asset-server/node_modules/`、npm のキャッシュ、`--artifact-dir` の中身（通信の全文・絶対パス入りの値・制作の履歴）は配布しません。


## 制作側による完成後の確認

原典の実APIで8操作・39確認、Poly Havenの実API/CDNへの8リクエストで、CC0の木箱1モデル・5ファイル・2,277,087bytesを取得しました。独立Python212照合では原典と各ファイルのMD5/容量・実BINの3メッシュ/6,576三角形を確認。新しいNodeの明示的なオフライン応答再生29確認で、全5ファイルが同じbytesになりました。再生は保存した実応答を使い、ライブAPIを再照会した結果とは区別しています。

IAB Chromiumの6幅×8件で横はみ出し・44px操作部/16pxフォーム、全入力/結果、実JSONと実5ファイルZIP保存・依頼文コピー、3種の記録エラーとglTFハッシュ異常からの再読込、実3Dの回転・リセット・線表示を確認しました。28秒・720p・30fps・840フレームの無音動画は代表/連続フレーム・360px文字・終端・任意時刻の別順/新ページPNG一致・全デコード・ネイティブ再生終了を確認。実機iOS/Safari/VoiceOver・人による承認や本番ゲームの画質/性能は未確認です。

実行記録・5ファイルは初回の実取得から無変更です。Opus5.5は実装・日本語解説・映像編集ソースを制作し、制作側が入力固定・実行・独立照合・スマホ向けの文面調整と検証・配布を担当しました。木箱そのものの作者はJames Ray Cock（Poly Haven）です。モデル実行履歴全文・認証・通信原本全文は配布しません。
