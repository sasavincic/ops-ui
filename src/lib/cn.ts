// L2 import: cn and its tailwind-merge extension, copied verbatim from workforce-ops origin/main (cea4928) src/lib/utils.ts.

import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge has to be TOLD about our own font sizes.
 *
 * `--text-detail` and `--text-micro` produce `text-detail` / `text-micro`,
 * which look exactly like colour utilities (`text-white`, `text-ink`). Not
 * knowing them, tailwind-merge filed them under colour — so in any class
 * list where a colour came first, the size silently deleted the colour.
 *
 * That is how every `size="sm"` primary button ended up with black text on
 * blue: cva emits `bg-primary text-white` then `h-8 px-3 text-detail`, and
 * the merge dropped `text-white`. Nothing failed — the class was simply not
 * there. Any new step added to the type scale in globals.css must be added
 * here too.
 */
const twMerge = extendTailwindMerge({
  extend: { classGroups: { "font-size": [{ text: ["detail", "micro"] }] } },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
