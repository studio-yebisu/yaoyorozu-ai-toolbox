# Quartz の作例：エージェント実行ログ

Quartz の部品で作った、エージェントの実行ログを読む画面です。完了・ツール失敗・入力待ちの3件のサンプル実行を切り替え、Timeline の段を選ぶと、その段の入力と出力が JSON view に出ます。どの段で止まったかと、その段が何を受け取り何を返したかを見分けるための静的な作例です。

## 動かし方

```bash
npm ci --ignore-scripts
npm run dev      # http://127.0.0.1:5173/source.html
npm run lint     # 上流の Quartz ルールを src/ に適用
npm run build    # index.html と assets/ を出力
```

`npm run build` は `source.html` を入力にビルドし、公開用の `index.html` と `assets/` を書き出します。

- `#completed`・`#tool-failed`・`#waiting-input` で開くと、そのサンプルを表示します。
- `?theme=dark` でダーク表示から始まります。画面右上の切り替えでも変えられます（この作例の中だけ）。

## 使った Quartz

固定版 `arla6ka/skills` の `1aaaa1b47ba5a18b47b0ebcac684ade460c6823f`、`systems/quartz` から、必要なファイルだけを `vendor/quartz/` に置いています（一覧は `vendor/quartz/UPSTREAM.json`）。公式の導入は `npx shadcn@latest add https://design.how/r/quartz/theme.json` と部品ごとの `https://design.how/r/quartz/<name>.json` ですが、この作例ではCLIを使わず、固定版のコードをそのまま読み込んでいます。

画面で使った部品は Timeline、Status、JSON view、Button、Data list、Segmented control、Page header、Badge です。`body class="quartz"` と `QuartzPortalProvider` で包み、色・文字・寸法は Quartz のトークンとユーティリティだけで指定しています。Timeline は Panel に入れず、白い作業面として置いています。上流に Sidebar 部品は含まれていないため、Sidebar は作っていません。

## 作例の範囲

- 表示するのは `samples.json` の3件の静的サンプルです。画面もこのJSONを読み込みます。AIや外部サービスには接続していません。
- 秒数（`start_ms`・`end_ms`・`now_ms`）はサンプル値で、実行速度の計測ではありません。
- 失敗を直す再実行や、入力待ちへの返事をする機能はありません。止まった状態を確かめる画面です。
- Timeline や JSON view の内部の文言（Step、Failed、Copy JSON など）は上流の英語のままです。

## 解説動画

`video/index.html` と `video/scene.js` が28秒・1280×720・30fps・音声なしの動画のソースです。`window.seek(秒)` で任意の時刻を描きます。実画面の場面は、この作例を1280px幅で撮影した `video/screenshot-light.png` と `video/screenshot-fail.png` を使います。撮影した画面に合わせて、`scene.js` の `FOCUS` の座標を調整します。

## ライセンス

- `vendor/quartz/` は Quartz（MIT License、Copyright (c) 2026 Arlan Marat）です。`vendor/quartz/LICENSE` をそのまま残しています。
- アイコンは Quartz が読み込む Font Awesome Free（Classic Solid）で、その利用条件に従います。
- `src/`、`samples.json`、`video/` の画面構成・文言・サンプルは 八百万図AIツールボックス の独自制作で、MIT License です。


## 概念構造版 visual-r1

現在のindex.htmlは構造図、元のReact画面はdesk.html、旧28秒編集/MP4はvideo/legacy.htmlとlegacy.mp4へ保全しました。上のindex.html/video/index.htmlと28秒の説明は元制作時点の構成です。現在の32秒縦横無音紹介はrender-visual.pyとvisual-guide.mdを使います。元の1受領/推論/ビルド/lintを再実行せず、原データ/実部品を保持しています。元Reactのnpm run buildはindex.htmlを上書きするため、再現用の別コピーで行ってください。

元33ソースとLICENSEの34CRLFは公式LFとrawbytesが異なり、CRLFだけ正規化した内容/Gitblobが一致します。新しい確認はvisual-verification.jsonです。
