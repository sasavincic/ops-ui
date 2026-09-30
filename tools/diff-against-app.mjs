// tools/diff-against-app.mjs - the extraction proof of spec §12.1 L6: library 1.0.0 is the
// FinaOps kit (plus the named Workforce Ops modules) with nothing changed but what the spec names.
//
//   node tools/diff-against-app.mjs --app <app tree> [--ref <git ref>] [--source <fina-ops tree>] [--label <text>]
//
// --app     an app checkout or a `git archive` export (fina-ops or workforce-ops; told apart by
//           package.json). Other sessions edit the apps' working trees, so either pass --ref
//           (files are then read from git objects, never from the working tree) or run against an
//           export: git -C ../fina-ops archive origin/main | tar -x -C <dir>
// --ref     read the app (and --source) through `git show <ref>:<path>` instead of the file system
// --source  Workforce Ops runs only: the FinaOps tree the library was taken from (default: the
//           sibling fina-ops of --app). Where the two app kits differ, the library follows
//           FinaOps; the tool needs that copy to tell such a line from an unexplained one.
// --label   how the report names the app (for example "fina-ops origin/main 80828fc")
//
// For each of the 35 components (§9) it prints the diff of the app copy against the library copy
// after removing exactly what the spec calls mechanical (listed under "Normalizations" in the
// report, each counted): import statements, the kit-config hook line (useDict / useMaybeDict /
// useLocale ↔ useOpsUi), t.common.x → strings.x, localizeMessage(t, s) → localize(s) and their
// null-dictionary forms, the React-free types that moved to types.ts (each move verified against
// the app's definition) and blank lines. Every line left over must be accounted for by a named
// spec row: LIBRARY_CHANGES below (the §7 / §9 "Change" items, the same against both apps) or,
// against Workforce Ops, a line where the two app kits differ in a file §9 sources from FinaOps.
// A Workforce Ops kit change §9 does not know of (the app moved after the survey) is reported as
// such, never as an extraction bug; WFO_AHEAD records it once the spec names it. The library's
// other extracted modules (navigation/, lib/) are compared whole or declaration by declaration,
// and EN_STRINGS against the app's en `common` words.
//
// Exit 0: every difference is accounted for. 1: something is not (an extraction bug to fix in
// the library, app drift the spec has not named, or named drift whose decision is still open -
// releasing 1.0.0 would foreclose one of the options, spec §12.4). 2: usage or environment error.

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

const LIB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// ---------------------------------------------------------------------------------------------
// The spec, as data
// ---------------------------------------------------------------------------------------------

/**
 * Spec §9: row number, directive (S server-safe / C client), where the library's copy comes from
 * ("same" = byte-identical in both apps at the survey; "finaops" = FinaOps' copy where the two
 * differ; "either" = they differ only in an import; "joins" = FinaOps-only file) and the Change
 * column ("" = none beyond §7).
 */
export const ROWS = {
  "action-icon.tsx": { row: 1, kind: "C", source: "finaops", change: "" },
  "attention-list.tsx": { row: 2, kind: "S", source: "same", change: "" },
  "back-link.tsx": { row: 3, kind: "C", source: "same", change: "" },
  "badge.tsx": { row: 4, kind: "S", source: "same", change: "" },
  "button.tsx": { row: 5, kind: "C", source: "same", change: "" },
  "callout.tsx": { row: 6, kind: "S", source: "same", change: "" },
  "card.tsx": { row: 7, kind: "S", source: "same", change: "" },
  "combobox.tsx": { row: 8, kind: "C", source: "same", change: "" },
  "confirm-dialog.tsx": { row: 9, kind: "C", source: "finaops", change: "" },
  "copy-value.tsx": { row: 10, kind: "C", source: "same", change: "" },
  "date-input.tsx": { row: 11, kind: "C", source: "same", change: "" },
  "description-list.tsx": { row: 12, kind: "S", source: "same", change: "" },
  "dialog.tsx": { row: 13, kind: "C", source: "same", change: "label-matched discard guard kept until 2.0" },
  "empty-state.tsx": { row: 14, kind: "S", source: "same", change: "" },
  "field.tsx": { row: 15, kind: "C", source: "same", change: "" },
  "form-actions.tsx": { row: 16, kind: "S", source: "same", change: "" },
  "glance-card.tsx": { row: 17, kind: "S", source: "same", change: "English default kept until 2.0" },
  "kicker.tsx": { row: 18, kind: "S", source: "same", change: "" },
  "monogram.tsx": { row: 19, kind: "S", source: "same", change: "`external` tone reads --color-external (same pixels at 1.0)" },
  "month-nav.tsx": { row: 20, kind: "C", source: "either", change: "Intl month names kept until 2.0" },
  "page-header.tsx": { row: 21, kind: "S", source: "same", change: "" },
  "page-help.tsx": { row: 22, kind: "C", source: "same", change: "" },
  "record-tab.tsx": { row: 23, kind: "C", source: "same", change: "`area` prop and WriteScope removed (the app binding adds them)" },
  "row-menu.tsx": { row: 24, kind: "C", source: "same", change: "" },
  "search-input.tsx": { row: 25, kind: "C", source: "same", change: "" },
  "segmented.tsx": { row: 26, kind: "S", source: "finaops", change: "" },
  "sheet.tsx": { row: 27, kind: "C", source: "same", change: "label-matched exit check kept until 2.0" },
  "state-mark.tsx": { row: 28, kind: "S", source: "same", change: "" },
  "status-icon.tsx": { row: 29, kind: "S", source: "same", change: "" },
  "table.tsx": { row: 30, kind: "C", source: "same", change: "" },
  "tabs.tsx": { row: 31, kind: "S", source: "same", change: 'aria-label="Tabs" kept (optional string in 1.1)' },
  "tag.tsx": { row: 32, kind: "S", source: "finaops", change: "" },
  "toast.tsx": { row: 33, kind: "C", source: "same", change: "offset through --ops-toast-offset" },
  "search-form.tsx": { row: 34, kind: "S", source: "joins", change: "" },
  "url-select.tsx": { row: 35, kind: "C", source: "joins", change: "" },
};

/** App kit files that are not in 1.0 on purpose (§9 "Not in 1.0"). */
export const APP_LOCAL = {
  "validity-cell.tsx": "§9 Not in 1.0: WFO-only, stays app-local (config.local) and joins in 1.1 behind a parity test (§12.4)",
};

/**
 * The library-side changes, identical against both apps: what the library holds where the app
 * copy (after the mechanical normalizations) holds something else. Lines are compared trimmed.
 * Every entry must be found in full, or the run fails: this table IS the claim.
 */
export const LIBRARY_CHANGES = {
  "action-icon.tsx": [
    {
      rule: "§7 row 17 (types.ts)",
      why: "ActionIconName is a union in types.ts now; the glyph table is annotated with it, so the two cannot drift (a type-only change)",
      removed: ["const paths = {", "} as const;"],
      added: ["const paths: Record<ActionIconName, string> = {", "};"],
    },
  ],
  "badge.tsx": [
    {
      rule: "§7 row 17 (types.ts)",
      why: "BadgeVariant is a union in types.ts now; the variant table is checked against it with satisfies (a type-only change)",
      removed: ["},"],
      added: ["} satisfies Record<BadgeVariant, string>,"],
    },
  ],
  "monogram.tsx": [
    {
      rule: "§9 row 19 / §7 Monogram row",
      why: "the external tone reads --color-external, which defaults to the brand accent (same pixels at 1.0)",
      removed: [
        "* the brand ochre, so their people stand out in a list (Saša, 2026-09-09).",
        '? "border-accent/50 bg-accent/10 text-accent"',
      ],
      added: [
        '* the "not ours" colour, --color-external (default: the brand accent), so',
        "* their people stand out in a list (Saša, 2026-09-09).",
        '? "border-external/50 bg-external/10 text-external"',
      ],
    },
  ],
  "record-tab.tsx": [
    {
      rule: "§9 row 23 / §7 PermissionArea row",
      why: "RecordTab has no `area` and renders no WriteScope; each app's record-tab binding adds both (§6.4)",
      removed: [
        "/**",
        "* The permission area this tab writes to — required, so adding a tab",
        "* cannot forget it (2026-08-28). Everything inside becomes default-deny",
        "* for a session without edit rights here: the create action and every",
        "* per-row Edit/Delete disappear rather than leading to an error page.",
        "*/",
        "area,",
        "area: PermissionArea;",
        "<WriteScope area={area}>",
        "<RecordTabLayout intro={intro} action={action}>",
        "{children}",
        "</RecordTabLayout>",
        "</WriteScope>",
      ],
      added: [
        "// The permission area is the app's: each app's record-tab binding requires",
        "// `area` and wraps this in its WriteScope, so everything inside is",
        "// default-deny for a session without edit rights there (spec §6.4).",
        "<RecordTabLayout intro={intro} action={action}>",
        "{children}",
        "</RecordTabLayout>",
      ],
    },
  ],
  "toast.tsx": [
    {
      rule: "§9 row 33 / §7 toast-offset row",
      why: "the viewport's 3.75rem lift is var(--ops-toast-offset, 0px); each app sets the variable in brand.css (spec §8.4: both at 3.75rem at the swap)",
      removed: [
        "// Above the assistant bubble (bottom-right, 3rem tall) so neither",
        'className="pointer-events-none fixed right-4 bottom-[calc(max(1.25rem,env(safe-area-inset-bottom))+3.75rem)] z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 sm:right-5"',
      ],
      added: [
        "// Lifted by --ops-toast-offset (a plain :root variable, default 0px):",
        "// an app with a bottom-right bubble of its own sets it so neither",
        'className="pointer-events-none fixed right-4 bottom-[calc(max(1.25rem,env(safe-area-inset-bottom))+var(--ops-toast-offset,0px))] z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 sm:right-5"',
      ],
    },
    {
      rule: "§7 i18n rows (useOpsUi)",
      why: "a comment naming the dictionary variable follows the substitution",
      removed: ["// t is stable for the page's lifetime; the message is what matters."],
      added: ["// strings and localize are stable for the page's lifetime; the message is what matters."],
    },
  ],
};

/**
 * Workforce Ops kit changes the spec has named but 1.0.0 does not carry (the app moved after the
 * 2026-09-30 survey; spec §12.4 "Found while proving 1.0 (L6)"). Keyed by file: the number of
 * Workforce-Ops-only lines (removed) and FinaOps-only lines (added) in that file's app-kit diff,
 * so a further change in the app shows up again as unexplained. `decided` names the spec's
 * decision once there is one; until then the run fails (exit 1), because releasing 1.0.0 as it
 * is would foreclose the recommended option (align FinaOps, re-import before L7b).
 */
export const WFO_AHEAD = {
  "button.tsx": {
    ref: "spec §12.4 L6",
    what: "ce53be0: ExternalButtonLink, a button-styled plain <a> for tel:/sms:/mailto:/WhatsApp/Viber links",
    removed: 21,
    added: 0,
    decided: null,
  },
  "date-input.tsx": {
    ref: "spec §12.4 L6",
    what: "f364bd5 + ae37fb7 + ff90dde: the calendar stays whole on screen on phones (lib/floating-place.ts) and opens as a bottom sheet on touch screens (lib/sheet-motion.ts)",
    removed: 57,
    added: 15,
    decided: null,
  },
  "dialog.tsx": {
    ref: "spec §12.4 L6",
    what: "ff90dde: below sm every Dialog is a bottom sheet that rises in (lib/sheet-motion.ts)",
    removed: 9,
    added: 1,
    decided: null,
  },
};

// ---------------------------------------------------------------------------------------------
// Reading trees
// ---------------------------------------------------------------------------------------------

function git(dir, args) {
  return execFileSync("git", ["-C", dir, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 });
}

/** A read-only view of an app tree: the file system, or git objects at `ref`. */
export function makeReader(dir, ref) {
  if (ref) {
    const has = (p) => {
      try {
        git(dir, ["cat-file", "-e", `${ref}:${p}`]);
        return true;
      } catch {
        return false;
      }
    };
    return {
      where: `${dir} at ${ref} (${git(dir, ["rev-parse", "--short=7", ref]).trim()})`,
      exists: has,
      read: (p) => git(dir, ["show", `${ref}:${p}`]),
      list: (d) =>
        git(dir, ["ls-tree", "--name-only", `${ref}:${d}`])
          .split("\n")
          .filter(Boolean),
    };
  }
  return {
    where: dir,
    exists: (p) => existsSync(path.join(dir, p)),
    read: (p) => readFileSync(path.join(dir, p), "utf8"),
    list: (d) => readdirSync(path.join(dir, d)),
  };
}

function appKind(reader) {
  const name = JSON.parse(reader.read("package.json")).name;
  if (name === "fina-ops") return "finaops";
  if (name === "workforce-ops") return "workforce";
  throw new Error(`package.json name "${name}" is neither fina-ops nor workforce-ops`);
}

// ---------------------------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------------------------

function parse(fileName, text) {
  const kind = fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  return ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, kind);
}

/** [start, end) covering whole lines: from the start of `from`'s line to after `to`'s line break. */
function lineSpan(text, from, to) {
  const start = text.lastIndexOf("\n", from - 1) + 1;
  let end = text.indexOf("\n", to);
  end = end === -1 ? text.length : end + 1;
  return [start, end];
}

function removeSpans(text, spans) {
  let out = text;
  for (const [s, e] of [...spans].sort((a, b) => b[0] - a[0])) out = out.slice(0, s) + out.slice(e);
  return out;
}

const collapse = (s) => s.replace(/\s+/g, " ").trim();

/** Members of a union of string literals, in order; null for anything else. */
function unionMembers(typeNode) {
  if (!typeNode) return null;
  const parts = ts.isUnionTypeNode(typeNode) ? typeNode.types : [typeNode];
  const out = [];
  for (const p of parts) {
    if (!ts.isLiteralTypeNode(p) || !ts.isStringLiteral(p.literal)) return null;
    out.push(p.literal.text);
  }
  return out;
}

/** Property names of an object literal (through `as const` / `satisfies`). */
function objectKeys(expr) {
  while (expr && (ts.isAsExpression(expr) || ts.isSatisfiesExpression(expr) || ts.isParenthesizedExpression(expr))) expr = expr.expression;
  if (!expr || !ts.isObjectLiteralExpression(expr)) return null;
  return expr.properties.map((p) => (p.name && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) ? p.name.text : "?"));
}

function findConst(sf, name) {
  for (const st of sf.statements) {
    if (!ts.isVariableStatement(st)) continue;
    for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name) && d.name.text === name) return d;
  }
  return null;
}

/** The exported type aliases of src/types.ts: text and (for unions of literals) members. */
export function readTypesModule(text) {
  const sf = parse("types.ts", text);
  const out = {};
  for (const st of sf.statements) {
    if (ts.isTypeAliasDeclaration(st)) out[st.name.text] = { text: collapse(st.type.getText(sf)).replace(/^\| /, ""), members: unionMembers(st.type) };
  }
  return out;
}

/** EN_STRINGS (or any object literal constant) as a flat { "a.b": value } map of string leaves. */
export function stringLeaves(text, fileName, constName) {
  const sf = parse(fileName, text);
  const decl = findConst(sf, constName);
  if (!decl || !decl.initializer) throw new Error(`${fileName}: no const ${constName}`);
  const out = {};
  const walk = (expr, prefix) => {
    while (ts.isAsExpression(expr) || ts.isSatisfiesExpression(expr)) expr = expr.expression;
    if (!ts.isObjectLiteralExpression(expr)) return;
    for (const p of expr.properties) {
      if (!ts.isPropertyAssignment(p)) continue;
      const key = prefix + p.name.getText(sf).replace(/^["']|["']$/g, "");
      const v = p.initializer;
      if (ts.isStringLiteral(v) || ts.isNoSubstitutionTemplateLiteral(v)) out[key] = v.text;
      else walk(v, `${key}.`);
    }
  };
  walk(decl.initializer, "");
  return out;
}

// ---------------------------------------------------------------------------------------------
// Normalization: what the spec calls mechanical, and nothing else
// ---------------------------------------------------------------------------------------------

/** A fresh counter of what was normalized away, so the report says exactly what it ignored. */
export function newTally() {
  return { imports: 0, hooks: 0, commonToStrings: 0, nullDictFallback: 0, localize: 0, typeMoves: [], blankLines: 0, provenance: 0 };
}

/**
 * §7 row 17: a React-free type the library moved to types.ts. The app copy declares it
 * (`export type X = …`); the library imports it from ../types and re-exports it
 * (`export type { X };`). Both are removed once the app's definition is proven to be the
 * types.ts one: the same text, or the same members as the object the app derives it from.
 */
export function relocateTypes(appText, libText, fileName, typesDefs, tally) {
  const appSf = parse(fileName, appText);
  const libSf = parse(fileName, libText);
  const fromTypes = new Set();
  for (const st of libSf.statements) {
    if (ts.isImportDeclaration(st) && st.moduleSpecifier.text === "../types" && st.importClause?.namedBindings) {
      for (const el of st.importClause.namedBindings.elements) fromTypes.add(el.name.text);
    }
  }
  const appSpans = [];
  const libSpans = [];
  const problems = [];
  for (const st of libSf.statements) {
    if (!ts.isExportDeclaration(st) || st.moduleSpecifier || !st.exportClause || !ts.isNamedExports(st.exportClause)) continue;
    const names = st.exportClause.elements.map((e) => e.name.text);
    if (!names.every((n) => fromTypes.has(n))) continue;
    const found = [];
    for (const name of names) {
      const decl = appSf.statements.find((s) => ts.isTypeAliasDeclaration(s) && s.name.text === name);
      const def = typesDefs[name];
      if (!decl || !def) {
        problems.push(`${name}: re-exported from ../types but ${decl ? "types.ts lacks it" : "the app copy does not declare it"}`);
        continue;
      }
      const how = sameType(decl, def, appSf);
      if (!how) {
        problems.push(`${name}: the app's definition (${collapse(decl.type.getText(appSf))}) is not types.ts's (${def.text})`);
        continue;
      }
      found.push({ decl, name, how });
    }
    if (found.length !== names.length) continue;
    libSpans.push(lineSpan(libText, st.getStart(libSf), st.end));
    for (const f of found) {
      appSpans.push(lineSpan(appText, f.decl.getStart(appSf), f.decl.end));
      tally.typeMoves.push(`${f.name} (${fileName}): ${f.how}`);
    }
  }
  return { appText: removeSpans(appText, appSpans), libText: removeSpans(libText, libSpans), problems };
}

function sameType(decl, def, sf) {
  const text = collapse(decl.type.getText(sf)).replace(/^\| /, "");
  const members = unionMembers(decl.type);
  if (members && def.members && members.join("|") === def.members.join("|")) return `identical union (${members.length} members)`;
  if (text === def.text) return "identical definition";
  if (!def.members) return null;
  const same = (keys) => keys && keys.join("|") === def.members.join("|");
  let m = /^keyof typeof (\w+)$/.exec(text);
  if (m) {
    const keys = objectKeys(findConst(sf, m[1])?.initializer);
    return same(keys) ? `types.ts union = the ${keys.length} keys of \`${m[1]}\`, in order` : null;
  }
  m = /^NonNullable<VariantProps<typeof (\w+)>\["(\w+)"\]>$/.exec(text);
  if (m) {
    const call = findConst(sf, m[1])?.initializer;
    const opts = call && ts.isCallExpression(call) ? call.arguments[1] : null;
    const variants = opts && ts.isObjectLiteralExpression(opts) ? opts.properties.find((p) => p.name?.getText(sf) === "variants") : null;
    const group = variants && ts.isPropertyAssignment(variants) && ts.isObjectLiteralExpression(variants.initializer)
      ? variants.initializer.properties.find((p) => p.name?.getText(sf) === m[2])
      : null;
    const keys = group && ts.isPropertyAssignment(group) ? objectKeys(group.initializer) : null;
    return same(keys) ? `types.ts union = the ${keys.length} \`${m[2]}\` variants of \`${m[1]}\`, in order` : null;
  }
  return null;
}

/** Removes every import statement (they are replaced as §7 says; the diff ignores them). */
export function stripImports(text, fileName, tally) {
  const sf = parse(fileName, text);
  const spans = [];
  for (const st of sf.statements) {
    if (ts.isImportDeclaration(st)) {
      spans.push(lineSpan(text, st.getStart(sf), st.end));
      tally.imports++;
    }
  }
  return removeSpans(text, spans);
}

const HOOK = "«kit config hook»";
const APP_HOOK = /^(\s*)const (t|dict) = use(Maybe)?Dict\(\);\s*$/;
const APP_LOCALE_HOOK = /^(\s*)const locale = useLocale\(\);\s*$/;
const LIB_HOOK = /^(\s*)const \{ [\w, ]+ \} = useOpsUi\(\);\s*$/;

/**
 * The spec's mechanical substitutions (§12.1 L6, §6.1), applied to text without imports.
 * App side: useDict() / useMaybeDict() / useLocale() lines become one hook marker; with the
 * dictionary variable V of that file: V.common.x → strings.x; V?.common.x ?? "Lit" → strings.x
 * when "Lit" is EN_STRINGS.x (the null-dictionary fallback IS the English word);
 * localizeMessage(V, s) → localize(s) and V ? localizeMessage(V, s) : s → localize(s) (identity
 * outside a provider = today's null-dictionary branch). Library side: the useOpsUi() line
 * becomes the same marker.
 */
export function substitute(text, side, enStrings, tally) {
  const lines = text.split("\n");
  const vars = new Set();
  const out = [];
  for (const line of lines) {
    const m = side === "app" ? APP_HOOK.exec(line) ?? APP_LOCALE_HOOK.exec(line) : LIB_HOOK.exec(line);
    if (m) {
      if (side === "app" && m[2] && m[2] !== "locale") vars.add(m[2]);
      tally.hooks++;
      const marker = `${m[1]}${HOOK}`;
      if (out.at(-1) !== marker) out.push(marker);
      continue;
    }
    out.push(line);
  }
  let result = out.join("\n");
  if (side !== "app") return result;
  // `t` is the kits' name for the dictionary everywhere, comments included (glance-card's JSDoc
  // tells callers to pass t.common.open): the spec's t.common.x → strings.x holds file-wide.
  vars.add("t");
  for (const v of vars) {
    const V = `(?<![\\w.$])${v}`;
    result = result.replace(new RegExp(`${V}\\?\\.common\\.(\\w+) \\?\\? "([^"]*)"`, "g"), (all, key, lit) => {
      if (enStrings[key] !== lit) return all;
      tally.nullDictFallback++;
      return `strings.${key}`;
    });
    result = result.replace(new RegExp(`${V} \\? localizeMessage\\(${v}, (\\w+)\\) : (\\w+)`, "g"), (all, a, b) => {
      if (a !== b) return all;
      tally.localize++;
      return `localize(${a})`;
    });
    result = result.replace(new RegExp(`localizeMessage\\(${v}, `, "g"), () => {
      tally.localize++;
      return "localize(";
    });
    result = result.replace(new RegExp(`${V}\\.common\\.`, "g"), () => {
      tally.commonToStrings++;
      return "strings.";
    });
  }
  return result;
}

/** Lines to compare: trailing whitespace trimmed, blank lines dropped (they never render). */
export function toLines(text, tally) {
  const out = [];
  for (const raw of text.split("\n")) {
    const line = raw.replace(/\s+$/, "");
    if (line === "") {
      if (tally) tally.blankLines++;
      continue;
    }
    out.push(line);
  }
  return out;
}

/** The first line of an excerpt module names its provenance; it is not part of the extraction. */
function stripProvenance(text, tally) {
  if (/^\/\/ L2 import: /.test(text)) {
    tally.provenance++;
    return text.slice(text.indexOf("\n") + 1);
  }
  return text;
}

/** App text and library text of one component → the two line lists to diff. */
export function normalizePair(appText, libText, fileName, ctx, tally) {
  const moved = relocateTypes(appText, libText, fileName, ctx.typesDefs, tally);
  const app = toLines(substitute(stripImports(moved.appText, fileName, tally), "app", ctx.enStrings, tally), tally);
  const lib = toLines(substitute(stripImports(moved.libText, fileName, tally), "lib", ctx.enStrings, tally), tally);
  return { app, lib, problems: moved.problems };
}

export function normalizeApp(text, fileName, ctx, tally) {
  return toLines(substitute(stripImports(text, fileName, tally), "app", ctx.enStrings, tally), tally);
}

// ---------------------------------------------------------------------------------------------
// Diffing and accounting
// ---------------------------------------------------------------------------------------------

/** Line diff (longest common subsequence): [{ op: " " | "-" | "+", line, a, b }]. */
export function diffLines(a, b) {
  const n = a.length;
  const m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  }
  const ops = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) ops.push({ op: " ", line: a[i++], a: i, b: ++j });
    else if (i < n && (j === m || dp[i + 1][j] >= dp[i][j + 1])) ops.push({ op: "-", line: a[i++], a: i, b: j });
    else ops.push({ op: "+", line: b[j++], a: i, b: j });
  }
  return ops;
}

/** Unified-style hunks with `context` lines around each change. */
export function formatHunks(ops, context = 2) {
  const changed = ops.map((o) => o.op !== " ");
  if (!changed.includes(true)) return [];
  const keep = ops.map((_, k) => {
    for (let d = -context; d <= context; d++) if (changed[k + d]) return true;
    return false;
  });
  const out = [];
  let k = 0;
  while (k < ops.length) {
    if (!keep[k]) {
      k++;
      continue;
    }
    const start = k;
    while (k < ops.length && keep[k]) k++;
    const slice = ops.slice(start, k);
    const first = slice[0];
    const aFrom = first.op === "+" ? first.a + 1 : first.a;
    const bFrom = first.op === "-" ? first.b + 1 : first.b;
    const aLen = slice.filter((o) => o.op !== "+").length;
    const bLen = slice.filter((o) => o.op !== "-").length;
    out.push(`@@ app ${aFrom},${aLen} library ${bFrom},${bLen} @@`);
    for (const o of slice) out.push(`${o.op}${o.line}`);
  }
  return out;
}

class Bag {
  constructor(lines = []) {
    this.m = new Map();
    for (const l of lines) this.add(l);
  }
  add(l, n = 1) {
    this.m.set(l, (this.m.get(l) ?? 0) + n);
  }
  count(l) {
    return this.m.get(l) ?? 0;
  }
  take(l) {
    const c = this.count(l);
    if (!c) return false;
    if (c === 1) this.m.delete(l);
    else this.m.set(l, c - 1);
    return true;
  }
  list() {
    return [...this.m].flatMap(([l, c]) => Array(c).fill(l));
  }
}

/**
 * Accounts for every changed line of one component. `kitDiff` (Workforce Ops runs) is the diff
 * of the normalized Workforce Ops copy against the normalized FinaOps copy.
 */
export function account(fileName, ops, kind, kitDiff) {
  const removed = new Bag(ops.filter((o) => o.op === "-").map((o) => o.line.trim()));
  const added = new Bag(ops.filter((o) => o.op === "+").map((o) => o.line.trim()));
  const explained = [];
  const missing = [];
  for (const change of LIBRARY_CHANGES[fileName] ?? []) {
    const lost = [...change.removed.filter((l) => removed.count(l) === 0), ...change.added.filter((l) => added.count(l) === 0)];
    // A multiset check: a line the entry names twice must be there twice.
    const need = (list, bag) => {
      const b = new Bag(list);
      return [...b.m].every(([l, c]) => bag.count(l) >= c);
    };
    if (lost.length || !need(change.removed, removed) || !need(change.added, added)) {
      missing.push(`${change.rule}: expected change not found in full${lost.length ? ` (missing: ${lost.map((l) => JSON.stringify(l)).join(", ")})` : ""}`);
      continue;
    }
    change.removed.forEach((l) => removed.take(l));
    change.added.forEach((l) => added.take(l));
    explained.push({ rule: change.rule, why: change.why, lines: change.removed.length + change.added.length });
  }
  let appKits = null;
  if (kind === "workforce" && kitDiff) {
    const wfoOnly = new Bag(kitDiff.filter((o) => o.op === "-").map((o) => o.line.trim()));
    const finaOnly = new Bag(kitDiff.filter((o) => o.op === "+").map((o) => o.line.trim()));
    let r = 0;
    let a = 0;
    for (const l of removed.list()) if (wfoOnly.take(l) && removed.take(l)) r++;
    for (const l of added.list()) if (finaOnly.take(l) && added.take(l)) a++;
    if (r + a) appKits = { removed: r, added: a };
  }
  return { explained, missing, appKits, unexplained: { removed: removed.list(), added: added.list() } };
}

// ---------------------------------------------------------------------------------------------
// Modules outside components/ (§3.1, §7, §12.1 L2)
// ---------------------------------------------------------------------------------------------

/** Whole modules, copied as they are (imports excepted). */
export const WHOLE_MODULES = [
  { lib: "navigation/trail.ts", app: "src/domain/nav-trail.ts" },
  { lib: "navigation/history.ts", app: "src/lib/navigation-history.ts" },
  { lib: "navigation/nav-trail.tsx", app: "src/components/shell/nav-trail.tsx" },
  { lib: "lib/date-input.ts", app: "src/domain/date-input.ts" },
  { lib: "lib/use-dismissable.ts", app: "src/lib/use-dismissable.ts" },
];

/** Excerpts: every top-level declaration of the library module, compared with the app's namesake. */
export const EXCERPT_MODULES = [
  { lib: "lib/cn.ts", app: "src/lib/utils.ts" },
  { lib: "lib/fmt.ts", app: "src/i18n/locales.ts" },
  { lib: "lib/text.ts", app: "src/domain/search.ts" },
  { lib: "lib/dates.ts", app: "src/domain/dates.ts" },
  { lib: "lib/months.ts", app: { finaops: "src/domain/months.ts", workforce: "src/domain/hours-periods.ts" } },
];

/** Inputs for a behaviour check where two copies of a pure function are written differently. */
const SEARCH_CORPUS = [
  "Đorđević", "ĐURĐEVAC", "đuro", "Straße", "STRASSE", "Čeh", "Šimić", "Žan", "Ćosić", "čšžćđ ČŠŽĆĐ",
  "Nguyen, Dinh Hai", "Nguyen Dinh", "QT-MAXS-LM-26023", "LM-2026-001", "Latro Mont d.o.o.", "EWP GmbH",
  "Müller", "Crème brûlée", "Ångström", "Łódź", "Œuvre", "Æsir øre", "İstanbul", "ﬁle ﬀ", "áb̧c",
  "  leading and trailing  ", "", "---", "123 / 456", "Tab\tNew\nLine", "émigré's café", "Ǆuro", "Ⅻ", "ℌ",
  "e-mail@example.com", "Rotterdam · MAXS", "50 %", "(141/111)", "Welder MAG (135/136/138)", "Ñandú",
];

export const BEHAVIOUR = {
  shiftMonth: {
    domain: "every month 1990-01 … 2040-12 × delta −36 … 36",
    inputs: () => {
      const out = [];
      for (let y = 1990; y <= 2040; y++) for (let m = 1; m <= 12; m++) for (let d = -36; d <= 36; d++) out.push([`${y}-${String(m).padStart(2, "0")}`, d]);
      return out;
    },
  },
  normalizeSearchText: {
    domain: `${SEARCH_CORPUS.length} strings (đ/Đ, ß, č/š/ž/ć, diacritics, ligatures, punctuation, numbers, legal forms, mixed case)`,
    inputs: () => SEARCH_CORPUS.map((s) => [s]),
  },
};

function topLevel(sf) {
  const out = new Map();
  for (const st of sf.statements) {
    if (ts.isImportDeclaration(st)) continue;
    let names = [];
    if (ts.isFunctionDeclaration(st) || ts.isTypeAliasDeclaration(st) || ts.isInterfaceDeclaration(st) || ts.isClassDeclaration(st)) names = [st.name?.text];
    else if (ts.isVariableStatement(st)) names = st.declarationList.declarations.map((d) => d.name.getText(sf));
    for (const n of names) if (n) out.set(n, st);
  }
  return out;
}

/** A statement with its own leading comments, blank lines dropped. */
function statementLines(st, sf) {
  return toLines(sf.text.slice(st.getFullStart(), st.end).replace(/^\s*\n/, ""));
}

/** Decodes \uXXXX escapes, so /[̀-ͯ]/ and the same range written as raw characters compare equal. */
const decodeEscapes = (s) => s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));

/** A function statement's `return other(params)` target, when that is all it does. */
function delegateOf(st) {
  if (!ts.isFunctionDeclaration(st) || !st.body || st.body.statements.length !== 1) return null;
  const ret = st.body.statements[0];
  if (!ts.isReturnStatement(ret) || !ret.expression || !ts.isCallExpression(ret.expression)) return null;
  const callee = ret.expression.expression;
  if (!ts.isIdentifier(callee)) return null;
  const params = st.parameters.map((p) => p.name.getText());
  const args = ret.expression.arguments.map((a) => a.getText());
  return params.join(",") === args.join(",") ? callee.text : null;
}

/** Where an app module imports `name` from, as a path inside the app (`@/x` → src/x.ts). */
function importSource(sf, name, reader) {
  for (const st of sf.statements) {
    if (!ts.isImportDeclaration(st) || !st.importClause?.namedBindings || !ts.isNamedImports(st.importClause.namedBindings)) continue;
    if (!st.importClause.namedBindings.elements.some((e) => e.name.text === name)) continue;
    const spec = st.moduleSpecifier.text;
    if (!spec.startsWith("@/")) return null;
    for (const ext of [".ts", ".tsx"]) {
      const p = `src/${spec.slice(2)}${ext}`;
      if (reader.exists(p)) return p;
    }
  }
  return null;
}

function compile(fnTexts, name) {
  const js = ts.transpileModule(fnTexts.join("\n").replace(/^export /gm, ""), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
  return vm.runInNewContext(`${js}\n;${name}`, {});
}

function sameBehaviour(name, libFnText, appFnTexts, appName) {
  const b = BEHAVIOUR[name];
  if (!b) return null;
  const lib = compile([libFnText], name);
  const app = compile(appFnTexts, appName);
  const inputs = b.inputs();
  for (const args of inputs) {
    const x = lib(...args);
    const y = app(...args);
    if (x !== y) return { ok: false, detail: `differs on ${JSON.stringify(args)}: library ${JSON.stringify(x)}, app ${JSON.stringify(y)}` };
  }
  return { ok: true, detail: `same output on ${inputs.length.toLocaleString("en")} inputs (${b.domain})` };
}

/** Compares one excerpt module declaration by declaration. */
export function compareExcerpt(libText, libFile, appReader, appPath, tally) {
  const lib = parse(libFile, stripProvenance(libText, tally));
  const appText = appReader.read(appPath);
  const app = parse(appPath, appText);
  const appDecls = topLevel(app);
  const results = [];
  for (const [name, st] of topLevel(lib)) {
    const other = appDecls.get(name);
    if (!other) {
      results.push({ name, ok: false, note: `the app module has no top-level ${name}` });
      continue;
    }
    const a = statementLines(other, app);
    const b = statementLines(st, lib);
    if (a.join("\n") === b.join("\n")) {
      results.push({ name, ok: true, note: "identical" });
      continue;
    }
    const target = delegateOf(other);
    if (target) {
      const from = importSource(app, target, appReader);
      const targetSf = from ? parse(from, appReader.read(from)) : null;
      const targetSt = targetSf ? topLevel(targetSf).get(target) : null;
      if (targetSt && ts.isFunctionDeclaration(targetSt) && ts.isFunctionDeclaration(st)) {
        const sig = (s, sf) => s.parameters.map((p) => p.getText(sf)).join(", ") + " → " + (s.type?.getText(sf) ?? "");
        const bodySame =
          sig(st, lib) === sig(targetSt, targetSf) &&
          toLines(decodeEscapes(st.body.getText(lib))).join("\n") === toLines(decodeEscapes(targetSt.body.getText(targetSf))).join("\n");
        const beh = sameBehaviour(name, st.getText(lib), [targetSt.getText(targetSf), other.getText(app)], name);
        const ok = bodySame && (!beh || beh.ok);
        results.push({
          name,
          ok,
          note: `the app's ${name} returns ${target}(…) from ${from}; ${bodySame ? `${target}'s parameters and body equal the library's (\\u escapes decoded)` : `${target}'s body differs`}${beh ? `; ${beh.detail}` : ""}`,
          diff: ok ? null : formatHunks(diffLines(a, b)),
        });
        continue;
      }
    }
    const beh = ts.isFunctionDeclaration(st) ? sameBehaviour(name, st.getText(lib), [other.getText(app)], name) : null;
    results.push({
      name,
      ok: Boolean(beh?.ok),
      note: beh ? `written differently; ${beh.detail}` : "differs",
      diff: formatHunks(diffLines(a, b)),
    });
  }
  return results;
}

// ---------------------------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------------------------

function libraryInfo() {
  const version = JSON.parse(readFileSync(path.join(LIB, "package.json"), "utf8")).version;
  let at = "not a git checkout";
  try {
    const sha = git(LIB, ["rev-parse", "--short=7", "HEAD"]).trim();
    const dirty = git(LIB, ["status", "--porcelain", "--", "src", "styles"]).trim() !== "";
    at = `${sha}${dirty ? " + uncommitted changes under src/ or styles/" : ""}`;
  } catch {
    // outside git: the report says so
  }
  return `@latro/ops-ui ${version} at ${at}`;
}

/**
 * Runs the proof.
 * @param {{ app: string, ref?: string, source?: string, label?: string }} opts
 * @returns {{ lines: string[], ok: boolean, failures: number }}
 */
export function run({ app, ref, source, label }) {
  const reader = makeReader(app, ref);
  const kind = appKind(reader);
  const ctx = {
    typesDefs: readTypesModule(readFileSync(path.join(LIB, "src/types.ts"), "utf8")),
    enStrings: stringLeaves(readFileSync(path.join(LIB, "src/config/strings.ts"), "utf8"), "strings.ts", "EN_STRINGS"),
  };
  let sourceReader = null;
  if (kind === "workforce") {
    const dir = source ?? path.join(path.dirname(path.resolve(app)), "fina-ops");
    sourceReader = makeReader(dir, ref);
    if (appKind(sourceReader) !== "finaops") throw new Error(`--source ${dir} is not a fina-ops tree`);
  }
  const tally = newTally();
  const out = [];
  const say = (s = "") => out.push(s);
  const appName = kind === "finaops" ? "FinaOps" : "Workforce Ops";
  say("diff-against-app: the extraction proof (spec §12.1 L6)");
  say(`library  ${libraryInfo()}`);
  say(`app      ${label ?? appName} - ${reader.where}`);
  if (sourceReader) say(`source   FinaOps - ${sourceReader.where} (where the two app kits differ, the library follows FinaOps)`);
  say();

  const byRow = (x, y) => (ROWS[x]?.row ?? 99) - (ROWS[y]?.row ?? 99) || x.localeCompare(y);
  const libComponents = readdirSync(path.join(LIB, "src/components")).filter((f) => f.endsWith(".tsx")).sort(byRow);
  const appComponents = reader.list("src/components/ui").filter((f) => f.endsWith(".tsx")).sort();
  const results = [];
  let failures = 0;
  const ahead = [];
  for (const file of libComponents) {
    const row = ROWS[file];
    const libText = readFileSync(path.join(LIB, "src/components", file), "utf8");
    const res = { file, row, status: "", details: [], hunks: [] };
    results.push(res);
    if (!row) {
      res.status = "NOT IN §9";
      res.details.push("the library ships a component §9 does not list");
      failures++;
      continue;
    }
    const hasDirective = /^"use client";/.test(libText);
    if (hasDirective !== (row.kind === "C")) {
      res.details.push(`directive: §9 says ${row.kind === "C" ? "client" : "server-safe"}, the library file ${hasDirective ? "has" : "lacks"} "use client"`);
      failures++;
    }
    if (!appComponents.includes(file)) {
      if (row.source === "joins" && kind === "workforce") {
        res.status = `not in this app (§9 row ${row.row}: joins from FinaOps)`;
      } else {
        res.status = "MISSING in the app";
        failures++;
      }
      continue;
    }
    const appText = reader.read(`src/components/ui/${file}`);
    const pair = normalizePair(appText, libText, file, ctx, tally);
    for (const p of pair.problems) {
      res.details.push(`types.ts move not proven: ${p}`);
      failures++;
    }
    const ops = diffLines(pair.app, pair.lib);
    let kitDiff = null;
    if (sourceReader && sourceReader.exists(`src/components/ui/${file}`)) {
      const scratch = newTally();
      kitDiff = diffLines(normalizeApp(appText, file, ctx, scratch), normalizeApp(sourceReader.read(`src/components/ui/${file}`), file, ctx, scratch));
    }
    const acc = account(file, ops, kind, kitDiff);
    res.hunks = formatHunks(ops);
    const parts = [];
    for (const e of acc.explained) parts.push(`${e.rule}`);
    if (acc.appKits) {
      if (row.source === "finaops" || row.source === "either") {
        parts.push(`FinaOps-side (§9 row ${row.row})`);
        res.details.push(`app kits differ here; the library takes FinaOps' copy (§9 row ${row.row}, source ${row.source === "either" ? "either" : "FinaOps"}): ${acc.appKits.removed} Workforce-Ops-only line(s), ${acc.appKits.added} FinaOps-only line(s)`);
      } else {
        const known = WFO_AHEAD[file];
        const matches = known && known.removed === acc.appKits.removed && known.added === acc.appKits.added;
        ahead.push({ file, ...acc.appKits, known: Boolean(matches), decided: matches ? known.decided : null });
        if (matches) {
          parts.push(`Workforce Ops ahead (${known.ref}${known.decided ? `, decided: ${known.decided}` : ", DECISION OPEN"})`);
          res.details.push(`Workforce Ops changed this file after the survey (${known.what}); §9 says Same, the library follows FinaOps. Named in ${known.ref}: ${acc.appKits.removed} Workforce-Ops-only line(s), ${acc.appKits.added} FinaOps-only line(s). Not an extraction bug.`);
          if (!known.decided) {
            res.details.push(`FAIL decision open (${known.ref}): 1.0.0 cannot replace this file in Workforce Ops without dropping the change`);
            failures++;
          }
        } else {
          parts.push("WORKFORCE OPS AHEAD (not named in the spec)");
          res.details.push(`the app kits differ in a file §9 lists as Same: ${acc.appKits.removed} Workforce-Ops-only line(s), ${acc.appKits.added} FinaOps-only line(s). Workforce Ops changed its kit after the survey; the library follows FinaOps. Not an extraction bug, but the spec does not name it (${known ? "WFO_AHEAD records a different count" : "add it to §12.4 and WFO_AHEAD"}).`);
          failures++;
        }
      }
    }
    for (const e of acc.explained) res.details.push(`${e.rule}: ${e.why} (${e.lines} line${e.lines === 1 ? "" : "s"})`);
    for (const m of acc.missing) {
      res.details.push(`FAIL ${m}`);
      failures++;
    }
    const u = acc.unexplained;
    if (u.removed.length || u.added.length) {
      failures++;
      res.details.push(`FAIL unexplained: ${u.removed.length} app line(s) and ${u.added.length} library line(s) no spec row accounts for`);
      for (const l of u.removed) res.details.push(`  - ${l}`);
      for (const l of u.added) res.details.push(`  + ${l}`);
    }
    if (!res.hunks.length) res.status = "identical";
    else if (u.removed.length || u.added.length || acc.missing.length) res.status = "UNEXPLAINED";
    else res.status = parts.join(" + ");
  }
  for (const file of appComponents) {
    if (libComponents.includes(file)) continue;
    results.push({ file, row: null, status: APP_LOCAL[file] ? "app-local" : "APP-ONLY KIT FILE", details: [APP_LOCAL[file] ?? "a kit file the library does not have and §9 does not name"], hunks: [] });
    if (!APP_LOCAL[file]) failures++;
  }

  say("Components (spec §9)");
  for (const r of results) {
    const num = r.row ? String(r.row.row).padStart(2) : " -";
    say(`  ${num}  ${r.file.padEnd(22)} ${r.status}`);
  }
  say();
  const withDiff = results.filter((r) => r.hunks.length || r.details.length);
  if (withDiff.length) {
    say("Differences after normalization, and what accounts for each");
    for (const r of withDiff) {
      say();
      say(`== ${r.file}${r.row ? `  (§9 row ${r.row.row}${r.row.change ? `: ${r.row.change}` : ""})` : ""}`);
      for (const h of r.hunks) say(`  ${h}`);
      for (const d of r.details) say(`  > ${d}`);
    }
    say();
  }

  say("Normalizations (what the diffs above ignore; spec §12.1 L6)");
  say(`  import statements removed: ${tally.imports} (both sides; §7 replaces every @/ import)`);
  say(`  kit-config hook lines (useDict / useMaybeDict / useLocale ↔ useOpsUi) → one marker: ${tally.hooks}`);
  say(`  t.common.x → strings.x: ${tally.commonToStrings}`);
  say(`  dict?.common.x ?? "<EN_STRINGS.x>" → strings.x (the null-dictionary fallback is the English word): ${tally.nullDictFallback}`);
  say(`  localizeMessage(t, s) → localize(s), incl. t ? localizeMessage(t, s) : s: ${tally.localize}`);
  say(`  blank lines dropped: ${tally.blankLines}; trailing whitespace trimmed`);
  say(`  React-free types moved to types.ts (§7 row 17), each proven against the app's definition: ${tally.typeMoves.length}`);
  for (const m of tally.typeMoves) say(`    ${m}`);
  say();

  // Modules outside components/.
  say("Modules (spec §3.1, §7; §12.1 L2)");
  const modTally = newTally();
  for (const mod of WHOLE_MODULES) {
    const libText = readFileSync(path.join(LIB, "src", mod.lib), "utf8");
    if (!reader.exists(mod.app)) {
      say(`  ${mod.lib.padEnd(26)} ← ${mod.app}: MISSING in the app`);
      failures++;
      continue;
    }
    const a = toLines(stripImports(reader.read(mod.app), mod.app, modTally));
    const b = toLines(stripImports(stripProvenance(libText, modTally), mod.lib, modTally));
    const hunks = formatHunks(diffLines(a, b));
    say(`  ${mod.lib.padEnd(26)} ← ${mod.app}: ${hunks.length ? "DIFFERS" : "identical (whole module, imports aside)"}`);
    for (const h of hunks) say(`      ${h}`);
    if (hunks.length) failures++;
  }
  for (const mod of EXCERPT_MODULES) {
    const appPath = typeof mod.app === "string" ? mod.app : mod.app[kind];
    const libText = readFileSync(path.join(LIB, "src", mod.lib), "utf8");
    if (!reader.exists(appPath)) {
      say(`  ${mod.lib.padEnd(26)} ← ${appPath}: MISSING in the app`);
      failures++;
      continue;
    }
    const res = compareExcerpt(libText, mod.lib, reader, appPath, modTally);
    say(`  ${mod.lib.padEnd(26)} ← ${appPath} (excerpt: ${res.map((r) => r.name).join(", ")})`);
    for (const r of res) {
      say(`      ${r.name}: ${r.ok ? "" : "FAIL "}${r.note}`);
      if (!r.ok) failures++;
      if (r.diff && r.diff.length) for (const h of r.diff) say(`        ${h}`);
    }
  }
  say();

  // The kit's words.
  const appCommonPath = "src/i18n/dictionaries/en/common.ts";
  if (reader.exists(appCommonPath)) {
    const appWords = stringLeaves(reader.read(appCommonPath), appCommonPath, "common");
    const off = Object.keys(ctx.enStrings).filter((k) => appWords[k] !== ctx.enStrings[k]);
    say(`Kit words (spec §6.1): EN_STRINGS against ${appCommonPath}: ${off.length ? `FAIL ${off.length} of ${Object.keys(ctx.enStrings).length} differ` : `all ${Object.keys(ctx.enStrings).length} keys equal`}`);
    for (const k of off) say(`    ${k}: library ${JSON.stringify(ctx.enStrings[k])}, app ${JSON.stringify(appWords[k])}`);
    if (off.length) failures++;
  } else {
    say(`Kit words: ${appCommonPath} not found - FAIL`);
    failures++;
  }
  say();

  const counts = {
    identical: results.filter((r) => r.status === "identical").length,
    changed: results.filter((r) => r.hunks.length && r.status !== "identical" && !ahead.some((x) => x.file === r.file)).length,
  };
  const unnamedAhead = ahead.filter((x) => !x.known);
  const openAhead = ahead.filter((x) => x.known && !x.decided);
  const decidedAhead = ahead.filter((x) => x.known && x.decided);
  const aheadFailures = unnamedAhead.length + openAhead.length;
  const extraction = `${counts.identical} components identical after normalization, ${counts.changed} differing only by named spec rows`;
  let verdict;
  if (failures === 0) {
    verdict = `PROVEN against ${appName}: ${extraction}`;
    if (decidedAhead.length) verdict += `; Workforce Ops is ahead of the 1.0 source in ${decidedAhead.map((x) => x.file).join(", ")} (decided in the spec)`;
  } else if (aheadFailures && failures === aheadFailures) {
    verdict =
      `EXTRACTION PROVEN against ${appName} (${extraction}), but Workforce Ops is ahead of the 1.0 source in ` +
      `${ahead.map((x) => x.file).join(", ")}: kit changes made after the survey that 1.0.0 does not carry. ` +
      (unnamedAhead.length ? "The spec does not name them yet (add them to §12.4 and WFO_AHEAD)." : "Named in spec §12.4 (L6); the decision is open, so 1.0.0 is not releasable for Workforce Ops as it stands.");
  } else {
    verdict = `NOT PROVEN against ${appName}: ${failures - aheadFailures} unaccounted difference(s) - see FAIL lines above`;
  }
  say(`Verdict: ${verdict}`);
  return { lines: out, ok: failures === 0, failures };
}

function usage() {
  return "usage: node tools/diff-against-app.mjs --app <app tree> [--ref <git ref>] [--source <fina-ops tree>] [--label <text>]";
}

export function main(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i].replace(/^--/, "");
    if (!["app", "ref", "source", "label"].includes(flag) || argv[i + 1] === undefined) {
      console.error(usage());
      return 2;
    }
    opts[flag] = argv[++i];
  }
  if (!opts.app) {
    console.error(usage());
    return 2;
  }
  try {
    const { lines, ok } = run(opts);
    console.log(lines.join("\n"));
    return ok ? 0 : 1;
  } catch (err) {
    console.error(`diff-against-app: ${err.message}`);
    return 2;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  process.exitCode = main(process.argv.slice(2));
}
