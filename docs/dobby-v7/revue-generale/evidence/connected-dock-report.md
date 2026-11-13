# N01/N02 follow-up — connected legacy ceremony dock

Baseline `c7b20d0`; committed scoped fix `aef2664` (`Keep shared DOBBY dock available during connected ceremonies`). Read-only baseline before edits: `/workspace/dobby-connected-dock-baseline.md`. No remote Supabase calls, push, merge or deployment.

## Finding and correction

The first transversal acceptance covered the six main connected modules but omitted legacy connected ceremony routes. Those routes retained three independent hiding mechanisms: early return in `chrome.mount`, `onboarding.chrome` setting `nav.hidden=true`, and onboarding/ritual CSS hiding the nav. This contradicted N01's sole preconnection exclusion.

`chrome.js` now executes its existing shared dock mount for both normal and legacy ceremony routes. The custom ceremony header, its preferences, and the ritual's embedded preferences remain intact. There is still exactly one dock with the same six native links; Famille is active for these legacy routes. `onboarding.js` no longer hides it. `onboarding.css` removes the broad exclusion, explicitly overrides ritual's narrower nav rule and reserves dock/safe-area space under quiz and ritual content. No ritual source, native scoring, writer or generated HTML was changed.

Exposing the dock also required serializing a pending ceremony operation. The dock records a newer navigation intent before waiting for either a pending identity draft or the Register lock. `onboarding.run` allows the native write to finish but suppresses its older automatic route. This prevents a delayed final save from overwriting the user's newer Menu destination.

## Test evidence

`tests/v7-connected-ceremony-dock.cjs` failed before changes with `connected dock visible house: false !== true`.

A second regression test reproduced the final-save race with the first wait-only implementation: delayed final metadata completion plus a Menu click ended at `salon` instead of `menu`. The navigation epoch fixed that reproduced failure.

Fresh final checks:

- `node tests/v7-connected-ceremony-dock.cjs`: PASS at **320 and 390 px**. Actual native House and Patronus question/answer/draft paths; Menu leave and same-member resume; one visible six-link dock; custom header/preferences preserved; >=44 px links; final quiz action clear of dock; pending identity-draft transition; delayed final save with newer Menu intent; member/reward integrity; ritual first tap and real rendered green pixels; dock exit during floo with no late navigation; reduced-motion first tap; preconnection Auth still hides the dock. Local declared TEST parent; no remote identity certification.
- `DOBBY_TEST_ORIGIN=http://127.0.0.1:8765 DOBBY_STITCH_RITUAL_EVIDENCE=/workspace/dobby-connected-ceremony-evidence/ritual-regression node tests/stitch-entry-ritual.cjs`: PASS all **11 cases**, retaining first touch, green flames, independent effects/sound, late image decode, session/legacy entry, disposal/audio cleanup and hidden/retry behavior.
- `node tests/v7-transversal.cjs`: PASS original six-route navigation, hold/release/cancel/blur/leave/stale callback, mouse/keyboard, halo with effects OFF, keyboard geometry and six widths.
- `node --check` and scoped `git diff --check`: PASS.

Proofs: `/workspace/dobby-connected-ceremony-evidence/house-{320,390}.png`, `patronus-{320,390}.png`, `ritual-{320,390}.png`, `results.json`; ritual regression evidence under `ritual-regression/`. No historical evidence was modified by these commands.

## Per-ID result

| ID | Status | Commit / files | Test | Limits |
|---|---|---|---|---|
| N01 | FAIT_TESTÉ_NON_DÉPLOYÉ | aef2664; chrome.js, onboarding.js/css | Connected legacy House/Patronus/identity/final/foyer/ritual plus original six-module routes PASS | No production publication by this subtask; Auth/backend fixture only |
| N02 | FAIT_TESTÉ_NON_DÉPLOYÉ | aef2664; shared six-link dock and ceremony bottom reserve | 320/390 geometry, target sizes, final-action reachability, auth exclusion PASS; original six-width regression PASS | No physical iPhone/OS safe-area certification |
| S02/S07 preservation | FAIT_TESTÉ_NON_DÉPLOYÉ | native ritual implementation retained | Existing 11-case entry ritual regression PASS | Local browser, Auth session behavior remains fixture-based |

Parent runner should include `essai-stitch-v7/tests/v7-connected-ceremony-dock.cjs`; the root owns runner/report updates and next-head CI. The independent read-only reviewer found no ritual disposal/audio defect; the final-save navigation risk they identified was reproduced and fixed as above.
