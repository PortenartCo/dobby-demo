# DOBBY V7 shopping baseline — 2026-11-13

Normative pack read in required order: 00_LIRE_D_ABORD.md, 01_PROMPT_CODEX.md, 02_REGISTRE_RECETTE.md. Isolated shared worktree `/workspace/dobby-v7-review`, base main b327aa5. No AGENTS.md applies. No remote backend operation performed or permitted.

| ID | Baseline classification | Code evidence / missing behavior |
|---|---|---|
| C01 | À_CORRIGER | cuisine-e07.js shopMode state, `.e072-modes` commands and `e072-mode` action retain Préparation/Mode magasin. |
| C02 | À_CORRIGER | Existing counter/progress and remaining calculations, but preparation CSS hides `.e07-progress`; home availability is separate from done. |
| C03 | DÉJÀ_VALIDÉ (local/fixture only) | cuisine-list.js native transactions and DobbyFamilyUI grocery facade preserve add/edit/remove/check/archive/import; e07-p02-model and home-core tests cover quantities/receipts/concurrency. Retest after UI extraction. |
| C04 | À_CORRIGER | cuisine-e07.js inserts region `.e072-dialog` after controls; no overlay, inert background, focus trap, Escape or X. |
| C05 | À_CORRIGER | Existing single quantity and all-available action, but quantity always shown; lacks explicit partial choice. Existing model does not count home as purchase. |
| C06 | À_CORRIGER | `.e072-options` with sync/transfer remains in list. Need Menu→Settings mount exposed to root chrome. |
| C07 | BLOQUÉ_BACKEND | Native family-v2.js detects missing at_home_quantity; model rejects unsupported home writes; migration note exists. Need persistent visible error/gate and review of local preflight/install/verify/rollback SQL, no execution. |

Ownership coordination: shopping UI currently lies in meals-owned cuisine-e07.js; approved extraction into cuisine-shopping.js. Meals agent will replace original shop and shopping action branch/listeners by delegates; root integrates script and Settings hook. Shopping owns cuisine-list.js, dedicated UI/CSS/tests and SQL candidates only.

Baseline was persisted BEFORE editing any repository file.

Refinement after complete source inspection: C02 counter/progress were already rendered in the original shop() for either mode; no production CSS actually hid them. Baseline C02 is therefore DÉJÀ_VALIDÉ for rendering, with regression verification required after removing mode UI. The earlier inference of hiding was based on the historical requirement, not live code, and is corrected here.
