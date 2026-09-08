# Fighter Build / Hunter Build cross-check

Scope: MapleStory Classic World, current retained Classic/OSMS data, levels 1–70. The public builds use `CURRENT / VERIFY` for values that remain dependent on the live game state.

## Sources checked

| Source | What it was used for | Decision |
| --- | --- | --- |
| [NiaMeowDB Warrior guide](https://meowdb.com/msclassic/guides/warrior-class-guide) | Warrior accuracy, AP checkpoints, first-job SP, early maps and equipment | Used for Fighter levels 1–30. Its current table supersedes the older generic STR-first placeholder. |
| [NiaMeowDB Bowman guide](https://meowdb.com/msclassic/guides/bowman-leveling-guide-1-30) | Bowman AP/SP, Arrow Blow choice, bow breakpoints, arrows, gloves and early maps | Used for Hunter levels 1–30. The exact early-Eye SP order is represented in the build. |
| [MetaRoad Fighter guide](https://metaroad.gg/maplestory-classic/build-guides/fighter-leveling-guide) | One-handed sword + shield route, Mastery/Booster/Final Attack/Rush/Rage order, level 30–70 training maps | Used for Fighter second-job prerequisites and retained-map route selection. |
| [MetaRoad Hunter guide](https://metaroad.gg/maplestory-classic/build-guides/hunter-leveling-guide) | Bow Mastery/Booster/Soul Arrow/Final Attack prerequisites, Arrow Bomb order, level 30–70 training maps | Used for Hunter second-job prerequisites and retained-map route selection. Arrow Bomb remains a live-behavior checkpoint because the guide warns it may vary by beta build. |
| [MapleStory Quest Fighter planner](https://maplestory.quest/planner?class=Fighter) | Current skill names, max levels and prerequisites | Used to validate the Fighter skill set against the local audit. |
| [MapleStory Quest Hunter planner](https://maplestory.quest/planner?class=Hunter) | Current skill names, max levels and prerequisites | Used to validate the Hunter skill set against the local audit. |
| [MapleAtlas](https://mapleatlas.com/) and the exact user-supplied build pages listed below | Community build-planner comparison at Lv. 70: stat variants, weapon choices, and saved skill sequences | All supplied URLs were opened and read. The pages are community builds rather than a single canonical allocation; complete and partial plans are separated below. |
| [Henesys.gg Hero](https://henesys.gg/guides/classes/hero) and [Ranger](https://henesys.gg/guides/classes/ranger) guides, plus [training](https://henesys.gg/guides/training), [quests](https://henesys.gg/quests) and [update notes](https://henesys.gg/updatenotes) | Independent class, route and quest cross-check | The direct class pages were read. Their pages mix Classic World with post-level-70/GMS material and contain AP/SP conflicts with the current Classic-specific data, so only non-conflicting context was accepted. |
| Attached `rangerbowmasterguide.md` | Private guide supplied by the user | Used as a secondary reference. Bowman → Hunter through level 70 is actionable; Ranger/Bowmaster content is roadmap material and is not presented as live. Its minimum-STR simplification is kept only as post-level-30 guidance where the current bow breakpoint is known. |
| Retained local Classic data (`audit/*.json`, `public/map-audit.json`) | Skills, items, quests, monsters and map availability | Final authority for what the website can actually render. Every route below is generated from a retained map ID. |

## Resolved conflicts

- **Fighter first job:** the current Warrior guide reaches Power Strike 20, Slash Blast 20, Precise Strikes 15, Improved HP Recovery 3 and Max HP Increase 3 by level 30. The build now follows that exact table rather than maxing Precise Strikes too early.
- **Fighter second job:** the first checkpoint omitted Rush. The build now starts Sword Mastery 5, Sword Booster 1, Final Attack: Sword 1 and Rush 1, then finishes the sword route through level 70.
- **Hunter first job:** the build follows the current Arrow Blow / early Eye / Critical Shot / Focus order and the level-30 target Arrow Blow 20, Critical Shot 15, Eye 15, Focus 10 and Power Knockback 1.
- **Hunter AP:** the current Bowman table is used through level 30: 5 STR / 57 DEX at level 10, then 15/72, 20/92, 25/112 and 30/132 at the listed checkpoints. The private guide's minimum-STR rule is retained only after the exact live bow requirement is known.
- **Route availability:** legacy-only names such as Ludibrium and Leafre were removed from these build routes because they are not in the retained public atlas. All route map IDs resolve to `status: kept` entries in `public/map-audit.json`.

## Direct MapleAtlas results

The following exact pages were opened at their saved Level 70 state and their visible class tabs were read.

### Hunter pages

| Page | Visible result | Decision |
| --- | --- | --- |
| [Bowman by DrDark](https://mapleatlas.com/build/0d0e8490-3622-456c-ab1a-c81df31d295f) | Standard gear profile: base STR 73 plus 17 gear, DEX 289. Hunter skills shown at Bow Mastery 20, Bow Booster 20, Arrow Bomb: Bow 30, Soul Arrow: Bow 20, Final Attack: Bow 30. | Confirms the five-skill Hunter core and a standard STR-for-bow route. |
| [Bowman - Hunter by Ziggy Soul](https://mapleatlas.com/build/7c31a8c6-7213-4213-b395-af40bc1b54f1) | Base STR 71 plus 17 gear, DEX 296. The saved sequence ends with Final Attack: Bow 11/30 and is not a complete 120-SP plan. | Used as a partial community variant, not as the final allocation. |
| [Hunter Punt by Anonymous](https://mapleatlas.com/build/d79592a3-3a71-428b-99a7-b129fca0eac6) | Low-base-STR profile: base STR 50 plus 17 gear, DEX 312 plus 30 gear. Hunter skills shown at Bow Mastery 20, Arrow Bomb: Bow 30, Bow Booster 20, Final Attack: Bow 30, Soul Arrow: Bow 20. | Confirms the funded/minimum-STR variant and that the five core Hunter skills can consume the full second-job SP. |
| [Blazing Bowman by Ziggy Soul](https://mapleatlas.com/build/77721aa2-3065-4039-825f-10a44746effc) | Same Bowman/Hunter profile and saved partial sequence as the Ziggy Soul page above, ending with Final Attack: Bow 11/30. | Treated as a duplicate/partial Hunter reference, not an independent Fighter source. |

The supplied Hunter pages consistently show the same five allocated second-job skills. None visibly allocates Amazon's Judgement, so the current Hunter plan leaves that optional skill at 0 while completing the five-skill core. The exact first-job progression continues to follow the current Classic-specific Bowman table because the MapleAtlas pages do not expose a consistent first-job allocation.

### Fighter pages

| Page | Visible result | Decision |
| --- | --- | --- |
| [Bleed Axe Fighter](https://mapleatlas.com/build/53e1c581-50c3-4fd8-b365-bdf7a53524ba) | Axe route: Axe Mastery 20, Axe Booster 20, Rage 30, Final Attack: Axe 30. Base STR 328 plus 7 gear, base DEX 39 plus 9 gear. | Confirms axe as a real alternative, but the public Fighter build remains the safer sword route. |
| [Netcha](https://mapleatlas.com/build/3943e84a-af28-468e-986d-26e712cf7123) | Sword route with Sword Booster 20, Final Attack: Sword 30, Rage 30 and a saved Mastery sequence that stops at 14/20. | Useful sword/gear reference, but incomplete as a canonical full plan. |
| [fighter](https://mapleatlas.com/build/62cc7885-0d2a-43ee-85ec-42a8d3850100) | Sword core at Sword Mastery 20, Sword Booster 20, Final Attack: Sword 30 and Rage 30, plus Axe Mastery 1. | Confirms the sword core and identifies the extra Axe Mastery point as a hybrid choice, not part of the recommended route. |
| [Darius from LOL](https://mapleatlas.com/build/6668b5d2-2c06-4ad3-87e5-58ff509a637e) | Axe core at Axe Mastery 20, Axe Booster 20, Final Attack: Axe 30 and Rage 30, plus Sword Mastery 1. | Confirms the axe alternative and the cost of mixing weapon trees. |
| [Axe Hero!](https://mapleatlas.com/build/2ca36922-dd74-4514-bfc7-ef847523b003) | Axe progression through Axe Mastery 20, Final Attack: Axe 30, Axe Booster 20 and Rage 30, plus Sword Mastery 1. | Confirms the axe route but does not replace the selected sword recommendation. |
| [Blazing Bowman](https://mapleatlas.com/build/77721aa2-3065-4039-825f-10a44746effc) | This is a Bowman/Hunter page and has no Fighter tab. | Corrected as a duplicate Hunter link; it is not used as Fighter evidence. |

All six supplied Fighter links visibly omit Rush. That conflicts with the current [MapleStory Quest Fighter planner](https://maplestory.quest/planner?class=Fighter), the current local Warrior skill audit, and the [Henesys Hero page](https://henesys.gg/guides/classes/hero), which all identify Rush as a Fighter skill. The recommended Fighter plan therefore retains Rush and marks the MapleAtlas omission as a community-build discrepancy rather than silently removing a current Classic skill.

## Henesys direct-page conflicts

The direct [Hero page](https://henesys.gg/guides/classes/hero) gives a first-job order that delays Precise Strikes and pushes Max HP Increase much higher, and it describes a 35 STR advancement target. The direct [Ranger page](https://henesys.gg/guides/classes/ranger) uses Double Shot first, describes a 25 DEX advancement target, and recommends a Final-Attack-less Hunter route because of future Strafe/Hurricane interaction. Those are materially different from the current Classic-specific Warrior/Bowman tables and the level-70 Classic scope. They are retained as documented comparison points, but their conflicting values and post-level-70 content are not copied into the public Fighter Build or Hunter Build.

## Local validation targets

- Both variants contain 70 level rows and 61 skill rows.
- Fighter second-job SP totals 120 and finishes Sword Mastery 20, Sword Booster 20, Final Attack: Sword 30, Rush 20 and Rage 30.
- Hunter second-job SP totals 120 and finishes Bow Mastery 20, Bow Booster 20, Soul Arrow: Bow 20, Final Attack: Bow 30 and Arrow Bomb: Bow 30.
- Both first-job plans finish at their source-checked level-30 targets.
- Every route map ID resolves to a retained map record before the build is generated.
