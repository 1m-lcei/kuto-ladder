# kuto-ladder 2.0

戦術対抗戦 (PvP) の開始順位から、登頂・2位狙い・最多対戦の経路と候補範囲を表示します。

公開URL: https://1m-lcei.github.io/kuto-ladder/

HTML・標準CSS・TypeScriptで動作し、実行時の外部ライブラリはありません。
順位データは795バイトの境界配列をJSへ同梱します。順位データの追加通信や、
起動時に全順位を計算する処理はありません。

開始順位は2～15001。半角・全角の数字のみを受け付けます。入力文字列はそのまま
保ち、200ms後に解析します。IME変換中は更新を保留します。設定は従来と同じ
localStorageの `kuto-ladder-config`、スキーマ1で引き継ぎます。

## 開発

Bun 1.4.2で検証。依存関係は `bun.lock` を使用します。

```sh
bun install --frozen-lockfile
bun run dev
bun run lint
bun test
bun run build
bun run preview
```

dev/buildは境界データを再生成します。`bun run precompute` で個別に生成できます。
生成物 `src/generated/rank-boundaries.json` は追跡対象です。順位ルールは
`src/utils/rankRules.ts` に集約しています。

previewは本番と同じ http://localhost:4173/kuto-ladder/ にマウントします。
`bun run deploy` はビルドしてgh-pagesへ公開します。ソースのpushとは別操作です。
2.0の今回の作業ではmain統合・push・公開は行っていません。

## 検証と対応環境

Bunテストは基準コミット `8e4ad79` の計算と全45,000ケースを比較します。
画面・操作・性能の再現手順、比較画像、実行したブラウザーのバージョンは
[検証記録](docs/verification/README.md) を参照してください。

Popover非対応ならメニューボタンを隠し、リンクを通常表示します。
CSSアンカー非対応ならボタン座標で配置し、スクロール・リサイズに追従します。
大規模なポリフィルは使いません。Safari・Android・iOS実機、各製品の最新/直前版を
すべて検証したわけではありません。古いiOSやアプリ内WebViewでは、メニュー・
フォーム・絵文字・IMEに表示や動作の差が残る可能性があります。
