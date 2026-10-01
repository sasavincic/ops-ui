// The words the kit itself says (spec §6.1): exactly the `common.*` keys the
// two apps' kits read today, 17 top-level strings plus 16 for the date
// picker, and since 1.1 optional groups with English defaults (EN_OPTIONAL_STRINGS):
// tabs, appSwitcher, validity (1.1), yearPicker (1.4) and shell (1.5). An app feeds its own
// dictionary through OpsUiProvider; outside a provider (a root-layout Toaster, a login page) the kit speaks EN_STRINGS.
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
  /** 1.1, optional: the Tabs nav's accessible name. Default "Tabs". */
  tabs?: string;
  /** 1.1, optional: the AppSwitcher's words. Default EN_OPTIONAL_STRINGS.appSwitcher. */
  appSwitcher?: {
    /** The trigger's accessible name, before the current app's name ("Switch app"). */
    label: string;
    /** The title of the current app's entry ("Current app"). */
    current: string;
  };
  /** 1.1, optional: ValidityCell / ValidityNote. Default EN_OPTIONAL_STRINGS.validity. */
  validity?: {
    /** Template with {days}. */
    expiredAgo: string;
    /** Template with {days}. */
    expiresIn: string;
    unknown: string;
    noExpiry: string;
  };
  /**
   * 1.4, optional: YearInput's own words (it reuses datePicker.previousYears / nextYears / clear /
   * earliest / latest). Default EN_OPTIONAL_STRINGS.yearPicker.
   */
  yearPicker?: {
    /** The empty field's placeholder ("YYYY"). */
    placeholder: string;
    /** The picker button's and the picker's accessible name ("Choose year"). */
    openPicker: string;
    /** The footer button that picks the current year ("This year"). */
    thisYear: string;
  };
  /**
   * 1.5, optional: the shell's words (AppFrame, Sidebar, MobileTopBar, CommandPalette,
   * PullToSearch, SignOutButton). Default EN_OPTIONAL_STRINGS.shell.
   */
  shell?: {
    /** The sidebar's search button, the phone magnifier's and the palette's accessible name. */
    search: string;
    /** The records group heading. */
    records: string;
    /** The tools group heading. */
    tools: string;
    openMenu: string;
    closeMenu: string;
    signOut: string;
    /** The pull-to-search pill while pulling, and once the pull is long enough. */
    pullToSearch: string;
    releaseToSearch: string;
    /** The palette's backdrop and phone close button. */
    closeSearch: string;
    searchPlaceholder: string;
    /** Under the shortcuts while nothing is typed. */
    searchEmptyHint: string;
    searchNoResults: string;
    /** Section headers of the palette's shortcuts. */
    searchNavigate: string;
    searchCreate: string;
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

/**
 * The English defaults of the optional strings (1.1; yearPicker 1.4). EN_STRINGS stays exactly the apps' `common`
 * words of 1.0; a component reads `strings.x ?? EN_OPTIONAL_STRINGS.x`, so an app that passes no
 * value renders what it rendered before. The validity words are Workforce Ops' English
 * (`workers.compliance.expiredAgo` / `expiresIn`, `compliance.desk.unknown`,
 * `statuses.expiry.no_expiry`).
 */
export const EN_OPTIONAL_STRINGS: Required<Pick<OpsUiStrings, "tabs" | "appSwitcher" | "validity" | "yearPicker" | "shell">> = {
  tabs: "Tabs",
  appSwitcher: { label: "Switch app", current: "Current app" },
  validity: {
    expiredAgo: "expired {days} d ago",
    expiresIn: "in {days} d",
    unknown: "Validity unknown",
    noExpiry: "No expiry",
  },
  yearPicker: { placeholder: "YYYY", openPicker: "Choose year", thisYear: "This year" },
  // The two apps' en `shell` words where they agree; the tools heading, the placeholder and the
  // empty hint are each app's own (Workforce Ops has the only tools register today).
  shell: {
    search: "Search",
    records: "Records",
    tools: "Tools",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    signOut: "Sign out",
    pullToSearch: "Pull to search",
    releaseToSearch: "Release to search",
    closeSearch: "Close search",
    searchPlaceholder: "Search…",
    searchEmptyHint: "Type to search.",
    searchNoResults: "No matches.",
    searchNavigate: "Go to",
    searchCreate: "Create new",
  },
};
