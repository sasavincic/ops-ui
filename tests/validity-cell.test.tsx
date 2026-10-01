import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ValidityCell, ValidityNote } from "../src/components/validity-cell";
import { OpsUiProvider } from "../src/config/provider";
import { EN_STRINGS } from "../src/config/strings";
import { ROOT } from "./source-files";

// components/validity-cell.tsx (library 1.1.0, spec §12.4) is Workforce Ops'
// src/components/ui/validity-cell.tsx, decoupled. With the default strings it must render exactly
// what Workforce Ops renders: tests/fixtures/wfo-validity-cell/validity-cell.tsx.txt is that file
// byte for byte (workforce-ops origin/main 23d7d5c, last changed in afce40d 2026-09-25). The test
// replaces only its import lines - its kit and lib imports point at the library modules that are
// verbatim copies (status-icon, cn, formatDate, fmt), its domain imports at verbatim excerpts of
// Workforce Ops' compliance.ts and operations.ts, useDict at Workforce Ops' en words - and renders
// both copies over every state.

const SANDBOX = mkdtempSync(path.join(os.tmpdir(), "ops-ui-validity-"));
afterAll(() => rmSync(SANDBOX, { recursive: true, force: true }));

const SOURCE = readFileSync(path.join(ROOT, "tests/fixtures/wfo-validity-cell/validity-cell.tsx.txt"), "utf8");

const lib = (p: string) => JSON.stringify(path.join(ROOT, "src", p));
const IMPORTS: Record<string, string> = {
  "@/components/ui/status-icon": lib("components/status-icon"),
  "@/domain/compliance": "./compliance",
  "@/domain/dates": lib("lib/dates"),
  "@/domain/operations": "./operations",
  "@/i18n/client": "./i18n",
  "@/i18n/locales": lib("lib/fmt"),
  "@/lib/utils": lib("lib/cn"),
};

type Cell = typeof ValidityCell;
let Wfo: { ValidityCell: Cell; ValidityNote: typeof ValidityNote };

beforeAll(async () => {
  let seen = 0;
  const rewritten = SOURCE.replace(/^(import [^;]+ from )"(@\/[^"]+)";$/gm, (_, head: string, spec: string) => {
    expect(IMPORTS[spec], `unexpected import ${spec}`).toBeDefined();
    seen++;
    return `${head}${IMPORTS[spec].startsWith('"') ? IMPORTS[spec] : JSON.stringify(IMPORTS[spec])};`;
  });
  expect(seen).toBe(Object.keys(IMPORTS).length);
  const dir = path.join(SANDBOX, "wfo");
  mkdirSync(dir, { recursive: true });
  symlinkSync(path.join(ROOT, "node_modules"), path.join(SANDBOX, "node_modules"), "dir");
  writeFileSync(path.join(dir, "validity-cell.tsx"), rewritten);
  // Workforce Ops domain/compliance.ts at 23d7d5c (excerpt, verbatim).
  writeFileSync(
    path.join(dir, "compliance.ts"),
    `export const EXPIRY_WARNING_DAYS = 30;
export type ExpiryStatus = "valid" | "expiring" | "expired" | "no_expiry";
export type DocumentExpiryStatus = ExpiryStatus | "unknown";
export function documentExpiryStatus(expiryDate: string | null, today: string, noExpiry = false): DocumentExpiryStatus {
  return !expiryDate && !noExpiry ? "unknown" : expiryStatus(expiryDate, today);
}
export function expiryStatus(
  expiryDate: string | null,
  today: string
): ExpiryStatus {
  if (!expiryDate) return "no_expiry";
  if (expiryDate < today) return "expired";
  const warn = new Date(\`\${today}T00:00:00Z\`);
  warn.setUTCDate(warn.getUTCDate() + EXPIRY_WARNING_DAYS);
  if (expiryDate <= warn.toISOString().slice(0, 10)) return "expiring";
  return "valid";
}
`,
  );
  // Workforce Ops domain/operations.ts at 23d7d5c (excerpt, verbatim).
  writeFileSync(
    path.join(dir, "operations.ts"),
    `export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round(
    (new Date(\`\${toIso}T00:00:00Z\`).getTime() -
      new Date(\`\${fromIso}T00:00:00Z\`).getTime()) /
      86_400_000
  );
}
`,
  );
  // Workforce Ops' en words the cell reads (workers.ts, compliance.ts, statuses.ts at 23d7d5c).
  writeFileSync(
    path.join(dir, "i18n.ts"),
    `export function useDict() {
  return {
    workers: { compliance: { expiredAgo: "expired {days} d ago", expiresIn: "in {days} d" } },
    compliance: { desk: { unknown: "Validity unknown" } },
    statuses: { expiry: { no_expiry: "No expiry" } },
  };
}
`,
  );
  Wfo = await import(pathToFileURL(path.join(dir, "validity-cell.tsx")).href);
}, 60_000);

const TODAY = "2026-10-01";
const shift = (d: number) => {
  const x = new Date(`${TODAY}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + d);
  return x.toISOString().slice(0, 10);
};

type Props = Parameters<Cell>[0];
const CASES: Props[] = [];
for (const d of [-400, -31, -30, -1, 0, 1, 12, 29, 30, 31, 365]) {
  for (const noExpiry of [false, true]) {
    for (const label of [undefined, "Confirmation"]) CASES.push({ date: shift(d), today: TODAY, noExpiry, label });
  }
}
for (const noExpiry of [false, true]) {
  for (const label of [undefined, "Confirmation"]) CASES.push({ date: null, today: TODAY, noExpiry, label, className: "text-right" });
}

describe("ValidityCell / ValidityNote: Workforce Ops' markup with the default strings", () => {
  it("the fixture is Workforce Ops' client module", () => {
    expect(SOURCE.startsWith('"use client";')).toBe(true);
    expect(SOURCE).toContain("export function ValidityCell");
  });

  it.each(CASES.map((c) => [JSON.stringify(c), c] as const))("ValidityCell %s", (_, props) => {
    const ours = renderToStaticMarkup(<ValidityCell {...props} />);
    expect(ours).toBe(renderToStaticMarkup(<Wfo.ValidityCell {...props} />));
    // Inside a provider that passes no validity words (an app on 1.1 before its dictionary has them).
    expect(renderToStaticMarkup(<OpsUiProvider strings={EN_STRINGS}><ValidityCell {...props} /></OpsUiProvider>)).toBe(ours);
  });

  it.each(CASES.map((c) => [JSON.stringify(c), c] as const))("ValidityNote %s", (_, props) => {
    expect(renderToStaticMarkup(<ValidityNote {...props} />)).toBe(renderToStaticMarkup(<Wfo.ValidityNote {...props} />));
  });

  it("states that render nothing extra: a valid paper is its date alone, a valid note is nothing", () => {
    expect(renderToStaticMarkup(<ValidityNote date={shift(31)} today={TODAY} />)).toBe("");
    expect(renderToStaticMarkup(<ValidityCell date={shift(31)} today={TODAY} />)).toBe(
      '<span class="flex flex-col"><span class="whitespace-nowrap text-ink">01-11-2026</span></span>',
    );
  });
});

describe("ValidityCell: the app's words and window", () => {
  const SL = {
    ...EN_STRINGS,
    validity: { expiredAgo: "poteklo pred {days} d", expiresIn: "čez {days} d", unknown: "Veljavnost neznana", noExpiry: "Brez izteka" },
  };
  const sl = (node: React.ReactNode) => renderToStaticMarkup(<OpsUiProvider strings={SL}>{node}</OpsUiProvider>);

  it("strings.validity replaces every word", () => {
    expect(sl(<ValidityCell date={shift(-3)} today={TODAY} />)).toContain("poteklo pred 3 d");
    expect(sl(<ValidityCell date={shift(12)} today={TODAY} />)).toContain("čez 12 d");
    expect(sl(<ValidityCell date={null} today={TODAY} />)).toContain("Veljavnost neznana");
    expect(sl(<ValidityCell date={null} today={TODAY} noExpiry />)).toContain("Brez izteka");
    expect(sl(<ValidityNote date={shift(-3)} today={TODAY} label="Potrditev" />)).toContain("Potrditev: poteklo pred 3 d");
  });

  it("warnDays widens the window; 30 is the default", () => {
    expect(renderToStaticMarkup(<ValidityCell date={shift(45)} today={TODAY} />)).not.toContain("in 45 d");
    expect(renderToStaticMarkup(<ValidityCell date={shift(45)} today={TODAY} warnDays={60} />)).toContain("in 45 d");
    expect(renderToStaticMarkup(<ValidityCell date={shift(12)} today={TODAY} warnDays={30} />)).toBe(
      renderToStaticMarkup(<ValidityCell date={shift(12)} today={TODAY} />),
    );
  });
});
