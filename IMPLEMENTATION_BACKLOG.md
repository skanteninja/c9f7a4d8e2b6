# MapleStory Classic Builder — Prioritized Implementation Backlog

Last prioritized: 2026-09-15
Ordering follows the quality contract in [QUALITY_STANDARD.md](QUALITY_STANDARD.md). “Implemented locally” never means “deployed” until the live gate passes.

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

Status: open.

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
