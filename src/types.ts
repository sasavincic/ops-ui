// The kit's React-free types (spec §3.1, §7). An app's domain modules
// (status-meta, search, compliance) import these instead of pointing at a
// component module, so the domain never depends on a React file. Each
// component re-exports the types it uses, so every existing import from a
// component keeps working. No React import here, ever.

/** Badge `variant` / StateMark `tone`: the status pill colours. */
export type BadgeVariant = "neutral" | "success" | "warning" | "danger" | "info";

/**
 * The status glyph vocabulary (StatusIcon): one glyph per meaning (status
 * doctrine 2026-09-25, §5). The meanings are listed in status-icon.tsx.
 */
export type StatusIconName =
  | "current"
  | "check"
  | "clock"
  | "alert"
  | "problem"
  | "question"
  | "close"
  | "draft"
  | "ended"
  | "inactive"
  | "archive"
  | "key"
  | "lock"
  | "send"
  | "minus"
  | "info";

/** The action glyph vocabulary (ActionIcon): explicit action semantics. */
export type ActionIconName =
  | "add"
  | "edit"
  | "save"
  | "close"
  | "check"
  | "delete"
  | "archive"
  | "restore"
  | "enter"
  | "exit"
  | "calendar"
  | "upload"
  | "download"
  | "document"
  | "view"
  | "copy"
  | "send"
  | "print"
  | "link"
  | "search"
  | "filter"
  | "list"
  | "more"
  | "up"
  | "down"
  | "back"
  | "forward"
  | "settings"
  | "exchange"
  | "lock"
  | "unlock"
  | "user"
  | "bed"
  | "refresh"
  | "sparkle"
  | "mail";

/** An outlined status mark: the tone and glyph of a StateMark. */
export type StateMarkSpec = { tone: BadgeVariant; icon: StatusIconName };

/** Callout tones, after the colour doctrine (see callout.tsx). */
export type CalloutTone = "danger" | "warning" | "info" | "success" | "neutral" | "admin";

/** Toast tones. */
export type ToastTone = "danger" | "warning" | "info" | "success";

/** The one follow-up act a toast may offer ("Read again"). */
export type ToastAction = { label: string; onClick: () => void };
