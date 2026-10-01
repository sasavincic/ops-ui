"use client";

import { useCallback, useEffect, useId, useRef, useSyncExternalStore } from "react";
import { CALLOUT_TONE, Callout } from "./callout";
import { useOpsUi } from "../config/provider";
import { cn } from "../lib/cn";
import { TOUCH_FLOOR } from "../lib/touch";
import type { ToastAction, ToastTone } from "../types";

/**
 * Alerts as toasts (Saša, 2026-09-25: "any error, any alert, should open as
 * a bottom right corner dismissable alert and not between content, moving
 * and pushing the UI around"). Every refusal an ACTION returns — archive a
 * client with running sites, finalize a quote that breaks a rule, a failed
 * save — lands here instead of as a line wedged into the layout. What stays
 * in the flow on purpose: a message about ONE FIELD sits under that field
 * (it has to point at it), and standing notes about a record's state
 * (health lines, gates, warnings a dialog shows before you decide) are
 * content, not alerts.
 *
 * The native <dialog> puts a modal in the browser's top layer and makes the
 * rest of the page inert, so a toast drawn at the page root would sit
 * UNDER an open dialog and could not be dismissed. Each open Dialog is
 * therefore a toast HOST: the topmost host draws the stack, the page root
 * draws it when no dialog is open.
 */

export type { ToastAction, ToastTone };

type ToastItem = {
  id: number;
  tone: ToastTone;
  message: string;
  closeLabel: string;
  /** One follow-up act offered in the toast itself ("Read again"). */
  action?: ToastAction;
};

const MAX_TOASTS = 4;
let nextId = 1;
let toasts: ToastItem[] = [];
let hosts: string[] = [];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getToasts = () => toasts;
/** The stack as it stands (tests). */
export const currentToasts = (): readonly ToastItem[] => toasts;
const getHosts = () => hosts;
const EMPTY: ToastItem[] = [];
const NO_HOSTS: string[] = [];

/**
 * Show a toast. The same message already on screen is replaced rather than
 * stacked (a second click that fails the same way re-announces it).
 * Everything but a confirmation stays until dismissed or until the component
 * that raised it clears or unmounts; confirmations fade after six seconds.
 */
export function pushToast(
  tone: ToastTone,
  message: string,
  closeLabel = "Close",
  action?: ToastAction
): number {
  const id = nextId++;
  toasts = [
    ...toasts.filter((t) => !(t.tone === tone && t.message === message)),
    { id, tone, message, closeLabel, action },
  ].slice(-MAX_TOASTS);
  emit();
  // Only a confirmation fades by itself; anything that asks for attention
  // (an error, a warning, a notice) stays until dismissed (2026-09-25).
  if (tone === "success") {
    setTimeout(() => dismissToast(id), 6000);
  }
  return id;
}

export function dismissToast(id: number) {
  const before = toasts.length;
  toasts = toasts.filter((t) => t.id !== id);
  if (toasts.length !== before) emit();
}

/**
 * Raise `error` as a toast while it is set; the toast leaves when the error
 * clears or the component unmounts (a closed dialog takes its error with
 * it). `trigger` re-announces an unchanged message — pass the
 * useActionState state object, which is new on every submit.
 */
export function useErrorToast(
  error: string | null | undefined,
  trigger?: unknown,
  tone: ToastTone = "danger",
  action?: ToastAction
) {
  const { strings, localize } = useOpsUi();
  // The action's closure changes every render; the toast keeps the latest.
  const actionRef = useRef(action);
  useEffect(() => {
    actionRef.current = action;
  });
  const hasAction = Boolean(action);
  const actionLabel = action?.label;
  useEffect(() => {
    if (!error) return;
    const id = pushToast(
      tone,
      localize(error),
      strings.close,
      hasAction && actionLabel
        ? { label: actionLabel, onClick: () => actionRef.current?.onClick() }
        : undefined
    );
    return () => dismissToast(id);
    // strings and localize are stable for the page's lifetime; the message is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error, trigger, tone, hasAction, actionLabel]);
}

/** The component form of useErrorToast — renders nothing in the flow. */
export function ErrorToast({
  error,
  trigger,
  tone = "danger",
  action,
}: {
  error: string | null | undefined;
  trigger?: unknown;
  tone?: ToastTone;
  action?: ToastAction;
}) {
  useErrorToast(error, trigger, tone, action);
  return null;
}

/** A notice about what an action did ("already planned", "refreshed"). */
export function NoticeToast({
  message,
  trigger,
  tone = "info",
  action,
}: {
  message: string | null | undefined;
  trigger?: unknown;
  tone?: ToastTone;
  action?: ToastAction;
}) {
  useErrorToast(message, trigger, tone, action);
  return null;
}

/** A confirmation ("Saved", "Copied") — green, fades by itself. */
export function SuccessToast({ message, trigger }: { message: string | null | undefined; trigger?: unknown }) {
  useErrorToast(message, trigger, "success");
  return null;
}

/**
 * A message that belongs to one place on the screen — a form field — but is
 * shown as a toast. `onAppear` raises it as soon as it is set (a field
 * error after a save); either way the returned `announce` raises it again
 * (the field calls it on focus, so a dismissed message comes back when you
 * go to fix it). Already-localized text: the caller composes it.
 */
export function useAnchoredToast(
  text: string | null | undefined,
  tone: ToastTone,
  onAppear: boolean,
  closeLabel = "Close"
): () => void {
  const idRef = useRef<number | null>(null);
  useEffect(() => {
    if (!text) return;
    if (onAppear) idRef.current = pushToast(tone, text, closeLabel);
    return () => {
      if (idRef.current !== null) dismissToast(idRef.current);
      idRef.current = null;
    };
  }, [text, tone, onAppear, closeLabel]);
  return useCallback(() => {
    if (text) idRef.current = pushToast(tone, text, closeLabel);
  }, [text, tone, closeLabel]);
}

/** Registers the calling Dialog as the top toast host while it is open. */
export function useToastHost(active: boolean): boolean {
  const id = useId();
  useEffect(() => {
    if (!active) return;
    hosts = [...hosts, id];
    emit();
    return () => {
      hosts = hosts.filter((h) => h !== id);
      emit();
    };
  }, [active, id]);
  const current = useSyncExternalStore(subscribe, getHosts, () => NO_HOSTS);
  return active && current[current.length - 1] === id;
}

/** The stack itself; rendered by the top host (see Toaster / Dialog). A
 * toast IS the kit Callout, floating — one alert design (2026-09-28). */
export function ToastViewport() {
  const items = useSyncExternalStore(subscribe, getToasts, () => EMPTY);
  if (items.length === 0) return null;
  return (
    <div
      // Lifted by --ops-toast-offset (a plain :root variable, default 0px):
      // an app with a bottom-right bubble of its own sets it so neither
      // hides the other; full width minus the gutter on phones.
      className="pointer-events-none fixed right-4 bottom-[calc(max(1.25rem,env(safe-area-inset-bottom))+var(--ops-toast-offset,0px))] z-[var(--ops-z-toast,60)] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 sm:right-5"
      aria-live="assertive"
      role="region"
    >
      {items.map((item) => (
        <div
          key={item.id}
          data-toast={item.tone}
          className="pointer-events-auto motion-safe:animate-[toast-in_180ms_ease-out]"
        >
          <Callout
            tone={item.tone}
            floating
            role={item.tone === "danger" ? "alert" : "status"}
            bodyClassName="flex flex-col items-start gap-1.5"
            trailing={
              <button
                type="button"
                aria-label={item.closeLabel}
                onClick={() => dismissToast(item.id)}
                // 1.7.0: 44 x 44 under the touch floor (26 x 26 otherwise, unchanged); the larger
                // negative margin keeps the toast as tall as before, the target reaching past it.
                className={cn("-my-1 shrink-0 rounded-control p-1.5 text-sm leading-none text-ink-muted transition-colors duration-150 hover:bg-surface hover:text-ink", TOUCH_FLOOR.height, TOUCH_FLOOR.width, "[@media(hover:none)_and_(pointer:coarse)]:in-data-ops-touch:-my-3.5")}
              >
                ✕
              </button>
            }
          >
            <p className="whitespace-pre-line">{item.message}</p>
            {item.action && (
              <button
                type="button"
                onClick={() => {
                  dismissToast(item.id);
                  item.action?.onClick();
                }}
                className={cn("font-medium underline underline-offset-2", CALLOUT_TONE[item.tone].ink)}
              >
                {item.action.label}
              </button>
            )}
          </Callout>
        </div>
      ))}
    </div>
  );
}

/** Page-root host: draws the stack whenever no dialog holds it. */
export function Toaster() {
  const current = useSyncExternalStore(subscribe, getHosts, () => NO_HOSTS);
  if (current.length > 0) return null;
  return <ToastViewport />;
}
