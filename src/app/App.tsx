import { Suspense, useId, useMemo, useState, useTransition } from "react";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { HeaderMenu } from "../components/HeaderMenu";
import { PathResult } from "../components/PathResult";
import { ErrorIcon } from "../components/SvgIcons";
import { ThemeController } from "../components/ThemeController";
import { useDebounce } from "../hooks/useDebounce";
import { useTheme } from "../hooks/useTheme";
import type { PathStrategy } from "../types/types";
import { loadConfig, saveConfig } from "../utils/config";

function App() {
  const id = useId();
  const initConfig = useMemo(() => loadConfig(), []);

  // ユーザーの直接の入力を文字列として保持
  const [inputValue, setInputValue] = useState<string>("");
  const [strategy, setStrategy] = useState<PathStrategy>(
    initConfig.strategy ?? "efficient",
  );

  const [, startTransition] = useTransition();

  const { currentTheme, handleThemeChange } = useTheme(
    initConfig.theme ?? null,
  );

  const handleStrategyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStrategy = e.target.value as PathStrategy;
    startTransition(() => {
      setStrategy(newStrategy);
    });
    saveConfig({ strategy: newStrategy });
  };

  // 入力値をデバウンス
  const debouncedInputValue = useDebounce(inputValue, 200);
  const startRank = Number(debouncedInputValue);
  const isInvalidRank =
    debouncedInputValue !== "" &&
    (Number.isNaN(startRank) || startRank < 2 || startRank > 15001);

  return (
    <div className="container mx-auto min-h-screen p-4">
      <article>
        <div className="flex justify-end items-center gap-2">
          <ThemeController
            currentTheme={currentTheme}
            onChange={handleThemeChange}
          />
          <HeaderMenu />
        </div>

        <header className="mb-4 relative flex justify-center items-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            戦術対抗戦 経路
          </h1>
        </header>

        <div className="card card-border card-md max-w-xl border-neutral-400 mx-auto">
          <div className="card-body">
            <form className="w-full max-w-4xl ">
              <div className="flex gap-2 sm:gap-4 items-center">
                <div className="flex items-center gap-2 grow min-w-0">
                  <label htmlFor={id} className="label-text whitespace-nowrap">
                    開始順位
                  </label>
                  <input
                    type="number"
                    id={id}
                    className="input input-primary validator grow min-w-0 w-full"
                    required
                    placeholder="2 ～ 15001"
                    min="2"
                    max="15001"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                  />
                </div>
                <div className="form-control shrink-0 hidden min-[360px]:block">
                  <select
                    className="select select-bordered select-primary w-auto"
                    value={strategy}
                    onChange={handleStrategyChange}
                  >
                    <option value="efficient">🏅 登頂</option>
                    <option value="target-second">🥈 2位狙い</option>
                    <option value="match-heavy">😈 最多対戦</option>
                  </select>
                </div>
                <div className="form-control shrink-0 min-[360px]:hidden">
                  <select
                    className="select select-bordered select-primary w-auto"
                    value={strategy}
                    onChange={handleStrategyChange}
                  >
                    <option value="efficient">🏅</option>
                    <option value="target-second">🥈</option>
                    <option value="match-heavy">😈</option>
                  </select>
                </div>
              </div>
            </form>
          </div>
        </div>

        <main>
          <ErrorBoundary
            fallback={(err) => (
              <div
                role="alert"
                className="alert alert-error mt-8 max-w-md mx-auto"
              >
                <ErrorIcon className="stroke-current shrink-0 h-6 w-6" />
                <span>エラー: {err.message}</span>
              </div>
            )}
          >
            {isInvalidRank ? (
              <div
                role="alert"
                className="alert alert-warning mt-8 max-w-md mx-auto"
              >
                <ErrorIcon className="stroke-current shrink-0 h-6 w-6" />
                <span>有効な開始順位（2～15001）を入力してください。</span>
              </div>
            ) : (
              <Suspense
                fallback={
                  <div className="text-center mt-12">
                    <span className="loading loading-lg loading-spinner text-primary"></span>
                    <p className="mt-4">順位データを読み込み中...</p>
                  </div>
                }
              >
                <div>
                  <PathResult startRank={startRank} strategy={strategy} />
                </div>
              </Suspense>
            )}
          </ErrorBoundary>
        </main>
      </article>
    </div>
  );
}

export default App;
