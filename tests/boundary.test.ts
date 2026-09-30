import { describe, expect, it } from "vitest";
import { filesUnder, moduleSpecifiers, readSource, stripCommentsAndStrings } from "./source-files";

// The library knows no app (spec §0, §11.1 `boundary`): every import under src/
// is relative or one of the peers, and nothing reads the environment. The ESLint
// rule on src/** says the same at edit time; this test is the proof on the files.

const PEERS = [
  "react",
  "react-dom",
  "next/link",
  "next/navigation",
  "clsx",
  "tailwind-merge",
  "class-variance-authority",
];
const SOURCES = filesUnder("src").filter((f) => /\.(ts|tsx|mts|mjs|js)$/.test(f));

describe("boundary", () => {
  it("reads every library module", () => {
    expect(SOURCES.length).toBeGreaterThan(50);
    expect(SOURCES).toContain("src/components/date-input.tsx");
    expect(SOURCES).toContain("src/stories/index.ts");
  });

  it("the import reader sees every form of import", () => {
    const planted = [
      'import { a } from "./a";',
      'import type { B } from "../b";',
      'import "side-effect";',
      'import * as ns from "ns-pkg";',
      'export { c } from "@/lib/c";',
      'export * from "star-pkg";',
      'const d = await import("dyn-pkg");',
      'const e = require("cjs-pkg");',
    ].join("\n");
    expect(moduleSpecifiers(planted)).toEqual(
      expect.arrayContaining(["./a", "../b", "side-effect", "ns-pkg", "@/lib/c", "star-pkg", "dyn-pkg", "cjs-pkg"]),
    );
  });

  it("every import is relative or a peer", () => {
    const outside = SOURCES.flatMap((file) =>
      moduleSpecifiers(readSource(file))
        .filter((spec) => !spec.startsWith("./") && !spec.startsWith("../") && !PEERS.includes(spec))
        .map((spec) => `${file}: ${spec}`),
    );
    expect(outside).toEqual([]);
  });

  it("every relative import stays inside src/", () => {
    const escapes = SOURCES.flatMap((file) =>
      moduleSpecifiers(readSource(file))
        .filter((spec) => spec.startsWith("."))
        .filter((spec) => {
          const depth = file.split("/").length - 2; // folders below src/
          const ups = spec.split("/").filter((part) => part === "..").length;
          return ups > depth;
        })
        .map((spec) => `${file}: ${spec}`),
    );
    expect(escapes).toEqual([]);
  });

  it("nothing reads process.env (or any process global)", () => {
    const hits = SOURCES.filter((file) => /\bprocess\s*\.|\bprocess\s*\[/.test(stripCommentsAndStrings(readSource(file))));
    expect(hits).toEqual([]);
  });
});
