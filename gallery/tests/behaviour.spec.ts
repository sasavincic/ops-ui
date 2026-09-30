import { expect, test, type Page } from "@playwright/test";
import { EN_STRINGS } from "../../src/config/strings";
import { STORY_GROUPS, storyId } from "../../src/stories";

// Behaviour the screenshots cannot prove (spec §11.1 "behaviour", §12.0 G4 by hand, automated
// here): the Dialog and Sheet discard prompts, toast lifetimes, the toast hooks and Field messages
// (localized, re-raised, taken away on unmount), DateInput typing and calendar,
// Combobox matching and keyboard, RowMenu placement, MonthNav, Segmented at 375 and the
// read-only default-deny. One brand is enough: behaviour does not depend on colour.

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

test.describe("phone behaviour", () => {
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== "375", "phone behaviour runs at 375");
  });

  test("Segmented wider than its row scrolls inside itself; the page never scrolls sideways", async ({ page }) => {
    await open(page, "segmented--wider-than-its-row");
    const control = page.getByRole("navigation", { name: "Scope" });
    const { scroll, client } = await control.evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }));
    expect(scroll).toBeGreaterThan(client);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
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
