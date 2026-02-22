# Decision: Design System Foundation

**Author:** Hawkins (UI/Design)
**Date:** 2026-02-22
**Status:** Implemented
**Affects:** apps/desktop/

## Context

Squad Office needs a design system before any React components can be built. The app is a productivity tool for dev teams — it must look professional, feel fast, and display dense information without clutter.

## Decision

Created a dark-theme-only design system with these key choices:

1. **Dark navy-charcoal palette** (`#0f1117` base) instead of pure black — reduces eye strain, adds depth with layered surfaces from `#0f1117` → `#151820` → `#1a1d27`

2. **13px default body text** — smaller than typical web (16px) but standard for dev tools. Full scale from 10px (micro labels) to 24px (heroes).

3. **8 distinct role accent colors** with 3 variants each (accent, light, dim) — enables role badges, tinted surfaces, and avatar circles without collision.

4. **Dual token system** — Tailwind config + CSS custom properties + TypeScript constants. All three stay in sync. This lets Poncho use Tailwind classes for most things, CSS vars for edge cases, and TS constants for runtime logic.

5. **150ms "snappy" transitions** with a custom cubic-bezier — fast enough to feel instant, slow enough to be perceived.

6. **Inter + JetBrains Mono** loaded from Google Fonts — no npm packages, keeps bundle small.

## Alternatives Considered

- **Pure black backgrounds:** Too harsh, creates "OLED dark mode" look that's fatiguing
- **Light mode support:** Deferred — adds complexity, team doesn't want it
- **Tailwind v4:** Too new, breaking changes, ecosystem not ready
- **Component library (shadcn, etc.):** Decided to build from tokens up for full control over the dev-tool aesthetic

## Files Created

- `apps/desktop/tailwind.config.ts` — Full Tailwind 3.4 config
- `apps/desktop/postcss.config.js` — PostCSS pipeline
- `apps/desktop/src/renderer/styles/globals.css` — Base styles, CSS vars, scrollbar/focus/selection
- `apps/desktop/src/renderer/styles/design-tokens.ts` — TypeScript constants for React
- `apps/desktop/DESIGN.md` — Design spec document
