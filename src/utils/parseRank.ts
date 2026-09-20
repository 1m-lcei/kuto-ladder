import { MAX_RANK } from "./rankRules";

// null is empty; NaN is invalid. Never normalize the input element itself.
export function parseRank(value: string): number | null {
  if (value === "") return null;
  if (!/^[0-9０-９]+$/.test(value)) return NaN;
  const rank = Number(value.normalize("NFKC"));
  return Number.isInteger(rank) && rank >= 2 && rank <= MAX_RANK ? rank : NaN;
}
