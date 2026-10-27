# UI・UX エージェントスキルガイド

Claude・CodexなどのエージェントでWeb UIを設計・実装・改善するための、日本語のスキル比較ガイドです。

原典確認日：**2026-10-13**。**12のスキル・スキル集**を収録し、Motionライブラリは補助資料として別枠にしています。

## 実際につくる

[Yaoyorozu AI ToolBox Deskを開く](examples/studio-desk/index.html) — 架空の制作プロジェクトを検索・追加・編集・整理する、ブラウザ内保存の試作です。

Frontend Design、Emil Design Engineering、Web Design Guidelines、UI Skillsの4件を読み、設計・実装・点検へ適用しました。導入コマンドの実行や外部サービスへの接続はしていません。

[適用内容と実装](examples/studio-desk/README.md) · [スキル適用の記録](examples/studio-desk/skill-application.json) · [調査範囲と選定理由](RESEARCH.md)

## モーション版との分担

[元投稿](https://x.com/RoundtableSpace/status/2109958757891346459)の#10 Motion.dev Animations SkillをUI側へ、#9 Motionは補助ライブラリとして掲載。残りの11件は追加調査です。映像制作、タイポグラフィ演出、GSAP・Lottieなどは[モーション版](https://studio-yebisu.github.io/yaoyorozu-ai-toolbox-motion/)にまとめています。

このガイドの中心は視覚設計・操作設計・実装レビューです。ユーザー調査、情報設計、ユーザーテストなどUXの全工程を網羅するものではありません。

## 選び方

| いま必要なこと | 候補 |
|---|---|
| 視覚方針を決める | Frontend Design / UI UX Pro Max |
| 既存画面を改善する | Impeccable |
| 操作性をコードで点検する | Web Design Guidelines |
| UIの動きを設計・実装する | Emil Design Engineering / Motion.dev Animations Skill |
| アクセシビリティを修正する | UI Skills / fixing-accessibility |
| ブランドや画面の統一を考える | Taste Skill / Bencium / Allonsy Design System |
| 既存コンポーネント・生成サービスを使う | shadcn/ui Skill / Stitch Skills |
| 動きを実行する依存ライブラリ | Motion |

## カタログ

### Frontend Design

**スキル / 追加調査** / [作例に適用](examples/studio-desk/README.md)

対象サービスに合う文字、色、余白、レイアウトを考える、Anthropicのフロントエンド向けスキル。画面を新しくつくるときや、既存UIの印象を変える入口に。

- 向いていること：LP、サービスサイト、ダッシュボードの視覚方針と実装。
- 必要なもの：Claude Codeなど、SKILL.mdを扱うエージェント。実装先の言語や既存デザイン規約は依頼に添える。
- 範囲と限界：視覚設計が中心。ユーザー調査、導線の実証、アクセシビリティ適合をこのスキルだけで保証するものではない。
- ライセンス：Apache-2.0。frontend-design配下のLICENSE.txtを確認。リポジトリ全体へ一律に適用しない。

導入例（原典の記載を紹介。ここでは実行していません）：

```text
/plugin marketplace add anthropics/skills
/plugin install example-skills@anthropic-agent-skills
```

Claude Code内で入力。公式READMEのexample-skillsセット導入手順で、frontend-design単体のインストールではない。

依頼文のたたき台（本ガイドの独自文）：

> frontend-designを使って、このサービスのトップ画面を設計してください。対象ユーザーは【誰】、最優先の行動は【何】です。既存のブランド規約と実際の文言を使い、文字・色・余白の方針を短く示してから実装してください。スマートフォンとキーボード操作も確認してください。

[リポジトリ](https://github.com/anthropics/skills) · [確認した原典](https://github.com/anthropics/skills/blob/dbd4588f9e1033efb41dad4bef2f7947c8993d44/skills/frontend-design/SKILL.md) · [導入手順](https://github.com/anthropics/skills/blob/dbd4588f9e1033efb41dad4bef2f7947c8993d44/README.md) · [ライセンス根拠](https://github.com/anthropics/skills/blob/dbd4588f9e1033efb41dad4bef2f7947c8993d44/skills/frontend-design/LICENSE.txt)

確認日 2026-10-13 / commit `dbd4588f9e1033efb41dad4bef2f7947c8993d44`

### Impeccable

**スキル＋CLI / 追加調査** / 原典資料を確認

見た目の講評、文言、余白、端末対応、エラー状態などを目的別に扱うスキルとツール。既存の画面に対し、どこを直すかを絞って反復したいときに。

- 向いていること：既存UIの改善、UX文言の整理、画面品質の点検。
- 必要なもの：対応エージェントと対象プロジェクト。npx経由の導入はNode.jsが必要。エンジンを同梱または初回取得し、導入時にはフック設定も提示される。
- 範囲と限界：自動検出とAI講評は利用者による使いやすさの検証とは別。ライブ編集の利用には起動できるWebプロジェクトが必要。
- ライセンス：Apache-2.0。LICENSEを確認。Anthropic frontend-designを起点とする旨をREADMEが記載。

導入例（原典の記載を紹介。ここでは実行していません）：

```text
npx impeccable install
```

対象プロジェクトのターミナルで実行。公式の対話式インストーラーで対象エージェントと範囲を選ぶ。

依頼文のたたき台（本ガイドの独自文）：

> Impeccableで【画面】をレビューしてください。利用者が【目的】を達成する流れをたどり、視覚的な優先順位、説明文、入力エラー、空の状態を確認してください。問題の場所と理由を示し、影響の大きい3点を修正してください。

[リポジトリ](https://github.com/pbakaus/impeccable) · [確認した原典](https://github.com/pbakaus/impeccable/blob/245ad82def45831dc56a21b683c7a1ff530b06cc/.claude/skills/impeccable/SKILL.md) · [導入手順](https://github.com/pbakaus/impeccable/blob/245ad82def45831dc56a21b683c7a1ff530b06cc/README.md) · [ライセンス根拠](https://github.com/pbakaus/impeccable/blob/245ad82def45831dc56a21b683c7a1ff530b06cc/LICENSE)

確認日 2026-10-13 / commit `245ad82def45831dc56a21b683c7a1ff530b06cc`

### UI UX Pro Max

**スキル＋検索データ / 追加調査** / 原典資料を確認

業種や画面の目的から、配色、書体、スタイル、UXの注意点を検索するスキル。新しいプロダクトの設計方針を整理し、実装スタックに合わせて具体化する。

- 向いていること：新規プロダクトの設計案、デザインシステムのたたき台。
- 必要なもの：CLI導入はNode.js/npm、検索スクリプトはPython 3.x。利用者、業種、用途、実装スタックを具体的に指定する。
- 範囲と限界：検索結果は設計候補。既存ブランド、業務要件、実ユーザーの行動に合わせて選別する。ここでは公開リポジトリのみを対象とし、別提供の有料機能は含めない。
- ライセンス：MIT。公開リポジトリのLICENSEを確認。外部の有料提供や参照素材の条件は別。

導入例（原典の記載を紹介。ここでは実行していません）：

```text
npx ui-ux-pro-max-cli init --ai claude
```

プロジェクトのターミナルで実行。公式READMEに記載された、グローバル導入を省く方法。

依頼文のたたき台（本ガイドの独自文）：

> ui-ux-pro-maxで【用途】のUI方針を提案してください。対象は【利用者】、実装は【スタック】です。既存の色・書体・操作規約を優先し、候補を理由付きで比較してください。選んだ方針を画面ごとのルールへ落とし込み、推測と確定要件を分けてください。

[リポジトリ](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) · [確認した原典](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/7246805992a42b7bba37d4cac83b01416f0c6c44/.claude/skills/ui-ux-pro-max/SKILL.md) · [導入手順](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/7246805992a42b7bba37d4cac83b01416f0c6c44/README.md) · [ライセンス根拠](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/7246805992a42b7bba37d4cac83b01416f0c6c44/LICENSE)

確認日 2026-10-13 / commit `7246805992a42b7bba37d4cac83b01416f0c6c44`

### Web Design Guidelines

**レビュースキル / 追加調査** / [作例に適用](examples/studio-desk/README.md)

VercelのWeb Interface Guidelinesを取得し、指定したUIコードを点検するスキル。フォーカス、フォーム、キーボード操作、動きを減らす設定などの実装レビューに。

- 向いていること：実装後の操作性・アクセシビリティ・フォームのコード点検。
- 必要なもの：対象ファイルを読めるエージェントと、最新版ガイドラインを取得するネットワーク接続。
- 範囲と限界：実行時に外部ガイドラインを取得するため、同じスキル版でも判定規則は変わり得る。コードレビューだけでWCAG適合や実機での使いやすさを保証しない。
- ライセンス：MIT（README表記）。agent-skillsのREADMEはMITと記載。ただし確認版のツリーにLICENSE条文ファイルはなく、GitHub APIのlicense値もnull。参照先web-interface-guidelinesは別リポジトリでMIT。

導入例（原典の記載を紹介。ここでは実行していません）：

```text
npx skills add vercel-labs/agent-skills
```

公式READMEのリポジトリ導入コマンド。選択画面でweb-design-guidelinesを選ぶ。

依頼文のたたき台（本ガイドの独自文）：

> web-design-guidelinesで【対象ファイル】をレビューしてください。フォームのラベル、エラーの伝達、Tab移動、フォーカスの戻り先、動きを減らす設定を確認してください。根拠のある指摘をファイル位置付きで示し、ブラウザで追加確認すべき点も分けてください。

[リポジトリ](https://github.com/vercel-labs/agent-skills) · [確認した原典](https://github.com/vercel-labs/agent-skills/blob/063bee94c3f4df8453406c830b0a7df0f2860278/skills/web-design-guidelines/SKILL.md) · [導入手順](https://github.com/vercel-labs/agent-skills/blob/063bee94c3f4df8453406c830b0a7df0f2860278/README.md) · [ライセンス根拠](https://github.com/vercel-labs/agent-skills/blob/063bee94c3f4df8453406c830b0a7df0f2860278/README.md)

確認日 2026-10-13 / commit `063bee94c3f4df8453406c830b0a7df0f2860278`

### Emil Design Engineering

**スキル / 追加調査** / [作例に適用](examples/studio-desk/README.md)

Emil KowalskiのUI設計とアニメーションの判断をまとめたスキル。動かす必要性、反応速度、途中で操作された場合の挙動など、コンポーネントの細部を扱う。

- 向いていること：ボタン、ポップオーバー、ツールチップ、ドラッグ操作の仕上げ。
- 必要なもの：既存のUIコードと、確認できるブラウザ。現行スキル名はemil-design-eng。
- 範囲と限界：デザインエンジニアリングと動きが中心。情報設計や調査を含むUX全工程の代替ではない。
- ライセンス：MIT。LICENSEを確認。ガイドでは現行リポジトリ内のemil-design-engを紹介。

導入例（原典の記載を紹介。ここでは実行していません）：

```text
npx skills@latest add emilkowalski/skills
```

公式READMEの導入コマンド。選択画面でemil-design-engを選ぶ。

依頼文のたたき台（本ガイドの独自文）：

> emil-design-engを使って【コンポーネント】の操作感を整えてください。頻繁に使う操作は待たせず、開閉を連打した場合や途中で逆操作した場合も確認してください。動きを減らす設定とタッチ操作を含め、変更前後と理由を示してください。

[リポジトリ](https://github.com/emilkowalski/skills) · [確認した原典](https://github.com/emilkowalski/skills/blob/2d228630ba1446365f614a108cb8252f1feda202/skills/emil-design-eng/SKILL.md) · [導入手順](https://github.com/emilkowalski/skills/blob/2d228630ba1446365f614a108cb8252f1feda202/README.md) · [ライセンス根拠](https://github.com/emilkowalski/skills/blob/2d228630ba1446365f614a108cb8252f1feda202/LICENSE)

確認日 2026-10-13 / commit `2d228630ba1446365f614a108cb8252f1feda202`

### Motion.dev Animations Skill

**スキル / 元投稿 #10** / 原典資料を確認

Motionのスクロール、ホバー、ドラッグ、レイアウト遷移を実装するためのClaude Codeスキル。元投稿の15項目から、操作画面向けの1件をこのガイドへ分離。

- 向いていること：React / Next.jsなどの、操作や状態変化を伝えるWeb UI。
- 必要なもの：Claude Code、Git、実装先のMotion環境。原典はReact 19+、Next.js 15+、Svelte 5+、Astro 4+を対象に記載。実案件のバージョン適合は別確認。
- 範囲と限界：READMEの120fpsなどは著者の目標・説明で、本ガイドの実測結果ではない。Vueはmotion-vの別API。CSSだけで済む小さな動きや映像書き出しには用途を見直す。
- ライセンス：MIT。LICENSEを確認。Motionライブラリ本体とは別の第三者スキル。

導入例（原典の記載を紹介。ここでは実行していません）：

```text
git submodule add https://github.com/199-biotechnologies/motion-dev-animations-skill.git .claude/skills/motion-dev-animations
```

Git管理している対象プロジェクトで実行。公式READMEのプロジェクト内導入例で、.gitmodulesも作成・更新する。

依頼文のたたき台（本ガイドの独自文）：

> motion-dev-animationsで【UIの状態変化】を実装してください。使用中のフレームワークとMotionの版を先に確認し、動きの目的を【位置関係／操作への反応／状態説明】から明確にしてください。操作を妨げず、キーボードと動きを減らす設定に対応し、対象端末で確認してください。

[リポジトリ](https://github.com/199-biotechnologies/motion-dev-animations-skill) · [確認した原典](https://github.com/199-biotechnologies/motion-dev-animations-skill/blob/3feedfb4dba8adae40fc9a5f9a23e3dda2121205/SKILL.md) · [導入手順](https://github.com/199-biotechnologies/motion-dev-animations-skill/blob/3feedfb4dba8adae40fc9a5f9a23e3dda2121205/README.md) · [ライセンス根拠](https://github.com/199-biotechnologies/motion-dev-animations-skill/blob/3feedfb4dba8adae40fc9a5f9a23e3dda2121205/LICENSE)

確認日 2026-10-13 / commit `3feedfb4dba8adae40fc9a5f9a23e3dda2121205`

### Taste Skill v2

**スキル（実験版） / 追加調査** / 原典資料を確認

デザインの変化量、動きの強さ、情報密度を調整し、ブランドの文脈から視覚方針を組み立てるスキル。新しいLPやポートフォリオ、既存サイトの再設計に使う。

- 向いていること：LP、ブランドサイト、ポートフォリオの視覚設計と再設計。
- 必要なもの：SKILL.mdを扱うエージェントと実装先。導入コマンドにはNode.js/npmが必要。既存のブランド、内容、技術構成を依頼に添える。
- 範囲と限界：確認時点の既定版はv2 experimental。ダッシュボード、データ表、多段階の業務UIは対象外と明記される。強い造形上の好みを含み、一般的なUXの正解を保証しない。
- ライセンス：MIT。固定コミットのLICENSEを確認。画像素材や外部ライブラリの条件は別。

導入例（原典の記載を紹介。ここでは実行していません）：

```text
npx skills add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend"
```

公式READMEの単体導入コマンド。フォルダ名ではなくfrontmatterの導入名を指定する。v1と同じ導入名でv2へ更新されるため、既存利用者は版の違いを確認する。

依頼文のたたき台（本ガイドの独自文）：

> design-taste-frontendで【LP／ポートフォリオ】を設計してください。対象読者は【誰】、伝える内容は【内容】、最優先の行動は【行動】です。既存のブランド規約を読み、変化量・動き・情報密度の方針を示して実装してください。実在する文言と素材を使い、狭い画面と動きを減らす設定も確認してください。

[リポジトリ](https://github.com/Leonxlnx/taste-skill) · [確認した原典](https://github.com/Leonxlnx/taste-skill/blob/d237dd399d57524945c0c81327da5da19f7a468d/skills/taste-skill/SKILL.md) · [導入手順](https://github.com/Leonxlnx/taste-skill/blob/d237dd399d57524945c0c81327da5da19f7a468d/README.md) · [ライセンス根拠](https://github.com/Leonxlnx/taste-skill/blob/d237dd399d57524945c0c81327da5da19f7a468d/LICENSE)

確認日 2026-10-13 / commit `d237dd399d57524945c0c81327da5da19f7a468d`

### UI Skills

**スキル集 / 追加調査** / [作例に適用](examples/studio-desk/README.md)

UIの基準、アクセシビリティ修正、コンポーネント比較などを目的別に扱うスキル集。fixing-accessibilityはラベル、キーボード、フォーカス、入力エラーなどを対象に、小さく修正する方針を持つ。

- 向いていること：既存UIのアクセシビリティ修正と、コンポーネントの状態・バリエーション確認。
- 必要なもの：対象UIのコードと、それを読めるエージェント。baseline-uiにはTailwindやMotion for Reactを前提とした規則もあるため、使うスキルを選ぶ。
- 範囲と限界：スキル集のうちbaseline-ui、fixing-accessibility、component-canvasの本文を確認。全スキルの実行検証ではない。自動レビューだけで支援技術の動作やWCAG適合を保証しない。
- ライセンス：MIT。固定コミットのLICENSEを確認。

導入例（原典の記載を紹介。ここでは実行していません）：

```text
npx ui-skills get baseline-ui
```

公式READMEの取得コマンド。CLIの実装上、Markdownを標準出力へ表示するもので、自動インストールではない。選んだskills/<名前>/の内容をエージェントの対応するスキル配置先へ保存して使う。

依頼文のたたき台（本ガイドの独自文）：

> UI Skillsのfixing-accessibilityを使って【対象画面】を確認してください。入力の名前とエラーの関連付け、Tab移動、見えるフォーカス、ダイアログを閉じた後の戻り先を点検し、既存構造を保って必要な箇所を修正してください。コードの確認とブラウザで実際に試した結果を分けて報告してください。

[リポジトリ](https://github.com/ibelick/ui-skills) · [確認した原典](https://github.com/ibelick/ui-skills/blob/9a0cb1e610e3a1a4f0f2723bf2e7680ac1b89cf5/skills/fixing-accessibility/SKILL.md) · [導入手順](https://github.com/ibelick/ui-skills/blob/9a0cb1e610e3a1a4f0f2723bf2e7680ac1b89cf5/README.md) · [ライセンス根拠](https://github.com/ibelick/ui-skills/blob/9a0cb1e610e3a1a4f0f2723bf2e7680ac1b89cf5/LICENSE)

確認日 2026-10-13 / commit `9a0cb1e610e3a1a4f0f2723bf2e7680ac1b89cf5`

### Bencium Controlled UX Designer

**スキル / 追加調査** / 原典資料を確認

配色、書体、レイアウトを人と確認しながら進めるUX設計スキル。余白や文字の尺度に加え、入力のフィードバック、エラーからの回復、段階的な情報開示を扱う。

- 向いていること：方針を相談しながら進める業務画面、フォーム、既存UIの整備。
- 必要なもの：Claude Codeと対象プロジェクト。本文は@/components/uiにある導入済みshadcn/ui v4とindex.cssのテーマを前提とする。
- 範囲と限界：確認を挟む設計スタイルで、承認済みの変更まで毎回止める必要はない。影を使わないなど作者の造形規則も含む。アクセシビリティや業務適合の実証は別途必要。
- ライセンス：MIT。固定コミットのLICENSEを確認。旧bencium-claude-code-design-skill URLは現在のmarketplaceへ転送される。

導入例（原典の記載を紹介。ここでは実行していません）：

```text
/plugin marketplace add bencium/bencium-marketplace
/plugin install bencium-controlled-ux-designer@bencium-marketplace
```

Claude Code内で入力する、公式READMEの個別プラグイン導入手順。shadcn/ui自体を導入するコマンドではない。

依頼文のたたき台（本ガイドの独自文）：

> bencium-controlled-ux-designerで【業務画面】を設計してください。利用者の仕事は【目的】です。確定済みの色・書体・コンポーネント規約はそのまま使い、未決定の重要な選択だけ比較してください。入力中、エラー、保存中、完了の状態と、失敗から回復する方法を含めて実装してください。

[リポジトリ](https://github.com/bencium/bencium-marketplace) · [確認した原典](https://github.com/bencium/bencium-marketplace/blob/5de46a39b4640fa419560cd0b67e4c4b50dac802/bencium-controlled-ux-designer/skills/bencium-controlled-ux-designer/SKILL.md) · [導入手順](https://github.com/bencium/bencium-marketplace/blob/5de46a39b4640fa419560cd0b67e4c4b50dac802/README.md) · [ライセンス根拠](https://github.com/bencium/bencium-marketplace/blob/5de46a39b4640fa419560cd0b67e4c4b50dac802/LICENSE)

確認日 2026-10-13 / commit `5de46a39b4640fa419560cd0b67e4c4b50dac802`

### Allonsy Design System

**スキル＋設計リファレンス / 追加調査** / 原典資料を確認

コンポーネントの分類と命名、プロパティやイベント、デザイントークン、ARIA、国際化を整理するスキル。画面単体から再利用できる部品と規約を作りたいときに。

- 向いていること：コンポーネントライブラリの設計・レビューとデザインシステムの文書化。
- 必要なもの：SKILL.mdと同梱referencesを読めるエージェント。既存コンポーネント、命名規約、トークン定義を渡す。HTMLやWeb Componentsの例を実装先の構成に合わせて読む。
- 範囲と限界：設計の指針と参照資料が中心。付属CLIのインストールやテストは実行していない。既存のフレームワーク規約に合わせた調整と、操作を含むブラウザ検証が必要。
- ライセンス：MPL-2.0。固定コミットのLICENSEを確認。改変・再配布時はMPL-2.0の条件を確認する。

導入例（原典の記載を紹介。ここでは実行していません）：

```text
skills/design-system/ → プロジェクトの .claude/skills/design-system/
```

確認した固定版からフォルダを手動配置する例。SKILL.mdだけでなくreferencesも含める。対応する他エージェントではそのスキル配置先を使う。既存フォルダの上書きを避けて差分を確認する。

依頼文のたたき台（本ガイドの独自文）：

> design-systemを使って【既存コンポーネント群】をレビューしてください。名前、責務、プロパティ、イベント、色や余白のトークン、キーボード操作、国際化の規則を整理してください。現在の実装に合わせた小さな改善案と、代表コンポーネント1つの仕様・実装例を作ってください。

[リポジトリ](https://github.com/allonsy-studio/agent-skills) · [確認した原典](https://github.com/allonsy-studio/agent-skills/blob/4d1f9f9ead6e1ae760c939fe7169e2f90e7b382c/skills/design-system/SKILL.md) · [導入手順](https://github.com/allonsy-studio/agent-skills/blob/4d1f9f9ead6e1ae760c939fe7169e2f90e7b382c/README.md) · [ライセンス根拠](https://github.com/allonsy-studio/agent-skills/blob/4d1f9f9ead6e1ae760c939fe7169e2f90e7b382c/LICENSE)

確認日 2026-10-13 / commit `4d1f9f9ead6e1ae760c939fe7169e2f90e7b382c`

### shadcn/ui Skill

**公式スキル / 追加調査** / 原典資料を確認

プロジェクト設定、導入済みの部品、基盤ライブラリを調べ、shadcn/uiのフォームやダイアログを組み立てる公式スキル。部品名やAPIを推測せず、CLIと原典を参照する。

- 向いていること：shadcn/uiを使う管理画面、設定、フォーム、デザインシステムの実装。
- 必要なもの：Node.jsとパッケージマネージャー、shadcn/uiのプロジェクト。components.jsonなどの設定を読む。CLIを使った部品の取得にはネットワーク接続が必要。
- 範囲と限界：shadcn/ui向けの実装規則であり、任意のHTMLや他の部品ライブラリへそのまま適用するものではない。スキルを追加しても部品一式や完成画面が自動で入るわけではない。
- ライセンス：MIT。リポジトリのLICENSE.mdを確認。追加のレジストリから取得する素材・コンポーネントは各条件を確認する。

導入例（原典の記載を紹介。ここでは実行していません）：

```text
pnpm dlx skills add shadcn/ui
```

shadcn/ui公式ドキュメント掲載のスキル導入例。部品を追加するshadcn CLIのコマンドとは別。導入時の最新版を取得する。

依頼文のたたき台（本ガイドの独自文）：

> shadcnスキルを使い、このプロジェクトの設定と導入済みコンポーネントを確認してください。【設定画面】を既存の部品で組み立て、必須入力、エラー表示、キーボード操作を含めて実装してください。部品のAPIは現行ドキュメントで確認してください。

[リポジトリ](https://github.com/shadcn-ui/ui) · [確認した原典](https://github.com/shadcn-ui/ui/blob/30a58d4498f270af1c1e981a7d78a15cf5740841/skills/shadcn/SKILL.md) · [導入手順](https://github.com/shadcn-ui/ui/blob/30a58d4498f270af1c1e981a7d78a15cf5740841/README.md) · [ライセンス根拠](https://github.com/shadcn-ui/ui/blob/30a58d4498f270af1c1e981a7d78a15cf5740841/LICENSE.md)

確認日 2026-10-13 / commit `30a58d4498f270af1c1e981a7d78a15cf5740841`

### Stitch Design Skills

**スキル集＋MCP連携 / 追加調査** / 原典資料を確認

Google Labs Codeが公開するStitch向けスキル集。画面の生成・修正、DESIGN.mdへの設計規約の整理、実装への引き渡しを用途別に扱う。ここでは画面生成、design-md、enhance-promptの本文を確認した。

- 向いていること：Stitchの画面案、既存画面からのデザイン規約抽出、複数画面の方向性の統一。
- 必要なもの：Stitchを利用できるアカウントと、エージェント側のStitch MCP接続・認証設定。design-mdは既存のStitch画面を参照する。機能間の依存スキルも必要。
- 範囲と限界：READMEはGoogleの公式サポート対象製品ではないと明記。MCPを用いた生成・アップロードは外部サービスで行う。各サービスの利用枠・データの送信先は別途確認する。全収録スキルの動作検証はしていない。
- ライセンス：Apache-2.0。スキル集のLICENSEを確認。Stitchサービスの利用条件・利用枠や、入力素材の権利とは別。

導入例（原典の記載を紹介。ここでは実行していません）：

```text
npx skills add google-labs-code/stitch-skills
```

READMEの選択導入例。必要なスキルを選ぶ。接続設定は別途必要で、スキル同士に依存関係がある。ここでは接続・インストール・外部生成を行っていない。

依頼文のたたき台（本ガイドの独自文）：

> Stitchで【画面】を設計するため、利用者、最優先の行動、表示する情報を整理してください。既存のデザインシステムがある場合は継承し、なければ先に規約をまとめてください。生成対象のプロジェクトと送信する素材を明示して進めてください。

[リポジトリ](https://github.com/google-labs-code/stitch-skills) · [確認した原典](https://github.com/google-labs-code/stitch-skills/blob/0337446dadde6f8c94210444e2aa9d546126480f/plugins/stitch-design/skills/generate-design/SKILL.md) · [導入手順](https://github.com/google-labs-code/stitch-skills/blob/0337446dadde6f8c94210444e2aa9d546126480f/README.md) · [ライセンス根拠](https://github.com/google-labs-code/stitch-skills/blob/0337446dadde6f8c94210444e2aa9d546126480f/LICENSE)

確認日 2026-10-13 / commit `0337446dadde6f8c94210444e2aa9d546126480f`

### Motion

**ライブラリ / 元投稿 #9** / 原典資料を確認

Webの動きを実行するJavaScript / React向けライブラリ。スキルに教わったUIアニメーションをコードで実現する土台として、両ガイドから参照する共通項目。

- 向いていること：UIのジェスチャー、スクロール連動、要素の出入り、レイアウト変化。
- 必要なもの：JavaScriptのプロジェクト。Reactはmotion/react、Vueは別パッケージmotion-vの公式手順を参照。
- 範囲と限界：ライブラリの導入だけでClaudeに設計スキルが追加されるわけではない。Motion+の素材・サービスは、このMITライブラリ本体と条件が異なる。
- ライセンス：MIT。Motion本体のLICENSE.mdを確認。Motion+までMITという意味ではない。

導入例（原典の記載を紹介。ここでは実行していません）：

```text
npm install motion
```

JavaScript / Reactプロジェクトのターミナルで実行。スキル導入ではなくアプリの依存追加。

依頼文のたたき台（本ガイドの独自文）：

> このプロジェクトでMotionを使い、【UI要素】の状態変化を実装してください。既存の依存関係と版を確認し、処理完了を待たせない動きにしてください。中断や連続操作、フォーカス維持、動きを減らす設定も確認してください。

[リポジトリ](https://github.com/motiondivision/motion) · [確認した原典](https://github.com/motiondivision/motion/blob/790a654dfef305307c566cf4e94d67a9f7a403c8/README.md) · [導入手順](https://github.com/motiondivision/motion/blob/790a654dfef305307c566cf4e94d67a9f7a403c8/README.md) · [ライセンス根拠](https://github.com/motiondivision/motion/blob/790a654dfef305307c566cf4e94d67a9f7a403c8/LICENSE.md)

確認日 2026-10-13 / commit `790a654dfef305307c566cf4e94d67a9f7a403c8`

## ローカルで読む・更新する

外部フォント・画像・ランタイム依存を持たない静的サイトです。`index.html`をブラウザで開くだけでも読めます。

```powershell
python scripts/build_site.py
python scripts/check_site.py
node scripts/test_filters.cjs
python -m http.server 8080 --bind 127.0.0.1
```

最後のコマンドを実行した場合は、ブラウザで `http://127.0.0.1:8080/` を開きます。ビルド・検査にはPython 3とNode.jsを使います。サイトの表示にはどちらも不要です。

`data/catalog.json`が掲載内容の正本です。編集後にビルドすると`index.html`とこのREADMEを再生成し、公開用の`dist/`も出力します。公開・デプロイは自動実行しません。

## 検証の意味

固定コミットの原典確認、4件の指針を適用した作例、このガイドのデータ・リンク整合・検索ロジック検査を分けています。作例は単一の試作であり、スキル間の優劣を比較するベンチマークではありません。アクセシビリティ適合や第三者スキルの導入動作を保証するものでもありません。

## 出典とライセンス

本ガイド独自の文章・依頼文・サイトコードは[MIT License](LICENSE)。紹介先のスキル、ライブラリ、ブランドは各権利者に帰属し、それぞれの条件に従います。第三者の全文・コード・ロゴは同梱していません。[出典・ライセンス一覧](ATTRIBUTION.md)を参照してください。
