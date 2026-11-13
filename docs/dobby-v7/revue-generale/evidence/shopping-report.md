# DOBBY V7 — Shopping C01–C07 report

Worktree `/workspace/dobby-v7-review`; branch `feat/dobby-v7-revue-generale-20261113`; base main `b327aa5`. Shopping commit **09cca2f** (`fix(shopping): consolidate list and home availability modal`). Baseline persisted before repository edits at `/workspace/dobby-shopping-baseline.md`. Normative pack read in required order. No remote Supabase access/change, push, merge or deployment by this agent.

| ID | Baseline | Final status | Implementation / concrete test and evidence | Manual need |
|---|---|---|---|---|
| C01 | À_CORRIGER: two switch commands and mode state | FAIT_TESTÉ_NON_DÉPLOYÉ | Dedicated `cuisine-shopping.js` replaces shop UI via meals-owned E07 delegate; no mode control/state remains; old mode CSS removed. `review-shopping.cjs` asserts zero `e072-mode` at 320/390/768/1024/1440/1920. | Root final integration/publication. |
| C02 | DÉJÀ_VALIDÉ after complete code inspection: counter/progress already rendered in either old mode (initial inference of hiding corrected in baseline appendix) | FAIT_TESTÉ_NON_DÉPLOYÉ | Existing purchased/remaining calculation preserved; accessible progressbar values and live purchased text added. All6 browser test checks visibility, check/reload updates and no purchase count increase from partial/all home declarations. | No DB dependency for local behavior; shared real recipe remains separate. |
| C03 | DÉJÀ_VALIDÉ local/fixture writers; retest required | FAIT_TESTÉ_NON_DÉPLOYÉ | Native add/edit/delete/check/archive/import/sync writers retained. Model+home+prep tests31/31; native browser390/320/1440, native family HTTP fixture, two-client shared availability/CAS fixture and native IDB race pass. Local rows, old archive, pending offline rows and import receipts survive. | Real two-account Supabase recipe not performed. |
| C04 | À_CORRIGER: inline region after controls | FAIT_TESTÉ_NON_DÉPLOYÉ | Fixed overlay/backdrop, aria-modal dialog, inert background, trapped Tab, Escape, distinct X close, body scroll lock, exact scroll/focus restoration. All6 browser test includes Tab loop, Escape, X and stable scroll. Playwright touch used320/390. Images `/workspace/dobby-shopping-evidence/home-modal-{320,390,768,1024,1440,1920}.png`. | No real iPhone/software-keyboard proof. |
| C05 | À_CORRIGER: quantity immediately visible, no explicit partial choice | FAIT_TESTÉ_NON_DÉPLOYÉ | Choices `Tout est disponible` and `J’en ai une partie`; quantity only revealed for partial; single confirmation; correction and availability cancel retained. 500g→150g home→350g to buy; all available remains unchecked and cannot be falsely purchased. Unit conversions and concurrent sources covered by native fixtures. | Shared availability gated by actual native schema probe. |
| C06 | À_CORRIGER: technical options inline | FAIT_TESTÉ_NON_DÉPLOYÉ | No Options or technical sync/copy command in list. `DobbyShoppingUI.mountSettings(container,{E})` used by root `tools-register` Settings. Actual Menu→Paramètres route test passes. Native fixture exercises sync plus cancel/copy/repeated transfer idempotence. Settings-scope RED→GREEN test refuses confirmed copy after household switch and preserves local rows. Persistent native errors remain displayed after retry. | None for local UI; real sync/copy requires configured backend. |
| C07 | BLOQUÉ_BACKEND | ATTENTE_UTILISATEUR | Native column capability probe preserved. Unsupported schema displays persistent gate/alert, disables availability writes and keeps ordinary CRUD usable; source and native fixture tests cover42703 missing schema plus no false fallback success. Manual-only scripts and README under `docs/dobby-v7/revue-generale/supabase/shopping/`. | Human preflight/install/verify and actual two-account/authorization recipe required. No SQL executed, including locally. |

Additional integration: dessert keys `YYYY-MM-DD-midi/soir-dessert` accepted by existing import preview; explicit Dessert origin retained. `e07-p02-model.test.cjs` test `dessert reste une origine indépendante dans la liste familiale unique et son reçu est idempotent` checks200+300+100g→one600g group/3 origins/reimport0. This supplies meals T11 proof. No replacement writer, storage key or network client added.

F09 UX dependency: uses family agent's `DobbyFamilyStitch.sharedReadOnly()` to disable shopping mutations and Settings transfer only for explicit canonical child identity; action-level guard also refuses mutation. Native synthetic child fixture verifies real helper using registry+demoMemberId, and removing the identity preserves unknown/offline usability. This is a frontend restriction, not real backend permission certification.

## Verification actually executed

- RED: `node essai-stitch-v7/tests/review-shopping.cjs` failed correctly with old mode controls2≠0.
- RED: dessert model test failed500≠600 before suffix import implementation.
- RED: Settings stale-household test observed one unwanted copy before guard; GREEN observes0 and intact local item.
- RED: explicit child UI test observed add enabled before guard; GREEN observes disabled mutations and rejected direct action.
- `node --test essai-stitch-v7/tests/e07-p02-model.test.cjs essai-stitch-v7/tests/e07-p02-home-core.test.mjs essai-stitch-v7/tests/prep-courses.test.cjs` → **31/31 PASS** (latest). Earlier same command plus `family-core.test.mjs` →36/36 PASS.
- `node essai-stitch-v7/tests/review-shopping.cjs` → **PASS320,390,768,1024,1440,1920**, latest run complete. List+modal captures in `/workspace/dobby-shopping-evidence/`.
- `node essai-stitch-v7/tests/review-shopping-settings.cjs` → **SHOPPING_SETTINGS_SCOPE_PASS**, **SHOPPING_MENU_SETTINGS_ROUTE_PASS**.
- `node essai-stitch-v7/tests/review-shopping-role.cjs` → **SHOPPING_EXPLICIT_CHILD_READONLY_PASS** (canonical synthetic native identity).
- `DOBBY_E07_EVIDENCE=/workspace/dobby-shopping-evidence/regression node essai-stitch-v7/tests/e07-p02-browser.cjs` → **PASS390,320,1440**.
- `DOBBY_E07_EVIDENCE=/workspace/dobby-shopping-evidence/regression node essai-stitch-v7/tests/e07-p02-family.cjs` → **CUISINE_FAMILY_PASS390**.
- `DOBBY_E07_SHARED_HOME_EVIDENCE=/workspace/dobby-shopping-evidence/shared-final node essai-stitch-v7/tests/e07-p02-shared-home.cjs` → **CUISINE_SHARED_HOME_PASS**, including explicit missing-schema UI gate. Evidence JSON `/workspace/dobby-shopping-evidence/shared-final/shared-home-results.json`.
- `DOBBY_E07_SHARED_HOME_EVIDENCE=/workspace/dobby-shopping-evidence/race node essai-stitch-v7/tests/e07-p02-home-race.cjs` → **CUISINE_SHARED_HOME_RACE_PASS**.
- `node --check essai-stitch-v7/cuisine-shopping.js` and staged `git diff --check` passed before commit.
- `npm test` was started as project-level check: menu-build PASS and Menu320 PASS, then **interrupted for coordination** at root request to avoid running duplicate whole campaigns. No assertion failure before interruption. Root owns aggregate completion.

One intermediate six-width/native-browser run saw transient `Unexpected token ')'` while agents were changing shared sources. Syntax checks were clean by investigation; no guessed production fix was made. Subsequent complete six-width and native-browser runs passed without page errors. This observation is recorded rather than hidden.

`npm run test:review-shopping` was added as an easy local targeted command. It requires the local HTTP server (currently serving shared worktree at127.0.0.1:8765). Preview builder walks all JS/CSS sources, so the new files are copied automatically. Generated HTML/build-source/Menu integration belongs to root; E07 delegates belong to meals. Historical evidence/default generated outputs were deliberately not staged by this agent. Root selects final captures for publication.

Updated historical tests for explicit partial choice, modal inert backdrop and moved Settings mount: e07-p02-browser/family/shared-home/shared-home-preview, cuisine-family, e07-2, global-browser, fam-integration-transverse. The intentionally modified cuisine-list byte freeze was replaced by model/core semantic regression; other historic frozen source expectations remain root's aggregate concern. Global-browser dock mapping now includes Courses as index3 and Menu5. Global/preview campaigns were not rerun by this agent.

## Single manual batch

Only project personnel may later execute, in this order: `00-preflight.sql` → inspect/save schema, triggers/RLS/grants and confirm revision-only UPDATE semantics → `01-install.sql` first on isolated test DB → `02-verify.sql` → synthetic-row precision/bounds/CAS/legacy-client and real A/B role/cross-household checks → human-reviewed application to personal DOBBY project if all checks pass. Rollback `03-rollback.sql` is application rollback while retaining additive availability column/data. No column DROP or data rewrite is proposed. Exact procedure, stop conditions and limitations: `docs/dobby-v7/revue-generale/supabase/shopping/README.md`.

Shared availability is not declared operational against the real backend. SQL metadata verification itself has not been run on PostgreSQL. No remote backend/account data was inspected or used in evidence.
