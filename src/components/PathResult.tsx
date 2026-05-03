import { use, useMemo } from "react";
import { fetchRankData } from "../api/fetchRankData";
import type { PathStep, PathStrategy } from "../types/types";
import { calculatePath } from "../utils/rankCalculator";
import { RankPathVisualizer } from "./RankPathVisualizer";

export function PathResult({
  startRank,
  strategy,
}: {
  startRank: number;
  strategy: PathStrategy;
}) {
  const rankData = use(fetchRankData(strategy));
  const path: PathStep[] = useMemo(() => {
    return calculatePath(startRank, strategy, rankData);
  }, [startRank, strategy, rankData]);

  return (
    <RankPathVisualizer
      path={path}
      targetRank={strategy === "target-second" ? 2 : 1}
    />
  );
}
