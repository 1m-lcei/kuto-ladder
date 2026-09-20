// biome-ignore-all lint/style/noNonNullAssertion: Elements are owned by the static HTML/templates.
import { loadConfig, saveConfig } from "../utils/config";

const system = matchMedia("(prefers-color-scheme: dark)");
let manual = loadConfig().theme;
const toggle = document.querySelector<HTMLInputElement>("#theme-toggle")!;

function applyTheme() {
  const theme = manual ?? (system.matches ? "night" : "emerald");
  document.documentElement.dataset.theme = theme;
  toggle.checked = theme === "night";
  document.querySelector<HTMLMetaElement>(
    'meta[name="color-scheme"]',
  )!.content = theme === "night" ? "dark" : "light";
  for (const meta of document.querySelectorAll<HTMLMetaElement>(
    'meta[name="theme-color"]',
  )) {
    meta.content = theme === "night" ? "#0f172a" : "#ffffff";
  }
}

system.addEventListener("change", applyTheme);
toggle.addEventListener("change", () => {
  manual = toggle.checked ? "night" : "emerald";
  applyTheme();
  saveConfig({ theme: manual });
});
applyTheme();
