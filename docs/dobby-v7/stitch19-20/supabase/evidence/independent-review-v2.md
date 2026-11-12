# Independent scoped re-review — immutable v2

**Verdict: PASS for the reviewed local SQL package and handoff for manual user execution. No remaining actionable blocker found in the five corrected findings or their changed privilege/maintenance paths. This is not remote installation or operational certification.**

Apply SHA256: `96f2845158fdcc66621c3bdc69f0d5f227b5427e181e9afad6f15f87f1d0ea3d`.

All eight manifest entries match their SHA256 values, including the seven source/document/test entries and the additional Python bytecode artifact. Reviewed the v1→v2 changes, correction report, updated local runner, twelve-group result and log, related native access code/tests and UI call site. No source edits, test reruns, database mutations or remote operations were performed by this reviewer. This review file is the only addition.

## Closure of v1 findings

| Finding | Review decision and evidence |
| --- | --- |
| R1: non-superuser install ownership lifecycle | Resolved. The writer receives temporary schema CREATE and the installer receives the membership options needed for ownership transfers/ACL changes. A transaction-only NOLOGIN creator role avoids leaving PostgreSQL 17's implicit creator membership in the final writer. The explicit installer grant is revoked with the creator as grantor, then the creator is dropped before COMMIT. The verified final state has zero writer memberships, no temporary creator role and no writer CREATE on public/private schemas. The original failure was reproduced and the revised runner exercises installation under effective NOSUPERUSER/CREATEROLE/NOBYPASSRLS database-owner privileges. |
| R2: bootstrap and truthful counts under FORCE RLS | Resolved. Two private definer helpers owned by the NOLOGIN/NOBYPASSRLS writer provide only aggregate counts and the existing explicit legacy-owner linkage procedure. EXECUTE is granted to the installer after general helper revocation; anonymous, authenticated and service_role access is rejected by structural checks. Bootstrap keeps exact TEXT identity, active-owner and single-household validation, lock ordering and reassignment refusal. The actual 04 script is tested twice and for reassignment refusal. All three nonzero counts are independently compared with fixture totals. |
| R3: legacy snapshot parent authorization | Resolved. The guard now requires both active owner membership and a canonical linked parent in the actual OLD family payload. Regression evidence rejects child-bound and unlinked owners and permits the verified parent. The existing restrictions on linked members/other adults remain intact. |
| R4: omitted surname/display identity consistency | Resolved. Structured input is first merged into the member; display name is then derived from the resulting identity with a final length check. The regression verifies omitted surname preservation, matching display name and preservation of unrelated member JSON. |
| R5: active-profile CAS bypass | Resolved. The revised RPC requires a valid expected revision in its active branch, compares against the locked family row and returns 40001 on stale input; omission is rejected. Pending drafts retain the optional revision behavior. The frontend preserves explicitly supplied revisions; the profile form supplies its captured render-state revision. The server tests preserve the newer profile after stale/missing-revision attempts, and frontend tests cover the displayed revision surviving a later context refresh. |

## Focused regression assessment

The temporary creator has CREATEROLE only within the installation transaction and is never granted to a browser role. Its role name is preflight checked. Ownership changes and temporary grants are transactional, so an installation error aborts the privilege setup. Final closure is explicitly asserted by the local test and writer membership/schema CREATE checks in verification. No broad permanent role/policy exception was introduced.

The two maintenance helpers have empty search_path, fully qualified application objects and bounded purposes. The linkage helper intentionally uses installer authorization rather than auth.uid(); it is neither public RPC nor client executable. Its code preserves the v1 human-selection rules and does not edit canonical profiles or membership roles. The helper is a suitable minimal bridge across forced RLS for the documented installer-only operations.

Rollback uses the revised two-argument profile signature and removes the added maintenance helpers plus the only client-callable private assertion helper, in addition to the ten public RPCs, family trigger, public writer policies and grants. This avoids relying on installer inheritance of writer ownership. The updated test exercises rollback as the same representative effective installer and checks preserved data, absent RPCs/helpers, closed private schema access and zero writer memberships. Other private tables/helpers remain inaccessible as documented.

The unchanged invitation, canonical binding, member/magic writer and Missions preservation conclusions from v1 remain applicable. This scoped review found no new regression in those paths from the fixes.

## Evidence and limits

The supplied results record **12 SQL groups passing** on PostgreSQL **17.7**, using a fixture reconstructed from the user's PostgreSQL **17.11** catalog; the correction report and focused native tests record **24 access tests passing**. The runner connects as its local fixture superuser and switches effective role for the managed-installer operations; it asserts the effective role is NOSUPERUSER/CREATEROLE/NOBYPASSRLS and executes the real apply/verify/04/rollback scripts under it. The script's SET ROLE transitions are consistent with the explicit membership grants and return to the captured installer. This is representative local evidence, not a measurement of remote role/schema settings.

Actual remote installer role attributes, schema ACLs and the private Runes guard source remain unavailable. That guard remains an explicitly labelled local stub. Nothing here certifies live Supabase Auth, PostgREST, e-mail flows, private guard behavior or two-account persistence. The reviewed bundle may be handed to the user for the documented manual execution and return of verification results; operational claims must wait for real backend/session evidence. No remote mutation is authorized to agents by this review.
