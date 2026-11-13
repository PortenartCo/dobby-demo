# Contrats & Assurances Implementation Plan

> **For agentic workers:** Use the approved execution specification and focused tasks below. Each owner tests its component before handoff; a fresh reviewer checks the complete patch.

**Goal:** Deliver the approved native DOBBY V7 contracts module, verified and published on canonical Pages.
**Architecture:** Keep familyDocs, native local IndexedDB and existing private family Storage authoritative. Add one structured `contract` metadata object and an `attachments` list, preserving legacy fields and unknown metadata. Pure calendar and archive parsers are independent of UI and writers.
**Tech Stack:** Existing browser JavaScript, native family facade, ES modules, Node test runner and Playwright.
**Spec:** docs/dobby-v7/contracts/SPECIFICATION.md

## Global Constraints
- No remote SQL or changes to schema/permissions. No other-module redesign or injected demo records.
- No automatic AI requests or uploads. Explicit confirmation before import, deletion or replacement.
- Legacy fields: id/title/category/provider/reference/date/deadline/note remain. `deadline` is next expiry.
- `contract`: {version:1,type,scope,equipmentIds,effectiveDate,autoRenewal,renewalDuration,notice,renonDate,renonMethod,reminders,amount,periodicity,terminationConditions,provenance,uncertainties}.
- type: maintenance/insurance/energy/subscription/other (extensible string). scope: house/equipment. autoRenewal: yes/no/unknown.
- renewalDuration: {value:null|positive integer,unit:months|years}; notice: {value:null|nonnegative integer,unit:days|months}; renonDate: explicit ISO date or null. Missing clauses never produce a guessed date.
- amounts: null or finite nonnegative number. reminders: [90,30,7] by default. provenance and uncertainties are arrays.
- attachments: {id,name,type,size,kind,key?,cloudPath?,cloudName?,cloudType?,cloudSize?,supersedes?}. Local keys never sent to family; legacy attachmentName/Type and family-ID blob remain untouched.

## Review Focus
- Old remote clients lacking new fields must not erase metadata or additional pieces.
- Stale form/import preview must not overwrite concurrent records or a different household.
- Invalid legacy dates and absent equipment stay visible and preserved.
- Malicious ZIP metadata cannot allocate unbounded memory or import arbitrary shared file paths.
- Upload success and reminder delivery must not be inferred from local persistence.

### Task 1: Metadata and calendar model
- [x] Add focused tests before model implementation.
- [x] Create contracts-model.mjs: normalizeContract(row), cancellation(row), reminderSchedule(row), nextAction(row,today), mergeContract(existing,patch), validateContract(row,equipmentIds?). Export strict validDate and calendar subtraction helpers.
- [x] Verify end-of-month clamping, leap years, unknown clauses, explicit precedence, unknown fields and partial patches.

### Task 2: Native persistence and files
- [x] Audit actual writers and baseline sync tests.
- [x] Extend existing contracts pick/apply to preserve structured metadata, unknown fields and multiple pieces while excluding local keys.
- [x] Expose window.DobbyFamilyContracts API in native runtime: save(id,values,expected?), addAttachment(id,file,kind?), openAttachment(id,attachmentId), shareAttachment(id,attachmentId), replaceAttachment(id,attachmentId,file), removeAttachment(id,attachmentId). Save returns id; async file APIs use existing storage; open returns Blob where available. Expected row guard required for edits.
- [x] Test native save/reload, family serialization/merge and permission/stale guards without live credentials.

### Task 3: External AI exchange
- [x] Create contracts-import-format.mjs and contracts-import-zip.mjs, tests first.
- [x] Exchange format dobby-contracts version 1, contracts array with legacy top-level metadata, nested contract and source documents descriptors {id,path,name,kind}. Parse ZIP to {manifest,files} with safe bounds and real PDF/raster types.
- [x] Reject malformed/missing/duplicate sources, dangerous paths, excessive expansion, invalid dates/values, unsupported versions and untrusted cloud refs. Export externalPrompt and parseContractManifest; document exact schema and limits.

### Task 4: Native UI and import integration
- [x] Rework contract routes only in documents-register.js; add focused contracts CSS/UI module if helpful.
- [x] Exact approved list/form labels, scope links, dates/provenance, schedule disclosure, multi-file/PDF UI; preserve Archives.
- [x] Two addition actions, prompt copy, ZIP/JSON selection, editable preview, per-entry choices and explicit final confirmation; use native API and snapshot/context checks.
- [x] Update source generator and generated famille.html consistently. No independent demo.

### Task 5: Acceptance and publication
- [x] Browser tests at 320/390/768/1024/1440, real PDF, multi-equipment, create/edit/reload, import refusal/duplicate/update and non-regression.
- [x] Independent review; fix actionable issues and rerun affected checks.
- [ ] Refresh main, reconcile changes, commit, push PR, inspect CI, merge only after applicable checks pass.
- [ ] Verify canonical Pages deployed bytes/SHA and hosted interactions; save report and mobile/desktop screenshots with explicit backend verification limits.
