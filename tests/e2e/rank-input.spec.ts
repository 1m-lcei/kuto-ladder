// biome-ignore-all lint/style/noNonNullAssertion: The static application owns these elements.
import { expect, test } from "playwright/test";
import { calculatePath } from "../reference/rankCalculator";
import { referenceData } from "../reference/rankData";
import { expectIcons } from "./helpers";

const data = referenceData();

test("native validity preserves text and initial empty appearance", async ({
  page,
}) => {
  await page.goto("./");
  const input = page.locator("#rank");
  await expect(page.locator("#rank-hint")).toBeHidden();
  expect(await input.evaluate((el) => el.matches(":user-invalid"))).toBe(false);
  await expect(input).toHaveAttribute("type", "text");
  await expect(input).toHaveAttribute("inputmode", "numeric");
  await expect(input).toHaveAttribute("aria-describedby", "rank-hint");
  await expect(page.locator("form")).toHaveAttribute("novalidate", "");
  await page.clock.install();
  await page.clock.pauseAt(Date.now() + 1000);
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
    "1２3",
    "2.5",
    "2e2",
    "+2",
    " 2",
    "2 ",
    "12x",
    "9".repeat(400),
  ]) {
    await input.fill(value);
    await page.clock.runFor(200);
    const valid =
      /^[0-9０-９]+$/.test(value) &&
      Number(value.normalize("NFKC")) >= 2 &&
      Number(value.normalize("NFKC")) <= 15001;
    expect(
      await input.evaluate((el: HTMLInputElement) => ({
        valid: el.validity.valid,
        custom: el.validity.customError,
      })),
    ).toEqual({ valid, custom: false });
    expect((await page.locator(".rank-step").count()) > 0, value).toBe(valid);
    await expect(input).toHaveValue(value);
    await expect(input).toBeFocused();
    await expect(page.locator("#result [role=alert]")).toHaveCount(0);
    await expect(page.locator("#rank-hint")).toBeVisible({
      visible: Boolean(value) && !valid,
    });
  }
});

test("debounce, composition and strategy changes use the last completed parse", async ({
  page,
}) => {
  await page.goto("./");
  await page.clock.install();
  await page.clock.pauseAt(Date.now() + 1000);
  const input = page.locator("#rank");
  const first = page.locator(".rank-number").first();
  await input.fill("123");
  await page.clock.runFor(199);
  await expect(page.locator(".rank-step")).toHaveCount(0);
  await page.clock.runFor(1);
  await expect(first).toHaveText("123位");
  await input.fill("124");
  await page.clock.runFor(100);
  await input.evaluate((el) =>
    el.dispatchEvent(
      new CompositionEvent("compositionstart", { bubbles: true }),
    ),
  );
  await input.evaluate((el: HTMLInputElement) => {
    el.value = "１";
    el.dispatchEvent(
      new InputEvent("input", { bubbles: true, isComposing: true }),
    );
  });
  await page.clock.runFor(500);
  await expect(first).toHaveText("123位");
  await page.locator("select").selectOption("match-heavy");
  await expect(first).toHaveText("123位");
  await input.evaluate((el) =>
    el.dispatchEvent(
      new CompositionEvent("compositionend", { bubbles: true, data: "１" }),
    ),
  );
  await page.clock.runFor(199);
  await expect(first).toHaveText("123位");
  await page.clock.runFor(1);
  await expect(page.locator(".rank-step")).toHaveCount(0);
  await input.fill("123");
  await page.clock.runFor(200);
  await input.evaluate((el: HTMLInputElement) => {
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
  await page.clock.runFor(200);
  await expect(first).toHaveText("123位");
  await input.fill("15001");
  await page.locator("select").selectOption("efficient");
  await expect(first).toHaveText("123位");
  await page.clock.runFor(200);
  await expect(first).toHaveText("15001位");
});

test("complete paths, terminal rows, tones, DOM reuse and submission", async ({
  page,
}) => {
  await page.goto("./");
  const url = page.url();
  const input = page.locator("#rank");
  for (const strategy of [
    "efficient",
    "match-heavy",
    "target-second",
  ] as const) {
    await page.locator("select").selectOption(strategy);
    for (const rank of [2, 13, 100, 15001]) {
      await input.fill(String(rank));
      const path = calculatePath(rank, strategy, data[strategy]);
      const rows = page.locator(".rank-step");
      await expect(rows).toHaveCount(path.length ? path.length + 1 : 0);
      if (!path.length) continue;
      await expect(page.locator(".rank-number")).toHaveText([
        ...path.map((step) => `${step.currentRank}位`),
        `${strategy === "target-second" ? 2 : 1}位`,
      ]);
      expect(
        await rows.evaluateAll((elements) =>
          elements.map((el) => ({
            tone: el.className,
            marker: (el as HTMLElement).dataset.content,
          })),
        ),
      ).toEqual(
        Array.from({ length: path.length + 1 }, (_, index) => ({
          tone: `rank-step${index < 6 ? " primary" : path.length >= 11 && index < 11 ? " secondary" : ""}`,
          marker: index === 0 ? "📌" : String(index),
        })),
      );
      await expect(rows.last().locator(".rank-range")).toHaveCount(0);
      for (const [index, step] of path.entries()) {
        const [max, min] = step.nextRankRange;
        await expect(rows.nth(index).locator(".rank-range")).toContainText(
          max === min ? `${max}位` : `${min}位 〜 ${max}位`,
        );
      }
    }
  }
  await page.locator("select").selectOption("match-heavy");
  await expect(page.locator(".rank-step")).toHaveCount(139);
  const row = await page.locator(".rank-step").nth(1).elementHandle();
  await input.fill("15000");
  await expect(page.locator(".rank-number").first()).toHaveText("15000位");
  expect(
    await row!.evaluate(
      (el) => el === document.querySelectorAll(".rank-step")[1],
    ),
  ).toBe(true);
  await expect(input).toBeFocused();
  await input.press("Enter");
  await expect(page).toHaveURL(url);
  await expect(input).toHaveValue("15000");
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`input colors in ${colorScheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto("./");
    const input = page.locator("#rank");
    await input.fill("123");
    const primary = await page
      .locator("select")
      .evaluate((el) => getComputedStyle(el).borderColor);
    await expect(input).toHaveCSS("border-color", primary);
    await expect(input).toHaveCSS("outline-color", primary);
    await input.fill("1");
    await expect(page.locator("#rank-hint")).toBeVisible();
    expect(
      await input.evaluate((el) => getComputedStyle(el).borderColor),
    ).not.toBe(primary);
  });
}

test("rendering exceptions replace the previous path with an alert", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await page.locator("#rank").fill("15001");
  await expect(page.locator(".rank-step").first()).toBeVisible();
  await page.evaluate(() => {
    document.querySelector<HTMLTemplateElement>(
      "#path-step",
    )!.content.cloneNode = () => {
      throw new Error("test rendering failure");
    };
  });
  await page.locator("#rank").fill("100");
  await expect(page.locator("#result [role=alert]")).toContainText(
    "test rendering failure",
  );
  await expect(page.locator(".rank-step")).toHaveCount(0);
  await expectIcons(page, ".result-alert");
  expect(errors).toEqual([]);
});
