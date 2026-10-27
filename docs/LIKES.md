# いいね・保存・シェア

カード・プレビュー・記事には「いいね」「あとで試す」「シェア」を並べます。「あとで試す」は個人用のブックマークで、上部の「保存したもの」から一覧とカタログを絞り込めます。保存後の案内からもその一覧を開けます。同じブラウザー内で保持し、端末間同期は行いません。シェアはスマホなどのタッチ操作で共有機能が使える場合に端末の共有メニューを開き、PCなどでは公開ページのリンクをコピーします。自動投稿・自動送信は行いません。

GitHub Pagesのサイトから、Cloudflare WorkersのAPIを通してD1へ保存します。サイトを再ビルドしても件数はDBに残ります。[GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages)は静的ホスティングのため、DBは別サービスです。

閲覧者のログインは不要です。ブラウザー内にランダムなIDを保存し、DBの `(項目ID, IDのハッシュ)` を一意にします。同じブラウザーでは各項目に1件。再度押すと取り消せます。カタログ、作例カード、プレビュー、記事で同じ項目IDを使います。件数はAPIの保存確認後に表示します。通信に失敗したときは数を増やさず、再試行を案内します。

DBにはブラウザーIDのハッシュ、項目ID、登録日時と集計値を保存します。メールアドレス・GitHubアカウント・IPアドレスは保存しません。閲覧者へ秘密鍵やDBキーを配りません。ブラウザーのサイトデータを削除した場合や別ブラウザーでは別のIDになります。本人単位の投票認証や不正投票防止を保証する方式ではありません。

## ローカル確認

リポジトリのルートで項目一覧を生成します。新しい掲載項目を追加した際にもこの一覧を更新し、APIへ反映します。

```powershell
python scripts/prepare_likes.py
cd services/likes
npm ci
npm test
npm run db:local
npm run dev
```

別のターミナルでルートから実行します。

```powershell
$env:YAOYOROZU_LIKES_API_URL='http://127.0.0.1:8787'
python scripts/build.py
python scripts/check.py
python scripts/serve.py --port 8857
```

`http://127.0.0.1:8857/` でローカルD1を使った動作を確認できます。ローカルDBは `services/likes/.wrangler/` に置き、公開しません。開発用CORS許可は `npm run dev` の引数だけに設定し、本番設定には含めません。

## 本番接続

Cloudflareアカウントへのログイン、外部リソースの作成、API公開とGitHub Pagesへの反映は承認後に行います。既定の `data/likes.json` は空のURLです。この状態ではボタンを表示せず、未接続のいいねを保存済みと扱いません。

1. Cloudflareの **Workers Free** プランを確認します。有料プランへの変更は行いません。
2. `services/likes` で `npx wrangler d1 create yaoyorozu-likes` を実行し、返されたDB IDを `wrangler.toml` のプレースホルダーに設定します。
3. `npx wrangler d1 migrations apply yaoyorozu-likes --remote` でテーブルを準備します。
4. `npx wrangler deploy` でAPIを公開します。`ALLOWED_ORIGINS` は実際のサイトのオリジンに限定します。
5. 発行されたHTTPSのオリジンを `data/likes.json` の `api_url` に設定します。パス・認証情報・クエリを含めません。
6. サイトのビルドと検査後、承認された公開手順で反映します。公開URLから登録・取り消し・別ブラウザーの件数・再読み込み後の保持を確認します。確認用の投票は取り消します。

2026-10-26に確認した無料枠は、[Workers](https://developers.cloudflare.com/workers/platform/pricing/)が1日10万リクエスト、[D1](https://developers.cloudflare.com/d1/platform/pricing/)が1日500万行の読み取り・10万行の書き込み・計5GBです。無料枠を超えた場合は制限される構成とし、自動で有料プランへ切り替えません。契約プランと実際の利用量は本番接続時に確認します。
