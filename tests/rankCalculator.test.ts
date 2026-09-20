import { expect, test } from "bun:test";
import { calculatePath } from "../src/utils/rankCalculator";
import { calculatePath as referencePath } from "./reference/rankCalculator";
import { referenceData } from "./reference/rankData";

const data = referenceData();
for (const strategy of ["efficient", "target-second", "match-heavy"] as const) {
  test(`${strategy}: all 15,000 ranks match 8e4ad79`, () => {
    for (let rank = 2; rank <= 15001; rank++) {
      expect(calculatePath(rank, strategy, data[strategy])).toEqual(
        referencePath(rank, strategy, data[strategy]),
      );
    }
  }, 30000);
}
