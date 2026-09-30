import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { ActionIconName as ActionIconFromComponent } from "../src/components/action-icon";
import type { BadgeVariant as BadgeVariantFromComponent } from "../src/components/badge";
import type { CalloutTone as CalloutToneFromComponent } from "../src/components/callout";
import type { StateMarkSpec as StateMarkSpecFromComponent } from "../src/components/state-mark";
import type { StatusIconName as StatusIconFromComponent } from "../src/components/status-icon";
import type {
  ToastAction as ToastActionFromComponent,
  ToastTone as ToastToneFromComponent,
} from "../src/components/toast";
import type * as T from "../src/types";

// types.ts (spec §3.1, §7): the kit's types an app's domain modules import (status-meta,
// search, compliance) without pointing at a React component. The components re-export the
// same types, so an import from a component keeps working; these checks fail tsc on drift.

type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const sameTypes: true[] = [
  true satisfies Exact<BadgeVariantFromComponent, T.BadgeVariant>,
  true satisfies Exact<StatusIconFromComponent, T.StatusIconName>,
  true satisfies Exact<ActionIconFromComponent, T.ActionIconName>,
  true satisfies Exact<StateMarkSpecFromComponent, T.StateMarkSpec>,
  true satisfies Exact<CalloutToneFromComponent, T.CalloutTone>,
  true satisfies Exact<ToastToneFromComponent, T.ToastTone>,
  true satisfies Exact<ToastActionFromComponent, T.ToastAction>,
];

const source = readFileSync(path.resolve(__dirname, "../src/types.ts"), "utf8");

describe("types.ts", () => {
  it("is React-free: it imports nothing and declares types only", () => {
    expect(source).not.toMatch(/^\s*import\b/m);
    expect(source).not.toMatch(/\brequire\(/);
    expect(source).not.toMatch(/^\s*export\s+(const|function|class|let|var|default)\b/m);
    expect(source).not.toMatch(/"use client"/);
  });

  it("declares the seven types of spec §3.1", () => {
    const declared = [...source.matchAll(/^export type (\w+)/gm)].map((m) => m[1]).sort();
    expect(declared).toEqual(
      ["ActionIconName", "BadgeVariant", "CalloutTone", "StateMarkSpec", "StatusIconName", "ToastAction", "ToastTone"],
    );
  });

  it("the components re-export exactly these types (checked by tsc)", () => {
    expect(sameTypes).toHaveLength(7);
  });
});
