// biome-ignore-all lint/style/noNonNullAssertion: The static application owns these elements.
import assert from "node:assert/strict";
import { expect, test } from "playwright/test";
import { expectIcons } from "./helpers";

test("theme preferences, toggles, keyboard controls and persisted legacy settings", async ({
  page: settings,
  baseURL,
}) => {
  const url = baseURL!;

  await settings.goto(url);
  const expectTheme = async (preference: string, rendered: string) => {
    await settings.waitForFunction(
      (theme) => document.documentElement.dataset.theme === theme,
      rendered,
    );
    assert.equal(
      await settings.locator('input[name="theme"]:checked').inputValue(),
      preference,
    );
    assert.equal(
      await settings.locator(".theme-toggle .moon").isVisible(),
      rendered === "night",
    );
    assert.equal(
      await settings.locator(".theme-toggle .sun").isVisible(),
      rendered === "emerald",
    );
    await expectIcons(settings, rendered === "night" ? ".moon" : ".sun");
    const action =
      rendered === "night"
        ? "ライトモードに切り替える"
        : "ダークモードに切り替える";
    assert.equal(
      await settings.locator("#theme-toggle").getAttribute("aria-label"),
      action,
    );
    assert.equal(
      await settings.locator("#theme-toggle").getAttribute("title"),
      action,
    );
    assert.deepEqual(
      await settings
        .locator('meta[name="theme-color"]')
        .evaluateAll((metas) =>
          metas.map((meta) => meta.getAttribute("content")),
        ),
      Array(2).fill(rendered === "night" ? "#0f172a" : "#ffffff"),
    );
  };
  await expectTheme("system", "emerald");
  await settings.locator("#theme-toggle").click();
  await expectTheme("dark", "night");
  await settings.emulateMedia({ colorScheme: "dark" });
  await expectTheme("dark", "night");
  await settings.locator("#theme-toggle").click();
  await expectTheme("light", "emerald");
  await settings.locator("#theme-toggle").click();
  await expectTheme("system", "night");
  await settings.emulateMedia({ colorScheme: "light" });
  await expectTheme("system", "emerald");
  await settings.locator("#theme-toggle").click();
  await settings.reload();
  await expectTheme("dark", "night");
  for (const [stored, preference, rendered] of [
    ["emerald", "light", "emerald"],
    ["night", "dark", "night"],
    ["light", "light", "emerald"],
    ["dark", "dark", "night"],
    ["system", "system", "emerald"],
    ["invalid", "system", "emerald"],
  ]) {
    await settings.evaluate(
      (theme) =>
        localStorage.setItem(
          "kuto-ladder-config",
          JSON.stringify({ version: 1, theme, strategy: "match-heavy" }),
        ),
      stored,
    );
    await settings.reload();
    await expectTheme(preference, rendered);
  }
  for (const preference of ["light", "dark", "system"]) {
    await settings.locator("#menu-trigger").click();
    await settings
      .locator(`input[name="theme"][value="${preference}"]`)
      .check();
    await settings.keyboard.press("Escape");
    await settings.emulateMedia({ colorScheme: "dark" });
    await expectTheme(preference, preference === "light" ? "emerald" : "night");
    const saved = await settings.evaluate(() =>
      JSON.parse(localStorage.getItem("kuto-ladder-config")!),
    );
    assert.deepEqual(saved, {
      version: 1,
      theme: preference,
      strategy: "match-heavy",
    });
    await settings.reload();
    await expectTheme(preference, preference === "light" ? "emerald" : "night");
  }
  for (const [colorScheme, preference, next, rendered] of [
    ["light", "system", "dark", "night"],
    ["light", "light", "dark", "night"],
    ["light", "dark", "system", "emerald"],
    ["dark", "system", "light", "emerald"],
    ["dark", "dark", "light", "emerald"],
    ["dark", "light", "system", "night"],
  ] as const) {
    await settings.emulateMedia({ colorScheme });
    await settings.locator("#menu-trigger").click();
    await settings
      .locator(`input[name="theme"][value="${preference}"]`)
      .check();
    await settings.keyboard.press("Escape");
    await settings.locator("#theme-toggle").click();
    await expectTheme(next, rendered);
    assert.equal(
      await settings.evaluate(
        () => JSON.parse(localStorage.getItem("kuto-ladder-config")!).theme,
      ),
      next,
    );
    await settings.reload();
    await expectTheme(next, rendered);
  }
  await settings.locator("#theme-toggle").click();
  await expectTheme("light", "emerald");
  await settings.locator("#theme-toggle").click();
  await expectTheme("system", "night");
  await settings.locator("#menu-trigger").focus();
  await settings.keyboard.press("Enter");
  await settings.keyboard.press("Tab");
  const themeGroup = settings.getByRole("group", {
    name: "テーマ",
    exact: true,
  });
  await expect(
    themeGroup.getByRole("radio", { name: "システム", exact: true }),
  ).toBeFocused();
  await expect(themeGroup.locator("label:has(:focus-visible)")).toHaveCount(1);
  for (const [key, preference, rendered] of [
    ["ArrowRight", "light", "emerald"],
    ["ArrowRight", "dark", "night"],
    ["ArrowLeft", "light", "emerald"],
    ["ArrowLeft", "system", "night"],
  ]) {
    await settings.keyboard.press(key!);
    await expectTheme(preference!, rendered!);
    // WebKit clears :focus-visible during native radio arrow navigation.
    await expect(themeGroup.locator("input:checked")).toBeFocused();
  }
  await settings.keyboard.press("Tab");
  assert(
    await settings
      .locator("#about-trigger")
      .evaluate((el) => el === document.activeElement),
  );
  await settings.emulateMedia({ forcedColors: "active" });
  assert(
    await themeGroup.evaluate((el) => {
      const selected = el.querySelector("label:has(:checked)")!;
      const unselected = el.querySelector("label:not(:has(:checked))")!;
      return (
        getComputedStyle(selected).backgroundColor !==
        getComputedStyle(unselected).backgroundColor
      );
    }),
  );
  await settings.emulateMedia({ forcedColors: "none" });
  await settings.keyboard.press("Escape");
});

test("early theme works before the application module loads", async ({
  page: early,
  baseURL,
}) => {
  const url = baseURL!;
  await early.emulateMedia({ colorScheme: "dark" });
  await early.route("**/*.js", (route) => route.abort());
  await early.goto(url);
  for (const [theme, rendered] of [
    ["light", "emerald"],
    ["dark", "night"],
    ["system", "night"],
    ["emerald", "emerald"],
    ["night", "night"],
  ]) {
    await early.evaluate(
      (theme) =>
        localStorage.setItem(
          "kuto-ladder-config",
          JSON.stringify({ version: 1, theme }),
        ),
      theme,
    );
    await early.reload();
    assert.equal(
      await early.locator("html").getAttribute("data-theme"),
      rendered,
    );
  }
  await early.close();
});

for (const config of [
  "{",
  "null",
  '{"version":1,"theme":"bad","strategy":"bad"}',
  '{"version":2,"theme":"night"}',
]) {
  test(`malformed settings recover: ${config}`, async ({ page }) => {
    await page.addInitScript(
      (value) => localStorage.setItem("kuto-ladder-config", value),
      config,
    );
    await page.goto("./");
    await expect(page.locator("select")).toHaveValue("efficient");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "emerald");
    await page.locator("#rank").fill("123");
    await expect(page.locator(".rank-number").first()).toHaveText("123位");
  });
}

test("unavailable storage leaves all controls working", async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("blocked storage");
      },
    }),
  );
  await page.goto("./");
  await page.locator("#theme-toggle").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "night");
  await page.locator("#rank").fill("2");
  await expect(page.locator(".rank-step")).toHaveCount(2);
  await page.locator("select").selectOption("target-second");
  await expect(page.locator(".rank-step")).toHaveCount(0);
});

test("theme control renders before the application initializes", async ({
  page,
}) => {
  let release!: () => void;
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/*.js", async (route) => {
    await ready;
    await route.continue();
  });
  const navigation = page.goto("./");
  try {
    await expect(page.locator(".toolbar")).toHaveCSS("display", "flex");
    await expect(page.locator("#menu-trigger")).toBeHidden();
    await expectIcons(page, ".sun");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "emerald");
    release();
    await navigation;
    await expect(page.locator("#menu-trigger")).toBeVisible();
    await page.locator("#theme-toggle").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "night");
  } finally {
    release();
  }
});
