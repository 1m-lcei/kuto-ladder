import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { chromium } from "playwright";

await mkdir(".cache/qa/tmp", { recursive: true });
process.env.TEMP = process.env.TMP = resolve(".cache/qa/tmp");
await mkdir(".cache/bench", { recursive: true });
await mkdir("ai/v2/verification", { recursive: true });
await writeFile(
  ".cache/bench/old.ts",
  `import {calculatePath as calc} from "../../tests/reference/rankCalculator";
import efficient from "../baseline/dist/rank-data-efficient.json";
import heavy from "../baseline/dist/rank-data-match-heavy.json";
import second from "../baseline/dist/rank-data-target-second.json";
const data={efficient,"match-heavy":heavy,"target-second":second};
export function calculatePath(rank,strategy){return calc(rank,strategy,data[strategy]);}`,
);
await writeFile(
  ".cache/bench/new.ts",
  'export {calculatePath} from "../../src/utils/rankCalculator";',
);
for (const name of ["old", "new"]) {
  const build = await Bun.build({
    entrypoints: [`.cache/bench/${name}.ts`],
    target: "browser",
    minify: true,
  });
  assert.ok(build.success);
  await writeFile(`.cache/bench/${name}.js`, await build.outputs[0].text());
}
const browser = await chromium.launch({ channel: "msedge", headless: true });
const results = {
  date: new Date().toISOString(),
  browser: browser.version(),
  os: process.platform,
  measurements: [],
  gzip: {},
};
const percentile = (values, p) =>
  [...values].sort((a, b) => a - b)[Math.ceil(values.length * p) - 1];
try {
  for (const rate of [1, 6])
    for (const [index, port] of [4174, 4173].entries()) {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 900 },
        colorScheme: "light",
      });
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send("Emulation.setCPUThrottlingRate", { rate });
      await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
      await page.route("**/bench.js", async (route) =>
        route.fulfill({
          body: await readFile(`.cache/bench/${index ? "new" : "old"}.js`),
          contentType: "text/javascript",
        }),
      );
      await page.addInitScript(() => {
        const original = window.setTimeout;
        window.setTimeout = (callback, delay, ...args) =>
          original.call(
            window,
            typeof callback === "function"
              ? (...params) => {
                  if (delay === 200 && window.benchArmed)
                    window.benchStart = performance.now();
                  callback(...params);
                }
              : callback,
            delay,
            ...args,
          );
      });
      const paints = [],
        first = [];
      for (let run = 0; run < 30; run++) {
        await page.goto(`http://localhost:${port}/kuto-ladder/`);
        await page.locator("h1").waitFor();
        await page.waitForTimeout(250);
        paints.push(
          await page.evaluate(
            () =>
              performance.getEntriesByName("first-contentful-paint")[0]
                ?.startTime,
          ),
        );
        first.push(await update(page, "123", false));
      }
      await page.evaluate(async () => {
        window.calc = (await import("./bench.js")).calculatePath;
      });
      const calculations = await page.evaluate(() => {
        const values = [];
        for (let i = 0; i < 1200; i++) {
          const start = performance.now();
          window.calc(
            i % 2 ? 15001 : 123,
            ["efficient", "target-second", "match-heavy"][i % 3],
          );
          const elapsed = performance.now() - start;
          if (i >= 200) values.push(elapsed);
        }
        return values;
      });
      const switches = [],
        longest = [];
      for (let i = 0; i < 30; i++) {
        switches.push(
          await update(page, i % 2 ? "efficient" : "match-heavy", true),
        );
      }
      await update(page, "match-heavy", true);
      for (let i = 0; i < 30; i++) {
        longest.push(await update(page, i % 2 ? "15000" : "15001", false));
      }
      const measurement = {
        version: index ? "new" : "old",
        cpu: rate,
        firstPaintMedian: percentile(paints, 0.5),
        firstPaint: paints,
        calculationP95: percentile(calculations, 0.95),
        firstCalculationP95: percentile(
          first.map((x) => x.paint),
          0.95,
        ),
        strategyP95: percentile(
          switches.map((x) => x.paint),
          0.95,
        ),
        longestP95: percentile(
          longest.map((x) => x.paint),
          0.95,
        ),
        first,
        switches,
        longest,
      };
      results.measurements.push(measurement);
      console.log(
        JSON.stringify({
          ...measurement,
          first: undefined,
          switches: undefined,
          longest: undefined,
          firstPaint: undefined,
        }),
      );
      await context.close();
    }
  for (const [name, root] of [
    ["old", ".cache/baseline/dist"],
    ["new", "dist"],
  ]) {
    const { readdir } = await import("node:fs/promises");
    results.gzip[name] = 0;
    for (const file of await readdir(`${root}/assets`))
      if (/\.(js|css)$/.test(file))
        results.gzip[name] += gzipSync(
          await readFile(`${root}/assets/${file}`),
        ).length;
  }
  await writeFile(
    "ai/v2/verification/performance.json",
    `${JSON.stringify(results, null, 2)}\n`,
  );
  assert.ok(results.gzip.new <= 15000, "JS + CSS gzip <= 15 kB");
  for (const rate of [1, 6]) {
    const old = results.measurements.find(
      (m) => m.version === "old" && m.cpu === rate,
    );
    const current = results.measurements.find(
      (m) => m.version === "new" && m.cpu === rate,
    );
    assert.ok(
      current.firstPaintMedian <= old.firstPaintMedian,
      "FCP median does not regress",
    );
    assert.ok(
      current.calculationP95 <= (rate === 1 ? 1 : 5),
      "calculation p95 budget",
    );
    for (const key of ["firstCalculationP95", "strategyP95", "longestP95"]) {
      assert.ok(
        current[key] <= (rate === 1 ? 50 : 100),
        `${key}: absolute budget`,
      );
      assert.ok(current[key] <= old[key] + 5, `${key}: <=5ms regression`);
    }
  }
} finally {
  await browser.close();
}

async function update(page, value, strategy) {
  return await page.evaluate(
    ({ value, strategy }) =>
      new Promise((resolve) => {
        window.benchStart = 0;
        window.benchArmed = !strategy;
        const input = document.querySelector("input[type=text]");
        const select = [...document.querySelectorAll("select")].find(
          (el) => el.getBoundingClientRect().width,
        );
        const observer = new MutationObserver(() => {
          if (!window.benchStart || !document.querySelector("main ol")) return;
          observer.disconnect();
          window.benchArmed = false;
          requestAnimationFrame(() =>
            setTimeout(
              () =>
                resolve({
                  paint: performance.now() - window.benchStart,
                  debounce: strategy ? 0 : window.benchStart - requested,
                }),
              0,
            ),
          );
        });
        observer.observe(document.querySelector("main"), {
          childList: true,
          subtree: true,
          characterData: true,
        });
        const requested = performance.now();
        if (strategy) {
          window.benchStart = performance.now();
          select.value = value;
          select.dispatchEvent(new Event("change", { bubbles: true }));
        } else {
          Object.getOwnPropertyDescriptor(
            HTMLInputElement.prototype,
            "value",
          ).set.call(input, value);
          input.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }),
    { value, strategy },
  );
}
