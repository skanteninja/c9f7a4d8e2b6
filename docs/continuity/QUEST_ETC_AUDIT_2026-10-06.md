# Quest and ETC reconciliation — 2026-10-06

Release: `0.12.1-quest-etc-level-100`.

## Primary data

- Reviewed https://osmsdataexplorer.com/#quests with a fresh Firecrawl scrape, and pinned the exhaustive primary export from `ohmi69/osms_datamine_dashboard` at commit `d744a66e48fe5c80a33ce464693b869c0a4f556c`.
- Quests blob SHA: `5c62798a42d8777ec4581521b31ecf217aae7558`. 322 IDs, no additions/removals against October 4, 86 changed records with explicit citizenship requirements.
- Current item, crafting, monster, and skill exports are byte-for-byte unchanged against the repository snapshots. Retained those snapshots; refreshed `audit/fighter-quests.json`.
- I/L, Fighter, and Hunter each retain 310 quest IDs: 306 shared plus four own-family advancement records, excluding the other 12 advancement records. ETC planner rows: I/L 159, Fighter 158, Hunter 159; these include non-ETC turn-in items, which have their own filter.

## Material rules and verified examples

- Material demand uses the journal's Gather list, including start-item subtraction. Same-name items remain separate IDs. Standard ETC stacks receive one 15% buffer, rounded up; quest-specific items, equipment, and consumables retain exact counts.
- Cursed Doll #4000033: one-time quest demand 600, initial target 690. Pig's Ribbon #4000010: one-time 50, initial target 58; weekly request 100 per run is separate. Blue Mushroom Cap #4000016: one-time 70, initial target 81, no automatic handwritten Metal Wand reserve.
- Tutorial Jr. Sentinel Shellpiece #4000000: exact 3. Regular #4000067: one-time 30, target 35. Dark Marble: Warrior #4031017, Magician #4031019, Bowman #4031021, exact 30 in its own branch.
- Completion removes a one-time quest's demand. Recurring demand is retained separately. Town filtering excludes the other town's citizenship conditions; grade requirements remain visible and require an in-game check.
- Optional efficient-route weapon recipes: I/L 4, Fighter 3, Hunter 8. Select one craft of each wanted weapon; only selected ingredients contribute to the bank target. Shop/drop-only weapons have no invented recipe. Recipe ingredient names resolve uniquely to canonical IDs.
- Numeric-ID stock/banked progress reads unique legacy aliases; explicit new keys win. Ambiguous duplicate-name legacy values remain saved but are not distributed to multiple IDs.
- Removed the old data override and prevented legacy UI/visual decorators from rewriting new targets, hiding stock inputs, or resolving duplicate names to the wrong art.

## Level and job scope

- User-provided launch brief: maximum level 100, maximum second job. All three build selectors/ranges accept 1–100; class transitions remain 10 and 30.
- Manual Lv70+ third-job dashboard previews: I/L Mage, Crusader, Ranger. Each includes seven current-source skill references. Preview labels are explicit and do not create SP allocations.
- Lv71–100 route/AP/SP allocations are explicitly unresearched. AP and learned-skill totals retain the verified Lv70 checkpoint; selecting a future job is separate from inventing a build.
- Quest #506018 retains missing prerequisite #80117 and stays blocked.

## Verification

- Passed locally: `node build.cjs`, generated JavaScript/browser fixture syntax, `audit/quest-regression.cjs`, `audit/etc-regression.cjs`, `audit/check-multibuild.cjs`, `git diff --check`.
- Added browser tests for citizenship town/grade, exact advancement materials, optional recipe selection and stock subtraction, 390/1024/1365px containment, all three builds at 9/10/29/30/69/70/71/99/100, future-job preview persistence, and unchanged researched skills.
- GitHub browser gates and deployment verification are pending. Direct Cloudflare dashboard sign-in remains unavailable in this browser; deployment uses the existing GitHub integration.
