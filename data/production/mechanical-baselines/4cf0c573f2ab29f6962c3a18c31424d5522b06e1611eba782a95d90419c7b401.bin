# VoiceStudio 作例：手元の API で音声を文字起こしする仕組み

VoiceStudio（[debpalash/VoiceStudio](https://github.com/debpalash/VoiceStudio/tree/6f0ed2ebeaf620bcea8a293cd210bba920b73622)、固定コミット `6f0ed2ebeaf620bcea8a293cd210bba920b73622`、版 0.5.7、AGPL-3.0-only）は、Electron のデスクトップ音声アプリと、画面なしでも動く手元の音声サーバー（FastAPI）です。AI エージェント向けの公開スキル（Markdown の `skills/voicestudio/SKILL.md`）と、依存のない Python の CLI（`backend.speech_client`）が付いています。

VoiceStudio 自体は認識モデルではありません。文字と時刻を推定するのは、そこで選んだ別の認識モデルです。ホスト型の OpenAI のサービスでも、自律的に動く AI エージェントの集まりでもありません。

この作例は、画面（Electron）を使わず、**原典CLI → 手元のフル FastAPI バックエンド → 選んだ Faster-Whisper のモデル** という小さな経路だけを実際に動かし、返った JSON と TXT を図・ページ・無音の動画で読めるようにしたものです。

## 図の流れ

```text
公開の手順書 SKILL.md ─┐
依頼（WAV の場所・条件）─┴→ 作者AI（1体）が run_example.py を書く（実行しない）
                          → 担当者が原典CLIを実行（transcribe <wav> --model faster-whisper --language en --format verbose_json）
                          → WAV（バイト列は変えない）＋条件を multipart で POST /v1/audio/transcriptions（127.0.0.1:3900）
                          → 元のアプリが利用条件と導入済みのモデルを確かめ、FasterWhisperBackend を用意
                          → 別の認識モデル Systran/faster-whisper-base（faster-whisper 1.2.1 / CTranslate2 4.8.2）
                          → 2つの推定区間と全文（verbose_json）
                          → <id>.json（CLI の標準出力そのまま）／<id>.txt（text＋改行1つ）
参照文（jobs.json）─────── 送らない ───────→ 最後に文字どおり比べる
```

図の6つの部品（手順書・原典CLI・ローカルAPI・選択と準備・認識モデル・返答）は、この作例の説明のための整理です。VoiceStudio の公式の区分でも、6体の AI でもありません。

## 役割

| 主体 | したこと |
|---|---|
| 作者AI（Claude Opus 5.5、`claude-opus-5-5`） | 第1段で公開の手順書と固定版の原典を読み、`run_example.py`・`inputs/jobs.json`・`implementation.md` を書いた。入力の英文と WAV の情報は読んだが、WAV を聞いておらず、CLI も実行していない。第2段でこのページ・図・動画の編集用ソース・記事を、保存された結果だけから書いた |
| 制作担当 | 隔離した環境・固定版の原典・モデルを用意し、無改変のバックエンドをループバックで起動して `run_example.py` を実行した。実行の前に、成功した CLI の標準出力を検証より先に保存するよう順序だけを補正した（作者の原本は別に保全）。原典・入力・API・モデル・要求の条件・再送の方針は変えていない |
| VoiceStudio の原典 | CLI（multipart の送信）、FastAPI のルート、利用条件とモデルの確認、`FasterWhisperBackend` |
| 認識モデル（MIT） | `Systran/faster-whisper-base@ebe41f70d5b6dfa9166e2c581c45c9c0cfc57b66`。バックエンドの中で faster-whisper／CTranslate2 が動かした |
| このページ・動画 | 保存されたファイルを確かめて表示し、入力の WAV を再生するだけ。文字起こし・音声合成・モデルの実行はしない |

## 実際に実行したこと

- 原典CLI `python -m backend.speech_client --engine-url http://127.0.0.1:3900 capabilities` を **1回**。結果は `outputs/attempt-01/capabilities.json`。
- 原典CLI `python -m backend.speech_client --engine-url http://127.0.0.1:3900 transcribe <作例>/inputs/audio/<id>.wav --model faster-whisper --language en --format verbose_json` を3件に **1回ずつ**（計3回）。3回とも成功し、再送・別エンジンへの切り替え・フォールバックはありません。
- 実際の multipart 要求が `POST /v1/audio/transcriptions` に届きました。送ったのは `model`・`response_format`・`language` と変更していない WAV（`file`）だけで、`prompt`・`initial_prompt`・`temperature`・`timestamp_granularities[]`・`stream` と参照文は送っていません（送った中身は固定版の CLI のソースからの説明で、ラッパーが観測したのは引数・終了コード・標準出力です）。
- `model=faster-whisper` は VoiceStudio の ASR エンジンの ID で、元のルートは動いているエンジンがそれと違えば `400 model_not_active` で断ります。ホスト型のモデル名ではありません。
- 元のバックエンドのログ（制作担当が実行後に確認）：3件とも CPU・int8 で読み込み、VAD で除いた時間は0.000秒、`word_timestamps=False`。**モデル読み込みのメッセージは3回**出ています（1回だけ読み込んで使い回したとは言えません）。`OMP_NUM_THREADS=4`・`MKL_NUM_THREADS=4` は設定した値で、実際のスレッド数を測ったものではありません。

### 準備の表示と実行の証拠は別

実行前の `/health`・`/openapi.json`・`/engines`・`/models` は準備の確認で、実行の証拠ではありません。実行後の `/engines` も、新しく作られた選択オブジェクトとして `evidence_state: not_loaded` を返しました（`outputs/attempt-01/results.json` の `executed.engines_after`）。これを「読み込み済み」と読み替えません。実行の証拠は、成功した3回の CLI／HTTP の呼び出しと、元のバックエンドのログです。

## 入力と出力（実際のバイト数）

入力の3本は、以前の Chatterbox 作例で合成した英語の音声（Perth の透かし入り）を、切り詰め・正規化なしでそのままコピーしたものです。今回は新しい音声合成も、人の録音もしていません。音声ガイドや VoiceStudio の音声合成の出力ではなく、文字起こしへの入力です。

| id | 入力 WAV | 返った区間（推定） | JSON | TXT | 参照文と文字どおり |
|---|---|---|---|---|---|
| default | 4.64秒・222,764 B・24 kHz・モノラル・PCM16 | 0.00–2.40／2.40–4.64秒 | 589 B | 113 B | 一致（true） |
| expressive | 4.20秒・201,644 B | 0.00–2.36／2.36–4.16秒 | 590 B | 113 B | 一致（true） |
| second | 5.16秒・247,724 B | 0.00–2.72／2.72–5.12秒 | 553 B | 94 B | 不一致（false） |

- default と expressive の text：`Please keep the back door closed while the heater is running. The spare keys are in the blue drawer by the sink.`
- second の text（返ったまま）：`Your train leaves from Platform 4 at 915. Bring a printed ticket and arrive 10 minutes early.`
  参照文は `Your train leaves from platform four at nine fifteen. Bring a printed ticket and arrive ten minutes early.` です。返った `915` を `9:15` などに直していません。文字どおりの一致は false で、時刻・意味・発音の正しさを示すものでもありません。
- expressive と second は、最後の区間が入力の終わりより0.04秒手前で終わっています。返ったままで、区間を入力の長さに合わせていません。
- `<id>.json` は原典CLIの標準出力のバイト列そのままです。CLI は HTTP の応答本文を書き、末尾に改行がなければ1つ足すので、HTTP 本文をバイト単位で捕まえたものとは言いません。
- `<id>.txt` は、ラッパーが返った `text` に改行を1つ足しただけのものです。別の API の出力でも、別のモデルの実行でも、人による修正でもありません。文字起こしの修正は一切していません。
- verbose_json の `seek`・`tokens`・`temperature`・`avg_logprob`・`compression_ratio`・`no_speech_prob` は、`FasterWhisperBackend` が正規化した区間に対応する値がないため、ルートが既定値（0 や空の配列）で埋めたものです。デコーダーの設定や信頼度を測った値ではありません。単語単位の時刻は要求しておらず、返っていません。
- 最初の2件の文字どおりの一致は、人が聞いて確かめた結果や意味の正しさを示しません。2つの入力の声の良し悪しを比べたり、認識の差を合成のどれか1つの設定のせいにしたりもしません。
- 1件ずつの経過時間（1.851・1.383・1.346秒）は、インタープリターの起動・アップロード・待ち・モデルの読み込み・推定をすべて含む1回きりの値で、速さの比較やベンチマークではありません。

## 使ったもの（固定）

- VoiceStudio：コミット `6f0ed2ebeaf620bcea8a293cd210bba920b73622`（0.5.7）。制作担当が固定アーカイブから公式の Git blob 3,333件のバイト列を確かめたフルチェックアウトを使いました。`vendor/voicestudio/` には、そのうち20ファイルを原文のまま置いています（`vendor/pins.json`）。**この20ファイルだけではサーバーは動きません。** 再現にはフルチェックアウトと、別に用意する依存とモデルが必要です。
- 認識モデル：`Systran/faster-whisper-base`、リビジョン `ebe41f70d5b6dfa9166e2c581c45c9c0cfc57b66`、MIT、公開（ゲートなし）。`config.json`・`model.bin`・`tokenizer.json`・`vocabulary.txt` の4ファイル、計147,882,941 B を確かめて使いました。重みは同梱していません。
- 実行環境：専用の Python 3.13.7 の仮想環境。既存のグローバルのパッケージは読み取りだけで使い、FastAPI 0.136.3 だけを仮想環境側に入れて上書きしました。faster-whisper 1.2.1・CTranslate2 4.8.2・av 18.0.0・onnxruntime 1.30.0・huggingface-hub 0.36.2・tokenizers 0.21.1・numpy 2.4.4（`results.json` の `package_versions`）。`uv sync` によるフルの依存の導入や Electron のビルドはしていません。ComfyUI などほかの環境やグローバルの設定は変えていません。
- アプリのデータは新しく作った専用のフォルダー、モデルは専用のキャッシュをオフラインで使い、認証の鍵は置いていません（ループバックは認証なしの設定）。認証を外すことは勧めません。
- MIT のモデルは、元のアプリの利用条件の確認で「受諾は不要」と判定され、受諾の記録は作っていません。既定の OmniVoice（重みは非商用の条件）の重みは取得も受諾もしておらず、音声合成は使っていません。
- 制作担当の環境で、最初に起動したバックエンドが GPU を検出したため、文字起こしの前に `OMNIVOICE_DEVICE=cpu` と `CUDA_VISIBLE_DEVICES=-1` を付けて起動し直しました。原典の変更・モデルの再実行・推論の再試行ではありません。

## 自分で試すとき

この作例の結果は保存して固定しています。下の手順は、読者が自分の判断で新しく実行するためのもので、ここに置いた結果を作り直すものではありません。同じ結果になる保証はありません。

1. 固定版のフルチェックアウトを用意します。

   ```sh
   git clone https://github.com/debpalash/VoiceStudio.git <checkout>
   git -C <checkout> checkout 6f0ed2ebeaf620bcea8a293cd210bba920b73622
   ```

2. 専用の仮想環境に、バックエンドの依存（`pyproject.toml` と公式の説明に従う）と、選ぶ認識エンジンの依存（今回は faster-whisper 1.2.1）を別に入れます。1つのコマンドで全部がそろうとは限りません。

3. 認識モデル `Systran/faster-whisper-base` のリビジョン `ebe41f70d5b6dfa9166e2c581c45c9c0cfc57b66` を、自分の判断で専用のモデルキャッシュに取得します。モデルの利用条件は自分で確かめてください。

4. 新しいデータフォルダーとモデルキャッシュを指定し、ループバックだけでバックエンドを起動します（今回使った設定の例。パスは自分のものに置き換えます）。

   ```sh
   cd <checkout>
   OMNIVOICE_DATA_DIR=<new-app-data> \
   OMNIVOICE_CACHE_DIR=<model-cache> HF_HOME=<model-cache> HF_HUB_CACHE=<model-cache> \
   HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1 HF_HUB_DISABLE_TELEMETRY=1 OMNIVOICE_ANALYTICS_DISABLED=1 \
   OMNIVOICE_PRELOAD_CAPTURE_ASR=0 OMNIVOICE_PRELOAD_WATERMARK=0 OMNIVOICE_PRELOAD_TTS_ASR=0 \
   OMNIVOICE_ASR_BACKEND=faster-whisper ASR_MODEL_FASTER=Systran/faster-whisper-base \
   OMNIVOICE_DEVICE=cpu CUDA_VISIBLE_DEVICES=-1 OMP_NUM_THREADS=4 MKL_NUM_THREADS=4 \
   <venv-python> -m uvicorn backend.main:app --host 127.0.0.1 --port 3900 --no-access-log
   ```

5. 原典CLIを直接呼ぶか、同梱の `run_example.py` を使います。

   ```sh
   # 原典CLIを直接（チェックアウトの中で）
   cd <checkout>
   <venv-python> -m backend.speech_client --engine-url http://127.0.0.1:3900 capabilities
   <venv-python> -m backend.speech_client --engine-url http://127.0.0.1:3900 \
     transcribe <作例>/inputs/audio/default.wav --model faster-whisper --language en --format verbose_json

   # この作例のラッパー（選定20ファイルと入力を照合し、1件1回ずつ呼んで保存する）
   <python> <作例>/run_example.py --source <checkout> --python <venv-python> \
     --url http://127.0.0.1:3900 --out <新しい空のフォルダー>
   ```

   `run_example.py` は `--out` に既存のファイルを上書きせず、401・403・409・400（`model_not_active`）・タイムアウトなどで止まって `failure.json` を書きます。詳しくは `implementation.md` にあります。

## このフォルダー

| パス | 内容 |
|---|---|
| `index.html`・`concept.css`・`concept.js` | 構造図と、実際の入力・返答を読むページ。`concept.js` は動画と共通の読み込み・検証・描画 |
| `video/` | 無音32秒の動画の編集用ソース（`video/README.md`） |
| `inputs/` | 3本の入力 WAV と `jobs.json`（参照文を含む。参照文は送っていない） |
| `outputs/attempt-01/` | `capabilities.json`・`<id>.json`・`<id>.txt`・`results.json`・`progress.json` |
| `concept/` | `facts.json`（事実と原典の引用）・`waveforms.json`（入力の実際の包絡）・`manifest.json`（ページが確かめる31ファイル） |
| `vendor/voicestudio/` | 固定版から選んだ20ファイル（原文のまま、AGPL-3.0-only） |
| `vendor/faster-whisper/` | 引用のための faster-whisper の `audio.py`・`transcribe.py`（原文のまま、MIT） |
| `vendor/asr-model/README.md` | 認識モデルのモデルカード |
| `vendor/notices/` | faster-whisper・OpenAI Whisper・Chatterbox のライセンス本文と Chatterbox のモデルカード |
| `run_example.py`・`implementation.md` | 作者AIが書いたクライアントと実装メモ（制作担当の保存順の補正を含む） |
| `samples.json` | 記事に載せる3件の入力と返答の要約 |

ページと動画は、開くたびに `concept/manifest.json` の SHA-256 を固定値と比べ、31ファイルの大きさと SHA-256、facts の形、3件の ID と出力のバイト数、6つの部品の原典の行、WAV の形と包絡の連続を確かめてから表示します。どれかが合わなければ、図・音声・保存を止めて理由を示し、「もう一度確かめる」で読み込み直します。ローカルの静的 Web サーバーで開いてください（`file://` では読み込めません）。

## 確かめていないこと

- 人による試聴、文字起こしの正確さ（WER）、発音・意味・時刻の正しさ、単語単位の時刻
- 他のエンジンやモデルとの比較、646言語への対応、一般的な速さ
- マイク録音、デスクトップアプリ（Electron）、ディクテーションのショートカット、テキストの挿入、クリップボード
- MCP と WebSocket ストリーミング（capabilities に載っているだけ）、翻訳、音声合成、声のクローンとデザイン、吹き替え、話者分離
- モデル内部の活性や注意（図のデコード・VAD・認識の関係は固定版のソースに基づく説明）
- フルの依存の導入や Electron のビルド、VoiceStudio のモデル全体の商用利用の可否
- 実機の iPhone Safari・VoiceOver・200%拡大、人による見た目の承認


## ライセンス

- VoiceStudio：AGPL-3.0-only、Copyright 2024-present Palash Debnath and VoiceStudio contributors（`vendor/voicestudio/LICENSE`・`LICENSE-NOTICE.md`）。モデルの重み・トークナイザー・声・生成物の条件はアプリのライセンスとは別です。エコシステム全体が MIT というわけでも、すべての作業がオフラインで動くわけでもありません。
- 認識モデル Systran/faster-whisper-base：MIT（`vendor/asr-model/README.md`）。faster-whisper（MIT）と OpenAI Whisper（MIT）のライセンス本文は `vendor/notices/` にあります。
- 入力の3本：Chatterbox（MIT）の出力で、Perth の透かし入り（`vendor/notices/Chatterbox/`）。
- ページ・図・文章・動画のソース：八百万図AIツールボックス の制作（Claude Opus 5.5）。


## 制作担当の確認と再描画（作者の受領後）

制作担当は別工程で、320/375px全18組・6部品13引用・16表示条件・3破損復旧、3入力WAVの終端と6区間シーク、9保存要求と返却9ファイル全bytes、31素材編集と任意7.2秒、代表/連続コマ、縦横32秒無音MP4の終端、出荷ソース62PNG一致を確認しました。人の試聴・意味/時刻の精度・審美的承認・実機iOSは未確認です。

既存の原典実行は済んでおり、図のために再推論していません。機能入力のWAVと紹介用の無音動画は別です。親によるスマホ配置・冒頭の全体図/非強調部品の可読性・包装の補正は、新しいOpus原本11filesとは区別します。根拠は `visual-verification.json`、レビューは `video/review/portrait/review.html` と `video/review/wide/review.html` です。

同梱の `tools/motion-reel/` は既存のMIT描画ランタイム5filesです。npm依存は別に `cd tools/motion-reel && npm ci` で用意します（描画時と同じlockを使い、node_modulesは配布しません）。作例のルートで、推論をせずに次のように描画できます。出力先はこのフォルダーの外の新しい空フォルダーを指定してください。

```sh
python render-visual.py --out <新しい出力先>/portrait --width 720 --height 1280
python render-visual.py --out <新しい出力先>/wide --width 1280 --height 720
```

`--stills-only` は代表16枚・連続12枚・contact/poster/stripを描きます。全動画は32秒30fps・無音です。フォントの違うOSでの同一ピクセルは保証していません。外部のバックエンドや認識モデルは再描画に要りません。第三者の原典/モデル/入力の条件はそれぞれvendorの通知を優先してください。
