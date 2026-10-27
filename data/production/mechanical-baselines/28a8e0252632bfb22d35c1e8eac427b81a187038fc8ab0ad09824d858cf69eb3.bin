# ACE-Step V1 作例：架空のパズルゲームの20秒BGMを、原典のPython APIで1回だけ生成する

ケース `ace-step-example`／カタログ `resource-ace-step`

## これは何か

**ACE-Step V1** は、手元のPythonで動く音楽生成モデル／パイプラインです。ソースは `ace-step/ACE-Step` のパッケージ `ace_step` 0.2.0、重みは別に配布される `ACE-Step/ACE-Step-v1-3.5B`（V1・3.5B）です。

- SKILL.md（AIが読む手順書）ではありません。同梱の `vendor/ace-step/README.md` は、原典のREADMEとPython APIの一次資料です。
- ホスト型の音楽API、ブラウザーの中のシンセサイザー、自律的に動く複数のエージェントでもありません。
- 2026-01-28 に公開された ACE-Step v1.5 は別の版で、この作例では使っていません。
- 図の6つの部品は、この作例のために原典を読んで分けた説明の区切りで、公式の部品の区分ではありません。

## 役割

| 誰 | したこと | していないこと |
| --- | --- | --- |
| 作者AI（Claude Opus 5.5・`claude-opus-5-5`、1体） | 第1段階で `run_example.py`・`inputs/jobs.json`・`implementation.md` を書いた。第2段階でこのページ・図・無音の説明映像・README・`samples.json`・記事を書いた | コマンドの実行、モデルの実行、音の生成、試聴、描画や書き出しの確認 |
| 制作担当 | 固定版のソースとモデルを用意して照合し、専用の Python 3.11・CPU 版 torch 2.6 の環境で `run_example.py` を1回実行した。保存されたファイルを測定し、公開用の写しを選んだ | 音声の加工、追加の生成、別のseedでの試行 |
| このページのブラウザー | 保存済みのファイルを確かめてから、同じ実際のWAVを再生し、保存を手渡す | 生成、モデルの呼び出し、アップロード、外部APIへの通信 |

制作担当は実行の前に1点だけ補正しました。`save_path` を、絶対パスから実際のプロセスの作業ディレクトリに対する相対パス（`os.path.relpath`）に変えたことです。これで原典が書くWAV・戻り値・`*_input_params.json` に非公開の絶対パスが入りません。原典のAPI・ソース・モデル・音声のバイト列は書き換えていません。作者が書いた元の `run_example.py`（SHA-256 `dfd04ade…`）と補正後（`ee9440b0…`、同梱のもの）は区別して保存しています。CPUで実行したのは、承認済みの別のGPU作業が動いていたためで、CPUとGPUの比較ではありません。ComfyUIやほかのプロセスは変更していません。

## 固定した版

| 項目 | 固定値 |
| --- | --- |
| ソース | [ace-step/ACE-Step @ 1bee4c9f5b43e30995f8d4d33b3919197ce1bd68](https://github.com/ace-step/ACE-Step/tree/1bee4c9f5b43e30995f8d4d33b3919197ce1bd68)（`ace_step` 0.2.0、Apache-2.0） |
| モデル | [ACE-Step/ACE-Step-v1-3.5B @ 82cd0d7b6322bd28cd4e830fe675ddb6180ce36c](https://huggingface.co/ACE-Step/ACE-Step-v1-3.5B/tree/82cd0d7b6322bd28cd4e830fe675ddb6180ce36c)（公開・ゲートなし・Apache-2.0） |
| API | `acestep.pipeline_ace_step.ACEStepPipeline`：`__init__` → `load_checkpoint` 1回 → `__call__` 1回（batch 1） |

制作担当は固定コミットの公式 Git blob 106個の生のバイト列を照合し、そのうち読むための16ファイルを `vendor/ace-step/` に原文のまま置いています。**この16ファイルだけでは動きません。** モデルは公式の全ファイルのハッシュ（LFSは sha256、通常ファイルは git blob）を照合しました（`model-card/pin.json`）。重み・トークナイザー・実行環境・キャッシュ・認証情報・非公開の実行履歴は同梱していません。

## 1回の実行

- ジョブは1件（`cozy-puzzle-bgm-20s`）。架空のパズルゲーム「こもれび小箱」のタイトル画面向けの、20秒のオリジナル・インストゥルメンタルBGMという依頼です。日本語の依頼文は説明用のラベルで、モデルには渡していません。
- モデルに渡した説明文：`instrumental, cozy puzzle game background music, marimba, soft plucked strings, light percussion, warm bass, calm, curious, gentle, relaxed tempo`
- 歌詞は空文字、`audio_duration` 20.0（要求値）、`manual_seeds` "20261020"、`infer_step` 27、`scheduler_type` euler、`cfg_type` apg、`guidance_scale` 15.0、`task` text2music。全設定は `inputs/jobs.json` と `outputs/execution.json` にあります。
- 参照音声・既存の曲名や作者名・LoRA・audio2audio・retake・repaint・edit・extend は使っていません。学習・Gradio・ComfyUI・V1.5 も使っていません。MERT と m-hubert は原典のREADMEによると学習時に表現を揃えるためのもので、この推論では動かしていません。
- 楽器・テンポ・雰囲気・インストゥルメンタルであることは**要望**で、実際にそうなったかは測っていません。歌詞が空なので、原典は既定の歌詞ID/マスク0を渡します。歌詞のトークン化は実行していません。

実行環境（`outputs/execution.json` の記録）：Windows・CPU・float32、Python 3.11.15、torch 2.6.0+cpu、torchaudio 2.6.0+cpu、torchvision 0.21.0+cpu、diffusers 0.33.1、transformers 4.50.0、tokenizers 0.21.4、accelerate 1.6.0、peft 0.15.2、huggingface_hub 0.36.2、safetensors 0.8.0、numpy 2.2.6、soundfile 0.13.1、librosa 0.11.0、spacy 3.8.4、loguru 0.7.3、tqdm 4.70.1、py3langid 0.3.0、num2words 0.5.14、pypinyin 0.53.0、hangul-romanize 0.1.0、fugashi 1.5.2。スレッドは intra/inter-op とも4。この環境は推論に必要な import を原典の制約に合わせて入れたもので、Gradio の画面や学習まで含めたフルインストールではありません。`ace_step` 自体はインストールせず、固定版のチェックアウトを `sys.path` の先頭に置いて読み込んでいます。

時間（1回きりの壁時計の値で、速さの比較やベンチマークではありません）：`load_checkpoint` 9.093218秒（`__call__` とは別）、`__call__` 220.980002秒。原典自身の内訳は前処理 0.651秒・拡散 165.205秒・デコード 55.123秒です。原典のREADMEやモデルカードにあるGPUの速度表とは条件が違うので比べられません。

## 返ったもの

| ファイル | 内容 |
| --- | --- |
| `outputs/audio/cozy-puzzle-bgm_seed20261020.wav` | 原典の `save_wav_file`（`torchaudio.save`）が書いたWAVを、バイト単位でそのまま写したもの。7,668,248バイト、48,000Hz・2チャンネル・32-bit浮動小数（IEEE float。PCM16ではありません）、958,520フレーム＝19.969167秒。SHA-256 `bd58e0f5cad4c777cbeae1e7e2f0baf52b6f1d9ae6f943e8878f381380c7ca1d` |
| `outputs/audio/cozy-puzzle-bgm_seed20261020_input_params.json` | 原典がWAVの隣に書いた入力記録をそのまま写したもの（1,381バイト）。`audio_path` は原典が書いた Windows の相対パス `audio\cozy-puzzle-bgm_seed20261020.wav`（バックスラッシュ）のままです。ブラウザーのURLとしては使えないので、ページは `concept/facts.json` の `actual_output.audio` を使います |
| `outputs/return.public.json` | `__call__` の戻り値（パスと設定の辞書）の公開用の写し。ランナーが作ったもので、原典のファイルではありません |
| `outputs/execution.json` | 制作担当が成功した実行の要約から選んだ公開用の写し。モデルやAPIが出したものではありません。全体の記録と非公開の生の戻り値・ログは、このフォルダの外に保存しています |

**長さ**：20.0秒は要求値です。原典は `int(20×44100/512/8)=215` の潜在長で生成し（境界で観測した圧縮潜在の形は 1×8×16×215）、デコード後の実際の長さは19.969167秒で、要求より30.833ミリ秒短くなりました。20.000秒に揃えてはいません。

**加工**：制作担当はトリミング・正規化・フェード・再エンコード・ループ加工・リサンプリングをしていません。ただし原典のデコードの中で、vocoder の44.1kHzから指定の48kHzへの変換が起きています。「どこでもリサンプリングしていない」わけではありません。

**境界の観測**：`get_text_embeddings`・`text2music_diffusion_process`・`latents2audio`・`save_wav_file` の入口と出口の時刻と、引数・戻り値の形を、`super()` に委ねるだけのサブクラスで記録しました（各1回）。説明文の特徴 1×33×768・マスク 1×33、圧縮潜在 1×8×16×215、保存した波形 2×958520。`use_erg_tag` による空文字側の埋め込み呼び出し（`get_text_embeddings_null`）は観測していません。これらは attention、初期の乱数の値、各stepの途中、実際のメル、guidance の効き方、音楽の質を測ったものではありません。

**数値の測定（別工程）**：soundfile/numpy で読み、すべて有限、|x|≥1 のサンプル0、ピーク0.99541199、RMS 0.28364029（−10.945 dBFS）、冒頭0.5秒の RMS 0.36780433、末尾0.5秒の RMS 4.09146×10⁻⁵（−87.762 dBFS）。これらの数値から、ノイズが無いこと、終わり方が自然なこと、無音で終わること、歌声が無いこと、ループできることは言えません。

**試聴**：人による試聴はしていません。楽器・テンポの合い方、雰囲気、歌声や雑音の有無、終わり方、ループ、独創性、既存曲との類似はどれも未確認です。

## ページ（`index.html`）

- 大きな構造図が先頭です。「①何か・②渡す・③返る」で同じ図の上の形の位置と強調が変わり、つながりはどの段階でも同じです。
- 番号の付いた6つの部品を押すと、観測したことと、固定版の原典の該当行（同梱ファイルとGitHub）を読めます。引用は読み込み時に原典の行と一字一句照合しています。
- `#output-audio` は確かめたWAVのバイト列から作ったURLだけを再生します。自動再生はしません。「全体・冒頭3秒へ・終わり3秒へ」は**同じ1つのWAVの再生位置**で、3つの生成や切り出したファイルではありません。選ぶと一時停止してその秒へ移るだけで、そのまま最後まで再生できます。URLの `#whole`・`#begin`・`#end`・`#cozy-puzzle-bgm-20s` で開けます（分からない値は全体）。
- 保存は3つ：全体のWAV（`#download-audio`）、原典の設定JSON（`#download-params`）、実行の記録（`#download-execution`）。どの区間を選んでいても同じ全体のファイルです。保存はブラウザーへの依頼で、保存が終わったことまでは確かめられません。
- 読み込みでは `concept/manifest.json` を `no-store` で取り、SHA-256 を固定値 `7858cef475daefb30ae1a4d0465fdbd7523705f842767c0dec7cecadfade8662` と比べ、一覧の25ファイルすべての大きさとSHA-256、facts、引用、ジョブ1件、WAVの形式と長さ、試聴の区間を確かめます。HTTPの失敗・壊れたJSON・ハッシュの不一致のどれでも、図・音声・保存を止め、前の結果も消してから理由と「もう一度確かめる」を出します。
- テーマ（明暗）と動きを減らす設定は図の見た目だけに効き、音声や設定には影響しません。
- フォントは端末のものだけを使い、外部のAPI・CDN・音源・音声合成・マイクは使いません。

## 無音の説明映像（`video/`）

32秒・30fps・縦720×1280／横1280×720の編集ソースです。音声トラック・ナレーション・音声ガイドはありません。詳しくは [video/README.md](video/README.md)。MP4とポスターは受領後に制作担当が別工程で書き出し、確認しました。

## 自分で再現するとき

この作例の制作では、凍結した音声を作り直すことはありません。読者が自分の環境で同じ手順を試すことはできます。そのときに出る音は、環境やseedの扱いの違いで同じになるとは限りません。

1. 固定コミットの**フルチェックアウト**を用意します（同梱の16ファイルだけでは足りません）。
2. 固定リビジョンのモデルを、`music_dcae_f8c8`・`music_vocoder`・`ace_step_transformer`・`umt5-base` の4つのサブディレクトリがある状態でローカルに置き、全ファイルのサイズとsha256を書いたピン記録JSONを用意します（形式は `implementation.md`）。重みは公開・ゲートなし・Apache-2.0 で、追加の認証や利用条件への同意の手続きはありません。
3. Python 3.11 の専用環境に、固定版の `requirements.txt` の制約に合わせて推論に必要なパッケージを入れます（上の版が制作担当の記録です）。
4. 作例フォルダー（展開先の `examples/ace-step-example/`）で次を実行します。出力先は空の新しいディレクトリにします。

```powershell
python run_example.py `
  --upstream <ACE-Step 1bee4c9f のフルチェックアウト> `
  --model-dir <ACE-Step-v1-3.5B 82cd0d7b のローカルディレクトリ> `
  --model-pin-record <モデルのピン記録.json> `
  --jobs inputs/jobs.json `
  --out <空の出力ディレクトリ> `
  --device cpu `
  --threads 4
```

ランナーはオフライン（`HF_HUB_OFFLINE=1`・`TRANSFORMERS_OFFLINE=1`）で動き、モデルが揃っていなければ読み込む前に止まります。ダウンロード・ComfyUI・APIサーバー・Gradio の画面は使いません。CPUでは、合計約8.3GBのモデルファイルを読み込むためのメモリと時間が要ります。所要時間は環境で大きく変わるので、ここに書いた1回の値を目安にせず、自分の環境で測ってください。

ページ・MP4・コマ確認を開くときは、`source.zip` の展開先（`examples/` と `media/` がある階層）をルートにしてローカルサーバーを起動します（`file://` では確認ができません）。

```text
python -m http.server 8000 --bind 127.0.0.1
# http://127.0.0.1:8000/examples/ace-step-example/index.html
```

## ライセンス

- この作例のページ・図・説明映像・ランナー：八百万図AIツールボックス、MIT（`LICENSE`）。
- ACE-Step のソース：Apache-2.0（`vendor/ace-step/LICENSE`、各ファイルの著作権表示を保持）。モデル：Apache-2.0（`model-card/README.md`）。どちらもこの作例のMITとは別です。詳しくは `THIRD_PARTY_NOTICES.md`。
- 生成されたWAVは固定版V1モデルによるAI生成物です。公開するときはAI生成であることを明記してください。原典のREADMEは、生成物のオリジナリティの確認、AIの関与の明示、保護された様式や素材を使う場合の許諾を勧めています。

## まだ確かめていないこと

- 人による試聴、審美的な承認、ゲームへの組み込みや本番での採用。
- 実機の iOS Safari・VoiceOver・200%拡大、すべての入力の組み合わせ、性能、クリップボードの読み戻し。
- 作者の執筆時点では、新しい図と映像の表示・描画・書き出し・公開確認は未実施でした。受領後の制作担当の検証を下記と `visual-verification.json` に分けて記録します。


## 制作担当による受領後の確認と再描画

作者の原本とは別に、制作担当が新しい図の320/375px・3段階×3聴取位置、6引用、16表示条件、3破損停止と再試行、同じ実WAVの無音ネイティブ再生終端、3保存要求と返却ファイルの全バイト一致、25素材編集と任意7.2秒、代表・連続コマ、縦横32秒の無音MP4を確認しました。これは人の聴取や審美的承認、実機iOSの確認ではありません。詳細と出荷ソースの再描画範囲は `visual-verification.json` です。原音楽を再生成していません。

親が行った補正は、詳細DOMの配列展開、長い制約文のスマホ折り返し、不正なURLフラグメントの復帰、CanvasのCPU描画固定、スライダーの停止前の入力値保持、再現手順・包装・確認状態の記録です。新しいOpus原本11ファイルとは区別しています。

同梱の `tools/motion-reel/` は既存のMIT描画ランタイム5ファイルです。NodeとChrome、ffmpeg、Python、および `cd tools/motion-reel && npm ci` で固定lockに対応する依存を用意してください。node_modulesは配布しません。作例のルートで次のように、推論や音源再生成をせず描画できます。出力先はこのフォルダーの外の、新しい空フォルダーです。

```sh
python render-visual.py --out <新しい出力先>/portrait --width 720 --height 1280
python render-visual.py --out <新しい出力先>/wide --width 1280 --height 720
```

`--stills-only` では各向きの代表16枚・連続12枚・contact/poster/stripを描きます。`video/review/portrait/review.html` と `video/review/wide/review.html` でコマと実MP4を確認できます。同じ環境の再描画を比較し、別OSの書体や同一ピクセルは保証しません。フルACE-Step・重み・実行環境は再描画には不要です。
