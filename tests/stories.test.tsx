import { readdirSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { describe, expect, it } from "vitest";
import { STORY_GROUPS, findStory, storyId } from "../src/stories";
import { ROOT } from "./source-files";

// The story registry (spec §11.2): every kit component has stories, they are what the
// gallery shoots (x 3 brands x 2 widths) and what each app's /dev/kit renders.

const COMPONENTS = readdirSync(path.join(ROOT, "src/components"))
  .filter((f) => f.endsWith(".tsx"))
  .map((f) => f.slice(0, -4))
  .sort();
const ALL = STORY_GROUPS.flatMap((group) => group.stories.map((story) => ({ group, story, id: storyId(group.component, story.name) })));

describe("stories", () => {
  it("one group per component file, in file order, each with at least one story", () => {
    expect(COMPONENTS).toHaveLength(37);
    expect(STORY_GROUPS.map((g) => g.component)).toEqual(COMPONENTS);
    for (const group of STORY_GROUPS) expect(group.stories.length, group.component).toBeGreaterThan(0);
  });

  it("ids are unique, URL-safe and found again", () => {
    const ids = ALL.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const { id, story } of ALL) {
      expect(id).toMatch(/^[a-z0-9-]+--[a-z0-9-]+$/);
      expect(findStory(id)?.story).toBe(story);
    }
    expect(findStory("button--nope")).toBeNull();
  });

  it("an `open` selector is scoped to the story frame", () => {
    for (const { id, story } of ALL.filter((s) => s.story.open)) {
      expect(story.open, id).toMatch(/^\[data-story\] /);
    }
  });

  it("the overlays the spec names are covered", () => {
    const ids = ALL.map((s) => s.id);
    for (const expected of [
      "button--matrix",
      "button--matrix-in-a-read-only-scope",
      "dialog--form",
      "sheet--open",
      "date-input--calendar",
      "combobox--open-list",
      "row-menu--open-below",
      "row-menu--opens-upward-on-the-last-row",
      "month-nav--picker-open",
      "toast--stack",
    ]) {
      expect(ids).toContain(expected);
    }
  });

  it("every story renders on the server without throwing", () => {
    // useRouter (Table rows, MonthNav, UrlSelect) needs the App Router mounted, as in the
    // gallery and an app's /dev/kit; nothing navigates during a server render.
    const router = { back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {} };
    for (const { id, story } of ALL) {
      const html = renderToStaticMarkup(<AppRouterContext.Provider value={router}>{story.render()}</AppRouterContext.Provider>);
      expect(html, id).not.toBe("");
    }
  });
});
