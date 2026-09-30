import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { OPS_UI_VERSION } from "../src/version";
import { SYNC_DEST, generatedHeader, isAllowedDestination, shipPlan } from "../sync/sync-ops-ui.mjs";
import { ROOT, filesUnder } from "./source-files";

// What a release ships (spec §11.1 `manifest`): ship.json maps every library file an app needs
// to its destination, every destination is on the sync's allow-list, the version is one
// version, and the declaration surface the release script diffs is current.

const ship = JSON.parse(readFileSync(path.join(ROOT, "ship.json"), "utf8"));
const tracked = execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" }).split("\n").filter(Boolean);
const VENDOR = "src/vendor/ops-ui";
const plan = shipPlan(ship, [...new Set([...tracked, ...filesUnder("src"), ...filesUnder("styles")])], VENDOR);

describe("manifest", () => {
  it("ships every file under src/ and styles/", () => {
    const shipped = new Set(plan.map((entry) => entry.src));
    const unshipped = [...filesUnder("src"), ...filesUnder("styles")].filter((file) => !shipped.has(file));
    expect(unshipped).toEqual([]);
  });

  it("ships the sync script to scripts/, the docs beside the vendored code, and nothing else", () => {
    const outside = plan.filter((e) => !e.src.startsWith("src/") && !e.src.startsWith("styles/"));
    expect(outside.map((e) => e.src).sort()).toEqual(
      ["CHANGELOG.md", "DESIGN.md", "TOKENS.md", "sync/sync-ops-ui.mjs"].filter((f) => tracked.includes(f)).sort(),
    );
    expect(plan.find((e) => e.src === "sync/sync-ops-ui.mjs")?.dest).toBe(SYNC_DEST);
    expect(plan.find((e) => e.src === "TOKENS.md")?.dest).toBe(`${VENDOR}/TOKENS.md`);
    expect(plan.find((e) => e.src === "styles/tokens.css")?.dest).toBe(`${VENDOR}/styles/tokens.css`);
    expect(plan.find((e) => e.src === "src/components/button.tsx")?.dest).toBe(`${VENDOR}/components/button.tsx`);
    for (const e of plan) expect(e.src, e.src).not.toMatch(/^(tests|gallery|tools|docs)\//);
  });

  it("every destination is on the allow-list, for any vendor folder", () => {
    for (const vendorDir of [VENDOR, "apps/web/src/vendor/ops-ui"]) {
      for (const entry of shipPlan(ship, tracked, vendorDir)) {
        expect(isAllowedDestination(entry.dest, vendorDir), entry.dest).toBe(true);
      }
    }
    expect(isAllowedDestination("src/components/ui/button.tsx", VENDOR)).toBe(false);
    expect(isAllowedDestination(`${VENDOR}/../app/page.tsx`, VENDOR)).toBe(false);
    expect(isAllowedDestination("scripts/other.mjs", VENDOR)).toBe(false);
    expect(isAllowedDestination(`${VENDOR}-evil/x.ts`, VENDOR)).toBe(false);
  });

  it("the mapping refuses two sources for one destination", () => {
    const clash = { files: [{ from: "a/*.css", to: "{vendorDir}/styles/" }, { from: "b/*.css", to: "{vendorDir}/styles/" }] };
    expect(() => shipPlan(clash, ["a/x.css", "b/x.css"], VENDOR)).toThrow(/shipped from both/);
  });

  it("every shipped file has a generated-header form without a double quote", () => {
    for (const entry of plan) {
      const header = generatedHeader(entry.dest, "1.0.0", "abc1234");
      expect(header, entry.dest).toMatch(/^(\/\/|\/\*|<!--) GENERATED from @latro\/ops-ui v1\.0\.0 \(abc1234\)/);
      expect(header, entry.dest).not.toContain('"');
      expect(header.endsWith("\n")).toBe(true);
    }
  });

  it("version.ts equals package.json", () => {
    const pkg = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8"));
    expect(OPS_UI_VERSION).toBe(pkg.version);
  });

  it("api-surface.d.txt is current (node tools/api-surface.mjs regenerates it)", () => {
    const run = () =>
      execFileSync(process.execPath, [path.join(ROOT, "tools/api-surface.mjs"), "--check"], {
        cwd: ROOT,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
    expect(run).not.toThrow();
  }, 120_000);
});
