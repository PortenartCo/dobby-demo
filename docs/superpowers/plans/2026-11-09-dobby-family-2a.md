# DOBBY Mission 2A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. No intermediate user approval: execution of the whole lot is explicitly authorized.

**Goal:** Bind the seven requested original Stitch sources to existing member, agenda and medical handlers, with accurate limitations and browser evidence.

**Architecture:** Same-origin hidden V5 iframe remains the only engine and writer. A Family adapter projects its state and dispatches native forms/actions; source templates own the visible composition. Local individual medical records, voluntary shared medical visits, and ordinary events remain separate.

**Tech Stack:** Existing HTML/Tailwind, vanilla JavaScript, Node generation, Chromium/Playwright tests.

**Spec:** User request “Mission Codex 2A : Famille, Agenda et Santé”, recorded with the delivered contracts in `docs/dobby-v7/FAMILY-2A.md`.

## Global Constraints

- Continue PR #3, branch `feat/dobby-stitch-53-source-backed-v7`, from `cb440793cc04079cd472a3cd1d8fcf3e14c1f84b`.
- Ne pas modifier Supabase, SQL, la V5 publiée ou les données des comptes réels.
- Ne pas fusionner ni déployer. No second engine/storage/framework.
- No new automatic medical sharing or silent copying to the ordinary family agenda.
- Only rerun common regressions if shared code changes; no independent Cuisine re-audit.
- All seven original sources get truthful integrated/partial states and comparisons at 320/390 px.

## Review Focus

- Renaming members must retain IDs, legacy medical associations and native duplicate/delete safeguards.
- Medical form scope must be explicit; local records must never enter family payloads or ordinary events.
- Unsupported photo/role/reminder/vaccination/archive functions must not show sample facts or fake success.
- Offline editing, canceled confirmations and stale IDs must preserve records and browser form drafts.
- Empty states, back/reload, long names, fixed bars and source imagery must work at 320/390 px.

### Task 1: Source derivation and native adapter

**Files:** create `essai-stitch-v7/build-family.cjs`, `family-routes.json`, `family-engine.js`, `family.js`, `family.css`; modify `build-source.cjs`, `bridge.js`; test `tests/family.cjs`.

**Interfaces:** `DobbyFamilyStitch.open(view, values, history)` handles `members`, `member-edit`, `agenda`, `medical-edit`, `health`, `health-person`, `health-history`; `DobbyFamilyStitchEngine` reads native state and dispatches native forms/actions without new writers.

- [x] Write/run browser member path test; expected RED: Family source controller absent.
- [x] Generate seven source-derived templates, validate image MIME/hashes and record unavailable originals.
- [x] Bind members list/form, original native name/birthdate/avatar, duplicate/linked-delete safeguards; show unsupported fields explicitly.
- [x] Run member create → record → edit → reload tests at both widths; expected PASS.
- [x] Commit reproducible sources and member integration.

### Task 2: Agenda and medical journeys

**Files:** extend Family adapter/UI and `tests/family.cjs`; add `tests/family-shared.cjs`.

**Interfaces:** local `famHealth` uses `xHealthForm`; shared `sharedHealthVisits` uses `fhForm` and native active-module gate; ordinary `familyEvents` uses `fpEventForm`; contacts use native `xContactForm`. Person selectors use existing member IDs, with display-only name resolution.

- [x] Add/run failing assertions for ordinary event CRUD, local visit CRUD, explicit shared scope, history/contact consultation and no medical copying.
- [x] Bind seven source compositions, native validations/confirmations/deletions, and return navigation; unsupported functions remain visibly unavailable.
- [x] Test persistence, member rename/duplicate/linked deletion, local/shared separation, canceled deletion, empty states, history/back and native mocked synchronization/offline behavior; expected PASS.
- [x] Commit functional journeys.

### Task 3: Evidence, review and PR

**Files:** add `tests/family-visual.cjs`, `docs/dobby-v7/evidence/family-2a/`, `FAMILY-2A.md`; update manifest, `INTEGRATION.md`, CI and test scripts.

- [ ] Capture reference/live for seven sources × two widths, plus empty/shared/offline states; assert source hashes, no sample identities, no visible V5 panel and usable controls.
- [ ] Update truthful statuses including exact unsupported contracts and image substitutions.
- [ ] Run targeted tests, 54 common regressions and root smoke because bridge/build wiring changed; existing Cuisine suites run in final CI to cover that shared change.
- [ ] Run a fresh whole-lot review, fix important findings with regression evidence, commit and push PR #3; verify final CI on final SHA.
