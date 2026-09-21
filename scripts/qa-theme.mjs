import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

await mkdir(".cache/qa/tmp", { recursive: true });
process.env.TEMP = process.env.TMP = resolve(".cache/qa/tmp");
const { chromium } = await import("playwright");
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  for (const colorScheme of ["light", "dark"]) {
    for (const theme of [null, "emerald", "night"]) {
      const page = await browser.newPage({
        colorScheme,
        reducedMotion: "no-preference",
      });
      await page.addInitScript((theme) => {
        if (theme)
          localStorage.setItem(
            "kuto-ladder-config",
            JSON.stringify({ version: 1, theme }),
          );
        window.themeRotations = 0;
        document.addEventListener("transitionrun", (event) => {
          if (
            event.propertyName === "rotate" &&
            event.target.matches(".theme-toggle svg")
          )
            window.themeRotations++;
        });
      }, theme);
      // Hold the application module until the initial toolbar has been painted.
      let releaseScript;
      const scriptReady = new Promise((resolve) => {
        releaseScript = resolve;
      });
      await page.route("**/*.js", async (route) => {
        await scriptReady;
        await route.continue();
      });
      const navigation = page.goto("http://localhost:4173/kuto-ladder/");
      await page.locator(".theme-toggle").waitFor();
      await page.waitForFunction(
        () =>
          getComputedStyle(document.querySelector(".toolbar")).display ===
          "flex",
      );
      const initialBounds = await page.locator(".theme-toggle").boundingBox();
      assert.equal(await page.locator("#menu-trigger").isVisible(), false);
      releaseScript();
      await navigation;
      await page.locator("#menu-trigger").waitFor();
      assert.deepEqual(
        await page.locator(".theme-toggle").boundingBox(),
        initialBounds,
        "theme button must not move when the menu button appears",
      );
      await page.waitForTimeout(350);
      const initial = theme ?? (colorScheme === "dark" ? "night" : "emerald");
      assert.equal(
        await page.locator("html").getAttribute("data-theme"),
        initial,
      );
      assert.equal(await page.evaluate(() => window.themeRotations), 0);
      for (let count = 1; count <= 2; count++) {
        await page.locator("#theme-toggle").click();
        await page.waitForFunction(
          (count) => window.themeRotations === count,
          count,
        );
        await page.waitForTimeout(300);
      }
      await page.reload();
      await page.waitForTimeout(350);
      assert.equal(await page.evaluate(() => window.themeRotations), 0);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.locator("#theme-toggle").click();
      await page.waitForTimeout(300);
      assert.equal(await page.evaluate(() => window.themeRotations), 0);
      await page.close();
    }
  }
  console.log(
    "PASS stable toolbar before/after app initialization; theme rotation: no entry/reload animation, both toggle directions, system/saved themes, reduced motion",
  );
} finally {
  await browser.close();
}
