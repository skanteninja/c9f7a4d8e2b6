# Known Bugs / Incomplete Work

Last continuity baseline: 2026-09-14

This is the authoritative unresolved-issues list for cross-chat continuity. Do not mark an issue resolved merely because code was edited. Resolution requires verification in the generated/live UI or validated data output.

## Severity legend
- **P0** — breaks core use or corrupts project-wide state
- **P1** — major build correctness/parity issue
- **P2** — important UX/data-quality issue
- **P3** — polish / lower-impact issue

## Verification snapshot — 0.10.0 (2026-09-14)

Source head a2ac9b9 and generated site checkpoint 6033028 are the current avatar-parity state. Build Static 34858100599, Visual/UI 34858100657, Maps/ETC 34858100699, and Verify Live 34858189737 passed. Real-input 34857418168 passed against the same generated app state. Verify Live included the dedicated avatar parity step and the live same-tier Skill Tree stability step.

Verified in generated/live UI:
- Fighter Build, Hunter Build, and I/L Wizard Build use isolated build data and exact required names.
- Level 9/10 and 29/30 transitions use the selected numeric level and synchronize visible job lines and Skill Tree tiers.
- Fighter and Hunter expose Beginner → Warrior/Archer → Fighter/Hunter, while I/L exposes Beginner → Magician → Wizard (I/L).
- The inventory’s selected item IDs exactly match the avatar’s compositor IDs at Level 15 for all three builds.
- All three live avatar PNGs decoded with nonzero dimensions; no legacy avatar icon box was present.
- Fighter/Hunter filters contain no unrelated magician/weapon-branch gear, and Overall versus Top/Bottom remains exclusive.
- Maps, Classic same-origin visual routes, and the public Builds tab checks passed.

Resolved in this checkpoint:
- P1 Fighter/Hunter avatar correctness.
- P1 cross-class equipment/avatar leakage for the tested curated paths.
- P1 equipment slot compatibility.
- The earlier neutral-avatar-plus-icon-strip workaround was removed.

Still open:
- Human paint-level Skill Tree blink remains under observation; DOM identity, source, load-event, and child-list stability gates pass.
- Independent Classic/beta research and deeper content audits remain open for Fighter axe mechanics, Hunter progression parity, AP/route/quest detail, and any disputed source claims.
- The remaining items below are maintained as regression guards until their broader audits are complete.
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

## Regression guard — cross-class equipment leakage (resolved 0.10.0)

The previous P1 issue is resolved for the supported curated paths. Fighter/Hunter item rows are class-filtered, canonicalized to Classic IDs, and the live Level-15 parity gate confirms their avatar IDs come from the same selected inventory rows.

Keep this guard active:
- no Magician-only item in Fighter/Hunter recommendations,
- no cross-table avatar fallback,
- no shared fallback silently defaulting to I/L gear,
- future-level results remain class-specific.
## Regression guard — equipment slot compatibility (resolved 0.10.0)

Overall versus Top/Bottom is normalized in saved state, presets, inventory presentation, and the avatar payload. Keep testing both directions whenever preset or picker code changes.
## Regression guard — Fighter/Hunter avatar correctness (resolved 0.10.0)

The live gate now proves:
- selected inventory item names resolve to their canonical Classic IDs,
- those IDs are the exact avatar compositor IDs,
- all three build PNGs render,
- the avatar uses classic-avatar-preview-v1,
- the legacy avatar-equipped-icons box is absent.

Reopen this issue only if a future change breaks those assertions or a human visual review finds a paint-level mismatch.
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
