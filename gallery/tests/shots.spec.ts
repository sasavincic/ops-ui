import { expect, test } from "@playwright/test";
import { STORY_GROUPS, storyId } from "../../src/stories";
import { BRANDS, REQUIRED_BRAND_VARIABLES } from "../brands";

// A fixed clock: DateInput's today, MonthNav's month and every relative date
// render the same on every run. setFixedTime freezes Date only; the page's
// timers still run in real time until the shot pauses them (see the matrix).
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

  test(`${brand}: the library tokens resolve through the brand (styles/tokens.css)`, async ({ page }) => {
    await page.goto(`/${brand}`);
    // A probe element per colour, painted onto a canvas: the build writes oklch() as lab() (and a
    // hex fallback), and Chromium keeps each colour's space when it serialises, so colours are
    // compared as the sRGB pixel they paint, not as text.
    const read = await page.evaluate(() => {
      const canvas = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!;
      const colour = (value: string) => {
        const probe = document.createElement("i");
        probe.style.color = value;
        document.body.append(probe);
        const computed = getComputedStyle(probe).color;
        probe.remove();
        return paint(computed);
      };
      function paint(css: string) {
        canvas.clearRect(0, 0, 1, 1);
        canvas.fillStyle = "rgb(1 2 3)";
        canvas.fillStyle = css;
        canvas.fillRect(0, 0, 1, 1);
        return [...canvas.getImageData(0, 0, 1, 1).data].join(",");
      }
      const body = getComputedStyle(document.body);
      const rootStyle = getComputedStyle(document.documentElement);
      return {
        declared: ["--color-primary", "--color-external", "--color-success", "--color-surface", "--color-bg", "--color-ink"].filter(
          (name) => rootStyle.getPropertyValue(name).trim() !== "",
        ),
        primary: [colour("var(--color-primary)"), colour("var(--brand-primary)")],
        external: [colour("var(--color-external)"), colour("var(--brand-external, var(--brand-accent))")],
        success: [colour("var(--color-success)"), colour("var(--brand-success, oklch(0.48 0.11 155))")],
        surface: [colour("var(--color-surface)"), colour("var(--brand-surface, oklch(0.975 0.003 250))")],
        bodyBackground: [paint(body.backgroundColor), colour("oklch(1 0 0)")],
        bodyInk: [paint(body.color), colour("var(--brand-ink, oklch(0.21 0.015 255))")],
        font: body.fontFamily,
        touchAction: body.touchAction,
      };
    });
    // Tailwind emits a theme variable only when something uses it: these the kit and base.css do.
    expect(read.declared).toEqual(["--color-primary", "--color-external", "--color-success", "--color-surface", "--color-bg", "--color-ink"]);
    for (const key of ["primary", "external", "success", "surface", "bodyBackground", "bodyInk"] as const) {
      const [token, expected] = read[key].map((rgba) => rgba.split(",").map(Number));
      // The build rounds lab() to four decimals: at most one step per channel.
      for (const [i, channel] of token.entries()) {
        expect(Math.abs(channel - expected[i]), `${key}: ${token} vs ${expected}`).toBeLessThanOrEqual(1);
      }
    }
    expect(read.font).toMatch(/Geist/);
    expect(read.touchAction).toBe("pan-x pan-y");
  });

  test(`${brand}: Geist and Geist Mono really load (not the metric-adjusted fallback)`, async ({ page }) => {
    await page.goto(`/${brand}`);
    // The computed font-family names Geist even when its woff2 never arrives (the fallback face
    // is "GeistSans Fallback", local Arial), and fonts.ready resolves on a failed face too. So ask
    // the FontFaceSet to load each family and require real, loaded faces back.
    const faces = await page.evaluate(async () => {
      await document.fonts.ready;
      const load = async (font: string) => {
        try {
          const loaded = await document.fonts.load(font);
          return loaded.map((face) => `${face.family.replace(/"/g, "")}:${face.status}`);
        } catch (error) {
          return [`error: ${(error as Error).message}`];
        }
      };
      return { sans: await load("16px GeistSans"), mono: await load("13px GeistMono") };
    });
    for (const [family, loaded] of Object.entries(faces)) {
      expect(loaded.length, `${family}: ${loaded.join(", ")}`).toBeGreaterThan(0);
      for (const face of loaded) expect(face, family).toMatch(/^Geist(Sans|Mono):loaded$/);
    }
  });

  // The matrix (spec §11.2): every story x 3 brands x {1440, 375}, 0 changed pixels.
  for (const group of STORY_GROUPS) {
    for (const story of group.stories) {
      const id = storyId(group.component, story.name);
      test(`${brand}/${id}`, async ({ page }) => {
        await page.goto(`/${brand}/${id}`);
        // Hydrated: the story's own mount effects (showModal, toasts pushed on mount) have run.
        await page.locator(`[data-story="${id}"][data-ready]`).waitFor();
        // Freeze the page's timers the moment the story is ready: a toast pushed on mount
        // (toast--stack's "Saved" fades after 6 s of real time) must not race a slow runner, and
        // nothing a shot shows may depend on how long the steps below take. The kit's only
        // timers are that fade and Combobox's blur close; Date stays at FIXED_NOW.
        await page.clock.pauseAt(FIXED_NOW);
        await page.evaluate(() => document.fonts.ready);
        if (story.open) await page.locator(story.open).first().click();
        await expect(page).toHaveScreenshot([brand, `${id}.png`], { fullPage: true });
      });
    }
  }
}
