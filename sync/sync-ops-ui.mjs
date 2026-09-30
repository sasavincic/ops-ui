// scripts/sync-ops-ui.mjs - the @latro/ops-ui sync script (spec §5). It lives in the library as
// sync/sync-ops-ui.mjs and every app carries a synced copy as scripts/sync-ops-ui.mjs, so it is
// ONE self-contained file with no dependency beyond Node's built-ins.
//
// Build state: this file so far carries the token and brand contract (spec §8.3, §8.5) and the
// theme-gotcha scanner, exported for the library's tokens test and, once the commands exist, for
// the sync pre-flight and checkVendor() (spec §5.2 step 4, §5.4). The commands of spec §5.1
// (--version, --ref, --check, --write-wrappers) land on top of it in build step L5.

import { pathToFileURL } from "node:url";

// ---------------------------------------------------------------------------------------------
// CSS reading. Just enough of a tokenizer for the contract: comments, strings, braces and
// semicolons, each with its line. Comments are opaque (a quote inside one is not a string) and
// strings are opaque (a brace inside one is not a block).
// ---------------------------------------------------------------------------------------------

/**
 * @typedef {{ type: "comment" | "string" | "text" | "{" | "}" | ";", text: string, line: number }} CssToken
 */

/**
 * Splits CSS into tokens.
 * @param {string} css
 * @returns {CssToken[]}
 */
export function cssTokens(css) {
  /** @type {CssToken[]} */
  const tokens = [];
  let i = 0;
  let line = 1;
  const push = (/** @type {CssToken["type"]} */ type, /** @type {number} */ end) => {
    const text = css.slice(i, end);
    tokens.push({ type, text, line });
    for (const ch of text) if (ch === "\n") line += 1;
    i = end;
  };
  while (i < css.length) {
    const ch = css[i];
    if (ch === "/" && css[i + 1] === "*") {
      const close = css.indexOf("*/", i + 2);
      push("comment", close === -1 ? css.length : close + 2);
    } else if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < css.length && css[j] !== ch && css[j] !== "\n") j += css[j] === "\\" ? 2 : 1;
      push("string", Math.min(j + 1, css.length));
    } else if (ch === "{" || ch === "}" || ch === ";") {
      push(ch, i + 1);
    } else {
      let j = i + 1;
      while (
        j < css.length &&
        !"{};\"'".includes(css[j]) &&
        !(css[j] === "/" && css[j + 1] === "*")
      ) {
        j += 1;
      }
      push("text", j);
    }
  }
  return tokens;
}

/**
 * The theme gotcha (spec §8.5 check 6): inside an `@theme` block, a comment containing a
 * double-quote character. Tailwind's CSS parser has read such a quote as the start of a string
 * and silently dropped the declaration after the comment (the --color-tool incident of
 * 2026-08-28). Returns one problem per offending comment; empty means clean.
 * @param {string} css
 * @param {string} [file]
 * @returns {string[]}
 */
export function themeGotchas(css, file = "css") {
  /** @type {string[]} */
  const problems = [];
  /** @type {boolean[]} one entry per open block: is it an @theme block? */
  const stack = [];
  let prelude = "";
  for (const token of cssTokens(css)) {
    if (token.type === "comment") {
      if (stack.includes(true) && token.text.includes('"')) {
        const excerpt = token.text.replace(/\s+/g, " ").slice(0, 80);
        problems.push(
          `${file}:${token.line}: a comment inside @theme contains a double quote (Tailwind drops the next declaration): ${excerpt}`,
        );
      }
    } else if (token.type === "{") {
      stack.push(/^@theme\b/.test(prelude.trim()));
      prelude = "";
    } else if (token.type === "}") {
      stack.pop();
      prelude = "";
    } else if (token.type === ";") {
      prelude = "";
    } else {
      prelude += token.text;
    }
  }
  return problems;
}

/**
 * @typedef {{ prelude: string, line: number, declarations: { name: string, value: string, line: number }[], nested: string[] }} CssRule
 */

/**
 * The top-level rules of a stylesheet, with their declarations. A top-level statement without
 * a block (an `@import`) comes back as a rule with an empty prelude-only entry in `statements`.
 * @param {string} css
 * @returns {{ rules: CssRule[], statements: { text: string, line: number }[] }}
 */
export function topLevelRules(css) {
  /** @type {CssRule[]} */
  const rules = [];
  /** @type {{ text: string, line: number }[]} */
  const statements = [];
  let depth = 0;
  let text = "";
  let textLine = 1;
  /** @type {CssRule | null} */
  let rule = null;
  const add = (/** @type {CssToken} */ token) => {
    if (!text.trim()) textLine = token.line;
    text += token.text;
  };
  for (const token of cssTokens(css)) {
    if (token.type === "comment") continue;
    if (token.type === "{") {
      if (depth === 0) {
        rule = { prelude: text.trim(), line: textLine, declarations: [], nested: [] };
        rules.push(rule);
      } else if (depth === 1 && rule) {
        rule.nested.push(text.trim());
      }
      depth += 1;
      text = "";
    } else if (token.type === "}") {
      if (depth === 1 && rule && text.trim()) declaration(rule, text, textLine);
      depth = Math.max(0, depth - 1);
      text = "";
    } else if (token.type === ";") {
      if (depth === 0 && text.trim()) statements.push({ text: text.trim(), line: textLine });
      if (depth === 1 && rule && text.trim()) declaration(rule, text, textLine);
      text = "";
    } else {
      add(token);
    }
  }
  return { rules, statements };
}

/** @param {CssRule} rule @param {string} text @param {number} line */
function declaration(rule, text, line) {
  const colon = text.indexOf(":");
  if (colon === -1) {
    rule.declarations.push({ name: text.trim(), value: "", line });
    return;
  }
  rule.declarations.push({
    name: text.slice(0, colon).trim(),
    value: text.slice(colon + 1).trim(),
    line,
  });
}

// ---------------------------------------------------------------------------------------------
// The token contract (spec §8.3), read from the library's own styles/tokens.css. The sections
// of its one @theme block are marked by comments; each class has one value shape.
// ---------------------------------------------------------------------------------------------

/**
 * @typedef {"fixed" | "required" | "role" | "tint" | "tunable"} TokenClass
 * @typedef {{ token: string, cls: TokenClass, value: string, brand?: string, fallbackBrand?: string, fallback?: string }} ContractToken
 * @typedef {{ tokens: ContractToken[] }} TokenContract
 */

/** The section comments of tokens.css and the class each one opens. */
const SECTION_MARKERS = /** @type {const} */ ([
  [/^fixed$/, "fixed"],
  [/^brand: required$/, "required"],
  [/^brand: optional role$/, "role"],
  [/^brand: optional neutral tint\b/, "tint"],
  [/^brand: tunable status$/, "tunable"],
]);

const BRAND = "(--brand-[a-z0-9-]+)";

/**
 * Parses the library's tokens.css into its contract. Throws on a malformed file (a declaration
 * outside a section, a value that does not fit its class): that is a library bug, never an app's.
 * @param {string} tokensCss
 * @returns {TokenContract}
 */
export function parseTokenContract(tokensCss) {
  /** @type {ContractToken[]} */
  const tokens = [];
  /** @type {TokenClass | null} */
  let cls = null;
  let depth = 0;
  let inTheme = false;
  let themes = 0;
  let prelude = "";
  for (const token of cssTokens(tokensCss)) {
    if (token.type === "{") {
      depth += 1;
      if (depth === 1 && /^@theme\b/.test(prelude.trim())) {
        inTheme = true;
        themes += 1;
      } else if (inTheme) {
        throw new Error(`tokens.css:${token.line}: no nested blocks inside @theme`);
      }
      prelude = "";
    } else if (token.type === "}") {
      if (inTheme && depth === 1 && prelude.trim()) tokens.push(contractToken(prelude, cls, token.line));
      depth -= 1;
      if (depth === 0) inTheme = false;
      prelude = "";
    } else if (token.type === "comment") {
      if (!inTheme) continue;
      // A comment starting with fixed or brand: opens a section; any other is prose.
      const text = token.text.slice(2, -2).trim();
      if (!/^(fixed\b|brand:)/.test(text)) continue;
      const marker = SECTION_MARKERS.find(([pattern]) => pattern.test(text));
      if (!marker) throw new Error(`tokens.css:${token.line}: unknown section comment: ${text}`);
      cls = marker[1];
    } else if (token.type === ";") {
      if (inTheme && prelude.trim()) tokens.push(contractToken(prelude, cls, token.line));
      prelude = "";
    } else {
      prelude += token.text;
    }
  }
  if (themes !== 1) throw new Error(`tokens.css: expected exactly one @theme block, found ${themes}`);
  const names = tokens.map((t) => t.token);
  const duplicate = names.find((name, i) => names.indexOf(name) !== i);
  if (duplicate) throw new Error(`tokens.css: ${duplicate} is declared twice`);
  return { tokens };
}

/**
 * @param {string} text
 * @param {TokenClass | null} cls
 * @param {number} line
 * @returns {ContractToken}
 */
function contractToken(text, cls, line) {
  const colon = text.indexOf(":");
  const token = text.slice(0, colon).trim();
  const value = text.slice(colon + 1).trim();
  const where = `tokens.css:${line}: ${token}`;
  if (!cls) throw new Error(`${where} sits before any section comment`);
  if (!/^--[a-z0-9-]+$/.test(token)) throw new Error(`${where} is not a custom property`);
  if (cls === "fixed") {
    if (value.includes("--brand-")) throw new Error(`${where} is fixed but reads a brand variable`);
    return { token, cls, value };
  }
  if (cls === "required") {
    const m = value.match(new RegExp(`^var\\(${BRAND}\\)$`));
    if (!m) throw new Error(`${where}: a required brand token is var(--brand-x) with no fallback`);
    return { token, cls, value, brand: m[1] };
  }
  if (cls === "role") {
    const m = value.match(new RegExp(`^var\\(${BRAND},\\s*var\\(${BRAND}\\)\\)$`));
    if (!m) throw new Error(`${where}: an optional role is var(--brand-x, var(--brand-y))`);
    return { token, cls, value, brand: m[1], fallbackBrand: m[2] };
  }
  const m = value.match(new RegExp(`^var\\(${BRAND},\\s*(.+)\\)$`));
  if (!m || m[2].includes("var(")) {
    throw new Error(`${where}: an optional ${cls} token is var(--brand-x, <literal default>)`);
  }
  return { token, cls, value, brand: m[1], fallback: m[2].trim() };
}

// ---------------------------------------------------------------------------------------------
// Colour: OKLCH (and hex) to linear sRGB, WCAG contrast. Continuous (no 8-bit rounding), which
// reproduces the ratios the spec quotes (white on the WFO primary 7.44, and so on).
// ---------------------------------------------------------------------------------------------

/**
 * @typedef {{ l: number, c: number, h: number }} Oklch
 * @typedef {{ rgb: [number, number, number], oklch: Oklch | null, alpha: number }} Colour
 */

/**
 * Reads `oklch(L C H [/ A])`, `#rgb`, `#rrggbb` (with optional alpha), `white` or `black`.
 * Returns null for anything else.
 * @param {string} value
 * @returns {Colour | null}
 */
export function parseColour(value) {
  const v = value.trim().toLowerCase();
  if (v === "white") return parseColour("#ffffff");
  if (v === "black") return parseColour("#000000");
  const ok = v.match(/^oklch\(\s*([^\s/)]+)\s+([^\s/)]+)\s+([^\s/)]+)\s*(?:\/\s*([^\s)]+)\s*)?\)$/);
  if (ok) {
    const l = number(ok[1], 1);
    const c = number(ok[2], 0.4);
    const h = ok[3] === "none" ? 0 : number(ok[3].replace(/deg$/, ""), 360);
    const alpha = ok[4] === undefined ? 1 : number(ok[4], 1);
    if ([l, c, h, alpha].some((n) => Number.isNaN(n))) return null;
    return { rgb: oklchToLinearSrgb(l, c, h), oklch: { l, c, h }, alpha };
  }
  const hex = v.match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/);
  if (hex) {
    const digits = hex[1].length <= 4 ? [...hex[1]].map((d) => d + d).join("") : hex[1];
    const channel = (/** @type {number} */ k) => parseInt(digits.slice(k * 2, k * 2 + 2), 16) / 255;
    const decode = (/** @type {number} */ x) =>
      x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
    return {
      rgb: [decode(channel(0)), decode(channel(1)), decode(channel(2))],
      oklch: null,
      alpha: digits.length === 8 ? channel(3) : 1,
    };
  }
  return null;
}

/** A CSS number or percentage; `percentOf` is what 100% means. */
function number(/** @type {string} */ text, /** @type {number} */ percentOf) {
  if (text.endsWith("%")) return (Number(text.slice(0, -1)) / 100) * percentOf;
  return text.trim() === "" ? NaN : Number(text);
}

/**
 * OKLCH to linear-light sRGB (Björn Ottosson's OKLab matrices), unclamped.
 * @param {number} l @param {number} c @param {number} h
 * @returns {[number, number, number]}
 */
export function oklchToLinearSrgb(l, c, h) {
  const rad = (h * Math.PI) / 180;
  const a = c * Math.cos(rad);
  const b = c * Math.sin(rad);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
}

/**
 * WCAG relative luminance of a colour, its channels clipped to the sRGB gamut.
 * @param {Colour} colour
 */
export function luminance(colour) {
  const [r, g, b] = colour.rgb.map((x) => Math.min(1, Math.max(0, x)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * WCAG contrast ratio of two colours (1 to 21).
 * @param {Colour} a @param {Colour} b
 */
export function contrastRatio(a, b) {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

// ---------------------------------------------------------------------------------------------
// The brand contract (spec §8.5 checks 1-4): what an app's src/app/brand.css must hold.
// ---------------------------------------------------------------------------------------------

/** Optional neutral tint (spec §8.3): lightness within this of the default, chroma at most this. */
export const TINT_BOUNDS = { lightness: 0.01, chroma: 0.025 };

/** Tunable status (spec §8.3): the hue range per brand variable. */
export const TUNABLE_HUES = {
  "--brand-success": [140, 160],
  "--brand-success-subtle": [140, 160],
};

/**
 * The contrast every brand must meet (spec §8.5 check 4). `white` is the kit's literal
 * text-white; `onlyWhenSet` skips the pair while the app leaves that brand variable unset.
 * @type {{ fg: string, bg: string, min: number, onlyWhenSet?: string }[]}
 */
export const CONTRAST_PAIRS = [
  { fg: "white", bg: "--color-primary", min: 4.5 },
  { fg: "--color-sidebar-fg", bg: "--color-sidebar", min: 4.5 },
  { fg: "--color-ink", bg: "--color-bg", min: 4.5 },
  { fg: "--color-ink-muted", bg: "--color-surface", min: 4.5 },
  { fg: "--color-success", bg: "--color-success-subtle", min: 4.5 },
  { fg: "--color-external", bg: "--color-bg", min: 3, onlyWhenSet: "--brand-external" },
];

/**
 * The fixed status pairs (spec §8.5 check 5): library colours, checked once by the library test.
 * @type {{ fg: string, bg: string, min: number }[]}
 */
export const FIXED_PAIRS = [
  { fg: "--color-warning", bg: "--color-warning-subtle", min: 4.5 },
  { fg: "--color-danger", bg: "--color-danger-subtle", min: 4.5 },
  { fg: "--color-admin", bg: "--color-admin-subtle", min: 4.5 },
  { fg: "--color-info", bg: "--color-info-subtle", min: 4.5 },
  { fg: "white", bg: "--color-danger", min: 4.5 },
];

/**
 * The value a token takes under a brand (its declared `--brand-*` variables), or null when the
 * brand leaves a required one out. `white` is the literal the kit paints on primary and danger.
 * @param {TokenContract} contract
 * @param {Map<string, string>} brand
 * @param {string} token
 * @returns {string | null}
 */
export function resolveToken(contract, brand, token) {
  if (token === "white") return "oklch(1 0 0)";
  const entry = contract.tokens.find((t) => t.token === token);
  if (!entry) throw new Error(`${token} is not in the token contract`);
  if (entry.cls === "fixed") return entry.value;
  const own = entry.brand ? brand.get(entry.brand) : undefined;
  if (own !== undefined) return own;
  if (entry.cls === "required") return null;
  if (entry.cls === "role") return brand.get(/** @type {string} */ (entry.fallbackBrand)) ?? null;
  return /** @type {string} */ (entry.fallback);
}

/**
 * The declarations of a brand file as a Map, with every problem of check 1 (only `selector`
 * rules, only `--brand-*` / `--ops-*` custom properties, no at-rule, no nesting).
 * @param {string} css
 * @param {{ selector?: string, file?: string }} [options]
 */
export function readBrandCss(css, { selector = ":root", file = "brand.css" } = {}) {
  /** @type {string[]} */
  const problems = [];
  /** @type {Map<string, string>} */
  const values = new Map();
  const { rules, statements } = topLevelRules(css);
  for (const statement of statements) {
    problems.push(`${file}:${statement.line}: ${statement.text.split(/\s/)[0]} is not allowed in a brand file (plain ${selector} variables only)`);
  }
  for (const rule of rules) {
    if (rule.prelude.startsWith("@")) {
      problems.push(`${file}:${rule.line}: ${rule.prelude.split(/\s/)[0]} is not allowed in a brand file (plain ${selector} variables only)`);
      continue;
    }
    if (rule.prelude !== selector) {
      problems.push(`${file}:${rule.line}: only ${selector} rules are allowed, found ${rule.prelude}`);
      continue;
    }
    for (const nested of rule.nested) {
      problems.push(`${file}:${rule.line}: nested rules are not allowed (${nested})`);
    }
    for (const { name, value, line } of rule.declarations) {
      if (!/^--(brand|ops)-[a-z0-9-]+$/.test(name)) {
        problems.push(`${file}:${line}: ${name} is not allowed (only --brand-* and --ops-* custom properties)`);
      } else {
        values.set(name, value);
      }
    }
  }
  return { values, problems };
}

/**
 * Every problem of an app's brand.css against the token contract (spec §8.5 checks 1-4).
 * Empty means the brand holds.
 * @param {string} css the brand file
 * @param {TokenContract} contract from parseTokenContract(tokens.css)
 * @param {{ selector?: string, file?: string }} [options] `selector` is `:root` for an app;
 *   the gallery fixtures use `html[data-brand=<name>]`.
 * @returns {string[]}
 */
export function checkBrandCss(css, contract, options = {}) {
  const file = options.file ?? "brand.css";
  const { values, problems } = readBrandCss(css, options);
  const known = new Set(contract.tokens.flatMap((t) => (t.brand ? [t.brand] : [])));

  // Check 1 (names): a --brand-* the contract does not know is a typo or a removed variable.
  for (const name of values.keys()) {
    if (name.startsWith("--brand-") && !known.has(name)) {
      problems.push(`${file}: unknown brand variable ${name} (not in the token contract)`);
    }
  }

  // Check 2: every required variable is declared.
  for (const t of contract.tokens) {
    if (t.cls === "required" && t.brand && !values.has(t.brand)) {
      problems.push(`${file}: missing required ${t.brand} (for ${t.token})`);
    }
  }

  // Check 3: the tint and tunable bounds.
  for (const t of contract.tokens) {
    if (!t.brand || !values.has(t.brand)) continue;
    const value = /** @type {string} */ (values.get(t.brand));
    if (t.cls === "tint") {
      const own = parseColour(value);
      const base = parseColour(/** @type {string} */ (t.fallback));
      if (!own?.oklch || !base?.oklch) {
        problems.push(`${file}: ${t.brand} must be an oklch() colour, found ${value}`);
        continue;
      }
      const dl = Math.abs(own.oklch.l - base.oklch.l);
      if (dl > TINT_BOUNDS.lightness + 1e-9) {
        problems.push(`${file}: ${t.brand} lightness ${own.oklch.l} is more than ${TINT_BOUNDS.lightness} from the default ${base.oklch.l}`);
      }
      if (own.oklch.c > TINT_BOUNDS.chroma + 1e-9) {
        problems.push(`${file}: ${t.brand} chroma ${own.oklch.c} is above ${TINT_BOUNDS.chroma}`);
      }
    } else if (t.cls === "tunable") {
      const range = /** @type {Record<string, number[]>} */ (TUNABLE_HUES)[t.brand];
      if (!range) throw new Error(`${t.brand} is tunable but has no hue range in TUNABLE_HUES`);
      const own = parseColour(value);
      if (!own?.oklch) {
        problems.push(`${file}: ${t.brand} must be an oklch() colour, found ${value}`);
        continue;
      }
      if (own.oklch.h < range[0] || own.oklch.h > range[1]) {
        problems.push(`${file}: ${t.brand} hue ${own.oklch.h} is outside ${range[0]}-${range[1]}`);
      }
    }
  }

  // Check 4: contrast.
  for (const pair of CONTRAST_PAIRS) {
    if (pair.onlyWhenSet && !values.has(pair.onlyWhenSet)) continue;
    const fgValue = resolveToken(contract, values, pair.fg);
    const bgValue = resolveToken(contract, values, pair.bg);
    if (fgValue === null || bgValue === null) continue; // already reported as missing
    const fg = parseColour(fgValue);
    const bg = parseColour(bgValue);
    if (!fg || !bg) {
      problems.push(`${file}: cannot read ${!fg ? `${pair.fg} (${fgValue})` : `${pair.bg} (${bgValue})`} as a colour (write oklch() or #rrggbb)`);
      continue;
    }
    if (fg.alpha < 1 || bg.alpha < 1) {
      problems.push(`${file}: ${pair.fg} on ${pair.bg} must be opaque to meet a contrast minimum`);
      continue;
    }
    const ratio = contrastRatio(fg, bg);
    if (ratio < pair.min) {
      problems.push(`${file}: ${pair.fg} on ${pair.bg} has contrast ${ratio.toFixed(2)}, below ${pair.min}`);
    }
  }
  return problems;
}

// ---------------------------------------------------------------------------------------------
// Entry point. Importing this file runs nothing; the commands arrive with build step L5.
// ---------------------------------------------------------------------------------------------

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.error(
    "sync-ops-ui: the commands (spec §5.1) arrive with ops-ui build step L5; this build carries the brand contract only.",
  );
  process.exit(2);
}
