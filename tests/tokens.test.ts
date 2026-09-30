import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { compile } from "tailwindcss";
import { describe, expect, it } from "vitest";
import { BRANDS, REQUIRED_BRAND_VARIABLES } from "../gallery/brands";
import {
  CONTRAST_PAIRS,
  FIXED_PAIRS,
  TINT_BOUNDS,
  TUNABLE_HUES,
  checkBrandCss,
  contrastRatio,
  parseColour,
  parseTokenContract,
  resolveToken,
  themeGotchas,
  topLevelRules,
} from "../sync/sync-ops-ui.mjs";

// The tokens and the brand contract (spec §8): styles/tokens.css is the one @theme block,
// TOKENS.md is its contract table, sync/sync-ops-ui.mjs carries the checks every app's
// brand.css must pass (the same code the sync pre-flight and checkVendor() run).

const root = path.resolve(__dirname, "..");
const read = (rel: string) => readFileSync(path.join(root, rel), "utf8");
const TOKENS_CSS = read("styles/tokens.css");
// Parsed once; a malformed tokens.css fails the test that says so, not the whole file (the
// gotcha tests below must still run and name the comment).
let contractError: unknown = null;
const contract = (() => {
  try {
    return parseTokenContract(TOKENS_CSS);
  } catch (error) {
    contractError = error;
    return { tokens: [] } as ReturnType<typeof parseTokenContract>;
  }
})();
const byClass = (cls: string) => contract.tokens.filter((t) => t.cls === cls);

/** Every CSS file the library and its gallery own (not dependencies, not build output). */
function ownCssFiles(dir = root): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if ([".git", "node_modules", ".next", "test-results", "playwright-report"].includes(entry.name)) {
      return [];
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return ownCssFiles(full);
    return entry.name.endsWith(".css") ? [path.relative(root, full).split(path.sep).join("/")] : [];
  });
}

describe("the theme gotcha: no double quote in a comment inside @theme (spec §8.5 check 6)", () => {
  it("the scanner finds a planted one, with its file and line", () => {
    const planted = [
      "@theme {",
      "  --color-a: red;",
      '  /* Tools nav register (2026-08-28: "Document Builder") */',
      "  --color-b: blue;",
      "}",
    ].join("\n");
    expect(themeGotchas(planted, "planted.css")).toEqual([
      expect.stringMatching(/^planted\.css:3: a comment inside @theme contains a double quote/),
    ]);
  });

  it("finds a lone quote, a quote in a multi-line comment and one in every @theme variant", () => {
    expect(themeGotchas('@theme {\n  /* a " */\n  --a: b;\n}')).toHaveLength(1);
    expect(themeGotchas('@theme {\n  /* line one\n     line "two" */\n  --a: b;\n}', "f.css")).toEqual([
      expect.stringMatching(/^f\.css:2: /),
    ]);
    expect(themeGotchas('@theme inline {\n  /* "x" */\n  --a: b;\n}')).toHaveLength(1);
    expect(themeGotchas('@theme static {\n  /* "x" */\n  --a: b;\n}')).toHaveLength(1);
    expect(themeGotchas('@layer x {\n  @theme {\n    /* "x" */\n    --a: b;\n  }\n}')).toHaveLength(1);
    expect(themeGotchas('@theme {\n  /* one "a" */\n  --a: b;\n  /* two "b" */\n  --c: d;\n}')).toHaveLength(2);
  });

  it("leaves alone what is not the gotcha", () => {
    // A quote in a comment outside @theme, a single quote inside, a quoted value, a brace in a string.
    expect(themeGotchas('/* Never put a "quoted" string in @theme */\n@theme {\n  --a: b;\n}')).toEqual([]);
    expect(themeGotchas("@theme {\n  /* it's fine */\n  --a: b;\n}")).toEqual([]);
    expect(themeGotchas('@theme {\n  --font-x: "Geist", sans-serif;\n}')).toEqual([]);
    expect(themeGotchas('.a { content: "}"; }\n/* "after" */\n@theme {\n  --a: b;\n}')).toEqual([]);
    expect(themeGotchas('@theme {\n  --a: b;\n}\n/* "after the block" */')).toEqual([]);
    expect(themeGotchas('.themed {\n  /* "not @theme" */\n}')).toEqual([]);
  });

  it("no CSS file of the library or its gallery has one", () => {
    const files = ownCssFiles();
    expect(files).toEqual(
      expect.arrayContaining([
        "styles/tokens.css",
        "styles/kit.css",
        "styles/base.css",
        "styles/app-feel.css",
        "gallery/app/globals.css",
        "gallery/brands/workforce.css",
        "gallery/brands/finaops.css",
        "gallery/brands/prefab.css",
      ]),
    );
    expect(files.flatMap((file) => themeGotchas(read(file), file))).toEqual([]);
  });

  it("tokens.css has no double quote anywhere (its header states the rule without one)", () => {
    expect(TOKENS_CSS).not.toContain('"');
  });
});

describe("styles/tokens.css (spec §8.2)", () => {
  it("parses as the contract: one @theme block, every declaration inside a section", () => {
    expect(contractError).toBeNull();
    expect(() => parseTokenContract("@theme {\n  --color-x: red;\n}")).toThrow(/sits before any section comment/);
    expect(() => parseTokenContract("@theme {\n  /* brand: requird */\n  --color-x: var(--brand-x);\n}")).toThrow(
      /unknown section comment: brand: requird/,
    );
    expect(() => parseTokenContract("@theme {\n  /* brand: required */\n  --color-x: red;\n}")).toThrow(
      /a required brand token is var\(--brand-x\) with no fallback/,
    );
    expect(() => parseTokenContract("@theme {\n  /* fixed */\n  --a: 1px;\n  --a: 2px;\n}")).toThrow(/declared twice/);
    expect(() => parseTokenContract("@theme {\n  /* fixed */\n  --a: 1px;\n}\n@theme {\n}")).toThrow(/exactly one @theme/);
    expect(
      parseTokenContract("@theme {\n  /* fixed */\n  /* prose is fine */\n  --a: 1px\n}").tokens,
    ).toEqual([{ token: "--a", cls: "fixed", value: "1px" }]);
  });

  it("holds the classes of the contract, with the spec's counts", () => {
    const counts = Object.fromEntries(
      ["fixed", "required", "role", "tint", "tunable"].map((cls) => [cls, byClass(cls).length]),
    );
    expect(counts).toEqual({ fixed: 15, required: 10, role: 1, tint: 7, tunable: 2 });
  });

  it("the required brand variables are the ones the gallery fixtures must declare", () => {
    expect(byClass("required").map((t) => t.brand)).toEqual([...REQUIRED_BRAND_VARIABLES]);
  });

  it("every brand token reads the --brand-* variable of its own name", () => {
    for (const t of contract.tokens.filter((t) => t.brand)) {
      expect(t.brand, t.token).toBe(t.token.replace(/^--color-/, "--brand-"));
    }
  });

  it("the defaults are Workforce Ops' values, so a brand that sets them changes nothing", () => {
    const workforce = checkBrandFixture("workforce").values;
    for (const t of [...byClass("tint"), ...byClass("tunable")]) {
      expect(t.fallback, t.token).toBe(workforce.get(t.brand!));
    }
  });

  it("is the only stylesheet with an @theme block, and the others are plain rules", () => {
    for (const file of ["styles/kit.css", "styles/base.css", "styles/app-feel.css"]) {
      expect(read(file), file).not.toMatch(/@theme\b/);
      expect(read(file), file).not.toMatch(/--brand-/);
    }
  });

  it("kit.css carries the toast keyframes the toast viewport animates with", () => {
    expect(read("src/components/toast.tsx")).toContain("motion-safe:animate-[toast-in_180ms_ease-out]");
    expect(read("styles/kit.css")).toMatch(/@keyframes toast-in \{/);
  });

  it("the layout variable stays out of @theme and the kit reads it with its fallback", () => {
    expect(TOKENS_CSS).not.toContain("--ops-");
    expect(read("src/components/toast.tsx")).toContain("var(--ops-toast-offset,0px)");
  });

  it("Tailwind's own parser keeps every declaration, value for value", async () => {
    // The gotcha's symptom is a declaration that silently never reaches the output. Compile the
    // file with the pinned Tailwind, use every token once, and read the theme block back.
    const candidate = (token: string) => {
      const [, ns, name] = token.match(/^--(color|font|text|radius)-(.+)$/)!;
      return { color: `bg-${name}`, font: `font-${name}`, text: `text-${name}`, radius: `rounded-${name}` }[ns]!;
    };
    const compiler = await compile(`@tailwind utilities;\n${TOKENS_CSS}`);
    const css = compiler.build(contract.tokens.map((t) => candidate(t.token)));
    const themeRule = topLevelRules(css).rules.find((rule) => rule.prelude === ":root, :host");
    expect(themeRule).toBeDefined();
    const emitted = Object.fromEntries(themeRule!.declarations.map((d) => [d.name, d.value]));
    expect(emitted).toEqual(Object.fromEntries(contract.tokens.map((t) => [t.token, t.value])));
  });
});

/** TOKENS.md as {heading → tables → rows of cells}, header rows included. */
function tokensMd(): Map<string, string[][][]> {
  const sections = new Map<string, string[][][]>();
  let heading = "";
  let previousWasRow = false;
  for (const line of read("TOKENS.md").split("\n")) {
    const h = line.match(/^## (.+)$/);
    if (h) {
      heading = h[1];
      sections.set(heading, []);
    }
    const isRow = line.startsWith("|");
    if (isRow && !/^\|[-| ]+\|$/.test(line)) {
      const tables = sections.get(heading)!;
      if (!previousWasRow) tables.push([]);
      tables.at(-1)!.push(line.slice(1, -1).split("|").map((cell) => cell.trim()));
    }
    previousWasRow = isRow;
  }
  return sections;
}

/** The code span a cell consists of, or its leading code span. */
const code = (cell: string) => cell.match(/^`([^`]+)`/)?.[1];

describe("TOKENS.md is the contract of tokens.css (spec §8.3)", () => {
  const md = tokensMd();
  const headings: [string, string][] = [
    ["fixed", "Fixed"],
    ["required", "Brand, required"],
    ["role", "Brand, optional role"],
    ["tint", "Brand, optional tint"],
    ["tunable", "Brand, tunable status"],
  ];

  for (const [cls, title] of headings) {
    it(`${title}: the same tokens, values and defaults, and the count in the heading`, () => {
      const tokens = byClass(cls);
      const heading = [...md.keys()].find((key) => key.startsWith(`${title} (`));
      expect(heading, title).toBe(`${title} (${tokens.length})`);
      const [table] = md.get(heading!)!;
      const rows = table.slice(1).map((cells) => cells.map((cell) => code(cell)));
      const expected = tokens.map((t) => {
        if (cls === "fixed") return [t.token, t.value];
        if (cls === "required") return [t.token, t.brand];
        if (cls === "role") return [t.token, t.brand, t.fallbackBrand];
        return [t.token, t.brand, t.fallback];
      });
      expect(rows).toEqual(expected);
    });
  }

  it("the contrast minimums are the ones the checks apply", () => {
    const [minimums, fixed] = md.get("Contrast")!;
    expect(
      minimums.slice(1).map(([fg, bg, min]) => ({
        fg: code(fg),
        bg: code(bg),
        min: Number(min.split(" ")[0]),
        ...(min.includes("only when") ? { onlyWhenSet: min.match(/`([^`]+)`/)![1] } : {}),
      })),
    ).toEqual(CONTRAST_PAIRS);
    expect(fixed.slice(1).map(([fg, bg]) => [code(fg), code(bg)])).toEqual(
      FIXED_PAIRS.map((pair) => [pair.fg, pair.bg]),
    );
  });

  it("the stated bounds are the ones the checks apply", () => {
    const text = read("TOKENS.md");
    expect(text).toContain(`lightness within ±${TINT_BOUNDS.lightness} of the`);
    expect(text).toContain(`chroma at most ${TINT_BOUNDS.chroma}`);
    for (const [, [low, high]] of Object.entries(TUNABLE_HUES)) {
      expect(text).toContain(`hue ${low} to ${high}`);
    }
  });
});

/** A gallery brand fixture checked against the contract (the gallery's selector for :root). */
function checkBrandFixture(brand: string) {
  const css = read(`gallery/brands/${brand}.css`);
  const selector = `html[data-brand=${brand}]`;
  const values = new Map(
    topLevelRules(css)
      .rules.filter((rule) => rule.prelude === selector)
      .flatMap((rule) => rule.declarations.map((d) => [d.name, d.value] as const)),
  );
  return { problems: checkBrandCss(css, contract, { selector, file: `${brand}.css` }), values };
}

const ratio = (brand: Map<string, string>, fg: string, bg: string) =>
  contrastRatio(
    parseColour(resolveToken(contract, brand, fg)!)!,
    parseColour(resolveToken(contract, brand, bg)!)!,
  ).toFixed(2);

describe("the brand contract (spec §8.5 checks 1-4)", () => {
  for (const brand of BRANDS) {
    it(`the ${brand} gallery brand holds`, () => {
      expect(checkBrandFixture(brand).problems).toEqual([]);
    });
  }

  it("the contrast reads what the spec measured for Workforce Ops and FinaOps today", () => {
    const today = {
      workforce: ["7.44", "9.32", "17.71", "5.12", "5.51"],
      finaops: ["6.53", "8.74", "17.65", "5.10", "5.29"],
    };
    for (const [brand, expected] of Object.entries(today)) {
      const values = checkBrandFixture(brand).values;
      const measured = CONTRAST_PAIRS.filter((pair) => !pair.onlyWhenSet).map((pair) =>
        ratio(values, pair.fg, pair.bg),
      );
      expect(measured, brand).toEqual(expected);
    }
  });

  it("the fixed status pairs have the ratios TOKENS.md states, all at least their minimum", () => {
    const [, fixed] = tokensMd().get("Contrast")!;
    const stated = fixed.slice(1).map(([, , r]) => r);
    expect(FIXED_PAIRS.map((pair) => ratio(new Map(), pair.fg, pair.bg))).toEqual(stated);
    for (const pair of FIXED_PAIRS) {
      expect(Number(ratio(new Map(), pair.fg, pair.bg)), pair.fg).toBeGreaterThanOrEqual(pair.min);
    }
  });

  /** A gallery fixture as the app's own brand.css: the same rule on :root. */
  const asAppBrand = (brand: string) =>
    read(`gallery/brands/${brand}.css`).replace(/^html\[data-brand=[a-z]+\] \{/m, ":root {");
  const WFO = asAppBrand("workforce");
  const withDeclaration = (name: string, value: string) => WFO.replace(/\n\}\s*$/, `\n  ${name}: ${value};\n}\n`);
  const without = (name: string) => WFO.replace(new RegExp(`\\n\\s*${name}: [^;]+;`), "");

  it("an app's brand.css (:root) with Workforce Ops' values holds", () => {
    expect(checkBrandCss(WFO, contract)).toEqual([]);
  });

  it("check 1: plain :root custom properties named --brand-* or --ops-* only", () => {
    expect(checkBrandCss(`${WFO}\n@theme {\n  --color-x: red;\n}\n`, contract)).toEqual([
      expect.stringContaining("@theme is not allowed in a brand file"),
    ]);
    expect(checkBrandCss(`${WFO}\n@media (min-width: 1px) {\n  :root { --brand-accent: red; }\n}\n`, contract)).toEqual([
      expect.stringContaining("@media is not allowed in a brand file"),
    ]);
    expect(checkBrandCss(`${WFO}\n.sidebar {\n  --brand-accent: red;\n}\n`, contract)).toEqual([
      expect.stringContaining("only :root rules are allowed, found .sidebar"),
    ]);
    expect(checkBrandCss(`@import "./x.css";\n${WFO}`, contract)).toEqual([
      expect.stringContaining("@import is not allowed in a brand file"),
    ]);
    expect(checkBrandCss(withDeclaration("--color-primary", "red"), contract)).toEqual([
      expect.stringContaining("--color-primary is not allowed (only --brand-* and --ops-* custom properties)"),
    ]);
    expect(checkBrandCss(withDeclaration("color", "red"), contract)).toEqual([
      expect.stringContaining("color is not allowed"),
    ]);
    expect(checkBrandCss(withDeclaration("--brand-primay", "red"), contract)).toEqual([
      "brand.css: unknown brand variable --brand-primay (not in the token contract)",
    ]);
    expect(checkBrandCss(withDeclaration("--ops-anything", "1px"), contract)).toEqual([]);
  });

  it("check 2: a missing required variable is named", () => {
    expect(checkBrandCss(without("--brand-accent"), contract)).toEqual([
      "brand.css: missing required --brand-accent (for --color-accent)",
    ]);
    const bare = WFO.replace(/\n\s*--brand-(surface|border|ink|success)[a-z-]*: [^;]+;/g, "");
    expect(checkBrandCss(bare, contract), "the optional ones may all be left out").toEqual([]);
  });

  it("check 3: the tint and tunable bounds", () => {
    expect(checkBrandCss(withDeclaration("--brand-surface", "oklch(0.96 0.003 170)"), contract)).toEqual([
      expect.stringContaining("--brand-surface lightness 0.96 is more than 0.01 from the default 0.975"),
    ]);
    expect(checkBrandCss(withDeclaration("--brand-surface", "oklch(0.985 0.003 170)"), contract)).toEqual([]);
    expect(checkBrandCss(withDeclaration("--brand-border", "oklch(0.9 0.03 170)"), contract)).toEqual([
      expect.stringContaining("--brand-border chroma 0.03 is above 0.025"),
    ]);
    expect(checkBrandCss(withDeclaration("--brand-border", "#e0e0e0"), contract)).toEqual([
      "brand.css: --brand-border must be an oklch() colour, found #e0e0e0",
    ]);
    expect(checkBrandCss(withDeclaration("--brand-success", "oklch(0.48 0.11 178)"), contract)).toEqual([
      expect.stringContaining("--brand-success hue 178 is outside 140-160"),
    ]);
    expect(checkBrandCss(withDeclaration("--brand-success", "oklch(0.49 0.12 145)"), contract)).toEqual([]);
  });

  it("check 4: contrast", () => {
    expect(checkBrandCss(withDeclaration("--brand-primary", "oklch(0.7 0.12 250)"), contract)).toEqual([
      expect.stringMatching(/white on --color-primary has contrast 2\.\d\d, below 4\.5$/),
    ]);
    expect(checkBrandCss(withDeclaration("--brand-sidebar-fg", "oklch(0.35 0.012 250)"), contract)).toEqual([
      expect.stringContaining("--color-sidebar-fg on --color-sidebar has contrast"),
    ]);
    expect(checkBrandCss(withDeclaration("--brand-primary", "var(--brand-accent)"), contract)).toEqual([
      "brand.css: cannot read --color-primary (var(--brand-accent)) as a colour (write oklch() or #rrggbb)",
    ]);
  });

  it("the external role: unset passes, FinaOps' gold (2.09) is refused, the suite ochre (3.49) holds", () => {
    const fina = asAppBrand("finaops");
    expect(checkBrandCss(fina, contract)).toEqual([]);
    const withExternal = (value: string) => fina.replace(/\n\}\s*$/, `\n  --brand-external: ${value};\n}\n`);
    expect(checkBrandCss(withExternal("oklch(0.77 0.13 86)"), contract)).toEqual([
      "brand.css: --color-external on --color-bg has contrast 2.09, below 3",
    ]);
    expect(checkBrandCss(withExternal("oklch(0.64 0.13 60)"), contract)).toEqual([]);
    expect(resolveToken(contract, new Map([["--brand-accent", "gold"]]), "--color-external")).toBe("gold");
  });
});

describe("colour reading", () => {
  it("reads oklch() in numbers, percentages and degrees, hex and the two keywords", () => {
    expect(parseColour("oklch(0.45 0.12 250)")?.oklch).toEqual({ l: 0.45, c: 0.12, h: 250 });
    expect(parseColour("oklch(45% 30% 250deg)")?.oklch).toEqual({ l: 0.45, c: 0.12, h: 250 });
    expect(parseColour("oklch(1 0 none / 0.5)")?.alpha).toBe(0.5);
    expect(parseColour("#fff")?.rgb).toEqual([1, 1, 1]);
    expect(contrastRatio(parseColour("white")!, parseColour("black")!)).toBe(21);
    expect(contrastRatio(parseColour("#777")!, parseColour("#fff")!).toFixed(2)).toBe("4.48");
    expect(parseColour("var(--x)")).toBeNull();
    expect(parseColour("rgb(0 0 0)")).toBeNull();
  });
});
