import type { PathStrategy } from "../types/types";

// Promiseのキャッシュ（同一セッション内で不要な再フェッチを防ぐ）
const cache = new Map<PathStrategy, Promise<number[]>>();

export function fetchRankData(strategy: PathStrategy): Promise<number[]> {
  if (!cache.has(strategy)) {
    const url = `rank-data-${strategy}.json`;
    const promise = fetch(url).then((res) => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    });
    cache.set(strategy, promise);
  }
  return cache.get(strategy)!;
}
