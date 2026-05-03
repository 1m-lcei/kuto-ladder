import { useEffect, useId, useMemo, useState } from "react";
import { RankPathVisualizer } from "../components/RankPathVisualizer";
import { useDebounce } from "../hooks/useDebounce";
import { useRankData } from "../hooks/useRankData";
import type { PathStep, PathStrategy } from "../types/types";
import { calculatePath } from "../utils/rankCalculator";

function App() {
  const id = useId();
  // ユーザーの直接の入力を文字列として保持
  const [inputValue, setInputValue] = useState<string>("");
  // パス計算に使用する、検証済みのランク
  const [startRank, setStartRank] = useState<number>(1);

  const [strategy, setStrategy] = useState<PathStrategy>("efficient");
  const { data: rankData, isLoading, error } = useRankData();

  // 入力値をデバウンス
  const debouncedInputValue = useDebounce(inputValue, 200);

  // デバウンスされた入力値を検証し、startRankを更新
  useEffect(() => {
    const num = Number(debouncedInputValue);
    if (num) {
      setStartRank(num);
    }
  }, [debouncedInputValue]);

  const path: PathStep[] = useMemo(() => {
    if (!rankData) return [];
    return calculatePath(startRank, strategy, rankData);
  }, [startRank, strategy, rankData]);


  return (
    <div className="container mx-auto min-h-screen p-4">
      <article>
        <header className="text-center mb-4">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            戦術対抗戦 経路
          </h1>
          <blockquote className="italic">
            ❝ Walk the straight path. ❞
          </blockquote>
        </header>

        <div className="card card-border card-md max-w-xl border-neutral-400 mx-auto">
          <div className="card-body">
            <form className="w-full max-w-4xl ">
              <div className="flex flex-wrap gap-4 items-center">
                <label className="label">
                  <span className="label-text">開始ランク</span>
                  <input
                    type="number"
                    id={id}
                    className="input input-primary text-neutral validator min-w-16"
                    required
                    placeholder="2 ～ 15001"
                    min="2"
                    max="15001"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                  />
                </label>
                <div className="form-control">
                  <select
                    className="select select-bordered select-primary w-full max-w-xs"
                    value={strategy}
                    onChange={(e) => setStrategy(e.target.value as PathStrategy)}
                  >
                    <option value="efficient">🏅 登頂</option>
                    <option value="target-second">🥈 2位狙い</option>
                    <option value="match-heavy">😈 最多対戦</option>
                  </select>
                </div>
              </div>
            </form>
          </div>
        </div>

        <main>
          {isLoading && (
            <div className="text-center mt-12">
              <span className="loading loading-lg loading-spinner text-primary"></span>
              <p className="mt-4">ランクデータを読み込み中...</p>
            </div>
          )}
          {error && (
            <div
              role="alert"
              className="alert alert-error mt-8 max-w-md mx-auto"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="stroke-current shrink-0 h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
              >
                <title>エラーアイコン</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>エラー: {error.message}</span>
            </div>
          )}
          {rankData && <RankPathVisualizer path={path} targetRank={strategy === "target-second" ? 2 : 1} />}
        </main>
      </article>
    </div>
  );
}

export default App;
