import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BRANDS } from "../gallery/brands";
import { SHOT_PROJECTS, STATE_PROJECT, STATE_SHOTS, stateShotName } from "../gallery/shot-matrix";
import { STORY_GROUPS, storyId } from "../src/stories";
import { ROOT, filesUnder } from "./source-files";

// The baseline files against the shot matrix (spec §11.2). The shot spec reads one file per
// story id, so without this test a renamed or deleted story would leave its PNGs behind, never
// compared and never reported (they would read as "no baseline modified or deleted" to the
// release's semver check, §4.1), and a new shot would have no file until someone accepted one.
// Only `pnpm shots:accept` writes baselines (gallery/playwright.config.ts: updateSnapshots
// "none"); this test keeps what it wrote equal to what the matrix shoots.

const DIR = "gallery/__screenshots__";

/** Every baseline the matrix compares: stories x brands x projects, plus the state shots. */
function expectedBaselines(): string[] {
  const out: string[] = [];
  for (const project of SHOT_PROJECTS) {
    for (const brand of BRANDS) {
      for (const group of STORY_GROUPS) {
        for (const story of group.stories) out.push(`${DIR}/${project.name}/${brand}/${storyId(group.component, story.name)}.png`);
      }
    }
  }
  for (const brand of BRANDS) {
    for (const shot of STATE_SHOTS) out.push(`${DIR}/${STATE_PROJECT}/${brand}/${stateShotName(shot)}.png`);
  }
  return out.sort();
}

describe("the baselines are the shot matrix, file for file", () => {
  it("no baseline is missing and none is orphaned", () => {
    const expected = expectedBaselines();
    const actual = filesUnder(DIR);
    const missing = expected.filter((file) => !actual.includes(file));
    const orphaned = actual.filter((file) => !expected.includes(file));
    expect(missing, "shots with no baseline: run pnpm shots:accept and review what it wrote").toEqual([]);
    expect(orphaned, "baselines no shot compares (a renamed or removed story or state): delete them").toEqual([]);
  });

  it("every baseline is a PNG, and no two shots share a file", () => {
    const expected = expectedBaselines();
    expect(new Set(expected).size).toBe(expected.length);
    for (const file of filesUnder(DIR)) {
      expect(readFileSync(path.join(ROOT, file)).subarray(1, 4).toString("latin1"), file).toBe("PNG");
    }
  });

  it("each state shot names a story that exists, in the project the states are shot at", () => {
    const ids = STORY_GROUPS.flatMap((group) => group.stories.map((story) => storyId(group.component, story.name)));
    for (const shot of STATE_SHOTS) expect(ids, stateShotName(shot)).toContain(shot.story);
    expect(SHOT_PROJECTS.map((project) => project.name)).toContain(STATE_PROJECT);
  });
});
