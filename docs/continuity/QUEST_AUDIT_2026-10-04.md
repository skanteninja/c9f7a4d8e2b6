# Quest reconciliation — 2026-10-04

Release: `0.11.0-quest-journal`.

## Source and coverage

- Authoritative reference: https://osmsdataexplorer.com/#quests
- Structured export: https://osmsdataexplorer.com/data/current/quests.json (fetched 2026-10-04).
- 322 source IDs; all IDs already existed in the September snapshot, but 212 records changed (primarily explicit prerequisite requirements).
- Each of Fighter, Hunter, and I/L now receives 310 unique quest IDs: all shared quests and its own four advancement records. The other three branches (12 records) are excluded.
- Live pre-change I/L audit found 428 entries, produced by mixing legacy curated rows with runtime additions. Those additions no longer append to the canonical catalog.

## Corrected behavior

- Structured objectives, prerequisite quest IDs, effective minimum level inherited from prerequisites, NPC, chain links, EXP, mesos, contribution, guaranteed items, class-filtered choose-one and weighted rewards.
- One-time, daily, weekly, repeatable, and introductory rotation-pool quests retain distinct metadata. The journal does not automatically reset completion or assume rotation membership.
- Items given on start remain turn-in objectives but are subtracted from the gather checklist. Sera's Mirror is a verified example.
- Dashboard queue and ready count now share the journal's prerequisite logic. Town, event, crafting-skill, and rotation conditions require in-game confirmation.
- Completion uses numeric quest IDs and reads prior name/region/level keys. An explicit new false value overrides a legacy true mark; inactive/stale legacy marks remain saved without inflating the current count.
- Expandable details use native keyboard-accessible disclosure controls; filters have accessible labels, status/type/sort choices, a clear action, and an empty state. Open details survive completion/filter re-renders.

## Source gap

Quest #506018 references #80117, which is absent from the OSMS export. Preserve that dependency, show the missing-reference note, and keep this quest blocked until its state is known. Do not fabricate an objective or silently drop the prerequisite.

## Verification

- Local: build, generated JavaScript syntax, multi-build contracts, and quest-regression.cjs pass.
- Added browser release gate: exact ID search, details disclosure, given-on-start items, prerequisite completion/undo, chain navigation, Mage-only reward choices, repeatability, source-gap blocking, objectives/rewards, empty state, and 1365/1024/390px containment.
- GitHub release gates and post-deployment visual QA: pending source publication.

## Scope boundary

Quest data and the journal are reconciled against this snapshot. The separate cumulative ETC planner's legacy lifetime totals and its repeatable-quest reserve policy still need an independent audit; the journal's per-quest Gather list is the current reliable quantity view.
