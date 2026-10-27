# 総合サイトと制作ガイド

八百万図AIツールボックスのホームを、すべての制作ガイドと道具を探す入口にします。ブランド名はどの案内ページでも総合ホームに戻り、専門ガイド名はコンテンツの現在地として表示します。

## 公開URL

| 役割 | 総合サイト内のパス |
| --- | --- |
| ホーム | `/` |
| 制作ガイド一覧 | `/guides/` |
| モーション | `/guides/motion/` |
| モーションの作例とツール | `/guides/motion/projects.html` |
| モーションの制作の始め方 | `/guides/motion/guide.html` |
| AIスライド | `/guides/slides/` |
| AIスライドの使い方 | `/guides/slides/guide.html` |
| AIスライドのスキル詳細 | `/guides/slides/repository.html?repo=…` |
| UI・UX | `/guides/ui-ux/` |
| 作例 | `/#cases` |
| 道具を探す | `/#catalog` |
| 既存の記事 | `/case.html?id=…`、`/case.html?entry=…` |
| 分野 | `/#fields`、既存の分野IDのハッシュ |
| サイトマップ | `/sitemap.html`、`/sitemap.xml` |

パスはGitHub PagesのプロジェクトURL `https://studio-yebisu.github.io/yaoyorozu-ai-toolbox/` からの相対位置です。既存の記事URLと分類IDを維持します。

ナビゲーションの正本は `data/site-map.json`、専門リポジトリの対応は `data/projects.json`、分類は `data/categories.json` です。`scripts/site_structure.py` がホーム、記事、モデル、利用条件、ガイドの案内ページへ同じメニューを生成します。独立した作例の画面、動画の共有ページ、埋め込みプレイヤーには総合ナビを重ねません。

## ガイドの取り込み

専門リポジトリは独立した制作の正本として保持します。通常のビルドが `workspace/` を読むことや、ネットワークから未確認の最新版を取り込むことはありません。

`integrations/motion/` と `integrations/slides/` は公開済みのHTML、CSS、JavaScriptと、その表示に必要なJSONだけを取り込んだスナップショットです。取り込み元のコミット、元ファイルと統合後ファイルのSHA-256は `data/guide-sources.json` に記録します。通常のビルドと検査はこの記録を使います。

動画、資料、フォント、ソース一式、独立した作例は専門サイトの既存URLを使います。元サイトのアセットとダウンロードを残すことが統合版の動作条件です。これらの再生成や、個別制作物の品質評価を今回の統合作業で実施したとは扱いません。

ガイドを更新する場合は、対象リビジョンと公開範囲をレビューしたうえで `scripts/import_guides.py` を明示実行します。既存スナップショットを上書きする操作は自動化していません。各ガイドのLICENSE、ATTRIBUTIONと、項目ごとの利用条件を引き継ぎます。

## 旧URLからの移行

`scripts/legacy_redirects.py` は旧サイトの案内ページに対応する移転ページを準備します。旧サイトの全ページを総合ホームへ転送する方式にはせず、同じ本文へ移動します。JavaScriptが有効な場合は検索条件とハッシュを引き継ぎます。JavaScript無効時は通常のリンクから同じページへ移り、検索条件を選び直す案内を表示します。GitHub Pagesで任意のHTTP 301を設定したとは扱いません。UI・UXは既に総合サイト内にあるため、存在しない旧公開先の転送を新設しません。

```powershell
python scripts/legacy_redirects.py motion --output .local/ux/legacy/motion
python scripts/legacy_redirects.py slides --output .local/ux/legacy/slides
```

公開する際は総合サイトの統合ページを先に検証し、その後、専門サイトの既存ビルドの最後にこのHTMLを重ねます。旧サイトのアセット・作例・ダウンロードは維持します。専門サイトの生成器や制作原本を移転案内で置き換えません。スクリプトの実行だけでは公開されません。

## 確認

```powershell
python scripts/build.py
python scripts/check.py
```

既存の成果物検査に加え、共通ナビの遷移先、ブランドからの帰路、ページ内リンク、ガイドの取り込みハッシュ、XMLサイトマップの重複と到達先を確認します。ブラウザーではホームから各ガイドへの往復、検索と絞り込み、スライドの指定ページ再生、モーションのカテゴリ、320px・390pxとPCの表示を確認します。自動検査、実ブラウザーでの確認、ユーザーのデザイン採用、本番公開は別の状態として記録します。

構成検討にはClaude Opus 5.5とKimi K3.1 Proの独立した相談結果を使用しました。ホーム、ガイド一覧、サイトマップ、共通スタイルの初稿は実行記録で確認したClaude Opus 5.5が担当し、Codexがガイドの取り込み、ナビゲーション、検索の修正、実ブラウザーでの確認と表示の調整を担当しました。Kimi K3.1 Proの統合コードレビューを受け、ページ許可リスト、本文保全、正規URLとサイトマップの検査を強化しました。実行の全文と認証に関わる情報は公開物に含めません。
