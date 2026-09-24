// biome-ignore-all lint/style/noNonNullAssertion: The static application owns these elements.
import { readFile, writeFile } from "node:fs/promises";
import { expect, test } from "playwright/test";

type Measurement = {
  rate: number;
  kind: string;
  samples: number[];
  p95: number;
};
type TimingWindow = typeof window & { benchStart: number; benchArmed: boolean };

test("rendering budgets at normal and 6x CPU load", async ({
  page,
  context,
}, info) => {
  test.setTimeout(180_000);
  const measurements: Measurement[] = [];
  const session = await context.newCDPSession(page);
  for (const rate of [1, 6]) {
    await session.send("Emulation.setCPUThrottlingRate", { rate });
    await page.goto("./");
    await page.evaluate(() => {
      const timing = window as TimingWindow;
      const timeout = window.setTimeout.bind(window);
      // Start at the actual parse callback, excluding debounce and timer delivery.
      window.setTimeout = ((
        callback: TimerHandler,
        delay?: number,
        ...args: unknown[]
      ) =>
        timeout(
          typeof callback === "function"
            ? () => {
                if (delay === 200 && timing.benchArmed)
                  timing.benchStart = performance.now();
                callback(...args);
              }
            : callback,
          delay,
        )) as typeof window.setTimeout;
    });
    for (const kind of ["first", "strategy", "longest"]) {
      const samples: number[] = [];
      if (kind !== "first") {
        await page.locator("#rank").fill("123");
        await expect(page.locator(".rank-number").first()).toHaveText("123位");
      }
      await page
        .locator("select")
        .selectOption(kind === "longest" ? "match-heavy" : "efficient");
      for (let index = 0; index < 30; index++) {
        if (kind === "first") {
          await page.locator("#rank").fill("");
          await expect(page.locator(".rank-step")).toHaveCount(0);
        }
        samples.push(
          await page.evaluate(
            ({ kind, index }) =>
              new Promise<number>((resolve) => {
                const timing = window as TimingWindow;
                timing.benchStart = 0;
                timing.benchArmed = kind !== "strategy";
                const observer = new MutationObserver(() => {
                  if (!timing.benchStart) return;
                  const start = timing.benchStart;
                  observer.disconnect();
                  timing.benchArmed = false;
                  requestAnimationFrame(() =>
                    setTimeout(() => resolve(performance.now() - start), 0),
                  );
                });
                observer.observe(document.querySelector("#result")!, {
                  childList: true,
                  subtree: true,
                  characterData: true,
                });
                if (kind === "strategy") {
                  const select = document.querySelector("select")!;
                  select.value = index % 2 ? "efficient" : "match-heavy";
                  timing.benchStart = performance.now();
                  select.dispatchEvent(new Event("change", { bubbles: true }));
                } else {
                  const input =
                    document.querySelector<HTMLInputElement>("#rank")!;
                  input.value =
                    kind === "first" ? "123" : index % 2 ? "15000" : "15001";
                  input.dispatchEvent(new Event("input", { bubbles: true }));
                }
              }),
            { kind, index },
          ),
        );
      }
      measurements.push({
        rate,
        kind,
        samples,
        p95: [...samples].sort((a, b) => a - b)[
          Math.ceil(samples.length * 0.95) - 1
        ],
      });
    }
  }
  const output = info.outputPath("render.json");
  await writeFile(
    output,
    JSON.stringify(
      {
        browser: page.context().browser()?.version(),
        viewport: page.viewportSize(),
        measurements,
      },
      null,
      2,
    ),
  );
  await info.attach("render timings", {
    path: output,
    contentType: "application/json",
  });
  const baseline: { measurements: Measurement[] } | undefined = process.env
    .PERFORMANCE_BASELINE
    ? JSON.parse(await readFile(process.env.PERFORMANCE_BASELINE, "utf8"))
    : undefined;
  for (const current of measurements) {
    expect(
      current.p95,
      `${current.kind}, CPU x${current.rate}`,
    ).toBeLessThanOrEqual(current.rate === 1 ? 50 : 100);
    if (baseline) {
      const previous = baseline.measurements.find(
        ({ rate, kind }) => rate === current.rate && kind === current.kind,
      );
      expect(previous).toBeDefined();
      expect(
        current.p95,
        `${current.kind}, CPU x${current.rate}, baseline +5ms`,
      ).toBeLessThanOrEqual(previous!.p95 + 5);
    }
  }
});
