# DOBBY V7 Contacts — Implementation Plan

**Goal:** Deliver the seven-field family directory and an isolated hosted acceptance preview from Stitch 24.
**Architecture:** Keep the native `famContacts` array, IDs, family module, save/sync and permission pipeline. Extend the existing native form/writer; use the existing Contacts routes for list, detail and edit. Reuse the isolated review runtime for publication.
**Tech stack:** Vanilla JavaScript, native HTML forms, existing CSS, Playwright/Chromium, GitHub Pages.
**Spec:** User request “CODEX — DOBBY V7 — Finalisation complète Contacts / Stitch 24”, 16 November 2026, supplied as pasted text.

## Constraints

- Exact supplied PNG, no artistic edit; full image visible in a compact responsive banner.
- Seven fields only: name (required), category, specialty (`role`), phone, email, postal address, notes (`note`).
- One add action and one instant search; compact clickable cards; detail links and confirmed deletion.
- No SQL, remote Supabase, real accounts, archive-system duplication, main merge, Notes or PR17 integration.
- Preview publication and draft PR explicitly authorized; no intermediate approval requested.

## Review focus

- Legacy contact IDs and unknown metadata survive edits; absent optional values remain absent/empty.
- Search tolerates accents and matches all coordinates and categories.
- Cancel, stale records and failed saves retain data; read-only identities cannot write.
- Reload and native family synchronization preserve the two added fields.
- Preview storage and network boundaries protect the main app and previous previews.

## Tasks

- [x] 1. Add failing browser coverage for the visible add button, seven-field CRUD, legacy metadata and permissions. Reproduce the unbound label and five-field writer.
- [x] 2. Extend `essai-stitch-v5-famille/index.html` contact form/writer, `family-engine.js`, Contacts presentation in `family-register.js`, layouts/build derivation and scoped CSS. Use the existing `contacts` and `contact-edit` routes; `mode=read` distinguishes detail. Keep existing native writers for all mutations. Hide archive command until PR17 provides a merged native mechanism.
- [x] 3. Pass Contacts browser journeys at 320/390/768/1440; run existing family register/sync/preservation/navigation and relevant native family policy/core regressions. Review the final diff independently.
- [ ] 4. Commit/push Contacts; create and attach an independent draft PR. Build a new preview directory with a dedicated namespace and blocked external connections. Publish only that directory on the current Pages source branch; verify hosted CRUD and unchanged existing paths. Fast-forward the clean Dev-Lap Contacts worktree to the delivered branch.

## Execution record

- Base verified: `main` and clean Dev-Lap Contacts worktree at `521c919`.
- Cloud execution uses the same Contacts branch, mirrored back to the requested Dev-Lap worktree after delivery.
- Root cause: add button text `Inscrire` is absent from the adapter's label matcher. Native writer supports five fields and replaces whole rows.
- Archives: PR17 is open at `aeed16e`; main has no native contact archive action. Omit the command and document the dependency.
- Pages: legacy deployment source is `main:/`. Publish an additive generated preview snapshot only; never merge application changes into main.

- Review: independent reviewer found browser-history draft baseline loss; regression reproduced and fixed. No other critical/important issue. Provenance base is now explicit. Native source-boundary guards extend by exact reversible substitutions without changing frozen parent fixtures.
