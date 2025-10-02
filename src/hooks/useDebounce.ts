import { useEffect, useState } from "react";

// T型の値を受け取り、指定された遅延時間後にその値を返すカスタムフック
export function useDebounce<T>(value: T, delay: number): T {
  // デバウンスされた値を保持するためのstate
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // valueが変更された後、delay時間後にdebouncedValueを更新するタイマーをセット
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // 次のeffectが実行される前、またはアンマウント時にタイマーをクリーンアップする
    // これにより、delay時間内にvalueが変更された場合、前のタイマーはキャンセルされる
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]); // valueまたはdelayが変更された時のみeffectを再実行

  return debouncedValue;
}
