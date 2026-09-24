// biome-ignore-all lint/style/noNonNullAssertion: The static application owns these elements.
import assert from "node:assert/strict";
import { expect, test } from "playwright/test";
import { capture, expectIcons } from "./helpers";

test("anchor fallback follows resize and scroll at 200% text", async ({
  page: fallback,
  baseURL,
}) => {
  const url = baseURL!;

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
});

test("ordinary settings and focus return without Popover", async ({
  page: ordinary,
  baseURL,
}) => {
  const url = baseURL!;

  await ordinary.addInitScript(() => {
    Reflect.deleteProperty(HTMLElement.prototype, "showPopover");
  });
  await ordinary.goto(url);
  assert.equal(await ordinary.locator("#menu-trigger").isVisible(), false);
  assert.equal(
    await ordinary.locator('#header-menu input[type="radio"]:visible').count(),
    3,
  );
  assert(await ordinary.locator("#about-trigger").isVisible());
  await ordinary.locator("#theme-toggle").focus();
  await ordinary.keyboard.press("Tab");
  assert(
    await ordinary
      .locator("#header-menu input:checked")
      .evaluate((el) => el === document.activeElement),
  );
  await ordinary.locator("#about-trigger").click();
  await ordinary.locator("#about-dialog").waitFor({ state: "visible" });
  await ordinary.keyboard.press("Escape");
  await expect(ordinary.locator("#about-dialog")).toBeHidden();
  await expect(ordinary.locator("#about-trigger")).toBeFocused();
});

test("menu and About layout, dismissal and focus return", async ({
  page: settings,
  baseURL,
}, testInfo) => {
  const url = baseURL!;
  await settings.goto(url);
  for (const dark of [false, true]) {
    for (const width of [320, 359, 360, 375, 768]) {
      for (const size of ["100%", "200%"]) {
        await settings.setViewportSize({ width, height: 800 });
        await settings.evaluate((size) => {
          document.documentElement.style.fontSize = size;
        }, size);
        await settings.locator("#menu-trigger").click();
        await settings
          .locator(`input[name="theme"][value="${dark ? "dark" : "light"}"]`)
          .check();
        const segments = await settings
          .locator(".theme-options")
          .evaluate((el) => {
            const labels = [...el.querySelectorAll("label")];
            const menu = document.querySelector("#header-menu")!;
            const bounds = menu.getBoundingClientRect();
            return {
              fits:
                bounds.left >= 0 &&
                bounds.right <= document.documentElement.clientWidth + 1 &&
                menu.scrollWidth <= menu.clientWidth,
              boxes: labels.map((label) =>
                label.getBoundingClientRect().toJSON(),
              ),
              readable: labels.every(
                (label) => label.scrollWidth <= label.clientWidth,
              ),
            };
          });
        assert(
          segments.fits && segments.readable,
          JSON.stringify({ dark, width, size, segments }),
        );
        for (const box of segments.boxes) {
          assert(Math.abs(box.top - segments.boxes[0]!.top) < 1);
          assert(Math.abs(box.width - segments.boxes[0]!.width) < 1);
          assert(box.height >= 32);
        }
        if (width === 375) {
          await capture(
            settings,
            testInfo,
            `menu-${dark ? "night" : "emerald"}-${size}.png`.replace(
              ".png",
              "",
            ),
          );
        }
        assert.equal(await settings.locator("#header-menu a").count(), 0);
        await settings.locator("#about-trigger").click();
        const dialog = settings.locator("#about-dialog");
        await dialog.waitFor({ state: "visible" });
        await settings.waitForFunction(
          () =>
            document.querySelector<HTMLImageElement>(".about-icon")!.complete,
        );
        assert(await dialog.evaluate((el) => el.matches(":modal")));
        assert.equal(await settings.locator("#header-menu").isVisible(), false);
        assert.match(
          await dialog.innerText(),
          /「ブルーアーカイブ」非公式ファンサイトです。/,
        );
        assert.equal(await dialog.locator("[style], button, form").count(), 0);
        assert.equal(
          await settings
            .getByRole("dialog", { name: "このサイトについて" })
            .count(),
          1,
        );
        assert.equal(await dialog.locator(".about-links a").count(), 2);
        await expectIcons(settings, ".about-links");
        const layout = await dialog.evaluate((el) => {
          const rect = el.getBoundingClientRect();
          const icon = el.querySelector<HTMLImageElement>("img")!;
          const image = icon.getBoundingClientRect();
          const description = el.querySelector(".about-description")!;
          const divider = el.querySelector("hr")!.getBoundingClientRect();
          const links = el
            .querySelector(".about-links")!
            .getBoundingClientRect();
          return {
            width: rect.width,
            right: rect.right,
            left: rect.left,
            overflow: el.scrollWidth > el.clientWidth,
            imageLoaded: icon.naturalWidth > 0,
            iconFirst: icon.parentElement!.firstElementChild === icon,
            center: Math.abs(
              (image.left + image.right) / 2 - (rect.left + rect.right) / 2,
            ),
            imagePath: new URL(icon.src).pathname,
            descriptionScale:
              Number.parseFloat(getComputedStyle(description).fontSize) /
              Number.parseFloat(getComputedStyle(el).fontSize),
            beforeDivider:
              divider.top - description.getBoundingClientRect().bottom,
            afterDivider: links.top - divider.bottom,
            halfRem:
              Number.parseFloat(
                getComputedStyle(document.documentElement).fontSize,
              ) / 2,
          };
        });
        assert(
          !layout.overflow && layout.left >= 0 && layout.right <= width,
          JSON.stringify({ dark, width, size, layout }),
        );
        assert(layout.imageLoaded && layout.iconFirst && layout.center < 10);
        assert.equal(layout.imagePath, "/kuto-ladder/favicon.svg");
        assert(Math.abs(layout.descriptionScale - 0.8) < 0.01);
        assert(Math.abs(layout.beforeDivider - layout.halfRem) < 1);
        assert(Math.abs(layout.afterDivider - layout.halfRem) < 1);
        if (width === 375) {
          await capture(
            settings,
            testInfo,
            `about-${dark ? "night" : "emerald"}-${size}.png`.replace(
              ".png",
              "",
            ),
          );
        }
        await dialog.locator(".about-icon").click();
        assert(await dialog.isVisible());
        await dialog.locator(".about-links a").last().focus();
        await settings.keyboard.press("Shift+Tab");
        assert(
          await dialog.evaluate((el) => el.contains(document.activeElement)),
        );
        if (size === "100%") await settings.keyboard.press("Escape");
        else await settings.mouse.click(1, 1);
        await dialog.waitFor({ state: "hidden" });
        await settings.waitForFunction(
          () =>
            document.activeElement === document.querySelector("#menu-trigger"),
        );
        assert.equal(settings.url(), url);
      }
    }
  }
});

test("About light dismiss without native closedBy support", async ({
  page: noLightDismiss,
  baseURL,
}) => {
  const url = baseURL!;

  await noLightDismiss.addInitScript(() => {
    Reflect.deleteProperty(HTMLDialogElement.prototype, "closedBy");
  });
  await noLightDismiss.goto(url);
  // Disable native light dismiss as well as its feature-detection property.
  await noLightDismiss.locator("#about-dialog").evaluate((el) => {
    el.setAttribute("closedby", "closerequest");
  });
  await noLightDismiss.locator("#menu-trigger").click();
  await noLightDismiss.locator("#about-trigger").click();
  const fallbackDialog = noLightDismiss.locator("#about-dialog");
  await fallbackDialog.locator(".about-icon").click();
  await fallbackDialog.click({ position: { x: 20, y: 20 } });
  assert(await fallbackDialog.isVisible());
  await noLightDismiss.mouse.click(1, 1);
  await fallbackDialog.waitFor({ state: "hidden" });
  await noLightDismiss.waitForFunction(
    () => document.activeElement === document.querySelector("#menu-trigger"),
  );
  await noLightDismiss.close();
});
