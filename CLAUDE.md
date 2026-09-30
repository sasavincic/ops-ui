# Claude session bootstrap: @latro/ops-ui

The shared UI kit of **Workforce Ops** (github.com/sasavincic/workforce-ops),
**FinaOps** (github.com/sasavincic/fina-ops) and **PrefabOps**
(github.com/sasavincic/prefab-ops-platform). Apps never install it: each
vendors a released copy into `src/vendor/ops-ui/` with
`scripts/sync-ops-ui.mjs` (README → "How apps use it").

**The spec is the source of truth:**
`docs/superpowers/specs/2026-09-30-ops-ui-library.md` (APPROVED 2026-09-30).
Read the sections your change touches in full before writing code: file
names, signatures and rules come from there. `kit-inventory.md` beside it is
the survey of the two kits the library is extracted from.
`2026-09-30-prefab-restyle.md` is PrefabOps' adoption plan (its §9.8 palette is
the gallery's `prefab` fixture).

## Rules

1. **The library knows no app.** No `@/…` imports, no app dictionaries or
   words, no permission areas, no domain modules, no `process.env` reads.
   Inside `src/` every import is relative or one of the peers: `react`,
   `react-dom`, `next/link`, `next/navigation`, `clsx`, `tailwind-merge`,
   `class-variance-authority`. ESLint (`no-restricted-imports` on `src/**`)
   refuses anything else; the boundary test (L5) proves it again. Nothing
   joins `dependencies`: the package has peers and devDependencies only.
2. **1.0.0 is a pure extraction.** Rendered output and behaviour are identical
   to the FinaOps kit at `fina-ops` `origin/main` (`src/components/ui`), plus
   the named Workforce Ops modules (spec §7, §9, §12.1 L2). The only changes
   are the mechanical ones the spec names: `@/` imports replaced as in §7,
   `useDict()` → `useOpsUi()`, `t.common.x` → `strings.x`,
   `localizeMessage(t, s)` → `localize(s)`, plus each row of the §9 "Change"
   column. **Any visible change, however small or obviously right, is out of
   scope for 1.0.0**: add it to the spec's follow-up list (§12.4) instead.
   `tools/diff-against-app.mjs` (L6) proves the extraction.
3. **After 1.0: strict semver** (spec §4.1). The level is decided by what an
   unchanged call site renders: patch = identical DOM and CSS; minor =
   additive, 0 changed pixels on every existing baseline; major = anything
   else, batched, with `Visible:` and `Upgrade steps:` in the CHANGELOG.
4. **Read the apps, never touch them.** Other sessions edit
   `/home/user/workforce-ops`, `/home/user/fina-ops` and
   `/home/user/prefab-ops-platform` on their working trees. Read their
   sources only through git:
   `git -C /home/user/fina-ops show origin/main:<path>` (likewise
   `workforce-ops`). Never modify, check out, install or build inside an app
   repo. Tooling that needs an app tree exports a copy:
   `git -C <app> archive origin/main | tar -x -C /tmp/claude-0/ops-ui-scratch/<app>`.
5. **Directives.** A file that calls hooks, creates a context or attaches
   handlers starts with `"use client"`; the server-safe components carry no
   directive and never import `config/provider` or `config/read-only`
   (spec §11.1). No barrel `index.ts` for components: it would mix server-safe
   and client modules (`src/stories/index.ts` is the story registry, not a
   barrel).
6. **Tokens.** Inside any `@theme` block a comment must never contain a
   double-quote character (Tailwind silently drops the next declaration).
   Brand values never live in the library: apps set plain
   `:root { --brand-*: … }` variables, which `styles/tokens.css` reads through
   `var()`. Brand variables are set on `:root` only (the gallery puts
   `data-brand` on `<html>`). No dark mode.
7. **Next 16.** The gallery runs Next 16.2 / React 19.2 / Tailwind v4, which
   differ from older training data: read `node_modules/next/dist/docs/` before
   writing gallery code.

## Gates (before every commit)

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm shots
```

Never commit red. `pnpm shots` builds the gallery and compares every story ×
3 brands × {1440, 375} against `gallery/__screenshots__/` with 0 changed
pixels.

- Playwright is pinned to exactly `@playwright/test` 1.56.1 = Chromium
  revision 1194, preinstalled under `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`.
  **Never run `playwright install`.** If a Playwright version ever wants
  another browser, launch with the binary under `/opt/pw-browsers`
  (`chromium-1194/chrome-linux/chrome`).
- Only `pnpm shots:accept` writes baselines. A baseline change is either part
  of a major release or a commit titled `shots: rebaseline (<reason>)` that
  touches only `gallery/__screenshots__/**` and `gallery/playwright.config.ts`
  (for example a Chromium update).

## Commits and pushes

- Work on `main`. Commit identity:
  `git -c user.name="Saša Vinčić" -c user.email="77722684+sasavincic@users.noreply.github.com" commit …`
- End every commit message with the session's `Co-Authored-By:` trailer (and
  the `Claude-Session:` line when the session provides one).
- Push after each commit: `git push -u origin main`. On a network error retry
  up to 4 times, waiting 2, 4, 8, 16 s.
- **Never push tags**: the session git proxy refuses tag refs. A release is a
  commit plus a branch (below).

## Release procedure (`pnpm release X.Y.Z [--compatible <name>]`, spec §4.2)

1. Refuses unless on `main`, the tree is clean, `HEAD == origin/main` after a
   fetch, and `X.Y.Z` is the next patch/minor/major after `package.json`.
2. Runs the gates above.
3. Computes the required semver level from the diff since the previous
   `release: v<current>` commit (changed baselines, api-surface changes, new
   required brand variables, `Breaking:` lines) and refuses a lower bump.
4. Requires `## X.Y.Z` in `CHANGELOG.md` (Added / Changed / Fixed / Visible /
   Breaking / Upgrade steps; a major needs `Visible:` and `Upgrade steps:`).
5. Writes the version into `package.json` and `src/version.ts` and commits
   exactly those two files as **`release: vX.Y.Z`**.
6. Creates branch **`release/vX.Y.Z`** at that commit and pushes `main` and the
   branch (a refused branch push is only a warning: the commit marker is
   enough). No tags.

Until `tools/release.mjs` exists (L7), nothing is released: `version` stays
`0.0.0`.

## How an app takes a release (spec §5.5; done in the app's own session)

1. Branch in the app.
2. `node scripts/sync-ops-ui.mjs --version X.Y.Z`, then `--write-wrappers` if
   the report asks. The sync reads the release from git objects only, refuses
   local edits, unknown files, collisions, downgrades, peer mismatches,
   extension-name clashes, brand-contract failures and the theme gotcha, swaps
   the vendor folder atomically and writes `ops-ui.lock.json`.
3. Apply the CHANGELOG's Upgrade steps (majors only).
4. Gates G1–G4 (spec §12.0): code; `tools/app-shots.mjs` main vs branch with 0
   changed pixels (a major: only the pages its `Visible:` lines name); an
   identical token dump; the checks by hand.
5. One commit `ops-ui A → B`, merged the way that app merges.

The library session never writes into an app repo; it may run
`tools/app-shots.mjs` and `tools/diff-against-app.mjs` against app checkouts
or scratch exports.

## Build state (update when a step lands)

- **L1 Repository** (2026-09-30): package, tsconfig (the apps' compiler
  options minus `paths`), ESLint (Next config + the `src/` import boundary),
  Vitest (node), the gallery (Next 16.2.10, React 19.2.4, Tailwind v4; brands
  `workforce`/`finaops` from spec §8.4, `prefab` from the Prefab plan §9.8;
  Geist from the `geist` package), Playwright shots (smoke checks until the
  stories land), README, this file.
- **L2 Import** (2026-09-30): the 35 FinaOps kit files byte-identical from
  `fina-ops` 80828fc (`src/components/ui/*` → `src/components/`); from
  `workforce-ops` cea4928 the whole modules `domain/nav-trail.ts` →
  `navigation/trail.ts`, `lib/navigation-history.ts` → `navigation/history.ts`,
  `components/shell/nav-trail.tsx` → `navigation/nav-trail.tsx`,
  `domain/date-input.ts` → `lib/date-input.ts`, `lib/use-dismissable.ts`, and
  the verbatim excerpts `lib/cn.ts` (`cn` + its tailwind-merge extension),
  `lib/fmt.ts`, `lib/text.ts` (three search functions), `lib/dates.ts`
  (`formatDate`, `shiftDay`); `lib/months.ts` (`shiftMonth`) from `fina-ops`
  80828fc. Excerpt files carry a one-line provenance comment. The 37 files that
  still import `@/…` (all components, `navigation/history.ts`,
  `navigation/nav-trail.tsx`) are excluded from `tsconfig.json` and have
  `no-restricted-imports` off in `eslint.config.mjs` (every other lint rule
  applies). L3 removed both exclusions.
- **L3 Decouple** (2026-09-30): spec §7 applied one commit per row
  (`L3 row N/17: …`, rows 13 and 14 empty on purpose: validity-cell is not in
  1.0, and FinaOps' action-icon never used `usePathname`), after one
  `L3 (kit-internal)` commit turning `@/components/ui/<name>` into `./<name>`.
  New: `config/read-only.tsx` (row 3), `config/strings.ts` +
  `config/provider.tsx` (row 6: `OpsUiStrings`, `EN_STRINGS` = WFO en
  `common`, `OpsUiProvider`, `useOpsUi`), `types.ts` (row 17: the seven
  React-free types, re-exported by their components). So L4's
  `config/strings.ts` and `types.ts` exist already. Library `RecordTab` has no
  `area`; the toast lift is `var(--ops-toast-offset,0px)`; Monogram's external
  tone is `*-external` (needs `--color-external` from L4's tokens.css). The
  literal `"Close"`/`"Open"`/`"Tabs"` defaults stay (§7 "Unchanged in 1.0").
  Nothing is excluded from `tsconfig.json` or the ESLint import boundary any
  more; `tests/no-app-alias.test.ts` fails on any `@/` text under `src/`.
- **L4 Styles, strings and types** (2026-09-30): `styles/tokens.css` = spec
  §8.2 verbatim (15 fixed, 10 required, 1 role, 7 tint, 2 tunable);
  `styles/kit.css` (`@keyframes toast-in`), `styles/base.css` (body, cursor,
  `::selection`, reduced motion, the `[data-print-root]` print sheet) and
  `styles/app-feel.css` (`html, body` touch-action, coarse-pointer overscroll)
  are the apps' non-theme globals.css rules word for word (identical in both
  apps at origin/main; only the `html`/`body` touch-action pair was merged
  into one rule). The gallery imports the four in the app order (§8.4).
  `TOKENS.md` is the contract table; `tests/tokens.test.ts` fails when it and
  tokens.css disagree. The contract checks (§8.5 checks 1-4: brand.css shape,
  required variables, tint/tunable bounds, contrast via OKLCH to sRGB) and the
  theme-gotcha scanner (check 6) live in `sync/sync-ops-ui.mjs` as exports
  (`parseTokenContract`, `checkBrandCss`, `themeGotchas`, ...): that file so
  far carries ONLY the contract; the §5 commands land on top of it in L5
  (running it directly exits 2 saying so). The tokens test also compiles
  tokens.css with the pinned Tailwind and requires every declaration back,
  value for value, and reproduces the spec's contrast numbers (7.44, 9.32...).
  `pnpm shots` gained a per-brand smoke check that the tokens resolve through
  the brand in the built gallery (colours compared as painted pixels: the
  build writes oklch() as hex + lab(), and Chromium serialises lab as lab).
  `config/strings.ts`, `config/provider.tsx`, `config/read-only.tsx` and
  `types.ts` (from L3) were checked against spec §6 and WFO origin/main
  `common` (identical); `tests/config.test.tsx` and `tests/types.test.ts`
  cover them (keys, English defaults, provider defaults and partials,
  localize, nested read-only scopes, Button/Input/DateInput in a scope, the
  seven React-free types re-exported by their components).
- L5 Tests, stories and baselines · L6 Extraction proof · L7
  `pnpm release 1.0.0`: pending (spec §12.1).
