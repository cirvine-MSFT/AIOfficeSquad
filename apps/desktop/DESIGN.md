# Squad Campus — Design System

> Dark-first, information-dense, keyboard-driven UI for managing AI agent squads.
> Think VS Code meets Linear meets Discord.

---

## Color System

### Background Shades (dark navy-charcoal)

| Token          | Hex       | Use                              |
| -------------- | --------- | -------------------------------- |
| `bg`           | `#0f1117` | App background                   |
| `bg-raised`    | `#151820` | Sidebar, panels                  |
| `bg-surface`   | `#1a1d27` | Cards, dropdowns, popovers       |
| `bg-hover`     | `#1f2330` | Interactive hover state           |
| `bg-active`    | `#252936` | Selected/active state             |
| `bg-overlay`   | `#0d0f14` | Modal backdrop                   |

### Text Hierarchy

| Token            | Hex       | Contrast | Use                       |
| ---------------- | --------- | -------- | ------------------------- |
| `text-primary`   | `#e8eaf0` | 13.2:1   | Headings, body text       |
| `text-secondary` | `#9ba1b0` | 6.5:1    | Descriptions, metadata    |
| `text-tertiary`  | `#636a7c` | 3.8:1    | Placeholders, disabled    |

### Agent Role Accent Colors

Each agent role has a primary accent, a light variant (for text), and a dim variant (for backgrounds).

| Role         | Accent    | Light     | Dim BG    |
| ------------ | --------- | --------- | --------- |
| Lead         | `#f5a623` | `#fcd281` | `#3d2e10` |
| Frontend     | `#38bdf8` | `#7dd3fc` | `#0c2d42` |
| Backend      | `#4ade80` | `#86efac` | `#0d3320` |
| Tester       | `#a78bfa` | `#c4b5fd` | `#2a1f54` |
| Squad Expert | `#fb923c` | `#fdba74` | `#3d2010` |
| Design       | `#f472b6` | `#f9a8d4` | `#3d1028` |
| Scribe       | `#94a3b8` | `#cbd5e1` | `#1e2736` |
| Monitor      | `#2dd4bf` | `#5eead4` | `#0d3330` |

### Status Colors

| Status  | Hex       | Indicator                 |
| ------- | --------- | ------------------------- |
| Active  | `#4ade80` | Solid green dot + glow    |
| Idle    | `#facc15` | Solid yellow dot          |
| Error   | `#f87171` | Solid red dot             |
| Working | `#60a5fa` | Blue pulsing dot          |

### Accent (Interactive)

| Token           | Hex       | Use                        |
| --------------- | --------- | -------------------------- |
| `accent`        | `#5b8def` | Primary buttons, links     |
| `accent-hover`  | `#7ba4f7` | Hover state                |
| `accent-pressed`| `#4a73cc` | Active/pressed state       |
| `accent-muted`  | `#1e2d4d` | Subtle accent backgrounds  |

---

## Typography

**Font:** Inter (variable, loaded from Google Fonts)
**Mono:** JetBrains Mono (for code, terminal output)

### Size Scale (dense UI optimized)

| Token  | Size   | px  | Use                              |
| ------ | ------ | --- | -------------------------------- |
| `2xs`  | 0.625  | 10  | Micro labels, timestamps         |
| `xs`   | 0.6875 | 11  | Status bar, badges               |
| `sm`   | 0.75   | 12  | Sidebar items, metadata          |
| `base` | 0.8125 | 13  | Body text (primary reading size) |
| `md`   | 0.875  | 14  | Primary content, chat messages   |
| `lg`   | 1.0    | 16  | Section headers                  |
| `xl`   | 1.125  | 18  | Page titles                      |
| `2xl`  | 1.5    | 24  | Hero/modal titles                |

**Weight usage:**
- `400` — body text
- `500` — labels, sidebar items, emphasis
- `600` — headings, active tabs
- `700` — sparingly, for strong emphasis

---

## Component Patterns

### Cards

```
┌──────────────────────────┐  bg-surface
│  ░░░░░░░░░░░░░░░░░░░░░░  │  border: border-DEFAULT
│  Content                  │  radius: rounded-lg (8px)
│                           │  shadow: elevation-1
└──────────────────────────┘  padding: p-3 or p-4
```

- Use `bg-surface` with `border border-border` and `rounded-lg`
- Hover: transition to `bg-hover`, optionally add `elevation-2`
- Active/selected: `bg-active` with left accent border or ring

### Buttons

**Primary:** `bg-accent text-white rounded-md px-3 py-1.5 text-sm font-medium`
Hover: `bg-accent-hover`. Active: `bg-accent-pressed`.

**Secondary:** `bg-bg-surface border border-border text-text-primary rounded-md`
Hover: `bg-bg-hover`.

**Ghost:** `bg-transparent text-text-secondary rounded-md`
Hover: `bg-bg-hover text-text-primary`.

**Danger:** `bg-status-error/10 text-status-error rounded-md`
Hover: `bg-status-error/20`.

All buttons: `text-sm`, `h-8` (32px), `transition-default`.

### Inputs

```
bg-bg border border-border rounded-md px-3 py-1.5 text-sm text-text-primary
placeholder:text-text-tertiary
focus:border-border-focus focus:ring-1 focus:ring-border-focus
```

### Badges / Chips

Role badge: `bg-role-{role}-dim text-role-{role}-light text-xs px-2 py-0.5 rounded-sm font-medium`

Status badge: `text-xs font-medium` with matching status color.

### Status Dots

- **Active:** 8×8 green circle with subtle glow shadow
- **Idle:** 8×8 yellow circle, no glow
- **Error:** 8×8 red circle, no glow
- **Working:** 8×8 blue circle with `animate-pulse-status` (2s ease-in-out infinite)

---

## Layout Structure

```
┌─────────────────────────────────────────────────────┐
│ Header                                          48px │
│ app-drag region, title, squad selector, status      │
├──────────┬──────────────────────┬───────────────────┤
│ Sidebar  │ Main Content         │ Detail Panel      │
│ 280px    │ flex-1               │ 320px min         │
│ fixed    │                      │ collapsible       │
│          │                      │                   │
│ • Squad  │ BuildingView         │ ChatPanel         │
│   list   │   or PodView         │   or StreamOutput │
│ • Agent  │                      │   or AgentDetail  │
│   roster │                      │                   │
│          │                      │                   │
├──────────┴──────────────────────┴───────────────────┤
│ Status Bar                                      32px │
│ connection • active sessions • token cost           │
└─────────────────────────────────────────────────────┘
```

**Sidebar:** `bg-bg-raised`, right border. Scrollable. Contains squad list (collapsible groups) and agent roster.

**Main content:** `bg-bg`, no border. Flexible width. Primary working area.

**Detail panel:** `bg-bg-raised`, left border. 320px min-width, collapsible via hotkey. Chat, streaming output, or agent detail.

**Header:** `bg-bg-raised`, bottom border. 48px. Draggable region for Electron.

**Status bar:** `bg-bg-raised`, top border. 32px. Monospace-friendly for counts and metrics.

---

## Agent Avatar System

Colored circles with white initials. Color determined by role (primary) or deterministic hash of agent name (fallback).

### Sizes

| Size | Diameter | Font  | Use                         |
| ---- | -------- | ----- | --------------------------- |
| sm   | 24px     | 10px  | Inline mentions, status bar |
| md   | 32px     | 13px  | Sidebar roster, chat        |
| lg   | 40px     | 16px  | Agent detail, pod view      |

### Rendering

```
<div class="flex items-center justify-center rounded-full
  w-8 h-8 text-base font-semibold text-white"
  style="background-color: {role accent color}">
  {initials}
</div>
```

For agents with a known role, use the role accent color. For generic agents, use `getAvatarColor(name)` from design tokens.

---

## Keyboard Shortcut Display

Use the `.kbd` class for displaying keyboard shortcuts:

```html
<span class="kbd">⌘</span> <span class="kbd">K</span>
```

Renders as small bordered rectangles with subtle inner shadow — same convention as VS Code and GitHub.

**Style:** `bg-bg-hover`, `border-border-strong`, `rounded-sm`, `text-2xs`, min-width 20px, centered.

---

## Animation & Transition Guidelines

### Principles

1. **Fast by default** — 150ms for most interactions
2. **Meaningful motion** — animate to show spatial relationships, not for decoration
3. **Reduce motion** — respect `prefers-reduced-motion` (Tailwind handles this)

### Transition Presets

| Name    | Duration | Easing                        | Use                          |
| ------- | -------- | ----------------------------- | ---------------------------- |
| fast    | 100ms    | ease-out                      | Hover states, color changes  |
| base    | 150ms    | ease-out                      | Most interactions            |
| slow    | 250ms    | ease-out                      | Panel open/close, modals     |
| snappy  | 150ms    | cubic-bezier(0.2, 0, 0, 1)   | Sidebar items, selections    |

### Animation Library

| Animation         | Use                                    |
| ----------------- | -------------------------------------- |
| `fade-in`         | Elements appearing (150ms)             |
| `fade-in-up`      | Cards, list items loading (200ms)      |
| `slide-in-right`  | Detail panel opening (200ms)           |
| `slide-in-left`   | Sidebar sections expanding (200ms)     |
| `pulse-status`    | Working status indicator (2s loop)     |
| `scale-in`        | Dropdowns, popovers appearing (150ms)  |
| `shimmer`         | Loading/skeleton states (2s loop)      |

### Rules

- **Never animate layout shifts** — use transform and opacity only
- **Panel transitions:** slide + fade, 200ms
- **Chat messages:** fade-in-up, staggered by 50ms
- **Status changes:** instant color swap, no transition (urgency)
- **Loading states:** shimmer or pulse, not spinners

---

## Elevation (Shadows)

| Level       | Shadow                                    | Use                       |
| ----------- | ----------------------------------------- | ------------------------- |
| elevation-1 | `0 1px 2px rgba(0,0,0,0.3)`              | Cards, raised surfaces    |
| elevation-2 | `0 2px 8px rgba(0,0,0,0.4)`              | Dropdowns, hover cards    |
| elevation-3 | `0 8px 24px rgba(0,0,0,0.5)`             | Modals, command palette   |
| glow-accent | `0 0 12px rgba(91,141,239,0.25)`         | Focused accent elements   |
| glow-status | `0 0 8px rgba(74,222,128,0.3)`           | Active status indicators  |

---

## Border Radius

| Token | Value | Use                          |
| ----- | ----- | ---------------------------- |
| sm    | 4px   | Badges, chips, kbd           |
| md    | 6px   | Buttons, inputs              |
| lg    | 8px   | Cards, panels                |
| xl    | 12px  | Modals, command palette      |
| full  | 9999  | Avatars, dots                |

---

## Files

| File                                             | Purpose                           |
| ------------------------------------------------ | --------------------------------- |
| `apps/desktop/tailwind.config.ts`                | Full Tailwind 3.4 configuration   |
| `apps/desktop/postcss.config.js`                 | PostCSS with Tailwind + autoprefixer |
| `apps/desktop/src/renderer/styles/globals.css`   | Global styles, CSS variables, base |
| `apps/desktop/src/renderer/styles/design-tokens.ts` | TypeScript constants for React   |
