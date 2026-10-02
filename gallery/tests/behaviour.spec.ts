import { expect, test, type Page } from "@playwright/test";
import { EN_OPTIONAL_STRINGS, EN_STRINGS } from "../../src/config/strings";
import { STORY_GROUPS, storyId } from "../../src/stories";

// Behaviour the screenshots cannot prove (spec §11.1 "behaviour", §12.0 G4 by hand, automated
// here): the Dialog and Sheet discard prompts, toast lifetimes, the toast hooks and Field messages
// (localized, re-raised, taken away on unmount), DateInput typing and calendar,
// Combobox matching and keyboard, RowMenu placement (trigger and sections since 1.4.0), Input adornments and
// YearInput (1.4.0), the AppSwitcher menu, MonthNav, Segmented at 375, the
// read-only default-deny and the shell (1.5.0: palette, chords, drawer, pull-to-search). One brand is enough: behaviour does not depend on colour.

const FIXED_NOW = new Date("2026-09-30T10:00:00");

async function open(page: Page, id: string) {
  await page.goto(`/workforce/${id}`);
  await page.locator(`[data-story="${id}"][data-ready]`).waitFor();
}

/** Answers the next window.confirm and returns its message. */
function answerConfirm(page: Page, accept: boolean) {
  return new Promise<string>((resolve) => {
    page.once("dialog", async (dialog) => {
      expect(dialog.type()).toBe("confirm");
      resolve(dialog.message());
      await (accept ? dialog.accept() : dialog.dismiss());
    });
  });
}

test.describe("desktop behaviour", () => {
  test.beforeEach(async ({ page }, info) => {
    test.skip(info.project.name !== "1440", "desktop behaviour runs once, at 1440");
    await page.clock.setFixedTime(FIXED_NOW);
  });

  test("the story index is links only, one per story, carrying the /dev/kit contract (spec §3.2)", async ({ page }) => {
    await page.goto("/workforce");
    const expected = STORY_GROUPS.flatMap((group) =>
      group.stories.map((story) => {
        const id = storyId(group.component, story.name);
        return { id, open: story.open ?? null, href: `/workforce/${id}` };
      }),
    );
    const links = page.locator("a[data-story-id]");
    await expect(links).toHaveCount(expected.length);
    const found = await links.evaluateAll((els) =>
      els.map((el) => ({ id: el.getAttribute("data-story-id"), open: el.getAttribute("data-story-open"), href: el.getAttribute("href") })),
    );
    expect(found).toEqual(expected);
    // Never a story on the index: six open a modal on mount, several raise toasts.
    await expect(page.locator("[data-story]")).toHaveCount(0);
    await expect(page.locator("dialog[open], [data-toast]")).toHaveCount(0);
  });

  test("Dialog: ✕ closes a clean dialog at once", async ({ page }) => {
    await open(page, "dialog--form");
    const dialog = page.locator("dialog");
    await expect(dialog).toBeVisible();
    let prompted = false;
    page.on("dialog", () => (prompted = true));
    await dialog.getByRole("button", { name: EN_STRINGS.close, exact: true }).click();
    await expect(dialog).toBeHidden();
    expect(prompted).toBe(false);
  });

  test("Dialog: after typing, ✕ and Cancel ask before discarding", async ({ page }) => {
    await open(page, "dialog--form");
    const dialog = page.locator("dialog");
    await dialog.getByLabel("Notes").fill("Changed my mind");
    const asked = answerConfirm(page, false);
    await dialog.getByRole("button", { name: EN_STRINGS.close, exact: true }).click();
    expect(await asked).toBe(EN_STRINGS.unsavedConfirm);
    await expect(dialog).toBeVisible();
    const askedAgain = answerConfirm(page, false);
    await dialog.getByRole("button", { name: EN_STRINGS.cancel, exact: true }).click();
    expect(await askedAgain).toBe(EN_STRINGS.unsavedConfirm);
    await expect(dialog).toBeVisible();
    const discard = answerConfirm(page, true);
    await dialog.getByRole("button", { name: EN_STRINGS.cancel, exact: true }).click();
    await discard;
    await expect(dialog).toBeHidden();
    // A fresh open is a clean slate.
    await page.getByRole("button", { name: "Edit employment" }).click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: EN_STRINGS.close, exact: true }).click();
    await expect(dialog).toBeHidden();
  });

  test("Sheet: the exit check asks after typing and a Save click disarms it", async ({ page }) => {
    await open(page, "sheet--open");
    const sheet = page.getByRole("dialog", { name: "Ates GmbH" });
    await sheet.getByLabel("Contact person").fill("Mr Ates");
    const asked = answerConfirm(page, false);
    await sheet.getByRole("button", { name: EN_STRINGS.close, exact: true }).click();
    expect(await asked).toBe(EN_STRINGS.unsavedConfirm);
    await expect(sheet).toBeVisible();
    await sheet.getByRole("button", { name: EN_STRINGS.save, exact: true }).click();
    await sheet.getByRole("button", { name: EN_STRINGS.close, exact: true }).click();
    await expect(sheet).toBeHidden();
  });

  test("toasts: a confirmation fades after six seconds, everything else stays until dismissed", async ({ page }) => {
    await page.clock.install({ time: FIXED_NOW });
    await open(page, "toast--stack");
    const toasts = page.locator("[data-toast]");
    await expect(toasts).toHaveCount(4);
    await expect(page.locator('[data-toast="success"]')).toBeVisible();
    // The clock keeps flowing between the push and this line, so only the far side of the six
    // seconds is asserted here; tests/toast.test.tsx pins the 5999 / 6000 ms boundary.
    await page.clock.runFor(6_100);
    await expect(page.locator('[data-toast="success"]')).toHaveCount(0);
    await page.clock.runFor(60 * 60 * 1000);
    await expect(toasts).toHaveCount(3);
    await page.locator('[data-toast="warning"]').getByRole("button", { name: EN_STRINGS.close }).click();
    await expect(toasts).toHaveCount(2);
    // The action dismisses its toast and acts.
    await page.getByRole("button", { name: "Show worksites" }).click();
    await expect(page.locator('[data-toast="danger"]')).toHaveCount(0);
  });

  test("toasts: inside an open dialog they are drawn in the dialog and can be dismissed", async ({ page }) => {
    await open(page, "toast--inside-an-open-dialog");
    const dialog = page.locator("dialog[open]");
    const toast = dialog.locator('[data-toast="danger"]');
    await expect(toast).toContainText("The worksite already has a price starting on that date.");
    await toast.getByRole("button", { name: EN_STRINGS.close }).click();
    await expect(page.locator("[data-toast]")).toHaveCount(0);
  });

  test("toast hooks: each raises its message localized; a new trigger raises it again; unmounting takes it away", async ({ page }) => {
    await open(page, "toast--raised-by-components-localized");
    await page.clock.pauseAt(FIXED_NOW); // "Saved" must not fade in the middle of the test
    const toasts = page.locator("[data-toast]");
    const toast = (tone: string, text: string) => page.locator(`[data-toast="${tone}"]`, { hasText: text });
    await expect(toasts).toHaveCount(4);
    // ErrorToast, SheetError, NoticeToast, SuccessToast: each through the provider's localize.
    await expect(toast("danger", "Najprej zaključi aktivna delovišča.")).toHaveCount(1);
    await expect(toast("danger", "Vodilo že ima zapis stranke.")).toHaveCount(1);
    await expect(toast("info", "Že načrtovano: nič se ni spremenilo.")).toHaveCount(1);
    await expect(toast("success", "Shranjeno")).toHaveCount(1);
    await expect(toasts.filter({ hasText: "End its active worksites first." })).toHaveCount(0);

    // Dismissed, then the same message again on the next submit (a new trigger).
    await toast("danger", "Najprej").getByRole("button", { name: EN_STRINGS.close }).click();
    await expect(toasts).toHaveCount(3);
    await page.getByRole("button", { name: "Submit again" }).click();
    await expect(toasts).toHaveCount(4);
    await expect(toast("danger", "Najprej zaključi aktivna delovišča.")).toHaveCount(1);

    // Unmounting the components takes every toast they raised with them.
    await page.getByRole("button", { name: "Unmount" }).click();
    await expect(toasts).toHaveCount(0);
    await page.getByRole("button", { name: "Mount" }).click();
    await expect(toasts).toHaveCount(4);
  });

  test("Field: an error is raised localized as it appears, a warning on focus only, and focus re-raises", async ({ page }) => {
    await open(page, "toast--field-messages-localized");
    await page.clock.pauseAt(FIXED_NOW);
    const toasts = page.locator("[data-toast]");
    const error = page.locator('[data-toast="danger"]');
    const warning = page.locator('[data-toast="warning"]');
    await expect(toasts).toHaveCount(1);
    await expect(error).toContainText("PIN: Neveljaven EMŠO.");
    await expect(warning).toHaveCount(0); // a warning waits for focus
    await error.getByRole("button", { name: EN_STRINGS.close }).click();
    await expect(toasts).toHaveCount(0);
    await page.getByLabel("Valid to").focus();
    await expect(warning).toContainText("Valid to: Prebrano kot 31-12-2027 (ročno)");
    await page.getByLabel("PIN").focus(); // the dismissed error comes back where it is fixed
    await expect(error).toContainText("PIN: Neveljaven EMŠO.");
    await expect(toasts).toHaveCount(2);
  });

  test("DateInput: typing, masking, reverting, limits", async ({ page }) => {
    await open(page, "date-input--states");
    const empty = page.getByLabel("Empty", { exact: true });
    await empty.pressSequentially("23111989");
    await expect(empty).toHaveValue("23-11-1989");
    const withDate = page.getByLabel("With a date");
    await withDate.fill("31.02.1990");
    await withDate.blur();
    await expect(withDate).toHaveValue("18-09-2026");
    await withDate.fill("5.6.84");
    await withDate.blur();
    await expect(withDate).toHaveValue("05-06-1984");
    const beforeMin = page.getByLabel("Before its minimum");
    await expect(beforeMin).toHaveAttribute("aria-invalid", "true");
    expect(await beforeMin.evaluate((el: HTMLInputElement) => el.validationMessage)).toBe(
      EN_STRINGS.datePicker.earliest.replace("{date}", "01-10-2026"),
    );
    await expect(page.getByLabel("In a read-only scope")).toBeDisabled();
  });

  test("DateInput: the named field posts the ISO date it shows, typed, picked or cleared", async ({ page }) => {
    await open(page, "date-input--states");
    // The uncontrolled field under `name` is the one a form posts. Every step writes a date other
    // than its default, so a hidden input stuck on defaultValue cannot pass.
    const field = page.getByLabel("Uncontrolled, posting its ISO value");
    const posted = page.locator('input[type="hidden"][name="startDate"]');
    await expect(posted).toHaveCount(1);
    await expect(posted).toHaveValue("1989-11-23");

    await field.fill("05061984");
    await field.blur();
    await expect(field).toHaveValue("05-06-1984");
    await expect(posted).toHaveValue("1984-06-05");

    await field.click();
    const calendar = page.getByRole("dialog", { name: EN_STRINGS.datePicker.openCalendar });
    await expect(calendar.getByRole("button", { name: "June 1984" })).toBeVisible();
    await calendar.getByRole("button", { name: "12-06-1984" }).click();
    await expect(calendar).toBeHidden();
    await expect(field).toHaveValue("12-06-1984");
    await expect(posted).toHaveValue("1984-06-12");

    await field.click();
    await calendar.getByRole("button", { name: EN_STRINGS.datePicker.clear }).click();
    await expect(field).toHaveValue("");
    await expect(posted).toHaveValue("");
  });

  test("DateInput: the calendar goes year → month → day, walks with the keyboard, Today and Clear", async ({ page }) => {
    // Without reduced motion: under prefers-reduced-motion base.css gives EVERY property a
    // 0.01ms transition, so the panel is still `visibility: hidden` when the kit focuses the
    // day and the first ↓ leaves focus in the field (both apps today; spec §12.4 follow-up).
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await open(page, "date-input--calendar");
    const input = page.getByLabel("First working day");
    await input.click();
    const calendar = page.getByRole("dialog", { name: EN_STRINGS.datePicker.openCalendar });
    await expect(calendar).toBeVisible();
    await calendar.getByRole("button", { name: "September 2026" }).click();
    await calendar.getByRole("button", { name: "2026" }).click();
    await calendar.getByRole("button", { name: EN_STRINGS.datePicker.previousYears }).click();
    await calendar.getByRole("button", { name: "2013", exact: true }).click();
    await calendar.getByRole("button", { name: "Mar", exact: true }).click();
    await calendar.getByRole("button", { name: "14-03-2013" }).click();
    await expect(calendar).toBeHidden();
    await expect(input).toHaveValue("14-03-2013");

    // Keyboard: ↓ opens on the picked day, arrows walk, Enter on a day picks it.
    const focusedDay = () => page.evaluate(() => document.activeElement?.getAttribute("data-day") ?? null);
    await input.press("ArrowDown");
    await expect.poll(focusedDay).toBe("2013-03-14");
    await page.keyboard.press("ArrowRight");
    await expect.poll(focusedDay).toBe("2013-03-15");
    await page.keyboard.press("ArrowDown");
    await expect.poll(focusedDay).toBe("2013-03-22");
    await page.keyboard.press("PageDown");
    await expect.poll(focusedDay).toBe("2013-04-22");
    await page.keyboard.press("Enter");
    await expect(input).toHaveValue("22-04-2013");

    await input.click();
    await calendar.getByRole("button", { name: EN_STRINGS.datePicker.today }).click();
    await expect(input).toHaveValue("30-09-2026");
    await input.click();
    await calendar.getByRole("button", { name: EN_STRINGS.datePicker.clear }).click();
    await expect(input).toHaveValue("");
    await input.click();
    await page.keyboard.press("Escape");
    await expect(calendar).toBeHidden();
  });

  test("DateInput: days outside min/max cannot be picked", async ({ page }) => {
    await open(page, "date-input--calendar-with-limits");
    await page.getByLabel("First working day").click();
    const calendar = page.getByRole("dialog", { name: EN_STRINGS.datePicker.openCalendar });
    await expect(calendar.getByRole("button", { name: "09-09-2026" })).toBeDisabled();
    await expect(calendar.getByRole("button", { name: "10-09-2026" })).toBeEnabled();
    await calendar.getByRole("button", { name: EN_STRINGS.datePicker.nextMonth }).click();
    await expect(calendar.getByRole("button", { name: "06-10-2026" })).toBeDisabled();
  });

  test("Combobox: words in any order, arrows walk and wrap past a disabled row, Enter picks without submitting", async ({ page }) => {
    await open(page, "combobox--open-list");
    const form = page.locator("form[data-submits]");
    const input = page.getByRole("combobox");
    const options = page.getByRole("option");
    // The highlighted row is the one painted bg-surface-raised outright (the others only on hover).
    const NAMES = ["Barišić, Josip", "Nguyen, Dinh Hai", "Hodžić, Aldin", "Mehmedović, Senad", "Šabanović, Emir"];
    const highlighted = () =>
      page.evaluate(
        (names) =>
          [...document.querySelectorAll('[role="option"]')]
            .filter((el) => el.classList.contains("bg-surface-raised"))
            .map((el) => names.find((name) => el.textContent?.includes(name)) ?? el.textContent),
        NAMES,
      );

    // The whole list: Barišić, Nguyen, Hodžić (disabled), Mehmedović, Šabanović.
    await input.focus();
    await expect(page.getByRole("listbox")).toBeVisible();
    await expect(options.filter({ hasText: "Hodžić, Aldin" })).toHaveAttribute("aria-disabled", "true");
    expect(await highlighted()).toEqual([]); // no highlight until the person steers
    const walk: [string, string][] = [
      ["ArrowDown", "Barišić, Josip"], // the first arrow lands on the first row
      ["ArrowDown", "Nguyen, Dinh Hai"],
      ["ArrowDown", "Mehmedović, Senad"], // Hodžić is disabled: skipped
      ["ArrowUp", "Nguyen, Dinh Hai"],
      ["ArrowUp", "Barišić, Josip"],
      ["ArrowUp", "Šabanović, Emir"], // wraps to the last pickable row
      ["ArrowDown", "Barišić, Josip"], // and back to the first
      ["ArrowDown", "Nguyen, Dinh Hai"],
      ["ArrowDown", "Mehmedović, Senad"],
    ];
    for (const [key, expected] of walk) {
      await input.press(key);
      expect(await highlighted(), `${key} → ${expected}`).toEqual([expected]);
    }
    await input.press("Enter");
    await expect(input).toHaveValue("Mehmedović, Senad");
    await expect(form).toHaveAttribute("data-value", "w4");
    await expect(form).toHaveAttribute("data-submits", "0");
    await expect(page.getByRole("listbox")).toBeHidden();

    // Words in any order, punctuation ignored; Enter picks the one match.
    await input.fill("dinh nguyen");
    await expect(options.filter({ hasText: "Nguyen, Dinh Hai" })).toHaveCount(1);
    await expect(options.filter({ hasText: "Barišić" })).toHaveCount(0);
    await input.press("ArrowDown");
    await input.press("Enter");
    await expect(input).toHaveValue("Nguyen, Dinh Hai");
    await expect(form).toHaveAttribute("data-value", "w2");
    await expect(form).toHaveAttribute("data-submits", "0");

    // Diacritics folded; a disabled row is listed but can be picked neither by keys nor by a click.
    await input.fill("hodzic");
    const hodzic = options.filter({ hasText: "Hodžić, Aldin" });
    await expect(hodzic).toHaveAttribute("aria-disabled", "true");
    await input.press("ArrowDown");
    expect(await highlighted()).toEqual([]);
    await input.press("Enter");
    await hodzic.click({ force: true }); // Playwright would wait for an enabled row; the kit must ignore it
    await expect(form).toHaveAttribute("data-value", "");
    await expect(form).toHaveAttribute("data-submits", "0");
    await input.fill("bosnia");
    await expect(options).toHaveCount(2); // the clear row and Šabanović, found by a keyword
    await input.press("Escape");
    await expect(page.getByRole("listbox")).toBeHidden();
  });

  test("RowMenu: opens below, or upward on the last row, and closes outside or on Escape", async ({ page }) => {
    await open(page, "row-menu--open-below");
    let button = page.getByRole("button", { name: "Actions: Passport" });
    await button.click();
    let menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    let [b, m] = [await button.boundingBox(), await menu.boundingBox()];
    expect(m!.y).toBeGreaterThanOrEqual(b!.y + b!.height);
    await expect(menu.getByRole("menuitem", { name: "Replace scan" })).toBeDisabled();
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();

    await open(page, "row-menu--opens-upward-on-the-last-row");
    button = page.getByRole("button", { name: "Actions: A1 certificate" });
    await button.click();
    menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    [b, m] = [await button.boundingBox(), await menu.boundingBox()];
    expect(m!.y + m!.height).toBeLessThanOrEqual(b!.y);
    await page.mouse.click(5, 5);
    await expect(menu).toBeHidden();
  });

  test("RowMenu (1.4.0): a labelled trigger opens headed sections; a pick closes it; it stays on screen at the left edge", async ({ page }) => {
    await open(page, "row-menu--label-trigger-and-sections");
    const trigger = page.getByRole("button", { name: "AI tools" });
    await expect(trigger).toHaveAttribute("title", "AI extraction tools");
    await expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    // The ungrouped item first, then two named groups.
    await expect(menu.getByRole("menuitem").first()).toHaveText("Reset to AI draft");
    const bulk = menu.getByRole("group", { name: "Bulk actions" });
    await expect(menu.getByRole("group", { name: "Current page" }).getByRole("menuitem")).toHaveText(["Extract page"]);
    await expect(bulk.getByRole("menuitem")).toHaveText(["Extract un-reviewed (3)", "Re-extract all"]);
    await expect(bulk.getByRole("menuitem", { name: "Re-extract all" })).toBeDisabled();
    // The trigger sits at the content's left edge: the menu lines up with its left edge, below it.
    const [b, m] = [await trigger.boundingBox(), await menu.boundingBox()];
    expect(m!.x).toBeGreaterThanOrEqual(8);
    expect(Math.abs(m!.x - b!.x)).toBeLessThanOrEqual(1);
    expect(m!.y).toBeGreaterThanOrEqual(b!.y + b!.height);
    await menu.getByRole("menuitem", { name: "Extract page" }).click();
    await expect(menu).toBeHidden();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await trigger.click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toBeHidden();
    await trigger.click();
    await page.mouse.click(1000, 600);
    await expect(page.getByRole("menu")).toBeHidden();
  });

  test("RowMenu (1.4.0): sections open upward on the last row and follow the button when the page scrolls", async ({ page }) => {
    await open(page, "row-menu--sections-open-upward-on-the-last-row");
    const button = page.getByRole("button", { name: "Review actions" });
    await button.click();
    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    // Deterministic under load (1.6.0): the button and the menu are measured in ONE frame, after two
    // real animation frames, and polled until the menu sits where it belongs. Two separate
    // boundingBox() calls could straddle the menu's re-render after a scroll (it repositions from a
    // scroll listener through React state), which flaked the follow-scroll half under load.
    const geometry = () =>
      page.evaluate(
        () =>
          new Promise<{ buttonTop: number; gap: number; rightEdges: number }>((resolve) =>
            requestAnimationFrame(() =>
              requestAnimationFrame(() => {
                const b = document.querySelector('[aria-label="Review actions"]')!.getBoundingClientRect();
                const m = document.querySelector('[role="menu"]')!.getBoundingClientRect();
                resolve({ buttonTop: b.top, gap: b.top - m.bottom, rightEdges: Math.abs(m.right - b.right) });
              }),
            ),
          ),
      );
    // Upward: the menu's bottom is at or above the button's top; right edges lined up (the ⋯ is
    // at the right of its row).
    const placed = (g: { gap: number; rightEdges: number }) => g.gap >= 0 && g.rightEdges <= 1;
    await expect.poll(async () => placed(await geometry())).toBe(true);
    const before = await geometry();
    await expect(menu.getByRole("group")).toHaveCount(3);
    await expect(menu.getByRole("menuitem", { name: "Delete" })).toBeVisible();
    // Follow-scroll: make the page scroll, scroll it, the menu moves with its button.
    await page.evaluate(() => {
      const spacer = document.createElement("div");
      spacer.style.height = "1000px";
      document.body.append(spacer);
      window.scrollTo(0, 200);
    });
    await expect.poll(async () => {
      const g = await geometry();
      return g.buttonTop < before.buttonTop && placed(g);
    }).toBe(true);
    const after = await geometry();
    expect(after.gap).toBeCloseTo(before.gap, 0);
    await expect(menu).toBeVisible();
  });

  test("Input (1.4.0): the text keeps clear of a measured adornment, which is the field's description and passes clicks through", async ({ page }) => {
    await open(page, "field--adornments");
    for (const [label, side] of [
      ["Wall thickness", "suffix"],
      ["Design pressure", "suffix"],
      ["Hourly rate", "prefix"],
      ["Hourly rate", "suffix"],
      ["Transport cost, large", "prefix"],
      ["Narrow, in a grid cell", "suffix"],
    ] as const) {
      const input = page.getByLabel(label, { exact: true });
      const { padding, adornment, inputBox, box } = await input.evaluate((el: HTMLInputElement, which) => {
        const span = el.parentElement!.querySelector<HTMLElement>(`[data-ops-adornment="${which}"]`)!;
        const style = getComputedStyle(el);
        return {
          padding: parseFloat(which === "prefix" ? style.paddingLeft : style.paddingRight),
          adornment: span.getBoundingClientRect().width,
          inputBox: el.getBoundingClientRect().toJSON(),
          box: span.getBoundingClientRect().toJSON(),
        };
      }, side);
      // 12px from the edge, the adornment's measured width, 6px to the text.
      expect(Math.abs(padding - (12 + adornment + 6)), `${label} ${side}`).toBeLessThanOrEqual(1);
      // Inside the field, vertically centred.
      expect(box.left).toBeGreaterThanOrEqual(inputBox.left);
      expect(box.right).toBeLessThanOrEqual(inputBox.right);
      expect(Math.abs(box.top + box.height / 2 - (inputBox.top + inputBox.height / 2))).toBeLessThanOrEqual(1);
    }
    const mm = page.getByLabel("Wall thickness", { exact: true });
    await expect(mm).toHaveAccessibleDescription(/mm/);
    await expect(mm).toHaveValue("4.5");
    await expect(page.getByLabel("Hourly rate", { exact: true })).toHaveAccessibleDescription(/€.*\/h/);
    // A click on the unit lands in the field (the input under it takes the press, which is why
    // Playwright's own click on the span would refuse: it clicks at the span's centre instead).
    const unit = (await page.locator('[data-ops-adornment="suffix"]', { hasText: "°C" }).boundingBox())!;
    await page.mouse.click(unit.x + unit.width / 2, unit.y + unit.height / 2);
    await expect(page.getByLabel("Design temperature", { exact: true })).toBeFocused();
    await page.keyboard.type("80");
    await expect(page.getByLabel("Design temperature", { exact: true })).toHaveValue("80");
  });

  test("YearInput: typing four digits, two read as a year, unreadable text reverts, limits, the posted year", async ({ page }) => {
    await open(page, "year-input--states");
    const empty = page.getByLabel("Empty", { exact: true });
    await empty.pressSequentially("2019x");
    await expect(empty).toHaveValue("2019");
    await empty.fill("85");
    await empty.blur();
    await expect(empty).toHaveValue("1985");
    await empty.fill("202");
    await empty.blur();
    await expect(empty).toHaveValue("1985");
    await empty.fill("");
    await empty.blur();
    await expect(empty).toHaveValue("");

    const late = page.getByLabel("After its maximum");
    await expect(late).toHaveAttribute("aria-invalid", "true");
    expect(await late.evaluate((el: HTMLInputElement) => el.validationMessage)).toBe(EN_STRINGS.datePicker.latest.replace("{date}", "2027"));
    await late.fill("2026");
    await expect(late).not.toHaveAttribute("aria-invalid", "true");
    await expect(page.getByLabel("In a read-only scope")).toBeDisabled();
    await expect(page.getByLabel("Disabled", { exact: true })).toBeDisabled();

    const field = page.getByLabel("Uncontrolled, posting its year");
    const posted = page.locator('input[type="hidden"][name="manufactureYear"]');
    await expect(posted).toHaveValue("2024");
    await field.fill("2018");
    await expect(posted).toHaveValue("2018");
    await field.click();
    const picker = page.getByRole("dialog", { name: EN_OPTIONAL_STRINGS.yearPicker.openPicker });
    await picker.getByRole("button", { name: "2021", exact: true }).click();
    await expect(picker).toBeHidden();
    await expect(field).toHaveValue("2021");
    await expect(posted).toHaveValue("2021");
    await field.click();
    await picker.getByRole("button", { name: EN_STRINGS.datePicker.clear }).click();
    await expect(field).toHaveValue("");
    await expect(posted).toHaveValue("");
  });

  test("YearInput: the picker pages, walks with the keyboard, This year and Clear, Escape", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await open(page, "year-input--picker");
    const input = page.getByLabel("Year of manufacture");
    await input.click();
    const picker = page.getByRole("dialog", { name: EN_OPTIONAL_STRINGS.yearPicker.openPicker });
    await expect(picker).toBeVisible();
    await expect(picker).toContainText("2016 – 2027");
    await expect(picker.getByRole("button", { name: "2024", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(picker.getByRole("button", { name: "2026", exact: true })).toHaveAttribute("aria-current", "date");
    await picker.getByRole("button", { name: EN_STRINGS.datePicker.previousYears }).click();
    await expect(picker).toContainText("2004 – 2015");
    await picker.getByRole("button", { name: "2009", exact: true }).click();
    await expect(picker).toBeHidden();
    await expect(input).toHaveValue("2009");

    // Keyboard: ↓ opens on the year, arrows walk a year or a row, PageDown a page, Enter picks.
    const focusedYear = () => page.evaluate(() => document.activeElement?.getAttribute("data-year") ?? null);
    await input.press("ArrowDown");
    await expect.poll(focusedYear).toBe("2009");
    await page.keyboard.press("ArrowRight");
    await expect.poll(focusedYear).toBe("2010");
    await page.keyboard.press("ArrowDown");
    await expect.poll(focusedYear).toBe("2013");
    await page.keyboard.press("PageDown");
    await expect.poll(focusedYear).toBe("2025");
    await expect(picker).toContainText("2016 – 2027");
    await page.keyboard.press("End");
    await expect.poll(focusedYear).toBe("2027");
    await page.keyboard.press("Enter");
    await expect(input).toHaveValue("2027");
    await expect(input).toBeFocused();

    await input.click();
    await picker.getByRole("button", { name: EN_OPTIONAL_STRINGS.yearPicker.thisYear }).click();
    await expect(input).toHaveValue("2026");
    await input.click();
    await picker.getByRole("button", { name: EN_STRINGS.datePicker.clear }).click();
    await expect(input).toHaveValue("");
    await input.click();
    await page.keyboard.press("Escape");
    await expect(picker).toBeHidden();
    // Enter in the open field settles instead of submitting; the picker button toggles it.
    await page.getByRole("button", { name: EN_OPTIONAL_STRINGS.yearPicker.openPicker }).click();
    await expect(picker).toBeVisible();
    await page.mouse.click(1200, 800);
    await expect(picker).toBeHidden();
  });

  test("YearInput: years outside min/max cannot be picked", async ({ page }) => {
    await open(page, "year-input--picker-with-limits");
    await page.getByLabel("Year of manufacture").click();
    const picker = page.getByRole("dialog", { name: EN_OPTIONAL_STRINGS.yearPicker.openPicker });
    await expect(picker.getByRole("button", { name: "2018", exact: true })).toBeDisabled();
    await expect(picker.getByRole("button", { name: "2019", exact: true })).toBeEnabled();
    await expect(picker.getByRole("button", { name: "2027", exact: true })).toBeEnabled();
    await picker.getByRole("button", { name: EN_STRINGS.datePicker.nextYears }).click();
    await expect(picker.getByRole("button", { name: "2028", exact: true })).toBeDisabled();
  });

  test("AppSwitcher: the menu lists the apps with a URL, the current one without a link; keyboard, Tab, Escape and an outside press close it", async ({ page }) => {
    await open(page, "app-switcher--closed");
    const trigger = page.getByRole("button", { name: "Switch app: Workforce Ops" });
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    const menu = page.getByRole("menu", { name: "Switch app" });
    await expect(menu).toBeVisible();
    const [b, m] = [await trigger.boundingBox(), await menu.boundingBox()];
    expect(m!.y).toBeGreaterThanOrEqual(b!.y + b!.height);

    // FinaOps has no URL (a demo until the end of 2026): not listed. The current app has no link.
    const items = menu.getByRole("menuitem");
    await expect(items).toHaveText(["Workforce Ops", "PrefabOps"]);
    await expect(menu.getByText("FinaOps")).toHaveCount(0);
    const current = items.nth(0);
    await expect(current).toHaveAttribute("aria-current", "page");
    await expect(current).toHaveAttribute("title", "Current app");
    expect(await current.evaluate((el) => el.tagName)).toBe("SPAN");
    await expect(menu.getByRole("link")).toHaveCount(0); // a role="menuitem" anchor is not a "link"
    const prefab = items.nth(1);
    expect(await prefab.evaluate((el) => el.tagName)).toBe("A");
    await expect(prefab).toHaveAttribute("href", "https://prefab-ops-platform.vercel.app");
    await expect(prefab).not.toHaveAttribute("target", /.+/);

    // Keyboard: the menu opens on the current app; arrows wrap, Home / End.
    await expect(current).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(prefab).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(current).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await expect(prefab).toBeFocused();
    await page.keyboard.press("Home");
    await expect(current).toBeFocused();
    await page.keyboard.press("End");
    await expect(prefab).toBeFocused();

    // Escape closes and returns focus to the trigger.
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");

    // ArrowDown on the trigger opens it; Tab closes it.
    await page.keyboard.press("ArrowDown");
    await expect(menu).toBeVisible();
    await expect(current).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(menu).toBeHidden();

    // Enter on the trigger opens it; an outside press closes it.
    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(menu).toBeVisible();
    await page.mouse.click(1000, 600);
    await expect(menu).toBeHidden();

    // A click on the trigger toggles it.
    await trigger.click();
    await expect(menu).toBeVisible();
    await trigger.click();
    await expect(menu).toBeHidden();
  });

  test("MonthNav: arrows link to the next and previous month; the picker replaces the month", async ({ page }) => {
    await open(page, "month-nav--closed");
    await expect(page.getByRole("link", { name: EN_STRINGS.prevMonth })).toHaveAttribute("href", /m=2026-06$/);
    await expect(page.getByRole("link", { name: EN_STRINGS.nextMonth })).toHaveAttribute("href", /m=2026-08$/);
    await page.getByRole("button", { name: "July 2026" }).click();
    const picker = page.getByRole("dialog", { name: EN_STRINGS.pickMonth });
    await expect(picker.getByRole("button", { name: "Jul" })).toHaveAttribute("aria-pressed", "true");
    await picker.getByRole("button", { name: EN_STRINGS.nextYear }).click();
    await expect(picker).toContainText("2027");
    await picker.getByRole("button", { name: "Mar" }).click();
    await expect(page).toHaveURL(/\?m=2027-03$/);
  });

  test("read-only scope: only readOnlySafe controls render", async ({ page }) => {
    await open(page, "button--matrix-in-a-read-only-scope");
    const frame = page.locator("[data-story]");
    await expect(frame.getByRole("button", { name: "With icon" })).toHaveCount(0);
    await expect(frame.getByRole("button", { name: "readOnlySafe" })).toHaveCount(6);
    await expect(frame.getByRole("link", { name: "ButtonLink" })).toHaveCount(0);
    await expect(frame.getByRole("link", { name: "readOnlySafe link" })).toHaveCount(1);
    await expect(frame.getByRole("link", { name: "Open PDF" })).toHaveCount(1);
    await expect(frame.getByRole("button", { name: "Admin edit" })).toHaveCount(0);
  });
});

test.describe("shell behaviour (1.5.0)", () => {
  test.beforeEach(async ({ page }, info) => {
    test.skip(info.project.name !== "1440", "desktop behaviour runs once, at 1440");
    await page.clock.setFixedTime(FIXED_NOW);
  });

  test("AppFrame: ⌘K and the Search button open the palette; typing ranks; arrows move; Escape closes", async ({ page }) => {
    await open(page, "app-frame--closed");
    const palette = page.getByRole("dialog", { name: "Search" });
    await expect(palette).toHaveCount(0);
    await page.keyboard.press("Control+k");
    await expect(palette).toBeVisible();
    const input = palette.getByRole("textbox", { name: "Search" });
    await expect(input).toBeFocused();
    // Idle: the Go to and Create new shortcuts.
    await expect(palette.getByRole("heading", { name: "Go to" })).toBeVisible();
    await expect(palette.getByRole("button", { name: "New client" })).toBeVisible();
    await input.fill("an");
    await expect(palette.getByRole("button", { name: /Ana Novak/ })).toBeVisible();
    await expect(palette.getByRole("button", { name: "Ask the assistant: “an”" })).toBeVisible();
    // The first row is selected; ArrowDown moves the selection, never past the last row.
    const selected = () => palette.locator("[data-row-index].bg-primary-subtle");
    await expect(selected()).toHaveAttribute("data-row-index", "0");
    await input.press("ArrowDown");
    await expect(selected()).toHaveAttribute("data-row-index", "1");
    // A pointer resting over a row selects nothing; a pointer that moves does.
    const third = palette.locator('[data-row-index="2"]');
    const box = (await third.boundingBox())!;
    await page.mouse.move(box.x + 20, box.y + 5);
    await page.mouse.move(box.x + 24, box.y + 6);
    await expect(selected()).toHaveAttribute("data-row-index", "2");
    await input.press("Escape");
    await expect(palette).toHaveCount(0);
    // The sidebar's Search button opens it again, emptied.
    await page.locator("aside").getByRole("button", { name: /Search/ }).click();
    await expect(palette).toBeVisible();
    await expect(palette.getByRole("textbox")).toHaveValue("");
    // A press on the backdrop closes it.
    await page.mouse.click(20, 880);
    await expect(palette).toHaveCount(0);
  });

  test("AppFrame: holding ⌥ turns the workspace icons into their numbers; ⌥2 opens the second workspace", async ({ page }) => {
    await open(page, "app-frame--closed");
    const aside = page.locator("aside");
    const second = aside.getByRole("link", { name: /Compliance/ });
    await expect(second).toHaveAttribute("title", "Alt+2");
    await page.keyboard.down("Alt");
    await expect(second.locator("span")).toHaveText("2");
    await page.keyboard.up("Alt");
    await expect(second.locator("span")).toHaveCount(0);
    await page.keyboard.press("Alt+Digit2");
    await expect(page).toHaveURL(/\/compliance$/);
  });
});

/**
 * 1.7.0: the touch floor's promise for the kit's own small targets. Each story wraps its controls in
 * [data-ops-touch]; on the phone (touch, coarse pointer, no hover) every one is at least 44px tall
 * and the icon-only ones 44px wide, the Switch's track keeps its 40 x 24 look inside a 54 x 46
 * target. On the 375 window (a fine pointer that hovers) the same stories keep the 1.6 sizes: the
 * floor paints nothing there.
 */
test.describe("touch floor (1.7.0)", () => {
  test.beforeEach(({}, info) => {
    test.skip(!info.project.name.startsWith("375"), "the floor is a phone matter: 375 (off) and 375-touch (on)");
  });

  type Size = { width: number; height: number };
  const sizeOf = (page: Page, selector: string) =>
    page.locator(selector).first().evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { width: r.width, height: r.height };
    });
  const smallest = (page: Page, selector: string) =>
    page.locator(selector).evaluateAll((els) => ({
      count: els.length,
      width: Math.min(...els.map((el) => el.getBoundingClientRect().width)),
      height: Math.min(...els.map((el) => el.getBoundingClientRect().height)),
    }));
  /** On the phone: at least 44 (both sides when `square`); on the window: exactly the 1.6 size. */
  function floor(size: Size, touch: boolean, before: { height: number; width?: number }, square = false) {
    if (touch) {
      expect(size.height).toBeGreaterThanOrEqual(44);
      if (square) expect(size.width).toBeGreaterThanOrEqual(44);
    } else {
      expect(size.height).toBeCloseTo(before.height, 0);
      if (before.width !== undefined) expect(size.width).toBeCloseTo(before.width, 0);
    }
  }
  const tapOrClick = async (page: Page, selector: string, touch: boolean) =>
    touch ? page.locator(selector).first().tap() : page.locator(selector).first().click();

  test("Dialog: the ✕ is 44 x 44", async ({ page }, info) => {
    const touch = info.project.name === "375-touch";
    await open(page, "dialog--under-the-touch-floor");
    floor(await sizeOf(page, `dialog[open] button[aria-label="${EN_STRINGS.close}"]`), touch, { height: 34 }, true);
  });

  test("toast: the ✕ is 44 x 44 and the toast keeps its height", async ({ page }, info) => {
    const touch = info.project.name === "375-touch";
    await open(page, "toast--under-the-touch-floor");
    floor(await sizeOf(page, `[data-toast] button[aria-label="Close"]`), touch, { height: 26 }, true);
    const toast = await sizeOf(page, "[data-toast]");
    await open(page, "toast--stack");
    expect(toast.height).toBe((await sizeOf(page, '[data-toast="success"]')).height);
  });

  test("DateInput: the calendar button, the arrows, the title, the days and Today / Clear", async ({ page }, info) => {
    const touch = info.project.name === "375-touch";
    await open(page, "date-input--calendar-under-the-touch-floor");
    floor(await sizeOf(page, `[data-story] button[aria-label="${EN_STRINGS.datePicker.openCalendar}"]`), touch, { height: 28, width: 28 }, true);
    // The text keeps clear of the larger button.
    const field = page.locator("[data-story] input[role=combobox]");
    const padding = await field.evaluate((el) => parseFloat(getComputedStyle(el).paddingRight));
    expect(padding).toBe(touch ? 48 : 36);
    await tapOrClick(page, "[data-story] input[role=combobox]", touch);
    const days = await smallest(page, "[data-day]");
    expect(days.count).toBe(42);
    floor(days, touch, { height: 36 });
    const arrows = await smallest(
      page,
      `button[aria-label="${EN_STRINGS.datePicker.previousMonth}"], button[aria-label="${EN_STRINGS.datePicker.nextMonth}"]`,
    );
    expect(arrows.count).toBe(2);
    floor(arrows, touch, { height: 32, width: 32 }, true);
    floor(await sizeOf(page, `[role=dialog] button[title="${EN_STRINGS.datePicker.chooseMonth}"]`), touch, { height: 28 });
    for (const name of [EN_STRINGS.datePicker.today, EN_STRINGS.datePicker.clear]) {
      const size = await sizeOf(page, `[role=dialog] button:text-is("${name}")`);
      if (touch) expect(size.height).toBeGreaterThanOrEqual(44);
    }
  });

  test("YearInput: the field's button, the arrows and This year / Clear", async ({ page }, info) => {
    const touch = info.project.name === "375-touch";
    await open(page, "year-input--picker-under-the-touch-floor");
    const yp = EN_OPTIONAL_STRINGS.yearPicker;
    floor(await sizeOf(page, `[data-story] button[aria-label="${yp.openPicker}"]`), touch, { height: 28, width: 28 }, true);
    await tapOrClick(page, "[data-story] input[role=combobox]", touch);
    const arrows = await smallest(page, `button[aria-label="${EN_STRINGS.datePicker.previousYears}"], button[aria-label="${EN_STRINGS.datePicker.nextYears}"]`);
    expect(arrows.count).toBe(2);
    floor(arrows, touch, { height: 32, width: 32 }, true);
    const years = await smallest(page, "[role=dialog] button[aria-pressed]");
    if (touch) expect(years.height).toBeGreaterThanOrEqual(44);
    for (const name of [yp.thisYear, EN_STRINGS.datePicker.clear]) {
      const size = await sizeOf(page, `[role=dialog] button:text-is("${name}")`);
      if (touch) expect(size.height).toBeGreaterThanOrEqual(44);
    }
  });

  test("FileInput is 44px tall", async ({ page }, info) => {
    const touch = info.project.name === "375-touch";
    await open(page, "field--under-the-touch-floor");
    const size = await sizeOf(page, "[data-story] input[type=file]");
    if (touch) expect(size.height).toBeGreaterThanOrEqual(44);
    else expect(size.height).toBeLessThan(44);
  });

  test("Switch: the track keeps its look, the target around it is at least 44 x 44, and a tap on its edge toggles", async ({ page }, info) => {
    const touch = info.project.name === "375-touch";
    await open(page, "field--under-the-touch-floor");
    const sw = page.locator("[data-story] button[role=switch]").first();
    expect(await sw.evaluate((el) => [el.getBoundingClientRect().width, el.getBoundingClientRect().height])).toEqual([40, 24]);
    const reach = await sw.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const hits = (x: number, y: number) => {
        const at = document.elementFromPoint(x, y);
        return at !== null && (at === el || el.contains(at));
      };
      let up = 0, down = 0, left = 0, right = 0;
      while (up < 80 && hits(cx, cy - up - 1)) up++;
      while (down < 80 && hits(cx, cy + down + 1)) down++;
      while (left < 80 && hits(cx - left - 1, cy)) left++;
      while (right < 80 && hits(cx + right + 1, cy)) right++;
      return { width: left + right + 1, height: up + down + 1, row: el.parentElement!.getBoundingClientRect().height };
    });
    if (touch) {
      expect(reach.width).toBeGreaterThanOrEqual(44);
      expect(reach.height).toBeGreaterThanOrEqual(44);
      expect(reach.row).toBeGreaterThanOrEqual(44);
      // A tap 20px above the track's centre (outside its 24px) still toggles it.
      const box = (await sw.boundingBox())!;
      const before = await sw.getAttribute("aria-checked");
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2 - 20);
      await expect(sw).not.toHaveAttribute("aria-checked", before!);
    } else {
      expect([reach.width, reach.height]).toEqual([40, 24]);
    }
  });

  test("RowMenu: every item is 44px tall", async ({ page }, info) => {
    const touch = info.project.name === "375-touch";
    await open(page, "row-menu--open-below-under-the-touch-floor");
    await tapOrClick(page, '[data-story] button[aria-haspopup="menu"]', touch);
    const items = await smallest(page, "[role=menuitem]");
    expect(items.count).toBe(4);
    floor(items, touch, { height: 32 });
  });

  test("Segmented in a one-column form Grid stays inside its row; the page never scrolls sideways", async ({ page }) => {
    await open(page, "segmented--in-a-form-grid");
    const control = page.getByRole("group", { name: "Employer" });
    const { scroll, client, right } = await control.evaluate((el) => ({
      scroll: el.scrollWidth,
      client: el.clientWidth,
      right: el.getBoundingClientRect().right,
    }));
    expect(scroll).toBeGreaterThan(client);
    expect(right).toBeLessThanOrEqual(375 - 24);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  });
});

test.describe("phone behaviour", () => {
  test.beforeEach(({}, info) => {
    test.skip(!info.project.name.startsWith("375"), "phone behaviour runs at 375 and 375-touch");
  });

  test("DateInput: a coarse pointer gets the calendar, never the keyboard (inputmode)", async ({ page }, info) => {
    await open(page, "date-input--states");
    // A pixel shot cannot see an attribute: on a phone the field asks for no keyboard, since a
    // tap opens the calendar; a fine pointer types digits.
    await expect(page.getByLabel("Empty", { exact: true })).toHaveAttribute("inputmode", info.project.name === "375-touch" ? "none" : "numeric");
  });

  test("YearInput: a coarse pointer gets the picker as a bottom sheet, never the keyboard", async ({ page }, info) => {
    await open(page, "year-input--picker");
    const input = page.getByLabel("Year of manufacture");
    const touch = info.project.name === "375-touch";
    await expect(input).toHaveAttribute("inputmode", touch ? "none" : "numeric");
    if (touch) await input.tap();
    else await input.click();
    const picker = page.getByRole("dialog", { name: EN_OPTIONAL_STRINGS.yearPicker.openPicker });
    await expect(picker.first()).toBeVisible();
    const sheet = page.locator("dialog[open]");
    if (!touch) {
      await expect(sheet).toHaveCount(0); // a fine pointer gets the floating panel
      return;
    }
    // A modal <dialog> in the top layer, docked to the bottom edge, full width.
    await expect(sheet).toHaveCount(1);
    expect(await sheet.evaluate((el: HTMLDialogElement) => el.matches(":modal"))).toBe(true);
    const box = (await sheet.boundingBox())!;
    expect(Math.round(box.y + box.height)).toBe(812);
    expect(Math.round(box.width)).toBe(375);
    await sheet.getByRole("button", { name: "2021", exact: true }).tap();
    await expect(sheet).toHaveCount(0);
    await expect(input).toHaveValue("2021");
    // A tap on the dimmed rest closes it without a pick; Clear empties the field.
    await input.tap();
    await expect(sheet).toHaveCount(1);
    await page.touchscreen.tap(187, 40);
    await expect(sheet).toHaveCount(0);
    await expect(input).toHaveValue("2021");
    await input.tap();
    await sheet.getByRole("button", { name: EN_STRINGS.datePicker.clear }).tap();
    await expect(input).toHaveValue("");
  });

  test("Segmented wider than its row scrolls inside itself; the page never scrolls sideways", async ({ page }) => {
    await open(page, "segmented--wider-than-its-row");
    const control = page.getByRole("navigation", { name: "Scope" });
    const { scroll, client } = await control.evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }));
    expect(scroll).toBeGreaterThan(client);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  });

  test("AppFrame: the menu button opens the drawer and freezes the page; the backdrop closes it", async ({ page }) => {
    await open(page, "app-frame--closed");
    const menu = page.getByRole("button", { name: "Open menu" });
    await menu.click();
    await expect(page.getByRole("button", { name: "Close menu" }).first()).toHaveAttribute("aria-expanded", "true");
    const drawer = page.locator("nav.w-64");
    await expect(drawer.getByRole("link", { name: "Workers" })).toBeVisible();
    await expect(drawer.getByRole("button", { name: "Sign out" })).toBeVisible();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");
    await page.mouse.click(360, 600);
    await expect(drawer).toHaveCount(0);
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
  });

  test("AppFrame: the top bar's magnifier opens the palette full screen", async ({ page }) => {
    await open(page, "app-frame--closed");
    await page.locator("header").getByRole("button", { name: "Search" }).click();
    const sheet = page.getByRole("dialog", { name: "Search" });
    const box = (await sheet.boundingBox())!;
    expect([Math.round(box.x), Math.round(box.y), Math.round(box.width), Math.round(box.height)]).toEqual([0, 0, 375, 812]);
    await sheet.getByRole("button", { name: "Close search" }).last().click();
    await expect(sheet).toHaveCount(0);
  });

  test("PullToSearch: a long pull from the top opens the palette, a short one springs back", async ({ page }, info) => {
    test.skip(info.project.name !== "375-touch", "a pull is a touch gesture");
    await open(page, "app-frame--closed");
    const cdp = await page.context().newCDPSession(page);
    const at = (y: number) => [{ x: 180, y }];
    const drag = async (travel: number) => {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: at(200) });
      for (let y = 200; y <= 200 + travel; y += 10) {
        await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: at(y) });
      }
    };
    const release = () => cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    const pill = page.getByRole("status");
    const content = page.locator("[data-pull-content]");
    const palette = page.getByRole("dialog", { name: "Search" });
    // A short pull: the content follows with resistance, the pill asks for more, nothing opens.
    await drag(80);
    await expect(pill).toHaveText("Pull to search");
    expect(await content.evaluate((el) => el.style.transform)).toMatch(/^translate3d\(0px, [1-9]/);
    await release();
    await expect(palette).toHaveCount(0);
    await expect.poll(() => content.evaluate((el) => el.style.transform)).toBe("");
    // A long one arms it ("Release to search") and opens the palette on release.
    await drag(220);
    await expect(pill).toHaveText("Release to search");
    await release();
    await expect(palette).toBeVisible();
    await cdp.detach();
  });

  test("the page stays inside 375 on every story", async ({ page }) => {
    test.setTimeout(240_000);
    // Wide content (a table, a toolbar) scrolls inside its own container, never the page.
    for (const group of STORY_GROUPS) {
      for (const story of group.stories) {
        const id = storyId(group.component, story.name);
        await open(page, id);
        expect(await page.evaluate(() => document.documentElement.scrollWidth), id).toBeLessThanOrEqual(375);
      }
    }
  });
});

// ---- 1.8.0 (styling programme spec §4.8) ----------------------------------------------------

test.describe("1.8.0 desktop behaviour", () => {
  test.beforeEach(async ({ page }, info) => {
    test.skip(info.project.name !== "1440", "desktop behaviour runs once, at 1440");
    await page.clock.setFixedTime(FIXED_NOW);
  });

  const heightOf = (page: Page, selector: string) =>
    page.locator(selector).evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().height)));

  test("buttons: a label never wraps; the inline action (xs) is 24px tall; the row wraps between whole buttons", async ({ page }) => {
    await open(page, "button--inline-actions");
    const xs = await page.locator("[data-story] section").first().locator("button").evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().height)));
    expect(xs.length).toBe(6);
    for (const h of xs) expect(h).toBe(24);
    for (const h of await heightOf(page, "[data-story] table button")) expect(h).toBe(24);
    await open(page, "button--labels-never-wrap");
    const narrow = page.locator("[data-story] .w-60");
    const boxes = await narrow.locator("button").evaluateAll((els) =>
      els.map((el) => ({ h: el.getBoundingClientRect().height, lineHeight: parseFloat(getComputedStyle(el).lineHeight), top: el.getBoundingClientRect().top })),
    );
    // Each label is one line (sm buttons are 32px; the text button one line of text) ...
    expect(boxes[0].h).toBe(32);
    expect(boxes[1].h).toBe(32);
    expect(boxes[2].h).toBeLessThanOrEqual(boxes[2].lineHeight + 0.5);
    // ... and the narrow box wraps BETWEEN them.
    expect(boxes[1].top).toBeGreaterThan(boxes[0].top);
    const wide = await page.locator("[data-story] section:nth-child(2) button").evaluateAll((els) => els.map((el) => el.getBoundingClientRect().top));
    expect(new Set(wide).size).toBe(1);
  });

  test("IconLink: an icon-only anchor that downloads, named by its label", async ({ page }) => {
    await open(page, "button--icon-links");
    const link = page.getByRole("link", { name: "Download production pack" }).first();
    await expect(link).toHaveAttribute("href", "#pack.pdf");
    await expect(link).toHaveAttribute("download", "");
    await expect(link).toHaveAttribute("title", "Download production pack");
    const sizes = await page.getByRole("link", { name: "Download production pack" }).evaluateAll((els) => els.map((el) => [el.getBoundingClientRect().width, el.getBoundingClientRect().height]));
    expect(sizes).toEqual([[24, 24], [32, 32], [36, 36], [48, 48]]);
    await expect(page.getByRole("link", { name: "Download (read-only)" })).toBeVisible();
  });

  test("Dialog and ConfirmDialog size lg: the ✕ and the footer buttons are 48px", async ({ page }) => {
    await open(page, "dialog--large");
    const dialog = page.locator("dialog[open]");
    const x = (await dialog.getByRole("button", { name: EN_STRINGS.close, exact: true }).boundingBox())!;
    expect([x.width, x.height]).toEqual([48, 48]);
    for (const h of await heightOf(page, "dialog[open] [data-ops-dismiss], dialog[open] [data-ops-commit]")) expect(h).toBe(48);
    await open(page, "confirm-dialog--large");
    const buttons = await heightOf(page, "dialog[open] button");
    expect(buttons).toEqual([48, 48, 48]);
  });

  test("DialogFooter: a long note wraps beside the buttons, which keep its row", async ({ page }) => {
    await open(page, "dialog--footer-with-a-long-note");
    const note = (await page.locator("[data-story] span.mr-auto").boundingBox())!;
    const cancel = (await page.locator("[data-story] [data-ops-dismiss]").boundingBox())!;
    expect(cancel.x).toBeGreaterThan(note.x + note.width - 1);
    expect(cancel.y).toBeLessThan(note.y + note.height);
  });

  test("Sheet: the footer stays pinned under the scrolling body and commits the body's form", async ({ page }) => {
    await open(page, "sheet--pinned-footer");
    const sheet = page.getByRole("dialog", { name: "Material cost review" });
    const commit = sheet.getByRole("button", { name: "Apply prices" });
    const before = (await commit.boundingBox())!;
    expect(Math.round(before.y + before.height)).toBeGreaterThan(900 - 70);
    await sheet.locator(".overflow-y-auto").evaluate((el) => el.scrollTo(0, el.scrollHeight));
    expect((await commit.boundingBox())!.y).toBe(before.y);
    await sheet.getByLabel("Article 1", { exact: true }).fill("13.10");
    const asked = answerConfirm(page, false);
    await sheet.getByRole("button", { name: EN_STRINGS.close, exact: true }).click();
    expect(await asked).toBe(EN_STRINGS.unsavedConfirm);
    await commit.click();
    await expect(sheet).toHaveCount(0);
  });

  test("Combobox: a pick marks the enclosing Dialog dirty, so ✕ asks before discarding", async ({ page }) => {
    await open(page, "combobox--in-a-dialog");
    const dialog = page.locator("dialog[open]");
    let prompted = false;
    const onDialog = () => (prompted = true);
    page.on("dialog", onDialog);
    await dialog.getByRole("button", { name: EN_STRINGS.close, exact: true }).click();
    await expect(dialog).toHaveCount(0);
    expect(prompted).toBe(false);
    page.off("dialog", onDialog);
    await page.getByRole("button", { name: "Assign worker" }).click();
    await dialog.getByRole("combobox").click();
    await page.getByRole("option", { name: /Barišić/ }).click();
    await expect(dialog.getByRole("combobox")).toHaveValue("Barišić, Josip");
    const asked = answerConfirm(page, false);
    await dialog.getByRole("button", { name: EN_STRINGS.close, exact: true }).click();
    expect(await asked).toBe(EN_STRINGS.unsavedConfirm);
    await expect(dialog).toBeVisible();
  });

  test("Segmented: changesData is disabled in a read-only scope, a view choice keeps working; lg is 48px", async ({ page }) => {
    await open(page, "segmented--changes-data-in-a-read-only-scope");
    const mode = page.getByRole("group", { name: "Weld book" });
    for (const b of await mode.getByRole("button").all()) await expect(b).toBeDisabled();
    const stage = page.getByRole("group", { name: "Review stage" });
    await stage.getByRole("button", { name: "Materials" }).click();
    await expect(stage.getByRole("button", { name: "Materials" })).toHaveAttribute("aria-pressed", "true");
    await open(page, "segmented--large");
    for (const name of ["CE format", "View"]) {
      const box = (await page.getByRole(name === "View" ? "navigation" : "group", { name }).boundingBox())!;
      expect(box.height).toBe(48);
    }
  });

  test("RowMenu: inside a backdrop-filter / transform ancestor the list still opens at its button, in the top layer", async ({ page }) => {
    await open(page, "row-menu--inside-a-frosted-bar");
    const button = page.getByRole("button", { name: "AI tools" });
    await button.click();
    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    expect(await menu.evaluate((el) => el.matches(":popover-open"))).toBe(true);
    const [b, m] = [(await button.boundingBox())!, (await menu.boundingBox())!];
    // The bar sits at the bottom of the page: the menu opens upward, right above its button, on screen.
    expect(m.y + m.height).toBeLessThanOrEqual(b.y);
    expect(b.y - (m.y + m.height)).toBeLessThan(8);
    expect(m.x).toBeGreaterThanOrEqual(0);
    expect(m.x + m.width).toBeLessThanOrEqual(1440);
    // A press outside reaches the page and closes it; Escape too.
    await page.mouse.click(5, 5);
    await expect(menu).toBeHidden();
    await button.click();
    await expect(menu).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    // A pick still runs and closes.
    await button.click();
    await menu.getByRole("menuitem", { name: "Extract page" }).click();
    await expect(menu).toBeHidden();
  });

  test("Table: a group row folds its lines; FoldTable folds by its container; Disclosure toggles", async ({ page }) => {
    await open(page, "table--group-rows-and-a-total");
    const labour = page.getByRole("button", { name: /Labour/ });
    await expect(labour).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByRole("cell", { name: "Welding, 118 h" })).toHaveCount(0);
    await labour.click();
    await expect(labour).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("cell", { name: "Welding, 118 h" })).toBeVisible();
    await expect(page.locator("tfoot")).toContainText("Total cost");

    await open(page, "fold-table--folds-by-its-container");
    const wide = page.getByRole("table", { name: "Positions, wide pane" });
    const narrow = page.getByRole("table", { name: "Positions, narrow pane" });
    await expect(wide.locator("thead")).toBeVisible();
    await expect(narrow.locator("thead")).toBeHidden();
    // Folded rows carry the header's words as labels; the table does not show them.
    await expect(narrow.locator("tbody tr").first().getByText("Designation", { exact: true })).toBeVisible();
    await expect(wide.locator("tbody tr").first().getByText("Designation", { exact: true })).toBeHidden();

    await open(page, "fold-table--folds-by-the-viewport");
    await expect(page.getByRole("table", { name: "Positions", exact: true }).locator("thead")).toBeVisible();

    await open(page, "disclosure--variants");
    const fold = page.locator("details", { hasText: "Pressure test" });
    await expect(fold).not.toHaveAttribute("open", "");
    await fold.locator("summary").click();
    await expect(fold).toHaveAttribute("open", "");
  });
});

test.describe("1.8.0 touch floor", () => {
  test.beforeEach(({}, info) => {
    test.skip(!info.project.name.startsWith("375"), "the floor is a phone matter: 375 (off) and 375-touch (on)");
  });

  type Box = { width: number; height: number };
  const boxes = (page: Page, selector: string) =>
    page.locator(selector).evaluateAll((els) => els.map((el) => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height })));
  /** The target of an element: how far from its centre a press still lands on it (or inside it). */
  const reachOf = (page: Page, selector: string, owner?: string) =>
    page.locator(selector).first().evaluate((el, ownerSel) => {
      const r = el.getBoundingClientRect();
      const target = ownerSel ? el.closest(ownerSel)! : el;
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const hits = (x: number, y: number) => {
        const at = document.elementFromPoint(x, y);
        return at !== null && (at === target || target.contains(at));
      };
      let up = 0, down = 0, left = 0, right = 0;
      while (up < 80 && hits(cx, cy - up - 1)) up++;
      while (down < 80 && hits(cx, cy + down + 1)) down++;
      while (left < 80 && hits(cx - left - 1, cy)) left++;
      while (right < 80 && hits(cx + right + 1, cy)) right++;
      return { width: left + right + 1, height: up + down + 1, box: { width: r.width, height: r.height } };
    }, owner);
  const atLeast = (size: Box, min: number) => {
    expect(size.width).toBeGreaterThanOrEqual(min);
    expect(size.height).toBeGreaterThanOrEqual(min);
  };

  test("the bare Checkbox: a 44 x 44 target around its box (a tap beside it toggles); the labelled one's row 44, its box 20", async ({ page }, info) => {
    const touch = info.project.name === "375-touch";
    await open(page, "field--checkboxes-under-the-touch-floor");
    const bare = page.getByRole("checkbox", { name: "Select line b" });
    const reach = await reachOf(page, '[aria-label="Select line b"]', "label");
    if (touch) {
      atLeast(reach, 44);
      expect(reach.box).toEqual({ width: 20, height: 20 });
      const box = (await bare.boundingBox())!;
      await page.touchscreen.tap(box.x + box.width / 2 - 18, box.y + box.height / 2);
      await expect(bare).toBeChecked();
    } else {
      expect(reach.box).toEqual({ width: 16, height: 16 });
      expect(reach.width).toBeLessThanOrEqual(17);
    }
    const labelled = page.getByRole("checkbox", { name: "Show password" });
    const row = (await page.locator("label:has(#story-show-password)").boundingBox())!;
    const mark = (await labelled.boundingBox())!;
    if (touch) {
      expect(row.height).toBeGreaterThanOrEqual(44);
      expect([mark.width, mark.height]).toEqual([20, 20]);
    } else {
      expect(row.height).toBe(20);
      expect([mark.width, mark.height]).toEqual([16, 16]);
    }
  });

  test("Segmented: a one-character option is 44 x 44", async ({ page }, info) => {
    const touch = info.project.name === "375-touch";
    await open(page, "segmented--under-the-touch-floor");
    for (const size of await boxes(page, '[data-story] [role=group] button')) {
      if (touch) atLeast(size, 44);
      else expect(size.width).toBeLessThan(30);
    }
  });

  test("Combobox: every option is 44px tall", async ({ page }, info) => {
    const touch = info.project.name === "375-touch";
    await open(page, "combobox--open-list-under-the-touch-floor");
    const input = page.locator("[data-story] input[role=combobox]");
    if (touch) await input.tap();
    else await input.click();
    const sizes = await boxes(page, "[role=option]");
    expect(sizes.length).toBeGreaterThan(3);
    const smallest = Math.min(...sizes.map((s) => s.height));
    if (touch) expect(smallest).toBeGreaterThanOrEqual(44);
    else expect(smallest).toBe(36);
  });

  test("CopyValue and TagRemove: a 44 x 44 target, the line and the chip keep their size", async ({ page }, info) => {
    const touch = info.project.name === "375-touch";
    await open(page, "copy-value--under-the-touch-floor");
    const copy = await reachOf(page, "[data-story] button");
    await open(page, "tag-remove--under-the-touch-floor");
    const remove = await reachOf(page, "[data-story] button");
    const chip = (await page.locator("[data-story] span:has(> button)").boundingBox())!;
    if (touch) {
      atLeast(copy, 44);
      atLeast(remove, 44);
    } else {
      expect(copy.height).toBeLessThan(30);
      expect(remove.height).toBeLessThan(30);
    }
    // The chip is as tall with the floor as without it (28px: the 1.6 Tag with its ✕).
    expect(Math.round(chip.height)).toBe(28);
  });

  test("the inline action (xs) is 44px tall under the floor, 24px elsewhere", async ({ page }, info) => {
    const touch = info.project.name === "375-touch";
    await open(page, "button--inline-actions");
    for (const size of await boxes(page, "[data-story] [data-ops-touch] button, [data-story] [data-ops-touch] a")) {
      if (touch) atLeast(size, 44);
      else expect(size.height).toBe(24);
    }
  });

  test("lg under the floor: the DateInput / YearInput button is 48 x 48 and the text keeps 56px clear", async ({ page }, info) => {
    const touch = info.project.name === "375-touch";
    for (const [id, name] of [
      ["date-input--large-under-the-touch-floor", EN_STRINGS.datePicker.openCalendar],
      ["year-input--large-under-the-touch-floor", EN_OPTIONAL_STRINGS.yearPicker.openPicker],
    ] as const) {
      await open(page, id);
      const button = (await page.locator(`[data-story] button[aria-label="${name}"]`).boundingBox())!;
      const padding = await page.locator("[data-story] input[role=combobox]").evaluate((el) => parseFloat(getComputedStyle(el).paddingRight));
      if (touch) {
        expect([button.width, button.height]).toEqual([48, 48]);
        expect(padding).toBe(56);
      } else {
        expect([button.width, button.height]).toEqual([28, 28]);
        expect(padding).toBe(36);
      }
    }
  });

  test("lg at every width: FileInput and Segmented are 48px tall", async ({ page }) => {
    await open(page, "field--large-file-input");
    expect((await page.locator("#story-lg-file").boundingBox())!.height).toBe(48);
    await open(page, "segmented--large");
    expect((await page.getByRole("group", { name: "CE format" }).boundingBox())!.height).toBeGreaterThanOrEqual(48);
  });

  test("AppSwitcher entries are 44px tall on a coarse pointer (no floor needed)", async ({ page }, info) => {
    const touch = info.project.name === "375-touch";
    await open(page, "app-switcher--open");
    const trigger = page.locator('[data-story] button[aria-haspopup="menu"]');
    if (touch) await trigger.tap();
    else await trigger.click();
    const items = await boxes(page, "[role=menuitem]");
    expect(items.length).toBeGreaterThan(1);
    const smallest = Math.min(...items.map((s) => s.height));
    if (touch) expect(smallest).toBeGreaterThanOrEqual(44);
    else expect(smallest).toBe(32);
  });
});
