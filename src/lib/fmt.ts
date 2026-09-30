// L2 import: fmt, copied verbatim from workforce-ops origin/main (cea4928) src/i18n/locales.ts.

/** Tiny interpolation: fmt("Hi {name}", {name: "X"}) → "Hi X". */
export function fmt(
  template: string,
  vars: Record<string, string | number>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    key in vars ? String(vars[key]) : `{${key}}`
  );
}
