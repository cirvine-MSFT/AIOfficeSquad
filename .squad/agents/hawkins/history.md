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
- **Building/Floor/Office UI hierarchy** maps Squad concepts to a physical metaphor: Hub=Building (shows squads as floors), Squad=Floor (shows sessions as office rooms), Session=Office (shows agents working). Each level drills down with smooth transitions.
- Building visualization uses lit/unlit windows to indicate activity — lit windows correlate to active sessions on that floor
- Floor cards work well with a status indicator dot in the top-right corner + subtle glow for active sessions
- Breadcrumb navigation is essential for the drill-down model: Hub > Squad Name > Session #N
- Agent workspace cards should show activity text in a mono-font code-style box to feel like real dev work
- Chat panel with streaming output creates a "control room" feel where you observe and direct the squad
- Updated mockup with office-building personality, water cooler idle state, floor-plan pod layout
- UI terminology: Use "members" or "squad members" everywhere, NEVER "agents"
- Idle members should be visualized at a "water cooler" area with emoji (🧍☕🚰) — shows them chatting/on break
- Working members are "at their desk" with 🧑‍💻 emoji and subtle typing animation
- Floor view uses CSS floor-plan feel with office pods (rooms with doorways), desks, and walls instead of flat cards
- Lit windows on building view use warm yellow glow (#fbbf24) to feel like real office lights at night
- **Water cooler placement:** The water cooler is ONLY inside session views (office view), NOT at the floor level. Idle members within a specific session hang at the water cooler in that session's office space.
- **Floor view as hallway:** Sessions are rendered as office rooms you peek into through glass walls - not flat cards. Each room shows miniature desks, activity indicators, and a summary of who's working vs. at the cooler.
- **Session view maintains office aesthetic:** The drilled-in session view looks like stepping into an office room with workstations (desks with monitors) on one side and a break lounge (water cooler area) on the other. No cardy/dashboard feel.
- **Glass wall effect:** Office rooms on floor view use subtle gradient overlays to simulate looking through glass, with reflection effects and depth via shadows.
- **Workstation design:** Individual desks in session view show monitors with glow effects, desk surfaces, chairs, and nameplates - feels like real office furniture, not abstract cards.
- **Chat panel as control center:** Styled with stronger borders, accent bars, and a terminal output monitor at the bottom - feels like a command center or coordination space within the office.

