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
| Input, rendering, theme, menu/dialog and CSS | `src/main.ts`, `src/menu.ts`, `src/theme.ts`, `src/styles.css` |
| Rank rules, calculation and persisted settings | `src/rank.ts`, `src/rank-rules.ts`, `src/settings.ts` |
| Data generation and tracked output | `scripts/precompute.ts`, `src/generated/rank-boundaries.json` |
| Calculation/input tests, frozen reference and browser regressions | `tests/` |
| Preview at the production URL prefix | Vite preview (`bun run preview`) |

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
- SVG icons use the same-origin `public/icons.svg` sprite via `./icons.svg#id`.
  `base` in `vite.config.ts` defines the mount point in dev and build. Keep
  sprite URLs relative to the entry page, including select options and templates;
  do not prepend `%BASE_URL%` or add `vite-ignore` attributes.
  Keep only symbol IDs, viewBox and geometry in the sprite; style the SVG hosts
  in CSS. Strategy titles in HTML preserve the native-select emoji fallback.
- Popover absent: hide trigger and expose ordinary settings controls. Anchor
  absent: position on opening and follow resize/scroll; no large polyfill.
- About uses a native modal dialog with backdrop/Escape dismissal and no close
  button; contact/GitHub links live there. Closing returns focus to the menu
  trigger (or the About button without Popover support).

## Development and QA

Use Bun 1.4.2 (`packageManager` in `package.json`), Node.js 24 LTS or newer,
and the committed `bun.lock`. CI uses Node.js 24.21.0 and Ubuntu 24.04.
Install dependencies with `bun install --frozen-lockfile`; install the matching
browser binaries with `bun x playwright install chromium firefox webkit`.
Linux also needs `--with-deps` and Japanese fonts (`fonts-noto-cjk`).
Browser binaries normally use Playwright's standard user cache. If Windows blocks
Firefox activation there, set `PLAYWRIGHT_BROWSERS_PATH` to the absolute repository
`.cache/browsers` path for both installation and test commands. Install the matching
revisions there; never reuse an incompatible old engine or silently skip it.

```sh
bun run dev             # http://localhost:5173/kuto-ladder/
bun run verify          # check, typecheck, unit tests, build, three browsers
bun run test:edge       # same browser tests using installed Microsoft Edge
bun run test:performance
```

`bun test` is scoped to `tests/unit/` by `bunfig.toml`. `bun run check` checks
formatting, imports and lint; `bun run fix` applies Biome fixes. The build does
not run type checking by itself; `verify` is the complete acceptance command.
Generated JSON remains compact and is checked for reproducibility, not rebuilt
on every build. The frozen reference is independent of the production algorithm.

Browser tests use Playwright Test (`playwright/test`) and built `dist` at
`http://127.0.0.1:4173/kuto-ladder/`. Playwright owns the preview process and will
fail if the port is occupied; do not kill an unrelated server. Run `bun run build`
before standalone browser commands. Default verification uses Chromium, Firefox
and WebKit; Edge is an additional local check. Projects share one config and run
with one worker and no retries. Do not hide regressions with skip/fixme/retries.
The dev-server asset regression additionally starts Vite on an isolated port
with file watching disabled, and verifies actual toolbar/link SVG rendering
under the same URL prefix.
It runs in the normal browser suite and CI; production-only checks miss dev
HTML rewriting failures.
Vite's regular dev watcher excludes `.cache/` so test traces do not reload the
application and locked browser profiles do not crash the server.

Each test owns its state. Use Playwright's clock for debounce/composition checks
and web-first assertions for DOM updates. Synthetic IME events and resized
viewports do not replace native IME or device testing. Windows WebKit is not
Safari. Keep the native-control and motion fallbacks, print checks, both themes,
360px boundary and 200% text checks. Inspect the representative PNGs for visual
changes; taking a screenshot alone is not a visual assertion. There are no
committed image snapshots or automatic baseline updates.

`TEST_BASE_URL` overrides the target URL (include its trailing slash) and disables
local server startup. `TEST_DIST_DIR` supplies the exact artifact to compare with
that URL; it defaults to `dist`. `bun run test:smoke` runs only the `@smoke` test,
which checks every deployed HTML/JS/CSS/SVG/WebP byte and the primary controls.
It allows up to 120 seconds for CDN propagation. Do not rebuild the comparison
artifact after publication.

### Performance

`bun run test:performance` uses installed Edge at normal and 6x CPU load, with
30 samples per initial render, strategy change and longest-path update at 1280x900.
Report all raw samples and p95. Initial render and alternating strategy changes use
rank 123; longest-path updates alternate 15001/15000 in match-heavy mode.
Timing starts at the real debounce callback (or strategy
event), ending at requestAnimationFrame plus a timer; the 200ms debounce is not
part of the render budget. Budgets are 50ms normally and 100ms at 6x load.
For rendering changes, measure before and after in the same browser/environment.
Save the first `render.json` outside the next run's output directory, then set
`PERFORMANCE_BASELINE` to that file: each p95 must also stay within baseline +5ms.
CI checks DOM reuse deterministically; these host-sensitive timing tests run
locally, outside the regular CI suite. Do not relax budgets to get a green run.

### Files and records

| Location | Purpose and lifetime |
|---|---|
| `tests/unit/`, `tests/e2e/`, `tests/performance/` | Maintained, committed checks |
| `tests/reference/` | Frozen comparison implementation |
| `scripts/` | Maintained project tools; ordinary Git tracking |
| `design/` | Local editable artwork and conversion commands; keep |
| `archive/` | Local historical records; not executable verification dependencies |
| `.cache/scratch/<task>/` | Disposable probes; remove after the task |
| `.cache/qa/results/` | Playwright screenshots, traces, print output and measurements |
| `.cache/qa/report/` | Latest HTML report |
| `.cache/qa/tmp/` | Browser profiles and temporary files |

`design/`, `archive/`, `.cache/`, `.agents/` and `.codegraph/` are Git-ignored.
Do not assume ignored artwork is backed up by Git. Archive source paths and
SHA-256 hashes before clearing old records. Remove temporary profiles only after
their browser processes have exited. Playwright replaces its results/report on
subsequent runs; copy a baseline you still need before running another suite.
Do not scatter probes in the repository root or `scripts/`.

### Shared agent skill

Keep `skills-lock.json` committed and install modern-web-guidance locally under
`.agents/skills/`. From the repository root:

```sh
bun x skills add GoogleChrome/modern-web-guidance --skill modern-web-guidance --agent codex --yes
```

Review lock-file changes as skill updates. Follow its guidance for frontend work;
the skill is developer assistance, not a build or CI dependency. CodeGraph is
also local assistance; never create an index merely to run tests.

## Git workflow

Use Conventional Commit messages. Keep maintained checks in `tests/`; never
force-add disposable files. The normal source branch is `main`.
A completed local task may include commits without pushing them. Push, publication
and GitHub settings changes require authorization for that task.

## CI and deployment

The public URL is https://1m-lcei.github.io/kuto-ladder/.
`.github/workflows/ci.yml` verifies PRs to main and pushes to main. Its deploy job
runs only after verification succeeds on main (including a manual run on main).
It downloads and publishes the exact Pages artifact produced by verify, then
uses that same artifact for the live smoke check. It does not rebuild or push a
gh-pages branch. There is no local deploy command or gh-pages package.

Actions are pinned to verified release commits. Only deploy receives `pages:write`
and `id-token:write`. PR runs replace older runs; main runs are serialized so an
older deployment cannot finish after a newer one. Reports and failure traces are
retained for 14 days; browser profiles are not uploaded.

### One-time repository settings (owner action)

1. Enable GitHub Actions and allow the pinned official actions plus oven-sh/setup-bun.
2. Set Settings > Pages > Build and deployment > Source to **GitHub Actions**.
3. Restrict the `github-pages` environment to main; no required reviewers are
   needed for automatic publication.
4. After the first CI run, require the `verify` status check on main if using
   branch protection; a second human review is not required for this solo project.

These settings and a successful hosted Actions run cannot be certified by local
checks. The first `git push origin main` starts verification and publication once
Pages is configured. A failed verification prevents deployment. A failed live
smoke check marks deploy failed; it does not imply the previous deployment was
restored. Revert the faulty source commit and push through the same verified
pipeline to roll back. After switching Pages to Actions, the old remote gh-pages
branch is unused and may be deleted separately; local cleanup does not delete
remote refs.
