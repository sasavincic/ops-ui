# Changelog

Every release of @latro/ops-ui, newest first (spec §4.3). Each section is `## X.Y.Z — date` with
`Added:` / `Changed:` / `Fixed:` / `Visible:` / `Breaking:` / `Upgrade steps:` lines; a major
names every pixel change (`Visible:`, per component) and the exact steps per app
(`Upgrade steps:`). The sync prints the sections between an app's version and the new one.

## 1.0.0 — unreleased
Added: the kit, a pure extraction: the 35 kit files of FinaOps (fina-ops 80828fc, src/components/ui) as src/components/, with the §7 and §9 changes only; from Workforce Ops (workforce-ops cea4928) navigation/ (trail, history, NavTrail) and lib/ (cn, fmt, text, dates, date-input, use-dismissable); lib/months.ts from FinaOps.
Added: config/ (OpsUiProvider, useOpsUi, OpsUiStrings, EN_STRINGS; ReadOnlyScope, useReadOnlyScope), types.ts, version.ts.
Added: styles/tokens.css (the @theme contract, brand values through --brand-* variables), kit.css, base.css, app-feel.css; TOKENS.md (the contract), DESIGN.md (the shared doctrine).
Added: stories for every component (src/stories, StoryHost for an app's /dev/kit view).
Added: scripts/sync-ops-ui.mjs and its declarations scripts/sync-ops-ui.d.mts.
Browser floor: color-mix() (Safari 16.2+, Chrome 111+, Firefox 113+). The brand tokens are var() indirections, so for a browser without color-mix() Tailwind cannot precompute an opacity-modified brand colour (bg-primary/10, ring-primary/25, bg-ink/40, the external Monogram's bg-external/10): its fallback there is the opaque token, where the apps' literal tokens degraded to a translucent tint. Tailwind v4's own floor (Safari 16.4, Chrome 111, Firefox 128) already lies above it, so no browser either app supports sees a difference.
Upgrade steps: none (the first release); each app adopts it through the steps of spec §12.2 (FinaOps F0-F7) and §12.3 (Workforce Ops W0-W8). Its globals.css scans the vendor folder and nothing else the adoption puts in the app tree (spec §8.4): the @source line plus one @source not line each for the vendored .md files, scripts/sync-ops-ui.*, ops-ui.config.json and ops-ui.lock.json (Tailwind's automatic detection reads root JSON, and a config lists token names), so neither a docs-only release nor a config edit changes the app's CSS or its token dump. Once globals.css imports the library tokens, the sync refuses an app @theme that declares anything but its listed extensions, a rule that sets a library token or a brand variable outside brand.css, and a missing brand.css import (spec §8.5 check 7).
