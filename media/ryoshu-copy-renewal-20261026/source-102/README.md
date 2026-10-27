# Ryoshu 102秒メインレンダラー

`render.py` は、1920×1080・30 fps・102秒の `ryoshu-promo-102s.mp4` をローカルで生成します。UIは実アプリ操作を記録した映像の画素を切り出し・拡大縮小して再利用し、カメラ移動、テキスト、音楽、効果音をコードで描画・合成します。OCR、Qwen、アプリ機能を実行時に新たに呼び出すものではありません。

元データは架空ですが、アプリ操作の記録は実物です。入力は既存の架空100件のサブセット5件（V007、V021、V044、V045、V001）であり、新規・未見の5パターンや100件の新規実行ではありません。

記録は実観測サンプルをつなぎ、欠測区間では直前の実観測を保持するもので、連続した滑らかなデスクトップ録画ではありません。特にraw 310～315秒はモーダル表示から確認済み状態へ進み、チェックボックスにチェックが入るサンプルはありません。チェック操作や中間状態を捏造・補間せず、そのまま扱います。最終映像の出力フレームレートは30 fpsです。

## 必要環境

- Python >=3.12（検証: 3.12.15）
- Pillow >=10（FreeType・可変フォント対応）、numpy >=1.26
- `PATH` 上の `ffmpeg`（libx264とネイティブAACエンコーダーが必要、検証: 8.1.2）と `ffprobe`
- フォント実ファイルは同梱しません。`common.py` の `FONTS` により `C:/Windows/Fonts/` から、日本語用 `NotoSansJP-VF.ttf`（Noto Sans JP可変フォント、wght軸）と、英字の製品名・章番号・URL用 `bahnschrift.ttf`（Bahnschrift可変フォント）を読みます。

## パッケージ構成と入力

```text
source-102/
├── render.py
├── promo102.py
├── common.py
├── copydeck.py
├── audio.py
├── qc.py
├── requirements.json
└── input/
    ├── promo-copy-deck.json
    ├── revision-copy-deck-v2.json
    └── new-real-ui.mp4
```

`new-real-ui.mp4` のSHA-256は `a53a8a2a91f5737cc472ee77594ebaa0720a10e275938db0d818d98b28e7cecc` です。

raw映像は、ソースフォルダー基準で `$RYOSHU_INPUT`（設定時）→ `./input` → `../input` → `../../input` の順に、`new-real-ui.mp4` が存在する最初のフォルダーから読みます。2つのdeckはこの探索を使わず、常にソース直下の `./input` から読みます。revision deckの同名slotがprior deckを置き換え、表示文字列はdeckからそのまま使われます。

## 実行

ソースフォルダーで実行します。対応コマンドは次の2形式だけです。

```bash
python render.py
python render.py --stills 5 9.5
```

通常実行は本編、ポスター（9.6秒）、`music.wav`・`sfx.wav`・`mix.wav`、表示文字列の検証JSONを作り、QCと実行記録も行います。`--stills` は1個以上の秒数をfloatで受け取り、昇順に `build/stills/` へPNGを保存するだけで、本編は生成しません。

出力は `$RYOSHU_OUT/build` と `$RYOSHU_OUT/deliver` です。`RYOSHU_OUT` 未設定時は、ソースフォルダーの親フォルダーを出力ルートにします。本編MP4、ポスター、3種のWAVと検証JSONは `deliver`、中間映像、音声、静止画、QC結果、`run-record.json` は `build` に置かれます。

ffmpegの `-y` とファイルコピーにより、同名出力は確認なしに上書きされます。既存成果物を残して再現する場合は、事前に `RYOSHU_OUT` で別の出力ルートを指定してください。

コード: 実Claude Opus 5.5。日本語README: 設定された実Kimi K3.1 Pro。
