# Historical Fix / Regression Log

Last continuity baseline: 2026-09-14

Purpose: preserve bugs that were already solved, partially solved, or observed as regressions so future chats do not repeat the same debugging from scratch.

This is historical context, not the unresolved queue. Active unresolved work belongs in `KNOWN_BUGS.md`.

## Skill Tree stability
### I/L level-change blinking / reload
Historical symptom:
- changing selected level caused Skill Tree cards/content to blink, reload or recreate themselves.

Known resolved behavior:
- card identity is preserved across level changes,
- learned-state coloring remains stable,
- 0-SP cards remain greyed correctly,
- level changes should update state without unnecessary remounting.

Regression warning:
- shared Skill Tree refactors for Fighter/Hunter must not reintroduce this on I/L.

## Magic Claw canonical ID
Historical data cleanup:
- Magic Claw was standardized to canonical skill ID `2001003`.

Regression warning:
- do not introduce duplicate/alternate Magic Claw IDs in build-specific datasets.

## Exact level selection
Historical symptom:
- selecting level 10 could resolve or display level 9.

Known state:
- this behavior was addressed on I/L.

Still required:
- prove Fighter and Hunter use the exact same corrected level semantics.

Likely root-cause class:
- array index / character-level conversion or inconsistent derived state.

Regression tests:
- 9 → 10
- 10 → 9
- 29 → 30
- repeated switching
- switching build after setting a boundary level

## Dashboard Skill Tree layout
Historical symptom:
- Skill Tree could render vertically when the intended dashboard presentation was compact/horizontal.

Known state:
- issue had previously been corrected, then appeared again on Fighter.

Lesson:
- do not solve layout independently per class if the component is meant to be shared.

## Giant empty Skill Tree card
Historical symptom:
- dashboard contained a large empty Skill Tree card consuming space.

Known fix:
- giant empty card was removed.

Regression guard:
- do not re-add placeholder containers that reserve large unused dashboard space.

## “Do This Now” truncation
Historical symptom:
- instruction text was clipped/truncated.

Known fix:
- truncation was corrected.

Regression guard:
- verify long content after responsive/layout changes.

## Duplicate training location
Historical symptom:
- training location appeared directly under the job title and again inside the Training metric.

Example historical copy:
- `Hunting Ground / Field West of Amherst`

Known fix:
- duplicate beneath job title was removed.
- Training metric remains the single intended location for this information.

Regression guard:
- new build templates should not reinsert training text beneath the title.

## Automatic job progression
Historical work:
- project moved toward deriving job from selected level rather than treating job labels as static/manual state.

I/L intended behavior:
- 1–9 Beginner
- 10–29 Magician
- 30+ Wizard (I/L)

Required parity:
- Fighter: Beginner → Warrior → Fighter
- Hunter: Beginner → Archer → Hunter

Known synchronization targets:
- job title
- Skill Tree
- avatar badge
- job pills
- skill allocation
- build/dashboard presentation

Regression warning:
- if one component uses a separate hard-coded job field, UI can disagree at levels 10/30.

## Cross-class equipment leakage
Historical symptom:
- Fighter/Hunter recommended Magician items.
- Fighter/Hunter avatar visuals could still display Magician gear.
- Blue Kendo Robe was specifically reported as appearing in an incorrect class context.

Status:
- treat as unresolved until full item/database/UI audit proves otherwise.

Lesson:
- shared equipment systems must filter from explicit job/build metadata, never an implicit Magician default.

## Incompatible equipment recommendation
Historical symptom:
- recommendations could simultaneously show an overall and top + pants.

Status:
- requires cross-build verification.

Required invariant:
- overall is mutually exclusive with top/pants in an active loadout.

## “Show future-level items”
Historical symptom:
- feature was not appearing or working consistently on Fighter/Hunter.

Status:
- verify on every build.

Regression warning:
- future-item logic must preserve class filters and should not reveal unrelated-class gear.

## Monster icon routing
Historical issue/fix:
- monster icons were changed to use same-origin routing.

Regression guard:
- do not revert to fragile external hotlinks when same-origin assets/routes are available.

## World/map handling
Historical fixes:
- OSMS high-resolution maps used where available.
- Victoria Island changed to a single world-map click target.
- relevant beta Victoria Island travel points were restored/preserved.
- Sleepywood map was restored.

Regression guard:
- map refactors must preserve both navigation simplicity and beta travel data.

## I/L builder design history
Original builder direction included:
- level 1–70 scope,
- definitive LUK plan tied to equipment,
- clear Magic Claw vs Energy Bolt recommendation,
- 100%/60% scroll willingness,
- caution around early 30%/10% scrolls,
- pet and mount support,
- old-Maple-style equipment inventory,
- skill icons,
- future-level planning,
- Classic-only equipment filtering.

These decisions should not be lost merely because the project later became multi-build.

## Transition from I/L-only to multi-build
Historical mistake/risk:
- Fighter/Hunter were added with insufficient parity and inherited too many assumptions from the mature I/L build.

Permanent lesson:
- shared UI can be reused; class data and recommendations cannot be copied blindly.
- every new class must receive its own research pass.

## How to use this file
Before fixing a bug that resembles an old issue:
1. search this history for the symptom,
2. inspect the existing implementation that solved it elsewhere,
3. reuse the proven architectural fix rather than recreating a one-off patch,
4. regression-test the build where the issue was already solved,
5. record any new regression or durable fix here.
