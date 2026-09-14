# Durable Project Decisions

Last continuity baseline: 2026-09-14

Use this file for settled choices that future chats should preserve unless new evidence justifies changing them.

## Scope / naming
- The site is multi-build and multi-class.
- Current required builds: Fighter Build, Hunter Build, I/L Wizard Build.
- Never use “Luna’s” in build names.
- Product identity is **Maplestory Classic Builder**.
- The site should be designed so additional classes/builds can be added later without reintroducing hard-coded Magician assumptions.

## Continuity / source of truth
- Repository continuity files are the source of truth for MapleStory implementation continuity across chats.
- A new chat should read the continuity files before making project changes.
- Do not rely on conversational memory alone for project-critical state.
- Discord, if used later, is only a readable mirror/activity stream, not the authoritative project memory.
- After meaningful work, update `PROJECT_STATE.md`, `KNOWN_BUGS.md`, `DECISIONS.md` when applicable, `FIX_HISTORY.md`, and append to `CHANGELOG.md`.

## Research policy
- Class-specific recommendations must be independently researched; never clone I/L assumptions into Fighter/Hunter.
- Classic / beta behavior takes priority over modern MapleStory behavior.
- Important item, skill, route, quest, crafting and mechanic claims should be cross-checked across reliable Classic-era sources.
- Main research pool includes OSMS, henesys.gg, MeowDB, MapleAtlas, Nexon Classic/beta changelogs, Hidden Street, and other period-appropriate databases.
- If sources disagree, preserve the uncertainty and investigate; do not silently guess.
- Remove non-Classic items from supported datasets instead of allowing them to leak into recommendations.

## Global level-state policy
- The selected level is a global source of truth.
- Selecting level 10 must mean level 10 everywhere; no off-by-one mapping is acceptable.
- Dashboard, Skill Tree, AP, equipment, routes, avatar, job title and future-item filtering should consume the same resolved level.
- Boundary levels 9/10 and 29/30 are mandatory regression points.

## Automatic job progression
The chosen level automatically determines the active job and all dependent UI/state.

### I/L
- Lv1–9: Beginner
- Lv10–29: Magician
- Lv30+: Wizard (I/L)

### Fighter
- Lv1–9: Beginner
- Lv10–29: Warrior
- Lv30+: Fighter

### Hunter
- Lv1–9: Beginner
- Lv10–29: Archer
- Lv30+: Hunter

The derived job must drive:
- active build/job title
- Skill Tree grouping
- skill allocation source
- job pills/labels
- avatar badge
- dashboard content
- level-specific recommendations

## Skill Tree behavior
- Skill Tree sections are job-stage-specific: Beginner / first job / second job.
- Skill-card identity should persist across level changes.
- Learned skill coloring and 0-SP greying should remain stable.
- Level changes should not cause blinking/reloading/remounting regressions.
- “Do This Now” and Skill Tree should be side-by-side on the dashboard where layout allows.
- Magic Claw canonical skill ID is `2001003`.

## Dashboard behavior
- Training location belongs in the dedicated Training metric, not duplicated under the job title.
- “Do This Now” content should remain fully readable and must not be truncated.
- Avoid giant empty placeholder cards.
- Build-specific dashboard content must not fall back to another class.

## Equipment policy
- Recommended equipment must be class-correct.
- Avatar visuals must reflect the selected build/class equipment.
- Item name and item visual must refer to the same item.
- Item job and level requirements must be explicit and audited.
- Do not recommend mutually exclusive slot combinations at the same time, especially overall together with top/pants.
- “Show future-level items” is a supported cross-build feature and must not introduce wrong-class gear.
- Only items relevant to the supported Classic build path should appear; exclude non-Classic items.
- Shared systems must never default to Magician equipment for Fighter/Hunter.

## I/L-specific durable direction
- LUK plan should be definitive and tied to actual equipment requirements rather than a generic “safe no-scroll” recommendation.
- User is willing to use 100%/60% scrolls.
- Early 30%/10% scroll risk should be treated cautiously and recommended only when strongly justified.
- Energy Bolt vs Magic Claw guidance should make a clear recommendation, not remain indecisive.
- Magic Claw is preferred where terrain blocking makes Energy Bolt materially less reliable.
- Both pet and mount support are part of the intended builder experience.

## Fighter-specific durable direction
- Do not assume sword + shield is automatically the best route.
- Re-evaluate sword vs axe paths based on actual Classic/beta mechanics.
- Previously mentioned axe-related bleed must be verified before being encoded as fact.
- Fighter AP, equipment, skill order, buffs and visuals must be independently researched.

## Hunter-specific durable direction
- Hunter requires the same depth and quality standard as I/L.
- Hunter AP, skills, equipment, routes, quests, buffs and visuals must be researched independently.
- Never reuse Magician defaults simply because shared components already contain them.

## Maps / assets
- Monster icons should use same-origin routing.
- Prefer OSMS high-resolution maps where available.
- Victoria Island should remain a single world-map click target while preserving relevant beta travel points.
- Sleepywood should remain restored/available.
- Skill icons should sit beside skill names where the UI calls for them.
- Equipment images should fit their slots cleanly.

## Verification philosophy
- A source-code edit is not equivalent to a verified fix.
- A meaningful bug fix should be checked in the live/generated UI.
- Shared-code changes require regression testing on all supported builds, especially I/L because several stability bugs were already solved there.
- Fix root causes where possible rather than duplicating build-specific patches that drift over time.

## Communication preference during project work
- When requested, keep chat replies minimal and spend effort on implementation, research and verification.
- Report completed fixes clearly and briefly, while preserving full detail in continuity files for the next chat.
