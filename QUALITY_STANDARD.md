# MapleStory Classic Builder — Quality Standard

Status: working release contract, established 2026-09-15
Current live checkpoint: `0.10.4-session-entry-once`

This document defines what “ready” means for the public MapleStory Classic Builder. It is intentionally stricter than “the page loads”: the builder is a data product, a planner, and a visual interface at the same time.

## Product promise

The public experience must let a player choose one researched build, select an exact level, and understand the next skill, stat, equipment, route, quest, and ETC decisions without cross-class leakage or misleading artwork.

The supported build names are exact and stable:

- Fighter Build
- Hunter Build
- I/L Wizard Build

“Luna’s” must never appear in a build name, page title, card title, or public recommendation.

## Non-negotiable invariants

1. **Build isolation.** Fighter, Hunter, and I/L use their own skills, AP/stat plan, equipment, routes, quests, ETCs, buffs, labels, and avatar IDs. A shared renderer is acceptable; shared gameplay decisions are not.
2. **Exact levels.** Level `N` means level `N` in every visible and computed surface. Boundary checks include 9/10 and 29/30.
3. **Single job truth.** The visible job, Skill Tree tier, SP allocation, equipment filter, dashboard copy, and avatar badge agree.
4. **Classic identity.** An item or skill’s displayed name, numeric ID, slot, metadata, and artwork must refer to the same Classic record. Missing art is shown as missing; it is never silently replaced with an unrelated table.
5. **Equipment compatibility.** Overall is exclusive with Top/Bottom in saved state, picker state, displayed inventory, and avatar compositor input.
6. **Stable interaction identity.** Same-tier level changes update allocation/status without remounting stable Skill Tree cards or reloading their artwork.
7. **Public-source boundary.** The public UI does not expose internal provider, provenance, or maintenance language that is not useful to a player.
8. **Session safety and character identity.** Returning to a saved build offers Continue or Reset; Reset requires explicit confirmation with a loss summary; fresh/reset sessions require a gender choice that persists, filters locked equipment, and drives the avatar body.
9. **Modal focus containment.** While a session dialog is open, keyboard focus stays inside that dialog and cycles through its visible controls; publishing a runtime session-flow change also invalidates the prior service-worker asset token.
10. **Session-entry cadence.** Continue/Reset appears once per build entry in a browser tab: normal refresh preserves the completed decision, while a new site tab or different build starts a new decision; incomplete gender/reset flow remains required.

## Quality dimensions

### Correctness and research

- Every recommendation has a clear level/job condition.
- Unverified Classic/Beta claims remain explicitly flagged in maintenance notes and are not presented as settled mechanics.
- Fighter axe mechanics and Hunter progression are independently audited before their copy is upgraded from “verify” to “confirmed.”
- Source conflicts are documented, not resolved by intuition.

### Interaction

- Primary tasks are discoverable from the dashboard: build selection, exact-level change, equipment selection, Skill Tree, route, quests, and ETC planner.
- A modal can be opened, filtered, scrolled, and dismissed without losing the current build or level.
- Re-entering a saved build exposes Continue and Reset choices; destructive reset is separately confirmed and scoped to the active build.
- Male/female selection is required for fresh/reset sessions and is reflected in the avatar and equipment compatibility labels.
- Session dialogs keep keyboard focus contained, restore focus to the initiating control after dismissal, and remain usable with Tab, Shift+Tab, and Escape behavior.
- Once the session decision is completed, ordinary browser refreshes do not reopen it; entering a different build or opening a new site tab starts the appropriate entry flow.
- Visible controls have useful names, focus styles, keyboard behavior, and state announcements where state changes matter.
- Browser history/back navigation returns to the expected page and build.

### Visual and responsive quality

- No horizontal overflow hides required navigation, picker content, controls, or metadata at the supported desktop widths.
- Cards have a clear hierarchy: title, current state, next action, and supporting detail.
- The dashboard’s skill status card does not collide with metrics, the level footer, or the character artwork.
- Text remains readable without browser zoom; compact cards may truncate only when the full value is available through a visible detail view or accessible name.
- Equipment and Skill Tree artwork retains its intended pixel-art identity and stable placement during level changes.

### Accessibility

- The document has a valid language, useful heading order, labeled form controls, meaningful button names, and visible keyboard focus.
- Color is not the only signal for learned/locked/required/unavailable states.
- Text and controls remain usable at narrow widths and with increased text size.
- Automated checks are supplemented by keyboard and screen-reader-oriented manual review; screenshots alone never count as a full WCAG audit.

### Release and deployment

- Generated output is rebuilt from source; hand-editing generated files is not a release step.
- Static output, data contracts, visual/UI checks, real-input checks, and live checks are all green for the same generated checkpoint.
- A change is not called deployed until the live URL is checked after the generated artifact is published.
- A failed live check is a release blocker even if local checks pass.

## Required verification matrix

| Gate | Minimum evidence | Blocking condition |
| --- | --- | --- |
| Build | `node build.cjs` succeeds | Any build error or stale generated checkpoint |
| Static/data | `node audit/check-multibuild.cjs`; generated JS `node --check` | Cross-build leakage, missing required name, invalid generated JS |
| Exact-level | Levels 1, 9, 10, 15, 29, 30, 50 on all builds | Any job, SP, gear, route, or avatar disagreement |
| Visual/UI | Dashboard, Build Library, full Skill Tree, Equipment, Maps, Quests, ETC, DB, Cash Shop, Beauty | Broken image, external image URL, page overflow, missing state marker, or layout collision |
| Real input | Keyboard level change, navigation, picker open/filter/close, history/back | Focus trap, inaccessible control, or state not saved/synchronized |
| Live | Same checks against the deployed URL and exact build checkpoint, including Continue/Reset, reset confirmation, gender choice, and gender-filtered equipment | Any live-only regression or unverified deployment |

## Evidence rules

- Capture a screenshot before judging a visual surface; inspect the saved image, not only the DOM.
- Record the URL/build/level, action taken, expected result, observed result, and evidence filename or check output.
- Separate observed facts from inferences and source-backed game-data claims.
- Treat the current human-visible Skill Tree blink as open until a reproducible paint-level cause is found or repeated clean captures close it.
- Record tool limits: Mobbin references are optional comparative evidence and require an account plan; direct product screenshots and browser checks remain the source of truth for this repo.
- Separate browser-extension console errors from application errors; a live release is clean only when site-origin errors are absent and visible application assets load successfully.

## Definition of done for a change

A change is complete only when:

1. the source implementation and its acceptance criteria are documented;
2. the generated output is rebuilt;
3. relevant static, UI, real-input, and live checks pass;
4. screenshots or structured evidence show the visible result;
5. continuity documents record what changed, what remains open, and which checkpoint was verified.

See [IMPLEMENTATION_BACKLOG.md](IMPLEMENTATION_BACKLOG.md) for the ordered work remaining after the current audit.
