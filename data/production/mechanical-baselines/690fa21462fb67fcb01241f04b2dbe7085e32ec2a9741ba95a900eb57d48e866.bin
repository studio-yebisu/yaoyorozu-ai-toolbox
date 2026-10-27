# OpenVoice — 声を、着替える。

「元の音声 ＋ 声色の見本 → OpenVoice → 変換後」を、大きな図から聞き比べる作例です。図の再生ボタンを押し、落ち着いた声 / 明るい声を選び、変換済みのWAVを保存できます。3件すべての詳細は comparison.html にあります。

## 開く

展開したサイトのルートをHTTP配信して、この作例のindex.htmlを開きます。閲覧にWindows、Python、モデル重みは不要です。ブラウザーは実行済みのファイルを再生し、新しい変換やアップロードは行いません。各WAVは実行記録のSHA-256と照合してから使います。

## 実際に行った処理

固定版myshell-ai/OpenVoiceの無改変ToneColorConverterをCPUで使いました。原典の既定コンストラクターでWavMarkも読み込み、load_ckpt、4本のextract_se、3件のconvert(tau=0.3)、各出力のdetect_watermarkを実行しました。原典の初期化を迂回したり、属性を手で置き換えたりしていません。

Irodori-TTSの合成音声で案内2本（オリジナルの案内声）と見本2本（落ち着いた声 / 明るい声）を作成。V01・V03は同じ「ようこそ案内」で声色だけを変えた組です。V02は「閉館案内→落ち着いた声」です。元の音声を含む7本のWAVと、固定した原稿・組み合わせ・設定を残しています。

初回83項目の技術確認、独立したPython標準ライブラリのRIFF/PCM照合116項目が通りました。別のPythonプロセスでも3本の変換WAVと4つの埋め込みが同じバイト列でした。元WAVの透かしSYEBISU!は3件で復号一致。これらは音の自然さや本人一致の保証ではありません。補助のWhisper転記には原音も変換後も誤認識があります。音を聴いた校正、実機iOS/Safari、VoiceOver、人による最終映像承認は未確認です。

## 同梱音声で再実行

Python3.10.11、torch2.5.1+cpu / torchaudio2.5.1+cpu、numpy1.22.0、librosa0.9.1、wavmark0.0.3を使用。旧librosaが読むpkg_resourcesのためsetuptools75.8.2を固定しています。全依存はrequirements-cpu.txtに記録しました。OpenVoiceの全TTS/VAD環境をインストールした、という意味ではありません。

新しい専用の仮想環境を作り、この作例のフォルダーで実行します。重み・cache・出力は作例の外へ置きます。

```text
python -m venv ../openvoice-env
../openvoice-env/Scripts/python.exe -m pip install -r requirements-cpu.txt
../openvoice-env/Scripts/python.exe download_models.py --model-dir ../openvoice-models --wavmark-cache ../openvoice-wavmark-cache
../openvoice-env/Scripts/python.exe run.py --model-dir ../openvoice-models --wavmark-cache ../openvoice-wavmark-cache --out ../openvoice-new-results
```

download_models.pyは公開・MITの固定重みだけを取得し、ハッシュを照合します。既存の異なるcache参照を書き換えません。run.pyは検証済みのcacheをオフラインで読み、既存の出力を上書きしません。同梱の4本のWAVを使う限り、TTSで再合成する必要はありません。

原稿から作り直す場合は、別途公式Irodori-TTSをtts-lock.jsonの固定コミットで導入し、固定重みと依存モデルを準備します。synthesize.pyに --tts-root、--tts-python、--checkpoint、--hf-cache、--out を明示します。既存音声は上書きせず、オフラインで4本を生成して22050Hzへ変換します。閉館案内の参照は、今回作った元案内声です。重みと環境は同梱しません。同じ設定でも別環境で生成音声の全bytesが一致する保証はありません。

## 動画を編集・再描画

video/index.htmlに編集できる概念図アニメーションがあります。36秒、30fps。元音声の全体、見本の3.5秒抜粋、実際の変換後の全体を、図の強調と合わせています。録画の連続操作ではなく、実音声・実データを使った説明映像です。見本の抜粋だけ末尾20msをフェード。元と出力のPCMは編集用ミックスにもそのまま配置しました。MP4は書き出し時に音量調整とAAC圧縮を行い、元のダウンロードWAVは変えません。

```text
npm ci --ignore-scripts --no-audit --no-fund --prefix tools/motion-reel
python render.py --out ../render-portrait --width 720 --height 1280
python render.py --out ../render-wide --width 1280 --height 720
```

既存の書き出しを上書きせず、新しい空の出力先を使います。seek(t)は時刻だけから描画します。実際の確認結果はverification.jsonにまとめます。

## 原典・利用条件

- OpenVoice: myshell-ai/OpenVoice、74a1d147b17a8c3092dd5430504bd83ef6c7eb23、MIT。原典23ファイルとLICENSEを同梱。
- OpenVoice V2変換器: 公式myshell-ai/OpenVoiceV2、f36e7edfe1684461a8343844af60babc2efbb727、MIT。config/説明と重みのハッシュを同梱し、約131MBの重み自体は除外。
- WavMark0.0.3と公式M4869/WavMark、0ad3c7b74f641bddb61f6b85cdf2de0d93a5bfef、MIT。原典ソース15ファイル・LICENSEと重みのハッシュを同梱し、約10MBの重みとcacheは除外。
- 元の文章・デモUI・映像編集ソースとMotion Reel同梱ツール: 八百万図AIツールボックス、MIT。原音はIrodori-TTSによる独自文章の合成音声です。

モデル実行履歴全文・認証・私的な統括スキル・巨大重み・cache・venv・node_modulesは配布物に含めません。Opus5.5は作例の実装・最終UI・映像ソースの制作範囲です。音声変換はOpenVoice、原音の合成はIrodori-TTS、承認された最初の図の見本と実行・照合・統合は親エージェントの担当です。


元音声のTTSは Aratako/Irodori-TTS-v4.1-Small 2b28324dc263ed5e6638b3cf3dd94c82ead07b4b、MITです。コードの固定版・重みのハッシュはtts-lock.json、利用条件と倫理制約はvendor/irodori-metadata/MODEL_CARD.mdに残しています。参照なしのオリジナル合成声で、実在者の声を模していません。内部IDとファイル名ichiro/sayakaは初稿からの識別子で、Windows音声を使用している意味ではありません。制作側がTTS素材・実変換・波形・ハッシュ・短い声色ラベルを差し替え、Opus5.5が制作した図の動きは保持しています。動画の小さい選択チップは「穏やか」「明るい」と短く表示します。


## 完成後の確認

36秒の縦版・横版を30fpsで書き出し、代表フレーム・連続フレーム・360px表示・終端、任意時刻の別順と新ページのPNG一致、全デコードとブラウザーでのMP4再生終了を確認しました。合成音声の聴感、人による最終映像承認、実機iOS/Safari/VoiceOverは未確認です。

固定版の通常のToneColorConverterで3件を実変換し83検査、独立PCM116照合と別プロセスのWAV・声色データ一致を確認しました。最終の概念図UIと映像編集ソースはOpus5.5、原典APIの実行・独立照合・音声編集・書き出しと配布は制作側が担当しています。ブラウザーは保存済みの音声を再生します。
