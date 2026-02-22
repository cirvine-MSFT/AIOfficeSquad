# Hawkins — History

## Project Context
AI Office Squad: Native Electron desktop app for managing AI agent squads. Uses @bradygaster/squad-sdk for programmatic multi-agent orchestration. User: Casey Irvine. Tech: Electron, React, Tailwind CSS, Squad SDK.

## Learnings
- Dense type scale (10–24px) with 13px as the default body size works well for dev-tool UIs — matches VS Code/Linear density
- Dark navy-charcoal backgrounds (#0f1117 base) read better than pure black; the slight blue undertone reduces eye strain
- Each agent role needs three color variants (accent, light text, dim background) to support badges, avatars, and tinted surfaces
- CSS custom properties must mirror every Tailwind token so Poncho can use them in inline styles and non-Tailwind contexts
- Inter variable font with `cv02 cv03 cv04 cv11` feature settings gives better number and character readability at small sizes
- Status indicators should be instant (no transition) for urgency, but working state uses a 2s pulse to show "alive" visually
- Shadows on dark themes must be heavier (0.3–0.5 opacity) than light themes to register visually
