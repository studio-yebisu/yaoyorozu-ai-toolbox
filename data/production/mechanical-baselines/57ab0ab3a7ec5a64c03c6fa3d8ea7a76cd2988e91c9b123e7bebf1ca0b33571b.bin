# PDF Creator 作例：ひとつのMarkdown原稿から、A4と細いページの2種類のPDFをつくる

八百万図AIツールボックス の作例です。架空のワークショップ案内 `inputs/event.md` を、PDF Creator（daymade）の変換スクリプトで次の2種類のPDFに書き出します。

- **A4で配る**（`#paper`）：原典テーマ `warm-terra` ＋ `themes/japanese-a4.css`、210×297mm
- **細いページで読む**（`#phone`）：原典テーマ `mobile` ＋ `themes/japanese-phone.css`、148×210mm

`index.html` は、事前に生成したPDFと全ページの画像を表示する静的なページです。ブラウザ上で変換はせず、入力欄・アップロード・送信・解析の機能はありません。原稿を外部サービスへ送信する機能はありません。画面は配信元の相対ファイルを読み込みます。

## 開き方

`file://` で開くと、ブラウザの制限で `outputs/manifest.json` や原稿を読み込めません。ローカルのHTTPサーバーから開いてください。

1. ZIPを展開し、`examples/` と `media/` があるバンドルのルートへ移動します。
2. そこで `python -m http.server 8000` などのHTTPサーバーを起動します。`.mjs` を JavaScript（`text/javascript`）として返すサーバーが必要です。
3. ブラウザで `http://localhost:8000/examples/pdf-creator-example/index.html#paper` を開きます。

## 使い方

- 上部の「A4で配る」「細いページで読む」で版を切り替えます。URLの `#paper` / `#phone` でも選べます。指定がなければA4版を表示します。
- 「PDFをダウンロード」は、生成済みのPDFファイルそのものへのリンクです。「PDFをブラウザで開く」で同じファイルを開けます。
- その下に、`outputs/manifest.json` に記録された全ページの画像をページ番号付きで並べます。manifest がない・内容が不正・画像が欠けているときは、その旨を表示し、代わりの画像やページ数は作りません。
- 原稿の本文、実行の順序、原典とライセンス、制限、再利用できる依頼文（`request.txt` と同じ文面）はページの下にあります。

## ファイル

| パス | 内容 |
| --- | --- |
| `inputs/event.json` | 案内の元になる事実（日付・時刻・定員・持ち物など） |
| `inputs/event.md` | 上の事実だけで書いた日本語の原稿。両方の版で共通 |
| `themes/japanese-a4.css` | A4版の和文上書き（原典テーマの後ろに追加） |
| `themes/japanese-phone.css` | 細いページ版の和文上書き（原典テーマの後ろに追加） |
| `outputs/` | 生成したPDFと `manifest.json` |
| `assets/` | 各ページのPNG |
| `vendor/pdf-creator/` | 原典の SKILL.md・スクリプト・テーマ・LICENSE（変更なし） |
| `request.txt` | 自分の原稿で試すときの依頼文 |
| `samples.json` | 2つの版の入力と出力の対応 |

## 変換のしくみ：原典と、この作例で足したもの

**原典（変更なし）**

- 原典：daymade/claude-code-skills の `daymade-docs/pdf-creator`、コミット `e37b50c323cf99471f18ac17a11c923bb96ce2ba`
- `SKILL.md` は手順書で、テーマの選び方・バックエンドの選び方・全ページの目視確認を定めています。
- `scripts/md_to_pdf.py` は実際の変換の実装です。Pandoc で Markdown を HTML にし、テーマCSSと表用のCJKパッチを埋め込み、ヘッドレス Chrome（または WeasyPrint）でPDFにします。
- この作例ではバックエンドに `chrome` を明示します。テーマは原典の `warm-terra` と `mobile` をそのまま使います。

**この作例で足したもの**

- `themes/japanese-a4.css` / `themes/japanese-phone.css`：原典テーマと自動の表用CJKパッチの後ろに追加する上書きです。Noto Sans JP を優先する和文のフォント指定、`line-break: strict` などの改行指定、見出しの直後での改ページを避ける指定だけを書いています。用紙サイズ・余白・配色・本文の大きさは原典のままです。
- HTMLの `lang` を `ja` にします（原典は `zh-CN`）。
- 生成スクリプト `build_pdfs.py` は原典の `markdown_to_pdf()` を呼び、上の追加CSSとHTMLの言語指定を読み込み時に加えます。あわせて、WindowsのChrome検出・一時ユーザープロファイル・UTF-8とrawdatesの指定・可変フォントから静的TrueTypeへの一時展開を互換処理として行います。`vendor/` の原典ファイルと原稿は書き換えません。

## 再現

必要なもの：

- Python 3.10以上
- pandoc（または `pypandoc_binary` 1.17 に含まれる pandoc）
- fonttools 4.67.0（可変フォントを静的な太さへ展開するため）
- Google Chrome
- Poppler（`pdftoppm`・`pdftotext`・`pdfinfo`）
- Noto Sans JPの可変TrueType（生成環境にインストール。Windowsの既定位置を探し、別の場所なら `--font PATH` で指定）

例のルートで次を実行します。既存の `outputs/` は上書きせず、新しいフォルダへ書き出します。この build_pdfs.py と同じ既定経路を実行済みです。既存の出力フォルダは拒否します。

```
python build_pdfs.py --out renders/pdf-first
```

フォントやChromeのバージョンが違うと、改行・改ページ・ページ数が変わることがあります。

## 実行して確認した範囲

原典の `markdown_to_pdf()` をChromeで2回実行しました。A4版は1ページ、148×210mm版は2ページです。元のMarkdownの各段落・見出し・リストの本文を、PopplerのUTF-8抽出（PDFのActualTextを含む）と空白除去だけで照合しています。字形だけを読む抽出器での結果とは分けています。

全3ページを原典が生成した130dpiの一時PNGで読み、原稿と比較しました。公開用の100dpi画像は、PDFから意図して別生成した成果物です。欠け・箱文字・はみ出し・孤立した見出しは見られず、細いページ版の当日の流れは1〜3から次ページの4〜6へ続きます。A4の末尾が2文字だけになる折り返しは、制作担当が最後の重複する申込不可文だけを削って整えています。冒頭の注意と元の事実は保ち、元受領を私的に保存しました。

生成時は、インストール済みNoto Sans JPの可変フォントをfonttoolsで400/700/800の静的TrueTypeへ一時展開します。Chromeが可変フォントをType 3にする問題を避け、全出力の埋め込みTrueTypeを確認しました。フォント本体・一時HTML・生成途中のキャッシュは配布していません。初回のWindows pdfinfo日時の文字コードエラーも、UTF-8とrawdatesの指定で修正しています。

現在の値・SHA-256は `outputs/manifest.json`、確認範囲は `validation.json`。実行環境はPython3.13.7、pypandoc_binary1.17内のPandoc3.9、Chrome155.0.8059.41、Poppler26.07.0、fonttools4.67.0です。原典18ファイルは固定コミットのままです。別環境で同一バイト・同じ改ページになるという保証ではありません。

表がないため表の罫線チェックは対象外。一括変換・WeasyPrint・macOSのプレビュー・Adobe Acrobat Reader・実際の印刷・全禁則の網羅・人による承認は未確認です。原典の中国語向けlintは実行しましたが、それだけで和文の組版を保証していません。

PDF2種を再生成する依存の例は、作業用の仮想環境で `python -m pip install pypandoc_binary==1.17 fonttools==4.67.0`。ChromeとPoppler、Noto Sans JPの可変TrueTypeは別途用意します。`--chrome PATH` と `--font PATH` で場所を明示できます。

## ライセンス

- この作例の原稿・追加CSS・ページのコードと文章：MIT License、© 2026 Studio Yebisu（`LICENSE`）
- 同梱した原典 PDF Creator：MIT License、Copyright (c) 2025 daymade（`vendor/pdf-creator/LICENSE`）
- Noto Sans JP：SIL Open Font License 1.1。フォント本体は同梱していません。条件は `FONT-OFL.txt` にあります。

## 解説動画と編集ソース

28秒・1280×720・30fps・840フレーム・無音。実PDFの3ページ画像を使う編集動画で、連続操作の録画ではありません。動画本体とポスターは一式の `media/`、編集ソースは `video/`、確認資料は `video/review/`。任意時刻の描画一致、代表/連続フレーム、全デコードと実MP4の終端再生を確認しています。

Node.js20以上、Python、Chrome、FFmpeg/ffprobeを用意し、一式のルートで次を実行します。Motion ReelのMITレンダラーを同梱し、Playwright1.64.0の依存はlockfileで固定して導入します。node_modulesは同梱していません。書き出し先は原本とは別の新しいフォルダにしてください。

```text
npm ci --ignore-scripts --no-audit --no-fund --prefix examples/pdf-creator-example/tools/motion-reel
python examples/pdf-creator-example/render.py --out renders/video-first
```

同梱レンダラーとrender.pyの既定経路を実行済みです。音の合成・音楽・他の映像比率は試していません。人による承認やあらゆる環境での映像品質保証は含みません。


## 概念構造の紹介 visual-r1

元の原稿/2PDF/3画像/変換器/実検証を保持し、指示書→作者→制作担当→原典変換→別工程の確認→実PDFの構造を新しい32秒無音紹介にしました。新しい入口はindex.htmlとrender-visual.py、手順はvisual-guide.md、確認範囲はvisual-verification.jsonです。元の全ページ画面はdesk.html、旧28秒紹介はvideo/legacy.htmlへ保全。原PDF生成は再実行していません。
