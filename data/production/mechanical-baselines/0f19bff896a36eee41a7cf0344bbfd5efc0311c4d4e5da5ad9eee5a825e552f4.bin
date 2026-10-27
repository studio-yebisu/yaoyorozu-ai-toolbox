# yomiyasu の作例：推敲の前と後を読み比べる

日本語の推敲スキル yomiyasu を、架空の文章3件（機能のお知らせ、保存操作の説明、調査メモ）に使った結果を、原文・推敲後・変えたところの理由・残した条件と並べて読む静的な作例です。ページは `samples.json` を読み込んで表示するだけで、AIを実行したり外部のサービスに接続したりはしません。

## 開き方

`samples.json` を `fetch` で読むため、ファイルを直接開くのではなく、このフォルダをローカルのHTTPサーバーで配信して `index.html` を開きます。

```bash
python -m http.server 8000   # http://127.0.0.1:8000/index.html
```

- `#release`・`#operation`・`#research` で開くと、その文章を表示します。
- 文章の切り替えは左右の矢印・Home・End でも行えます。
- 「推敲後をコピー」で推敲後の文を、「この例のJSONを保存」で1件分のJSONを保存できます。

## 使ったスキル

- 原典：[nanaism/yomiyasu](https://github.com/nanaism/yomiyasu/tree/60bf877acebc86651e0b67d70112a66245f87758/skills/yomiyasu)
- 固定コミット：`60bf877acebc86651e0b67d70112a66245f87758`
- 同梱：`vendor/yomiyasu/`（`skills/yomiyasu` と、ルートの README・LICENSE・UNICODE-LICENSE.txt。上流のバイトのまま変更していません。範囲は `vendor/yomiyasu/UPSTREAM.json`）

## 再現の方法

1. `vendor/yomiyasu/SKILL.md` を読み込めるAIに、次の参照資料も読ませます。3件とも業務文書なので `references/domains/business.md`、言い換えの判断に `references/gemini-syntax.md` と `references/slop-catalog.md` を使いました。
2. `samples.json` の各 `input` を原文、`context` を用途と読み手として渡し、SKILL.md の出力フォーマット（書き直した本文と変えたところ）で推敲させます。制作モデルは Opus 5.5（`claude-opus-5-5`）です。
3. 残すべき条件を一つずつ、推敲後のどの語句に残ったかを引用して記録します。この作例では `preserved` の `condition` と `excerpt` に保存しています。

推敲の結果は、同じ依頼でも実行ごとに変わることがあります。`samples.json` の `output` は制作時の出力をそのまま保存したものです。

制作後に、同梱のリンターと差分スクリプトを3件それぞれへ一度ずつ実行しました。リンターの指摘はなく、差分が挙げた否定・接続表現・文末の分類は原文と照合しています。たとえば「行われません→表示されません」には機械が可能表現の変化を挙げましたが、どちらも一般利用者には表示されないという否定です。機械の指摘は見直し候補で、意味保持や品質の保証ではありません。再現時は元の文と書き直した文をテキストファイルに保存し、次のように使います。

```bash
python vendor/yomiyasu/scripts/yomiyasu_lint.py after.txt
python vendor/yomiyasu/scripts/yomiyasu_diff.py before.txt after.txt --stance=説明
```

## 作例の範囲

- 表示するのは `samples.json` の3件だけです。自分の文章を入力して推敲する機能はありません。
- 文章と調査データはすべて架空です。調査メモの人数や時間は実在の試用の結果ではありません。
- 「残した条件」は制作時に原文と引用を照らし合わせた記録で、意味の保持を自動で判定・保証するものではありません。点数や合格の表示は付けていません。

## 解説動画

`video/index.html` と `video/scene.js` が、28秒・1280×720・30fps・音声なしの動画のソースです。`window.seek(秒)` で任意の時刻の画面だけを描き、`window.motionConfig`・`window.motionReady`・`window.renderConfig`・`window.__MOTION_RENDER__` は Motion Reel の契約に従います。画面の撮影は使わず、`samples.json` の原文と推敲後を正確に引用して図形と文字で描いています。フォントは端末にある日本語フォント（游明朝・游ゴシックなど）を使い、外部フォントやCDNは読み込みません。

## ライセンス

- `vendor/yomiyasu/` は yomiyasu（MIT License、Copyright (c) 2026 nanaism）です。`vendor/yomiyasu/LICENSE` をそのまま残しています。
- `vendor/yomiyasu/scripts/yomiyasu_lint.py` に含まれる Unicode 由来の絵文字データには、MIT とは別に `vendor/yomiyasu/UNICODE-LICENSE.txt`（Unicode License V3、Copyright © 1991-2026 Unicode, Inc.）の通知が適用されます。
- `index.html`・`styles.css`・`app.js`・`samples.json`・`video/`・この README は 八百万図AIツールボックス の独自制作で、MIT License です。
