/**
 * Phones get modals as BOTTOM SHEETS (2026-09-30, Saša: "all modals could act
 * like this, anchored to bottom instead of floating" — after the date picker
 * became one). This is the entrance: the sheet rises from the bottom edge and
 * the backdrop fades in, once per open, via the Web Animations API (a CSS
 * animation class may replay when the keyboard re-lays the page out — the
 * assistant's 2026-09-25 lesson). Desktop dialogs stay centred and still.
 */
export const PHONE_SHEET_QUERY = "(max-width: 639px)";

export function riseSheet(el: HTMLElement) {
  if (typeof window === "undefined" || typeof el.animate !== "function") return;
  if (!window.matchMedia(PHONE_SHEET_QUERY).matches) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const timing = { duration: 240, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" };
  el.animate([{ transform: "translateY(100%)" }, { transform: "translateY(0)" }], timing);
  try {
    el.animate([{ opacity: 0 }, { opacity: 1 }], { ...timing, pseudoElement: "::backdrop" });
  } catch {
    // An engine without pseudo-element animation just shows the backdrop.
  }
}
