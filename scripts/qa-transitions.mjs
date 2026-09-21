import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

await mkdir(".cache/qa/tmp", { recursive: true });
process.env.TEMP = process.env.TMP = resolve(".cache/qa/tmp");
const { chromium } = await import("playwright");
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 375, height: 700 } });
  await page.goto("http://localhost:4173/kuto-ladder/");
  const menu = page.locator("#header-menu");
  const midpoint = () =>
    menu.evaluate((e) => {
      const animations = e.getAnimations();
      for (const a of animations) {
        a.pause();
        a.currentTime = a.effect.getTiming().duration / 2;
      }
      const style = getComputedStyle(e);
      return {
        count: animations.length,
        opacity: +style.opacity,
        display: style.display,
        overlay: style.overlay,
      };
    });
  const finish = () =>
    menu.evaluate((e) => {
      for (const a of e.getAnimations()) a.finish();
      return getComputedStyle(e).display;
    });
  for (const theme of ["emerald", "night"]) {
    await page.locator("#theme-toggle").setChecked(theme === "night");
    for (const width of [320, 359, 360, 375, 768, 1280]) {
      await page.setViewportSize({ width, height: 700 });
      await page.locator("#menu-trigger").click();
      const opening = await midpoint();
      assert.ok(opening.count > 0);
      assert.ok(opening.opacity > 0 && opening.opacity < 1);
      assert.equal(opening.overlay, "auto");
      await finish();
      if (width === 375) {
        const png = await page.screenshot({
          path: `.cache/qa/menu-${theme}.png`,
        });
        assert.equal(png.subarray(1, 4).toString(), "PNG");
        assert.equal(png.readUInt32BE(16), width);
        assert.equal(png.readUInt32BE(20), 700);
      }
      await page.keyboard.press("Escape");
      const closing = await midpoint();
      assert.ok(closing.opacity > 0 && closing.opacity < 1);
      assert.notEqual(closing.display, "none");
      assert.equal(closing.overlay, "auto");
      assert.equal(await finish(), "none");
    }
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator("#menu-trigger").click();
  assert.equal(await menu.evaluate((e) => e.getAnimations().length), 0);
  await page.keyboard.press("Escape");
  assert.equal(await menu.isVisible(), false);
  console.log(
    "PASS menu entry/exit, top layer retention, both themes x 6 widths, reduced motion",
  );
} finally {
  await browser.close();
}
