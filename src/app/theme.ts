// biome-ignore-all lint/style/noNonNullAssertion: Elements are owned by the static HTML/templates.
import { loadConfig, saveConfig } from "../utils/config";

declare global {
  interface Window {
    applyTheme(theme: "emerald" | "night"): void;
  }
}

const system = matchMedia("(prefers-color-scheme: dark)");
let manual = loadConfig().theme;
const toggle = document.querySelector<HTMLInputElement>("#theme-toggle")!;

function applyTheme() {
  const theme = manual ?? (system.matches ? "night" : "emerald");
  window.applyTheme(theme);
  toggle.checked = theme === "night";
}

system.addEventListener("change", applyTheme);
toggle.addEventListener("change", () => {
  manual = toggle.checked ? "night" : "emerald";
  applyTheme();
  saveConfig({ theme: manual });
});
applyTheme();
