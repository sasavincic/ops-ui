import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ActionIcon, ActionIconScope } from "../src/components/action-icon";
import { Badge } from "../src/components/badge";
import { StatusIcon } from "../src/components/status-icon";
import type { ActionIconName, StatusIconName } from "../src/types";

// The glyph vocabularies (spec §11.1 `glyphs`): a Badge always carries its
// status icon, and each icon component draws exactly the names types.ts
// declares - no more, no fewer.

const root = path.resolve(__dirname, "..");
const read = (rel: string) => readFileSync(path.join(root, rel), "utf8");

/** The string-literal members of `export type <name> = "a" | "b" ...;` in types.ts. */
function unionMembers(name: string): string[] {
  const m = read("src/types.ts").match(new RegExp(`export type ${name} =([^;]+);`));
  if (!m) throw new Error(`${name} not found in types.ts`);
  return [...m[1].matchAll(/"([a-z-]+)"/g)].map((x) => x[1]);
}

/** The keys of the `const paths: Record<Name, ...> = { ... };` table of a component. */
function pathKeys(file: string): string[] {
  const src = read(file);
  const start = src.indexOf("const paths");
  const body = src.slice(src.indexOf("{", src.indexOf("=", start)) + 1, src.indexOf("\n};", start));
  return [...body.matchAll(/^\s{2}([a-z]+):/gm)].map((x) => x[1]);
}

describe("glyphs", () => {
  const statusNames = unionMembers("StatusIconName");
  const actionNames = unionMembers("ActionIconName");

  it("types.ts declares the vocabularies (16 status glyphs, 34 action glyphs)", () => {
    expect(statusNames).toHaveLength(16);
    expect(actionNames).toHaveLength(34);
    expect(new Set(statusNames).size).toBe(statusNames.length);
    expect(new Set(actionNames).size).toBe(actionNames.length);
  });

  it("StatusIcon draws exactly the StatusIconName union", () => {
    expect(pathKeys("src/components/status-icon.tsx").sort()).toEqual([...statusNames].sort());
    for (const name of statusNames) {
      const html = renderToStaticMarkup(<StatusIcon name={name as StatusIconName} />);
      expect(html, name).toMatch(/^<svg aria-hidden="true"[^>]*viewBox="0 0 16 16"/);
      expect(html, name).toMatch(/<(path|circle|rect) /);
    }
  });

  it("ActionIcon draws exactly the ActionIconName union", () => {
    expect(pathKeys("src/components/action-icon.tsx").sort()).toEqual([...actionNames].sort());
    for (const name of actionNames) {
      const html = renderToStaticMarkup(<ActionIcon name={name as ActionIconName} />);
      expect(html, name).toContain(`data-action-icon="${name}"`);
      expect(html, name).toMatch(/<path d="[mM][^"]+"><\/path><\/svg>$/);
    }
  });

  it("ActionIcon: on by default, off in a disabled scope unless `always`", () => {
    expect(renderToStaticMarkup(<ActionIcon name="add" />)).toContain('data-action-icon="add"');
    const off = (node: React.ReactNode) =>
      renderToStaticMarkup(<ActionIconScope enabled={false}>{node}</ActionIconScope>);
    expect(off(<ActionIcon name="add" />)).toBe("");
    expect(off(<ActionIcon name="more" always />)).toContain('data-action-icon="more"');
    expect(renderToStaticMarkup(<ActionIconScope><ActionIcon name="add" /></ActionIconScope>)).toContain("svg");
  });

  it("a Badge needs an icon: the type requires it and it is always drawn", () => {
    // @ts-expect-error - a Badge without its status icon does not compile.
    const missing = <Badge variant="success">Active</Badge>;
    expect(missing).toBeTruthy();
    const html = renderToStaticMarkup(
      <Badge variant="success" icon="current">
        Active
      </Badge>
    );
    expect(html).toMatch(/^<span class="[^"]*rounded-full[^"]*"><svg aria-hidden="true"/);
    expect(html).toContain(">Active</span>");
    const outline = renderToStaticMarkup(
      <Badge variant="danger" icon="problem" appearance="outline">
        Expired
      </Badge>
    );
    expect(outline).toContain("bg-transparent");
    expect(outline).toContain("text-danger");
  });
});
