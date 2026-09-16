# START HERE — New Chat Handoff

If this project is being continued in a fresh ChatGPT conversation, read these files before doing any implementation or research:

1. `PROJECT_STATE.md` — current project state, scope, priorities, invariants.
2. `KNOWN_BUGS.md` — authoritative unresolved work and verification criteria.
3. `DECISIONS.md` — durable choices that should not be casually reversed.
4. `FIX_HISTORY.md` — bugs/fixes/regressions already encountered so work is not repeated.
5. `CHANGELOG.md` — dated project continuity log.

6. QUALITY_STANDARD.md — release gates and evidence rules.
7. IMPLEMENTATION_BACKLOG.md — prioritized implementation order.
8. LIVE_UI_AUDIT_2026-09-15.md — latest live visual and interaction audit.

## Repository
`skanteninja/c9f7a4d8e2b6`

## Live site
`https://maplestory-classic.ofri505.workers.dev`

## Current builds
- Fighter Build
- Hunter Build
- I/L Wizard Build

## Critical instruction
Do **not** assume Fighter/Hunter are complete because they exist in the UI. Their parity, class-correct data, equipment, Skill Tree behavior, avatar visuals and exact-level handling have historically needed substantial work.

Do **not** reintroduce Magician/I/L defaults into other classes.

Do **not** treat an edited source file as proof that a bug is fixed. Verify the generated/live behavior.

## First-pass checklist for a new chat
Before touching code:
- inspect current continuity docs,
- inspect current repository implementation for the affected feature,
- identify whether the bug is shared or build-specific,
- compare against known-good I/L behavior where relevant,
- preserve existing fixed behavior,
- research Classic/beta mechanics before changing recommendations.

After meaningful work:
- update unresolved issues,
- record fixed/regressed issues,
- append changelog,
- update project state/decisions if architecture or product direction changed.

The intended result is that the user should not have to retell the history of this project every time a conversation is restarted.

## Latest audit note

The 2026-09-15 audit used Product Design evidence, cloud Browser QA, TinyFish live extraction, and selective Firecrawl research. Mobbin is connected but its search endpoint is paid-plan gated in the current account, so it is a documented evidence limit rather than a source for this checkpoint.

The current live checkpoint is `0.10.4-session-entry-once`. A saved build asks whether to Continue or Reset once per build entry; completing that decision keeps refreshes quiet, while a new site tab or different build starts the appropriate entry flow. Reset requires a second confirmation with a loss summary. Fresh and reset sessions require Male/Female selection, and the selected gender is persisted per build, reflected in the Classic avatar, and applied to gender-locked equipment filtering. Verify Live `35092685632` passed after Browser QA checked refresh, new-tab, and build-switch behavior.
