import { expect, type Page, type TestInfo } from "playwright/test";

export async function expectIcons(page: Page, selector: string) {
  const uses = `:is(${selector}) use`;
  await expect(page.locator(uses).first()).toBeAttached();
  await expect
    .poll(() =>
      page.locator(uses).evaluateAll((elements) =>
        elements.every((element) => {
          const use = element as SVGUseElement;
          const box = use.getBBox();
          return (
            box.width > 0 &&
            box.height > 0 &&
            new URL(use.href.baseVal, location.href).pathname ===
              "/kuto-ladder/icons.svg"
          );
        }),
      ),
    )
    .toBe(true);
}

export async function capture(page: Page, info: TestInfo, name: string) {
  const path = info.outputPath(`${name}.png`);
  await page.screenshot({ path });
  await info.attach(name, { path, contentType: "image/png" });
}
