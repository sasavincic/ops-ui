# @latro/ops-ui

The shared UI kit of the Latro Mont suite: **Workforce Ops**, **FinaOps** and
**PrefabOps**. One implementation of the kit primitives (Button, Dialog, Sheet,
Field, DateInput, Combobox, Toast, Callout, Badge, Table, Tabs…), the design
tokens with a per-app brand contract, and the shared design doctrine. Each app
keeps its own brand colour; everything else looks and behaves the same.

- Spec (source of truth): [`docs/superpowers/specs/2026-09-30-ops-ui-library.md`](docs/superpowers/specs/2026-09-30-ops-ui-library.md)
- Kit survey it was built from: [`docs/superpowers/specs/kit-inventory.md`](docs/superpowers/specs/kit-inventory.md)
- Tokens and the brand contract an app's `brand.css` must meet: [`TOKENS.md`](TOKENS.md)
- The shared design doctrine (actions, statuses, alerts, records, lists): [`DESIGN.md`](DESIGN.md)
- What each release changed, and the upgrade steps: [`CHANGELOG.md`](CHANGELOG.md)
- Working rules for contributors and Claude sessions: [`CLAUDE.md`](CLAUDE.md)

**Status:** pre-1.0, being built in steps L1–L7b (spec §12.1). **1.0.0 is a
pure extraction** of the FinaOps kit (`fina-ops/src/components/ui`, which is
Workforce Ops' kit plus three small fixes) plus a few named Workforce Ops
modules: it renders identically to today's kits.

## What the library is, and is not

- It **knows no app**: no `@/…` imports, no dictionaries, no permission areas,
  no domain modules. Its only dependencies are the peers React, `next/link`,
  `next/navigation`, class-variance-authority, clsx, tailwind-merge (and
  Tailwind v4 for the CSS).
- App knowledge enters through three binding points in each app: the
  `record-tab.tsx` wrapper (permission area), the app's `WriteScope` (renders
  the library's `ReadOnlyScope`) and the app's `I18nProvider` (feeds the kit its
  strings through `OpsUiProvider`).
- It is **never published** to a registry and has no runtime link to any app.
- No shells, navigation, screens, pickers or business rules; no dark mode.

## How apps use it: vendoring

An app never installs this package. It **vendors** a released version:

```bash
# in the app repo, on a branch
node scripts/sync-ops-ui.mjs --version 1.2.0     # copy release v1.2.0 into src/vendor/ops-ui
node scripts/sync-ops-ui.mjs --write-wrappers    # only if the report asks for it
node scripts/sync-ops-ui.mjs --check             # verify the vendored copy (also run by pnpm test)
```

- The sync reads the release **from git objects only** (never this working
  tree), writes `src/vendor/ops-ui/**` (and `scripts/sync-ops-ui.mjs` itself)
  and pins it in `ops-ui.lock.json` (commit + sha256 per file).
- The copy is **committed** in the app, so builds never touch this repo, need
  no token and no network.
- Every vendored file carries a `GENERATED … do not edit` header; a hand edit
  fails the app's `pnpm test`. A kit change is always: change ops-ui → release
  → sync.
- The app keeps `src/components/ui/<name>.tsx` as its kit namespace (one-line
  re-exports plus the `record-tab` binding), so no import site in any app ever
  changes. Brand colours live in the app's `src/app/brand.css` as plain
  `:root { --brand-*: … }` variables.
- An upgrade is one app commit `ops-ui A → B` that passed the app's gates:
  code, zero-pixel screenshots, identical token dump, and a check by hand
  (spec §5.5, §12.0).

## Versions: strict semver by what an unchanged call site renders

| Level | Allowed |
|---|---|
| **Patch** | A fix that restores documented behaviour. Rendered DOM and CSS stay identical for every existing story. The declaration surface (`api-surface.d.txt`) is unchanged. |
| **Minor** | Additive only: a new component, export, glyph, token, opt-in stylesheet, optional string with an English default, or a prop whose default keeps today's output. Every existing screenshot baseline stays at **0 changed pixels**. |
| **Major** | Anything else: a changed baseline, a removed or changed declaration, a changed default or token, a new *required* string or brand variable, a peer range major. Visible fixes are batched into planned majors, each with `Visible:` and `Upgrade steps:` in the CHANGELOG. |

The release script (`pnpm release X.Y.Z`) computes the required level from the
diff since the last release and refuses a bump below it. A release is the
commit **`release: vX.Y.Z`** on `main` plus the branch `release/vX.Y.Z` —
never a tag (the session git proxy refuses tag pushes).

## Working on the library

```bash
pnpm install
pnpm typecheck && pnpm lint && pnpm test   # tsc, eslint (import boundary), vitest
pnpm gallery                               # the story gallery on http://localhost:3300/workforce
pnpm api-surface                           # regenerate api-surface.d.txt after a declaration change
pnpm shots                                 # Playwright: every story x 3 brands x {1440, 375, 375-touch} + hover/focus states, 0-pixel diffs, + behaviour tests
node tools/diff-against-app.mjs --app ../fina-ops --ref origin/main        # the extraction proof (spec §12.1 L6)
node tools/diff-against-app.mjs --app ../workforce-ops --ref origin/main   # (reads the apps through git only)
pnpm shots:accept                          # write baselines (a major, or a pure `shots: rebaseline (…)` commit)
```

Requires Node ≥ 20 and pnpm. The gallery (`gallery/`) is a small Next 16 +
Tailwind v4 app: `/<brand>` lists the stories, `/<brand>/<story>` renders one,
with `<html data-brand>` selecting the `workforce`, `finaops` or `prefab`
fixture from `gallery/brands/`.

## Layout

```
src/            the library (relative imports only): components/, config/, lib/, navigation/, stories/, types.ts, version.ts
styles/         tokens.css (@theme contract), kit.css, base.css, app-feel.css
sync/           sync-ops-ui.mjs + its generated .d.mts, shipped to each app as scripts/sync-ops-ui.{mjs,d.mts}
tools/          api-surface, pull-brands (L5), diff-against-app (L6); release, app-shots are built in L7a
ship.json       what a release ships to an app, and where (read by the sync from the release commit)
gallery/        Next app for stories and screenshots (brands/, tests/, __screenshots__/)
tests/          vitest (node environment, renderToStaticMarkup)
docs/           the spec and the kit inventory
```

Folders appear as their step lands (spec §12.1).
