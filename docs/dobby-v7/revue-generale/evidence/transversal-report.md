# DOBBY V7 — Transversal delivery

Source checkout: `/workspace/dobby-v7-review`; initial reconciliation persisted before edits in `/workspace/dobby-transversal-baseline.md`. Baseline HEAD `b327aa5`; owned source/tests committed as `f18a656` (`Consolidate DOBBY hold-to-talk, six-link dock and home actions`). No push, merge, deployment, remote Supabase read/write or secrets used by this subtask.

## Per-ID acceptance

| ID | Status | Implementation | Concrete test / evidence | Limit |
|---|---|---|---|---|
| D01 | FAIT_TESTÉ_NON_DÉPLOYÉ | `essai-stitch-v7/chat.js`, `chat.css`: title, large central microphone and exact micro-instruction first | `tests/v7-transversal.cjs` PASS; chat screenshots at 320/390/768/1024/1440/1920 in `/workspace/dobby-transversal-evidence/` | Local browser only |
| D02 | FAIT_TESTÉ_NON_DÉPLOYÉ | Hold-only pointer/mouse/touch fallback + Space/Enter; release/cancel/leave/blur/window blur/hidden/route cleanup abort; delayed browser start aborts again; no click toggle or resume command | `v7-transversal.cjs` PASS: actual mouse down/up and keyboard, pointer cancel/leave, hidden, navigation, refused permission and stale start/result; `e02-consolidation.cjs` PASS390/320/1440; `e02-voice-history.cjs` PASS | SpeechRecognition and permission callbacks simulated; physical microphone/browser permission/Safari not certified |
| D03 | FAIT_TESTÉ_NON_DÉPLOYÉ | Functional pressed gold border/halo independent of decorative effects and reduced motion | `v7-transversal.cjs` PASS: computed halo with Effects OFF, pressed throughout hold, removed on release/cancel | Hardware listening indicator browser-owned |
| D04 | FAIT_TESTÉ_NON_DÉPLOYÉ | Ordinary page composer below voice, private history below text; native chat metadata/history engine retained | `v7-transversal.cjs` order/draft/send PASS; `e02.cjs` PASS320/390/1440 native grocery/mission confirmation/writer/privacy/unsupported mic/keyboard; `e02-consolidation` and `e02-voice-history` retain persisted history and identity isolation tests | Auth identities simulated in historical history tests, not real accounts |
| N01 | FAIT_TESTÉ_NON_DÉPLOYÉ | One shared dock with exact Accueil / Tâches / Repas / Courses / Famille / Menu, direct native routes and active state; secondary Menu routes included | `v7-transversal.cjs` all six routes PASS; `e01.cjs` PASS390/1440 complete navigation/preferences/native writes; `register-navigation.cjs` PASS320/390 | Canonical access and ceremony regressions delegated to parent |
| N02 | FAIT_TESTÉ_NON_DÉPLOYÉ | Fixed six-column dock, min44px targets at320, safe-area padding; hidden attribute honored; composer respects visual viewport keyboard inset | `v7-transversal.cjs` PASS six widths + overlay-keyboard geometry; `e02.cjs` reduced viewport PASS; `e01-1-visual.cjs` PASS390/1440 | No physical iPhone or OS keyboard; existing access/ceremony CSS/exclusion retained |
| H01 | FAIT_TESTÉ_NON_DÉPLOYÉ | Shared cloned header structure + shared CSS for Courses and Events, brown surface, gold icon, identical type/padding/margins | `v7-home-review.cjs` computed-style equality PASS; six-width home captures | Local data |
| H02 | FAIT_TESTÉ_NON_DÉPLOYÉ | Exact Événements du Jour; dynamic stable section selector preserves repeat refresh | `v7-home-review.cjs` title and today/future cases PASS; `e01.cjs` date navigation/events ordering PASS | Existing selected-day consultation preserved |
| H03 | FAIT_TESTÉ_NON_DÉPLOYÉ | Always-present + Ajouter un événement native agenda route; origin home callback and return via native writer (`family-agenda-review.js` hook owned family agent) | `v7-home-review.cjs` creates today and future events through real local native form, checks persisted title/date/time/location, automatic home return, only current-day visible PASS | Remote synchronization not exercised |
| H04 | FAIT_TESTÉ_NON_DÉPLOYÉ | Badge lower right, reserved bottom strip within scene preserves full uncropped Dobby | `v7-home-review.cjs` checks badge bounds, corner and zero overlap with image at all six widths PASS | Visual proofs local |
| H05 | FAIT_TESTÉ_NON_DÉPLOYÉ | Existing shared preferences + common chrome retained; same state/halo from home to family and back | `v7-home-review.cjs` first-use ON, explicit OFF persists across native routes, ON halo, sound independent PASS; E01 motion/preferences regression PASS | No backend dependency |

## Additional integration

- `chat-engine.js` blocks shared writes from a canonical child before grocery/mission native dispatch and rechecks role before confirming deletion. Signed-in unverified bindings cannot mutate. Canonical member category comes from native `familyMembers` for the verified bound member, never profile name/order or a caller-selected profile; parent also needs explicit `permissions.canEdit`.
- `tests/v7-chat-permissions.test.cjs`: six contracts PASS (child grocery refusal; child deletion refusal; stale parent confirmation refusal; unverified identity refusal; legitimate parent native writer retained; profile/permission claims cannot replace native category).
- Home completion for `participantVersion:1` calls `DobbyMissionParticipants.open(id)`; completed rows use native `DobbyFamilyMissions.reopen(id)`. Native participants, unique total reward, reversal and refresh are reused. Home displays assigneeIds / Toute la famille and a thin static gold urgent border. `v7-home-review` proves opening is nonmutating, selected parent gets total25, unselected child0, reopen balance0.
- Historical acceptance tests migrated only where requirements changed: six dock labels/counts/indices, voice-first geometry and hold/release instead of toggle/resume. Existing e02 source bubbles, local history, identity isolation, stale callbacks, business writers, failure paths and privacy assertions retained.
- Pure dock migrations also in E08, register review/navigation, integrated preview, family integration preview, menu-diff acceptance and smoke. E04-runes one-line dock count was coordinated with missions agent and left for that agent to commit with its substantive changes.

## Executed verification

All commands from `essai-stitch-v7` against localhost serving this checkout; nonlocalhost traffic blocked in browser fixtures.

- `node --test tests/v7-chat-permissions.test.cjs`: 6/6 PASS, fresh final run.
- `node tests/v7-home-review.cjs && node tests/v7-transversal.cjs`: both PASS, fresh final run including home participants, two event saves and six widths.
- `node tests/e01.cjs`: PASS390/1440 + E01_MOTION_PASS, no uncaught page errors.
- `node tests/e01-1-visual.cjs`: PASS390/1440.
- `node tests/e02.cjs`: PASS320/390/1440.
- `node tests/e02-consolidation.cjs`: PASS390/320/1440, recognition/synthesis and authenticated identity API outputs explicitly simulated.
- `node tests/e02-voice-history.cjs`: PASS.
- `node tests/register-navigation.cjs`: PASS320/390.
- `node --check` on owned JS and migrated CJS; `git diff --check`: PASS before commit.

No complete npm/aggregate campaign was launched by this subtask: parent owns the final sequential aggregate, to avoid the observed concurrent browser campaign slowdown. `e02-edge.cjs` geometry migrated but not rerun here; its shared-grocery HTTP fixture still needs final aggregate verification. Other pure dock test migrations are syntax-checked and covered by the six-route browser campaign; substantive E07/Famille/Missions flows remain their owners' verification.

## Evidence

`/workspace/dobby-transversal-evidence/chat-{320,390,768,1024,1440,1920}.png`

`/workspace/dobby-transversal-evidence/home-{320,390,768,1024,1440,1920}.png`

Historical test defaults produced their usual screenshots under existing evidence paths; none were staged/committed by this subtask. Parent will preserve historical baselines and select new proofs for revue-generale.

## Required parent follow-through

1. Add `tests/v7-chat-permissions.test.cjs`, `tests/v7-transversal.cjs`, `tests/v7-home-review.cjs` to the root-owned sequential review runner.
2. Preserve the family agent's native home-origin save/cancel hook; no generated HTML/build-source edits were required by this subtask.
3. Final aggregate, canonical entry/ceremony and broad domain regressions, source generation and any permitted publication remain parent-owned. All statuses here explicitly remain nondeployed.
