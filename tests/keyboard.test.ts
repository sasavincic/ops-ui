// 1.5.0: ported from workforce-ops origin/main (96b4c7a) tests/lib/keyboard.test.ts; only the import path changed.
import { describe, expect, it } from "vitest";
import { isPageSearchShortcut, isTypingTarget } from "../src/lib/keyboard";

// The rule is duck-typed (tagName / isContentEditable), so plain objects
// stand in for elements and the test needs no DOM.
const el = (tagName: string, extra: Record<string, unknown> = {}) =>
  ({ tagName, isContentEditable: false, ...extra }) as unknown as EventTarget;

const key = (over: Partial<Parameters<typeof isPageSearchShortcut>[0]>) => ({
  key: "/",
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  target: null,
  ...over,
});

describe("isPageSearchShortcut", () => {
  it("is a bare slash, or the find chord with shift on either platform", () => {
    expect(isPageSearchShortcut(key({}))).toBe(true);
    expect(isPageSearchShortcut(key({ key: "F", metaKey: true, shiftKey: true }))).toBe(true);
    expect(isPageSearchShortcut(key({ key: "f", ctrlKey: true, shiftKey: true }))).toBe(true);
  });

  it("leaves the browser's own find alone", () => {
    // ⌘F / Ctrl+F without shift is Find in page — never ours.
    expect(isPageSearchShortcut(key({ key: "f", metaKey: true }))).toBe(false);
    expect(isPageSearchShortcut(key({ key: "f", ctrlKey: true }))).toBe(false);
  });

  it("ignores a slash typed with a modifier or into a field", () => {
    expect(isPageSearchShortcut(key({ metaKey: true }))).toBe(false);
    expect(isPageSearchShortcut(key({ altKey: true }))).toBe(false);
    expect(isPageSearchShortcut(key({ shiftKey: true }))).toBe(false);
  });
});

describe("isTypingTarget", () => {
  it("is false for nothing and for non-elements", () => {
    expect(isTypingTarget(null)).toBe(false);
    expect(isTypingTarget({} as EventTarget)).toBe(false);
  });

  it("recognises inputs, textareas, selects and contenteditable", () => {
    expect(isTypingTarget(el("INPUT"))).toBe(true);
    expect(isTypingTarget(el("textarea"))).toBe(true);
    expect(isTypingTarget(el("SELECT"))).toBe(true);
    expect(isTypingTarget(el("DIV", { isContentEditable: true }))).toBe(true);
    expect(isTypingTarget(el("DIV"))).toBe(false);
    expect(isTypingTarget(el("BUTTON"))).toBe(false);
  });
});

import {
  chordLabel,
  isApplePlatform,
  isChordModifierKey,
  searchChordKeys,
  workspaceShortcutIndex,
} from "../src/lib/keyboard";

describe("initial shortcut labels", () => {
  it.each([
    ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.6 Safari/605.1.15", "⌘"],
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15", "⌘"],
    ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0.0.0", "Ctrl"],
    ["Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140.0.0.0", "Ctrl"],
    ["Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/140.0.0.0", "Ctrl"],
    ["", "Ctrl"],
  ])("uses the request platform before hydration: %s", (userAgent, modifier) => {
    expect(searchChordKeys(isApplePlatform(userAgent))).toEqual([modifier, "K"]);
  });
});

describe("workspaceShortcutIndex", () => {
  const chord = (over: Record<string, unknown>) => ({
    key: "1",
    code: "Digit1",
    metaKey: false,
    ctrlKey: false,
    altKey: true,
    shiftKey: false,
    target: null,
    ...over,
  });
  it("maps ⌥/Alt + digit to the nav index, within the workspace count", () => {
    expect(workspaceShortcutIndex(chord({}), 5)).toBe(0);
    // ⌥1 on a Mac types "¡": the code still says which digit.
    expect(workspaceShortcutIndex(chord({ key: "¡", code: "Digit1" }), 5)).toBe(0);
    expect(workspaceShortcutIndex(chord({ key: "4", code: "Digit4" }), 5)).toBe(3);
    expect(workspaceShortcutIndex(chord({ key: "6", code: "Digit6" }), 5)).toBeNull();
    // A layout where the digit is a shifted key still reads the code.
    expect(workspaceShortcutIndex(chord({ key: "&", code: "Digit1" }), 5)).toBe(0);
    // No code (synthetic events) falls back to the key.
    expect(workspaceShortcutIndex(chord({ key: "2", code: undefined }), 5)).toBe(1);
  });
  it("is ⌥ only — ⌘/Ctrl + digit belongs to the browser's tabs", () => {
    expect(workspaceShortcutIndex(chord({ altKey: false, metaKey: true }), 5)).toBeNull();
    expect(workspaceShortcutIndex(chord({ key: "3", code: "Digit3", altKey: false, ctrlKey: true }), 5)).toBeNull();
    // ⌘⌥ together is not the chord either.
    expect(workspaceShortcutIndex(chord({ metaKey: true }), 5)).toBeNull();
  });
  it("leaves plain digits, shift chords and ⌘K alone", () => {
    expect(workspaceShortcutIndex(chord({ altKey: false }), 5)).toBeNull();
    expect(workspaceShortcutIndex(chord({ shiftKey: true }), 5)).toBeNull();
    expect(workspaceShortcutIndex(chord({ key: "k", code: "KeyK" }), 5)).toBeNull();
  });
  it("names the chord modifier and writes the chord per platform", () => {
    expect(isChordModifierKey("Alt")).toBe(true);
    expect(isChordModifierKey("Meta")).toBe(false);
    expect(isChordModifierKey("Control")).toBe(false);
    expect(isChordModifierKey("Shift")).toBe(false);
    expect(chordLabel(2, true)).toBe("⌥2");
    expect(chordLabel(2, false)).toBe("Alt+2");
  });
  it("writes the search chord as one keycap per key, Ctrl off a Mac", () => {
    expect(searchChordKeys(true)).toEqual(["⌘", "K"]);
    expect(searchChordKeys(false)).toEqual(["Ctrl", "K"]);
  });
});
