# Chatterbox 作例：英語の文を、手元の Python で音声 WAV にする

Chatterbox（Resemble AI）は、手元の GPU で動く **Python の音声合成（TTS）モデルとツール**です。この作例では、英語版の `ChatterboxTTS`（原典 `resemble-ai/chatterbox` コミット `5de7a54aa4e5e2baadb0182dde554908b48b85c2`・パッケージ 0.1.7）を固定した版のまま3回動かし、実際に返った3本の WAV と、その仕組みの構造図・無音の解説動画を置いています。

- `index.html`：構造図のページ。3件の実WAVを選んで聞き、元の WAV を保存できます。ブラウザーの中では合成しません。
- `video/index.html`：無音32秒の解説動画の編集用ソース（縦 720×1280・横 1280×720）。
- `run_example.py`：実際に合成した Python ソース。Agent Skill の SKILL.md ではありません。

## だれが何をしたか

| 役割 | したこと |
|---|---|
| 作者AI（Claude Opus 5.5） | `run_example.py`・`inputs/jobs.json`・`implementation.md`（実装計画）を書いた。推論の実行・試聴はしていない |
| 制作担当 | 専用の環境と固定版の重みを別に用意し、元の Python API で `ChatterboxTTS.from_local` を1回、`generate` を3回呼んだ。計測・ソースの照合も担当 |
| ブラウザー | 保存した26ファイルを確かめて読み、図を描き、実WAVを再生・保存する。合成はしない |

実行の前に、制作担当がランナーの包装を補正しました（固定版の照合に使う `pins.json` と Perth の照合用ソースを、同梱の `vendor/` を相対で読む形にした。Perth は Windows の Git が CRLF で導入したため、生のバイトの一致と、改行だけを直した内容の一致を分けて記録する形にした）。この補正はモデル・API・推論の処理と3件の入力を変えておらず、作者の作業ではありません。作者が書いた元の3ファイルは、制作担当の非公開の受領記録に別に保存されています（`implementation.md` の末尾にも記載）。

## 仕組み（今回の使い方）

```text
英語の文 ──punc_norm・EnTokenizer──▶ 文字ID ──────────────┐
                                                           ▼
conds.pt（組み込み条件）──▶ T3 の条件 ──────────────────▶ T3（自己回帰）──▶ 音声ID（停止ID 6562 で止まる）
         └──────────────▶ S3Gen の参照 ─┐                                   │ 停止ID・無効なIDを除く
                                        ▼                                   ▼
                                   S3Gen（音声ID → CFM でメル → HiFT ボコーダーで波形）
                                        ▼
                                   Perth の透かし（apply_watermark を1回）
                                        ▼
                                   返り値 → PCM16 WAV（24kHz・モノラル）
```

- **入力**：英語の文と設定（exaggeration・cfg_weight など）。`exaggeration` は T3 の条件の `emotion_adv` に、`cfg_weight` は T3 の CFG の重みに入ります。
- **組み込み条件**：チェックポイントの `conds.pt` を読み込み、T3 側（話者埋め込み 1×256・プロンプト音声ID 1×150・emotion_adv）と S3Gen 側（プロンプトID 1×157・メル特徴 1×314×80・埋め込み 1×192）に分かれて入ります。3件とも `audio_prompt_path=None` で、**組み込み条件のみ／別の参照音声は渡していません**。`from_local` は VoiceEncoder の重みも読み込みますが、参照音声から条件を作る `prepare_conditionals` は呼んでいません。組み込み条件は話者とプロンプト音声の特徴を含みます。人の声に由来しないことや、独自の声であることを保証するものではありません。
- **文字ID と音声ID は別物**です。文字IDは文を辞書の番号にしたもの、音声IDは T3 が出す音の単位の番号で、どちらも単語・確率・点数ではありません。
- **計測した境界**：T3 が受け取った文字ID、T3 が返した音声ID（フィルター前）、S3Gen が受け取った音声ID、透かしの前後の統計とハッシュ、返り値、WAV。CFM・ボコーダーの内部、注意・活性は計測しておらず、図の矢印や動きは原典に基づく説明です。
- 図の「6つの部品」（Python API・テキストとID・組み込み条件・音声トークン・メルから波形・透かしとWAV）は説明のための整理で、公式の部品の区分ではありません。

## 3件の入力と実際の出力

3件とも seed `20261019`、temperature 0.8・repetition_penalty 1.2・min_p 0.05・top_p 1.0。1つの読み込んだモデルで、決めた順に一度ずつ合成しました（選び直し・やり直しなし）。

| ID | 入力（英語） | exaggeration / cfg_weight | 文字ID | T3 の音声ID → S3Gen へ | WAV |
|---|---|---|---|---|---|
| `default` | Please keep the back door closed while the heater is running. The spare keys are in the blue drawer by the sink. | 0.5 / 0.5 | 73 | 117 → 116 | 4.64秒・111,360サンプル・222,764バイト |
| `expressive` | （default と同じ文） | 0.8 / 0.3 | 73 | 106 → 105 | 4.20秒・100,800サンプル・201,644バイト |
| `second` | Your train leaves from platform four at nine fifteen. Bring a printed ticket and arrive ten minutes early. | 0.5 / 0.5 | 68 | 130 → 129 | 5.16秒・123,840サンプル・247,724バイト |

- WAV は `outputs/attempt-01/audio/` にあり、PCM16・モノラル・24000Hz です。T3 の出力はどれも最後が停止ID 6562 で、それを除いた ID が S3Gen へ渡りました。
- `default` と `expressive` は同じ文・同じ seed で **exaggeration と cfg_weight の2つを同時に**変えた、1組だけの対の比較です。差をどちらか一方の効果とは言えず、品質の順位・感情表現・別の機械での再現を示すものではありません。
- 実行環境：Windows・Python 3.11.15・torch 2.6.0+cu124・torchaudio 2.6.0+cu124・NVIDIA GeForce RTX 4090（CUDA）・4スレッド。各ジョブの時間は `results.json` に1回分だけ記録しています。速さの目安ではありません。

### 透かしと PCM16

- 各ジョブで Perth の `apply_watermark` が1回呼ばれ、S3Gen の出力がその入力であること、返り値がその出力であること、前後のハッシュが違うことを確かめました。**透かしの検出（`get_watermark`）や耐性は試していません。** 原典 README の検出精度の説明は、この作例の確認結果ではありません。
- 返り値（float32）を `[-1, 1]` で切り詰め、×32767・偶数丸め（`np.rint`）で int16 にし、soundfile で PCM_16 の WAV に書きました。`default`・`expressive` は上限に達したサンプルが0、`second` は返り値の1サンプルが1.0を超え、32767 に切り詰められました（`returned_samples_clipped_by_encoding: 1`）。WAV は正規化・修正せずにそのまま置いています。この1サンプルは、聞こえる不具合や品質を示すものではありません。

### 別のモデルによる文字起こし（補足）

合成の後、手元の Whisper base（CPU・4スレッド・`initial_prompt` なし）で3本を文字に起こしました（`outputs/asr-check.json`）。`default` と `expressive` は前後の空白を除くと入力の文と文字どおり一致し、`second` は数字と大文字の書き方（Platform 4・9.15・10）が違い、文字どおりの一致ではありません。これは別のモデルの推定で、人の試聴や、発音・自然さ・意味の正しさの保証ではありません。

## 26ファイルの照合

`concept/manifest.json`（SHA-256 `f145d0fc9e56ba1b0a8bf525a7c8a06b88e1ca682bc232ddc98eb2a9cc3df664`）に、入力・結果・3本の WAV・図のデータ・ソースの抜粋・ライセンスの26ファイルの大きさと SHA-256 があります。ページと動画は、manifest を `no-store` で読み込んでその SHA-256 を確かめ、26ファイルすべての大きさと SHA-256 を確かめてから、3件の文・設定・seed・ID の数・WAV の形式とピーク、原典の引用行を照合し、WAV の PCM から計算し直した包絡を `concept/waveforms.json` と比べます。1つでも合わなければ図も音声も出さず、再読み込みのボタンを出します。

## 固定した版と同梱物

| 対象 | 固定 | 同梱 |
|---|---|---|
| 原典 | `resemble-ai/chatterbox` `5de7a54aa4e5e2baadb0182dde554908b48b85c2`（0.1.7、MIT） | 取り込み時に66ファイルを Git blob で照合。`vendor/chatterbox/` に、そのうち54ファイル（README・LICENSE・pyproject.toml・example_tts.py と Python ソース50本）を公式と同じバイトのまま |
| 重み | `ResembleAI/chatterbox` リビジョン `5bb1f6ee58e50c3b8d408bc82a6d3740c2db6e18`（公開・ゲートなし、MIT） | 同梱しない。`ve.safetensors`・`t3_cfg.safetensors`・`s3gen.safetensors`・`tokenizer.json`・`conds.pt` の5ファイル（合計 3,191,966,992 バイト）の名前・バイト数・SHA-256 だけを `results.json` と `vendor/pins.json` に記録。モデルカードだけ `vendor/model-card/README.md` に同梱 |
| Perth（透かし） | `resemble-ai/Perth` `ff1c8ac55a976971245cdd53c18d6131ca00d993` | 照合用の4ファイルと LICENSE を `vendor/perth/` に公式の LF のまま。重み・環境は同梱しない |

Perth について：上流の `pyproject.toml` は `resemble-perth @ git+https://github.com/resemble-ai/Perth.git@master` と、動く master を指しています。この作例では別に上のコミットへ固定しました。制作担当が導入した22ファイル（同梱の重みを含む）を公式の Git blob と照合し、**3件は生のバイトが一致、19件は改行（CRLF）だけを直すと内容が一致**しました。22件とも生のバイトが一致したのではありません。導入したパッケージは Windows の Git の CRLF、公開した抜粋は公式の LF です。

## ライセンス

- 作例のコード・文章・図・動画のソース：八百万図AIツールボックス の制作（Claude Opus 5.5）。
- `vendor/chatterbox/`：Chatterbox の原典ファイル。MIT（Copyright (c) 2025 Resemble AI、`vendor/chatterbox/LICENSE`）。ソースの見出しは変えていません。一部のファイルは CosyVoice・HiFi-GAN・HiFTNet・Real-Time-Voice-Cloning などに由来し、それぞれの見出しのとおりです。それらのライセンス本文を `vendor/notices/` に置いています（CosyVoice は Apache-2.0、ほかは MIT）。これらの第三者のソースは 八百万図AIツールボックス の新しい著作物ではありません。
- `vendor/perth/`・`vendor/notices/Perth/`：Perth の LICENSE と照合用のソース。
- `vendor/model-card/README.md`：重みのモデルカード（`license: mit`）。
- 3本の WAV：上の固定版で合成した出力で、Perth の透かしが入っています。

## 自分で合成し直すには（参考）

公開フォルダーだけでは合成できません。依存パッケージと重みを別に取得し、専用の環境を用意する必要があります。ホスト型・有料のサービスは使いません。以下は手順の例で、制作担当の環境の記録そのものではありません。動くことは、この README だけでは確かめていません。

1. Python 3.11 の専用の仮想環境を作ります。
2. PyTorch を CUDA 12.4 版で入れます：`torch==2.6.0+cu124`・`torchaudio==2.6.0+cu124`（PyTorch の配布元の cu124 の索引から）。
3. Perth を固定コミットで入れます（上流の `@master` は使わない）：
   `pip install "resemble-perth @ git+https://github.com/resemble-ai/Perth.git@ff1c8ac55a976971245cdd53c18d6131ca00d993"`
4. Chatterbox を固定コミットで、依存を自動で入れずに入れます：
   `pip install --no-deps "chatterbox-tts @ git+https://github.com/resemble-ai/chatterbox.git@5de7a54aa4e5e2baadb0182dde554908b48b85c2"`
5. 残りの依存を上流の `pyproject.toml` のとおりに入れます（numpy 1.x、librosa 0.11.0、s3tokenizer、transformers 5.2.0、diffusers 0.29.0、conformer 0.3.2、safetensors 0.5.3 など）。今回の環境の版は `results.json` の `environment.packages` にあります。
6. 重み5ファイルを `ResembleAI/chatterbox` のリビジョン `5bb1f6ee58e50c3b8d408bc82a6d3740c2db6e18` から、公開フォルダーの外の `<CHECKPOINT_DIR>` へ取得します。
7. 実行します（`--out` は新しいか空のフォルダー）：

```text
python run_example.py --checkpoints <CHECKPOINT_DIR> --out <NEW_OUT_DIR> --device cuda --threads 4
```

ランナーは起動直後にオフラインの設定（`HF_HUB_OFFLINE=1` など）を入れ、ダウンロード・インストール・認証情報の読み込みをしません。読み込みの前に、3件の入力、重み5ファイルの SHA-256、導入した `chatterbox` の Python ファイルを同梱の `vendor/pins.json` と照合し、Perth を同梱の `vendor/perth/` と照合します。元の API だけを使い、透かしは外しません。同じ seed でも、GPU・ドライバー・ソフトウェアの版が違えば同じ音声になるとは限りません。

## まだ確かめていないこと

- 人による試聴。聞き取りやすさ、入力の文どおりに読めているか、自然さ、発音、感情表現、声の似方。
- 品質の順位、速さ・性能の一般的な評価、別の機械での再現。
- 日本語・多言語版・Turbo・Nano・声の変換・利用者の声のクローン・本番での採用。
- 透かしの検出と耐性。
- 実機の iPhone Safari・VoiceOver・200% 拡大・人による見た目の承認。

## 制作担当による追記（執筆後の確認）

320/375pxの3件×3段階で図全体と44px以上の主操作、6部品の原典引用、配色と動きを含む16表示条件、実WAVの自然終端、3種類の破損での停止と復旧、編集26素材と7場面・任意7.2秒・通常再生を確認しました。縦横のMP4は各32秒・30fps・960フレームで音声トラックがなく、ブラウザーで最後まで再生しました。人の試聴や審美的承認ではありません。詳細と制約は `visual-verification.json` に記録しています。

図と動画の11原本は exact Claude Opus 5.5 の受領として非公開に保全し、制作担当によるスマホ配置、冒頭構図、個数ラベル、確認状況と再現説明の補正・描画・包装を区別しています。Pythonの合成やASRは再実行していません。
