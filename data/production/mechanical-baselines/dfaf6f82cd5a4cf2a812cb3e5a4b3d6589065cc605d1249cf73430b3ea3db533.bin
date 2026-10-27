# earshot / sound in motion

30秒のモーションリール。earshot v0.4.0の16音と、オリジナルの128 BPMスコア。
映像・音源・編集ソースを収録しています。

## 再生

このフォルダーをHTTPで配信し、`index.html`を開きます。映像のPlayを押すと音が出ます。
ブラウザーは保存済みAAC音源と描画コードを使います。生成原本と音源のダウンロードはWAVです。

```powershell
python -m http.server 8326 --bind 127.0.0.1
```

## 音源の再生成

Python 3.11、earshot 0.4.0、NumPy、SciPy、soundfile、ffmpegが必要です。
earshotの固定版は `591fa3e028032e6dce56620a20e932e35667e8d8`。
既存の音源を保持したコピーで、`assets`のない新しい出力先を用意して実行してください。

```powershell
$env:EARSHOT_OFFLINE='1'
python render_audio.py
```

`video/timeline.json`が映像と効果音の合図を共有します。WAVの実測onset/peakを配置し、
生成音のエンベロープを同JSONのwaveformsへ保存します。16の効果音はearshotのバンクから生成。
ブラウザー用音源は `ffmpeg -i assets/soundtrack.wav -c:a aac -b:a 192k -movflags +faststart assets/playback.m4a` で作成します。
スコアはearshotの打楽器と、この作例のPythonで合成したベース・和音・短いモチーフです。
外部録音・外部の楽曲・ナレーションは含みません。

## 映像の書き出し

`video/index.html`は`window.seek(seconds)`による決定的な描画に対応します。
Motion Reelのレンダラーで縦横を別配置で出力できます。

```powershell
node render.mjs --project video --out out-wide --width 1280 --height 720 --fps 60 --video --audio assets/soundtrack.wav
node render.mjs --project video --out out-portrait --width 720 --height 1280 --fps 60 --video --audio assets/soundtrack.wav
```

`render.mjs`は[Motion Reel](https://github.com/studio-yebisu/motion-reel)のレンダラーです。

## Credits

- Art / motion: Claude Opus 5.5
- Direction / cues / sound / original score / player / export: Codex + earshot / Studio Yebisu
- earshot: Leon Lin, MIT ([fixed source](https://github.com/Leonxlnx/earshot/tree/591fa3e028032e6dce56620a20e932e35667e8d8))
- Click preset: fit/click/floss_lid, derived in earshot from “Plastic Clicks.flac” by qubodup, CC0 1.0 ([source](https://freesound.org/people/qubodup/sounds/167829/)). Original recording is not included.
- Motion reference: [earshot 0.4 original launch film](https://github.com/Leonxlnx/earshot/releases/tag/v0.4.0)

本家映像は構成と動きの参考にしました。本家の映像・音楽・ロゴ素材は同梱していません。
この作例のコードはMIT。書き出し動画の再利用条件は八百万図AIツールボックスの動画利用条件を参照してください。

形式・非無音・各SFXのDSP検査・配置誤差は`assets/render-report.json`に記録。
これらは聴感評価ではありません。フィット機能の精度と252音すべての検証は対象外です。
