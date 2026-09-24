import { defineConfig } from "vite";

export default defineConfig({
  base: "/kuto-ladder/",
  appType: "mpa",
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
});
