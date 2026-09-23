import type { PathStrategy } from "../types/types";

const CONFIG_KEY = "kuto-ladder-config";
const CONFIG_VERSION = 1;

export type ThemePreference = "system" | "light" | "dark";

export interface AppConfig {
  version: number;
  theme?: ThemePreference;
  strategy?: PathStrategy;
}

export function loadConfig(): AppConfig {
  try {
    const data = localStorage.getItem(CONFIG_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (parsed?.version === CONFIG_VERSION) {
        return {
          version: CONFIG_VERSION,
          theme:
            parsed.theme === "system" ||
            parsed.theme === "light" ||
            parsed.theme === "dark"
              ? parsed.theme
              : parsed.theme === "emerald"
                ? "light"
                : parsed.theme === "night"
                  ? "dark"
                  : undefined,
          strategy:
            parsed.strategy === "efficient" ||
            parsed.strategy === "match-heavy" ||
            parsed.strategy === "target-second"
              ? parsed.strategy
              : undefined,
        };
      }
    }
  } catch (e) {
    console.error("Failed to load config", e);
  }
  return { version: CONFIG_VERSION };
}

export function saveConfig(config: Partial<AppConfig>) {
  try {
    const current = loadConfig();
    const updated = { ...current, ...config, version: CONFIG_VERSION };
    localStorage.setItem(CONFIG_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to save config", e);
  }
}
