import { defineConfig } from "vite";

export default defineConfig({
  base: "/kuto-ladder/",
  appType: "mpa",
  server: {
    // Test traces and locked browser profiles are not application source.
    watch: { ignored: ["**/.cache/**"] },
  },
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
