// 計算されたパスの各ステップを表す
export interface PathStep {
  currentRank: number;
  nextRankRange: [number, number]; // [max, min]
}

// public/rank-data.json の型
export interface RankData {
  dist: number[]; // 最短ステップ数
  steps: number[]; // 最長ステップ数
}

// パス計算の戦略
export type PathStrategy = "efficient" | "match-heavy";
