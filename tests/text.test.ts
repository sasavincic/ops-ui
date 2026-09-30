import { describe, expect, it } from "vitest";
import { buildHaystack, matchesAllWords, normalizeSearchText } from "../src/lib/text";

// lib/text.ts: the three search functions moved from workforce-ops
// domain/search.ts (spec §7). The first block is WFO's fold test for them
// (tests/domain/search.test.ts, origin/main cea4928); the rest is the new
// `text` test of spec §11.1.

describe("normalizeSearchText (ported)", () => {
  it("strips diacritics so undotted typing matches", () => {
    expect(normalizeSearchText("Tufekčić")).toBe("tufekcic");
    expect(normalizeSearchText("Šušnjar Žarko")).toBe("susnjar zarko");
  });

  it("maps đ/Đ explicitly (no NFD decomposition exists)", () => {
    expect(normalizeSearchText("Đorđević")).toBe("dordevic");
  });

  it("maps ß to ss", () => {
    expect(normalizeSearchText("Straße")).toBe("strasse");
  });

  it("collapses punctuation so document numbers match loosely", () => {
    expect(normalizeSearchText("QT-ATES-LM-26004")).toBe("qt ates lm 26004");
  });
});

describe("text (spec §11.1)", () => {
  it("folds đ, ß, č, ć, š, ž and umlauts, in either case", () => {
    expect(normalizeSearchText("ĐURĐEVIĆ")).toBe("durdevic");
    expect(normalizeSearchText("GROSSE STRAẞE")).toBe("grosse strasse");
    expect(normalizeSearchText("Čačak Ćuprija Šid Žabalj")).toBe("cacak cuprija sid zabalj");
    expect(normalizeSearchText("Müller Ölçer Åland")).toBe("muller olcer aland");
  });

  it("punctuation and runs of space become one space, trimmed", () => {
    expect(normalizeSearchText("  Latro Mont d.o.o. ,  Maribor ")).toBe("latro mont d o o maribor");
    expect(normalizeSearchText("---")).toBe("");
  });

  it("every word of the query, in any order (Nguyen Dinh finds Nguyen, Dinh Hai)", () => {
    expect(matchesAllWords("Nguyen Dinh", "Nguyen, Dinh Hai")).toBe(true);
    expect(matchesAllWords("Dinh Nguyen", "Nguyen, Dinh Hai")).toBe(true);
    expect(matchesAllWords("nguyen hai", "Nguyen, Dinh Hai")).toBe(true);
    expect(matchesAllWords("Nguyen Van", "Nguyen, Dinh Hai")).toBe(false);
  });

  it("words match anywhere across the given texts, diacritics ignored", () => {
    expect(matchesAllWords("sabanovic rotterdam", "Šabanović, Aldin", null, "Rotterdam · MAXS")).toBe(true);
    expect(matchesAllWords("dordevic", "Đorđević")).toBe(true);
    expect(matchesAllWords("26004", "QT-ATES-LM-26004")).toBe(true);
    expect(matchesAllWords("qt-ates", "QT ATES LM 26004")).toBe(true);
  });

  it("an empty query matches everything; nothing matches an empty haystack but that", () => {
    expect(matchesAllWords("", "anything")).toBe(true);
    expect(matchesAllWords(" - ", "anything")).toBe(true);
    expect(matchesAllWords("x")).toBe(false);
  });

  it("buildHaystack skips blanks and joins the folded parts", () => {
    expect(buildHaystack("Đorđević", undefined, "", " ", null, "Straße 1")).toBe("dordevic strasse 1");
  });
});
