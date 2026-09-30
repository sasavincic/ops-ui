# @latro/ops-ui: the shared UI library for Workforce Ops, FinaOps and PrefabOps

**Status: APPROVED 2026-09-30.** Saša approved the plan and the recommendations ("Do all. I will go with your recommendations.").

This spec implements Part C of `2026-09-30-suite-security-and-shared-ui.md`: Phases 1–2 and the app switcher. It replaces that document's distribution choice (§1.1).

**Base design.** The judges chose the "layered" design: a headless library, plus a per-app wrapper layer under today's `src/components/ui` names. This spec keeps that base and grafts named ideas from the "adapter" and "provider" designs (§1.2).

**Sources.** Facts come from the read-only survey of 2026-09-30 (`kit-inventory.md`, `prefab-inventory.md`, `prefab-next16.md`). The numbers were re-checked against the working trees the same day. One correction: the apps share **33** kit files (not 32). **28** are byte-identical and **5** differ.

**Where this file goes.** Once the library repo exists, this file lands as `docs/superpowers/specs/2026-09-30-ops-ui-library.md` in `sasavincic/ops-ui`. The same copy goes into the three app repos, following the suite-spec idiom. Decision 5 of the suite spec then reads "vendoring (decided 2026-09-30, see ops-ui spec)".

---

## 0. Summary

- **The library.** One private repo, `sasavincic/ops-ui`, package name `@latro/ops-ui`. It is never published to a registry.
  - It knows nothing about any app: no `@/` imports, no dictionaries, no permission areas, no domain modules.
  - It depends only on React, `next/link`, `next/navigation`, cva, clsx and tailwind-merge.
- **Vendoring.** Each app copies a released version into `src/vendor/ops-ui/` with `scripts/sync-ops-ui.mjs`.
  - The copy is pinned by `ops-ui.lock.json`.
  - The copy is committed, so builds never touch the library repo.
- **The wrapper layer.** Each app keeps `src/components/ui/<name>.tsx` as its kit namespace.
  - Most files are one-line re-exports of the vendored files.
  - App knowledge enters at three binding points only: the `record-tab.tsx` wrapper adds the permission area, the app's `WriteScope` (in `permissions-provider.tsx`) renders the library's read-only scope, and the app's `I18nProvider` feeds the kit its strings.
  - As a result, none of the ~815 Workforce Ops (WFO) or ~357 FinaOps kit import lines change. Every doc that names `@/components/ui/...` stays true.
- **Brands.** Each app's brand lives in plain `:root { --brand-*: … }` variables in `src/app/brand.css`. The library's `@theme` reads them through `var()`.
- **1.0.0 is a pure extraction:** it renders identically to today's kits. Every visible change is its own commit, either before the swap ("align") or after it ("follow-up").
- **Order:**
  1. Library 1.0.0
  2. FinaOps
  3. Workforce Ops
  4. Library 1.1.0 (AppSwitcher, ValidityCell)
  5. PrefabOps P0–P5
  6. Library 2.0.0 (batched visible fixes), whenever the batch is worth it; it does not wait for PrefabOps

### Downtime

None is expected at any step.
- Every step changes source code only: no database migration, no new environment variable, no secret, no auth change.
- There is no runtime link to the library repo, because the vendored copy is committed and the build reads only the app's own files.
- Each merge is an ordinary atomic Vercel deploy. Rollback is Instant Rollback or a revert of that merge.
- FinaOps has no production deployment yet, so its steps cannot affect users at all.
- PrefabOps changes are staged the same way, each on its own branch.
- **The real risk is a visual regression, not an outage.** The gates in §12 catch it before merge: zero-pixel screenshot diffs plus an exact token dump.

---

## 1. Decisions

### 1.1 Distribution: vendoring instead of GitHub Packages

Part C recommended publishing `@latro/ops-ui` to GitHub Packages, with a read-only `NPM_TOKEN` in each Vercel project. All three designs rejected that for token reasons, and this spec adopts vendoring, the fallback Part C already named (the document-templates sync pattern).

The problems with the registry:
- **A long-lived credential in many places.** GitHub Packages' npm registry installs private packages only with a classic personal access token. A classic token is user-wide and cannot be scoped to one repository. That same credential would have to sit in three Vercel projects, every local checkout and every Claude session. This lands exactly while Phase 0 is rotating secrets and cutting them down.
- **A build-time dependency.** Every build would depend on the token and the registry: an expired or revoked token fails every deploy.
- **Publishing from sessions.** Publishing would need a write token in the session. The session git proxy already refuses tag pushes, which is the usual release anchor.

Vendoring needs no token, no registry and no network at build time. A release is a git commit, and an app takes it by committing a copy. Moving to a registry later changes only the import path of the vendor folder.

### 1.2 Base design and grafted ideas

| Idea | From | Where |
|---|---|---|
| Headless library; per-app wrappers under `src/components/ui`, so the ~1,170 kit import lines never change | layered | §3, §6.4 |
| One read-only context in the library; app `WriteScope` renders it; default-deny smoke test in every app | layered (+ provider bridge test) | §6.2, §11.3 |
| Single `cn` (one tailwind-merge config) re-exported by the app | layered | §7 |
| Explicit `@source` for the vendor folder; `/dev/kit` route inside the app's visual check | layered | §8.4, §11.4 |
| Atomic swap of the vendor folder | layered | §5.2 |
| `KIT-OVERRIDE` escape hatch, listed and **expiring** by version | layered (tightened) | §6.4 |
| Scoped reset `:where(.ops-ui-root)` while PrefabOps' old and new CSS coexist | layered | §13 |
| Brand values as plain `:root --brand-*` variables that the library `@theme` reads through `var()`; no `@theme` in brand files | adapter | §8 |
| Brand-contract contrast test (OKLCH → sRGB) | adapter | §8.5 |
| Destinations restricted to an allow-list; a new file colliding with an existing one is refused; lock with no timestamp; sync script updates itself last | adapter | §5 |
| Compile-time conformance of the bridge (`satisfies`, `PermissionArea extends string`) | adapter | §6.3 |
| Computed-style token dump before and after every swap | adapter | §11.4 |
| Strict semver: level decided by what an unchanged call site renders; a changed existing snapshot forces a major | provider | §4.1 |
| `release/vX.Y.Z` branch as a second marker beside the `release: vX.Y.Z` commit; lock pins the commit; sync refuses a release that moved | provider | §4.2, §5.2 |
| Exported `checkVendor()` used by the app vendor test | provider | §5.4 |
| Purity rules: relative imports only; a file without `"use client"` never touches the config context | provider | §11.1 |
| PrefabOps P1 legacy-token rename and P2 layered import without preflight, harness diff 0 at each step | provider | §13.2 |
| 1.0 is a pure extraction; ValidityCell arrives in 1.1 after a parity test | all three / judges | §9, §12.4 |
| PrefabOps dark mode dropped at the shell step | provider, adapter | §13.3 |

### 1.3 Recommendations taken as decisions

1. Vendoring (§1.1).
2. FinaOps switches first, as the cheap proof (no production), then Workforce Ops.
3. The wrapper layer is **permanent**, not a transition. No codemod ever rewrites the import sites.
4. FinaOps `--color-info` moves from hue 245 to 240. Its own DESIGN.md claims the WFO hues, so this is drift.
5. FinaOps' "not ours" Monogram tone becomes the suite ochre `oklch(0.64 0.13 60)`, contrast 3.49:1. Today it is its gold accent, 2.09:1.
6. FinaOps toasts drop the 3.75rem lift, which only WFO's assistant bubble needs.
7. ValidityCell joins in 1.1. MonthNav's dictionary month names, the label-free discard guard and the GlanceCard/"Close" defaults are batched into 2.0.
8. Strict semver (§4.1).
9. PrefabOps adoption:
   - dark mode dropped;
   - dates shown as DD-MM-YYYY (the suite format);
   - dialogs close with ✕ only, like the kit (Prefab's "Escape closes" goes);
   - `info` toasts stay until dismissed;
   - toast label words are dropped (glyph only);
   - migrated areas use Tailwind's breakpoints (640/768/1024/1280).

---

## 2. Goals and non-goals

**Goals**

1. One implementation of the kit primitives and the design doctrine for the three apps, each with its own brand colour.
2. **Deliberate upgrades.** A library release changes nothing in an app until that app syncs it on a branch and passes its own gates.
3. A hand edit of the vendored copy can never be committed green.
4. The 1.0 switch is render-identical in both existing apps, proven by pixels and computed tokens.
5. No disruption for the sessions editing WFO and FinaOps in parallel: import paths, doc references and the kit namespace stay.
6. A safe path for PrefabOps (no Tailwind today, 13.8k lines of hand-written CSS, colliding token names), area by area, with a zero-diff proof at each step.
7. An app switcher: plain links between the three production apps.

**Non-goals**

- Publishing to any registry, or any runtime dependency on the library repo.
- Shared auth, SSO or shared cookies. Phase 3 of the suite spec stays deferred.
- Sharing shells, navigation, screens or business rules. The sidebar, command palette, pull-to-search, `RecordListToolbar`, pickers (country, employer), role/user settings components and `unsaved-exit-guard` stay app code. Each may join later through its own spec line and minor release.
- Dark mode in the library (§13.3).
- Visual redesign. The library freezes today's look; every visible change goes through the semver gate.
- A barrel `index.ts`. It would mix server-safe and `"use client"` modules.

---

## 3. Repository layout

### 3.1 The library repo (`/home/user/ops-ui`, GitHub `sasavincic/ops-ui`, private)

```
ops-ui/
  package.json            "@latro/ops-ui", "private": true, version, peerDependencies (documentation + sync check)
  ship.json               what a sync copies, with destinations (§5.2)
  CHANGELOG.md            per version: Added / Changed / Fixed / Visible / Breaking / Upgrade steps
  DESIGN.md               the shared doctrine (moved out of WFO DESIGN.md, app examples removed)
  TOKENS.md               the token + brand contract table (§8), checked against tokens.css by a test
  CLAUDE.md               rules for sessions working in the library (§4, §11)
  api-surface.d.txt       generated declaration surface (§4.1), committed
  src/
    version.ts            export const OPS_UI_VERSION = "1.0.0"
    types.ts              React-free: BadgeVariant, StatusIconName, ActionIconName, StateMarkSpec, CalloutTone, ToastTone, ToastAction
    config/strings.ts     OpsUiStrings, EN_STRINGS
    config/provider.tsx   OpsUiProvider, useOpsUi                       ("use client")
    config/read-only.tsx  ReadOnlyScope, useReadOnlyScope              ("use client")
    lib/cn.ts             cn with the text-detail/text-micro tailwind-merge extension
    lib/fmt.ts            fmt(template, values)
    lib/text.ts           normalizeSearchText, buildHaystack, matchesAllWords
    lib/dates.ts          formatDate, shiftDay
    lib/date-input.ts     isIsoDate, localTodayIso, maskTypedDate, monthGrid, parseTypedDate, shiftDayByMonths, shiftMonth, withinRange
    lib/months.ts         shiftMonth(month "YYYY-MM", delta)
    lib/use-dismissable.ts
    navigation/trail.ts        (was domain/nav-trail.ts)
    navigation/history.ts      (was lib/navigation-history.ts)
    navigation/nav-trail.tsx   NavTrail, useReturnNavigation            ("use client")
    components/           the 35 kit files of §9
    stories/              <component>.stories.tsx + index.ts (registry), shipped so apps render them in /dev/kit
  styles/
    tokens.css            the @theme contract (§8.2)
    kit.css               what components need: @keyframes toast-in
    base.css              page rules both apps share word for word (§8.1)
    app-feel.css          no-zoom touch-action, coarse-pointer overscroll contain
  sync/sync-ops-ui.mjs    shipped to each app as scripts/sync-ops-ui.mjs
  tools/
    release.mjs           §4.2
    app-shots.mjs         per-app visual check, run from the library (apps carry no Playwright) §11.4
    diff-against-app.mjs  proves 1.0 is an extraction (§12.1)
    pull-brands.mjs       copies the apps' brand.css into gallery fixtures
    api-surface.mjs       regenerates api-surface.d.txt
  gallery/                Next 16 app: app/[brand]/layout.tsx sets <html data-brand>, app/[brand]/[story]/page.tsx
    brands/workforce.css finaops.css prefab.css    (html[data-brand=x] { --brand-*: … })
    tests/shots.spec.ts   Playwright; __screenshots__/ baselines
  tests/                  vitest (node environment, renderToStaticMarkup)
```

**Tooling:**
- pnpm, Node ≥ 20.
- TypeScript strict, with the same `compilerOptions` as the apps minus `paths`. The library needs no alias because every internal import is relative.
- ESLint `no-restricted-imports` forbids `@/…` and any bare import outside the peer set.
- Vitest in the node environment.
- The gallery's `next.config.ts` sets `turbopack.root` to the repo root.
- The gallery loads Geist from the `geist` package (`next/font/local`), so snapshots never fetch fonts.

**Dependencies:**
- `peerDependencies`: `next >=16.2 <17`, `react` / `react-dom >=19.2 <20`, `tailwindcss >=4.1 <5`, `class-variance-authority ^0.7.1`, `clsx ^2.1.1`, `tailwind-merge ^3.6`.
- `devDependencies`: the same pinned versions as WFO (next 16.2.10, react 19.2.4), plus `@tailwindcss/postcss`, `vitest ^4`, `@playwright/test`, `pixelmatch`, `pngjs`, `geist`, `typescript ^5`, `eslint`.

### 3.2 What an app holds

WFO and FinaOps keep these at the repo root. PrefabOps keeps them under `apps/web/`.

```
ops-ui.config.json                 app-owned (§3.3)
ops-ui.lock.json                   written by the sync, never by hand (§5.3)
.gitattributes                     src/vendor/ops-ui/** linguist-generated=true (GitHub folds the diffs)
scripts/sync-ops-ui.mjs            library-owned (synced)
src/vendor/ops-ui/**               library-owned (synced): src/** + styles/ + DESIGN.md, TOKENS.md, CHANGELOG.md
src/app/globals.css                app-owned: imports (§8.4) + app extension tokens
src/app/brand.css                  app-owned: :root { --brand-* } only
src/components/ui/<name>.tsx       app-owned wrappers, one per library component (§6.4)
src/components/ui/kit-contract.ts  app-owned: pickKitStrings + compile-time conformance (§6.3)
src/app/(app)/dev/kit/[[...story]]/page.tsx   app-owned: the vendored stories with the real providers; notFound() in production
tests/ops-ui/vendor.test.ts        app-owned (§11.3)
tests/ops-ui/bridge.test.tsx       app-owned (§11.3)
```

ESLint ignores `src/vendor/**`, because the library lints itself. `tsc` does type-check the vendor folder under the app's config. Tailwind scans it through the explicit `@source` in globals.css (§8.4).

### 3.3 `ops-ui.config.json` (app-owned)

```json
{
  "source": "../ops-ui",
  "vendorDir": "src/vendor/ops-ui",
  "globalsCss": "src/app/globals.css",
  "brandCss": "src/app/brand.css",
  "extensions": ["--color-tool", "--color-sick", "--color-sick-subtle"],
  "local": ["src/components/ui/validity-cell.tsx"],
  "bindings": [
    "src/components/ui/**", "src/components/permissions-provider.tsx", "src/i18n/client.tsx",
    "src/i18n/locales.ts", "src/lib/utils.ts", "src/lib/use-dismissable.ts",
    "src/lib/navigation-history.ts", "src/components/shell/nav-trail.tsx",
    "src/domain/{dates,date-input,months,hours-periods,search,nav-trail,status-meta,compliance}.ts",
    "src/app/(app)/dev/kit/**", "tests/ops-ui/**"
  ],
  "visual": {
    "baseUrl": "http://localhost:3000",
    "login": { "path": "/login", "userEnv": "OPS_UI_SHOTS_USER", "passwordEnv": "OPS_UI_SHOTS_PASSWORD" },
    "readonlyLogin": { "userEnv": "OPS_UI_SHOTS_RO_USER", "passwordEnv": "OPS_UI_SHOTS_RO_PASSWORD" },
    "widths": [1440, 375],
    "routes": ["/operations", "/operations?tab=flightboard", "/workers", "/workers/<fixture-id>", "…", "/dev/kit"],
    "readonlyRoutes": ["/workers/<fixture-id>", "/worksites/<fixture-id>?tab=work"],
    "mask": ["[data-wall-clock]"]
  }
}
```

The example shows WFO's values.
- **FinaOps:** `baseUrl` `http://localhost:3100`, no extensions, no `local`. Its routes: `/`, `/review`, `/transactions`, `/transactions/<id>`, `/reports`, `/close`, `/invoicing`, `/invoicing/new`, `/invoicing/invoices/<id>`, `/statements/new`, `/companies/<id>`, `/settings`, `/insights`, `/analysis`, `/login`, `/read-only`, `/dev/kit`.
- **Route ids** are literal ids from the local fixture database: WFO `scripts/dev-fixtures.ts`, FinaOps `pnpm db:fixtures`. They are re-listed when the fixtures are rebuilt.
- **`source`:** resolves to `/home/user/ops-ui` from both repo roots. For PrefabOps (`apps/web`) it is `../../../ops-ui`.

---

## 4. Versions and releases

### 4.1 The semver rule

The level is decided by **what an unchanged call site renders**.

| Level | Allowed | Mechanical check (release script) |
|---|---|---|
| **Patch** | A fix that restores documented behaviour. Rendered DOM and CSS stay identical for every existing story. | `api-surface.d.txt` unchanged; no existing baseline modified or deleted (new regression stories allowed) |
| **Minor** | Additive only: a new component, export, glyph, token, opt-in stylesheet or optional string with an English default; a new prop whose default keeps today's output. DOM may gain attributes. Existing baselines stay at **0 changed pixels**. | api-surface has only added lines; no existing baseline modified or deleted |
| **Major** | Anything else: a changed existing baseline, a removed or changed declaration, a changed default, a changed token value or meaning, a new *required* string or brand variable, a peer range major. **Visible fixes are batched into planned majors.** | — |

`api-surface.d.txt` is the concatenated, per-file sorted `.d.ts` output of `tsc --emitDeclarationOnly` over `src/`. `tools/api-surface.mjs` regenerates it and `pnpm test` fails when it is stale.

A declaration line that changed in a provably compatible way (for example, a widened parameter type) still counts as major, unless the release is run with `--compatible "<declaration name>"`. That flag writes a `Compatible:` line into the CHANGELOG naming the declaration and the reason.

**Pure rebaseline commits** only touch `gallery/__screenshots__/**` and `gallery/playwright.config.ts`, and must be titled `shots: rebaseline (<reason>)` (for example a Chromium update). They are exempt from the baseline rule, because no library source changed. A commit that touches `src/` or `styles/` together with baselines is never exempt.

### 4.2 The release script (`pnpm release <X.Y.Z> [--compatible <name>]…`)

1. **Refuses unless:**
   - on `main`;
   - the working tree is clean;
   - `git fetch origin` worked and `HEAD == origin/main`, so a release always sits on pushed history;
   - `X.Y.Z` is the next patch, minor or major after `package.json`'s version.
2. Runs `pnpm typecheck && pnpm lint && pnpm test && pnpm shots`. The shots compare against the committed baselines, so any baseline change was committed and reviewed before the release.
3. Finds the previous release commit P, the one titled `release: v<current>`.
4. Computes the **required level** from the diff P..HEAD, using the §4.1 rule:
   - modified or deleted baselines in non-exempt commits → major;
   - api-surface removals or changes without `--compatible` → major;
   - api-surface additions or new baseline files → at least minor;
   - a new required brand variable in `TOKENS.md` → major;
   - a `Breaking:` line in the CHANGELOG section → major.
   
   **It refuses when the requested bump is below the required level.** A higher bump is allowed.
5. `CHANGELOG.md` must have `## X.Y.Z` with dated sections. A major must have `Visible:` (every pixel change, per component) and `Upgrade steps:` (exact commands and edits per app).
6. Writes `package.json` `"version"` and `src/version.ts`, then commits exactly those two files as **`release: vX.Y.Z`**.
7. Creates branch **`release/vX.Y.Z`** at that commit and pushes `main` and the branch.
   - If the proxy refuses the branch push, it prints a warning and continues, because the commit message marker alone is enough for the sync.
   - It never pushes tags: the session proxy rejects tag refs, as the document-service v0.4.0 tag showed.

The first release (1.0.0) has no P, so step 4 is skipped. Everything else runs.

### 4.3 CHANGELOG format

```
## 1.1.0 — 2026-10-06
Added: AppSwitcher (components/app-switcher.tsx), lib/apps.ts (OPS_APPS).
Added: ValidityCell / ValidityNote (components/validity-cell.tsx), lib/validity.ts, optional strings.validity.
Changed: DialogFooter/SheetFooter/ConfirmDialog buttons carry data-ops-dismiss / data-ops-commit (no pixel change).
Upgrade steps: node scripts/sync-ops-ui.mjs --version 1.1.0 && node scripts/sync-ops-ui.mjs --write-wrappers
```

---

## 5. The sync script (`scripts/sync-ops-ui.mjs`)

### 5.1 Commands

```
node scripts/sync-ops-ui.mjs --version 1.2.0 [--repo <path>] [--dry-run] [--discard-local-edits] [--allow-downgrade]
node scripts/sync-ops-ui.mjs --ref <sha> [--repo <path>]     # local trial only; stamps 1.2.0-dev+<sha7>
node scripts/sync-ops-ui.mjs --check                          # verify only (= checkVendor)
node scripts/sync-ops-ui.mjs --write-wrappers                 # create missing pure wrappers; never overwrites
```

**Exit codes:**
- **0:** done or verified.
- **1:** refused. The reasons are printed one per line.
- **2:** usage or environment error, for example the repo was not found. The message suggests `add_repo sasavincic/ops-ui` in cloud sessions.

The script never commits, never pushes, and never touches anything outside the destinations in §5.2 step 5 and the lock.

### 5.2 What a sync does, in order

1. **Find the library repo.** It tries `--repo`, then `$OPS_UI_REPO`, then `config.source`, then `../ops-ui`. It must be a git repository. Then:
   ```
   git fetch origin main 'refs/heads/release/*:refs/remotes/origin/release/*'
   ```
   The fetch is best-effort: offline is fine if the refs exist locally.
2. **Resolve the version to one commit C.**
   - `A` = the commits reachable from `origin/main` (or `main` if there is no remote) whose subject is exactly `release: v1.2.0`. There must be **exactly one**.
   - `B` = `origin/release/v1.2.0` (or local `release/v1.2.0`). If it exists, it must equal `A`. If they disagree, the script refuses: "release markers disagree".
   - At `A`, `package.json` must say `1.2.0` and `src/version.ts` must contain `1.2.0`.
   - If the lock pins `1.2.0` at a different commit, the script refuses: "release v1.2.0 moved from <old> to <new>".
   - With `--ref <sha>`: C = sha, and the version is `<package.json at sha>-dev+<sha7>`. The lock gets `"dev": true`.
3. **Read content from git objects only.** It lists files with `git ls-tree -r --name-only C`, filters them by the globs and mappings in `ship.json` at C, and reads each one with `git show C:<path>`. The library's working tree is never read, so uncommitted library edits cannot leak into an app.
4. **Pre-flight.** Nothing has been written yet. Every failed check is collected, printed, and exits 1.
   - **Local edits.** Every destination listed in the current lock is hashed (sha256). A mismatched or missing file is a local edit. With `--discard-local-edits` it is overwritten; otherwise the script refuses and prints `git diff -- <file>` hints and "fix it in ops-ui, release, sync".
   - **Unknown files.** A file in `vendorDir` that is not in the lock is refused, unless `--discard-local-edits` is given, in which case it is removed.
   - **Destination allow-list.** Every destination in the new file set must sit under `vendorDir` or be exactly `scripts/sync-ops-ui.mjs`. Otherwise the release is malformed and the script refuses. A release can never write app code.
   - **Collisions.** A destination that is not in the old lock but already exists on disk is refused, even with `--discard-local-edits`. The message says to move the app's file.
   - **Downgrade.** A new version lower than the locked one is refused unless `--allow-downgrade` is given.
   - **Peers.** The version in each `node_modules/<pkg>/package.json` must satisfy `peerDependencies` at C. The script has its own small range matcher for `^`, `>=`, `<` and `||`.
   - **Extensions.** If `styles/tokens.css` at C declares a name listed in `config.extensions`, the script refuses. The library may never take an app's token name.
   - **Brand contract.** It runs the §8.5 checks against `config.brandCss`. So a major that adds a required brand variable fails loudly, naming the variable.
   - **Theme gotcha.** Inside an `@theme` block in `config.globalsCss` or `config.brandCss`, any comment containing a double-quote character is refused.
   - **Crossing a major.** If the upgrade crosses one or more majors, it prints every `Visible:`, `Breaking:` and `Upgrade steps:` section in between. This is informational, not a refusal.
   - With `--dry-run`, the script prints the plan (files added, changed, removed) and exits here.
5. **Write the files into a temporary directory** `<vendorDir>.ops-ui-tmp`, using the `ship.json` mapping:
   - `src/**` goes to `<vendorDir>/**`.
   - `styles/*.css` goes to `<vendorDir>/styles/`.
   - `DESIGN.md`, `TOKENS.md` and `CHANGELOG.md` go to `<vendorDir>/`.
   - `sync/sync-ops-ui.mjs` goes to `scripts/sync-ops-ui.mjs`.
   
   Each file gets a first-line header with no double quotes, so no CSS comment can trigger the gotcha:
   - `.ts`, `.tsx`, `.mjs`: `// GENERATED from @latro/ops-ui v1.2.0 (abc1234) by scripts/sync-ops-ui.mjs - do not edit; change ops-ui, release, sync.`
     A comment above `"use client"` is legal, because a directive must only be the first *statement*.
   - `.css`: `/* GENERATED from @latro/ops-ui v1.2.0 (abc1234) - do not edit. */`
   - `.md`: `<!-- GENERATED from @latro/ops-ui v1.2.0 (abc1234) - do not edit. -->`
   
   Hashes are computed over the final content, header included.
6. **Swap atomically.**
   1. Rename `vendorDir` to `vendorDir.ops-ui-old`.
   2. Rename the temporary directory to `vendorDir`.
   3. Delete the old directory.
   
   If any rename fails, the old directory is restored and the script exits 1. Library-owned files that left `ship.json` disappear with the old folder. A removed `scripts/` destination is deleted explicitly.
7. **Write the lock** (§5.3).
8. **Update itself last.** If the content of `scripts/sync-ops-ui.mjs` changed, the script writes it last (temp file, then rename). It prints "the sync script was updated - run the same command again" and exits 0. The second run is a no-op sync that applies the new script's checks.
9. **Report:**
   - old → new version, and the counts of files added, changed and removed;
   - the CHANGELOG between the two versions;
   - for pure wrappers: any new component module without a wrapper ("run --write-wrappers");
   - the next steps: `pnpm typecheck && pnpm test`, then the visual check (§11.4).

`--write-wrappers` creates `src/components/ui/<name>.tsx` for every `<vendorDir>/components/<name>.tsx` that has no wrapper. The new file contains named re-exports of the vendored module's runtime and type exports, which are parsed from its `export function` / `export const` / `export type` / `export {…}` statements. It never overwrites a file.

### 5.3 The lock (`ops-ui.lock.json`)

```json
{
  "commit": "3f2c9e1d…40 hex…",
  "files": {
    "scripts/sync-ops-ui.mjs": "sha256…",
    "src/vendor/ops-ui/components/button.tsx": "sha256…"
  },
  "version": "1.2.0"
}
```

- Keys are sorted, with a trailing newline and **no timestamp**, so re-running a sync produces no diff.
- A dev sync adds `"dev": true`, and the version becomes `1.2.0-dev+3f2c9e1`.
- The lock **is** the pin: whatever it names is what the build runs.

### 5.4 `checkVendor(appRoot)`

The script exports it. It runs `main()` only when executed directly, not when imported.

```ts
export async function checkVendor(appRoot: string): Promise<{
  ok: boolean; version: string; dev: boolean;
  edited: string[]; missing: string[]; unknown: string[];
  brand: string[]; theme: string[];     // §8.5 problems, gotcha problems
}>
```

`ok` means all of the following hold:
- every locked file matches its hash;
- no unknown files are present;
- the lock is not dev;
- the vendored `src/version.ts` equals the lock's version;
- the brand contract holds;
- there are no theme gotchas.

`--check` prints the same result.

### 5.5 Upgrading an app

1. Create a branch.
2. Run `node scripts/sync-ops-ui.mjs --version X.Y.Z`, and then `--write-wrappers` if the report asks for it.
3. Apply the CHANGELOG's Upgrade steps (majors only).
4. Pass gates G1–G4 (§12.0). For a patch or minor, G2 must show 0 changed pixels. For a major, only the pages the `Visible:` lines name may differ.
5. Make one commit, titled `ops-ui A → B`, and merge it the way that app merges.

---

## 6. Runtime contract

### 6.1 `OpsUiProvider` and strings

```ts
// config/strings.ts
export type OpsUiStrings = {
  back: string; cancel: string; close: string; save: string; saving: string; unsavedConfirm: string;
  search: string; noMatches: string; open: string; copyValue: string; copied: string; copyFailed: string;
  pickMonth: string; prevMonth: string; nextMonth: string; prevYear: string; nextYear: string;
  datePicker: {
    placeholder: string; months: string; monthsShort: string; weekdays: string;   // comma-joined, as the dictionaries hold them
    openCalendar: string; previousMonth: string; nextMonth: string; previousYear: string; nextYear: string;
    previousYears: string; nextYears: string; chooseMonth: string; today: string; clear: string;
    earliest: string; latest: string;                                               // "{date}" templates
  };
  tabs?: string;                                    // 1.1, optional, default "Tabs"
  appSwitcher?: { label: string; current: string }; // 1.1, optional
  validity?: { expiredAgo: string; expiresIn: string; unknown: string; noExpiry: string }; // 1.1, optional
};
export const EN_STRINGS: OpsUiStrings;              // = today's WFO en common values

// config/provider.tsx ("use client")
export type OpsUiConfig = {
  strings: OpsUiStrings;                 // default EN_STRINGS
  localize: (text: string) => string;    // default identity; used by Field and the toast hooks
  locale: string;                        // 1.x only (MonthNav's Intl month names); removed in 2.0
};
export function OpsUiProvider(p: Partial<OpsUiConfig> & { children: React.ReactNode }): React.JSX.Element;
export function useOpsUi(): OpsUiConfig; // never throws; defaults outside a provider
```

- **17 top-level strings plus 16 `datePicker` strings.** These are exactly the `common.*` keys the kits read today.
- **Behaviour outside a provider** (the root-layout `Toaster`, the login page) is today's `useMaybeDict() === null` behaviour: English literals and identity localisation.
- **English defaults.** Components that call `useDict()` today (and so could not render outside a provider) now fall back to English. That is strictly more permissive and changes nothing where they render today.
- **Per-call label props still win:** `closeLabel`, `openLabel`, `pendingLabel`, `clearLabel`.

### 6.2 The read-only scope: one context, in the library

```ts
// config/read-only.tsx ("use client")
export function ReadOnlyScope(p: { readOnly: boolean; children: React.ReactNode }): React.JSX.Element;
export function useReadOnlyScope(): boolean;   // default false
```

- `ReadOnlyScope` **provides** its value. It does not OR it with the parent, so a nested `readOnly={false}` re-opens a subtree, which is today's WriteScope semantics in both apps.
- Button, ButtonLink, AdminIconButton, DateInput and Field read this context. Anything inside a read-only scope renders nothing or comes up disabled, unless it is marked `readOnlySafe`.
- The apps delete their own `ReadOnlyContext` (§6.3). The default-deny smoke test (§11.3) proves there is only one context left.

### 6.3 The app bridge

**Strings and localisation** are bridged inside the app's own `I18nProvider` (`src/i18n/client.tsx`). Every place that mounts the dictionary therefore mounts the kit config automatically. In WFO those places are `(app)/layout`, `whiteboard/page`, `wall-pairing` and `(auth)/password`; in FinaOps, `(app)/layout` and `(auth)/password`.

```tsx
export function I18nProvider({ dict, locale = "en", children }: { dict: Dict; locale?: Locale; children: React.ReactNode }) {
  const kit = useMemo(
    () => ({ strings: pickKitStrings(dict.common), localize: (s: string) => localizeMessage(dict, s), locale }),
    [dict, locale],
  );
  return (
    <I18nContext.Provider value={{ dict, locale }}>
      <OpsUiProvider {...kit}>{children}</OpsUiProvider>
    </I18nContext.Provider>
  );
}
```

**Compile-time conformance** lives in `src/components/ui/kit-contract.ts`, the adapter-check idea:

```ts
import type { OpsUiStrings } from "@/vendor/ops-ui/config/strings";
import type { Dict } from "@/i18n/dictionaries/types";
import type { PermissionArea } from "@/domain/permissions";

/** Explicit pick: a key the kit needs and the dictionary lacks fails tsc; app keys never leak in. */
export function pickKitStrings(c: Dict["common"]): OpsUiStrings {
  return {
    back: c.back, cancel: c.cancel, close: c.close, save: c.save, saving: c.saving,
    unsavedConfirm: c.unsavedConfirm, search: c.search, noMatches: c.noMatches, open: c.open,
    copyValue: c.copyValue, copied: c.copied, copyFailed: c.copyFailed, pickMonth: c.pickMonth,
    prevMonth: c.prevMonth, nextMonth: c.nextMonth, prevYear: c.prevYear, nextYear: c.nextYear,
    datePicker: c.datePicker,
  } satisfies OpsUiStrings;
}
type AreaIsString = PermissionArea extends string ? true : never;
export const areaIsString: AreaIsString = true;   // RecordTab/WriteScope areas stay typed per app
```

**Read-only** is bridged in `src/components/permissions-provider.tsx`:
- `ReadOnlyContext` is deleted.
- `useReadOnlyScope` is re-exported from `@/vendor/ops-ui/config/read-only`.
- `WriteScope({ area })` resolves `useCanWrite(area)` and renders `<ReadOnlyScope readOnly={!canWrite}>`.
- `PermissionsProvider`, `useCanWrite` and WFO's `adminTools`/`useAdminTools` stay as they are.

**PrefabOps** has no dictionary and no roles. It mounts `<OpsUiProvider>` with defaults in `AppProviders`, and uses `<ReadOnlyScope readOnly>` directly around archived-project content (§13.2 P3).

### 6.4 Wrappers

- **Every library component gets a wrapper file** under `src/components/ui/`, in every app. `--write-wrappers` creates them, and the namespace is the same in all apps. Example:
  ```ts
  export { Button, ButtonLink, FileLink, AdminIconButton } from "@/vendor/ops-ui/components/button";
  ```
  Named exports only; no `export *`.
- **Pure wrappers carry no directive.** The vendored file is the client boundary.
- **Binding wrappers keep the directive of the file they replace.** In 1.0 there is exactly one:
  ```tsx
  "use client";
  // src/components/ui/record-tab.tsx
  import { WriteScope } from "@/components/permissions-provider";
  import type { PermissionArea } from "@/domain/permissions";
  import { RecordTab as KitRecordTab, RecordTabAction, RecordTabNote } from "@/vendor/ops-ui/components/record-tab";
  export { RecordTabAction, RecordTabNote };
  export function RecordTab({ area, ...rest }: { area: PermissionArea } & React.ComponentProps<typeof KitRecordTab>) {
    return <WriteScope area={area}><KitRecordTab {...rest} /></WriteScope>;
  }
  ```
- **App-local kit files** are listed in `config.local`. In 1.0 that is WFO `validity-cell.tsx` only. They stay in `src/components/ui` untouched, and their `./status-icon` imports resolve through the wrappers.
- **`KIT-OVERRIDE`.** In an emergency, a wrapper may export a local variant instead of the vendored one. The line must carry `// KIT-OVERRIDE until ops-ui X.Y: <reason>`. The vendor test fails once the locked version is ≥ X.Y. The vendored copy itself is never edited.

---

## 7. Decoupling: every app import the kit makes today

The rows cover all 17 external modules found in the inventory (§3 of `kit-inventory.md`).

| Kit's app import today (used by) | In the library | App side after the switch |
|---|---|---|
| `@/lib/utils` `cn` (~29 files) | `lib/cn.ts`, the identical code including the `extendTailwindMerge` text-detail/text-micro registration | `lib/utils.ts` re-exports `cn` (keeps `isUuid`), so there is **one** tailwind-merge config |
| `@/lib/use-dismissable` (date-input, month-nav, page-help, row-menu) | `lib/use-dismissable.ts` | app file re-exports it (app menus keep using it) |
| `@/components/permissions-provider` `useReadOnlyScope`, `WriteScope` (button, date-input, field, record-tab) | `config/read-only.tsx` `ReadOnlyScope`/`useReadOnlyScope`; the library never names an area | binding in §6.3; own context deleted |
| `@/domain/permissions` `PermissionArea` type (record-tab) | removed: library `RecordTab` has no `area` | `record-tab.tsx` binding adds `area` (§6.4) |
| `@/components/shell/nav-trail` + `@/domain/nav-trail` + `@/lib/navigation-history` (back-link, so button via `ReturnLink`); identical in both apps | `navigation/nav-trail.tsx`, `navigation/trail.ts`, `navigation/history.ts`; the history-state key stays `__workforceNavigation`, so entries created before the switch keep working | the three app files re-export; `NavTrail` stays mounted in `(app)/layout` |
| `@/i18n/client` `useDict` / `useMaybeDict` / `useLocale` (back-link, combobox, confirm-dialog, copy-value, date-input, dialog, field, month-nav, sheet, toast) | `useOpsUi().strings` / `.locale` | bridge in `I18nProvider` (§6.3) |
| `@/i18n/messages` `localizeMessage` (field, toast) | `useOpsUi().localize` | each app passes its own; FinaOps' template-aware version stays FinaOps' |
| `@/i18n/locales` `fmt` (date-input; validity-cell) | `lib/fmt.ts` (identical code) | `i18n/locales.ts` re-exports `fmt` |
| `@/domain/search` `matchesAllWords` (combobox) | `lib/text.ts`: WFO's `normalizeSearchText` (đ→d, ß→ss, NFD strip), `buildHaystack`, `matchesAllWords` | WFO `domain/search.ts` re-exports the three and keeps the palette index. FinaOps re-exports them **after** a parity test against `domain/names.foldText` (§12.2 F5) |
| `@/domain/date-input` (date-input); identical in both apps | `lib/date-input.ts` (whole module) | app file re-exports |
| `@/domain/dates` `formatDate`, `shiftDay` (date-input, validity-cell) | `lib/dates.ts` | app file re-exports the two and keeps `nextMonday`, `formatDateRange`, … |
| `shiftMonth` from `@/domain/hours-periods` (WFO) / `@/domain/months` (FinaOps) (month-nav) | `lib/months.ts` | both app modules re-export `shiftMonth` and keep their other functions |
| `@/domain/compliance` `documentExpiryStatus`, `@/domain/operations` `daysBetween` (validity-cell, WFO) | not in 1.0; 1.1 `lib/validity.ts` (`validityState`, `daysBetween`) | WFO `validity-cell.tsx` stays local in 1.0, then becomes a binding in 1.1 (§12.4) |
| `next/navigation` `usePathname` (WFO action-icon) | removed; FinaOps' `ActionIconScope({ enabled = true })`, context default `true` | WFO `RouteActionIconScope` + root-layout `enabled={false}` (§12.3 W2) |
| Toast viewport `+ 3.75rem` (WFO assistant bubble) | `bottom-[calc(max(1.25rem,env(safe-area-inset-bottom))+var(--ops-toast-offset,0px))]` | each app sets `--ops-toast-offset` in `brand.css` |
| Monogram `external` tone = brand `accent` | `border-external/50 bg-external/10 text-external`; `--color-external` defaults to the accent | FinaOps sets `--brand-external` in F7 |
| Domain → kit type imports: `status-meta.ts` (`BadgeVariant`, `StatusIconName`, WFO `StateMarkSpec`), `search.ts` (`StatusIconName`), WFO `compliance.ts` (`StatusIconName`) | `types.ts`, React-free | these domain files import from `@/vendor/ops-ui/types` (in `bindings`), so the domain no longer points at a component module |

Unchanged in 1.0, on purpose, so the output stays identical:
- `aria-label="Tabs"`;
- GlanceCard's `openLabel="Open"`;
- the `"Close"` fallbacks in toast and field;
- MonthNav's `toLocaleDateString(locale)`;
- Dialog/Sheet's label-matched discard guard with `window.confirm`.

§12.4 schedules each of them.

---

## 8. Tokens and the brand contract

### 8.1 Files

| File | Holds | Who imports it |
|---|---|---|
| `styles/tokens.css` | one `@theme` block: fixed tokens + brand indirections (§8.2) | every app |
| `styles/kit.css` | `@keyframes toast-in` (used as `motion-safe:animate-[toast-in_180ms_ease-out]`) | every app |
| `styles/base.css` | `body` background/ink/font/`optimizeLegibility`; `button:not(:disabled), [role=button] { cursor: pointer }`; `::selection` in primary-subtle; `prefers-reduced-motion` 0.01ms; the `[data-print-root]` print sheet (hide the rest, dialog out of the top layer) | WFO, FinaOps; PrefabOps from its shell step |
| `styles/app-feel.css` | `html, body { touch-action: pan-x pan-y }`; `(pointer: coarse) html { overscroll-behavior-y: contain }` | WFO, FinaOps; PrefabOps from its shell step |

These are today's rules, word for word. They leave the apps' globals.css files when the tokens step lands (F3/W4).

### 8.2 `styles/tokens.css` (complete, 1.0.0)

```css
/* @latro/ops-ui tokens. Rule for this file and every @theme block: a comment must never contain a
   double-quote character - Tailwind then silently drops the next declaration (the --color-tool
   incident of 2026-08-28). Brand values never live here: they are plain :root variables. */
@theme {
  /* fixed */
  --color-bg: oklch(1 0 0);
  --color-warning: oklch(0.5 0.115 80);
  --color-warning-subtle: oklch(0.965 0.05 90);
  --color-danger: oklch(0.49 0.16 25);
  --color-danger-subtle: oklch(0.96 0.022 20);
  --color-info: oklch(0.47 0.1 240);
  --color-info-subtle: oklch(0.95 0.028 240);
  --color-admin: oklch(0.47 0.19 305);
  --color-admin-subtle: oklch(0.955 0.035 305);
  --font-sans: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-geist-mono), ui-monospace, monospace;
  --text-detail: 13px;
  --text-micro: 11px;
  --radius-control: 6px;
  --radius-container: 8px;

  /* brand: required */
  --color-sidebar: var(--brand-sidebar);
  --color-sidebar-fg: var(--brand-sidebar-fg);
  --color-sidebar-fg-active: var(--brand-sidebar-fg-active);
  --color-sidebar-hover: var(--brand-sidebar-hover);
  --color-sidebar-active: var(--brand-sidebar-active);
  --color-sidebar-border: var(--brand-sidebar-border);
  --color-primary: var(--brand-primary);
  --color-primary-hover: var(--brand-primary-hover);
  --color-primary-subtle: var(--brand-primary-subtle);
  --color-accent: var(--brand-accent);

  /* brand: optional role */
  --color-external: var(--brand-external, var(--brand-accent));

  /* brand: optional neutral tint (defaults = Workforce Ops) */
  --color-surface: var(--brand-surface, oklch(0.975 0.003 250));
  --color-surface-raised: var(--brand-surface-raised, oklch(0.955 0.005 250));
  --color-border: var(--brand-border, oklch(0.9 0.006 250));
  --color-border-strong: var(--brand-border-strong, oklch(0.8 0.01 250));
  --color-ink: var(--brand-ink, oklch(0.21 0.015 255));
  --color-ink-secondary: var(--brand-ink-secondary, oklch(0.42 0.02 255));
  --color-ink-muted: var(--brand-ink-muted, oklch(0.52 0.02 255));

  /* brand: tunable status */
  --color-success: var(--brand-success, oklch(0.48 0.11 155));
  --color-success-subtle: var(--brand-success-subtle, oklch(0.955 0.04 155));
}
```

### 8.3 The token contract (full list)

| Class | Tokens | Rule |
|---|---|---|
| **Fixed** (15) | `--color-bg`; `--color-warning`, `-warning-subtle`, `-danger`, `-danger-subtle`, `-info`, `-info-subtle`, `-admin`, `-admin-subtle`; `--font-sans`, `--font-mono`; `--text-detail` 13px, `--text-micro` 11px; `--radius-control` 6px, `--radius-container` 8px | never declared by an app |
| **Brand, required** (10) | `--brand-sidebar`, `--brand-sidebar-fg`, `--brand-sidebar-fg-active`, `--brand-sidebar-hover`, `--brand-sidebar-active`, `--brand-sidebar-border`, `--brand-primary`, `--brand-primary-hover`, `--brand-primary-subtle`, `--brand-accent` | all declared on `:root`; no fallback in the library, so a missing one is refused by the sync and the vendor test |
| **Brand, optional role** (1) | `--brand-external` ("not ours": the Monogram external tone) | default = the accent; when set, ≥ 3:1 against `--color-bg` |
| **Brand, optional tint** (7) | `--brand-surface`, `--brand-surface-raised`, `--brand-border`, `--brand-border-strong`, `--brand-ink`, `--brand-ink-secondary`, `--brand-ink-muted` | OKLCH; lightness within ±0.01 of the default; chroma ≤ 0.025; hue free |
| **Brand, tunable status** (2) | `--brand-success`, `--brand-success-subtle` | hue 140–160 (FinaOps' 145 is deliberate: it must not read as its teal primary) |
| **Layout variable** (1) | `--ops-toast-offset` | plain `:root`, default `0px` via the `var()` fallback; never in `@theme`, because Tailwind drops theme variables that no utility uses |
| **App extensions** | WFO: `--color-tool`, `--color-sick`, `--color-sick-subtle` | the app's own `@theme` in globals.css, new names only, listed in `config.extensions`; the sync refuses a library release that takes one |

**Placement.** Brand variables are set on `:root` only.
- Custom properties inherit their *substituted* values, so a subtree override would not re-theme anything.
- The gallery puts `data-brand` on `<html>`, which *is* `:root`.

**Not tokens.** The kit's literal `text-white` (5×, on primary and danger fills), its `bg-ink/40` backdrops, and `rounded-[4px]` / `rounded-sm` / `rounded-full` stay as they are.

**Dark mode.** There is none (§13.3).

### 8.4 App `globals.css` and `brand.css`

```css
/* src/app/globals.css (WFO; FinaOps identical minus the extension block) */
@import "tailwindcss";
@import "../vendor/ops-ui/styles/tokens.css";
@import "../vendor/ops-ui/styles/kit.css";
@import "../vendor/ops-ui/styles/base.css";
@import "../vendor/ops-ui/styles/app-feel.css";
@import "./brand.css";
@source "../vendor/ops-ui";

/* App extensions - new names only (see ops-ui.config.json). No double quotes in comments here. */
@theme {
  --color-tool: oklch(0.74 0.1 195);
  --color-sick: oklch(0.5 0.15 345);
  --color-sick-subtle: oklch(0.96 0.03 345);
}
/* …the app's own non-kit rules (pull-to-search etc.) stay below… */
```

**WFO `brand.css`.** The values are copied verbatim from today's globals.css, so the token dump matches as text:

```css
/* Workforce Ops brand for @latro/ops-ui. Plain :root variables only - never @theme in this file. */
:root {
  --brand-sidebar: oklch(0.185 0.025 255);
  --brand-sidebar-fg: oklch(0.78 0.012 250);
  --brand-sidebar-fg-active: oklch(0.97 0.005 250);
  --brand-sidebar-hover: oklch(0.24 0.03 255);
  --brand-sidebar-active: oklch(0.29 0.055 253);
  --brand-sidebar-border: oklch(0.27 0.03 255);
  --brand-primary: oklch(0.45 0.12 250);
  --brand-primary-hover: oklch(0.39 0.115 250);
  --brand-primary-subtle: oklch(0.94 0.03 250);
  --brand-accent: oklch(0.64 0.13 60);
  --brand-surface: oklch(0.975 0.003 250);
  --brand-surface-raised: oklch(0.955 0.005 250);
  --brand-border: oklch(0.9 0.006 250);
  --brand-border-strong: oklch(0.8 0.01 250);
  --brand-ink: oklch(0.21 0.015 255);
  --brand-ink-secondary: oklch(0.42 0.02 255);
  --brand-ink-muted: oklch(0.52 0.02 255);
  --brand-success: oklch(0.48 0.11 155);
  --brand-success-subtle: oklch(0.955 0.04 155);
  --ops-toast-offset: 3.75rem;   /* clears the assistant bubble */
}
```

**FinaOps `brand.css`** (at the swap, F3):

```css
:root {
  --brand-sidebar: oklch(0.31 0.064 160);
  --brand-sidebar-fg: oklch(0.87 0.03 157);
  --brand-sidebar-fg-active: oklch(0.98 0.008 160);
  --brand-sidebar-hover: oklch(0.355 0.068 160);
  --brand-sidebar-active: oklch(0.4 0.074 160);
  --brand-sidebar-border: oklch(0.41 0.052 160);
  --brand-primary: oklch(0.47 0.083 178);
  --brand-primary-hover: oklch(0.41 0.075 178);
  --brand-primary-subtle: oklch(0.95 0.03 178);
  --brand-accent: oklch(0.77 0.13 86);
  --brand-surface: oklch(0.976 0.004 170);
  --brand-surface-raised: oklch(0.956 0.006 170);
  --brand-border: oklch(0.9 0.008 170);
  --brand-border-strong: oklch(0.8 0.012 170);
  --brand-ink: oklch(0.21 0.014 185);
  --brand-ink-secondary: oklch(0.42 0.018 185);
  --brand-ink-muted: oklch(0.52 0.018 185);
  --brand-success: oklch(0.49 0.12 145);
  --brand-success-subtle: oklch(0.955 0.045 145);
  --ops-toast-offset: 3.75rem;   /* removed in F7 - FinaOps has no assistant bubble */
}
```

Two things live in the app layout, not in these files:
- **Fonts.** Each app keeps loading Geist and Geist Mono through `next/font/google` as `--font-geist-sans` / `--font-geist-mono`. WFO adds `latin-ext` to its subsets in W8; FinaOps already has it.
- **`themeColor`.** It stays equal to the sidebar hex: WFO `#0b131e`, FinaOps `#083a25`.

### 8.5 Contract checks

These run in `checkVendor()`, the sync pre-flight and the library `tokens` test, using an OKLCH → sRGB conversion in the script.

1. `brand.css` holds only `:root { … }` rules and custom properties named `--brand-*` or `--ops-*`. It has no `@theme` and no other selector.
2. All 10 required variables are present.
3. The optional tint and tunable bounds of §8.3 hold.
4. Contrast (WCAG ratio) meets these minimums:

| Pair | Minimum | WFO today | FinaOps today |
|---|---|---|---|
| white on `primary` | 4.5 | 7.44 | 6.53 |
| `sidebar-fg` on `sidebar` | 4.5 | 9.32 | 8.74 |
| `ink` on `bg` | 4.5 | 17.71 | 17.65 |
| `ink-muted` on `surface` | 4.5 | 5.12 | 5.10 |
| `success` on `success-subtle` | 4.5 | 5.51 | 5.29 |
| `external` on `bg` (only when `--brand-external` is set) | 3.0 | (unset; the ochre accent is 3.49) | (unset at swap; F7 sets the ochre, 3.49, where the gold is 2.09) |

5. The fixed status pairs are checked once in the library test: warning/subtle 5.48, danger/subtle 5.99, admin/subtle 6.54, info/subtle 5.84 and white on danger 6.81.
6. **Theme gotcha:** no comment containing a double-quote character inside any `@theme` block of `tokens.css`, the app's globals.css or brand.css. The library test proves the scanner by planting one.

---

## 9. Components in 1.0.0 (35 files)

Legend:
- **Source** says which app's copy the library takes.
- **Same** means byte-identical in both apps today (28 of the 33 shared files).
- Every file's `@/` imports are replaced as in §7. That, plus `t.common.x` → `strings.x`, is the only change unless the row says otherwise.
- **S** = server-safe (no directive). **C** = `"use client"`.

| # | File | Kind | Source | Change beyond §7 | Used by (WFO / FinaOps) |
|---|---|---|---|---|---|
| 1 | action-icon.tsx | C | **FinaOps** (context default `true`, `ActionIconScope({ enabled = true })`, no `usePathname`) | — | 12 / 1 |
| 2 | attention-list.tsx | S | same | — | 11 / 10 |
| 3 | back-link.tsx | C | same | — | via PageHeader, Button |
| 4 | badge.tsx | S | same | — | 25 / 13 |
| 5 | button.tsx | C | same | — | 115 / 40 |
| 6 | callout.tsx | S | same | — | 26 / 13 |
| 7 | card.tsx | S | same | — | 49 / 19 |
| 8 | combobox.tsx | C | same | — | 16 / 6 |
| 9 | confirm-dialog.tsx | C | **FinaOps** (the unused `useDict()` in `ConfirmDialog` removed) | — | 17 / 11 |
| 10 | copy-value.tsx | C | same | — | 6 / 0 |
| 11 | date-input.tsx | C | same | — | 42 / 5 |
| 12 | description-list.tsx | S | same | — | 10 / 8 |
| 13 | dialog.tsx | C | same | label-matched discard guard kept until 2.0 | 62 / 12 |
| 14 | empty-state.tsx | S | same | — | 28 / 16 |
| 15 | field.tsx | C | same | — | 82 / 25 |
| 16 | form-actions.tsx | S | same | — | 9 / 2 |
| 17 | glance-card.tsx | S | same | English default kept until 2.0 | 2 / 0 |
| 18 | kicker.tsx | S | same | — | 2 / 0 |
| 19 | monogram.tsx | S | same | `external` tone reads `--color-external` (same pixels at 1.0) | 19 / 14 |
| 20 | month-nav.tsx | C | either (the files differ only in the `shiftMonth` import) | Intl month names kept until 2.0 | 5 / 4 |
| 21 | page-header.tsx | S | same | — | 37 / 27 |
| 22 | page-help.tsx | C | same | — | 4 / 1 |
| 23 | record-tab.tsx | C | same | `area` prop and `WriteScope` removed (the app binding adds them) | 11 / 0 |
| 24 | row-menu.tsx | C | same | — | 12 / 4 |
| 25 | search-input.tsx | C | same | — | 8 / 2 |
| 26 | segmented.tsx | S | **FinaOps** (`max-w-full overflow-x-auto`) | — | 6 / 8 |
| 27 | sheet.tsx | C | same | label-matched exit check kept until 2.0 | 3 / 1 |
| 28 | state-mark.tsx | S | same | — | 14 / 4 |
| 29 | status-icon.tsx | S | same | — | 12 / 7 |
| 30 | table.tsx | C | same | — | 35 / 20 |
| 31 | tabs.tsx | S | same | `aria-label="Tabs"` kept (optional string in 1.1) | 13 / 3 |
| 32 | tag.tsx | S | **FinaOps** (optional `title`) | — | 15 / 14 |
| 33 | toast.tsx | C | same | offset through `--ops-toast-offset` | 59 / 28 |
| 34 | search-form.tsx | S | **joins from FinaOps** | — | — / 4 |
| 35 | url-select.tsx | C | **joins from FinaOps** | — | — / 6 |

**Not in 1.0:**
- `validity-cell.tsx`: WFO-only, with WFO-specific wiring (`documentExpiryStatus`, a 30-day threshold, feature dictionary paths). It stays WFO-local in 1.0 and joins in 1.1 behind a parity test (§12.4).
- App-only files that stay app code (§2 non-goals).

**FinaOps' unused files.** FinaOps carries four kit files it does not use yet: record-tab, copy-value, glance-card and kicker. It still gets their wrappers, so every app has the same kit namespace.

**Library modules besides components:**
- `types.ts`, `version.ts`;
- `config/strings.ts`, `config/provider.tsx`, `config/read-only.tsx`;
- the seven `lib/` files;
- the three `navigation/` files;
- `stories/*` (35 story files + registry).

---

## 10. AppSwitcher (library 1.1.0)

It arrives in 1.1.0, not 1.0, so that 1.0 stays a pure extraction.

```ts
// src/lib/apps.ts
export type OpsAppId = "workforce" | "finaops" | "prefab";
export type OpsApp = { id: OpsAppId; name: string; href: string | null; color: string };
export const OPS_APPS: readonly OpsApp[] = [
  { id: "workforce", name: "Workforce Ops", href: "<production URL>", color: "#0b131e" },
  { id: "finaops",   name: "FinaOps",       href: null,               color: "#083a25" }, // hidden until deployed
  { id: "prefab",    name: "PrefabOps",     href: "<production URL>", color: "<Prefab sidebar hex>" },
];

// src/components/app-switcher.tsx ("use client")
export function AppSwitcher(p: {
  current: OpsAppId;
  mark: React.ReactNode;           // the app's own mark/wordmark, rendered inside the trigger
  apps?: readonly OpsApp[];        // default OPS_APPS (tests, gallery)
  className?: string;
}): React.JSX.Element;
```

**Behaviour:**
- **The trigger.** The mark is a `<button aria-haspopup="menu" aria-expanded>`. Its accessible name is `strings.appSwitcher.label`, default "Switch app", plus the current app's name.
- **The menu.** It is `role="menu"`, `position: fixed` at the trigger, and opens upward when there is no room below (the RowMenu idiom). `useDismissable` closes it on an outside press or Escape.
- **Keyboard:** ArrowDown/ArrowUp, Home/End, Tab closes, and Escape returns focus to the trigger.
- **Entries.** Each entry is `role="menuitem"`: a colour dot (the app's sidebar colour), the name, and a plain same-tab `<a href>`.
  - The current app shows the `check` StatusIcon with `aria-current="page"`, `strings.appSwitcher.current` as its title, and **no link**.
  - An app whose `href` is null is not listed.
- **No sharing.** No fetch, no cookie, no shared auth: each app still asks for its own login.
- **URLs.** They are read from the Vercel projects when 1.1.0 is prepared. A URL change is a minor: the DOM changes, no baseline pixel does.
- **Mounting,** each app in its own commit with an expected visual change (the mark becomes a button):
  - WFO: the sidebar mark (`components/shell/sidebar.tsx`) and the mobile top bar;
  - FinaOps: the sidebar mark;
  - PrefabOps: the logo at its shell step.
- **Strings.** Both strings are optional with English defaults. The apps add `common.appSwitcher.{label,current}` in en/sl/sr (WFO) and en/sl (FinaOps), and `pickKitStrings` passes them.

---

## 11. Tests and visual snapshots

### 11.1 Library (`pnpm test`: vitest, node, `renderToStaticMarkup`)

**Ported from WFO:**
- `toast.test.tsx`: the store; replace instead of stack; max 4; dismiss; success fades; errors stay; ErrorToast, DialogError and SheetError render nothing; Field marks instead of adding a line; toast actions.
- `file-link.test.tsx`.
- The `date-input` logic tests, the `nav-trail` domain tests, and the `search` fold tests for the three moved functions.

**New:**
- **`boundary`:** every import in `src/` is relative or one of react, react-dom, next/link, next/navigation, clsx, tailwind-merge, class-variance-authority. There are no `process.env` reads.
- **`client-directive`:**
  - every file that calls hooks, uses `createContext` or attaches handlers has `"use client"`;
  - the 17 server-safe component files have no directive and never import `config/provider` or `config/read-only`.
- **`read-only`:**
  - `<ReadOnlyScope readOnly><Button>` renders nothing;
  - `readOnlySafe` renders;
  - a nested `readOnly={false}` re-opens;
  - Field and DateInput come up disabled.
- **`strings`:** the `EN_STRINGS` keys equal the `OpsUiStrings` keys, and today's hard-coded fallbacks ("Close", "Open", "Tabs") equal the `EN_STRINGS` values.
- **`cn`:** `cn("text-white text-detail")` keeps both classes.
- **`text`:** đ, ß, diacritics, punctuation and word order ("Nguyen Dinh" finds "Nguyen, Dinh Hai").
- **`tokens`:**
  - the scanner finds a planted double-quote comment inside `@theme`;
  - `TOKENS.md` equals the `tokens.css` contract;
  - §8.5 contrast and bounds pass for every gallery brand.
- **`glyphs`:** a Badge needs an icon, and the icon names equal the `types.ts` unions.
- **`manifest`:**
  - every file under `src/` and `styles/` is shipped by `ship.json`;
  - every destination is on the allow-list;
  - `version.ts` equals `package.json`;
  - `api-surface.d.txt` is current.
- **`sync`:** runs the real `sync/sync-ops-ui.mjs` against temporary git repos (a fake library plus a fake app). It covers:
  - first pin;
  - an idempotent re-run (no diff);
  - a refused local edit and `--discard-local-edits`;
  - an unknown file;
  - a collision;
  - a downgrade;
  - "release moved";
  - disagreeing markers;
  - a missing required brand variable;
  - an extension-name clash;
  - `--ref` giving `dev`, which `checkVendor` fails;
  - `--dry-run` writing nothing;
  - self-update last;
  - `--write-wrappers` never overwriting.

### 11.2 Gallery snapshots (`pnpm shots`, `pnpm shots:accept`)

- **Stories.** Each `src/stories/<component>.stories.tsx` exports `stories: { name: string; render: () => React.ReactNode; open?: string }[]`. Every variant and state is covered, including:
  - the Button matrix, and the same matrix inside a read-only scope;
  - an open Dialog, Sheet, DateInput calendar, Combobox list, RowMenu and MonthNav picker;
  - the toast stack;
  - from 1.1, the AppSwitcher.
  
  `open` is a selector that Playwright clicks before the shot.
- **Pages.** `gallery/app/[brand]/layout.tsx` sets `<html data-brand={brand}>` and imports the three brand fixture files. `/[brand]/[story]` renders one story.
- **Brands:**
  - `workforce` and `finaops`: copies of the apps' `brand.css` made by `tools/pull-brands.mjs`, which reads `git show HEAD:src/app/brand.css` and rewrites `:root` to `html[data-brand=x]`;
  - `prefab`: a neutral placeholder until Saša picks the palette.
- **Matrix:** every story × 3 brands × {1440, 375}.
- **Determinism:**
  - `reducedMotion: "reduce"`, a fixed clock (`page.clock`), and the caret hidden;
  - Geist from the `geist` package;
  - the Playwright Chromium version pinned in `gallery/playwright.config.ts`;
  - `toHaveScreenshot` with `maxDiffPixels: 0` and a per-pixel `threshold: 0.1`.
- **Baselines** live in `gallery/__screenshots__/`, and only `pnpm shots:accept` writes them. That commit is then either part of a major, or a pure `shots: rebaseline (…)` commit (§4.1).

### 11.3 App tests (app-owned; `tests/ops-ui/`, PrefabOps `src/components/ui/*.test.ts`)

**`vendor.test.ts`:**
- `checkVendor(appRoot).ok`, and not `dev`.
- `git check-ignore -q src/vendor/ops-ui` fails (the folder is not ignored).
- **Boundary:** every file importing `@/vendor/ops-ui` matches `config.bindings`.
- **Wrapper completeness and parity:**
  - every vendored component module has a wrapper;
  - for pure wrappers (not binding, not `local`, no `KIT-OVERRIDE`), the runtime export names equal the vendored module's (via `Object.keys(await import(…))`).
- Every `KIT-OVERRIDE until ops-ui X.Y` marker has X.Y > the locked version.

**`bridge.test.tsx`:**
- **Default-deny smoke:** `renderToStaticMarkup(<PermissionsProvider areas={[]}><WriteScope area={A}><Button>x</Button></WriteScope></PermissionsProvider>)` with `Button` imported from `@/components/ui/button` is `""`. With `areas={[A]}` it renders the button. A nested granted `WriteScope` re-opens.
- **Strings and localisation probe.** For every app locale (WFO en/sl/sr, FinaOps en/sl), a probe component inside that locale's `I18nProvider` renders `JSON.stringify(useOpsUi().strings)`, which must equal `pickKitStrings(dict.common)`. It also renders `useOpsUi().localize(<a refusal sentence present in validation.messages>)`, which must equal the translated sentence. This is the exact path Field errors and `useErrorToast` take.
- **`cn`:** the app's `@/lib/utils` `cn` is the vendored function (reference equality).

**Tests that stay app-owned:**
- WFO keeps `tests/ui/date-input.test.ts` (no native date inputs in `src`), `status-doctrine`, `status-language`, `country-combobox`, `employer-picker`, and `action-icon-scope` (retargeted to `lib/action-icon-routes.ts`).
- `toast.test.tsx` and `file-link.test.tsx` move to the library.

### 11.4 Per-app visual check (`tools/app-shots.mjs`, run from the library checkout)

```
cd /home/user/ops-ui
node tools/app-shots.mjs capture --app ../fina-ops --label main     # on the app's main, dev server running
node tools/app-shots.mjs capture --app ../fina-ops --label branch   # on the branch
node tools/app-shots.mjs compare --app ../fina-ops main branch [--expect <file listing pages allowed to differ>]
```

**`capture`:**
- Reads `visual` from the app's `ops-ui.config.json` and logs in with the env-provided fixture credentials (local database only). The `readonlyRoutes` are captured as the read-only user.
- Takes a full-page PNG per route × width, plus 375 with `hasTouch`/`isMobile` for the coarse-pointer rules.
- Masks the `mask` selectors, sets reduced motion and hides the caret.
- Writes to `$TMPDIR/ops-ui-shots/<app>/<label>/`.

**The token dump** is written beside the PNGs as `tokens.json`, once per width. For each name in the contract, plus `config.extensions`, plus every `--color-*`, `--text-*`, `--radius-*`, `--font-*` and `--ops-*` declared in `document.styleSheets`:
- **Colour tokens** are read through a probe element (`color: var(--x)`, then the computed `color`). So a serialization difference is not a false alarm, while a real value difference is.
- **Other tokens** are read as the trimmed `getComputedStyle(documentElement)` value.

**`compare`:**
- Counts changed pixels per page with pixelmatch (per-pixel threshold 0.1) and writes red-overlay diff PNGs.
- Diffs `tokens.json` exactly.
- Exits 1 on any difference outside `--expect`.

The route list always includes `/dev/kit`. It renders every vendored story with the app's real bridge, providers and brand, so a Tailwind class missing from the app's CSS shows up as a pixel diff.

---

## 12. Migration

### 12.0 Rules for every step

- **Branches and merges.**
  - One app per merge, and a branch per step.
  - WFO merges with `--no-ff` into `main`, which deploys to production.
  - FinaOps follows its CLAUDE.md.
- **Commit identity:** `Saša Vinčić <77722684+sasavincic@users.noreply.github.com>`, plus the session's Co-Authored-By trailer.
- **Kit freeze.** From L1 until each app's swap merges, `src/components/ui/**` is frozen. A one-line note in both CLAUDE.md files (F0/W0) says so. A kit fix that cannot wait goes into the library *and* the app in the same change, and the swap PR names it.
- **Parallel sessions.** Other sessions edit these repos. The wrappers keep every import site, and the swap branches live hours, not days. Before merging, rebase and re-run G1–G3.
- **Gates:**
  - **G1 code:** `pnpm typecheck && pnpm test && pnpm lint <changed files>` and `pnpm build`. WFO adds `RUN_DATABASE_TESTS=1 pnpm test` on local Postgres at the swap step. PrefabOps runs `npx tsc --noEmit && npm test` and `npm run build` in `apps/web`.
  - **G2 pixels:** `app-shots` main vs branch, with 0 changed pixels on every route at 1440, 375 and 375-touch, including the read-only routes. Only the pages a step lists as **Expected** may differ, and only in the way it says.
  - **G3 tokens:** `tokens.json` identical.
  - **G4 by hand** (browser, 1440 and 375):
    1. A Dialog: type into a field, then Cancel. The discard prompt appears. Then ✕.
    2. Raise an error toast (it stays) and a success toast (it fades after 6 s).
    3. DateInput:
       - typed `23111989` → 23-11-1989;
       - `31.02.1990` reverts;
       - the calendar goes year → month → day;
       - keyboard walk;
       - Today/Clear.
    4. Combobox: a two-word query in reverse order, arrows, then Enter picks without submitting the form.
    5. A RowMenu on the last table row opens upward.
    6. MonthNav: the picker, and prev/next.
    7. Segmented at 375.
    8. A Sheet exit check.
    9. The read-only user sees no Buttons in scoped areas.
  - **G5 production** (WFO; FinaOps once it has a Vercel project):
    - the Vercel production deployment of the merge commit is READY (Vercel connector or REST `readyState`);
    - on production: sign in, open one dialog, raise one toast.
- **Rollback** is a revert of the merge commit. There is no data involved.

### 12.1 Library 1.0.0 (L1–L7)

- **L1 Repository.**
  - `git init /home/user/ops-ui`, with package.json, tsconfig, eslint, vitest and the gallery app (§3.1).
  - Saša creates the private GitHub repo `sasavincic/ops-ui`, or a session does it with his approval through the GitHub connector.
  - Other sessions attach it with `add_repo`.
- **L2 Import.**
  - Copy FinaOps' 35 kit files as they are at its `main`.
  - From WFO, copy: the three search functions (`domain/search.ts`), `domain/nav-trail.ts`, `lib/navigation-history.ts`, `components/shell/nav-trail.tsx`, `domain/date-input.ts`, `formatDate`/`shiftDay`, `cn` from `lib/utils.ts`, `lib/use-dismissable.ts` and `fmt`.
  - From FinaOps, copy `shiftMonth` (`domain/months.ts`).
  - The import commit names the two source commits.
- **L3 Decouple.** Apply §7, one commit per row, so the review is mechanical.
- **L4 Styles, strings and types.** Write §8.1–8.2 and `config/strings.ts` (`EN_STRINGS` = WFO en `common`), and `types.ts`.
- **L5 Tests, stories and baselines.** Build §11.1–11.2, and accept the baselines for 35 components × 3 brands × 2 widths.
- **L6 Extraction proof.** Run `node tools/diff-against-app.mjs --app ../fina-ops` and `--app ../workforce-ops`.
  - For each component, it prints the diff against the app copy. It ignores import lines and the mechanical substitutions (`useDict()` → `useOpsUi()`, `t.common.x` → `strings.x`, `localizeMessage(t, s)` → `localize(s)`).
  - Against FinaOps, the diff must show only the changes named in the §9 "Change" column.
  - Against WFO, it may additionally show the FinaOps-side changes (rows 1, 9, 26, 32).
- **L7** `pnpm release 1.0.0`.

**Gate:**
- library `pnpm typecheck && pnpm lint && pnpm test && pnpm shots` green;
- the L6 output attached to the release commit's PR/notes.

### 12.2 FinaOps first (F0–F7)

FinaOps goes first because its kit *is* the 1.0 source and it has no production deployment.

- **F0 Prepare.**
  - Add the kit-freeze note to CLAUDE.md (docs commit).
  - Set up the local fixtures: `pnpm db:fixtures`, with `WFO_API_URL`/`PREFAB_API_URL` commented out so no sync replaces them.
  - Run `app-shots capture --label main` on `main`.
- **F1 Align `--color-info`.** Change it from 245 to 240 (and `-subtle`) in globals.css.
  - **Expected:** info-toned Callouts, Badges and toasts shift 5° in hue. Nothing else changes.
  - Gates: G1, G2 (expected). Merge.
- **F2 Vendor only.**
  - Add `.gitattributes`, `ops-ui.config.json` and the ESLint ignore for `src/vendor/**`.
  - Copy `scripts/sync-ops-ui.mjs` from the library once by hand, then run `node scripts/sync-ops-ui.mjs --version 1.0.0`.
  - Add `@source "../vendor/ops-ui";` to globals.css.
  - Nothing imports the vendor folder yet.
  - Gates: G1, G2 zero.
- **F3 Tokens.**
  - globals.css gets the §8.4 imports.
  - Add `brand.css` with the §8.4 FinaOps values.
  - Delete FinaOps' own `@theme` block (it has no extensions), its `@keyframes toast-in`, and its body/cursor/selection/motion/print/touch rules, which now come from `kit.css`, `base.css` and `app-feel.css`.
  - Gates: G1, G2 zero, G3 identical.
- **F4 Bridge and read-only.**
  - Wrap `I18nProvider` as in §6.3, and add `kit-contract.ts`.
  - Rewrite `permissions-provider.tsx` as in §6.3. The local kit files are still in place, and their `useReadOnlyScope` import now resolves to the library's context.
  - Add `tests/ops-ui/bridge.test.tsx`.
  - Gates: G1, G2 zero.
- **F5 Swap.**
  1. Delete the 35 local kit files and run `--write-wrappers` (it creates 35 wrappers). Hand-write the `record-tab` binding.
  2. Turn the §7 app modules into re-exports: `lib/utils` (`cn`), `lib/use-dismissable`, `lib/navigation-history`, `shell/nav-trail`, `domain/nav-trail`, `domain/dates` (two functions), `domain/date-input`, `domain/months` (`shiftMonth`) and `i18n/locales` (`fmt`).
  3. Point the domain type imports (`status-meta`, `search`) at `@/vendor/ops-ui/types`.
  4. `tests/ops-ui/text-parity.test.ts` compares `domain/names.foldText` with `normalizeSearchText` over a corpus: đ/Đ, ß, č/š/ž/ć, diacritics, punctuation, `QT-…` numbers, "d.o.o.", "GmbH" and mixed case.
     - If they match, `domain/search` re-exports `matchesAllWords`.
     - If a case differs, it is written into the commit message as "FinaOps pickers now match like Workforce Ops' pickers: <cases>", and it is accepted **only if no case makes a picker miss a row it finds today**. A narrowing stops the step for a decision.
  5. Add `tests/ops-ui/vendor.test.ts`.
  6. Add the `/dev/kit` route.
  - Gates: G1, G2 zero, G3 identical, G4 complete (fixtures provide the owner, editor and read-only users). Merge.
- **F6 Docs** (can ride with F5).
  - CLAUDE.md: replace the kit freeze with the standing rule: "`src/vendor/ops-ui` is GENERATED from @latro/ops-ui by `scripts/sync-ops-ui.mjs`; never edit it (`pnpm test` fails). `src/components/ui/*` are this app's kit names: re-exports plus the `record-tab` binding. A kit change = ops-ui PR → release → sync on a branch → G1–G4 → merge. Brand colours live in `src/app/brand.css`."
  - DESIGN.md keeps FinaOps' palette, mark and app sections, and points to `src/vendor/ops-ui/DESIGN.md` for the doctrine.
- **F7 Follow-ups.** Each is its own commit, with G2 limited to the Expected change.
  - (a) Delete `--ops-toast-offset`. **Expected:** toasts sit 3.75rem lower.
  - (b) Add `--brand-external: oklch(0.64 0.13 60)`. **Expected:** "not ours" Monogram chips change from gold (2.09:1) to the suite ochre (3.49:1).

### 12.3 Workforce Ops second (W0–W8), after F5 is merged

- **W0 Prepare.**
  - Add the kit-freeze note to CLAUDE.md.
  - Run `scripts/dev-fixtures.ts` on the local database (it refuses `neon.tech` URLs), and make sure a read-only office user exists.
  - Run `app-shots capture --label main`.
- **W1 Align the local kit with the 1.0 source.**
  - Take FinaOps' `segmented.tsx` (overflow), `tag.tsx` (`title`) and `confirm-dialog.tsx` (dead variable).
  - **Expected:** a Segmented that is wider than its row at 375 now scrolls inside itself. Check `/operations` (horizon, Board/Grid, group-by) and the flightboard group-by. Everything else is zero.
  - Gates: G1, G2 (expected), G4 segmented. Merge.
- **W2 Action-icon API.**
  - `action-icon.tsx` becomes FinaOps' version.
  - `hasActionIcons` moves to `src/lib/action-icon-routes.ts`.
  - Add `src/components/shell/action-icon-route-scope.tsx`:
    ```tsx
    "use client";
    export function RouteActionIconScope({ children }) {
      return <ActionIconScope enabled={hasActionIcons(usePathname())}>{children}</ActionIconScope>;
    }
    ```
    It replaces `<ActionIconScope>` in `(app)/layout.tsx`.
  - The root `layout.tsx` wraps its children and `<Toaster />` in `<ActionIconScope enabled={false}>`. The new default is on, while WFO's `/hours`, `/whiteboard`, `(auth)` and root toasts must stay icon-less.
  - Retarget `tests/ui/action-icon-scope.test.ts`.
  - **Expected:** zero changes. Icons appear on exactly the same routes; spot-check `/settings`, `/compliance`, `/hours`, `/whiteboard` and `/login`.
  - Gates: G1, G2 zero. Merge.
- **W3 Vendor only**, as F2, with `extensions` and `local` set as in §3.3. Gates: G1, G2 zero.
- **W4 Tokens**, as F3, with the §8.4 WFO `brand.css`. globals.css keeps its extension `@theme` (`tool`, `sick`, `sick-subtle`) and the gotcha comment. Gates: G1, G2 zero, G3 identical.
- **W5 Bridge and read-only**, as F4.
  - WFO keeps `GrantsContext`, `adminTools` and `useAdminTools`.
  - Because the bridge sits inside `I18nProvider`, it covers `(app)`, the whiteboard page, wall pairing and `(auth)/password`.
  - Gates: G1, G2 zero.
- **W6 Swap**, as F5, with these differences:
  - Only the 33 shared kit files are deleted before `--write-wrappers` (which creates 35 wrappers, including `search-form` and `url-select`). `validity-cell.tsx` stays (`config.local`).
  - `domain/hours-periods` re-exports `shiftMonth`, and `domain/compliance`'s type import moves to vendor types.
  - `tests/ui/toast.test.tsx` and `tests/ui/file-link.test.tsx` are deleted, because the library owns them now.
  - No text-parity test: WFO is the source of `lib/text`.
  - Gates: G1 including `RUN_DATABASE_TESTS=1`, G2 zero, G3 identical, G4 complete. Then merge `--no-ff`, push, and G5.
- **W7 Docs.**
  - CLAUDE.md gets the standing rule of F6, with the bindings `record-tab` and `RouteActionIconScope`.
  - DESIGN.md's stale Components section (it lists 10 of 34 files) becomes a pointer to the vendored doctrine. Brand, mark, registers and the app sections stay.
- **W8 Font subsets.** Add `latin-ext` to the Geist subsets. This changes preloading only: č, š, ž, đ and ć stop arriving late. **Expected:** zero pixel changes. Gates: G1, G2, G5.

### 12.4 After both apps are on 1.0

**1.1.0 (minor), released after W6:**
- `AppSwitcher` + `lib/apps.ts` (§10).
- `ValidityCell` / `ValidityNote` + `lib/validity.ts`:
  - `validityState(date, today, { noExpiry?, warnDays = 30 })` → `"valid" | "due" | "expired" | "unknown" | "no_expiry"`;
  - `daysBetween`;
  - optional `strings.validity`.
- Optional `strings.tabs` for the Tabs `aria-label` (default "Tabs").
- `data-ops-dismiss` / `data-ops-commit` attributes on the DialogFooter, SheetFooter and ConfirmDialog buttons. They are attributes only, in preparation for 2.0.

**App adoption of 1.1:**
1. Sync and run `--write-wrappers`.
2. Mount the AppSwitcher in its own commit (expected change: the mark becomes a button).
3. WFO only:
   - A parity test shows `validityState(d, today, { warnDays: EXPIRY_WARNING_DAYS })` ≡ `documentExpiryStatus` over −400…+400 days, `null` and `noExpiry`.
   - Only then does `validity-cell.tsx` become a binding that passes WFO's strings through `pickKitStrings` (from `t.workers.compliance.expiredAgo/expiresIn`, `t.compliance.desk.unknown`, `t.statuses.expiry.no_expiry`) and `warnDays`.
   - It leaves `config.local`.
   - G2 zero on the compliance tabs, document tables and fleet.

**2.0.0 (major, the planned batch of visible fixes):**
- MonthNav takes month names from `strings.datePicker.months` / `monthsShort`. **Visible:** Serbian month names switch from Cyrillic to Latin, and the Intl hydration risk goes away. `locale` leaves `OpsUiConfig`.
- GlanceCard's default label becomes `strings.open`, and the toast and field "Close" fallbacks become `strings.close`.
- The Dialog and Sheet discard guards match only the `data-ops-*` markers and ask through the kit `ConfirmDialog` instead of `window.confirm`.

**Found while building 1.0 (L5), not in 1.0** (1.0 renders and behaves exactly like the apps today):
- **DateInput keyboard entry under reduced motion.** `base.css`'s `prefers-reduced-motion` rule gives every element `transition-duration: 0.01ms` while `transition-property` stays at its default `all`, so the calendar panel's `visibility: hidden → visible` is itself a transition: when the kit focuses the day, the panel is still hidden and the first ↓ (or the ▾ button) leaves focus in the field. Both apps behave this way today for anyone with reduced motion on. The gallery's keyboard-walk test runs with motion on (`gallery/tests/behaviour.spec.ts`). Candidate fix: focus the day once the panel is visible (a frame later), or scope the reduced-motion rule to elements that declare a transition. It changes CSS or timing, so it waits for the next planned release that may change them.

**Found while proving 1.0 (L6), not in 1.0: Workforce Ops moved its kit after the survey. DECISION OPEN; it blocks L7 and W6.** On 2026-09-30, after the survey and before any kit-freeze note (F0/W0 have not run), four Workforce Ops commits changed three files §9 lists as **Same**. 1.0.0 is FinaOps' copy (the pure-extraction rule), so it carries none of them. `tools/diff-against-app.mjs` proves the rest of the extraction against both apps and names these three files as "Workforce Ops ahead" (`WFO_AHEAD`, with their line counts); it exits 1 until this entry records a decision. The output is in `docs/extraction-proof-1.0.0.md`.
- `button.tsx` (ce53be0): `ExternalButtonLink`, a button-styled plain `<a>` for `tel:`/`sms:`/`mailto:`/WhatsApp/Viber links (a Next Link would try to route them); read-only-safe. Additive: FinaOps' pixels are untouched by it. Used by WFO `components/recruiting/candidate-sheet.tsx`.
- `date-input.tsx` (f364bd5, ae37fb7, ff90dde): the calendar stays whole on screen on phones (new `lib/floating-place.ts` `floatingTop`, with `maxHeight` + scroll; WFO test `tests/lib/floating-place.test.ts`), and on coarse pointers it opens as a bottom sheet: its own modal `<dialog>` in the top layer, full width, finger-sized Today/Clear, rising in via the new `lib/sheet-motion.ts` `riseSheet` (Saša on his iPhone: "the clear click doesn't register").
- `dialog.tsx` (ff90dde): below `sm` every Dialog is a bottom sheet (docked, full width, rounded top corners, safe-area padding, `riseSheet`); from `sm` the centred card as before. WFO's DESIGN.md gained the rule.

Consequence: Workforce Ops cannot take 1.0.0 as written. At W6 the `button` wrapper would lack `ExternalButtonLink` (the build breaks), and G2 would show every phone Dialog and the touch calendar going back to the centred/floating versions (non-zero at 375 and 375-touch). It is not an extraction bug: the library matches its source.

Options (for Saša; recommendation first):
1. **Align FinaOps, then re-import before L7 (recommended).** A FinaOps commit before F2, in the F1 idiom, takes the four changes (`button.tsx`, `date-input.tsx`, `dialog.tsx`, `lib/floating-place.ts`, `lib/sheet-motion.ts`). **Expected:** Dialogs become bottom sheets at 375, the calendar opens as a sheet on touch and stays on screen; desktop unchanged. The library then re-imports the three files at FinaOps' new `main`, adds `lib/floating-place.ts` and `lib/sheet-motion.ts` (and ports the floating-place test), adds an `ExternalButtonLink` story, re-accepts the 375 baselines that change (Dialog, ConfirmDialog, DateInput open, and any story that opens a Dialog) and re-runs L6, with `WFO_AHEAD` emptied. The library is still 0.0.0, so this costs no semver level, and 1.0.0 equals both kits again (spec goal 4).
2. **Release 1.0.0 as it is and carry them later.** `ExternalButtonLink` is additive (a 1.1.0 minor), but the bottom sheets change existing 375 baselines, so they need a major (2.0.0). Both would have to ship before W6, which reverses §0's order (1.1 after W6), or W6 takes `KIT-OVERRIDE` wrappers for `button`, `dialog` and `date-input` until they ship.
3. Revert them in Workforce Ops (a W1-style align to the 1.0 source). It undoes phone fixes Saša asked for on 2026-09-30, so it is not recommended.

Whatever is decided, the kit-freeze notes (F0/W0) should land in both apps' CLAUDE.md now, so the gap stops growing.

**Upgrade steps for 2.0:**
- Remove `locale` from the bridge.
- `rg -n 't\.common\.cancel' src` finds hand-built Cancel buttons inside a Dialog or Sheet. Add `data-ops-dismiss` to each.
- **Expected G2 change:** month names in sr (and sl casing, per the dictionary). G4 re-checks the discard guard.

---

## 13. PrefabOps adoption

### 13.1 Preconditions (all must hold before P1)

1. WFO in production and FinaOps on `main` are both on ops-ui ≥ 1.1.0, with no open regression against the library.
2. **P0 is merged:** the Next 16.2 / React 19.2 upgrade, alone, per `prefab-next16.md` (middleware → proxy, Turbopack and Lightning CSS, runtime floors). It must be green and deployed. It needs no downtime. The kit's `Link onNavigate` and the peer range require it.
3. **Vitest `@` alias.** Add `resolve.alias { "@": ./src }` to `apps/web/vitest.config.ts` as its own small commit. The tsconfig already maps `@/*` → `src/*`, but vitest does not.
4. **Harness baselines.** The page harness (`scratchpad/page-harness`: real components and fixtures in headless Chromium) captures all 21 routes at 1440, 375 and 375-touch, in light and dark.
5. **Palette.** Saša chooses Prefab's palette (sidebar ×6, primary ×3, accent) before the P4 shell step. This is the only design input still missing.
6. **Library minors** are released before the area that needs them (P4 table).
7. **One cause per regression.** No Prefab Phase 0 security change touching the same files (`proxy.ts`, `app-providers.tsx`, `layout.tsx`) is in flight at the same time.

### 13.2 Steps

**P1 Rename the legacy tokens.** Harness diff 0.
- Every `--color-*`, `--radius-*` and `--shadow-*` becomes `--legacy-color-*` / `--legacy-radius-*` / `--legacy-shadow-*`. These collide with kit and Tailwind names: `--color-accent`, `-bg`, `-surface`, `-border`, `-border-strong`, `-success`, `-warning` and `-danger` exist in both with different meanings, and Tailwind's `rounded-*`/`shadow-*` would silently take Prefab's values.
- `--space-*`, `--ease` and `--duration` become `--legacy-…` too, because they sit next to Tailwind namespaces.
- **Scope:** 17 stylesheets, 33 inline `style={{}}`, the pre-hydration theme script in `layout.tsx`, and the tests. CLAUDE.md's `--color-fill` mention is updated in the same commit.
- **Gates:**
  - `rg` finds no `--color-`, `--radius-` or `--shadow-` outside `--legacy-` in `apps/web/src`;
  - harness diff 0 on all routes, light and dark, 1440/375;
  - `npx tsc --noEmit && npm test`.

**P2 Add Tailwind and the vendored kit, without the reset.** Harness diff 0.
- **Dependencies:** `tailwindcss`, `@tailwindcss/postcss`, `class-variance-authority`, `clsx`, `tailwind-merge` (WFO's versions), plus a `postcss.config.mjs`.
- **Config:** `ops-ui.config.json` (`vendorDir` `src/vendor/ops-ui`, `source` `../../../ops-ui`). Run the sync and `--write-wrappers`, and add the Prefab vendor test.
- **One CSS entry.** `layout.tsx` imports one file, `src/app/app.css`, instead of the 17 files (legacy order preserved):

```css
@layer legacy, theme, base, components, utilities;
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/utilities.css" layer(utilities) source(none);
@import "../vendor/ops-ui/styles/tokens.css";
@import "../vendor/ops-ui/styles/kit.css";
@import "../vendor/ops-ui/styles/preflight-scoped.css" layer(base);  /* library minor: preflight under :where(.ops-ui-root) */
@import "./ops-ui-root.css" layer(base);                            /* Prefab-owned: neutralises legacy element rules inside .ops-ui-root */
@import "./brand.css";
@import "./globals.css" layer(legacy);
@import "./styles/financials.css" layer(legacy);
/* …the other 15 sheets, in today's order, all layer(legacy) */
@source "../vendor/ops-ui";
/* + one @source line per migrated file or folder, added area by area (P4) */
```

- **Why the layers are in this order:**
  - `legacy` is the lowest layer, so kit utilities always win. Prefab's element resets (`button { background: none }`, `p { color }`) can no longer unstyle kit components.
  - `base` sits above `legacy`, so inside `.ops-ui-root` the scoped reset beats the legacy element rules.
  - `ops-ui-root.css` sets each property that Prefab's §1 reset and §3 typography set on bare elements back to its preflight value inside `.ops-ui-root`. It is generated once by listing every element-only selector in the legacy sheets.
- **`source(none)` plus explicit `@source`.** This keeps Tailwind from generating utilities for Prefab words that happen to be utility names.
  - Verify in P2 that the build reports scanning only the vendor folder. If `source(none)` is not honoured on the split import, the collision gate below is the backstop.
- **Collision gate** (script, at P2 and every P4 merge): the class selectors in the generated utilities ∩ (the ~1,000 legacy class names ∪ the class names used in unmigrated TSX) = ∅.
- **Gates:** harness diff 0 everywhere, build, tests.

**P3 Providers and notifications.** Expected: the toasts' look and placement only.
- `AppProviders` mounts `<OpsUiProvider>` with defaults (English only) and wraps archived-project content in `<ReadOnlyScope readOnly>`, where today's archived lock applies.
- The root layout renders `<div className="ops-ui-root contents"><Toaster /></div>`.
- **`useNotify()` is re-implemented over `pushToast`,** so its 263 calls in 41 files stay untouched:
  - `error` → `danger`, which stays until dismissed. The adapter keeps Prefab's clear-on-route-change by dismissing the ids it raised.
  - `success` → `success`, which fades after 6 s.
  - `info` → `info`, which now stays until dismissed. This is an accepted change for 3 calls.
- On phones (≤768px), `--ops-toast-offset: calc(var(--tab-bar-h, 64px) + var(--safe-bottom))`. While a Dialog is open, toasts draw inside it (the kit host rule), which replaces Prefab's "move to top while a sheet is open".
- `FloatingPromptBridge` is deleted; only a test uses it.
- **Gates:** notify tests updated; harness diff limited to toasts.

**P4 Migrate area by area,** in the suite-spec order:
1. shell and navigation;
2. lists;
3. forms and modals;
4. projects;
5. welding, WPQR and WPS;
6. the documentation pipeline;
7. calculations;
8. the workshop portal, last.

Per area:
- Wrap the area in `.ops-ui-root`, and add its files to `@source`.
- Swap to the kit through `@/components/ui/*`.
- Replace `window.confirm` (26 calls in 16 files) with `ConfirmDialog` / `InlineConfirm`.
- Replace hand-rolled modals (16 files) with `Dialog` / `Sheet`. `useBodyScrollLock` and `useDialogFocus` go with the last of them.
- Replace `DateField` (16 uses) with `DateInput`, shown as DD-MM-YYYY.
- Replace Prefab icons with `ActionIcon` / `StatusIcon`.
- Run the collision gate.
- Delete the area's stylesheet once the dead-class scan shows nothing uses it.
- Take harness shots at 1440, 375 and 375-touch. The PR lists the intended changes.

**The shell step also:**
- imports `base.css` and `app-feel.css`;
- adds `brand.css` with Saša's palette;
- mounts the `AppSwitcher` in the logo;
- removes dark mode (§13.3);
- rewrites Prefab's CLAUDE.md house rules in the same merge:
  - class vocabulary → the kit;
  - breakpoints → Tailwind's 640/768/1024/1280;
  - the notifications rule unchanged, since it now runs over the kit toast.

**Library minors released before the area that needs them** (each opt-in, 0 pixel change in WFO and FinaOps):

| Minor | Needed by |
|---|---|
| `styles/preflight-scoped.css` | P2 |
| Dialog phone bottom-sheet presentation (`presentation="sheet"`: full width, rounded top, sticky safe-area footer) | forms + modals |
| ActionIcon glyphs `sparkle` (AI actions) and `mail` | projects / documentation (pre-offer RFI composer) |
| `YearInput` (year-grid picker) | documentation (manufacture year) |
| `size="lg"` (48px, 16px text) for Button/Field; opt-in 44px coarse-pointer floor under `[data-ops-touch]` | workshop portal |

**P5 Finish.**
- Import the global reset (`tailwindcss/preflight.css` into `layer(base)`).
- Remove `preflight-scoped.css`, `ops-ui-root.css` and the `legacy` layer once it is empty.
- Drop `source(none)` for automatic scanning.
- Prefab's vendor test runs in full.

### 13.3 Dark mode

**Decision: dropped at the shell step.**
- The sister apps are light-only by design.
- A half-dark app during a months-long migration would be worse than none.
- The kit's literal `text-white` / `bg-ink/40` would need an audit.

The More page's Appearance control, the theme script and `localStorage prefabops-theme` go in the shell merge.

The alternative stays open. If Saša asks later, a library minor `styles/dark.css` (token redefinitions under `html[data-theme=dark]`, three more snapshot themes, the audit) is about two days of work.

---

## 14. Risks and mitigations

| # | Risk | Mitigation |
|---|---|---|
| 1 | Parallel sessions edit the kit or the same files during a switch | Wrappers keep every import site. Kit freeze note in CLAUDE.md. Hours-long branches, rebase and re-run G1–G3 before merge. |
| 2 | Someone hand-edits `src/vendor/ops-ui` | The lock hash fails `pnpm test` (house rule: never commit red). The sync refuses to overwrite. CLAUDE.md states the rule. The generated header on every file. |
| 3 | A second read-only context appears, and buttons silently stop hiding | The library owns the only context. The app's own context is deleted. Default-deny smoke test in every app. |
| 4 | Two tailwind-merge configs, bringing back the old bug where `text-detail` removed `text-white` | One `cn` in the library. App `lib/utils` re-exports it (reference-equality test). Boundary test. |
| 5 | Vendor folder not scanned by Tailwind, or gitignored: classes silently vanish | Explicit `@source`. `git check-ignore` test. `/dev/kit` in every G2 run. |
| 6 | The `@theme` double-quote gotcha | Brand files never contain `@theme`. Quote-free generated headers. Scanner in the library tests, the sync pre-flight and `checkVendor`, proved by a planted quote. |
| 7 | Brand variables set on a subtree | `:root`-only rule checked by the contract. The gallery sets `data-brand` on `<html>`. |
| 8 | A release is spoofed, moved or ambiguous | Exactly one `release: vX` commit on `main`. The `release/vX` branch must agree. The lock pins the commit, and "release moved" is refused. |
| 9 | The proxy refuses the `release/vX` push | The commit marker alone is enough. Tags are never used. |
| 10 | Screenshot flakiness | Same container. Pinned Chromium. Reduced motion, fixed clock, local fonts. Probe-normalised token dump. Pure rebaseline commits are exempt from the semver rule. |
| 11 | A release is classified at the wrong semver level | Mechanical checks: baselines, api-surface, required brand variables. CHANGELOG `Visible:` and `Upgrade steps:` required for majors. `--compatible` is explicit and recorded. |
| 12 | Friction: every kit fix needs a release | A patch release plus a sync takes minutes. `KIT-OVERRIDE` with an expiry version for emergencies. |
| 13 | A session lacks the ops-ui repo | Exit 2 with the `add_repo` hint. The vendored copy, its DESIGN.md and its CHANGELOG stay readable in the app. |
| 14 | FinaOps' matcher differs from the library's | Parity test before the re-export. A narrowing stops the step. |
| 15 | WFO action-icon default flips from off to on | Root `enabled={false}` plus the route scope, before the swap (W2). Spot check of the icon-less routes. |
| 16 | App-specific leaks (toast offset, external tone, hues) | Each app keeps today's values at the swap. Changes come only as listed follow-ups. |
| 17 | Apps run different library versions | Intended. Each upgrades deliberately. Switcher URL and doctrine lag are briefly acceptable. |
| 18 | An app upgrades a peer (Next, React, Tailwind) past the library's range | The sync peer check refuses. The library widens its range in a release after its own tests pass. |
| 19 | PrefabOps: token name collisions | P1 rename, gated by grep and a harness diff of 0. |
| 20 | PrefabOps: cascade (unlayered resets beating kit utilities) | P2 `@layer legacy, theme, base, components, utilities`, and the scoped reset plus `ops-ui-root.css` inside migrated areas. |
| 21 | PrefabOps: Tailwind generates utilities that match legacy class names | `source(none)` with explicit `@source` per migrated area, and the collision gate on every merge. |
| 22 | PrefabOps: 5 `!important` legacy rules outrank kit `!` utilities (lower layer wins for important) | Listed at P2. Each is removed or scoped when its area migrates. |
| 23 | PrefabOps: dark mode, toast timing, Escape-to-close, date format | Decided in §1.3 and §13.3. Each lands in the named step with its intended harness change. |
| 24 | Security | No secrets or env reads in the library (boundary test). `/dev/kit` returns `notFound()` in production and sits under the authenticated `(app)` layout. No new credentials anywhere (§1.1). |
| 25 | Downtime | None (§0). Source-only atomic deploys. Rollback is a revert. |

---

## 15. Inputs still needed (not decisions)

1. **Production URLs** of Workforce Ops and PrefabOps for `OPS_APPS`. They are read from the Vercel projects when 1.1.0 is prepared. FinaOps stays hidden until it has one.
2. **PrefabOps' palette** (sidebar ×6, primary ×3, accent), before the P4 shell step.
3. **Who creates the GitHub repo** `sasavincic/ops-ui` (private): Saša, or a session with his approval.
