# Humanizer作例：製品文3件の定型表現を直し、条件を残す

Humanizer 3.1.0の固定版 [SKILL.md](vendor/humanizer/SKILL.md) を、架空の製品「Mado Notes」の文章3件（英語2件・日本語1件）に適用した結果を読むための静的なビューアです。各文章について、原文・初稿・点検・最終稿、変更理由、残した条件17項目を並べています。

- 製品名、日付、機能、料金の扱いは、すべてこの作例のための架空の設定です。
- 結果は Claude Opus 5.5 が制作時にSKILL.mdを読み、その手順で書いたものを保存しています。人による校閲・承認は受けていません。
- ページを開いてもAIは実行されません。ブラウザーは保存済みのJSONを表示するだけです。
- AI検出器ではありません。検出率、品質点数、意味が同じことの保証は含みません。

## 開き方

JSONを読み込むため、`file://` で直接開くと表示されません。ソース一式のルート（`examples/` があるフォルダー）で次を実行します。

```bash
python -m http.server 8000
```

ブラウザーで `http://localhost:8000/examples/humanizer-example/` を開きます。新しいインストールやアカウントの接続は要りません。

## 読み方

1. **3つのタブを開く**：「英語のお知らせ」「英語のサポート返信」「日本語への適用例」を切り替えます（矢印キー、Home、Endでも移動できます）。`#release`、`#reply`、`#japanese` を付けたURLで、それぞれを直接開けます。
2. **比べる**：左が原文、右が最終稿です。橙の番号付きの箇所は、削除または書き換えた原文の部分で、下の「変更点」の番号と対応します。
3. **条件を確かめる**：「残した条件」のボタンを選ぶと、最終稿の該当箇所が緑で示され、原文の引用と並びます。文字列の対応を示すもので、意味が同じことの保証ではありません。
4. **初稿を見る**：「初稿と点検を見る」で、最終稿の前に書いた初稿と、初稿に残っていた定型表現を確かめられます。英語のお知らせと日本語の例は点検で残りがなく、初稿がそのまま最終稿です。
5. **保存する**：「推敲メモをダウンロード」で [outputs/revisions.md](outputs/revisions.md)、「結果データをダウンロード」で [outputs/revisions.json](outputs/revisions.json) を持ち帰れます。最終稿だけをコピーするボタンもあります。
6. **再利用する**：[request.txt](request.txt) の依頼文に、原文・読み手・残す条件を書き入れて使います。

## 別の文章に使う

このビューアやスクリプトが文章を書き直すことはありません。書き直すのは、SKILL.mdを読んだAIエージェント（モデル）です。

1. 原文・読み手・残す条件を用意します。読み手がすでに知っている背景を省いてよい場合は、「読み手」欄に具体的に書きます。
2. AIエージェントに、この作例と同じ固定版の `vendor/humanizer/SKILL.md`（またはrequest.txtにある固定コミットのURL）を読ませます。
3. request.txtの依頼文に3つを貼って渡し、印付け・初稿・点検・最終稿を受け取ります。
4. 残す条件ごとに、原文と最終稿の引用を読み比べます。

Humanizerの説明と例は主に英語です。まず英語の文章で使うことを勧めます。日本語はこの作例で1件試しただけで、日本語全般での効果は確かめていません。

## ファイル

| パス | 内容 |
|---|---|
| `index.html`・`style.css`・`app.mjs` | ビューア本体（外部のフォント・ライブラリ・通信なし） |
| `inputs/jobs.json` | 原文3件、目的、読み手、残す条件17項目（架空の入力） |
| `outputs/revisions.json` | 印、初稿、点検、最終稿、変更点、残した条件、省いた背景 |
| `outputs/revisions.md` | 同じ内容の日本語の推敲メモ |
| `samples.json` | 原文と最終稿の組（`input-output` 形式） |
| `request.txt` | 別の文章で使う依頼文 |
| `vendor/humanizer/` | Humanizerの原典14ファイル（コミット `225a6f39ac85f76ee48dbad772ea4abe4ed6c9d8`、未改変） |

## 入力と出力の範囲

- 入力は 八百万図AIツールボックス が書いた架空の短文3件です。残す条件17項目は、その入力の中の文字列を根拠にしています。実在の製品の機能・料金・顧客を示すものではありません。
- 出力は初稿と最終稿で、英語の原文は英語のまま、日本語の原文は日本語のまま推敲しています。翻訳はしていません。説明・変更理由・メモは日本語です。
- 英語2件・日本語1件だけの結果です。長い文書、ほかの文体、実在の製品の文章で同じ結果になるとは限りません。

## ライセンスと出典

- この作例の文章・データ・コード：MIT License、Copyright (c) 2026 Studio Yebisu（[LICENSE](LICENSE)）
- Humanizer：MIT License、Copyright (c) 2025 Siqi Chen（[vendor/humanizer/LICENSE](vendor/humanizer/LICENSE)）。原典：[blader/humanizer @ 225a6f3](https://github.com/blader/humanizer/tree/225a6f39ac85f76ee48dbad772ea4abe4ed6c9d8)
- Humanizerのパターンは、SKILL.mdが出典として示すWikipediaの「Signs of AI writing」（WikiProject AI Cleanup）に基づいています。この作例はWikipediaの本文を転載していません。

## 動画と現在の確認記録

28秒・1280×720・30fps・840フレーム・無音。保存した実出力と作例画面を使う編集動画で、連続操作の録画ではありません。代表/連続フレーム、同時刻の描画一致、全デコード、実MP4の再生終端を制作担当が確認しました。人による承認ではありません。現在の範囲は verification.json。storyboard.jsonは制作時の設計記録です。

一式のルートで次を実行します。Node.js20以上・Python・Chrome・FFmpeg/ffprobeが必要です。Motion ReelのMIT実行ソースを同梱し、依存はlockfileに固定しています。依存本体・認証・モデル履歴は含みません。

```text
npm ci --ignore-scripts --no-audit --no-fund --prefix examples/humanizer-example/tools/motion-reel
python examples/humanizer-example/render.py --out renders/video-first
```

このコマンドは保存済みの文章を使って動画を描画します。文章の推敲は、固定版SKILL.mdと原文・読者・条件をモデルへ渡して行います。モデルへの再依頼では文章が変わる場合があります。引用の存在を検査しただけで意味や文章品質を保証するものではありません。
