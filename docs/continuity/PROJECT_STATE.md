# MapleStory Classic Builder — Project State

Last continuity baseline: 2026-09-17

Current deployed checkpoint: 0.10.10-royal-reference-fidelity
Current source checkpoint: 0.10.10-royal-reference-fidelity

## Read this first in every new chat
This file is the persistent handoff for the MapleStory Classic Builder. Before changing code or making recommendations, read this file together with:
- `docs/continuity/KNOWN_BUGS.md`
- `docs/continuity/DECISIONS.md`
- `docs/continuity/FIX_HISTORY.md`
- `docs/continuity/CHANGELOG.md`

Do not rely on chat memory alone. Repository continuity files are the project source of truth.

Also read QUALITY_STANDARD.md, IMPLEMENTATION_BACKLOG.md, and docs/continuity/LIVE_UI_AUDIT_2026-09-15.md before the next implementation pass.

## 2026-09-17 — Royal Maple reference-fidelity correction

- The previous 0.10.9 pass changed the dashboard card selectors but remained visibly too subtle and hid the town scene inside the Equipment Inventory card.
- The 0.10.10 pass is the source of truth for the approved reference treatment: visible class-town art in the equipment card, antique-gold double framing, maple-leaf ornaments, stronger slot borders, and matching potion/control surfaces.
- Existing dashboard geometry and interaction behavior remain unchanged.

## Repository / Deployment
- Repository: `skanteninja/c9f7a4d8e2b6`
- Default branch: `main`
- Live site: `https://maplestory-classic.ofri505.workers.dev`
- Product name: **Maplestory Classic Builder**
- Project direction: multi-build / multi-class, not I/L-only.

## Current supported builds
- Fighter Build
- Hunter Build
- I/L Wizard Build

Never use “Luna’s” in build names.

## 2026-09-17 — Royal Maple dashboard cards
- Dashboard panels and their inner action/queue/skill/equipment cards now use the approved Royal Maple frame treatment while retaining the existing layout.
- Source commit `f9ade8169c222b0f863adb1a1b005f1a3f1c4ea4` produced generated site commit `2de55f76076cc092c7f5949d1576f5d6fc41d062`; live `build-info.txt` reports `0.10.9-royal-dashboard-cards`.
- Build Static `35229858495`, Visual/UI `35229858572`, Monster `35229858465`, Maps/ETC `35229858593`, Real Input `35229858561`, and Verify Live `35229858627` passed.

## 2026-09-17 — Royal Maple town-art visibility
- Corrected the stacking issue that hid the fixed town background beneath the body canvas.
- The live page now visibly shows the active town art while the Royal Maple cards remain readable and opaque: Perion/Fighter, Henesys/Hunter, Ellinia/I/L Wizard.
- Source commit `cc9f2221d6105f2afde98e72d31de703a3c70aac` produced generated site commit `05c707004b3bebbdb605358d82f6a71f159316d4`; live `build-info.txt` reports `0.10.8-royal-town-visibility`.
- Build Static `35227409213`, Visual/UI `35227409212`, Monster `35227409116`, Maps/ETC `35227409094`, Real Input `35227409065`, and Verify Live `35227408993` attempt 2 passed.

## 2026-09-17 — Royal Maple town themes
- The existing page layout now uses the approved Royal Maple visual system: dark plum surfaces, antique-gold borders, ivory type, and maple-red accents.
- Class-home page backgrounds map to the active build: Perion for Fighter/Warrior, Henesys for Hunter/Bowman, and Ellinia for I/L Wizard/Mage.
- The treatment is additive and responsive; it does not replace the equipment inventory, HP/MP slots, gender filtering, potion modal, or saved progress behavior.
- Source commit `be1ba951fb884bfd5b5ec21d2166d59e0416e836` produced generated site commit `6582c6423f63365e49943def742721aad83f677a`; live `build-info.txt` reports `0.10.7-royal-town-themes`.
- Build Static `35225947369`, Visual/UI `35225947312`, Monster `35225947311`, Maps/ETC `35225947325`, Real Input `35225947370` attempt 2, and Verify Live `35225947619` passed.

## 2026-09-17 — integrated recommended pot slots
- The Equipment Inventory now owns two compact, icon-first HP/MP recommendation slots on both the dashboard and Equipment page; the old standalone potion card is removed.
- Clicking either slot opens the level-aware highly recommended potion plus the other shop options, with recovery amount, shop price, meso-per-point, and refill-limit context.
- The I/L, Fighter, and Hunter inventories each include all 23 current genderless earrings plus Male and Female Top/Bottom/Overall counterparts. Gender-locked choices remain filtered by the selected avatar; Unisex and Genderless items remain available.
- Source commit `dac47493faa44d723b5449ae65d97d267ee964a1` produced generated site commit `bc945ba01b02b9422c9a1bd6a64270acc1b30d96`; live `build-info.txt` reports `0.10.6-dashboard-pot-slots`.
- Build Static `35214983471`, Visual/UI `35214983487`, Monster `35214983464`, Maps/ETC `35214983520`, Real Input `35214983463`, and Verify Live `35214983474` passed.

## Product goal
The site should feel like a polished, period-correct MapleStory Classic builder and guide rather than three loosely related pages. Every supported build should have equivalent depth and quality while remaining class-specific.

Each build should eventually include, where applicable:
- level-by-level skill allocation
- AP/stat guidance
- equipment progression
- item images and correct slot presentation
- avatar/equipment visualization
- training routes
- quests and useful quest rewards
- ETC/material information
- buffs / consumables
- class-specific recommendations and explanations
- dashboard summary content
- future-level equipment preview
- Classic-appropriate map and monster visuals

Fighter and Hunter must not be treated as partial copies of I/L.

## User expectations / workflow
- Research thoroughly before changing class recommendations.
- Cross-check multiple databases and Classic/beta sources.
- Fix root causes rather than cosmetic symptoms.
- Preserve known-good I/L behavior when bringing Fighter/Hunter to parity.
- Verify fixes in the live/generated UI, not only in source code.
- During intensive project work, replies should be concise when requested; implementation quality matters more than narration.
- When a meaningful fix or decision is made, continuity documentation must be updated in the same work session.

## Known stable / previously fixed behavior
These are regression guards. A future change must not silently break them.

### Skills / level state
- I/L Skill Tree blinking/reloading when changing levels was fixed.
- Skill-card identity should remain stable across level changes rather than remounting/reordering unexpectedly.
- Learned-skill coloring should remain stable.
- Skills with 0 allocated SP should remain visually greyed as intended.
- Magic Claw uses canonical skill ID `2001003`.
- A historical exact-level bug where selecting level 10 could resolve/display level 9 was fixed on I/L; Fighter/Hunter must match this behavior.

### Dashboard
- Giant empty Skill Tree card was removed.
- “Do This Now” text truncation was fixed.
- Training location duplicate beneath the job title was removed. Training location should appear only in the dedicated Training metric.
- “Do This Now” and Skill Tree are intended to sit side-by-side where the responsive layout allows.

### Maps / visuals
- Monster icons use same-origin routing.
- OSMS high-resolution maps are used where available.
- Victoria Island should behave as one world-map click target while preserving relevant beta Victoria Island travel points.
- Sleepywood map was restored.

## Current verified checkpoint

- Source commit `b63fbb9532fd02c2f2db4c7b40d74267aec27219` contains the session resume/reset flow, gender selection, gender-aware equipment filtering, Classic avatar gender mapping, keyboard focus containment, once-per-build-entry session cadence, and the 0.10.4 build-token update.
- Generated site commit `ea2aaf0e88508437afddd8db446f1b711103f077` is deployed and reports `0.10.4-session-entry-once`.
- Build Static `35092591507`, Visual/UI `35092591496`, Monster `35092591472`, Maps/ETC `35092591550`, and Real Input `35092591504` passed for the generated app state. Verify Live `35092685632` passed after the generated site deployed and includes the live session-flow, avatar/inventory parity, and same-tier Skill Tree stability checks.
- At live Level 15, I/L, Fighter, and Hunter inventory selections match the exact IDs sent to the avatar compositor, all three PNGs render, and no avatar icon strip is present.
- The live desktop containment check shows the required navigation labels visible without page-level horizontal overflow, the metric/footer regions separated, and the equipment picker metadata wrapped inside its cards at the audited viewport.
- Live Browser QA verified the saved-build entry prompt, the destructive reset confirmation list, reset-to-gender flow, persisted male/female avatar identity, and gender-filtered equipment options.
- Live Browser QA verified Tab, Shift+Tab, and wraparound focus behavior in the saved-build, reset-confirmation, and gender dialogs. The live console contained no application-origin errors; visible application images loaded successfully. The only errors were emitted by the browser environment’s metadata extension.
- Live Browser QA confirmed a completed Continue decision remains closed after refresh, a new tab shows the saved-build entry prompt, entering Hunter starts a new gender/entry flow, and returning to Fighter prompts again as a new build entry.
- The I/L full-page renderer updates .skill-row[data-plan-level] state in place. Do not reintroduce a wrapper-dependent selector for I/L plan rows.
- Full-page Fighter/Hunter row and tier state also update in place. Keep transient paint-level blink under observation even when node/source checks pass.

## 2026-09-16 — 0.10.4 session-entry cadence

- Replaced the startup-only session prompt behavior with a browser-tab session marker keyed to the current build. The marker distinguishes pending, gender-required, and completed states.
- Refreshing a completed Fighter entry leaves the page uninterrupted. A new tab shows Continue/Reset for the saved Fighter, and switching to Hunter and back starts the appropriate new-build prompts.
- The deployed build-info endpoint reports `0.10.4-session-entry-once`.
- Source `b63fbb9532fd02c2f2db4c7b40d74267aec27219`, generated site `ea2aaf0e88508437afddd8db446f1b711103f077`, Build Static `35092591507`, Real Input `35092591504`, Visual/UI `35092591496`, Monster `35092591472`, Maps/ETC `35092591550`, and Verify Live `35092685632` passed.

## 2026-09-15 — 0.10.3 focus containment and cache refresh

- The Product Design accessibility follow-up found that the first published focus-trap patch was still served from the old `0.10.2-session-gender-flow` service-worker asset cache. The build token and all release guards were bumped to `0.10.3-session-focus-trap` so runtime changes are cache-visible.
- Added a shared session-dialog focus trap. Live keyboard checks now cycle Continue → Reset → Continue, Reset Cancel → Reset Confirm → Reset Cancel, and Male → Female → Male; reverse Shift+Tab traversal also remains inside each dialog.
- The fresh-build gender dialog visibly presents Male/Female choices and the selected male path resolves to a `MALE` badge and `avatar=male` after confirmation.
- The live build-info endpoint reports `0.10.3-session-focus-trap`. Build Static `34999140109`, Visual/UI `34999140175`, Monster `34999140162`, Maps/ETC `34999140053`, Real Input `34999140243`, and Verify Live `34999212897` passed.
- New evidence capture: `maplestory-audit-gender-focus-20260915.jpg`. The live application had 22 visible images with zero failed/incomplete images in the inspected state; console errors were extension-origin only.

## 2026-09-15 audit and 0.10.2 deployed status

- Added a per-build session entry flow. Returning to a build with saved progress now asks whether to continue or reset. Reset opens a second confirmation dialog that lists the level/page position, equipment/loadout, skill allocations, completed quests/ETC counts, and gender that will be cleared. Other build saves and the guide remain untouched.
- Added a required male/female choice for fresh and reset sessions. The choice is saved with the active build, changes the Classic avatar compositor appearance, and filters gender-locked equipment in the inventory picker. Existing saved builds without a gender are asked once before continuing.
- Added the gender field to canonical equipment rows and sanitized saved gear when a gender change makes an item incompatible. Fighter, Hunter, and I/L share the same gender-aware worn-equipment renderer.
- Built 0.10.2-session-gender-flow and passed static multi-build, generated JavaScript, Maps/ETC, and Real Input checks. Verify Live run 34985164756 passed all live steps after a transient CDP execution-context failure on the previous attempt.
- Cloud Browser QA captured the Continue/Reset prompt, reset-loss confirmation, gender choice, female-filtered equipment, and male-filtered equipment at a later level. The male avatar resolves to hair 30000 / face 20000; the female avatar resolves to hair 31000 / face 21000.

## 2026-09-15 — 0.10.1 dashboard containment baseline

- Created QUALITY_STANDARD.md and IMPLEMENTATION_BACKLOG.md as the release contract and ordered work queue.
- Product Design/browser audit found three visible priorities: desktop navigation horizontal overflow, compact dashboard metric/footer collision and Skill Tree compression, and horizontal overflow/clipping in the equipment picker.
- Added a shared source CSS containment patch and bumped the build token to 0.10.1-dashboard-containment. Build Static published the generated site commit 2a6b451 to the Worker.
- Cloud Browser QA against the published 0.10.1 checkpoint exercised trusted level input on I/L, Fighter and Hunter. I/L passed 9→10 and 29→30 with canonical Magic Claw artwork; Fighter and Hunter passed 29→30 with the expected job titles and no Magician gear text in the inspected build surfaces. A live Hunter Level 30 capture confirmed the wrapped navigation and separated dashboard regions.
- The post-build live verification run 34976424625 passed on attempt 3 after two transient CDP execution-context races; the final job completed all live browser, avatar/inventory, and same-tier Skill Tree checks.
- The repository real-input script could not run in this workspace because the Python environment lacks websocket-client; the local Chrome binary required by the CI script is also unavailable. Cloud Browser results are recorded as equivalent live-input evidence, not as a replacement for the formal CI gate.
- Mobbin search is connected but paid-plan gated. TinyFish successfully extracted the deployed public shell. Firecrawl research cross-checked Hunter skill/progression references; no Fighter axe-bleed claim was promoted to confirmed.
- The next implementation priority is the independent Fighter/Hunter Classic data audit; narrow-width/accessibility validation and the human-visible Skill Tree blink remain open.
## Automatic job progression
The selected level must determine the current job automatically and all dependent UI must agree.

### I/L Wizard
- Lv1–9: Beginner
- Lv10–29: Magician
- Lv30+: Wizard (I/L)

### Fighter
Expected structure:
- Lv1–9: Beginner
- Lv10–29: Warrior
- Lv30+: Fighter

### Hunter
Expected structure:
- Lv1–9: Beginner
- Lv10–29: Archer
- Lv30+: Hunter

The current job must drive, together and consistently:
- active build/job title
- Skill Tree section and visible job grouping
- available skill allocation
- job pills / labels
- avatar job badge
- dashboard job presentation
- level-specific recommendations

No component should maintain its own conflicting interpretation of the selected level.

## Level selector contract
Level selection is a global source of truth.
- Selecting level 10 means level 10 everywhere, never level 9.
- Dashboard, skill calculations, job progression, equipment filters, recommendations, avatar, routes and future-item logic must consume the same resolved level.
- Level range/selectors should exist consistently across supported builds.
- Avoid off-by-one conversions between array indices and actual character levels.

## Skill Tree contract
- Separate skills cleanly by job stage: Beginner / first job / second job.
- Do not display an accidental vertical layout if the established dashboard layout is horizontal/compact.
- Preserve skill-card identity during level changes.
- Preserve learned/available/unavailable visual state without flicker.
- Class/build skill data must be independent; do not reuse I/L skill assumptions for Fighter/Hunter.

## Equipment contract
- Equipment recommendations must be class-correct.
- Avatar visuals must use the selected build’s equipment, not Magician defaults.
- Item names and item art must refer to the same actual item.
- Job requirement and level requirement must be explicitly correct in the item database.
- Only Classic-appropriate items should be shown.
- Do not recommend mutually exclusive equipment simultaneously, especially:
  - overall + top
  - overall + pants
- Future-level recommendations should be available through the supported “Show future-level items” behavior across all builds.
- Recommended equipment should not leak between build datasets.

## Build-specific research notes
### I/L Wizard
- LUK guidance is intended to be definitive and tied to equipment requirements, not a vague “safe no-scroll” plan.
- User is comfortable with 100%/60% scroll usage; early 30%/10% risk should be treated cautiously and only recommended with strong justification.
- Energy Bolt vs Magic Claw should have one clear recommendation rather than indecisive guidance; Magic Claw has been preferred where terrain blocking makes Energy Bolt less reliable.
- Pet and mount are both supported concepts in the builder.

### Fighter
- Do not assume sword + shield is automatically optimal.
- Re-evaluate swords vs axes and other viable paths using current Classic/beta mechanics.
- Beta-specific axe/bleed behavior was specifically flagged for investigation and should only be presented as fact after source confirmation.
- Fighter recommendations, visuals, AP and equipment must be independently researched.

### Hunter
- Hunter needs the same completeness standard as I/L.
- Do not inherit Magician equipment, stats, visuals or routes.
- Skill/AP/equipment progression must be researched independently for the Classic ruleset.

## Data / source quality rules
Primary research pool includes:
- OSMS / Old School MapleStory resources
- henesys.gg
- MeowDB
- MapleAtlas
- Nexon MapleStory Classic / beta changelogs
- Hidden Street
- other period-appropriate databases when useful

Rules:
- Prefer Classic/beta-specific evidence over modern MapleStory data.
- Cross-check important claims across more than one source when possible.
- Audit item name, icon, level requirement, job requirement, slot and recipe together.
- Remove/dump non-Classic items rather than silently keeping them.
- If sources disagree, document the uncertainty instead of guessing.

## Historical product requirements that remain relevant
- Equipment UI should resemble an old MapleStory inventory/equipment window.
- Equipment slots should contain item images that fit correctly.
- The center avatar/model should visually match selected/recommended equipment as closely as the current implementation allows.
- Skill icons should appear beside skill names.
- Recommended equipment may use a clear “Highly recommended” marker.
- The builder is intended to support more classes over time, so shared systems should avoid hard-coded Magician assumptions.

## Current priority
The immediate quality goal is parity and correctness across Fighter, Hunter and I/L before expanding scope further.

Priority order:
1. Eliminate cross-class data leakage.
2. Verify exact level handling on every build.
3. Verify automatic job progression everywhere.
4. Fix Fighter/Hunter Skill Tree structure/layout regressions.
5. Verify equipment filtering, slot compatibility and avatar visuals.
6. Verify “Show future-level items” across builds.
7. Perform item/skill/AP/route/quest completeness audits for Fighter/Hunter.
8. Regress known-good I/L behavior after shared-code changes.

## Continuity maintenance protocol
After meaningful project work:
1. Update this file if current project state/architecture changed.
2. Update `KNOWN_BUGS.md` for unresolved, reopened, or verified-resolved issues.
3. Update `DECISIONS.md` if a durable product/research/architecture choice was made.
4. Update `FIX_HISTORY.md` with important bugs fixed or regressions encountered.
5. Append a dated entry to `CHANGELOG.md`.

A new chat should be able to continue the project by reading these files without requiring the user to retell project history.
