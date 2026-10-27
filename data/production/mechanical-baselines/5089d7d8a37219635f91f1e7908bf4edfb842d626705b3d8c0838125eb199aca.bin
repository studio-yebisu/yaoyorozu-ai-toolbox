# AssetFurnace 作例：CC0の木箱のGLBを、原典の圧縮CLIで3つの上限に縮める

ケース `assetfurnace-example`／カタログ `resource-assetfurnace`

## これは何か

**AssetFurnace**（旧 *Image to 3D Lab*、[Bingeljell/image-to-3dlab](https://github.com/Bingeljell/image-to-3dlab)）は、手元で動く3Dアプリ／パイプラインと、Pythonの補助CLI群です。原典のREADMEは、文章や画像から3Dを作り（Pixal3D・TRELLIS.2・Hunyuan3D・Stable Fast 3D などのバックエンド）、Finish でゲーム向けに仕上げ（リトポロジー・Pixel Match・圧縮）、リグと動きを付ける流れを説明しています。

- SKILL.md（AIが読む手順書）ではありません。同梱の `vendor/assetfurnace/README.md` は原典のアプリのREADMEです。
- 1つの生成モデル、ホスト型API、ブラウザーの中の生成器、自動で動く複数のAIエージェントでもありません。
- **この作例が実行したのは、その一部の補助CLI `scripts/compress_glb_textures.py` だけです。** 持ち込んだGLBのテクスチャを、形に触れずに再エンコードします。Finish の連鎖（`scripts/retopo_repaint.py`）の4段目「Compress」も同じ `compress()` を呼びますが、今回は連鎖ではなくCLIを直接、無改変で呼びました。
- 画像→3D生成、`pipeline.py`、リトポロジー、リペイント、ベイク、Pixel Match、リギング、ゲームへの組み込み、モデルの推論、ComfyUI は実行していません。
- 図の6つの部品は、この作例のために原典を読んで分けた説明の区切りで、公式の部品表ではありません。

## 役割

| 誰 | したこと | していないこと |
| --- | --- | --- |
| 作者AI（Claude Opus 5.5・`claude-opus-5-5`、1体） | 第1段階で `prepare_input.py`・`run_example.py`・`inputs/jobs.json`・`implementation.md` を書いた。第2段階でこのページ（`index.html`・`concept.js`・`concept.css`）・無音の説明映像の編集ソース（`video/`）・このREADME・`samples.json`・記事を書いた | コマンド・Blender・原典CLIの実行、描画や書き出し、表示の確認 |
| 親の作業（済） | 固定コミットの公式 Git blob 532件の生のバイト列を非公開で照合し、読むための10ファイルを `vendor/assetfurnace/` に原文のまま置いた。以前の作例の入力5ファイルを複製した。three.js 0.180.0 を以前の作例から無改変で再利用した | 原典やモデルの書き換え |
| 制作担当 | 専用環境で `run_example.py` を1回実行した（中身は環境の確認1回・Blenderの包装1回・原典CLI 3回）。結果を測り、公開する記録とファイルを選び、図の事実（`concept/facts.json`）と素材一覧（`concept/manifest.json`）を作って凍結した | 図のための再実行、追加の生成 |
| このページのブラウザー | 保存済みのファイルを確かめてから、同じ実GLBを表示し、保存を手渡す | 圧縮、生成、モデルの呼び出し、アップロード、外部APIへの通信 |

## 固定した版

| 項目 | 固定値 |
| --- | --- |
| ソース | [Bingeljell/image-to-3dlab @ 91879333e88a0571945b15b0e21e4bc95ec59e31](https://github.com/Bingeljell/image-to-3dlab/tree/91879333e88a0571945b15b0e21e4bc95ec59e31)（Apache-2.0・`NOTICE` あり） |
| 実行したCLI | `scripts/compress_glb_textures.py`（12,929B・git blob `f58420d6d7cc91d0f457982e82306b217ca96271`・無改変） |
| 版の表記 | CHANGELOG の最新は 0.4.4（2026-10-14）ですが、README の冒頭には 0.4.0 の下書き注記が残っています。リリースタグは推測せず、コミットで特定します |

`vendor/assetfurnace/` の10ファイル（README・LICENSE・NOTICE・CHANGELOG・`scripts/README.md`・`compress_glb_textures.py`・`retopo_repaint.py`・`blender_retopo_bake.py`・`image_to_3dlab/blender.py`・`viewer/finish_api.py`）は、読むための抜粋です。**これだけではアプリ全体は動きません**（一覧は `UPSTREAM.json`）。

## 入力：同じ1つのGLB

- **元の5ファイル**：Poly Haven「[Wooden Crate 01](https://polyhaven.com/a/wooden_crate_01)」（James Ray Cock・CC0）の 1k の glTF・.bin・JPEG 3枚。以前の 3D Asset Server 作例で取得したものを、バイト単位でそのまま再利用しました。新しいダウンロード・API・AIによる生成はしていません。メッシュ3・マテリアル1・三角形6,576。
- **包装（AssetFurnace の処理ではありません）**：制作担当が Blender 5.2.1 LTS（glTF I/O 5.2.40）を `--background --factory-startup` で1回だけ動かし、`prepare_input.py` で5ファイルを1つのGLB `outputs/input/packed_input.glb`（2,276,520B・SHA-256 `cffd8d4fc47cb704fdb8b67f7aab1cb769fa1decb1d7910f787232598c3bdacc`）に書き出しました。結合・間引き・リメッシュ・テクスチャの差し替え・ベイク・レンダリングはしていません。記録は `outputs/preparation.json`。
- **元との関係**：埋め込んだ画像3枚のバイト列は元のJPEGと同じです。一方、Blenderでの書き出しなので、BINの並びは元の `.bin` と同じではありません。ノードごとのメッシュの範囲と変換は許容誤差 1e-5 で元と一致しました。**圧縮の前後の比較は、すべてこの入力GLBに対して行っています。**
- **材料の割り当て**：baseColorTexture（色）・metallicRoughnessTexture（数値）・normalTexture（数値。法線）の3つ。元のファイル名に ARM とあっても occlusionTexture の割り当ては無いので、AOの画像として扱っていません。

## 実行した3つの設定と、実際の結果

制作担当の環境：Windows 10・AMD64・CPU、Python 3.11.15・Pillow 11.3.0（原典CLIは `python -I` で実行）、Blender 5.2.1 LTS。スレッド関連の環境変数を4、このプロセスを4コアに固定（`SetProcessAffinityMask`、自分のプロセスだけ）。同じ入力GLBから、無改変の原典CLIを3回呼びました。

```text
<python> -I <upstream>/scripts/compress_glb_textures.py outputs/input/packed_input.glb outputs/outputs/<id>.glb
  --format png --quality 90 --map-quality 90 --max-size N --map-size N --normal-size N   （N = 1024 / 512 / 256）
```

| 設定 | 出力GLB | 画像3枚の結果 | 画像の合計 | 入力比 |
| --- | --- | --- | --- | --- |
| `cap1024` | `outputs/outputs/cap1024.glb` 2,276,520B | 3枚とも**保持**（JPEG 1024×1024 のまま） | 2,082,067B | 100%・**入力と全バイト同一** |
| `cap512` | `outputs/outputs/cap512.glb` 1,315,140B | 3枚とも**置換**（PNG 512×512） | 1,120,687B | 57.8% |
| `cap256` | `outputs/outputs/cap256.glb` 473,124B | 3枚とも**置換**（PNG 256×256） | 278,680B | 20.8% |

画像ごとの値（元はすべて JPEG 1024×1024）：

| 画像 | 元 | 512上限 | 256上限 |
| --- | --- | --- | --- |
| 色（baseColor・image 1） | 711,292B | PNG 412,060B | PNG 104,281B |
| 数値（metallicRoughness・image 2） | 776,699B | PNG 383,785B | PNG 97,377B |
| 法線（normal・image 0。数値の一つ） | 594,076B | PNG 324,842B | PNG 77,022B |

- **要求と実際は別です。** 3回とも PNG と同じ上限を要求しましたが、原典は再エンコードの結果が元より**小さいときだけ**画像を置き換え、そうでなければ元の画像のバイト列・MIME・寸法をそのまま残します。1024上限では 1024×1024 の画像は上限を超えないので縮めず、PNGにした候補が元のJPEGより小さくならなかったため、3枚とも保持され、置換が0枚なので原典は入力をそのまま返しました。原典CLIの出力にも `kept, re-encoding was larger` とあります。捨てられた候補PNGは保存されないので、そのバイト数や画素は記録にありません。
- `--quality 90`・`--map-quality 90` は引数として渡しましたが、PNGの保存（`optimize=True`）には使われません。PNGは渡された画素をそのまま保存しますが、LANCZOSで縮小した時点で画素は変わります。**見た目が劣化しないとは言いません。**
- **形**：画像以外の12view（191,040B）はバイト列のまま写され、オフセットだけが組み直されます。制作担当の別工程で、3つの出力それぞれについて、画像とbuffer以外のJSON・画像以外の全bufferViewのバイト・三角形と頂点の数が入力GLBと一致しました。これは**この入力GLBに対する、この3つの出力**の照合で、ほかの種類のGLBやライブラリ全般の正しさ、見た目の同等性、ゲームでの適性、表示性能を示しません。
- **時間**：1.183秒・0.52秒・0.262秒は、インタプリタの起動を含むこのマシンでの1回きりの壁時計の値で、性能の指標ではありません。

### 公開する測定と、原典のファイル

| ファイル | 中身 |
| --- | --- |
| `outputs/outputs/cap1024.glb` ほか | 原典CLIが書いたGLBそのもの（ネイティブの出力） |
| `outputs/stdout/<id>.txt` | 原典CLIが標準出力に書いたテキストの全文（240／176／176B。絶対パスを含みません） |
| `outputs/results.json` | 制作担当のランナー（`run_example.py`）が実ファイルから測った値の射影です。原典のネイティブJSONでも、モデルの出力でもありません。原典CLIの出力はテキストとGLBだけです |
| `outputs/preparation.json` | Blender の包装スクリプトが書いた記録（版・読み込んだメッシュと三角形・範囲・書き出しの設定） |

実行の全記録（絶対パスを含む呼び出しなど）は非公開で保管し、ここには含めていません。

## ページ（`index.html`）

- 大きな構造図が先頭です。「①何か・②渡す・③返る」で同じ図の上の形の位置と強調が変わり、つながりはどの段階でも同じです。原典と依頼→作者AI→制作担当（包装1回・CLI 3回）→入力GLB→形（そのまま）と画像3枚に分かれる→上限→小さければ置換→同じ形と画像が出力GLBに戻る→容量を比べる→回す・保存、の流れです。点線の「生成・Finish」はアプリの広い機能の文脈で、実行した経路ではありません。
- 図の画像の小片は、GLBに埋め込まれた実際の画像の縮小表示です。形の12本は、画像以外の12viewの実際のバイト数の比です。
- 「1024上限・512上限・256上限」は保存済みの3つの結果を読み替えるだけで、CLIを再実行しません。URLの `#cap1024`・`#cap512`・`#cap256` で開けます（既定と、分からない値は `#cap1024`）。
- 番号の付いた6つの部品を押すと、固定版の原典の該当行（同梱ファイルとGitHub）と、その部品で実際に起きたことを読めます。引用は読み込み時に原典の行と一字一句照合しています。
- 「実際のGLBを回す」では、入力GLBと選んだ設定の出力GLBを、three.js 0.180.0（同梱・MIT）の GLTFLoader で、確かめたバイト列から読み込んで表示します。4つのGLBで同じカメラ・照明・大きさを使い、ケースを切り替えても向きを保ちます。左右・上から・元の向きのボタン、左右のドラッグ、矢印キーで回せます。自動では回りません。
- 保存は3つ：選んだ設定の出力GLB（原典CLIが書いたファイルそのまま）、入力GLB、実測の記録 `results.json`。どれも確かめたバイト列です。保存はブラウザーへの依頼で、保存が終わったことまでは確かめられません。詳細の「原典とファイル」には、同じファイルと元の5ファイルへの直接のリンクもあります。元の5ファイルをまとめたZIPはありません。
- 読み込みでは `concept/manifest.json` を `no-store` で取り、SHA-256 を固定値 `6caba83d259fc7f8aa61c37ec918bd3d6b7fc3c2378650b0bd61aa76fa39d6dc` と比べ、一覧の39ファイルすべての大きさとSHA-256、facts、引用、ジョブ、実測の記録、4つのGLBの中身と three.js で読んだ形を確かめます。HTTPの失敗・壊れたJSON・ハッシュの不一致のどれでも、図・3D・保存を止め、前の結果とURLも片付けてから、理由と「もう一度確かめる」を出します。WebGLが使えない環境では3D表示だけを止め、理由を出します。
- テーマ（明暗）と動きを減らす設定は図の見た目だけに効き、原典の設定や出力には関係しません。外部のフォント・CDN・API は使いません。

## 無音の説明映像（`video/`）

32秒・30fps・縦720×1280／横1280×720の編集ソースです。音声トラック・ナレーション・音声ガイドはありません。詳しくは [video/README.md](video/README.md)。MP4・ポスターの書き出しと確認は、制作担当が後の工程で行います。

## 自分で再現するとき

この作例の制作では、凍結した3つの結果を作り直すことはありません。図もページも、保存済みのファイルを読むだけです。読者が自分の環境で同じ手順を試すことはできます。

必要なもの：

- 固定コミットの**フルチェックアウト**（同梱の `vendor/assetfurnace/` だけでは足りません）。
- 専用の Python 3.11 の環境と **Pillow 11.3.0**（ランナーは版が違うと止まります）。原典CLIで圧縮するだけなら、必要な依存は Pillow だけです。AssetFurnace の広い機能の依存・モデルの重み・GPU・ComfyUI は、この範囲には要りません。
- 入力をGLBにまとめるための **Blender 5.2.1**（自分でインストールしたもの。ランナーは版を確かめます）。

```powershell
git clone https://github.com/Bingeljell/image-to-3dlab.git <upstream>
git -C <upstream> checkout 91879333e88a0571945b15b0e21e4bc95ec59e31
py -3.11 -m venv <venv>
<venv>\Scripts\python -m pip install Pillow==11.3.0

# 作例フォルダーで。--out は作例フォルダーの中の、新しいか空のフォルダー（outputs/ と inputs/ は使えません）
<venv>\Scripts\python -I run_example.py --upstream <upstream> --blender <Blender 5.2.1 の実行ファイル> --out runs\repro-01
```

- ランナーは、原典CLI・LICENSE・NOTICE のハッシュと入力5ファイルを確かめてから、Blender の包装を1回、原典CLIを3回だけ呼びます。再試行はせず、失敗は失敗として `results.json` に残します。
- `--out` の中の `private/` には、絶対パスを含む呼び出しと標準出力・標準エラーの全文が入ります。公開しないでください。
- 包装はBlenderでの書き出しなので、Blenderの版や設定が違えば入力GLBのバイト列は変わりえます。圧縮の比較は、そのとき作った入力GLBに対して行われます。
- 出た形（メッシュ）と画像の見た目は、実際に開いて目で確かめ、使うゲームエンジンやビューアーでも確かめてください。

このページ・映像をローカルで開くときは、`site/`（公開後は `examples/` と `media/` がある階層）をルートにしてローカルサーバーを起動します（`file://` では確認ができません）。

```text
python -m http.server 8000 --bind 127.0.0.1
# http://127.0.0.1:8000/index.html  （公開後の配置では /examples/assetfurnace-example/index.html）
```

## ライセンス

- この作例のページ・図・説明映像・ランナー（`prepare_input.py`・`run_example.py`）：八百万図AIツールボックス、MIT（`LICENSE`）。
- AssetFurnace（image-to-3dlab）のソース：Apache-2.0（`vendor/assetfurnace/LICENSE`・`NOTICE`）。再配布では `NOTICE` を残し、リポジトリへのリンクを付けます。この作例のMITとは別です。
- 木箱：Poly Haven「Wooden Crate 01」、James Ray Cock、CC0（https://polyhaven.com/license）。素材の条件とコードのライセンスは別のものです。圧縮した出力GLBは、この素材から派生したファイルです。
- three.js 0.180.0：MIT（`vendor/three/LICENSE`）。以前の作例から無改変で再利用しています。
- Blender と Pillow は、それぞれのライセンスで別にインストールした依存で、同梱していません。モデルの重みは使っていないので、モデルの利用条件に同意したとは言いません。詳しくは `THIRD_PARTY_NOTICES.md`。

## まだ確かめていないこと

- 出力の見た目（画質）の人による確認と承認、ゲームでの適性、表示性能、実機・本番での採用。
- ほかの入力・ほかの形式（WebP・JPEG）・ほかの上限での結果、ライブラリ全般の正しさ。
- Blender 5.2.1 の読み取りだけの事前確認では `quadriflow_remesh` が無く、リトポロジーは試していません。回避策の追加もしていません。ほかの生成バックエンドは、別の環境・重み・利用条件が要るため選んでいません。ComfyUI（8190番）とほかの作業には接続も変更もしていません。
- **作者の執筆時点では、このページと説明映像の表示・描画・書き出し・公開の確認は未実施（PENDING）です。** 320px・375px（特に375×812）の表示、6つの引用、3つのケースと3つの段階、壊れたファイルでの停止と再試行、実GLBの3D表示と保存、映像の代表コマ・任意時刻・静止・無音のMP4は、制作担当が別工程で確かめて `visual-verification.json` に記録します。編集ソースと実出力をまとめた `source.zip` も、制作担当が後で梱包します。実機の iOS Safari・VoiceOver・200%拡大、人による承認も未確認です。


## 制作担当による後工程の追記

作者の上記「執筆時点」の記録と、制作担当が後に行った検査は別です。新しい図の18スマホ状態・6原典引用・16表示条件・3種類のデータ破損停止と復旧、実GLB4本の表示と同じカメラでの比較、保存要求5件と返却5ファイルの全バイト一致、編集39素材・7場面・縦横14場面・任意7.2秒・通常32秒再生・ネイティブrange0.1秒を確認しました。縦横32秒・960フレーム・音声トラック0のMP4は全デコードとブラウザーで自然終端まで確認しました。描画の代表16枚・連続12枚・contact/poster/stripは各向きに残しています。人の審美的承認、実機iOS/Safari/VoiceOver、200%ズーム、全入力や性能・ゲーム組込みの保証はありません。詳細と確認範囲は visual-verification.json を参照してください。

同梱の10ファイルはアプリ全体の代わりではありませんが、今回の未改変 compress_glb_textures.py 自体は Python と Pillow だけで動く独立した補助CLIです。本ランナーが照合する scripts/compress_glb_textures.py / LICENSE / NOTICE は同梱しています。UPSTREAM.json のフルチェックアウトが必要という記述はアプリ全体に関する導入の説明で、圧縮補助CLIにモデルや他backendが必要という意味ではありません。本番制作では既に固定フルcheckoutを用意してこの同じ原本を実行しました。配布用に圧縮を再実行してはいません。

source.zip はリポジトリのルート配置（examples/assetfurnace-example と media と LICENSE）です。空のフォルダーに展開し、その展開ルートで `python -m http.server 8000` を起動して、`http://127.0.0.1:8000/examples/assetfurnace-example/index.html` または `http://127.0.0.1:8000/examples/assetfurnace-example/video/index.html` を開きます。記事の共通サイトは配布に含まれないため、元の公開サイトを参照してください。file:// ではハッシュ検査やモジュールの読込は動きません。

映像を描き直すための汎用Motion Reelランタイムは tools/motion-reel に同じ原本5ファイルを同梱し、依存のnode_modulesやChrome本体は同梱していません。依存を別途 `npm ci --prefix examples/assetfurnace-example/tools/motion-reel` で用意し、展開ルートで `python examples/assetfurnace-example/render_visual.py --out ../fresh-portrait --width 720 --height 1280 --strip-at 16.4` を実行します。横は別の新規出力先と `--width 1280 --height 720` を指定します。--stills-only はMP4を作らず同じ代表/連続コマを描きます。既存出力への上書きを拒否します。任意の再現は利用者が行うもので、この制作のBlender包装1回・圧縮CLI3回の凍結結果とは別です。
