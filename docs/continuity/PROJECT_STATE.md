# MapleStory Classic Builder — Project State

Last continuity baseline: 2026-09-14

## Purpose
This file is the persistent handoff for new ChatGPT conversations. Read this before making project changes. It should describe current state, active builds, architecture-level decisions, and what is still incomplete.

## Repository / Deployment
- Repository: `skanteninja/c9f7a4d8e2b6`
- Live site: `https://maplestory-classic.ofri505.workers.dev`
- Project is multi-build / multi-class, not I/L-only.

## Active Builds
- Fighter Build
- Hunter Build
- I/L Wizard Build

Never use “Luna’s” in build names.

## Product Direction
The site is intended to be a high-quality MapleStory Classic builder / guide platform with class-correct data and consistent behavior across builds. Fighter and Hunter must reach the same level of completeness and quality as I/L, including skills, AP, equipment, routes, quests, ETC, buffs, visuals, and UI behavior.

## Known Stable / Previously Fixed Behaviors
- I/L skill-tree reload/blinking on level changes was fixed.
- Skill-card identity should be preserved when levels change.
- Learned-skill coloring and 0-SP greying should remain stable.
- Magic Claw uses canonical skill ID `2001003`.
- Monster icons use same-origin routing.
- OSMS high-resolution maps are used where available.
- Victoria Island is a single world-map click target while beta travel points are preserved.
- Sleepywood map was restored.
- Giant empty dashboard Skill Tree card was removed.
- “Do This Now” truncation was fixed.
- Duplicate training-location text under the job title was removed; training belongs only in the Training metric.

## Intended Automatic Job Progression
For I/L:
- Lv1–9: Beginner
- Lv10–29: Magician
- Lv30+: Wizard (I/L)

Equivalent build-specific progression must drive job title, Skill Tree tab, avatar badge, job pills, and skill allocation for Fighter and Hunter as well.

## Quality Rules
- Class data must be build-specific.
- Do not copy I/L equipment, avatar visuals, AP logic, or recommendations into Fighter/Hunter.
- Item names, visuals, job requirements, and level requirements must be audited against reliable Classic-era sources.
- Recommended equipment must not simultaneously recommend incompatible slot combinations such as overall plus top/pants.
- “Show future-level items” must work consistently across builds.
- Level selectors must display and apply the exact selected level; selecting 10 must never resolve to 9.

## Research Sources
Cross-check important claims against multiple sources where possible, including:
- OSMS resources
- henesys.gg
- MeowDB
- MapleAtlas
- Nexon Classic / beta changelogs
- Hidden Street and other period-appropriate databases when useful

Do not assume modern MapleStory data is valid for Classic.

## Maintenance
After meaningful work, update this file if project state or architecture changed, update `KNOWN_BUGS.md` for unresolved issues, update `DECISIONS.md` for durable choices, and append a concise entry to `CHANGELOG.md`.
