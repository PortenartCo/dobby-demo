# E07.3 Taverne and Recipe Library Implementation Plan

> For agentic workers: root owns shared effects, build/preview isolation, integration, final verification and publication. Parallel owners: Taverne/calendar; catalogue/navigation; native import adapter/format; visual evidence. Independent storage/sync audit and final code review.

**Goal:** deliver only the reviewed Taverne, compact weekly calendar, catalogue/favourites and manual/external-AI import entry, then publish a new isolated test URL.
**Source:** verified remote integration66a1395bb95ff7b9a7e2d1b981f5a8773070c03e, independent worktree /workspace/dobby-e073-taverne-grimoire, branch feat/dobby-e073-taverne-grimoire-20261111.
**Spec:** docs/dobby-v7/E07-3-SPEC.md. Nine immutable received review screenshots and archive hashes under evidence/e07-3/review-input/.
**Architecture:** preserve current Stitch DOM and native planning/customRecipes/tmAdaptations, validator and writers. Add a versioned import adapter, not a second engine or registry. Use existing browser APIs and local file store where its contract is verified. Private photo sharing must remain explicitly unavailable without a verified native transfer contract. No remote database actions.

## Protected boundaries and choices
- Do not merge, overwrite occupied branches, change preference defaults or import unrelated E06/E01-E05 corrections. Sources53 and historical decisions remain intact.
- Midi/Soir use date-slot native keys. Week navigation/selection is presentation state, without native planning date writes.
- Catalogue filters wrap. A dual-mode recipe remains one recipe; favourites add immediately but require explicit confirmation for removal.
- Creation route chooses existing manual form or external-AI import. No AI service/API calls. Imported batches are previewed and explicitly confirmed before native writes; preserve stable IDs, annotations, variants and favourites.
- Inspect actual V1 validator before defining enriched format. Use V2 normalization to native V1 base validation, with richer data retained through existing native records; JSON and ZIP bounds and unsafe archive references must fail before writes.
- Reuse shared effect feedback; activate ambience only on added E07 library routes. Keep current defaults (E06 fixes live independently), saved OFF and reduced-motion behavior.
- Reuse scripts/build-dobby-review.cjs with a separate E07.3 profile, namespace and new available output directory. No real backend, accounts or family photos in public demo.
- Main publication authorization is limited to adding the new static preview subtree. Compare all pre-existing top-level blobs/trees and remote refs immediately before publishing; no force push. Recheck hosted bytes and real browser navigation after deployment.

## Checkpoints
- [x] Preflight local/remote worktrees and PRs; SHA-check supplied9screens; isolate branch and immutable baseline66a1395.
- [x] A: capture baseline320/390/1440, implement daily2slots/calendar/readability/library composition; targeted meaningful tests.
- [x] B: real search/filter/star-confirmation/navigation/image/effects/sound/reduced-motion and reload tests.
- [x] C: native V1/enriched/ZIP multiple recipes, missing data/media, duplicates/replace/cancel/reimport, linked TM5 with human verification status, persistence/rollback. Deterministic fixtures only.
- [x] D: existing relevant Cuisine and native offline/sync tests, common module boundaries touched, causal assertion adaptations only, final CI. No repeated unrelated global campaign.
- [x] Commit/push verified source, build new isolated preview, compare bundle source hashes, test bundle320/390/1440.
- [x] Publish only new directory after conflict/tree checks; verify Pages workflow, HTTP resources/manifest and hosted fictional import/navigation/reload; preserve existing publication and branches.
- [x] Compact report distinguishes CODE_MODIFIÉ, TESTS_EXÉCUTÉS, INTÉGRATION_VÉRIFIÉE, DÉPLOIEMENT_APERÇU_CONFIRMÉ, FONCTIONNEMENT_HÉBERGÉ_VÉRIFIÉ, SYNCHRONISATION_RÉELLE_NON_VÉRIFIÉE. Stop for subpage review.

Checkpoints A/B/C and local common/native regressions PASS. Final source CI, byte-checked isolated publication and actual hosted receipt remain delivery gates; no publication is inferred from local tests.

Completed: CI V7 and native sync green atc121027; final clean bundle source hashes verified; static-only addition84e254f onmain afterc220d12; Pages43016384119 green;279 hosted bytes and four existing witnesses match; hosted UI320/390/1440 PASS. Final documentation-only receipt does not change the tested application. Stop for user subpage review. No real Supabase verification or photo transfer is claimed.
