/**
 * The gap steps the layout primitives take (Stack, Cluster; spec: styling programme §4.4).
 * Written out as whole class names so Tailwind, which scans the vendored source, generates them.
 */
export const GAP_CLASS = {
  0.5: "gap-0.5",
  1: "gap-1",
  1.5: "gap-1.5",
  2: "gap-2",
  2.5: "gap-2.5",
  3: "gap-3",
  4: "gap-4",
  5: "gap-5",
  6: "gap-6",
} as const;

export type Gap = keyof typeof GAP_CLASS;
