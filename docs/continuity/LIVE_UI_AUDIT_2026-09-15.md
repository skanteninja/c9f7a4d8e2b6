# Live UI Audit — 2026-09-15

URL: `https://maplestory-classic.ofri505.workers.dev`
Initial observed checkpoint: `0.10.0-classic-avatar-parity`
Post-publish checkpoint: `0.10.1-dashboard-containment`
Viewport: approximately 1363×936 browser content area

## Scope and evidence

The audit covered the Build Library, I/L dashboard, Fighter dashboard at levels 1/15/30, Hunter dashboard at levels 1/15/30, the Fighter equipment picker with future-level filtering, Hunter Equipment, and Hunter’s full Skill Tree. Saved captures were inspected after capture; the working copies are named `maple-audit-01` through `maple-audit-14` in the session scratch area.

Browser QA also checked the live DOM state, exact level 30 Hunter boundary, same-origin asset behavior already covered by the project gates, and console warnings/errors. The only console errors observed were from the browser environment’s extension metadata script, not the application URL.

The repository’s formal real-input script was attempted separately but could not start because the workspace Python environment lacks websocket-client and no local Chrome executable is installed. Trusted-input equivalents were exercised in the cloud Browser session; this does not replace the CI gate.

Mobbin is connected but the account returned a paid-plan requirement, so no Mobbin screen was used as product evidence. TinyFish successfully extracted the deployed page shell and confirmed the public navigation/build labels.

## Strengths observed

- The three required build names are present and class-specific: Fighter Build, Hunter Build, and I/L Wizard Build.
- Build Library clearly distinguishes the active/researched builds from planned future builds.
- Fighter and Hunter show their own class pills, skill plans, equipment, avatar composites, route copy, and weapon identity at the tested levels.
- The Fighter picker’s future-level control works: Level 30 changes from 25 hidden future items to 25 shown future items, while the class-matched option count stays explicit.
- The full Skill Tree is substantially more readable than the compact dashboard card: Beginner and first-job sections are visible with skill names, allocations, descriptions, and a clear current checkpoint.
- The level 30 Hunter boundary displayed Hunter · 2nd Job · Bow and the exact selected level; the corresponding Fighter boundary displayed Fighter · 2nd Job · Axe in earlier captures.

## Findings

### P1 — Dashboard hero rhythm is too tight

At the Hunter Level 15 state, the computed Training/Next SP metric row ended at approximately `y=471` while the level footer began at `y=456`. The visible screenshot shows the two regions touching/competing for space. The hero’s compact tree is also close enough to the metrics that small copy changes could reintroduce a collision.

### P1 — Desktop navigation is horizontally scrollable

At the audited width, `#nav` had `scrollWidth=1234` and `clientWidth=1038`. The screenshot shows a horizontal scrollbar and the later navigation labels partially offscreen. Required product areas should not depend on horizontal scrolling at a desktop width.

### P2 — Equipment picker content overflows horizontally

The Fighter picker measured `.modal-card` `scrollWidth=797` versus `clientWidth=763`; the first `.gear-option` measured `scrollWidth=410` versus `clientWidth=357`. The saved screenshot shows clipped stats/requirements and a horizontal scrollbar inside the modal. This is the first small fix to implement.

### P2 — Compact dashboard Skill Tree labels are too small

The six Hunter/Fighter compact cards were approximately 59–60px wide at Level 15, with highly compressed tab labels and 7–8px card text. The full Skill Tree is readable, but the dashboard summary should still support quick decisions.

### P2 — Route imagery is inconsistent across level states

The Level 1 dashboard showed a route thumbnail; several Level 15/30 “Do This Now” states showed the route row without a thumbnail. Confirm whether the missing visual is intentional fallback or incomplete map coverage.

### P2 — Build Library uses space unevenly

The Build Library’s active-card area leaves a large unused right region and does not use the same density effectively across class groups. This is a later scanability pass, not a reason to change build data now.

### Evidence limit — responsive/accessibility coverage is incomplete

This pass used a desktop cloud-browser viewport. The page declares a responsive viewport and has narrow-width CSS, but narrow-width screenshots, text enlargement, keyboard-only traversal, and assistive-technology review remain open work.

## Research notes

Firecrawl search and structured extracts were limited to the open research questions:

- [NiaMeowDB — Axe Mastery](https://meowdb.com/msclassic/skills/fighter/axe-mastery) reports axe-only activation and a level table for bleed chance/damage. It is useful evidence for the current Classic ruleset, but the target project’s beta provenance still needs an independent confirmation before changing public claims.
- [NiaMeowDB — Hunter class](https://meowdb.com/msclassic/classes/hunter) confirms the Hunter second-job boundary at level 30, Arrow Bomb as the signature skill, and the core bow skill set; it also gives practical caveats such as close-range bow whacking.
- [Metaroad — Hunter leveling guide](https://metaroad.gg/maplestory-classic/build-guides/hunter-leveling-guide) independently supplies a skill order, STR/DEX guidance, level bands, and training recommendations. It is a guide recommendation, not a substitute for the project’s own Classic data audit.

No unresolved Fighter/Hunter mechanic was promoted to “confirmed” in this pass.

## Post-publish containment verification

The generated site was published as commit `2a6b451` and the live build-info endpoint reported `0.10.1-dashboard-containment`. A follow-up live Browser capture at approximately 1363×936 showed the required navigation wrapping into visible rows, no page-level horizontal overflow, separated dashboard metric/footer regions, and contained equipment-picker metadata. Computed page `scrollWidth` matched `clientWidth` in the live Hunter Level 30 check.

GitHub Actions Verify Live run `34976424625`, attempt 3, passed after two transient CDP execution-context races. Its final job passed the live dashboard, Fighter/Hunter route, avatar/inventory parity, and same-tier Skill Tree stability steps. The human-visible Skill Tree blink remains an observation item; narrow-width, text-size, keyboard-only, and assistive-technology checks remain open.

## 0.10.2 session and gender follow-up

The same live URL was re-entered with a saved Fighter session after the session/gender implementation. Cloud Browser QA captured and inspected these visible states:

- `maplestory-session-resume-1789483600199.jpg`: “Continue this build?” with Continue and Reset actions, plus a note explaining that the saved Fighter build still needs a character choice.
- `maplestory-session-gender-1789483646903.jpg`: “Choose your character” with distinct Male and Female choice cards, explanatory copy, and visible keyboard focus.
- `maplestory-session-reset-1789483898659.jpg`: “Are you sure?” reset confirmation with a concrete loss list: level/page position, equipment/loadout, skills/level checks, completed quests/ETC counts, and selected gender. The dialog also states that other build saves and the guide stay untouched.

Interaction results:

- Continue preserved the existing build and then required the missing gender choice.
- Female selection produced a visible `FEMALE` avatar badge and the female Classic avatar query (`hair=31000&face=21000`). The Fighter Top picker labeled itself `FEMALE EQUIPMENT` and showed compatible female-only options.
- Re-entering the same build displayed the saved gender in the entry prompt. Reset cleared the active Fighter loadout and returned directly to gender selection.
- Male selection produced a visible `MALE` avatar badge and the Classic avatar query (`hair=30000&face=20000`). At Level 30, the Fighter Top picker labeled itself `MALE EQUIPMENT` and showed male-only options such as Brown Lolico Armor and Red Hwarang Shirt; no female-only options appeared in the inspected list.

The follow-up generated checkpoint reports `0.10.2-session-gender-flow`. Build Static `34983348769`, Maps/ETC `34983519233`, Real Input `34983348845`, and Verify Live `34985164756` passed. The previous live stability failure was reproduced as a CDP execution-context race and was not repeated in the successful follow-up run.
