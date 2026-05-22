import type { PathStrategy } from "../types/types";

// Promiseのキャッシュ（同一セッション内で不要な再フェッチを防ぐ）
const cache = new Map<PathStrategy, Promise<number[]>>();

export function fetchRankData(strategy: PathStrategy): Promise<number[]> {
  let promise = cache.get(strategy);
  if (!promise) {
    const url = `${import.meta.env.BASE_URL}rank-data-${strategy}.json`;
    promise = fetch(url)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .catch((err) => {
        cache.delete(strategy);
        throw err;
      });
    cache.set(strategy, promise);
  }
  return promise;
}
