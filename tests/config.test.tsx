import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Button } from "../src/components/button";
import { CopyValue } from "../src/components/copy-value";
import { DateInput } from "../src/components/date-input";
import { Input } from "../src/components/field";
import { OpsUiProvider, useOpsUi } from "../src/config/provider";
import { ReadOnlyScope, useReadOnlyScope } from "../src/config/read-only";
import { EN_STRINGS, type OpsUiStrings } from "../src/config/strings";

// The runtime contract (spec §6): the words the kit says (OpsUiStrings / EN_STRINGS), the
// provider an app mounts inside its own I18nProvider (strings, localize, locale), and the one
// read-only scope the app's WriteScope renders.

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
const topKeysAreAll: Exact<(typeof TOP_KEYS)[number], Exclude<keyof OpsUiStrings, "datePicker">> = true;
const datePickerKeysAreAll: Exact<(typeof DATE_PICKER_KEYS)[number], keyof OpsUiStrings["datePicker"]> = true;

describe("config/strings (spec §6.1)", () => {
  it("17 top-level strings plus 16 for the date picker, and EN_STRINGS has exactly those keys", () => {
    expect(topKeysAreAll && datePickerKeysAreAll).toBe(true);
    expect(TOP_KEYS).toHaveLength(17);
    expect(DATE_PICKER_KEYS).toHaveLength(16);
    expect(Object.keys(EN_STRINGS).sort()).toEqual([...TOP_KEYS, "datePicker"].sort());
    expect(Object.keys(EN_STRINGS.datePicker).sort()).toEqual([...DATE_PICKER_KEYS].sort());
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
    // Unchanged in 1.0 on purpose (spec §7): the toast's "Close" and GlanceCard's "Open".
    expect(read("src/components/toast.tsx")).toContain(`closeLabel = "${EN_STRINGS.close}"`);
    expect(read("src/components/glance-card.tsx")).toContain(`openLabel = "${EN_STRINGS.open}"`);
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
    ]) {
      for (const m of read(`src/components/${file}.tsx`).matchAll(/\bstrings\.([a-zA-Z]+)/g)) used.add(m[1]);
    }
    expect([...used].filter((key) => !(key in EN_STRINGS))).toEqual([]);
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

function ScopeProbe() {
  return <i>{String(useReadOnlyScope())}</i>;
}

describe("ReadOnlyScope / useReadOnlyScope (spec §6.2)", () => {
  it("defaults to writable outside a scope", () => {
    expect(renderToStaticMarkup(<ScopeProbe />)).toBe("<i>false</i>");
  });

  it("provides its value, and a nested readOnly={false} re-opens a subtree", () => {
    expect(
      renderToStaticMarkup(
        <ReadOnlyScope readOnly>
          <ScopeProbe />
          <ReadOnlyScope readOnly={false}>
            <ScopeProbe />
          </ReadOnlyScope>
        </ReadOnlyScope>,
      ),
    ).toBe("<i>true</i><i>false</i>");
  });

  it("a Button inside a read-only scope renders nothing unless it is readOnlySafe", () => {
    expect(
      renderToStaticMarkup(
        <ReadOnlyScope readOnly>
          <Button>Save</Button>
        </ReadOnlyScope>,
      ),
    ).toBe("");
    expect(
      renderToStaticMarkup(
        <ReadOnlyScope readOnly>
          <Button readOnlySafe>Show all</Button>
        </ReadOnlyScope>,
      ),
    ).toContain(">Show all</button>");
    expect(
      renderToStaticMarkup(
        <ReadOnlyScope readOnly>
          <ReadOnlyScope readOnly={false}>
            <Button>Save</Button>
          </ReadOnlyScope>
        </ReadOnlyScope>,
      ),
    ).toContain(">Save</button>");
  });

  it("fields and the date input come up disabled inside a read-only scope", () => {
    const inScope = (node: React.ReactNode) => renderToStaticMarkup(<ReadOnlyScope readOnly>{node}</ReadOnlyScope>);
    expect(renderToStaticMarkup(<Input name="a" />)).not.toMatch(/ disabled=""/);
    expect(inScope(<Input name="a" />)).toMatch(/<input[^>]* disabled=""/);
    expect(inScope(<Input name="a" readOnlySafe />)).not.toMatch(/ disabled=""/);
    expect(renderToStaticMarkup(<DateInput name="d" />)).not.toMatch(/<input[^>]* disabled=""/);
    expect(inScope(<DateInput name="d" />)).toMatch(/<input[^>]* disabled=""/);
  });
});
