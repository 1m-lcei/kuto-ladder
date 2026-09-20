<!-- CODEGRAPH_START -->
## CodeGraph

If `.codegraph/` exists, use `codegraph explore "<symbol/file/question>"` before
grep/find/file reads for code discovery. MCP `codegraph_explore` is also available.
If synchronization reports a lock, confirm the relevant current source on disk.
Do not create an index if one is absent.
<!-- CODEGRAPH_END -->

# PROJECT KNOWLEDGE BASE

Updated: 2026-09-20. Product: 2.0.0. Comparison baseline: `8e4ad79`.
Work branch: `feat/2.0-standard-first`; main and Pages are not updated by this work.

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
| Integer-only parsing | `src/utils/parseRank.ts` |
| Shared rank rules and maximum | `src/utils/rankRules.ts` |
| Bundled-boundary path calculation | `src/utils/rankCalculator.ts` |
| O(N) data generator | `scripts/precompute.ts` |
| Tracked 795-byte generated data | `src/generated/rank-boundaries.json` |
| Frozen old algorithm and exhaustive comparisons | `tests/` |
| Browser checks and timings | `scripts/qa-*.mjs` |
| Comparison evidence and known coverage gaps | `docs/verification/` |

## Invariants

- Accepted ranks: integers 2–15001. Strategies: `efficient`, `match-heavy`,
  `target-second`. The last targets 2; the others target 1.
- Keep `calculatePath(startRank, strategy): PathStep[]`. Range tuple order is
  `[max, min]`. Rank 2 with target-second has no path and no result.
- Range multiplication/flooring must retain the old arithmetic exactly.
  Runtime and generation share `getNextRankRange`; the generator cannot import
  its own generated data. Regenerate and run all comparisons when rules change.
- Input remains text with `inputMode="numeric"` and `pattern="[0-9０-９]*"`.
  Never rewrite the input value for normalization. Parse only ASCII/full-width
  digits after 200ms; empty is silent; signs, decimals, exponents, whitespace,
  other characters and out-of-range values show the existing Japanese warning.
- Composition cancels pending parsing; compositionend restarts the debounce.
  Strategy changes use the last completed parse. Form submission cannot navigate.
- Render the complete vertical path, including all 138 matches. Index 0–5 is
  primary; 6–10 is secondary only if path length >=11; all other indices are
  neutral. Apply the same rule to the terminal row.
- Unchanged DOM rows are reused by a content/tone key to meet throttled timing.
  Keep the input element and its focus intact. Exceptions go to the result alert.
- At <360px strategy labels are emoji-only; at >=360px include Japanese labels.
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
Run the commands in docs/verification.
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
