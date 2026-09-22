/// <reference lib="dom" />
// biome-ignore-all lint/style/noNonNullAssertion: Test fixtures use the application's static DOM.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve(".cache/browsers");
const temporary = resolve(".cache/qa/tmp");
await mkdir(temporary, { recursive: true });
process.env.TEMP = process.env.TMP = process.env.TMPDIR = temporary;
const { chromium, firefox, webkit } = await import("playwright");
const engine = process.argv[2] ?? "chromium";
assert(["chromium", "msedge", "firefox", "webkit"].includes(engine));
const browser = await (engine === "firefox"
  ? firefox
  : engine === "webkit"
    ? webkit
    : chromium
).launch({
  headless: true,
  ...(engine === "msedge" ? { channel: "msedge" } : {}),
});
const output = resolve(".cache/qa/regressions", engine);
await mkdir(output, { recursive: true });
const url = "http://localhost:4173/kuto-ladder/";

try {
  const page = await browser.newPage({ reducedMotion: "reduce" });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(url);
  assert.equal(await page.locator("noscript").isVisible(), false);
  await page.locator("#rank").fill("15001");
  await page.locator(".rank-step").first().waitFor();

  // Reflow, stable controls, and selected names at the 360px boundary.
  for (const dark of [false, true]) {
    await page.locator("#theme-toggle").setChecked(dark);
    for (const fontSize of ["100%", "200%"]) {
      await page.evaluate((size) => {
        document.documentElement.style.fontSize = size;
      }, fontSize);
      for (const width of [320, 359, 360, 375, 768]) {
        await page.setViewportSize({ width, height: 800 });
        let previous: unknown;
        for (const [strategy, label] of [
          ["efficient", "登頂"],
          ["target-second", "2位狙い"],
          ["match-heavy", "最多対戦"],
        ]) {
          await page.locator("select").selectOption(strategy);
          const layout = await page.evaluate(() => {
            const input = document.querySelector<HTMLInputElement>("#rank")!;
            const select = document.querySelector("select")!;
            const label = document.querySelector("label[for=rank]")!;
            const boxes = [input, select, label].map((el) =>
              el.getBoundingClientRect().toJSON(),
            );
            const overflow = [
              ...document.querySelectorAll(".rank-number, .rank-range"),
            ].some((el) => {
              const range = document.createRange();
              range.selectNodeContents(el);
              return [...range.getClientRects()].some(
                (rect) =>
                  rect.left < -1 ||
                  rect.right > document.documentElement.clientWidth + 1,
              );
            });
            return {
              boxes,
              overflow,
              documentOverflow:
                document.documentElement.scrollWidth > innerWidth,
              custom: CSS.supports("appearance", "base-select"),
            };
          });
          const name = `${engine} ${dark ? "night" : "emerald"} ${fontSize} ${width} ${strategy}`;
          assert(!layout.overflow && !layout.documentOverflow, name);
          for (const [index, rect] of layout.boxes.entries()) {
            assert(
              rect.width > 40 && rect.left >= 0 && rect.right <= width,
              name,
            );
            for (const other of layout.boxes.slice(index + 1)) {
              assert(
                rect.right <= other.left + 1 ||
                  other.right <= rect.left + 1 ||
                  rect.bottom <= other.top + 1 ||
                  other.bottom <= rect.top + 1,
                `overlapping controls: ${name}`,
              );
            }
          }
          if (previous) assert.deepEqual(layout.boxes, previous, name);
          previous = layout.boxes;
          if (fontSize === "100%") {
            const [input, select] = layout.boxes;
            assert.equal(
              Math.abs(input.y - select.y) < 1,
              width >= 360 || layout.custom,
              name,
            );
          }
          if (layout.custom) {
            assert.match(
              await page.locator("select > button").ariaSnapshot(),
              new RegExp(label),
              name,
            );
          }
        }
        if (width === 375) {
          const png = await page.screenshot({
            path: resolve(
              output,
              `${dark ? "night" : "emerald"}-${fontSize}.png`,
            ),
          });
          assert.equal(png.subarray(1, 4).toString(), "PNG");
          assert.equal(png.readUInt32BE(16), width);
          assert.equal(png.readUInt32BE(20), 800);
        }
      }
    }
  }
  console.log("PASS reflow, stable controls, and selected names (60 cases)");

  await page.evaluate(() => {
    document.documentElement.style.fontSize = "";
  });
  await page.locator("#theme-toggle").setChecked(false);
  await page.locator("#rank").focus();
  await page.keyboard.press("Tab");
  assert(
    await page
      .locator("select")
      .evaluate((el) => el === document.activeElement),
  );
  await page.locator("select").selectOption("efficient");
  await page.locator("select").focus();
  if (await page.evaluate(() => CSS.supports("appearance", "base-select")))
    await page.keyboard.press("Space");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  assert.equal(await page.locator("select").inputValue(), "match-heavy");
  await page.locator("#menu-trigger").focus();
  await page.keyboard.press("Enter");
  await page.locator("#header-menu").waitFor({ state: "visible" });
  await page.keyboard.press("Escape");
  await page.locator("#header-menu").waitFor({ state: "hidden" });
  assert(
    await page
      .locator("#menu-trigger")
      .evaluate((el) => el === document.activeElement),
  );

  // Printing must reveal offscreen rows even when motion is enabled.
  await page.emulateMedia({ media: "print", reducedMotion: "no-preference" });
  assert.equal(await page.locator(".rank-step").count(), 139);
  assert.equal(await page.locator(".rank-number").last().innerText(), "1位");
  assert(
    await page.locator(".rank-step").evaluateAll((rows) =>
      rows.every((row) => {
        const detail = getComputedStyle(row.querySelector(".rank-detail")!);
        const marker = getComputedStyle(row, "::after");
        return (
          [detail, marker].every(
            (style) =>
              style.opacity === "1" &&
              style.filter === "none" &&
              style.animationName === "none" &&
              style.transform === "none" &&
              style.translate === "none" &&
              style.transitionDuration === "0s",
          ) && getComputedStyle(row).breakInside === "avoid"
        );
      }),
    ),
  );
  assert.match(
    await page
      .locator(".rank-step")
      .nth(1)
      .evaluate((el) => getComputedStyle(el, "::before").translate),
    /-50%/,
  );
  if (engine === "chromium" || engine === "msedge") {
    await page.pdf({
      path: resolve(output, "path.pdf"),
      format: "A4",
      printBackground: true,
    });
    await writeFile(
      resolve(output, "print-rows.json"),
      JSON.stringify(await page.locator(".rank-detail").allTextContents()),
    );
  }
  console.log("PASS print visibility and preserved connectors");

  // A real rendering failure must replace the old result, not throw again.
  await page.emulateMedia({ media: "screen", reducedMotion: "reduce" });
  await page.evaluate(() => {
    document.querySelector<HTMLTemplateElement>(
      "#path-step",
    )!.content.cloneNode = () => {
      throw new Error("test rendering failure");
    };
  });
  await page.locator("#rank").fill("100");
  await page.locator("#result [role=alert]").waitFor();
  assert.match(
    await page.locator("#result").innerText(),
    /test rendering failure/,
  );
  assert.equal(await page.locator(".rank-step").count(), 0);
  assert.deepEqual(errors, []);
  console.log("PASS rendering error alert");

  const fallback = await browser.newPage({
    reducedMotion: "reduce",
    viewport: { width: 375, height: 800 },
  });
  await fallback.addInitScript(() => {
    const supports = CSS.supports.bind(CSS);
    CSS.supports = (property: string, value?: string) =>
      property === "position-anchor"
        ? false
        : value === undefined
          ? supports(property)
          : supports(property, value);
  });
  await fallback.goto(url);
  await fallback.addStyleTag({
    content:
      "#header-menu {position-anchor:auto;translate:none;} :root {font-size:200%;}",
  });
  await fallback.locator("#rank").fill("15001");
  await fallback.locator(".rank-step").first().waitFor();
  await fallback.locator("#menu-trigger").click();
  await fallback.locator("#header-menu").waitFor({ state: "visible" });
  for (const width of [375, 320, 375]) {
    await fallback.setViewportSize({ width, height: 800 });
    for (const scroll of [0, 40]) {
      await fallback.evaluate((y) => window.scrollTo(0, y), scroll);
      await fallback.waitForFunction(() => {
        const rect = document
          .querySelector("#header-menu")!
          .getBoundingClientRect();
        const trigger = document
          .querySelector("#menu-trigger")!
          .getBoundingClientRect();
        return (
          rect.left >= 0 &&
          rect.right <= document.documentElement.clientWidth + 1 &&
          rect.top >= 0 &&
          rect.bottom <= document.documentElement.clientHeight + 1 &&
          Math.abs(rect.top - trigger.bottom) < 1
        );
      });
    }
  }
  await fallback.keyboard.press("Escape");
  await fallback.locator("#header-menu").waitFor({ state: "hidden" });
  console.log("PASS anchor fallback at enlarged text sizes");

  const ordinary = await browser.newPage();
  await ordinary.addInitScript(() => {
    Reflect.deleteProperty(HTMLElement.prototype, "showPopover");
  });
  await ordinary.goto(url);
  assert.equal(await ordinary.locator("#menu-trigger").isVisible(), false);
  assert.equal(await ordinary.locator("#header-menu a:visible").count(), 2);
  await ordinary.locator("#theme-toggle").focus();
  await ordinary.keyboard.press("Tab");
  assert(
    await ordinary
      .locator("#header-menu a")
      .first()
      .evaluate((el) => el === document.activeElement),
  );
  console.log(
    `PASS ordinary links without Popover (${engine} ${browser.version()})`,
  );

  const noScript = await browser.newPage({
    javaScriptEnabled: false,
    viewport: { width: 320, height: 800 },
  });
  await noScript.goto(url);
  assert(await noScript.locator("noscript p").isVisible());
  assert.match(
    await noScript.locator("noscript p").innerText(),
    /JavaScriptが無効.*再読み込み/,
  );
  assert(
    await noScript.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  const notice = await noScript.screenshot({
    path: resolve(output, "no-script.png"),
  });
  assert.equal(notice.subarray(1, 4).toString(), "PNG");
  assert.equal(notice.readUInt32BE(16), 320);
  assert.equal(notice.readUInt32BE(20), 800);
  console.log("PASS JavaScript-disabled notice (hidden when enabled)");

  for (const mode of [
    "reduced",
    "unsupported-motion",
    "unsupported-selectors",
    "native-select",
  ]) {
    const plain = await browser.newPage({
      reducedMotion: mode === "reduced" ? "reduce" : "no-preference",
      viewport: { width: 320, height: 800 },
    });
    if (mode !== "reduced") {
      // Simulate rejected CSS feature queries; overriding CSS.supports() alone
      // would not affect the stylesheet's @supports conditions.
      await plain.route("**/*.css", async (route) => {
        const response = await route.fetch();
        const css = (await response.text()).replace(
          /@supports[^{}]+/g,
          (condition) => {
            if (mode === "native-select")
              return condition.replace(
                /appearance\s*:\s*base-select/g,
                "unsupported-feature: none",
              );
            const missing =
              mode === "unsupported-selectors"
                ? /selector\([^)]*:(?:popover-)?open\)/
                : /interpolate-size|transition-behavior|sibling-index|view-timeline/;
            return missing.test(condition)
              ? "@supports (unsupported-feature: none)"
              : condition;
          },
        );
        await route.fulfill({ response, body: css });
      });
    }
    await plain.goto(url);
    await plain.locator("#rank").fill("15001");
    await plain.locator(".rank-step").first().waitFor();
    await plain.locator("select").selectOption("match-heavy");
    assert.equal(await plain.locator(".rank-step").count(), 139);
    if (mode === "reduced" || mode === "unsupported-motion") {
      assert(
        await plain.locator(".rank-detail").evaluateAll((rows) =>
          rows.every((row) => {
            const style = getComputedStyle(row);
            return (
              style.opacity === "1" &&
              style.filter === "none" &&
              style.animationName === "none" &&
              style.transitionDuration === "0s"
            );
          }),
        ),
        mode,
      );
    }
    await plain.locator("#menu-trigger").click();
    await plain.locator("#header-menu").waitFor({ state: "visible" });
    if (mode !== "native-select") {
      assert.deepEqual(
        await plain.locator("#header-menu").evaluate((el) => {
          const style = getComputedStyle(el);
          return [style.opacity, style.transitionDuration];
        }),
        ["1", "0s"],
        mode,
      );
    }
    await plain.keyboard.press("Escape");
    await plain.locator("#header-menu").waitFor({ state: "hidden" });
    if (mode === "native-select") {
      assert.notEqual(
        await plain
          .locator("select")
          .evaluate((el) => getComputedStyle(el).appearance),
        "base-select",
      );
      assert.match(
        (await plain.locator("select option").allTextContents()).join("\n"),
        /登頂[\s\S]*2位狙い[\s\S]*最多対戦/,
      );
      await plain.locator("select").selectOption("target-second");
      assert.equal(
        await plain.locator(".rank-number").last().innerText(),
        "2位",
      );
    } else if (
      await plain.evaluate(() => CSS.supports("appearance", "base-select"))
    ) {
      await plain.locator("select").focus();
      await plain.keyboard.press("Space");
      assert.deepEqual(
        await plain.locator("select").evaluate((el) => {
          const style = getComputedStyle(el, "::picker(select)");
          return [style.opacity, style.transitionDuration];
        }),
        ["1", "0s"],
        mode,
      );
      await plain.keyboard.press("Escape");
    }
    await plain.close();
  }
  console.log(
    "PASS reduced motion, unsupported decoration, and native select fallbacks",
  );
} finally {
  await browser.close();
}
