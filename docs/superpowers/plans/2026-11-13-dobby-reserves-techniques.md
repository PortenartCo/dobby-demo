# DOBBY V7 Technical Reserves Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Finish autonomous work for the remaining technical reserves and provide one targeted manual server diagnostic, with no Supabase intervention.

**Architecture:** Keep the existing native writers and closed server gates. Reuse prepared SQL, collect only necessary catalogue metadata and source definitions, and fix independently reproducible client/model/verifier defects.

**Tech Stack:** Native JavaScript modules, Node tests, Playwright/Chromium, PostgreSQL 17.7 in a container with no network or ports.

**Spec:** [Current mission and constraints](../../dobby-v7/reserves-techniques/00-CADRAGE.md), existing V3/Family contracts and manual SQL under `docs/dobby-v7/revue-generale/`.

## Global Constraints

- Base `b77cb9d`; B final user acceptance is complete. Never request it again.
- No remote Supabase read/write/API/CLI. All Supabase operations remain manual.
- Do not replay Stitch SQL 01/04/06/11. Preserve existing profiles and data.
- Do not activate new operations from catalogue presence or fixtures alone.
- Use separate SQL fixture databases/containers; no production credentials.

## Review Focus

- Missing or invisible catalogue objects must stay explicit; no false ready verdict.
- Named constraints may have an incompatible body; verifier must reject them.
- Canonical role must survive parsing and dominate mutable local display state.
- Large Rune totals plus compensation must use exact arithmetic.
- Browser simulation never proves physical microphone, Safari permissions or iPhone keyboard.

### Task 1: Grouped server diagnostic

Owner: baseline_release. Files: `docs/dobby-v7/reserves-techniques/serveur/00-diagnostic-regroupe.sql`, its README and local test runner. Consumes prepared C07/Missions/Roles/Family preflights. Produces one read-only JSON, with source definitions and privileges required for the later migrations.

- [x] Test the exact SQL against absent, partial and representative fictitious catalogues.
- [x] Implement bounded metadata-only reads; no business RPC/data reads or installation.
- [x] Verify read-only behavior, missing-object reporting and output shape; commit.

### Task 2: C07 verification

Owner: shopping. Files: existing shopping SQL/tests and `reserves-techniques/COURSES-C07.md`.

- [x] Reproduce false acceptance of an incompatible same-name constraint.
- [x] Fix exact contract verification and test valid/invalid definitions without accepting server readiness.
- [x] Reuse the existing additive candidate and record the conditional manual action; commit.

### Task 3: Missions/Runes correctness

Owner: missions. Files: native Rune core/tests, existing V3 contract, `reserves-techniques/MISSIONS-V3.md`.

- [x] Reproduce the unsafe intermediate sum followed by compensation.
- [x] Preserve exact pending/confirmed totals and reject persistent overflow; run scoped regression tests.
- [x] Record necessary real guard/helper definitions for Task 1; do not fabricate an installer; commit.

### Task 4: Canonical Parent/Enfant guards

Owner: family. Files: native access/core/transport modules, role tests and `reserves-techniques/FAMILLE-ACCES.md`.

- [x] Reproduce category loss and mutable local role precedence in the actual guards.
- [x] Preserve a validated canonical category, reject incomplete/conflicting contexts, retain established parent operations.
- [x] Test child, parent, missing/foreign/stale identity and targeted child-account gate; commit.

### Task 5: Server rights boundaries

Owner: transversal. Files: existing provisional role SQL/tests and `reserves-techniques/DROITS-SERVEUR.md`.

- [x] Audit explicit direct-write/RPC/Storage boundaries and identify catalogue-dependent gaps.
- [x] Fix only proven independent SQL-verifier or policy defects in an isolated local fixture.
- [x] Keep the full-rights claim and activation closed; contribute the minimum catalogue requirements to Task 1; commit.

### Task 6: Physical acceptance and combined delivery

Owner: root. Files: `reserves-techniques/CONTROLES-MATERIELS.md`, final reserve report and manual-action index; reviewed source preservation fixtures only if necessary.

- [x] Map existing automated voice/keyboard tests to the minimum real-device cases; do not repeat B acceptance.
- [x] Review scoped changes and source preservation boundaries, run appropriate combined regressions.
- [x] Deliver one diagnostic action and the remaining physical checks; future installations stay conditional on diagnosis.
- [x] Prepare only verified independent corrections for Git integration under the existing gates; keep server operations unavailable before manual installation and verification.
