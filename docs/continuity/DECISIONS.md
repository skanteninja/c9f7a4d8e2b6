# Durable Project Decisions

Last continuity baseline: 2026-09-14

Use this file for settled choices that future chats should preserve unless new evidence justifies changing them.

## Scope
- The site is multi-build and multi-class.
- Required builds currently include Fighter, Hunter, and I/L Wizard.
- Never use “Luna’s” in build names.

## Data / research
- Class-specific recommendations must be independently researched; do not clone I/L assumptions into Fighter/Hunter.
- Classic / beta behavior takes priority over modern MapleStory behavior.
- Important item, skill, route, and mechanic claims should be cross-checked across reliable Classic-era sources.
- Magic Claw canonical skill ID is `2001003`.

## UI / behavior
- Level selection must be exact and consistent across every build.
- Job progression should update all dependent UI/state automatically.
- Skill cards should preserve identity across level changes; learned state and 0-SP visual state should not flicker/reset.
- “Do This Now” and Skill Tree are intended to be side-by-side on the dashboard where layout allows.
- Training location belongs in the Training metric, not duplicated under the job title.
- “Show future-level items” is a supported cross-build feature.

## Equipment
- Recommended equipment must be class-correct.
- Avatar visuals must reflect the selected build/class equipment.
- Do not recommend mutually exclusive slot combinations at the same time.
- Use only items relevant to the supported Classic build path; exclude non-Classic items.

## Continuity workflow
- Repository files are the source of truth for MapleStory implementation continuity across chats.
- After meaningful work, update `PROJECT_STATE.md`, `KNOWN_BUGS.md`, `DECISIONS.md` when applicable, and append to `CHANGELOG.md`.
- Discord is intended as a readable changelog/mirror, not the sole source of truth.
