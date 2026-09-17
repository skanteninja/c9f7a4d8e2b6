# MapleStory Classic Builder — Prioritized Implementation Backlog

Last prioritized: 2026-09-17
Ordering follows the quality contract in [QUALITY_STANDARD.md](QUALITY_STANDARD.md). “Implemented locally” never means “deployed” until the live gate passes.

## 0.10.11 in-progress reference-fidelity correction

- Correct the dashboard card treatment against the supplied Royal Maple reference rather than accepting the earlier subtle theme pass.
- Keep the existing dashboard layout while adding visible town art to the Equipment Inventory card, stronger antique-gold double frames, real maple-leaf ornaments, and matching slot/control styling.
- Release token: `0.10.11-royal-card-parity`; close this entry only after live browser visual QA passes.

## 0.10.9 completed in the verified live checkpoint

- Applied the approved Royal Maple card treatment to the dashboard panels and nested action/queue/skill/equipment cards.
- Preserved the existing dashboard layout and card dimensions while adding the stronger double frame, square corners, deeper surfaces, corner ornaments, and matching inner-card states.
- Generated site `2de55f76076cc092c7f5949d1576f5d6fc41d062` reports `0.10.9-royal-dashboard-cards`; all release gates passed.

## 0.10.8 completed in the verified live checkpoint

- Fixed the page-level stacking issue that hid the class town backgrounds behind the opaque body canvas.
- Increased town-art visibility while preserving readable Royal Maple content cards.
- Generated site `05c707004b3bebbdb605358d82f6a71f159316d4` reports `0.10.8-royal-town-visibility`; all release gates passed.

## 0.10.7 completed in the verified live checkpoint

- Applied the approved Royal Maple visual system to the existing page cards and controls.
- Added lore-accurate page backgrounds mapped to the active class home town: Perion/Fighter, Henesys/Hunter, and Ellinia/I/L Wizard.
- Added optimized town assets plus cache/version guards and verified the live Cloudflare deployment.
- Generated site `6582c6423f63365e49943def742721aad83f677a` reports `0.10.7-royal-town-themes`; all release gates passed, with Real Input passing on attempt 2 after a transient live-readiness failure.

## 0.10.6 completed in the verified live checkpoint

- Integrated HP and MP Recommended Pots into both Equipment Inventory windows as compact icon slots; removed the standalone potion card.
- Preserved click-open alternate options and the level-aware shop-efficiency/refill-limit logic.
- Completed the current shared-equipment inventory contract: all 23 genderless earrings plus Male/Female armor counterparts are present in I/L, Fighter, and Hunter.
- Generated site `bc945ba01b02b9422c9a1bd6a64270acc1b30d96` reports `0.10.6-dashboard-pot-slots`; all six release gates passed.

## 0.10.4 completed in the verified live checkpoint

- Changed session entry tracking to browser-tab session state so completed Continue/Reset decisions stay quiet across refreshes.
- Entering a different build starts a new entry decision; opening the site in a new browser tab starts a new session decision.
- Pending gender selection remains required until Male/Female is chosen, including after reset.
- Generated site `ea2aaf0e88508437afddd8db446f1b711103f077` reports `0.10.4-session-entry-once`.
- Build Static `35092591507`, Visual/UI `35092591496`, Monster `35092591472`, Maps/ETC `35092591550`, Real Input `35092591504`, and Verify Live `35092685632` passed.

## 0.10.3 completed in the verified live checkpoint

- Added a shared keyboard focus trap for the Continue/Reset, destructive reset, and gender dialogs so Tab and Shift+Tab cannot escape an open session modal.
- Bumped the runtime asset token to `0.10.3-session-focus-trap` so the new session-flow JavaScript cannot remain hidden behind the previous service-worker cache.
- Added the focus-trap requirement to the multi-build audit guard and verified the live app after the cache refresh.
- Build Static `34999140109`, Visual/UI `34999140175`, Monster `34999140162`, Maps/ETC `34999140053`, Real Input `34999140243`, and Verify Live `34999212897` passed. The generated site reports `0.10.3-session-focus-trap`.

## 0.10.2 completed in the verified live checkpoint

- Added Continue vs Reset when a build has saved progress.
- Added an explicit reset confirmation with a concrete loss summary and active-build-only scope.
- Added required male/female selection for fresh and reset sessions.
- Persisted gender per build, filtered gender-locked equipment, sanitized incompatible saved gear, and mapped gender to the Classic avatar compositor.
- Verified through Cloud Browser QA and Verify Live `34985164756`; generated site reports `0.10.2-session-gender-flow`.

## P0 — release blockers

None currently identified. Re-open P0 if a change corrupts shared progress, makes a supported build unusable, or publishes a wrong-class avatar/item identity.

## P1 — next release work

### P1.1 — Finish Fighter and Hunter Classic content parity

Status: open.

Audit each build independently for Beginner/first-job/second-job skills, level-by-level SP, AP/stat plan, equipment, routes, quests, ETCs, buffs, and dashboard copy. The current UI is class-specific, but the content audit is not complete.

Acceptance:

- every active build has the same information depth as I/L without inheriting I/L decisions;
- all 9/10 and 29/30 boundary rows are checked;
- Fighter axe mechanics and Hunter progression have two clearly labeled, cross-checked references or remain visibly marked for verification;
- no public text claims unresolved mechanics as fact.

### P1.2 — Close the human-visible Skill Tree blink investigation

Status: observation continues; DOM identity, source, load-event, and child-list gates currently pass.

Reproduce the blink in a fresh browser session, compare a same-tier level change with a tier change, and identify whether it is paint/compositing, asset decode, or an actual remount.

Acceptance:

- three clean captures across I/L, Fighter, and Hunter;
- no stable card/image remount or image reload during same-tier changes;
- no visual flash when moving through 15/16/17 and 29/30/31;
- the existing automated stability guard remains green.

### P1.3 — Preserve dashboard hierarchy while making all actions visible

Status: verified in generated/live 0.10.1-dashboard-containment at the audited desktop viewport. Narrow-width/accessibility validation remains in P2.2.

Remove the measured dashboard metric/level-footer collision, keep the compact Skill Tree readable, and make all required top navigation visible without a desktop horizontal scroll. Evidence: live captures at 1363×936 and computed metric bottom `471` versus footer top `456`; navigation scroll width `1234` versus client width `1038`.

Acceptance:

- Training/Next SP cards do not intersect the level footer;
- all supported nav labels are visible at the audited desktop width;
- level changes do not change hero height unexpectedly or remount the tree;
- the 3 queue cards retain equal height and internal scrolling.

Evidence: live Browser geometry/capture after generated site commit 2a6b451; Verify Live 34976424625 attempt 3 passed.

## P2 — important UX and data-quality work

### P2.1 — Contain the equipment picker at every supported width

Status: verified in generated/live 0.10.1-dashboard-containment at the audited desktop viewport. Narrow-width/accessibility validation remains in P2.2.

The live Fighter picker measured modal `scrollWidth 797` versus `clientWidth 763` and an option card `scrollWidth 410` versus `clientWidth 357`; the saved capture shows clipped requirement/stat text and an internal horizontal scrollbar.

Acceptance:

- no horizontal scrollbar in the modal at the audited desktop width;
- item name, level, class/job requirement, and stat block wrap within the card;
- future-level and optional filters remain visible and keyboard-operable;
- the single-column narrow layout still works.

Evidence: live Browser capture after generated site commit 2a6b451; Verify Live 34976424625 attempt 3 passed.

### P2.2 — Run a narrow-width and text-size accessibility pass

Status: open; the 0.10.3 follow-up verified keyboard focus containment for all three session dialogs at the live desktop viewport, but narrow-width, text-size, and assistive-technology coverage remain outstanding. The 0.10.4 follow-up also verified that completed entry state survives refresh while a different build starts a new prompt.

Test nav, dashboard, picker, Skill Tree, tables/cards, focus order, Escape behavior, and text enlargement. Screenshots so far are desktop evidence only.

Acceptance:

- no clipped required control or inaccessible scroll region;
- keyboard focus is visible and never lost after a page/build/level change;
- state changes are exposed through labels or live regions where needed;
- manual findings are recorded separately from automated checks.

### P2.3 — Audit missing training-route thumbnails

Status: open.

At several live level transitions, the first “Do This Now” training action had no route thumbnail while the Level 1 state did. Determine whether this is intentional fallback behavior or missing map data.

Acceptance:

- every visible route either has the correct map image or an intentional, styled fallback;
- no broken image request or empty visual container remains;
- map name, region, and route image agree.

### P2.4 — Improve Build Library density and scanability

Status: open.

The live Build Library has a large unused right area and uneven class-card density. Preserve the three active builds and planned-build separation while making the selection decision faster.

Acceptance:

- active builds are visually primary and equally scannable;
- planned builds cannot be mistaken for available builds;
- the layout remains usable at desktop and narrow widths.

### P2.5 — Complete class-specific equipment and progression audits

Status: open.

Verify axe versus sword/one-handed/two-handed implications for Fighter and bow/stat progression for Hunter. Confirm item metadata, recipes, quest rewards, and level filters against the Classic data layer before changing recommendations.

## P3 — polish after correctness

- establish a small set of reusable visual regression baselines for the three builds;
- improve empty/loading/error states without introducing third-party asset URLs;
- review microcopy, tooltip timing, hover states, and reduced-motion behavior;
- remove obsolete internal comments and legacy code paths only after all gates are green.

## Execution order

1. Complete independent Fighter/Hunter data research and update recommendations only where evidence supports it.
2. Revisit Skill Tree blink with the new layout and fresh captures.
3. Run the narrow-width/accessibility and route-thumbnail audits.
4. Rebalance Build Library and apply P3 polish.
5. Run the full verification matrix after each meaningful change.
