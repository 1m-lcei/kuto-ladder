import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MAX_RANK = 15001;

function getNextRankRange(currentRank: number): [number, number] {
  if (currentRank > 13)
    return [Math.floor(currentRank * 0.95), Math.floor(currentRank * 0.7)];
  if (currentRank > 10) return [currentRank - 2, currentRank - 4];
  if (currentRank > 4) return [currentRank - 1, currentRank - 3];
  if (currentRank > 1) return [currentRank - 1, 1];
  return [1, 1];
}

function precomputeRankData() {
  console.log(`Starting pre-computation for ranks 1 to ${MAX_RANK}...`);

  const dist = new Array(MAX_RANK + 1).fill(Infinity);
  const steps = new Array(MAX_RANK + 1).fill(0);
  const distTo2 = new Array(MAX_RANK + 1).fill(Infinity);

  dist[1] = 0;
  steps[1] = 0;
  distTo2[2] = 0;

  for (let rank = 2; rank <= MAX_RANK; rank++) {
    if (rank % 1000 === 0) {
      console.log(`Computing up to rank ${rank}...`);
    }

    const [maxNext, minNext] = getNextRankRange(rank);

    let minDistForCurrentRank = Infinity;
    let maxStepsForCurrentRank = 0;
    let minDistTo2ForCurrentRank = Infinity;

    for (let nextRank = minNext; nextRank <= maxNext; nextRank++) {
      if (nextRank >= rank) continue;
      if (nextRank < 1) continue;

      minDistForCurrentRank = Math.min(minDistForCurrentRank, dist[nextRank]);
      maxStepsForCurrentRank = Math.max(
        maxStepsForCurrentRank,
        steps[nextRank],
      );
      minDistTo2ForCurrentRank = Math.min(minDistTo2ForCurrentRank, distTo2[nextRank]);
    }

    if (minDistForCurrentRank !== Infinity) {
      dist[rank] = 1 + minDistForCurrentRank;
    }
    if (minDistTo2ForCurrentRank !== Infinity) {
      distTo2[rank] = 1 + minDistTo2ForCurrentRank;
    }
    // ランク1に直接到達できる場合も考慮する
    if (maxStepsForCurrentRank !== 0 || minNext === 1) {
      steps[rank] = 1 + maxStepsForCurrentRank;
    }
  }

  console.log("Computation finished.");

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const outputPath = path.resolve(__dirname, "../public/rank-data.json");
  const data = {
    dist,
    steps,
    distTo2,
  };

  // publicディレクトリがなければ作成
  const publicDir = path.dirname(outputPath);
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  console.log(`Writing data to ${outputPath}...`);
  fs.writeFileSync(outputPath, JSON.stringify(data));
  console.log("Successfully wrote rank-data.json.");
}

precomputeRankData();
