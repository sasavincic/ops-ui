# Extraction proof: @latro/ops-ui 1.0.0 (spec §12.1 L6)

**Final run for the release, 2026-10-01**, after spec §12.4 option 1: both app kits were aligned
(FinaOps 2eef5a4 took Workforce Ops' button, date-input, dialog, lib/floating-place and
lib/sheet-motion; FinaOps 19aad88 took its GlanceCard optional `href`) and the library re-imported
them (`tests/fixtures/reimport-finaops` keeps the raw files for the end-to-end test).
`WFO_AHEAD` and `FINAOPS_AHEAD` are empty.

| App (fresh `git archive` export) | Verdict | Exit |
|---|---|---|
| FinaOps `origin/main` `19aad88` | **PROVEN**: 30 components identical after normalization, 5 differing only by named spec rows; modules and kit words identical | 0 |
| Workforce Ops `origin/main` `23d7d5c` (source: FinaOps `19aad88`) | **PROVEN**: 25 components identical after normalization, 8 differing only by named spec rows; `validity-cell` stays app-local | 0 |

The rest of this file is the 2026-09-30 run, kept as the record of the decision.

---

**Date:** 2026-09-30. First run at library `3c31100` (L6); **re-run for L7 on 2026-09-30 at 21:50 UTC** at library `e0afe5c` (the L7a commit: `tools/release.mjs`, `tools/app-shots.mjs`; nothing under `src/` or `styles/` changed since the L6 review rounds). The outputs below are the re-run's.

**Inputs of the re-run:**
- Library `e0afe5c` (`tools/diff-against-app.mjs` as committed there).
- FinaOps `origin/main` `80828fc`.
- Workforce Ops `origin/main` `cea4928`.
- FinaOps `origin/claude/trusting-keller-r5bi2t` `0286b33` (its security branch, not on `main`; it carries b775fb6).

`git ls-remote` at 21:50 UTC showed every remote at exactly these commits: FinaOps' `main` has not moved since the L2 import (80828fc), and neither has Workforce Ops' (cea4928). The apps were read as fresh `git archive` exports (`/tmp/claude-0/ops-ui-scratch/l7/`); the same runs with `--ref origin/main` against the checkouts produce identical bodies. Against the first run, the only differences in the outputs are the library commit and export paths, and the one line FinaOps' run gained in the L6 review (`FINAOPS_AHEAD` found at no ref: "the proof holds for this ref only").

**Claim.** Library 1.0.0 is the FinaOps kit, plus the named Workforce Ops modules. Nothing is changed except:
- the mechanical substitutions of §12.1 L6;
- the §7 decoupling;
- the §9 "Change" items.

Against Workforce Ops, the diff may additionally show the lines where the two app kits differ in the files §9 sources from FinaOps (rows 1, 9, 26 and 32).

## Result

| App | Verdict | Exit |
|---|---|---|
| FinaOps `origin/main` `80828fc` | **PROVEN.** 30 components are identical after normalization. 5 differ only by named spec rows. Every module and the kit's words are identical too. The proof holds for this ref only: the named FinaOps drift (b775fb6) is not on `main` yet. | 0 |
| Workforce Ops `origin/main` `cea4928` | **Extraction proven** (22 identical, 8 by named rows; `search-form` and `url-select` join from FinaOps; `validity-cell` stays app-local). **But WFO is ahead of the 1.0 source in `button.tsx`, `date-input.tsx` and `dialog.tsx`.** The decision is open, see below. | 1 |
| FinaOps security branch `0286b33` | **Extraction proven** (29 identical, 5 by named rows), **but FinaOps is ahead in `button.tsx`**: exactly the named b775fb6 lines (the two later commits on the branch do not touch the kit). Re-import pending, see below. | 1 |

**What differs, and which spec row names it.** Every other component is identical after normalization against both apps.

| Component | Against FinaOps | Against Workforce Ops |
|---|---|---|
| action-icon | §7 row 17: `ActionIconName` moved to types.ts. The glyph table is typed with it. Type-only. | the same, plus §9 row 1: FinaOps' `ActionIconScope({ enabled = true })`, default on, no `usePathname`/`hasActionIcons` |
| badge | §7 row 17: `BadgeVariant` moved to types.ts. The variant table `satisfies` it. Type-only. | the same |
| confirm-dialog | identical | §9 row 9: WFO's unused `useDict()` in `ConfirmDialog` |
| monogram | §9 row 19: the external tone reads `*-external` (`--color-external`, default = the accent) | the same |
| record-tab | §9 row 23: no `area` prop, no `WriteScope` (the app binding adds them) | the same |
| segmented | identical | §9 row 26: FinaOps' `max-w-full overflow-x-auto` |
| tag | identical | §9 row 32: FinaOps' optional `title` |
| toast | §9 row 33: the lift is `var(--ops-toast-offset,0px)`, plus one comment that follows the useOpsUi substitution | the same |
| button | identical | **WFO ahead:** `ExternalButtonLink` (ce53be0) |
| date-input | identical | **WFO ahead:** the calendar stays on screen on phones, and is a bottom sheet on touch (f364bd5, ae37fb7, ff90dde) |
| dialog | identical | **WFO ahead:** a bottom sheet below `sm` (ff90dde) |

**Modules.** Compared against the app modules they came from:
- `navigation/trail.ts`, `navigation/history.ts`, `navigation/nav-trail.tsx`, `lib/date-input.ts` and `lib/use-dismissable.ts`: identical as whole modules, imports aside.
- `lib/cn.ts`, `lib/fmt.ts` and `lib/dates.ts`: every declaration is identical.
- `lib/text.ts`:
  - identical to WFO;
  - against FinaOps, `normalizeSearchText` returns `names.foldText(value)`. foldText's body is the library's, with the `̀-ͯ` range written as raw characters, and it gives the same output on a 40-string corpus. So FinaOps' pickers match as before; F5's parity test repeats this inside FinaOps.
- `lib/months.ts`:
  - identical to FinaOps;
  - WFO's `hours-periods.shiftMonth` is written as one expression, and gives the same output on 44,676 inputs.

**Kit words.** All 33 `EN_STRINGS` values equal both apps' en `common` values.

**What the tool ignores.** Everything below is counted in each output under "Normalizations":
- import statements;
- the kit-config hook line (`useDict` / `useMaybeDict` / `useLocale` ↔ `useOpsUi`);
- `t.common.x` → `strings.x`;
- `dict?.common.x ?? "<English word>"` → `strings.x`, only when the literal is the `EN_STRINGS` value;
- `localizeMessage(t, s)` → `localize(s)`;
- the seven React-free types moved to `types.ts`, each proven against the app's definition (the same union, or the keys of the object it is derived from);
- blank lines and trailing whitespace.

`tests/diff-against-app.test.ts` checks the tool itself. It runs the tool end to end against a tree rebuilt from the L2 import commit, and a planted change in a component or a module must fail it.

## L7b: not releasable yet

`pnpm release 1.0.0` (spec §12.1 L7b) needs this proof to say PROVEN against FinaOps' `main` of the day with `FINAOPS_AHEAD` empty, the §12.4 decision "Found while proving 1.0 (L6)" recorded, and the §12.4 "FinaOps ahead" re-import done. On 2026-09-30 at 21:50 UTC:
- the Workforce Ops decision is still open (Saša's; releasing 1.0.0 as it stands would decide it for option 2);
- the FinaOps re-import cannot be done: the security branch has not merged into FinaOps' `main`, so `FINAOPS_AHEAD` stays (deleting it now would make the branch's `button.tsx` unexplained again).

So 1.0.0 was not released. Everything else L7b runs is ready: the release tooling exists (L7a), the gates are green, and `pnpm release 1.0.0 --dry-run` at `e0afe5c` refuses only `CHANGELOG.md: date the section: "## 1.0.0 — unreleased"`, which is dated in its own commit once the two preconditions hold.

## Extraction bugs found

None. Nothing in the library needed fixing: every difference against FinaOps is a named row.

## Workforce Ops is ahead of the 1.0 source (decision open)

On 2026-09-30, after the survey the spec is built on, four Workforce Ops commits changed three kit files that §9 lists as **Same**:
- ce53be0: `ExternalButtonLink` in `button.tsx`.
- f364bd5: the calendar stays whole on screen (new `lib/floating-place.ts`).
- ae37fb7: the calendar opens as a bottom sheet on touch screens.
- ff90dde: every Dialog is a bottom sheet below `sm` (new `lib/sheet-motion.ts`; it touches `date-input.tsx` too).

The library is FinaOps' copy, so it carries none of them. That is correct for the extraction rule, and not fixable in 1.0.0 without changing FinaOps' rendering. It is therefore not an extraction bug, and it was not "fixed" in the library.

The consequence: Workforce Ops cannot take 1.0.0 as written.
- `ExternalButtonLink` is imported by `components/recruiting/candidate-sheet.tsx`.
- The phone dialogs and the touch calendar would revert at W6.

Spec §12.4 ("Found while proving 1.0 (L6)") gives three options. The recommendation is to align FinaOps first and re-import before L7b. `tools/diff-against-app.mjs` records the three files in `WFO_AHEAD`, with their line counts, and exits 1 against Workforce Ops until that entry records a decision. **L7b (`pnpm release 1.0.0`) waits for it** (L7a, the release and app-shots tooling, landed in `e0afe5c`).

## FinaOps is ahead too (found after the proof; re-import before L7b)

A verified review (2026-09-30, after this proof) found that FinaOps changed its kit after the 1.0 source commit as well: b775fb6 ("Sign-in hardening", 2026-09-30 20:47, on `origin/claude/trusting-keller-r5bi2t`, not yet on its `main`) edits `src/components/ui/button.tsx`. `AdminIconButton`'s `icon` union gains `"deactivate" | "reactivate"`, with two glyph paths, and `settings/user-active-button.tsx` uses them.

- The proof above holds for 80828fc, which is still FinaOps' `origin/main` (re-checked at the L7 re-run, 21:50 UTC; the branch head is now 0286b33 and reads the same).
- Against b775fb6 the tool (with the `FINAOPS_AHEAD` entry added in the same review) reports `button.tsx` as **FinaOps ahead** (4 FinaOps-only lines, 1 library-only line) and exits 1: "EXTRACTION PROVEN against FinaOps (29 components identical after normalization, 5 differing only by named spec rows), but FinaOps is ahead of the 1.0 source in button.tsx". Before the entry existed the same run said `UNEXPLAINED`.
- Against 80828fc the run is still PROVEN and adds one line: the named drift is not at this ref, so the proof holds for this ref only.

Spec §12.4 ("FinaOps ahead") resolves it without a decision: FinaOps is the 1.0 source, so the library re-imports `button.tsx` from FinaOps' `main` once the branch has merged, deletes the entry, and L7b re-runs this proof against that `main`.

## Output against FinaOps (verbatim)

```text
diff-against-app: the extraction proof (spec §12.1 L6)
library  @latro/ops-ui 0.0.0 at e0afe5c
app      fina-ops origin/main 80828fc (git archive export) - /tmp/claude-0/ops-ui-scratch/l7/fina-ops

Components (spec §9)
   1  action-icon.tsx        §7 row 17 (types.ts)
   2  attention-list.tsx     identical
   3  back-link.tsx          identical
   4  badge.tsx              §7 row 17 (types.ts)
   5  button.tsx             identical
   6  callout.tsx            identical
   7  card.tsx               identical
   8  combobox.tsx           identical
   9  confirm-dialog.tsx     identical
  10  copy-value.tsx         identical
  11  date-input.tsx         identical
  12  description-list.tsx   identical
  13  dialog.tsx             identical
  14  empty-state.tsx        identical
  15  field.tsx              identical
  16  form-actions.tsx       identical
  17  glance-card.tsx        identical
  18  kicker.tsx             identical
  19  monogram.tsx           §9 row 19 / §7 Monogram row
  20  month-nav.tsx          identical
  21  page-header.tsx        identical
  22  page-help.tsx          identical
  23  record-tab.tsx         §9 row 23 / §7 PermissionArea row
  24  row-menu.tsx           identical
  25  search-input.tsx       identical
  26  segmented.tsx          identical
  27  sheet.tsx              identical
  28  state-mark.tsx         identical
  29  status-icon.tsx        identical
  30  table.tsx              identical
  31  tabs.tsx               identical
  32  tag.tsx                identical
  33  toast.tsx              §9 row 33 / §7 toast-offset row + §7 i18n rows (useOpsUi)
  34  search-form.tsx        identical
  35  url-select.tsx         identical

Differences after normalization, and what accounts for each

== action-icon.tsx  (§9 row 1)
  @@ app 13,5 library 13,5 @@
     return <IconScope.Provider value={enabled}>{children}</IconScope.Provider>;
   }
  -const paths = {
  +const paths: Record<ActionIconName, string> = {
     add: "M8 2v12M2 8h12",
     edit: "m10.5 2.5 3 3-8 8-4 1 1-4zM9 4l3 3",
  @@ app 48,5 library 48,5 @@
     bed: "M2 4v10M14 7v7M2 11h12M2 7h12M5 7V5H2",
     refresh: "M13 6a5 5 0 0 0-9-3L2 5M2 2v3h3M3 10a5 5 0 0 0 9 3l2-2M11 11h3v3",
  -} as const;
  +};
   /** Explicit action semantics; never infer icons from translated labels. */
   export function ActionIcon({
  > §7 row 17 (types.ts): ActionIconName is a union in types.ts now; the glyph table is annotated with it, so the two cannot drift (a type-only change) (4 lines)

== badge.tsx  (§9 row 4)
  @@ app 9,5 library 9,5 @@
           danger: "border-danger/30 bg-danger-subtle text-danger",
           info: "border-info/30 bg-info-subtle text-info",
  -      },
  +      } satisfies Record<BadgeVariant, string>,
       },
       defaultVariants: { variant: "neutral" },
  > §7 row 17 (types.ts): BadgeVariant is a union in types.ts now; the variant table is checked against it with satisfies (a type-only change) (2 lines)

== monogram.tsx  (§9 row 19: `external` tone reads --color-external (same pixels at 1.0))
  @@ app 4,5 library 4,6 @@
    * header, the employer on the worker list. Never a status, never a filter.
    * `tone="external"` tints a company that is not ours (a subcontractor) in
  - * the brand ochre, so their people stand out in a list (Saša, 2026-09-09).
  + * the "not ours" colour, --color-external (default: the brand accent), so
  + * their people stand out in a list (Saša, 2026-09-09).
    * The full name travels in `title` and for screen readers.
    */
  @@ app 24,5 library 25,5 @@
           "inline-flex shrink-0 items-center rounded-sm border px-1 py-0.5 text-micro font-semibold tracking-wide",
           tone === "external"
  -          ? "border-accent/50 bg-accent/10 text-accent"
  +          ? "border-external/50 bg-external/10 text-external"
             : "border-border bg-bg text-ink-secondary",
           className
  > §9 row 19 / §7 Monogram row: the external tone reads --color-external, which defaults to the brand accent (same pixels at 1.0) (5 lines)

== record-tab.tsx  (§9 row 23: `area` prop and WriteScope removed (the app binding adds them))
  @@ app 6,17 library 6,12 @@
   // a line saying what the tab is for, its single create action, then the
   // content.
  +// The permission area is the app's: each app's record-tab binding requires
  +// `area` and wraps this in its WriteScope, so everything inside is
  +// default-deny for a session without edit rights there (spec §6.4).
   export function RecordTab({
  -  area,
     intro,
     action,
     children,
   }: {
  -  /**
  -   * The permission area this tab writes to — required, so adding a tab
  -   * cannot forget it (2026-08-28). Everything inside becomes default-deny
  -   * for a session without edit rights here: the create action and every
  -   * per-row Edit/Delete disappear rather than leading to an error page.
  -   */
  -  area: PermissionArea;
     /** One line: what this tab holds and what to do with it. */
     intro?: React.ReactNode;
  @@ app 30,9 library 25,7 @@
   }) {
     return (
  -    <WriteScope area={area}>
  -      <RecordTabLayout intro={intro} action={action}>
  -        {children}
  -      </RecordTabLayout>
  -    </WriteScope>
  +    <RecordTabLayout intro={intro} action={action}>
  +      {children}
  +    </RecordTabLayout>
     );
   }
  > §9 row 23 / §7 PermissionArea row: RecordTab has no `area` and renders no WriteScope; each app's record-tab binding adds both (§6.4) (19 lines)

== toast.tsx  (§9 row 33: offset through --ops-toast-offset)
  @@ app 104,5 library 104,5 @@
       );
       return () => dismissToast(id);
  -    // t is stable for the page's lifetime; the message is what matters.
  +    // strings and localize are stable for the page's lifetime; the message is what matters.
       // eslint-disable-next-line react-hooks/exhaustive-deps
     }, [error, trigger, tone, hasAction, actionLabel]);
  @@ app 191,7 library 191,8 @@
     return (
       <div
  -      // Above the assistant bubble (bottom-right, 3rem tall) so neither
  +      // Lifted by --ops-toast-offset (a plain :root variable, default 0px):
  +      // an app with a bottom-right bubble of its own sets it so neither
         // hides the other; full width minus the gutter on phones.
  -      className="pointer-events-none fixed right-4 bottom-[calc(max(1.25rem,env(safe-area-inset-bottom))+3.75rem)] z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 sm:right-5"
  +      className="pointer-events-none fixed right-4 bottom-[calc(max(1.25rem,env(safe-area-inset-bottom))+var(--ops-toast-offset,0px))] z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 sm:right-5"
         aria-live="assertive"
         role="region"
  > §9 row 33 / §7 toast-offset row: the viewport's 3.75rem lift is var(--ops-toast-offset, 0px); each app sets the variable in brand.css (spec §8.4: both at 3.75rem at the swap) (5 lines)
  > §7 i18n rows (useOpsUi): a comment naming the dictionary variable follows the substitution (2 lines)

Normalizations (what the diffs above ignore; spec §12.1 L6)
  import statements removed: 216 (both sides; §7 replaces every @/ import)
  kit-config hook lines (useDict / useMaybeDict / useLocale ↔ useOpsUi) → one marker: 23
  t.common.x → strings.x: 33
  dict?.common.x ?? "<EN_STRINGS.x>" → strings.x (the null-dictionary fallback is the English word): 2
  localizeMessage(t, s) → localize(s), incl. t ? localizeMessage(t, s) : s: 2
  blank lines dropped: 411; trailing whitespace trimmed
  React-free types moved to types.ts (§7 row 17), each proven against the app's definition: 7
    ActionIconName (action-icon.tsx): types.ts union = the 34 keys of `paths`, in order
    BadgeVariant (badge.tsx): types.ts union = the 5 `variant` variants of `badgeVariants`, in order
    CalloutTone (callout.tsx): identical union (6 members)
    StateMarkSpec (state-mark.tsx): identical definition
    StatusIconName (status-icon.tsx): identical union (16 members)
    ToastAction (toast.tsx): identical definition
    ToastTone (toast.tsx): identical union (4 members)

Modules (spec §3.1, §7; §12.1 L2)
  navigation/trail.ts        ← src/domain/nav-trail.ts: identical (whole module, imports aside)
  navigation/history.ts      ← src/lib/navigation-history.ts: identical (whole module, imports aside)
  navigation/nav-trail.tsx   ← src/components/shell/nav-trail.tsx: identical (whole module, imports aside)
  lib/date-input.ts          ← src/domain/date-input.ts: identical (whole module, imports aside)
  lib/use-dismissable.ts     ← src/lib/use-dismissable.ts: identical (whole module, imports aside)
  lib/cn.ts                  ← src/lib/utils.ts (excerpt: twMerge, cn)
      twMerge: identical
      cn: identical
  lib/fmt.ts                 ← src/i18n/locales.ts (excerpt: fmt)
      fmt: identical
  lib/text.ts                ← src/domain/search.ts (excerpt: normalizeSearchText, matchesAllWords, buildHaystack)
      normalizeSearchText: the app's normalizeSearchText returns foldText(…) from src/domain/names.ts; foldText's parameters and body equal the library's (\u escapes decoded); same output on 40 inputs (40 strings (đ/Đ, ß, č/š/ž/ć, diacritics, ligatures, punctuation, numbers, legal forms, mixed case))
      matchesAllWords: identical
      buildHaystack: identical
  lib/dates.ts               ← src/domain/dates.ts (excerpt: formatDate, shiftDay)
      formatDate: identical
      shiftDay: identical
  lib/months.ts              ← src/domain/months.ts (excerpt: shiftMonth)
      shiftMonth: identical

Kit words (spec §6.1): EN_STRINGS against src/i18n/dictionaries/en/common.ts: all 33 keys equal

FinaOps ahead of the 1.0 source, but not at this ref (spec §12.4): the proof holds for this ref only
  button.tsx: b775fb6 (Sign-in hardening, on origin/claude/trusting-keller-r5bi2t): AdminIconButton gains the deactivate / reactivate glyphs, used by settings/user-active-button.tsx

Verdict: PROVEN against FinaOps: 30 components identical after normalization, 5 differing only by named spec rows
```

Exit code: 0.

## Output against Workforce Ops (verbatim)

```text
diff-against-app: the extraction proof (spec §12.1 L6)
library  @latro/ops-ui 0.0.0 at e0afe5c
app      workforce-ops origin/main cea4928 (git archive export) - /tmp/claude-0/ops-ui-scratch/l7/workforce-ops
source   FinaOps - /tmp/claude-0/ops-ui-scratch/l7/fina-ops (where the two app kits differ, the library follows FinaOps)

Components (spec §9)
   1  action-icon.tsx        §7 row 17 (types.ts) + FinaOps-side (§9 row 1)
   2  attention-list.tsx     identical
   3  back-link.tsx          identical
   4  badge.tsx              §7 row 17 (types.ts)
   5  button.tsx             Workforce Ops ahead (spec §12.4 L6, DECISION OPEN)
   6  callout.tsx            identical
   7  card.tsx               identical
   8  combobox.tsx           identical
   9  confirm-dialog.tsx     FinaOps-side (§9 row 9)
  10  copy-value.tsx         identical
  11  date-input.tsx         Workforce Ops ahead (spec §12.4 L6, DECISION OPEN)
  12  description-list.tsx   identical
  13  dialog.tsx             Workforce Ops ahead (spec §12.4 L6, DECISION OPEN)
  14  empty-state.tsx        identical
  15  field.tsx              identical
  16  form-actions.tsx       identical
  17  glance-card.tsx        identical
  18  kicker.tsx             identical
  19  monogram.tsx           §9 row 19 / §7 Monogram row
  20  month-nav.tsx          identical
  21  page-header.tsx        identical
  22  page-help.tsx          identical
  23  record-tab.tsx         §9 row 23 / §7 PermissionArea row
  24  row-menu.tsx           identical
  25  search-input.tsx       identical
  26  segmented.tsx          FinaOps-side (§9 row 26)
  27  sheet.tsx              identical
  28  state-mark.tsx         identical
  29  status-icon.tsx        identical
  30  table.tsx              identical
  31  tabs.tsx               identical
  32  tag.tsx                FinaOps-side (§9 row 32)
  33  toast.tsx              §9 row 33 / §7 toast-offset row + §7 i18n rows (useOpsUi)
  34  search-form.tsx        not in this app (§9 row 34: joins from FinaOps)
  35  url-select.tsx         not in this app (§9 row 35: joins from FinaOps)
   -  validity-cell.tsx      app-local

Differences after normalization, and what accounts for each

== action-icon.tsx  (§9 row 1)
  @@ app 1,22 library 1,17 @@
   "use client";
  -// Shared record editors also open in other workspaces. Roll out icons only
  -// where requested, without changing those workspaces through shared forms.
  -export function hasActionIcons(pathname: string) {
  -  return (
  -    /^\/(workers|clients|companies|subcontractors|worksites|accommodations|vehicles|offers|contracts|operations)(\/|$)/.test(
  -      pathname,
  -    ) && !pathname.startsWith("/workers/recruiting")
  -  );
  -}
  -const IconScope = createContext(false);
  -export function ActionIconScope({ children }: { children: React.ReactNode }) {
  -  const pathname = usePathname();
  -  return (
  -    <IconScope.Provider value={hasActionIcons(pathname)}>
  -      {children}
  -    </IconScope.Provider>
  -  );
  +// Workforce Ops rolled action icons out route by route; FinaOps starts with
  +// them everywhere. The scope stays so a surface can opt out (the wall-style
  +// print views) without touching the buttons it renders.
  +const IconScope = createContext(true);
  +export function ActionIconScope({
  +  enabled = true,
  +  children,
  +}: {
  +  enabled?: boolean;
  +  children: React.ReactNode;
  +}) {
  +  return <IconScope.Provider value={enabled}>{children}</IconScope.Provider>;
   }
  -const paths = {
  +const paths: Record<ActionIconName, string> = {
     add: "M8 2v12M2 8h12",
     edit: "m10.5 2.5 3 3-8 8-4 1 1-4zM9 4l3 3",
  @@ app 53,5 library 48,5 @@
     bed: "M2 4v10M14 7v7M2 11h12M2 7h12M5 7V5H2",
     refresh: "M13 6a5 5 0 0 0-9-3L2 5M2 2v3h3M3 10a5 5 0 0 0 9 3l2-2M11 11h3v3",
  -} as const;
  +};
   /** Explicit action semantics; never infer icons from translated labels. */
   export function ActionIcon({
  > app kits differ here; the library takes FinaOps' copy (§9 row 1, source FinaOps): 17 Workforce-Ops-only line(s), 12 FinaOps-only line(s)
  > §7 row 17 (types.ts): ActionIconName is a union in types.ts now; the glyph table is annotated with it, so the two cannot drift (a type-only change) (4 lines)

== badge.tsx  (§9 row 4)
  @@ app 9,5 library 9,5 @@
           danger: "border-danger/30 bg-danger-subtle text-danger",
           info: "border-info/30 bg-info-subtle text-info",
  -      },
  +      } satisfies Record<BadgeVariant, string>,
       },
       defaultVariants: { variant: "neutral" },
  > §7 row 17 (types.ts): BadgeVariant is a union in types.ts now; the variant table is checked against it with satisfies (a type-only change) (2 lines)

== button.tsx  (§9 row 5)
  @@ app 90,25 library 90,4 @@
   }
   /**
  - * A button-styled plain anchor for links that leave the app — tel:, sms:,
  - * mailto:, WhatsApp, Viber (a Next Link would try to route them). It
  - * changes no data, so it shows in read-only scopes too.
  - */
  -export function ExternalButtonLink({
  -  className,
  -  variant,
  -  size,
  -  icon,
  -  children,
  -  ...props
  -}: React.ComponentProps<"a"> &
  -  VariantProps<typeof buttonVariants> & { icon?: ActionIconName }) {
  -  return (
  -    <a className={cn(buttonVariants({ variant, size }), className)} {...props}>
  -      {icon && <ActionIcon name={icon} />}
  -      {children}
  -    </a>
  -  );
  -}
  -/**
    * Reading an existing file: always available in read-only scopes, with the same
    * quiet appearance on every surface. A native anchor preserves file handling,
  > Workforce Ops changed this file after the survey (ce53be0: ExternalButtonLink, a button-styled plain <a> for tel:/sms:/mailto:/WhatsApp/Viber links); §9 says Same, the library follows FinaOps. Named in spec §12.4 L6: 21 Workforce-Ops-only line(s), 0 FinaOps-only line(s). Not an extraction bug.
  > FAIL decision open (spec §12.4 L6): 1.0.0 cannot replace this file in Workforce Ops without dropping the change

== confirm-dialog.tsx  (§9 row 9)
  @@ app 74,5 library 74,4 @@
     children?: React.ReactNode;
   }) {
  -  «kit config hook»
     return (
       <Dialog open={open} onClose={onClose} title={title}>
  > app kits differ here; the library takes FinaOps' copy (§9 row 9, source FinaOps): 1 Workforce-Ops-only line(s), 0 FinaOps-only line(s)

== date-input.tsx  (§9 row 11)
  @@ app 131,7 library 131,6 @@
     const [focusDay, setFocusDay] = useState<string | null>(null);
     const [today, setToday] = useState("");
  -  const [place, setPlace] = useState<{ top: number; left: number; maxHeight: number | null } | null>(null);
  +  const [place, setPlace] = useState<{ top: number; left: number } | null>(null);
     const panelRef = useRef<HTMLDivElement>(null);
  -  const sheetRef = useRef<HTMLDialogElement>(null);
     const panelId = useId();
     useDismissable(open, wrapRef, () => setOpen(false));
  @@ app 164,21 library 163,6 @@
     }
     // Measure before paint; follow the field while the page or dialog scrolls.
  -  // On touch screens the calendar is a BOTTOM SHEET — its own modal
  -  // <dialog> in the top layer (2026-09-30, Saša: "the clear click doesn't
  -  // register" on his iPhone). A fixed panel floating out of a dialog's
  -  // scrolling body is drawn by iOS Safari but its taps are lost past the
  -  // scroller's edge — exactly where Today / Clear sat. Nothing clips the top
  -  // layer, the sheet is full width (finger-sized days even when the field
  -  // is half a row), and a tap on the dimmed rest closes it.
     useLayoutEffect(() => {
       if (!open) return;
  -    if (coarse) {
  -      const sheet = sheetRef.current;
  -      if (sheet && !sheet.open) {
  -        sheet.showModal();
  -        riseSheet(sheet);
  -      }
  -      return;
  -    }
       const measure = () => {
         const field = wrapRef.current;
  @@ app 188,7 library 172,12 @@
         const height = panel.offsetHeight;
         const width = panel.offsetWidth;
  -      const { top, maxHeight } = floatingTop(rect, height, window.innerHeight);
  +      const gap = 4;
  +      const below = rect.bottom + gap;
  +      const top =
  +        below + height > window.innerHeight - 8 && rect.top - gap - height >= 8
  +          ? rect.top - gap - height
  +          : below;
         const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
  -      setPlace({ top, left, maxHeight });
  +      setPlace({ top, left });
       };
       measure();
  @@ app 199,8 library 188,8 @@
         window.removeEventListener("resize", measure);
       };
  -  }, [open, mode, coarse]);
  +  }, [open, mode]);
     // Keyboard focus follows the focused day.
     // Only once placed: a panel still hidden for measuring cannot take focus.
  -  const placed = coarse || place !== null;
  +  const placed = place !== null;
     useEffect(() => {
       if (!open || !focusDay || !placed) return;
  @@ app 261,24 library 250,4 @@
             : "text-ink hover:bg-surface-raised"
       );
  -  const asSheet = (panel: React.ReactNode) =>
  -    coarse ? (
  -      <dialog
  -        ref={sheetRef}
  -        aria-label={dp.openCalendar}
  -        className="mx-0 mt-auto mb-0 w-full max-w-full rounded-t-container border-t border-border bg-bg px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] text-ink shadow-xl backdrop:bg-ink/30"
  -        onCancel={(e) => {
  -          e.preventDefault();
  -          close(true);
  -        }}
  -        onClick={(e) => {
  -          // A tap on the dimmed backdrop lands on the dialog element itself.
  -          if (e.target === e.currentTarget) close(false);
  -        }}
  -      >
  -        {panel}
  -      </dialog>
  -    ) : (
  -      panel
  -    );
     return (
       <div
  @@ app 368,5 library 337,5 @@
         {name && <input ref={hiddenRef} type="hidden" name={name} value={iso} />}
         {!name && <input ref={hiddenRef} type="hidden" value={iso} />}
  -      {open && asSheet(
  +      {open && (
           <div
             ref={panelRef}
  @@ app 374,17 library 343,6 @@
             role="dialog"
             aria-label={dp.openCalendar}
  -          style={
  -            coarse
  -              ? undefined
  -              : place
  -                ? { top: place.top, left: place.left, maxHeight: place.maxHeight ?? undefined, overflowY: place.maxHeight ? "auto" : undefined }
  -                : { visibility: "hidden" }
  -          }
  -          className={cn(
  -            "bg-bg",
  -            coarse
  -              ? "mx-auto w-full max-w-[24rem]"
  -              : "fixed z-50 w-[18.5rem] rounded-container border border-border p-3 shadow-lg"
  -          )}
  +          style={place ? { top: place.top, left: place.left } : { visibility: "hidden" }}
  +          className="fixed z-50 w-[18.5rem] rounded-container border border-border bg-bg p-3 shadow-lg"
             onKeyDown={(e) => {
               if (e.key === "Escape") {
  @@ app 519,5 library 477,5 @@
                 disabled={!withinRange(today, min, max)}
                 onClick={() => pick(today)}
  -              className={cn("rounded-control font-medium text-primary hover:bg-primary-subtle disabled:cursor-not-allowed disabled:text-ink-muted disabled:hover:bg-transparent", coarse ? "px-4 py-2.5 text-sm" : "px-2 py-1 text-detail")}
  +              className="rounded-control px-2 py-1 text-detail font-medium text-primary hover:bg-primary-subtle disabled:cursor-not-allowed disabled:text-ink-muted disabled:hover:bg-transparent"
               >
                 {dp.today}
  @@ app 527,5 library 485,5 @@
                   type="button"
                   onClick={() => pick("")}
  -                className={cn("rounded-control font-medium text-ink-secondary hover:bg-surface-raised hover:text-ink", coarse ? "px-4 py-2.5 text-sm" : "px-2 py-1 text-detail")}
  +                className="rounded-control px-2 py-1 text-detail font-medium text-ink-secondary hover:bg-surface-raised hover:text-ink"
                 >
                   {dp.clear}
  > Workforce Ops changed this file after the survey (f364bd5 + ae37fb7 + ff90dde: the calendar stays whole on screen on phones (lib/floating-place.ts) and opens as a bottom sheet on touch screens (lib/sheet-motion.ts)); §9 says Same, the library follows FinaOps. Named in spec §12.4 L6: 57 Workforce-Ops-only line(s), 15 FinaOps-only line(s). Not an extraction bug.
  > FAIL decision open (spec §12.4 L6): 1.0.0 cannot replace this file in Workforce Ops without dropping the change

== dialog.tsx  (§9 row 13: label-matched discard guard kept until 2.0)
  @@ app 36,5 library 36,4 @@
         dirty.current = false; // fresh open = clean slate
         dialog.showModal();
  -      riseSheet(dialog);
       }
       if (!open && dialog.open) dialog.close();
  @@ app 96,12 library 95,5 @@
           // aligned) inherits straight in — hints stop wrapping and the whole
           // form goes right-aligned (both found at 375px, 2026-09-21).
  -        //
  -        // Phones: a BOTTOM SHEET (2026-09-30) — docked to the bottom edge,
  -        // full width, top corners rounded, clear of the home indicator; the
  -        // actions land in thumb reach. From sm the centred card as before.
  -        // max-w-md stays unprefixed so a caller's max-w-xl still widens it.
  -        "hidden flex-col whitespace-normal text-left bg-bg p-0 text-ink shadow-xl backdrop:bg-ink/40 open:flex",
  -        "mx-auto mt-auto mb-0 w-full max-w-md max-h-[calc(100dvh-2.5rem)] rounded-t-container border-t border-border pb-[env(safe-area-inset-bottom)]",
  -        "sm:my-auto sm:w-[calc(100%-2rem)] sm:max-h-[calc(100dvh-2rem)] sm:rounded-container sm:border sm:pb-0",
  +        "m-auto hidden max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md flex-col whitespace-normal rounded-container text-left border border-border bg-bg p-0 text-ink shadow-xl backdrop:bg-ink/40 open:flex",
           className
         )}
  > Workforce Ops changed this file after the survey (ff90dde: below sm every Dialog is a bottom sheet that rises in (lib/sheet-motion.ts)); §9 says Same, the library follows FinaOps. Named in spec §12.4 L6: 9 Workforce-Ops-only line(s), 1 FinaOps-only line(s). Not an extraction bug.
  > FAIL decision open (spec §12.4 L6): 1.0.0 cannot replace this file in Workforce Ops without dropping the change

== monogram.tsx  (§9 row 19: `external` tone reads --color-external (same pixels at 1.0))
  @@ app 4,5 library 4,6 @@
    * header, the employer on the worker list. Never a status, never a filter.
    * `tone="external"` tints a company that is not ours (a subcontractor) in
  - * the brand ochre, so their people stand out in a list (Saša, 2026-09-09).
  + * the "not ours" colour, --color-external (default: the brand accent), so
  + * their people stand out in a list (Saša, 2026-09-09).
    * The full name travels in `title` and for screen readers.
    */
  @@ app 24,5 library 25,5 @@
           "inline-flex shrink-0 items-center rounded-sm border px-1 py-0.5 text-micro font-semibold tracking-wide",
           tone === "external"
  -          ? "border-accent/50 bg-accent/10 text-accent"
  +          ? "border-external/50 bg-external/10 text-external"
             : "border-border bg-bg text-ink-secondary",
           className
  > §9 row 19 / §7 Monogram row: the external tone reads --color-external, which defaults to the brand accent (same pixels at 1.0) (5 lines)

== record-tab.tsx  (§9 row 23: `area` prop and WriteScope removed (the app binding adds them))
  @@ app 6,17 library 6,12 @@
   // a line saying what the tab is for, its single create action, then the
   // content.
  +// The permission area is the app's: each app's record-tab binding requires
  +// `area` and wraps this in its WriteScope, so everything inside is
  +// default-deny for a session without edit rights there (spec §6.4).
   export function RecordTab({
  -  area,
     intro,
     action,
     children,
   }: {
  -  /**
  -   * The permission area this tab writes to — required, so adding a tab
  -   * cannot forget it (2026-08-28). Everything inside becomes default-deny
  -   * for a session without edit rights here: the create action and every
  -   * per-row Edit/Delete disappear rather than leading to an error page.
  -   */
  -  area: PermissionArea;
     /** One line: what this tab holds and what to do with it. */
     intro?: React.ReactNode;
  @@ app 30,9 library 25,7 @@
   }) {
     return (
  -    <WriteScope area={area}>
  -      <RecordTabLayout intro={intro} action={action}>
  -        {children}
  -      </RecordTabLayout>
  -    </WriteScope>
  +    <RecordTabLayout intro={intro} action={action}>
  +      {children}
  +    </RecordTabLayout>
     );
   }
  > §9 row 23 / §7 PermissionArea row: RecordTab has no `area` and renders no WriteScope; each app's record-tab binding adds both (§6.4) (19 lines)

== segmented.tsx  (§9 row 26)
  @@ app 40,5 library 40,6 @@
         aria-label={label}
         className={cn(
  -        "flex w-fit shrink-0 items-center gap-0.5 rounded-control border border-border-strong p-0.5",
  +        // Never wider than its row: longer labels (Slovenian) scroll inside the control, like Tabs, instead of pushing the page sideways.
  +        "flex w-fit max-w-full shrink-0 items-center gap-0.5 overflow-x-auto rounded-control border border-border-strong p-0.5",
           className,
         )}
  > app kits differ here; the library takes FinaOps' copy (§9 row 26, source FinaOps): 1 Workforce-Ops-only line(s), 2 FinaOps-only line(s)

== tag.tsx  (§9 row 32)
  @@ app 10,4 library 10,5 @@
     tone = "neutral",
     className,
  +  title,
     children,
   }: {
  @@ app 15,8 library 16,11 @@
     tone?: "neutral" | "admin";
     className?: string;
  +  /** The full text when the chip truncates it. */
  +  title?: string;
     children: React.ReactNode;
   }) {
     return (
       <span
  +      title={title}
         className={cn(
           "inline-flex items-center gap-1.5 whitespace-nowrap rounded-control px-2 py-1 text-detail",
  > app kits differ here; the library takes FinaOps' copy (§9 row 32, source FinaOps): 0 Workforce-Ops-only line(s), 4 FinaOps-only line(s)

== toast.tsx  (§9 row 33: offset through --ops-toast-offset)
  @@ app 104,5 library 104,5 @@
       );
       return () => dismissToast(id);
  -    // t is stable for the page's lifetime; the message is what matters.
  +    // strings and localize are stable for the page's lifetime; the message is what matters.
       // eslint-disable-next-line react-hooks/exhaustive-deps
     }, [error, trigger, tone, hasAction, actionLabel]);
  @@ app 191,7 library 191,8 @@
     return (
       <div
  -      // Above the assistant bubble (bottom-right, 3rem tall) so neither
  +      // Lifted by --ops-toast-offset (a plain :root variable, default 0px):
  +      // an app with a bottom-right bubble of its own sets it so neither
         // hides the other; full width minus the gutter on phones.
  -      className="pointer-events-none fixed right-4 bottom-[calc(max(1.25rem,env(safe-area-inset-bottom))+3.75rem)] z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 sm:right-5"
  +      className="pointer-events-none fixed right-4 bottom-[calc(max(1.25rem,env(safe-area-inset-bottom))+var(--ops-toast-offset,0px))] z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 sm:right-5"
         aria-live="assertive"
         role="region"
  > §9 row 33 / §7 toast-offset row: the viewport's 3.75rem lift is var(--ops-toast-offset, 0px); each app sets the variable in brand.css (spec §8.4: both at 3.75rem at the swap) (5 lines)
  > §7 i18n rows (useOpsUi): a comment naming the dictionary variable follows the substitution (2 lines)

== validity-cell.tsx
  > §9 Not in 1.0: WFO-only, stays app-local (config.local) and joins in 1.1 behind a parity test (§12.4)

Normalizations (what the diffs above ignore; spec §12.1 L6)
  import statements removed: 210 (both sides; §7 replaces every @/ import)
  kit-config hook lines (useDict / useMaybeDict / useLocale ↔ useOpsUi) → one marker: 24
  t.common.x → strings.x: 33
  dict?.common.x ?? "<EN_STRINGS.x>" → strings.x (the null-dictionary fallback is the English word): 2
  localizeMessage(t, s) → localize(s), incl. t ? localizeMessage(t, s) : s: 2
  blank lines dropped: 403; trailing whitespace trimmed
  React-free types moved to types.ts (§7 row 17), each proven against the app's definition: 7
    ActionIconName (action-icon.tsx): types.ts union = the 34 keys of `paths`, in order
    BadgeVariant (badge.tsx): types.ts union = the 5 `variant` variants of `badgeVariants`, in order
    CalloutTone (callout.tsx): identical union (6 members)
    StateMarkSpec (state-mark.tsx): identical definition
    StatusIconName (status-icon.tsx): identical union (16 members)
    ToastAction (toast.tsx): identical definition
    ToastTone (toast.tsx): identical union (4 members)

Modules (spec §3.1, §7; §12.1 L2)
  navigation/trail.ts        ← src/domain/nav-trail.ts: identical (whole module, imports aside)
  navigation/history.ts      ← src/lib/navigation-history.ts: identical (whole module, imports aside)
  navigation/nav-trail.tsx   ← src/components/shell/nav-trail.tsx: identical (whole module, imports aside)
  lib/date-input.ts          ← src/domain/date-input.ts: identical (whole module, imports aside)
  lib/use-dismissable.ts     ← src/lib/use-dismissable.ts: identical (whole module, imports aside)
  lib/cn.ts                  ← src/lib/utils.ts (excerpt: twMerge, cn)
      twMerge: identical
      cn: identical
  lib/fmt.ts                 ← src/i18n/locales.ts (excerpt: fmt)
      fmt: identical
  lib/text.ts                ← src/domain/search.ts (excerpt: normalizeSearchText, matchesAllWords, buildHaystack)
      normalizeSearchText: identical
      matchesAllWords: identical
      buildHaystack: identical
  lib/dates.ts               ← src/domain/dates.ts (excerpt: formatDate, shiftDay)
      formatDate: identical
      shiftDay: identical
  lib/months.ts              ← src/domain/hours-periods.ts (excerpt: shiftMonth)
      shiftMonth: written differently; same output on 44,676 inputs (every month 1990-01 … 2040-12 × delta −36 … 36)
        @@ app 1,4 library 1,5 @@
         export function shiftMonth(month: string, delta: number): string {
           const [y, m] = month.split("-").map(Number);
        -  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
        +  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
        +  return d.toISOString().slice(0, 7);
         }

Kit words (spec §6.1): EN_STRINGS against src/i18n/dictionaries/en/common.ts: all 33 keys equal

Verdict: EXTRACTION PROVEN against Workforce Ops (22 components identical after normalization, 8 differing only by named spec rows), but Workforce Ops is ahead of the 1.0 source in button.tsx, date-input.tsx, dialog.tsx: kit changes made after the survey that 1.0.0 does not carry. Named in spec §12.4 (L6); the decision is open, so 1.0.0 is not releasable for Workforce Ops as it stands.
```

Exit code: 1 (the three files ahead of the 1.0 source; decision open, spec §12.4).

## Output against the FinaOps security branch (verbatim)

```text
diff-against-app: the extraction proof (spec §12.1 L6)
library  @latro/ops-ui 0.0.0 at e0afe5c
app      fina-ops origin/claude/trusting-keller-r5bi2t 0286b33 (git archive export) - /tmp/claude-0/ops-ui-scratch/l7/fina-ops-security

Components (spec §9)
   1  action-icon.tsx        §7 row 17 (types.ts)
   2  attention-list.tsx     identical
   3  back-link.tsx          identical
   4  badge.tsx              §7 row 17 (types.ts)
   5  button.tsx             FinaOps ahead (spec §12.4 L6 review, RE-IMPORT PENDING)
   6  callout.tsx            identical
   7  card.tsx               identical
   8  combobox.tsx           identical
   9  confirm-dialog.tsx     identical
  10  copy-value.tsx         identical
  11  date-input.tsx         identical
  12  description-list.tsx   identical
  13  dialog.tsx             identical
  14  empty-state.tsx        identical
  15  field.tsx              identical
  16  form-actions.tsx       identical
  17  glance-card.tsx        identical
  18  kicker.tsx             identical
  19  monogram.tsx           §9 row 19 / §7 Monogram row
  20  month-nav.tsx          identical
  21  page-header.tsx        identical
  22  page-help.tsx          identical
  23  record-tab.tsx         §9 row 23 / §7 PermissionArea row
  24  row-menu.tsx           identical
  25  search-input.tsx       identical
  26  segmented.tsx          identical
  27  sheet.tsx              identical
  28  state-mark.tsx         identical
  29  status-icon.tsx        identical
  30  table.tsx              identical
  31  tabs.tsx               identical
  32  tag.tsx                identical
  33  toast.tsx              §9 row 33 / §7 toast-offset row + §7 i18n rows (useOpsUi)
  34  search-form.tsx        identical
  35  url-select.tsx         identical

Differences after normalization, and what accounts for each

== action-icon.tsx  (§9 row 1)
  @@ app 13,5 library 13,5 @@
     return <IconScope.Provider value={enabled}>{children}</IconScope.Provider>;
   }
  -const paths = {
  +const paths: Record<ActionIconName, string> = {
     add: "M8 2v12M2 8h12",
     edit: "m10.5 2.5 3 3-8 8-4 1 1-4zM9 4l3 3",
  @@ app 48,5 library 48,5 @@
     bed: "M2 4v10M14 7v7M2 11h12M2 7h12M5 7V5H2",
     refresh: "M13 6a5 5 0 0 0-9-3L2 5M2 2v3h3M3 10a5 5 0 0 0 9 3l2-2M11 11h3v3",
  -} as const;
  +};
   /** Explicit action semantics; never infer icons from translated labels. */
   export function ActionIcon({
  > §7 row 17 (types.ts): ActionIconName is a union in types.ts now; the glyph table is annotated with it, so the two cannot drift (a type-only change) (4 lines)

== badge.tsx  (§9 row 4)
  @@ app 9,5 library 9,5 @@
           danger: "border-danger/30 bg-danger-subtle text-danger",
           info: "border-info/30 bg-info-subtle text-info",
  -      },
  +      } satisfies Record<BadgeVariant, string>,
       },
       defaultVariants: { variant: "neutral" },
  > §7 row 17 (types.ts): BadgeVariant is a union in types.ts now; the variant table is checked against it with satisfies (a type-only change) (2 lines)

== button.tsx  (§9 row 5)
  @@ app 124,5 library 124,5 @@
   }: Omit<React.ComponentProps<"button">, "children"> & {
     label: string;
  -  icon?: "edit" | "delete" | "unlock" | "permissions" | "key" | "deactivate" | "reactivate";
  +  icon?: "edit" | "delete" | "unlock" | "permissions" | "key";
   }) {
     const hidden = useReadOnlyScope();
  @@ app 135,7 library 135,4 @@
         "M8 1.5 14 4v4c0 3-3 5-6 6.5C5 13 2 11 2 8V4zM5.5 8l1.5 1.5 3.5-3.5",
       key: "M10 9a3.5 3.5 0 1 0-3-3L1.5 11.5v3h3v-2h2v-2z",
  -    // An account that can't sign in: the circle crossed out.
  -    deactivate: "M14.5 8a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0M3.4 3.4l9.2 9.2",
  -    reactivate: "M2 6h7a4 4 0 0 1 0 8H6M5 3 2 6l3 3",
     };
     return (
  > FinaOps changed this file after the 1.0 source commit (b775fb6 (Sign-in hardening, on origin/claude/trusting-keller-r5bi2t): AdminIconButton gains the deactivate / reactivate glyphs, used by settings/user-active-button.tsx). Named in spec §12.4 L6 review: 4 FinaOps-only line(s), 1 library-only line(s). Not an extraction bug.
  > FAIL FinaOps ahead (spec §12.4 L6 review): the library still holds the 1.0 source's copy, so F5's wrapper would drop the change (re-import before L7b)

== monogram.tsx  (§9 row 19: `external` tone reads --color-external (same pixels at 1.0))
  @@ app 4,5 library 4,6 @@
    * header, the employer on the worker list. Never a status, never a filter.
    * `tone="external"` tints a company that is not ours (a subcontractor) in
  - * the brand ochre, so their people stand out in a list (Saša, 2026-09-09).
  + * the "not ours" colour, --color-external (default: the brand accent), so
  + * their people stand out in a list (Saša, 2026-09-09).
    * The full name travels in `title` and for screen readers.
    */
  @@ app 24,5 library 25,5 @@
           "inline-flex shrink-0 items-center rounded-sm border px-1 py-0.5 text-micro font-semibold tracking-wide",
           tone === "external"
  -          ? "border-accent/50 bg-accent/10 text-accent"
  +          ? "border-external/50 bg-external/10 text-external"
             : "border-border bg-bg text-ink-secondary",
           className
  > §9 row 19 / §7 Monogram row: the external tone reads --color-external, which defaults to the brand accent (same pixels at 1.0) (5 lines)

== record-tab.tsx  (§9 row 23: `area` prop and WriteScope removed (the app binding adds them))
  @@ app 6,17 library 6,12 @@
   // a line saying what the tab is for, its single create action, then the
   // content.
  +// The permission area is the app's: each app's record-tab binding requires
  +// `area` and wraps this in its WriteScope, so everything inside is
  +// default-deny for a session without edit rights there (spec §6.4).
   export function RecordTab({
  -  area,
     intro,
     action,
     children,
   }: {
  -  /**
  -   * The permission area this tab writes to — required, so adding a tab
  -   * cannot forget it (2026-08-28). Everything inside becomes default-deny
  -   * for a session without edit rights here: the create action and every
  -   * per-row Edit/Delete disappear rather than leading to an error page.
  -   */
  -  area: PermissionArea;
     /** One line: what this tab holds and what to do with it. */
     intro?: React.ReactNode;
  @@ app 30,9 library 25,7 @@
   }) {
     return (
  -    <WriteScope area={area}>
  -      <RecordTabLayout intro={intro} action={action}>
  -        {children}
  -      </RecordTabLayout>
  -    </WriteScope>
  +    <RecordTabLayout intro={intro} action={action}>
  +      {children}
  +    </RecordTabLayout>
     );
   }
  > §9 row 23 / §7 PermissionArea row: RecordTab has no `area` and renders no WriteScope; each app's record-tab binding adds both (§6.4) (19 lines)

== toast.tsx  (§9 row 33: offset through --ops-toast-offset)
  @@ app 104,5 library 104,5 @@
       );
       return () => dismissToast(id);
  -    // t is stable for the page's lifetime; the message is what matters.
  +    // strings and localize are stable for the page's lifetime; the message is what matters.
       // eslint-disable-next-line react-hooks/exhaustive-deps
     }, [error, trigger, tone, hasAction, actionLabel]);
  @@ app 191,7 library 191,8 @@
     return (
       <div
  -      // Above the assistant bubble (bottom-right, 3rem tall) so neither
  +      // Lifted by --ops-toast-offset (a plain :root variable, default 0px):
  +      // an app with a bottom-right bubble of its own sets it so neither
         // hides the other; full width minus the gutter on phones.
  -      className="pointer-events-none fixed right-4 bottom-[calc(max(1.25rem,env(safe-area-inset-bottom))+3.75rem)] z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 sm:right-5"
  +      className="pointer-events-none fixed right-4 bottom-[calc(max(1.25rem,env(safe-area-inset-bottom))+var(--ops-toast-offset,0px))] z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 sm:right-5"
         aria-live="assertive"
         role="region"
  > §9 row 33 / §7 toast-offset row: the viewport's 3.75rem lift is var(--ops-toast-offset, 0px); each app sets the variable in brand.css (spec §8.4: both at 3.75rem at the swap) (5 lines)
  > §7 i18n rows (useOpsUi): a comment naming the dictionary variable follows the substitution (2 lines)

Normalizations (what the diffs above ignore; spec §12.1 L6)
  import statements removed: 216 (both sides; §7 replaces every @/ import)
  kit-config hook lines (useDict / useMaybeDict / useLocale ↔ useOpsUi) → one marker: 23
  t.common.x → strings.x: 33
  dict?.common.x ?? "<EN_STRINGS.x>" → strings.x (the null-dictionary fallback is the English word): 2
  localizeMessage(t, s) → localize(s), incl. t ? localizeMessage(t, s) : s: 2
  blank lines dropped: 411; trailing whitespace trimmed
  React-free types moved to types.ts (§7 row 17), each proven against the app's definition: 7
    ActionIconName (action-icon.tsx): types.ts union = the 34 keys of `paths`, in order
    BadgeVariant (badge.tsx): types.ts union = the 5 `variant` variants of `badgeVariants`, in order
    CalloutTone (callout.tsx): identical union (6 members)
    StateMarkSpec (state-mark.tsx): identical definition
    StatusIconName (status-icon.tsx): identical union (16 members)
    ToastAction (toast.tsx): identical definition
    ToastTone (toast.tsx): identical union (4 members)

Modules (spec §3.1, §7; §12.1 L2)
  navigation/trail.ts        ← src/domain/nav-trail.ts: identical (whole module, imports aside)
  navigation/history.ts      ← src/lib/navigation-history.ts: identical (whole module, imports aside)
  navigation/nav-trail.tsx   ← src/components/shell/nav-trail.tsx: identical (whole module, imports aside)
  lib/date-input.ts          ← src/domain/date-input.ts: identical (whole module, imports aside)
  lib/use-dismissable.ts     ← src/lib/use-dismissable.ts: identical (whole module, imports aside)
  lib/cn.ts                  ← src/lib/utils.ts (excerpt: twMerge, cn)
      twMerge: identical
      cn: identical
  lib/fmt.ts                 ← src/i18n/locales.ts (excerpt: fmt)
      fmt: identical
  lib/text.ts                ← src/domain/search.ts (excerpt: normalizeSearchText, matchesAllWords, buildHaystack)
      normalizeSearchText: the app's normalizeSearchText returns foldText(…) from src/domain/names.ts; foldText's parameters and body equal the library's (\u escapes decoded); same output on 40 inputs (40 strings (đ/Đ, ß, č/š/ž/ć, diacritics, ligatures, punctuation, numbers, legal forms, mixed case))
      matchesAllWords: identical
      buildHaystack: identical
  lib/dates.ts               ← src/domain/dates.ts (excerpt: formatDate, shiftDay)
      formatDate: identical
      shiftDay: identical
  lib/months.ts              ← src/domain/months.ts (excerpt: shiftMonth)
      shiftMonth: identical

Kit words (spec §6.1): EN_STRINGS against src/i18n/dictionaries/en/common.ts: all 33 keys equal

Verdict: EXTRACTION PROVEN against FinaOps (29 components identical after normalization, 5 differing only by named spec rows), but FinaOps is ahead of the 1.0 source in button.tsx: kit changes FinaOps made after the 1.0 source commit that the library has not re-imported. Named in spec §12.4; re-import them before L7b.
```

Exit code: 1.
