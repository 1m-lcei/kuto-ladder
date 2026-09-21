import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve(".cache/browsers");
await mkdir(resolve(".cache/qa/tmp"), { recursive: true });
process.env.TEMP = process.env.TMP = resolve(".cache/qa/tmp");
const { chromium, firefox, webkit } = await import("playwright");
const engine = process.argv[2] ?? "msedge";
const browser = await (engine === "firefox"
  ? firefox
  : engine === "webkit"
    ? webkit
    : chromium
).launch({
  ...(engine === "msedge" ? { channel: "msedge" } : {}),
  headless: true,
});
const out = resolve(".cache/qa", engine);
await mkdir(out, { recursive: true });
const report = {
  browser: engine,
  version: browser.version(),
  date: new Date().toISOString(),
  comparisons: [],
  functional: [],
};
const pages = await Promise.all(
  (process.argv.includes("--functional") ? [4173] : [4174, 4173]).map(
    async (port) => {
      const context = await browser.newContext({
        viewport: { width: 375, height: 900 },
        deviceScaleFactor: 1,
        colorScheme: "light",
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      await page.goto(`http://localhost:${port}/kuto-ladder/`);
      await page.locator("h1").waitFor();
      return page;
    },
  ),
);
const cases = [
  ["short", "2", "efficient"],
  ["primary-end", "20", "efficient"],
  ["ten", "123", "efficient"],
  ["eleven", "176", "efficient"],
  ["eleven-end", "176", "efficient"],
  ["longest", "15001", "match-heavy"],
  ["longest-end", "15001", "match-heavy"],
  ["warning", "1", "efficient"],
  ["menu", "123", "target-second"],
];
function snapshot() {
  const rect = (el) => {
    const r = el.getBoundingClientRect();
    return [r.x, r.y, r.width, r.height];
  };
  const color = (value) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = value;
    ctx.fillRect(0, 0, 1, 1);
    return [...ctx.getImageData(0, 0, 1, 1).data];
  };
  const rows = [...document.querySelectorAll("main ol>li")].map((row) => ({
    text: row.textContent.replace(/\s+/g, "").replaceAll("Next", ""),
    marker: row.dataset.content,
    rect: rect(row),
    parts: [...row.querySelectorAll("div,span,svg")].map((el) => rect(el)),
    circle: color(getComputedStyle(row, "::after").backgroundColor),
    line: color(getComputedStyle(row, "::before").backgroundColor),
    foreground: color(getComputedStyle(row, "::after").color),
  }));
  const select = [...document.querySelectorAll("select")].find(
    (el) => el.getBoundingClientRect().width,
  );
  const elements = [
    document.querySelector("h1"),
    document.querySelector(".card,.rank-card"),
    document.querySelector("input[type=text]"),
    select,
    document.querySelector(".theme-toggle,label.swap"),
    document.querySelector("[popovertarget]"),
    document.querySelector("main ol"),
    document.querySelector("[role=alert]"),
    document.querySelector("#header-menu:popover-open"),
  ].map((el) => (el ? rect(el) : null));
  return {
    rows,
    elements,
    overflow: document.documentElement.scrollWidth > innerWidth,
  };
}
try {
  if (!process.argv.includes("--functional"))
    for (const width of [320, 359, 360, 375, 768, 1280])
      for (const theme of ["emerald", "night"]) {
        for (const page of pages) {
          await page.setViewportSize({ width, height: 900 });
          await page.evaluate(
            (theme) =>
              localStorage.setItem(
                "kuto-ladder-config",
                JSON.stringify({ version: 1, theme }),
              ),
            theme,
          );
          await page.reload();
        }
        for (const [name, rank, strategy] of cases) {
          const snapshots = [];
          for (const [index, page] of pages.entries()) {
            await page.keyboard.press("Escape");
            await page.locator("select:visible").selectOption(strategy);
            await page.locator("input[type=text]").fill(rank);
            await page.waitForTimeout(240);
            await page.locator("input[type=text]").blur();
            await page.mouse.move(0, 0);
            await page.waitForTimeout(250);
            await page.evaluate(() => window.scrollTo(0, 0));
            if (name.endsWith("-end") && name !== "primary-end") {
              await page.locator("main ol>li").last().scrollIntoViewIfNeeded();
            }
            if (name === "menu") {
              await page
                .getByRole("button", { name: "メニュー", exact: true })
                .click();
              await page.waitForTimeout(300);
            }
            snapshots.push(await page.evaluate(snapshot));
            const image = await page.screenshot({
              path: resolve(out, `${width}-${theme}-${name}-${index}.png`),
              animations: "disabled",
            });
            assert.equal(
              image.subarray(0, 8).toString("hex"),
              "89504e470d0a1a0a",
            );
            assert.equal(image.readUInt32BE(16), width);
            assert.equal(image.readUInt32BE(20), 900);
          }
          const [old, current] = snapshots;
          assert.deepEqual(
            current.rows.map(({ text, marker, circle, line, foreground }) => ({
              text,
              marker,
              circle,
              line,
              foreground,
            })),
            old.rows.map(({ text, marker, circle, line, foreground }) => ({
              text,
              marker,
              circle,
              line,
              foreground,
            })),
            `${width} ${theme} ${name} rows`,
          );
          let maxDelta = 0;
          for (let i = 0; i < old.elements.length; i++) {
            // Native validation replaces the old inline warning.
            if (name === "warning" && i === 7) continue;
            assert.equal(
              Boolean(old.elements[i]),
              Boolean(current.elements[i]),
            );
            if (old.elements[i])
              for (let j = 0; j < 4; j++)
                maxDelta = Math.max(
                  maxDelta,
                  Math.abs(old.elements[i][j] - current.elements[i][j]),
                );
          }
          for (let i = 0; i < old.rows.length; i++)
            for (let j = 0; j < 4; j++)
              maxDelta = Math.max(
                maxDelta,
                Math.abs(old.rows[i].rect[j] - current.rows[i].rect[j]),
              );
          report.comparisons.push({
            width,
            theme,
            name,
            rows: current.rows.length,
            maxDelta,
            overflow: current.overflow,
            baselineOverflow: old.overflow,
          });
        }
        console.log(engine, width, theme, "compared");
      }
  if (!process.argv.includes("--functional"))
    await writeFile(
      resolve(out, "visual.json"),
      JSON.stringify(report, null, 2),
    );
  const page = pages.at(-1);
  await page.setViewportSize({ width: 375, height: 900 });
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const input = page.locator("#rank");
  assert.equal(await page.locator("#rank-hint").isVisible(), false);
  assert.equal(
    await input.evaluate((el) => el.matches(":user-invalid")),
    false,
  );
  for (const value of [
    "",
    "1",
    "2",
    "15001",
    "15002",
    "９９９９",
    "１００００",
    "１４９９９",
    "１５０００",
    "１５００１",
    "１５００２",
    "００２",
    "000",
    "123",
    "１２３",
    "１",
    "2.5",
    "2e2",
    "+2",
    " 2",
    "2 ",
    "12x",
    "1２3",
  ]) {
    await input.fill(value);
    assert.equal(
      await page.locator("#rank-hint").isVisible(),
      Boolean(value) && !(await input.evaluate((el) => el.validity.valid)),
    );
    assert.equal(
      await input.evaluate((el) => el === document.activeElement),
      true,
    );
    await page.waitForTimeout(240);
    const valid =
      /^[0-9０-９]+$/.test(value) &&
      Number(value.normalize("NFKC")) >= 2 &&
      Number(value.normalize("NFKC")) <= 15001;
    assert.equal(await page.locator("#result [role=alert]").count(), 0);
    assert.equal((await page.locator(".rank-step").count()) > 0, valid);
    assert.equal(await input.inputValue(), value);
    const validity = await input.evaluate((el) => ({
      valid: el.validity.valid,
      customError: el.validity.customError,
      valueMissing: el.validity.valueMissing,
      matchesInvalid: el.matches(":invalid"),
      message: el.validationMessage,
    }));
    assert.equal(validity.valid, valid);
    assert.equal(validity.matchesInvalid, !valid);
    assert.equal(validity.customError, false);
    assert.equal(validity.valueMissing, value === "");
    assert.equal(validity.message.length > 0, !valid);
  }
  report.functional.push(
    "HTML-only validity: empty, bounds, ASCII/full-width/mixed digits, decimal, exponent, sign, whitespace, nonnumeric",
  );
  const select = page.locator("select:visible");
  for (const width of [320, 359, 360, 375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    const selectBox = await select.boundingBox();
    const inputBox = await input.boundingBox();
    for (const strategy of ["efficient", "target-second", "match-heavy"]) {
      await select.selectOption(strategy);
      assert.deepEqual(await select.boundingBox(), selectBox);
      assert.deepEqual(await input.boundingBox(), inputBox);
      assert.equal(
        await select.evaluate((el) => el.scrollWidth <= el.clientWidth),
        true,
      );
    }
  }
  await page.setViewportSize({ width: 375, height: 900 });
  await select.selectOption("efficient");
  report.functional.push(
    "closed select and input stay fixed across all strategies at 6 widths, without clipping",
  );
  await select.focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  assert.equal(await select.inputValue(), "target-second");
  assert.equal(await page.locator(".rank-number").last().textContent(), "2位");
  await select.focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Enter");
  assert.equal(await select.inputValue(), "efficient");
  report.functional.push("native select changes strategy with keyboard arrows");
  for (const colorScheme of ["dark", "light"]) {
    await page.emulateMedia({ colorScheme });
    await input.fill("123");
    await page.waitForTimeout(240);
    await input.blur();
    const primary = await page
      .locator("select:visible")
      .evaluate((el) => getComputedStyle(el).borderColor);
    const validBorder = await input.evaluate(
      (el) => getComputedStyle(el).borderColor,
    );
    assert.equal(validBorder, primary);
    await input.focus();
    assert.equal(
      await input.evaluate((el) => getComputedStyle(el).outlineColor),
      validBorder,
    );
    await input.fill("1");
    assert.equal(await page.locator("#rank-hint").isVisible(), true);
    assert.notEqual(
      await input.evaluate((el) => getComputedStyle(el).borderColor),
      validBorder,
    );
  }
  report.functional.push(
    "valid input keeps primary border/focus; nonempty invalid input immediately shows error color and hint without blur or Enter",
  );
  await input.fill("123");
  await page.waitForTimeout(240);
  await input.fill("124");
  await page.waitForTimeout(100);
  assert.equal(
    await page.locator(".rank-number").first().textContent(),
    "123位",
  );
  await page.waitForTimeout(140);
  assert.equal(
    await page.locator(".rank-number").first().textContent(),
    "124位",
  );
  await input.fill("123");
  await page.waitForTimeout(240);
  report.functional.push("rank results still wait for the 200ms debounce");
  await input.evaluate((el) => {
    el.dispatchEvent(
      new CompositionEvent("compositionstart", { bubbles: true }),
    );
    el.value = "１";
    el.dispatchEvent(
      new InputEvent("input", { bubbles: true, isComposing: true }),
    );
  });
  await page.waitForTimeout(300);
  assert.equal(
    await page.locator(".rank-number").first().textContent(),
    "123位",
  );
  assert.equal(await page.locator("#rank-error").count(), 0);
  await input.evaluate((el) =>
    el.dispatchEvent(
      new CompositionEvent("compositionend", { bubbles: true, data: "１" }),
    ),
  );
  await page.waitForTimeout(240);
  assert.equal(await page.locator(".rank-step").count(), 0);
  assert.equal(await input.evaluate((el) => el.validity.patternMismatch), true);
  await input.fill("123");
  await page.waitForTimeout(240);
  await input.evaluate((el) => {
    el.dispatchEvent(
      new CompositionEvent("compositionstart", { bubbles: true }),
    );
    el.value = "bad";
    el.dispatchEvent(
      new InputEvent("input", { bubbles: true, isComposing: true }),
    );
    el.value = "123";
    el.dispatchEvent(
      new CompositionEvent("compositionend", { bubbles: true, data: "" }),
    );
  });
  await page.waitForTimeout(240);
  assert.equal(
    await page.locator(".rank-number").first().textContent(),
    "123位",
  );
  report.functional.push(
    "synthetic composition commit/cancel holds previous result; native IME not covered",
  );
  await input.fill("15001");
  await page.locator("select:visible").selectOption("match-heavy");
  assert.equal(
    await page.locator(".rank-number").first().textContent(),
    "123位",
  );
  await page.waitForTimeout(240);
  assert.equal(await page.locator(".rank-step").count(), 139);
  assert.equal(
    await input.evaluate((el) => el === document.querySelector("#rank")),
    true,
  );
  await input.press("Enter");
  assert.ok(page.url().endsWith("/kuto-ladder/"));
  await input.fill("2");
  await page.waitForTimeout(240);
  await page.locator("select:visible").selectOption("target-second");
  assert.equal(await page.locator("#result").textContent(), "");
  report.functional.push(
    "strategy uses last parsed rank, longest 139 rows, target-second rank 2 empty, Enter stays",
  );
  await page.emulateMedia({ colorScheme: "dark" });
  await page.waitForTimeout(100);
  assert.equal(await page.locator("html").getAttribute("data-theme"), "night");
  await page.locator("#theme-toggle").uncheck();
  await page.emulateMedia({ colorScheme: "light" });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.waitForTimeout(100);
  assert.equal(
    await page.locator("html").getAttribute("data-theme"),
    "emerald",
  );
  await page.reload();
  assert.equal(
    await page.locator("html").getAttribute("data-theme"),
    "emerald",
  );
  assert.equal(
    await page.locator("select:visible").inputValue(),
    "target-second",
  );
  assert.equal(
    await page
      .locator('meta[name="theme-color"]')
      .first()
      .getAttribute("content"),
    "#ffffff",
  );
  report.functional.push(
    "system theme, manual priority, schema 1 settings, reload and browser theme-color",
  );
  for (const config of [
    "{",
    "null",
    '{"version":1,"theme":"bad","strategy":"bad"}',
    '{"version":2,"theme":"night"}',
  ]) {
    await page.evaluate(
      (config) => localStorage.setItem("kuto-ladder-config", config),
      config,
    );
    await page.reload();
    assert.equal(
      await page.locator("select:visible").inputValue(),
      "efficient",
    );
    await input.fill("123");
    await page.waitForTimeout(240);
    assert.ok((await page.locator(".rank-step").count()) > 0);
  }
  report.functional.push(
    "malformed, null, invalid fields and other-version settings",
  );
  await page.getByRole("button", { name: "メニュー", exact: true }).click();
  assert.equal(await page.locator("#header-menu:popover-open").count(), 1);
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#header-menu:popover-open").count(), 0);
  await page.getByRole("button", { name: "メニュー", exact: true }).focus();
  await page.keyboard.press("Enter");
  assert.equal(await page.locator("#header-menu:popover-open").count(), 1);
  await input.click();
  assert.equal(await page.locator("#header-menu:popover-open").count(), 0);
  report.functional.push("menu mouse/keyboard, Escape and light dismiss");
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("blocked storage");
      },
    });
  });
  await page.reload();
  await input.fill("123");
  await page.waitForTimeout(240);
  await page.locator("select:visible").selectOption("match-heavy");
  await page.locator("#theme-toggle").check();
  assert.ok((await page.locator(".rank-step").count()) > 0);
  report.functional.push(
    "unavailable storage does not disable calculation, strategy or theme",
  );
  await page
    .locator("#path-step")
    .evaluate((el) => el.content.querySelector("li").remove());
  await input.fill("124");
  await page.waitForTimeout(240);
  assert.match(
    await page.locator(".result-alert.error").textContent(),
    /エラー:/,
  );
  report.functional.push("rendering exception reaches existing error alert");
  const resources = await page.evaluate(() =>
    performance.getEntriesByType("resource").map((r) => r.name),
  );
  assert.equal(
    resources.some((url) => url.includes("rank-data")),
    false,
  );
  report.functional.push("no rank-data requests");
  await writeFile(
    process.argv.includes("--functional")
      ? resolve(out, "functional.json")
      : resolve(out, "report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  const differences = report.comparisons.filter((c) => c.overflow);
  assert.equal(differences.length, 0, JSON.stringify(differences));
  console.log(
    JSON.stringify(
      {
        browser: report.browser,
        version: report.version,
        comparisons: report.comparisons.length,
        functional: report.functional.length,
        differences,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
