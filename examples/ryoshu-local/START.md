# Ryoshuをはじめる — v1.3.4

領収書の読み取りと勘定科目の候補作りはローカルPC上で行い、画像や内容を外部AIへ送りません。この紹介サイトに表示される領収書は保存済みの架空データで、ページ上でOCR・AIは実行しません。

## 準備からCSVまで

1. [動作要件](https://github.com/studio-yebisu/ryoshu/blob/v1.3.2/docs/REQUIREMENTS.md)と[モデル・依存の利用条件](https://github.com/studio-yebisu/ryoshu/blob/v1.3.2/THIRD_PARTY.md)を読みます。Windows 11 64bit、JavaScriptが使えるブラウザー、Ollamaが必要です。専用GPUは不要で、最低RAMは未測定です。
2. [v1.3.4 Windowsインストーラー](https://github.com/studio-yebisu/ryoshu/releases/download/v1.3.4/Ryoshu-1.3.4-windows-x64-setup.exe)を実行します。管理者権限は不要です。[配布EXE](https://github.com/studio-yebisu/ryoshu/releases/tag/v1.3.4)にはコード署名がないため、[導入手順とSHA256SUMS.txtによる確認方法](https://github.com/studio-yebisu/ryoshu/blob/v1.3.2/docs/INSTALL.md)も参照してください。
3. Ollamaを公式サイトから導入し、スタートメニューの「Ryoshu」を開きます。初回準備ではPython 3.12.15・固定版の依存・OCRモデル・約2.5GBのQwenモデルを取得するため、ネット接続が必要です。インストーラーにモデルは含まれません。
4. ブラウザーで12〜256文字の復元用パスワードを設定します。通常はWindowsの利用者ごとに保護された鍵で帳簿を開くため、起動ごとの入力は不要です。
5. PDF・JPG・PNG・WebPを選択またはドロップし、「読み取りを開始」を押します。結果画面では原本・読み取った内容・勘定科目を3列で見比べられます。
6. 科目名からカテゴリーと科目を選び直し、金額・日付・用途などは「詳細を修正」で編集します。[13カテゴリー・69科目](https://github.com/studio-yebisu/ryoshu/blob/v1.3.2/docs/ACCOUNTS.md)から選べるほか、独自科目も追加できます。
7. 原本と照合してから、汎用CSV・freee振替伝票・MFクラウド仕訳帳・弥生デスクトップ25項目形式のCSVを書き出します。各会計サービスの実アカウントへの取り込みは未検証です。

**読み取り結果と勘定科目は候補です。日付・支払先・金額・科目・用途・事業割合・支払元を原本と照らして利用者が確認します。「確認済み」は利用者の操作状態で税理士の承認ではなく、税務上の最終判断は利用者と税理士が行います。**

帳簿DB・保存済みの原本・プレビュー・暗号化バックアップは暗号化されますが、書き出したCSVと原本ファイルは暗号化されない通常ファイルです。保存先と共有先を管理してください。外部AIのアカウント・APIキーは不要です。

## 更新と復元

v1.3は科目カテゴリーを保存するためDBをスキーマ3へ更新します。更新前に暗号化バックアップを保存してください。更新前の暗号化スナップショットを保存し、既存明細・仕訳・独自科目を保持します。更新したDBは旧アプリで開けません。旧版へ戻す場合は、更新前のバックアップを別の保存先へ復元してください。[導入・更新の手順](https://github.com/studio-yebisu/ryoshu/blob/v1.3.2/docs/INSTALL.md)

## 検証記録の見方

2026-10-27（日本時間）の実行確認では、Ryoshu 1.3.4に架空5件を新規推論させ、日付・金額・初期科目が5/5一致しました。1件の科目変更と☆追加も操作し、4形式からCSVを5ファイル保存して、それぞれ合計31,921円を確認しています。汎用CSVは2種類のファイルを出力します。これは5件の架空例に限る実行証拠で、100件の新規精度検証でも、実会計サービスへの取込確認でもありません。

v1.3.0の100件検証（2026-10-23）は別の過去記録です。金額・円額未確定97/97（返金3件除外）、日付99/100、暫定科目44/48、科目または保留条件86/100でした。改善にも使った同じ架空100件の回帰検証であり、未知の実物領収書での正答率を示しません。

[原本・期待値・差異（v1.3.0）](https://studio-yebisu.github.io/ryoshu/docs/testing/v1.3/) / [検証方法とレビュー](https://github.com/studio-yebisu/ryoshu/blob/e79394d7349efc15aadb2dc02f6fe381596b407d/docs/testing/v1.3/README.md) / [v1.3.2の画面・操作・導入の検証](https://github.com/studio-yebisu/ryoshu/blob/v1.3.2/docs/testing/v1.3.2/README.md) / [過去の記録](VERIFICATION.md) / [機械可読の更新記録](app-update.json)

v1.3.0時点の紹介ソースは[MIT](LICENSE)、映像は[利用条件](../../MEDIA-LICENSE.md)に従います。
