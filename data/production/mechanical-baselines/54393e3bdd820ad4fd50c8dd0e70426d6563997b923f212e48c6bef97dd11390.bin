# Motion Video Kit の作例：八百万図AIツールボックス サイト紹介（20秒・無音）

Opus 5.5（claude-opus-5-5）が Motion Video Kit（echris6/motion-video-kit、固定コミット `e4b1c0004080fe6a0deb883631bad5eba1e5f339`）の `business-motion-film` を読み、八百万図AIツールボックス のサイトを紹介する 20秒・1920×1080・60fps・無音の映像を SVG と JavaScript で作った作例です。書き出しには、別途入手した Motion Reel を使います。音・3D・AI生成素材・第三者の映像は使っていません。

ここに書いたコマンドは再現の手順で、この文書自体は実行結果を示しません。全編の実測値と評価は `review-summary.json` に示します。

## ファイル

| パス | 内容 |
|---|---|
| `input.md` | 実際の入力（依頼・確認済みの事実・条件） |
| `BRIEF.md` | 制作の前提（事業・見る人・唯一の行動・言わないこと） |
| `storyboard.md`／`storyboard.json` | 現在の本編の場面・時刻・受け渡し |
| `components.mjs` | 本編で使う2つの部品（SelectionFrame・MaterializeFrame）。時刻とデータだけから SVG を返す |
| `lab/` | 部品の検証ページ（各4秒）と、別担当のAIが評価した書き出し `selection-proof.mp4`・`materialize-proof.mp4`、記録 `measurements.json` |
| `film/` | 本編のソース（`index.html`・`film.mjs`）。部品と `lab/lab.mjs` の `cover()` を変えずに使う |
| `film.mp4` | 本編の書き出し |
| `video/` | 22秒・1280×720・30fps・無音の解説映像のソース。`../assets/film-XX.png`（本編のMP4から書き出したフレーム）が必要 |
| `assets/` | 本編から書き出したフレームとコンタクトシート |
| `request.txt`／`request.html` | 再利用できる依頼文 |
| `samples.json` | 実入力と結果の対応 |
| `render.py` | 書き出しの補助（下記） |
| `vendor/motion-video-kit/` | 原典の README・LICENSE・`business-motion-film/SKILL.md`・references・scripts（frozen-time・loudness・contact-sheet）を変更せずに同梱 |

## 必要なもの

- Python 3.10以上、Node.js 20以上、Chrome、FFmpeg と ffprobe
- Motion Reel（Studio Yebisu、MIT）。入手したらスキル内の `scripts/`（リポジトリからなら `skills/motion-reel/scripts/`）で一度だけ `npm install --ignore-scripts` を行う

## 書き出し

`<MotionReel>` は導入した Motion Reel のスキルフォルダです。リポジトリを取得した場合は `skills/motion-reel/` を指し、リポジトリのルートではありません。

`film/index.html` は `../components.mjs` と `../lab/lab.mjs` を読み込むため、`film/` だけをレンダラーに渡すと部品がサーバーの外になります。`render.py` はこのフォルダ全体を使い捨ての場所へ写し、写した入口だけに `<base>` を入れて Motion Reel に渡します。元のファイルは変更しません。出力先は、このフォルダの外の、新しい空のフォルダにします。

```text
py -3 render.py --renderer <MotionReel>/scripts/render.mjs --composition film --out <このフォルダの外の新しい空フォルダ>
py -3 render.py --renderer <MotionReel>/scripts/render.mjs --composition selection --out <別の新しい空フォルダ>
py -3 render.py --renderer <MotionReel>/scripts/render.mjs --composition materialize --out <別の新しい空フォルダ>
```

macOS・Linux では `py -3` を `python3` に置き換えます。静止画だけなら `--stills-only` を付けます。

解説映像は、本編のMP4からフレームを書き出してから描きます（画像が欠けていると `motionReady` が失敗します）。

```text
ffmpeg -ss 0 -i <本編のMP4> -frames:v 1 assets/film-00.png
（3・5・9・12・15・18 秒も同じように film-03.png … film-18.png へ）
py -3 render.py --renderer <MotionReel>/scripts/render.mjs --composition explanation --out <別の新しい空フォルダ>
```

## プレビュー

ES モジュールを使うため、`file://` では開けません。このフォルダでローカルのHTTPサーバーを起動します。

```text
py -3 -m http.server 8000
```

`http://localhost:8000/film/index.html`（本編）、`/video/index.html`（解説）、`/lab/index.html`・`/lab/materialize.html`（部品）を開きます。ここでの簡易サーバーはソースの描画確認用です。MP4の場面移動には byte Range 対応のHTTPサーバーが必要で、公開版はGitHub Pagesを使います。再生・一時停止・時刻・場面の操作はページだけのもので、書き出しの画は `window.seek(秒)` だけで決まります。

## 確認

原典の補助スクリプトは bash と FFmpeg を使います（Windows では Git Bash など）。

```text
bash vendor/motion-video-kit/business-motion-film/scripts/frozen-time.sh <本編のMP4>
bash vendor/motion-video-kit/business-motion-film/scripts/contact-sheet.sh <本編のMP4> <このフォルダの外>/contact.jpg 0.5 8 5
```

同じ時刻を別の順序と新しいページで描いた一致は、Motion Reel のレンダラーが記録します。これは同じ実行環境の中での再現性で、別のOSや書体で同じ画になることは示しません。全編は、作った担当とは別の新しいレビュー担当に、MP4とブリーフだけを渡して評価させます（原典の `references/gauntlet.md`・`critic-prompts.md`）。

## 限界

- 無音です。原典の `audio.md`・`loudness.sh`・効果音と音楽の工程は行っていません。
- 2Dのみ。試した範囲は 八百万図AIツールボックス 自身の紹介1本です。
- 画面は紹介用に再構成した模式図で、操作の録画ではありません。
- 原典の28本の参考映像は見ていません。同梱の文章分析（`motion-grammar.md`・`launch-film-notes.md`）だけを読みました。
- レビューはAIの別担当によるもので、人の承認ではありません。

## ライセンス

この作例のソース・構成・文言・記録は MIT（Copyright (c) 2026 Studio Yebisu、`LICENSE`）。`vendor/motion-video-kit/` は原典の MIT（Copyright (c) 2026 echris6、`vendor/motion-video-kit/LICENSE`）。参考映像は含みません。

## 公開時の確認記録

実測と別担当AIのレビューは `review-summary.json`。人による承認とは別です。vendor は選択した資料と補助スクリプトで、原典の完全なインストール配布物ではありません。

ZIPは `examples/motion-video-kit-example/` と `media/` の相対配置を保持します。展開後、examples配下の作例フォルダで上の書き出しコマンドを使えます。共通カタログの画面はZIPに含みません。


## 概念構造の紹介 visual-r1

元の20秒作品/2つの4秒部品/入力/レビューを保持し、指示書→作者→描画→別AIと測定→実作品の構造を新しい32秒無音紹介にしました。原の工程は再実行していません。新しい入口はindex.htmlとrender-visual.py、手順はvisual-guide.md、確認範囲はvisual-verification.jsonです。元の実作品の画面はdesk.html、旧22秒紹介はvideo/legacy.htmlへ保全しました。
