import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Combobox, comboboxOptionMatches, type ComboboxOption } from "../src/components/combobox";
import { OpsUiProvider } from "../src/config/provider";
import { EN_STRINGS } from "../src/config/strings";

// The Combobox's matching (spec §11.1 behaviour): a row answers a query when
// every word of it appears in what the row shows or its keywords. The
// keyboard and list behaviour run in the browser (gallery/tests/behaviour.spec.ts).

const worker: ComboboxOption = {
  value: "w1",
  label: "Nguyen, Dinh Hai",
  meta: "€24.50/h",
  lines: [{ text: "Welder TIG (141)" }, { text: "currently at Rotterdam", tone: "warning" }],
  mark: { code: "LM", title: "Latro Mont" },
  keywords: "Vietnam VN",
};

describe("comboboxOptionMatches", () => {
  it("words in any order, across label, meta, chip, lines and keywords", () => {
    for (const q of ["Nguyen Dinh", "dinh nguyen", "hai welder", "rotterdam", "lm nguyen", "24.50", "vietnam", "vn tig"]) {
      expect(comboboxOptionMatches(worker, q), q).toBe(true);
    }
  });

  it("every word must be found somewhere", () => {
    for (const q of ["nguyen van", "mag", "va"]) {
      expect(comboboxOptionMatches(worker, q), q).toBe(false);
    }
  });

  it("ignores case, diacritics and punctuation, and a blank query matches", () => {
    const country: ComboboxOption = { value: "DE", label: "Nemčija", keywords: "Germany DE" };
    expect(comboboxOptionMatches(country, "nemcija")).toBe(true);
    expect(comboboxOptionMatches(country, "germany")).toBe(true);
    expect(comboboxOptionMatches({ value: "x", label: "Đorđević, Petar" }, "dordevic, petar")).toBe(true);
    expect(comboboxOptionMatches(worker, "  ")).toBe(true);
  });
});

describe("Combobox (closed)", () => {
  it("shows the selected option's label, or the search placeholder", () => {
    const options = [worker, { value: "w2", label: "Barišić, Josip" }];
    const picked = renderToStaticMarkup(<Combobox value="w2" options={options} onChange={() => {}} />);
    expect(picked).toContain('value="Barišić, Josip"');
    expect(picked).toContain('role="combobox"');
    expect(picked).toContain('aria-expanded="false"');
    expect(picked).not.toContain('role="listbox"');
    const empty = renderToStaticMarkup(<Combobox value="" options={options} onChange={() => {}} />);
    expect(empty).toContain('placeholder="Search…"');
    const sl = renderToStaticMarkup(
      <OpsUiProvider strings={{ ...EN_STRINGS, search: "Išči" }}>
        <Combobox value="" options={options} onChange={() => {}} />
      </OpsUiProvider>
    );
    expect(sl).toContain('placeholder="Išči…"');
  });
});
