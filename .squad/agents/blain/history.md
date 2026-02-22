# Blain — History

## Learnings
- Project started 2026-02-22. Testing for AI Office Squad.
- AIOffice has 22 Playwright integration tests in tests/.
- Playwright config at playwright.config.ts.
- Will need to adapt tests for squad-specific features (member roster, ceremonies, etc.).
- 2026-02-22: Created 3 new test files for building/pod architecture (issues #1, #4, #11-#15):
  - `tests/squad-reader.spec.ts` — 8 tests for parsing .squad/team.md (all passing).
  - `tests/building-api.spec.ts` — 10 tests for GET /api/building/squads, squad details, backward compat. Uses graceful skip when endpoints aren't built yet.
  - `tests/building-scene.spec.ts` — 7 Playwright tests for BuildingScene rendering, pod navigation, NPC squad member names. Also graceful-skips until Poncho/Mac deliver implementation.
- Created `tests/test-data/` with 3 fixture files: team.md (7 members), team-minimal.md (1 member), team-empty.md (no table).
- Pattern: reference parser inline in squad-reader.spec.ts — swap for real import once apps/server/src/squad-reader.ts lands.
- Pattern: building-api and building-scene tests use `test.skip()` when endpoints return 404, so they won't block CI until implementation exists.
- Existing test patterns: SERVER=localhost:3003, cleanupAgents helper, Playwright request fixture for API tests.
