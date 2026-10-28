# 通知カット差し替え版の編集・再生成

この版は動画の注意表示だけを更新します。アプリのバージョンは変更しません。

- 元動画 `media/ryoshu-copy-renewal-20261026/ryoshu-promo-v1.4.0.mp4` は不変の入力として扱い、上書きしません。
- 旧9秒の `notes` シーンだけを、動作要件・補助・税務判断を案内する33秒の3枚へ差し替えます。既存の最終CTAは24秒後へ移動し、総尺は202.967秒です。
- 既存のv1.4.0の実操作映像と結果を保持します。OCR・モデルのベンチマークは再実行していません。
- 日本語文案はKimi作の `notice-deck.ja.json`、映像・動き・音の設計はOpus作の `plan.json` を参照してください。

再生成コードは `source/render_notices.py` です。次のコマンドで再生成します。

```sh
python source/render_notices.py --base ../ryoshu-promo-v1.4.0.mp4 --expect-sha256 910f3e24c44d7d50a56b0328443cd3172131d460d07d5d16729d5e5827bca0ab --deck notice-deck.ja.json --manifest ryoshu-1.4-film.edit-manifest.json --base-copy ryoshu-1.4-film.rendered-copy.json --audio-source source/audio.py --out build-reproduced
```
