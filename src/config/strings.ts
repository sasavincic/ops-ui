// The words the kit itself says (spec §6.1): exactly the `common.*` keys the
// two apps' kits read today, 17 top-level strings plus 16 for the date
// picker. An app feeds its own dictionary through OpsUiProvider; outside a
// provider (a root-layout Toaster, a login page) the kit speaks EN_STRINGS.
// Per-call label props (closeLabel, openLabel, pendingLabel, clearLabel)
// still win over these.

export type OpsUiStrings = {
  back: string;
  cancel: string;
  close: string;
  save: string;
  saving: string;
  unsavedConfirm: string;
  search: string;
  noMatches: string;
  open: string;
  copyValue: string;
  copied: string;
  copyFailed: string;
  pickMonth: string;
  prevMonth: string;
  nextMonth: string;
  prevYear: string;
  nextYear: string;
  datePicker: {
    placeholder: string;
    /** Comma-joined, as the dictionaries hold them. */
    months: string;
    /** Comma-joined. */
    monthsShort: string;
    /** Comma-joined, Monday first. */
    weekdays: string;
    openCalendar: string;
    previousMonth: string;
    nextMonth: string;
    previousYear: string;
    nextYear: string;
    previousYears: string;
    nextYears: string;
    chooseMonth: string;
    today: string;
    clear: string;
    /** Template with {date}. */
    earliest: string;
    /** Template with {date}. */
    latest: string;
  };
};

/** Today's Workforce Ops en `common` values (FinaOps' en values are identical). */
export const EN_STRINGS: OpsUiStrings = {
  back: "Back",
  cancel: "Cancel",
  close: "Close",
  save: "Save",
  saving: "Saving…",
  unsavedConfirm: "Discard unsaved changes?",
  search: "Search",
  noMatches: "No matches.",
  open: "Open",
  copyValue: "Copy",
  copied: "Copied",
  copyFailed: "Copy failed",
  pickMonth: "Choose month",
  prevMonth: "Previous month",
  nextMonth: "Next month",
  prevYear: "Previous year",
  nextYear: "Next year",
  datePicker: {
    placeholder: "DD-MM-YYYY",
    months: "January,February,March,April,May,June,July,August,September,October,November,December",
    monthsShort: "Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec",
    weekdays: "Mo,Tu,We,Th,Fr,Sa,Su",
    openCalendar: "Open calendar",
    previousMonth: "Previous month",
    nextMonth: "Next month",
    previousYear: "Previous year",
    nextYear: "Next year",
    previousYears: "Earlier years",
    nextYears: "Later years",
    chooseMonth: "Choose month and year",
    today: "Today",
    clear: "Clear",
    earliest: "Earliest {date}",
    latest: "Latest {date}",
  },
};
