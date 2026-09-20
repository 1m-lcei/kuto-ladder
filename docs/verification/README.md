# 2.0 検証記録

比較基準: `8e4ad79`。作業ブランチ: `feat/2.0-standard-first`。
Windows上で、同一ブラウザー・同一フォント・deviceScaleFactor=1の旧新版を比較。
mainへの統合、push、Pagesへの公開は行っていません。

ユーザーから「確認できる範囲で作業すればよい」と指示を受けたため、全製品の
安定版・直前版とモバイル実機の網羅は完了条件から外し、実行対象を下記に限定しました。

## 正しさと操作

`bun run lint`、`bun test`、`bun run build` を実行。
Bunテストは6件、60,592 assertions。全15,000順位×3戦略について、
旧計算の経路オブジェクト（候補範囲を含む）と完全一致します。
全順位のルール、生成境界前後、生成内容の再現、795バイト、最長138戦、
順位2の2位狙い、半角/全角数字の整数判定を含みます。

ブラウザーでは空欄、上下限、全角、混在数字、不正文字、小数、指数、符号、
空白、Enter、戦略の即時変更、139行の表示、設定の引継ぎ・破損・保存不可、
システムテーマ・手動優先・再読込、メニューのクリック/Enter/Escape/外側クリック、
描画例外、Pagesのパス、追加データ通信ゼロを確認しました。
IME確定・取消と貼り付けは合成DOMイベントでアプリ側を検証しています。
OSの日本語IMEそのものやモバイルキーボードを操作した検証ではありません。

## ブラウザー

| 実行対象 | 操作 | 外観比較 | 備考 |
|---|---|---|---|
| Windows Edge 153.0.4234.48 | 合格 | 108ケース | 実際のインストール済み安定版 |
| Playwright Firefox 153.0 | 合格 | 108ケース | Windows用テストビルド、現在の安定版とは異なる |
| Playwright WebKit 26.5 | 合格 | 108ケース | Windows用WebKit。Safari実機の代用とは扱わない |
| Chrome for Testing 151.0.7922.34 | 合格 | 未実施 | 操作マトリクスのみ |

[Edgeの公式履歴](https://learn.microsoft.com/en-us/deployedge/microsoft-edge-relnote-stable-channel)
では着手時の安定版は153、直前は152。
[Chrome 153](https://developer.chrome.com/release-notes/153)、
[Firefox 156/直前155](https://www.firefox.com/en-US/firefox/156.0/releasenotes/)も
確認しましたが、これら全版を動かした結果ではありません。
Safari・iOS・Android実機、過去30か月全体、アプリ内WebViewは未検証です。

[Popover](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API)と
[CSSアンカー](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/position-anchor)
の対応差に備え、機能プローブを無効化した検証も実施しました。
Popover非対応では通常リンクを表示し、アンカー非対応では開く時・スクロール・
リサイズ時の配置を検証しています。旧環境の全挙動を保証するものではありません。

## 外観

幅320/359/360/375/768/1280px × emerald/night × 9状態を比較しました。
短い経路、主色の最終行、長さ10/11の色分け境界、最長経路の先頭/末尾、
警告、開いたメニューを含みます。全行の内容・順序・ピン/番号・丸/線/文字の色は
一致し、主要な位置・寸法は1 CSS px以内、横溢れなしです。
フォームの境界色も比較します。最長経路の途中行は省略せず、全139行をDOM比較します。

比較中に入力枠のvalid/invalid色、ボタンのhover色を修正しました。
PNGの署名・寸法を検証してから、旧版を左、新版を右に並べた比較画像を作成しました。
[画像一覧](images/)と 各ブラウザーのJSON、`pixels.json` に証拠を保存しています。
画像はviewportの撮影です。末尾撮影も別状態として含み、スクロール中の行の欠落を
示すものではありません。フォントのラスタライズによる微差は許容しています。

## 性能測定

数値は [performance.json](performance.json) に保存。
同じEdge、1280×900、通常CPUとCDPの6倍CPUスロットリングで計測します。
FCPはキャッシュ無効・30回の再読込の中央値。計算単体はブラウザー内で
200回ウォームアップ後の1,000回のp95。初回計算・戦略変更・最長経路更新は
それぞれ30回のp95です。初回の遅いサンプルも削除せず生データへ記録します。

更新時間はイベント/200msタイマーのコールバック開始から、DOM更新後の
requestAnimationFrame + setTimeoutまでの描画完了近似です。
ディスプレイに実際に出た瞬間のハードウェア計測ではありません。
200msのデバウンスとタイマー配送遅延は `debounce` に分離しています。
計算単体が0msのサンプルはブラウザー時計の分解能未満で、計算がゼロ時間という意味ではありません。

最初の実装では139行の作り直しが6倍CPUの基準を超えたため、内容と色が同じ行を
再利用するように修正しました。汎用の差分描画基盤は導入していません。
| CPU | 版 | FCP中央値 | 計算単体p95 | 初回計算→描画p95 | 戦略変更p95 | 最長更新p95 |
|---|---|---:|---:|---:|---:|---:|
| 1倍 | old | 52.0ms | 0.2ms | 5.6ms | 18.2ms | 10.6ms |
| 1倍 | new | 36.0ms | 0.0ms | 5.2ms | 17.0ms | 3.8ms |
| 6倍 | old | 160.0ms | 1.6ms | 30.0ms | 85.4ms | 43.1ms |
| 6倍 | new | 80.0ms | 0.1ms | 18.6ms | 49.3ms | 29.1ms |

JS＋CSS gzip: 旧 86,534 bytes → 新 5,496 bytes。
全ての絶対時間・旧版比+5ms以内・FCP非悪化・15kB以内の条件を満たしました。

比較画像16枚を目視確認しました。RGB差16超のピクセルはEdge/Firefoxでは0、
WebKitでは1画像あたり最大2でした（ラスタライズの微差）。

計算単体のベンチマークは同じTS関数をBunでブラウザー用にコンパイルします。
この計測用モジュールと旧データは配信成果物には含めません。

## 再現手順

新しいチェックアウトから基準版を用意する場合:

```powershell
git worktree add --detach .omo/baseline 8e4ad79
bun install --cwd .omo/baseline --frozen-lockfile
bun run --cwd .omo/baseline build
bun run build
```

別ターミナルで各サーバーを起動します:

```powershell
bun scripts/qa-server.ts .omo/baseline/dist 4174
bun run preview
```

本番の `/kuto-ladder/` にマウントされていることを必ず確認します。
Playwrightのブラウザーもワークスペース内に配置します:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = "$PWD/.omo/browsers"
bun run playwright install chromium firefox webkit
node scripts/qa-browser.mjs msedge
node scripts/qa-browser.mjs firefox
node scripts/qa-browser.mjs webkit
node scripts/qa-browser.mjs chromium --functional
node scripts/qa-fallbacks.mjs
bun scripts/qa-performance.mjs
uv run --with pillow python scripts/qa-images.py
```

性能計測時は他のブラウザー検証を同時実行しません。
`--functional` は操作だけを再実行します。PNG原本は `.omo/qa/<browser>/`、
ブラウザープロファイルは `.omo/qa/tmp/` に作成し、終了時にPlaywrightで削除します。
一時的なプロセスのPID/パスはローカルの `.omo/qa/browser-processes.json` に記録しました。
ブラウザー配布物と基準版はローカルの再検証用に残しています。
