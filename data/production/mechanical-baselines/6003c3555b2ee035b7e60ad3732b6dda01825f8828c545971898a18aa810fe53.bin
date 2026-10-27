# 受け止めた瞬間の、青い防御ヒット（Effekseer VFX の作例）

架空のアクションゲームのガードを、原典の [effekseer-vfx](vendor/effekseer-vfx/SKILL.md) スキル（kanaworksai-hue/effekseer-vfx-skill、固定コミット `c28919890f0483c0f968a884ea03979803d3b528`、skill 0.2.0、MIT）で作った作例です。依頼からブリーフとレシピを書き、Effekseer CoreのビルドとGodotの実描画を3回行い、フレームを見て調整しました。

- `index.html`：保存した実際の描画（f0〜f30）を1フレームずつ見る画面。ブラウザーではGodotもEffekseerも動かしません。
- `library/vfx/`：効果のライブラリ（レシピ・ブリーフ・展開したレシピ・`.efkefc`・`.efk`・使ったテクスチャ・`vfx_manifest.json`）。
- `assets/`：Godotで描画したフレーム、0.5秒の動画（f1〜f30、60FPS、1280×800、無音）、一覧画像。
- `capture-manifest.json`：各フレームの番号・時刻・パス・SHA-256。
- `samples.json`：依頼（入力）と結果（出力）。
- `video/`：28秒の解説動画のソース（1280×720、30fps、無音）。

## 効果

| 項目 | 値 |
|---|---|
| ID | `VFX_Yebisu_Guard` |
| 長さ | 0.5秒（レシピは60FPSで30フレーム） |
| 層・粒子の上限 | 15層・27 |
| 乱数の種 | 1729 |
| 描画した環境 | Windows x64、Godot 4.7 stable（Forward+）、公式 EffekseerForGodot4 1.80.5.1 |
| ビルド | Effekseer Core 1.80.7、.NET 9.0.20 |

制作環境では、原典の `brief-validate`・`lint`・`build`（保存して開き直す読み戻しつき）を実行し、標準の舞台で f0〜f30 と f36 を撮影しました。効果だけを見る設定（bare）と明るい背景（bright）でも描画して確認しています。明るい背景では、光を足して描く部分が淡く見えます。

レシピを見ていない別のAIが最終のフレームを採点して `ship`（read 2・timing 3・layering 3・shape_change 3・motion 2・placement 3・tail 3・identity 2）と判定し、原典の `review-submit`・`overview`・`effect-verify` で `verified: true`（evidence `1baab471467543aaa685f60514924a1b`）になりました。これは独立したAIのレビューで、人による承認や実機での性能確認ではありません。原典の `TestApi.gd` では12項目の確認が通りました（飛び道具・ビーム・実機の性能は対象外）。

## 手元で作り直す

以下は、この作例のフォルダ（`index.html` のあるフォルダ）から実行します。`--project library` は、効果のライブラリ `library/vfx/` を指します。

### 必要なもの

- **ビルドと描画**：Windows x64 または Apple silicon の macOS。Linuxはレシピの作成とlintだけです。
- **Python 3.11 以上、または uv**。
- **Godot 4（Forward+）**：自分で導入します。PATHにない場合は環境変数 `GODOT` に実行ファイルを指定します。
- **初回のダウンロード**：`setup` が Effekseer Core・.NET 9 ランタイム・Pythonの依存を約250MB、`~/.cache/effekseer-vfx`（Windowsは `%USERPROFILE%\.cache\effekseer-vfx`）に入れます。最初の `init` は公式の Effekseer の Godot プラグイン（約34MB）を取得します。どちらも原典のスクリプトがSHA-256を照合して取得するもので、この作例のフォルダには含まれていません。Godot・プラグイン・Core・.NET・制作時の記録（`vfx/work/` や受領記録）は同梱していません。

`vendor/effekseer-vfx/` は固定コミットのスキルを変更せずに置いたものです。レシピの書き方や手順を変える場合も、スキルではなく `library/vfx/` 側を編集してください。

### Windows（PowerShell）

```powershell
# 1. この環境でできることを確かめる
.\vendor\effekseer-vfx\scripts\vfx.cmd --project library doctor

# 2. 初回だけ：ツールを準備する（約250MB）
powershell -NoProfile -ExecutionPolicy Bypass -File .\vendor\effekseer-vfx\scripts\setup.ps1

# Godot が PATH にない場合
$env:GODOT = "C:\Tools\Godot\Godot_v4.7-stable_win64_console.exe"

# 3. Godotの確認用の舞台を作る（初回はプラグイン約34MBを取得。既存のファイルは上書きしない）
.\vendor\effekseer-vfx\scripts\vfx.cmd --project library init

# 4. 確かめてビルドする
.\vendor\effekseer-vfx\scripts\vfx.cmd --project library brief-validate VFX_Yebisu_Guard
.\vendor\effekseer-vfx\scripts\vfx.cmd --project library lint --ids VFX_Yebisu_Guard --timeline
.\vendor\effekseer-vfx\scripts\vfx.cmd --project library build --ids VFX_Yebisu_Guard

# 5. Godotで描画して、返ってきた画像を開いて見る（デスクトップにGodotの窓が開きます）
.\vendor\effekseer-vfx\scripts\vfx.cmd --project library review --ids VFX_Yebisu_Guard --note "rebuild of the published example"
```

### macOS（Apple silicon）

```sh
sh vendor/effekseer-vfx/scripts/vfx --project library doctor
sh vendor/effekseer-vfx/scripts/setup.sh            # 初回だけ（約250MB）
export GODOT=/Applications/Godot.app/Contents/MacOS/Godot   # PATH にない場合
sh vendor/effekseer-vfx/scripts/vfx --project library init
sh vendor/effekseer-vfx/scripts/vfx --project library brief-validate VFX_Yebisu_Guard
sh vendor/effekseer-vfx/scripts/vfx --project library lint --ids VFX_Yebisu_Guard --timeline
sh vendor/effekseer-vfx/scripts/vfx --project library build --ids VFX_Yebisu_Guard
sh vendor/effekseer-vfx/scripts/vfx --project library review --ids VFX_Yebisu_Guard --note "rebuild of the published example"
```

`review` は帯状の一覧画像、要所のシート、フレームのパスを返します。目印（flags）だけで判断せず、画像を開いて見てください。

### 独立したレビューと確認

作った本人は採点しません。`review-handoff` が書き出す指示書を、レシピを見ていない別のエージェント（またはユーザーが開いた新しいセッション）にそのまま渡します。`vendor/vfx-review/` は、その採点役のスキルです。

```powershell
.\vendor\effekseer-vfx\scripts\vfx.cmd --project library review-handoff VFX_Yebisu_Guard
# 別のエージェントが report_file を書いたあと（evidence_id と report_file は review-handoff の出力どおり）
.\vendor\effekseer-vfx\scripts\vfx.cmd --project library review-submit <evidence_id> <report_file> --reviewer <別のエージェントのID>
.\vendor\effekseer-vfx\scripts\vfx.cmd --project library overview
.\vendor\effekseer-vfx\scripts\vfx.cmd --project library effect-verify VFX_Yebisu_Guard
```

macOSでは `.\vendor\effekseer-vfx\scripts\vfx.cmd` を `sh vendor/effekseer-vfx/scripts/vfx` に置き換えます。`--reviewer` には `author` や `self` ではなく、採点したエージェントやセッションのIDを入れます。

Godotでの呼び出しを確かめる場合（`init` のあと）：

```sh
godot --path library/vfx/godot --fixed-fps 60 --script res://scripts/TestApi.gd
```

### 確認は引き継がれない

この作例の `verified: true` は、制作環境で撮った描画と記録に基づきます。その記録（`vfx/work/`）は公開していないので、ダウンロードしたフォルダで `effect-verify` を実行しても、そのままでは `verified: true` になりません。手元で確かめるときは、上の build → review → 独立したレビュー → overview → effect-verify を一通り行ってください。

公開した `.efk` をそのまま使うだけなら、作り直す必要はありません。**レシピ・ブリーフ・テクスチャを変えた効果は、別の効果として改めてレビューが必要です。** この作例の採点と確認は、変えたビルドには当てはまりません。

`library/vfx/recipes/VFX_Yebisu_Guard.json`（展開したレシピ）は、テクスチャとマテリアルのパスだけを、制作環境の絶対パスからプロジェクトからの相対パスに直しています。`build` を実行すると作り直されます。

## ゲームで使う

原典の [references/godot.md](vendor/effekseer-vfx/references/godot.md) のとおり、`init` が作る `library/vfx/godot/` の `scripts/Vfx.gd`・`scripts/VfxHandle.gd`、`effects/`（`resources/` を含む）、`vfx_manifest.json` をゲームの同じ `res://` の位置へ写し、Effekseerのプラグインを有効にして、`Vfx` をAutoloadに登録します。

```gdscript
var handle = Vfx.play("VFX_Yebisu_Guard", position)
```

実際のゲームへの組み込みと、端末での性能は試していません。

## ライセンス

- この作例の画面・文章・レシピ・ブリーフ・映像ソース・撮影した画像と動画は 八百万図AIツールボックス の独自制作で、[MIT License](LICENSE) です。
- `vendor/effekseer-vfx/` と `vendor/vfx-review/` は KanaWorks_AI によるMIT Licenseのスキルで、[LICENSE](vendor/LICENSE)、各スキルの `LICENSE`、[THIRD_PARTY_NOTICES.md](vendor/effekseer-vfx/THIRD_PARTY_NOTICES.md) を変更せずに残しています。`scripts/effekseer_ai/` は laodeng000/effekseer-ai（MIT）に由来します。
- `library/vfx/materials/` と数式で作るテクスチャは、原典スキルの `vfx init` とテクスチャのコードが書き出したもので、原典のMIT Licenseに従います。
- Effekseer Core（MIT、Effekseer Project）、EffekseerForGodot4（MIT）、.NET ランタイム（MIT）、Pythonの依存は、初回の準備で公式の配布元から取得するもので、この作例には含みません。Godot は各自が自分のライセンスのもとで導入します。
- Effekseer と Godot はそれぞれの権利者の商標です。この作例はそれらの団体と関係ありません。
