# 調査と作例の記録

確認日：2026-10-13。GitHubの公開リポジトリを対象に、UI・UXの設計、実装、改善へ使う**エージェントスキル**を探しました。人気順・網羅調査・性能ランキングではありません。

## 調査の範囲

既存の6件を起点に、次の観点で6件を追加しました。

| 探した領域 | 追加した掲載単位 | 採用した理由 |
|---|---|---|
| 既存UIの改善とアクセシビリティ | UI Skills | レビューだけでなく、改善対象を絞ったスキルを選べる |
| 視覚方針・ブランド・画面品質 | Taste Skill | 一般的なレイアウトを避ける具体的な設計指針がある。現在のv2は実験的な版として扱う |
| UX設計の進め方 | Bencium Controlled UX Designer | 実装へ進む前の設計判断と、進行の制御を扱う |
| デザインシステム | Allonsy Design System | トークンやUI部品、文書化を一貫させる設計に用途がある |
| コンポーネント実装 | shadcn/ui Skill | shadcnプロジェクトの構成を踏まえた実装指針がある |
| 画面生成サービスとの連携 | Stitch Skills | DESIGN.mdやプロンプト整理から画面生成へつなぐ。Stitch MCPなどの外部前提がある |

一つのスキル集に複数のSKILL.mdがある場合も、カタログでは一件と数えています。作者のスキル集と、実行ライブラリやawesome形式のリンク集を同じ件数へ混ぜていません。Motion本体は補助ライブラリとして別枠です。

調査に使った検索語、候補の扱い、固定コミットは以下に残しています。shadcn / Stitchの記録には確認ファイルのSHA-256も収録しています。

- [第三者スキル集の調査記録](data/research-2026-10-13.json)
- [shadcn / Stitchの調査記録](data/research-official-2026-10-13.json)
- [掲載内容の正本](data/catalog.json)

READMEだけでなく、掲載対象のSKILL.md、実行に必要な前提、ライセンス表記を確認しました。スキル集全体の全ファイルを監査したという意味ではありません。GitHubのstar数や作者の性能・美的評価の主張は、選定や品質保証の根拠に使っていません。

## 導入時に区別すること

- shadcn/uiは、そのコンポーネント環境を前提にしたスキルです。任意のHTMLページに同じ手順で使えるとは限りません。
- Stitch SkillsはGoogleの組織内にあるリポジトリですが、READMEには公式サポート対象のGoogle製品ではない旨があります。アカウント、MCP設定、サービスの利用条件を別に確認する必要があります。
- Taste Skill v2は実験的な版です。Benciumは確認時点の移転先リポジトリを記録しました。
- AllonsyはMPL-2.0です。他のMIT表記の候補と同じ再配布条件だとは扱いません。
- Vercel agent-skillsのMITはREADME表記を根拠にしています。詳細は[ATTRIBUTION.md](ATTRIBUTION.md)に記載しています。

各項目の説明と根拠リンクは[README](README.md)またはカタログの詳細欄を参照してください。原典のスキル本文・コード・ロゴは再配布していません。

## 4件を使って実際につくる

[Yaoyorozu AI ToolBox Desk](examples/studio-desk/index.html)は、複数の制作を整理するための小さなWebアプリです。架空のプロジェクトを用意し、検索・絞り込み・追加・編集・進行状態の変更・タスク完了を操作できるようにしました。

Frontend Designを視覚方針に、Emil Design Engineeringを操作設計に適用し、Web Design GuidelinesとUI Skillsのfixing-accessibilityで実装を点検します。原典を読んで判断へ適用する方式であり、導入コマンドを実行したという意味ではありません。

[実装への適用記録](examples/studio-desk/skill-application.json)と[作例のREADME](examples/studio-desk/README.md)に、具体的な判断と検証範囲を残しています。保存はブラウザ内のみで、実際のGitHub・Codexプロジェクトや外部サービスには接続していません。

これは一つの実装例であり、各スキルの寄与率や優劣を測った比較試験ではありません。調査済み、作例へ適用、試作の動作確認、本番採用は別の状態です。
