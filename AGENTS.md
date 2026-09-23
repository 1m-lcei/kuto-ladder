<!-- CODEGRAPH_START -->
## CodeGraph

If `.codegraph/` exists, use `codegraph explore "<symbol/file/question>"` before
grep/find/file reads for code discovery. MCP `codegraph_explore` is also available.
If synchronization reports a lock, confirm the relevant current source on disk.
Do not create an index if one is absent.
<!-- CODEGRAPH_END -->

# Project guidance

Japanese Tactical Challenge rank-path application. Static HTML, standard CSS and
TypeScript; Bun, Vite and Biome. No runtime dependencies.

## Documentation

The root `README.md` is a public-facing project overview: purpose, features,
public URL and fan-project notice. Do not add technical content such as the
implementation, architecture, dependencies, setup, test or deployment commands.
Keep repository-specific development instructions in `AGENTS.md` instead.

## Source map

| Responsibility | Location |
|---|---|
| Static form, row/alert templates, early theme | `index.html` |
| Shared SVG icon geometry, referenced with use | `public/icons.svg` |
| Input, rendering, theme, menu/dialog and CSS | `src/app/` |
| Rank rules, calculation and persisted settings | `src/utils/` |
| Data generation and tracked output | `scripts/precompute.ts`, `src/generated/rank-boundaries.json` |
| Calculation/input tests, frozen reference and browser regressions | `tests/` |
| Preview at the production URL prefix | `scripts/qa-server.ts` |

## Invariants

- Accepted ranks: integers 2–15001. Strategies: `efficient`, `match-heavy`,
  `target-second`. The last targets 2; the others target 1.
- Keep `calculatePath(startRank, strategy): PathStep[]`. Range tuple order is
  `[max, min]`. Rank 2 with target-second has no path and no result.
- Range multiplication/flooring must retain the old arithmetic exactly.
  Runtime and generation share `getNextRankRange`; the generator cannot import
  its own generated data. Dev/build use tracked data; regenerate only when rank
  rules change, then run all 45,000 old/new path comparisons.
- Rank input uses `type="text"`, `inputmode="numeric"` and `pattern` to accept
  ASCII/full-width digits, including mixed digits and leading zeros. Keep
  `aria-describedby` and form `novalidate`. After 200ms, read native validity
  and NFKC-normalize a copy for calculation; never rewrite the input value.
  Initial empty input has no error styling.
- Composition cancels pending parsing; compositionend restarts the debounce.
  Strategy changes use the last completed parse. Form submission cannot navigate.
- Render the complete path, including all 138 matches and the terminal row.
  Preserve row tones and reuse unchanged DOM rows to meet throttled timing;
  keep input focus intact. Rendering exceptions replace results with an alert.
  Printing must show the full path without entry/scroll animations.
- Use one native strategy select with selectedcontent. At normal text size and
  <360px, customizable select displays icons only; unsupported browsers use two
  form rows and retain Japanese labels. At >=360px, both use a single form row.
  The closed select keeps a stable width across strategies and centers its label;
  changing selection must not resize the rank input or wrap the selected label
  at normal text size. Support 200% text without overlapping controls or overflow.
- Theme preferences: system/light/dark, rendered as emerald/night. System follows
  OS changes; light/dark remain fixed. The sun/moon button always flips the
  displayed theme. Save System only when the destination matches the current OS
  scheme; otherwise save that explicit light/dark preference.
  The menu exposes all three choices. Accept legacy emerald/night settings.
  Keep early theme initialization and theme-color metadata synchronized.
  Valid input keeps the primary border/focus color in both themes; invalid input is red.
- Storage key `kuto-ladder-config`, CONFIG_VERSION=1; product version does not
  reset settings. Validate stored theme/strategy; unavailable storage is nonfatal.
- All deployed assets resolve under `/kuto-ladder/`. No rank-data fetches.
- SVG icons use the same-origin `public/icons.svg` sprite via `%BASE_URL%`.
  Keep only symbol IDs, viewBox and geometry in the sprite; style the SVG hosts
  in CSS. Strategy titles in HTML preserve the native-select emoji fallback.
- Popover absent: hide trigger and expose ordinary settings controls. Anchor
  absent: position on opening and follow resize/scroll; no large polyfill.
- About uses a native modal dialog with backdrop/Escape dismissal and no close
  button; contact/GitHub links live there. Closing returns focus to the menu
  trigger (or the About button without Popover support).

## Development and QA

Use Bun and preserve `bun.lock`. Biome owns formatting/imports (`biome.json`).
Generated JSON remains compact.
For behavior changes, run lint, Bun tests, build and browser regressions:

```sh
bun run lint
bun test
bun run build
bun run preview                 # leave running in a separate process
bun run test:browser msedge
bun run test:browser firefox
```

Other commands are in `package.json`. Browser tests use existing Playwright
installations (`.cache/browsers`, or installed Edge via `msedge`) and target
`http://localhost:4173/kuto-ladder/`, not the dev server's `/` mount.
Cover both themes, the 360px boundary, 200% text and native-control fallbacks.
Keep browser profiles under `.cache/qa/tmp` and verification artifacts under
`.cache/qa/`; inspect screenshots for visual changes. Windows WebKit is not Safari,
and simulated viewports/IME events do not replace device/native IME testing.

## Git workflow

- Use Conventional Commit messages.
- Keep disposable verification scripts, screenshots and output Git-ignored;
  permanent regression tests belong in `tests/`.
- `scripts/` is Git-ignored except `precompute.ts` and `qa-server.ts`.
  Do not force-add local verification scripts.

## Deployment

- Public URL: https://1m-lcei.github.io/kuto-ladder/.
- Source lives on `main`; publish its commits with `git push origin main`.
- `bun run deploy` runs the predeploy build and publishes `dist` to `gh-pages`.
  It does not push source commits to `main`. Deploy only when explicitly requested.
- Run the QA checks above before publishing. Afterwards, verify live assets match
  `dist` and exercise input, strategy, theme and menu on the public URL.
