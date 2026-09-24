// biome-ignore-all lint/style/noNonNullAssertion: The static application owns these elements.
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { expect, test } from "playwright/test";
import { capture, expectIcons } from "./helpers";

for (const dark of [false, true]) {
  for (const fontSize of ["100%", "200%"]) {
    for (const width of [320, 359, 360, 375, 768, 1280]) {
      test(`form reflow ${dark ? "night" : "emerald"} ${fontSize} ${width}px`, async ({
        page,
        baseURL,
      }, testInfo) => {
        const url = baseURL!;
        const engine = testInfo.project.name;

        await page.goto(url);
        assert.equal(await page.locator("noscript").isVisible(), false);
        await page.locator("#rank").fill("15001");
        await page.locator(".rank-step").first().waitFor();
        const sprite = await page.request.get(new URL("icons.svg", url).href);
        assert(sprite.ok());
        assert.match(sprite.headers()["content-type"]!, /image\/svg\+xml/);
        await expectIcons(page, ".sun, .menu-icon, .rank-range");

        await page.locator("#menu-trigger").click();
        await page
          .locator(`input[name="theme"][value="${dark ? "dark" : "light"}"]`)
          .check();
        await page.keyboard.press("Escape");
        await page.evaluate((size) => {
          document.documentElement.style.fontSize = size;
        }, fontSize);
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
            await expectIcons(page, "select > button");
          } else {
            const text = await page
              .locator(`option[value="${strategy}"]`)
              .textContent();
            assert(
              text?.includes(
                strategy === "efficient"
                  ? "🥇"
                  : strategy === "target-second"
                    ? "🥈"
                    : "⚔",
              ),
            );
          }
        }
        if (
          width === 375 ||
          (fontSize === "100%" && (width === 359 || width === 360))
        ) {
          await capture(
            page,
            testInfo,
            `${width}-${dark ? "night" : "emerald"}-${fontSize}`,
          );
        }
      });
    }
  }
}

test("keyboard strategy selection and menu Escape focus", async ({
  page,
  baseURL,
}) => {
  const url = baseURL!;
  await page.goto(url);
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
});

test("printing reveals every row without animations", async ({
  page,
  baseURL,
}, testInfo) => {
  const url = baseURL!;
  const engine = testInfo.project.name;
  await page.goto(url);
  await page.locator("#rank").fill("15001");
  await page.locator(".rank-step").first().waitFor();
  await page.locator("select").selectOption("match-heavy");
  // Printing must reveal offscreen rows even when motion is enabled.
  await page.emulateMedia({ media: "print", reducedMotion: "no-preference" });
  await expectIcons(page, ".rank-range");
  assert.equal(await page.locator(".rank-step").count(), 139);
  assert.equal(await page.locator(".rank-number").last().innerText(), "1位");
  assert(
    await page.locator(".rank-step").evaluateAll((rows) =>
      rows.every((row) => {
        const detail = getComputedStyle(row.querySelector(".rank-detail")!);
        const marker = getComputedStyle(row, "::after");
        return (
          [getComputedStyle(row), detail, marker].every(
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
      path: testInfo.outputPath("path.pdf"),
      format: "A4",
      printBackground: true,
    });
    await writeFile(
      testInfo.outputPath("print-rows.json"),
      JSON.stringify(await page.locator(".rank-detail").allTextContents()),
    );
  }
});

test("longest path remains interactive with motion enabled", async ({
  page,
  baseURL,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(baseURL!);
  await page.locator("#rank").fill("15001");
  await page.locator(".rank-step").first().waitFor();
  await page.locator("select").selectOption("match-heavy");
  await expect(page.locator(".rank-step")).toHaveCount(139);
  await page.locator("#menu-trigger").click();
  await expect(page.locator("#header-menu")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#header-menu")).toBeHidden();
  const terminal = page.locator(".rank-number").last();
  await terminal.scrollIntoViewIfNeeded();
  await expect(terminal).toHaveText("1位");
  await expect(terminal).toBeInViewport();
  await expect(page.locator(".rank-step").last()).toHaveCSS("opacity", "1");
  await expect(page.locator(".rank-detail").last()).toHaveCSS("opacity", "1");
});

test("reduced motion and unsupported CSS/select fallbacks", async ({
  baseURL,
  browser,
}) => {
  const url = baseURL!;

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
        await plain.locator(".rank-step, .rank-detail").evaluateAll((rows) =>
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
});

test("JavaScript-disabled notice stays readable and its icon renders", async ({
  browser,
  baseURL,
}, info) => {
  const page = await browser.newPage({
    javaScriptEnabled: false,
    viewport: { width: 320, height: 800 },
  });
  try {
    await page.goto(baseURL!);
    assert(await page.locator("noscript p").isVisible());
    await expectIcons(page, "noscript");
    assert.match(
      await page.locator("noscript p").innerText(),
      /JavaScriptが無効.*再読み込み/,
    );
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await capture(page, info, "no-script");
  } finally {
    await page.close();
  }
});
