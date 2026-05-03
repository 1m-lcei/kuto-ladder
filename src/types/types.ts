// 計算されたパスの各ステップを表す
export interface PathStep {
  currentRank: number;
  nextRankRange: [number, number]; // [max, min]
}

// パス計算の戦略
export type PathStrategy = "efficient" | "match-heavy" | "target-second";
