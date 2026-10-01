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

Never commit red. `pnpm shots` builds the gallery, compares every story ×
3 brands × {1440, 375, 375-touch} (a phone: touch, coarse pointer, no hover)
plus the hover / focus-visible state shots (`gallery/shot-matrix.ts`) against
`gallery/__screenshots__/<project>/<brand>/` byte for byte
(`gallery/shot-options.ts`: `toHaveScreenshot` at 0 changed pixels and a
per-pixel threshold of 0, then `exactDiff` on every RGBA byte, because
Playwright's comparator skips anti-aliased edge pixels at any threshold; never
widen either: `tests/shot-comparator.test.ts` proves one token step and an
edge-only change are refused), and runs the browser behaviour tests
(`gallery/tests/behaviour.spec.ts`).
`pnpm test` includes the api-surface check: after changing a declaration under
`src/` or the sync script's JSDoc, run `pnpm api-surface` and commit
`api-surface.d.txt` and `sync/sync-ops-ui.d.mts` (the sync script's
declarations, shipped beside it as `scripts/sync-ops-ui.d.mts` so an app with
`allowJs` off can type-check its vendor test).

- Playwright is pinned to exactly `@playwright/test` 1.56.1 = Chromium
  revision 1194, preinstalled under `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`.
  **Never run `playwright install`.** If a Playwright version ever wants
  another browser, launch with the binary under `/opt/pw-browsers`
  (`chromium-1194/chrome-linux/chrome`).
- Only `pnpm shots:accept` writes baselines (`updateSnapshots: "none"` in the
  config: a plain `pnpm shots` never writes a missing one), and
  `tests/baselines.test.ts` requires the files to be exactly the matrix (a
  renamed or deleted story's PNGs are red, not silently kept). To add shots
  without rewriting the existing files: `pnpm exec playwright test -c
  gallery/playwright.config.ts --update-snapshots=missing`, then check
  `git status` shows only new files. A baseline change is either part
  of a major release or a commit titled `shots: rebaseline (<reason>)` that
  touches only `gallery/__screenshots__/**` and the gallery's pinned rendering
  environment: `gallery/playwright.config.ts` (the Chromium pin) and
  `gallery/fonts/**` (the fonts the gallery ships beside Geist), for example a
  Chromium update. Never `src/`, `styles/` or a story.
- The shots paint no glyph from the host: a story whose text needs a glyph
  Geist lacks fails its shot ("text painted from a host font") until
  `gallery/fonts/` covers it (a subset face joined to the GeistSans family by
  `unicode-range`, as `glyphs.css` does for ✕; spec §11.2).

## Commits and pushes

- Work on `main`. Commit identity:
  `git -c user.name="Saša Vinčić" -c user.email="77722684+sasavincic@users.noreply.github.com" commit …`
- End every commit message with the session's `Co-Authored-By:` trailer (and
  the `Claude-Session:` line when the session provides one).
- Push after each commit: `git push -u origin main`. On a network error retry
  up to 4 times, waiting 2, 4, 8, 16 s.
- **Never push tags**: the session git proxy refuses tag refs. A release is a
  commit plus a branch (below).

## Release procedure (`pnpm release X.Y.Z [--compatible <name>]… [--trailer <line>]… [--dry-run]`, spec §4.2)

`tools/release.mjs` (tested end to end in `tests/release.test.ts` against temporary repositories):

1. Refuses unless on `main`, the tree is clean, `git fetch origin` worked and
   `HEAD == origin/main`, `X.Y.Z` is the next patch/minor/major after
   `package.json`, and no `release/vX.Y.Z` branch exists yet.
2. Finds the previous release P (the one commit titled `release: v<current>`)
   and computes the required level from P..HEAD: a baseline that existed at P
   modified or deleted outside a pure `shots: rebaseline (<reason>)` commit, a
   removed or changed line of `api-surface.d.txt` (its declaration named by
   `--compatible` only with a `Compatible: <name> - <reason>` line in the
   section), a new required brand variable, a removed or changed token, a
   changed peer range or a `Breaking:` line → major; added surface lines, new
   baselines or new tokens → minor. It refuses a lower bump. A changed `src/`
   line with an interaction-only class (`hover:`, `focus-visible:`, `focus:`,
   `active:`, `focus-within:`, `group-hover:`, `pointer-coarse:`,
   `pointer-fine:`) or `matchMedia(` needs a `Reviewed: <Component> - …` line.
   The first release has no P and skips this step.
3. Requires `## X.Y.Z — YYYY-MM-DD` in `CHANGELOG.md` (dated: date it in its own
   commit before the release); a major needs `Visible:` and `Upgrade steps:`.
4. Runs `pnpm typecheck && pnpm lint && pnpm test && pnpm shots`.
5. Writes the version into `package.json`, `src/version.ts` and the
   `OPS_UI_VERSION` line of `api-surface.d.txt` (that line never counts towards
   a level) and commits exactly those three files as **`release: vX.Y.Z`** (body: the level, the
   `--compatible` names, then each `--trailer` line, e.g. the session's
   `Co-Authored-By:`). The committer is git's: run it as
   `GIT_AUTHOR_NAME="Saša Vinčić" GIT_AUTHOR_EMAIL=77722684+sasavincic@users.noreply.github.com GIT_COMMITTER_NAME="Saša Vinčić" GIT_COMMITTER_EMAIL=77722684+sasavincic@users.noreply.github.com pnpm release …`.
6. Creates branch **`release/vX.Y.Z`** at that commit and pushes `main`, then
   the branch (a refused branch push is only a warning: the commit marker is
   enough; network errors retry 2, 4, 8, 16 s). No tags.

`--dry-run` runs every check and the gates and writes nothing. Nothing is
released until L7b (below): `version` stays `0.0.0`.

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

**The visual check** (`tools/app-shots.mjs`, spec §11.4, tested in
`tests/app-shots.test.ts` on synthetic captures and against a local server):
`node tools/app-shots.mjs capture --app ../fina-ops --label main [--config <file>] [--login-timeout <ms>]`
(credentials in the env variables its config names: `OPS_UI_SHOTS_USER` /
`_PASSWORD`, `OPS_UI_SHOTS_RO_USER` / `_PASSWORD`), the same with `--label branch`
on the branch, then
`node tools/app-shots.mjs compare --app ../fina-ops main branch [--expect <file>]`.
Captures go to `$TMPDIR/ops-ui-shots/<app>/<label>/`. A route may be an object (1.6.0):
`{ "path": "/transactions/:first", "resolve": { "from": "/transactions", "selector": "…" } }` reads a
fixture id at capture time; `"noise": { "pixels", "reason" }` lets a page that never settles
settle (and compare pass it) within that many pixels; `"tries"` / `visual.settleTries` (default 10). **Servers** (spec §11.4
"Which server"): app pages against a production build (`pnpm build && pnpm
start`), `/dev/kit` and its stories in a second capture pair against `pnpm dev`
(the route refuses production). Each user signs in once per capture (the apps
allow five sign-ins a minute); the login timeout defaults to 60 s
(`visual.loginTimeout`). G3 dumps every declared custom property but `--tw-*`, so
an app whose root `CLAUDE.md` / `DESIGN.md` / `AGENTS.md` spell a class or token
name changes its CSS with a docs commit: `@source not` them (spec §8.4).

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
  (`parseTokenContract`, `checkBrandCss`, `themeGotchas`, ...); the §5
  commands landed on top of it in L5. The tokens test also compiles
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
- **L5 Tests, stories and baselines** (2026-09-30): **stories** for all 35
  components in `src/stories/<component>.stories.tsx` (58 stories, every one a
  `"use client"` module; `story-layout.tsx` lays them out; `index.ts` is the
  registry, read it from a client component). **Shots**: 58 stories x 3 brands x
  {1440, 375} = 348 baselines in `gallery/__screenshots__/<width>/<brand>/`;
  the gallery's StoryView sets `data-ready` after hydration and the shots wait
  for it, then click the story's `open` selector. The `prefab` brand stays the
  Prefab plan's D3 palette (§9.8). **Browser behaviour**
  (`gallery/tests/behaviour.spec.ts`, run by `pnpm shots`): Dialog and Sheet
  discard prompts, toast lifetimes and toasts inside a dialog, DateInput typing,
  masking, reverting, limits and the calendar (year → month → day, keyboard,
  Today/Clear; the keyboard walk runs with motion on: see the §12.4 follow-up),
  Combobox (reverse-order words, arrows, Enter never submits, disabled rows,
  keywords), RowMenu below/upward/dismiss, MonthNav, read-only default-deny,
  Segmented at 375 and no story ever scrolling the 375 page sideways. **Unit
  tests** (spec §11.1): ported from WFO (toast, file-link, date-input,
  nav-trail, navigation-history, the search folds) and new (boundary,
  client-directive, read-only, strings, cn, text, glyphs, combobox, dialog,
  stories, manifest, sync, pull-brands). **The sync script** gained every §5
  command (`--version`, `--ref`, `--check` = `checkVendor`,
  `--write-wrappers`, `--dry-run`, `--discard-local-edits`,
  `--allow-downgrade`, `--repo`); `tests/sync.test.ts` runs the real script
  against temporary git repos. Two readings the spec left open: the running
  script is exempt from the collision rule (F2 starts from a hand copy) and a
  missing brand.css counts only once globals.css imports the vendored tokens
  (F2/W3). **`ship.json`** (src/**, styles/*.css, DESIGN/TOKENS/CHANGELOG, the
  sync script), **`tools/api-surface.mjs`** (`pnpm api-surface`, comments
  stripped, `api-surface.d.txt` committed; stale = red) and
  **`tools/pull-brands.mjs`** (app brand.css → gallery fixture, through git;
  no app has a brand.css yet, so the fixtures stay hand-copied).
- **L6 Extraction proof** (2026-09-30): `tools/diff-against-app.mjs --app <tree>
  [--ref <git ref>] [--source <fina-ops tree>]` diffs every component against
  the app copy after removing only what the spec calls mechanical (imports, the
  kit-config hook line, `t.common.x` → `strings.x`, `localizeMessage` →
  `localize` and their null-dictionary forms when the fallback IS the
  `EN_STRINGS` word, the seven types that moved to `types.ts`, each proven
  against the app's definition, blank lines; every normalization is counted in
  the report). Each remaining line must be named: `LIBRARY_CHANGES` (the §7 /
  §9 "Change" items) or, against Workforce Ops, a line where the two app kits
  differ in a file §9 sources from FinaOps. It also compares the `navigation/`
  and `lib/` modules (whole, or declaration by declaration; FinaOps'
  `normalizeSearchText` through `names.foldText` and WFO's `shiftMonth` by
  behaviour) and `EN_STRINGS` with the app's en `common`.
  `tests/diff-against-app.test.ts` runs it end to end against a tree rebuilt
  from the L2 import commit (and a planted change must fail it). Result
  (`docs/extraction-proof-1.0.0.md`): **PROVEN against FinaOps** (30 identical,
  5 by named rows). Against Workforce Ops the extraction holds too, but WFO
  changed `button.tsx`, `date-input.tsx` and `dialog.tsx` on 2026-09-30 after
  the survey (ExternalButtonLink, bottom-sheet dialogs and calendar): not an
  extraction bug, but 1.0.0 cannot replace them. Spec §12.4 "Found while
  proving 1.0 (L6)" names them with three options; `WFO_AHEAD` records them and
  the WFO run exits 1 until the decision is recorded there. **L7b waits for it.**
- **L6 review round** (2026-09-30), from a verified review of L1-L6:
  - sync: `moduleExports` reads through `blankNonCode` (a lexer that blanks
    comments and string/template/regex literals; the regex strip had lost
    `Textarea` to the `image/*` in field.tsx), checked against the TypeScript
    AST and the runtime exports of every component; `sync/sync-ops-ui.d.mts`
    (generated by `pnpm api-surface`) ships as `scripts/sync-ops-ui.d.mts`,
    written just before the script; OS/editor litter in the vendor folder is
    not "unknown"; the gotcha refusal names the fix; `kitImportGraph` /
    `kitDependents` / `vendoredKitGraph` list what a `KIT-OVERRIDE` must also
    override (spec §6.4).
  - shots: exact comparison (threshold 0, `gallery/shot-options.ts`, all
    existing baselines unchanged); timers paused once a story is ready;
    Geist must really load; `StoryHost` / `StoryToaster`
    (`src/stories/story-host.tsx`) for an app's `/dev/kit`; two new toast
    stories (60 stories, 360 baselines) with browser tests for the toast
    hooks and Field messages; the Combobox test walks the whole list.
  - tests: self-update order from recorded file operations, `localTodayIso`
    under three time zones, a missing L2 commit is red (full history needed).
  - docs: `DESIGN.md` (the shared doctrine from WFO's, app examples removed),
    `CHANGELOG.md` (`## 1.0.0 — unreleased`, the `color-mix()` browser floor),
    the manifest test requires both; spec: §9 marks rows 5/11/13 **WFO
    ahead**, F1 removes the quotes from FinaOps' `@theme` comment, G3 compares
    the names main declares and lists new ones as Expected (F3/W4:
    `--color-external`, `--ops-toast-offset`), `/dev/kit` guards itself
    (`await requireSession()` first) and is a new route at F5/W6, the toast
    offset's responsive form lives outside `brand.css`, L7 split into L7a
    (build `tools/release.mjs` and `tools/app-shots.mjs`) and L7b (release).
- **L6 review round 2** (2026-09-30), from a second verified review:
  - shots are exact at last: Playwright's comparator skips anti-aliased
    pixels at any threshold (a corner radius 6px → 7px counted 0), so
    `exactDiff` (`gallery/shot-options.ts`, byte for byte) runs after every
    `toHaveScreenshot`; the comparator test and a browser test prove an
    edge-only change is refused. The launched Chromium's revision is asserted.
  - the ✕ glyph (not in Geist) comes from `gallery/fonts/` (a one-glyph
    DejaVu Sans subset in the GeistSans family), not the host; every shot of
    the first brand fails on text a host font painted (CDP). 66 baselines
    rebaselined (each cross moved under a pixel), nothing else.
  - the DateInput behaviour test types, picks and clears the named field
    itself (it had read another field's untouched default).
  - an app's globals.css keeps the shipped docs and sync script out of its
    Tailwind scan (two `@source not` lines, spec §8.4; `tests/app-scan.test.ts`
    compiles the spec's template); the gallery scans only what an app scans
    (`source(none)` + explicit sources).
  - `/dev/kit` renders one story per page (the index is links carrying
    `data-story-id` / `data-story-open`); `app-shots` captures each story as
    its own route with a paused clock, and a new story id is a new route
    (spec §3.2, §11.4; the gallery's index keeps the same contract).
- **L6 review round 3** (2026-09-30), from a third verified review:
  - FinaOps moved its kit too: b775fb6 (its security branch, not yet on
    `main`) adds `deactivate` / `reactivate` to `AdminIconButton`.
    `FINAOPS_AHEAD` in `tools/diff-against-app.mjs` names the lines: found at
    a ref, the run exits 1 ("FinaOps ahead … re-import before L7b"); absent
    (80828fc), the proof holds for that ref only and says so. Spec §12.4
    "FinaOps ahead": re-import `button.tsx` from FinaOps' post-merge `main`
    before L7b, delete the entry, re-run L6 against that `main`. The kit-freeze
    notes must land in both apps from their own sessions.
  - an app's Tailwind never scans `ops-ui.config.json` or `ops-ui.lock.json`
    either (four `@source not` lines, spec §8.4, F2/W3 land them with the
    config and run G3; P2/P5 too); `tests/app-scan.test.ts` writes the §3.3
    config and a lock into its app.
  - sync §8.5 check 7 (`checkAppTheme`, reported in `checkVendor().theme`):
    once globals.css imports the library tokens, its `@theme` declares only
    `config.extensions`, no rule sets a library token or a `--brand-*` outside
    brand.css, and brand.css is imported after tokens.css.
    `customPropertyDeclarations` reads the declarations; `topLevelRules` now
    reports a statement's own line.
  - spec: `app-shots capture --config <file>` (F0/W0 write a scratch config,
    every capture uses it until F5/W6 merge), captures sign in as the fixture
    editor (owners are forced into two-step sign-in) and fail any route whose
    final URL differs from the one requested unless `visual.redirects` lists
    it (L7a builds both).
  - shots: a third project `375-touch` (hasTouch, isMobile: coarse pointer, no
    hover; 180 new baselines), state shots for every Button variant and the
    admin icon button hovered and keyboard-focused (42 new baselines at
    1440), a pointer-media smoke test and a DateInput `inputmode` behaviour
    test; interaction styles of other controls are hand-reviewed (§4.1: the
    release script asks for `Reviewed:` lines). `updateSnapshots: "none"` and
    `tests/baselines.test.ts` (files = matrix). Existing baselines unchanged.
- **L7a Release and visual tooling** (2026-09-30): `tools/release.mjs` +
  `pnpm release` (spec §4.2, readings in its "As built" paragraph: the cheap
  checks run before the gates, `--compatible` needs a hand-written
  `Compatible:` line and writes nothing, token and peer changes count as
  majors, `Reviewed:` at every level, `--dry-run` and `--trailer`);
  `tools/app-shots.mjs` (spec §11.4: `capture` with `--config`, the editor and
  read-only sign-ins and their landing check, widths + 375-touch, the
  final-URL check against `redirects`, `/dev/kit` expanded per story with its
  `open` click, the paused clock, masks, the token dump with declared /
  undeclared names, `manifest.json`; `compare` with `exactDiff`, the G3 rules
  and `--expect`, syntax in §11.4). `CHANGELOG.md` `## 1.0.0` gained its
  `Visible:` line (1.0.0 is a major bump from 0.0.0).
- **L7b release 1.0.0** (2026-10-01): spec §12.4 decided as option 1 (the
  styling programme `2026-10-01-suite-styling-programme.md` Phase A). FinaOps
  2eef5a4 + 19aad88 took Workforce Ops' newer kit files, the library
  re-imported button, date-input, dialog, glance-card and the
  `lib/floating-place` / `lib/sheet-motion` modules (fb28c86 and after; the
  raw files are `tests/fixtures/reimport-finaops`, laid over the L2 import in
  the end-to-end proof), 36 phone baselines were re-accepted (dialogs and
  the touch calendar as bottom sheets) and the button story shows
  ExternalButtonLink and the two new admin glyphs. The proof passes against
  both apps' `main` (`docs/extraction-proof-1.0.0.md`); kit-freeze notes are
  in both apps' CLAUDE.md. Next: Phase B (F0-F7, W0-W8) and library 1.1-1.3
  per the styling programme.
- **1.1.0** (2026-10-01, spec §12.4 "1.1.0", nothing else): `lib/apps.ts`
  (`OPS_APPS`: Workforce Ops https://workforce-ops.vercel.app `#0b131e`,
  FinaOps `href: null` `#083a25`, PrefabOps https://prefab-ops-platform.vercel.app
  `#092a48`) + `components/app-switcher.tsx` (§10; the current app is listed
  even with a null href, it has no link); `components/validity-cell.tsx`
  (Workforce Ops 23d7d5c, decoupled; `tests/validity-cell.test.tsx` renders the
  raw WFO file from `tests/fixtures/wfo-validity-cell` beside it and requires
  equal markup) + `lib/validity.ts`; optional `strings.tabs` / `appSwitcher` /
  `validity` with `EN_OPTIONAL_STRINGS` (EN_STRINGS unchanged). Tabs stays
  server-safe and renders its links into the client leaf `config/tabs-nav.tsx`.
  `data-ops-dismiss` (not on a relabelled `closeLabel` escape) and
  `data-ops-commit` on DialogFooter's buttons (so ConfirmDialog's); SheetFooter
  has no buttons of its own. 4 new stories (64), new baselines only.
  `tools/diff-against-app.mjs` is the 1.0 proof and reads the library from its
  checkout, so `tests/diff-against-app.test.ts` pins its tables and end-to-end
  runs to the `release: v1.0.0` commit (the tool runs from an export of it).
  Known tooling gap (closed by the tools fixes below): the release commit wrote
  `src/version.ts` but not `api-surface.d.txt`, so after each release the surface
  was stale and the next release needed `--compatible OPS_UI_VERSION`.
- **1.2.0** (2026-10-01, styling programme spec §4.4 + the library side of §5): the
  primitives `Text`, `Heading`, `Stack`, `Cluster`, `TextLink` (server-safe, `lib/gap.ts`) and
  the additive `TH` / `TD` props `hideBelow` / `alignRight` / `numeric` (not `align`: React
  types `<td align>` as the HTML attribute, and narrowing it would be a major). Every prop
  renders exactly the classes of a measured app recipe (`tests/primitives.test.tsx` compares
  each with the hand-written recipe as markup with sorted classes), so adopting them is a
  0-changed-pixel codemod (Phase D list in §4.4). The style guards live in the sync script as
  pure exports (`styleReport`, `styleFindings`, `classRecipes`, `readStyleAllowlist`, …) plus
  `--style-report` (handled in `main` before `parseArgs`, so the existing commands, their
  output and the usage text are unchanged); tests in `tests/style-report.test.ts`; the app's
  `tests/style-guards.test.ts` template is in README.md. Arbitrary values are read as whole
  class tokens from string literals (`has-[[data-x]]:…`, `top-[calc(…)]`), colours/styles/raw
  controls from comment-blanked source. 8 new stories (72), new baselines only. Released with
  `--compatible TH --compatible TD --compatible OPS_UI_VERSION`.
- **1.3.0** (2026-10-01, the PrefabOps restyle plan's M1 + M2, §10.2: the plan's numbers shifted
  by one because 1.2.0 became the primitives release): `styles/preflight-scoped.css` (preflight
  under `:where(.ops-ui-root, .ops-ui-root *)`, generated rule for rule by
  `gallery/preflight-scope.mjs`, which also writes the gallery's own reset
  `gallery/app/preflight-global.css`: every element unless `<html data-ops-preflight="scoped">`,
  set only by the island story; `globals.css` now imports Tailwind's theme / reset / utilities
  separately); the stacking variables `--ops-z-toast` 60 / `-calendar` 50 / `-menu` 40 (RowMenu
  and AppSwitcher) / `-sheet` 40 as `z-[var(--ops-z-…,<1.2 value>)]` (TOKENS.md → Layout
  variables); the opt-in touch floor `TOUCH_FLOOR` (`lib/touch.ts`: an arbitrary
  `(hover:none) and (pointer:coarse)` media variant + `in-data-ops-touch:`), `size="lg"` on Button
  and the input family (`Input` / `Select` take `"md" | "lg" | number`, a number stays the HTML
  attribute), `IconButton` in `button.tsx`, ActionIcon `sparkle` / `mail`. G3 needed nothing
  (bottom-sheet dialogs since 1.0). 6 new stories (78), new baselines only;
  `tests/touch-and-stacking.test.tsx`, `tests/preflight-scoped.test.ts`.
- **1.4.0** (2026-10-01, the PrefabOps restyle plan's M3, §10.2): `Input` `prefix` / `suffix` +
  `wrapperClassName` (G10; an adorned input gets a `relative block w-full` wrapper, the adornment
  spans are aria-hidden and joined to the input's `aria-describedby`, the text keeps clear of
  each by its measured width via inline padding — 12 + width + 6px, a 0.6em-per-character
  estimate before the first measurement; no adornment = the 1.3.0 markup, no wrapper);
  `components/year-input.tsx` `YearInput` + `lib/year-input.ts` (G13; DateInput's structure:
  hidden input under `name`, `onChange({ target: { value } })`, min / max numbers, the twelve-year
  page, floating panel or touch bottom sheet, keyboard walk; optional `strings.yearPicker`, the
  rest reused from `datePicker`); `RowMenu` `trigger` + `sections` (G8; `items` optional, the ⋯
  branch is the 1.3.0 markup, a menu with no room left of the button's right edge aligns to its
  left edge). `tests/m3.test.tsx` renders the 1.3.0 release's own `field.tsx` / `row-menu.tsx` /
  `search-input.tsx` (exported from git into a sandbox) beside the current ones and requires
  identical markup for every call without the new props. 6 new stories (84), new baselines only;
  browser tests for all three. Version map settled: **1.5.0 = AppFrame** (styling programme
  §4.2 / §8, restyle plan §10.2). Known flake added: the 375-touch `year-input--picker*` shots
  share `date-input--calendar*`'s (a byte of corner anti-aliasing on the field under the sheet's
  backdrop, ~1 run in 6): re-run (fixed for both by the tools fixes below). A hovered bordered button's corners flake the same way
  (`button--matrix@hover-secondary`), so the RowMenu trigger story opens a ghost trigger.
- **Tools fixes** (2026-10-01, branch `claude/tools-fixes`, from the F/W app runs;
  no `src/` or `styles/` change). `tools/app-shots.mjs`: the G3 dump reads each
  `--color-*` through a fresh probe with `transition: none` (one reused probe read
  every colour as the first one under reduced motion, so G3 never saw a colour
  value) and dumps every declared custom property but `--tw-*` (a newly declared
  name outside the old families never failed); one sign-in per user per capture,
  reused through `storageState`; `visual.loginTimeout` / `--login-timeout`,
  default 60 s; `--expect` keeps a `#000` in a value (a comment is `#` + space).
  `tools/release.mjs` rewrites the `OPS_UI_VERSION` line of `api-surface.d.txt`
  in the release commit (three files now) and never counts that line
  (`--compatible OPS_UI_VERSION` is accepted and ignored). The shots
  repaint the page once (real frames) after a story's `open` click: the
  375-touch `date-input--calendar*` and `year-input--picker*` shots flaked ~8-17%
  (the field under the sheet repainted or not after losing focus); their 12
  baselines rebaselined to the repainted state, 240/240 green with
  `--repeat-each=20` (all 3 brands); every other `open` story unchanged. Docs: spec §3.3, §4.2, §8.4
  (the apps' root docs), §11.4 (servers, sign-ins, the dump), §12.2 F5 / §12.3
  W1, W6.
- **1.5.0** (2026-10-01, styling programme §4.2 / library spec §10.1, which also records the §2
  non-goal change): the shared shell in `src/shell/` (not `components/`, so no wrappers): `AppFrame`,
  `Sidebar`, `MobileTopBar` + `NavDrawer`, `CommandPalette` (generic over the app's index; app
  supplies `loadIndex`, `search`, `create`, the optional `trailing` row), `PullToSearch`,
  `SignOutButton`, `NavIcon` (13 named glyphs) and `nav.ts` (`ShellNav`, `navLinkClasses`); the nav
  arrays arrive already filtered (no `canSee`); optional `strings.shell` (14 words);
  `lib/keyboard.ts`, `lib/pull-to-search.ts`, `lib/pointer-intent.ts` moved whole from the apps.
  Proof: `tests/fixtures/shell-wfo` (workforce-ops 96b4c7a) / `shell-finaops` (fina-ops 6182202)
  are the raw app files; `tests/shell-fixtures.tsx` sandboxes them (imports rewritten, declared
  state rewrites to start a drawer / palette open) and builds the library props per app
  (`libraryProps` = the adoption recipe); `tests/shell-markup.test.tsx` (server) and
  `tests/shell-behaviour.test.tsx` (happy-dom, new devDependency; `vitest.config.mts` lets Vite read
  the OS temp folder) require identical markup / DOM after every step; one intentional difference
  (`INTENTIONAL_DIFFERENCES`: WFO's mark row gains `items-center`, 0 pixels). The gallery declares
  `--color-tool` (an app extension, not a library token). 6 stories (90), 54 new baselines only;
  browser tests for the palette, chords, drawer and pull-to-search. The palette stories open on
  mount and click their own field (`open`) so the shot repaints once (without it the 375 palette
  text flaked between two antialiasing modes).
- **1.6.0** (2026-10-01, styling programme §4.6, measured on Workforce Ops a5cd0e4 / FinaOps
  526d1a7): the sweeps' leftovers. `TextButton` (client; a `<button>` with `TextLink`'s classes +
  `size` / `tone`, read-only like Button), `TextLink` / `TextButton` variant `muted`, `Radio` /
  `RadioGroup` / `ChoiceTile` (`components/radio.tsx`, client; the group hands name / checked /
  onChange to its options; tile layouts row / compact / stacked = WFO's three tiles), `Checkbox`
  without `label` (the bare selection box, `aria-label` required by the type), `SplitLayout` and
  `Grid` (server-safe; cols 2 | 3 from none / sm / lg), `TagRemove` (client, the ✕ inside a server-safe
  `Tag`), `Text` `nowrap` / `tabular`. `tests/primitives-1-6.test.tsx` compares each with the app
  recipe. AppFrame's content widths are values (`max-w-[64rem]` / `[72rem]`): the named sizes made
  every app declare both container variables (`tests/theme-variables.test.ts` pins the container
  sizes; never spell a named-size class in a library comment either, Tailwind scans comments).
  The style guard skips `<input type="hidden">`. `app-shots`: route objects `{ path, resolve,
  noise, tries }` + `visual.settleTries` (fixture ids resolved at capture; a never-settling page's
  pixel allowance, also honoured by compare). The RowMenu follow-scroll behaviour test reads both
  rectangles in one frame (was flaky under load). 8 stories (98), 72 new baselines only. Released
  with `--compatible Checkbox --compatible Text --compatible textClasses`. The CHANGELOG lists each
  app's second-sweep codemods.
