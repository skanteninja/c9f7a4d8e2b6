# Durable Project Decisions

Last continuity baseline: 2026-09-15

Use this file for settled choices that future chats should preserve unless new evidence justifies changing them.

## 2026-09-15 — Session safety and gender-aware character identity

- A build with meaningful saved progress must present a Continue-versus-Reset choice on entry. Continuing preserves the existing build; Reset is scoped to the active build only.
- Reset is intentionally two-step. The second dialog must explicitly name what is lost: level/page position, equipment/loadout, skills, completed quests/ETC counts, and selected gender. It must state that other build saves and the guide remain untouched.
- Fresh builds and reset builds require an explicit Male or Female choice before proceeding. Existing saved builds without a gender receive the choice once before equipment can be trusted.
- Gender is persisted inside each build’s own saved state, not as a global preference. It controls both the Classic avatar compositor body and gender-locked equipment filtering.
- When a gender change makes saved gear incompatible, the incompatible slot is cleared and the user is told what happened; contradictory gear/avatar state is not allowed.
- Keep gender labels visible in the picker so a player can understand why an item is included or excluded. Do not silently show the opposite gender’s equipment.

## 2026-09-15 — Quality contract and audit evidence

- QUALITY_STANDARD.md is the release contract; IMPLEMENTATION_BACKLOG.md is the ordered queue. A source edit or local build is not a deployment.
- Product Design screenshots and cloud Browser QA are the primary visual/interaction evidence for the current audit. TinyFish is useful for live shell extraction. Mobbin remains optional comparative evidence because the connected search endpoint is paid-plan gated.
- The earlier live baseline was 0.10.1-dashboard-containment. The current live checkpoint is 0.10.2-session-gender-flow, generated site commit 1dd8ff67b9eef43cb5c1c974bd603181902bac3b, with Verify Live run 34985164756 passed after the follow-up retry.

## 2026-09-15 — Shared dashboard containment

- Keep the containment fix in shared progression-sync CSS so I/L, Fighter, and Hunter receive the same navigation, metric/footer, compact Skill Tree, and picker overflow safeguards.
- Prefer wrapping and min-width constraints over hiding required labels or redesigning the visual language during this release. Revisit broader hierarchy changes only after the narrow-width/accessibility audit.
- The containment patch is verified at the audited desktop viewport in the live 0.10.1 build. Do not treat that as completion of the narrow-width/accessibility pass.

## 2026-09-15 — Research status boundary

- Firecrawl research may update the evidence base, but it does not automatically change recommendations. Hunter references were cross-checked for core skills and first-job progression; Fighter axe-bleed behavior remains unconfirmed and must stay labeled for research.

## Scope / naming
- The site is multi-build and multi-class.
- Current required builds: Fighter Build, Hunter Build, I/L Wizard Build.
- Never use “Luna’s” in build names.
- Product identity is **Maplestory Classic Builder**.
- The site should be designed so additional classes/builds can be added later without reintroducing hard-coded Magician assumptions.

## Continuity / source of truth
- Repository continuity files are the source of truth for MapleStory implementation continuity across chats.
- A new chat should read the continuity files before making project changes.
- Do not rely on conversational memory alone for project-critical state.
- Discord, if used later, is only a readable mirror/activity stream, not the authoritative project memory.
- After meaningful work, update `PROJECT_STATE.md`, `KNOWN_BUGS.md`, `DECISIONS.md` when applicable, `FIX_HISTORY.md`, and append to `CHANGELOG.md`.

## Research policy
- Class-specific recommendations must be independently researched; never clone I/L assumptions into Fighter/Hunter.
- Classic / beta behavior takes priority over modern MapleStory behavior.
- Important item, skill, route, quest, crafting and mechanic claims should be cross-checked across reliable Classic-era sources.
- Main research pool includes OSMS, henesys.gg, MeowDB, MapleAtlas, Nexon Classic/beta changelogs, Hidden Street, and other period-appropriate databases.
- If sources disagree, preserve the uncertainty and investigate; do not silently guess.
- Remove non-Classic items from supported datasets instead of allowing them to leak into recommendations.

## Global level-state policy
- The selected level is a global source of truth.
- Selecting level 10 must mean level 10 everywhere; no off-by-one mapping is acceptable.
- Dashboard, Skill Tree, AP, equipment, routes, avatar, job title and future-item filtering should consume the same resolved level.
- Boundary levels 9/10 and 29/30 are mandatory regression points.

## Automatic job progression
The chosen level automatically determines the active job and all dependent UI/state.

### I/L
- Lv1–9: Beginner
- Lv10–29: Magician
- Lv30+: Wizard (I/L)

### Fighter
- Lv1–9: Beginner
- Lv10–29: Warrior
- Lv30+: Fighter

### Hunter
- Lv1–9: Beginner
- Lv10–29: Archer
- Lv30+: Hunter

The derived job must drive:
- active build/job title
- Skill Tree grouping
- skill allocation source
- job pills/labels
- avatar badge
- dashboard content
- level-specific recommendations

## Skill Tree behavior
- Skill Tree sections are job-stage-specific: Beginner / first job / second job.
- Skill-card identity should persist across level changes.
- Learned skill coloring and 0-SP greying should remain stable.
- Level changes should not cause blinking/reloading/remounting regressions.
- “Do This Now” and Skill Tree should be side-by-side on the dashboard where layout allows.
- Magic Claw canonical skill ID is `2001003`.

## Skill Tree state-update architecture

- Full-page Skill Tree level changes must update existing rows, tier locks and displayed levels in place when the structure is unchanged.
- The I/L full-page plan rows are direct children of `#skill-list`, so its updater must target `.skill-row[data-plan-level]` directly rather than assuming the class-build `.skill-level-plan` wrapper.
- Preserve the no-global-image-prototype-interception decision; image stability comes from renderer ownership and node preservation.

## Dashboard behavior
- Training location belongs in the dedicated Training metric, not duplicated under the job title.
- “Do This Now” content should remain fully readable and must not be truncated.
- Avoid giant empty placeholder cards.
- Build-specific dashboard content must not fall back to another class.

## Equipment policy
- Recommended equipment must be class-correct.
- Avatar visuals must reflect the selected build/class equipment.
- Item name and item visual must refer to the same item.
- Item job and level requirements must be explicit and audited.
- Do not recommend mutually exclusive slot combinations at the same time, especially overall together with top/pants.
- “Show future-level items” is a supported cross-build feature and must not introduce wrong-class gear.
- Only items relevant to the supported Classic build path should appear; exclude non-Classic items.
- Shared systems must never default to Magician equipment for Fighter/Hunter.

## Avatar / inventory identity contract

- Inventory item names, canonical Classic IDs, public icon URLs, and avatar compositor IDs must describe the same item.
- The only accepted public equipment identity is the canonical route /game-media/icons/<Item ID>; a character compositor must not interpret Classic numeric IDs through a newer GMS/DreamMS table.
- The avatar renderer reads the selected build’s state.gear and maps it directly to the Classic-compatible compositor payload. It must not maintain a second independent equipment selection.
- The supported regular equipment mapping is Hat → hat, Eye → eye, Face → face_acc, Earrings → earring, Top → top, Overall → overall, Bottom → bottom, Shoes → shoes, Gloves → gloves, Cape → cape, Shield → shield, Weapon → weapon.
- Overall is mutually exclusive with Top and Bottom in state, inventory presentation, and avatar payload.
- Fighter, Hunter, and I/L use the same worn-equipment renderer; class-specific icon strips are not an acceptable substitute.
- If the compositor is unavailable, show an explicit neutral placeholder while leaving the exact inventory selection intact. Never substitute visually similar or cross-table artwork.
- Upstream avatar requests are bounded by a timeout and successful same-origin PNG responses are cacheable. The source can change only when the selected gear payload changes.
- The no-global-image-prototype-interception decision remains permanent.

## I/L-specific durable direction
- LUK plan should be definitive and tied to actual equipment requirements rather than a generic “safe no-scroll” recommendation.
- User is willing to use 100%/60% scrolls.
- Early 30%/10% scroll risk should be treated cautiously and recommended only when strongly justified.
- Energy Bolt vs Magic Claw guidance should make a clear recommendation, not remain indecisive.
- Magic Claw is preferred where terrain blocking makes Energy Bolt materially less reliable.
- Both pet and mount support are part of the intended builder experience.

## Fighter-specific durable direction
- Do not assume sword + shield is automatically the best route.
- Re-evaluate sword vs axe paths based on actual Classic/beta mechanics.
- Previously mentioned axe-related bleed must be verified before being encoded as fact.
- Fighter AP, equipment, skill order, buffs and visuals must be independently researched.

## Hunter-specific durable direction
- Hunter requires the same depth and quality standard as I/L.
- Hunter AP, skills, equipment, routes, quests, buffs and visuals must be researched independently.
- Never reuse Magician defaults simply because shared components already contain them.

## Maps / assets
- Monster icons should use same-origin routing.
- Prefer OSMS high-resolution maps where available.
- Victoria Island should remain a single world-map click target while preserving relevant beta travel points.
- Sleepywood should remain restored/available.
- Skill icons should sit beside skill names where the UI calls for them.
- Equipment images should fit their slots cleanly.

## Verification philosophy
- A source-code edit is not equivalent to a verified fix.
- A meaningful bug fix should be checked in the live/generated UI.
- Shared-code changes require regression testing on all supported builds, especially I/L because several stability bugs were already solved there.
- Fix root causes where possible rather than duplicating build-specific patches that drift over time.

## Communication preference during project work
- When requested, keep chat replies minimal and spend effort on implementation, research and verification.
- Report completed fixes clearly and briefly, while preserving full detail in continuity files for the next chat.
