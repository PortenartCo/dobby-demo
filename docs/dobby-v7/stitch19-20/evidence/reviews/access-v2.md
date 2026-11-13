# Native access integration scoped re-review — PASS

Reviewed immutable v2 tree `e945a004bb6e957bf6ae4be35ed248fe10f5c268`, base `0f3131f3deb1ff63f3accca9c591521b04f4f212`, using `since-v1.diff` and the copied source. Scope: both v1 findings, their regression coverage, and the new exact-reversal native access preservation fixture. Unchanged access code retains the v1 review result. No backend calls, mutations or production edits were performed in this review.

## Findings resolved

- **V1 P2, family registries:** `family-modules.js:761` now invokes the native `verifyFamilyProtocol` before applying a snapshot. A missing/unsupported acknowledged protocol enters the existing `familyConflict` path, preserves local arrays and acknowledged revision/digest/protocol flags, and rejects adoption. The access controller consequently does not publish a verified member binding. The incoming snapshot also retains remembered opaque fields through the existing merge convention.
- **V1 P3, password mismatch:** signup at `access.js:154` and recovery at `access.js:222` now clear confirmation custom validity when either password input changes. The provided browser logs reproduce both failures before the fix and pass both cases afterward using local Auth fixtures.

No new concrete regression was found in these scoped changes.

## Verification

- Independently executed **82/82 passing tests** covering access controller/native facade/adoption, access routes, existing shared memos and preparation synchronization.
- The four added adoption tests retain the original three tests and assert actual preservation of arrays, metadata, pending edits, opaque fields on the next CAS write, zero remote writes on rejection, and withdrawal of verified identity. No assertions were weakened to accommodate the fix.
- Independently reversed the fixture's **seven exact native access amendments**. Every `after` block occurs exactly once; reversing them restores `family-v2.js` byte-for-byte to the immutable Git base. Restored SHA-256: `05f4ffd7fcd7637bac3e207a78be2060ac3906d627dcf137aa79c72a591521e9`. The existing PREP normalization produces `72367aeb8b763502538e590de442d1d1271869dee2c632574f35a074f7cfff63`, matching the unchanged preservation baseline.
- The three transverse preservation tests pass when the snapshot's omitted review-support files are supplied read-only from the immutable base. Running directly from the partial snapshot passes two tests and stops the preservation test on missing `scripts/review/global-demo.js`; this is an extraction limitation, not an observed source failure.
- Inspected the reported full native unit log: **282 passed, zero failed**. This larger sweep was supplied evidence, not independently repeated here.

The supplied anonymous live GET evidence shows denial of context/module access, rejection of an invalid invitation, and private-schema inaccessibility. It does not verify authenticated accounts or invitation acceptance. Real account creation, recovery, household creation and invitations remain unverified; this scoped PASS does not certify operational readiness or deployment.

## Subsequent scoped Auth cleanup addendum

The later pending-flow cleanup and atomic native metadata integration are reviewed separately in [`../stitch19-20-auth-cleanup-review/ACCESS-REVIEW.md`](../stitch19-20-auth-cleanup-review/ACCESS-REVIEW.md): **PASS**. An initially identified pointer cleanup race was reproduced with two failing serialized-transaction tests, fixed through native atomic `updateMeta`, and verified with **51/51** focused tests and **3/3** transverse preservation tests. That addendum records exact final file hashes; it does not change this immutable v2 tree identifier.
