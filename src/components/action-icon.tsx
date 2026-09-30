"use client";

import { createContext, useContext } from "react";
import { cn } from "../lib/cn";

// Workforce Ops rolled action icons out route by route; FinaOps starts with
// them everywhere. The scope stays so a surface can opt out (the wall-style
// print views) without touching the buttons it renders.
const IconScope = createContext(true);
export function ActionIconScope({
  enabled = true,
  children,
}: {
  enabled?: boolean;
  children: React.ReactNode;
}) {
  return <IconScope.Provider value={enabled}>{children}</IconScope.Provider>;
}

const paths = {
  add: "M8 2v12M2 8h12",
  edit: "m10.5 2.5 3 3-8 8-4 1 1-4zM9 4l3 3",
  save: "M2 2h10l2 2v10H2zM5 2v4h6V2M5 14V9h6v5",
  close: "m4 4 8 8M12 4l-8 8",
  check: "m3 8 3 3 7-7",
  delete: "M2 4h12M6 4V2h4v2M4 4l.5 10h7L12 4M6.5 6.5v5M9.5 6.5v5",
  archive: "M2 2h12v3H2zM3 5v9h10V5M6 8h4",
  restore: "M2 6h7a4 4 0 0 1 0 8H6M5 3 2 6l3 3",
  enter: "M10 2h4v12h-4M2 8h8M7 5l3 3-3 3",
  exit: "M6 2H2v12h4M6 8h8M11 5l3 3-3 3",
  calendar: "M2 4h12v10H2zM5 2v4M11 2v4M2 8h12",
  upload: "M8 11V2M5 5l3-3 3 3M2 10v4h12v-4",
  download: "M8 2v9M5 8l3 3 3-3M2 11v3h12v-3",
  document: "M3 1.5h6L13 6v8.5H3zM9 1.5V6h4M5.5 9h5M5.5 11.5h5",
  view: "M1 8s2.5-4.5 7-4.5S15 8 15 8s-2.5 4.5-7 4.5S1 8 1 8zM10 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0",
  copy: "M5 5h9v9H5zM11 5V2H2v9h3",
  send: "m2 2 12 6-12 6 2-6zM4 8h10",
  print: "M4 5V2h8v3M4 11H2V6h12v5h-2M4 9h8v5H4z",
  link: "m6 10 4-4M5 9l-1 1a2 2 0 0 0 3 3l2-2M7 5l2-2a2 2 0 0 1 3 3l-1 1",
  search: "M10.5 10.5 14 14M12 7a5 5 0 1 1-10 0 5 5 0 0 1 10 0",
  filter: "M2 3h12L9 8v5l-2 1V8z",
  list: "M5 4h9M5 8h9M5 12h9M2 4h.01M2 8h.01M2 12h.01",
  more: "M3 8h.01M8 8h.01M13 8h.01",
  up: "M8 14V2M4 6l4-4 4 4",
  down: "M8 2v12M4 10l4 4 4-4",
  back: "M14 8H2M6 4 2 8l4 4",
  forward: "M2 8h12M10 4l4 4-4 4",
  settings: "M2 4h12M2 12h12M5 2v4M11 10v4",
  exchange: "M2 5h12M11 2l3 3-3 3M14 11H2M5 8l-3 3 3 3",
  lock: "M3 7h10v7H3zM5 7V4a3 3 0 0 1 6 0v3",
  unlock: "M3 7h10v7H3zM6 7V4a3 3 0 0 1 6 0",
  user: "M10.5 4a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0M2 14v-2a6 6 0 0 1 12 0v2",
  bed: "M2 4v10M14 7v7M2 11h12M2 7h12M5 7V5H2",
  refresh: "M13 6a5 5 0 0 0-9-3L2 5M2 2v3h3M3 10a5 5 0 0 0 9 3l2-2M11 11h3v3",
} as const;
export type ActionIconName = keyof typeof paths;

/** Explicit action semantics; never infer icons from translated labels. */
export function ActionIcon({
  name,
  className,
  always = false,
}: {
  name: ActionIconName;
  className?: string;
  /** File controls carry a document glyph on every surface. */
  always?: boolean;
}) {
  const enabled = useContext(IconScope);
  if (!enabled && !always) return null;
  return (
    <svg
      aria-hidden="true"
      data-action-icon={name}
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("inline-block shrink-0 align-middle", className)}
    >
      <path d={paths[name]} />
    </svg>
  );
}
