# Tokens and the brand contract

The design tokens of `@latro/ops-ui` and what an app's brand may, must and must not declare
(spec §8). The library holds every token in **one `@theme` block** in `styles/tokens.css`; an app
holds its brand in `src/app/brand.css` as plain `:root { --brand-*: … }` variables, which
`tokens.css` reads through `var()`.

This file is part of the contract, not a description of it:

- `tests/tokens.test.ts` fails when a table below and `styles/tokens.css` disagree.
- `sync/sync-ops-ui.mjs` (shipped to every app as `scripts/sync-ops-ui.mjs`) checks an app's
  `brand.css` against the same contract in the sync pre-flight and in `checkVendor()`.
- The release script counts a new row under **Brand, required** as a major (spec §4.2).

## Rules

1. **Brand values never live in the library.** An app's `src/app/brand.css` holds only
   `:root { … }` rules with custom properties named `--brand-*` or `--ops-*`: no `@theme`, no
   other selector, no other property. The app imports it after the library styles.
2. **`:root` only.** Custom properties inherit their *substituted* values, so a brand variable set
   on a subtree would not re-theme anything. The gallery puts `data-brand` on `<html>`, which *is*
   `:root`.
3. **Theme gotcha.** Inside any `@theme` block (this library's `tokens.css`, an app's `globals.css`
   or `brand.css`) a comment must never contain a double-quote character: Tailwind has read it as
   the start of a string and silently dropped the declaration after the comment (the
   `--color-tool` incident, 2026-08-28). The tokens test and the sync refuse one.
4. **App extensions** are new names only, in the app's own `@theme` in `globals.css`, listed in
   its `ops-ui.config.json` `extensions`. The sync refuses a library release that takes one.
5. **No dark mode.**

## Fixed (15)

Declared by the library, never by an app.

| Token | Value |
|---|---|
| `--color-bg` | `oklch(1 0 0)` |
| `--color-warning` | `oklch(0.5 0.115 80)` |
| `--color-warning-subtle` | `oklch(0.965 0.05 90)` |
| `--color-danger` | `oklch(0.49 0.16 25)` |
| `--color-danger-subtle` | `oklch(0.96 0.022 20)` |
| `--color-info` | `oklch(0.47 0.1 240)` |
| `--color-info-subtle` | `oklch(0.95 0.028 240)` |
| `--color-admin` | `oklch(0.47 0.19 305)` |
| `--color-admin-subtle` | `oklch(0.955 0.035 305)` |
| `--font-sans` | `var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif` |
| `--font-mono` | `var(--font-geist-mono), ui-monospace, monospace` |
| `--text-detail` | `13px` |
| `--text-micro` | `11px` |
| `--radius-control` | `6px` |
| `--radius-container` | `8px` |

`--font-geist-sans` / `--font-geist-mono` come from the app layout (`next/font`), not from a
brand file.

## Brand, required (10)

Every app declares all of them on `:root`. The library has no fallback, so a missing one is
refused by the sync and by the app's vendor test.

| Token | Brand variable |
|---|---|
| `--color-sidebar` | `--brand-sidebar` |
| `--color-sidebar-fg` | `--brand-sidebar-fg` |
| `--color-sidebar-fg-active` | `--brand-sidebar-fg-active` |
| `--color-sidebar-hover` | `--brand-sidebar-hover` |
| `--color-sidebar-active` | `--brand-sidebar-active` |
| `--color-sidebar-border` | `--brand-sidebar-border` |
| `--color-primary` | `--brand-primary` |
| `--color-primary-hover` | `--brand-primary-hover` |
| `--color-primary-subtle` | `--brand-primary-subtle` |
| `--color-accent` | `--brand-accent` |

## Brand, optional role (1)

A role an app may give its own colour. Rule: when set, at least 3:1 against `--color-bg`.

| Token | Brand variable | Default |
|---|---|---|
| `--color-external` | `--brand-external` | `--brand-accent` |

`--color-external` is the "not ours" colour: the Monogram `external` tone (a subcontractor, a
company that is not one of the group).

## Brand, optional tint (7)

The neutrals. The defaults are Workforce Ops' values. Rule: OKLCH; lightness within ±0.01 of the
default; chroma at most 0.025; hue free.

| Token | Brand variable | Default |
|---|---|---|
| `--color-surface` | `--brand-surface` | `oklch(0.975 0.003 250)` |
| `--color-surface-raised` | `--brand-surface-raised` | `oklch(0.955 0.005 250)` |
| `--color-border` | `--brand-border` | `oklch(0.9 0.006 250)` |
| `--color-border-strong` | `--brand-border-strong` | `oklch(0.8 0.01 250)` |
| `--color-ink` | `--brand-ink` | `oklch(0.21 0.015 255)` |
| `--color-ink-secondary` | `--brand-ink-secondary` | `oklch(0.42 0.02 255)` |
| `--color-ink-muted` | `--brand-ink-muted` | `oklch(0.52 0.02 255)` |

## Brand, tunable status (2)

Rule: OKLCH, hue 140 to 160 (FinaOps' 145 is deliberate: its success must not read as its teal
primary).

| Token | Brand variable | Default |
|---|---|---|
| `--color-success` | `--brand-success` | `oklch(0.48 0.11 155)` |
| `--color-success-subtle` | `--brand-success-subtle` | `oklch(0.955 0.04 155)` |

## Layout variable (1)

A plain `:root` variable, never in `@theme` (Tailwind drops theme variables that no utility
uses). The kit reads it with a `var()` fallback.

| Variable | Default | Read by |
|---|---|---|
| `--ops-toast-offset` | `0px` | the toast viewport: `bottom: calc(max(1.25rem, env(safe-area-inset-bottom)) + var(--ops-toast-offset, 0px))` |

## App extensions

| App | Tokens |
|---|---|
| Workforce Ops | `--color-tool`, `--color-sick`, `--color-sick-subtle` |
| FinaOps | none |

## Contrast

Every brand meets these (WCAG ratio, OKLCH converted to sRGB and clipped to its gamut; `white` is
the kit's literal `text-white`).

| Foreground | Background | Minimum |
|---|---|---|
| `white` | `--color-primary` | 4.5 |
| `--color-sidebar-fg` | `--color-sidebar` | 4.5 |
| `--color-ink` | `--color-bg` | 4.5 |
| `--color-ink-muted` | `--color-surface` | 4.5 |
| `--color-success` | `--color-success-subtle` | 4.5 |
| `--color-external` | `--color-bg` | 3 (only when `--brand-external` is set) |

The fixed status pairs are the library's own colours, checked once by the library test:

| Foreground | Background | Ratio |
|---|---|---|
| `--color-warning` | `--color-warning-subtle` | 5.48 |
| `--color-danger` | `--color-danger-subtle` | 5.99 |
| `--color-admin` | `--color-admin-subtle` | 6.54 |
| `--color-info` | `--color-info-subtle` | 5.84 |
| `white` | `--color-danger` | 6.81 |

## Not tokens

The kit's literal `text-white` (on primary and danger fills), its `bg-ink/40` backdrops, and
`rounded-[4px]` / `rounded-sm` / `rounded-full` stay literal.
