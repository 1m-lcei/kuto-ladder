# 設計書

## 1. 概要
本ドキュメントは `specs/requirements.md` (v4) に基づき、アプリケーションの具体的な実装設計を定義する。

## 2. ファイル構造
```
E:\Projects\kuto-ladder\
├── public\
│   └── rank-data.json  (事前計算スクリプトにより生成)
├── scripts\
│   └── precompute.ts   (事前計算スクリプト)
└── src\
    ├── app\
    │   └── App.tsx         (メインコンポーネント)
    ├── components\
    │   └── RankPathVisualizer.tsx (可視化コンポーネント)
    ├── hooks\
    │   └── useRankData.ts  (JSONデータ読み込みフック)
    ├── utils\
    │   └── rankCalculator.ts (パス計算ロジック)
    └── types
        └── types.ts        (型定義)
```

## 3. 型定義 (`src/types/types.ts`)
```ts
// 計算されたパスの各ステップを表す
export interface PathStep {
  currentRank: number;
  nextRankRange: [number, number]; // [max, min]
}

// public/rank-data.json の型
export interface RankData {
  dist: number[];  // 最短ステップ数
  steps: number[]; // 最長ステップ数
}

// パス計算の戦略
export type PathStrategy = 'efficient' | 'match-heavy';
```

## 4. ロジック詳細

### 4.1. `scripts/precompute.ts`
- **役割:** 1～15001位のランクについて `dist` と `steps` 配列を計算し、`public/rank-data.json` に出力する。
- **実行方法:** `pnpm add -D ts-node` を実行後、`pnpm ts-node ./scripts/precompute.ts` コマンドで手動実行する。
- **実装概要:** `getNextRankRange` を使用し、動的計画法で `dist` と `steps` を計算する。`fs.writeFileSync` を使ってJSONを生成する。

### 4.2. `src/hooks/useRankData.ts`
- **役割:** `rank-data.json` を非同期にフェッチし、その読み込み状態とデータをコンポーネントに提供する。
- **公開フック:** `useRankData()`
- **戻り値:** `{ data: RankData | null, isLoading: boolean, error: Error | null }`
- **実装概要:** `useState` と `useEffect` を使用。`useEffect`内で `fetch` を行い、結果をstateにセットする。

### 4.3. `src/utils/rankCalculator.ts`
- **役割:** 読み込み済みの `RankData` とユーザー入力に基づき、`PathStep[]` を計算する。
- **公開関数:** `calculatePath(startRank: number, strategy: PathStrategy, rankData: RankData): PathStep[]`
- **実装概要:** `specs/requirements.md` の「2.2. クライアントサイドの処理」で定義されたロジックを忠実に実装する。

## 5. コンポーネント詳細

### 5.1. `src/app/App.tsx`
- **役割:** アプリケーション全体のレイアウト、状態管理、ユーザーインタラクションの処理。
- **State:**
    - `startRank: number`: 入力された開始ランク。
    - `strategy: PathStrategy`: 選択されたパス戦略。
    - `path: PathStep[]`: 計算されたパス。
- **処理フロー:**
    1. `useRankData` フックを呼び出し、`rankData` を取得する。
    2. `rankData` が読み込み中の間は、ローディングスピナーを表示する。
    3. ユーザーがランクを入力、または戦略を切り替えるたびに `useEffect` をトリガーする。
    4. `useEffect` 内で `calculatePath` を呼び出し、結果を `path` stateにセットする。
    5. `path` stateを `RankPathVisualizer` にpropsとして渡す。

### 5.2. `src/components/RankPathVisualizer.tsx`
- **役割:** `PathStep[]` を受け取り、UIとして描画することに専念するプレゼンテーショナルコンポーネント。
- **Props:**
    - `path: PathStep[]`
- **実装概要:**
    - `path` 配列を `map` し、各 `PathStep` をdaisyUIの `Card` コンポーネントとして表示する。
    - カード内には `currentRank` と `nextRankRange` を表示する。

## 6. データフロー
1. **(起動時)** `App.tsx` が `useRankData` を呼び出す。
2. `useRankData` が `public/rank-data.json` をフェッチする。
3. **(ユーザー操作)** ユーザーが開始ランクを入力するか、トグルスイッチで戦略を変更する。
4. `App.tsx` の `useEffect` が発火し、`rankCalculator.ts` の `calculatePath` を `startRank`, `strategy`, `rankData` を引数に呼び出す。
5. `calculatePath` が `PathStep[]` を返す。
6. `App.tsx` が返された配列を state に保存し、`RankPathVisualizer.tsx` に props として渡す。
7. `RankPathVisualizer.tsx` が新しい `path` に基づいてUIを再描画する。