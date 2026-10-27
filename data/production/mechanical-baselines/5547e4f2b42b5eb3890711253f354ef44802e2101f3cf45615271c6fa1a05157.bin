# LiveTalking 作例：声と顔がつながるまで

LiveTalking（[lipku/LiveTalking](https://github.com/lipku/LiveTalking/tree/eaa2b91559a5c2ed6127e17728efd52b7c407a0d)、固定コミット `eaa2b91559a5c2ed6127e17728efd52b7c407a0d`、Apache-2.0）は、声の入力・アバターのモデル・音声合成・出力口（WebRTC など）を名前でつなぐ Python のエンジンです。1つのニューラルモデルでも、ホスト型 API でも、LLM のチームでも、SKILL.md でもありません。

この作例は、その中の MuseTalk の経路（`MuseReal`・`WhisperASR`・`BaseAvatar`）を、制作担当が CPU で1回だけオフラインで動かした2本の実出力を、1枚の大きな構造図と32秒の無音の解説動画にしたものです。

## 流れ（図の主線）

1. 原典の README・API と依頼、既知の入力 → 作者AI（Claude Opus 5.5、1体）が準備・ランナー・ジョブを書く（第1段階、受領 `fd11c54f`、4ファイル）。作者は何も実行していません。
2. 制作担当が別の工程で、無改変の原典の Python を呼ぶ（全177ファイルの checkout、MuseTalk V1.5 の U-Net・SD VAE・Whisper tiny の符号器、CPU・float32・4スレッド）。
3. 画像の道：以前の作例と同じバイトの肖像512（《モナ・リザ》の複製画）→ 手動の枠 `[100, 40, 420, 360]`（320×320）→ 顔256 → 下半分を黒くした画像と全体の画像を VAE で1回ずつ符号化 → 1つの共有の潜在（1×8×32×32、seed 20261020、1回だけ作り2件で再利用）。
4. 声の道：既存の英語 TTS の WAV（24kHz）→ 原典が16kHzに変換 → 320サンプル＝20msの片 → Whisper の符号器の隠れ状態（50×384/コマ）。文字起こしはしません。生の音の片は別の道で、そのまま組へ進みます。
5. 合流：潜在と特徴が U-Net に入り、timestep 0 で1回だけ計算し、VAE の復号器が顔の部分（256）を返します。繰り返しの拡散サンプラーはありません。
6. 組：顔の部分と生の音2片（40ms）が結果の待ち行列へ。その後の `process_frames` が、待機のコマは元の画像、声のコマは手動マスク320で貼り戻しを選び、原典の「LiveTalking」の透かしを描いて、原典の `WebRTCOutput` へ渡します。
7. 返るもの：`WebRTCOutput` の受け手を制作担当の Disk捕捉 にして、PNG と16kHzの WAV を保存し、別の工程の FFmpeg で H.264＋AAC の MP4 にしました。ページからは元のファイルのまま保存できます。

図の「6部品」は説明のための整理です。原典の区分でも、6体のAIでもありません。

## 2本の実出力

| | 戸締まりの声（`default`） | 電車の声（`second`） |
|---|---|---|
| 入力 WAV | 4.64秒・24kHz mono PCM16・222,764 B | 5.16秒・24kHz mono PCM16・247,724 B |
| 捕捉 | 124コマ・248片・4.96秒 | 136コマ・272片・5.44秒 |
| 片の並び | 先頭の待機10片（200ms）・入力232片・末尾6片（120ms） | 先頭10片（200ms）・入力258片・末尾4片（80ms） |
| コマ | 貼り戻し116・元画像8 | 貼り戻し129・元画像7 |
| 呼び出し | Whisper 符号器35・U-Net 30・VAE復号30 | Whisper 符号器38・U-Net 33・VAE復号33 |
| MP4 | 313,151 B | 326,325 B |
| 出力 WAV | 158,764 B（16kHz） | 174,124 B（16kHz） |
| 記録 JSON | 78,232 B | 83,731 B |

- 入力の片は、捕捉の中で原典が16kHzに変換した int16 とビット単位で一致しました（元の24kHzの WAV のバイトとは別物です）。先頭の200msと末尾の片、バッチの境目は、切らずにそのまま残しています。
- 共有の潜在を作る VAE の符号化は2回（2件の共通）。U-Net の予測は 4コマ×63回＝252枚で、混ざったバッチの一部は使われていません。捕捉した260コマ・貼り戻し245・元画像15・予測252は、それぞれ別に数えた値です。
- 各ジョブで、捕捉の外へさらに16コマ・32のゼロ片が押し出されました。数えて記録し、MP4 には入れていません。1コマ目（#0）は待機の元画像と透かしで、ニューラルの出力ではありません。
- 制作担当がコマ #0 と #32 を見て、この絵画・手動の枠・マスクの出力で、下顔のぼけと四角い境界が見えることを確かめました。公開した代表の #31・#34 でも見えます。出力はそのままで、美化・補間・再実行・選び直しはしていません。原因の証明や一般的な品質の順位づけではありません。

## ページの使い方

`index.html` は開くたびに `concept/manifest.json` を固定の SHA-256 と照らし、そこに載った63ファイルの大きさと SHA-256 を確かめます。さらに、原典の8引用が同梱した原典の該当行と同じか、`facts.json`・`results.json`・`jobs.json`・`preparation.json`・各ジョブの JSON のあいだで ID・回数・片とコマの並び・ハッシュが揃っているか、PNG と WAV の形式、MP4 の映像と音声のトラックを照合します。1つでも違えば、図・動画・音声・保存を止め、理由と「もう一度確かめる」を出します。

- 「①何か・②渡す・③返る」は、同じ図の上の強調と動く印を変えるだけです。
- 「戸締まりの声」「電車の声」（`#default`・`#second`）は、保存済みの2つの結果を読み替えるだけで、生成し直しません。知らない値は `default` に戻します。
- 図の ①〜⑥ を押すと、固定版の原典の該当行と、同梱した原文へのリンクが開きます。
- 図のすぐ下のボタンで、選んだ結果の MP4・出力 WAV・記録 JSON と、入力の PNG・WAV を、照合したバイトのまま保存できます。表示は「ブラウザーに保存を依頼しました」で、ディスクへの保存の完了を確かめるものではありません。
- その下で、実際の MP4（音つき）、入力と出力の WAV、肖像・顔256・下半分を黒くした顔・マスク、代表5枚を見比べられます。

ブラウザーでは推論・合成・エンコード・TTS・コマンドの実行をしません。図の中の画像・波形・回数・コマの帯は実データで、片・格子・タイル・動く印は説明の形です。ネットワークの内部の値でも、実際の処理時間でもありません。

## 手元で見る

リポジトリのルートで次を実行し、ブラウザーで開きます（SHA-256 の計算に `localhost` か https が要ります。`file://` では開けません）。

```bash
python -m http.server 8000
```

- 作例ページ：<http://localhost:8000/examples/livetalking-example/index.html>
- 解説動画の編集用ソース：<http://localhost:8000/examples/livetalking-example/video/index.html>

外部のフォント・CDN・計測は使いません。API キーやアカウントの接続も要りません。

## 同じ実行を再現するには（この固定した作例）

`run_example.py` は、この作例の2つの WAV・肖像・`inputs/jobs.json`・`inputs/prepared/` のハッシュと、手動の枠・マスク・捕捉の条件を照合し、合わなければ止まるように書かれています。ほかの画像や音声に置き換えて、そのまま動くものではありません。自分の素材で試すときは、これらの照合の値・ジョブ・手動の枠とマスク・捕捉の条件を見直して書き直す必要があります。

別に用意するもの（同梱していません）：

- 原典の全 checkout：`git clone https://github.com/lipku/LiveTalking <upstream>` と `git -C <upstream> checkout eaa2b91559a5c2ed6127e17728efd52b7c407a0d`
- 重み（公開・ゲートなし、11ファイル 3,886,019,325 B）：TMElyralab/MuseTalk @ `2bcb936e2fddb4d86db4c62fd45b387d0c061571`、stabilityai/sd-vae-ft-mse @ `31f26fdeee1355a5c34592e401dd41e45d25a493`、openai/whisper-tiny @ `169d4a4341b33bc18d8881c4b69c2e104e1cc0af`。`<weights>` の下の置き方とハッシュは `concept/facts.json` の `models.files`（`local`）にあり、ランナーが照合します。
- Python 3.11.15 の CPU 専用環境：torch 2.6.0+cpu・torchvision 0.21.0+cpu・diffusers 0.33.1・transformers 4.50.0・accelerate 1.6.0・numpy 1.26.4・Pillow 11.3.0・soundfile 0.13.1・resampy 0.4.3・av 16.0.1・opencv 4.10.0、原典が読み込む edge-tts・tqdm・einops。PATH 上の FFmpeg と ffprobe。

```bash
# この作例のフォルダー（inputs/ がある場所）で。出力先はどれも新しい空のフォルダー。
python prepare_input.py --input inputs/portrait.png --output <新しい空のフォルダー>/prepared   # 任意：inputs/prepared と同じハッシュになるかの確認
python run_example.py --upstream <upstream> --weights <weights> --jobs inputs/jobs.json --prepared inputs/prepared \
  --output <新しい空の公開用フォルダー> --private <新しい空の非公開フォルダー>
```

どちらも、空でない出力先や、保護した入力と重なる出力先では止まり、既存のファイルを上書きしません。この作例の結果は制作担当の1回の実行で固定しており、ページや動画のために再実行していません。

同梱した `vendor/livetalking/` の27原典ファイルには、ランナーが照合する23の必須パスがすべて含まれます。アプリ全体ではなく、重み・依存・FFmpeg は別に必要です。実制作は全177ファイルの checkout で行い、同梱分だけを起点とした再実行はしていません。

## 記録の読み方

- `concept/facts.json`：制作担当が実行の記録から包んだ事実（8引用・回数・波形の min/max・コマごとの記録など）。
- `outputs/results.json`：ランナーが測った値の包装で、LiveTalking のネイティブな出力形式ではありません。
- `outputs/default.json`・`outputs/second.json`：`results.json` の該当ジョブと共通の記録を、親の工程が UTF-8/LF で包んだもの。新しい推論やモデルの出力ではありません。
- 波形は実際の PCM の min/max で、Whisper の活性値や音質の指標ではありません。時間は CPU での1回の観測で、ベンチマークではありません。32秒の解説動画の時刻も、推論の時間ではありません。
- 実行のログ（`outputs/run-log.txt`）は、制作担当が整えた上で非公開に保管し、配布しません。

`SOURCE-NOTES.md` は制作担当の追記です。第1段階のメモとランナー、診断 PNG の保存名は「upper-half-masked」と書いていますが、実際の画素と原典の VAE は下半分を黒くします。また、原メモの「貼り戻し→待ち行列」は逆で、待ち行列は貼り戻しの前です。type 1 の片は入力の待ち行列が空のときのゼロの音で、WAV の中の無音の判定ではありません。ファイルと名前は保全し、新しい図と文章は正しい流れで書いています。

## 作者と制作担当

| 時期 | 担当 | したこと |
|---|---|---|
| 第1段階 | 作者AI（Claude Opus 5.5、1体） | `prepare_input.py`・`run_example.py`・`inputs/jobs.json`・`implementation.md` を書いた。実行していない。 |
| 実行 | 制作担当 | 原典・重み・環境・入力の出所を固定し、無改変の原典で1回だけ実行。事実・記録 JSON の包装、`SOURCE-NOTES.md` の追記も制作担当。 |
| 第2段階（この README） | 作者AI（Claude Opus 5.5、1体） | `index.html`・`app.js`・`styles.css`・`video/`（`index.html`・`main.js`・`draw.js`・`storyboard.json`・`README.md`）・`samples.json`・この README・記事の下書きを書いた。新しいニューラル・音声の実行ではない。 |
| 後の工程 | 制作担当 | 図・ページ・編集用ソースの表示と描画、解説動画の書き出し、`source.zip` の包装、公開。 |

この README を書いた時点では、ページ・図・解説動画の表示や描画の確認（QA）はまだです。人の耳での聴取、口と音の同期の正確さ、自然さ、本人らしさ、リアルタイム性能、ほかの入力での動き、人による見た目の承認、実機の iOS Safari・VoiceOver・200%拡大、ユーザーの保存先へのディスク書込完了・クリップボードの読戻しは確かめていません。

## ライセンスと表示

- LiveTalking のソース：Apache-2.0。全文は `vendor/livetalking/LICENSE`。原典の透かしを出力に残しています。
- モデル：MuseTalk V1.5（MIT、`vendor/model-cards/musetalk-LICENSE.txt`）、SD VAE ft-mse（MIT のモデルカード）、Whisper tiny（HF の変換版は Apache-2.0 のモデルカード、元の OpenAI Whisper の MIT 表示は MuseTalk の LICENSE 内）。モデルカードだけを原文のまま同梱し、重み・環境・キャッシュ・認証は配布しません。
- 入力の肖像：以前の LivePortrait 作例と同じバイト（KlingAIResearch/LivePortrait の s9.jpg、レオナルド・ダ・ヴィンチ《モナ・リザ》の複製画。原作品はパブリックドメイン）。新しい人物の写真・録画・AI の肖像ではありません。
- 入力の音声：以前の Chatterbox 作例（resemble-ai/chatterbox、MIT）の既存の英語出力と同じバイト。今回の新しい TTS や録音ではありません。元の合成では Perth の透かしが入っていますが、変換と圧縮の後の検出は確かめていません。
- 依存（同梱なし）と解説動画の書き出しの道具（`render_visual.py`・`tools/motion-reel/` の MIT の5ファイル、制作担当が用意）：`THIRD_PARTY_NOTICES.md` を参照。npm の依存と Chrome は使う人が入れます。
- ページ・図・文章・解説動画のソース：八百万図AIツールボックス、MIT。作者AI（Claude Opus 5.5）が書きました。


## 制作担当による後工程の追記

作者の執筆時点の記述と、その後の実検証は別です。制作担当が320/375pxの2例×3段階12状態、6部品8引用、16表示条件、3破損停止/復旧、実MP4と入力/出力WAVの6自然終端、10保存要求と返却10ファイル（9種類）の全バイト一致、編集63素材/7場面/任意7.2秒/向き保持/ネイティブrange0.1秒/通常32秒、代表/連続/contact、縦横32秒960f無音MP4の全デコードと自然終端、出荷ソース62PNG一致と30/31秒静止を新しく確認しました。人の音声聴取・同期精度・審美的承認、実機iOS/Safari/VoiceOver、200%拡大、全入力/品質/性能は未確認です。 詳細は visual-verification.json（映像側からは ../visual-verification.json）です。新11原本とexactモデル受領は非公開に保全し、後工程の補正・描画・検査とは区別しました。実機能のMP4/WAVは音声を維持し、紹介映像と編集ソースは無音です。

編集のエラー表示では、並列読込の進捗が失敗理由を上書きする場合を制作担当が補正し、3種の停止と復旧を新しく検証しました。IABで1回、再読込が照合開始前に止まったため、そのSHA破損検査は新しいタブで確認しました。これは全ブラウザーの保証ではありません。

source.zip は examples/livetalking-example と media の3ファイル、MIT LICENSE を含むリポジトリのルート配置です。空のフォルダーに展開し、そのルートで python -m http.server 8000 を実行して、http://localhost:8000/examples/livetalking-example/index.html または video/index.html を開きます。共通記事サイトは含みません。重み・依存・全checkout・私的ログは含みません。

描画は、別に用意した npm 依存と Chrome/FFmpeg で、npm ci --prefix examples/livetalking-example/tools/motion-reel の後に、展開ルートで python examples/livetalking-example/render_visual.py --out ../fresh-portrait --width 720 --height 1280 --strip-at 16.0 を実行します。横は別の出力先と --width 1280 --height 720、PNGだけは --stills-only を使います。今回の検査は、この公開するルート用wrapperに、同じbytesの固定5rendererfilesと既存の依存を明示指定し、縦横62PNGを動画正本のPNGと照合しました。別OSやフォントの一致を保証しません。元のモデル実行とは別の、紹介図の再描画です。
