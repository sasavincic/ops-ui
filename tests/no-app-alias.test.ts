import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// The library knows no app (spec §0, §7): after L3 nothing under src/ names
// an app's "@/" alias - not in an import, a dynamic import, a re-export or
// a comment. A plain text search, so no import form can slip past it. The
// full import boundary (peers only, no process.env) is the L5 boundary test
// and the ESLint rule on src/**.

const root = path.resolve(__dirname, "..");
const SRC = path.join(root, "src");

function filesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(full) : [full];
  });
}

/** Every line of `text` that contains "@/", as "<line>: <text>". */
function aliasLines(text: string): string[] {
  return text
    .split("\n")
    .flatMap((line, i) => (line.includes("@/") ? [`${i + 1}: ${line.trim()}`] : []));
}

describe('no "@/" anywhere in src/', () => {
  const files = filesUnder(SRC);

  it("scans the whole source tree", () => {
    const rel = files.map((f) => path.relative(SRC, f).split(path.sep).join("/"));
    for (const expected of [
      "components/button.tsx",
      "components/toast.tsx",
      "config/provider.tsx",
      "config/read-only.tsx",
      "lib/cn.ts",
      "navigation/nav-trail.tsx",
      "types.ts",
    ]) {
      expect(rel).toContain(expected);
    }
    expect(rel.filter((f) => f.startsWith("components/"))).toHaveLength(35);
  });

  it("the scanner finds a planted alias", () => {
    expect(
      aliasLines('"use client";\nimport { cn } from "@/lib/utils";\n// see @/domain/dates\n'),
    ).toEqual(['2: import { cn } from "@/lib/utils";', "3: // see @/domain/dates"]);
    expect(aliasLines('import { cn } from "../lib/cn";\n')).toEqual([]);
  });

  it("no file under src/ contains it", () => {
    const hits = files.flatMap((file) =>
      aliasLines(readFileSync(file, "utf8")).map(
        (line) => `${path.relative(root, file).split(path.sep).join("/")}:${line}`,
      ),
    );
    expect(hits).toEqual([]);
  });
});
