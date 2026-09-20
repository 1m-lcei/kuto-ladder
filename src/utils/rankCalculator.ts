import boundaries from "../generated/rank-boundaries.json";
import type { PathStep, PathStrategy } from "../types/types";
import { getNextRankRange, MAX_RANK } from "./rankRules";

export function calculatePath(startRank: number, strategy: PathStrategy): PathStep[] {
  if (!Number.isInteger(startRank) || startRank < 2 || startRank > MAX_RANK) return [];
  const limits = boundaries[strategy];
  let remaining = limits.length - 1;
  while (limits[remaining] > startRank) remaining--;
  const path: PathStep[] = [];
  let currentRank = startRank;
  while (remaining > 0) {
    const [max, min] = getNextRankRange(currentRank);
    const maxValid = Math.min(max, limits[remaining] - 1);
    const minValid = Math.max(min, limits[remaining - 1]);
    path.push({ currentRank, nextRankRange: [maxValid, minValid] });
    currentRank = strategy === "match-heavy" ? maxValid : minValid;
    remaining--;
  }
  return path;
}
