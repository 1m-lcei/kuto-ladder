import type { PathStrategy } from "../types/types";

const CONFIG_KEY = "kuto-ladder-config";
const CONFIG_VERSION = 1;

export interface AppConfig {
  version: number;
  theme?: "emerald" | "night";
  strategy?: PathStrategy;
}

export function loadConfig(): AppConfig {
  try {
    const data = localStorage.getItem(CONFIG_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (parsed.version === CONFIG_VERSION) {
        return parsed;
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

    // テーマが変更された場合は即座にDOMにも反映する（DaisyUIの設定と同期）
    if (updated.theme) {
      document.documentElement.setAttribute('data-theme', updated.theme);
    }
  } catch (e) {
    console.error("Failed to save config", e);
  }
}
