# Decisions Log

## 2026-02-22T18:40Z: User directive — Water cooler and session-scoped visualization
**By:** Casey Irvine (via Copilot)
**What:**
- Water cooler belongs INSIDE session views, not at the floor level
- Represents idle members within a specific session, not overall squad idle state
- Both floor view (sessions list) and session drill-in must maintain fun office/building aesthetic
- Avoid "cardy" feel — functional but fun, office-themed throughout
**Why:** User feedback on mockup — water cooler is session-scoped, not squad-scoped

## 2026-02-22T18:28Z: User directive — UI terminology and visual feel
**By:** Casey Irvine (via Copilot)
**What:** 
- Use "squad members" or "members" terminology, NOT "agents" in the UI
- Building hub should feel more "building-y" with lit office windows
- Floor view should feel like looking into open-space pods/offices on a floor — not cards, more like windows you peer into
- Idle members should be visualized at a "water cooler" (standing, chatting, idle)
- Working members should be "sitting at their desk working"
- The vibe should be fun and office-building themed, not sterile dashboard cards
**Why:** User request — core visual identity for Squad Office

## 2026-02-22T18:46Z: Decision — Water cooler placement & office view redesign
**By:** Hawkins (UI/Design)
**What:**
1. Water cooler belongs INSIDE sessions only (not at floor level)
   - Represents idle members within a specific session
   - Floor view shows summary stats (e.g., "1 working, 1 at cooler")
   - Water cooler visualization only appears in session view
2. Floor view maintains office hallway feel
   - Sessions rendered as office rooms with glass-wall effect
   - Mini desks and activity previews visible through "windows"
   - Gradients, shadows, borders simulate peeking through office windows
3. Session view redesigned as office interior
   - Left: work area with workstations (desk + monitor + chair + nameplate)
   - Right: break lounge with water cooler and idle members
   - Chat panel styled as whiteboard/control center with terminal output
   - No flat cards or dashboard elements — maintains physical office metaphor
**Why:** Casey's review feedback led to clarifying that water cooler is session-scoped, not squad-scoped. Maintaining consistent office aesthetic across all 3 navigation levels improves intuitiveness and visual hierarchy.
**Status:** Implemented in mockup
**Impact:** Better understanding of session membership; consistent design language; clearer working vs. idle states per session
