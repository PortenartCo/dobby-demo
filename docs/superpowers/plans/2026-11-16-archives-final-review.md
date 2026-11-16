# Archives / Stitch 22 — Final user review implementation plan

> Execute inline on the existing PR17 branch. The user's 16 November specification is the approved scope; no additional design or publication approval is needed for its new isolated preview.

## Scope and boundaries

Keep the current source lifecycle, writers, IDs, documents, histories, permissions, CAS and synchronization. Preserve the historical Documents registry and the application already published on main. No remote SQL, Auth 31, real A/B accounts or release-gate changes. The existing preview is immutable.

## 1. Reproduce the consultation defects

- Add a focused browser campaign with fictional contracts/insurance, autonomous document, equipment, recipe, contact and local/shared memos.
- Capture active native views and the existing archived views at 320, 390, 768 and 1440 px.
- Assert canonical native rendering, full data/file access, read-only commands, direct return and a top reactivation confirmation. Observe failures before implementation.
- Measure the existing Stitch22 frame and pin the original image hash.

## 2. Correct source presentation and detail reactivation

- `essai-stitch-v7/archives-register.js`: resolve the real document source using structured contract metadata/category; open canonical native routes; provide a compact archived toolbar with a return arrow and authorized Reactivate action; preserve read navigation and use the existing confirmation/writer. Refresh an already open recipe after reactivation.
- `essai-stitch-v7/contracts-register.js`, `house-register.js`: let the existing native read-only policy omit mutation-only controls for archived rows while preserving sections, programs, histories and file reads.
- `essai-stitch-v7/documents-register.js`: reuse the document module's existing data and file-read components only in the Archives reading context, removing its generic decorative/storage/editor scaffolding. Leave its normal registry path unchanged.
- `essai-stitch-v7/cuisine.js`: dispatch detail reactivation through the same Archives lifecycle API. Keep recipe tabs, modes and images native.
- `essai-stitch-v7/archives.css`: compact responsive hero with the unchanged image, proportions and bottom-right title; compact accessible detail toolbar.
- Run the causal campaign and source/writer/sync regressions. Retain prior assertions; update only those whose archived presentation has intentionally changed.

## 3. Verify and deliver

- Compare active/archived data and presentation, inspect captures, verify PDF/image bytes, denied roles, stale confirmations, reload and fixture synchronization.
- Run the relevant existing archive, contracts, equipment, recipe and Documents registry checks. Do not manually repeat all 525 tests or the unrelated historical Missions campaign.
- Obtain a focused independent read-only review using requesting-code-review, fix validated findings, update PR17 with evidence and keep it in draft.
- Wait for relevant PR CI on the final source SHA.
- Build a new isolated preview using the existing builder/envelope with a new directory and storage namespace, richer fictional source fixtures and no real backend. Verify locally, prove all existing main root objects and published baseline resources unchanged, then publish only the new directory.
- Verify the hosted preview at 320/390/768/1440 px, repeat the core mobile/desktop workflows, compare the old publication, and provide exact source/publication SHAs, URL, receipts and limits. No merge of PR17.
