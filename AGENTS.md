<!-- CODEGRAPH_START -->
## CodeGraph

If `.codegraph/` exists, use `codegraph explore "<symbol/file/question>"` before
grep/find/file reads for code discovery. MCP `codegraph_explore` is also available.
If synchronization reports a lock, confirm the relevant current source on disk.
Do not create an index if one is absent.
<!-- CODEGRAPH_END -->

# PROJECT KNOWLEDGE BASE

Updated: 2026-09-20. Product: 2.0.0. Comparison baseline: `8e4ad79`.
Branch: `main`. The 2.0 migration and UI follow-ups are integrated through `9b39e21`.

## Structure

Japanese Tactical Challenge rank-path application. Static HTML, standard CSS and
TypeScript; Bun, Vite, TypeScript 7 and Biome. No runtime dependencies.

| Responsibility | Location |
|---|---|
| Static form, SVGs, row/alert templates, early theme | `index.html` |
| Debounce, IME, strategy, result rendering | `src/app/main.ts` |
| Theme tokens and responsive/step styling | `src/app/index.css` |
| System/manual theme and browser metadata | `src/app/theme.ts` |
| Native Popover and positioning fallback | `src/app/menu.ts` |
| Validated schema 1 localStorage | `src/utils/config.ts` |
| Native rank validation (required/pattern) | `index.html`, `tests/rankInput.test.ts` |
| Shared rank rules and maximum | `src/utils/rankRules.ts` |
| Bundled-boundary path calculation | `src/utils/rankCalculator.ts` |
| O(N) data generator | `scripts/precompute.ts` |
| Tracked 795-byte generated data | `src/generated/rank-boundaries.json` |
| Frozen old algorithm and exhaustive comparisons | `tests/` |
| Browser checks and timings | `scripts/qa-*.mjs` |
| Comparison evidence and known coverage gaps | `ai/v2/verification/` |

## Invariants

- Accepted ranks: integers 2–15001. Strategies: `efficient`, `match-heavy`,
  `target-second`. The last targets 2; the others target 1.
- Keep `calculatePath(startRank, strategy): PathStep[]`. Range tuple order is
  `[max, min]`. Rank 2 with target-second has no path and no result.
- Range multiplication/flooring must retain the old arithmetic exactly.
  Runtime and generation share `getNextRankRange`; the generator cannot import
  its own generated data. Regenerate and run all comparisons when rules change.
- Input remains text with `inputMode="numeric"`. HTML `required` and `pattern`
  validate ASCII/full-width/mixed digits, optional leading zeros, and 2–15001.
  Keep the pattern synchronized with MAX_RANK; do not use setCustomValidity or
  validation state in TypeScript. CSS `:invalid:not(:placeholder-shown)` shows
  the error border and HTML hint immediately for nonempty invalid input, without
  waiting for blur or Enter. Never rewrite the input value for normalization.
  The form uses novalidate to suppress native validation popups; native validity
  and CSS feedback still apply. Keep the hint associated via aria-describedby.
  After 200ms, read native validity and convert valid input for calculation;
  invalid/empty input clears the result. Initial empty input has no error styling.
- Composition cancels pending parsing; compositionend restarts the debounce.
  Strategy changes use the last completed parse. Form submission cannot navigate.
- Render the complete vertical path, including all 138 matches. Index 0–5 is
  primary; 6–10 is secondary only if path length >=11; all other indices are
  neutral. Apply the same rule to the terminal row.
- Unchanged DOM rows are reused by a content/tone key to meet throttled timing.
  Keep the input element and its focus intact. Exceptions go to the result alert.
- Use one native strategy select with selectedcontent. At <360px, customizable
  select displays emoji-only; unsupported browsers use two form rows and retain
  Japanese labels. At >=360px, both render Japanese labels in a single form row.
  The closed select keeps a stable width across strategies and centers its label;
  changing selection must not resize the rank input or wrap the selected label.
- Themes: emerald/night. System preference applies until a manual preference is
  saved. Keep early theme initialization and theme-color metadata synchronized.
  Valid input keeps the primary border/focus color in both themes; invalid input is red.
- Storage key `kuto-ladder-config`, CONFIG_VERSION=1; product version does not
  reset settings. Validate stored theme/strategy; unavailable storage is nonfatal.
- All deployed assets resolve under `/kuto-ladder/`. No rank-data fetches.
- Popover absent: hide trigger and expose ordinary links. Anchor absent: position
  on opening and follow resize/scroll. Do not add a large polyfill.

## Commands

```sh
bun install --frozen-lockfile
bun run dev          # Vite
bun run precompute   # updates tracked src/generated/rank-boundaries.json
bun run lint
bun run fix
bun test             # includes all 45,000 old/new path comparisons
bun run build        # strict TypeScript, Vite
bun run preview      # actual /kuto-ladder/ mount on port 4173
bun run deploy       # build and publish gh-pages; explicit deployment task only
```

dev/build use the tracked data; run precompute only when rank rules change.
Use Bun and preserve bun.lock; do not introduce other package-manager lockfiles.
Do not mix unrelated dependency updates. Playwright is a dev-only QA dependency.
Biome owns formatting/imports (two spaces, double quotes, semicolons). Generated
JSON is excluded from formatting so it stays compact. Tool artifacts are excluded.
tsconfig files are JSONC, not strict JSON.

## QA

Build + Bun tests + browser checks are required for behavior changes.
Local verification records live in `ai/v2/verification/` (Git-ignored).
Run its README commands when available; QA scripts remain tracked in `scripts/`.
Compare production builds on their Pages mounts. Preserve vertical path content,
order and colors; exact old control styling and pixel positions are no longer
requirements after the CSS simplification. Keep the native select element; style
its picker like the header menu with guarded base-select CSS, retaining the native
fallback. Use a fluid page width and static theme icons.
Validate DOM before screenshots, PNG signatures/dimensions, and inspect images.
Keep browser temp profiles under `.cache/qa/tmp`; Playwright cleans them on close.
Do not confuse Windows WebKit with Safari or a viewport with a mobile device.
Synthetic composition events cover application handling, not native IME behavior.
Report unavailable coverage honestly; the user approved testing available systems.

TypeScript LSP (if needed): global typescript-language-server 5.3.0 with global
TypeScript 6.0.3, while project builds remain on 7.x. Do not install global TS 7
for this LSP: it lacks lib/tsserver.js. Verify actual diagnostics, not only install
status. No project LSP config is needed.

## Deployment

- Public URL: https://1m-lcei.github.io/kuto-ladder/.
- Source lives on `main`; publish its commits with `git push origin main`.
- `bun run deploy` runs the predeploy build and publishes `dist` to `gh-pages`.
  It does not push source commits to `main`. There is no custom deploy workflow.
- Before publishing, run lint, Bun tests and browser checks against the production
  Pages mount. After publishing, verify the live HTML and JS/CSS match `dist` and
  exercise input, strategy, theme and menu on the public URL.
- Latest available-browser QA: Windows Edge 153.0.4234.48, both themes and widths
  320/359/360/375/768/1280. Native Safari/iOS/Android are not verified.
- Bun regression suite: 6 tests, 60,592 assertions, including all 45,000 paths.
  Closed select layout and menu-like picker styling are covered by browser QA.
