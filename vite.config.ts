import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  base: command === "build" ? "/kuto-ladder/" : "/",
  plugins: [
    {
      name: "strip-html-comments",
      apply: "build",
      transformIndexHtml(html) {
        return html
          .replace(/<!--[\s\S]*?-->/g, "")
          .replace(/^[ \t]*\r?\n/gm, "");
      },
    },
  ],
}));
