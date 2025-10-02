# 開発タスクリスト

## フェーズ1: 基盤構築

- [x] **タスク1.1: 型定義ファイルの作成**
    1.  `src/types/types.ts` を作成する。
    2.  設計書に基づき、`PathStep`, `RankData`, `PathStrategy` の3つの型をエクスポートする。

- [x] **タスク1.2: 事前計算スクリプトの実行環境セットアップ**
    1.  `ts-node` を `pnpm` で開発依存としてインストールする。
    2.  `scripts` ディレクトリをプロジェクトルートに作成する。

## フェーズ2: データとロジックの実装

- [x] **タスク2.1: 事前計算スクリプトの実装**
    1.  `scripts/precompute.ts` を作成する。
    2.  `GEMINI.md` で定義された `getNextRankRange` 関数を実装する。
    3.  1～15001位までの `dist` (最短) と `steps` (最長) 配列を動的計画法で計算するロジックを実装する。
    4.  Node.jsの `fs` モジュールを使い、計算結果を `public/rank-data.json` に書き出す。

- [x] **タスク2.2: 事前計算データの生成**
    1.  ターミナルで `pnpm ts-node ./scripts/precompute.ts` を実行する。
    2.  `public/rank-data.json` が正しく生成されることを確認する。

- [x] **タスク2.3: クライアントサイド計算ユーティリティの実装**
    1.  `src/utils/rankCalculator.ts` を作成する。
    2.  `getNextRankRange` 関数を実装する。
    3.  設計書に基づき、`calculatePath(startRank, strategy, rankData)` 関数を実装する。

- [x] **タスク2.4: データ取得カスタムフックの実装**
    1.  `src/hooks` ディレクトリを作成する。
    2.  `src/hooks/useRankData.ts` を作成する。
    3.  `rank-data.json` を非同期に `fetch` し、`{ data, isLoading, error }` を返すカスタムフック `useRankData` を実装する。

## フェーズ3: UIの実装と結合

- [x] **タスク3.1: パス可視化コンポーネントの実装**
    1.  `src/components` ディレクトリを作成する。
    2.  `src/components/RankPathVisualizer.tsx` を作成する。
    3.  `PathStep[]` をpropsとして受け取り、各ステップをdaisyUIの `Card` を使ってリスト表示するUIを実装する。

- [x] **タスク3.2: メインアプリケーションコンポーネントの実装**
    1.  `src/app/App.tsx` の既存のコードをクリアし、再実装する。
    2.  `useRankData` フックを呼び出し、ローディング中・エラー時のUIを表示する。
    3.  ランク入力用のフォームと、戦略切り替え用のdaisyUI `Toggle` を配置する。
    4.  ユーザー入力と `rankData` に基づいて `calculatePath` を呼び出し、パスを計算する `useEffect` を実装する。
    5.  計算結果を `RankPathVisualizer` コンポーネントに渡し、最終的な表示を完成させる。
    6.  daisyUIとTailwindCSSを使い、アプリケーション全体のレイアウトとスタイルを整える。

## フェーズ4: デプロイ準備

- [x] **タスク4.1: Vite設定の更新**
    1.  `vite.config.ts` を開き、`base` プロパティをGitHub Pagesのリポジトリ名（例: `/kuto-ladder/`）に設定する。