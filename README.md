# kuto-ladder
This repository is a web application that displays rank progression paths from a specified starting rank in Tactical Challenge (PvP) via 3 different modes.

You can try it out at:

https://1m-lcei.github.io/kuto-ladder/

## Browser regression checks

Run `bun run build`, then keep `bun run preview` running in another terminal.
With Playwright browsers installed under `.cache/browsers`, run
`bun run test:browser` (Chromium), `bun run test:browser firefox`, or
`bun run test:browser webkit`. On Windows, `bun run test:browser msedge`
uses installed Microsoft Edge. Install bundled browsers with
`PLAYWRIGHT_BROWSERS_PATH=.cache/browsers bun run playwright install`
(PowerShell: set `$env:PLAYWRIGHT_BROWSERS_PATH = "$PWD/.cache/browsers"` first).
Screenshots and Chromium print PDFs are written to `.cache/qa/regressions/`.
The fallback checks simulate missing APIs; they do not replace testing old browsers.

---

This repository and website are an unofficial fan project based on "Blue Archive".

Game screenshots are used in accordance with the guidelines.
