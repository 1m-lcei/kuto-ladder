import { expect, test } from "bun:test";
import { generateBoundaries } from "../scripts/precompute";
import boundaries from "../src/generated/rank-boundaries.json";
import { calculatePath } from "../src/utils/rankCalculator";
import { getNextRankRange } from "../src/utils/rankRules";
import { getNextRankRange as referenceRange } from "./reference/rankCalculator";
import { calculatePath as referencePath } from "./reference/rankCalculator";
import { referenceData } from "./reference/rankData";

const data = referenceData();
for (const strategy of ["efficient", "target-second", "match-heavy"] as const) {
  test(`${strategy}: all 15,000 ranks match 8e4ad79`, () => {
    for (let rank = 2; rank <= 15001; rank++) {
      expect(calculatePath(rank, strategy)).toEqual(
        referencePath(rank, strategy, data[strategy]),
      );
    }
  }, 30000);
}

test("generated data is reproducible and every boundary encodes the old cost", () => {
  expect(generateBoundaries()).toEqual(boundaries);
  expect(Object.values(boundaries).map((values) => values.length)).toEqual([24, 139, 24]);
  expect(JSON.stringify(boundaries).length).toBe(795);
  for (const strategy of Object.keys(boundaries) as (keyof typeof boundaries)[]) {
    for (const [cost, rank] of boundaries[strategy].entries()) {
      expect(data[strategy][rank]).toBe(cost);
      if (cost > 0) expect(data[strategy][rank - 1]).toBe(cost - 1);
      expect(data[strategy][rank + 1]).toBeGreaterThanOrEqual(cost);
    }
  }
});

test("range rules, longest path and invalid ranks", () => {
  for (let rank = 1; rank <= 15001; rank++) {
    expect(getNextRankRange(rank)).toEqual(referenceRange(rank));
  }
  expect(calculatePath(15001, "match-heavy")).toHaveLength(138);
  expect(calculatePath(2, "target-second")).toEqual([]);
  for (const rank of [0, 1, 15002, 2.5, NaN, Infinity]) {
    expect(calculatePath(rank, "efficient")).toEqual([]);
  }
});
