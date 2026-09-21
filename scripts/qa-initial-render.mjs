import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { createServer } from "vite";

await mkdir(".cache/qa/tmp", { recursive: true });
process.env.TEMP = process.env.TMP = resolve(".cache/qa/tmp");
const { chromium } = await import("playwright");
const server = await createServer({
  server: { host: "127.0.0.1", port: 0, watch: { ignored: ["**/.cache/**"] } },
});
await server.listen();
let browser;
try {
  browser = await chromium.launch({
    ...(process.argv[2]
      ? { executablePath: process.argv[2] }
      : { channel: "msedge" }),
    headless: true,
  });
  const page = await browser.newPage({
    viewport: { width: 375, height: 700 },
    reducedMotion: "reduce",
  });
  // Reproduce the interval before Vite's application module supplies any CSS.
  await page.route("**/*", (route) =>
    route.request().resourceType() === "script"
      ? route.abort()
      : route.continue(),
  );
  const url = `http://127.0.0.1:${server.httpServer.address().port}/`;
  for (const colorScheme of ["light", "dark"]) {
    await page.emulateMedia({ colorScheme });
    await page.goto(url);
    assert.equal(
      await page
        .locator(`.theme-toggle .${colorScheme === "dark" ? "moon" : "sun"}`)
        .isVisible(),
      true,
    );
    assert.equal(
      await page
        .locator(".theme-toggle")
        .evaluate((e) => getComputedStyle(e).display),
      "grid",
    );
    const bounds = await page
      .locator(".theme-toggle svg:visible")
      .boundingBox();
    assert.equal(bounds.width, 24);
    assert.equal(bounds.height, 24);
    const png = await page.screenshot({
      path: `.cache/qa/initial-${colorScheme}.png`,
    });
    assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(png.readUInt32BE(16), 375);
    assert.equal(png.readUInt32BE(20), 700);
  }
  // SVG dimensions also remain bounded if the stylesheet itself fails.
  await page.route("**/*.css", (route) => route.abort());
  await page.reload();
  for (const icon of await page.locator(".theme-toggle svg").all()) {
    const bounds = await icon.boundingBox();
    assert.equal(bounds.width, 24);
    assert.equal(bounds.height, 24);
  }
  console.log(
    "PASS",
    browser.version(),
    "dev CSS loads without app JS; theme SVG dimensions survive missing CSS",
  );
} finally {
  await browser?.close();
  await server.close();
}
