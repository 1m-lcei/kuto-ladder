import type { PathStep } from "../types/types";
import { BaselineArrowForwardIos } from "./SvgIcons";

interface RankPathVisualizerProps {
  path: PathStep[];
  targetRank?: number;
}

export function RankPathVisualizer({
  path,
  targetRank = 1,
}: RankPathVisualizerProps) {
  if (path.length === 0) {
    return null; // パスが空の場合は何も表示しない
  }

  return (
    <div className="w-full max-w-md mx-auto mt-4">
      <ul className="steps steps-vertical">
        {path.map((step, index) => {
          const [max, min] = step.nextRankRange;
          return (
            <li
              data-content={index === 0 ? "📌" : `${index}`}
              key={`${index}-${step.currentRank}`}
              className={
                index < 6
                  ? "step step-primary"
                  : 11 <= path.length && index < 11
                    ? "step step-secondary"
                    : "step"
              }
            >
              <div className="flex items-baseline ml-1 text-left">
                <span className="text-lg font-semibold text-right min-w-18">
                  {step.currentRank}位
                </span>
                <div className="flex items-baseline ml-1 text-neutral-400">
                  (<BaselineArrowForwardIos className="w-3 h-3 mx-1" />
                  {max === min ? `${max}位` : `${min}位 〜 ${max}位`})
                </div>
              </div>
            </li>
          );
        })}
        <li
          data-content={path.length}
          className={
            path.length < 6
              ? "step step-primary"
              : 11 <= path.length && path.length < 11
                ? "step step-secondary"
                : "step"
          }
        >
          <div className="ml-1 text-lg font-semibold text-right min-w-18">
            {targetRank}位
          </div>
        </li>
      </ul>
    </div>
  );
}
