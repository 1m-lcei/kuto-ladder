// Serve the production build at its actual Pages prefix; baseline uses port 4174.
import { resolve } from "node:path";

const root = resolve(process.argv[2] ?? "dist");
const port = Number(process.argv[3] ?? 4173);
Bun.serve({
  port,
  async fetch(request) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/kuto-ladder/")) {
      return new Response(null, { status: 404 });
    }
    const relative = decodeURIComponent(url.pathname.slice(13)) || "index.html";
    const path = resolve(root, relative);
    if (!path.startsWith(`${root}/`) && !path.startsWith(`${root}\\`)) {
      return new Response(null, { status: 404 });
    }
    const file = Bun.file(path);
    return (await file.exists())
      ? new Response(file)
      : new Response(null, { status: 404 });
  },
});
console.log(`Serving ${root} at http://localhost:${port}/kuto-ladder/`);
