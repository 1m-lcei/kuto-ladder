import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

await mkdir(".cache/qa/tmp", { recursive: true });
process.env.TEMP = process.env.TMP = resolve(".cache/qa/tmp");
const browser = await chromium.launch({ channel: "msedge", headless: true });
const report = { browser: browser.version(), checks: [] };
try {
  for (const mode of ["no-anchor", "no-popover"]) {
    const page = await browser.newPage({
      viewport: { width: 375, height: 700 },
    });
    await page.addInitScript((mode) => {
      if (mode === "no-anchor") {
        const supports = CSS.supports.bind(CSS);
        CSS.supports = (property, ...rest) =>
          property === "position-anchor" ? false : supports(property, ...rest);
      } else delete HTMLElement.prototype.showPopover;
    }, mode);
    await page.goto("http://localhost:4173/kuto-ladder/");
    if (mode === "no-anchor") {
      // Simulate CSS support absence as well as the JS feature probe.
      await page.addStyleTag({
        content: "#header-menu {translate:none;position-anchor:auto;}",
      });
      await page.locator("#rank").fill("15001");
      await page.waitForTimeout(240);
      await page.getByRole("button", { name: "メニュー", exact: true }).click();
      const check = async () => {
        const button = await page.locator("#menu-trigger").boundingBox();
        const menu = await page.locator("#header-menu").boundingBox();
        assert.ok(Math.abs(menu.y - (button.y + button.height)) < 1);
        assert.ok(
          Math.abs(menu.x - (button.x + button.width - 160)) < 1,
          JSON.stringify({ button, menu }),
        );
      };
      await check();
      await page.setViewportSize({ width: 768, height: 700 });
      await page.waitForTimeout(60);
      await check();
      await page.evaluate(() => scrollTo(0, 100));
      await page.waitForTimeout(60);
      await check();
      await page.keyboard.press("Escape");
      assert.equal(await page.locator("#header-menu:popover-open").count(), 0);
      report.checks.push(
        "anchor fallback positions on open, resize, scroll; Escape closes",
      );
    } else {
      assert.equal(await page.locator("#menu-trigger").isVisible(), false);
      assert.equal(await page.locator("#header-menu a").count(), 2);
      for (const link of await page.locator("#header-menu a").all())
        assert.equal(await link.isVisible(), true);
      await page.locator("#header-menu a").first().focus();
      assert.equal(
        await page
          .locator("#header-menu a")
          .first()
          .evaluate((e) => document.activeElement === e),
        true,
      );
      report.checks.push(
        "missing Popover: trigger hidden, both links visible and keyboard focusable",
      );
    }
    await page.close();
  }
  const page = await browser.newPage({ viewport: { width: 375, height: 700 } });
  await page.goto("http://localhost:4173/kuto-ladder/");
  const input = page.locator("#rank");
  await input.fill("123");
  await page.waitForTimeout(240);
  await input.evaluate((e) => (window.originalInput = e));
  await page.evaluate(() => {
    const e = document.querySelector("#rank");
    e.value = "１２３x";
    e.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        inputType: "insertFromPaste",
        data: "１２３x",
      }),
    );
  });
  await page.waitForTimeout(240);
  assert.equal(await page.locator("#rank-error").count(), 1);
  assert.equal(await input.getAttribute("aria-invalid"), "true");
  assert.equal(await input.getAttribute("aria-describedby"), "rank-error");
  await input.fill("１２３");
  await page.waitForTimeout(240);
  assert.equal(
    await page.locator(".rank-number").first().textContent(),
    "123位",
  );
  assert.equal(await input.evaluate((e) => e === window.originalInput), true);
  assert.equal(await input.evaluate((e) => document.activeElement === e), true);
  report.checks.push(
    "paste-like input events, full-width raw value, alert associations, same focused input node",
  );
  await page.locator("#theme-toggle").focus();
  await page.keyboard.press("Space");
  assert.equal(await page.locator("html").getAttribute("data-theme"), "night");
  report.checks.push("theme checkbox toggles with keyboard Space");
  const resources = await page.evaluate(() =>
    performance.getEntriesByType("resource").map((e) => e.name),
  );
  assert.equal(resources.filter((url) => url.includes("rank-data")).length, 0);
  assert.ok(
    resources
      .filter((url) => /\.(js|css)$/.test(url))
      .every((url) => url.includes("/kuto-ladder/assets/")),
  );
  report.checks.push(
    "production resources stay under Pages prefix; zero rank-data requests",
  );
  await page.route("**/*.js", (route) => route.abort());
  await page.reload();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "night");
  assert.equal(
    await page.locator('meta[name="color-scheme"]').getAttribute("content"),
    "dark",
  );
  assert.equal(
    await page
      .locator('meta[name="theme-color"]')
      .first()
      .getAttribute("content"),
    "#0f172a",
  );
  report.checks.push(
    "saved theme and metadata apply before application JavaScript loads",
  );
  await writeFile(".cache/qa/fallbacks.json", JSON.stringify(report, null, 2));
  console.log(report);
} finally {
  await browser.close();
}
