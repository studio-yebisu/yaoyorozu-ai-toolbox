# Ryoshu プロモーション動画レンダラ

このソースは、架空のレシートデータを使ったRyoshuアプリの実操作を事前に録画した `new-real-ui.mp4` を使い、Ryoshuの32秒版4バリアントと94秒版プロモーション動画を生成するレンダラです。OCRアプリケーション本体ではなく、OCRやAI処理を新たに実行するものでもありません。

録画内のUIを再実装・再描画するのではなく、元映像のフレームを切り出し、仮想カメラでクロップ・拡大縮小・速度調整して構成します。その上に、コピーデック由来の文字、枠、マークなどを合成します。音声はNumPyによるオリジナル音楽・効果音の合成で、サンプル音源や音源のダウンロードは使いません。

## 生成される動画

| バリアント指定 | 出力MP4 | 尺・画面 |
| --- | --- | --- |
| `wide` | `ryoshu-32s-wide.mp4` | 32秒、1920×1080 |
| `wide-credited` | `ryoshu-32s-wide-credited-ja.mp4` | 32秒、1920×1080、保存済みクレジット文を追加 |
| `portrait` | `ryoshu-32s-portrait.mp4` | 32秒、720×1280 |
| `portrait-credited` | `ryoshu-32s-portrait-credited-ja.mp4` | 32秒、720×1280、保存済みクレジット文を追加 |
| `promo94` | `ryoshu-promo-94s.mp4` | 94秒、1920×1080 |

映像は30fpsで、FFmpegの`libx264`、`slow`プリセット、CRF 16、`yuv420p`を使ってエンコードされます。最終MP4では音声に`volume=2.2dB,alimiter=limit=0.85:level=false`を適用し、AAC、256kbit/s、48kHzで mux します。

## 必要環境

`requirements.json`が依存条件の正本です。

- Python: `>=3.12`（コード作成元では3.12.15で確認）
- Pythonパッケージ:
  - `Pillow >=10`（FreeTypeおよび可変フォント対応が必要）
  - `numpy >=1.26`
- 実行ファイル:
  - `ffmpeg`: `PATH`上で実行可能であること。`libx264`とネイティブAACエンコーダが必要（コード作成元では8.1.2で確認）
  - `ffprobe`: `PATH`上で実行可能であること

### フォント

フォントファイルは再配布対象ではなく、次の固定されたWindowsフォントディレクトリからファイル名で読み込みます。

- `C:/Windows/Fonts/NotoSansJP-VF.ttf`
  - 日本語文字に使用
  - Noto Sans JP可変フォントで、`wght`軸を使用
- `C:/Windows/Fonts/bahnschrift.ttf`
  - 英字の製品名、数字、URL、ブランド名に使用
  - Bahnschrift可変フォントで、コードは`Bold`や`SemiBold`などの名前付きインスタンスを指定

これらが所定の名前と場所で利用できることを事前に確認してください。フォントの差し替えは再現手順ではなく、フォントやメトリクスが変われば文字の描画結果も変わり得ます。

## 入力ファイル

公開ソース構成で再現するには、`source`ディレクトリをカレントディレクトリとして、少なくとも次の入力を用意します。

```text
source/
├── render.py
├── copydeck.py
├── common.py
├── audio.py
├── studio32.py
├── promo94.py
├── qc.py
├── requirements.json
└── input/
    ├── new-real-ui.mp4
    ├── studio-copy-deck.json
    ├── promo-copy-deck.json
    └── preserved-legal-credit.json
```

### 元録画の同一性

必須の元録画は`new-real-ui.mp4`です。再現に使う原本の仕様は次のとおりです。

- 想定サイズ: 6,392,908バイト
- 想定解像度: 1920×1080（レンダラはこの寸法のRGBフレームとして読み込む）
- SHA-256:

```text
a53a8a2a91f5737cc472ee77594ebaa0720a10e275938db0d818d98b28e7cecc
```

公開パッケージでは、この原本を`source/input/new-real-ui.mp4`として配置することが再現の前提です。同名の別映像では、コードに固定されたソース時刻、カメラ座標、UIイベント時刻が対応しません。

### コピーデックと保存済みクレジット

- `studio-copy-deck.json`: 32秒版の表示文字
- `promo-copy-deck.json`: 94秒版の表示文字
- `preserved-legal-credit.json`: creditedバリアントに追加する保存済みクレジット文

描画用文字列はこれらのJSONから取得されます。`copydeck.py`は、プレーンな文字列を表示用テキストとして受け付けず、実際に描画された文字列をデックファイルとJSONポインタに対応付けて記録します。自動折り返しは行の分割位置だけを変え、文字列そのものは変更しません。これらのJSONと保存済みクレジットのリテラルは、再現時に編集しないでください。

## 入力ディレクトリの探索順

`new-real-ui.mp4`を含むディレクトリを、次の順で探索します。

1. 環境変数`RYOSHU_INPUT`で指定されたディレクトリ（設定時）
2. `source/input`
3. `source`の親にある`input`
4. `source`の2つ上にある`input`
5. `source`の3つ上にある`input`

見つからない場合は、`new-real-ui.mp4 not found; set RYOSHU_INPUT to the folder that holds it`というメッセージで終了します。`RYOSHU_INPUT`にはMP4ファイルそのものではなく、ファイルを格納したディレクトリを指定します。

コピーデックについては、`source/input/studio-copy-deck.json`が存在すれば3つのJSONをすべて`source/input`から読みます。存在しなければ、元録画の探索で選ばれた入力ディレクトリから読みます。

## 実行方法

すべてのコマンドを、上記のコードと`input`を含む`source`ディレクトリで実行します。

### 32秒版4バリアント、ポスター、QCをすべて生成

```bash
python render.py
```

### 指定した32秒版だけを生成

```bash
python render.py --variants wide portrait-credited
```

`--variants`には、必要なバリアントを`wide`、`wide-credited`、`portrait`、`portrait-credited`から空白区切りで指定できます。それぞれについて動画、音声、表示文字記録、QCを生成します。ポスターはクレジットなしバリアントだけに生成されます。

### 94秒版を生成

```bash
python render.py --promo94
```

動画、PNGポスター、音声、表示文字記録、QCを生成します。

### QC用の静止画だけを生成

```bash
python render.py --stills wide 1.5 12
```

最初の引数はバリアント名、後続の引数は秒単位の時刻です。この例では次を出力します。

```text
build/stills/wide/f_01.50.png
build/stills/wide/f_12.00.png
```

`--stills`は指定フレームのPNG生成だけを行い、MP4のレンダリング、音声合成、mux、QCは実行しません。

## 出力先と上書き

環境変数`RYOSHU_OUT`を設定しない場合、出力ルートは`source`の親ディレクトリです。したがって既定では次に出力されます。

```text
<sourceの親>/
├── deliver/
└── build/
```

`RYOSHU_OUT`を設定した場合は、その値を出力ルートとし、次へ出力されます。

```text
$RYOSHU_OUT/
├── deliver/
└── build/
```

`RYOSHU_INPUT`は入力探索だけ、`RYOSHU_OUT`は出力ルートだけに使われます。

主な出力は次のとおりです。

- `deliver/<動画名>.mp4`: 最終動画
- `deliver/<動画名>.webp`: クレジットなし32秒版のポスター（11.6秒）
- `deliver/ryoshu-promo-94s.png`: 94秒版のポスター（10.0秒）
- `deliver/<動画名>.rendered-copy.json`: 最終動画で実際に描画した文字の記録
- `deliver/<動画名>.poster.rendered-copy.json`: ポスターで実際に描画した文字の記録
- `deliver/audio/studio32/{music,sfx,mix}.wav`: 32秒版の音声
- `deliver/audio/promo94/{music,sfx,mix}.wav`: 94秒版の音声
- `build/<動画名>_noaudio.mp4`: 音声合成前の中間映像
- `build/audio/studio32/{music,sfx,mix}.wav`: 32秒版の音声生成物
- `build/audio/promo94/{music,sfx,mix}.wav`: 94秒版の音声生成物
- `build/qc/<動画名>/report.json`: 技術QCレポート
- `build/qc/<動画名>/qc_<時刻>.png`: QC用に抽出した静止画

同名の既存出力は原則として上書きされます。映像エンコード、mux、QC静止画抽出にはFFmpegの`-y`が指定され、ポスター、WAV、表示文字記録、QCレポートも同じパスへ書き込まれます。既存結果を残したい場合は、上書きされない別の`RYOSHU_OUT`を指定してください。

`build/audio/<kind>/mix.wav`が既に存在する場合、その種類の音声合成は省略され、既存の`mix.wav`が使われます。出力ルートを再利用した場合、このキャッシュ動作も考慮してください。

## 音声

`audio.py`は固定乱数シード`20261026`で音楽と効果音を合成し、48kHz、16bit、ステレオの`music.wav`、`sfx.wav`、`mix.wav`を書き出します。32秒版と94秒版はそれぞれ120 BPMの編成で、効果音は各レンダラのタイムラインと、元録画に対応付けられたUIイベント時刻から配置されます。

## 表示文字の記録

`rendered-copy.json`には、表示時刻、デック名、JSONポインタ、スロット、実際の文字列などを記録します。creditedバリアントの保存済みクレジットには、入力ファイル、原本ソース、ライセンスソースの対応も記録されます。この仕組みは表示文字の出所と一致を確認するもので、映像の意味内容やアプリの動作を検証するものではありません。

## QCの範囲と限界

`qc.py`は完成したMP4に対して次を行います。

- `ffprobe`によるコンテナ・映像・音声ストリーム情報の取得
- FFmpegによる全フレームデコード
- `ebur128=peak=true`によるラウドネス情報の取得
- `volumedetect`による最大・平均音量の取得
- `silencedetect=n=-50dB:d=1.0`による無音区間の検出
- `blackdetect=d=0.5:pix_th=0.05`による黒画面区間の検出
- 12時点のQC静止画抽出

`report.json`の`pass`は、次のコード上の条件で決まります。

- 映像がH.264かつ`yuv420p`
- 音声ストリームがあり、先頭がAAC
- 全デコードの終了コードが0で、エラー出力が空
- 最大音量を取得でき、`-20 dB`より大きい
- `-50 dB`未満が1秒以上続く無音区間が検出されない

黒画面検出結果はレポートに残りますが、`pass`条件には含まれません。また、`pass`の表示後もコードはQC結果をアサートせず、レンダリング処理を継続・終了します。QCの表示が`CHECK`の場合は`report.json`を確認してください。

このQCは技術的なストリーム・デコード・音量などのチェックです。目視による全フレーム検査や試聴、文字の可読性、UI操作の正しさ、OCR/AIの品質、製品性能を証明するものではありません。ソースを実行しただけでは、これらの人的・意味的な確認は行われません。
