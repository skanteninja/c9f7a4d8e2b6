# Live UI Audit — 2026-09-15

URL: `https://maplestory-classic.ofri505.workers.dev`
Observed checkpoint: `0.10.0-classic-avatar-parity`
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
