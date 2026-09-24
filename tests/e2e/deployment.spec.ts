import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, test } from "playwright/test";
import { expectIcons } from "./helpers";

test("@smoke published assets match the tested build and primary controls work", async ({
  page,
  request,
  baseURL,
}) => {
  test.setTimeout(180_000);
  const root = resolve(process.env.TEST_DIST_DIR ?? "dist");
  const files = (await readdir(root, { recursive: true })).filter((file) =>
    /\.(html|js|css|svg|webp)$/.test(file),
  );
  expect(files).toContain("index.html");
  const hashes = await Promise.all(
    files.map(async (file) => ({
      file: file.replaceAll("\\", "/"),
      hash: createHash("sha256")
        .update(await readFile(resolve(root, file)))
        .digest("hex"),
    })),
  );
  await expect(async () => {
    for (const { file, hash } of hashes) {
      const url = new URL(file, baseURL);
      url.searchParams.set("verify", hash);
      const response = await request.get(url.href, {
        headers: { "Cache-Control": "no-cache" },
        timeout: 10_000,
      });
      expect(response.ok(), file).toBe(true);
      expect(
        createHash("sha256")
          .update(await response.body())
          .digest("hex"),
        file,
      ).toBe(hash);
      if (file.endsWith(".svg"))
        expect(response.headers()["content-type"]).toContain("image/svg+xml");
    }
  }).toPass({ timeout: 120_000, intervals: [1000, 2000, 5000] });
  const resources: string[] = [];
  const errors: string[] = [];
  page.on("request", (req) => resources.push(req.url()));
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(
    `./?verify=${hashes.find(({ file }) => file === "index.html")?.hash}`,
  );
  await page.locator("#rank").fill("15001");
  await expect(page.locator(".rank-number").first()).toHaveText("15001位");
  for (const strategy of ["match-heavy", "target-second", "efficient"]) {
    await page.locator("select").selectOption(strategy);
    await expect(page.locator(".rank-number").last()).toHaveText(
      strategy === "target-second" ? "2位" : "1位",
    );
    if (strategy === "match-heavy")
      await expect(page.locator(".rank-step")).toHaveCount(139);
  }
  await page.locator("#theme-toggle").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "night");
  await page.locator("#theme-toggle").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "emerald");
  await page.locator("#menu-trigger").click();
  await page.locator("#about-trigger").click();
  await expect(
    page.getByRole("dialog", { name: "このサイトについて" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#menu-trigger")).toBeFocused();
  await expectIcons(page, ".sun, .menu-icon, .rank-range");
  expect(errors).toEqual([]);
  expect(resources.some((url) => /rank-data|rank-boundaries/.test(url))).toBe(
    false,
  );
  expect(
    resources.every((url) => new URL(url).pathname.startsWith("/kuto-ladder/")),
  ).toBe(true);
});

test("missing assets and pages do not fall back to the application HTML", async ({
  request,
  baseURL,
}) => {
  for (const path of ["missing.js", "missing-page", "/icons.svg"]) {
    const response = await request.get(new URL(path, baseURL).href);
    expect(response.status(), path).toBe(404);
  }
});
