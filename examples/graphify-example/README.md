# 送料の関数を変えると、どこに響く？（Graphify の作例）

架空のECの送料関数 `shipping_fee` から、Graphify の公式コード `graphify/affected.py` で呼び出し元と仕様書を逆向きにたどった**保存済みの実行結果**を見るページと、無音24秒の解説動画のソースです。

- **影響探索は公式コードを実行**：`load_graph`・`resolve_seed`・`affected_nodes`・`format_affected` の4関数だけ（起点 `shipping_fee`、深さ3）。
- **関係の入力：コードは独自AST、仕様書は手動対応**：呼び出し2本は `run.py` の独自アダプター（Python標準ライブラリ `ast`）、参照3本は `run.py` 25行目に人が書いた対応表です。Graphify の抽出器が作った関係ではありません。
- **実行していないもの**：Graphify の CLI、tree-sitter による抽出、LLM による意味の抽出、MCP サーバー、`graphify install`・設定・フックの書き込み。インストールや認証情報も使っていません。
- ページと動画は保存結果を読むだけで、ブラウザーでは何も実行しません。

## 結果（outputs/result.json）

グラフ全体は **6ノード・5エッジ**。起点を除く **5ノード** が影響範囲として返りました。

| ノード | 深さ | たどった関係 | 根拠の行 | 関係の入力 |
|---|---|---|---|---|
| `checkout_total` | 1 | calls | `fixture/checkout.py:4` | 独自AST |
| `delivery_estimate` | 1 | calls | `fixture/estimate.py:4` | 独自AST |
| `shipping-policy.md` | 1 | references | `fixture/shipping-policy.md:2` | 手動 |
| `checkout-spec.md` | 2 | references | `fixture/checkout-spec.md:2` | 手動 |
| `estimate-spec.md` | 2 | references | `fixture/estimate-spec.md:2` | 手動 |

同じ実行で fixture の関数も実際に呼んでいます：3,999円 → 送料650円・合計4,649円、4,000円 → 0円・4,000円、5,000円 → 0円・5,000円。

### 送料改定（4,000円 → 5,000円）について

ページでは「変える前に確認する5か所」として上の表を使います。**変更案は説明用で、コードは変えておらず、変更後の金額も実行・計算していません。** 影響探索はグラフに入っている関係だけをたどるので、グラフにない呼び出し元・画面・テスト・メール文面などは出てきません。影響の取りこぼしがないことは保証できません。

## ファイル

| ファイル | 内容 | 作った人・工程 |
|---|---|---|
| `index.html`・`app.js`・`style.css` | 保存結果ビューア（図・ノードの原文・根拠・確認先） | Opus 5.5（この作業） |
| `graph-data.mjs` | 保存結果の読み込みと検査（6・5・5が合わなければ描かない）、図の配置、言葉 | Opus 5.5（この作業） |
| `video/index.html`・`video/scene.js`・`video/video.css` | 無音24秒の動画ソース | Opus 5.5（この作業） |
| `samples.json`・`request.txt` | 入出力の例・架空の依頼 | Opus 5.5（この作業） |
| `run.py` | 独自ASTアダプター・手動の対応表・公式関数の呼び出し・fixture の実行 | 既存（親工程） |
| `fixture/` | 架空のコード3・仕様書3 | 既存（親工程） |
| `outputs/result.json`・`graph.json`・`affected.txt` | 実行結果 | 既存（親工程が実行して保存） |
| `vendor/graphify/` | 上流の README・LICENSE・LICENSE-MIT・NOTICE・pyproject.toml・`graphify/` の一部 | 既存（上流のまま） |

`vendor/graphify/graphify/` には `affected.py` のほか `extract.py`・`build.py`・`analyze.py`・`ids.py` も同梱されていますが、実行したのは `affected.py` だけです。`__pycache__` は親工程の実行で生じたもので、このページは使いません。

## Opus執筆時点の確認状態

このフォルダーのページ・動画・README を書いた時点（Claude Opus 5.5、`claude-opus-5-5`）では、`run.py` を含めて何も実行していません。ブラウザーでの表示・操作、動画の書き出しも未確認です。`outputs/` の値は親工程が保存した実行結果をそのまま読んでいます。

## ページの仕組み

- 読み込み時に `outputs/result.json` と `outputs/graph.json` を読み、`status: passed`・起点・深さ3・上流コミット・6ノード・5エッジ・5件を確かめます。合わなければ図を描かずに止まります。
- 図は実線＝呼び出し（独自AST）、点線＝参照（手動で対応、仕様書には「手動」の印）、朱の枠＝影響あり（深さつき）。
- 「コードのみ」は同じ保存結果のうち calls でたどった2件だけを表示する絞り込みで、別の実行ではありません。「仕様書も見る」で仕様書3つと点線が加わり、5件に戻ります。
- ノードを選ぶと、`fixture/` の実ファイル全体を行番号つきで表示し、定義の行と根拠の行に印をつけます。仕様書を選ぶと、対応を書いた `run.py` 25〜27行目も表示します。
- 幅700px以下では縦の配置、それより広いと横の配置になります（`graph-data.mjs` の `LAYOUTS`）。

## 動画（video/）

- `window.motionConfig = {duration: 24, fps: 30, width: 720, height: 1280, posterTime: 12, audioEvents: []}`。`window.renderConfig` の `width`・`height`・`fps` を優先し、横長なら横の配置で組み直します。
- `window.motionReady` はフォントの準備と、`../outputs/` の2ファイルの読み込み・検査が終わると解決します。
- `window.seek(t)` は t だけから1枚を描きます。書き出し時（`window.__MOTION_RENDER__` または `?render`）は操作欄もタイマーも使いません。

| 秒 | 場面 |
|---|---|
| 0 | 起点 `shipping_fee` が現れる |
| 3 | 呼び出し2本（独自AST・実線）が呼ぶ側から伸びる |
| 8 | 仕様書3つが「手動」の印と点線でつながる |
| 13 | 公式 `affected.py` の逆向き探索：深さ1で3件、深さ2で2件、「影響5／グラフ6ノード・5エッジ」 |
| 19 | 残るファイル（result.json・graph.json・affected.txt・run.py・fixture・vendor）と、未実行のもの |

逆向き探索の点の動く順番と深さは `result.json` の `hits` の順と `depth` から決め、どのエッジをたどったかは `via_relation`・`via_file`・`via_location` が一致する `graph.json` のエッジで描きます。

```powershell
# 作例フォルダーで（確認用。Opus執筆時点では未実行）
py -3 -m http.server 8000 --bind 127.0.0.1
# http://127.0.0.1:8000/index.html
# http://127.0.0.1:8000/video/index.html （横は ?orient=wide）

# 実行結果を作り直す場合（親工程の手順。networkx が必要。この作業では未実行）
py -3 run.py
```

## 使いどころ

日本の受託開発で、送料改定のときにコードと仕様書の確認漏れを減らす。関数と仕様書の対応を同じグラフに入れておけば、「この関数を変えたら、どの仕様書を開くか」を一覧にできます。ただし対応表は人が保守する必要があり、影響の網羅は保証できません。

## 出典とライセンス

- 原典：<https://github.com/Graphify-Labs/graphify/tree/847a93f3cab5e2c82ea9170014b21cd2c52a4417>（`vendor/graphify/source.json`、既定ブランチ v8、取得 2026-10-22）。
- 現在の Graphify は **Apache License 2.0**（`vendor/graphify/LICENSE`）。`vendor/graphify/NOTICE` のとおり、ライセンス変更前に MIT で寄せられた部分は MIT の条件のままで、その原文が `vendor/graphify/LICENSE-MIT`（Copyright (c) 2026 Safi Shamsi）です。**両方の条件を同梱しています。**
- “graphify” は Graphify Labs の標章です。この作例は八百万図AIツールボックスの制作で、Graphify Labs の公式・提携ではありません。
- fixture・ページ・動画ソース・文章は八百万図AIツールボックスの制作で、新しいコードは MIT として扱います。ECサイト・送料・仕様書は架空です。

## 制作後の確認（2026-10-22）

制作担当が保存後のファイルを別に検査しました。[VERIFICATION.json](VERIFICATION.json) に実行した範囲・UI検査・制約を記録しています。原典やCADの全機能を実行したという意味ではありません。縦横の24秒無音MP4はサイトのmedia/に保存し、任意時刻の再描画一致と代表フレームを確認しました。独自コードは同梱LICENSE、完成メディアはMEDIA-LICENSE.mdの条件に従います。
