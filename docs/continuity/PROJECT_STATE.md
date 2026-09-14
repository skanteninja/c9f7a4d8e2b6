# MapleStory Classic Builder — Project State

Last continuity baseline: 2026-09-14

## Read this first in every new chat
This file is the persistent handoff for the MapleStory Classic Builder. Before changing code or making recommendations, read this file together with:
- `docs/continuity/KNOWN_BUGS.md`
- `docs/continuity/DECISIONS.md`
- `docs/continuity/FIX_HISTORY.md`
- `docs/continuity/CHANGELOG.md`

Do not rely on chat memory alone. Repository continuity files are the project source of truth.

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