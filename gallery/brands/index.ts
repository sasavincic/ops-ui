/** The gallery brands. Each is a fixture file in this folder that sets the --brand-* variables on html[data-brand=x]. */
export const BRANDS = ["workforce", "finaops", "prefab"] as const;
export type Brand = (typeof BRANDS)[number];

export function isBrand(value: string): value is Brand {
  return (BRANDS as readonly string[]).includes(value);
}

/** The ten variables every brand must declare (spec §8.3). */
export const REQUIRED_BRAND_VARIABLES = [
  "--brand-sidebar",
  "--brand-sidebar-fg",
  "--brand-sidebar-fg-active",
  "--brand-sidebar-hover",
  "--brand-sidebar-active",
  "--brand-sidebar-border",
  "--brand-primary",
  "--brand-primary-hover",
  "--brand-primary-subtle",
  "--brand-accent",
] as const;
