# Continuity Changelog

This log exists to make cross-chat handoff quick and reliable. Record meaningful changes, fixes, regressions, research conclusions, and continuity-system updates.

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
