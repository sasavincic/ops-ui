import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CopyValue } from "../src/components/copy-value";
import { OpsUiProvider, useOpsUi } from "../src/config/provider";
import { EN_OPTIONAL_STRINGS, EN_STRINGS, type OpsUiStrings } from "../src/config/strings";

// The runtime contract (spec §6.1): the words the kit says (OpsUiStrings / EN_STRINGS) and the
// provider an app mounts inside its own I18nProvider (strings, localize, locale). The read-only
// scope the app's WriteScope renders (§6.2) is tests/read-only.test.tsx.

const root = path.resolve(__dirname, "..");
const read = (rel: string) => readFileSync(path.join(root, rel), "utf8");

// The keys the kit reads, spelled out so the list and the type can never drift: `satisfies`
// refuses a key the type lacks, the Exact check below refuses a key the list lacks.
const TOP_KEYS = [
  "back",
  "cancel",
  "close",
  "save",
  "saving",
  "unsavedConfirm",
  "search",
  "noMatches",
  "open",
  "copyValue",
  "copied",
  "copyFailed",
  "pickMonth",
  "prevMonth",
  "nextMonth",
  "prevYear",
  "nextYear",
] as const satisfies readonly (keyof OpsUiStrings)[];
const DATE_PICKER_KEYS = [
  "placeholder",
  "months",
  "monthsShort",
  "weekdays",
  "openCalendar",
  "previousMonth",
  "nextMonth",
  "previousYear",
  "nextYear",
  "previousYears",
  "nextYears",
  "chooseMonth",
  "today",
  "clear",
  "earliest",
  "latest",
] as const satisfies readonly (keyof OpsUiStrings["datePicker"])[];
type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
/** The optional groups 1.1 added (spec §6.1), yearPicker (1.4) and shell (1.5), each with an English default. */
const OPTIONAL_KEYS = ["tabs", "appSwitcher", "validity", "yearPicker", "shell"] as const satisfies readonly (keyof OpsUiStrings)[];
const topKeysAreAll: Exact<(typeof TOP_KEYS)[number], Exclude<keyof OpsUiStrings, "datePicker" | (typeof OPTIONAL_KEYS)[number]>> = true;
type OptionalKeys = { [K in keyof OpsUiStrings]-?: undefined extends OpsUiStrings[K] ? K : never }[keyof OpsUiStrings];
const optionalKeysAreAll: Exact<(typeof OPTIONAL_KEYS)[number], OptionalKeys> = true;
const datePickerKeysAreAll: Exact<(typeof DATE_PICKER_KEYS)[number], keyof OpsUiStrings["datePicker"]> = true;

describe("config/strings (spec §6.1)", () => {
  it("17 top-level strings plus 16 for the date picker, and EN_STRINGS has exactly those keys", () => {
    expect(topKeysAreAll && datePickerKeysAreAll).toBe(true);
    expect(TOP_KEYS).toHaveLength(17);
    expect(DATE_PICKER_KEYS).toHaveLength(16);
    expect(Object.keys(EN_STRINGS).sort()).toEqual([...TOP_KEYS, "datePicker"].sort());
    expect(Object.keys(EN_STRINGS.datePicker).sort()).toEqual([...DATE_PICKER_KEYS].sort());
  });

  it("the optional strings: exactly tabs, appSwitcher, validity (1.1), yearPicker (1.4) and shell (1.5), each with an English default outside EN_STRINGS", () => {
    expect(optionalKeysAreAll).toBe(true);
    // EN_STRINGS stays the apps' 1.0 `common` words; the defaults live beside it.
    for (const key of OPTIONAL_KEYS) expect(key in EN_STRINGS, key).toBe(false);
    expect(Object.keys(EN_OPTIONAL_STRINGS).sort()).toEqual([...OPTIONAL_KEYS].sort());
    expect(EN_OPTIONAL_STRINGS).toEqual({
      tabs: "Tabs",
      appSwitcher: { label: "Switch app", current: "Current app" },
      // Workforce Ops' en words (workers.compliance.expiredAgo / expiresIn, compliance.desk.unknown,
      // statuses.expiry.no_expiry).
      validity: { expiredAgo: "expired {days} d ago", expiresIn: "in {days} d", unknown: "Validity unknown", noExpiry: "No expiry" },
      // YearInput's own words; it reuses datePicker.previousYears / nextYears / clear / earliest / latest.
      yearPicker: { placeholder: "YYYY", openPicker: "Choose year", thisYear: "This year" },
      // The shell's words: both apps' en shell values where they agree (tools, the placeholder
      // and the empty hint generic; each app passes its own).
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
    });
  });

  it("every English string is a non-empty string", () => {
    for (const key of TOP_KEYS) expect(EN_STRINGS[key], key).toMatch(/\S/);
    for (const key of DATE_PICKER_KEYS) expect(EN_STRINGS.datePicker[key], key).toMatch(/\S/);
  });

  it("the date picker's lists are comma-joined (12 months, 12 short, 7 weekdays from Monday) and its limits are {date} templates", () => {
    const dp = EN_STRINGS.datePicker;
    expect(dp.months.split(",")).toHaveLength(12);
    expect(dp.monthsShort.split(",")).toHaveLength(12);
    expect(dp.weekdays.split(",")).toEqual(["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]);
    expect(dp.earliest).toContain("{date}");
    expect(dp.latest).toContain("{date}");
    expect(dp.placeholder).toBe("DD-MM-YYYY");
  });

  it("the English fallbacks hard-coded in the kit say what EN_STRINGS says", () => {
    // Unchanged in 1.0 on purpose (spec §7): the toast's and useAnchoredToast's "Close" (which
    // Field passes through) and GlanceCard's "Open".
    expect(read("src/components/toast.tsx")).toContain(`closeLabel = "${EN_STRINGS.close}"`);
    expect(read("src/components/glance-card.tsx")).toContain(`openLabel = "${EN_STRINGS.open}"`);
    expect(read("src/components/toast.tsx")).toMatch(new RegExp(`closeLabel = "${EN_STRINGS.close}"[^]*closeLabel = "${EN_STRINGS.close}"`));
    // "Tabs" had no EN_STRINGS key in 1.0; since 1.1 it is the optional strings.tabs, read by
    // the client leaf the server-safe Tabs renders its links into.
    expect(read("src/config/tabs-nav.tsx")).toContain("strings.tabs ?? EN_OPTIONAL_STRINGS.tabs");
  });

  it("every string the kit reads is a key of OpsUiStrings", () => {
    const used = new Set<string>();
    for (const file of [
      "back-link",
      "combobox",
      "confirm-dialog",
      "copy-value",
      "date-input",
      "dialog",
      "field",
      "month-nav",
      "sheet",
      "toast",
      "app-switcher",
      "validity-cell",
      "year-input",
    ]) {
      for (const m of read(`src/components/${file}.tsx`).matchAll(/\bstrings\.([a-zA-Z]+)/g)) used.add(m[1]);
    }
    expect([...used].filter((key) => !(key in EN_STRINGS) && !(key in EN_OPTIONAL_STRINGS))).toEqual([]);
    expect(used.size).toBeGreaterThan(10);
  });
});

/** Renders what useOpsUi() answers where it is mounted. */
function Probe() {
  const { strings, localize, locale } = useOpsUi();
  return <pre>{JSON.stringify({ back: strings.back, today: strings.datePicker.today, locale, said: localize("Choose an employer") })}</pre>;
}
const probe = (node: React.ReactNode) =>
  JSON.parse(
    renderToStaticMarkup(node)
      .replace(/^<pre>|<\/pre>$/g, "")
      .replace(/&quot;/g, '"'),
  );

const SL: OpsUiStrings = {
  ...EN_STRINGS,
  back: "Nazaj",
  copyValue: "Kopiraj",
  datePicker: { ...EN_STRINGS.datePicker, today: "Danes" },
};
const slLocalize = (text: string) => (text === "Choose an employer" ? "Izberite delodajalca" : text);

describe("OpsUiProvider / useOpsUi (spec §6.1)", () => {
  it("outside a provider: English, identity localisation, locale en (it never throws)", () => {
    expect(probe(<Probe />)).toEqual({ back: "Back", today: "Today", locale: "en", said: "Choose an employer" });
  });

  it("inside a provider: the app's strings, its localize and its locale", () => {
    expect(
      probe(
        <OpsUiProvider strings={SL} localize={slLocalize} locale="sl">
          <Probe />
        </OpsUiProvider>,
      ),
    ).toEqual({ back: "Nazaj", today: "Danes", locale: "sl", said: "Izberite delodajalca" });
  });

  it("a partial provider keeps the defaults for what it leaves out", () => {
    expect(
      probe(
        <OpsUiProvider locale="sl">
          <Probe />
        </OpsUiProvider>,
      ),
    ).toEqual({ back: "Back", today: "Today", locale: "sl", said: "Choose an employer" });
    expect(
      probe(
        <OpsUiProvider localize={slLocalize}>
          <Probe />
        </OpsUiProvider>,
      ),
    ).toEqual({ back: "Back", today: "Today", locale: "en", said: "Izberite delodajalca" });
  });

  it("the kit speaks the provider's words", () => {
    expect(renderToStaticMarkup(<CopyValue value="LM-2026-001" />)).toContain('title="Copy"');
    const html = renderToStaticMarkup(
      <OpsUiProvider strings={SL}>
        <CopyValue value="LM-2026-001" />
      </OpsUiProvider>,
    );
    expect(html).toContain('title="Kopiraj"');
    expect(html).toContain('aria-label="Kopiraj: LM-2026-001"');
  });
});
