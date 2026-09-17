# Continuity Changelog

## 2026-09-17 — 0.10.13 Figma-measured corner frames — Figma-measured corner frames

- Replaced the CSS border approximation with the exact three-line stepped/chamfered frame measured from the connected Figma component.
- Added the committed frame asset at `public/assets/variant-b-card-frame.svg`; the build copies it into the deployed static asset set and the service worker core.
- Kept card interiors opaque and readable, with the existing dashboard layout, class-town page backgrounds, 20 gear slots, 2 potion slots, and modal behavior intact.
- Figma reference: https://www.figma.com/design/vM5lzAtSpIEki4NVXftrkg
- Release token: 0.10.13-royal-corner-frames.
- Source commit: f9b4970bb21aa5c256b4758695765709536af45a.
- Generated site commit: 5af82c97dbbd00a003c5b2eac506b4eb9bdac84f.
- All six GitHub release checks passed, including Build static site, Visual/UI, Maps/ETC, Monster, Real input, and Verify live.
- Live browser QA confirmed the frame asset is active, the old rectangular border is gone, and Hat plus HP potion modals still open and close correctly.
## 2026-09-17 — 0.10.12 Variant B beveled card frames

- Applied the selected Variant B visual direction to dashboard cards without changing the existing layout.
- Added heavy stepped/multi-line gold border lines, square corners, opaque card interiors, and matching equipment/potion slot surfaces.
- Kept Perion, Henesys, and Ellinia as page-level class-town backgrounds so they frame the dashboard without bleeding through card content.
- Source commit: 58961938c1e8477481a91e2271584fbb238ab289.
- Generated site commit: 92ffaf4dcb30be618dc3c459f067029dd8c8e3d4.
- Live browser URL: https://maplestory-classic.ofri505.workers.dev/?build=magician-il-fresh&page=dashboard.
- The page serves 0.10.12-royal-beveled-cards, with 20 gear slots and 2 potion slots.
- Variant B uses heavy beveled/stepped multi-line gold borders, opaque near-black/plum card interiors, and no hometown artwork inside dashboard cards; Perion, Henesys, and Ellinia remain page-level class backgrounds.
- The live browser verified Fighter → Perion, Hunter → Henesys, and I/L Wizard → Ellinia; the Hat equipment modal and HP potion recommendation modal opened with six choices and closed successfully.
- Build Static 35263049569, Visual/UI 35263049492, Maps/ETC 35263049531, Monster 35263049676, and Real Input 35263049589 passed.
- Verify Live 35263049644 passed its propagation/data checks but failed in the headless browser assertion step on attempts 1 and 2; manual live browser QA is clean, so this remains an automation follow-up.
- Manual browser QA confirmed the live card treatment plus Hat replacement and HP potion recommendation modals.
- Verify Live 35263049644 remains the only release check not green because its headless assertion fails on attempts 1 and 2; track this before treating the automated release set as fully green.


This log exists to make cross-chat handoff quick and reliable. Record meaningful changes, fixes, regressions, research conclusions, and continuity-system updates.

## 2026-09-17 — 0.10.11 Royal Maple card parity

- Corrected the dashboard implementation after visual comparison showed that the compact equipment card still looked like the legacy UI rather than the approved Royal Maple reference.
- Applied the final visual layer to the rendered dashboard cards: visible town art in the equipment card, brighter antique-gold double frames, parchment/plum surfaces, maple-leaf ornaments, matched slot framing, and reference-style controls.
- Preserved the existing dashboard grid, slot positions, level-aware equipment/potion behavior, and class mapping; the change is visual and cache-versioned.
- Source `0b69ee5b96f20c2f996238e9d082b7f8ed15682f` produced generated site `71a81fe402167779602e0580fbe89342336c8dd9`; live `0.10.11-royal-card-parity` is deployed.
- Live design QA passed at a 1363 × 936 CSS px viewport: class-town art, maple ornaments, double frames, 20 gear slots, and 2 potion slots are visible; Hat replacement and HP potion dialogs open with options and close successfully.
- Build Static `35233212472`, Visual/UI `35233212242`, Maps/ETC `35233212285`, Monster `35233212367`, Real Input `35233212383`, and Verify Live `35233212343` passed. Verify Live passed on rerun after a transient CDP execution-context race. The implementation screenshot and comparison record are in `design-qa.md`.

## 2026-09-17 — 0.10.9 Royal Maple dashboard cards

- Applied the approved Royal Maple card treatment to the dashboard panels and inner cards: antique-gold double framing, square corners, deeper plum/parchment surfaces, corner ornaments, and matching inner-card states.
- Preserved the existing dashboard layout, dimensions, equipment/potion behavior, class mapping, and town backgrounds.
- Source `f9ade8169c222b0f863adb1a1b005f1a3f1c4ea4` produced generated site `2de55f76076cc092c7f5949d1576f5d6fc41d062`; live `build-info.txt` reports `0.10.9-royal-dashboard-cards`.
- Build Static `35229858495`, Visual/UI `35229858572`, Monster `35229858465`, Maps/ETC `35229858593`, Real Input `35229858561`, and Verify Live `35229858627` passed.

## 2026-09-17 — 0.10.8 restored visible town-art backgrounds

- Fixed the Royal Maple town art being hidden behind the opaque body canvas even though the theme mapper and asset requests were working.
- Increased background visibility while keeping the town imagery behind readable, opaque content cards; bumped the runtime/service-worker token to `0.10.8-royal-town-visibility`.
- Source `cc9f2221d6105f2afde98e72d31de703a3c70aac` produced generated site `05c707004b3bebbdb605358d82f6a71f159316d4`; live `build-info.txt` reports `0.10.8-royal-town-visibility`.
- Build Static `35227409213`, Visual/UI `35227409212`, Monster `35227409116`, Maps/ETC `35227409094`, Real Input `35227409065`, and Verify Live `35227408993` attempt 2 passed.

## 2026-09-17 — 0.10.7 Royal Maple town themes

- Applied the approved Royal Maple visual treatment to the existing cards, equipment inventory, navigation, buttons, and modal surfaces without changing the page layout.
- Added lore-accurate class-home backgrounds: Perion for Fighter/Warrior, Henesys for Hunter/Bowman, and Ellinia for I/L Wizard/Mage.
- Bumped the runtime/service-worker token and added same-origin WebP town assets for all three supported builds.
- Source `be1ba951fb884bfd5b5ec21d2166d59e0416e836` produced generated site `6582c6423f63365e49943def742721aad83f677a`; live `build-info.txt` reports `0.10.7-royal-town-themes`.
- Build Static `35225947369`, Visual/UI `35225947312`, Monster `35225947311`, Maps/ETC `35225947325`, Real Input `35225947370` attempt 2, and Verify Live `35225947619` passed.

## 2026-09-17 — 0.10.6 integrated recommended pot slots

- Moved Recommended Pots into the Equipment Inventory window on the dashboard and Equipment page as compact HP and MP icon slots.
- Clicking a slot opens the level-aware highly recommended potion and all alternate shop options, including icons, recovery, price, meso-per-point, and practical refill-limit details.
- Expanded the I/L inventory to include all 23 current genderless earrings and Male/Female armor counterparts; the existing gender filter keeps incompatible choices out while preserving shared gear.
- Bumped the runtime/service-worker token to `0.10.6-dashboard-pot-slots`; live `build-info.txt` reports the new checkpoint.
- Source `dac47493faa44d723b5449ae65d97d267ee964a1` and generated site `bc945ba01b02b9422c9a1bd6a64270acc1b30d96` are deployed. Build Static `35214983471`, Visual/UI `35214983487`, Monster `35214983464`, Maps/ETC `35214983520`, Real Input `35214983463`, and Verify Live `35214983474` passed.

## 2026-09-16 — 0.10.4 session-entry cadence

- Session Continue/Reset now appears once per build entry in a browser tab instead of on every refresh.
- Completed entry state survives refresh; a new tab or different build starts the appropriate new entry flow, and incomplete gender selection remains blocking.
- Bumped the runtime/service-worker token to `0.10.4-session-entry-once`; generated site `ea2aaf0e88508437afddd8db446f1b711103f077` deployed.
- Build Static `35092591507`, Visual/UI `35092591496`, Monster `35092591472`, Maps/ETC `35092591550`, Real Input `35092591504`, and Verify Live `35092685632` passed.
- Live Browser QA verified refresh suppression, new-tab prompting, build switching, persisted male identity, zero visible image failures, and no application-origin console errors.

## 2026-09-15 — 0.10.3 session-dialog focus containment

- Added keyboard focus containment to the Continue/Reset, reset-confirmation, and gender dialogs, including forward/reverse wraparound.
- Added a release guard for the focus trap and bumped the runtime/service-worker asset token to `0.10.3-session-focus-trap` after live testing found the previous cache still serving 0.10.2 JavaScript.
- Rebuilt and published generated site commit `3fd241a7b867d9557ac04aeeb07e40004856d06e`; live `build-info.txt` reports `0.10.3-session-focus-trap`.
- Build Static `34999140109`, Visual/UI `34999140175`, Monster `34999140162`, Maps/ETC `34999140053`, Real Input `34999140243`, and Verify Live `34999212897` passed.
- Live Browser QA confirmed Continue → Reset → Continue, reset confirmation wraparound, Male → Female → Male, male avatar identity, and clean visible application assets. The only console errors were from the browser environment’s metadata extension.

## 2026-09-15 — 0.10.2 session/gender flow

- Added Continue versus Reset when a player returns to a build with saved progress.
- Added a second reset-confirmation modal that spells out the exact progress categories that will be lost and limits the reset to the active build.
- Added required Male/Female selection for fresh and reset builds, with a one-time choice for older saved builds that have no gender.
- Persisted gender per build, filtered gender-locked equipment, cleared incompatible saved gear, and mapped gender to the Classic avatar compositor.
- Verified the visible flow in Cloud Browser QA, including the reset-to-gender path, female-only and male-only equipment options, and matching avatar identity.
- Build Static 34983348769, Maps/ETC 34983519233, Real Input 34983348845, and Verify Live 34985164756 passed; live build-info reports 0.10.2-session-gender-flow.

## 2026-09-15 — 0.10.1 dashboard containment

- Added QUALITY_STANDARD.md and IMPLEMENTATION_BACKLOG.md.
- Added the Product Design/browser audit record with measured desktop navigation, dashboard, picker, route-thumbnail, and Build Library findings.
- Added shared source CSS for dashboard metric/footer spacing, compact Skill Tree wrapping, picker metadata wrapping, and desktop nav wrapping.
- Cross-checked Hunter progression references with Firecrawl; Fighter axe-bleed behavior remains unconfirmed and was not promoted to settled data.
- Built 0.10.1-dashboard-containment successfully and passed the static multi-build and generated JavaScript checks.
- Cloud Browser trusted-input checks passed across I/L, Fighter, and Hunter. The formal Python real-input script was blocked by the workspace’s missing websocket-client dependency and unavailable local Chrome.
- Build Static published generated site commit 2a6b451; live build-info reports 0.10.1-dashboard-containment.
- Post-build Verify Live run 34976424625 passed on attempt 3, including live browser, Fighter/Hunter route, avatar/inventory parity, and same-tier Skill Tree stability checks. The first two attempts hit transient CDP execution-context races and were not treated as release evidence.
- A live Hunter Level 30 capture at the audited desktop viewport confirmed the wrapped navigation, separated metric/footer regions, and contained dashboard layout. Narrow-width/accessibility review, route thumbnails, Build Library density, and the human-visible Skill Tree blink remain open.

## 2026-09-14 — 0.10.0 Classic avatar parity

- Fixed the major inventory/avatar identity bug across I/L Wizard, Fighter, and Hunter.
- Root cause: the inventory uses Classic/OSMS item IDs, while the previous DreamMS/GMS-latest character compositor uses a different numeric item table. The same number therefore rendered unrelated artwork, including magician-looking gear on other builds.
- The avatar now sends only the selected build's canonical Classic item IDs through a same-origin /game-media/characters/classic-preview route backed by the Classic-compatible MeowDB compositor.
- The inventory and avatar are now derived from the same selected state.gear record. The public canonical icon route, /game-media/icons/<item ID>, is the identity guard for every rendered item.
- Overall remains mutually exclusive with Top and Bottom in both inventory state and avatar payload.
- Fighter and Hunter now wear their selected/recommended equipment in the character render. The separate Fighter/Hunter avatar icon box was removed; canonical inventory icons remain in the equipment slots.
- Added an upstream timeout and explicit placeholder behavior so an unavailable compositor cannot leave the avatar request hanging or cause incorrect fallback artwork.
- Added a live browser parity gate that checks inventory IDs against avatar IDs at Level 15, confirms a rendered PNG for all three builds, rejects the legacy icon box, and checks the Classic renderer marker.

Verification evidence:
- Source head: a2ac9b9 (avatar upstream timeout).
- Generated site checkpoint: 6033028.
- Build Static: 34858100599 — success.
- Visual/UI: 34858100657 — success.
- Maps/ETC: 34858100699 — success.
- Monster integrity: 34857418180 — success on the same generated app checkpoint.
- Real-input: 34857418168 — success on the same generated app checkpoint.
- Verify Live: 34858189737 — success, including live avatar parity and live same-tier Skill Tree stability.
- Exact live Level-15 parity was observed for I/L (1002019, 1050001, 1082003, 1092002, 1372001), Fighter (1002036, 1051000, 1072015, 1082002, 1312002), and Hunter (1002043, 1041020, 1061016, 1072018, 1082004, 1452001).

The human paint-level Skill Tree blink remains a separate observation item even though the live DOM/image stability gate passes.

## Continuity archive — handoffs 1–4

### Product direction and naming

- The project is a multi-build, multi-class MapleStory Classic builder.
- Required build names are Fighter Build, Hunter Build, and I/L Wizard Build.
- Luna is the engine name only; never use Luna’s in a build name.
- Fighter and Hunter must have independent AP, SP, equipment, routes, quests, ETC, buffs, visuals, and dashboard content.
- The original I/L requirements remain active: Level 1–70 planning, definitive LUK/equipment guidance, clear Energy Bolt versus Magic Claw guidance, old-school inventory presentation, pets, mounts, skill icons, and future-level planning.

### Previously fixed product and UI behavior

- Skill Tree level changes no longer intentionally blink/reload or replace skill-card/image identity; learned coloring and 0-SP greying are regression requirements.
- Magic Claw is standardized to canonical skill ID 2001003.
- Dashboard Skill Tree layout was corrected from vertical collapse to horizontal expansion; jobs with more than three cards use a wider row without covering Next SP, and icon/font size is preserved.
- The giant empty dashboard Skill Tree card was removed.
- Do This Now text now wraps fully, and its TRAIN, SP, BANK, and AP cards navigate to Leveling, Skill Tree, ETC Planner, and Equipment/requirements.
- Escape and visible Back navigation return to Dashboard from secondary tabs; Escape closes the equipment picker.
- Training Target was removed.
- The evidence strip was moved under the main header; the public UI keeps provenance language out of ordinary dashboard copy.
- Quest Queue and ETC Queue have checkbox completion with a 10-second Undo period; the ETC Planner retains completed rows for restoration and dashboard ETC targets include about a 15% safety buffer.
- Dashboard queues were moved near the top for second-monitor use.
- Kerning City PQ is gated at Level 21 for the current Classic dataset.
- Duplicate training-location text under the Beginner/job title was removed; the location belongs only in the Training metric.
- Equipment badges now use class emblems instead of an I/L-only badge.
- Overall is mutually exclusive with Top plus Bottom.
- The level selector/range is intended to represent Level 1–70 exactly, including Level 10 and the 29/30 job boundary.
- Browser Back/Forward history covers tabs, maps, searches, and details.
- Typography/readability was enlarged, and Maps Show more pagination was corrected.
- Job-aware database search and branch matching were added.
- Internal metadata/visible database IDs, portals, and patch notes were removed from the public Database tab.
- Legacy/non-Classic map records were removed; map review/audit handling was added.
- Monster icons use same-origin routes.
- OSMS high-resolution maps are preferred where available; Victoria Island uses one world-map click target while beta travel points remain; Sleepywood uses its real NPC town link and the beta Victoria Island map was restored.
- Legacy v62/v83 art is allowed for a verified Classic entity; valid old-school visuals were not removed merely because they are old.
- Direct image fallback chains exist for characters, equipment, monsters, pets, and skills.
- The local launcher has a progress mirror at %LOCALAPPDATA%/MapleStoryClassicBuilder/progress-v1.json.
- Existing I/L progress compatibility remains Build ID magician-il-fresh with localStorage key ultimateILGuideState.v1.
- Multi-build URLs and per-build localStorage keys were added. Fighter uses an axe-family route with two-handed axe as default and one-handed axe/shield as a defensive alternative. Hunter uses bow-family gear and Bowman/Hunter skills.
- Fighter/Hunter equipment filters reject magician, thief, spear, polearm, blunt, crossbow, and unrelated branch leakage; future-level labels are class-specific.

### Hosting and deployment history

- Repository root, including .git, is no longer intentionally served as the public asset directory.
- The temporary landing page was replaced by the real application shell.
- The plain unstyled deployment was traced to runtime delivery/build failure rather than the CSS design.
- Cloudflare ignoring build.command inside wrangler.jsonc was identified; the workflow no longer relies on that mechanism.
- Old service-worker caches received retirement/cache-clearing handling.
- The no-buttons runtime failure was narrowed to JavaScript/data failing before event handlers attached.
- GitHub Actions static reconstruction was added so the generated site is validated before deployment.
- A compressed runtime corruption incident produced Z_DATA_ERROR: incorrect data check. The exact bad chunks were styles.00.txt, styles.01.txt, styles.02.txt, and guide.05.txt. The intended repair process is one chunk at a time, with verification after each repair, rather than another giant deployment.

### Skill Tree debugging history from the later chats

- Automatic job progression is level-derived: I/L Beginner 1–9, Magician 10–29, Wizard (I/L) 30+; Fighter Beginner 1–9, Warrior 10–29, Fighter 30+; Hunter Beginner 1–9, Archer 10–29, Hunter 30+.
- The derived job must synchronize the job title, Skill Tree tab/group, avatar badge, job pills, skill allocation, labels, and recommendations.
- Fighter tiers are Beginner → Warrior/1st Job → Fighter/2nd Job. Hunter tiers are Beginner → Archer/1st Job → Hunter/2nd Job.
- The Skill Tree refresh investigation covered redundant dashboard renders, automatic gear renders, delayed skill-state updates, DOM replacement, and the visuals-skills MutationObserver/listeners.
- The anti-refresh work must preserve 0-SP greying: 0 SP is grey/desaturated, 1+ SP is full color, and the image source should stay unchanged while the state changes.
- A global Element.prototype/HTMLImageElement.prototype source-lock interception experiment caused regressions and was removed permanently. Do not restore it.
- Improved MP Recovery exposed a canonicalization-order problem: an image must not be frozen before its canonical skill ID/source is resolved. The later fix removed the global interception entirely.
- The dedicated live stability check records panel/grid/card/image identity, image src, load events, child-list mutations, and Magic Claw ID 2001003. Passing CI is useful but does not replace human visual review.
- Earlier CI failures included an obsolete “Dashboard skill artwork never fades” marker, canonical Improved MP Recovery mismatch, and a transient CDP “Cannot find default execution context” race. These are recorded as regression lessons, not reasons to revive the removed prototype interception.

### Avatar fix investigation and correction

- The reported screenshot showed the inventory’s selected hat/overall icons disagreeing with the avatar’s visible clothing.
- The initial class-specific workaround made Fighter/Hunter use neutral character IDs plus a separate icon strip. That avoided wrong artwork but did not meet the intended “avatar wears the items” behavior.
- The correct solution was to use a Classic-compatible compositor and pass the exact canonical IDs from the same inventory state for every build.
- The implementation first exposed two CI boundary issues: a malformed generated Python routes tuple and an over-escaped digit regex. They were repaired before the successful build.
- Public guide sanitization removes internal Evidence Class fields, so the runtime acceptance guard correctly uses the public canonical icon URL rather than hidden evidence metadata.
- The final live test proved exact selected inventory/avatar ID parity and natural PNG rendering for I/L, Fighter, and Hunter.

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
