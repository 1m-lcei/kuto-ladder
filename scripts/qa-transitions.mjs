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
  const select = page.locator("select:visible");
  // Picker transitions live in the UA shadow tree and are not exposed by getAnimations().
  const pickerMidpoint = () =>
    select.evaluate(async (e) => {
      const deadline = performance.now() + 1000;
      while (performance.now() < deadline) {
        const style = getComputedStyle(e, "::picker(select)");
        const opacity = +style.opacity;
        if (opacity > 0 && opacity < 1)
          return {
            opacity,
            display: style.display,
            overlay: style.overlay,
            duration: style.transitionDuration,
          };
        await new Promise(requestAnimationFrame);
      }
      throw new Error("Picker did not reach an intermediate opacity");
    });
  const pickerSettled = async (open) => {
    await page.waitForFunction((open) => {
      const e = [...document.querySelectorAll("select")].find(
        (e) => e.getBoundingClientRect().width,
      );
      const style = getComputedStyle(e, "::picker(select)");
      return open ? style.opacity === "1" : style.display === "none";
    }, open);
  };
  for (const theme of ["emerald", "night"]) {
    await page.locator("#theme-toggle").setChecked(theme === "night");
    for (const width of [320, 359, 360, 375, 768, 1280]) {
      await page.setViewportSize({ width, height: 700 });
      const before = await select.boundingBox();
      await select.click();
      const opening = await pickerMidpoint();
      assert.equal(opening.overlay, "auto");
      assert.ok(
        opening.duration.split(", ").every((duration) => duration === "0.16s"),
      );
      await pickerSettled(true);
      if (width === 375) {
        const png = await page.screenshot({
          path: `.cache/qa/picker-${theme}.png`,
        });
        assert.equal(png.subarray(1, 4).toString(), "PNG");
        assert.equal(png.readUInt32BE(16), width);
        assert.equal(png.readUInt32BE(20), 700);
      }
      await page.keyboard.press("Escape");
      const closing = await pickerMidpoint();
      assert.notEqual(closing.display, "none");
      assert.equal(closing.overlay, "auto");
      await pickerSettled(false);
      assert.deepEqual(await select.boundingBox(), before);
    }
  }
  await select.focus();
  await page.keyboard.press("Space");
  await pickerSettled(true);
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await pickerMidpoint();
  await pickerSettled(false);
  assert.equal(await select.inputValue(), "target-second");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await select.click();
  assert.equal(
    await select.evaluate(
      (e) => getComputedStyle(e, "::picker(select)").transitionDuration,
    ),
    "0s",
  );
  await page.keyboard.press("Escape");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  console.log(
    "PASS picker entry/exit, both themes x 6 widths, stable trigger, keyboard selection, reduced motion",
  );
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
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const input = page.locator("#rank");
  const hint = page.locator("#rank-hint");
  const hintMidpoint = () =>
    hint.evaluate((e) => {
      const animations = e.getAnimations();
      for (const a of animations) {
        a.pause();
        a.currentTime = a.effect.getTiming().duration / 2;
      }
      const style = getComputedStyle(e);
      return {
        count: animations.length,
        height: e.getBoundingClientRect().height,
        margin: parseFloat(style.marginTop),
        display: style.display,
      };
    });
  const finishHint = () =>
    hint.evaluate((e) => {
      for (const a of e.getAnimations()) a.finish();
      return {
        height: e.getBoundingClientRect().height,
        display: getComputedStyle(e).display,
      };
    });
  for (const theme of ["emerald", "night"]) {
    await page.locator("#theme-toggle").setChecked(theme === "night");
    for (const width of [320, 375, 1280]) {
      await page.setViewportSize({ width, height: 700 });
      await input.fill("1");
      const opening = await hintMidpoint();
      assert.ok(opening.count > 0);
      assert.ok(opening.height > 0);
      assert.ok(opening.margin > 0 && opening.margin < 12);
      const full = await finishHint();
      assert.ok(opening.height < full.height);
      assert.equal(full.display, "flex");
      if (width === 375) {
        const png = await page.screenshot({
          path: `.cache/qa/hint-expanded-${theme}.png`,
        });
        assert.equal(png.subarray(1, 4).toString(), "PNG");
        assert.equal(png.readUInt32BE(16), width);
        assert.equal(png.readUInt32BE(20), 700);
      }
      await input.fill("123");
      const closing = await hintMidpoint();
      assert.ok(closing.height > 0 && closing.height < full.height);
      assert.equal(closing.display, "flex");
      assert.equal((await finishHint()).display, "none");
    }
  }
  await input.fill("1");
  await page.waitForTimeout(40);
  await input.fill("123");
  await page.waitForTimeout(40);
  await input.fill("1");
  await page.waitForTimeout(240);
  assert.equal(await hint.isVisible(), true);
  await input.fill("");
  await page.waitForTimeout(240);
  assert.equal(await hint.isVisible(), false);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await input.fill("1");
  assert.equal(await hint.evaluate((e) => e.getAnimations().length), 0);
  assert.equal(await hint.isVisible(), true);
  await input.fill("");
  assert.equal(await hint.isVisible(), false);
  // Simulate an engine that skips the guarded intrinsic-size animation rules.
  await page.evaluate(() => {
    for (const sheet of document.styleSheets)
      for (const rule of sheet.cssRules)
        if (rule instanceof CSSMediaRule)
          for (let i = rule.cssRules.length - 1; i >= 0; i--)
            if (rule.cssRules[i].conditionText?.includes("interpolate-size"))
              rule.deleteRule(i);
  });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await input.fill("1");
  assert.equal(await hint.isVisible(), true);
  assert.equal(await hint.evaluate((e) => e.getAnimations().length), 0);
  await input.fill("");
  assert.equal(await hint.isVisible(), false);
  console.log(
    "PASS hint auto-height entry/exit, both themes x 3 widths, interrupted transitions, reduced motion",
  );
  console.log(
    "PASS menu entry/exit, top layer retention, both themes x 6 widths, reduced motion",
  );
} finally {
  await browser.close();
}
