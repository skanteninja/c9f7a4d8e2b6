# Known Bugs / Incomplete Work

## Verification snapshot — 0.10.16 merged hero card (verified 2026-09-18)

The continuation screenshot's split/broken Active Build card is resolved on the live site.

- Release token: `0.10.16-royal-maple-single-hero-card`.
- Source frame fix: `48ca8c0815db92f3431925189d11e15fbf8129f8`.
- CI gate correction: `aec7bde00f45a47de57d905e17bc318b40de2c5d`.
- Generated site: `1647bbb0464285b336db72585ede783be10e9702`.
- Build Static `35327750166` and Verify Live `35327827399` passed.
- Live browser QA confirms Active Build, Skill Tree, quick metrics, and Level Progression are contained by one continuous Royal Maple outer frame; the Skill Tree has no second outer frame; content does not cross the border; no clipping/overlap was observed.
- The failed 0.10.16 Build Static run `35274585178` was a stale audit-token failure, not a UI failure; the gate is now aligned with the release token.

## Verification snapshot — 0.10.13 Figma-measured corner frames

The selected card direction is deployed at https://maplestory-classic.ofri505.workers.dev/?build=magician-il-fresh&page=dashboard.

- Source commit: f9b4970bb21aa5c256b4758695765709536af45a.
- Generated site commit: 5af82c97dbbd00a003c5b2eac506b4eb9bdac84f.
- Release token: 0.10.13-royal-corner-frames.
- The live card frame uses the committed Figma-measured SVG with three visible edge lines and diagonal stepped corners.
- Card surfaces are opaque and readable; page-level Perion, Henesys, and Ellinia backgrounds remain outside the dashboard cards.
- All six GitHub release checks passed.
- Manual browser QA confirmed the frame asset is active, the old rectangular border is absent, and Hat plus HP potion modals still work.
- The earlier 0.10.12 Verify Live failure is historical; the 0.10.13 Verify Live run passed.

See design-qa.md for the visual comparison record.

## Verification snapshot — 0.10.12 Variant B (live UI verified; automated browser gate pending)

The selected card direction is deployed and visible at https://maplestory-classic.ofri505.workers.dev/?build=magician-il-fresh&page=dashboard.

- Source commit: 58961938c1e8477481a91e2271584fbb238ab289.
- Generated site commit: 92ffaf4dcb30be618dc3c459f067029dd8c8e3d4.
- Live browser URL: https://maplestory-classic.ofri505.workers.dev/?build=magician-il-fresh&page=dashboard.
- The page serves 0.10.12-royal-beveled-cards, with 20 gear slots and 2 potion slots.
- Variant B uses heavy beveled/stepped multi-line gold borders, opaque near-black/plum card interiors, and no hometown artwork inside dashboard cards; Perion, Henesys, and Ellinia remain page-level class backgrounds.
- The live browser verified Fighter → Perion, Hunter → Henesys, and I/L Wizard → Ellinia; the Hat equipment modal and HP potion recommendation modal opened with six choices and closed successfully.
- Build Static 35263049569, Visual/UI 35263049492, Maps/ETC 35263049531, Monster 35263049676, and Real Input 35263049589 passed.
- Verify Live 35263049644 passed its propagation/data checks but failed in the headless browser assertion step on attempts 1 and 2; manual live browser QA is clean, so this remains an automation follow-up.
- No site-origin console errors were observed during the live browser pass; browser extension metadata noise was excluded.
- Current unresolved verification item: Verify Live 35263049644 fails in the headless browser assertion step on attempts 1 and 2. The propagation/data checks and the manual browser UI checks pass.

See design-qa.md for the visual comparison record.



Last continuity baseline: 2026-09-17

This is the authoritative unresolved-issues list for cross-chat continuity. Do not mark an issue resolved merely because code was edited. Resolution requires verification in the generated/live UI or validated data output.

## Verification snapshot — 0.10.11 Royal Maple card parity (verified 2026-09-17)

The 0.10.11 source pass corrects the visual mismatch identified in the supplied reference comparison. Source `0b69ee5b96f20c2f996238e9d082b7f8ed15682f` produced generated site commit `71a81fe402167779602e0580fbe89342336c8dd9`; the live stylesheet serves `0.10.11-royal-card-parity`.

Verified in the live browser:
- Equipment Inventory visibly uses the Royal Maple double frame, plum/parchment surfaces, maple-leaf slot ornaments, brighter gold borders, and class-town artwork behind the inventory stage.
- Fighter, Hunter, and I/L Wizard routes map to Perion, Henesys, and Ellinia respectively; each renders 20 gear slots and 2 potion slots.
- Equipment replacement and potion recommendation dialogs open with their option cards and close successfully.
- No site-origin console errors were present; browser metadata-extension noise was excluded from application evidence.
- Build Static `35233212472`, Visual/UI `35233212242`, Maps/ETC `35233212285`, Monster `35233212367`, Real Input `35233212383`, and Verify Live `35233212343` passed. Verify Live passed after rerunning its transient CDP execution-context race.

See `design-qa.md` for the comparison record.

## Verification snapshot — 0.10.9 (2026-09-17)

Source commit `f9ade8169c222b0f863adb1a1b005f1a3f1c4ea4` and generated site commit `2de55f76076cc092c7f5949d1576f5d6fc41d062` are deployed. The live build-info endpoint reports `0.10.9-royal-dashboard-cards`.

Verified in generated/live UI and release gates:
- Dashboard panels and nested cards use the approved Royal Maple double-frame treatment with square corners, deeper plum surfaces, corner ornaments, and styled inner cards.
- The existing dashboard layout and card dimensions remain unchanged.
- Build Static `35229858495`, Visual/UI `35229858572`, Monster `35229858465`, Maps/ETC `35229858593`, Verify Live `35229858627`, and Real Input `35229858561` passed.

## Verification snapshot — 0.10.8 (2026-09-17)

Source commit `cc9f2221d6105f2afde98e72d31de703a3c70aac` and generated site commit `05c707004b3bebbdb605358d82f6a71f159316d4` are deployed. The live build-info endpoint reports `0.10.8-royal-town-visibility`.

Verified in generated/live UI and release gates:
- The class-specific town art is visibly rendered behind the page canvas: Perion for Fighter, Henesys for Hunter, and Ellinia for I/L Wizard.
- The Royal Maple content cards remain readable and visually distinct from the page background.
- Build Static `35227409213`, Visual/UI `35227409212`, Monster `35227409116`, Maps/ETC `35227409094`, Verify Live `35227408993` attempt 2, and Real Input `35227409065` passed.

## Verification snapshot — 0.10.7 (2026-09-17)

Source commit `be1ba951fb884bfd5b5ec21d2166d59e0416e836` and generated site commit `6582c6423f63365e49943def742721aad83f677a` are deployed. The live build-info endpoint reports `0.10.7-royal-town-themes`.

Verified in generated/live UI and release gates:
- The approved Royal Maple styling is applied to the shared cards and controls while the existing page layout remains intact.
- Fighter resolves to the Perion page background, Hunter to Henesys, and I/L Wizard to Ellinia.
- Existing dashboard/equipment HP and MP slots, click-open potion options, gender-aware equipment filtering, unisex/genderless gear, and saved progress remain covered by the release checks.
- Build Static `35225947369`, Visual/UI `35225947312`, Monster `35225947311`, Maps/ETC `35225947325`, Verify Live `35225947619`, and Real Input `35225947370` attempt 2 passed. The first Real Input attempt was a transient live skill-image readiness failure and was not used as release evidence.

## Severity legend
- **P0** — breaks core use or corrupts project-wide state
- **P1** — major build correctness/parity issue
- **P2** — important UX/data-quality issue
- **P3** — polish / lower-impact issue

## Verification snapshot — 0.10.6 (2026-09-17)

Source commit `dac47493faa44d723b5449ae65d97d267ee964a1` and generated site commit `bc945ba01b02b9422c9a1bd6a64270acc1b30d96` are deployed. The live build-info endpoint reports `0.10.6-dashboard-pot-slots`.

Verified in generated/live UI and release gates:
- The dashboard and Equipment page render HP and MP as two compact equipment-style slots inside the Equipment Inventory window; no standalone Recommended Pots card remains.
- Each slot uses the current level’s recommendation and opens the highly recommended option plus alternate shop options with icons, recovery, price, meso-per-point, and practical refill-limit details.
- I/L Wizard, Fighter, and Hunter each carry all 23 current genderless earrings and both Male/Female Top, Bottom, and Overall options; shared Unisex/Genderless equipment remains available to both avatar genders.
- Build Static `35214983471`, Visual/UI `35214983487`, Monster `35214983464`, Maps/ETC `35214983520`, Real Input `35214983463`, and Verify Live `35214983474` passed.

## Verification snapshot — 0.10.4 (2026-09-16)

Source commit `b63fbb9532fd02c2f2db4c7b40d74267aec27219` and generated site commit `ea2aaf0e88508437afddd8db446f1b711103f077` are the current deployed session/gender/focus/entry-cadence state. Build Static `35092591507`, Visual/UI `35092591496`, Monster `35092591472`, Maps/ETC `35092591550`, and Real-input `35092591504` passed. Verify Live `35092685632` passed and included the dedicated avatar parity step and the live same-tier Skill Tree stability step.

Verified in generated/live UI:
- Fighter Build, Hunter Build, and I/L Wizard Build use isolated build data and exact required names.
- Level 9/10 and 29/30 transitions use the selected numeric level and synchronize visible job lines and Skill Tree tiers.
- Fighter and Hunter expose Beginner → Warrior/Archer → Fighter/Hunter, while I/L exposes Beginner → Magician → Wizard (I/L).
- The inventory’s selected item IDs exactly match the avatar’s compositor IDs at Level 15 for all three builds.
- All three live avatar PNGs decoded with nonzero dimensions; no legacy avatar icon box was present.
- Fighter/Hunter filters contain no unrelated magician/weapon-branch gear, and Overall versus Top/Bottom remains exclusive.
- Maps, Classic same-origin visual routes, and the public Builds tab checks passed.
- The live 0.10.4 desktop containment check shows all required navigation labels visible, no page-level horizontal overflow, separated dashboard metric/footer regions, and wrapped equipment-picker metadata at the audited viewport.
- Returning to a saved Fighter build displayed Continue and Reset choices. Reset opened a second confirmation dialog listing the exact categories cleared and stating that other build saves remain untouched.
- Confirmed reset cleared the active build and immediately required a new gender choice. Selecting Female produced a female avatar and female-only equipment options; selecting Male produced a male avatar and male-only equipment options.
- Re-entering after the cache-token refresh served `0.10.4-session-entry-once`. Tab and Shift+Tab stayed inside the Continue/Reset, reset-confirmation, and gender dialogs, with wraparound at both ends. The live gender dialog presented a focused Male card, and the confirmed selection produced `MALE` / `avatar=male`.
- After completing the saved-build decision, refreshing the same Fighter URL showed no modal; a new tab showed Continue/Reset; switching to Hunter showed the new-build gender flow; returning to Fighter showed Continue/Reset again.

Additional live audit evidence on 2026-09-15:
- Cloud Browser trusted input changed levels on I/L, Fighter, and Hunter; I/L passed 9→10 and 29→30, while Fighter and Hunter passed the 29→30 job transition with class-correct visible titles.
- The formal repository real-input script was not executable in this workspace because websocket-client is missing and no local Chrome binary is available. This is an environment blocker, not a product pass.
- The deployed build-info reports `0.10.4-session-entry-once`. The local formal real-input script remains unavailable in this workspace, but the GitHub Actions real-input gate passed for the generated checkpoint.

Resolved in this checkpoint:
- P1 Fighter/Hunter avatar correctness.
- P1 cross-class equipment/avatar leakage for the tested curated paths.
- P1 equipment slot compatibility.
- P1 session resume/reset scoping and gender-aware equipment/avatar identity for the tested builds.
- Session-dialog keyboard focus containment and cache-visible runtime delivery.
- Session-entry cadence: completed decisions stay quiet across refreshes while new tabs and different build entries receive a fresh prompt.
- The earlier neutral-avatar-plus-icon-strip workaround was removed.

Still open:
- Human paint-level Skill Tree blink remains under observation; DOM identity, source, load-event, and child-list stability gates pass.
- Independent Classic/beta research and deeper content audits remain open for Fighter axe mechanics, Hunter progression parity, AP/route/quest detail, and any disputed source claims.
- Product Design follow-ups remain open for narrow-width/text-size/assistive-technology coverage, missing route thumbnails, Build Library density, and the human-visible Skill Tree blink. The audited desktop navigation, dashboard containment, and picker overflow findings were addressed in 0.10.1; session/gender flow was added in 0.10.2, session-dialog focus containment was verified in 0.10.3, and session-entry cadence was verified in 0.10.4.
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

## P1 — Dashboard containment and desktop navigation overflow (resolved for audited desktop viewport in 0.10.1)

Live Product Design audit on 2026-09-15 found required navigation labels extending past the desktop nav width, compact Skill Tree content competing with the level footer/metrics, and uneven dashboard hierarchy. The shared containment rules are deployed in 0.10.1 and were checked in the generated/live UI at the audited desktop viewport.

Acceptance criteria:
- all required navigation labels are visible without a horizontal page scrollbar at the audited desktop width;
- Training and Next SP cards do not intersect the level footer;
- compact Skill Tree tabs and cards remain readable and do not cover adjacent metrics;
- the shared rules hold on the audited live dashboard routes and the tested level transitions; the full narrow-width/accessibility matrix remains under P2.2;
- the human-visible Skill Tree blink remains a separate observation item.

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

## Regression guard — session resume/reset and gender identity (resolved 0.10.2)

The active build now owns its saved session state and character gender.

Keep testing:
- returning to a build with meaningful saved progress shows Continue and Reset;
- Reset requires a second explicit confirmation and lists level/page position, gear/loadout, skills, quests/ETC, and gender as the cleared categories;
- confirming Reset clears only the active build and leads to gender selection;
- fresh and reset sessions cannot proceed without choosing Male or Female;
- the saved gender changes the Classic avatar body and filters gender-locked equipment;
- changing gender sanitizes incompatible equipped items rather than leaving a contradictory avatar/loadout;
- switching between builds does not reuse another build’s session or gender.

Reopen this issue if any build can bypass the choice, reset another build, retain cleared progress, or show equipment incompatible with the selected gender.
## P1 — Skill Tree grouping
Historical problem: Fighter/Hunter Skill Trees were not reliably separated into Beginner / first job / second job.

Required:
- Fighter: Beginner / Warrior / Fighter
- Hunter: Beginner / Archer / Hunter
- I/L: Beginner / Magician / Wizard (I/L)

Verify section visibility and SP calculations at boundary levels 9, 10, 29, 30 and later levels.

## P2 — Fighter dashboard Skill Tree layout regression (resolved for audited desktop viewport in 0.10.1)
Historical regression: Fighter dashboard Skill Tree returned to an unintended vertical layout after a similar issue had already been solved elsewhere.

Verify:
- layout matches intended compact/horizontal presentation
- responsive behavior remains usable on narrower widths
- changing level does not cause layout jumping/remounting

The 2026-09-15 live audit found the current compact tree was horizontally arranged but too compressed at the audited width. The 0.10.1 shared CSS widens the tab layout and adds wrapping; generated/static checks and post-publish live visual checks pass. Narrow-width and text-size behavior remains under P2.2.

## P2 — Equipment picker horizontal overflow (resolved for audited desktop viewport in 0.10.1)

The 2026-09-15 live audit measured the picker modal and item cards wider than their visible containers, producing a horizontal scrollbar and clipped requirement/stat text. The 0.10.1 shared CSS changes the option layout to wrap metadata below the image and constrains the modal/card widths; the generated/live visual check passes at the audited desktop viewport.

Acceptance criteria:
- modal and option cards have no unintended horizontal overflow at the audited desktop width;
- item name, level, class/job requirement and stat text remain readable;
- future-level and “show all” controls remain visible and keyboard-operable;
- the narrow single-column layout remains usable.

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

Research note 2026-09-15:
- Firecrawl surfaced a Classic Hunter overview and an independent Hunter leveling guide, but the search did not produce independent beta-era confirmation for the Fighter axe-bleed claim.
- Keep the current axe-bleed wording in the research queue and do not treat it as settled game data.

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

Research note 2026-09-15:
- A structured Classic Hunter source lists Bow Mastery, Amazon’s Judgement, Final Attack: Bow, Bow Booster, Soul Arrow: Bow, and Arrow Bomb: Bow as the core second-job set.
- An independent leveling guide cross-checks an Eye of Amazon → Arrow Blow → Critical Shot emphasis for first job and supplies level bands/routes.
- These references improve the audit basis but do not by themselves close the full equipment, AP, quest, ETC, and route completeness review.

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
