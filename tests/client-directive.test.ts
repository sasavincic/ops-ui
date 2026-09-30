import { describe, expect, it } from "vitest";
import { filesUnder, hasUseClient, moduleSpecifiers, readSource, stripCommentsAndStrings } from "./source-files";

// Purity rules (spec §11.1 `client-directive`, CLAUDE.md rule 5): a module that calls
// hooks, creates a context or attaches event handlers starts with "use client"; the 17
// server-safe component files carry no directive and never touch the kit config (the
// provider and the read-only scope are client contexts a server component cannot read).

const SERVER_SAFE = [
  "attention-list",
  "badge",
  "callout",
  "card",
  "description-list",
  "empty-state",
  "form-actions",
  "glance-card",
  "kicker",
  "monogram",
  "page-header",
  "search-form",
  "segmented",
  "state-mark",
  "status-icon",
  "tabs",
  "tag",
].map((name) => `src/components/${name}.tsx`);

const SOURCES = filesUnder("src").filter((f) => /\.(ts|tsx)$/.test(f));
const code = (file: string) => stripCommentsAndStrings(readSource(file));

/** A React hook call: useX( ... - the imports of hooks are not calls. */
const callsHook = (src: string) => /(?<![\w.])use[A-Z]\w*\s*\(/.test(src.replace(/^\s*import[^;]+;/gm, ""));
const createsContext = (src: string) => /\bcreateContext\s*[<(]/.test(src);
/** An event handler written in this file: onX={() => ...} / onX={function / onX={async ...}. */
const attachesHandler = (src: string) => /\bon[A-Z]\w*=\{\s*(?:\(|async\b|function\b|[\w$]+\s*=>)/.test(src);

describe("client-directive", () => {
  it("the detectors see what they must", () => {
    expect(callsHook("const [a] = useState(0);")).toBe(true);
    expect(callsHook('import { useState } from "react";\nconst x = 1;')).toBe(false);
    expect(callsHook("const x = obj.useThing();")).toBe(false);
    expect(createsContext("const C = createContext(false);")).toBe(true);
    expect(attachesHandler("<button onClick={() => go()} />")).toBe(true);
    expect(attachesHandler("<a onClick={(e) => e.preventDefault()} />")).toBe(true);
    expect(attachesHandler("<BackLink onBackClick={onBackClick} />")).toBe(false);
    expect(hasUseClient('"use client";\nimport x from "y";')).toBe(true);
    expect(hasUseClient('// header\n/* more */\n"use client";\n')).toBe(true);
    expect(hasUseClient('import x from "y";\n"use client";')).toBe(false);
  });

  it("the 17 server-safe component files are the spec's", () => {
    expect(SERVER_SAFE).toHaveLength(17);
    for (const file of SERVER_SAFE) expect(SOURCES, file).toContain(file);
  });

  it("every file that calls hooks or creates a context starts with the directive", () => {
    const missing = SOURCES.filter((f) => (callsHook(code(f)) || createsContext(code(f))) && !hasUseClient(readSource(f)));
    expect(missing).toEqual([]);
  });

  it("every file that attaches a handler starts with the directive (segmented excepted)", () => {
    // Segmented's controlled mode takes onValueChange, a function, which a server component
    // cannot pass: when it attaches its onClick it is already inside a client tree. Its
    // link mode is what server pages render, so it stays server-safe (spec §9 row 26).
    const missing = SOURCES.filter(
      (f) => f !== "src/components/segmented.tsx" && attachesHandler(code(f)) && !hasUseClient(readSource(f)),
    );
    expect(missing).toEqual([]);
  });

  it("the server-safe files: no directive, no hook, no context, no kit config", () => {
    for (const file of SERVER_SAFE) {
      const src = readSource(file);
      expect(hasUseClient(src), file).toBe(false);
      expect(callsHook(code(file)), file).toBe(false);
      expect(createsContext(code(file)), file).toBe(false);
      const config = moduleSpecifiers(src).filter((s) => /config\/(provider|read-only)$/.test(s));
      expect(config, file).toEqual([]);
    }
  });

  it("the other component files are client modules", () => {
    const components = SOURCES.filter((f) => f.startsWith("src/components/"));
    expect(components).toHaveLength(35);
    const clients = components.filter((f) => !SERVER_SAFE.includes(f));
    expect(clients.filter((f) => !hasUseClient(readSource(f)))).toEqual([]);
  });

  it("no barrel: nothing under src/components re-exports another module wholesale", () => {
    const barrels = SOURCES.filter((f) => /\bexport\s+\*\s+from\b/.test(code(f)));
    expect(barrels).toEqual([]);
  });
});
