# 2.0 verification

Baseline: `8e4ad79`, Windows, same browser, viewport and installed fonts for both builds.
Implementation branch: `feat/2.0-standard-first`. No deployment or main merge.

Required invariants: ranks 2–15001, all three strategies, exact path/range order,
vertical steps including all 138 matches, indices 0–5 primary / 6–10 secondary
only when path length >=11, existing SVGs, Japanese text and settings schema 1.
Intentional changes: integer-only input, IME update deferral, bundled rank data.

The baseline production build and source are kept locally in `.omo/baseline`.
Run `bun scripts/qa-server.ts .omo/baseline/dist 4174` alongside the new build on
4173. Screenshots, DOM measurements and browser timings use these Pages mounts.
Browser results and unavailable device coverage are recorded separately; an
emulated mobile viewport is not evidence of testing a physical mobile browser.
