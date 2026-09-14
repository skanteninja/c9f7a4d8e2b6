# Continuity Changelog

This log exists to make cross-chat handoff quick and reliable. Record meaningful changes, fixes, regressions, research conclusions, and continuity-system updates.

## 2026-09-14 — Multi-build quality checkpoints 0.9.6–0.9.9

- 0.9.6 standardized public Maps wording to the curated Classic-beta catalog and passed live map checks.
- 0.9.7 exposed Hunter’s visible Beginner → Archer → Hunter tiers while preserving the internal Bowman data branch.
- 0.9.8 added in-place full-page Fighter/Hunter and I/L Skill Tree state updates.
- 0.9.9 corrected the I/L plan-row selector, added a regression guard, and passed Build Static, Verify Live, live browser checks, and the prior multi-build gates.
- Remaining caution: transient paint-level Skill Tree blink remains under observation; independent Classic/beta content research is still open.

## 2026-09-14 — Continuity hardening
- Expanded `PROJECT_STATE.md` into a full new-chat handoff covering active builds, product goals, automatic job progression, level-state rules, Skill Tree behavior, equipment invariants, build-specific research direction, data-quality requirements, current priorities, and maintenance protocol.
- Expanded `KNOWN_BUGS.md` into the authoritative unresolved-issues queue with severity, acceptance criteria, regression checks, database integrity rules, and a verification matrix.
- Expanded `DECISIONS.md` with durable product, research, level-state, equipment, I/L, Fighter, Hunter, map/asset, verification and communication decisions.
- Added `FIX_HISTORY.md` to preserve historical bugs, fixes, regressions and lessons so future chats do not repeat solved debugging work.
- Added `START_HERE.md` as the canonical entry point for fresh ChatGPT conversations.
- Documented the rule that source edits alone do not count as fixes; important fixes require generated/live UI verification.
- Documented regression boundary levels 9/10 and 29/30 and cross-build switching checks.
- Documented the need to preserve I/L stability while bringing Fighter/Hunter to parity.

## 2026-09-14 — Historical state captured
The continuity system now explicitly preserves the following previously fixed or established behavior:
- I/L Skill Tree blinking/reloading on level changes was fixed.
- Skill-card identity should persist across level changes.
- Learned-skill coloring and 0-SP greying should remain stable.
- Magic Claw canonical skill ID is `2001003`.
- Historical level-10-to-level-9 off-by-one behavior was addressed on I/L; Fighter/Hunter still require verification.
- Giant empty dashboard Skill Tree card was removed.
- “Do This Now” truncation was fixed.
- Duplicate training-location copy beneath the job title was removed; Training metric is the intended single location.
- Monster icons use same-origin routing.
- OSMS high-resolution maps are preferred where available.
- Victoria Island remains a single world-map click target while beta travel points are preserved.
- Sleepywood map was restored.

## 2026-09-14 — Active unresolved areas captured
- Fighter and Hunter completeness/parity with I/L remains a major quality target.
- Fighter/Hunter Skill Trees need verified Beginner / first-job / second-job grouping.
- Fighter dashboard Skill Tree vertical-layout regression requires verification/fix.
- Exact level handling must be verified on Fighter/Hunter, especially levels 9/10 and 29/30.
- Automatic job progression must synchronize job title, Skill Tree, skill allocation, avatar badge, job pills and dashboard content.
- Fighter/Hunter equipment recommendations historically leaked Magician gear.
- Fighter/Hunter avatar visuals historically leaked Magician equipment/defaults.
- Item names, icons, job requirements, level requirements and slot metadata need Classic-era audit.
- Overall versus top/pants mutual exclusivity needs verification across builds.
- “Show future-level items” needs consistent cross-build implementation and class filtering.
- Fighter weapon-path research must not assume sword + shield; axe/beta bleed behavior requires source confirmation before being treated as fact.
- Hunter AP/skills/equipment/routes/quests/buffs require independent Classic-specific audit.

## 2026-09-14 — Repository continuity system established
- Established repository-based continuity for the MapleStory Classic Builder.
- Added persistent project state, known-bugs tracker and durable decisions files.
- Recorded current multi-build direction: Fighter, Hunter and I/L Wizard.
- Defined maintenance rule: update continuity documentation after meaningful project work.
