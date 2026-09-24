<!-- CODEGRAPH_START -->
## CodeGraph

If `.codegraph/` exists, use `codegraph explore` before searching or reading code.
Do not create an index if one is absent.
<!-- CODEGRAPH_END -->

# Project guidance

Japanese Tactical Challenge rank-path application. Static HTML/CSS and
TypeScript; Bun, Vite and Biome. No runtime dependencies.

Keep `README.md` limited to the public project overview and fan-project notice.
Repository-specific development instructions belong here.

## Project constraints

- Accepted ranks are integers 2–15001. Strategies are `efficient`, `match-heavy`
  and `target-second`; the last targets 2, the others target 1.
- Preserve `calculatePath(startRank, strategy): PathStep[]` and range tuple order
  `[max, min]`. Rank 2 with `target-second` produces no path or result.
- Preserve the original rank arithmetic exactly. Runtime and
  `scripts/precompute.ts` share `getNextRankRange`; the generator must not import
  generated data. Keep `src/generated/rank-boundaries.json` committed and compact.
  Regenerate only when rank rules change and verify all 45,000 reference paths.
- Rank input accepts ASCII/full-width digits, mixed digits and leading zeros.
  Keep text input with native validity, `inputmode="numeric"`, `pattern`,
  `aria-describedby` and form `novalidate`. After 200ms, NFKC-normalize a copy for
  calculation without rewriting the input. Initial empty input has no error styling.
- Composition cancels pending parsing; compositionend restarts it. Strategy
  changes use the last completed parse. Form submission must not navigate.
- Render the full path, including 138 matches and the terminal row. Reuse
  unchanged rows, preserve input focus and show an alert on rendering failure.
  Printing must include the complete path without animations.
- Preserve native select, popover and dialog behavior and their fallbacks.
  Cover both themes, the 360px layout boundary and 200% text. Strategy changes
  must not resize the input; dialog dismissal must restore focus.
- Theme preferences are system/light/dark, displayed as emerald/night. System
  follows OS changes; explicit preferences stay fixed. The toggle flips the
  displayed theme and saves System only when its destination matches the OS.
  Accept legacy emerald/night settings and synchronize the early theme and
  theme-color metadata.
- Keep storage key `kuto-ladder-config` and `CONFIG_VERSION=1`; product version
  changes must not reset settings. Validate stored values; storage failure is
  nonfatal.
- Assets must resolve under `/kuto-ladder/`. Use the shared `public/icons.svg`
  sprite through `./icons.svg#id`. Rank data is bundled, never fetched at runtime.

## Development and verification

Use the Bun version in `package.json` and preserve `bun.lock`.
Biome owns formatting and imports.

```sh
bun install --frozen-lockfile
bun x playwright install chromium firefox webkit
bun run dev             # http://localhost:5173/kuto-ladder/
bun run verify          # check, typecheck, unit tests, build, browser tests
```

Run `bun run verify` for code changes. Rendering changes also require
`bun run test:edge` and `bun run test:performance` using installed Edge.
Browser tests use built `dist` at `/kuto-ladder/` and start their own preview;
run `bun run build` before standalone browser tests.

## Local files and shared tooling

- Maintained checks belong in `tests/`; the frozen comparison is in `tests/reference/`.
- Keep disposable probes in `.cache/scratch/` and verification output in `.cache/qa/`.
- Keep local editable artwork in `design/` and historical material in `archive/`.
  Both are Git-ignored and must not become build or test dependencies.
- Keep `skills-lock.json` committed. Install the shared modern-web-guidance
  skill locally under `.agents/skills/`:

```sh
bun x skills add GoogleChrome/modern-web-guidance --skill modern-web-guidance --agent codex --yes
```

## Git and deployment

Use Conventional Commit messages. Source lives on `main`.
Pushing `main` triggers verification and GitHub Pages deployment through
`.github/workflows/ci.yml` to https://1m-lcei.github.io/kuto-ladder/.
