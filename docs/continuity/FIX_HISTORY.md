# Historical Fix / Regression Log

Last continuity baseline: 2026-09-17

Purpose: preserve bugs that were already solved, partially solved, or observed as regressions so future chats do not repeat the same debugging from scratch.

This is historical context, not the unresolved queue. Active unresolved work belongs in `KNOWN_BUGS.md`.

## 2026-09-17 — 0.10.11 dashboard card reference-fidelity correction

Observed problem:
- The live dashboard technically loaded `royal-maple-theme.css`, but the compact `progression-gear-visual.css` layout and the opaque Equipment Inventory surface made the rendered card visibly unlike the approved Royal Maple reference. The town art was not visible inside the card, slot borders were too dim, and the corner marks were generic rather than maple ornaments.

Correction:
- Added a final, cache-versioned Royal Maple reference pass after all earlier dashboard overrides.
- Kept the existing grid and slot dimensions, while restoring a controlled town-art layer to the Equipment Inventory card and using a transparent central stage so the scene remains visible around the paper-doll.
- Added the extracted red maple-leaf image asset for the card and inventory slot ornaments, stronger antique-gold double framing, brighter slot labels, and framed Progression/LUK/Clear/potion controls.
- Bumped the runtime/service-worker token to `0.10.11-royal-card-parity`.

Verification:
- Local build, generated JavaScript syntax, multi-build audit, asset copy, and `git diff --check` passed.
- Browser-rendered visual QA is required after the new deployment; the evidence and comparison history are recorded in the project-root `design-qa.md`.

## 2026-09-17 — 0.10.9 Royal Maple dashboard cards

Observed problem:
- The dashboard technically inherited a dark gradient, but its panels and nested cards still looked like the previous generic UI instead of the approved Royal Maple card reference.

Correction:
- Added a dashboard-scoped card frame with a stronger antique-gold double border, square corners, plum/parchment surface treatment, inset depth, corner ornaments, and matching inner card states.
- Kept the existing grid, fixed command-row heights, equipment/potion slots, and class/town behavior unchanged.
- Bumped the runtime/service-worker token to `0.10.9-royal-dashboard-cards`.

Verification:
- Live Browser screenshot confirms the Royal Maple frame treatment on the Hunter dashboard cards; the Perion/Henesys/Ellinia page mappings remain intact.
- Source `f9ade8169c222b0f863adb1a1b005f1a3f1c4ea4` generated site `2de55f76076cc092c7f5949d1576f5d6fc41d062`.
- Build Static `35229858495`, Visual/UI `35229858572`, Monster `35229858465`, Maps/ETC `35229858593`, Verify Live `35229858627`, and Real Input `35229858561` passed.

## 2026-09-17 — 0.10.8 restored visible town-art backgrounds

Observed problem:
- The Royal Maple CSS and class-specific town image were present in the live DOM, but the page screenshot showed almost no town art because the opaque body background covered the negative-z-index pseudo-elements.

Correction:
- Made the themed body canvas transparent so the fixed town layer can paint above the document background, kept the content panels opaque, and softened the overlay/filter values so the town remains recognizable.
- Bumped the runtime/service-worker token to `0.10.8-royal-town-visibility` to make the correction cache-visible.

Verification:
- Live Browser screenshot shows Ellinia behind the I/L dashboard with the Royal Maple cards still readable.
- Source `cc9f2221d6105f2afde98e72d31de703a3c70aac` generated site `05c707004b3bebbdb605358d82f6a71f159316d4`.
- Build Static `35227409213`, Visual/UI `35227409212`, Monster `35227409116`, Maps/ETC `35227409094`, Verify Live `35227408993` attempt 2, and Real Input `35227409065` passed.

## 2026-09-17 — 0.10.7 Royal Maple town themes

Observed request:
- The selected Royal Maple card direction needed to be applied to the live website, with page backgrounds that visibly represent the Classic home town of each build while preserving the existing layout.

Correction:
- Added a shared Royal Maple theme layer for panels, cards, navigation, buttons, equipment/potion slots, and modal surfaces.
- Added an active-build theme mapper that assigns Perion to Fighter, Henesys to Hunter, and Ellinia to I/L Wizard, including responsive readability overlays and reduced-motion handling.
- Added optimized same-origin WebP town assets and aligned build/service-worker/runtime version guards to `0.10.7-royal-town-themes`.

Verification:
- Local build, JavaScript syntax, multi-build audit, static theme gates, and `git diff --check` passed.
- Source `be1ba951fb884bfd5b5ec21d2166d59e0416e836` generated site `6582c6423f63365e49943def742721aad83f677a`.
- Build Static `35225947369`, Visual/UI `35225947312`, Monster `35225947311`, Maps/ETC `35225947325`, Verify Live `35225947619`, and Real Input `35225947370` attempt 2 passed. Live `build-info.txt` reports `0.10.7-royal-town-themes`.

## 2026-09-17 — 0.10.6 integrated pot slots and complete shared gear inventory

Observed problems:
- Recommended Pots existed as a separate card instead of being part of the Equipment Inventory shown on the dashboard.
- The I/L inventory exposed only a small subset of the current genderless earrings and lacked complete Male/Female armor coverage.

Correction:
- Reused the existing level-aware potion catalog and modal, but rendered only two compact HP/MP equipment-style slots directly below the paper-doll grid in both inventory windows.
- Removed the standalone Recommended Pots page section and added a shop-comparison modal with the highly recommended option and alternatives.
- Expanded I/L to every applicable Mage/All current wearable, including all 23 earrings, and added an explicit generated-inventory guard for shared earrings and gender counterparts in all builds.
- Bumped the asset/service-worker token to `0.10.6-dashboard-pot-slots`.

Verification:
- Local build, generated JavaScript syntax, complete multi-build gender/equipment audit, and `git diff --check` passed.
- Source `dac47493faa44d723b5449ae65d97d267ee964a1` generated site `bc945ba01b02b9422c9a1bd6a64270acc1b30d96`.
- Build Static `35214983471`, Visual/UI `35214983487`, Monster `35214983464`, Maps/ETC `35214983520`, Real Input `35214983463`, and Verify Live `35214983474` passed; live build-info reports `0.10.6-dashboard-pot-slots`.

## 2026-09-16 — 0.10.4 session-entry cadence

Observed regression:
- Completing Continue/Reset did not distinguish an ordinary refresh from a new build/site entry, so the prompt reopened on every reload.

Correction:
- Added a `sessionStorage` marker keyed to the active build with `pending`, `gender`, and `complete` stages.
- Completed state survives refresh for the same build. New site tabs and different build entries receive a fresh decision; incomplete gender flow remains required.
- Bumped the runtime/service-worker token to `0.10.4-session-entry-once`.

Verification:
- Generated site `ea2aaf0e88508437afddd8db446f1b711103f077` reports `0.10.4-session-entry-once`.
- Build Static `35092591507`, Visual/UI `35092591496`, Monster `35092591472`, Maps/ETC `35092591550`, Real Input `35092591504`, and Verify Live `35092685632` passed.
- Live Browser QA confirmed refresh suppression, new-tab prompting, different-build prompting, and site-origin console/assets clean.

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
