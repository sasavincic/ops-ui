import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

// Helpers for the tests that read the library's own source as text.

export const ROOT = path.resolve(__dirname, "..");

/** Every file under `dir` (repo-relative, forward slashes), sorted. */
export function filesUnder(dir: string): string[] {
  const walk = (abs: string): string[] =>
    readdirSync(abs, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(abs, entry.name);
      return entry.isDirectory() ? walk(full) : [path.relative(ROOT, full).split(path.sep).join("/")];
    });
  return walk(path.join(ROOT, dir)).sort();
}

export const readSource = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

/** The source with comments and string/template contents blanked (line structure kept). */
export function stripCommentsAndStrings(src: string): string {
  let out = "";
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    const next = src[i + 1];
    if (ch === "/" && next === "/") {
      while (i < src.length && src[i] !== "\n") i++;
    } else if (ch === "/" && next === "*") {
      const end = src.indexOf("*/", i + 2);
      const stop = end === -1 ? src.length : end + 2;
      out += src.slice(i, stop).replace(/[^\n]/g, " ");
      i = stop;
    } else if (ch === '"' || ch === "'" || ch === "`") {
      let j = i + 1;
      while (j < src.length && src[j] !== ch) j += src[j] === "\\" ? 2 : 1;
      out += ch + src.slice(i + 1, j).replace(/[^\n]/g, " ") + ch;
      i = j + 1;
    } else {
      out += ch;
      i++;
    }
  }
  return out;
}

/** Every module specifier the file imports or re-exports (static, dynamic, require). */
export function moduleSpecifiers(src: string): string[] {
  const specs: string[] = [];
  const patterns = [
    /\bimport\s+(?:type\s+)?(?:[\w*{}\s,$]+\s+from\s+)?["']([^"']+)["']/g,
    /\bexport\s+(?:type\s+)?(?:\*|\{[^}]*\})\s*(?:as\s+\w+\s+)?from\s+["']([^"']+)["']/g,
    /\bimport\(\s*["']([^"']+)["']\s*\)/g,
    /\brequire\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const re of patterns) for (const m of src.matchAll(re)) specs.push(m[1]);
  return specs;
}

/** True when the file's first statement is the "use client" directive. */
export function hasUseClient(src: string): boolean {
  const code = src.replace(/^\s*(?:\/\/[^\n]*\n|\/\*[^]*?\*\/\s*)*/, "");
  return /^["']use client["'];?/.test(code.trimStart());
}
