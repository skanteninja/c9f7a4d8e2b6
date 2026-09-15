# Historical Fix / Regression Log

Last continuity baseline: 2026-09-15

Purpose: preserve bugs that were already solved, partially solved, or observed as regressions so future chats do not repeat the same debugging from scratch.

This is historical context, not the unresolved queue. Active unresolved work belongs in `KNOWN_BUGS.md`.

## 2026-09-15 — 0.10.3 session-dialog focus containment

Observed regression:
- The Continue/Reset dialog allowed Tab focus to escape into the page. The first source patch was also not visible on the deployed site because the service worker continued serving the `0.10.2-session-gender-flow` runtime asset.

Correction:
- Added one shared focus-trap listener for the session entry, reset confirmation, and gender dialogs. It keeps forward and reverse keyboard traversal inside the visible modal controls and handles focus that starts outside the dialog.
- Added the focus-trap requirement to the multi-build audit guard.
- Bumped the build/service-worker token to `0.10.3-session-focus-trap` across the source build and release checks so the runtime update is cache-visible.

Verification:
- Local build, generated JavaScript syntax, multi-build audit, and `git diff --check` passed.
- Build Static `34999140109`, Visual/UI `34999140175`, Monster `34999140162`, Maps/ETC `34999140053`, Real Input `34999140243`, and Verify Live `34999212897` passed.
- Live Browser QA confirmed focus wraparound in all three dialogs, a male selection resolving to the `MALE` badge/`avatar=male`, 22 visible images with no failed/incomplete images, and no site-origin console errors. Browser metadata-extension errors were isolated from application evidence.

## 2026-09-15 — 0.10.2 session resume/reset and gender flow

User-visible problems:
- Re-entering a build gave no clear choice between continuing saved work and starting that build over.
- Reset had no dedicated loss explanation/confirmation boundary.
- Character gender was not persisted or used consistently, so the avatar and equipment picker could present female gear for a male character.

Correction:
- Added a saved-build entry modal with Continue and Reset actions.
- Added a second destructive-reset dialog that lists the level/page, equipment/loadout, skills, quests/ETC, and gender that will be cleared, while keeping other build saves untouched.
- Added required Male/Female selection for fresh and reset sessions, plus a one-time choice for older saves without a gender.
- Added per-build gender persistence, gender-aware item metadata/filtering, incompatible-gear sanitization, and Classic avatar body IDs (male hair/face 30000/20000; female hair/face 31000/21000).
- Kept Fighter, Hunter, and I/L on the same worn-equipment renderer and made the picker expose the active gender.

Verification:
- Local build, generated JavaScript syntax, and multi-build audit passed.
- Cloud Browser QA captured Continue/Reset, reset confirmation, reset-to-gender, female-filtered gear, male-filtered gear, and the matching avatar dataset/src.
- Build Static 34983348769, Maps/ETC 34983519233, Real Input 34983348845, and Verify Live 34985164756 passed. The prior Verify Live skill-stability failure was a transient CDP execution-context race; the follow-up live run passed.

## 2026-09-15 — 0.10.1 dashboard containment

Observed in the live 0.10.0 UI:
- required desktop navigation labels extended beyond the visible nav width;
- the compact dashboard Skill Tree was too compressed and its metrics/level footer spacing collided at the audited viewport;
- the equipment picker and item cards exposed horizontal overflow, clipping requirement/stat text.

Correction in source:
- added shared progression-sync CSS for metric/footer separation, readable compact Skill Tree tabs, wrapped picker metadata, and desktop nav wrapping;
- bumped the generated build token to 0.10.1-dashboard-containment;
- created QUALITY_STANDARD.md, IMPLEMENTATION_BACKLOG.md, and the dated live audit record.

Verification:
- node build.cjs passed;
- node audit/check-multibuild.cjs passed;
- generated JavaScript syntax checks and git diff --check passed;
- cloud Browser trusted-input checks passed on I/L, Fighter, and Hunter, including I/L 9→10 and 29→30 plus Fighter/Hunter 29→30;
- the formal Python real-input script could not start because websocket-client is not installed in this workspace, and no local Chrome binary is available for the CI-style checks.

Deployment and verification:
- Build Static published generated site commit 2a6b451;
- the live build-info endpoint reports 0.10.1-dashboard-containment;
- Verify Live run 34976424625 passed on attempt 3 after two transient CDP execution-context races;
- a live Browser capture at the audited desktop viewport confirmed that navigation wraps without page-level horizontal overflow, dashboard metric/footer regions are separated, and picker metadata stays within its cards;
- narrow-width/accessibility validation and the human-visible Skill Tree blink remain open follow-ups.

## 2026-09-14 — 0.10.0 inventory/avatar identity correction

Reported symptom:
- The equipment inventory showed one item while the character avatar visibly wore a different item, especially a magician-looking hat/robe on Fighter or Hunter.
- Fighter/Hunter also showed canonical item icons in a separate box instead of wearing the selected gear.

Root cause:
- The inventory data was Classic/OSMS keyed, but /game-media/characters/... proxied to DreamMS/GMS latest. Those services use a different numeric item table, so a valid Classic ID could render unrelated artwork.
- The class-specific neutral-avatar workaround prevented wrong-ID artwork but intentionally removed worn equipment from the Fighter/Hunter composite.
- Public-guide sanitization removes internal Evidence Class fields, so a runtime guard based only on that hidden field rejected otherwise valid public items.

Correction:
- Added a same-origin /game-media/characters/classic-preview route backed by the Classic-compatible MeowDB avatar-preview API.
- The client builds the avatar query from the same state.gear values used to render the inventory. It maps Hat/Eye/Face/Earrings/Top/Overall/Bottom/Shoes/Gloves/Cape/Shield/Weapon to the compositor’s regularEquipment keys.
- The client accepts an item only when its public Icon URL is exactly /game-media/icons/<same Item ID>; this prevents mismatched or historical records from entering the avatar payload.
- Overall suppresses Top and Bottom in both state normalization and compositor payload.
- Fighter, Hunter, and I/L all use the worn-equipment compositor. The legacy avatar-equipped-icons box is removed by both the renderer and the visual enhancement module.
- The Worker and CI proxy have a timeout-safe upstream request path and explicit unavailable handling.

Verification:
- Build Static, Visual/UI, Maps/ETC, Real Input, and Verify Live gates passed.
- Verify Live run 34858189737 checked exact inventory/avatar ID equality and decoded PNGs for all three builds at Level 15.
- Commits in the debugging sequence: a3cda727 (initial parity implementation), 3aadea538 (generator boundary repair), aacff233 (CI proxy syntax repair), fcc138049 (public canonical icon acceptance), 4350fedc (live parity gate), and a2ac9b9 (upstream timeout).
- Generated site checkpoint: 6033028.

Operational lesson:
- Do not route Classic equipment IDs through a newer GMS/DreamMS character compositor.
- Do not restore the global image-prototype source interception experiment; ownership and canonical public paths are the stable boundary.

## 2026-09-14 — 0.9.9 full-page Skill Tree state correction

Observed regression:
- The I/L full-page Skill Tree rows had `data-plan-level` markers but were not inside the Fighter/Hunter-only `.skill-level-plan` wrapper.
- The in-place update branch therefore found no I/L rows, leaving the highlighted plan row at the prior level even though the selector value changed.

Correction:
- The I/L branch now updates `#skill-list .skill-row[data-plan-level]` directly.
- The generated 0.9.9 site was checked live at levels 15 and 16; row state changed correctly and all I/L skill image sources remained unchanged.
- A multi-build audit token now guards the direct selector, and Build Static plus Verify Live passed after the change.

## Skill Tree stability
### I/L level-change blinking / reload
Historical symptom:
- changing selected level caused Skill Tree cards/content to blink, reload or recreate themselves.

Known resolved behavior:
- card identity is preserved across level changes,
- learned-state coloring remains stable,
- 0-SP cards remain greyed correctly,
- level changes should update state without unnecessary remounting.

Regression warning:
- shared Skill Tree refactors for Fighter/Hunter must not reintroduce this on I/L.

## Magic Claw canonical ID
Historical data cleanup:
- Magic Claw was standardized to canonical skill ID `2001003`.

Regression warning:
- do not introduce duplicate/alternate Magic Claw IDs in build-specific datasets.

## Exact level selection
Historical symptom:
- selecting level 10 could resolve or display level 9.

Known state:
- this behavior was addressed on I/L.

Still required:
- prove Fighter and Hunter use the exact same corrected level semantics.

Likely root-cause class:
- array index / character-level conversion or inconsistent derived state.

Regression tests:
- 9 → 10
- 10 → 9
- 29 → 30
- repeated switching
- switching build after setting a boundary level

## Dashboard Skill Tree layout
Historical symptom:
- Skill Tree could render vertically when the intended dashboard presentation was compact/horizontal.

Known state:
- issue had previously been corrected, then appeared again on Fighter.

Lesson:
- do not solve layout independently per class if the component is meant to be shared.

## Giant empty Skill Tree card
Historical symptom:
- dashboard contained a large empty Skill Tree card consuming space.

Known fix:
- giant empty card was removed.

Regression guard:
- do not re-add placeholder containers that reserve large unused dashboard space.

## “Do This Now” truncation
Historical symptom:
- instruction text was clipped/truncated.

Known fix:
- truncation was corrected.

Regression guard:
- verify long content after responsive/layout changes.

## Duplicate training location
Historical symptom:
- training location appeared directly under the job title and again inside the Training metric.

Example historical copy:
- `Hunting Ground / Field West of Amherst`

Known fix:
- duplicate beneath job title was removed.
- Training metric remains the single intended location for this information.

Regression guard:
- new build templates should not reinsert training text beneath the title.

## Automatic job progression
Historical work:
- project moved toward deriving job from selected level rather than treating job labels as static/manual state.

I/L intended behavior:
- 1–9 Beginner
- 10–29 Magician
- 30+ Wizard (I/L)

Required parity:
- Fighter: Beginner → Warrior → Fighter
- Hunter: Beginner → Archer → Hunter

Known synchronization targets:
- job title
- Skill Tree
- avatar badge
- job pills
- skill allocation
- build/dashboard presentation

Regression warning:
- if one component uses a separate hard-coded job field, UI can disagree at levels 10/30.

## Cross-class equipment leakage
Historical symptom:
- Fighter/Hunter recommended Magician items.
- Fighter/Hunter avatar visuals could still display Magician gear.
- Blue Kendo Robe was specifically reported as appearing in an incorrect class context.

Status:
- treat as unresolved until full item/database/UI audit proves otherwise.

Lesson:
- shared equipment systems must filter from explicit job/build metadata, never an implicit Magician default.

## Incompatible equipment recommendation
Historical symptom:
- recommendations could simultaneously show an overall and top + pants.

Status:
- requires cross-build verification.

Required invariant:
- overall is mutually exclusive with top/pants in an active loadout.

## “Show future-level items”
Historical symptom:
- feature was not appearing or working consistently on Fighter/Hunter.

Status:
- verify on every build.

Regression warning:
- future-item logic must preserve class filters and should not reveal unrelated-class gear.

## Monster icon routing
Historical issue/fix:
- monster icons were changed to use same-origin routing.

Regression guard:
- do not revert to fragile external hotlinks when same-origin assets/routes are available.

## World/map handling
Historical fixes:
- OSMS high-resolution maps used where available.
- Victoria Island changed to a single world-map click target.
- relevant beta Victoria Island travel points were restored/preserved.
- Sleepywood map was restored.

Regression guard:
- map refactors must preserve both navigation simplicity and beta travel data.

## I/L builder design history
Original builder direction included:
- level 1–70 scope,
- definitive LUK plan tied to equipment,
- clear Magic Claw vs Energy Bolt recommendation,
- 100%/60% scroll willingness,
- caution around early 30%/10% scrolls,
- pet and mount support,
- old-Maple-style equipment inventory,
- skill icons,
- future-level planning,
- Classic-only equipment filtering.

These decisions should not be lost merely because the project later became multi-build.

## Transition from I/L-only to multi-build
Historical mistake/risk:
- Fighter/Hunter were added with insufficient parity and inherited too many assumptions from the mature I/L build.

Permanent lesson:
- shared UI can be reused; class data and recommendations cannot be copied blindly.
- every new class must receive its own research pass.

## How to use this file
Before fixing a bug that resembles an old issue:
1. search this history for the symptom,
2. inspect the existing implementation that solved it elsewhere,
3. reuse the proven architectural fix rather than recreating a one-off patch,
4. regression-test the build where the issue was already solved,
5. record any new regression or durable fix here.
