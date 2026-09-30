# UI kit inventory: Workforce Ops (WFO) and FinaOps

Snapshot 2026-09-30, read-only. WFO is on branch `claude/trusting-keller-r5bi2t`; the kit and globals.css there match `origin/main` (no diff). FinaOps is on the same-named branch with uncommitted work, but none of it is in the kit or globals.css.

Sources: `workforce-ops/src/components/ui/*` (34 files, ~3,850 lines), `fina-ops/src/components/ui/*` (35 files, ~3,790 lines), both `src/app/globals.css`, both `DESIGN.md`, both root and `(app)` layouts, the kit's external dependencies, and `tests/`.

FinaOps' DESIGN.md says the kit is "a vendored copy" of WFO's, with WFO's doctrine applying unchanged. That holds in practice: 29 of the 32 files both apps have are byte-identical. The kit came into FinaOps with commit 4602fab on 2026-09-30, and two small FinaOps commits changed it after that (c60d043 tag `title`, 41e9e26 segmented overflow). The last WFO commits to touch the kit were a18eea0 and fe8abdd (2026-09-29) and 4185c88 (2026-09-28).

---

## 1. File-by-file comparison

| File | WFO vs FinaOps | Newer or better |
|---|---|---|
| action-icon.tsx | **DIFF**: the rollout strategy differs | FinaOps' API is the end state; WFO's gating is a transition |
| attention-list.tsx | same | |
| back-link.tsx | same | |
| badge.tsx | same | |
| button.tsx | same | |
| callout.tsx | same | |
| card.tsx | same | |
| combobox.tsx | same | |
| confirm-dialog.tsx | **DIFF**: 1 line | FinaOps (drops a dead variable) |
| copy-value.tsx | same | |
| date-input.tsx | same | |
| description-list.tsx | same | |
| dialog.tsx | same | |
| empty-state.tsx | same | |
| field.tsx | same | |
| form-actions.tsx | same | |
| glance-card.tsx | same | |
| kicker.tsx | same | |
| monogram.tsx | same | |
| month-nav.tsx | **DIFF**: import path only | neutral (the function is identical) |
| page-header.tsx | same | |
| page-help.tsx | same | |
| record-tab.tsx | same (the `PermissionArea` type it uses differs per app) | |
| row-menu.tsx | same | |
| search-input.tsx | same | |
| segmented.tsx | **DIFF**: overflow handling | FinaOps (newer, better) |
| sheet.tsx | same | |
| state-mark.tsx | same | |
| status-icon.tsx | same | |
| table.tsx | same | |
| tabs.tsx | same | |
| tag.tsx | **DIFF**: `title` prop | FinaOps (newer, additive) |
| toast.tsx | same (one WFO-specific offset, see §4) | |
| validity-cell.tsx | **WFO only** | generic idea, WFO-specific wiring |
| search-form.tsx | **FinaOps only** | generic |
| url-select.tsx | **FinaOps only** | generic |

### 1.1 The differences

1. **action-icon.tsx** (30 diff lines)
   - **WFO:** `hasActionIcons(pathname)` is a regex allow-list of routes: `/workers|clients|companies|subcontractors|worksites|accommodations|vehicles|offers|contracts|operations`, minus `/workers/recruiting`.
     - The `IconScope` context defaults to `false`.
     - `ActionIconScope` reads `usePathname()` from `next/navigation`.
     - `tests/ui/action-icon-scope.test.ts` pins the list.
     - The reason given is that shared record editors open in other workspaces, so icons roll out route by route.
   - **FinaOps:** the context defaults to `true`, and `ActionIconScope({ enabled = true })` has no route coupling and no `usePathname`.
   - **Verdict:** FinaOps has the right kit API. For a shared kit, WFO would pass `enabled={hasActionIcons(pathname)}` from its own `(app)` layout. That keeps WFO's behaviour and moves the route list and its test out of the kit.
   - Neither app ever passes `enabled={false}`. FinaOps mounts `<ActionIconScope>` in `(app)/layout.tsx` with no prop.
2. **confirm-dialog.tsx:** WFO's `ConfirmDialog` declares `const t = useDict();` and never uses it. FinaOps removed it. FinaOps is cleaner. `InlineConfirm` still uses `t` in both.
3. **month-nav.tsx:** WFO imports `shiftMonth` from `@/domain/hours-periods` and FinaOps from `@/domain/months`. The two functions do the same thing. A shared kit should own this three-line helper or take it from a shared date module.
4. **segmented.tsx:** FinaOps adds `max-w-full overflow-x-auto` so the control is never wider than its row. Longer Slovenian labels scroll inside the control, like Tabs, instead of pushing the page sideways (41e9e26, 2026-09-30). FinaOps is better. WFO has the same exposure with its sl/sr labels.
5. **tag.tsx:** FinaOps adds an optional `title?: string`, the full text when the chip truncates (c60d043, 2026-09-30). It is additive and backward compatible. FinaOps is better.

### 1.2 Files only one app has

- **validity-cell.tsx (WFO only)**
  - Exports `ValidityCell` and `ValidityNote`: a date read against today.
    - A valid date shows alone.
    - Expired shows a red "expired N d ago" line with the problem glyph.
    - Within 30 days shows an amber "in N d" line with the clock glyph.
    - No date shows amber "Validity unknown" with the question glyph.
    - A paper that never expires says so in words.
  - **The concept is generic** and fits FinaOps too (invoice due dates, statement freshness). **The wiring is WFO-specific:**
    - `@/domain/compliance` `documentExpiryStatus`, with `EXPIRY_WARNING_DAYS = 30` inside compliance
    - `@/domain/operations` `daysBetween`
    - dictionary paths under WFO feature namespaces: `t.workers.compliance.expiredAgo/expiresIn`, `t.compliance.desk.unknown`, `t.statuses.expiry.no_expiry`
  - **To share it:**
    - move the expiry status, the threshold and `daysBetween` into a kit-level pure module (or `domain/dates`)
    - move the keys to `common.validity.*`
    - make the warning window a prop
- **search-form.tsx (FinaOps only)**
  - A server component that is a list's search box as a plain GET form (`role="search"`).
  - It carries other query params in `keep` as hidden inputs and wraps `SearchInput name="q"` at `h-8`, width `w-full sm:w-72`.
  - It is generic. WFO's counterpart is the much bigger `components/records/list-toolbar.tsx` (`RecordListToolbar`: staged mobile filters, help, fixed params).
- **url-select.tsx (FinaOps only)**
  - A client filter that lives in the URL. It uses `useRouter/usePathname/useSearchParams`, rewrites one param with `router.replace` (view state is not a page), and its `reset` list names params to drop (for example page).
  - It is a kit `Select` with `readOnlySafe`, `h-8`, `text-detail`, `max-w-56`.
  - It is generic. WFO puts inline selects inside `RecordListToolbar` instead.

---

## 2. Each kit file: purpose, exported API and dependencies

Legend:
- *ext* = imports from outside `components/ui` (besides React)
- *kit* = imports from other kit files

The API applies to both apps unless marked.

### action-icon.tsx (client)
- **Purpose:** the action glyph vocabulary, 14px stroked 16×16 icons. Explicit semantics only: never inferred from translated labels.
- **API:**
  - `ActionIcon({ name, className?, always? })` returns null when the scope is off, unless `always` is set.
  - `type ActionIconName`
  - `ActionIconScope`
  - WFO also exports `hasActionIcons(pathname)`.
- **Glyphs (34):** add, edit, save, close, check, delete, archive, restore, enter, exit, calendar, upload, download, document, view, copy, send, print, link, search, filter, list, more, up, down, back, forward, settings, exchange, lock, unlock, user, bed, refresh.
- **ext:** `@/lib/utils` (cn); WFO also `next/navigation` (usePathname).

### attention-list.tsx (server-safe)
- **Purpose:** the Attention column. One line per to-do, with a glyph in the tone colour and no pills. An empty list renders nothing.
- **API:** `AttentionList({ items, className? })` and `type AttentionItem = { tone: "danger"|"warning"; text; icon?: StatusIconName }`. The default icons are danger → problem and warning → clock.
- **ext:** lib/utils. **kit:** status-icon.

### back-link.tsx (client)
- **Purpose:** the contextual Back link. It returns to where you came from via the nav trail; otherwise it falls back to href and label.
- **API:**
  - `ReturnLink(props & { href })`, shared by Cancel links
  - `BackLink({ href, label?, onBackClick? })`
- **ext:**
  - `next/link` (uses the `onNavigate` prop, Next 15.3+/16)
  - `@/components/shell/nav-trail` (`useReturnNavigation`), which pulls in `@/domain/nav-trail` and `@/lib/navigation-history`. All three files are identical in both apps.
  - `@/i18n/client` (`useDict` → `common.back`)

### badge.tsx (server-safe)
- **Purpose:** the STATUS pill: the record's current lifecycle position. The icon is required.
- **API:**
  - `Badge({ variant?, icon, appearance?: "tinted"|"outline", ...span })`
  - variants: neutral, success, warning, danger, info
  - `type BadgeVariant`
- **ext:** `class-variance-authority`, lib/utils. **kit:** status-icon.
- **Imported by the domain:** `domain/status-meta.ts` imports the `BadgeVariant` type in both apps.

### button.tsx (client)
- **Purpose:** every action control. Default-deny: inside a read-only `WriteScope` it renders nothing unless `readOnlySafe` is set.
- **API:**
  - `Button({ variant?, size?, readOnlySafe?, icon?: ActionIconName, ...button })`
  - `ButtonLink({ ...Link, variant?, size?, readOnlySafe?, icon?, returnNavigation? })`
  - `FileLink({ href?, size?, disabled?, target="_blank", rel, ...a })`: a ghost native anchor with an always-on document glyph, visible read-only
  - `AdminIconButton({ label, icon?: "edit"|"delete"|"unlock"|"permissions"|"key" })`: a violet bare icon with its own private path set, hidden read-only
- **Variants:** primary, secondary, ghost, ghostDanger, admin, danger. **Sizes:** sm (h-8, 13px), md (h-9, 14px).
- **ext:** cva, `next/link`, `@/components/permissions-provider` (`useReadOnlyScope`), lib/utils.
- **kit:** back-link (ReturnLink), action-icon.

### callout.tsx (server-safe)
- **Purpose:** the one alert surface, used both in page flow and as a toast. It is a page-coloured card with a tone hairline border and the tone glyph.
- **API:**
  - `Callout({ tone?, title?, icon?, className?, bodyClassName?, floating?, trailing?, children?, role? })`
  - `type CalloutTone` = danger | warning | info | success | neutral | admin
  - `CALLOUT_TONE` = { border, ink, icon } per tone
- **ext:** lib/utils. **kit:** status-icon.

### card.tsx (server-safe)
- **API:** `Card({ variant?: "solid"|"ghost" })` (ghost = dashed placeholder), `CardHeader`, `CardTitle` (h2), `CardBody`.
- **ext:** lib/utils.

### combobox.tsx (client)
- **Purpose:** a searchable single-select for picks from records. It is keyboard-driven (arrows, Enter picks, Escape closes) and matches every query word against what the row shows.
- **API:**
  - `Combobox({ id?, value, options, onChange, placeholder?, clearLabel?, tall? })`
  - `type ComboboxOption = { value, label, meta?, lines?, mark?: { code, tone?: "own"|"external", title? }, group?, disabled?, keywords? }`
  - `type ComboboxOptionLine`
  - `comboboxOptionMatches(option, query)`
- **ext:**
  - lib/utils
  - `@/i18n/client` (`useDict` → `common.search`, `common.noMatches`)
  - `@/domain/search` (`matchesAllWords`). Its logic is identical in both apps. WFO inlines the fold; FinaOps calls `foldText` in `domain/names`.
- **kit:** field (Input), monogram.

### confirm-dialog.tsx (client)
- **API:**
  - `InlineConfirm({ label, question, confirmLabel, pending?, onConfirm, armed, onArm })`: a two-step destructive action inside an open dialog
  - `ConfirmDialog({ open, onClose, title, body?, confirmLabel, variant?: "danger"|"secondary"|"primary", pending?, error?, onConfirm, children? })`
- **ext:** `@/i18n/client` (`common.cancel`, `common.saving`). **kit:** button, dialog.

### copy-value.tsx (client)
- **Purpose:** a monospace value that copies itself. "Copied" or "Copy failed" arrives as a toast. It is read-only-safe (a raw button, not the kit Button).
- **API:** `CopyValue({ value, className? })`.
- **ext:** `@/i18n/client` (`common.copyValue/copied/copyFailed/close`), lib/utils.
- **kit:** action-icon (copy glyph; hidden outside the icon scope in WFO), toast (`pushToast`).

### date-input.tsx (client, 537 lines)
- **Purpose:** the house date field. It shows and takes DD-MM-YYYY, typed leniently, and hands back ISO through a hidden input under `name` and `onChange({ target: { value } })`.
- **The calendar:**
  - a fixed-position panel that opens above the field when there is no room below
  - days → months → years
  - Monday-first weeks, min/max, Today/Clear
  - keyboard walk
- **On coarse pointers:** `inputMode="none"`, so a tap opens the calendar with no keyboard.
- **Outside writes:** it dispatches an `input` event so the Dialog discard guard arms, and follows `input` events that others dispatch on the hidden input (the scan reader).
- **API:** `DateInput({ id?, name?, value?, defaultValue?, onChange?, min?, max?, disabled?, required?, placeholder?, className?, readOnlySafe?, "aria-label"? })` and `type DateInputChange`.
- **ext:**
  - `@/components/permissions-provider` (`useReadOnlyScope`)
  - `@/domain/date-input` (isIsoDate, localTodayIso, maskTypedDate, monthGrid, parseTypedDate, shiftDayByMonths, shiftMonth, withinRange); identical in both apps
  - `@/domain/dates` (formatDate, shiftDay); identical in both apps
  - `@/i18n/client` (`common.datePicker.*`: placeholder, openCalendar, months, monthsShort, weekdays, today, clear, earliest, latest, chooseMonth, previous/next month, year, years)
  - `@/i18n/locales` (`fmt`)
  - `@/lib/use-dismissable`, lib/utils
- **kit:** field (`controlClasses`).

### description-list.tsx (server-safe)
- **API:**
  - `DescriptionList` (grid `sm:grid-cols-[10rem_1fr]`), `DT`, `DD`
  - `Value({ value, notSet })` and `NotSet({ label })`. Labels are passed in; the kit does no i18n here.
- **ext:** lib/utils.

### dialog.tsx (client)
- **Purpose:** the modal, a native `<dialog>` with `showModal`.
- **How it closes:** only via ✕ (no backdrop click and no Escape).
- **Discard guard:** the ✕ and any button whose text is exactly `t.common.cancel` go through `window.confirm(t.common.unsavedConfirm)`.
- **Other behaviour:**
  - a nested dialog's close event is ignored (target check)
  - the header stays pinned while the body scrolls
  - the dialog is a toast host while open (draws `ToastViewport` inside)
- **API:**
  - `Dialog({ open, onClose, title, children, footer?, className?, confirmDiscard? })`
  - `DialogBody`
  - `DialogError({ children, trigger })`: a toast that renders nothing in the page
  - `DialogFooter({ onClose, onSubmit?, submitLabel, submitIcon?, closeLabel?, variant?, pending?, disabled?, pendingLabel?, form?, note?, children? })`
- **ext:** `@/i18n/client` (`common.cancel/unsavedConfirm/close/saving`), lib/utils.
- **kit:** action-icon (type), button, toast.

### empty-state.tsx (server-safe)
- **API:** `EmptyState({ title, description?, action?, className? })`. It renders as a dashed box.
- **ext:** lib/utils.

### field.tsx (client)
- **Purpose:** form controls.
  - A field's error or warning is raised as a toast ("Label: message", localized). The label and border turn red or amber, and the toast comes back when the field is focused.
  - Controls come up disabled inside a read-only scope unless `readOnlySafe` is set.
- **API:**
  - `controlClasses`
  - `Field({ label, htmlFor, error?, warning?, hint?, announceWarning?, className, children })`
  - `Input`, `Select`, `Checkbox({ label })`, `CheckTile({ label, hint?, icon? })`, `FileInput` (accept pdf/images), `Textarea`
  - `Switch({ id?, name?, label, hint?, checked, onChange, disabled?, readOnlySafe? })`: role=switch plus a hidden input
- **ext:**
  - `@/components/permissions-provider` (`useReadOnlyScope`)
  - `@/i18n/client` (`useMaybeDict`, so it works outside the provider on the login page)
  - `@/i18n/messages` (`localizeMessage`). FinaOps' version is richer, see §5.
  - lib/utils
- **kit:** status-icon, toast (`useAnchoredToast`).

### form-actions.tsx (server-safe)
- **API:** `HeaderActions` (shown from sm up) and `BottomActions` (phones only). The same node is rendered in both places.
- **ext:** lib/utils.

### glance-card.tsx (server-safe)
- **API:** `GlanceCard({ title, href, openLabel="Open", children })`. The default "Open" is hard-coded English.
- **ext:** `next/link`. **kit:** card.
- **Usage:** WFO 2 importers, FinaOps 0.

### kicker.tsx (server-safe)
- **API:** `Kicker({ icon?, as?: span|h3|h4|p|div, className?, children })`: an uppercase micro label.
- **ext:** lib/utils.
- **Usage:** WFO 2 importers, FinaOps 0.

### monogram.tsx (server-safe)
- **Purpose:** the company chip.
- **API:** `Monogram({ code, title?, tone?: "own"|"external", className? })`. `external` is tinted with **accent**.
- **ext:** lib/utils.

### month-nav.tsx (client)
- **Purpose:** the one month navigator: ghost chevron links plus a month button that opens a year/month grid. It uses `router.replace`, since view state is not a page.
- **API:** `MonthNav({ month: "YYYY-MM", hrefPattern: "…{m}…", className? })`. The pattern also accepts `%7Bm%7D`.
- **ext:**
  - `next/link`, `next/navigation` (useRouter)
  - `shiftMonth` from `@/domain/hours-periods` (WFO) or `@/domain/months` (FinaOps)
  - `@/i18n/client` (`useDict` → `common.prevMonth/nextMonth/pickMonth/prevYear/nextYear`; `useLocale`)
  - `@/lib/use-dismissable`, lib/utils
- **Month names come from `toLocaleDateString(locale)` (Intl).**
  - This is the only Intl use in the kit.
  - For `sr` it renders Cyrillic ("септембар 2026.", checked in Node), while the WFO Serbian UI is Latin. DateInput uses the Latin names in the dictionary instead.
  - It also risks the Node-vs-browser ICU hydration drift that FinaOps' DESIGN.md bans for money and charts.
  - Fix: take the names from `common.datePicker.months/monthsShort`.

### page-header.tsx (server-safe)
- **API:** `PageHeader({ title, meta?, description?, backHref?, backLabel?, onBackClick?, actions?, className? })`. The actions are right-aligned at every width and sit under the description on phones.
- **ext:** lib/utils. **kit:** back-link.

### page-help.tsx (client)
- **API:** `PageHelp({ label, children })`: an ⓘ popover (inline SVG), dismissed by an outside press or Escape.
- **ext:** `@/lib/use-dismissable`. It does not use cn.

### record-tab.tsx (client)
- **Purpose:** the one shape for a record tab: an intro line, one create action, then the content, wrapped in `WriteScope(area)`.
- **API:**
  - `RecordTab({ area: PermissionArea, intro?, action?, children })`
  - `RecordTabAction({ onClick, children, disabled? })`: primary, sm, add icon
  - `RecordTabNote`
- **ext:** `@/components/permissions-provider` (`WriteScope`, `useReadOnlyScope`); `@/domain/permissions` (**the type `PermissionArea`**, a large dotted union in WFO and `ledger|invoicing|setup|close|users` in FinaOps).
- **kit:** button.
- **Usage:** FinaOps has 0 importers.

### row-menu.tsx (client)
- **Purpose:** the row kebab. The menu is `position: fixed` at its button, opens upward when there is no room below, and follows the button on scroll.
- **API:** `RowMenu({ label, items, className? })` and `type RowMenuItem = { key, label, icon: ActionIconName, href?, onClick?, danger?, disabled? }`.
- **ext:** `next/link`, `@/lib/use-dismissable`, lib/utils.
- **kit:** action-icon (`more` with `always`), button.

### search-input.tsx (client)
- **API:**
  - `SearchInput({ wrapperClassName?, ...Input })`: `type=search`, readOnlySafe, a magnifier, and a `/` kbd chip on lg that hides once the field is focused or filled
  - `SearchIcon({ size? })`
- **ext:** lib/utils. **kit:** field.

### segmented.tsx (server-safe or client)
- **Purpose:** mutually exclusive views.
- **API:**
  - `Segmented<T>({ label, value, options, className?, disabled?, onValueChange? })`
  - With `onValueChange` it renders buttons (`aria-pressed`, role group); without it, Links with `replace` (role navigation).
  - `type SegmentedOption<T> = { value, label, href, icon? }`
- **ext:** `next/link`, lib/utils.

### sheet.tsx (client)
- **Purpose:** the right-hand slide-over. It closes only via ✕; an optional `exitCheck` arms on input and disarms on a button labelled exactly `common.save`.
- **API:**
  - `Sheet({ title, badge?, toolbar?, headerActions?, contentKey?, exitCheck?, onClose, children, className? })`
  - `SheetBody`, `SheetError({ children, trigger })` (a toast), `SheetFooter`
- **ext:** `@/i18n/client` (`common.close/save/unsavedConfirm`), lib/utils. **kit:** toast.

### state-mark.tsx (server-safe)
- **API:** `StateMark({ tone, icon, className?, title?, children })` renders an outlined `Badge`. `type StateMarkSpec`.
- **kit:** badge, status-icon (type).
- **Imported by the domain:** WFO's `domain/status-meta.ts` imports `StateMarkSpec`.

### status-icon.tsx (server-safe)
- **Purpose:** the read-only state glyphs, one glyph per meaning: 12px, stroke 1.6, 16×16.
- **API:** `StatusIcon({ name, className? })` and `type StatusIconName`.
- **Glyphs (16):** current, check, clock, alert (only for blocking prerequisites), problem, question, close, draft, ended, inactive, archive, key, lock, send, minus, info.
- **ext:** lib/utils.
- **Imported by the domain:**
  - WFO: `domain/status-meta.ts`, `domain/search.ts`, `domain/compliance.ts`
  - FinaOps: `status-meta.ts` and `search.ts`

### table.tsx (client)
- **API:**
  - `Table({ containerClassName?, ...table })` (a scroll wrapper), `THead`, `TBody`
  - `TR({ href? })`: a whole-row click through a `router.push` handler that skips inner links and buttons
  - `TH`, `TD`, `RowLink`
- **ext:** `next/link`, `next/navigation` (useRouter), lib/utils.

### tabs.tsx (server-safe)
- **Purpose:** URL tabs that replace the history entry. Each tab can show a count plus attention colouring.
- **API:** `Tabs({ items, active, hrefFor })` and `type TabItem = { key, label, count?, attention?, attentionTone?, attentionLabel? }`.
- **Watch:** `aria-label="Tabs"` is hard-coded English, and `hrefFor` is a function, so the caller must be a client component or the Tabs render in RSC.
- **ext:** `next/link`, lib/utils.

### tag.tsx (server-safe)
- **Purpose:** a category chip (not a status).
- **API:** `Tag({ icon?, tone?: "neutral"|"admin", className?, children })`. FinaOps adds `title?`.
- **ext:** lib/utils.

### toast.tsx (client)
- **Purpose:** the module-level toast store.
  - At most 4 toasts. The same tone and message replaces the existing toast.
  - Only success fades (6 s).
  - Open Dialogs register as hosts, and the topmost host draws the stack, because a native modal makes the page inert.
- **API:**
  - `ToastTone`, `ToastAction`
  - `pushToast(tone, message, closeLabel="Close", action?)`, `dismissToast(id)`, `currentToasts()` (tests)
  - `useErrorToast(error, trigger?, tone?, action?)`, `ErrorToast`, `NoticeToast`, `SuccessToast`
  - `useAnchoredToast(text, tone, onAppear, closeLabel?)`
  - `useToastHost(active)`, `ToastViewport`, `Toaster` (the page-root host, mounted in the ROOT layout in both apps)
- **ext:**
  - `@/i18n/client` (`useMaybeDict`), `@/i18n/messages` (`localizeMessage`), lib/utils
  - **CSS:** needs the `@keyframes toast-in` in globals.css (`motion-safe:animate-[toast-in_180ms_ease-out]`)
- **kit:** callout.
- **App-specific leak:** the viewport sits at `bottom: calc(max(1.25rem, safe-area) + 3.75rem)` to clear **WFO's assistant bubble**. FinaOps has no assistant launcher, so its toasts float 3.75rem higher than they need to. This should become a CSS variable (for example `--toast-offset`).

### validity-cell.tsx (WFO only, client)
- See §1.2.
- **API:** `ValidityCell({ date, today, noExpiry?, label?, className? })` and `ValidityNote({ … })`.
- **ext:** `@/domain/compliance`, `@/domain/dates`, `@/domain/operations`, `@/i18n/client`, `@/i18n/locales`, lib/utils. **kit:** status-icon.

### search-form.tsx (FinaOps only, server)
- **API:** `SearchForm({ action, value, placeholder, keep, className? })`.
- **ext:** lib/utils. **kit:** search-input.

### url-select.tsx (FinaOps only, client)
- **API:** `UrlSelect({ param, value, options, label, reset?, className? })`.
- **ext:** `next/navigation` (usePathname, useRouter, useSearchParams), lib/utils. **kit:** field (Select).

---

## 3. The external dependency surface, collected

The kit reaches out of its folder to these modules only:

| Module | Used by | Same in both apps? |
|---|---|---|
| `@/lib/utils` `cn` | ~29 files | **identical**. Its `extendTailwindMerge` registers `text-detail` and `text-micro` as font sizes; this is load-bearing, otherwise the size eats `text-white` on sm buttons |
| `@/lib/use-dismissable` | date-input, month-nav, page-help, row-menu | identical |
| `@/components/permissions-provider` `useReadOnlyScope`, `WriteScope` | button, date-input, field, record-tab | the files differ (WFO adds `adminTools` and `useAdminTools`), but the four symbols the kit uses behave the same |
| `@/domain/permissions` `PermissionArea` (type) | record-tab | **per-app union** |
| `@/components/shell/nav-trail` (+ `domain/nav-trail`, `lib/navigation-history`) | back-link, and so button via ReturnLink | identical |
| `@/i18n/client` `useDict`, `useMaybeDict`, `useLocale` | back-link, combobox, confirm-dialog, copy-value, date-input, dialog, field, month-nav, sheet, toast, validity-cell | same API. The locale sets differ: WFO en/sl/sr, FinaOps en/sl |
| `@/i18n/messages` `localizeMessage` | field, toast | **differs**: FinaOps adds `{placeholder}` templates and `messageKeyMatches`, a superset and better |
| `@/i18n/locales` `fmt` | date-input, validity-cell | same `fmt`. FinaOps adds `LOCALE_TAGS` (BCP-47 tags) |
| `@/domain/search` `matchesAllWords` | combobox | same behaviour, different module internals |
| `@/domain/date-input`, `@/domain/dates` | date-input, validity-cell | identical |
| `@/domain/months` or `@/domain/hours-periods` `shiftMonth` | month-nav | same function, different module |
| `@/domain/compliance`, `@/domain/operations` | validity-cell | WFO only |
| `next/link` | back-link, button, glance-card, month-nav, row-menu, segmented, table, tabs | Next 16.2.10 in both |
| `next/navigation` | month-nav, table, (WFO) action-icon, (FinaOps) url-select | |
| `class-variance-authority` | badge, button | 0.7.1 in both |

The kit reads these dictionary keys, and all of them exist in both apps' `en/common.ts`:
- `common.back, cancel, close, save, saving, unsavedConfirm, search, noMatches, open`
- `common.copyValue, copied, copyFailed`
- `common.pickMonth, prevMonth, nextMonth, prevYear, nextYear`
- `common.datePicker.*`

The only exception is `validity-cell`, which reads the WFO feature namespaces listed in §1.2.

**Reverse dependency (a cycle risk):** domain modules import kit types.
- `status-meta.ts` imports `BadgeVariant`, `StatusIconName` and, in WFO, `StateMarkSpec`.
- `search.ts` imports `StatusIconName`.
- WFO's `compliance.ts` also imports `StatusIconName`.

The imports are type-only, but a shared kit package must export these types without React.

**Shared outside the kit folder, but not part of it.** These files are also vendored across the two apps (identical files marked *):
- *`shell/nav-trail.tsx`, *`shell/pull-to-search.tsx`, *`shell/sign-out-button.tsx`, *`unsaved-exit-guard.tsx`
- *`settings/role-glyph.tsx`, *`role-select.tsx`, *`add-user-dialog.tsx`, *`forced-password-form.tsx`
- *`lib/keyboard.ts`, *`pointer-intent.ts`, *`pull-to-search.ts`, *`file-urls.ts`, *`auth-client.ts`, *`use-dismissable.ts`, *`utils.ts`, *`navigation-history.ts`
- *`domain/date-input.ts`, *`dates.ts`, *`nav-trail.ts`
- *`i18n/dictionaries/types.ts`
- These differ between the apps: `country-combobox.tsx`, `permissions-provider.tsx`, `shell/sidebar.tsx`, `shell/command-palette.tsx`, `shell/mobile-top-bar.tsx`, `domain/status-meta.ts`, `domain/monogram.ts` (2 lines), `i18n/*`.

---

## 4. How widely each file is used (importers outside the kit)

| File | WFO | FinaOps |
|---|---|---|
| button | 115 | 40 |
| field | 82 | 25 |
| dialog | 62 | 12 |
| toast | 59 | 28 |
| card | 49 | 19 |
| date-input | 42 | 5 |
| page-header | 37 | 27 |
| table | 35 | 20 |
| empty-state | 28 | 16 |
| callout | 26 | 13 |
| badge | 25 | 13 |
| monogram | 19 | 14 |
| confirm-dialog | 17 | 11 |
| combobox | 16 | 6 |
| tag | 15 | 14 |
| state-mark | 14 | 4 |
| tabs | 13 | 3 |
| action-icon | 12 | 1 |
| row-menu | 12 | 4 |
| status-icon | 12 | 7 |
| attention-list | 11 | 10 |
| record-tab | 11 | **0** |
| description-list | 10 | 8 |
| form-actions | 9 | 2 |
| search-input | 8 | 2 |
| validity-cell | 8 | — |
| copy-value | 6 | **0** |
| segmented | 6 | 8 |
| month-nav | 5 | 4 |
| page-help | 4 | 1 |
| sheet | 3 | 1 |
| glance-card | 2 | **0** |
| kicker | 2 | **0** |
| back-link | 0 (via PageHeader, Button) | 0 |
| search-form | — | 4 |
| url-select | — | 6 |

FinaOps carries four kit files it does not use yet: record-tab, copy-value, glance-card and kicker.

---

## 5. The token layer (globals.css)

**Setup.** Both apps use Tailwind v4 CSS-first:
- `@import "tailwindcss"` plus `@theme { … }`
- `postcss.config.mjs` with only `@tailwindcss/postcss`
- no `tailwind.config`, no `@custom-variant`, no `@plugin`

The kit relies on v4 built-in variants: `pointer-coarse:`, `open:`, `backdrop:`, `has-[…]`, `group/name`, `peer-[…]`, `motion-safe:`, arbitrary `animate-[toast-in…]`.

**Gotcha, documented in both files:** a double-quoted string inside a comment in `@theme` makes Tailwind silently drop the next declaration.

### 5.1 Every custom property

WFO defines 37 and FinaOps 34.

| Token | WFO | FinaOps | Class |
|---|---|---|---|
| --color-bg | oklch(1 0 0) | oklch(1 0 0) | neutral/structural (identical) |
| --color-surface | 0.975 0.003 250 | 0.976 0.004 170 | neutral slot, per-brand tint |
| --color-surface-raised | 0.955 0.005 250 | 0.956 0.006 170 | neutral slot, per-brand tint |
| --color-border | 0.9 0.006 250 | 0.9 0.008 170 | neutral slot, per-brand tint |
| --color-border-strong | 0.8 0.01 250 | 0.8 0.012 170 | neutral slot, per-brand tint |
| --color-ink | 0.21 0.015 255 | 0.21 0.014 185 | neutral slot, per-brand tint |
| --color-ink-secondary | 0.42 0.02 255 | 0.42 0.018 185 | neutral slot, per-brand tint |
| --color-ink-muted | 0.52 0.02 255 | 0.52 0.018 185 | neutral slot, per-brand tint |
| --color-sidebar | 0.185 0.025 255 (#0b131e) | 0.31 0.064 160 (#083a25) | brand (chrome) |
| --color-sidebar-fg | 0.78 0.012 250 | 0.87 0.03 157 | brand (chrome) |
| --color-sidebar-fg-active | 0.97 0.005 250 | 0.98 0.008 160 | brand (chrome) |
| --color-sidebar-hover | 0.24 0.03 255 | 0.355 0.068 160 | brand (chrome) |
| --color-sidebar-active | 0.29 0.055 253 | 0.4 0.074 160 | brand (chrome) |
| --color-sidebar-border | 0.27 0.03 255 | 0.41 0.052 160 | brand (chrome) |
| --color-primary | 0.45 0.12 250 (cobalt) | 0.47 0.083 178 (teal-green) | brand |
| --color-primary-hover | 0.39 0.115 250 | 0.41 0.075 178 | brand |
| --color-primary-subtle | 0.94 0.03 250 | 0.95 0.03 178 | brand |
| --color-accent | 0.64 0.13 60 (ochre) | 0.77 0.13 86 (gold) | brand (the mark; WFO workspace nav register; **also the kit's Monogram `external` tone**) |
| --color-tool | 0.74 0.1 195 (teal) | — | app-specific (WFO Tools nav register) |
| --color-success | 0.48 0.11 155 | 0.49 0.12 145 | status. Same meaning; the hue deliberately moved in FinaOps so it does not read as the teal primary |
| --color-success-subtle | 0.955 0.04 155 | 0.955 0.045 145 | status |
| --color-warning | 0.5 0.115 80 | same | status (identical) |
| --color-warning-subtle | 0.965 0.05 90 | same | status (identical) |
| --color-danger | 0.49 0.16 25 | same | status (identical) |
| --color-danger-subtle | 0.96 0.022 20 | same | status (identical) |
| --color-info | 0.47 0.1 240 | 0.47 0.1 **245** | status (a 5° drift; FinaOps' DESIGN.md claims "keeps the WFO hues", so this is probably unintended) |
| --color-info-subtle | 0.95 0.028 240 | 0.95 0.028 245 | status |
| --color-admin | 0.47 0.19 305 | same | semantic (privilege violet, identical) |
| --color-admin-subtle | 0.955 0.035 305 | same | semantic (identical) |
| --color-sick | 0.5 0.15 345 | — | app-specific (WFO absence category) |
| --color-sick-subtle | 0.96 0.03 345 | — | app-specific |
| --font-sans | var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif | same | structural |
| --font-mono | var(--font-geist-mono), ui-monospace, monospace | same | structural |
| --text-detail | 13px | same | structural (type scale) |
| --text-micro | 11px | same | structural (type scale) |
| --radius-control | 6px | same | structural |
| --radius-container | 8px | same | structural |

`--font-geist-sans` and `--font-geist-mono` come from `next/font` variables on `<html>`, not from globals.css.

**What the kit actually uses:**
- bg, surface, surface-raised, border, border-strong, the ink trio, the primary trio
- accent (Monogram external only)
- success, warning, danger and info, each with `-subtle`
- admin and admin-subtle
- detail, micro, the two radii
- literal `text-white` (5×, on primary and danger fills) and `bg-ink/40` backdrops

The kit never touches sidebar, tool or sick. Also hard-coded in the kit: `rounded-[4px]` (Segmented options), `rounded-sm` (Monogram, the CheckTile box), `rounded-full` (Badge, Switch).

**Proposed split for a shared kit:**
- a **shared base** of structural tokens, status and admin tokens, type and radii
- a **brand layer** per app: the neutral tint hue, sidebar ×6, primary ×3, accent
- **app extensions**: tool and sick (WFO)
- a new semantic token for "not ours" (Monogram external), instead of reusing accent. In FinaOps that chip currently turns gold.

### 5.2 Global CSS outside @theme (identical in both)

- `html` and `body` get `touch-action: pan-x pan-y` (no zoom, the "app not website" rule); `body` gets its bg, ink, sans and optimizeLegibility.
- On coarse pointers, `html { overscroll-behavior-y: contain }` (for pull-to-search).
- `button:not(:disabled), [role=button]` gets `cursor: pointer`.
- `::selection` uses primary-subtle.
- `prefers-reduced-motion` cuts all transitions and animations to 0.01ms.
- A print stylesheet keyed to `[data-print-root]`: hide everything else and take the `<dialog>` out of the top layer. WFO uses it for the movement plan and FinaOps for the report print.
- `@keyframes toast-in`, required by the kit's toast.

### 5.3 Fonts

- Geist and Geist Mono through `next/font/google`, self-hosted, exposed as `--font-geist-sans/mono`.
- WFO subsets: `["latin"]`. FinaOps subsets: `["latin", "latin-ext"]`. FinaOps' setting is better for the č/š/ž/đ/ć UI, and WFO should adopt it.
- Mono is used for document numbers, money and meta, via `font-mono` in CopyValue, Combobox meta and the like.

### 5.4 Dark mode

**There is none, by design** (WFO DESIGN.md: "Light, single theme"):
- no `prefers-color-scheme`
- no `dark:` variants anywhere in either `src`
- no `color-scheme` declaration, so native widgets (select, file input, scrollbars) follow the browser's light default
- a fixed `themeColor` equal to the sidebar hex (WFO `#0b131e`, FinaOps `#083a25`, both verified against the OKLCH values)

A shared kit that gains dark mode would need a token redefinition block. The components themselves reference only tokens, apart from the literal `text-white`, `bg-ink/40` and shadow classes.

### 5.5 Icons

- **ActionIcon:** 34 action glyphs, 14px, stroke 1.5. Gated by `ActionIconScope`:
  - WFO: default off, on only on routes that `hasActionIcons` matches
  - FinaOps: on everywhere
  - `always` bypasses the gate; FileLink (document) and RowMenu (more) use it
  - consequence in WFO: `Button icon=…` shows no glyph on Settings, compliance, invoicing, logistics, outreach, recruiting, tools and the portal, and CopyValue's copy mark is hidden there too
- **StatusIcon:** 16 state glyphs, 12px, stroke 1.6, with no gating.
- **Private glyph sets inside the kit:**
  - AdminIconButton: 5 paths, duplicating ActionIcon edit/delete/unlock plus permissions and key
  - SearchIcon, the PageHelp ⓘ, MonthNav Chevron, the CheckTile tick, 3 SVGs in DateInput
  - Dialog and Sheet close with a text "✕", not an icon
- **Icon sets outside the kit:**
  - WFO: `operations/desk-icons.tsx` (DeskIcon), NavIcon in `shell/sidebar.tsx`, the command-palette icons, `worksites/inclusion-icon.tsx`, `absences/absence-type-badge.tsx`, `settings/role-glyph.tsx`, the assistant launcher
  - FinaOps: the sidebar, command palette and role-glyph icons

---

## 6. Tests covering the kit

**WFO** (vitest, `environment: "node"`, `renderToStaticMarkup`):
- `tests/ui/action-icon-scope.test.ts`: the route allow-list of `hasActionIcons`.
- `tests/ui/date-input.test.ts`: forbids `type="date|month|week|datetime-local"` anywhere in `src`.
- `tests/ui/file-link.test.tsx`: FileLink stays a real new-tab anchor with its icon in a read-only scope and keeps download targets.
- `tests/ui/toast.test.tsx`: the store (replace instead of stack, max 4, dismiss, success fades, errors stay), that ErrorToast, DialogError and SheetError render nothing in the flow, that Field marks instead of adding a line, and toast actions.
- `tests/ui/status-doctrine.test.tsx`: the colour table (no red lifecycle, green only for live states, slate plus cross for settled negatives, the triangle reserved for prerequisites), one glyph per Badge, absences never a pill, ValidityCell rendering, attention severity, EmployerMark.
- `tests/status-language-ui.test.ts`: the shared status language in lists and headers.
- Adjacent, not kit: `tests/ui/country-combobox.test.ts`, `employer-picker.test.tsx`, `worker-document-details.test.tsx`, `tests/i18n/ellipsis.test.ts`.

**FinaOps: no kit tests at all.** `tests/` has domain, i18n (messages completeness) and lib only.

Porting WFO's toast, date-input guard and file-link tests would cover FinaOps' identical files at no cost. The status-doctrine test needs FinaOps' own status-meta.

---

## 7. Findings worth acting on in a consolidation

1. Take the FinaOps side for segmented, tag and confirm-dialog. Take FinaOps' `ActionIconScope({ enabled })` API, with WFO passing its route rule from the layout.
2. MonthNav uses Intl for month names. That gives **Cyrillic Serbian** and a risk of ICU hydration drift. Switch it to the dictionary's `datePicker.months`.
3. The toast bottom offset assumes WFO's assistant bubble. Make it a variable.
4. ValidityCell is generic in concept. Move its rule and keys to common or kit level before sharing it.
5. RecordTab types `area` with the app's `PermissionArea`. A shared kit needs this generic (or `string`) plus a provider contract: `useReadOnlyScope`, `WriteScope`.
6. The i18n contract is the `common.*` keys listed in §3, plus `useDict`, `useMaybeDict`, `useLocale`, `localizeMessage` and `fmt`. FinaOps' `localizeMessage` (with templates) is the better base.
7. Dialog and Sheet guard discards with `window.confirm()` and find Cancel/Save by exact label text. This works but is fragile, and it is at odds with ConfirmDialog's own doctrine against browser `confirm()`.
8. Monogram `external` uses the brand **accent**: ochre in WFO means "not ours", but in FinaOps it is gold. Give it its own semantic token.
9. There is hard-coded English in the kit: Tabs `aria-label="Tabs"`, GlanceCard `openLabel="Open"`, and the `"Close"` fallbacks in toast and field.
10. `--color-info` is 240 in WFO and 245 in FinaOps. Decide whether that drift is intentional. The FinaOps docs say status hues match.
11. Use font subsets `latin` plus `latin-ext` in WFO too.
12. WFO DESIGN.md → Components still lists only 10 kit components, while the kit has 34 files.
