// tools/release.mjs - the release script of spec §4.2 (`pnpm release <X.Y.Z> [--compatible <name>]…`).
//
//   pnpm release X.Y.Z [--compatible <declaration name>]… [--trailer <line>]… [--dry-run]
//
// Run from the library checkout (the working directory is the repository it releases). A release
// is ONE commit titled exactly `release: vX.Y.Z` that changes exactly package.json "version",
// src/version.ts and the OPS_UI_VERSION line of api-surface.d.txt, plus the branch
// `release/vX.Y.Z` at it. It never pushes tags: the session git
// proxy refuses tag refs (spec §1.1, §4.2 step 7).
//
// In order (the spec's step numbers; the cheap checks run before the gates, so a refusal never
// waits for a gallery build, and every refusal of a step is printed before the script exits):
//   1. Refuses unless on main, the tree is clean, `git fetch origin` worked and HEAD == origin/main,
//      and X.Y.Z is the next patch, minor or major after package.json's version.
//   3. Finds the previous release P (the one commit titled `release: v<current>`); none for 0.0.0.
//   4. Computes the REQUIRED level from P..HEAD (spec §4.1) and refuses a lower bump:
//        - a baseline under gallery/__screenshots__/ that existed at P, modified or deleted by a
//          commit that is not a pure rebaseline (`shots: rebaseline (<reason>)` touching only the
//          baselines, gallery/playwright.config.ts and gallery/fonts/**) → major;
//        - api-surface.d.txt: a removed or changed line → major, unless every declaration it
//          belongs to is named by --compatible (and by a `Compatible:` line of the CHANGELOG
//          section, which carries the reason); added lines only → minor; the
//          `export declare const OPS_UI_VERSION = "…";` line counts for nothing (every release
//          rewrites it);
//        - new baseline files → minor;
//        - styles/tokens.css (= TOKENS.md, tests/tokens.test.ts): a new required brand variable,
//          a removed token or a changed token value → major; a new token → minor;
//        - a changed peerDependencies range → major (spec §4.1 "a peer range major");
//        - a `Breaking:` line in the CHANGELOG section → major;
//        - a changed line under src/ carrying an interaction-only class (hover:, focus-visible:,
//          focus:, active:, focus-within:, group-hover:, pointer-coarse:, pointer-fine:) or a
//          matchMedia( call → the CHANGELOG section must name each such file's component on a
//          `Reviewed:` line (spec §4.1: the baselines do not see those styles).
//      The first release (no P) skips step 4.
//   5. CHANGELOG.md has `## X.Y.Z — YYYY-MM-DD`; a major has `Visible:` and `Upgrade steps:`.
//   2. Runs `pnpm typecheck && pnpm lint && pnpm test && pnpm shots`.
//   6. Writes package.json "version", src/version.ts and the OPS_UI_VERSION line of
//      api-surface.d.txt (so the surface is never stale after a release) and commits exactly those
//      three files as `release: vX.Y.Z` (body: the level, the --compatible names, then each --trailer line).
//   7. Creates branch release/vX.Y.Z at that commit and pushes main, then the branch (a refused
//      branch push is a warning: the commit marker alone is enough for the sync). Network errors
//      are retried 4 times (2, 4, 8, 16 s).
//
// --dry-run runs steps 1-5 and 2, prints what it would commit, and writes nothing.
// Exit codes: 0 released (or a dry run passed), 1 refused (reasons one per line), 2 usage or
// environment error.

import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { parseTokenContract, parseVersion } from "../sync/sync-ops-ui.mjs";

export const PACKAGE_NAME = "@latro/ops-ui";
export const GATES = ["typecheck", "lint", "test", "shots"];
export const BASELINE_DIR = "gallery/__screenshots__/";
export const SURFACE_FILE = "api-surface.d.txt";
export const TOKENS_FILE = "styles/tokens.css";
/** What a pure rebaseline commit may touch besides the baselines (spec §4.1, CLAUDE.md). */
export const REBASELINE_ENVIRONMENT = ["gallery/playwright.config.ts", "gallery/fonts/"];
export const REBASELINE_SUBJECT = /^shots: rebaseline \(.+\)$/;
/** Interaction-only styles the baselines do not see (spec §4.1, §4.2 step 4). */
export const INTERACTION_PATTERN =
  /(?<![\w-])(?:hover|focus-visible|focus|active|focus-within|group-hover|pointer-coarse|pointer-fine):|matchMedia\(/;
const LEVELS = ["patch", "minor", "major"];
const NETWORK_ERROR = /could not resolve|connection|timed? ?out|early eof|rpc failed|unable to access|the remote end hung up|50[234]|reset by peer/i;
/** A push the remote (or the session proxy) refused on purpose: never retried. */
const PUSH_REFUSED = /\[(?:remote )?rejected\]|permission denied|hook declined|forbidden|\b403\b/i;

class Refusal extends Error {
  /** @param {string[]} reasons */
  constructor(reasons) {
    super(reasons.join("\n"));
    this.reasons = reasons;
  }
}
class UsageError extends Error {}

// ---------------------------------------------------------------------------------------------
// Pure rules (exported for the tests)
// ---------------------------------------------------------------------------------------------

/**
 * The level of the bump from `current` to `next`, or null when `next` is not the next patch,
 * minor or major.
 * @param {string} current
 * @param {string} next
 * @returns {"patch" | "minor" | "major" | null}
 */
export function bumpLevel(current, next) {
  const c = strictVersion(current);
  const n = strictVersion(next);
  if (!c || !n) return null;
  if (n[0] === c[0] + 1 && n[1] === 0 && n[2] === 0) return "major";
  if (n[0] === c[0] && n[1] === c[1] + 1 && n[2] === 0) return "minor";
  if (n[0] === c[0] && n[1] === c[1] && n[2] === c[2] + 1) return "patch";
  return null;
}

/** @param {string} v */
function strictVersion(v) {
  return /^\d+\.\d+\.\d+$/.test(String(v)) ? parseVersion(v) : null;
}

/** @param {string[]} levels @returns {"patch" | "minor" | "major"} */
export function highestLevel(levels) {
  return /** @type {"patch" | "minor" | "major"} */ (LEVELS[Math.max(0, ...levels.map((l) => LEVELS.indexOf(l)))]);
}

/**
 * The `## X.Y.Z` section of CHANGELOG.md (heading to the next `## `), or null.
 * @param {string} changelog
 * @param {string} version
 * @returns {{ heading: string, date: string | null, lines: string[] } | null}
 */
export function changelogSection(changelog, version) {
  const sections = changelog.split(/^(?=## )/m);
  const escaped = version.replace(/\./g, "\\.");
  const section = sections.find((s) => new RegExp(`^## ${escaped}(?![\\d.])`).test(s));
  if (!section) return null;
  const [heading, ...rest] = section.split("\n");
  const m = heading.match(/^## \S+\s+[—–-]\s+(\d{4}-\d{2}-\d{2})\s*$/);
  const date = m && isCalendarDate(m[1]) ? m[1] : null;
  return { heading: heading.trim(), date, lines: rest.map((l) => l.trimEnd()).filter((l) => l.trim() !== "") };
}

/** @param {string} iso */
function isCalendarDate(iso) {
  const d = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso;
}

/**
 * Lines of a section that start with `<Label>:`.
 * @param {{ lines: string[] }} section
 * @param {string} label
 */
export function sectionLines(section, label) {
  return section.lines.filter((l) => l.startsWith(`${label}:`)).map((l) => l.slice(label.length + 1).trim());
}

/**
 * The names a Reviewed: line may use for a file under src/: its file name without extension (and
 * without `.stories`), and the same in PascalCase (row-menu.tsx → "row-menu", "RowMenu").
 * @param {string} file
 */
export function componentNames(file) {
  const base = path.basename(file).replace(/\.(tsx?|mts|mjs|css)$/, "").replace(/\.stories$/, "");
  const pascal = base
    .split(/[-_.]/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");
  return [...new Set([base, pascal])];
}

/**
 * Does a `Reviewed:` line name this file's component (as a whole word)?
 * @param {string[]} reviewed
 * @param {string} file
 */
export function isReviewed(reviewed, file) {
  const names = componentNames(file);
  return reviewed.some((line) =>
    names.some((name) => new RegExp(`(?<![\\w-])${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w-])`).test(line)),
  );
}

/**
 * The top-level statements of a declaration text (api-surface.d.txt), with the 1-based line range
 * each spans and the names it declares or re-exports. A removed or changed surface line belongs
 * to the statement around it; `--compatible <name>` names such a statement.
 * @param {string} text
 * @returns {{ start: number, end: number, names: string[], file: string }[]}
 */
export function surfaceStatements(text) {
  const source = ts.createSourceFile("api-surface.d.ts", text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const fileHeaders = [...text.matchAll(/^\/\/ (src\/\S+\.d\.ts)$/gm)].map((m) => ({
    line: text.slice(0, m.index).split("\n").length,
    file: m[1],
  }));
  const lineOf = (/** @type {number} */ pos) => source.getLineAndCharacterOfPosition(pos).line + 1;
  return source.statements.map((statement) => {
    const start = lineOf(statement.getStart(source));
    const end = lineOf(statement.getEnd());
    const file = [...fileHeaders].reverse().find((h) => h.line < start)?.file ?? "";
    return { start, end, names: statementNames(statement), file };
  });
}

/** @param {ts.Statement} statement @returns {string[]} */
function statementNames(statement) {
  if (ts.isImportDeclaration(statement)) {
    const clause = statement.importClause;
    const names = [];
    if (clause?.name) names.push(clause.name.text);
    const bindings = clause?.namedBindings;
    if (bindings && ts.isNamespaceImport(bindings)) names.push(bindings.name.text);
    if (bindings && ts.isNamedImports(bindings)) names.push(...bindings.elements.map((e) => e.name.text));
    return names;
  }
  if (ts.isExportDeclaration(statement)) {
    const clause = statement.exportClause;
    if (clause && ts.isNamedExports(clause)) return clause.elements.map((e) => e.name.text);
    if (clause && ts.isNamespaceExport(clause)) return [clause.name.text];
    return [];
  }
  if (ts.isVariableStatement(statement)) {
    return statement.declarationList.declarations.flatMap((d) => (ts.isIdentifier(d.name) ? [d.name.text] : []));
  }
  const named = /** @type {{ name?: ts.Node }} */ (statement).name;
  if (named && (ts.isIdentifier(named) || ts.isStringLiteral(named))) return [named.text];
  if (ts.isExportAssignment(statement)) return ["default"];
  return [];
}

/**
 * Old-side line numbers of the lines a unified diff (git diff -U0) removes, and the count of
 * added lines.
 * @param {string} diff
 */
export function diffLines(diff) {
  /** @type {number[]} */
  const removed = [];
  /** @type {string[]} */
  const added = [];
  let oldLine = 0;
  for (const line of diff.split("\n")) {
    const hunk = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
    if (hunk) {
      oldLine = Number(hunk[1]);
      // "-a,0" means the hunk inserts after line a; the next removed line (none) would be a + 1.
      if (hunk[2] === "0") oldLine += 1;
      continue;
    }
    if (line.startsWith("---") || line.startsWith("+++")) continue;
    if (line.startsWith("-")) {
      removed.push(oldLine);
      oldLine += 1;
    } else if (line.startsWith("+")) {
      added.push(line.slice(1));
    }
  }
  return { removed, added };
}

/** The surface line of src/version.ts, which every release rewrites: never a level of its own. */
export const VERSION_LINE = /^export declare const OPS_UI_VERSION = "[^"]*";$/;

/** @param {string} line */
export function isVersionLine(line) {
  return VERSION_LINE.test(line.trim());
}

/**
 * The surface with its OPS_UI_VERSION line saying `version` (what `pnpm api-surface` writes after
 * src/version.ts changes), or null when the surface has no such line.
 * @param {string} surface
 * @param {string} version
 */
export function surfaceWithVersion(surface, version) {
  const lines = surface.split("\n");
  const at = lines.findIndex((l) => isVersionLine(l));
  if (at === -1) return null;
  lines[at] = `export declare const OPS_UI_VERSION = "${version}";`;
  return lines.join("\n");
}

/**
 * Classifies an api-surface diff: which declarations lost or changed a line, and whether lines
 * were added.
 * @param {string} before the surface at P
 * @param {string} diff git diff -U0 P HEAD -- api-surface.d.txt
 * @returns {{ changed: { name: string, file: string, line: number }[], unnamed: number[], added: number }}
 */
export function classifySurface(before, diff) {
  const { removed, added } = diffLines(diff);
  const statements = surfaceStatements(before);
  /** @type {Map<string, { name: string, file: string, line: number }>} */
  const changed = new Map();
  /** @type {number[]} */
  const unnamed = [];
  const lines = before.split("\n");
  for (const line of removed) {
    const text = lines[line - 1] ?? "";
    // Blank lines, the generator's comment lines and tsc's empty `export {};` module marker are
    // not declarations.
    if (text.trim() === "" || text.startsWith("//") || text.trim() === "export {};" || isVersionLine(text)) continue;
    const statement = statements.find((s) => s.start <= line && line <= s.end);
    if (!statement || statement.names.length === 0) {
      unnamed.push(line);
      continue;
    }
    for (const name of statement.names) {
      const key = `${statement.file}#${name}`;
      if (!changed.has(key)) changed.set(key, { name, file: statement.file, line });
    }
  }
  return {
    changed: [...changed.values()],
    unnamed,
    added: added.filter((l) => l.trim() !== "" && !l.startsWith("//") && l.trim() !== "export {};" && !isVersionLine(l)).length,
  };
}

/**
 * Compares two token contracts (styles/tokens.css): new required brand variables, removed and
 * changed tokens (major), new tokens (minor).
 * @param {string} before
 * @param {string} after
 */
export function classifyTokens(before, after) {
  const a = new Map(parseTokenContract(before).tokens.map((t) => [t.token, t]));
  const b = new Map(parseTokenContract(after).tokens.map((t) => [t.token, t]));
  const requiredBefore = new Set([...a.values()].filter((t) => t.cls === "required").map((t) => t.brand));
  const newRequired = [...b.values()]
    .filter((t) => t.cls === "required" && !requiredBefore.has(t.brand))
    .map((t) => /** @type {string} */ (t.brand));
  const removed = [...a.keys()].filter((name) => !b.has(name));
  const changed = [...a.values()]
    .filter((t) => b.has(t.token) && (b.get(t.token)?.value !== t.value || b.get(t.token)?.cls !== t.cls))
    .map((t) => t.token);
  const added = [...b.keys()].filter((name) => !a.has(name));
  return { newRequired, removed, changed, added };
}

/**
 * Is this commit a pure rebaseline (spec §4.1)?
 * @param {string} subject
 * @param {string[]} files
 */
export function isPureRebaseline(subject, files) {
  if (!REBASELINE_SUBJECT.test(subject)) return false;
  return files.every(
    (f) => f.startsWith(BASELINE_DIR) || REBASELINE_ENVIRONMENT.some((e) => (e.endsWith("/") ? f.startsWith(e) : f === e)),
  );
}

/**
 * Changed lines (added or removed) under src/ that carry an interaction-only style.
 * @param {string} diff git diff P HEAD -- src/
 * @returns {{ file: string, line: string }[]}
 */
export function interactionLines(diff) {
  /** @type {{ file: string, line: string }[]} */
  const found = [];
  let file = "";
  for (const line of diff.split("\n")) {
    const header = line.match(/^diff --git a\/(\S+) b\/(\S+)$/);
    if (header) {
      file = header[2];
      continue;
    }
    if (line.startsWith("+++") || line.startsWith("---")) continue;
    if ((line.startsWith("+") || line.startsWith("-")) && INTERACTION_PATTERN.test(line)) {
      found.push({ file, line: line.slice(0, 200) });
    }
  }
  return found;
}

// ---------------------------------------------------------------------------------------------
// Git
// ---------------------------------------------------------------------------------------------

/** @param {string} repo @param {string[]} args */
function git(repo, args) {
  return execFileSync("git", ["-C", repo, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 256 * 1024 * 1024,
  });
}

/** @param {string} repo @param {string} ref */
function revParse(repo, ref) {
  try {
    return git(repo, ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`]).trim() || null;
  } catch {
    return null;
  }
}

/** @param {string} repo @param {string} commit @param {string} file */
function showAt(repo, commit, file) {
  try {
    return git(repo, ["show", `${commit}:${file}`]);
  } catch {
    return null;
  }
}

/** @param {number} ms */
function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * git push with the retry rule (network errors only: 2, 4, 8, 16 s). A refusal is not retried.
 * @param {string} repo
 * @param {string[]} args
 * @param {{ retryDelays?: number[] }} options
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
function push(repo, args, { retryDelays = [2000, 4000, 8000, 16000] } = {}) {
  for (let attempt = 0; ; attempt++) {
    const result = spawnSync("git", ["-C", repo, "push", ...args], { encoding: "utf8" });
    if (result.status === 0) return { ok: true };
    const message = `${result.stderr ?? ""}${result.stdout ?? ""}`.trim();
    const network = NETWORK_ERROR.test(message) && !PUSH_REFUSED.test(message);
    if (!network || attempt >= retryDelays.length) return { ok: false, message };
    sleep(retryDelays[attempt]);
  }
}

// ---------------------------------------------------------------------------------------------
// The release
// ---------------------------------------------------------------------------------------------

/**
 * @typedef {{ version: string, compatible: string[], trailers: string[], dryRun: boolean }} ReleaseOptions
 * @typedef {{ required: "patch" | "minor" | "major", reasons: string[], review: { file: string, line: string }[] }} Classification
 */

/**
 * Step 4: the required level from P..HEAD.
 * @param {string} repo
 * @param {string} previous P
 * @param {{ lines: string[] } | null} section the CHANGELOG section of the new version
 * @param {string[]} compatible
 * @returns {Classification & { refusals: string[] }}
 */
export function classify(repo, previous, section, requestedCompatible) {
  /** @type {string[]} */
  const reasons = [];
  // The OPS_UI_VERSION surface line never counts (VERSION_LINE), so the `--compatible
  // OPS_UI_VERSION` that releases before the tools fixes needed has nothing left to authorize: it
  // is accepted and ignored, so a release prepared the old way still runs.
  const compatible = requestedCompatible.filter((name) => name !== "OPS_UI_VERSION");
  if (compatible.length !== requestedCompatible.length) {
    reasons.push("note: --compatible OPS_UI_VERSION is no longer needed (the release ignores and rewrites that surface line); ignored");
  }
  /** @type {string[]} */
  const refusals = [];
  /** @type {string[]} */
  const levels = ["patch"];
  const needs = (/** @type {"minor" | "major"} */ level, /** @type {string} */ why) => {
    levels.push(level);
    reasons.push(`${level}: ${why}`);
  };

  // Baselines: those that existed at P, modified or deleted outside a pure rebaseline.
  const existing = new Set(
    git(repo, ["ls-tree", "-r", "--name-only", previous, "--", BASELINE_DIR]).split("\n").filter(Boolean),
  );
  const log = git(repo, ["log", "--format=%x00%H%x09%s", "--name-status", "--no-renames", `${previous}..HEAD`]);
  for (const entry of log.split("\0").filter((e) => e.trim())) {
    const [head, ...rest] = entry.split("\n");
    const [hash, subject] = head.split("\t");
    const changes = rest.filter(Boolean).map((l) => {
      const [status, file] = l.split("\t");
      return { status, file };
    });
    if (isPureRebaseline(subject, changes.map((c) => c.file))) continue;
    for (const { status, file } of changes) {
      if (!file.startsWith(BASELINE_DIR) || !existing.has(file)) continue;
      if (status === "M" || status === "D" || status === "T") {
        needs("major", `${hash.slice(0, 7)} "${subject}" ${status === "D" ? "deletes" : "modifies"} the existing baseline ${file}`);
      }
    }
  }
  const baselinesNow = git(repo, ["ls-tree", "-r", "--name-only", "HEAD", "--", BASELINE_DIR]).split("\n").filter(Boolean);
  const newBaselines = baselinesNow.filter((f) => !existing.has(f));
  if (newBaselines.length > 0) needs("minor", `${newBaselines.length} new baseline file(s), e.g. ${newBaselines[0]}`);

  // The declaration surface.
  const surfaceBefore = showAt(repo, previous, SURFACE_FILE) ?? "";
  const surfaceDiff = git(repo, ["diff", "-U0", previous, "HEAD", "--", SURFACE_FILE]);
  if (surfaceDiff.trim()) {
    const surface = classifySurface(surfaceBefore, surfaceDiff);
    const compatibleNames = new Set(compatible);
    const uncovered = surface.changed.filter((c) => !compatibleNames.has(c.name));
    const covered = surface.changed.filter((c) => compatibleNames.has(c.name));
    for (const c of uncovered) needs("major", `${SURFACE_FILE}: ${c.file} ${c.name} is removed or changed`);
    for (const line of surface.unnamed) needs("major", `${SURFACE_FILE}: line ${line} is removed or changed`);
    if (covered.length > 0) {
      needs("minor", `${SURFACE_FILE}: ${covered.map((c) => c.name).join(", ")} changed, compatible by --compatible`);
    }
    if (surface.added > 0) needs("minor", `${SURFACE_FILE}: ${surface.added} added line(s)`);
    const changedNames = new Set(surface.changed.map((c) => c.name));
    for (const name of compatible) {
      if (!changedNames.has(name)) refusals.push(`--compatible ${name}: no removed or changed declaration of ${SURFACE_FILE} is named ${name}`);
    }
  } else {
    for (const name of compatible) refusals.push(`--compatible ${name}: ${SURFACE_FILE} is unchanged since the previous release`);
  }
  const compatibleLines = section ? sectionLines(section, "Compatible") : [];
  for (const name of compatible) {
    if (!compatibleLines.some((l) => new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(l))) {
      refusals.push(`CHANGELOG.md: --compatible ${name} needs the line "Compatible: ${name} - <why an unchanged call site renders the same>" in its section`);
    }
  }

  // Tokens.
  const tokensBefore = showAt(repo, previous, TOKENS_FILE);
  const tokensAfter = showAt(repo, "HEAD", TOKENS_FILE);
  if (tokensBefore !== null && tokensAfter !== null && tokensBefore !== tokensAfter) {
    const tokens = classifyTokens(tokensBefore, tokensAfter);
    for (const v of tokens.newRequired) needs("major", `${TOKENS_FILE}: a new required brand variable ${v}`);
    for (const t of tokens.removed) needs("major", `${TOKENS_FILE}: ${t} is removed`);
    for (const t of tokens.changed) needs("major", `${TOKENS_FILE}: ${t} changes its value`);
    for (const t of tokens.added) needs("minor", `${TOKENS_FILE}: a new token ${t}`);
  }

  // Peers.
  const peersBefore = JSON.parse(showAt(repo, previous, "package.json") ?? "{}").peerDependencies ?? {};
  const peersAfter = JSON.parse(showAt(repo, "HEAD", "package.json") ?? "{}").peerDependencies ?? {};
  for (const name of new Set([...Object.keys(peersBefore), ...Object.keys(peersAfter)])) {
    if (peersBefore[name] !== peersAfter[name]) {
      needs("major", `package.json: peer ${name} ${peersBefore[name] ?? "(none)"} → ${peersAfter[name] ?? "(none)"}`);
    }
  }

  // Breaking: lines.
  for (const line of section ? sectionLines(section, "Breaking") : []) needs("major", `CHANGELOG.md: Breaking: ${line}`);

  // Interaction-only styles.
  const review = interactionLines(git(repo, ["diff", previous, "HEAD", "--", "src/"]));
  const reviewed = section ? sectionLines(section, "Reviewed") : [];
  for (const file of [...new Set(review.map((r) => r.file))]) {
    if (!isReviewed(reviewed, file)) {
      const names = componentNames(file);
      refusals.push(
        `CHANGELOG.md: ${file} changes an interaction-only style the baselines do not see; add "Reviewed: ${names[names.length - 1]} - <the same output on hover and focus, or why not>" (spec §4.1)`,
      );
    }
  }

  return { required: highestLevel(levels), reasons, review, refusals };
}

/**
 * The release, steps 1-7.
 * @param {string} repo
 * @param {ReleaseOptions} options
 * @param {(line: string) => void} log
 * @returns {number} the exit code
 */
export function release(repo, options, log) {
  const { version } = options;
  const root = git(repo, ["rev-parse", "--show-toplevel"]).trim();
  const pkgPath = path.join(root, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  if (pkg.name !== PACKAGE_NAME) throw new UsageError(`${root} is not the ${PACKAGE_NAME} repository (package.json name ${pkg.name})`);

  // Step 1.
  /** @type {string[]} */
  const refusals = [];
  const branch = git(root, ["rev-parse", "--abbrev-ref", "HEAD"]).trim();
  if (branch !== "main") refusals.push(`not on main (on ${branch})`);
  const dirty = git(root, ["status", "--porcelain"]).trim();
  if (dirty) refusals.push(`the working tree is not clean:\n${dirty}`);
  let fetched = false;
  try {
    git(root, ["fetch", "--quiet", "origin"]);
    fetched = true;
  } catch (error) {
    refusals.push(`git fetch origin failed: ${String(/** @type {{ stderr?: string }} */ (error).stderr ?? error).trim()}`);
  }
  if (fetched) {
    const head = revParse(root, "HEAD");
    const originMain = revParse(root, "origin/main");
    if (!originMain) refusals.push("origin has no main branch");
    else if (head !== originMain) refusals.push(`HEAD (${head?.slice(0, 7)}) is not origin/main (${originMain.slice(0, 7)}): push first, a release sits on pushed history`);
    if (git(root, ["ls-remote", "--heads", "origin", `release/v${version}`]).trim()) {
      refusals.push(`origin already has a branch release/v${version}`);
    }
  }
  if (revParse(root, `refs/heads/release/v${version}`)) refusals.push(`a local branch release/v${version} exists (left by an earlier run?)`);
  const current = String(pkg.version);
  const requested = bumpLevel(current, version);
  if (!requested) refusals.push(`${version} is not the next patch, minor or major after ${current} (package.json)`);
  const versionTs = readFileSync(path.join(root, "src/version.ts"), "utf8");
  if (!versionTs.includes(`"${current}"`)) refusals.push(`src/version.ts does not say ${current} (package.json)`);
  const surfacePath = path.join(root, SURFACE_FILE);
  const surfaceText = readFileSync(surfacePath, "utf8");
  if (surfaceWithVersion(surfaceText, version) === null) {
    refusals.push(`${SURFACE_FILE} has no "export declare const OPS_UI_VERSION = …;" line to update (run pnpm api-surface)`);
  }
  if (refusals.length > 0) throw new Refusal(refusals);

  // Step 5 (read now: step 4 reads the section too).
  const changelog = readFileSync(path.join(root, "CHANGELOG.md"), "utf8");
  const section = changelogSection(changelog, version);

  // Step 3.
  /** @type {string | null} */
  let previous = null;
  if (current !== "0.0.0") {
    const subject = `release: v${current}`;
    const commits = git(root, ["log", "--format=%H%x09%s", "HEAD"])
      .split("\n")
      .filter(Boolean)
      .map((l) => l.split("\t"))
      .filter(([, s]) => s === subject)
      .map(([h]) => h);
    if (commits.length !== 1) {
      throw new Refusal([`expected exactly one commit titled "${subject}" in HEAD's history, found ${commits.length}`]);
    }
    previous = commits[0];
  }

  // Step 4.
  /** @type {Classification & { refusals: string[] }} */
  let classification = { required: "patch", reasons: [], review: [], refusals: [] };
  if (previous) {
    classification = classify(root, previous, section, options.compatible);
    refusals.push(...classification.refusals);
    const level = /** @type {"patch" | "minor" | "major"} */ (requested);
    if (LEVELS.indexOf(level) < LEVELS.indexOf(classification.required)) {
      refusals.push(
        `${version} is a ${level}, but the changes since v${current} (${previous.slice(0, 7)}) require a ${classification.required}:`,
        ...classification.reasons.filter((r) => r.startsWith(classification.required)).map((r) => `  ${r}`),
      );
    }
  } else if (options.compatible.length > 0) {
    refusals.push("--compatible has nothing to name: this is the first release");
  }

  // Step 5.
  if (!section) {
    refusals.push(`CHANGELOG.md has no "## ${version} — YYYY-MM-DD" section`);
  } else {
    if (!section.date) refusals.push(`CHANGELOG.md: date the section: "${section.heading}" must read "## ${version} — YYYY-MM-DD"`);
    if (requested === "major") {
      if (sectionLines(section, "Visible").length === 0) refusals.push(`CHANGELOG.md: a major needs "Visible:" (every pixel change, per component) in ## ${version}`);
      if (sectionLines(section, "Upgrade steps").length === 0) refusals.push(`CHANGELOG.md: a major needs "Upgrade steps:" (exact commands and edits per app) in ## ${version}`);
    }
  }
  if (refusals.length > 0) throw new Refusal(refusals);

  log(`release ${version}: ${requested}${previous ? `; required since v${current} (${previous.slice(0, 7)}): ${classification.required}` : " (the first release: no previous release to diff)"}`);
  for (const reason of classification.reasons) log(`  ${reason}`);
  for (const r of classification.review) log(`  reviewed by hand (${r.file}): ${r.line.trim()}`);

  // Step 2.
  for (const gate of GATES) {
    log(`gate: pnpm ${gate}`);
    const result = spawnSync("pnpm", ["run", gate], { cwd: root, stdio: "inherit", env: process.env });
    if (result.status !== 0) throw new Refusal([`gate pnpm ${gate} failed (exit ${result.status ?? result.signal})`]);
  }
  const afterGates = git(root, ["status", "--porcelain"]).trim();
  if (afterGates) throw new Refusal([`the gates left the working tree changed:\n${afterGates}`]);

  // Step 6.
  const body = [
    previous ? `Level: ${requested} (required since v${current}: ${classification.required}).` : `Level: ${requested} (the first release).`,
    ...options.compatible.map((name) => `Compatible: ${name}`),
  ];
  const message = [`release: v${version}`, "", ...body, ...(options.trailers.length ? ["", ...options.trailers] : [])].join("\n");
  if (options.dryRun) {
    log(`dry run: would write package.json, src/version.ts and ${SURFACE_FILE} (${current} → ${version}), commit "release: v${version}", create release/v${version} and push main and the branch`);
    log(message.split("\n").map((l) => `  | ${l}`).join("\n"));
    return 0;
  }
  const pkgText = readFileSync(pkgPath, "utf8");
  const newPkgText = pkgText.replace(/("version"\s*:\s*")[^"]*(")/, `$1${version}$2`);
  if (JSON.parse(newPkgText).version !== version) throw new Error("could not write the version into package.json");
  writeFileSync(pkgPath, newPkgText);
  const versionPath = path.join(root, "src/version.ts");
  writeFileSync(versionPath, versionTs.replace(`"${current}"`, `"${version}"`));
  // The declaration surface carries the version too (src/version.d.ts): rewritten in the same
  // commit, so the surface is never stale after a release and the next one needs no --compatible.
  writeFileSync(surfacePath, /** @type {string} */ (surfaceWithVersion(surfaceText, version)));
  const RELEASE_FILES = ["api-surface.d.txt", "package.json", "src/version.ts"];
  git(root, ["add", "--", ...RELEASE_FILES]);
  const staged = git(root, ["diff", "--cached", "--name-only"]).trim().split("\n").sort();
  // (The surface is unstaged only when it already said the new version.)
  if (!staged.includes("package.json") || !staged.includes("src/version.ts") || staged.some((f) => !RELEASE_FILES.includes(f))) {
    throw new Error(`refusing to commit ${staged.join(", ")}`);
  }
  git(root, ["commit", "--quiet", "-m", message]);
  const commit = git(root, ["rev-parse", "HEAD"]).trim();
  log(`committed ${commit.slice(0, 7)} release: v${version}`);

  // Step 7.
  git(root, ["branch", `release/v${version}`, commit]);
  const mainPush = push(root, ["origin", "main"]);
  if (!mainPush.ok) {
    console.error(`release: push of main failed; the release commit ${commit.slice(0, 7)} and branch release/v${version} exist locally.`);
    console.error("Push them by hand: git push origin main && git push origin release/v" + version);
    console.error(mainPush.message);
    return 1;
  }
  log("pushed main");
  const branchPush = push(root, ["origin", `release/v${version}:refs/heads/release/v${version}`]);
  if (branchPush.ok) log(`pushed release/v${version}`);
  else log(`warning: the push of release/v${version} was refused; the commit marker "release: v${version}" is enough for the sync (${branchPush.message.split("\n")[0]})`);
  log(`released @latro/ops-ui ${version} at ${commit}`);
  log(`an app takes it: node scripts/sync-ops-ui.mjs --version ${version}`);
  return 0;
}

// ---------------------------------------------------------------------------------------------
// Command line
// ---------------------------------------------------------------------------------------------

const USAGE = "usage: pnpm release <X.Y.Z> [--compatible <declaration name>]… [--trailer <line>]… [--dry-run]";

/** @param {string[]} argv @returns {ReleaseOptions} */
export function parseArgs(argv) {
  /** @type {ReleaseOptions} */
  const out = { version: "", compatible: [], trailers: [], dryRun: false };
  const value = (/** @type {number} */ i, /** @type {string} */ flag) => {
    const v = argv[i + 1];
    if (v === undefined || v.startsWith("--")) throw new UsageError(`${flag} needs a value\n${USAGE}`);
    return v;
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--compatible") out.compatible.push(value(i++, arg));
    else if (arg === "--trailer") out.trailers.push(value(i++, arg));
    else if (arg === "--dry-run") out.dryRun = true;
    else if (arg === "--") continue;
    else if (!arg.startsWith("--") && !out.version) out.version = arg;
    else throw new UsageError(`unknown argument ${arg}\n${USAGE}`);
  }
  if (!out.version) throw new UsageError(USAGE);
  if (!/^\d+\.\d+\.\d+$/.test(out.version)) throw new UsageError(`the version is X.Y.Z, got ${out.version}\n${USAGE}`);
  return out;
}

/** @param {string[]} argv @param {string} cwd */
export function main(argv, cwd = process.cwd()) {
  try {
    return release(cwd, parseArgs(argv), (line) => console.log(line));
  } catch (error) {
    if (error instanceof Refusal) {
      console.error("release: refused");
      for (const reason of error.reasons) console.error(reason);
      return 1;
    }
    if (error instanceof UsageError) {
      console.error(`release: ${error.message}`);
      return 2;
    }
    console.error(`release: ${/** @type {Error} */ (error).stack ?? error}`);
    return 2;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  process.exit(main(process.argv.slice(2)));
}
