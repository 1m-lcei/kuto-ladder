import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

await mkdir(".cache/qa/tmp", { recursive: true });
process.env.TEMP = process.env.TMP = resolve(".cache/qa/tmp");
const { chromium } = await import("playwright");
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 375, height: 900 } });
  for (const colorScheme of ["light", "dark"]) {
    await page.emulateMedia({ colorScheme, reducedMotion: "no-preference" });
    await page.goto("http://localhost:4173/kuto-ladder/");
    await page.locator("select:visible").selectOption("match-heavy");
    await page.locator("#rank").fill("15001");
    await page.locator(".rank-step").first().waitFor();
    const sample = await page.evaluate(() => {
      const rows = [...document.querySelectorAll(".rank-step")];
      const transitions = document
        .getAnimations()
        .filter((a) => a instanceof CSSTransition);
      for (const animation of transitions) {
        animation.pause();
        const { delay, duration } = animation.effect.getTiming();
        animation.currentTime = delay + duration / 2;
      }
      const row = rows[1];
      const detail = getComputedStyle(row.querySelector(".rank-detail"));
      const marker = getComputedStyle(row, "::after");
      const line = getComputedStyle(row, "::before");
      const result = {
        count: rows.length,
        transitions: transitions.length,
        delays: rows
          .slice(0, 7)
          .map(
            (e) =>
              getComputedStyle(e.querySelector(".rank-detail")).transitionDelay,
          ),
        detailFilter: detail.filter,
        markerFilter: marker.filter,
        detailTransform: detail.transform,
        markerTransform: marker.transform,
        lineFilter: line.filter,
        lineTransform: line.transform,
        lineHeight: line.height,
      };
      return result;
    });
    assert.equal(sample.count, 139);
    assert.ok(sample.transitions > 0);
    assert.deepEqual(sample.delays, [
      "0s",
      "0.03s",
      "0.06s",
      "0.09s",
      "0.12s",
      "0.15s",
      "0.18s",
    ]);
    assert.match(sample.detailFilter, /^opacity\(0\./);
    assert.equal(sample.markerFilter, sample.detailFilter);
    assert.equal(sample.markerTransform, sample.detailTransform);
    assert.notEqual(sample.detailTransform, "none");
    assert.equal(sample.lineFilter, sample.detailFilter);
    assert.equal(sample.lineTransform, sample.detailTransform);
    assert.equal(sample.lineHeight, "64px");
    const png = await page.screenshot({
      path: `.cache/qa/entry-${colorScheme}.png`,
    });
    assert.equal(png.subarray(1, 4).toString(), "PNG");
    assert.equal(png.readUInt32BE(16), 375);
    assert.equal(png.readUInt32BE(20), 900);
    await page.evaluate(() => {
      for (const animation of document.getAnimations())
        if (animation instanceof CSSTransition) animation.finish();
    });
    await page
      .locator(".rank-step")
      .nth(20)
      .evaluate((e) =>
        scrollTo(0, e.offsetTop - innerHeight + e.offsetHeight / 2),
      );
    await page.waitForTimeout(100);
    const opacity = await page
      .locator(".rank-detail")
      .nth(20)
      .evaluate((e) => +getComputedStyle(e).opacity);
    assert.ok(Math.abs(opacity - 0.5) < 0.02);
    const line = await page
      .locator(".rank-step")
      .nth(20)
      .evaluate((e) => {
        const style = getComputedStyle(e, "::before");
        return [
          style.opacity,
          style.filter,
          style.transform,
          style.animationName,
        ];
      });
    assert.deepEqual(line, ["1", "none", "none", "none"]);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await page.locator("#rank").fill("123");
  await page.locator(".rank-step").first().waitFor();
  assert.equal(await page.evaluate(() => document.getAnimations().length), 0);
  console.log(
    "PASS: staggered entry including lines, static lines during scroll reveal, both themes, reduced motion",
  );
} finally {
  await browser.close();
}
