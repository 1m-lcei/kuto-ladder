import { useMemo } from "react";
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
  const path: PathStep[] = useMemo(() => {
    return calculatePath(startRank, strategy);
  }, [startRank, strategy]);

  return (
    <RankPathVisualizer
      path={path}
      targetRank={strategy === "target-second" ? 2 : 1}
    />
  );
}
