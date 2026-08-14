# PROJECT KNOWLEDGE BASE

**Generated:** 2026-08-14
**Baseline commit:** 17bf394
**Branch:** main

## OVERVIEW

Japanese React 19 SPA for calculating Tactical Challenge rank progression paths.
Bun manages Vite 8 + TypeScript 7; GitHub Pages serves the Tailwind/daisyUI build.

## STRUCTURE

```text
./
├── src/app/          # React mount, application orchestration, global CSS
├── src/components/   # Result, navigation, theme, error, and SVG UI
├── src/api/          # Rank-data fetch and same-session promise cache
├── src/hooks/        # Debounce and system/manual theme behavior
├── src/utils/        # Rank path calculation and persisted configuration
├── scripts/          # Bun precomputation of runtime rank-data JSON
├── public/           # Tracked static assets and generated rank-data JSON
├── vite.config.ts    # Plugins and GitHub Pages base path
└── package.json      # Bun scripts and dependency manifest
```

## WHERE TO LOOK

| Task | Location | Notes |
|---|---|---|
| Rank input, validation, strategy UI | `src/app/App.tsx` | Owns 200 ms debounce and NFKC input normalization |
| App bootstrap | `src/app/main.tsx` | Mounts `App` under React `StrictMode` |
| Path orchestration | `src/components/PathResult.tsx` | Suspends on data, then calculates and renders |
| Path algorithm | `src/utils/rankCalculator.ts` | Client-side range and path selection |
| Generated rank costs | `scripts/precompute.ts` | Writes three arrays through rank 15001 |
| Runtime data loading | `src/api/fetchRankData.ts` | Uses `import.meta.env.BASE_URL`; caches promises |
| Theme and persistence | `src/hooks/useTheme.ts`, `src/utils/config.ts` | `emerald`/`night`, versioned localStorage |
| Production base/deploy | `vite.config.ts`, `package.json` | `/kuto-ladder/`, `gh-pages -d dist` |

## CODE MAP

| Symbol | Type | Location | Known dependents | Role |
|---|---|---|---|---|
| `App` | component | `src/app/App.tsx` | browser entry | Input, strategy, validation, theme, async boundary |
| `PathResult` | component | `src/components/PathResult.tsx` | `App` | Data suspension and path derivation |
| `fetchRankData` | function | `src/api/fetchRankData.ts` | `PathResult` | Strategy JSON loader/cache |
| `calculatePath` | function | `src/utils/rankCalculator.ts` | `PathResult` | Selects the visible progression |
| `precomputeRankData` | function | `scripts/precompute.ts` | `bun run precompute` | Generates cost arrays |
| `useTheme` | hook | `src/hooks/useTheme.ts` | `App` | System theme, manual override, metadata |
| `loadConfig` / `saveConfig` | functions | `src/utils/config.ts` | `App`, `useTheme` | Versioned localStorage schema |

## DOMAIN INVARIANTS

- Accepted starting rank: integer 2 through 15001, inclusive.
- Strategies are exactly `efficient`, `match-heavy`, and `target-second`.
- `target-second` ends at rank 2; the other strategies end at rank 1.
- `scripts/precompute.ts` and `src/utils/rankCalculator.ts` duplicate `getNextRankRange`; change and verify both.
- Precomputation writes `public/rank-data-{efficient,match-heavy,target-second}.json`.
  These outputs are tracked source assets, while `dist/` is ignored.
- Production asset/data URLs must remain under `/kuto-ladder/`; development uses `/`.

## CONVENTIONS

- Use Bun and preserve `bun.lock`; do not introduce npm/yarn/pnpm lockfiles.
- Project TypeScript stays strict at 7.x with `import type`, narrow unions, and no emitted TS.
- Biome owns lint/format/imports: two spaces, double quotes, semicolons. It excludes
  `public/`, `dist/`, and `node_modules/`.
- Tailwind excludes root `AGENTS.md` and `.omo` tool artifacts from source scanning in `index.css`.
- User-facing text is Japanese; UI uses functional React and Tailwind/daisyUI.
- Persist settings through `saveConfig`; storage key is `kuto-ladder-config` and
  the schema is gated by `CONFIG_VERSION`.

## PROJECT-SPECIFIC GUARDRAILS

- Keep the rank field as text and preserve its raw controlled value during IME composition.
  NFKC-normalize only the debounced parse value; keep `inputMode="numeric"` and `pattern="[0-9０-９]*"`.
- Do not hard-code `/rank-data-...`; use `import.meta.env.BASE_URL` or Pages breaks.
- Preserve the `@source not` rules for `AGENTS.md` and `.omo`; otherwise tool docs/artifacts bloat CSS.
- Do not change only one copy of rank-range logic; client and precompute divergence
  produces paths inconsistent with the generated arrays.
- Do not claim automated tests pass: the repository currently contains no tests,
  and `bun test` exits nonzero with `No tests found!`.
- Do not treat `tsconfig*.json` as strict JSON; they intentionally contain JSONC
  comments understood by TypeScript.

## COMMANDS

```bash
bun install
bun run dev
bun run lint
bun run fix
bun run build           # tsc -b, then Vite production build
bun run preview
bun run precompute      # Regenerate tracked public/rank-data-*.json
bun run deploy          # predeploy build, then publish dist to gh-pages
bun outdated
bun audit
```

## TYPESCRIPT LSP

- Run `npm install -g typescript-language-server@5.3.0 typescript@6.0.3`; keep project TypeScript 7.x for builds.
- Do not pair this LSP with global TypeScript 7: it lacks required `lib/tsserver.js` and initialization fails.
- No project LSP config is needed; the builtin `typescript` server resolves from PATH.
- Verify diagnostics and document symbols; installed status alone is insufficient, and the bundled script may skip.

## QA BASELINE

- There is no unit, component, or E2E suite; behavior changes require build + browser QA.
- `bun run preview` does not mount `dist` at `/kuto-ladder/`; use a matching server and assert DOM before screenshots.
- Validate PNG signature/dimensions and open every image; black output can mean bad asset routing or harness failure.
- Keep browser profiles in workspace temp, record PID/path, then remove; `C:\Windows\Temp` profiles resisted cleanup.
- `CreateProcessWithLogonW failed: 2` is reviewer evidence failure, not a product defect; retry a fresh access path.
- Rank-input matrix: empty, `1`, `2`, `15001`, `15002`, ASCII `123`, full-width
  `１２３`, full-width `１`, and nonnumeric/pasted mixed input.
- Allow the 200 ms debounce before asserting warning/path state.
- Responsive checks: below 360 px uses emoji-only strategy labels; 360 px and above
  uses emoji plus Japanese labels. Verify at least 375, 768, and 1280 px.
- Exercise persistence, system theme, loading, fetch failure, and error fallback when
  those surfaces change.

## DEPLOYMENT

- Deployment is manual; no `.github/workflows` directory exists.
- `bun run deploy` builds from the current worktree and publishes `dist/` to the
  `gh-pages` branch. Push source commits to `main` separately.
- Public URL: `https://1m-lcei.github.io/kuto-ladder/`.

## VERIFIED BASELINE (2026-08-14)

- Dependency maintenance landed as `c104b22`; full-width input support landed as
  `17bf394`. `main` was pushed and Pages was published at `d76ad43`.
- Biome 2.5.8, Vite 8.2.1, daisyUI 5.7.16, and plugin-react 6.0.5 were verified;
  `bun outdated` was empty and `bun audit` found no vulnerabilities.
- `bun run lint` and `bun run build` passed. The deployed page returned HTTP 200
  with the same JS/CSS hashes as the production build.
- Real browser QA confirmed `１２３` normalizes to `123` and renders a path; `１`
  normalizes to `1` and renders the range warning. No additional package is used.
- Final 375/768/1280 screenshots passed responsive and CJK review without overflow
  or clipped Japanese text.
- LSP 5.3.0 + global TypeScript 6.0.3 returned clean diagnostics/symbols; builds use local 7.0.2.

## CODEGRAPH

`.codegraph/` exists. Use CodeGraph before grep/find/file reads for code discovery;
query exact symbols/files and confirm current on-disk source if auto-sync reports a
lock.
