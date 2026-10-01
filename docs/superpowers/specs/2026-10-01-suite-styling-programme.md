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

### 4.2 The shared shell (1.5.0)

*Version map (settled 2026-10-01):* 1.1.0 = AppSwitcher + ValidityCell; 1.2.0 = the primitives
(§4.1, §4.4); 1.3.0 = PrefabOps restyle M1 + M2 (scoped preflight, stacking variables, touch
floor, `size="lg"`, `IconButton`, two glyphs); 1.4.0 = restyle M3 (`Input` prefix / suffix,
`YearInput`, `RowMenu` trigger + sections); **1.5.0 = `AppFrame`**, the release this section
describes. The restyle minors came first because PrefabOps' areas need them; nothing here changed.

`AppFrame` with slots, extracted from the two near-identical shells: `Sidebar` (brand slot,
**three nav registers** — workspaces, records, tools — each with its icon, ⌥-digit chords, the
read-permission filter as a prop), `MobileTopBar` + `Drawer`, `CommandPalette` frame (the app
supplies the search index and the entries), `PullToSearch`, `NavTrail`, `AppSwitcher` (1.1.0).
The app passes its nav arrays, its brand mark, its strings. Workforce Ops and FinaOps adopt it
at 0 changed pixels; PrefabOps gets it as its new frame. **This is the single biggest "same
suite" lever:** one sidebar, one phone bar, one ⌘K for all three.

*As built (1.5.0, 2026-10-01; library spec §10.1):* `src/shell/` (not `components/`, so the sync
writes no wrappers; apps import `@/vendor/ops-ui/shell/…` from one client component of their own).
The read-permission filter stays app code: `AppFrame` takes the nav arrays already filtered (no
`canSee` prop). The sign-out call, the search index, its ranking and the trailing row (Workforce
Ops' "Ask the assistant", FinaOps' "Search transactions") are props; the words are the optional
`strings.shell`. With each app's own nav, words and mark the library renders that app's markup
exactly (server and DOM proofs against the raw app files), one intentional difference: Workforce
Ops' sidebar mark row gains `items-center` (FinaOps' row; 0 pixels). The tools register's teal
`--color-tool` stays an app extension (Workforce Ops has it; PrefabOps declares it at P4.1).
Stories: `app-frame--*` (closed, drawer open, palette open / with results, PrefabOps registers and
drawer). Not changed by it: the gallery's `prefab` fixture is still the light D3 palette; §7.3's
dark steel-blue sidebar arrives with PrefabOps' own `brand.css`.

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
| **C. Library 1.1–1.5** | 1.1 AppSwitcher + ValidityCell; 1.2 primitives (§4.1) + guards template; 1.3 + 1.4 the PrefabOps restyle minors M1–M3 (restyle plan §10.2; additive, nothing to adopt in WFO / FinaOps); 1.5 AppFrame (§4.2); each adopted by both apps with a codemod + allow-lists (§5) | the app switcher in the logo; nothing else |
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

**Codemods for Phase D** (recipe → primitive; each 0 changed pixels; one commit per area, G2
at 0 changed pixels; counts = exact uses, Workforce Ops / FinaOps, `+N` = with other classes
left in `className`). Classes are compared as sets; the element keeps its tag through `as`.

| # | Recipe (class set, element) | Primitive | WFO | FinaOps |
|---|---|---|---|---|
| T1 | `text-detail text-ink-muted` (p / span / div) | `<Text as="p" size="detail" tone="muted">` | 127 | 47 |
| T2 | `text-detail text-ink-secondary` | `<Text size="detail" tone="secondary">` | 104 | 45 |
| T3 | `text-sm text-ink-secondary` | `<Text size="body" tone="secondary">` | 84 | 14 |
| T4 | `text-ink-muted` | `<Text tone="muted">` | 81 | 29 |
| T5 | `text-sm text-ink-muted` | `<Text size="body" tone="muted">` | 54 | – |
| T6 | `block text-detail text-ink-muted` | `<Text block size="detail" tone="muted">` | 27 | 6 |
| T7 | `font-medium text-ink` | `<Text weight="medium" tone="ink">` | 27 | 10 |
| T8 | `text-sm text-ink` | `<Text size="body" tone="ink">` | 25 | – |
| T9 | `font-medium text-detail text-ink` / `font-medium text-sm text-ink` | `<Text size="detail"\|"body" weight="medium" tone="ink">` | 15 / 15 | 4 / – |
| T10 | every other set of only size / tone / weight / mono / block / truncate classes | `Text` with those props | the rest of 726 (+293) | the rest of 224 (+92) |
| H1 | `text-lg font-semibold tracking-tight text-ink` (h1) | `<Heading level="title">` | 5 | 5 |
| H2 | `text-sm font-semibold text-ink` (h2 / h3) | `<Heading level="section">` (`as="h3"` where it was one) | 12 (+2) | 13 |
| H3 | `text-xs font-medium text-ink-secondary` (h3) | `<Heading level="subsection">` | 14 | – |
| S1 | `flex flex-col gap-N` (div / section / ul / form / fieldset / span / li) | `<Stack gap={N}>` (`as=` the tag) | 121 (+109) + 64 | 38 (+28) + 30 |
| C1 | `flex flex-wrap items-center gap-2` | `<Cluster gap={2}>` | 20 | 17 |
| C2 | `flex flex-wrap items-center justify-between gap-2` | `<Cluster gap={2} justify="between">` | 11 | 3 |
| C3 | `flex flex-wrap justify-end gap-1` (span) | `<Cluster as="span" gap={1} align="stretch" justify="end">` | 10 | – |
| C4 | `flex flex-wrap items-center justify-end gap-2` | `<Cluster gap={2} justify="end">` | 7 | 3 |
| C5 | `flex flex-wrap gap-N` | `<Cluster gap={N} align="stretch">` | 11 | 7 |
| C6 | `flex items-center gap-N` | `<Cluster wrap={false} gap={N}>` | 42 | 13 |
| C7 | `flex gap-2 justify-end` / `flex justify-end` | `<Cluster wrap={false} align="stretch" justify="end" gap={2}>` / without gap | 14 / 12 | 3 / 11 |
| C8 | other `flex [flex-wrap] [items-*] [justify-*] [gap-*]` sets | `Cluster` with those props | the rest of 166 (+161) | the rest of 73 (+48) |
| L1 | `underline underline-offset-2 hover:text-ink` (Link / a) | `<TextLink variant="quiet">` | 8 (+12) | – |
| L2 | `underline underline-offset-2` | `<TextLink variant="underline">` | 7 (+14) | – |
| L3 | `text-primary hover:underline` (+ `text-detail`) | `<TextLink variant="primary" [size="detail"]>` | 1 (+4) | 19 (+3) |
| L4 | `hover:underline` | `<TextLink variant="plain">` | 1 (+38) | 8 (+13) |
| L5 | `font-medium text-ink hover:underline` (+ `text-sm`) | `<TextLink variant="strong" [size="body"]>` | 5 + 3 | – |
| X1 | TH / TD `hidden sm:table-cell` (`md`, `lg`) | `hideBelow="sm"` (`"md"`, `"lg"`) | TH 76, TD 35 | TH 27, TD 5 |
| X2 | TH / TD `text-right` | `alignRight` | TH 15, TD 11 | TH 23, TD 7 |
| X3 | TH / TD `hidden <bp>:table-cell text-right` | `hideBelow="<bp>" alignRight` | TH 17, TD 3 | TH 26, TD 5 |
| X4 | TD `font-mono text-right` (+ `hidden <bp>:table-cell`, + `text-detail` / `whitespace-nowrap` in className) | `<TD numeric [hideBelow]>` | 8 (+25) | – |

### 4.6 Library 1.6.0 as specified

**Status: SPECIFIED 2026-10-01** (measured, then built as 1.6.0). The gaps both apps' Phase D
sweeps left behind: the recipes the 1.2.0 primitives could not take (a `<button>` that looks like
a link, choice controls, grid templates, a chip's remove ✕, two Text classes), one guard false
positive, one theme-variable leak, and three tooling gaps. Additive throughout: every existing
baseline keeps 0 changed pixels, new stories add new baselines only.

**How it was measured.** As §4.4, against the post-sweep apps (`git archive origin/main src`:
Workforce Ops `a5cd0e4`, FinaOps `526d1a7`), every `.tsx` outside `src/components/ui` and
`src/vendor`; class strings compared as sets; *exact* = the whole set is the recipe, *(+N)* = the
recipe plus other classes that stay in `className`. Raw controls are the sync script's own
`raw-control` findings with an empty allow-list (WFO 98, FinaOps 20). Scratch:
`/tmp/claude-0/ops-ui-scratch/s16/`. The rule of §4.4 holds: a prop renders exactly the classes of
the recipe it replaces, so adoption is a 0-changed-pixel codemod unless a row says otherwise.

| Component (file) | Prop → exact classes | Replaces, Workforce Ops / FinaOps |
|---|---|---|
| `TextButton` (`components/text-button.tsx`, client) | a `<button>` with `TextLink`'s classes: `variant` (required) as `TEXT_LINK_VARIANT` · `size` as `Text` · `tone` as `Text` (`TEXT_TONE`) · no default `type` (as `Button`) · hidden in a read-only scope unless `readOnlySafe` (as `Button`) | raw `<button>`s styled as links: 16 / 2 (quiet ×12, underline ×3, plain ×1 / muted ×1, strong ×1) |
| `TextLink` + `TextButton` variant `muted` (additive) | `muted` → `text-ink-secondary hover:text-primary` | 0 (+3) / 0 (+3): the sign-in pages' secondary links and buttons |
| `Radio`, `RadioGroup` (`components/radio.tsx`, client) | `Radio`: the kit `Checkbox` recipe with `type="radio"` (label `flex items-center gap-2 text-sm text-ink`, disabled `cursor-not-allowed text-ink-muted`; input `size-4 accent-primary`) · `RadioGroup`: `role="radiogroup"`, `orientation` `vertical` → `flex flex-col`, `horizontal` → `flex flex-wrap`, `gap` as `Stack`; it gives its `Radio`s and `ChoiceTile`s `name`, `checked` and `onChange` from `value` / `onChange` | WFO travel-dialogs (exact, 1 component, 3 call sites); FinaOps' 4 native radios (`invoice-controls` ×2, `instruction-invoice-dialog` ×2: **visible**, a 13px native radio becomes the 16px primary one — the suite's look; their sweep commit lists the two dialogs as expected) |
| `ChoiceTile` (`components/radio.tsx`) | the bordered radio tile: `cursor-pointer rounded-control border transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60`, checked `border-primary bg-primary-subtle text-primary`, else `border-border-strong hover:bg-surface`; an `sr-only` radio inside · `layout`: `row` (default) → `flex min-h-11 min-w-0 items-center gap-2 px-3 py-2 text-sm`, `compact` → `flex min-h-11 min-w-11 items-center justify-center gap-2 px-2.5 py-2 text-detail sm:min-h-10 sm:justify-start`, `stacked` → `flex min-h-11 min-w-0 flex-col justify-center gap-0.5 px-2.5 py-2 text-center text-detail sm:min-h-0 sm:text-left` | WFO 4: employer picker ×2 (`row`), quote editor issuer (`compact`) and type (`stacked`); FinaOps 0 |
| `Checkbox` without `label` (additive overload) | `label` omitted → the bare `<input type="checkbox" class="size-4 accent-primary">`, `aria-label` required by the type | FinaOps review-board line selection 1; the selection column of any list |
| `SplitLayout` (`components/split-layout.tsx`) | `grid items-start gap-6 lg:grid-cols-[1fr_minmax(20rem,26rem)]` (main + side column) · `as` | 7 / 0 (one other width each: className) |
| `Grid` (`components/grid.tsx`) | `grid` · `gap` as `Stack` · `cols` `2` \| `3` with `from` (none) → `grid-cols-N`, `"sm"` → `sm:grid-cols-N`, `"lg"` → `lg:grid-cols-N` · `align="start"` → `items-start` · `as` | `gap-3 sm:2` 34 (+5) / 10 (+1), `gap-4 sm:2` 21 (+6) / 3 (+4), `gap-3 2` 7 (+2) / 2, `gap-6 start lg:2` 6 / 5 (+2), `sm:3` (+4) / (+3) |
| `TagRemove` (`components/tag-remove.tsx`, client) | the ✕ inside a `Tag`: `<button type="button" aria-label=…>` `shrink-0 rounded-control px-1.5 text-ink-muted hover:bg-surface-raised hover:text-ink`, children default `✕` · hidden in a read-only scope (removing changes data) | FinaOps 4: allocation-editor ×2 (exact), rules-board ×2 (no `shrink-0`, no hover fill: 0 pixels at rest, the hover gains the fill) |
| `Text` `nowrap`, `tabular` (additive) | `nowrap` → `whitespace-nowrap`, `tabular` → `tabular-nums` | `whitespace-nowrap` with Text classes only: 23 / 9; `tabular-nums` on `Text`: 10 (+12) / 4 (+7). `font-mono text-detail` is already `<Text size="detail" mono>` |

Readings:
- **`Tag` stays server-safe**: an `onRemove` prop would put a handler in it, so the ✕ is its own
  client component placed as the Tag's last child (the markup FinaOps writes by hand).
- **`TextButton` takes `tone`, `TextLink` does not**: the quiet buttons carry a tone 11 times
  (`text-ink-muted` ×6, `text-ink-secondary` ×5); the post-sweep TextLinks carry one 3 times.
- **No `GridItem` / `span` prop.** `sm:col-span-2` (43 / 29, mostly on `Field`) is one utility
  in `className`; a prop would save nothing.
- **Not in 1.6.0**: the hours card's visible-radio tile (1 use), the quote editor's pricing radio
  (1 use, `min-h-10` + `shrink-0`), `text-xs text-ink-muted` (8 / 0: `text-xs` is not a `Text`
  size, §4.4), `xl:` grid templates, other split widths (1 each).

**Theme variables the library declares by itself (item 6).** Tailwind v4 emits a theme variable
for every scanned class that uses one. 1.5.0's `AppFrame` wrote `max-w-5xl` and `max-w-6xl`, so
each app declared both `--container-5xl` and `--container-6xl` although it renders one (FinaOps'
G3 saw `--container-5xl`, Workforce Ops' `--container-6xl`). 1.6.0 writes the two widths as
`max-w-[64rem]` / `max-w-[72rem]`: the same computed `max-width` (Tailwind's 64rem / 72rem), no
theme variable. The DOM's class token changes, nothing paints differently (every `app-frame--*`
baseline unchanged; the shell proofs list it as an intentional difference). An app taking 1.6.0
sees both names leave its G3 once: `removed token --container-5xl` and `removed token
--container-6xl` in its `--expect` (unless its own code still uses one). DESIGN.md → "Library
classes and theme variables" states the rule for later components: a library class must not
need a theme variable an app may not use (sizes from the spacing scale or arbitrary values).

**Guards (sync script).** `<input type="hidden">` is not a raw control (it renders nothing and has
no read-only or touch behaviour): WFO 20, FinaOps 3 findings leave the reports.

**Tools.** `app-shots`: a `visual.routes` entry may be an object `{ "path", "resolve"?, "noise"?,
"tries"? }`: `resolve: { "from": "<list route>", "selector": "<css>" }` opens `from` and shoots
the `href` of the first match instead of `path` (the key stays `path`, e.g.
`/transactions/:first`; a fixture id is read at capture time); `noise: { "pixels", "reason" }`
settles the page when two shots differ by at most `pixels` and lets `compare` pass that page up
to the same number (reported, never silent; every other page stays exact); `tries` (and
`visual.settleTries`) the number of extra shots before "never settled" (default 10). The gallery's
RowMenu follow-scroll behaviour test reads the button and menu rectangles in one frame and polls
until the menu has followed (it measured between the scroll and the menu's re-render under load).

**Codemods for each app's second sweep** are listed in the 1.6.0 CHANGELOG entry (file:line per
use, the target call). New stories: `text-button--variants`, `radio--group`,
`radio--choice-tiles`, `field--bare-checkbox`, `split-layout--main-and-side`, `grid--templates`,
`tag-remove--in-a-tag`, `text--nowrap-and-tabular`.

### 4.7 Library 1.7.0 as specified

**Status: SPECIFIED 2026-10-01** (measured, then built as 1.7.0). The subject is the coarse-pointer
touch floor (1.3.0, opt-in through `data-ops-touch`): the targets the kit draws itself, which an app
cannot size from outside, plus one layout leak the Workforce Ops restyle found. The findings come
from the app restyles: PrefabOps restyle plan §10.2 ("Candidates found at P4.3" and "at P4.4a") and
Workforce Ops' `/workers/new` at 375. No API change (`api-surface.d.txt` unchanged).

**How it was measured.** In the gallery at 375-touch (Playwright: `hasTouch`, `isMobile`, so
`(hover: none) and (pointer: coarse)` match), with `data-ops-touch` on `<html>` over the 1.6 stories
for "before" and on the new stories' wrappers for "after"; bounding boxes, the smallest of a set
(42 day cells, 2 arrows, 4 menu items); the Switch's target by `elementFromPoint` around the
track's centre. Scratch: `/tmp/claude-0/s17/` (`floor.mjs`).

| Component | Target | 1.6.0 | 1.7.0 (under the floor) | How |
|---|---|---|---|---|
| `Dialog` | ✕ | 31.7 x 34 | 44 x 44 | `TOUCH_FLOOR.height` + `.width`; the header row grows to 60 |
| toast (`Toaster` / `ToastViewport`) | ✕ | 23.7 x 26 | 44 x 44 | floor + `-my-3.5` under the floor: the toast keeps its height, the target reaches past it |
| `DateInput` | field button | 28 x 28 | 44 x 44 | floor; the field's `pr-12` under the floor (text 48px clear of the button, was 36) |
| `DateInput` calendar | day cells | 36 tall | 44 | `TOUCH_FLOOR.height` |
| | month arrows | 32 x 32 | 44 x 44 | floor both sides |
| | month title | 28 tall | 44 | `TOUCH_FLOOR.height` |
| | Today / Clear | 40 tall | 44 | `TOUCH_FLOOR.height` (the coarse branch's `px-4 py-2.5` stays) |
| `YearInput` | field button, arrows, This year / Clear | 28 x 28, 32 x 32, 40 | 44 x 44, 44 x 44, 44 | as DateInput (its year cells were `h-11` already) |
| `FileInput` | the field | 43.5 tall | 44 | `TOUCH_FLOOR.height` |
| `RowMenu` | items (link and button) | 32 tall | 44 | `TOUCH_FLOOR.height` |
| `Switch` | the track's target | 40 x 24, no row target | 54 x 46 | the row `TOUCH_FLOOR.height`; the track's invisible `::after`, `-inset-x-2 -inset-y-3` under the floor (the track itself stays 40 x 24 at every pointer) |

**The Segmented overflow (Workforce Ops `/workers/new`, 9px at 375).** Not Segmented's fault:
it already is `w-fit max-w-full overflow-x-auto` and scrolls inside itself. It sits in the form's
kit `Grid cols={2} from="sm"`, which below `sm` had no template: its one implicit column was an
`auto` track, whose grid items keep their content's min-content width as a minimum (the app's
`div` around the employer picker has no `min-w-0`), and a scroll container's content still counts
towards that min-content. The item grew wider than the phone and `max-w-full` was measured against
it. Fix in the kit's `Grid`: with `cols` and `from`, `grid-cols-1` below the breakpoint, an explicit
`minmax(0, 1fr)` column (a track whose minimum is 0 gives its items no automatic minimum). Where
the content fits, an `auto` single column and a `1fr` one are the same width, so every grid
baseline keeps 0 changed pixels; only an overflowing page changes. The 1.6 recipe table's `from`
rows each gain `grid-cols-1`. A hand-written grid holding a scrolling control should do the same
or give the item `min-w-0` (DESIGN.md → Responsive).

**Rules.** Fine pointers stay pixel-identical: every new class is behind the floor's media query
and `[data-ops-touch]` (tests/touch-floor-1-7.test.tsx compiles them and requires every selector
inside that block), except `grid-cols-1`, which changes layout only where content overflowed. The
1440 and 375 shots of every story stay byte-identical to 1.6.0. At 375-touch only stories whose
controls sit inside `data-ops-touch` can change: of the existing ones that is
`button--touch-floor` (its DateInput's button, three brands), rebaselined in a pure
`shots: rebaseline (…)` commit and named under `Visible:` in the CHANGELOG.

**Stories** (new baselines only): `dialog--under-the-touch-floor`, `toast--under-the-touch-floor`,
`date-input--calendar-under-the-touch-floor`, `year-input--picker-under-the-touch-floor`,
`field--under-the-touch-floor` (FileInput + two Switches), `row-menu--open-below-under-the-touch-floor`,
`segmented--in-a-form-grid`. **Behaviour** (`gallery/tests/behaviour.spec.ts`, "touch floor
(1.7.0)", 375 and 375-touch): every target above ≥ 44 (icon-only 44 x 44) at 375-touch and the 1.6
size at 375; the Switch's reach and a tap 20px above its track toggling it; the Segmented story
inside 375 with the control scrolling inside itself.

**Not in 1.7.0.** Other kit targets under 44 that no app reported (Combobox options, AppSwitcher
entries, CopyValue, TagRemove, the PageHelp trigger already has its own `pointer-coarse:` 44):
the rule in DESIGN.md ("whatever a finger can press carries `TOUCH_FLOOR` or an invisible target")
applies to them when they are measured; `Text` without `size` inheriting an island's 16px (plan
§10.2, P4.3) is an island matter, not a floor one.
