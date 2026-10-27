# 『探しやすくして』を、確かめられる検索にする

Matt Pocock Skills（[mattpocock/skills](https://github.com/mattpocock/skills/tree/49dd158d1076134a641b33efb035946536778336)、固定コミット `49dd158d1076134a641b33efb035946536778336`）の開発スキルを読み、架空の依頼と合成データ6件の検索を直した 八百万図AIツールボックス の作例です。

## 何に役立つか

「UIでもｕｉでも探せて、タグも見てほしい。言葉を足したら絞れて、分野でも選べると便利。」のような曖昧な依頼を、次の形にして残しています。

- 依頼の言葉を用語に決めた用語集（`GLOSSARY.md`）
- 曖昧な点の決め方・完成条件・固定の期待値・対象外を書いた仕様（`SPEC.md`）
- 1段ずつ「新しいテスト1件 → 実際に失敗 → 最小の変更 → 実際に成功」で進めた記録と、各段のファイル一式（`tdd/`）
- 変更前と変更後の同じ関数 `searchEntries` を、ブラウザーで任意の検索語に実際に通して比べるページ（`index.html`）

自分の検索や小さな機能で同じ進め方を試すときの、依頼文（`request.txt`）と見本になります。

## 使ったスキルと、使い方の範囲

スキル本文は固定コミットから `vendor/matt-pocock-skills/` に変更せずに写したものを読みました。

| スキル | この作例での使い方 |
| --- | --- |
| domain-modeling | 依頼の「UI/ｕｉ」「タグ」「言葉」「分野」を、表記ゆれ・タグ・語・分野などの用語に決め、`GLOSSARY-FORMAT.md` の形で `GLOSSARY.md` に書いた。実装の詳細は `SPEC.md` 側に置いた。利用者への質問はしておらず、境界の例は `SPEC.md` の受け入れ例として書き出した |
| codebase-design | 公開する関数を `searchEntries(entries, query, { category })` の1つに保ち、表記ゆれ・タグ・AND・分野をその内側に入れた。補助関数はexportしない |
| tdd（限定して適用） | 「失敗を先に」「1回に1つ」「先回りしない」「整理し直しは繰り返しに含めない」「期待値は実装と別の正本から」を守った。原典が求める「テストの境界（seam）をテストの前に利用者と確認する」は**行っていない**。境界は制作担当が事前に1つ決めた |
| code-review | コーディング基準と仕様を独立AIが並列に照合、各0件。基準点とtrackerは制作担当が指定。人の承認ではない。詳しくは[review.md](review.md) |

作例の仕様（`input.md`・`SPEC.md`）は制作担当が決めたもので、利用者からの回答や承認ではありません。原典の手順の全体（`setup-matt-pocock-skills`、`grill-with-docs` による聞き取り、seamの合意、code-review による締めくくり）を実行したわけではありません。

## 最後のテストを実行する

Node.js v24.18.0 で記録しました。依存パッケージはありません。

```sh
cd examples/matt-pocock-skills-example
node --test search.test.mjs
```

記録では、テスト4件・成功4件・失敗0件・終了コード0でした（`tdd-history.json` の `green3`）。`npm test` も同じコマンドを実行します。

## 失敗と成功の段を再現する

`tdd/` の各フォルダには、その時点の `search.mjs`・`search.test.mjs`・`entries.json` と記録 `record.json` があります。フォルダごとに同じコマンドを実行します。

```sh
cd examples/matt-pocock-skills-example/tdd/red1
node --test search.test.mjs
```

| フォルダ | 記録したテスト数 | 成功 | 失敗 | 終了コード | 失敗の中身 |
| --- | --- | --- | --- | --- | --- |
| `tdd/baseline` | 1 | 1 | 0 | 0 | — |
| `tdd/red1` | 2 | 1 | 1 | 1 | `ＵＩ` の期待 `ui-notes, color-lab, motion-cards` に対し実際は `[]` |
| `tdd/green1` | 2 | 2 | 0 | 0 | — |
| `tdd/red2` | 3 | 2 | 1 | 1 | `UI　設計` の期待 `ui-notes` に対し実際は `[]` |
| `tdd/green2` | 3 | 3 | 0 | 0 | — |
| `tdd/red3` | 4 | 3 | 1 | 1 | 空語・分野 slides の期待 `slide-story, slide-layout` に対し実際は6件すべて |
| `tdd/green3` | 4 | 4 | 0 | 0 | — |

REDの失敗は、いずれも `ERR_ASSERTION`（期待した掲載項目の配列との不一致）です。構文エラーや読み込みの失敗ではありません。記録時は `node --test --test-reporter=tap search.test.mjs` で実行しており、上のコマンドは同じテストを標準の表示で実行します。

## 保存した結果

- `tdd-history.json`：上の7回の実行の時刻・コマンド・Nodeの版・数・ファイルのSHA-256・TAPの出力。閲覧時には再実行しません
- `acceptance.json`：テストとは別の18項目の受け入れ確認。18項目すべてが期待どおりで、毎回新しい配列を返し、渡したデータを変えていないことも確かめました。テストと同じく実行時の自動確認で、人の承認ではありません
- `results.json`・`samples.json`：3つの例の、変更前と変更後の結果

3つの例は次のとおりです（`results.json`）。

| 例 | 検索語 | 分野 | 変更前 | 変更後 |
| --- | --- | --- | --- | --- |
| `wide-ui` 全角でもタグまで探す | `ＵＩ` | all | 0件 | 3件：UI設計ノート、配色ラボ、カードの動き |
| `and-query` 語を足して1件へ絞る | `UI　設計` | all | 0件 | 1件：UI設計ノート |
| `slides-only` 空語で分野だけを選ぶ | （空） | slides | 6件 | 2件：発表ストーリー、スライド設計 |

ページの `index.html#wide-ui`・`#and-query`・`#slides-only` で、それぞれの例を選んだ状態で開けます。ほかの検索語は、その場で関数に通して計算したもので、制作時のテストや受け入れ確認で確かめた結果ではありません。

## ページと動画のソースを手元で開く

ページはES modulesで `search.mjs` と `baseline/search.mjs` を読み込むため、ファイルを直接開くと動きません。サイトのルートで、自分のPCの中だけに見えるサーバーを起動します（例：Python 3）。

```sh
python -m http.server 8000 --bind 127.0.0.1
```

- 作例のページ：`http://127.0.0.1:8000/examples/matt-pocock-skills-example/`
- 動画の編集ソース：`http://127.0.0.1:8000/examples/matt-pocock-skills-example/video/`

`.mjs` を JavaScript の種類（`text/javascript`）で返さないサーバーでは、ブラウザーがモジュールを読み込みません。外部のサービス・Webフォント・解析ツールには接続しません。検索語はページの外へ送りません。

動画のソース `video/index.html` は、Motion Reel の時間の契約（`window.seek(秒)`・`window.motionConfig`・`window.motionReady`・`window.renderConfig`・`window.__MOTION_RENDER__`）に沿っています。名前・タグ・件数は `results.json`、テストの数とNodeの版は `tdd-history.json`、元の依頼は `input.md`、用語は `GLOSSARY.md` から読み、どれかが欠けたり記録の形が合わなかったりすると `motionReady` を失敗させて描きません。28秒・1280×720・30fps・音声なしで、最後の情報は24.4秒までに出し終え、そのあとは止まります。28秒・840フレームの無音MP4を書き出し、コンタクトシート14枚・連続12枚と代表フレーム、実MP4の14秒を制作担当が確認し、ブラウザーで終端まで再生しました。390/1280pxの表示、3プリセット・任意入力・Enter・0件、依頼文のOSコピー945文字一致と別ページの本文一致も確認しました。自動検査と制作担当の確認で、人の承認ではありません。

## スキルを自分の環境に入れる

原典の [README（固定コミット）](https://github.com/mattpocock/skills/blob/49dd158d1076134a641b33efb035946536778336/README.md) に、エージェントごとの入れ方があります。プラグインはスキル集をまとめて入れる方法です。必要なものだけを選ぶときは、README の「Any other agent, or editable files」の方法で、聞かれたときに選びます。

```sh
npx skills@latest add mattpocock/skills -a <agent>
```

README はこの方法で `setup-matt-pocock-skills` も選ぶよう案内しています。`@latest` はその時点の版を取るため、この作例と同じ版にするなら、固定コミットの `skills/engineering/` から使うスキルのフォルダだけを写してください。この作例ではインストールの手順そのものは試していません。

## 対象外と限界

- 依頼・データ・既存コードは架空で、合成データは6件です。八百万図AIツールボックス のサイトの検索は変えていません
- 利用者への聞き取り、仕様とseamの合意、人による承認はしていません
- 誤字の許容、同義語、ひらがなとカタカナの同一視、並べ替え・関連度順、一致箇所の強調、型が不正な入力、速度、大きなデータ、サーバー側の検索は扱っていません

## ライセンス

この作例の画面・文章・依頼文・合成データ・コード・テスト・記録・映像ソースは 八百万図AIツールボックス の独自制作で、MIT License です（`LICENSE`）。

`vendor/matt-pocock-skills/` は Matt Pocock Skills の固定コミット `49dd158` から選んだファイル（README、LICENSE、domain-modeling・codebase-design・tdd・code-review の本文）を変更せずに置いたもので、上流の MIT License（Copyright (c) 2026 Matt Pocock）に従います。上流の画像は使っていません。

## 公開前の確認

独立AI2軸の結果は[review.md](review.md)、検索コードの変更は[changes.diff](changes.diff)。3段の各テスト/コード/入力は実行時のハッシュと一致。TAP内のローカル絶対パスだけをfixtureへ置き換え、数値や期待/実際の結果は保っています。元の実行ログとモデルの受領全文は非公開です。

埋め込みブラウザーで非同期clipboard APIが成功を返してもOSへ反映しない場合があったため、ユーザー操作中の同期コピーを先に試すよう制作担当が調整しました。テキストファイルの自動文字コード判定を避けるため、UTF-8を明示した[依頼文の別ページ](request.html)も用意しています。
