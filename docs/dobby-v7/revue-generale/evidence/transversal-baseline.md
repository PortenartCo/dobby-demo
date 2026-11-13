# DOBBY V7 transversal — baseline before edits

2026-11-13; workspace /workspace/dobby-v7-review; HEAD b327aa5 (main merged prior Stitch 19/20 and invitation-resume fixes). Required pack read in order. No AGENTS.md in this repository. No remote backend operations authorized or used.

| IDs | Reconciliation | Evidence in source |
|---|---|---|
| D01 | À_CORRIGER | chat.js places small toggle microphone in fixed bottom composer after history |
| D02 | À_CORRIGER | listen() toggles start/pause on click, supports resume and continuous mode; release/blur/leave do not stop |
| D03 | NON_RÉALISÉ | aria-pressed tracks start event only; no dedicated held state or independent functional halo |
| D04 | À_CORRIGER | native private/local history and text send preserved, but composer below history and fixed |
| N01 | À_CORRIGER | chrome.js has 5 links Traverse/Missions/Taverne/Famille/Menu, no first level Courses |
| N02 | PARTIEL | shared dock already fixed, safe-area CSS and onboarding exclusion exist; six item width pending |
| H01 | À_CORRIGER | home quick courses heading has plain padded card, event header uses separate brown banner |
| H02 | À_CORRIGER | source Gazette des Curiosités remains |
| H03 | NON_RÉALISÉ | event rows link agenda but no add event action on home; native agenda writer exists elsewhere |
| H04 | À_CORRIGER | source illustration uses original upper-left badge |
| H05 | PARTIEL | shared st.stitchPreferences/apply() exists; generated family source may override header; inspect/verify shared chrome |

Implementation approach: retain existing native engines, route controller, local chat/history, preferences; replace only shared dock descriptors and Chat presentation/input lifecycle; event action delegates to native agenda form with explicit return-home hook. Entry/ceremony chrome remains authoritative. Behavioral tests cover press lifetime, stale browser callbacks, navigation states and event return. Browser speech API is simulated locally only; hardware permission and real backend not certified.
