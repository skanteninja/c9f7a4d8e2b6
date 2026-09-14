# Known Bugs / Incomplete Work

Last continuity baseline: 2026-09-14

This is the authoritative unresolved-issues list for cross-chat continuity. Do not mark an issue resolved merely because code was edited. Resolution requires verification in the generated/live UI or validated data output.

## Severity legend
- **P0** — breaks core use or corrupts project-wide state
- **P1** — major build correctness/parity issue
- **P2** — important UX/data-quality issue
- **P3** — polish / lower-impact issue

## Verification snapshot — 0.9.9 (2026-09-14)

The current deployed site is the generated 0.9.9 checkpoint. Source commit `1541de1` and generated-site commit `e8f294c` passed Build Static, Visual/UI, Real Input, Verify Live, and Monster checks; the maps/ETC guard was corrected and passed on `e68792a`, and the selector regression guard passed on `32a0907`.

Verified in the generated/live UI:
- Fighter, Hunter, and I/L use the exact required build names and isolated build data.
- Level 9/10 and 29/30 transitions use the selected numeric level and synchronize the visible job line and active Skill Tree tier.
- Fighter and Hunter full Skill Trees expose Beginner → Warrior/Archer → Fighter/Hunter; full-page level rows and tier locks update in place.
- I/L full-page rows update from level 15 to 16 without changing the skill image sources; Magic Claw remains canonical ID `2001003`.
- Fighter/Hunter avatars use neutral compositor IDs while their canonical Classic loadout icons remain visible; live filters contain no unrelated-class gear.
- Overall is mutually exclusive with Top and Bottom in the equipment picker; future-level filters remain class-specific.
- Maps public wording and Classic-beta catalog labels are live.

The transient blink concern remains under observation. The renderer now preserves the relevant dashboard/full-page nodes and live checks show stable image sources, load events, and row state; a human paint-level blink cannot be fully proven by DOM/CI checks alone.

Open work remains for independent Classic/beta research and deeper item/AP/route/content audits, including Fighter axe mechanics and Hunter research parity.

## P1 — Fighter / Hunter completeness parity
Historical problem: Fighter and Hunter contained substantially less information than I/L and behaved partly like incomplete skeletons.

Verify and complete, build by build:
- Beginner / first-job / second-job Skill Tree sections
- level-by-level SP allocation
- AP/stat plan
- equipment progression
- recommended items and explanations
- training routes
- quests
- ETC/material recommendations
- buffs / consumables
- dashboard summaries
- avatar/equipment visuals
- future-level items
- class-specific “Do This Now” guidance

Acceptance criteria:
- Fighter and Hunter should not feel like trimmed I/L variants.
- No section should silently fall back to I/L/Magician data.

## P1 — Exact level handling / off-by-one regression
Historical regression: selecting level 10 could display or apply level 9.

Must verify on Fighter, Hunter and I/L:
- visible selected level
- job title
- skill SP state
- skill grouping
- equipment level filters
- future-level item logic
- dashboard metrics
- training recommendation
- avatar/job badge

Acceptance criteria:
- Level N is represented as N everywhere.
- No array-index conversion causes N-1 behavior.
- Level selectors/ranges are present and consistent on all builds.

## P1 — Automatic job progression consistency
The level-derived job must be a single source of truth.

Expected:
- Fighter: Beginner 1–9 → Warrior 10–29 → Fighter 30+
- Hunter: Beginner 1–9 → Archer 10–29 → Hunter 30+
- I/L: Beginner 1–9 → Magician 10–29 → Wizard (I/L) 30+

Historical problem: different UI areas could disagree on current job.

Verify synchronization of:
- Active Build title
- Skill Tree section
- skill allocation source
- avatar badge
- job pills/labels
- dashboard copy
- recommendations

## P1 — Cross-class equipment leakage
Historical bugs:
- Fighter/Hunter recommended Magician equipment.
- Fighter/Hunter avatar visuals displayed Magician items.
- Example previously flagged: Blue Kendo Robe appearing in the wrong class context.

Audit:
- recommendation filters
- default equipment datasets
- avatar equipment mapping
- fallback logic
- per-item job tags
- per-item level tags

Acceptance criteria:
- No Magician-only item appears as a Fighter/Hunter recommendation unless it is genuinely usable by that class under the target Classic ruleset.
- No shared fallback silently defaults to I/L gear.

## P1 — Equipment slot compatibility
Historical bug: recommendations could show an overall together with top and pants simultaneously.

Required behavior:
- Overall excludes top + pants recommendations for the same active loadout.
- Top + pants excludes overall for the same active loadout.
- Other mutually exclusive slots should follow equivalent logic.

Verify both recommendation lists and avatar rendering.

## P1 — Fighter/Hunter avatar correctness
Historical problem: avatar visuals remained Magician-oriented on non-Magician builds.

Verify:
- correct build-specific equipment assets
- correct job badge
- correct item-to-avatar mapping
- no stale state after switching build/level/item
- selected/recommended item art matches displayed item name

## P1 — Skill Tree grouping
Historical problem: Fighter/Hunter Skill Trees were not reliably separated into Beginner / first job / second job.

Required:
- Fighter: Beginner / Warrior / Fighter
- Hunter: Beginner / Archer / Hunter
- I/L: Beginner / Magician / Wizard (I/L)

Verify section visibility and SP calculations at boundary levels 9, 10, 29, 30 and later levels.

## P2 — Fighter dashboard Skill Tree layout regression
Historical regression: Fighter dashboard Skill Tree returned to an unintended vertical layout after a similar issue had already been solved elsewhere.

Verify:
- layout matches intended compact/horizontal presentation
- responsive behavior remains usable on narrower widths
- changing level does not cause layout jumping/remounting

## P2 — “Show future-level items” inconsistency
Historical issue: feature was missing or nonfunctional on Fighter/Hunter.

Required:
- feature exists on every supported build
- off = current-level-valid items only according to intended recommendation logic
- on = future relevant items become visible without introducing wrong-class gear
- future items retain correct level/job metadata

## P2 — Item name / icon / metadata mismatch
Historical concern: some item names, visuals or metadata did not agree with OSMS / henesys.gg / MeowDB.

Audit each supported recommendation for:
- canonical Classic-era name
- image/icon
- slot
- required level
- required job/class
- relevant stats
- recipe/crafting information where shown

If sources disagree, document the conflict rather than guessing.

## P2 — Fighter weapon-path research
Do not inherit a generic “sword + shield” recommendation without Classic-specific validation.

Investigate:
- swords vs axes
- one-handed vs two-handed considerations where relevant
- shield implications
- beta-specific axe mechanics
- previously flagged claim that axes may apply bleed in the beta

The bleed claim is **not automatically accepted as fact**. Confirm against current Classic/beta evidence before encoding it into recommendations.

## P2 — Hunter independent progression audit
Hunter must be researched independently for:
- AP/stat plan
- weapon progression
- armor/equipment progression
- skills/SP order
- training locations
- quests
- buffs/consumables

Do not inherit Magician/Fighter assumptions.

## P2 — I/L regression guard
Shared-code fixes for Fighter/Hunter must not break established I/L behavior.

Regression checks:
- Skill Tree does not blink/reload on level change
- skill-card identity remains stable
- learned coloring remains stable
- 0-SP greying remains correct
- Magic Claw ID remains `2001003`
- exact-level behavior remains correct
- dashboard layout remains intact
- equipment filtering remains class-correct

## P2 — Duplicate training location regression
Previously fixed: training text appeared under the job title and again in the Training metric.

Required:
- keep it only in the Training metric
- verify new build/dashboard templates do not reintroduce the duplicate

## P2 — “Do This Now” truncation regression
Previously fixed.

Required:
- long instructions remain readable
- responsive changes do not bring clipping/truncation back

## P2 — Map / routing regression guards
Previously fixed behavior to verify after map-related changes:
- monster icons route through same-origin paths
- use OSMS high-resolution maps where available
- Victoria Island remains a single world-map click target
- beta Victoria Island travel points remain available
- Sleepywood remains restored/accessible

## P3 — Content completeness / consistency audit
Across all builds, verify:
- terminology is consistent
- “Highly recommended” labels are applied intentionally
- skill icons match skill names
- item icons fit equipment slots
- no placeholder/modern/non-Classic assets remain
- dashboard wording does not repeat the same information unnecessarily

## Database integrity rule
Where relevant, supported items should explicitly carry:
- item ID
- canonical name
- slot
- job/class restriction
- level requirement
- icon/image mapping
- build relevance

Shared data must not depend on implicit “Magician by default” behavior.

## Verification matrix for every meaningful fix
Test at minimum:
- level 1
- level 9
- level 10
- level 29
- level 30
- one midgame level relevant to the build
- highest currently supported level (historically 70 for the original builder scope)

Also test:
- switching builds
- switching levels repeatedly
- toggling future-level items
- changing equipment selections
- returning to a previously viewed build

## Definition of resolved
An issue may be moved out of this file only when:
1. root cause has been addressed,
2. generated/live UI has been checked,
3. boundary cases relevant to the issue have been checked,
4. known-good behavior in other builds has not regressed,
5. the fix is recorded in `FIX_HISTORY.md` / `CHANGELOG.md`.
