# Remaining Stitch domains Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans, inline sequential execution. User authorizes all four lots without intermediate approvals.

**Goal:** Integrate all remaining technically connectable original sources, with honest partial states and native behavior.
**Architecture:** Extend the existing Family source shell with registered source-derived domains. Each domain binds native state, forms and action handlers through the same hidden iframe. No new writer, database, persistent model or framework.
**Tech Stack:** Existing HTML/Tailwind, vanilla JS, Node source generator, Chromium/Playwright.
**Spec:** `docs/dobby-v7/MISSION-2B-5.md` (exact user request).

## Global Constraints

- Existing PR #3 / branch `feat/dobby-stitch-53-source-backed-v7`; actual baseline `152cb89cd33fe5ba2349b965ea8b1a60d1140b1f`.
- Sequential lots 2B → 3 → 4 → 5, per-lot targeted tests, evidence, commit, push and CI checkpoint.
- No published V5/SQL/Supabase modifications, real-account data, destructive restoration, merge, deployment, paid APIs or new infrastructure.
- Missing native functionality is explicit PARTIAL; no fake records or automatic medical sharing.
- Source compositions derive reproducibly from originals; 320/390 reference/live and empty/error/navigation/persistence checks.
- Common regressions only for shared changes; final general CI. Previous Cuisine/2A contracts retained.

## Review Focus

- Existing records with unknown fields and local/shared scope retain identity and extra data through edits.
- Canceled deletion/import/restore never mutates state; stale routes remain usable.
- Attachment files and metadata remain distinct, with one available local picker and explicit sharing state.
- Unsupported AI/OCR/voice/conversation/clinical claims and embedded samples must never become household facts.
- Native handler async actions, form drafts, account transitions and cross-domain back/forward preserve user intent.

### Task 1: Lot 2B — contacts, memos and lists
**Files:** add `register-routes.json`, `build-register.cjs`, `register.js`, `family-register.js`, `register.css`, `tests/register-family.cjs`, `tests/register-visual.cjs`; modify `family.js`, `build-source.cjs`, `bridge.js`, CI/test scripts and docs.
**Interfaces:** Register mounts `templates/remaining/<view>.html` through Family shell; domain `render(view,ctx)`, `act(action,element,ctx)`, `submit(form,ctx)`. Native forms `xContactForm`, `familyNoteForm`, `xListForm`; native list item handlers.
- [x] Add and run failing browser path for source routes and actual native CRUD, reload, cancel deletion, empty/search, missing IDs.
- [x] Derive six original templates/assets; bind source cards/forms, supported classifications, honest unsupported states; route root accesses to them.
- [x] Run `register-family.cjs` at 320/390 and source/empty visual comparisons for lot 2B. Expected PASS; run common regression checks for shared shell changes.
- [x] Document six exact statuses/limits/proofs; commit, push, check targeted lot CI; checkpoint and continue.

### Task 2: Lot 3 — house, equipment and backup
**Files:** extend route config/generator, add `house-register.js`, `tests/register-house.cjs`; docs/evidence.
**Interfaces:** Reuse Register shell and existing house/equipment/maintenance/backup validators/forms/actions; no direct persistent mutation.
- [x] Identify original house sources and native forms/validators; write/run failing equipment → detail → edit → log → history test and export/import preview/cancel safeguards.
- [x] Bind each source, preserve native file handling, expose safe preview/confirmation boundaries; partial where no native operation exists.
- [x] Run targeted house test plus 320/390 source/live/empty captures. Expected PASS, no destructive restore executed.
- [x] Document statuses/proofs/limits; commit, push, check lot CI; checkpoint and continue.

### Task 3: Lot 4 — documents, contracts and imports
**Files:** add `documents-register.js`, `tests/register-documents.cjs`; extend routes, docs/evidence.
**Interfaces:** Same shell, existing `familyDocForm`, attachment handlers and contract views over native records; native import validation and confirmation only.
- [x] Identify eleven original sources; write/run failing document CRUD/file lifecycle/import invalid/cancel and contract view/modify paths.
- [x] Bind originals, real metadata and native files; distinguish local and shared state; disable missing OCR/AI/extraction/guarantee features explicitly.
- [x] Run tests and 320/390 source/live/empty captures; verify file bytes retained and canceled imports unchanged. Expected PASS.
- [x] Document exact statuses/proofs; commit, push, check lot CI; checkpoint and continue.

### Task 4: Lot 5 — missions and cross-domain tools
**Files:** add `tools-register.js`, `tests/register-tools.cjs`, `tests/register-navigation.cjs`; remaining route config and final docs/CI.
**Interfaces:** Native mission, search, personal/settings/menu/chat handlers through same engine; unsupported conversation capabilities explicit.
- [x] Write/run failing source navigation/mission create/edit/assign and search real-result routing assertions.
- [x] Integrate remaining sources and both conversation variants to actual available contracts, without new conversational engine.
- [ ] Run targeted tests/captures at 320/390 and full cross-domain navigation/back/reload, shared regressions and final CI. Expected PASS.
- [x] Final fresh-context whole-mission review; one fix pass with RED→GREEN for important findings, then green relevant suites.
- [ ] Final manifest counts, exact remaining/partial list and reasons, checkpoints and visual index; commits/push/PR #3 update and final-SHA CI proof. Stop.
