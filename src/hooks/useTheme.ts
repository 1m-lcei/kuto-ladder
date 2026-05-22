import { useEffect, useState, useSyncExternalStore } from "react";
import { saveConfig } from "../utils/config";

function subscribeTheme(callback: () => void) {
  const matchMedia = window.matchMedia("(prefers-color-scheme: dark)");
  matchMedia.addEventListener("change", callback);
  return () => matchMedia.removeEventListener("change", callback);
}

function getSnapshot() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function useTheme(initialTheme: "emerald" | "night" | null) {
  const systemPrefersDark = useSyncExternalStore(
    subscribeTheme,
    getSnapshot,
    () => false,
  );

  const [manualTheme, setManualTheme] = useState<"emerald" | "night" | null>(
    initialTheme,
  );

  const currentTheme = manualTheme ?? (systemPrefersDark ? "night" : "emerald");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", currentTheme);
  }, [currentTheme]);

  const handleThemeChange = (checked: boolean) => {
    const newTheme = checked ? "night" : "emerald";
    setManualTheme(newTheme);
    saveConfig({ theme: newTheme });
  };

  return { currentTheme, handleThemeChange };
}
