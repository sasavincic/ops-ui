import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { OPS_UI_VERSION } from "../src/version";

const root = path.resolve(__dirname, "..");
const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));

describe("package.json", () => {
  it("is the private, never-published @latro/ops-ui", () => {
    expect(pkg.name).toBe("@latro/ops-ui");
    expect(pkg.private).toBe(true);
    expect(pkg.publishConfig).toBeUndefined();
  });

  it("depends on nothing at runtime but the peer set (spec §3.1)", () => {
    expect(pkg.dependencies).toBeUndefined();
    expect(pkg.peerDependencies).toEqual({
      "class-variance-authority": "^0.7.1",
      clsx: "^2.1.1",
      next: ">=16.2 <17",
      react: ">=19.2 <20",
      "react-dom": ">=19.2 <20",
      "tailwind-merge": "^3.6",
      tailwindcss: ">=4.1 <5",
    });
  });

  it("pins the apps' Next and React (the gallery renders what the apps run)", () => {
    expect(pkg.devDependencies.next).toBe("16.2.10");
    expect(pkg.devDependencies.react).toBe("19.2.4");
    expect(pkg.devDependencies["react-dom"]).toBe("19.2.4");
  });

  it("src/version.ts equals the package version", () => {
    expect(OPS_UI_VERSION).toBe(pkg.version);
  });
});
