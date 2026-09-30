import { expect, test } from "@playwright/test";
import { STORY_GROUPS, storyId } from "../../src/stories";
import { BRANDS, REQUIRED_BRAND_VARIABLES } from "../brands";

// A fixed clock: DateInput's today, MonthNav's month and every relative date
// render the same on every run.
const FIXED_NOW = new Date("2026-09-30T10:00:00");

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(FIXED_NOW);
});

for (const brand of BRANDS) {
  test(`${brand}: the brand reaches :root`, async ({ page }) => {
    await page.goto(`/${brand}`);
    await expect(page.locator("html")).toHaveAttribute("data-brand", brand);
    const values = await page.evaluate(
      (names) => names.map((name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()),
      [...REQUIRED_BRAND_VARIABLES],
    );
    for (const [i, value] of values.entries()) {
      expect(value, REQUIRED_BRAND_VARIABLES[i]).not.toBe("");
    }
  });

  for (const group of STORY_GROUPS) {
    for (const story of group.stories) {
      const id = storyId(group.component, story.name);
      test(`${brand}/${id}`, async ({ page }) => {
        await page.goto(`/${brand}/${id}`);
        const frame = page.locator(`[data-story="${id}"]`);
        await expect(frame).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        if (story.open) await page.locator(story.open).first().click();
        await expect(page).toHaveScreenshot(`${brand}/${id}.png`, { fullPage: true });
      });
    }
  }
}
