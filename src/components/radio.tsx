"use client";

import { createContext, useContext } from "react";
import { useReadOnlyScope } from "../config/read-only";
import { cn } from "../lib/cn";
import { TOUCH_FLOOR } from "../lib/touch";
import { GAP_CLASS, type Gap } from "../lib/gap";

/**
 * Choice controls (1.6.0, styling programme §4.6): `Radio` (the kit Checkbox's look with a round
 * mark), `ChoiceTile` (a bordered tile that is one option of a pick: the issuing company, the quote
 * type), and `RadioGroup`, which holds the group's `name`, `value` and `onChange` so its Radios and
 * ChoiceTiles only say their own `value`. Every class is the measured app recipe (the tests compare
 * them), so adopting one is a 0-changed-pixel codemod.
 *
 * Read-only: inside a WriteScope the session cannot write to, a Radio or ChoiceTile is disabled
 * (it still shows the choice) unless `readOnlySafe`, like every kit field.
 */

type GroupState = { name?: string; value?: string; onChange?: (value: string) => void };
const RadioGroupContext = createContext<GroupState | null>(null);

type ReadOnlyProps = { readOnlySafe?: boolean };

function useLocked(readOnlySafe?: boolean): boolean {
  return useReadOnlyScope() && !readOnlySafe;
}

/** The input's name, checked state and change handler: its own props first, else the group's. */
function useGroupInput(props: React.ComponentProps<"input">) {
  const group = useContext(RadioGroupContext);
  const value = props.value === undefined ? undefined : String(props.value);
  const inGroup = group !== null && value !== undefined;
  return {
    name: props.name ?? (inGroup ? group.name : undefined),
    checked: props.checked ?? (inGroup && group.value !== undefined ? group.value === value : undefined),
    onChange:
      props.onChange ??
      (inGroup && group.onChange ? () => group.onChange?.(value as string) : undefined),
  };
}

export type RadioGroupOrientation = "vertical" | "horizontal";

const ORIENTATION_CLASS: Record<RadioGroupOrientation, string> = {
  vertical: "flex flex-col",
  horizontal: "flex flex-wrap",
};

/**
 * A group of Radios or ChoiceTiles: `role="radiogroup"`, laid out as a column (`vertical`, the
 * Stack recipe) or a wrapping row (`horizontal`, Cluster with `align="stretch"`), with `gap` as
 * Stack. Name it with `aria-label` / `aria-labelledby`, or render it `as="fieldset"` with a legend.
 */
export function RadioGroup({
  as = "div",
  name,
  value,
  onChange,
  orientation,
  gap,
  className,
  children,
  ...props
}: {
  as?: "div" | "fieldset";
  /** The radios' shared name (a form post carries the picked value under it). */
  name?: string;
  /** The picked value. */
  value?: string;
  onChange?: (value: string) => void;
  orientation: RadioGroupOrientation;
  gap?: Gap;
  /** With `as="fieldset"`: disables every radio and tile inside (the browser's own rule). */
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
} & Omit<React.ComponentProps<"div">, "onChange" | "className" | "children">) {
  const Tag = as as React.ElementType;
  return (
    <RadioGroupContext.Provider value={{ name, value, onChange }}>
      <Tag
        role="radiogroup"
        className={cn(ORIENTATION_CLASS[orientation], gap !== undefined && GAP_CLASS[gap], className)}
        {...props}
      >
        {children}
      </Tag>
    </RadioGroupContext.Provider>
  );
}

/**
 * A radio with its label: exactly the kit Checkbox's markup with `type="radio"` (label `flex
 * items-center gap-2 text-sm text-ink`, the 16px primary mark). `className` styles the label.
 */
export function Radio({
  label,
  className,
  readOnlySafe,
  ...props
}: Omit<React.ComponentProps<"input">, "type"> & { label: React.ReactNode } & ReadOnlyProps) {
  const locked = useLocked(readOnlySafe);
  const group = useGroupInput(props);
  const disabled = props.disabled || locked;
  return (
    <label
      className={cn(
        "flex items-center gap-2 text-sm text-ink",
        // 1.8.0: as the labelled Checkbox, under the touch floor the row is 44px tall and the mark 20px.
        TOUCH_FLOOR.height,
        disabled && "cursor-not-allowed text-ink-muted",
        className
      )}
    >
      <input
        type="radio"
        className={cn("size-4 accent-primary", "[@media(hover:none)_and_(pointer:coarse)]:in-data-ops-touch:size-5")}
        {...props}
        {...group}
        disabled={disabled}
      />
      {label}
    </label>
  );
}

export type ChoiceTileLayout = "row" | "compact" | "stacked";

/** The tile's layout classes, one measured recipe each (spec §4.6). */
export const CHOICE_TILE_LAYOUT: Record<ChoiceTileLayout, string> = {
  /** A mark and a name in a row (the employer picker's companies). */
  row: "flex min-h-11 min-w-0 items-center gap-2 px-3 py-2 text-sm",
  /** A square tile that holds a mark on phones and mark + name from sm (the quote's issuer). */
  compact: "flex min-h-11 min-w-11 items-center justify-center gap-2 px-2.5 py-2 text-detail sm:min-h-10 sm:justify-start",
  /** Lines stacked and centred, left-aligned from sm (the quote type: short word, then its name). */
  stacked: "flex min-h-11 min-w-0 flex-col justify-center gap-0.5 px-2.5 py-2 text-center text-detail sm:min-h-0 sm:text-left",
};

/** The tile's frame and states, whatever the layout. */
export const CHOICE_TILE_FRAME =
  "cursor-pointer rounded-control border transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60";

/**
 * One option of a pick drawn as a bordered tile: the whole tile is the target, the radio itself is
 * visually hidden (`sr-only`, still focusable and posted), a picked tile turns primary-subtle with a
 * primary border, the keyboard focus draws an outline around the tile. `children` are the tile's
 * content (a Monogram and a name); `title` goes on the tile, every other prop on the radio.
 */
export function ChoiceTile({
  layout = "row",
  title,
  className,
  readOnlySafe,
  children,
  ...props
}: Omit<React.ComponentProps<"input">, "type" | "title" | "children"> & {
  layout?: ChoiceTileLayout;
  /** The tile's tooltip (the full name when the tile shows a short one). */
  title?: string;
  children: React.ReactNode;
} & ReadOnlyProps) {
  const locked = useLocked(readOnlySafe);
  const group = useGroupInput(props);
  const checked = Boolean(group.checked);
  return (
    <label
      title={title}
      className={cn(
        CHOICE_TILE_LAYOUT[layout],
        CHOICE_TILE_FRAME,
        checked ? "border-primary bg-primary-subtle text-primary" : "border-border-strong hover:bg-surface",
        className
      )}
    >
      <input type="radio" className="sr-only" {...props} {...group} disabled={props.disabled || locked} />
      {children}
    </label>
  );
}
