# Known Bugs / Incomplete Work

Last continuity baseline: 2026-09-14

This is the authoritative unresolved-issues list for cross-chat continuity. Remove or mark items resolved only after verification.

## Fighter / Hunter parity
- Fighter and Hunter still need a completeness audit against I/L; historically they had substantially less content.
- Verify skill trees are correctly separated by Beginner / first job / second job sections.
- Verify build-specific AP, skills, equipment, buffs, routes, quests, ETC, visuals, and dashboard content.

## Level handling
- Historical regression: selecting level 10 could display/apply level 9.
- Verify the exact selected level propagates everywhere on Fighter and Hunter, not only I/L.

## Dashboard / Skill Tree
- Historical regression: Fighter dashboard Skill Tree returned to an unintended vertical layout.
- Verify dashboard Skill Tree layout is consistent across all builds.
- Verify job title, skill allocation, job pills, avatar badge, and Skill Tree section all follow automatic class progression.

## Equipment / avatar
- Historical bug: Fighter/Hunter recommendations showed Magician equipment.
- Historical bug: Fighter/Hunter avatar visuals showed Magician equipment.
- Historical bug: incompatible equipment could be recommended together (overall plus top/pants).
- Audit item names, item images, class requirements, level requirements, and slot compatibility against Classic-era sources.
- Verify “Show future-level items” exists and works in every build.

## Data quality
- Re-evaluate weapon recommendations per build rather than inheriting another class’s assumptions.
- Fighter weapon logic should account for beta-specific mechanics such as axe-related bleed if that behavior is confirmed by current Classic sources.
- Keep all database entries explicitly tagged by job and level requirement where relevant.

## Verification rule
A fix is not complete until it is checked in the live UI or against the generated build output, not merely changed in source code.
