// scripts/sync-ops-ui.mjs - the @latro/ops-ui sync script (spec §5). It lives in the library as
// sync/sync-ops-ui.mjs and every app carries a synced copy as scripts/sync-ops-ui.mjs, so it is
// ONE self-contained file with no dependency beyond Node's built-ins.
//
//   node scripts/sync-ops-ui.mjs --version 1.2.0 [--repo <path>] [--dry-run] [--discard-local-edits] [--allow-downgrade]
//   node scripts/sync-ops-ui.mjs --ref <sha> [--repo <path>]     local trial only; stamps 1.2.0-dev+<sha7>
//   node scripts/sync-ops-ui.mjs --check                          verify only (= checkVendor)
//   node scripts/sync-ops-ui.mjs --write-wrappers                 create missing pure wrappers; never overwrites
//
// Exit codes: 0 done or verified, 1 refused (reasons printed one per line), 2 usage or environment.
// It never commits, never pushes, and writes nothing outside the vendor folder, its own path and
// ops-ui.lock.json. Importing it runs nothing: the token and brand contract (spec §8.3, §8.5), the
// theme-gotcha scanner, the ship mapping and checkVendor() are exports (the library's tests and
// each app's vendor test read them).

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
          `${file}:${token.line}: a comment inside @theme contains a double quote (Tailwind drops the next declaration): ${excerpt}` +
            " - fix: remove the double quotes from that comment (or move the comment out of the @theme block)",
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
// What a release ships (spec §5.2 steps 3 and 5): ship.json at the release commit maps library
// paths to app destinations. `{vendorDir}` stands for the app's config.vendorDir.
//   { "from": "src/**", "to": "{vendorDir}/" }            every file under src/, its path kept
//   { "from": "styles/*.css", "to": "{vendorDir}/styles/" } files directly in styles/, by name
//   { "from": "DESIGN.md", "to": "{vendorDir}/DESIGN.md" }  one file (skipped when absent)
// ---------------------------------------------------------------------------------------------

/** The destinations outside the vendor folder: this script and its declarations. */
export const SYNC_DEST = "scripts/sync-ops-ui.mjs";
export const SYNC_TYPES_DEST = "scripts/sync-ops-ui.d.mts";
const SCRIPT_DESTS = [SYNC_DEST, SYNC_TYPES_DEST];
export const LOCK_FILE = "ops-ui.lock.json";
export const CONFIG_FILE = "ops-ui.config.json";

/**
 * @typedef {{ from: string, to: string }} ShipRule
 * @typedef {{ files: ShipRule[] }} ShipManifest
 * @typedef {{ src: string, dest: string }} ShipEntry
 */

/**
 * The files a release ships and where each lands, sorted by destination. Throws on a malformed
 * manifest (a rule of an unknown shape, two sources for one destination).
 * @param {ShipManifest} ship
 * @param {string[]} files every path in the release commit (git ls-tree -r --name-only)
 * @param {string} vendorDir
 * @returns {ShipEntry[]}
 */
export function shipPlan(ship, files, vendorDir) {
  if (!ship || !Array.isArray(ship.files)) throw new Error("ship.json: expected { files: [{ from, to }] }");
  /** @type {Map<string, string>} */
  const byDest = new Map();
  const add = (/** @type {string} */ src, /** @type {string} */ dest) => {
    const previous = byDest.get(dest);
    if (previous !== undefined && previous !== src) {
      throw new Error(`ship.json: ${dest} is shipped from both ${previous} and ${src}`);
    }
    byDest.set(dest, src);
  };
  const target = (/** @type {string} */ to) => to.replaceAll("{vendorDir}", vendorDir);
  for (const rule of ship.files) {
    const { from, to } = rule;
    if (typeof from !== "string" || typeof to !== "string") throw new Error("ship.json: every rule has from and to");
    if (from.endsWith("/**")) {
      if (!to.endsWith("/")) throw new Error(`ship.json: ${from} maps to a folder, so its to ends with /`);
      const prefix = from.slice(0, -2);
      for (const file of files) if (file.startsWith(prefix)) add(file, target(to) + file.slice(prefix.length));
    } else if (from.includes("*")) {
      if (!to.endsWith("/")) throw new Error(`ship.json: ${from} maps to a folder, so its to ends with /`);
      const pattern = new RegExp(`^${from.split("*").map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join("[^/]*")}$`);
      for (const file of files) if (pattern.test(file)) add(file, target(to) + file.split("/").pop());
    } else if (files.includes(from)) {
      add(from, target(to));
    }
  }
  return [...byDest.entries()]
    .map(([dest, src]) => ({ src, dest }))
    .sort((a, b) => (a.dest < b.dest ? -1 : a.dest > b.dest ? 1 : 0));
}

/**
 * The destination allow-list (spec §5.2 step 4): under the vendor folder, or exactly this
 * script or its declarations. A release can never write app code.
 * @param {string} dest
 * @param {string} vendorDir
 */
export function isAllowedDestination(dest, vendorDir) {
  if (SCRIPT_DESTS.includes(dest)) return true;
  const parts = dest.split("/");
  if (path.isAbsolute(dest) || dest.includes("\\") || parts.some((p) => p === ".." || p === "." || p === "")) return false;
  return dest.startsWith(`${vendorDir.replace(/\/+$/, "")}/`);
}

/**
 * The first-line header of a shipped file (spec §5.2 step 5). No double quote anywhere, so a
 * CSS header can never trip the theme gotcha.
 * @param {string} dest
 * @param {string} version
 * @param {string} sha7
 */
export function generatedHeader(dest, version, sha7) {
  const ext = dest.slice(dest.lastIndexOf("."));
  if ([".ts", ".tsx", ".mts", ".mjs", ".js"].includes(ext)) {
    return `// GENERATED from @latro/ops-ui v${version} (${sha7}) by scripts/sync-ops-ui.mjs - do not edit; change ops-ui, release, sync.\n`;
  }
  if (ext === ".css") return `/* GENERATED from @latro/ops-ui v${version} (${sha7}) - do not edit. */\n`;
  if (ext === ".md") return `<!-- GENERATED from @latro/ops-ui v${version} (${sha7}) - do not edit. -->\n`;
  throw new Error(`${dest}: no generated-header form for ${ext} files`);
}

/** @param {string | Buffer} content */
export function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

// ---------------------------------------------------------------------------------------------
// Versions and peer ranges: a small matcher for ^, >=, >, <=, <, exact, x-ranges and ||.
// ---------------------------------------------------------------------------------------------

/** @param {string} v @returns {[number, number, number] | null} */
export function parseVersion(v) {
  const m = String(v).trim().replace(/^v/, "").match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:[-+].*)?$/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2] ?? 0), Number(m[3] ?? 0)];
}

/** @param {string} a @param {string} b */
export function compareVersions(a, b) {
  const x = parseVersion(a);
  const y = parseVersion(b);
  if (!x || !y) throw new Error(`cannot compare versions ${a} and ${b}`);
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
  return 0;
}

/**
 * Does `version` satisfy `range`? Enough of npm's ranges for peerDependencies.
 * @param {string} version
 * @param {string} range
 */
export function satisfies(version, range) {
  const v = parseVersion(version);
  if (!v) return false;
  return range.split("||").some((alternative) => {
    const parts = alternative.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return true;
    return parts.every((part) => {
      const m = part.match(/^(\^|~|>=|<=|>|<|=)?v?(\d+|x|\*)(?:\.(\d+|x|\*))?(?:\.(\d+|x|\*))?$/);
      if (!m) throw new Error(`unsupported version range: ${part}`);
      const op = m[1] ?? "";
      const given = [m[2], m[3], m[4]];
      const wild = given.findIndex((g) => g === undefined || g === "x" || g === "*");
      const base = /** @type {[number, number, number]} */ (given.map((g) => (g === undefined || g === "x" || g === "*" ? 0 : Number(g))));
      const cmp = (/** @type {number[]} */ a, /** @type {number[]} */ b) => {
        for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
        return 0;
      };
      const upper = (/** @type {number} */ level) =>
        level === 0 ? [base[0] + 1, 0, 0] : level === 1 ? [base[0], base[1] + 1, 0] : [base[0], base[1], base[2] + 1];
      if (op === "^") {
        const level = base[0] > 0 || wild === 1 ? 0 : base[1] > 0 || wild === 2 ? 1 : 2;
        return cmp(v, base) >= 0 && cmp(v, upper(level)) < 0;
      }
      if (op === "~") return cmp(v, base) >= 0 && cmp(v, upper(wild === 1 ? 0 : 1)) < 0;
      if (op === ">=") return cmp(v, base) >= 0;
      if (op === ">") return cmp(v, base) > 0;
      if (op === "<=") return cmp(v, base) <= 0;
      if (op === "<") return cmp(v, base) < 0;
      if (wild === 0) return true;
      if (wild > 0) return cmp(v, base) >= 0 && cmp(v, upper(wild - 1)) < 0;
      return cmp(v, base) === 0;
    });
  });
}

// ---------------------------------------------------------------------------------------------
// Small helpers.
// ---------------------------------------------------------------------------------------------

/** A refusal: the sync prints every reason and exits 1. */
class Refusal extends Error {
  /** @param {string[]} reasons */
  constructor(reasons) {
    super(reasons.join("\n"));
    this.reasons = reasons;
  }
}

/** A usage or environment error: exit 2. */
class UsageError extends Error {}

/**
 * @param {string} repo
 * @param {string[]} args
 * @returns {string}
 */
function git(repo, args) {
  return execFileSync("git", ["-C", repo, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 256 * 1024 * 1024,
  });
}

/** @param {string} repo @param {string} ref @returns {string | null} */
function revParse(repo, ref) {
  try {
    return git(repo, ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`]).trim() || null;
  } catch {
    return null;
  }
}

/** @param {string} repo @param {string} commit @param {string} file @returns {string | null} */
function showAt(repo, commit, file) {
  try {
    return git(repo, ["show", `${commit}:${file}`]);
  } catch {
    return null;
  }
}

/**
 * Files an operating system or an editor leaves in any folder it opens (Finder's .DS_Store and
 * AppleDouble ._ files, Windows' Thumbs.db and desktop.ini, Vim swap and backup files). They are
 * never the library's and never an app's edit, so the vendor checks do not count them as
 * unknown files; they leave with the old folder at the next swap.
 */
const OS_LITTER = /^(?:\.DS_Store|\._.+|Thumbs\.db|ehthumbs\.db|desktop\.ini|\..+\.sw[a-p]|.+~)$/i;

/** @param {string} name */
export function isOsLitter(name) {
  return OS_LITTER.test(name);
}

/** Every file under `dir` (relative to `root`, forward slashes), OS litter left out. */
function listFiles(/** @type {string} */ root, /** @type {string} */ dir) {
  const abs = path.join(root, dir);
  if (!existsSync(abs)) return [];
  /** @type {string[]} */
  const out = [];
  const walk = (/** @type {string} */ current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (!isOsLitter(entry.name)) out.push(path.relative(root, full).split(path.sep).join("/"));
    }
  };
  walk(abs);
  return out.sort();
}

/** The JSON of a lock, config or package file, or null when the file is absent. */
function readJson(/** @type {string} */ file) {
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    throw new UsageError(`${file} is not valid JSON: ${/** @type {Error} */ (error).message}`);
  }
}

/** JSON with sorted keys and a trailing newline: a re-run writes the same bytes. */
export function stableJson(/** @type {unknown} */ value) {
  const sort = (/** @type {unknown} */ v) => {
    if (Array.isArray(v)) return v.map(sort);
    if (v && typeof v === "object") {
      return Object.fromEntries(
        Object.keys(v)
          .sort()
          .map((k) => [k, sort(/** @type {Record<string, unknown>} */ (v)[k])]),
      );
    }
    return v;
  };
  return `${JSON.stringify(sort(value), null, 2)}\n`;
}

/**
 * @typedef {{ source?: string, vendorDir: string, globalsCss: string, brandCss: string, extensions: string[], local: string[], bindings: string[], wrappersDir: string }} AppConfig
 * @typedef {{ commit: string, files: Record<string, string>, version: string, dev?: boolean }} Lock
 */

/**
 * The app's ops-ui.config.json (spec §3.3), with defaults for what a config may leave out.
 * @param {string} appRoot
 * @returns {AppConfig}
 */
export function readConfig(appRoot) {
  const raw = readJson(path.join(appRoot, CONFIG_FILE));
  if (!raw) throw new UsageError(`no ${CONFIG_FILE} in ${appRoot} (run the sync from the app's root)`);
  for (const key of ["vendorDir", "globalsCss", "brandCss"]) {
    if (typeof raw[key] !== "string" || !raw[key]) throw new UsageError(`${CONFIG_FILE}: ${key} is required`);
  }
  return {
    source: raw.source,
    vendorDir: raw.vendorDir.replace(/\/+$/, ""),
    globalsCss: raw.globalsCss,
    brandCss: raw.brandCss,
    extensions: raw.extensions ?? [],
    local: raw.local ?? [],
    bindings: raw.bindings ?? [],
    wrappersDir: (raw.wrappersDir ?? "src/components/ui").replace(/\/+$/, ""),
  };
}

/** @param {string} appRoot @returns {Lock | null} */
function readLock(appRoot) {
  return readJson(path.join(appRoot, LOCK_FILE));
}

/** Does the app's globals.css import the vendored tokens (the tokens step, F3/W4)? */
function importsVendoredTokens(/** @type {string} */ globalsCss) {
  return /@import\s+["'][^"']*ops-ui\/styles\/tokens\.css["']/.test(globalsCss);
}

/**
 * The brand contract and the theme gotcha against the app's own files (spec §8.5 checks 1-4
 * and 6). A missing brand.css counts only once globals.css imports the vendored tokens: in the
 * vendor-only step (F2/W3) nothing reads the brand yet.
 * @param {string} appRoot
 * @param {AppConfig} config
 * @param {string} tokensCss the library's tokens.css (at the release, or vendored)
 * @returns {{ brand: string[], theme: string[], notes: string[] }}
 */
export function checkAppStyles(appRoot, config, tokensCss) {
  /** @type {string[]} */
  const brand = [];
  /** @type {string[]} */
  const theme = [];
  /** @type {string[]} */
  const notes = [];
  const globalsPath = path.join(appRoot, config.globalsCss);
  const brandPath = path.join(appRoot, config.brandCss);
  const globals = existsSync(globalsPath) ? readFileSync(globalsPath, "utf8") : null;
  if (globals === null) theme.push(`${config.globalsCss} (config.globalsCss) does not exist`);
  else theme.push(...themeGotchas(globals, config.globalsCss));
  if (existsSync(brandPath)) {
    const css = readFileSync(brandPath, "utf8");
    theme.push(...themeGotchas(css, config.brandCss));
    let contract;
    try {
      contract = parseTokenContract(tokensCss);
    } catch (error) {
      brand.push(`the library's tokens.css is malformed: ${/** @type {Error} */ (error).message}`);
    }
    if (contract) brand.push(...checkBrandCss(css, contract, { file: config.brandCss }));
  } else if (globals !== null && importsVendoredTokens(globals)) {
    brand.push(`${config.brandCss} (config.brandCss) does not exist, but ${config.globalsCss} imports the library tokens`);
  } else {
    notes.push(`brand contract not checked yet: no ${config.brandCss} and ${config.globalsCss} does not import the library tokens`);
  }
  return { brand, theme, notes };
}

// ---------------------------------------------------------------------------------------------
// checkVendor (spec §5.4): is the vendored copy exactly what the lock pins?
// ---------------------------------------------------------------------------------------------

/**
 * @param {string} appRoot
 * @returns {Promise<{ ok: boolean, version: string, dev: boolean, edited: string[], missing: string[], unknown: string[], brand: string[], theme: string[] }>}
 */
export async function checkVendor(appRoot) {
  const config = readConfig(appRoot);
  const lock = readLock(appRoot);
  if (!lock) {
    return {
      ok: false,
      version: "",
      dev: false,
      edited: [],
      missing: [LOCK_FILE],
      unknown: listFiles(appRoot, config.vendorDir),
      brand: [],
      theme: [],
    };
  }
  /** @type {string[]} */
  const edited = [];
  /** @type {string[]} */
  const missing = [];
  for (const [file, hash] of Object.entries(lock.files ?? {})) {
    const abs = path.join(appRoot, file);
    if (!existsSync(abs)) missing.push(file);
    else if (sha256(readFileSync(abs)) !== hash) edited.push(file);
  }
  const unknown = listFiles(appRoot, config.vendorDir).filter((file) => !(file in (lock.files ?? {})));
  const versionTs = path.join(appRoot, config.vendorDir, "version.ts");
  if (!lock.dev && existsSync(versionTs) && !readFileSync(versionTs, "utf8").includes(`"${lock.version}"`)) {
    // The files match their hashes, so the lock's version was edited by hand.
    edited.push(LOCK_FILE);
  }
  const tokensPath = path.join(appRoot, config.vendorDir, "styles", "tokens.css");
  const tokensCss = existsSync(tokensPath) ? readFileSync(tokensPath, "utf8") : "";
  const { brand, theme } = checkAppStyles(appRoot, config, tokensCss);
  const dev = lock.dev === true;
  const ok =
    edited.length === 0 &&
    missing.length === 0 &&
    unknown.length === 0 &&
    !dev &&
    brand.length === 0 &&
    theme.length === 0;
  return { ok, version: lock.version, dev, edited, missing, unknown, brand, theme };
}

// ---------------------------------------------------------------------------------------------
// The release: resolve a version (or a dev ref) to one commit, and read what it ships from git
// objects only (spec §5.2 steps 1-3). The library's working tree is never read.
// ---------------------------------------------------------------------------------------------

/**
 * Where the library repo is: --repo, $OPS_UI_REPO, config.source, ../ops-ui.
 * @param {string} appRoot
 * @param {AppConfig} config
 * @param {string | undefined} flag
 */
export function findRepo(appRoot, config, flag) {
  const candidates = [flag, process.env.OPS_UI_REPO, config.source, "../ops-ui"].filter(
    (c) => typeof c === "string" && c.length > 0,
  );
  for (const candidate of candidates) {
    const abs = path.resolve(appRoot, /** @type {string} */ (candidate));
    if (!existsSync(abs)) continue;
    try {
      const top = git(abs, ["rev-parse", "--show-toplevel"]).trim();
      if (top) return top;
    } catch {
      // not a git repository: try the next candidate
    }
  }
  throw new UsageError(
    `the ops-ui library repository was not found (tried ${candidates.join(", ")}). ` +
      "Clone github.com/sasavincic/ops-ui beside this app, pass --repo <path> or set OPS_UI_REPO; " +
      "in a cloud session: add_repo sasavincic/ops-ui.",
  );
}

/**
 * The release commit of `version`: exactly one `release: vX.Y.Z` on main, agreeing with the
 * release/vX.Y.Z branch when that exists, whose package.json and src/version.ts say X.Y.Z.
 * @param {string} repo
 * @param {string} version
 * @returns {string}
 */
export function resolveRelease(repo, version) {
  const main = revParse(repo, "origin/main") ? "origin/main" : "main";
  if (!revParse(repo, main)) throw new UsageError(`the library repository at ${repo} has no main branch`);
  const subject = `release: v${version}`;
  const commits = git(repo, ["log", "--format=%H%x09%s", main])
    .split("\n")
    .filter(Boolean)
    .map((line) => line.split("\t"))
    .filter(([, s]) => s === subject)
    .map(([hash]) => hash);
  if (commits.length === 0) throw new Refusal([`no release v${version} on ${main} (no commit titled "${subject}")`]);
  if (commits.length > 1) {
    throw new Refusal([`release v${version} is ambiguous: ${commits.length} commits titled "${subject}" on ${main}`]);
  }
  const [commit] = commits;
  const branch = revParse(repo, `origin/release/v${version}`) ?? revParse(repo, `release/v${version}`);
  if (branch && branch !== commit) {
    throw new Refusal([
      `release markers disagree: "${subject}" is ${commit.slice(0, 7)} but branch release/v${version} is ${branch.slice(0, 7)}`,
    ]);
  }
  const pkg = JSON.parse(showAt(repo, commit, "package.json") ?? "{}");
  const versionTs = showAt(repo, commit, "src/version.ts") ?? "";
  if (pkg.version !== version || !versionTs.includes(`"${version}"`)) {
    throw new Refusal([
      `release v${version} (${commit.slice(0, 7)}) is malformed: package.json says ${pkg.version} and src/version.ts must say ${version}`,
    ]);
  }
  return commit;
}

/**
 * Everything a sync needs from the release commit.
 * @param {string} repo
 * @param {string} commit
 * @param {string} version
 * @param {string} vendorDir
 */
export function readRelease(repo, commit, version, vendorDir) {
  const shipText = showAt(repo, commit, "ship.json");
  if (shipText === null) throw new Refusal([`the release ${commit.slice(0, 7)} has no ship.json`]);
  const files = git(repo, ["ls-tree", "-r", "--name-only", commit]).split("\n").filter(Boolean);
  /** @type {ShipEntry[]} */
  let plan;
  try {
    plan = shipPlan(JSON.parse(shipText), files, vendorDir);
  } catch (error) {
    throw new Refusal([`the release is malformed: ${/** @type {Error} */ (error).message}`]);
  }
  const sha7 = commit.slice(0, 7);
  /** @type {Map<string, string>} */
  const contents = new Map();
  /** @type {string[]} */
  const malformed = [];
  for (const { src, dest } of plan) {
    try {
      contents.set(dest, generatedHeader(dest, version, sha7) + /** @type {string} */ (showAt(repo, commit, src)));
    } catch (error) {
      malformed.push(`the release is malformed: ${/** @type {Error} */ (error).message}`);
    }
  }
  if (malformed.length > 0) throw new Refusal(malformed);
  return {
    plan,
    contents,
    pkg: /** @type {{ version?: string, peerDependencies?: Record<string, string> }} */ (
      JSON.parse(showAt(repo, commit, "package.json") ?? "{}")
    ),
    tokensCss: showAt(repo, commit, "styles/tokens.css") ?? "",
    changelog: showAt(repo, commit, "CHANGELOG.md") ?? "",
  };
}

/**
 * The CHANGELOG sections after `from` up to and including `to` (spec §4.3 headings
 * `## X.Y.Z — date`), newest first as the file holds them.
 * @param {string} changelog
 * @param {string | null} from
 * @param {string} to
 */
export function changelogBetween(changelog, from, to) {
  const sections = changelog.split(/^(?=## \d)/m).filter((s) => /^## \d/.test(s));
  return sections.filter((section) => {
    const v = section.match(/^## (\d+\.\d+\.\d+)/)?.[1];
    if (!v) return false;
    if (compareVersions(v, to) > 0) return false;
    return from === null ? compareVersions(v, to) === 0 : compareVersions(v, from) > 0;
  });
}

// ---------------------------------------------------------------------------------------------
// The sync (spec §5.2).
// ---------------------------------------------------------------------------------------------

/**
 * @typedef {{ version?: string, ref?: string, repo?: string, dryRun?: boolean, discardLocalEdits?: boolean, allowDowngrade?: boolean }} SyncOptions
 */

/**
 * @param {string} appRoot
 * @param {SyncOptions} options
 * @param {(line: string) => void} log
 * @returns {number} the exit code
 */
export function sync(appRoot, options, log) {
  const config = readConfig(appRoot);
  const repo = findRepo(appRoot, config, options.repo);
  try {
    git(repo, ["fetch", "--quiet", "origin", "main", "refs/heads/release/*:refs/remotes/origin/release/*"]);
  } catch {
    // Best effort: offline is fine when the refs exist locally.
  }

  // Step 2: one commit C.
  /** @type {string} */
  let commit;
  /** @type {string} */
  let version;
  const dev = Boolean(options.ref);
  if (options.ref) {
    const resolved = revParse(repo, options.ref);
    if (!resolved) throw new UsageError(`--ref ${options.ref} is not a commit of ${repo}`);
    commit = resolved;
    const pkg = JSON.parse(showAt(repo, commit, "package.json") ?? "{}");
    version = `${pkg.version}-dev+${commit.slice(0, 7)}`;
  } else {
    version = /** @type {string} */ (options.version);
    commit = resolveRelease(repo, version);
  }
  const oldLock = readLock(appRoot);
  if (!dev && oldLock && !oldLock.dev && oldLock.version === version && oldLock.commit !== commit) {
    throw new Refusal([`release v${version} moved from ${oldLock.commit} to ${commit}`]);
  }

  // Step 3: read the release from git objects.
  const release = readRelease(repo, commit, version, config.vendorDir);
  const newFiles = new Map([...release.contents].map(([dest, content]) => [dest, sha256(content)]));

  // Step 4: pre-flight. Nothing is written until every check has passed.
  /** @type {string[]} */
  const problems = [];
  /** @type {string[]} */
  const notes = [];
  const oldFiles = oldLock?.files ?? {};
  const edited = [];
  for (const [file, hash] of Object.entries(oldFiles)) {
    const abs = path.join(appRoot, file);
    if (!existsSync(abs)) edited.push(`${file} is missing`);
    else if (sha256(readFileSync(abs)) !== hash) edited.push(`${file} was edited`);
  }
  if (edited.length > 0 && !options.discardLocalEdits) {
    problems.push(...edited.map((e) => `local edit: ${e} (see: git diff -- ${e.split(" ")[0]})`));
    problems.push("fix it in ops-ui, release, sync - or pass --discard-local-edits to overwrite");
  }
  const unknown = listFiles(appRoot, config.vendorDir).filter((file) => !(file in oldFiles));
  if (unknown.length > 0 && !options.discardLocalEdits) {
    problems.push(...unknown.map((file) => `unknown file: ${file} is not in ${LOCK_FILE} (--discard-local-edits removes it)`));
  }
  for (const dest of newFiles.keys()) {
    if (!isAllowedDestination(dest, config.vendorDir)) {
      problems.push(`the release is malformed: ${dest} is outside ${config.vendorDir} and is not ${SCRIPT_DESTS.join(" or ")}`);
    }
  }
  for (const dest of newFiles.keys()) {
    // The script and its declarations are the exception: an app's first sync starts from a hand
    // copy of the script (and may have copied its declarations beside it).
    if (!SCRIPT_DESTS.includes(dest) && !(dest in oldFiles) && existsSync(path.join(appRoot, dest))) {
      problems.push(`collision: ${dest} already exists and is not the library's; move the app's file`);
    }
  }
  if (oldLock && compareVersions(version, oldLock.version) < 0 && !options.allowDowngrade) {
    problems.push(`downgrade: ${oldLock.version} to ${version} (pass --allow-downgrade to go back)`);
  }
  for (const [name, range] of Object.entries(release.pkg.peerDependencies ?? {})) {
    const installed = readJson(path.join(appRoot, "node_modules", name, "package.json"));
    if (!installed) problems.push(`peer ${name} is not installed (the library needs ${range})`);
    else if (!satisfies(installed.version, /** @type {string} */ (range))) {
      problems.push(`peer ${name} ${installed.version} does not satisfy ${range}`);
    }
  }
  try {
    const declared = new Set(parseTokenContract(release.tokensCss).tokens.map((t) => t.token));
    for (const name of config.extensions) {
      if (declared.has(name)) problems.push(`extension clash: the library now declares ${name}, an app extension (config.extensions)`);
    }
  } catch (error) {
    problems.push(`the release is malformed: ${/** @type {Error} */ (error).message}`);
  }
  const styles = checkAppStyles(appRoot, config, release.tokensCss);
  problems.push(...styles.brand, ...styles.theme);
  notes.push(...styles.notes);
  if (problems.length > 0) throw new Refusal(problems);

  const added = [...newFiles.keys()].filter((f) => !(f in oldFiles));
  const changed = [...newFiles.keys()].filter((f) => f in oldFiles && oldFiles[f] !== newFiles.get(f));
  const removed = Object.keys(oldFiles).filter((f) => !newFiles.has(f));

  if (oldLock && parseVersion(oldLock.version)?.[0] !== parseVersion(version)?.[0]) {
    const lower = compareVersions(oldLock.version, version) < 0 ? oldLock.version : version;
    const higher = lower === version ? oldLock.version : version;
    const sections = changelogBetween(release.changelog, lower, higher);
    const crossing = sections.flatMap((s) => majorNotes(s));
    if (crossing.length > 0) {
      log(`Crossing a major (${oldLock.version} -> ${version}):`);
      for (const line of crossing) log(`  ${line}`);
    }
  }

  if (options.dryRun) {
    log(`dry run: ops-ui ${oldLock?.version ?? "(none)"} -> ${version} (${commit.slice(0, 7)})`);
    for (const f of added) log(`  add     ${f}`);
    for (const f of changed) log(`  change  ${f}`);
    for (const f of removed) log(`  remove  ${f}`);
    log(`${added.length} added, ${changed.length} changed, ${removed.length} removed; nothing written`);
    return 0;
  }

  // Steps 5-6: write the vendor folder into a temporary directory, then swap it in.
  const vendorAbs = path.join(appRoot, config.vendorDir);
  const needsWrite =
    added.length + changed.length + removed.length + edited.length + unknown.length > 0 || !existsSync(vendorAbs);
  if (needsWrite) {
    const tmp = `${vendorAbs}.ops-ui-tmp`;
    const old = `${vendorAbs}.ops-ui-old`;
    rmSync(tmp, { recursive: true, force: true });
    rmSync(old, { recursive: true, force: true });
    for (const [dest, content] of release.contents) {
      if (SCRIPT_DESTS.includes(dest)) continue;
      const file = path.join(tmp, path.relative(config.vendorDir, dest));
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, content);
    }
    mkdirSync(tmp, { recursive: true });
    const hadVendor = existsSync(vendorAbs);
    try {
      if (hadVendor) renameSync(vendorAbs, old);
      try {
        renameSync(tmp, vendorAbs);
      } catch (error) {
        if (hadVendor) renameSync(old, vendorAbs);
        throw error;
      }
    } catch (error) {
      rmSync(tmp, { recursive: true, force: true });
      throw new Refusal([`could not swap ${config.vendorDir}: ${/** @type {Error} */ (error).message}; nothing changed`]);
    }
    rmSync(old, { recursive: true, force: true });
    for (const dest of removed) {
      if (!dest.startsWith(`${config.vendorDir}/`) && !SCRIPT_DESTS.includes(dest)) rmSync(path.join(appRoot, dest), { force: true });
    }
  }

  // Step 7: the lock.
  /** @type {Lock} */
  const lock = { commit, files: Object.fromEntries(newFiles), version };
  if (dev) lock.dev = true;
  writeFileSync(path.join(appRoot, LOCK_FILE), stableJson(lock));

  // Step 9 (printed before step 8 so the self-update notice is the last line).
  log(`ops-ui ${oldLock?.version ?? "(none)"} -> ${version} (${commit.slice(0, 7)}): ${added.length} added, ${changed.length} changed, ${removed.length} removed`);
  for (const note of notes) log(`note: ${note}`);
  const sections = changelogBetween(release.changelog, oldLock && !oldLock.dev ? oldLock.version : null, parseVersionText(version));
  if (sections.length > 0) {
    log("CHANGELOG:");
    for (const section of sections) log(section.trimEnd());
  }
  const unwrapped = missingWrappers(appRoot, config);
  if (unwrapped.length > 0) {
    log(`components without a wrapper in ${config.wrappersDir}: ${unwrapped.join(", ")} (run: node ${SYNC_DEST} --write-wrappers)`);
  }
  log("next: pnpm typecheck && pnpm test, then the visual check (ops-ui tools/app-shots.mjs, spec §11.4)");

  // Step 8: this script's declarations, then this script, last (each: temp file, then rename).
  const replace = (/** @type {string} */ dest) => {
    const content = release.contents.get(dest);
    const file = path.join(appRoot, dest);
    if (content === undefined) {
      if (dest in oldFiles) rmSync(file, { force: true });
      return false;
    }
    if (existsSync(file) && readFileSync(file, "utf8") === content) return false;
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(`${file}.ops-ui-tmp`, content);
    renameSync(`${file}.ops-ui-tmp`, file);
    return true;
  };
  replace(SYNC_TYPES_DEST);
  if (replace(SYNC_DEST)) log("the sync script was updated - run the same command again");
  return 0;
}

/** X.Y.Z of a version, dropping a -dev+sha suffix. */
function parseVersionText(/** @type {string} */ version) {
  const v = parseVersion(version);
  return v ? v.join(".") : version;
}

/** The Visible:, Breaking: and Upgrade steps: lines of a CHANGELOG section, with their continuations. */
function majorNotes(/** @type {string} */ section) {
  /** @type {string[]} */
  const out = [];
  let keep = false;
  for (const line of section.split("\n")) {
    if (/^(Visible|Breaking|Upgrade steps):/.test(line)) keep = true;
    else if (/^[A-Z][A-Za-z ]*:/.test(line) || line.startsWith("## ") || line.trim() === "") keep = false;
    if (keep) out.push(line);
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Wrappers (spec §6.4): src/components/ui/<name>.tsx re-exports the vendored module by name.
// ---------------------------------------------------------------------------------------------

/** Keywords after which a `/` starts a regular expression, not a division. */
const REGEX_AFTER_WORD = new Set([
  "return", "typeof", "instanceof", "in", "of", "new", "delete", "void", "throw", "case", "do", "else", "yield", "await",
]);

/**
 * The source with every comment and the contents of every string, template and regular
 * expression literal blanked to spaces; newlines stay, so every line keeps its number and a
 * statement that starts a line still starts it. A small lexer, not a regex: a quoted `image/*`
 * must not open a comment, and a `//` inside a string must not end its line. Template literals
 * nest (`${ … }` is code again). A `/` is a regular expression after an operator, an opening
 * bracket, a keyword or the start of the file, and a division after a value; a would-be regular
 * expression that reaches the end of its line is read as a division instead, so a misreading
 * cannot swallow the next line. JSX text is read as code (the library test compares every
 * component's exports with the TypeScript AST, so a component that confused this lexer would
 * fail before any release).
 * @param {string} source
 * @returns {string}
 */
export function blankNonCode(source) {
  let out = "";
  let i = 0;
  /** The last significant (non-space, non-comment) code character: the regex decision. */
  let last = "";
  /** The identifier or keyword that ends at `last`, when `last` ends one. */
  let lastWord = "";
  /** Was the character just before i part of an identifier? */
  let inWord = false;
  /** One entry per open `${`: the brace depth inside that template expression. */
  const templates = [];
  const blank = (/** @type {string} */ text) => text.replace(/[^\n]/g, " ");
  const significant = (/** @type {string} */ ch) => {
    last = ch;
    lastWord = "";
    inWord = false;
  };
  /** Scans a template literal's text from i (just after its backtick or its closing `}`). */
  const templateText = () => {
    let j = i;
    while (j < source.length && source[j] !== "`" && !(source[j] === "$" && source[j + 1] === "{")) {
      j += source[j] === "\\" ? 2 : 1;
    }
    out += blank(source.slice(i, Math.min(j, source.length)));
    if (j >= source.length) {
      i = source.length;
    } else if (source[j] === "`") {
      out += "`";
      i = j + 1;
      significant("`");
    } else {
      out += "${";
      i = j + 2;
      templates.push(0);
      significant("{");
    }
  };
  const startsRegex = () =>
    last === "" ||
    "(,=:[!&|?{;+-*%~^".includes(last) ||
    (last === ">" && out.trimEnd().endsWith("=>")) ||
    REGEX_AFTER_WORD.has(lastWord);
  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];
    if (ch === "/" && next === "/") {
      let j = i;
      while (j < source.length && source[j] !== "\n") j += 1;
      out += blank(source.slice(i, j));
      i = j;
      inWord = false;
    } else if (ch === "/" && next === "*") {
      const end = source.indexOf("*/", i + 2);
      const stop = end === -1 ? source.length : end + 2;
      out += blank(source.slice(i, stop));
      i = stop;
      inWord = false;
    } else if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < source.length && source[j] !== ch && source[j] !== "\n") j += source[j] === "\\" ? 2 : 1;
      const closed = source[j] === ch;
      out += ch + blank(source.slice(i + 1, Math.min(j, source.length))) + (closed ? ch : "");
      i = closed ? j + 1 : j;
      significant(ch);
    } else if (ch === "`") {
      out += "`";
      i += 1;
      templateText();
    } else if (ch === "/" && startsRegex()) {
      let j = i + 1;
      let inClass = false;
      while (j < source.length && source[j] !== "\n") {
        if (source[j] === "\\") j += 2;
        else if (source[j] === "/" && !inClass) break;
        else {
          if (source[j] === "[") inClass = true;
          else if (source[j] === "]") inClass = false;
          j += 1;
        }
      }
      if (source[j] === "/") {
        let k = j + 1;
        while (k < source.length && /[a-z]/i.test(source[k])) k += 1;
        out += `/${blank(source.slice(i + 1, j))}/${source.slice(j + 1, k)}`;
        i = k;
      } else {
        out += ch;
        i += 1;
      }
      significant("/");
    } else if (ch === "{" && templates.length > 0) {
      templates[templates.length - 1] += 1;
      out += ch;
      i += 1;
      significant(ch);
    } else if (ch === "}" && templates.length > 0 && templates[templates.length - 1] === 0) {
      templates.pop();
      out += ch;
      i += 1;
      templateText();
    } else {
      if (ch === "}" && templates.length > 0) templates[templates.length - 1] -= 1;
      out += ch;
      i += 1;
      if (/[A-Za-z0-9_$]/.test(ch)) {
        lastWord = inWord ? lastWord + ch : ch;
        last = ch;
        inWord = true;
      } else if (/\s/.test(ch)) {
        inWord = false;
      } else {
        significant(ch);
      }
    }
  }
  return out;
}

/**
 * The runtime and type exports of a module, in source order, from its top-level export
 * statements (read after blankNonCode, so no comment or literal can hide or fake one).
 * @param {string} source
 * @returns {{ runtime: string[], types: string[] }}
 */
export function moduleExports(source) {
  const code = blankNonCode(source);
  /** @type {{ at: number, name: string, type: boolean }[]} */
  const found = [];
  const add = (/** @type {number} */ at, /** @type {string} */ name, /** @type {boolean} */ type) => found.push({ at, name, type });
  for (const m of code.matchAll(/^export\s+(?:default\s+)?(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)/gm)) add(m.index, m[1], false);
  for (const m of code.matchAll(/^export\s+(?:const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm)) add(m.index, m[1], false);
  for (const m of code.matchAll(/^export\s+(?:declare\s+)?(type|interface|enum)\s+([A-Za-z_$][\w$]*)/gm)) {
    add(m.index, m[2], m[1] !== "enum");
  }
  for (const m of code.matchAll(/^export\s+(type\s+)?\{([^}]*)\}/gm)) {
    for (const entry of m[2].split(",").map((e) => e.trim()).filter(Boolean)) {
      const typeEntry = Boolean(m[1]) || /^type\s+/.test(entry);
      const name = entry.replace(/^type\s+/, "").split(/\s+as\s+/).pop()?.trim();
      if (name) add(m.index, name, typeEntry);
    }
  }
  found.sort((a, b) => a.at - b.at);
  /** @type {string[]} */
  const runtime = [];
  /** @type {string[]} */
  const types = [];
  for (const { name, type } of found) {
    const list = type ? types : runtime;
    if (!runtime.includes(name) && !types.includes(name)) list.push(name);
  }
  return { runtime, types };
}

/** The import path of the vendor folder from the wrappers: the `@/` alias for src/, else relative. */
function vendorImport(/** @type {AppConfig} */ config) {
  if (config.vendorDir.startsWith("src/")) return `@/${config.vendorDir.slice(4)}`;
  const rel = path.posix.relative(config.wrappersDir, config.vendorDir);
  return rel.startsWith(".") ? rel : `./${rel}`;
}

/** Vendored component modules that have no wrapper yet. */
function missingWrappers(/** @type {string} */ appRoot, /** @type {AppConfig} */ config) {
  const dir = path.join(appRoot, config.vendorDir, "components");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => f.slice(0, -4))
    .filter((name) => !existsSync(path.join(appRoot, config.wrappersDir, `${name}.tsx`)))
    .sort();
}

/**
 * Creates a pure wrapper for every vendored component without one; never overwrites.
 * @param {string} appRoot
 * @param {(line: string) => void} log
 * @returns {number}
 */
export function writeWrappers(appRoot, log) {
  const config = readConfig(appRoot);
  const names = missingWrappers(appRoot, config);
  if (!existsSync(path.join(appRoot, config.vendorDir, "components"))) {
    throw new UsageError(`no ${config.vendorDir}/components: sync a release first`);
  }
  const from = vendorImport(config);
  for (const name of names) {
    const source = readFileSync(path.join(appRoot, config.vendorDir, "components", `${name}.tsx`), "utf8");
    const { runtime, types } = moduleExports(source);
    const spec = `${from}/components/${name}`;
    let text = "";
    if (runtime.length > 0) text += `export { ${runtime.join(", ")} } from "${spec}";\n`;
    if (types.length > 0) text += `export type { ${types.join(", ")} } from "${spec}";\n`;
    const file = path.join(appRoot, config.wrappersDir, `${name}.tsx`);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, text, { flag: "wx" });
    log(`created ${config.wrappersDir}/${name}.tsx`);
  }
  if (names.length === 0) log("every vendored component has a wrapper");
  return 0;
}

// ---------------------------------------------------------------------------------------------
// Command line (spec §5.1).
// ---------------------------------------------------------------------------------------------

const USAGE = [
  "usage:",
  "  node scripts/sync-ops-ui.mjs --version X.Y.Z [--repo <path>] [--dry-run] [--discard-local-edits] [--allow-downgrade]",
  "  node scripts/sync-ops-ui.mjs --ref <sha> [--repo <path>] [--dry-run]",
  "  node scripts/sync-ops-ui.mjs --check",
  "  node scripts/sync-ops-ui.mjs --write-wrappers",
].join("\n");

/**
 * @param {string[]} argv
 * @returns {{ command: "sync" | "check" | "write-wrappers" } & SyncOptions}
 */
export function parseArgs(argv) {
  /** @type {SyncOptions & { command?: "sync" | "check" | "write-wrappers" }} */
  const out = {};
  const value = (/** @type {number} */ i, /** @type {string} */ flag) => {
    const v = argv[i + 1];
    if (v === undefined || v.startsWith("--")) throw new UsageError(`${flag} needs a value\n${USAGE}`);
    return v;
  };
  const command = (/** @type {"sync" | "check" | "write-wrappers"} */ c) => {
    if (out.command && out.command !== c) throw new UsageError(`one command at a time\n${USAGE}`);
    out.command = c;
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--version") {
      out.version = value(i++, arg);
      command("sync");
    } else if (arg === "--ref") {
      out.ref = value(i++, arg);
      command("sync");
    } else if (arg === "--repo") out.repo = value(i++, arg);
    else if (arg === "--dry-run") out.dryRun = true;
    else if (arg === "--discard-local-edits") out.discardLocalEdits = true;
    else if (arg === "--allow-downgrade") out.allowDowngrade = true;
    else if (arg === "--check") command("check");
    else if (arg === "--write-wrappers") command("write-wrappers");
    else throw new UsageError(`unknown argument ${arg}\n${USAGE}`);
  }
  if (!out.command) throw new UsageError(USAGE);
  if (out.version && out.ref) throw new UsageError(`--version and --ref exclude each other\n${USAGE}`);
  if (out.version && !/^\d+\.\d+\.\d+$/.test(out.version)) throw new UsageError(`--version takes X.Y.Z, got ${out.version}`);
  return /** @type {{ command: "sync" | "check" | "write-wrappers" } & SyncOptions} */ (out);
}

/**
 * @param {string[]} argv
 * @param {string} appRoot
 * @returns {Promise<number>}
 */
export async function main(argv, appRoot = process.cwd()) {
  const log = (/** @type {string} */ line) => console.log(line);
  try {
    const args = parseArgs(argv);
    if (args.command === "check") {
      const result = await checkVendor(appRoot);
      if (result.ok) {
        log(`ops-ui ${result.version}: the vendored copy matches ${LOCK_FILE}`);
        return 0;
      }
      console.error(`ops-ui ${result.version || "(no lock)"}: the vendored copy does not match`);
      if (result.dev) console.error(`dev sync: ${LOCK_FILE} pins a --ref build; sync a release`);
      for (const f of result.edited) console.error(`edited: ${f}`);
      for (const f of result.missing) console.error(`missing: ${f}`);
      for (const f of result.unknown) console.error(`unknown: ${f}`);
      for (const p of [...result.brand, ...result.theme]) console.error(p);
      return 1;
    }
    if (args.command === "write-wrappers") return writeWrappers(appRoot, log);
    return sync(appRoot, args, log);
  } catch (error) {
    if (error instanceof Refusal) {
      console.error("sync-ops-ui: refused");
      for (const reason of error.reasons) console.error(reason);
      return 1;
    }
    if (error instanceof UsageError) {
      console.error(`sync-ops-ui: ${error.message}`);
      return 2;
    }
    console.error(`sync-ops-ui: ${/** @type {Error} */ (error).stack ?? error}`);
    return 2;
  }
}

// Run only when executed directly, never on import (checkVendor is imported by app tests).
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  process.exit(await main(process.argv.slice(2)));
}
