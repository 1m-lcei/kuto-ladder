import {
  Component,
  type ReactNode,
  Suspense,
  use,
  useEffect,
  useId,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { RankPathVisualizer } from "../components/RankPathVisualizer";
import { useDebounce } from "../hooks/useDebounce";
import { fetchRankData } from "../api/fetchRankData";
import type { PathStep, PathStrategy } from "../types/types";
import { calculatePath } from "../utils/rankCalculator";
import { ThemeController } from "../components/ThemeController";
import { ErrorIcon } from "../components/SvgIcons";

function subscribeTheme(callback: () => void) {
  const matchMedia = window.matchMedia("(prefers-color-scheme: dark)");
  matchMedia.addEventListener("change", callback);
  return () => matchMedia.removeEventListener("change", callback);
}

function getSnapshot() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

class ErrorBoundary extends Component<
  { children: ReactNode; fallback: (error: Error) => ReactNode },
  { error: Error | null }
> {
  constructor(props: {
    children: ReactNode;
    fallback: (error: Error) => ReactNode;
  }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    return this.state.error
      ? this.props.fallback(this.state.error)
      : this.props.children;
  }
}

function PathResult({
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

function App() {
  const id = useId();
  // ユーザーの直接の入力を文字列として保持
  const [inputValue, setInputValue] = useState<string>("");
  // パス計算に使用する、検証済みのランク
  const [startRank, setStartRank] = useState<number>(1);

  const [strategy, setStrategy] = useState<PathStrategy>("efficient");

  const systemPrefersDark = useSyncExternalStore(
    subscribeTheme,
    getSnapshot,
    () => false,
  );
  const [manualTheme, setManualTheme] = useState<"emerald" | "night" | null>(
    null,
  );
  const currentTheme = manualTheme ?? (systemPrefersDark ? "night" : "emerald");

  // 入力値をデバウンス
  const debouncedInputValue = useDebounce(inputValue, 200);

  // デバウンスされた入力値を検証し、startRankを更新
  useEffect(() => {
    const num = Number(debouncedInputValue);
    if (num) {
      setStartRank(num);
    }
  }, [debouncedInputValue]);

  return (
    <div className="container mx-auto min-h-screen p-4">
      <article>
        <div className="flex justify-end">
          <ThemeController
            currentTheme={currentTheme}
            onChange={(checked) =>
              setManualTheme(checked ? "night" : "emerald")
            }
          />
        </div>

        <header className="mb-4 relative flex justify-center items-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            戦術対抗戦 経路
          </h1>
        </header>

        <div className="card card-border card-md max-w-xl border-neutral-400 mx-auto">
          <div className="card-body">
            <form className="w-full max-w-4xl ">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2 grow">
                  <label htmlFor={id} className="label-text whitespace-nowrap">開始ランク</label>
                  <input
                    type="number"
                    id={id}
                    className="input input-primary validator grow min-w-0"
                    required
                    placeholder="2 ～ 15001"
                    min="2"
                    max="15001"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                  />
                </div>
                <div className="form-control">
                  <select
                    className="select select-bordered select-primary w-full sm:w-auto"
                    value={strategy}
                    onChange={(e) =>
                      setStrategy(e.target.value as PathStrategy)
                    }
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
            <Suspense
              fallback={
                <div className="text-center mt-12">
                  <span className="loading loading-lg loading-spinner text-primary"></span>
                  <p className="mt-4">ランクデータを読み込み中...</p>
                </div>
              }
            >
              <PathResult startRank={startRank} strategy={strategy} />
            </Suspense>
          </ErrorBoundary>
        </main>
      </article>
    </div>
  );
}

export default App;
