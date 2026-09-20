import { expect, test } from "bun:test";
import { parseRank } from "../src/utils/parseRank";

test("only ASCII/full-width digit integers in range are accepted", () => {
  expect(parseRank("")).toBeNull();
  for (const value of ["2", "15001", "123", "１２３", "1２3", "００２"]) {
    expect(parseRank(value)).toBe(Number(value.normalize("NFKC")));
  }
  for (const value of [
    "1",
    "１",
    "15002",
    "2.5",
    "2.0",
    "2e2",
    "+2",
    "-2",
    " 2",
    "2 ",
    "２３x",
    "²",
    "②",
    "2\n",
    "9".repeat(400),
  ]) {
    expect(parseRank(value)).toBeNaN();
  }
});
