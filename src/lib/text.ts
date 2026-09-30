// L2 import: normalizeSearchText, matchesAllWords and buildHaystack, copied verbatim from workforce-ops origin/main (cea4928) src/domain/search.ts.

/**
 * Search normalization: lowercase, explicit đ→d / ß→ss (đ has NO NFD
 * decomposition — without the explicit map "dordevic" would never find
 * Đorđević), then strip combining marks (č/ć/š/ž…), then collapse
 * everything non-alphanumeric to single spaces so "QT-ATES-LM-26004"
 * and "qt ates lm 26004" meet in the middle. Deliberately does NOT use
 * normalizeRecordName: its legal-form strip would eat legitimate
 * trailing name words in free text.
 */
export function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .replaceAll("đ", "d")
    .replaceAll("ß", "ss")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Every word of the query appears somewhere in the given texts — any order,
 * ignoring case, diacritics and punctuation. The picker/list filter the app
 * uses wherever a person types a name ("Nguyen Dinh" finds "Nguyen, Dinh
 * Hai"; "sabanovic" finds "Šabanović").
 */
export function matchesAllWords(
  query: string,
  ...texts: (string | null | undefined)[]
): boolean {
  const words = normalizeSearchText(query).split(" ").filter(Boolean);
  if (words.length === 0) return true;
  const haystack = buildHaystack(...texts);
  return words.every((word) => haystack.includes(word));
}

export function buildHaystack(
  ...parts: (string | null | undefined)[]
): string {
  return parts
    .filter((p): p is string => typeof p === "string" && p.trim() !== "")
    .map(normalizeSearchText)
    .join(" ");
}
