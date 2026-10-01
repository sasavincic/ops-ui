// The suite's apps, for the AppSwitcher (spec §10, library 1.1.0). React-free: an app may read
// the list on the server too. A changed URL or colour is a minor (the DOM changes, no baseline
// pixel does: the gallery's stories pass the list they draw).

export type OpsAppId = "workforce" | "finaops" | "prefab";

export type OpsApp = {
  id: OpsAppId;
  name: string;
  /** The production URL, opened in the same tab; null = not deployed yet, not listed. */
  href: string | null;
  /** The app's sidebar colour: the entry's dot. */
  color: string;
};

/** Values decided 2026-10-01. FinaOps is a demo until the end of 2026, so it stays hidden. */
export const OPS_APPS: readonly OpsApp[] = [
  { id: "workforce", name: "Workforce Ops", href: "https://workforce-ops.vercel.app", color: "#0b131e" },
  { id: "finaops", name: "FinaOps", href: null, color: "#083a25" },
  // PrefabOps' new dark steel-blue sidebar, oklch(0.28 0.066 249) (styling programme §7.3).
  { id: "prefab", name: "PrefabOps", href: "https://prefab-ops-platform.vercel.app", color: "#092a48" },
];
