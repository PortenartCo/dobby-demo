# Seasonal page coverage implementation plan

> **For agentic workers:** execute inline with superpowers:executing-plans, then one independent whole-change review. The owner explicitly requested execution of this scoped correction.

**Goal:** Make Christmas, Halloween and New Year recognisable on all six dock pages, including static mode, without changing business modules.

**Architecture:** Keep the existing calendar, SVG library, native preferences and home composition. Resolve visual hosts from the current main template plus `data-dv7-screen`, `data-family-view` and `data-cuisine-view`; reconcile owned decorations on every render. Non-home pages use an illustrated heading and a light edge accent on their existing Dobby illustration. Shopping uses its existing heading ledger; forms/details keep only the shared header.

**Tech Stack:** Existing browser JavaScript/CSS, Playwright, existing isolated seasonal review builder and GitHub Pages.

**Spec:** https://github.com/PortenartCo/dobby-demo/issues/21, “Extension UX validée — toutes les pages principales”; owner execution request of 18 November 2026. Base `6c7cf97ca197f3f7ab237254923222ff723d1589`.

## Global constraints

- Keep calendar, priorities, illustrations, native preferences, header/dock dimensions and historical source manifests unchanged.
- No storage, network call, dependency, graphic engine or Supabase change.
- Preserve effects OFF, decorations OFF, reduced motion, keyboard/touch and pointer transparency.
- Work in `/workspace/dobby-seasonal-pages`; preserve both recovered worktrees and all their working files.
- Continue PR #26, draft; publish only a new independent preview folder on main under the existing additive publication authorization.

## Review focus

- Cuisine and Family attributes can coexist after navigation; the active main template must win over stale body attributes.
- Same-view re-render and repeated preference application must not duplicate ornaments or retain previous hosts.
- Shopping heading is a narrow column beside status: decorate the containing ledger, with a reserved lower frieze.
- Forms, recipe detail, member detail, dialogues and onboarding must not inherit main-page dressing.
- Title text, face crops and functional controls remain readable and reachable, including 320px and effects OFF.

## Task 1: Route coverage and reconciliation

Files: `essai-stitch-v7/seasonal-effects.js`, `seasonal-effects.css`, `tests/seasonal-pages.cjs`, `tests/ci.cjs`, `tests/package.json`.

Interface: internal host resolver returns `{home,scene,title,section,composition}` from live main/body, consumed by the existing refresh; no public API addition. Main-page ornaments are owned by `data-seasonal-decoration`; styling host attributes are removed when unused or disabled.

- [x] Inspect live main templates and run existing seasonal visual and 14 transverse baselines.
- [x] Add browser assertions for six pages × three events × four widths, root-to-root dock navigation, related level-one views, details/forms, OFF cleanup, motion, chrome dimensions, controls and bounded DOM. Run against the base and observe missing main decoration outside home.
- [x] Extend the adapter only: route allowlists, heading/ledger and illustration-edge compositions, stale-host cleanup, observation of cuisine and screen attributes. Keep the home and seasonal level-one treatment unchanged.
- [x] Run targeted coverage plus existing seasonal and transverse suites; inspect captures at 390/1440 and overflow at 320/768.
- [x] Run the standard `npm test --prefix essai-stitch-v7/tests` and strict source/Tailwind derivation; commit only intended source/tests/plan.

## Task 2: Review and delivery

Files: new comparative capture/report folder, optionally the existing seasonal review acceptance test to assert preserved event across all six destinations. Preview controls and builder are reused unchanged unless a demonstrated gap requires a focused fix.

- [x] Obtain an independent review of the complete change and captures; fix any material defect with a reproducing assertion.
- [x] Build a committed-source preview, test its real six-page navigation and review-date isolation, add screenshots/report, and publish only its new folder via the existing publication worktree.
- [ ] Push the same PR branch, retain draft status, follow every applicable workflow on the final SHA to success, and verify the public preview and manifest.

## Execution ledger

- Base verified locally and remotely: `6c7cf97`; original checkout has only retained generated evidence changes. Additive detached worktree created; no reset/clean.
- Baseline: existing visual test passed at 320/390/768/1440; transverse tests 14/14.
- Host investigation: Family/Cuisine replace main and mount native chrome after render; transient initial route state requires route-specific test readiness. Observe body route attributes and body main replacement; no broad subtree observer or polling.

- Review: independent reviewer inspected all 36 after-captures and code. Two material findings reproduced: hidden title text and native caption paint order. Both fixed with browser RED→GREEN evidence. Equipment/history were separately identified as details; they are excluded and tested with a declared local equipment fixture. `contracts-1` remains an overview alias.
- Review regression probe: caption layer 0/3 → 4/3, title `Menu✦Nouvel An` → `Menu`, equipment/history owned decoration count 1 → 0. Permanent assertions added to the route suite.
- Ruling: reuse the existing review controls/builder unchanged; their date already persists across all four HTML entry files. Strengthen only the review browser acceptance with a six-destination traversal.
- Ruling: keep all task scratch/evidence/worktrees after delivery, following the explicit recovery preservation instruction.

- Standard campaign first attempt reached Contacts after passing seasonal, Menu and Settings. `contacts-v7.cjs` uses `DOBBY_CONTACTS_BASE`/8765 separately from `DOBBY_TEST_ORIGIN`; the isolated checkout was only served on 8766. Observed `ERR_CONNECTION_REFUSED`, then provided the canonical 8765 localhost server for this same checkout and restarted the unchanged standard command. No application/test assertion modified.

- Task 1 complete: final route suite passed all four widths and regressions; standard `npm test --prefix essai-stitch-v7/tests` completed with exit 0 on canonical origin 8765, ending in `E07_P01_P02_TARGETED_CI_PASS`. Strict build-source/Tailwind outputs unchanged; 14 transverse tests passed.

- Task 2 delivery artifacts: committed-source preview `06798cb7f09ed048045e5a180ad93babf0bf9618`, 353 resources and six-page local review passed. 72 comparison PNGs and proof logs added. Publication is exclusively 354 new files in `essai-dobby-v7-seasonal-pages-06798cb7f09e/`, main commit `424ae01815b7392dff1b3e5da9c51f4a734b4140`. Final HEAD workflows/public URL are followed in PR metadata without another documentation-only CI cycle.
