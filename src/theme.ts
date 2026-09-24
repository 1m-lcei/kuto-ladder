// biome-ignore-all lint/style/noNonNullAssertion: Elements are owned by the static HTML/templates.
import { loadConfig, saveConfig, type ThemePreference } from "./settings";

declare global {
  interface Window {
    applyTheme(theme: "emerald" | "night"): void;
  }
}

const system = matchMedia("(prefers-color-scheme: dark)");
let preference = loadConfig().theme ?? "system";
const toggle = document.querySelector<HTMLButtonElement>("#theme-toggle")!;
const choices = document.querySelectorAll<HTMLInputElement>(
  'input[name="theme"]',
);

function applyTheme() {
  const dark =
    preference === "dark" || (preference === "system" && system.matches);
  const theme = dark ? "night" : "emerald";
  if (document.documentElement.dataset.theme !== theme)
    toggle.classList.add("theme-changed");
  window.applyTheme(theme);
  toggle.ariaLabel = dark
    ? "ライトモードに切り替える"
    : "ダークモードに切り替える";
  toggle.title = toggle.ariaLabel;
  for (const choice of choices) choice.checked = choice.value === preference;
}

function setPreference(value: ThemePreference) {
  preference = value;
  applyTheme();
  saveConfig({ theme: preference });
}

system.addEventListener("change", applyTheme);
toggle.addEventListener("click", () => {
  const next =
    document.documentElement.dataset.theme === "night" ? "light" : "dark";
  setPreference(next === (system.matches ? "dark" : "light") ? "system" : next);
});
for (const choice of choices) {
  choice.addEventListener("change", () =>
    setPreference(choice.value as ThemePreference),
  );
}
applyTheme();
