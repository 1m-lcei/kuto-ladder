// Frozen recurrence from scripts/precompute.ts at 8e4ad79.
import { getNextRankRange } from "./rankCalculator";

export function referenceData() {
  const dist = new Array<number>(15002).fill(Infinity);
  const steps = new Array<number>(15002).fill(0);
  const distTo2 = new Array<number>(15002).fill(Infinity);
  dist[1] = 0;
  distTo2[2] = 0;
  for (let rank = 2; rank <= 15001; rank++) {
    const [maxNext, minNext] = getNextRankRange(rank);
    let minDist = Infinity;
    let maxSteps = 0;
    let minDistTo2 = Infinity;
    for (let next = minNext; next <= maxNext; next++) {
      if (next >= rank || next < 1) continue;
      minDist = Math.min(minDist, dist[next]);
      maxSteps = Math.max(maxSteps, steps[next]);
      minDistTo2 = Math.min(minDistTo2, distTo2[next]);
    }
    if (minDist !== Infinity) dist[rank] = 1 + minDist;
    if (minDistTo2 !== Infinity) distTo2[rank] = 1 + minDistTo2;
    if (maxSteps !== 0 || minNext === 1) steps[rank] = 1 + maxSteps;
  }
  return { efficient: dist, "match-heavy": steps, "target-second": distTo2 };
}
