import { mkdirSync, writeFileSync } from "node:fs";
import {
  getNextRankRange,
  MAX_RANK,
  type PathStrategy,
} from "../src/rank-rules";

export function generateBoundaries(): Record<PathStrategy, number[]> {
  const boundaries = {
    efficient: [1],
    "match-heavy": [1],
    "target-second": [2],
  };
  for (const strategy of Object.keys(boundaries) as PathStrategy[]) {
    const target = boundaries[strategy][0];
    const costs = new Uint8Array(MAX_RANK + 1);
    for (let rank = target + 1; rank <= MAX_RANK; rank++) {
      const [max, min] = getNextRankRange(rank);
      // Costs are monotone: the chosen range endpoint gives the extremum.
      const next = strategy === "match-heavy" ? max : Math.max(target, min);
      costs[rank] = costs[next] + 1;
      if (costs[rank] !== costs[rank - 1]) boundaries[strategy].push(rank);
    }
  }
  return boundaries;
}

if (import.meta.main) {
  const directory = new URL("../src/generated/", import.meta.url);
  mkdirSync(directory, { recursive: true });
  writeFileSync(
    new URL("rank-boundaries.json", directory),
    JSON.stringify(generateBoundaries()),
  );
}
