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
          <label className="swap swap-rotate btn btn-ghost btn-circle">
            <input
              type="checkbox"
              className="theme-controller"
              value="night"
              checked={currentTheme === "night"}
              onChange={(e) =>
                setManualTheme(e.target.checked ? "night" : "emerald")
              }
            />
            {/* sun icon */}
            <svg
              className="swap-off fill-current w-6 h-6"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
            >
              <path d="M5.64,17l-.71.71a1,1,0,0,0,0,1.41,1,1,0,0,0,1.41,0l.71-.71A1,1,0,0,0,5.64,17ZM5,12a1,1,0,0,0-1-1H3a1,1,0,0,0,0,2H4A1,1,0,0,0,5,12Zm7-7a1,1,0,0,0,1-1V3a1,1,0,0,0-2,0V4A1,1,0,0,0,12,5ZM5.64,7.05a1,1,0,0,0,.7.29,1,1,0,0,0,.71-.29,1,1,0,0,0,0-1.41l-.71-.71A1,1,0,0,0,4.93,6.34Zm12,.29a1,1,0,0,0,.7-.29l.71-.71a1,1,0,1,0-1.41-1.41L17,5.64a1,1,0,0,0,0,1.41A1,1,0,0,0,17.66,7.34ZM21,11H20a1,1,0,0,0,0,2h1a1,1,0,0,0,0-2Zm-9,8a1,1,0,0,0-1,1v1a1,1,0,0,0,2,0V20A1,1,0,0,0,12,19ZM18.36,17A1,1,0,0,0,17,18.36l.71.71a1,1,0,0,0,1.41,0,1,1,0,0,0,0-1.41ZM12,6.5A5.5,5.5,0,1,0,17.5,12,5.51,5.51,0,0,0,12,6.5Zm0,9A3.5,3.5,0,1,1,15.5,12,3.5,3.5,0,0,1,12,15.5Z" />
            </svg>
            {/* moon icon */}
            <svg
              className="swap-on fill-current w-6 h-6"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
            >
              <path d="M21.64,13a1,1,0,0,0-1.05-.14,8.05,8.05,0,0,1-3.37.73A8.15,8.15,0,0,1,9.08,5.49a8.59,8.59,0,0,1,.25-2A1,1,0,0,0,8,2.36,10.14,10.14,0,1,0,22,14.05,1,1,0,0,0,21.64,13Zm-9.5,6.69A8.14,8.14,0,0,1,7.08,5.22v.27A10.15,10.15,0,0,0,17.22,15.63a9.79,9.79,0,0,0,2.1-.22A8.11,8.11,0,0,1,12.14,19.73Z" />
            </svg>
          </label>
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
                <label className="label">
                  <span className="label-text">開始ランク</span>
                  <input
                    type="number"
                    id={id}
                    className="input input-primary validator min-w-16"
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
