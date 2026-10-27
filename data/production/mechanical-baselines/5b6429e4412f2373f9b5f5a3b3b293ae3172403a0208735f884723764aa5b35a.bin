# LivePortrait 作例：1枚の肖像が、手動の角度だけで動くまで

LivePortrait（[KlingAIResearch/LivePortrait](https://github.com/KlingAIResearch/LivePortrait/tree/9b294b3d0536135442ea73cb01e6cb3ca7029dd3)、固定コミット `9b294b3d0536135442ea73cb01e6cb3ca7029dd3`、MIT）は、1枚の顔の画像を動かすための、手元で動く Python の肖像アニメーションのモデルと、その原典のコア API です。SKILL.md・ホスト型 API・自動で動く AI のチームではありません。

この作例は、原典のうち `LivePortraitWrapper`（HUMAN）を直接呼ぶ小さな範囲だけを、制作担当が1回だけ実行した結果を、1枚の大きな構造図と32秒の無音の解説動画にしたものです。

## 何をしたか

- 入力：原典に同梱の `assets/examples/source/s9.jpg`（レオナルド・ダ・ヴィンチ《モナ・リザ》の複製画）を、同じバイトのまま `inputs/mona-lisa-original.jpg` に置きました。AI で作った肖像・人物の録画・駆動動画ではありません。
- 手動の切り出し：`prepare_input.py` が PIL の枠 `[110, 100, 610, 600]` を LANCZOS で 512×512 の `inputs/portrait-crop.png` にしました（顔検出なし）。元 API の `prepare_source` がこれを 256×256 に縮めます。
- 1回だけの推定：F（`appearance_feature_extractor`）が見た目の 3D 特徴（1×32×16×64×64）を1回、M（`motion_extractor`）が姿勢・表情・暗黙の21点を1回だけ推定しました。21点は学習された点で、目や鼻と名前の付いた点ではありません。
- 手動の値：作者が決めた yaw の36値（`round(振幅·sin(2πi/35), 6)`、振幅 8 度と 16 度の2条件）を、推定した yaw に足しました。これは入力の制御値で、生成された顔の向きを測った値ではありません。
- 各コマ：`transform_keypoint` で21点を変換し、`stitching` の学習した補正を足し、`warp_decode` で W が同じ F 特徴を変形して G が 512×512 の画像を新しく描き、`parse_output` が 0〜1 に収めて 8bit にしました。オフセット 0 の1コマ目も G が描いた画像で、入力の1枚とは別物です。
- 包装：ランナーが36枚の PNG を書き、別の工程で FFmpeg（libx264・yuv420p・faststart・`-an`）が 12fps・3秒・無音の MP4 にまとめました。

実行していないもの：`LivePortraitPipeline`・`inference.py`・Gradio、顔検出（InsightFace・`landmark.onnx`）、駆動動画からの動き、音声・リップシンク、目と口の比率 retargeting（重みは `checkpoint_S` と一緒に読み込みましたが、ネットワークは呼んでいません）、ペーストバック、動物モード、ComfyUI。

## 役割と時期

| 時期 | 担当 | したこと |
|---|---|---|
| 第1段階 | 作者 AI（Claude Opus 5.5、1体） | `prepare_input.py`・`run_example.py`・`inputs/jobs.json`・`implementation.md` を書いた。何も実行していない。 |
| 実行 | 制作担当 | 原典と重みの固定、専用環境、入力の出所の確認を行い、上の2本を1回だけ実行した。`concept/facts.json`・`concept/manifest.json`・`outputs/yaw08.json`・`outputs/yaw16.json` などの事実の包装も制作担当が別に行った。結果は固定済みで、再実行しない。 |
| 第2段階（この README の作成時） | 作者 AI（Claude Opus 5.5、1体） | `index.html`・`app.js`・`styles.css`・`video/`（`index.html`・`main.js`・`draw.js`・`storyboard.json`・`README.md`）・`samples.json`・この README と記事の下書きを書いた。コードの実行・描画・書き出し・表示の確認はしていない。 |
| 後の工程 | 制作担当 | 図・ページ・解説動画の実際の表示と描画、ブラウザーでの確認、解説動画の MP4 とポスターの書き出し、ソース ZIP の包装、公開。 |

この README を書いた時点では、ページ・図・解説動画の表示や描画の確認（QA）はまだ行っていません。結果は制作担当が後の工程で、実際の記録とともに残します。人による見た目の承認もまだです。

番号の付いた6部品は、説明のための整理です。原典の区分でも、自動で動く AI エージェントでもありません。

## ページがすること

`index.html` は、開くたびに `concept/manifest.json` を固定の SHA-256 と照らし、そこに載った48ファイルの大きさと SHA-256 を確かめます。さらに、6部品の引用が同梱した原典の該当行と同じか、`facts.json`・`results.json`・`inputs/jobs.json`・各ジョブの JSON のあいだで ID・角度・呼び出し回数・切り出し・入力の記録が揃っているか、PNG と JPEG の寸法、MP4 の中の映像トラック（36コマ・3秒・512×512・映像のみ）を照合します。1つでも違えば、図・動画・保存のリンクを止め、理由と「もう一度確かめる」を出します。ファイルを元に戻せば、同じ照合でまた表示できます。

ブラウザーでは推論・合成・エンコードをしません。「±8°」「±16°」は保存済みの2つの結果を読み替えるだけで、値を変えて生成し直す操作ではありません。保存のボタンは、照合したバイト列をそのままブラウザーに渡します（MP4・ジョブの JSON・入力の PNG）。表示は「保存をブラウザーに依頼しました」で、ディスクへの保存の完了を確かめるものではありません。

図の中の写真・21点・角度・生成コマは実データです。立方体や動く印は説明のための形で、ネットワーク内部の値の可視化でも、実際の処理時間でもありません。

## 手元で見る

リポジトリのルートで次を実行し、ブラウザーで開きます（SHA-256 の計算に `localhost` か https が要ります。`file://` では開けません）。

```bash
python -m http.server 8000
```

- 作例ページ：<http://localhost:8000/examples/liveportrait-example/index.html>（`#yaw08`・`#yaw16` で結果を選べます）
- 解説動画の編集用ソース：<http://localhost:8000/examples/liveportrait-example/video/index.html>

外部のフォント・CDN・計測は使いません。

## 同じ実行を自分で行うには

固定した5つの重みとPython依存・FFmpegが別に必要です。`vendor/liveportrait/` の22原典ファイルには、この限定コア用ランナーが照合する21パスをすべて含みます。アプリ全体ではありませんが、このランナーのソース要件を満たす範囲です。実制作では固定版の全213ファイルのcheckoutを使いました。同梱部分を起点とした別の推論実行はしておらず、最小ソース範囲の説明はファイル要件とimportの静的確認に基づきます。下の全checkout手順は実制作時の配置を再現する方法です。

- Python 3.11 の専用環境（CPU）：torch 2.6.0+cpu・numpy 1.26.4・Pillow 11.3.0・opencv-python 4.10.0.84・scipy 1.13.1・PyYAML 6.0.1・rich 13.7.1
- PATH 上の FFmpeg と ffprobe
- 重み：KlingTeam/LivePortrait @ `82a4fa6735ca58432b6ce39301b4b9ee066dea47` の `liveportrait/base_models/` の4ファイルと `liveportrait/retargeting_models/stitching_retargeting_module.pth`

```bash
git clone https://github.com/KlingAIResearch/LivePortrait <upstream>
git -C <upstream> checkout 9b294b3d0536135442ea73cb01e6cb3ca7029dd3
huggingface-cli download KlingTeam/LivePortrait --revision 82a4fa6735ca58432b6ce39301b4b9ee066dea47 \
  --include "liveportrait/base_models/*" "liveportrait/retargeting_models/*" --local-dir <weights>

# この作例のフォルダー（inputs/ がある場所）で
python prepare_input.py
python run_example.py --upstream <upstream> --weights <weights> --jobs inputs/jobs.json \
  --output <新しい出力フォルダー> --frames-dir <新しい非公開フォルダー>
```

`prepare_input.py` は既存の出力があれば処理を止めます。ランナーは原典ファイルの git blob・重みの SHA-256・ライブラリの版を照合し、合わなければ止まります。この作例の結果は上の実行の1回分で固定しており、ページのために再実行していません。

## 記録の読み方

- `concept/facts.json`：制作担当が実行の記録から包んだ事実（21点の配列・角度・呼び出し回数・6部品の引用など）。
- `outputs/results.json`：ランナーが測った値の射影。LivePortrait のネイティブな出力形式ではありません。
- `outputs/yaw08.json`・`outputs/yaw16.json`：`results.json` の該当ジョブと入力の記録を、親の工程が UTF-8/LF で包んだもの。新しい推論ではありません。
- 時間（読み込み・推定・生成）は制作担当の CPU での1回の測定で、ベンチマークではありません。

## 保証しないこと

入力の度数は制御値で、出力の角度の精度は確かめていません。本人らしさの保持・自然さ・ループのつながり・性能・人による見た目の承認も保証しません。`parse_output` は 0〜1 に切り詰めて 8bit にし、その後の H.264（yuv420p）は非可逆です。実機の iOS Safari・VoiceOver・200% 拡大での表示は未確認です。

## ライセンスと表示

- LivePortrait のソース：MIT（Copyright (c) 2024 Kuaishou Visual Generation and Interaction Center）。全文は `vendor/liveportrait/LICENSE`。そこにある InsightFace の検出モデルの非商用研究用の条件は、この作例では対象外です（取得・読み込み・実行をしていません）。
- 重み：KlingTeam/LivePortrait のモデルカードは MIT。重み・環境・フルのチェックアウト・キャッシュは配布しません。
- 入力：《モナ・リザ》の複製画（原作品はパブリックドメインの歴史的絵画）。原典の `s9.jpg` を同じバイトで使い、手動の切り出しと生成画像はそこからの派生です。
- 別に入れた依存（同梱なし）：`THIRD_PARTY_NOTICES.md` を参照。
- ページ・図・文章・解説動画のソースとランナー：八百万図AIツールボックス、MIT（`LICENSE`）。作者 AI（Claude Opus 5.5）が書き、原典の実行と事実の包装は制作担当が行いました。
- 解説動画の書き出しに使う固定版 Motion Reel のMITレンダラー5ファイルと表示を、制作担当の後工程で tools/motion-reel に同梱しました。依存とChrome本体は配布していません。


## 制作担当による後工程の追記

作者が書いた時点の未確認状態と、その後の制作担当による検査は別です。制作担当が12スマホ状態・6部品8引用・16表示条件・3破損停止と復旧、実3秒動画2本の自然終端、5保存要求と返却5ファイルの全バイト一致、編集48素材・7場面・任意7.2秒・通常32秒・ネイティブrange0.1秒、代表/連続/contactと縦横32秒960f無音MP4の全デコード/自然終端、出荷ソース62PNG一致を新しく確認。人の審美的承認・実機iOS/Safari/VoiceOver・200%拡大・全入力/品質/性能は未確認。 詳細は visual-verification.json（映像側からは ../visual-verification.json）にあります。紹介映像と編集は無音で、実出力2本にも音声トラックはありません。

制作担当による再現範囲の補足：実制作では固定版の全213ファイルのcheckoutを使いました。配布した22原典ファイルには、このrun_example.pyが照合する21パス（コード・設定・小さな補助リソース・LICENSE）がすべて含まれます。この限定されたコアAPI用ランナーのソース要件を満たす範囲で、LivePortraitのアプリ全体を同梱したものではありません。別途、固定した5重み、Python3.11と記載の依存、FFmpegが必要です。重みや環境は同梱していません。同梱ソースを起点とした別の推論実行はしておらず、この説明はファイル要件とimportの静的な確認に基づきます。原本のヘルプやUPSTREAM.jsonにある「full checkout required」は実制作時の配置とアプリ全体の導入の説明として残しています。限定コアの再現にも全アプリや検出モデルが必ず必要、という意味ではありません。

source.zip はリポジトリのルート配置（examples/liveportrait-example と media と LICENSE）です。空のフォルダーに展開し、その展開ルートで python -m http.server 8000 を起動し、http://127.0.0.1:8000/examples/liveportrait-example/index.html または video/index.html を開きます。file:// ではハッシュ検査・モジュール読込は動きません。共通の記事サイトは含まれません。

描画の再現は、必要な依存を npm ci --prefix examples/liveportrait-example/tools/motion-reel で別途用意し、展開ルートで python examples/liveportrait-example/render_visual.py --out ../fresh-portrait --width 720 --height 1280 --strip-at 18.4 を実行します。横は別の新規出力先と --width 1280 --height 720、代表/連続PNGだけなら --stills-only を指定します。既存出力を上書きしません。この利用者側の再現は、今回凍結した1回のモデル実行とは別です。
