import type { PathStep, PathStrategy, RankData } from "../types/types";

// この関数は事前計算スクリプトとクライアントサイドの両方で必要
export function getNextRankRange(currentRank: number): [number, number] {
  if (currentRank > 13)
    return [Math.floor(currentRank * 0.95), Math.floor(currentRank * 0.7)];
  if (currentRank > 10) return [currentRank - 2, currentRank - 4];
  if (currentRank > 4) return [currentRank - 1, currentRank - 3];
  if (currentRank > 1) return [currentRank - 1, 1];
  return [1, 1];
}

export function calculatePath(
  startRank: number,
  strategy: PathStrategy,
  rankData: RankData,
): PathStep[] {
  if (
    !startRank ||
    !rankData ||
    startRank <= 1 ||
    startRank >= rankData.dist.length
  ) {
    return [];
  }

  const path: PathStep[] = [];
  let currentRank = startRank;

  const dataArray = strategy === "efficient" ? rankData.dist : rankData.steps;

  while (true) {
    if (currentRank <= 1) break;

    const [maxNext, minNext] = getNextRankRange(currentRank);

    const validNextRanks: number[] = [];
    for (let nextRank = minNext; nextRank <= maxNext; nextRank++) {
      if (nextRank >= currentRank || nextRank < 1) continue;

      if (dataArray[nextRank] === dataArray[currentRank] - 1) {
        validNextRanks.push(nextRank);
      }
    }

    if (validNextRanks.length === 0) {
      console.error(
        `Could not find a valid next rank from ${currentRank} with strategy ${strategy}.`,
      );
      break;
    }

    const minValidRank = Math.min(...validNextRanks);
    const maxValidRank = Math.max(...validNextRanks);

    path.push({
      currentRank,
      nextRankRange: [maxValidRank, minValidRank],
    });

    const nextCurrentRank =
      strategy === "efficient" ? minValidRank : maxValidRank;

    if (nextCurrentRank >= currentRank) {
      console.error(
        `Infinite loop detected. Current: ${currentRank}, Next: ${nextCurrentRank}`,
      );
      break;
    }
    currentRank = nextCurrentRank;
  }

  return path;
}
