# PrefabOps restyle onto `@latro/ops-ui`: plan

**Status: APPROVED 2026-09-30.** Saša approved it with "Do all. I will go with your recommendations." Every recommendation here is a decision. A few defaults can still be overruled later without blocking any step; they are marked *(default)*.

**What this plan covers.** PrefabOps (`prefab-ops-platform/apps/web`) moves from 13.8k lines of hand-written CSS onto the shared kit `@latro/ops-ui`. This plan turns §13 of the library spec (`2026-09-30-ops-ui-library.md`, APPROVED) into ordered steps, each with a gate.
- The library spec stays authoritative for the library itself: vendoring and sync, semver, tokens and the brand contract, wrappers, and gates G1–G5.
- §1.2 lists the places where this plan refines the spec's §13.

**Where this file goes.** `prefab-ops-platform/docs/superpowers/plans/2026-09-30-prefab-restyle.md`, committed with R0. Prefab's CLAUDE.md already says: "Follow the plans when they exist". Every merge updates the progress table in §15.

**Sources.** All read-only, 2026-09-30:
- `prefab-inventory.md`: routes, the 17 stylesheets, class families, component → family table, gaps G1–G17.
- `prefab-next16.md`: the Next 16 assessment.
- `prefab-local-env.md`: the local Supabase stack, verified working.
- The suite spec `2026-09-30-suite-security-and-shared-ui.md`, Part C Phase 2.
- Prefab's security tranche: P1–P8 of the security workflow.

The counts were re-checked against the working tree the same day. There are 26 confirm prompts in 16 files: 22 `window.confirm` and 4 bare `confirm(`.

---

## 0. Summary

- **Order:**
  1. Preconditions (§2): the security tranche merged, library ≥ 1.1.
  2. **R0**: local verification environment.
  3. **P0**: Next 16, its own merge.
  4. **P1**: rename the legacy tokens.
  5. **P2**: Tailwind and the vendored kit, in cascade layers.
  6. **P3**: providers and notifications.
  7. **P4.1–P4.8**, the areas: shell and navigation, lists, forms and modals, projects (record and financials), welding, documentation (stages, then review workspaces), calculations, workshop portal.
  8. **P5**: finish.
- **Branches.** Each step gets its own short-lived branch and merges to `main` without a feature flag (§12).
- **Proof per step.** Screenshots of the real app against a local Supabase database, at 1440, 375 and 375 with touch. "Before" comes from `main`, "after" from the branch. Outside the step's declared scope there must be 0 changed pixels.
- **Coexistence, by construction.**
  - Legacy CSS sits in the lowest cascade layer.
  - Kit markup lives only inside `.ops-ui-root` islands, and an island never contains legacy markup.
  - Pages not yet migrated keep their own canvas inside the new frame.
- **Gaps (§10).**
  - 9 gaps become additions in three planned library minors (M1–M3). Each adds 0 changed pixels in Workforce Ops (WFO) and FinaOps.
  - 9 become Prefab-owned components built only from kit parts and kit tokens, besides PrefabOps' own composites.
  - The rest are handled by convention (G5), were already solved by library 1.0 (G16), need only a tools change (G21), or are dropped (G1).
- **What users will notice:**
  - light theme only;
  - dates typed as DD-MM-YYYY;
  - dialogs close with ✕, not Escape;
  - info notifications stay until dismissed;
  - project statuses coloured by meaning, not by phase;
  - a contextual Back link.
  - PrefabOps keeps its blue and its touch sizes.

### Downtime

**None expected.**
- **Source-only deploys.** Every step ships source code as an ordinary atomic Vercel deploy: no new environment variable, no secret, no change to auth or cookies. Rollback is Instant Rollback or a revert of that one merge.
- **Two steps touch more than styling.** Both are built to be invisible to users:
  - **R0 adds one migration**, `alter table projects add column if not exists documentation_stage …`.
    - On production it changes nothing: the column already exists there (the project register works), and its definition is read first so the file matches it exactly.
    - It exists only because a database built from the migrations lacks that column. On such a database the register renders empty.
  - **P0 (Next 16)** moves the auth gate from Edge middleware to the Node.js proxy.
    - The failure mode is a redirect loop, or everyone refused. Both are checked against the local stack and on a preview before merging, and rollback takes seconds.
    - Supabase and workshop cookies are unchanged, so nobody has to sign in again.
- **What users may see (not outages):**
  - A tab opened before a deploy may do one full reload on its next navigation. Vercel Skew Protection, if the plan has it, avoids even that.
  - Workshop tablets should be reloaded once after P0 and once after P4.8.
  - Anyone whose device is set to dark mode sees the light app from P4.1 on.

---

## 1. Decisions

### 1.1 Recommendations taken as decisions

| # | Decision | Reason |
|---|---|---|
| D1 | The real local Supabase stack (R0) is the verification instrument. The page harness is only a fallback. | Verified 2026-09-30: all 57 migrations apply; 23 routes render with real queries. The old harness is gone and would need data adapters for every page. |
| D2 | One short branch per step, merged to `main` without a flag. | §12 |
| D3 | Palette "Prefab light" *(default)*: a light sidebar, Prefab's own blue as primary (`#0066D6` → `oklch(0.53 0.185 257)`, white text 5.40:1), a copper accent. Values in §9.8. | Keeps Prefab recognisable to its users. The light sidebar tells it apart from WFO's navy and FinaOps' green at a glance. |
| D4 | Dark mode is dropped at P4.1 (library spec §13.3). | The sister apps are light-only. A half-dark app for months would be worse than none. |
| D5 | Dates are typed as DD-MM-YYYY with the kit `DateInput`; years use the kit `YearInput` (M3). | Suite format; library spec §1.3.9 |
| D6 | Dialogs close with ✕ only; Escape no longer closes them. While a dialog is busy, it shows that in the commit button's label (`pending`). | Kit contract; library spec §1.3.9 |
| D7 | `info` notifications stay until dismissed. The notification label words ("Attention / Updated / Notice") are dropped; the glyph carries the meaning. PrefabOps' own `notify.error` messages still clear on a page change (adapter). | Library spec §1.3.9. Clearing on route change is Prefab behaviour worth keeping. |
| D8 | Tailwind breakpoints (640 / 768 / 1024 / 1280). The phone layout still starts below 768 (`md`), so the phone switch point does not move. | Library spec §1.3.9 |
| D9 | Prefab keeps its touch rule: on coarse pointers, controls ≥ 44px and text inputs ≥ 16px, through the kit's opt-in `data-ops-touch` (M2). The workshop portal uses `size="lg"` (48px) at every width. | The rule is a CLAUDE.md house rule and the office works on phones and tablets. Dropping it would be a regression. |
| D10 | The 12 project statuses map onto kit tones by meaning (§9.6). Phase is shown by position (status gauge, board column groups), not by hue. "Production on hold" becomes the paused slate, not red. | Status doctrine: red means wrong now, a pill means the lifecycle position. |
| D11 | `.action-button` (41 uses) gets no kit variant. It becomes `primary` when it produces the block's result, otherwise `secondary`. AI actions carry the `sparkle` glyph (M2). | Kit button doctrine: ≤ 1 primary per block |
| D12 | The kit `BackLink` and `NavTrail` replace the breadcrumb badge. Tabs replace their history entry. | Suite behaviour: Back returns where you came from, and the browser's Back leaves the page in one press. |
| D13 | List toolbars follow the WFO record-list idiom: search, inline selects from `lg`, a staged Filters dialog on phones, and a summary line. They are built as a Prefab-owned component. | Library spec §2: WFO's `RecordListToolbar` stays app code. The idiom was settled with Saša in WFO (2026-08-11, 2026-09-06). |
| D14 | Legacy screens stay pixel-identical until their own area migrates: no "token bridge" that recolours legacy screens early. | Keeps every step's gate "0 changed pixels outside the area" meaningful. |
| D15 | While the restyle runs, new UI in a migrated area uses the kit. In an area not yet migrated, small fixes use the legacy vocabulary; larger work migrates that area first. | One visual language per area at any time. |

### 1.2 Refinements of library spec §13

1. **Verification (§13.1.4).** The local Supabase stack replaces the page harness as the instrument behind G2 (D1). The harness stays as a fallback (§4.8).
2. **Palette (§13.1.5).** `brand.css` with the D3 palette lands at **P2**, not before P4.1. At the first sync, the sync script's brand-contract pre-flight refuses an app without the 10 required variables. The palette becomes visible from P3 (toasts) and P4.1 (frame). Changing it later is a `brand.css` edit.
3. **Touch floor (§13.2 P4 table).** The coarse-pointer floor and `size="lg"` are needed from **P4.1**, not only for the workshop portal (D9). They are batched into M2.
4. **Stacking variables (new, G18).** A library change is needed before P3. Kit toasts sit at z 60, legacy sheets at 1100 and the palette at 1200. Without a stacking variable, a toast raised from a legacy sheet would be hidden behind it.
5. **Islands and legacy canvas (§5.3, §5.4).** The spec's scoped reset is only safe if legacy markup never sits inside `.ops-ui-root`, so this plan makes that a rule and adds a guard. The legacy canvas keeps unmigrated pages identical inside the new frame.
6. **Areas made concrete (§7).** "Projects" is split into 4.4a (record, offer builder, material prices) and 4.4b (financials). "Documentation" is split into 4.6a (stages, engineering review) and 4.6b (review workspaces). "Forms and modals" is defined in §7.3.
7. **Branches.** Suite spec Part C said "own long-lived branch". This plan merges per area instead (§12).
8. **Scope of P1.** P1 renames **every** Prefab design token to `--legacy-*`, a superset of the spec's list. Only the layout variables that the new shell keeps using are left alone: `--page-gutter`, `--tab-bar-h`, `--safe-*`, `--sidebar-w`.
9. **AppSwitcher colour.** PrefabOps' colour dot in `OPS_APPS` uses its primary `#0667d3`, because its sidebar is light (§16).
10. **Order.** R0 comes before P0, because P0's local checks use the local stack.

---

## 2. Preconditions

| # | Must hold | How it is checked |
|---|---|---|
| **C1** | **The Prefab security tranche is merged into `main` and deployed.** Its migrations are applied in the order the tranche states, and CSP report-only is live. The tranche (P1–P8): builder API key, office auth fail-closed + `requireOfficeUser`, workshop passcode throttle, RLS lock-down + signed upload URLs, MFA + admin/editor roles, security headers + CSP report-only, integration caller log, office audit log. It lives today on `claude/trusting-keller-r5bi2t`, with work continuing. | `git log main` contains the tranche's final head. The Vercel production deployment of that merge is READY. The tranche's post-deploy checklist is done. |
| **C2** | **P0 (Next 16) is merged, deployed and has run ≥ 1 working day in production** without a regression. It needs R0 first (§3). | Deploy READY; runtime logs clean; the PrefabOps entry in the suite's decision log. |
| **C3** | **The library is ready.** ops-ui ≥ 1.1.0 is released. WFO in production and FinaOps on `main` are on ≥ 1.1.0 with no open regression (library spec §13.1.1). **M1 is released before P2; M2 before P4.1; M3 before P4.4a** (§10.2). | The library's `CHANGELOG.md` and each app's `ops-ui.lock.json` |
| **C4** | **R0 is merged:** the local environment, the fixtures, the drift migration, the vitest `@` alias, and baseline captures that can be made from `main`. | `dev/local/README.md` steps work from a fresh container |
| **C5** | **Workshop tablets run iOS/Safari ≥ 16.4.** That is the support floor of Next 16 and also of Tailwind v4 and the kit's OKLCH tokens. | Checked once during P0. A tablet below it is updated before P2. |
| **C6** | **No other in-flight change touches the files of the step being migrated.** | The §15 progress table marks the area "in migration" with its branch; other sessions read it (CLAUDE.md note, §11). |

**Why C1 comes first.** The security tranche edits the same files P0–P3 edit: `middleware.ts`, `app-providers.tsx`, `layout.tsx`, `login-form.tsx` and the workshop login. It also adds UI in the legacy vocabulary: MFA enrollment and challenge pages, the workshop "sign-in paused" notice, and possibly a settings Activity list. The restyle must cover those screens. Landing them first keeps one cause per regression.

---

## 3. P0: Next 16.2 / React 19.2 (its own step, its own merge)

The kit's peer range (`next >=16.2`, `react >=19.2`) requires this step. It changes no styling. Details are in `prefab-next16.md`. The steps:

| Step | What | Risk |
|---|---|---|
| P0.0 | **Baseline on `main`** (after C1 and R0): `npx tsc --noEmit && npm test && npm run build`, keeping the build's route table (dynamic vs static). Take local-stack captures labelled `pre-next16`. Read, but do not change, the Vercel region, Node version and Skew Protection. | none |
| P0.1 | On a branch: `npm install --save-exact next@16.2.10 react@19.2.4 react-dom@19.2.4 @types/react@19.2.17 @types/react-dom@19.2.3`. **Do not** use the `@next/codemod upgrade latest` codemod, which would install a newer Next than 16.2.10. | low |
| P0.2 | **First green run** with `middleware.ts` untouched: typecheck, tests, and a Turbopack production build. Commit the tsconfig rewrite (`jsx: react-jsx`, plus `.next/dev/types/**/*.ts` in `include`). Untrack `next-env.d.ts` and gitignore it (the WFO/FinaOps idiom). | low–medium |
| P0.3 | **Local run**: `next build && next start -p 3200` against the local stack.<br>• Sign in; the login callback; workshop passcode login; the integration API answers 401 without a key.<br>• Captures against `pre-next16`: **0 changed pixels expected**. All 18 sheets parse under Lightning CSS with 0 warnings, so any difference is investigated.<br>• One fabrication cut-list extraction, which proves `unpdf` is in the Turbopack output.<br>• Optionally one pack run against a locally started builder. | medium |
| P0.4 | **`middleware` → `proxy`** as its own commit, after the tranche's fail-closed middleware is in:<br>• `git mv src/middleware.ts src/proxy.ts` and rename the function;<br>• `middleware.test.ts` → `proxy.test.ts` (the `x-middleware-next` assertions stay valid);<br>• update the wording in CLAUDE.md, `apps/web/README.md` and the 7 source comments;<br>• repeat the P0.3 auth checks. | medium (app-wide auth gate) |
| P0.5 | Vercel settings. Recommended: region `fra1` (Supabase is in the EU; the proxy calls `auth.getUser()` on every request), Node 22, Skew Protection on if the plan has it. **Saša changes these**, or a session does with his explicit approval. | low |
| P0.6 | Preview smoke test, read-only. Previews use whatever database the security Phase 0a step 4 gave them. | low |
| P0.7 | Merge `--no-ff`. The deployment must be READY. Watch runtime logs and proxy invocation counts for 30 minutes (Next 16 sends more, smaller prefetches). Instant Rollback is available. | low |
| P0.8 | Separate follow-ups, not part of the restyle: the Dockerfile standalone path and Node 22, the `@supabase/ssr` bump, ESLint, `unstable_retry` in `error.tsx`. | — |

**Not in P0:** `cacheComponents` (it would keep hidden routes mounted and fight the modals) and `eslint-config-next@16` (its react-hooks v7 rules would turn the upgrade into a refactor).

**Gate:** G1, the P0.3 checks, G2 with 0 changed pixels on every route, and G5.

---

## 4. R0: local verification environment

### 4.1 What exists (verified 2026-09-30)

- **The stack.** Docker plus the Supabase CLI 2.118.0 local stack: db, auth, rest, storage and kong. Studio, realtime, imgproxy, mailpit, edge-runtime, logflare, vector, supavisor and postgres-meta are left out, because the app uses none of them.
- **Data.** All 57 migrations apply. A fixture generator seeds:
  - 4 clients;
  - 9 projects across every status group, including one welded structure and one archived;
  - offers, cost items and invoice lines;
  - two documentation projects (one pack-complete, one mid-review with 4 page PDFs);
  - 6 employees with rates and 3 welder certificates;
  - the price book;
  - 13 storage objects.
- **Result.** The real app signed in with a password and rendered 23 routes with no database or gateway errors, once one drift patch was applied.
- **Timings.** First start 193 s; full reseed 40 s. Docker Hub rate-limits anonymous pulls (429), so a pull-retry loop is part of the start script. The Amazon and GitHub registry CDNs are blocked by the egress policy; the CLI falls back to Docker Hub.

### 4.2 What R0 commits (docs, scripts and one no-op migration; its own merge)

```
dev/local/
  README.md                 start / stop / restart / reseed, the pull-retry loop, troubleshooting
  supabase/config.toml      project_id prefab-local; unused services and analytics off
  supabase/migrations  ->   ../../../supabase/migrations   (symlink: one migration history)
  fixtures/gen-seed.py      stdlib-only generator -> seed.sql + files-manifest.json (fixed UUIDs)
  fixtures/upload-files.mjs renders placeholder drawing PDFs with Chromium, uploads them to local storage
  reseed.sh                 refuses any non-local URL; db reset -> seed -> files -> users
  env.sh                    builds the app env from `supabase status -o env` (no key is committed)
supabase/migrations/<ts>_projects_documentation_stage.sql
apps/web/vitest.config.ts   resolve.alias { "@": ./src }        (library spec §13.1.3)
apps/web/ops-ui.config.json the "visual" block only (§4.5); the sync fills the rest at P2
apps/web/scripts/restyle/   class-usage.mjs (static and dynamic class references vs the 17 sheets)
```

**Why the Supabase config lives under `dev/local/`.** Putting it at the repo's `supabase/` root could change behaviour if the Supabase GitHub integration is ever switched on for the repo. The symlink keeps a single migration history.

**`env.sh` commits no keys.** It reads the CLI's local demo keys at runtime, so nothing JWT-shaped is committed for a secret scanner to flag.

**The drift migration.**
1. Before writing it, the lead reads the production definition of `projects.documentation_stage` read-only (Supabase connector, `list_tables` / a catalogue query).
2. The file then matches it exactly (expected: `integer not null default 0`), with `if not exists`.
3. On production it is a no-op. It makes the migration history truthful, so the register no longer renders empty on a freshly built database.
4. Whether the column should exist at all is outside the restyle. The app never writes it.

**CLAUDE.md in the same merge.**
- The Environment line "Supabase is remote-only (no local stack)" becomes: "production Supabase is remote; a local stack for UI verification is in `dev/local/` (never pointed at production)".
- The page-harness sentence points to `dev/local/README.md`.

### 4.3 Local environment variables (after the security tranche)

`env.sh` exports:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, taken from `supabase status`;
- `AUTHORIZED_USER_EMAILS=dev@prefab.local,editor@prefab.local` and `AUTHORIZED_ADMIN_EMAILS=dev@prefab.local`;
- **`REQUIRE_OFFICE_MFA=off`** (local only: the tranche defaults MFA on);
- `WORKSHOP_SESSION_SECRET` set to a fixed local value. Passcode hashes depend on it, so it must never change;
- `PREFAB_OPS_ALLOW_MOCK_DATA=false`, `NEXT_TELEMETRY_DISABLED=1`, and `NEXT_PUBLIC_RESTYLE_GUARD=1` (from P2, §5.3).

`BUILDER_SERVICE_URL` and `BUILDER_API_KEY` are set only when the builder runs locally. Without the builder, pack, WPS, offer PDF and finalize actions fail, but every screen renders.

AI calls use a local mock endpoint (the FinaOps idiom: `ANTHROPIC_BASE_URL` / the OpenAI base URL pointed at canned replies) when a screen's AI state must be captured.

Ports: PrefabOps uses **3200** for the branch and **3201** for `main`. WFO is on 3000, document-service on 3001, FinaOps on 3100.

### 4.4 Fixtures

R0 seeds everything from §4.1, plus:
- an editor user;
- a workshop passcode for one employee (the hash comes from the app's own helper with the local secret);
- one workshop submission.

That makes every route capturable from the first baseline. The fixtures do not yet cover some areas. **Each area step extends the fixtures on `main` first**, so the "before" capture already shows the data:

| Step | Fixture additions |
|---|---|
| P4.3 | AI / extraction settings rows, shared certificates, offer factor settings |
| P4.4a | a project with a long positions list, and a price book with supplier documents |
| P4.4b | financial worksheets for piping and for fabrication; an unlocked invoice and a locked one with edited rows |
| P4.5 | WPQR rows (active and archived), WPS library rows, layered parameter defaults |
| P4.6a | pre-offer findings of each severity; design basis; completion settings; email drafts; a stale pack and a partial pack |
| P4.6b | a fabrication review with cut-list pages; a review page with an unsaved draft (checking the "Unsaved changes" seed artifact noted in the local-env report) |
| P4.8 | several workshop submissions of each kind; an overdue project and an unscheduled one |

### 4.5 Capturing before and after

- **Worktrees.** The restyle works in its own git worktree (`git worktree add ../prefab-restyle <branch>`), because other sessions edit the main checkout. `main` runs from a second worktree (`../prefab-baseline`). Each worktree runs `npm ci` in `apps/web`.
- **Two servers, one database.** Both run `next build && next start` (no dev overlay, no HMR, production CSS order): the branch on :3200, `main` on :3201. Both point at the same local database, reseeded before each capture pair. Captures never submit anything (below), so they can run in parallel.
- **The tool** is the library's `tools/app-shots.mjs`, driven by `apps/web/ops-ui.config.json` `visual`. PrefabOps needs a few additions to the tool. They live in the library repo's `tools/`, which are not shipped to the apps, so they need **no release**:

| Addition | Why |
|---|---|
| `browser.channel: "chromium"` | The default headless shell does not render PDFs in iframes, and the drawing review shows one. |
| `login` with Prefab's path (`/auth/login`) and field selectors; `profiles.workshop` (passcode flow at `/workshop`); `profiles.editor` | Office, editor and workshop sessions |
| `variants: ["light","dark"]` using `colorScheme` emulation | PrefabOps follows the system theme when nothing is stored. Dark is dropped at P4.1. |
| `states`: per route, a list of clicks and keypresses that **open** things (a dialog, a menu, a picker, a validation toast) and never submit | Dialogs, menus and toasts are where the restyle changes most. |
| `element: "[data-page-body]"`, captured alongside full pages | The P4.1 gate (§7.1) |
| `hide: ["nextjs-portal"]`, `failOnConsole: ["[ops-island]"]` | Hide dev badges; the island guard fails the capture (§5.3) |
| `review: [1024, "820-touch"]` | Tablet widths are captured for review only, not gated, except in P4.8 |

- **Determinism:**
  - `TZ=Europe/Ljubljana` and a fixed browser locale;
  - reduced motion and a hidden caret;
  - reseed before each pair, and capture both labels in the same run;
  - screenshots are kept out of git. Any "before" can be reproduced from its commit, so nothing needs archiving.

### 4.6 Routes captured

Fixture ids are fixed UUIDs from `dev/local/fixtures`, for example project P1 = `00000000-0000-4000-000a-000000000001`.

- **Office:**
  - `/`, `/projects`, `/clients`, `/clients/<C1>`, `/employees`, `/employees/<E1>`;
  - `/offer-builder`, `/material-prices`, `/more`;
  - `/settings?panel=` ai / extraction / certificates / welding / offers / account;
  - `/auth/login`, plus the MFA enrollment and challenge pages from the tranche.
- **Projects:**
  - P1: page, `/documentation`, `/financials`;
  - P2: page, `/documentation`, `/documentation/review`, `/material-review`, `/item-info-review`, `/engineering-review`;
  - P5 `/financials`;
  - P7 page and `/documentation`;
  - the fabrication project (page, documentation, review);
  - the archived project.
- **Workshop:** `/workshop`, `/workshop/projects`, `/workshop/projects/<P1>`, and a not-found id.
- **Error states:** the global error page (a fixture route that throws, dev build only) and `loading.tsx` (captured by delaying one loader in a capture-only build).
- **From P2:** `/dev/kit` (§5.8).

That is about 40 routes at 3 widths and 2 variants until P4.1, then about 40 routes at 3 widths, plus the states.

### 4.7 Timeline of the verification set

- **R0** establishes the capture set on `main` (baseline `pre-next16`).
- **P0** proves 0 changed pixels.
- **P1–P3** each prove 0 changed pixels (light and dark), except P3's declared toast states.
- **From P4.1**, dark captures are retired.

### 4.8 Fallback if Docker cannot run

This is the recipe in `prefab-local-env.md` §6. It applies only if the container cannot run Docker or pull the images.
- Build a scratch Next app whose `@/*` path maps to `apps/web/src/*` and which imports the same CSS in the same order.
- Render the real components with fixture props.
- Alias `@/lib/data` and the needed `@/lib/server/*` modules to fixture modules.
- Stub `/api/*` with Playwright routing.

A step verified this way lists every route and state the harness could not show. Those are checked by hand on production right after the merge (read-only look, 1440 and 375), and anything wrong is reverted.

---

## 5. Coexistence rules (the architecture behind P1–P5)

### 5.1 Cascade

After P2, `layout.tsx` imports one file, `src/app/app.css`:

```css
@layer legacy, theme, base, components, utilities;
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/utilities.css" layer(utilities) source(none);
@import "../vendor/ops-ui/styles/tokens.css";
@import "../vendor/ops-ui/styles/kit.css";
@import "../vendor/ops-ui/styles/preflight-scoped.css" layer(base);   /* M1 */
@import "./ops-ui-root.css" layer(base);                              /* Prefab-owned, deleted at P5 */
@import "./brand.css";
/* from P4.1: base.css + app-feel.css layer(base); legacy-canvas.css layer(legacy) */
@import "./globals.css" layer(legacy);
@import "./styles/financials.css" layer(legacy);
/* …the other 15 sheets in today's layout.tsx order, all layer(legacy) */
@source "../vendor/ops-ui";
@source not "../vendor/ops-ui/*.md";       /* the library spec 8.4 exclusions: the shipped docs, */
@source not "../../scripts/sync-ops-ui.*"; /* the sync script, */
@source not "../../ops-ui.config.json";    /* the config and the lock never reach the CSS, */
@source not "../../ops-ui.lock.json";      /* also once P5 turns automatic scanning on */
@source "../components/prefab-ui";
@source "./dev/kit";
/* + one @source per migrated file or folder, added area by area */

/* Prefab layout variables (not tokens; kept by name, owned by the app) */
:root { --page-gutter: 32px; --tab-bar-h: 64px; --sidebar-w: 228px; /* --safe-* … */ }
```

What the layer order does:
- `legacy` is the lowest layer, so kit utilities always win over legacy rules.
- `base` sits above `legacy`, so inside `.ops-ui-root` the scoped reset beats legacy element rules such as `button { background: none }` and `p { color }`.
- Inside `legacy`, today's order is kept, so legacy screens do not change.

The 5 `!important` legacy declarations win *against* higher layers for important declarations:
- 4 are the reduced-motion block, which is the behaviour we want everywhere;
- 1 is in `financials.css:398`, scoped to financial classes.

They are listed at P2 and removed with their area.

### 5.2 Names

- **P1 renames every PrefabOps design token** to `--legacy-*`: colour, radius, shadow, space, ease, duration, control, glass, panel-padding. After P1 the kit owns `--color-*`, `--radius-*`, `--shadow-*`, `--font-*` and `--text-*`.
- **Kept under their names:** the layout variables the new shell keeps using (`--page-gutter`, `--tab-bar-h`, `--safe-*`, `--sidebar-w`). They live in `app.css` as plain `:root` rules, never in `brand.css`, whose contract allows only `--brand-*` and `--ops-*`.

### 5.3 Islands: kit markup lives only inside `.ops-ui-root`

The Prefab-owned `OpsIsland` (`src/components/prefab-ui/ops-island.tsx`) renders `<div class="ops-ui-root" data-ops-island>` (or `contents`). Inside it:
- the scoped preflight (M1) applies;
- `ops-ui-root.css` applies, in the `base` layer. It is generated once from every element-only selector in the legacy sheets, and resets each property those selectors set back to its preflight value. It also sets the island's own inherited font, size, line height and ink (`font: 16px/1.5 var(--font-sans); color: var(--color-ink)`). An island inside a legacy page would otherwise inherit Prefab's SF stack and 15px.

**Rule: legacy markup never sits inside an island.** The scoped reset lives in `base`, which beats every rule in `legacy`, including class rules like `.secondary-button`. A legacy button inside an island would therefore lose its styling. Consequences:
- **Islands are leaves.** An area migrates whole subtrees.
- **A kit `Dialog` may not contain a legacy widget:** `DateField`, a legacy menu, or a hand-rolled sheet. Those are portals under `body`, so they stay behind the modal dialog's top layer, and the dialog makes the page inert, so they could not be used anyway. A migrated dialog converts its date fields in the same change.
- **The guard.** When `NEXT_PUBLIC_RESTYLE_GUARD=1`, a dev and capture-time `IslandGuard` in `AppProviders` checks every element under `[data-ops-island]` after each navigation and mutation batch. It compares class tokens against `scripts/restyle/legacy-classes.json`, generated at P2 from the 17 sheets. A hit logs `[ops-island] <class> in <selector>`, and captures fail on it. The guard is off in production and deleted at P5.

### 5.4 Canvas

From P4.1, `base.css` makes the page body match the kit: Geist, white background, ink colour.
- **Legacy pages keep their look.** A page not yet migrated renders inside `<main data-page-body class="legacy-canvas">`. The `legacy-canvas.css` rule, in the legacy layer, carries the old body declarations: background `#F2F2F7`, the SF font stack, 15px, label colour. Legacy content therefore looks exactly as today inside the new frame.
- **Switching a page to the kit canvas.** The `AppShell` prop is `canvas: "legacy" | "kit"`, default legacy. A page switches to `"kit"` only when **nothing legacy is left on it**. Until then its kit islands sit on the grey canvas, which kit cards (bordered, white) tolerate.
- **The workshop portal** gets the legacy canvas at P4.1 (its own shell), and loses it at P4.8.

### 5.5 Stacking

- **Kit `Dialog`, `ConfirmDialog` and `Sheet`-as-dialog are native top layer**, above everything.
- **Kit fixed layers** (toast 60, date calendar 50, row menu and sheet 40) read the M1 variables `--ops-z-toast`, `--ops-z-calendar`, `--ops-z-menu` and `--ops-z-sheet`. Their defaults equal today's values, so WFO and FinaOps see no change.
- **During coexistence PrefabOps sets** `--ops-z-toast: 1300`, `--ops-z-calendar: 1150`, `--ops-z-menu: 1150` and `--ops-z-sheet: 1100` in `app.css`. Those sit above its legacy header, tab bar and sheets, matching today's contract (sheets 1100, date picker 1150, palette 1200, notifications 1300). **P5 removes the overrides.**
- **⌘K and pull-to-search** do nothing while a `dialog[open]` exists. A legacy overlay cannot show above a modal dialog, and would open invisible behind it.

### 5.6 Utility generation

- **Scanning.** `source(none)` plus one `@source` line per migrated file or folder. Tailwind never scans legacy TSX, so it cannot generate a utility for a legacy word that happens to be a utility name (`hidden`, `truncate`, `container`, …). The vendor folder's docs are excluded (`@source not "../vendor/ops-ui/*.md"`, library spec §8.4): they name classes and tokens, and a docs-only release must not change the CSS. With `source(none)` nothing scans `scripts/` or the root JSON files, but the library template's other three exclusions (`scripts/sync-ops-ui.*`, `ops-ui.config.json`, `ops-ui.lock.json`) are there from P2 anyway: P5 drops `source(none)`, and automatic detection then reads them.
- **Build checks at P2 and at every area merge** (`scripts/restyle/collision-gate.mjs`):
  1. The class selectors in the built utilities, intersected with (legacy class names ∪ class names used in unmigrated TSX), must be empty.
  2. Every legacy rule must sit inside `@layer legacy`.
  3. The build log must name only the `@source` paths. If `source(none)` is not honoured on the split import, check 1 is the backstop.

### 5.7 Deleting legacy CSS

A family, section or stylesheet is deleted when **both** of these hold:
1. `scripts/restyle/class-usage.mjs` reports 0 references in `src`, counting static strings and the known dynamic prefixes (`status-${…}`, `pos-${…}`, `drawings-${…}`, …);
2. the capture of every route **outside** the area shows 0 changed pixels after the deletion.

**Shared families go with their last user.** The shared families are: buttons §10, badges §9, `.detail-card` §11, section patterns §8, forms `.field-group` §16, `.project-form-grid` §17, lists `list-*` §20, `.mini-stat` §21, `.financial-actions` §22, the modal contract, and `date-picker.css`. Each is marked in §15 when its last user migrates.

### 5.8 Prefab-owned components, and `/dev/kit`

- **Where they live.** `src/components/prefab-ui/*` holds generic pieces; area folders (`shell/`, `projects/`, `documentation/`, `financial/`, `welding/`, `workshop/`) hold composites.
- **How they are built.** Only from `@/components/ui/*`, plus Tailwind utilities on kit tokens and the Prefab layout variables. **No CSS files, no raw colours, no `--legacy-*`.** A test from P4.1 forbids hex, `rgb(` and `oklch(` literals in `className`/`style` outside `brand.css`.
- **`/dev/kit`.** Added at P2 as `src/app/dev/kit/[[...story]]/page.tsx`. It returns `notFound()` in production and sits behind the office proxy. It renders the vendored library stories plus a story for every Prefab-owned component, inside `OpsIsland`, one story per page with an index of links (library spec §3.2, the DOM contract `app-shots` expands into one route per story, §11.4). It is in every capture, so a cascade leak from legacy CSS, or a deleted rule a composite depended on, shows up as a pixel diff.
- **Promotion.** When a second app needs a Prefab-owned primitive, it moves into the library in a minor release and Prefab's file becomes a wrapper re-export (library spec §6.4).

---

## 6. P1–P3

### P1: rename the legacy tokens (0 changed pixels)

- **P1a, the rename.** `scripts/restyle/rename-legacy-tokens.mjs` renames every design token (§5.2) in:
  - the 17 stylesheets;
  - the 33 inline `style={{}}` objects in 20 files;
  - the pre-hydration theme script in `layout.tsx` and the `themeColor` entries;
  - the tests.
  
  CLAUDE.md's `--color-fill` mention is updated in the same commit.
- **P1b, dead CSS removed, as a separate commit.** The 97 never-referenced classes (~665 rule lines): all 24 `rulebook-*`, `stat-card`, `module-card`, `stats-grid`, the `financial-*-grid` rules, `detail-grid`, `settings-summary`/`-badge`, the `documentation-wps-entry*` rules, … They are found by `class-usage.mjs`, with the dynamic prefixes excluded.
- **Gates:**
  - `rg -n -- '--(color|radius|shadow|space)-' apps/web/src | rg -v -- '--legacy-'` finds nothing;
  - G1;
  - G2 with 0 changed pixels on every route and state, light and dark, 1440 / 375 / 375-touch;
  - G3: the dump shows the same values under the new names (a mapping check).

### P2: Tailwind and the vendored kit, without the global reset (0 changed pixels)

1. **Dependencies** (WFO's versions): `tailwindcss`, `@tailwindcss/postcss`, `class-variance-authority`, `clsx`, `tailwind-merge`. Plus `postcss.config.mjs`.
2. **Sync.** `ops-ui.config.json` gets `vendorDir: src/vendor/ops-ui`, `source: ../../../ops-ui`, `globalsCss: src/app/app.css`, `brandCss: src/app/brand.css`, no extensions, no local files. `bindings` lists the only files allowed to import `@/vendor/ops-ui` directly: `src/components/ui/**`, `src/components/app-providers.tsx`, `src/app/dev/kit/**` and `src/components/ui/*.test.ts`. Copy `scripts/sync-ops-ui.mjs` once by hand, then run `node scripts/sync-ops-ui.mjs --version 1.2.0` (M1) and `--write-wrappers`. Add `.gitattributes` (vendor folder marked `linguist-generated`).
3. **CSS.** `app.css` as in §5.1. `layout.tsx` imports it instead of the 17 files.
4. **`brand.css`** with the D3 palette (§9.8). It must pass the §8.5 contract checks in `checkVendor`.
5. **Fonts.** Geist and Geist Mono through `next/font/google` with `latin-ext`, as the variables `--font-geist-sans` / `--font-geist-mono` on `<html>`. The legacy body keeps its own font stack, so only kit islands use Geist.
6. **`ops-ui-root.css`**, generated by `scripts/restyle/gen-ops-ui-root.mjs` and reviewed by hand. Also `scripts/restyle/legacy-classes.json` and `collision-gate.mjs`, the `IslandGuard` (§5.3), and the `/dev/kit` route with the library stories.
7. **Vendor test** `src/components/ui/vendor.test.ts` (library spec §11.3: `checkVendor` ok, not dev, the vendor folder not ignored, bindings respected, wrappers complete).
8. **CLAUDE.md note:** "Restyle in progress (plan …): `src/vendor/ops-ui` is GENERATED — never edit it; the kit is not yet used by any screen; the legacy design vocabulary rules below still apply."

**Gates:**
- G1;
- G2 with 0 changed pixels on every app route and state, light and dark;
- the §5.6 build checks;
- the built CSS contains no unlayered rules except `:root` variables and `@keyframes`;
- the `/dev/kit` captures are recorded as PrefabOps' kit baseline;
- `/dev/kit` is reviewed once side by side with the library gallery's `prefab` brand (it must render like the kit).

### P3: providers and notifications (expected change: the notifications only)

- **Providers.** `AppProviders` mounts `<OpsUiProvider>` with the defaults (English strings, identity `localize`). The root layout renders `<OpsIsland className="contents"><Toaster /></OpsIsland>`, which covers `/workshop` too.
- **`useNotify` over `pushToast`.** The hook is re-implemented; its 263 calls in 41 files stay untouched (§9.1). `FloatingPromptBridge` (used only by a test) and the floating-prompt CSS (globals §28, about 100 lines) are deleted.
- **Placement and stacking.** On phones (≤ 768px), `--ops-toast-offset: calc(var(--tab-bar-h, 64px) + var(--safe-bottom))`. The §5.5 stacking overrides are set.
- **Read-only scope.** Archived-project content is wrapped in `<ReadOnlyScope readOnly>` where today's archived lock applies. No kit control exists there yet, so nothing is visible.
- **Dialog guard.** ⌘K and pull-to-search ignore while a `dialog[open]` exists (§5.5).
- **Tests.** The notify tests are updated to the adapter. A new test checks that an error raised before navigating is dismissed after navigating, and one raised by a kit component is not.

**Gates:**
- G1;
- G2 with 0 changed pixels on every route; toast states differ only as the Expected line says.
- **Expected:** toasts in the kit look (card, tone border, glyph, no label word), bottom-right on desktop and above the tab bar on phones; `info` persists.
- **G4:** raise an error inside a legacy sheet (New client with an empty name); the toast must be **visible above the sheet**. A success toast fades after 6 s. The same message twice gives one toast. Screen readers announce errors assertively and success politely (compare with today's live regions).

---

## 7. The areas (P4.1–P4.8), in order

### 7.0 Procedure for every area

1. **Branch** `restyle/<step>-<area>` from `main`, in the restyle worktree. Use `claude/restyle-<step>-<area>` where the session's git proxy only accepts `claude/*` names. Mark the area "in migration" in §15 on `main` (a docs commit).
2. **Library.** If the area needs a minor, sync it first as its own commit (`ops-ui A → B`), gated by G2 with 0 changed pixels.
3. **Fixtures.** Extend them for the area on `main` (§4.4), reseed, and **capture "before"** from `main`: the area's routes and states at 1440 / 375 / 375-touch, plus the 1024 and 820-touch review widths.
4. **Swap the components.** The area's pages and components move to `@/components/ui/*` and Prefab-owned composites. Wrap migrated subtrees in `OpsIsland`. Add their paths to `@source`. A page with nothing legacy left switches to `canvas="kit"`.
5. **Map the CSS families** using the area's table (below). Remove the legacy classes from the migrated TSX; a migrated file contains no legacy class name.
6. **Behaviour swaps inside the area:**
   - its `window.confirm` / `confirm(` calls → `ConfirmDialog`, or `InlineConfirm` inside an open dialog;
   - its hand-rolled modals → `Dialog` / `Sheet` (§9.2);
   - its `DateField` / `YearField` → `DateInput` / `YearInput`;
   - its icons → `ActionIcon` / `StatusIcon` (§9.7);
   - `<details>` → the Prefab `Disclosure`;
   - progress spinners → a pending label plus a disabled state;
   - `.action-button` per D11.
7. **Tests.** Update any class-asserting test; add tests for new Prefab-owned logic (for example the status mapping and the stepper state).
8. **Capture "after"** and compare:
   - **outside the area**, 0 changed pixels;
   - **inside**, only the changes the PR lists under **Expected**, reviewed side by side at every width;
   - the island guard is clean;
   - no horizontal overflow at 375;
   - coarse targets ≥ 44px (an app-shots check in the `data-ops-touch` context).
9. **Delete the area's legacy CSS** per §5.7, in the same branch, then capture again to prove 0 changed pixels outside the area.
10. **G1, G4** (the area's own checklist), then merge `--no-ff`, push, **G5**. Update §15: CSS lines deleted, shared families remaining, date.

Every area PR lists: Expected visible changes, confirms/modals/date fields replaced, CSS deleted, Prefab-owned components added, and fixtures added.

### 7.1 P4.1: Shell and navigation (the frame). First migrated area.

**Scope:**
- `components/app-shell.tsx` (537 lines), `command-palette.tsx` (234), `prefab-ops-logo.tsx`, `sign-out-button.tsx`;
- `/more`, `/auth/login` + `login-form.tsx` (278), the tranche's MFA pages;
- `app/error.tsx`, `app/loading.tsx`, and the not-found states.

About 1.2k TSX lines.

**Stays untouched:** the `AppShell` API. The props `title`, `titleActions`, `badge`, `description` and `immersive` remain, so its 19 call sites need no edit.

| Legacy family | Becomes |
|---|---|
| `.app-sidebar`, `.sidebar-glass`, `nav-*`, `sidebar-*` | Prefab-owned `Sidebar`: light sidebar tokens, 228px wide during coexistence so content width is unchanged, `NavIcon` glyphs (the 10 nav icons), ≥ 44px targets on coarse pointers |
| `.page-header`, `page-title*`, `page-meta-*`, `header-*` | kit `PageHeader` (title, `meta` = status Badge / Tag, `actions` = `titleActions`) plus a Prefab-owned `HeaderFacts` line for `.page-meta-row` facts. The kit's `description` is a string ≤ 8 words. |
| `breadcrumb-*`, `.badge-link` | kit `BackLink`, with `NavTrail` mounted in the shell (D12) |
| `mobile-*` (tab bar, More) | Prefab-owned `TabBar` (64px + safe area, `--tab-bar-h`) and the More page (destination grid, sign out); the soft-keyboard hide stays |
| pull-to-search ring (`command-palette.css`) | Prefab's hook kept; ring drawn with kit tokens; ignored while a `dialog[open]` exists |
| `command-palette-*`, `command-search-*` | Prefab-owned palette restyled in the WFO palette idiom (§9.5) |
| `theme-*`, `.register-toggle` (Light/Dark) | **Removed.** Dark mode is dropped: the pre-hydration script, `useThemeMode`, `localStorage prefabops-theme`, the dark `themeColor` and every `html[data-theme='dark']` block in the legacy sheets go. `themeColor` becomes `#f3f5f7`. |
| `auth-*` | `Card` + `Field` + `Button` (and the MFA pages likewise) |
| `detail-card-skeleton`, `page-title-skeleton` | Prefab-owned `Skeleton` blocks |
| error / not-found cards | kit `EmptyState` / `Callout` + `Button` |
| brand lockup (`brand-*`) | `PrefabOpsLogo` redrawn with kit tokens inside the AppSwitcher trigger (library 1.1) |

**Also in this merge:**
- `base.css` and `app-feel.css` are imported in `layer(base)`, and `legacy-canvas.css` is added (§5.4). `WorkshopShell` gets the legacy canvas.
- `<html data-ops-touch>` (M2).
- CLAUDE.md house rules are rewritten (§11.2).
- `/more` loses its Appearance control.

**Replaced:** no confirms. The shell's filter-sheet class reuse goes (the register's filter sheet is rebuilt in 7.2).

**Needs:** M2 (touch floor, `sparkle`/`mail` glyphs for later), library 1.1 (`AppSwitcher`).

**Gate (special):**
- Office pages not yet migrated: **the element capture of `[data-page-body]` shows 0 changed pixels** at 1440 and 375, because the legacy canvas and the unchanged content width keep legacy content identical.
- Workshop routes: full pages show 0 changed pixels.
- Full office pages are reviewed as Expected: new frame, light only.

**Expected:** new sidebar, tab bar, header and palette; Geist in the frame; dark mode gone; login and MFA pages in the kit look; Back link behaviour.

**Deleted:** globals §4–§7 (shell, sidebar, content area, page header, theme toggle), §29 scrollbar, §30 focus, the dark theme blocks everywhere, `command-palette.css`, `auth.css`. About 1,000 rule lines.

### 7.2 P4.2: Lists and records (read views)

**Scope:**
- the dashboard (`app/page.tsx`);
- the projects register (`project-manager.tsx` list view, board and toolbar, not its New-project dialog), `project-docs-progress.tsx`;
- clients: `client-manager.tsx`, `client-detail-manager.tsx` read views;
- employees: `employee-list-manager.tsx`, `employee-detail-manager.tsx` read views, `welder-certificates-panel.tsx`.

About 2.8k TSX lines.

| Legacy family | Becomes |
|---|---|
| `dash-finance-*`, `dash-group-*` | Prefab-owned `StatTile` + `ProgressBar` (share bar) in `Card`s with a `Kicker` |
| `dash-attention-*` | `Table` rows with a status `Badge` + the kit `AttentionList` line for the reason |
| `register-toolbar/-search/-filter/-chip/-menu/-filter-sheet/-archive` | Prefab-owned `ListToolbar` (D13): `SearchInput`, inline `Select`s from `lg`, a staged Filters `Dialog presentation="sheet"` on phones, the archived scope as a summary-line link ("9 projects · 1 archived hidden") |
| `register-view` Board/List | `Segmented` (controlled, today's client state kept) |
| `kb-*` | Prefab-owned `KanbanBoard` (`@dnd-kit` kept, desktop only): columns grouped under phase `Kicker`s, cards = kit tokens + `Badge` + `Tag` |
| `list-*` rows, `list-docs-*` | `Table/THead/TBody/TR/TH/TD/RowLink` with the WFO phone fold; `EmptyState` (never repeats the page's create); `DocsProgress` → Prefab-owned `PipelineMarkers` |
| `.status-pill.status-*` | `Badge` via the Prefab-owned `project-status-meta.ts` (§9.6) |
| `client-row/-detail/-contact/-payment/-empty` | `Table`, `DescriptionList` (`Value`/`NotSet`), `CopyValue` (e-mail, phone), `StatTile` (overview) |
| `employee-row/-profile/-status/-workshop/-rate/-activity/-record` | `Table`, `DescriptionList`, `StateMark` (work status), `Switch` (workshop access), `RowMenu` |
| `employee-cert-*`, `certificate-health-*` | `Table` + `ValidityCell` (library 1.1; a 30-day warning, like today's health rule), `FileInput` / `FileLink`, `RowMenu` (archive) |
| `.subtle-badge` | per use: `Tag` (counts and facts), `Badge` (states) |

**Replaced:**
- 1 confirm (certificate archive);
- 6 `DateField`s (certificate forms);
- the tranche's workshop "sign-in paused" notice becomes a `Callout` where it lives.
- The New / Edit dialogs stay legacy until 7.3. They are portals opened by kit buttons, which works.

**Tests:** `employee-records.test.tsx`, the only test that asserts class names, is updated.

**Prefab-owned components built here:** `StatTile`, `ProgressBar`, `ListToolbar`, `KanbanBoard`, `PipelineMarkers`, `project-status-meta.ts`.

**Needs:** M2 (`Dialog presentation="sheet"`, `IconButton`).

**Expected:**
- status colours by meaning;
- the toolbar idiom;
- tables fold on phones;
- dates in the certificate table shown DD-MM-YYYY.

**Deleted:** `dashboard.css`, `project-register.css` (except the shared `list-*`, which waits for 7.8), `clients.css`, `employees.css`, globals §21 `mini-stat` if unused. About 1,300 rule lines.

### 7.3 P4.3: Forms and modals

"Forms and modals" means these parts:
- **The record dialogs of 7.2's lists:**
  - New project (`project-manager`), Edit project (`project-detail-controls`, the sheet only);
  - New / Edit client with `client-form.tsx` contacts, `client-handover-composer.tsx`;
  - New / Edit employee, the hourly-rate dialog.
- **The Settings page shell and its form panels:** `settings-tabs.tsx`, `ai-models-panel.tsx`, `extraction-settings-panel.tsx`, `certificate-settings-panel.tsx`, `financial-settings-panel.tsx`, plus the tranche's Activity list if it exists.
- **The shared form conventions every later area reuses:** kit `Field` + grid utilities, `DialogFooter` with a `pending` label, and field errors raised as toasts (Prefab's "validation runs on click and notifies" rule).

About 1.5k settings lines plus the dialog portions.

| Legacy family | Becomes |
|---|---|
| `.modal-backdrop > .modal-panel(-wide)` + `useBodyScrollLock` + `useDialogFocus` | `Dialog presentation="sheet"` (bottom sheet on phones, sticky safe-area footer, ✕ close) |
| `.field-group(-wide)`, `.field-toggle`, `.field-hint-inline`, `.settings-input`, `.form-message` | `Field` + `Input` / `Select` / `Textarea` / `Checkbox` / `Switch` / `CheckTile` / `FileInput`; record picks → `Combobox` |
| `.project-form-grid` | Tailwind grid utilities (`grid gap-4 sm:grid-cols-2`) |
| `.form-actions` | `DialogFooter` (pages: an action row in `PageHeader actions`) |
| `settings-nav/-internal-nav` (`?panel=`) | kit `Tabs` (URL-driven, replace history, D12) |
| `settings-section/-subsection/-rate/-factor/-group/-field/-certificate/-account` | `Card` + `Kicker` + `Field` grid; rate and factor tables → `Table` with `Input` cells |
| `ai-*` | `Field` + `Select` / `Combobox` |

**Replaced:**
- 1 confirm (handover);
- **7 modal files:** `project-manager`, `project-detail-controls` (edit), `client-manager`, `client-detail-manager`, `client-handover-composer`, `employee-list-manager`, `employee-detail-manager`;
- 3 `DateField`s (new project, edit project, rate).

The Settings Welding tab stays legacy until 7.5, so `/settings` keeps the legacy canvas; the tab strip and the migrated panels are islands.

**Needs:** M2 (`presentation="sheet"`, `mail` glyph for the handover composer).

**Expected:**
- dialogs in the kit look;
- Escape no longer closes a dialog;
- the discard prompt when closing a dirty dialog;
- validation as toasts on the fields;
- DD-MM-YYYY date inputs;
- settings tabs replace history.

**Deleted:** the settings half of `documentation.css` (≈ 466 lines, including the dead `rulebook-*` if not already gone in P1b), and the modal-contract rules if no legacy modal remains (they do remain; tracked in §15).

### 7.4a P4.4a: Project record, offer builder, material prices

**Scope:**
- `app/projects/[projectId]/page.tsx`, `project-detail-controls.tsx` (status card, archive/restore), `financial-snapshot.tsx`, `record-edit-action.tsx`;
- `custom-offer-builder.tsx` (581);
- `material-price-workspace.tsx` (800).

About 2.3k lines.

| Legacy family | Becomes |
|---|---|
| `project-detail-*` title actions, body, workspaces, tiles, stats | `PageHeader actions` (`Button secondary icon=edit/archive/restore`, label hidden on phones); tiles = `GlanceCard` + `ProgressBar` + `PipelineMarkers`; stats = `StatTile` / `DescriptionList` |
| `status-banner-*` + status gauge (globals §19) | Prefab-owned `StatusGauge` (12 segments in 3 phase groups, picker, notes). Complete / current segments use primary; "on hold" current uses a slate pattern. |
| `.archived-badge/-banner`, `.project-archived-lock` | `StateMark` (archive) + neutral `Callout icon=archive` + the `ReadOnlyScope` from P3, which now hides the kit controls |
| `custom-offer-*` | `Card` + `Field` grid; issuer = `Segmented` (controlled); positions = Prefab `ReviewGrid` (dense editable table); totals toggles = `Switch`; preview = `DescriptionList`; generate = primary with a pending label |
| material prices (reuse of `wpqr-row`, `financial-stage-two-group`, `mini-stat`, `settings-subsection`) | `ListToolbar` + `Table`; supplier upload → AI review in a `Dialog`; the calculator as a `Card` with `Input suffix` |

**Replaced:**
- 3 confirms (archive, restore, one on material prices);
- 1 `DateField` (offer date);
- AI actions carry `sparkle`.

**Needs:** M3 (`Input` prefix/suffix).

**Prefab-owned built here:** `StatusGauge`, `ReviewGrid` (first user), `Money` (§10).

**Expected:**
- the gauge in kit tones;
- the archived banner as a neutral Callout;
- the offer builder and price book in the kit look.

**Deleted:** `project-detail.css`, `offer-builder.css`, globals §19 and the archived section. About 700 lines.

### 7.4b P4.4b: Financials

**Scope:** `app/projects/[projectId]/financials/page.tsx`, `financial-workspace.tsx` (1,122) and the 9 files in `components/financial/`. About 3.7k lines.

| Legacy family | Becomes |
|---|---|
| `financial-stage-*`, `financial-sheet-*`, `financial-offer-*` | `Card` + `Kicker("Step 1/2/3")` + `Table` / `ReviewGrid`; mode switches = `Segmented` (controlled) |
| `financial-transport-*` | `Field` + `Input suffix` (kg, €, km) + `Switch` |
| `ledger-*` | `Table` with group rows and a `tfoot` grand total; collapsible groups = `Disclosure`; "edited" = `Tag`; revert = ghost `Button`; delete via `RowMenu`; locked = lock `Callout` + `ReadOnlyScope` |
| `invoice-meta-*` | inline `DescriptionList` |
| `commercial-board/-stat` | `StatTile` |
| `financial-module-card/-locked`, `financial-generated` | `Card`, lock `Callout`, `FileLink` |
| material-cost review modal | `Sheet` (large review) |
| 7 `<details>` | `Disclosure` |

**Replaced:** 6 confirms, 1 modal (`material-cost-review-modal`). `fetchSafely` stays untouched (15 calls in this file).

**Needs:** M3.

**Expected:**
- worksheets, ledger and invoice in the kit look;
- amounts through `Money`.

**Deleted:** `financials.css` (≈ 1,270 rule lines) and the financial rules in globals.

### 7.5 P4.5: Welding, WPQR, WPS (the Settings Welding tab)

**Scope:** `wpqr-library-panel.tsx` (607), `wps-library-panel.tsx` (305), `wps-parameter-defaults-panel.tsx` (417), `wps-form.tsx` (372). About 1.7k lines.

The welding blocks inside the documentation page (welding section, WPS section, welder picker) migrate with that page in 7.6a. This keeps islands as leaves (§5.3).

| Legacy family | Becomes |
|---|---|
| `wpqr-list/-row` | `Table` + `RowMenu` (archive, delete) + `FileLink` (PDF) |
| `wpqr-form`, `wpqr-checkbox`, `wps-form` | `Dialog presentation="sheet"` + `Field` grid + `CheckTile` |
| `wps-layer(s)` | `ReviewGrid` (dense editable layers) |
| tab-strip fade | kit `Tabs` (done in 7.3) |

**Replaced:** 3 confirms, 3 modal files, 2 `DateField`s.

**Expected:** the libraries in the kit look. **`/settings` switches to the kit canvas.**

**Deleted:** the `wpqr-*` / `wps-*` rules of `welding.css` and the rest of the settings rules.

### 7.6a P4.6a: Documentation pipeline (stages and engineering review)

**Scope:**
- the documentation page (251 lines);
- the panels: `documentation-inputs-panel`, `-production-pack-panel`, `-completion-panel` (702), `-finalize-panel`, `-review-panel` (the entry card), `-engineering-review-panel`;
- `components/documentation/`: `file-widget`, `completion-block`, `material-section`, `ndt-section`, `shared-certificate-list`, `welding-section`, `wps-section`, `project-welder-picker`;
- the engineering-review page with `project-pre-offer-review-section.tsx` and `pre-offer-email-composer.tsx`.

About 4.0k lines.

| Legacy family | Becomes |
|---|---|
| `doc-stage-*`, `documentation-progress-hero`, `doc-progress-*` | Prefab-owned `PipelineStepper` (4 stages, anchors, complete/current; "n of 4" as a `Tag`) |
| `documentation-stage-card/-header/-footer`, active-stage highlight | `Card` + `CardHeader` + an action row; the highlight is a ring utility |
| `documentation-file-widget/-drawings-*/-upload-button/-completion-file-*`, `production-pack-files-row` | Prefab-owned `FileWidget`: `FileInput`, `FileLink`, `IconButton`, `RowMenu`, a pending label; stale and partial states as `Callout` / `Tag` |
| `documentation-partial-*`, `-stale-hint`, `-extraction-note`, `wd-issues` | `Callout` (warning / info) or `Tag` |
| `stage-spinner` | the pending label + disabled state (no spinner) |
| `documentation-completion-*`, `CompletionBlock`, `ModeToggle` | `Card`, `Kicker`, `DescriptionList`, `DateInput`, `YearInput`, `Segmented` (generated / upload mode) |
| `documentation-welder*`, `documentation-wps*`, `wd-mode-row/-tab`, `wd-wps-pill`, `wd-step` | Prefab-owned `WelderPicker` (kit `Combobox` with validity meta lines), `Tag`, `ValidityNote`, `Segmented`, `Card` |
| `pre-offer-*`, `documentation-engineering-*` | Prefab-owned `FindingsList`: rows with `Badge` + `StatusIcon` (problem / question / info) and a `Checkbox`; the bulk bar is a sticky action row. The RFI composer is a `Dialog` with the WFO "Copy / Open in Mail" idiom. |

**Replaced:**
- 3 confirms;
- 3 modal files (inputs merge/copy, welder picker, e-mail composer);
- 2 `DateField`s + `YearField` (completion, welding section);
- 4 `<details>`.

The documentation page keeps the legacy canvas until 7.7, because the calculations section is still legacy.

**Needs:** M2 (`sparkle`, `mail`, `IconButton`), M3 (`YearInput`).

**Expected:**
- the stepper and stage panels in the kit look;
- file rows with icon buttons;
- findings with status glyphs.

**Deleted:** the documentation half of `documentation.css` (≈ 662), `pre-offer-review.css`, the rest of `welding.css`, and globals §24/§25 except the material / item-info base rules.

### 7.6b P4.6b: Review workspaces (the riskiest area)

**Scope:**
- the drawing review page with `documentation-review-workspace.tsx` (1,174);
- `review-header`, `general-info-stage`, `materials-stage`, `welds-stage`, `fabrication-info-stage`, `cut-list-stage`, `copy-review-picker`;
- material review (`material-review-workspace.tsx`, 765) and item-info review (417).

About 3.4k lines.

| Legacy family | Becomes |
|---|---|
| `documentation-review-*`, `review-preview/-frame`, `review-empty` | Prefab-owned `ReviewSplitView`: the PDF `<iframe>` on fine pointers, an "Open drawing" `Card` on touch, the editor pane beside it |
| `review-stage(-tab)` | `Segmented` (controlled) |
| `review-page/-pager` | `Button`s + a `Tag` ("2 / 4") |
| `review-field(-unit)`, `review-inline`, `review-record`, `review-material`, `review-table`, `review-row`, `review-add/-remove`, cut-list rows | `ReviewGrid` + `Field` + `Input suffix` + `IconButton` |
| `review-footer(-*)`, `documentation-review-actions-footer` | a sticky action bar at `bottom: calc(var(--tab-bar-h) + var(--safe-bottom))` on phones; commit with a pending label; "Unsaved changes" as a `Tag` |
| `review-ai-menu(-*)`, `review-clear-unreviewed-sibling` | `RowMenu` with a label `trigger` and `sections` (M3) |
| `copy-review-picker*` | `Dialog` + `SearchInput` + radio `CheckTile`s |
| `mat-review-*` | per designation: a `Disclosure` card, `Tag` (drawings), `Input`, apply-to-all as a `Card` |
| `item-info-*`, `item-info-col-*` | `ReviewGrid` with apply-to-all `Button sm` in the `TH` and a sticky first column |

**Replaced:** 7 confirms, the copy-review overlay, 5 `<details>`.

**Extra G4 checks:**
- the PDF renders (captured with `channel: 'chromium'`);
- the unsaved-changes guard on browser Back, on a link click and on tab close;
- the sticky footer at 375, above the tab bar and with the keyboard open;
- keyboard editing across grid cells;
- the AI menu opening upward on the last row.

**Needs:** M3.

**Expected:** the whole review experience in the kit look. The breakpoint is now 1024 instead of 960 / 1200: the split view stacks below `lg`; this is reviewed at 1024 and 820.

**Deleted:** `drawing-review.css`, `material-review.css`, globals §26 and the rest of §25. About 1,850 lines.

### 7.7 P4.7: Calculations

**Scope:** `project-calculations-section.tsx` (193): the file row, generate, and the diagnostics `<details>` → `Disclosure`.

The documentation page **switches to the kit canvas**.

**Deleted:** the `calc-*` rules.

This is small. It follows the suite order, and it may be merged the same day as 7.6b.

### 7.8 P4.8: Workshop portal (last)

**Scope:**
- `app/workshop/*` (layout, pages, error, loading, not-found);
- `workshop-shell.tsx`, `workshop-login-form.tsx`, `workshop-project-list.tsx`, `workshop-project-form.tsx` (1,145), `workshop-sign-out-button.tsx`.

About 1.6k lines.

| Legacy family | Becomes |
|---|---|
| `workshop-shell/-topbar/-brand/-main/-footer` | Prefab-owned `WorkshopShell` (brand, worker name, sign out) on the kit canvas |
| `workshop-login`, `workshop-passcode-field` | `Card` + `Field` (`inputMode="numeric"`) + `Button size="lg"` |
| `workshop-list/-row/-search/-filters` + `list-*` overrides | `ListToolbar` + `Table/RowLink` with big rows (`size="lg"`) |
| `workshop-card/-details/-activity/-updates/-hint/-state` | `Card`, `Disclosure`, `DescriptionList`, `EmptyState`, `Callout` |
| `documentation-completion-*` overrides (upload rows) | `FileWidget` (from 7.6a) at `size="lg"` |
| `workshop-skeleton` | `Skeleton` |

**Replaced:** 2 confirms, 2 date fields (`DateInput` / `YearInput` at `lg`), 2 `<details>`.

Every control is `size="lg"` (48px, 16px text) at every width, matching the portal's house rule.

**Gate adds 820-touch** (tablets) as a gated width.

**Deleted:**
- `workshop.css`, the shared `list-*` (its last user), `date-field.tsx` + `date-picker.css` + `lib/date-picker.ts` (+ its tests, if nothing else imports it);
- whatever shared families §15 shows as having no users left.

---

## 8. P5: Finish

1. **The global reset.** Import `tailwindcss/preflight.css` into `layer(base)`. Remove `preflight-scoped.css` from `app.css`, and delete `ops-ui-root.css`, `legacy-canvas.css`, `legacy-classes.json` and the `IslandGuard`.
2. **Remove islands and canvas.** A codemod removes the `OpsIsland` wrappers (`rg OpsIsland` = 0) and the `canvas` prop.
3. **Remove the coexistence scaffolding:**
   - the `legacy` layer, which must be empty by now;
   - `globals.css` and any remaining legacy sheet;
   - the §5.5 `--ops-z-*` overrides, re-tuning the Prefab shell's own z-values below the kit's;
   - `source(none)` and the per-area `@source` lines, so scanning becomes automatic (the four `@source not` lines of library spec §8.4 stay).
4. **Delete the old helpers:** `use-body-scroll-lock.ts`, `use-dialog-focus.ts`, `icons.tsx`, `download-icon.tsx`.
5. **Guard tests** (in `apps/web/src/components/ui/restyle-guards.test.ts`):
   - no legacy class name from the frozen list appears in `src/**/*.tsx`;
   - no `window.confirm` / `confirm(`;
   - no `modal-backdrop`;
   - no `DateField` / `YearField`;
   - no raw colour literals outside `brand.css`;
   - no `--legacy-`.
6. **CLAUDE.md final text** (§11.3). Update the plan's progress table and the "Current state" section.
7. **Record the CSS weight** that PrefabOps ships before (P0 baseline) and after. This is informational, not a gate.

**Gate:** G1–G5 on every route and state. The Expected diff is the preflight swap only, where a Prefab-owned component relied on legacy element defaults; each such case is fixed in the same branch.

---

## 9. How the cross-cutting systems map

### 9.1 Notifications (`useNotify` → kit toast), in P3

| Prefab today | After P3 |
|---|---|
| `notify.error(text)`: stays until dismissed **or the route changes** | `pushToast(text, "danger")`; the adapter records the ids it raised and dismisses them on the next pathname change. Errors raised by kit components (a `Field`) follow the kit rule instead (cleared by whatever raised them). |
| `notify.success(text)`: 6 s, paused on hover | `pushToast(text, "success")`: fades after 6 s (kit timing) |
| `notify.info(text)`: 6 s | `pushToast(text, "info")`: **stays until dismissed** (3 calls; D7) |
| label words "Attention / Updated / Notice" | glyph only (`problem` / `check` / `info`) |
| max 4 (2 on phones); the same text restarts its clock | kit: max 4; the same message replaces the earlier one |
| phones: above the tab bar; moves to the top while a sheet or the keyboard is open | above the tab bar (`--ops-toast-offset`); inside an open kit `Dialog` the stack is drawn inside it, at the top of the sheet on phones (M2 `presentation="sheet"`); above legacy sheets through `--ops-z-toast` |
| `FloatingPromptBridge` | deleted (used only by a test) |

`fetchSafely` and the "notifications, never inline alerts" rule are unchanged: the kit toast *is* that rule.

### 9.2 Modals and confirms

- **Hand-rolled modals (16 files)** become `Dialog presentation="sheet"` for forms and pickers, and `Sheet` for the large material-cost review.
- **The 26 confirm prompts** become `ConfirmDialog`, or `InlineConfirm` when the prompt comes from inside an open dialog.
- **`useBodyScrollLock` and `useDialogFocus` retire.** Native `<dialog>` does both.
- **Busy dialogs:** "Escape closes unless busy" becomes ✕ only, with the busy state shown as the `DialogFooter` `pending` label (D6).

| File | Area | Kit target |
|---|---|---|
| `app-shell.tsx` (filter-sheet class reuse) | 7.1 / 7.2 | rebuilt as the `ListToolbar` phone filter `Dialog` |
| `project-manager.tsx` (New project) | 7.3 | Dialog |
| `project-detail-controls.tsx` (Edit) | 7.3 | Dialog |
| `client-manager.tsx`, `client-detail-manager.tsx` | 7.3 | Dialog |
| `client-handover-composer.tsx` | 7.3 | Dialog |
| `employee-list-manager.tsx`, `employee-detail-manager.tsx` (edit, rate) | 7.3 | Dialog |
| `financial/material-cost-review-modal.tsx` | 7.4b | Sheet |
| `wpqr-library-panel.tsx`, `wps-library-panel.tsx`, `wps-parameter-defaults-panel.tsx` | 7.5 | Dialog |
| `documentation-inputs-panel.tsx`, `documentation/project-welder-picker.tsx`, `pre-offer-email-composer.tsx` | 7.6a | Dialog |
| `date-field.tsx` (the picker sheet) | 7.8 (deleted with its last user) | `DateInput`'s own calendar |

Confirms per area (26 in total): 7.2 → 1, 7.3 → 1, 7.4a → 3, 7.4b → 6, 7.5 → 3, 7.6a → 3, 7.6b → 7, 7.8 → 2.

**Rules while legacy and kit coexist:**
- A kit `Dialog` never hosts a legacy widget (§5.3).
- A kit `ConfirmDialog` may be opened from a legacy page or a legacy sheet; it is top layer.
- Every hand-built Cancel inside a kit `Dialog` carries `data-ops-dismiss` from day one, so library 2.0's marker-based discard guard is a no-op for PrefabOps.

### 9.3 Shell

- **Kept:** the `AppShell` component API (19 call sites untouched).
- **Rebuilt:** its internals, as Prefab-owned `Sidebar`, `TabBar`, the More page and `HeaderFacts`, around the kit's `PageHeader`, `BackLink`, `NavTrail` and `AppSwitcher` (§7.1).
- **Prefab-owned, restyled:** pull-to-search, the soft-keyboard tab-bar hide and immersive mode.
- **Dark mode** goes.
- **Content edges** keep `var(--page-gutter)` plus the safe areas.
- **`WorkshopShell`** is separate (7.8).

### 9.4 Date picker

| Today | After |
|---|---|
| `DateField`: an input-styled button showing "24 Sept 2026", opening a calendar sheet; hidden ISO proxy input; min / max; weekend marks | kit `DateInput`: typed DD-MM-YYYY (dots, slashes, 6–8 digits, pasted ISO), a fixed calendar (days → months → years), Today / Clear, `inputMode="none"` on coarse pointers (tap = calendar), hidden ISO input under `name` |
| `onChange(iso)` | `onChange={(e) => …(e.target.value)}`: a one-line change at each of the 16 sites |
| `YearField` (2 files): a year grid | kit `YearInput` (M3) |
| weekend marks | dropped (the kit calendar has none; nothing depends on them) |

Conversion happens per area (§9.2 counts). A migrated dialog converts its date fields in the same change (§5.3). The kit's `DateInput` guard test (no native `type="date"`) is adopted at P5.

### 9.5 Command palette

Stays **Prefab-owned** (library spec §2).
- **Kept:** ⌘/Ctrl-K, switched off on `/workshop`; the static destinations plus `/api/search` groups; a failed search raises `notify.error`.
- **Rebuilt at 7.1** in the WFO palette idiom:
  - its own overlay (not the kit `Dialog`), where Esc and a backdrop click close it;
  - a full-screen sheet on phones;
  - a kit `SearchIcon` inside the input;
  - rows select on real pointer movement only (the WFO `pointerMoved` fix of 2026-09-29, so the selection never jumps under a resting cursor);
  - a keycap hint (⌘ K on Apple, Ctrl K elsewhere).
- **Stacking:** z 1200 while legacy sheets exist. It does not open while a `dialog[open]` exists.

### 9.6 Project status palette (G15, D10)

`src/lib/project-status-meta.ts` (Prefab-owned) holds label, kit `Badge` variant and `StatusIcon` for each status. The kit tone doctrine:
- `success` = live;
- `info` = planned, standing by or in flight;
- `warning` = needs a decision;
- `danger` = wrong now (no project status is);
- `neutral` = not live.

| Status | Tone | Glyph | Phase (position, not colour) |
|---|---|---|---|
| draft | neutral | draft | Pre-production |
| offer_sent | info | send | Pre-production |
| confirmed | info | check | Pre-production |
| material_ordered | info | clock | Pre-production |
| material_supplied | info | check | Production |
| in_production | success | current | Production |
| production_on_hold | neutral | inactive (paused slate) | Production |
| ready_for_shipment | info | check | Production |
| shipped | info | send | Post-production |
| delivered | info | check | Post-production |
| invoiced | info | clock | Post-production |
| paid | neutral | ended | Post-production |

The dashboard's "Needs attention" rows keep their current logic. The reason is an attention line (amber for due, red for wrong now), never a recoloured pill. A unit test pins the table.

### 9.7 Buttons and icons

**Buttons:**

| Legacy | Kit |
|---|---|
| `.primary-button` (24 uses) | `Button variant="primary"` (≤ 1 per block) |
| `.secondary-button` (122) | `Button variant="secondary"` |
| `.secondary-button-quiet` (66) | `Button variant="ghost"` |
| `.secondary-button-link` (14) | `ButtonLink ghost`, or a plain `Link` with the kit link classes |
| `.action-button` (41) | D11 |
| `.danger-button` (3) | `danger` / `ghostDanger` |
| `.icon-button`, `.documentation-drawings-download` (20), `.review-row-remove`, `.mat-review-icon-button` | `IconButton` (M2); file opens → `FileLink` |

**Icons** (`icons.tsx` → `ActionIcon`):
- **Same meaning, kit name:** save, add, delete, edit, copy, upload, refresh, archive, restore, unlock, calendar.
- **Renamed:**
  - Clear → close;
  - ChevronLeft/Right / Next → back / forward;
  - SignIn / SignOut → enter / exit;
  - Open → view;
  - People → user;
  - Download → download;
  - Browse → upload;
  - Share → link;
  - Issue → send.
- **New in M2:** Sparkle / Wand → `sparkle`; Mail → `mail`.
- **Nav glyphs** stay Prefab-owned (`NavIcon`).
- **Status marks** (stage checks, gauge dots) use `StatusIcon`.
- **Where they render:** library 1.0 turns `ActionIcon` on everywhere by default, so icons render on every PrefabOps route.

### 9.8 Brand (`src/app/brand.css`, from P2; D3 *(default)*)

```css
/* PrefabOps brand for @latro/ops-ui. Plain :root variables only - never @theme in this file. */
:root {
  --brand-sidebar: oklch(0.968 0.004 257);           /* #f3f5f7, light sidebar */
  --brand-sidebar-fg: oklch(0.42 0.02 257);          /* 7.71:1 on the sidebar */
  --brand-sidebar-fg-active: oklch(0.21 0.012 257);
  --brand-sidebar-hover: oklch(0.935 0.008 257);
  --brand-sidebar-active: oklch(0.915 0.03 257);     /* active item: 13.78:1 */
  --brand-sidebar-border: oklch(0.9 0.006 257);
  --brand-primary: oklch(0.53 0.185 257);            /* #0667d3 = Prefab blue; white text 5.40:1 */
  --brand-primary-hover: oklch(0.477 0.171 257);     /* #0058ba; 7.20:1 */
  --brand-primary-subtle: oklch(0.95 0.022 257);
  --brand-accent: oklch(0.6 0.13 45);                /* copper #be6438; 4.15:1 on white */
  --brand-surface: oklch(0.975 0.003 257);
  --brand-surface-raised: oklch(0.955 0.005 257);
  --brand-border: oklch(0.9 0.006 257);
  --brand-border-strong: oklch(0.8 0.01 257);
  --brand-ink: oklch(0.21 0.012 257);                /* 17.71:1 on white */
  --brand-ink-secondary: oklch(0.42 0.018 257);
  --brand-ink-muted: oklch(0.52 0.018 257);          /* 5.12:1 on surface */
}
```

**Contract checks (library spec §8.5):**
- all 10 required variables are present;
- the tint stays within ±0.01 lightness of the defaults, with chroma ≤ 0.025;
- success uses the defaults.

**Kept from today:** the phone toast offset is set in `app.css` (P3), not here.

**Other places the palette appears:**
- the library gallery's `prefab` fixture takes these values;
- `themeColor` becomes `#f3f5f7`;
- `OPS_APPS` uses `#0667d3` for PrefabOps (§16).

A different palette later is a `brand.css` edit, checked by the same contract.

---

## 10. Gaps and how each is handled

### 10.1 The list

A gap becomes a **library component** when it is a primitive whose interaction, accessibility, touch or stacking contract the kit should own, and that another app could plausibly use. It becomes **Prefab-owned** when it is a composite or a Prefab idiom (§5.8 rules, with a promotion path). Otherwise it is handled by **convention** or **dropped**.

| # | Gap | Handling | Where / when |
|---|---|---|---|
| G1 | Dark theme | **Dropped** (D4) | 7.1 |
| G2 | Touch floor (44px, 16px inputs on coarse pointers) and a large size (48px) | **Library M2:** opt-in `[data-ops-touch]` floor on Button / Input / Select / Combobox / DateInput / Segmented / RowMenu / IconButton; `size="lg"` | 7.1 (floor), 7.8 (`lg`) |
| G3 | Bottom-sheet dialogs on phones, with a sticky safe-area footer | **Library M2:** `Dialog presentation="sheet"` (full width, rounded top, sticky footer with `env(safe-area-inset-bottom)`; toast host at the top of the sheet on phones) | 7.2 |
| G4 | Icon-only button | **Library M2:** `IconButton` (required `label` → `aria-label` + `title`; square at `sm` / `md` / `lg`; honours the touch floor) | 7.2 |
| G5 | Spinner / pending state | **Convention:** the `pending` label + disabled (`DialogFooter pending`, `Button disabled` with "Generating…"). This is already Prefab's rule ("progress lives in the triggering button's label"). No spinner component. | every area |
| G6 | Progress bar, steps | **Prefab-owned** `ProgressBar`, `PipelineStepper`, `PipelineMarkers`, `StatusGauge` | 7.2, 7.4a, 7.6a |
| G7 | Disclosure / accordion (19 `<details>` in 11 files) | **Prefab-owned** `Disclosure` on native `<details>` (summary row, chevron, count) | 7.4b onwards |
| G8 | Menu with a label trigger and sections | **Library M3:** `RowMenu` gains an optional `trigger` (label button) and `sections`, keeping its hard-won fixed positioning, flip and follow-scroll. Register filter menus are not needed: D13 uses selects. | 7.6b |
| G9 | Skeleton | **Prefab-owned** `Skeleton` (token blocks, `motion-safe:animate-pulse`) | 7.1, 7.8 |
| G10 | Input adornments (mm, bar, °C, kg, €, %) | **Library M3:** `Input` `prefix` / `suffix` (useful to FinaOps amounts and WFO rates too) | 7.4a |
| G11 | Stat tile | **Prefab-owned** `StatTile` (label, value, sub line, tone). Promotion candidate. | 7.2 |
| G12 | Dense editable table; tabs driven by client state | **Prefab-owned** `ReviewGrid` (kit `Table` + `Input` sized with `h-8` cells, numbers right-aligned, a sticky first column); state tabs = kit `Segmented` in controlled mode (exists) | 7.4a, 7.5, 7.6b |
| G13 | Year picker; money | **Library M3** `YearInput`; **Prefab-owned** `Money` (Prefab's formatting, hand-formatted like FinaOps to avoid ICU drift between Node and the browser) | 7.6a; 7.4a |
| G14 | Record list toolbar | **Prefab-owned** `ListToolbar` following the WFO idiom (D13) | 7.2 |
| G15 | 12 project statuses coloured by phase | **Prefab-owned** `project-status-meta.ts` onto kit tones (§9.6) | 7.2 |
| G16 | Kit imports app code; icons gated by route | **Done by library 1.0:** `OpsUiProvider`, `ReadOnlyScope`, `ActionIconScope` on by default | P2–P3 |
| G17 | Missing glyphs | **Library M2:** `ActionIcon` `sparkle`, `mail`; Browse / Share / Issue map to existing glyphs (§9.7) | 7.3 |
| G18 | *(new)* Stacking against legacy layers | **Library M1:** `--ops-z-toast/-calendar/-menu/-sheet` with today's defaults (§5.5) | P3 |
| G19 | *(new)* Scoped preflight during coexistence | **Library M1:** `styles/preflight-scoped.css` (library spec §13.2) | P2 |
| G20 | *(new)* Rich header facts (`.page-meta-row`) | **Prefab-owned** `HeaderFacts` under the kit `PageHeader`; no library change (the kit's `description` stays a short string) | 7.1 |
| G21 | *(new)* Capture needs (PDF iframes, profiles, states, element mode) | **Library `tools/` only:** no release (§4.5) | R0 |
| — | Shell, sidebar, tab bar, More page, pull-to-search, palette, kanban, file widget, review split view, financial worksheets, welder picker, findings list, workshop shell | **Prefab-owned composites** (library spec §2 non-goals) | per area |

### 10.2 Library minors, batched

Each minor is additive, with **0 changed pixels on every existing gallery baseline**, and needs no action from WFO or FinaOps: they sync whenever they like. Version numbers assume 1.1.0 is the AppSwitcher / ValidityCell release. If another minor lands in between, the numbers shift and the content stays the same.

| Minor | Content | Needed before |
|---|---|---|
| **M1 = 1.2.0** | `styles/preflight-scoped.css`; stacking variables `--ops-z-*` (G18) | P2 (sync), P3 (stacking) |
| **M2 = 1.3.0** | `[data-ops-touch]` coarse floor + `size="lg"` (G2); `Dialog presentation="sheet"` (G3); `IconButton` (G4); `ActionIcon` `sparkle`, `mail` (G17) | P4.1 |
| **M3 = 1.4.0** | `Input` prefix / suffix (G10); `YearInput` (G13); `RowMenu` `trigger` + `sections` (G8) | P4.4a |

**PrefabOps and library 2.0.** PrefabOps takes 2.0 (the batched visible fixes) whenever it lands. Because every hand-built Cancel inside a Dialog already carries `data-ops-dismiss` (§9.2) and PrefabOps uses no `MonthNav`, its 2.0 upgrade steps are expected to be empty.

---

## 11. Prefab's CLAUDE.md house rules

### 11.1 When they change

| Step | Change |
|---|---|
| R0 | Environment: the local stack, and the pointer to `dev/local/README.md` instead of the page harness |
| P0 | "middleware" wording → "proxy" |
| P1 | `--color-fill` → `--legacy-color-fill` in the mobile paragraph |
| P2 | a one-paragraph interim note (§6 P2 item 8); the legacy rules still apply |
| P3 | Notifications paragraph: "`useNotify()` is a thin adapter over the kit toast; errors stay until dismissed or the page changes, success fades after 6 s, info stays until dismissed" |
| **P4.1** | **The design-vocabulary rule and the mobile rules are replaced (§11.2) in the same merge**, the first migrated area, as the suite spec requires |
| each area | the "Migrated areas" line lists the new area |
| P5 | final text (§11.3); the coexistence sentences go |

### 11.2 Replacement text at P4.1 (coexistence)

> **UI kit (`@latro/ops-ui`), restyle in progress (plan `docs/superpowers/plans/2026-09-30-prefab-restyle.md`).**
> - New and changed UI uses the kit through `@/components/ui/*`: Button, IconButton, Dialog, Sheet, ConfirmDialog, Field, DateInput, YearInput, Combobox, Table, Tabs, Segmented, Callout, Badge / StatusIcon, Tag, RowMenu, PageHeader, EmptyState…
> - It also uses the Prefab composites in `src/components/prefab-ui/*` and the area folders.
> - Styling is Tailwind utilities on kit tokens only: no new CSS files, no class namespaces, no raw colours, no `--legacy-*`. The doctrine is `src/vendor/ops-ui/DESIGN.md`. Brand colours live in `src/app/brand.css`.
> - `src/vendor/ops-ui` is GENERATED by `scripts/sync-ops-ui.mjs`; never edit it (the vendor test fails). A kit change goes: ops-ui PR → release → sync on a branch → gates → merge.
>
> **Migrated areas:** shell and navigation. In an area not listed, small fixes keep the legacy vocabulary (`.detail-card`, …); larger work migrates the area first.
>
> **Islands.** A kit subtree sits inside `OpsIsland`. Legacy markup never sits inside one (the island guard fails captures). A kit Dialog never contains a legacy widget.
>
> **Mobile and touch.**
> - Tailwind breakpoints: sm 640 / md 768 / lg 1024 / xl 1280. The phone layout is below `md`.
> - `<html data-ops-touch>` keeps every control ≥ 44px and every text input ≥ 16px on coarse pointers. The workshop portal uses `size="lg"` (48px) at every width.
> - Dialogs use `presentation="sheet"`: a bottom sheet on phones with a sticky footer, closed with ✕. A hand-built Cancel carries `data-ops-dismiss`.
> - Sticky bottom bars sit at `bottom: calc(var(--tab-bar-h, 64px) + var(--safe-bottom))`. Content edges use `var(--page-gutter)` plus the safe areas.
>
> **Page language (kept):**
> - a card never contains a bordered card;
> - list and tile kickers and titles sit outside the card;
> - page descriptions are ≤ 8 words or none;
> - empty states describe the emptiness and never repeat the page's create button;
> - one primary per block.
>
> **Verify.** Capture every changed route with `tools/app-shots.mjs` against the local stack (`dev/local/README.md`), before (main) and after (branch), at 1440, 375 and 375-touch.

The "Notifications, never inline alerts" paragraph stays, with the P3 wording. The `fetchSafely` sentence stays.

### 11.3 Final text at P5

This is the same as §11.2 with the lines on migrated areas, islands and legacy removed. The "Current state" list gains: "✅ Restyle onto `@latro/ops-ui` (2026-…): one kit with Workforce Ops and FinaOps, light only, Prefab palette in `brand.css`."

The house rule "Work directly on `main`" stays. Restyle steps use short branches because the approved suite spec asks for "a branch per change". The rule is not changed for other work.

---

## 12. Branch strategy

**Recommendation: one short-lived branch per step (R0, P0, P1, P2, P3, each area, P5), merged `--no-ff` into `main` right after its gates pass. No feature flag and no long-lived integration branch.**

Why not one long-lived restyle branch merged at the end:
1. **Coexistence is proven safe at every step.** Legacy screens show 0 changed pixels outside the migrated area, so a partial state is safe in production.
2. **Drift and conflicts.** PrefabOps is actively developed (security, fabrication, integration). A branch that lives for weeks would conflict across 13.8k CSS lines and ~70 components, and its rebases would silently undo other sessions' work.
3. **One cause per regression.** A big-bang merge cannot tell which of 10 areas broke something; a per-area merge can, and rollback is `git revert -m 1 <merge>`.
4. **Early feedback.** Saša sees the frame, the palette and the status mapping at P4.1 / P4.2 and can overrule a default before 70 components depend on it.
5. **House rule.** PrefabOps lives on `main`.

Why not a feature flag: two CSS systems switched at runtime would double the states to verify, and the flag would outlive its use. The islands already make the migration incremental.

**Cost, accepted:** production shows two looks for the length of the programme (a kit frame around legacy pages until each area migrates). The shell-first order gives users one consistent frame from P4.1 on. Saša can tell the office users what changes at P4.1 (light only, typed dates, ✕ closes dialogs, info messages stay).

**Mechanics:**
- **Worktree:** `../prefab-restyle` (§4.5).
- **Branch names:** `restyle/<step>-<area>`, or `claude/restyle-<step>-<area>` where the session proxy requires it.
- **Commit identity** `Saša Vinčić <77722684+sasavincic@users.noreply.github.com>` (the Vercel team's author check), plus the session's Co-Authored-By trailer.
- **Before merging:** rebase onto `main`, re-run G1 and a G2 capture of the area.
- **After merging:** G5, then update §15.
- **Coordination with parallel sessions:**
  - the §15 progress table marks the area "in migration" (C6);
  - a session touching a file in that area either waits or coordinates;
  - small legacy fixes in unmigrated areas are fine (D15);
  - the restyle rebases over them.
- **If a step must stop halfway:** it is not merged. The last merged step is always a complete, gated state.

---

## 13. Gates and acceptance criteria

### 13.1 Gates (library spec §12.0, applied to PrefabOps)

| Gate | For PrefabOps |
|---|---|
| **G1 code** | `cd apps/web && npx tsc --noEmit && npm test && npm run build`; from P2, the vendor test; from P3, the adapter tests; from P4.1, the colour-literal test; per area, its component tests |
| **G2 pixels** | `tools/app-shots.mjs capture` on main (:3201) and on the branch (:3200), then `compare`. Scope: all §4.6 routes plus the states. Widths: 1440 / 375 / 375-touch (and light + dark up to P3). **0 changed pixels outside the step's Expected list.** The island guard is clean. P4.1 uses the element capture (§7.1). |
| **G3 tokens** | `tokens.json` identical, except P1's rename (same values under new names), P2 (the kit tokens appear), and the steps that remove legacy tokens (the removed names are listed) |
| **G4 by hand** | The library spec §12.0 list, applied where the step has the control (Dialog cancel + discard prompt + ✕; error toast stays, success fades; DateInput typing and calendar; Combobox reverse-word query + Enter; RowMenu on the last row opens upward; Segmented at 375; Sheet exit check; the archived project shows no kit controls). Plus each area's own list (§7) and a check at 820-touch. |
| **G5 production** | The Vercel production deployment of the merge commit is READY. On production: sign in (with MFA), open one migrated dialog, raise one toast, open one legacy page. From 7.8: one workshop login on a tablet. Read-only: nothing is created or changed for the check. |

### 13.2 Per-step acceptance (definition of done)

A step is done when all of these hold:
- **G1–G5 pass.**
- **The PR lists** its Expected changes, what it replaced, what CSS it deleted, the Prefab-owned components it added and the fixtures it added.
- **§15 is updated.**
- **No horizontal overflow at 375** on any route in scope.
- **Coarse-pointer targets** in scope are ≥ 44px (from P4.1; 48px in 7.8).
- **No new console errors** in captures.
- **The CSP report endpoint** (security tranche) shows no new violation type after the deploy. Kit positioning uses inline `style` attributes, which is noted for the CSP enforcement step (risk R16).

### 13.3 Programme acceptance (the restyle is finished when)

1. **Stylesheets:** none of the 17 legacy stylesheets remain.
   - `app.css` holds only the Tailwind imports, the vendor styles, `brand.css`, the Prefab layout variables and at most a few Prefab-owned non-utility rules (keyframes, print), each with a one-line reason.
   - There is no `legacy` layer, no island, no canvas prop.
2. **P5 guard tests pass:**
   - no legacy class names;
   - no `confirm(`;
   - no `modal-backdrop`;
   - no `DateField` / `YearField`;
   - no raw colours outside `brand.css`;
   - no `--legacy-`.
3. **Library checks:** `checkVendor` is ok on a released, non-dev version, and the bridge test passes (`OpsUiProvider` defaults; `ReadOnlyScope` hides kit Buttons on the archived project).
4. **Behaviour parity:**
   - all 263 `useNotify` calls still notify;
   - every former confirm asks before acting;
   - every former modal opens, validates, saves and closes;
   - date entry works everywhere;
   - the workshop portal works at 820-touch and 375-touch;
   - the drawing review shows the PDF, and the unsaved-changes guard holds.
5. **Visual:** every route and state has been reviewed in the kit look at 1440, 1024, 820-touch, 375 and 375-touch.
6. **Records:** every merge's production deploy was READY, and no downtime occurred.
7. **Docs:** CLAUDE.md has the final rules (§11.3), and the plan and progress table are complete.

---

## 14. Risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | Legacy CSS unstyles kit components (unlayered resets win) | Legacy in the lowest layer, a scoped preflight, `ops-ui-root.css` (§5.1, §5.3); `/dev/kit` in every capture |
| R2 | Token name collisions (`--color-accent`, `-bg`, `-surface`, `-border(-strong)`, `-success/-warning/-danger`, `--radius-*`, `--shadow-*`) | The P1 rename, gated by `rg` and 0 changed pixels, before any kit CSS exists |
| R3 | Legacy markup inside an island loses its styling | The island rule plus `IslandGuard`; migration by whole subtree |
| R4 | Tailwind generates utilities that match legacy class names | `source(none)` + explicit `@source`; the collision gate at P2 and every merge |
| R5 | `!important` inverts across layers | The 5 are listed at P2: 4 are wanted (reduced motion), 1 is scoped and goes with 7.4b |
| R6 | Toasts or menus hidden behind legacy sheets and bars; legacy portals unusable inside a kit Dialog | M1 stacking variables (§5.5); no legacy widget inside a kit Dialog; palette and pull-to-search blocked while a dialog is open |
| R7 | A cascade change caused by the Next 16 bundler is mistaken for a restyle regression | P0 is its own merge, with 0 changed pixels proven, and runs ≥ 1 day before P1 |
| R8 | Parallel sessions (security, features) edit the same files | C1 first; per-area short branches; the "in migration" marker; rebase and re-capture before merging (§12) |
| R9 | The local stack is lost (container recycled, Docker Hub 429) | `dev/local/README.md` with the pull-retry loop; a reseed takes 40 s; "before" is reproducible from any commit; the harness fallback (§4.8) |
| R10 | Schema drift hides data locally (`documentation_stage`) | The R0 no-op migration, after a read-only production check |
| R11 | Fixtures miss a state, so a regression goes unseen | Per-area fixture extensions before the "before" capture (§4.4); G4 by hand; G5 on production |
| R12 | Flaky captures (time, fonts, PDF, animations) | Production builds, a fixed TZ and locale, reduced motion, same-run pairs, `channel: 'chromium'`, dev badges hidden |
| R13 | Behaviour changes surprise users (dates, Escape, info toasts, status colours, light only, Back) | All decided (D4–D12); each lands in its named step with its Expected change listed; Saša briefs the office at P4.1 |
| R14 | Breakpoints change: 960/1200 → 1024/1280, so tablets and small laptops get different layouts | 1024 and 820-touch review captures in every area; gated at 7.8 |
| R15 | Old workshop tablets can't render OKLCH / Tailwind v4 / Next 16 | C5: iOS ≥ 16.4 checked at P0 and updated before P2 |
| R16 | Enforcing CSP later blocks the kit's inline positioning styles | Note for security Phase 0b step 11: allow `style-src-attr 'unsafe-inline'` (or the nonce plan) before enforcing; the report-only logs are checked after every restyle merge |
| R17 | A library minor is late and blocks an area | Minors are batched early (§10.2); a `KIT-OVERRIDE until ops-ui X.Y` wrapper for emergencies (library spec §6.4); a gap can start as a Prefab-owned component and be promoted later |
| R18 | Two looks in production for weeks | The shell first (one frame), the legacy canvas keeps legacy pages whole, areas ordered by traffic (lists early) |
| R19 | The drawing review regresses (iframe, sticky footer, unsaved guard, keyboard) | Its own step (7.6b) late in the order, with extra G4 checks, the Chromium channel for the PDF, and a review at 1024 and 820 |
| R20 | Dark-mode users are surprised | Expected change at P4.1 (the system-dark default goes); `themeColor` light |
| R21 | Font change (Geist) shifts text metrics and wrapping | Geist is used only inside islands until each area migrates; legacy canvas keeps the SF stack; `latin-ext` for č š ž đ ć |
| R22 | A hand edit of `src/vendor/ops-ui` | The vendor test (lock hashes) and the CLAUDE.md rule |
| R23 | Security of the dev tooling | `/dev/kit` returns `notFound()` in production and sits behind the office proxy; `reseed.sh` refuses non-local URLs; no key is committed; nothing in R0 touches production except the read-only column check and the no-op migration |
| R24 | Downtime | None expected (§0). Source-only atomic deploys; rollback is a revert; the only auth-related change (P0.4) has its own commit and checks. |

---

## 15. Progress table (updated by every merge)

| Step | Branch | Merged (commit, date) | CSS rule lines deleted | Legacy CSS left | Shared families still in use | Notes |
|---|---|---|---:|---:|---|---|
| C1 security tranche | `claude/trusting-keller-r5bi2t` | — | — | 13,778 lines | all | in progress 2026-09-30 |
| R0 local environment | — | — | — | | | |
| P0 Next 16 | — | — | — | | | |
| P1 legacy tokens (+ dead CSS) | — | — | ≈ 665 | | | |
| P2 Tailwind + kit | — | — | — | | | |
| P3 notifications | — | — | ≈ 100 | | | |
| P4.1 shell & navigation | — | — | ≈ 1,000 | | | CLAUDE.md rewritten here |
| P4.2 lists & records | — | — | ≈ 1,300 | | | |
| P4.3 forms & modals | — | — | ≈ 470 | | | |
| P4.4a project, offer, prices | — | — | ≈ 700 | | | |
| P4.4b financials | — | — | ≈ 1,360 | | | |
| P4.5 welding | — | — | ≈ 350 | | | settings → kit canvas |
| P4.6a documentation stages | — | — | ≈ 1,300 | | | |
| P4.6b review workspaces | — | — | ≈ 1,850 | | | |
| P4.7 calculations | — | — | small | | | documentation → kit canvas |
| P4.8 workshop portal | — | — | ≈ 800 | | list-*, date-picker gone | 820-touch gated |
| P5 finish | — | — | remainder | 0 | none | |

The line figures are estimates from the inventory's area measurement (about 11.2k rule lines plus 665 dead). Each merge records the real number.

---

## 16. Inputs (none blocking)

1. **Palette.** The D3 default is adopted. Saša may replace it at the P4.1 review, as a `brand.css` edit checked by the contract.
2. **For library 1.1.0 (`OPS_APPS`):** PrefabOps' production URL (read from its Vercel project) and its colour `#0667d3`.
3. **R0 migration:** a read-only check of `projects.documentation_stage` in production (type, default, nullability), by the lead with approval.
4. **P0.5 Vercel settings:** Saša changes them (region, Node 22, Skew Protection), or approves a session doing it.
5. **C5:** the iOS versions of the workshop tablets, confirmed by whoever manages them.
