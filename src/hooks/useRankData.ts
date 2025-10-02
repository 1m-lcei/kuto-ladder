import { useEffect, useState } from "react";
import type { RankData } from "../types/types";

interface UseRankDataState {
  data: RankData | null;
  isLoading: boolean;
  error: Error | null;
}

export function useRankData(): UseRankDataState {
  const [state, setState] = useState<UseRankDataState>({
    data: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("rank-data.json");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const jsonData = await response.json();
        setState({ data: jsonData, isLoading: false, error: null });
      } catch (e) {
        setState({ data: null, isLoading: false, error: e as Error });
      }
    };

    fetchData();
  }, []); // 空の依存配列により、マウント時に一度だけ実行

  return state;
}
