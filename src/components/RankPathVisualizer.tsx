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

  const getStepClass = (index: number) => {
    const isPrimary = index < 6;
    const isSecondary = path.length >= 11 && index >= 6 && index < 11;
    return isPrimary
      ? "step step-primary"
      : isSecondary
        ? "step step-secondary"
        : "step";
  };

  return (
    <div className="w-full max-w-md mx-auto mt-4">
      <ol className="steps steps-vertical">
        {path.map((step, index) => {
          const [max, min] = step.nextRankRange;
          return (
            <li
              data-content={index === 0 ? "📌" : `${index}`}
              key={step.currentRank}
              className={getStepClass(index)}
            >
              <div className="flex items-baseline ml-1 text-left">
                <span className="text-lg font-semibold text-right min-w-18">
                  {step.currentRank}位
                </span>
                <div className="flex items-baseline ml-1 text-neutral-400">
                  (<BaselineArrowForwardIos className="w-3 h-3 mx-1" aria-hidden="true" />
                  {max === min ? `${max}位` : `${min}位 〜 ${max}位`})
                </div>
              </div>
            </li>
          );
        })}
        <li
          data-content={path.length}
          className={getStepClass(path.length)}
        >
          <div className="ml-1 text-lg font-semibold text-right min-w-18">
            {targetRank}位
          </div>
        </li>
      </ol>
    </div>
  );
}
