export const MAX_RANK = 15001;

export type PathStrategy = "efficient" | "match-heavy" | "target-second";

export function getNextRankRange(currentRank: number): [number, number] {
  if (currentRank > 13)
    return [Math.floor(currentRank * 0.95), Math.floor(currentRank * 0.7)];
  if (currentRank > 10) return [currentRank - 2, currentRank - 4];
  if (currentRank > 4) return [currentRank - 1, currentRank - 3];
  if (currentRank > 1) return [currentRank - 1, 1];
  return [1, 1];
}
