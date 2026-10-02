// gallery/preflight-scope.mjs - Tailwind's preflight, scoped (1.3.0; PrefabOps restyle plan G19,
// §5.3; library spec §13.2).
//
//   node gallery/preflight-scope.mjs          rewrite both generated files
//   node gallery/preflight-scope.mjs --check  exit 1 when either is stale (tests/preflight-scoped.test.ts
//                                            runs the same comparison)
//
// It writes two files from node_modules/tailwindcss/preflight.css, rule for rule:
//
// - styles/preflight-scoped.css (shipped): the reset applies only to an element of class
//   `ops-ui-root` and everything inside it, so a page whose legacy CSS predates Tailwind can host
//   kit islands without taking the global reset. PrefabOps imported it in layer(base) until P5;
//   deprecated in 1.8.0 (no user left), removed in 2.0.
// - gallery/app/preflight-global.css (the gallery's own reset): the same rules for every element
//   unless <html data-ops-preflight="scoped">, which the island story sets so its legacy fixture
//   renders unreset, exactly as on a PrefabOps page. Every other story renders as before.
//
// The scope is inserted into the LAST compound of each selector, before a pseudo-element, as
// `:where(ROOT, ROOT *)`: zero specificity, so every rule keeps the specificity it has in Tailwind.
// `html, :host` (the inherited defaults: line height, font, tab size) become `:where(ROOT)`.
// Comments are dropped; declarations, `--theme()` calls and at-rules are kept verbatim, so the
// file goes through the app's Tailwind like preflight.css itself.

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const ISLAND_ROOT = ".ops-ui-root";
export const GALLERY_ROOT = 'html:not([data-ops-preflight="scoped"])';

/** Splits a selector list on its top-level commas. */
export function splitTopLevel(text, separator = ",") {
  const parts = [];
  let depth = 0;
  let quote = null;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === quote) quote = null;
    } else if (c === "'" || c === '"') quote = c;
    else if (c === "(" || c === "[") depth++;
    else if (c === ")" || c === "]") depth--;
    else if (c === separator && depth === 0) {
      parts.push(text.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(text.slice(start));
  return parts.map((p) => p.trim()).filter(Boolean);
}

/** One selector, scoped under `root` (see the header). */
export function scopeSelector(selector, root) {
  const s = selector.replace(/\s+/g, " ").trim();
  if (s === "html" || s === ":host") return `:where(${root})`;
  const scope = `:where(${root}, ${root} *)`;
  // The last compound starts after the last top-level combinator (space, >, +, ~).
  let depth = 0;
  let quote = null;
  let lastStart = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quote) {
      if (c === quote) quote = null;
    } else if (c === "'" || c === '"') quote = c;
    else if (c === "(" || c === "[") depth++;
    else if (c === ")" || c === "]") depth--;
    else if (depth === 0 && (c === " " || c === ">" || c === "+" || c === "~")) lastStart = i + 1;
  }
  const head = s.slice(0, lastStart);
  let compound = s.slice(lastStart).trim();
  if (compound === "*") compound = "";
  // A pseudo-element ends the compound: the scope goes before it.
  depth = 0;
  for (let i = 0; i < compound.length; i++) {
    const c = compound[i];
    if (c === "(" || c === "[") depth++;
    else if (c === ")" || c === "]") depth--;
    else if (depth === 0 && c === ":" && compound[i + 1] === ":") {
      return `${head}${compound.slice(0, i)}${scope}${compound.slice(i)}`;
    }
  }
  return `${head}${compound}${scope}`;
}

/** Strips comments (none of preflight's sit inside a string). */
function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

/** Reads one block's statements: rules and at-rules with their bodies, recursively. */
function parseBlock(css, start) {
  const items = [];
  let i = start;
  while (i < css.length) {
    while (i < css.length && /\s/.test(css[i])) i++;
    if (i >= css.length || css[i] === "}") return { items, end: i + 1 };
    let j = i;
    let depth = 0;
    let quote = null;
    while (j < css.length) {
      const c = css[j];
      if (quote) {
        if (c === quote) quote = null;
      } else if (c === "'" || c === '"') quote = c;
      else if (c === "(") depth++;
      else if (c === ")") depth--;
      else if (depth === 0 && (c === "{" || c === ";")) break;
      j++;
    }
    const prelude = css.slice(i, j).replace(/\s+/g, " ").trim();
    if (css[j] === ";") {
      items.push({ kind: "statement", prelude });
      i = j + 1;
      continue;
    }
    if (prelude.startsWith("@")) {
      const inner = parseBlock(css, j + 1);
      items.push({ kind: "at", prelude, items: inner.items });
      i = inner.end;
      continue;
    }
    // A style rule: its body is declarations only (preflight nests nothing in a rule).
    let k = j + 1;
    quote = null;
    while (k < css.length && (quote || css[k] !== "}")) {
      if (quote) {
        if (css[k] === quote) quote = null;
      } else if (css[k] === "'" || css[k] === '"') quote = css[k];
      k++;
    }
    const body = css
      .slice(j + 1, k)
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    items.push({ kind: "rule", prelude, body });
    i = k + 1;
  }
  return { items, end: i };
}

function printItems(items, root, indent) {
  const pad = "  ".repeat(indent);
  const out = [];
  for (const item of items) {
    if (item.kind === "statement") out.push(`${pad}${item.prelude};`);
    else if (item.kind === "at") {
      out.push(`${pad}${item.prelude} {`, ...printItems(item.items, root, indent + 1), `${pad}}`);
    } else {
      const selectors = [...new Set(splitTopLevel(item.prelude).map((s) => scopeSelector(s, root)))];
      out.push(
        `${pad}${selectors.join(`,\n${pad}`)} {`,
        // A declaration keeps its continuation lines indented one step under it.
        ...item.body.map((line) => `${pad}  ${/^-{0,2}[\w-]+\s*:/.test(line) || line.startsWith(")") ? "" : "  "}${line}`),
        `${pad}}`,
      );
    }
    out.push("");
  }
  return out;
}

/** Tailwind's preflight.css scoped under `root`, with `header` as its first comment. */
export function scopePreflight(css, root, header) {
  const { items } = parseBlock(stripComments(css), 0);
  return `${header}\n\n${printItems(items, root, 0).join("\n").trimEnd()}\n`;
}

const TAILWIND_VERSION = JSON.parse(readFileSync(path.join(ROOT_DIR, "node_modules/tailwindcss/package.json"), "utf8")).version;

export const OUTPUTS = [
  {
    file: "styles/preflight-scoped.css",
    root: ISLAND_ROOT,
    header: `/* @latro/ops-ui preflight-scoped (1.3.0): Tailwind's preflight (tailwindcss ${TAILWIND_VERSION}) applied only to
   an element of class ops-ui-root and everything inside it, for a page whose legacy CSS predates
   Tailwind (PrefabOps during its restyle, spec 13.2; restyle plan 5.3). Import it in layer(base)
   INSTEAD of the global preflight: a page that imports tailwindcss (or tailwindcss/preflight.css)
   already has the reset everywhere and needs nothing from this file.
   Every rule keeps the specificity it has in preflight.css (the scope is a :where()).
   DEPRECATED in 1.8.0: no app imports it since PrefabOps' restyle finished (styling programme
   spec 12); it keeps working and is removed in 2.0.
   Generated by gallery/preflight-scope.mjs; do not edit. */`,
  },
  {
    file: "gallery/app/preflight-global.css",
    root: GALLERY_ROOT,
    header: `/* The gallery's preflight (tailwindcss ${TAILWIND_VERSION}): every element, unless <html data-ops-preflight=scoped>,
   which the island story sets so its legacy fixture renders without the reset, as on a PrefabOps
   page. Generated by gallery/preflight-scope.mjs; do not edit. */`,
  },
];

/** The text each generated file must hold. */
export function expectedOutputs() {
  const source = readFileSync(path.join(ROOT_DIR, "node_modules/tailwindcss/preflight.css"), "utf8");
  return OUTPUTS.map((o) => ({ file: o.file, text: scopePreflight(source, o.root, o.header) }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes("--check");
  let stale = false;
  for (const { file, text } of expectedOutputs()) {
    const target = path.join(ROOT_DIR, file);
    let current = null;
    try {
      current = readFileSync(target, "utf8");
    } catch {}
    if (current === text) continue;
    if (check) {
      console.error(`${file} is stale: run node gallery/preflight-scope.mjs`);
      stale = true;
    } else {
      writeFileSync(target, text);
      console.log(`wrote ${file}`);
    }
  }
  if (stale) process.exit(1);
}
