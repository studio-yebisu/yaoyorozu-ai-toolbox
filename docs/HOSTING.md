# ホスティングと切り替え

統合サイトはGitHub Pagesで公開しつつ、Cloudflare Workersへ段階的に移行します。静的サイトのビルド本体（`python scripts/build.py` の `dist/` 出力）は変えず、配布物をCloudflare向けに包む `scripts/prepare_cloudflare.mjs` を追加した構成です。GitHub Pagesのワークフローは旧URL・大きなメディア・ロールバック用としてそのまま動かし続けます。

現在の正本：

- **サイト本体（Cloudflare Workers）**: `https://yaoyorozu-ai-toolbox.riyun-aihara.workers.dev/` — Worker名 `yaoyorozu-ai-toolbox`
- **旧URL・大きなファイルの保管先（GitHub Pages）**: `https://studio-yebisu.github.io/yaoyorozu-ai-toolbox/`
- **いいねAPI（Cloudflare Workers + D1）**: `https://yaoyorozu-likes.riyun-aihara.workers.dev`（保存方式を維持し、新サイトのオリジンを許可）

## 何がどこにあるか

| 対象 | 所在 | 補足 |
| --- | --- | --- |
| HTML・CSS・JS・画像・25MiB以下の静的ファイル | Cloudflare Workers（静的アセット） | `dist/` をそのままコピー/ハードリンク |
| canonical・og:url・サイトマップ・共有カードURL | Cloudflare出力だけ新ルートに書き換え | 後述「URLの書き換え方針」 |
| 25MiBを超えるファイル（長い動画など） | GitHub Pagesのまま | Workerが「許可リストに記載した完全一致パス」だけ307で引き継ぎ。**まだR2には移していません。R2は未接続です。** |
| 共有いいね | Cloudflare Workers + D1（既存のAPI） | サイトのオリジンを `ALLOWED_ORIGINS` に追加済み |
| あとで試す | 閲覧中のブラウザー内 | 端末間の同期は行いません |

不存在のパスは404を返します。トップページへの200フォールバックや、GitHub Pagesへの任意パス委譲は行いません。

## ローカルの手順

前提：Node.js 24.18.0、Python、FFmpeg（画像カード生成）。依存関係は `package-lock.json` で固定しています。

```powershell
npm ci --ignore-scripts --no-audit --no-fund
python scripts/build.py           # 従来どおり dist/ を生成（GitHub Pages用の出力と同じ）
python scripts/check.py           # 掲載検査。これを通した dist/ のみを包みます
npm test                          # Worker動作・URL安全性・梱包の回帰テスト
npm run prepare:cf                # .cloudflare/output/v0/ を生成し、.local/cloudflare-release-report.json に記録
npm run deploy:cf                 # cf deploy --prebuilt --mode production（要Cloudflare認証。トークン等はリポジトリに含めない）
```

`python scripts/build.py` は公開内容をいったん `.local/build-staging/<一意の名前>/` に新規生成し、成功してから `dist/` と入れ替えます。生成・入れ替えに失敗しても既存の `dist/` はそのままで、中間出力は `.local/build-staging/` に名前付きのまま残ります（不要なら削除してかまいません）。入れ替え前の旧 `dist/` は `.local/build-history/<一意の名前>/` に退避され、新しい出力とバイト一致が確認できたファイルだけ重複除去されます。内容が変わった・消えた旧ファイルは非公開のまま保持されるため、古いレビュー画像や重複動画が公開物に混入しません。

通常の公開は、承認済みの変更をmainへ反映してから `scripts/deploy-cloudflare.ps1` を実行します。公開元が未コミット、main以外、GitHubのmainと不一致の場合は停止します。同じコミットのGitHub Pages成功を待ち、ビルド・検査・Cloudflare公開と公開先のhealth revision一致まで確認します。

`python scripts/pipeline.py publish <case-id> --deploy` も、対象限定のcommit・push後にこの処理を呼びます。GitHubだけ更新されてCloudflareが古いままになることを防ぎます。継続的な運用設定は `services/site/deployment.json` に保持し、現在の `r2_bucket` は `null` です。

`prepare:cf` は検査済みの `dist/` のみを対象にします。25MiB超は梱包せず一覧化し、Workerに307委譲させます。プライベートパス（`.local`/`.git`/`workspace` など）の混入、distの外へ逃げるシンボリックリンク、想定外のファイル数は失敗として拒否します。生成物は `@cloudflare/build-output-utils` の `readBuildOutput` で再検証されます。GitHub Pagesの出力 `dist/` 自体は変更しません。

## デプロイ後の確認

```powershell
curl.exe -s https://yaoyorozu-ai-toolbox.riyun-aihara.workers.dev/healthz
# {"ok":true,"service":"yaoyorozu-ai-toolbox","revision":"<16桁のハッシュ>"}
curl.exe -sI https://yaoyorozu-ai-toolbox.riyun-aihara.workers.dev/yaoyorozu-ai-toolbox/case.html?id=brief-to-demo
# 301、Location は https://yaoyorozu-ai-toolbox.riyun-aihara.workers.dev/case.html?id=brief-to-demo
curl.exe -sI https://yaoyorozu-ai-toolbox.riyun-aihara.workers.dev/<reportに記載の大きなファイルパス>
# 307、Location は https://studio-yebisu.github.io/yaoyorozu-ai-toolbox/<同じパス>
curl.exe -s -o NUL -w "%{http_code}" https://yaoyorozu-ai-toolbox.riyun-aihara.workers.dev/definitely-missing.html
# 404（トップページの200ではない）
```

ブラウザーでは `.html` URL・クエリ・アンカー（`#` はブラウザーが保持し、サーバーには送られません）・相対パスが従来どおり動くことを確認します。Xのカード表示確認は公開HTTPSから画像カードを取得してから別途行います（`data/social-cards.json` の検証範囲に従います）。

## URLの書き換え方針

ビルド済みの `dist/` は壊しません。`prepare:cf` が**出力だけ**を書き換えます。

- 書き換える：`https://studio-yebisu.github.io/yaoyorozu-ai-toolbox/` → 新ルート。公開用のHTML・JS・CSS・サイトマップ、共有やナビゲーション用JSONなどに含まれるサイト内URLが対象です。正確な対象は `scripts/prepare_cloudflare.mjs` の `shouldTransform` で管理します。
- 書き換えない：制作レシート（`data/production/`）、作例の事実データ（`data/cases/`、`data/cases.json`）、カタログ・モデル紹介・取り込み記録、ライセンス・帰属・README、`examples/`。GitHub Pagesが残るためこれらの旧URLは有効なままです。
- 専門制作リポジトリの公開先（`-slides`/`-motion`/`-ui-ux` サフィックス）は別ホストのまま残ります。

 originの変更は `YAOYOROZU_SITE_URL` 環境変数で上書きできます（デフォルトは上記のWorkers URL）。Python側の `data/projects.json` の `site_url` や生成済みの事実・ハッシュは変更しません。

## ロールバック

GitHub Pagesワークフロー（`.github/workflows/pages.yml`）は `main` へのpushで従来どおり `dist/` を公開し続けます。Cloudflare側を止めてリンクをGitHub Pagesに戻せば、以前と同じ公開状態に戻ります。`prepare:cf` は `.cloudflare/` と `.local/` にしか書かず、`dist/` やワークフローには触れません。

## 大きなファイルをR2へ移す場合（将来の手順）

2026-10-28の選択により、大容量6ファイルはGitHubに残します。R2のAPI認可は追加しましたが、R2の従量課金契約は行っておらず、バケット・オブジェクトも作成していません。将来移す場合は、契約と対象範囲を承認したうえで以下を行います。

1. R2バケットを作成し、公開方法（カスタムドメインまたはWorker経由）を決めます。
2. 移行元はレシートの `.local/cloudflare-release-report.json` の `excluded.items`（パス・バイト数・sha256）です。`dist/` 内の該当ファイルをバケットへ同期します。
3. 検証後に `services/site/deployment.json` の `r2_bucket` へバケット名を設定し、WorkerのR2配信を明示的に有効化します。Workersの1ファイル25MiB制限を設定値だけで引き上げることはできません。
4. 検証：レシートの `excluded.items` 全パスに対し、新URLが200で、レスポンスのバイト数・sha256がレシートと一致することを確認します。旧GitHub Pages URLも引き続き有効なままにしてから切り替えます。
5. `python scripts/check.py` と `npm test` を再実行し、ブラウザーで動画再生・ダウンロード・共有カードを確認します。

「すべてのメディアが移動した」「R2に接続済み」とは記載しません。レシートのハッシュが一致するまで移行完了とは扱いません。

## CIについて

GitHub Actionsの `Validate public site` は従来のサイト検査に加え、固定したNode.jsと依存関係、`npm test`、`npm run prepare:cf` で配布物を検証します。CIへCloudflareの認証情報は追加していません。Cloudflareへの公開は、承認済みのローカル公開処理が既存CLI認証で行います。GitHub Pagesの公開ワークフローも維持します。
