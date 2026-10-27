# 作例：Make Interfaces Feel Better — 納品メモ画面の細部を3点直す

UIの細部を見直す指針「Make Interfaces Feel Better」を、既存の小さな画面に quick レビューとして当てた作例です。直したのは次の3群です。

1. 操作範囲とフォーカス：各行と「制作メモを含める」をネイティブの label にし、44px以上の重ならない範囲とフォーカス枠を付けた
2. 件数・時間の安定と、空・読み込み失敗の状態：tabular-nums と幅の予約、0件の理由と「すべて選ぶ」、読み込み失敗の理由と再読み込み
3. 書き出しボタンの状態：押下0.96、補間するプロパティの限定、準備中・ブラウザーへ渡した・エラーの文言、アイコンの cross-fade、動きを減らす設定への対応

所見の詳細、却下した候補、未確認の項目は [review.md](review.md) にあります。

## 原典

- リポジトリ：`jakubkrehel/make-interfaces-feel-better`
- コミット：`35545ea1512ad59fa463e6b1f95ca9c052981fe6`
- URL：https://github.com/jakubkrehel/make-interfaces-feel-better/tree/35545ea1512ad59fa463e6b1f95ca9c052981fe6/skills/make-interfaces-feel-better
- ライセンス：MIT、Copyright (c) 2026 Jakub Krehel
- 同梱：`vendor/make-interfaces-feel-better/` に README.md、LICENSE、`skills/make-interfaces-feel-better/` の SKILL.md と5参照（typography.md、surfaces.md、animations.md、icons.md、performance.md）を固定版のまま置いています

このスキルは文章で書かれたデザインエンジニアリングの指針で、実行時に画面や文章を生成するAPIではありません。このページ上でAIは動きません。

## 入力と出力

- 入力：`clips.json` の3件（`id`・`title`・`duration_seconds`・`note`）。架空作品「週末のアトリエ」の作例用データで、映像素材はありません
- 操作：カットのチェックと「制作メモを含める」を選び、「JSONを書き出す」を押す
- 出力：`atelier-delivery.json`。`{"schema_version":1,"project":"週末のアトリエ","clips":[…]}` の形で、選んだカットを入力順に並べる。メモをオフにすると各カットから `note` を除き、オンなら原文のまま
- 計算と書き出し：修正前と同じ `export.mjs`（`summarize`・`serializeExport`）を使い、変えていません
- 0件：書き出せず、理由を表示します

| 見本 | 選ぶカット | 件数 | 秒数 | 表示 |
| --- | --- | --- | --- | --- |
| `#all` | c01・c02・c03 | 3 | 370 | 06:10 |
| `#two` | c02・c03 | 2 | 275 | 04:35 |
| `#one` | c02 | 1 | 190 | 03:10 |

`index.html#all` などを開くと、実際のチェックがその組み合わせに切り替わり（制作メモはオン）、件数と時間を計算し直します。見本の一覧は `samples.json` です。

書き出しでは、ブラウザー内で Blob と URL を作り、ブラウザーのダウンロードを呼びます。画面の「ブラウザーへ渡しました」は、ファイルをブラウザーへ渡したという意味で、ディスクへの保存が済んだことまでは示しません。待ち時間の演出、アップロード、外部への送信、設定の保存（localStorage など）はありません。

## ファイル

- `index.html`・`style.css`・`app.mjs`：修正後の画面
- `before/`：修正前の画面（同じデータを実際に書き出せます）
- `export.mjs`・`clips.json`：入力→出力の契約と入力データ（共通）
- `review.md`：quick レビュー
- `request.txt`：ほかの画面に使える依頼文
- `samples.json`：見本の入力と出力
- `input.md`：この作例の依頼
- `outputs/`・`verify.mjs`・`validation.json`：`export.mjs` の出力ファイルと、その検証スクリプト・記録
- `vendor/make-interfaces-feel-better/`：原典の固定版
- `LICENSE`：作例のライセンス

## ローカルで開く・再実行する

ZIPを展開した一式のルート（`examples/` と `media/` が並ぶ場所）からHTTP配信します。

```text
python -m http.server 8000
```

`http://localhost:8000/examples/make-interfaces-feel-better-example/index.html` が実デモ、`before/index.html` が修正前、`video/index.html` が動画の編集プレビューです。画像・入力・MP4を相対パスで読むので、`file://` では開きません。

同じルートから `node examples/make-interfaces-feel-better-example/verify.mjs` で8条件と4つの出力を再計算できます。実ブラウザーの検証とは別です。

動画はNode.js20以上、Python、Chrome、FFmpeg/ffprobeを用意し、同梱したMITのMotion Reelレンダラーを使います。Playwright1.64.0の依存はlockfileで固定し、依存パッケージ自体は同梱していません。次のコマンドで導入し、新しい空の出力先へ書き出します。

```text
npm ci --ignore-scripts --no-audit --no-fund --prefix examples/make-interfaces-feel-better-example/tools/motion-reel
python examples/make-interfaces-feel-better-example/render.py --out renders/first
```

レンダーは原本を編集せず、一時コピーを作って処理します。既存の出力は上書きしません。この同梱レンダラーと公開するrender.pyの既定経路を実行して、28秒・720p・30fps・840フレームの無音MP4を得ています。音声合成機能は今回試していません。

## 実行・確認した範囲

Node8条件、3見本の3/2/1件、修正前後の実JSON4種類、キーボードでの選択と0件復帰、320/375/768/1280pxのページ横はみ出し、44px以上のラベルと操作、実色コントラストを確認しました。現在の結果は `verification.json` と `review.md` が正本です。

動きはAnimationsパネルを利用できず、遷移時間を10倍にした私的なコピー（10%速度相当）で途中と着地を観察しました。準備・例外・HTTP503は条件を作った試験用コピー/ルートで確認しています。公開の画面へ待ち時間や故障の演出は加えていません。

動画は `assets/` の実画面と `outputs/two.json` を使う編集動画です。任意時刻の描画一致、代表フレーム・連続フレーム・全デコードと実MP4の終端再生を確認しました。連続操作の録画ではなく、人による承認や全アクセシビリティ認証でもありません。

## アクセシビリティの範囲

スキップリンク、h1 は1つ、main ほかのランドマーク、ネイティブのチェックボックスとボタン、関連付けたラベル、`role="status"` の状態欄を使っています。スクリーンリーダーでの読み上げ、macOS での表示、すべての環境での確認、第三者による評価や認証、人による承認は行っていません。

## 注意

- 修正前は、操作範囲やフォーカスの課題を含めて 八百万図AIツールボックス が制作した、この作例の入力です。
- スキルによる品質の向上率や、ほかの方法との比較は計測していません
- 解説動画の素材・編集ソース・再現レンダラーを同梱しています。MP4とポスターはZIP内の media/ にあります

## ライセンス

- 作例のコードと文章（`vendor/` 以外）：Copyright (c) 2026 Studio Yebisu、MIT License（`LICENSE`）
- `vendor/make-interfaces-feel-better/`：Copyright (c) 2026 Jakub Krehel、MIT License（`vendor/make-interfaces-feel-better/LICENSE`）。原典のライセンスのまま同梱しています



## 制作の分担

Opus5.5は固定スキルを使ったレビュー・改善画面・日本語解説・映像編集ソースを制作。制作担当は入力と修正前/共通関数、実行、確認、技術修正、レンダラーの梱包と公開を担当しました。個々の確認は verification.json に分けています。


## 概念構造版 visual-r1

上の28秒映像と実行・確認は元制作時の記録です。現在のindex.html/video/index.htmlは、指針と5参照＋既存画面と依頼→元AIのレビューと実装→制作担当の整理/実確認→同じ関数とデータの実UI/JSONへつなぐ新しい図と32秒縦横無音映像です。元の2受領/Node8条件/制御試験は保全し再実行していません。元UIはdesk.html、修正前はbefore/desk.html、旧28秒の編集はvideo/legacy.htmlへ保全。元before/index.html/app/CSS/共通関数/データ/JSON/レビュー/verificationは不変です。原典quickは上限5で、この依頼では3群。制作担当が10関連行を3群へ統合した履歴も保っています。新しい図は元export.mjsを実際に呼び、元の保存JSONと照合します。新32秒はrender-visual.pyを使い、手順/確認はvisual-guide.md/visual-verification.jsonへ。旧ZIPとMP4は私的履歴へ保全し、現在のZIPは同じ展開ルート形式です。
