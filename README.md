# Yaoyorozu AI ToolBox

AIスキルとツールを、用途・使い方・実作例から選ぶ日本語サイトです。画面・資料・映像の制作に加え、調査、文章、知識整理、音声、3D、ゲーム、開発、自動化、学習などを一つの入口で扱います。

[統合サイト](https://studio-yebisu.github.io/yaoyorozu-ai-toolbox/) · [最初の作例](https://studio-yebisu.github.io/yaoyorozu-ai-toolbox/case.html?id=brief-to-demo)

モデル紹介は、画像生成・音声合成・文字起こし・予測・記憶管理など、ツール用途の **OpenWeight** に統一します。**OpenLLM（汎用LLM）は収集・サーベイ・引用・掲載の対象に含めず、LLMの比較表や比較サイトへの誘導も追加しません。** 分類の正本は [data/categories.json](data/categories.json)、モデル紹介の正本は [data/open-models.json](data/open-models.json)。詳しい紹介は `open-models.html` で読めます。固定したモデルカード・利用条件と、説明用の図・外部の作例へのリンクを記録し、推論を実行した作例とは区別します。[掲載方針](docs/CURATION.md)も参照してください。

## 一つのCodexプロジェクトから使う

このフォルダーをCodexで開きます。専門制作の実ファイルは、このフォルダー内の `workspace/ui-ux/`、`workspace/slides/`、`workspace/motion/` にまとめて保存します。それぞれ独立したGitリポジトリで、元のGit履歴・未コミット変更・ignored素材を保持します。

```powershell
python scripts/workspace.py
```

このコマンドは各ディレクトリの実体とGitルートを検査し、ローカルの参照先を更新します。`data/projects.json` の `folder` は、このフォルダーからの相対パスです。`workspace/` 全体とローカル実行記録は親リポジトリの公開対象に含めません。公開cloneには専門リポジトリを同梱しないため、必要なリポジトリをそれぞれの `workspace/` 配下へ別途配置します。

専門制作の正本：

- [UI・UX](https://github.com/studio-yebisu/yaoyorozu-ai-toolbox-ui-ux)
- [AIスライド](https://github.com/studio-yebisu/yaoyorozu-ai-toolbox-slides)
- [モーション](https://github.com/studio-yebisu/yaoyorozu-ai-toolbox-motion)

## 紹介内容を追加する

原典の確認、制作ブリーフ、実作例、短い説明動画を揃え、記事データをサイトへ反映します。制作の既定は **Claude Opus 5.5** です。

```powershell
python scripts/pipeline.py new example-id --source https://example.com/skill --category agents
python scripts/produce.py --prompt path/to/production-prompt.txt
python scripts/pipeline.py publish example-id
```

最後のコマンドは成果物を検査してローカルサイトを生成します。公開が依頼済みの場合は `--deploy` を付けると、このリポジトリの許可リストをcommit・pushし、GitHub Pagesへ反映します。依頼されていない公開先や課金へ拡張しません。

```powershell
python scripts/pipeline.py publish example-id --deploy
```

## サイトを開く

```powershell
python scripts/build.py
python scripts/check.py
python scripts/serve.py
```

ブラウザーで `http://127.0.0.1:8856/` を開きます。

カタログの更新は `python scripts/sync_catalog.py`。既存3プロジェクトの固定したコミットから取り込みます。取り込んだ版と範囲は [data/import-manifest.json](data/import-manifest.json) に記録します。

分野は [data/categories.json](data/categories.json) を正本とします。既存リポジトリの対応は `data/projects.json` として独立しています。原典を確認した追加紹介40件は [data/curated-resources.json](data/curated-resources.json) に保持し、同期で消さずにサイト生成時に統合します。各項目に用途、試し方、依頼文、必要な環境、利用条件、固定コミットを記録します。[紹介の追加方法](docs/CURATION.md)を参照してください。

紹介の原典確認と、実際の制作・実行確認は別です。追加40件は原典を確認した紹介から始め、Opus 5.5で作例と短い動画を順に制作しています。完成した項目は同じカタログIDのまま作例の記事へつなぎ、原典の実行範囲と確認記録を残します。最新の完成状況はサイトの作例一覧と各項目の確認記録を参照してください。

## 最初の一件

**ひと言を、作れる依頼に。** 短い依頼を制作ブリーフへ整理する独自スキル。Opus 5.5がUI・スライド・モーションの3件を制作し、選択・コピー・JSON取得ができる作例と、使い方を説明する28秒の動画にまとめます。

- [スキル本文](skills/brief-to-demo/SKILL.md)
- [操作できる作例](examples/brief-to-demo/index.html)
- [動画の編集ソース](examples/brief-to-demo/video/scene.js)
- [制作記録](docs/FIRST_CASE.md)

ブラウザー上の作例は制作済みの出力を見るものです。閲覧者の入力を外部AIへ送信しません。

## 出典・条件

統合サイトのコードと独自スキルはMIT。独自制作のデモ・説明動画はクレジット付きで商用利用・編集・再配布が可能で、Xの投稿本文には `@studio_yebisu` が必須です。[動画の利用条件](MEDIA-LICENSE.md)を参照してください。紹介先のスキル・ツール・作例には、それぞれの条件が適用されます。ライセンスの表示を、別の作品への適用や実装全体の再許諾とみなしません。[出典と取り込み範囲](docs/SOURCES.md)を参照してください。

ダウンロード用MP4には「Yaoyorozu AI ToolBox」と「@studio_yebisu」の1行クレジットを焼き込みます。`python scripts/prepare_video_downloads.py` で両方向の動画を準備し、元の再生用MP4を保持します。入力と出力のハッシュ・寸法・長さは `data/video-downloads.json` に記録します。


## X向けの画像カード

`python scripts/build.py` は42件それぞれに、画像カード用の共有ページ `share/<id>-card.html` と1200×600のJPEGを生成します。引用元入りの横動画から1コマを取り出し、画像全体とクレジットを残して余白を足します。HTMLのheadへ `summary_large_image` とOpen Graphの画像情報を直接出力します。生成一覧と画像のハッシュは `dist/data/social-cards.json` です。ビルドにはFFmpeg、検査にはFFprobeが必要です。

「Xで紹介」と「紹介文とカードURLをコピー」は、画像カード用URL、クレジット、`@studio_yebisu` を含む紹介文を作ります。カードのリンク先は図だけを大きく表示し、ヘッダー・見出し・説明文を外します。クレジットは映像内に残し、記事・保存・利用条件へのリンクは隅の「⋯」メニューにまとめます。700px未満で縦動画、700px以上で横動画を表示します。以前の縦横別URLと84個の埋め込みプレーヤーも利用でき、縦横別URLのメタデータも画像カードに揃えています。

リンク先では引用元入りMP4の無音自動再生を試み、動きを抑える設定やブラウザーの制限がある場合は手動再生にします。Xに指定するカードは静止画です。**Xでの表示確認には、共有ページとJPEGを公開HTTPS URLから取得できることが必要です。** ローカルのメタデータ・画像・再生検査と、Xによる実際のカード表示は分けて記録します。

画像の寸法・容量の参考は[旧公式仕様を引用するX開発者フォーラムの説明](https://devcommunity.x.com/t/twitter-card-summary-large-image/144086/2)です。旧ドキュメントのURLは現在概要ページへ転送されるため、過去の仕様を現行X上での表示保証として扱いません。

## いいね・保存・シェア

カードと記事に、共有いいね・このブラウザーに残す「あとで試す」・リンクのシェアを用意しています。共有いいねはCloudflare WorkersとD1へ保存し、APIの保存確認後に件数へ反映します。シェアは小さなアイコンから操作できます。ローカル確認と本番接続の設定は [機能と設定](docs/LIKES.md) を参照してください。
