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
      reducedMotion: "reduce",
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
  const page = await browser.newPage({
    viewport: { width: 375, height: 700 },
    reducedMotion: "reduce",
  });
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
  assert.equal(await page.locator(".rank-step").count(), 0);
  assert.equal(await input.evaluate((e) => e.validity.patternMismatch), true);
  assert.equal(await input.evaluate((e) => e.validity.customError), false);
  await input.fill("１２３");
  await page.waitForTimeout(240);
  assert.equal(
    await page.locator(".rank-number").first().textContent(),
    "123位",
  );
  assert.equal(await input.evaluate((e) => e === window.originalInput), true);
  assert.equal(await input.evaluate((e) => document.activeElement === e), true);
  report.checks.push(
    "paste-like input events, native validity, full-width raw value, same focused input node",
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
  await input.fill("1");
  await page.locator("form").evaluate((form) => {
    form.addEventListener(
      "submit",
      () => {
        form.dataset.submitted = "true";
      },
      { once: true },
    );
    form.addEventListener(
      "invalid",
      () => {
        form.dataset.invalidEvent = "true";
      },
      true,
    );
  });
  await input.press("Enter");
  assert.equal(
    await page.locator("form").getAttribute("data-submitted"),
    "true",
  );
  assert.equal(
    await page.locator("form").getAttribute("data-invalid-event"),
    null,
  );
  assert.equal(await input.evaluate((e) => e.validity.valid), false);
  assert.ok(page.url().endsWith("/kuto-ladder/"));
  report.checks.push(
    "novalidate suppresses interactive validation; Enter cannot navigate; native validity remains available",
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
  for (const colorScheme of ["light", "dark"]) {
    await page.emulateMedia({ colorScheme });
    for (const [stored, manual] of [
      ['{"version":1,"theme":"emerald"}', "emerald"],
      ['{"version":1,"theme":"night"}', "night"],
      ["{", null],
      ["null", null],
      ['{"version":1,"theme":"invalid"}', null],
      ['{"version":2,"theme":"night"}', null],
    ]) {
      await page.evaluate(
        (value) => localStorage.setItem("kuto-ladder-config", value),
        stored,
      );
      await page.reload();
      const theme = manual ?? (colorScheme === "dark" ? "night" : "emerald");
      assert.equal(
        await page.locator("html").getAttribute("data-theme"),
        theme,
      );
      assert.equal(
        await page.locator('meta[name="color-scheme"]').getAttribute("content"),
        theme === "night" ? "dark" : "light",
      );
      assert.deepEqual(
        await page
          .locator('meta[name="theme-color"]')
          .evaluateAll((metas) => metas.map((meta) => meta.content)),
        Array(2).fill(theme === "night" ? "#0f172a" : "#ffffff"),
      );
    }
  }
  report.checks.push(
    "early theme handles both system schemes, manual overrides and invalid storage without application JavaScript",
  );
  for (const value of ["1", "15002", "2e2", "１２３"]) {
    await input.fill(value);
    assert.equal(
      await input.evaluate((e) => e.validity.valid),
      value === "１２３",
    );
    assert.equal(await input.evaluate((e) => e.validity.customError), false);
    assert.equal(
      await page.locator("#rank-hint").isVisible(),
      value !== "１２３",
    );
  }
  await input.fill("1");
  assert.equal(await page.locator("#rank-hint").isVisible(), true);
  assert.equal(await input.evaluate((e) => e === document.activeElement), true);
  const png = await page.screenshot({ path: ".cache/qa/inline-invalid.png" });
  assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(png.readUInt32BE(16), 375);
  assert.equal(png.readUInt32BE(20), 700);
  report.checks.push(
    "HTML/CSS validates and shows the inline hint without application JavaScript",
  );
  await writeFile(".cache/qa/fallbacks.json", JSON.stringify(report, null, 2));
  console.log(report);
} finally {
  await browser.close();
}
