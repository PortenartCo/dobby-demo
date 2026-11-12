# Transverse Family integration verification

Scope: latest global review `6a6fcd9bcee522da7342de391e5c3d7bfe1955b3` plus the FAM integration in this checkout. All data and sessions are fictional. No real backend, account, migration, publication or external HTTP mutation is used.

## Source verification

- `source-contracts.log`: 8/8 tests pass. Fixed SHA-256 assertions preserve the latest E02, Courses, native family transport/core, Runes and global isolation runtime. The E09 shared memo writer section is byte-identical. Existing memo tests cover stable identity, stale edit/delete rejection, explicit import and rollback.
- `source-e02.log`: unchanged `tests/helpers/e02-shared-groceries.cjs` passes against the real source UI and an intercepted HTTP fixture. Direct chat add before E07 initialization reaches the native shared cache, repeated addition is idempotent, authoritative shared reads survive reload, local archives remain unchanged, and an absent shared adapter reports failure.
- `source-shared-home.log` and `source-shared-home/`: unchanged `e07-p02-shared-home.cjs` passes with two independent browser profiles and distinct fictional users. It exercises shared quantity/availability, offline reload and redeclaration, actual stale CAS rejection, explicit server/local resolution, grouped units, compatible edits, import/check/archive behavior and the old-schema fallback.
- `source-runes-history.log`: unchanged native profile history recipe passes with one gain, one reversal and a later retained gain. Rendering preserves all three ledger events and the total of 25 runes.

Source server: `http://127.0.0.1:8873`. Source test commands:

```sh
node --test essai-stitch-v7/tests/fam-integration-transverse.test.cjs essai-stitch-v7/tests/e09-memo-writer.test.cjs
DOBBY_TEST_ORIGIN=http://127.0.0.1:8873 DOBBY_E07_SHARED_HOME_EVIDENCE=docs/dobby-v7/evidence/famille-integration-20261112/transverse/source-shared-home node essai-stitch-v7/tests/e07-p02-shared-home.cjs
DOBBY_TEST_ORIGIN=http://127.0.0.1:8873 node essai-stitch-v7/tests/runes-history.cjs
```

`source-e02.log` runs the exported E02 helper with a freshly launched Chromium instance and origin `http://127.0.0.1:8873`; no preceding E02 or global campaign is required.

## New preview hook

Build the additive Family preview first, then run:

```sh
DOBBY_FAMILY_BASE=http://127.0.0.1:8873/essai-dobby-v7-famille-review-20261112/ \
DOBBY_FAM_EVIDENCE=docs/dobby-v7/evidence/famille-integration-20261112 \
CHROMIUM_PATH=/usr/bin/chromium \
node essai-stitch-v7/tests/fam-integration-transverse.cjs
```

Equivalent explicit overrides: `DOBBY_FAM_INTEGRATION_BASE` and `DOBBY_FAM_INTEGRATION_EVIDENCE`. The result is written to `transverse/preview/result.json`; success logs `FAM_INTEGRATION_TRANSVERSE_PASS`. The preview recipe uses the current `DobbyGlobalDemo` public controls and native UI/writers. It does not fulfill application, auth, RPC or database routes. Its browser route permits only static same-origin GET/HEAD and records/blocks any actual external request or HTTP mutation.

The targeted preview journey verifies the Family manifest and served latest E02/Courses bytes; exact namespace-only reuse of the global simulation; native A/B quantity and availability; E02 reads, addition, deduplication and Courses link; visible stale CAS resolution; one RPC-confirmed shared Runes V2 grant preserved through reload/sync; and FAM read-first E09 memo edit/reload/A-to-B visibility while local notes and family events remain intact.

The coordinated CI runner passed all six transverse checks; its log is `../ci-current/logs/transverse-preview.log` and detailed result is `../ci-current/transverse/result.json`. It recorded zero external requests, HTTP mutations or browser runtime errors. The same native 500 g grocery row retained 200 g available while E02 contributed a new item; a later stale CAS exposed local revision 2 against remote revision 3 and explicit server resolution converged A/B to 400 g available and 100 g to buy. The Missions V2 RPC confirmed one 10-rune grant, preserved through reload and repeated sync. Shared memo edits preserved historical local notes and family events.

After the screenshot helper was adjusted to scroll to the page top before capture, a fresh targeted run also passed all six checks. Its final evidence is `preview.log`, `preview/result.json` and four screenshots in `preview/`. The final run likewise recorded zero external requests, HTTP mutations and browser runtime errors.

This focused journey is complementary to the Family UI campaign; it does not claim a full E01–E09 rerun, live backend validation or physical iPhone validation.
