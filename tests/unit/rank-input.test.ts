import { expect, test } from "bun:test";
import { MAX_RANK } from "../../src/rank-rules";

test("HTML rank pattern accepts only ASCII/full-width integers from 2 to MAX_RANK", async () => {
  const html = await Bun.file(
    new URL("../../index.html", import.meta.url),
  ).text();
  const pattern = html.match(/id="rank"[^>]*pattern="([^"]+)"/)?.[1];
  expect(pattern).toBeDefined();
  const valid = new RegExp(`^(?:${pattern})$`, "v");
  for (let rank = 0; rank <= 20000; rank++) {
    const ascii = String(rank);
    const full = ascii.replace(/[0-9]/g, (c) =>
      String.fromCharCode(c.charCodeAt(0) + 0xfee0),
    );
    const mixed = [...ascii].map((c, i) => (i % 2 ? full[i] : c)).join("");
    for (const value of [ascii, full, mixed, `0０${ascii}`])
      expect(valid.test(value)).toBe(rank >= 2 && rank <= MAX_RANK);
  }
  for (const value of [
    "",
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
    "9".repeat(400),
  ])
    expect(valid.test(value)).toBe(false);
});
