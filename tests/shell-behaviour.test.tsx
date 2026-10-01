// @vitest-environment happy-dom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { ActionIconScope } from "../src/components/action-icon";
import { OpsUiProvider } from "../src/config/provider";
import { AppFrame } from "../src/shell/app-frame";
import {
  applyDifferences,
  importFrom,
  installGlobals,
  libraryProps,
  removeSandbox,
  sandboxApp,
  shellStrings,
  type AppKey,
} from "./shell-fixtures";

// 1.5.0: the same proof as tests/shell-markup.test.tsx, in a DOM, through the interactions
// themselves: each app's own layout and the library's AppFrame are mounted side by side and
// driven by the same events (⌥ held, the menu button, ⌘K, typing, arrows, a pointer that moves
// or rests, Escape); after every step the two DOMs must be equal (modulo the declared
// intentional differences). The app side runs its raw files (tests/fixtures/shell-<app>).

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const sandboxes: string[] = [];
afterAll(() => sandboxes.forEach(removeSandbox));

const roots: Root[] = [];
afterEach(async () => {
  await act(async () => roots.splice(0).forEach((r) => r.unmount()));
  document.body.innerHTML = "";
});

const pushed: string[] = [];
const router = { back() {}, forward() {}, refresh() {}, push: (href: string) => void pushed.push(href), replace() {}, prefetch() {} };

async function mount(node: ReactNode, pathname: string): Promise<HTMLElement> {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  await act(async () => {
    root.render(
      <AppRouterContext.Provider value={router}>
        <PathnameContext.Provider value={pathname}>{node}</PathnameContext.Provider>
      </AppRouterContext.Provider>,
    );
  });
  return container;
}

const settle = () => act(async () => new Promise((resolve) => setTimeout(resolve, 20)));

async function both(app: AppKey) {
  installGlobals(app);
  const root = sandboxApp(app);
  sandboxes.push(root);
  const layout = (await importFrom<{ default: (p: { children: ReactNode }) => Promise<ReactNode> }>(root, "layout.tsx")).default;
  const nav = await importFrom<Record<string, readonly { href: string; key: string; icon?: string }[]>>(root, "nav.ts");
  let mark: ReactNode;
  if (app === "wfo") {
    mark = (
      <span className="flex items-center gap-2.5">
        <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-accent" />
        <span className="text-sm font-semibold tracking-tight text-sidebar-fg-active">Workforce Ops</span>
      </span>
    );
  } else {
    const { BrandMark } = await importFrom<{ BrandMark: () => ReactNode }>(root, "brand.tsx");
    mark = (
      <span className="flex items-center gap-2.5">
        <BrandMark />
        <span className="text-sm font-semibold tracking-tight text-sidebar-fg-active">FinaOps</span>
      </span>
    );
  }
  const page = <p className="text-sm">The page</p>;
  const path = app === "wfo" ? "/operations" : "/review";
  const appSide = await mount(await layout({ children: page }), path);
  const props = libraryProps(app, nav, mark);
  const libSide = await mount(
    <OpsUiProvider strings={shellStrings(app)}>
      <AppFrame {...props} afterMain={app === "wfo" ? <div data-assistant-launcher="" /> : undefined}>
        {app === "finaops" ? <ActionIconScope>{page}</ActionIconScope> : page}
      </AppFrame>
    </OpsUiProvider>,
    path,
  );
  await settle();
  const same = (step: string) => expect(libSide.innerHTML, step).toBe(applyDifferences(app, appSide.innerHTML));
  return { appSide, libSide, same };
}

function typeInto(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  setter.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

const key = (target: EventTarget, type: "keydown" | "keyup", init: KeyboardEventInit) =>
  act(async () => void target.dispatchEvent(new KeyboardEvent(type, { bubbles: true, cancelable: true, ...init })));

describe.each(["wfo", "finaops"] as const)("%s: the library shell behaves as the app's, step by step", (app) => {
  it("⌥ held, the drawer, the palette (open, typed, arrows, pointer, Enter, Escape)", async () => {
    const { appSide, libSide, same } = await both(app);
    same("mounted");

    // ⌥ held: the workspace icons become their numbers; let go: icons again.
    await key(window, "keydown", { key: "Alt", altKey: true });
    expect(libSide.innerHTML).toContain(">1</span>");
    same("alt held");
    await key(window, "keyup", { key: "Alt" });
    same("alt released");

    // The drawer opens from the menu button and closes from its backdrop.
    for (const side of [appSide, libSide]) {
      await act(async () => side.querySelector<HTMLButtonElement>("header > span > button[aria-expanded]")!.click());
    }
    expect(libSide.querySelector("header > span > button[aria-expanded]")!.getAttribute("aria-expanded")).toBe("true");
    same("drawer open");
    for (const side of [appSide, libSide]) {
      await act(async () => side.querySelector<HTMLButtonElement>(".fixed.inset-0.z-40 > button")!.click());
    }
    same("drawer closed");

    // ⌘K opens both palettes (one window event); the index loads.
    await key(window, "keydown", { key: "k", metaKey: true });
    await settle();
    expect(libSide.querySelector('[role="dialog"]')).not.toBeNull();
    same("palette open");

    const inputs = [appSide, libSide].map((side) => side.querySelector<HTMLInputElement>('[role="dialog"] input')!);
    for (const input of inputs) await act(async () => typeInto(input, "an"));
    await settle();
    expect(libSide.innerHTML).toContain("Anton Kos");
    same("typed");

    for (const input of inputs) {
      await key(input, "keydown", { key: "ArrowDown" });
      await key(input, "keydown", { key: "ArrowDown" });
    }
    same("two rows down");

    // A pointer resting where a row slid under it selects nothing; one that moves selects.
    for (const side of [appSide, libSide]) {
      const row = side.querySelector<HTMLElement>('[data-row-index="0"]')!;
      await act(async () => void row.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 10, clientY: 10 })));
    }
    same("pointer rests");
    for (const side of [appSide, libSide]) {
      const row = side.querySelector<HTMLElement>('[data-row-index="0"]')!;
      await act(async () => void row.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 12, clientY: 10 })));
    }
    expect(libSide.querySelector('[data-row-index="0"]')!.className).toContain("bg-primary-subtle");
    same("pointer moved");

    // Enter goes where the selected row points, for each side alike.
    pushed.length = 0;
    for (const input of inputs) await key(input, "keydown", { key: "Enter" });
    expect(pushed).toEqual(["/x/1", "/x/1"]);
    same("entered");

    // Reopen, then Escape closes.
    await key(window, "keydown", { key: "k", ctrlKey: true });
    await settle();
    same("reopened");
    for (const side of [appSide, libSide]) {
      const input = side.querySelector<HTMLInputElement>('[role="dialog"] input')!;
      await key(input, "keydown", { key: "Escape" });
    }
    expect(libSide.querySelector('[role="dialog"]')).toBeNull();
    same("escaped");
  });

  it("the trailing row hands the query on as the app did", async () => {
    const { appSide, libSide, same } = await both(app);
    await key(window, "keydown", { key: "k", metaKey: true });
    await settle();
    const seen: string[] = [];
    const onAsk = (e: Event) => seen.push((e as CustomEvent<{ prompt: string }>).detail.prompt);
    window.addEventListener("wf:open-assistant", onAsk);
    try {
      for (const side of [appSide, libSide]) {
        await act(async () => typeInto(side.querySelector<HTMLInputElement>('[role="dialog"] input')!, "zzz"));
      }
      await settle();
      expect(libSide.innerHTML).toContain("No matches.");
      same("no results");
      pushed.length = 0;
      for (const side of [appSide, libSide]) {
        const rows = side.querySelectorAll<HTMLButtonElement>("[data-row-index]");
        await act(async () => rows[rows.length - 1].click());
      }
      if (app === "finaops") expect(pushed).toEqual(["/transactions?q=zzz", "/transactions?q=zzz"]);
      else expect(seen).toEqual(["zzz", "zzz"]);
      same("handed on");
    } finally {
      window.removeEventListener("wf:open-assistant", onAsk);
    }
  });
});
