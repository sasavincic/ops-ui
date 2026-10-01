# One suite, one style: the styling programme for Workforce Ops, FinaOps and PrefabOps

**Status: PLAN, 2026-10-01.** Saša: "Make PrefabOps feel like it is in the same suite… organise
all styling code… redesign the app logo… adopt the record / workspace architecture… sweep the
other two apps… prepare a workflow… First plan then execute." Recommendations below are
decisions unless Saša overrules them; the few real choices are marked *(default)* and do not
block any step.

**How this relates to the earlier specs.** Two approved specs already exist in this repo:
`2026-09-30-ops-ui-library.md` (the shared kit, its vendoring, semver and gates) and
`2026-09-30-prefab-restyle.md` (PrefabOps onto the kit, steps R0, P0–P5). This plan keeps both
and their machinery. It **adds** four things they did not cover and **changes** two decisions:

| | What | Where |
|---|---|---|
| Adds | A layered style architecture with lint guards, applied to all three apps | §2, §3 |
| Adds | Shared layout/typography primitives and a shared app shell in the library | §4 |
| Adds | PrefabOps' records / workspaces / tools navigation, Dashboard removed | §6 |
| Adds | The suite logo family and PrefabOps' new mark | §7 |
| Changes | Prefab palette D3 "light sidebar" → a **dark sidebar** like its siblings (goal 1) | §7.3 |
| Decides | Library spec §12.4 open decision → **option 1** (align FinaOps, re-import, then 1.0) | §8 Phase A |

---

## 0. In plain words

Think of the suite as three restaurants owned by one family. Today each kitchen bought its own
plates, cut its own tablecloths and painted its own sign. The plan:

- **One supplier of plates** (the library `@latro/ops-ui`): buttons, dialogs, tables, the side
  menu, the page header, text styles. Each restaurant picks up a numbered delivery
  ("version 1.2") when it is ready; the supplier never walks into a kitchen.
- **Each restaurant keeps its own colour** (a 10-line `brand.css`): navy for Workforce Ops,
  forest green for FinaOps, steel blue for PrefabOps. Same plates, different tablecloth.
- **The house specialities stay in their own kitchen**: the gap grid, the wall board, the
  drawing-review workspace, the kanban. They are built from the same ingredients (colours,
  spacing, type) but are not forced into a generic plate.
- **PrefabOps moves into the family house plan**: *Workspaces* (where daily work happens),
  *Records* (the business itself), *Tools*. The Dashboard goes; its pieces move to the
  workspace where someone acts on them.
- **One family sign**: the ochre dot is the group; each app adds one line that says its trade.

What users notice: PrefabOps looks and moves like its two siblings (same menus, dialogs,
notifications, date fields, Back link, ⌘K, app switcher), its home is a workspace instead of a
dashboard, and it has a new icon. Workforce Ops and FinaOps look the same as today; their code
gets shorter and more uniform.

---

## 1. Where we are (2026-10-01)

- **The library exists and is unreleased** (`sasavincic/ops-ui`, build steps L1–L7a done):
  35 components extracted from FinaOps' kit, tokens + brand contract, sync script, gallery with
  ~600 exact screenshot baselines, release and visual-compare tools. Release 1.0.0 (L7b) waits
  on two things: the §12.4 decision (taken here) and re-importing FinaOps' `button.tsx` now that
  its security branch is on `main` (it is: 87cfdb1).
- **Workforce Ops and FinaOps** each still run their own copy of the kit (`src/components/ui`,
  34/35 files, all within mechanical diffs of the library) and their own near-identical shell
  (`components/shell/*`: `pull-to-search` and `nav-trail` byte-identical, sidebar / mobile top
  bar / command palette 60–80 % the same).
- **PrefabOps** is Next 15.5, no Tailwind, 13.8k lines of hand-written CSS in 17 files, a
  Dashboard at `/`, light/dark theme, its own modal, date and toast systems. None of the
  restyle plan's steps have started (R0 not merged).
- **Measured hygiene** (outside the kit folder):

| | Workforce Ops | FinaOps | PrefabOps |
|---|---|---|---|
| `.tsx` files | 259 | 137 | ~100 |
| `style={{…}}` | 18 | 2 | 33 |
| arbitrary Tailwind values `x-[…]` (distinct) | 140 (83) | 46 (36) | — (no Tailwind) |
| hand-written CSS lines | 187 | 194 | 13,778 |
| raw `<button>` outside the kit | 67 | 17 | everywhere |
| most repeated class string | `text-detail text-ink-secondary` ×106 | same ×45 | — |

The repeated strings are the clearest sign of a missing component: the same eight to ten
"recipes" (muted meta text, label text, wrapping toolbar row, phone-hidden table column,
quiet link) are typed out by hand hundreds of times.

---

## 2. The style architecture (all three apps)

Five layers. Each layer may use only the layers above it. A reader who wants to know "where
does this look come from" walks up the list and stops at the first hit.

```
1  TOKENS        ops-ui styles/tokens.css  +  app src/app/brand.css      colours, type scale, radii, shadows
2  KIT           ops-ui src/** (vendored to src/vendor/ops-ui)           Button, Dialog, Table, Text, Stack, Shell…
3  BINDINGS      app src/components/ui/*.tsx                             one-line re-exports + the 3 app bindings
4  PATTERNS      app src/components/<area>/*  built ONLY from 1–3        RecordListToolbar, StatusGauge, DeployDialog
5  SPECIALS      app src/components/<area>/* + an optional <area>.css    GapGrid, WallBoard, ReviewWorkspace, Kanban
```

**Rules, enforced by tests (§5):**

1. **Colours come from tokens only.** No hex / `rgb()` / `oklch()` literal in `.tsx`; only
   `brand.css` holds values. Tailwind classes name tokens (`bg-surface`, `text-ink-muted`).
2. **No arbitrary values except an allow-list.** `w-[37px]` is a smell; the allow-list holds the
   handful that are real (`max-h-[calc(100dvh-2.5rem)]`, safe-area paddings), each with a reason.
   Everything else becomes a token or a kit prop.
3. **`style={{}}` only for values computed at runtime** (a progress width, a drag transform, a
   canvas position), and then preferably as a CSS variable (`style={{"--w": pct}}` + `w-(--w)`).
4. **A class recipe used three times is a component.** The recipes in §1 become kit primitives
   (§4.1). A report (`pnpm style-report`) lists repeats; it informs, it does not fail the build.
5. **Specials may own one stylesheet** (`src/components/<area>/<area>.css`) only for what
   Tailwind cannot express (print sheets, keyframes, `@container` grids, canvas/SVG geometry),
   declared in `ops-ui.config.json` `extensions` so the sync script knows it is intended. Inside
   it, values are still `var(--token)`.
6. **No dark mode** in any app (library rule 6). PrefabOps drops its dark theme when its frame
   migrates (already decided, restyle plan D4).

**Tooling choice.** Tailwind v4 (CSS-first `@theme`) + `class-variance-authority` for variants +
`tailwind-merge` via one `cn()`. That is what both sister apps already use, it is the current
mainstream for React design systems (the same stack as shadcn/ui), and it keeps the whole kit
in plain readable `.tsx` + one `tokens.css`. Rejected: CSS-in-JS (runtime cost, server
components), CSS modules for the kit (two places to read per component), a published npm
package (token in every build — library spec §1.1).

---

## 3. "Generalise it" or "build it new": the decision ladder

Asked of every screen part, top to bottom; stop at the first **yes**.

| # | Question | If yes |
|---|---|---|
| 1 | Does a kit component already show this kind of information? | **Use it and reshape the data to fit it.** Choose what to show, not how to draw it. |
| 2 | Is it a generic interaction (pick, filter, confirm, list, page frame) that two apps need or will need? | **Promote it to the library** (story + shots + minor release). |
| 3 | Is it generic but only one app needs it today? | **App pattern (layer 4)** built only from kit parts. Promote the day a second app wants it. |
| 4 | Is the *geometry itself* the meaning (a grid of sites × trades, a board you drag on, a drawing beside its parsed table, a calculation sheet that mirrors the standard's layout)? | **Special (layer 5): build it new**, from tokens and kit atoms (Badge, StatusIcon, Button), in the app. |

**Analogy:** the kit is LEGO. Most things are a model built from standard bricks (rows 1–3).
A few parts are a custom-moulded piece because no brick has that shape (row 4) — but the
custom piece still uses the same plastic and colours (tokens).

**Reshaping the data (row 1) in practice:**

| Today | Becomes | What changed is the data, not the drawing |
|---|---|---|
| Prefab dashboard "finance cards" | kit `GlanceCard`s on the Commercial workspace | value + one-line context + link, the GlanceCard contract |
| Prefab "Needs attention" rows | kit `AttentionList` beside each record row | reason words become attention items with severity |
| Prefab 12-colour project status pill | kit `Badge` through a `status-meta` map (by meaning, restyle D10) | phase moves to position (gauge, board column) |
| Prefab docs-progress markers | kit `StatusIcon` row | stage → check / current / problem glyph |
| Prefab hand-rolled modals ×16 | kit `Dialog` / `Sheet` / `ConfirmDialog` | the form keeps its fields; only the frame changes |
| Prefab `DateField` | kit `DateInput` | display DD-MM-YYYY (suite rule) |
| FinaOps / WFO `text-detail text-ink-secondary` ×151 | kit `<Text tone="secondary" size="detail">` | nothing visible |
| Prefab record headers with meta rows | kit `PageHeader` + `DescriptionList` | facts become a list instead of a sentence |

**Specials (row 4) — built new, stay in their app:**

| App | Special | Why it is not a kit component |
|---|---|---|
| WFO | Gap grid, Board (magnet cards), Flightboard rows, Wall display + ink layer | their layout encodes sites × professions × time |
| WFO | Hours grid with "of which" buckets | a spreadsheet that mirrors the invoice |
| FinaOps | P&L statement table, cash chart, statement review | accounting layouts with their own alignment rules |
| Prefab | Project board (kanban with drag), status gauge | position = phase |
| Prefab | Drawing review workspace (PDF beside structured draft), material/item-info review grids | the drawing and its table must line up |
| Prefab | Calculation sheets, offer worksheet / cost composition | they mirror EN 13480 / the offer PDF |
| Prefab | Workshop portal pages | same kit, but `size="lg"` everywhere — a binding, not a special |

A special still uses kit atoms inside it (a gap-grid cell shows a kit `Badge`; the review
workspace's footer is a kit `FormActions`), and its own stylesheet obeys rule 5.

---

## 4. What the library gains (releases after 1.0.0)

### 4.1 Primitives that replace the repeated recipes (1.2.0)

| Component | Replaces (measured in WFO + FinaOps) |
|---|---|
| `Text` (`size` body/detail/micro, `tone` ink/secondary/muted, `weight`, `truncate`, `as`) | `text-detail text-ink-secondary` ×151, `block text-detail text-ink-muted` ×33, `text-detail font-medium text-ink` ×25, `text-sm font-semibold text-ink` ×26 |
| `Heading` (`level` page/section/card) | ad-hoc `text-lg font-semibold tracking-tight` |
| `Stack` (vertical, `gap`) and `Cluster` (wrapping row, `gap`, `justify`) | `flex flex-wrap items-center gap-2` ×38, `…justify-between gap-2` ×16, `flex flex-wrap justify-end gap-1` ×10 |
| `TextLink` (quiet underline link, internal or external) | `underline underline-offset-2 hover:text-ink` ×8, `text-detail text-primary hover:underline` ×5 |
| `Table` column props `hideBelow="sm" \| "md"`, `align="right"`, `numeric` | `hidden text-right sm:table-cell` ×32, `text-right font-mono text-detail` ×9 |
| `Money`, `DateText` (formatting + numeric alignment) | per-app helpers with the same markup |
| `RecordListToolbar` + `SummaryLine` (search, inline filters ≥ lg, staged Filters dialog on phones, counts as links) | WFO app component, needed by FinaOps lists and Prefab (restyle D13) |
| `ExternalButtonLink` | WFO-only today (arrives with 1.0 via option 1) |

Each lands with a story and shots; adopting it in an app is a **0-changed-pixel** codemod
(the component renders exactly the classes it replaces).

### 4.2 The shared shell (1.3.0)

`AppFrame` with slots, extracted from the two near-identical shells: `Sidebar` (brand slot,
**three nav registers** — workspaces, records, tools — each with its icon, ⌥-digit chords, the
read-permission filter as a prop), `MobileTopBar` + `Drawer`, `CommandPalette` frame (the app
supplies the search index and the entries), `PullToSearch`, `NavTrail`, `AppSwitcher` (1.1.0).
The app passes its nav arrays, its brand mark, its strings. Workforce Ops and FinaOps adopt it
at 0 changed pixels; PrefabOps gets it as its new frame. **This is the single biggest "same
suite" lever:** one sidebar, one phone bar, one ⌘K for all three.

### 4.3 The brand-mark slot

`AppFrame` takes `mark: ReactNode` and the app-switcher entries carry each app's mark, so the
three marks sit side by side in the switcher (§7).

---

## 5. Guards (so it stays tidy)

Added to the library's app template and to each app's test suite (one file,
`tests/style-guards.test.ts`, scanning `src/**/*.tsx` minus `src/vendor`):

1. no colour literals in `.tsx` (allow-list: `brand.css`, icon generators);
2. arbitrary-value utilities only from `style-allowlist.json` (each with a reason);
3. `style={{` only with a `/* runtime: … */` reason on the same line, or a CSS-variable object;
4. no `<button>` / `<select>` / `<input>` / `<table>` outside `components/ui`, `vendor` and the
   specials folder list (a raw control skips read-only scopes and touch sizes);
5. a special's stylesheet must be listed in `ops-ui.config.json` `extensions`.

Plus `pnpm style-report` (prints the top repeated class strings) for the next sweep.

Existing violations are listed in the allow-lists on day one and **shrink with each sweep
commit**; the test fails only on new ones. That is how the code gets clean without a big-bang.

---

## 6. PrefabOps: records, workspaces, tools

### 6.1 The navigation

| Register | Entry | Route | Content |
|---|---|---|---|
| **Workspaces** | **Production** *(landing)* | `/production` | Project board (the kanban moves here from the register), deliveries next 4 weeks + overdue shipping dates, workshop updates of the last days, attention rail (production on hold, overdue, missing manufacture year) |
| | **Documentation** | `/documentation` | The PED pipeline across all projects as queues: drawings to review, engineering reviews with blockers, production packs missing/stale, dossiers to assemble/finalize; welder certificates and WPQRs expiring |
| | **Commercial** | `/commercial` | Offers in draft / sent, pipeline value and margin (the old dashboard cards), projects whose invoice is ready to lock for FinaOps, material-price staleness |
| **Records** | Projects | `/projects` | Register as a plain list (search, filters, summary line) — the kanban left for Production |
| | Clients | `/clients` | unchanged scope |
| | Employees | `/employees` | sign-in account + welder certificates (scope of 2026-10-01) |
| | Welding procedures | `/welding` | WPQR + WPS libraries + defaults, moved out of Settings (they are records of the business, not settings) |
| | Material prices | `/material-prices` | the price book |
| **Tools** | Offer builder | `/offer-builder` | standalone offer PDF |
| (footer) | Workshop portal ↗, Settings | | |

Phone: the kit `MobileTopBar` + drawer (the suite pattern) replaces the bottom tab bar and the
`/more` page.

### 6.2 Where the Dashboard's pieces go

| Dashboard block | New home |
|---|---|
| Pipeline value, margin %, drafts | Commercial — `GlanceCard`s |
| Documentation backlog count | Documentation — the queues themselves |
| "Needs attention" rows | the attention rail of the workspace whose action fixes it (production, documentation, commercial) |
| Pre-production / Production / Post-production groups | Production board column groups + header counts |

`/` redirects to `/production`. Nothing is computed twice: the workspace queries reuse the
dashboard's existing server loaders (moved, not rewritten).

### 6.3 Rules carried from Workforce Ops' doctrine

Records own their writes; workspaces are views + conveniences over record actions (no action
exists only in a workspace). A record page = PageHeader + tabs; a list = toolbar + summary line
+ table with an Attention column last. These are already in the library's `DESIGN.md`.

---

## 7. The suite logo family

### 7.1 The rule

**The ochre dot is the group.** Each app adds **one line** that says its trade, drawn in the
sidebar ink, on the app's own sidebar colour. Recognisable together, told apart in a tab bar.

| App | Line | Meaning |
|---|---|---|
| Workforce Ops | a thin orbit around the dot | people rotating between sites |
| FinaOps | a ledger line under the dot | the balance |
| **PrefabOps** | **a pipe bend (90° elbow, two straight runs) with the dot at the weld joint** | prefabricated piping; the weld is where the work is |

### 7.2 Deliverables

One source SVG → `scripts/gen-icons.mjs` (the WFO generator idiom): the 16-px shell mark
(`BrandMark` component), `icon.svg`, `favicon.ico` (16/32/48), `apple-icon.png` (180),
manifest icons 192/512 — full-bleed on the sidebar colour with the same soft top sheen as
WFO. The current blue "P made of pipe" icon is retired.

### 7.3 Palette *(default; overrule = edit `brand.css`)*

The restyle plan's D3 chose a light sidebar to tell PrefabOps apart. Goal 1 asks the
opposite, and the mark + colour already tell them apart, so: **dark sidebar in deep steel blue**
(`oklch(0.27 0.05 252)`), **Prefab blue primary** kept (`oklch(0.53 0.185 257)`, 5.40:1 on
white), **group ochre** for the mark's dot and the accent. The sync script's contrast checks
still apply.

---

## 8. Phases and order

Each phase merges on its own; nothing waits for "the end". Gates are the library spec's G1–G4
(code checks; screenshots main vs branch; token dump; hand check), with one simplification:
**sweep commits must be 0 changed pixels; design commits declare their visible change** and are
checked by eye at 1440 / 375 / 375-touch.

| Phase | What | Visible change |
|---|---|---|
| **A. Library 1.0** | Align FinaOps' kit with WFO's three newer files (option 1: bottom-sheet dialogs on phones, touch calendar, `ExternalButtonLink`); re-import into the library; re-accept the 375 baselines that change; re-run the extraction proof; release **1.0.0** | FinaOps phone dialogs become bottom sheets (as WFO already is) |
| **B. Apps on 1.0** | FinaOps F0–F7 then Workforce Ops W0–W8 (library spec §12.2–12.3): vendor the kit, one-line wrappers, `brand.css` | none |
| **C. Library 1.1–1.3** | 1.1 AppSwitcher + ValidityCell; 1.2 primitives (§4.1) + guards template; 1.3 AppFrame (§4.2); each adopted by both apps with a codemod + allow-lists (§5) | the app switcher in the logo; nothing else |
| **D. Sweep** | Both apps: shrink the allow-lists area by area (raw controls → kit, recipes → primitives, arbitrary values → tokens) | none |
| **E. PrefabOps** | R0 (local env), P0 (Next 16), P1–P3 (tokens renamed, Tailwind + kit, notifications), then **P4.1 = new frame with records/workspaces/tools nav, logo and palette**, P4.2–P4.8 area by area, then the three workspaces, P5 delete legacy CSS | the whole new look, area by area |
| **F. Docs** | `DESIGN.md` (library) gains the layer rules and the decision ladder; each app's CLAUDE.md points to it | — |

B, C and D for the two sister apps can interleave with E: they touch different repos.

---

## 9. The workflow: how a change in one app reaches the others

```
          ┌──────────── ops-ui (the library) ────────────┐
idea  →   │ change + story + screenshots → release X.Y.Z │
          └───────────────┬──────────────────────────────┘
                          │  each app, when it chooses
      ┌───────────────────┼────────────────────┐
      ▼                   ▼                    ▼
 Workforce Ops        FinaOps              PrefabOps
 sync X.Y.Z           sync X.Y.Z           sync X.Y.Z
 screenshots main     screenshots main     screenshots main
 vs branch            vs branch            vs branch
```

1. **Where a change starts.** Usually in an app ("this dialog should…"). If it touches a kit
   component, it is made **in the library**, never in the vendored copy (the sync script refuses
   local edits). App-only look = the app's binding or pattern, never the kit.
2. **The library decides the version number** from what an unchanged screen shows:
   *patch* = nothing visible; *minor* = something new, nothing existing moves; *major* = an
   existing screen changes — batched, with "Visible:" and "Upgrade steps:" in the changelog.
   The release script computes this; you cannot under-declare.
3. **Each app pulls when it is ready** (`node scripts/sync-ops-ui.mjs --version X.Y.Z`). Pulling
   never happens automatically, so a library change can never break an app's production by
   surprise. The app's screenshot compare must show only what the changelog says.
4. **Urgent app need before a release?** The app may hold a `KIT-OVERRIDE` wrapper (a local
   copy) **with an expiry version**; the sync script fails once that version arrives, which
   forces the fix upstream. Like a temporary patch on a tyre with a date written on it.
5. **App-specific behaviour** enters through exactly three doors: the strings provider
   (language), the read-only scope (permissions), and brand variables (colour). Anything else
   app-specific lives in layers 4–5 of that app.
6. **Promotion.** When a second app wants an app pattern, it moves into the library
   (minor release), and the first app's copy becomes a one-line binding at 0 changed pixels.

---

## 10. Risks

| Risk | Mitigation |
|---|---|
| Other sessions keep editing the apps' kits and shells while this runs | kit-freeze note in each CLAUDE.md (Phase A); the extraction proof names any new drift |
| PrefabOps' 13.8k CSS lines regress on screens nobody checks | the restyle plan's local Supabase stack + per-area screenshot gates; legacy CSS stays in its own cascade layer until each area migrates |
| Workspaces change how the office works | the record pages keep every action; workspaces only gather; `/` redirect keeps bookmarks working |
| Next 16 move in PrefabOps (proxy instead of middleware) | its own step P0, rollback in seconds |
| The phone redesign of PrefabOps (tab bar → drawer) | one step (P4.1), checked on the workshop tablets |

---

## 11. Defaults Saša may change at any time

- Workspace names and landing: Production / Documentation / Commercial, landing Production.
- Welding procedures as a record (out of Settings).
- Palette: dark steel-blue sidebar (§7.3).
- Logo line: the pipe elbow (§7.1).

---

### 4.4 Library 1.2.0 as specified

**Status: SPECIFIED 2026-10-01** (measured, then built as 1.2.0). This section replaces the §4.1
table for what 1.2.0 ships: §4.1 was the plan, this is the measured API. `Money` / `DateText`
stay app code (they format by locale), `RecordListToolbar` / `SummaryLine` move to a later
release, `ExternalButtonLink` already shipped in 1.0.0.

**How it was measured.** Both apps read through git only (`git archive origin/main src`:
Workforce Ops `626b9db`, FinaOps `7e0d2f5`), every `.tsx` outside `src/components/ui` and
`src/vendor`, every literal `className="…"` / `className={"…"}` with the element it sits on.
A class string is compared as a **set** (order ignored). Counts are *exact* (the whole class
set is the recipe: the call becomes the primitive with no `className`) and *+className* (the
recipe plus other classes that stay in `className`, e.g. `mt-1`). Survey scripts:
`/tmp/claude-0/ops-ui-scratch/s12/{survey,primitives}.mjs` (scratch, not shipped).

**The rule every variant obeys: adopting a primitive is a 0-changed-pixel codemod.** A variant
renders exactly the classes of the recipe it replaces (the same set; the order may differ), so
`<p className="text-detail text-ink-muted">` and `<Text as="p" size="detail" tone="muted">` are
the same element with the same classes. Every prop is optional and adds its classes; an absent
prop adds nothing (no defaults that emit a class, except `Cluster`'s, named below). Extra
classes go through `className`, merged by the kit's `cn` (tailwind-merge with the kit's font
sizes), so a codemod moves a class into a prop only when no other class in the same
`className` belongs to the same tailwind-merge group. Tests (`tests/primitives.test.tsx`)
render every variant with `renderToStaticMarkup` and require its class set to equal the
recipe's.

All five new components are **server-safe** (no directive, no hook, no kit config; `TextLink`
imports `next/link`, a client component a server component may render).

| Component (file) | Prop → exact classes | Replaces, exact (+className), Workforce Ops / FinaOps |
|---|---|---|
| `Text` (`components/text.tsx`) | `as`: `span` (default) \| `p` \| `div` \| `li` \| `dt` \| `dd` · `size`: `body` → `text-sm`, `detail` → `text-detail`, `micro` → `text-micro` · `tone`: `ink` → `text-ink`, `secondary` → `text-ink-secondary`, `muted` → `text-ink-muted`, `warning` → `text-warning`, `danger` → `text-danger`, `success` → `text-success` · `weight`: `normal` → `font-normal`, `medium` → `font-medium`, `semibold` → `font-semibold` · `mono` → `font-mono` · `block` → `block` · `truncate` → `truncate` | 726 (+293) / 224 (+92) class sets made only of these (one size, one tone, one weight at most, a size or a tone present). Top: `text-detail text-ink-muted` 127 / 47, `text-detail text-ink-secondary` 104 / 45, `text-sm text-ink-secondary` 84 / 14, `text-ink-muted` 81 / 29, `text-sm text-ink-muted` 54 / –, `block text-detail text-ink-muted` 27 / 6, `font-medium text-ink` 27 / 10, `text-sm text-ink` 25 / –, `font-medium text-detail text-ink` 15 / 4, `font-medium text-sm text-ink` 15 / – |
| `Heading` (`components/heading.tsx`) | `level` (required): `title` → `text-lg font-semibold tracking-tight text-ink` (default element `h1`), `section` → `text-sm font-semibold text-ink` (`h2`), `subsection` → `text-xs font-medium text-ink-secondary` (`h3`) · `as`: `h1`–`h4` overrides the element | `title` 5 / 5 (the sign-in pages), `section` 12 (+2) / 13, `subsection` 14 / 0 |
| `Stack` (`components/stack.tsx`) | always `flex flex-col` · `gap`: `0.5 1 1.5 2 2.5 3 4 5 6` → `gap-0.5` … `gap-6` · `as`: `div` (default) \| `span` \| `section` \| `ul` \| `ol` \| `li` \| `form` \| `fieldset` | 121 (+109) / 38 (+28) on div/span/p/li; plus section/ul/form/fieldset/header 64 / 30. Top: `gap-4` 38 / 9, `gap-2` 22 / 11, `gap-3` 16 / 8, `gap-0.5` 12 / 1, `gap-6` 10 / 3, `gap-1.5` 9 / –, `gap-1` 6 / 6 |
| `Cluster` (`components/cluster.tsx`) | always `flex` · `wrap` (default `true`) → `flex-wrap` · `align` (default `center`) → `items-center`; `start` → `items-start`, `baseline` → `items-baseline`, `end` → `items-end`, `stretch` → nothing (flex's own default) · `justify`: `between` → `justify-between`, `end` → `justify-end`, `center` → `justify-center` (none = start) · `gap` as Stack · `as`: `div` (default) \| `span` \| `p` \| `li` \| `ul` \| `nav` | wrapping 77 (+94) / 38 (+18), not wrapping 89 (+67) / 35 (+30). Top: `flex flex-wrap items-center gap-2` 20 / 17, `flex items-center gap-2` 22 / 7, `flex gap-2 justify-end` 14 / 3, `flex justify-end` 12 / 11, `flex flex-wrap items-center justify-between gap-2` 11 / 3, `flex flex-wrap justify-end gap-1` 10 / –, `flex flex-wrap items-center justify-end gap-2` 7 / 3, `flex flex-wrap gap-1.5` – / 5 |
| `TextLink` (`components/text-link.tsx`) | `variant` (required): `quiet` → `underline underline-offset-2 hover:text-ink`, `underline` → `underline underline-offset-2`, `primary` → `text-primary hover:underline`, `plain` → `hover:underline`, `strong` → `font-medium text-ink hover:underline` (= `RowLink`'s classes, for a link outside a table) · `size` as `Text` · `href`: an internal path renders `next/link`'s `Link`; a scheme (`https:`, `mailto:`, `tel:`) or `//` renders a plain `<a>`; nothing is added (no `target`, no `rel`: the caller passes them) | `quiet` 8 (+12) / –, `underline` 7 (+14) / –, `primary` 1 (+4) / 19 (+3), `plain` 1 (+38) / 8 (+13), `strong` 8 / – |
| `TH` / `TD` (`components/table.tsx`, additive) | `hideBelow`: `sm` → `hidden sm:table-cell`, `md` → `hidden md:table-cell`, `lg` → `hidden lg:table-cell` · `alignRight` → `text-right` (on `TH` it takes the place of the base `text-left`, exactly as `className="text-right"` does through `cn` today) · `numeric` (`TD` only) → `text-right font-mono` | `TH` 108 (+10) / 76 (+3), `TD` 57 (+83) / 17 (+42). Top: `TH hidden sm:table-cell` 46 / 9, `TH hidden md:table-cell` 25 / 12, `TD hidden sm:table-cell` 21 / 1, `TH text-right` 15 / 23, `TH hidden sm:table-cell text-right` 12 / 14, `TD hidden md:table-cell` 12 / 2, `TD text-right` 11 / 7, `TD font-mono hidden sm:table-cell text-right` 6 / – |

Readings where the plan was open:
- **`size` names.** `body` / `detail` / `micro` (the plan's words; `body` = `text-sm`, the
  DESIGN.md "body and data" step). `text-xs` (badges, column heads) is not a `Text` size: its
  one repeated recipe is a heading, `Heading level="subsection"`.
- **`Heading` levels** follow what is repeated, not the plan's page / section / card: the page
  title is `PageHeader`'s and is never typed by hand; the repeated `text-lg` title is the
  sign-in card's (`title`), and the uppercase label is `Kicker` (1.0).
- **Table alignment is `alignRight`, not `align`.** React types `<td align>` / `<th align>` as
  the HTML attribute (`"left" | "center" | "right" | …`); redefining it would narrow an existing
  type (a major). `alignRight` and `hideBelow` and `numeric` are new optional props: an unchanged
  call renders exactly as in 1.1 (tested), so the `TH` / `TD` declaration lines change
  compatibly (`--compatible TH --compatible TD`).
- **Not in 1.2.0** (fewer than three uses, or not one recipe): `gap-x-*` / `gap-y-*` pairs,
  `tabular-nums`, `whitespace-nowrap`, `xl:table-cell`, `text-base` / `text-xl` titles, link
  colours other than primary.

**Guards, the library side of §5 (1.2.0).** The sync script (`sync/sync-ops-ui.mjs`, shipped to
every app as `scripts/sync-ops-ui.mjs`) gains pure exports and one flag; nothing existing
changes:

- `readStyleAllowlist(appRoot, file = "style-allowlist.json")` → `{ arbitrary, colours, styles,
  rawControls }`, each a list of `{ value, reason }` (a missing file = all empty; an entry
  without a non-empty `reason` is refused). `arbitrary` values are utility tokens
  (`max-h-[calc(100dvh-2.5rem)]`, matched with or without variant prefixes); the other three are
  repo-relative paths (a file, or a folder prefix ending in `/`).
- `styleFindings(source, file, options)` → findings `{ kind, file, line, text }` for one `.tsx`
  source: `colour` (a hex, `rgb()`, `rgba()`, `hsl()`, `hsla()`, `oklch()`, `oklab()` literal
  outside comments), `arbitrary` (a `x-[…]` utility not on the allow-list), `style` (a
  `style={{` whose line carries no `runtime:` comment and whose object is not CSS variables
  only), `raw-control` (`<button`, `<select`, `<input`, `<table` outside the allowed folders:
  `src/components/ui/`, `src/vendor/` and `rawControls`).
- `classRecipes(source)` → the literal className strings of a source, each normalised to its
  sorted class set.
- `styleReport(appRoot, { src = "src", exclude = ["src/vendor/"], allowlist, top = 20 })` →
  `{ files, findings, counts, recipes }` over `src/**/*.tsx`; `formatStyleReport(report)` → the
  printed text.
- `node scripts/sync-ops-ui.mjs --style-report [--top N]` prints it and exits 0: it informs, it
  does not fail. The failing part is the app's own `tests/style-guards.test.ts` (template in
  README.md → "Style guards"): it calls `styleReport` and expects no finding, with the day-one
  violations listed in `style-allowlist.json`, which shrinks with each sweep commit (§5).
- Rule 5 of §5 (a special's stylesheet listed in `extensions`) is already the sync's
  `checkAppStyles`.

**Codemods for Phase D** (recipe → primitive; each 0 changed pixels; run per area, G2 checks):
see the 1.2.0 CHANGELOG section and README.md → "Adopting the primitives".
