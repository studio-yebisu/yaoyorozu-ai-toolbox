# 工房のTODO — 期限の絞り込み（Addy Agent Skills の作例）

架空の工房のTODOアプリ（合成データ6件）に「期限が指定日まで」の絞り込みを足した作例です。Addy Osmani の Agent Skills（addyosmani/agent-skills、固定コミット `aeac41d4d005999432bb7312f7ff06383a91d59d`）から選んだスキルを、仕様 → 計画 → テストから進める実装 → 境界と反転の確認の順に当てました。依頼・データ・既存コードは作例のために制作担当が用意したもので、実在の顧客や業務のTODOではありません。

## 見る・動かす

`app.mjs` と `guide.mjs` は `fetch` で `seed.json` と `results.json` を読むため、`file://` では動きません。このフォルダを任意のローカルの静的サーバーで配信し、`index.html` を開いてください。外部への通信、Webフォント、APIキーは使いません。

- 一覧の絞り込みは、同梱の `tasks.mjs` の `selectTasks` をページが読み込んでその場で計算します。`guide.mjs` は例のリンクと依頼文のコピーを配線するだけで、絞り込みを計算し直しません。
- 3つの例は `index.html#due-open`・`#due-all`・`#no-cutoff` で直接開けます。その場の一覧が `results.json` の保存結果と同じ並びかを表示します。
- 追加や完了の切り替えをした後の一覧は、このページのメモリー上の結果として表示を分けます。再読込で合成データ6件に戻ります。
- `request.html` は依頼文だけのページ、`request.txt` は同じ文章のテキストです。

## テストを再実行する

Node 24 で、このフォルダから実行します。依存パッケージはありません。

```
npm test        # node --test tasks.test.mjs
npm run check   # node --check tasks.mjs && node --check app.mjs
```

## 使ったスキル

スキル集はインストールしていません。固定コミットから必要なフォルダとリポジトリ直下の参照ファイルだけを読み、`vendor/addy-agent-skills/` に置いています。原典の README は、スキルを1つずつ入れる方法では直下の `references/` が付いてこないと注意しています。

- `using-agent-skills` — 「既存アプリへの機能追加」として、仕様から始める順を選んだ
- `spec-driven-development`（＋ `references/definition-of-done.md`）— コードより先に、別のモデル呼び出しで `SPEC.md` だけを書いた。6つの領域、制作担当が決めた前提 A1〜A11、受入条件、未確認の点
- `planning-and-task-breakdown`・`incremental-implementation` — `plan/` の2つの増分に分けた
- `test-driven-development`（＋ `references/testing-patterns.md`）— 増分ごとに失敗を見てから通した
- `code-review-and-quality` — 条件を1か所反転する実験と、Opus著者とは別のCodex親による元のTODO差分の5軸レビュー（必須指摘0件、人の承認なし）。紹介用のguideと映像はレビュー対象外
- `frontend-ui-engineering`（＋ `references/accessibility-checklist.md`）— 画面の規則を当てた。確認はまだ

## 確かめたこと（制作時、Node v24.18.0）

- `tdd-history.json`：既存3件成功 → RED1 4件中1件失敗 → GREEN1 4件成功 → RED2 5件中1件失敗 → GREEN2 5件成功。各段のファイルは `tdd/` にあります。
- `acceptance-main.json`：別の受入確認36条件がすべて期待どおり（Asia/Tokyo）。`timezones.json`：UTC+14 と UTC−7 でも同じ36の結果。この確認に使った制作側のスクリプトは同梱していません。
- `mutation.json`：`task.dueDate <= cutoff` を `<` に変えると1件失敗し、元に戻すと5件成功。

## 画面と映像の確認

3プリセットと保存結果の一致、期限指定中の追加・完了、期限なし追加の除外、解除しても編集を保持、0件、空白名の拒否、リロードで6件へ復帰を実操作。0999年をキー入力すると日本語の案内と状態だけの表示になり、解除で回復しました。320/768/1024/1440pxで横はみ出しなし。Tab、Enter、Space、日付の矢印/削除を確認しました。

依頼文のOSコピー1590文字（改行正規化）と、UTF-8のrequest.html本文が一致。28秒/1280×720/30fps/840枚/無音のMP4は代表フレームを見て、実ブラウザーで28秒終端まで再生、errorなし。編集ソースの場面移動と時刻キー操作も確認しました。

アクセシビリティツリーの名前・構造とコンソール警告を観察しました。NVDA/JAWS、axe、全WCAG項目の適合審査は未実施。各増分の時点ではブラウザー接続がなく、CLI検証後にコミットし、画面確認は全増分後にまとめて行いました。人による仕様・計画・最終成果の承認はしていません。原典25スキルの完全適用を主張しません。

## 解説動画の編集ソース

`video/index.html` は Motion Reel の時間の契約（`window.seek`・`motionConfig`・`motionReady`）に沿った28秒・1280×720・30fps・無音の編集ソースです。`../results.json` などの保存記録を読むため、このフォルダ全体を配信して開きます。記録の形が合わなければ描画しません。

## ライセンス

この作例の画面・文言・依頼文・合成データ・コード・テスト・記録・映像ソースは 八百万図AIツールボックス の独自制作で、MIT License（`LICENSE`、Copyright (c) 2026 Studio Yebisu）です。`vendor/addy-agent-skills/` は Agent Skills から選んだ README・LICENSE・7つの SKILL.md・3つの参照ファイルで、上流の MIT License（Copyright (c) 2025 Addy Osmani）に従います。

計画とチェックリスト（plan/）は実行前に書いた原本です。未チェックを実行済みとは扱いません。現在の実行結果は tdd-history.json・acceptance-main.json・mutation.json・core-review.json、ブラウザーで残る確認は上記に分けています。
