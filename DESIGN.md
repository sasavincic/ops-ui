# @latro/ops-ui — the shared design doctrine

The doctrine every app on the kit follows: Workforce Ops, FinaOps and PrefabOps. It moved here
from Workforce Ops' `DESIGN.md` (where it was written, 2026-08-27 to 2026-09-28) with the app
examples taken out; each app's own `DESIGN.md` keeps its palette, its mark, its navigation and
its screens, and points here for the rest. Token values and the brand contract are in
[`TOKENS.md`](TOKENS.md); what each component renders is in its source and its stories.

An app reads this file from its vendored copy (`src/vendor/ops-ui/DESIGN.md`). A change to the
doctrine is a library change: change ops-ui, release, sync.

**The design is predictable and uniform: every element means one thing and sits in one place.**
A user who learns one screen learns all of them, in every app. Two tests before adding anything:
*does this already have a name in the kit?* and *would a user who saw the sibling screen guess
where this is?* If a surface needs something new, the new thing goes into the kit and gets used
everywhere, never once.

## Theme and colour

Light, single theme; no dark mode. A pure white content surface; each app's identity is its
sidebar, its primary and its accent (the brand variables of `TOKENS.md`), and nothing else.
Strategy: restrained, the accent on at most a tenth of a surface.

| Role | Use |
|------|-----|
| bg | the content background (pure white) |
| surface / surface-raised | table heads, subtle fills, hover / selected and pressed fills |
| border / border-strong | hairlines / inputs |
| ink / ink-secondary / ink-muted | primary text / supporting text / labels and meta (≥ 4.5:1 on surface) |
| primary | buttons, links, focus, selection; white text on its fills |
| accent | the brand mark and the app's workspace register |
| external | "not ours": the Monogram chip of another company (defaults to the accent) |
| success / warning / danger / info / admin | statuses, each with a `-subtle` background tint; admin (violet) is the admin escape hatch only |

## Status, category, validity, attention

Before rendering any indicator, answer: whose fact is it, which dimension (lifecycle, category,
validity, attention, identity, count), for what time, on what evidence, and does the reader need
it here?

- **Status: the record's own current lifecycle position, changed by an event.** `Badge`: fully
  rounded, 12px medium text, ONE status icon (required; there is no per-colour fallback glyph),
  1px border, pale fill. `StateMark` is the same status outlined, for the exception where the
  ordinary state is silent; it takes any status variant. Read-only, never a button, no ARIA live
  role. A pill is a promise about NOW: never on a history row for a state that is over.
- **Category: what kind of thing.** A trade, a role, a legal form, a kind. `Tag` (6px, neutral
  surface) or an icon and a word; never a status colour.
- **Validity: a date read against today.** The date, then only when due a red "expired N d ago"
  (the problem glyph), an amber "in N d" (clock) or an amber "Validity unknown" (question); valid
  is the date alone; "No expiry" in words. One meaning, one wording and one severity everywhere.
- **Attention: what someone must do.** A line, never a pill: `AttentionList` in a list's last
  column, a health line under a record header, a due line in a row. Missing data is AMBER with
  the question glyph (a to-do); expired or overdue is RED (wrong now); coming is AMBER with the
  clock. The same missing field turns red only inside the dialog it blocks (strict at
  consequence). The row stripe, tab counts and glance cards take the HIGHEST severity they show.
  One finding keeps one severity on every page.
- **Identity: which company.** `Monogram`; a registration number is a monospace `Tag`.
- **Count: how many.** Tabular text. A tab's `count` is always the items it holds (muted); an
  alarm rides `attention` + `attentionTone` (amber/red), alone when the tab holds no countable
  collection.

| Hue | One meaning | Status examples |
|---|---|---|
| Green | live, in force | Active, Locked, Signed, Current |
| Blue | planned, standing by, in flight | Sent, Planned, Amended |
| Amber | needs a decision / coming / missing data | attention lines, onboarding |
| Red | wrong now | Expired, overdue, a blocking prerequisite |
| Slate | not live | Draft, Ended, Archived, Inactive, Withdrawn, Closed, Lost, Rejected, Terminated |

Icons (`StatusIcon`, one glyph per meaning): circle-dot current · check confirmed · lock
finalized/closed · pencil draft · paper-plane sent · clock planned/coming · pause paused · flag
ended · archive box archived · cross settled negative outcome · ring-with-bar (`problem`) wrong
now · question-circle unknown / missing · triangle (`alert`) only for a blocking prerequisite
before a commitment. Hue is scoped by role: a blue button and a blue Sent pill are told apart by
shape and place.

**The default state is silent, except in a record's own header.** Lists, child rows and search
results suppress ordinary lifecycle states (an active record, a locked document); exceptions use
`StateMark`. A record page HEADER always shows its lifecycle pill, the ordinary state included,
so "no pill" there reliably means "this record has no lifecycle".

**Dates are written out, never a blank to interpret**: an open period reads "ongoing", not a
dash beside a pill.

## One alert design: Callout, and the toast is a floating Callout

`Callout` is the one ALERT surface (danger / warning / info / success / neutral / admin) for
notes, gates and warnings in the flow, and a toast is the same component, floating: a
page-coloured card, a hairline border in the tone, the tone's glyph leading (`icon` overrides it
where the fact has its own, the lock on a locked record), the message in ink. Colour lives in the
border and the glyph, never in a tinted fill or tinted text, so an alert in the page and a toast
read as one thing; `className` places the box, `bodyClassName` lays out what is inside. A line
that ANNOTATES a row or a card is not an alert and stays an attention line. `Kicker` is the one
uppercase section label.

### Alerts are toasts

The test is not whether a message would move the layout but WHERE IT CAME FROM: anything an ACT
produces (a save, a status change, a pick in a form, a copy, a failed load) is a **toast**:
bottom-right over the content, full width minus the gutter on phones, with its own ✕.

- Tones: danger (refused, failed), warning (the pick breaks a soft rule), info (what the act
  did: "already planned", "stopped"), success ("Saved", "Copied"). Only success fades (6 s); the
  rest stay until dismissed or until whatever raised them clears or unmounts (closing a dialog
  takes its toasts with it). The same message is replaced, never stacked; at most four. A toast
  may carry ONE follow-up act ("Read again", "Retry").
- Raise one with `<ErrorToast error={…} />` (`trigger={state}` from `useActionState`
  re-announces an unchanged message), `<NoticeToast message={…} tone=… />`,
  `<SuccessToast message={…} />`, `pushToast(…)` from a click handler, or `DialogError` /
  `SheetError`. None of them renders anything in the flow. Server refusals arrive in English;
  the kit passes them through the app's `localize` (`OpsUiProvider`).
- A FIELD's message is a toast too: "Label: message". The field keeps a mark so it can be found:
  the label turns red (amber for a warning) with its glyph and the control's border follows; the
  hint stays where it is, so nothing below jumps. Focusing the field brings its toast back. A
  warning is raised on focus only unless the pick just broke a rule (`announceWarning`).
- An open modal `<dialog>` is the browser's top layer and makes the page inert, so each open
  Dialog is a toast HOST and the topmost draws the stack inside itself: a toast is never hidden
  under a modal. The page root mounts one `<Toaster />`.
- An app with its own bottom-right element (an assistant bubble) lifts the stack with
  `--ops-toast-offset`.

What is NOT an alert and stays content: STANDING STATE a record or a dialog shows because of what
it is, not because of what you just did: health lines, a gate listing what the records lack, a
review step a dialog lays out before you decide, a similar-records hint while typing.

## Typography

Geist Sans (and Geist Mono for document numbers and money columns). Six steps, each with one
job, every one of them named; no arbitrary font size anywhere:

| Utility | Size | Job |
|---------|------|-----|
| `text-micro` | 11px | uppercase section labels, kbd chips, monograms (`--text-micro`) |
| `text-xs` | 12px | badges, column heads, tab counts |
| `text-detail` | 13px | the supporting line under a primary value (`--text-detail`) |
| `text-sm` | 14px | body and data: table cells, form controls, buttons |
| `text-base` | 16px | card titles |
| `text-xl` | 20px | page titles |

The step is chosen by the **role of the content**, on every surface, a dense board included.
Density is bought with spacing, never by shrinking the type. `text-micro` is for its named roles
only. (`cn` knows `text-detail` and `text-micro` are sizes, so they never remove a colour class.)

## Primitives: text and layout without hand-typed recipes

Since 1.2 the kit names the class recipes every screen repeats, so a screen reads as what it
is instead of as a string of utilities. Before writing a `className` for text or a row of
things, walk the decision ladder (styling programme spec §3: use a kit component, promote a
shared one, build an app pattern, build a special) and reach for these first:

| Instead of | Write |
|---|---|
| `<p className="text-detail text-ink-muted">` | `<Text as="p" size="detail" tone="muted">` |
| `<span className="font-medium text-ink">` | `<Text weight="medium" tone="ink">` |
| `<h2 className="text-sm font-semibold text-ink">` | `<Heading level="section">` |
| `<div className="flex flex-col gap-4">` | `<Stack gap={4}>` |
| `<div className="flex flex-wrap items-center gap-2">` | `<Cluster gap={2}>` |
| `<div className="flex justify-end">` | `<Cluster wrap={false} align="stretch" justify="end">` |
| `<Link className="underline underline-offset-2 hover:text-ink">` | `<TextLink variant="quiet">` |
| `<TH className="hidden sm:table-cell text-right">` | `<TH hideBelow="sm" alignRight>` |
| `<TD className="font-mono text-right">` | `<TD numeric>` |

- **`Text`** carries one `size` (`body` 14px, `detail` 13px, `micro` 11px: the type scale
  below), one `tone` (ink, secondary, muted, or the warning / danger / success hue for a line
  that is itself an attention line) and one `weight`; `mono`, `block`, `truncate` as flags.
- **`Heading`** has three levels: `title` (a stand-alone card's title, the sign-in pages),
  `section` (a section of a page or a card) and `subsection` (a group inside a section or a
  sheet). A page's own title is `PageHeader`'s; an uppercase label is `Kicker`.
- **`Stack`** is a column, **`Cluster`** a row that wraps (and centres its items unless told
  otherwise): toolbars, chips, footers of buttons. Both take a `gap` from the spacing steps.
- **`TextLink`** is a link inside text: `quiet` (underlined, ink on hover), `underline`,
  `primary` (the link colour), `plain` (underline on hover), `strong` (a record's name outside a
  table; inside a table that is `RowLink`).
- **Table columns** hide below a breakpoint with `hideBelow`, align right with `alignRight`, and
  a number or money column is `numeric` (right-aligned, monospace).

Each renders exactly the classes it names, so moving a screen onto them changes no pixel. Spacing
that belongs to the surroundings (`mt-1`, `min-w-0`) stays in `className`. What is not a recipe
(a one-off grid, a special's geometry) stays a `className`, or the special's own stylesheet.

**The guards.** Each app runs the style checks of `scripts/sync-ops-ui.mjs` in its own
`tests/style-guards.test.ts` (README → "Style guards"): no colour literal in `.tsx` (colours are
tokens), no arbitrary value (`w-[37px]`) outside `style-allowlist.json`, `style={{}}` only for a
value computed at runtime (a `runtime:` comment, or CSS variables only), no raw `<button>`,
`<select>`, `<input>`, `<table>` outside the kit and the listed specials. The allow-list holds
today's exceptions, each with its reason, and only shrinks. `--style-report` prints the findings
and the most repeated class strings: the next recipes to name.

## Components

All variants via cva; no styling outside the kit and the tokens. Radius: 6px controls, 8px
containers. Every interactive component has default, hover, focus-visible and disabled states.

A **multi-pick from a vocabulary** is a grid of `CheckTile`s: the whole bordered tile is the
target, the tick sits in a drawn box, a picked tile turns primary-subtle. A tile may carry the
vocabulary's own glyph and a muted one-line hint that says why it is fixed or what it depends on;
a dependency is stated, never drawn as an indent. A bare `Checkbox` stays for a single boolean
beside its label. A boolean that changes how the record reads (a paper that never expires) is
the `Switch`: the whole row is the target, and it hides or reveals the field it makes moot.

**Dates are the kit `DateInput`**, never `<input type="date">`. It shows and takes DD-MM-YYYY
(typed leniently: "28.9.26", "280926"; digits alone gain their dashes; unreadable text returns to
the last good date when the field is left) and hands back ISO: a hidden input under `name` for
form posts, `onChange({ target: { value } })` for controlled callers. The calendar floats at the
field, weeks start on Monday, the title steps up to months and years, days outside min/max
cannot be picked, Today and Clear sit in its footer (no Clear when required). A touch screen
opens the calendar without the keyboard; on a desktop ↓ enters it and arrows / PageUp / PageDown
/ Home / End walk the days. Code that writes the hidden input from outside dispatches an `input`
event on it.

**Which select.** The native `Select` is for a short closed vocabulary whose words say
everything: a status, a type. A pick from **records** is the kit `Combobox`: a record knows more
than its name, and the row shows it (the `Monogram` chip, a right-aligned `meta` such as a rate
or a code, muted `lines`, optional `group` headings), and typing searches all of it, every word
in any order, ignoring case, diacritics and punctuation. Each app keeps one picker per record kind
over it, shared by every dialog that chooses that kind. A long closed list (249 countries) is a
`Combobox` too. Every `Combobox` is keyboard-driven: type, arrows move the highlight (a disabled
row is skipped), Enter picks and never submits the form, Escape closes the list.

A **month** is chosen with `MonthNav`: ghost chevrons either side and the month itself as a
button that opens a year + month grid. Link-based: the month lives in the URL.

## Actions

The variant states the **consequence**, never the importance. Four meanings, no others:

| Variant | Means | Examples |
|---------|-------|----------|
| `primary` | Brings something **new into existence**: a record, a document, or a commitment made real. **At most one per block.** | New client · Add deadline · Finalize · Issue invoice |
| `secondary` | **Changes something that already exists**: edits, adjusts, advances or closes it. | Save changes · Edit · Extend · End · Archive |
| `ghost` | **Changes no data at all**: escapes, navigation, view state, outputs, inline row actions. | Cancel · Back · Filter · Clear filters · Download PDF |
| `danger` / `ghostDanger` | **Permanently removes data.** `ghostDanger` for inline table rows. | Delete · Remove |

A *create* form is loud and an *edit* form is calm; a dialog that merely confirms a state change
has a secondary submit and no primary; admin escape hatches keep their violet regardless of
variant (`AdminIconButton` for a compact labelled admin icon). "One primary per **block**" means
a page header, a card, a dialog footer, not a screen, so the same act can be primary where it is
the sole commit and secondary beside a stronger one. A filter bar's Apply is `secondary`; every
other control in a filter bar is ghost.

**Two sizes**, from the kit's `size` prop, and nothing ever overrides their geometry with a
className: `md` (h-9, 14px, the default) in the record's own top row (`PageHeader` actions, form
submit rows, dialog footers, filter bars, an `EmptyState`'s action); `sm` (h-8, 13px) inside the
content (a card header's or `RecordTab`'s create, table row actions, sheet internals). The rule
is "how deep in the page is this?"; a whole action row is one size.

A row action is a **labelled** kit button, never a bare glyph (a ✎ alone is unreadable on
touch, where `title` never appears); when two actions in one row would both read "Edit", each
names its object. Opening an existing PDF or scan is `FileLink` (ghost, a document icon, a clear
label, visible to read-only users). A document number is `CopyValue`: fully readable, never
truncated.

**Record actions**: every create/edit surface puts its actions top-right in the `PageHeader` from
`sm` up and repeats the same row at the bottom of the content on phones (`HeaderActions` /
`BottomActions`, the same node rendered in both). Order: ghost escape, secondary middle actions,
the primary commit rightmost. Header action order on a record page is fixed left to right: state
changes, then Edit, then the admin or destructive action last. A record header carries no
creates: a create belongs with the collection it creates into.

## Records

Every record type has the same three surfaces:

1. **List**: filter bar, then the summary line, then the table. Nothing else.
2. **Detail**: `PageHeader` (name, status badge or exception mark, actions), then tabs. Overview
   is the first tab and a `DescriptionList`.
3. **Tab**: one shape per tab, a table or a stack of cards, never both. The tab's own create sits
   top-right above its content (`RecordTab` + `RecordTabAction`, primary sm, with at most one
   quieter companion; the row stacks on phones). A tab with one collection shows an
   `EmptyState` when empty; a tab of several named sections says "nothing yet" in one muted line
   inside each section's card.

A blank value reads differently by surface, on purpose: in an **overview** it says "Not set" in
words (`Value` / `NotSet` in the description-list kit); in a **table** it is an em dash. No bare
blanks, no "None", no "…". An empty state DESCRIBES and never repeats the page's standing create;
it may only offer a way out of the cause of the emptiness (Clear filters).

A person's name reads "Last, First" in any sorted list and "First Last" on their own page and in
prose; one rule, never mixed within a surface.

## Dialogs and sheets

Two overlay surfaces, each owning its interior so no caller re-decides it. A **Dialog** is a
modal for one focused act: `DialogBody` for the field stack, `DialogError` for the act's refusal
(a toast), `DialogFooter` for the ghost Cancel plus the commit button whose variant follows the
action table. A **Sheet** is the right-hand slide-over for reading and editing a record beside the
surface that named it: `SheetBody` / `SheetError` / `SheetFooter`, the last holding the
record-level destructive act at the END of the scroll, never pinned under a thumb. In 1.0 the
Dialog is the centred card at every width (Workforce Ops' phone bottom sheet is an open decision,
spec §12.4).

Both close **only** by their ✕: no backdrop click, no Escape, because both hold half-typed forms.
Once anything has been typed, the ✕ (and the Cancel) asks before discarding. The ghost escape
says "Cancel", and the discard guard finds it by that exact word; a two-stage confirm whose
escape goes *back to the form* relabels it through `closeLabel`, correct precisely because that
escape keeps the work. Never relabel an escape that discards. A destructive act *inside* an open
dialog uses `InlineConfirm`, not a second modal on top of the first (`ConfirmDialog` is the
stand-alone one).

## Lists: search, filters, toggles, tables

**Search and filters.** `SearchInput` is the page's search field (`type="search"`, the magnifier
inside, a `/` chip naming the shortcut); `SearchForm` and `UrlSelect` keep a list's filters in
the URL. One idiom on every list: one free-text search covering every identifying string plus at
most two selects for genuine scopes; rare attributes go into the search haystack, not another
select. Below the bar, the **summary line** is the only place counts live ("33 records · 2
incomplete · 1 archived hidden"), each count an ordinary text link that drills in. Terminal
records are hidden by default and the scope says so. Pill shapes are reserved for statuses: never
a filter, a count or a tag.

**Toggles.** A choice between mutually exclusive views is a `Segmented` control, link-based
because every such choice belongs in the URL. A boolean that hides things is a checkbox or a
link, never a pill. Anything else that changes only what you can see is a ghost button. **View
state is not a page**: `Tabs`, `Segmented` and `MonthNav` replace their history entry instead of
pushing one, so the browser's back leaves the page instead of re-walking every tab and month.
`BackLink` returns to where the person came from (the navigation trail, `NavTrail`) and falls
back to the page's parent.

**Tables.** Record lists stay classic tables: a list exists to find a record and open it. A row
uses only the shared furniture: the name cell (the link, an outlined exception mark, one secondary
line), `Tag` chips for vocabulary facts, the `Monogram` chip for a company, and the **Attention
column**, always the last column: what needs doing on the record, one line each, red for wrong
now, amber for missing or coming, no pills; the inset row stripe takes the highest severity
shown. **Every visual device means exactly one thing in every app**: the inset stripe means
"needs attention", the `Monogram` means "which company" (the external tone means "not ours").
Columns go identity → state → dates → money → actions. Below `sm` the secondary columns fold
into the name cell instead of scrolling sideways; wide content scrolls inside its own container,
never the page. Row menus (`RowMenu`) float at their button and open upward when there is no room
below. Empty tables use `EmptyState`.

## Read-only

A session that may not write never sees a control it cannot use. The kit's read-only scope
(`ReadOnlyScope`, rendered by each app's own permission scope) is default-deny: inside it
`Button`, `ButtonLink` and `AdminIconButton` render nothing, and `Field` controls and `DateInput`
come up disabled, unless marked `readOnlySafe` (a control that only narrows what is shown). A
nested scope may re-open a subtree.

## Responsive

Everything ships responsive; simple CRUD works at 375px. Breakpoints are Tailwind's
(640 / 768 / 1024 / 1280). Forms stack to one column below `sm`; detail grids stack below `lg`.
The top of a page is the same on every page of its kind: below `sm` the `PageHeader` actions sit
under the description; the header's action group is right-aligned at every width with the
primary always last, in the same corner on a phone and a laptop. On a touch screen the kit's small
controls grow (`pointer-coarse:`), and text inputs are 16px below `lg` (no focus zoom on phones).

## Motion

150–200ms, ease-out, state feedback only (hover, a dialog or toast arriving). No page
choreography. Under `prefers-reduced-motion: reduce` transitions are ~0ms (`styles/base.css`).
