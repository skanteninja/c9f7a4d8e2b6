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
| [MapleAtlas](https://mapleatlas.com/) | Community build-planner comparison and the previously recorded community build reference | The dynamic build page could not be read reliably in this environment, so no MapleAtlas-only allocation was accepted as fact. |
| [Henesys.gg guides](https://henesys.gg/guides), [training](https://henesys.gg/guides/training), [quests](https://henesys.gg/quests) and [update notes](https://henesys.gg/updatenotes) | Independent guide, route and quest cross-check | The index/search results were checked; detailed endpoints returned access errors here, so no unsupported Henesys-only stat or SP claim was promoted into the build. |
| Attached `rangerbowmasterguide.md` | Private guide supplied by the user | Used as a secondary reference. Bowman → Hunter through level 70 is actionable; Ranger/Bowmaster content is roadmap material and is not presented as live. Its minimum-STR simplification is kept only as post-level-30 guidance where the current bow breakpoint is known. |
| Retained local Classic data (`audit/*.json`, `public/map-audit.json`) | Skills, items, quests, monsters and map availability | Final authority for what the website can actually render. Every route below is generated from a retained map ID. |

## Resolved conflicts

- **Fighter first job:** the current Warrior guide reaches Power Strike 20, Slash Blast 20, Precise Strikes 15, Improved HP Recovery 3 and Max HP Increase 3 by level 30. The build now follows that exact table rather than maxing Precise Strikes too early.
- **Fighter second job:** the first checkpoint omitted Rush. The build now starts Sword Mastery 5, Sword Booster 1, Final Attack: Sword 1 and Rush 1, then finishes the sword route through level 70.
- **Hunter first job:** the build follows the current Arrow Blow / early Eye / Critical Shot / Focus order and the level-30 target Arrow Blow 20, Critical Shot 15, Eye 15, Focus 10 and Power Knockback 1.
- **Hunter AP:** the current Bowman table is used through level 30: 5 STR / 57 DEX at level 10, then 15/72, 20/92, 25/112 and 30/132 at the listed checkpoints. The private guide's minimum-STR rule is retained only after the exact live bow requirement is known.
- **Route availability:** legacy-only names such as Ludibrium and Leafre were removed from these build routes because they are not in the retained public atlas. All route map IDs resolve to `status: kept` entries in `public/map-audit.json`.

## Local validation targets

- Both variants contain 70 level rows and 61 skill rows.
- Fighter second-job SP totals 120 and finishes Sword Mastery 20, Sword Booster 20, Final Attack: Sword 30, Rush 20 and Rage 30.
- Hunter second-job SP totals 120 and finishes Bow Mastery 20, Bow Booster 20, Soul Arrow: Bow 20, Final Attack: Bow 30 and Arrow Bomb: Bow 30.
- Both first-job plans finish at their source-checked level-30 targets.
- Every route map ID resolves to a retained map record before the build is generated.
