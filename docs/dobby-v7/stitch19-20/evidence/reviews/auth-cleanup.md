# Auth pending-flow cleanup addendum — PASS

Scoped review of pending-flow cleanup and consumption, with its native metadata integration, taken from the working tree on 2026-11-12. The final reviewed files are copied under `final-consumption/` in this directory; `final/` retains the earlier cleanup-only candidate. No remote calls or production edits were performed. The reviewer added only the authorized local unit regression tests.

Final SHA-256 identifiers:

| File | SHA-256 |
| --- | --- |
| `family-access.mjs` | `e6a4b41a21291441aed4b98197a8ffeb56fdb9a06cc852baa54c352320a157b1` |
| `family-v2.js` | `ff30185b2c7364703e1550d052a1c530113f09a5e864b6b429a8c86b9b8a34a9` |
| `tests/family-access.test.mjs` | `e80dc7b4a5cb326f2660536d349df46d971d80e2233b9bb4b583098c1b1b17ab` |
| `tests/fixtures/stitch19-20-access-extensions.json` | `36d6346045fa4a13dacabd130755128bf5e29f48149f55088af08b3056081fc8` |

The sequential stale-confirmation bug is fixed: successful ordinary login clears its captured pending flow; a failed login retains it; explicit logout cancels it. The two supplied failing tests before the change and 49 passing focused tests afterward support those paths.

## Resolved P2 — Initial cleanup candidate could erase a newer email-flow pointer

The initial candidate (controller SHA-256 `cefeb7bcf7c3aee888abee2b959854bee3f54e1e42c7159bc2316f0ee2c67ce1`) read the pending pointer and later deleted it with a separate `delMeta` operation at line 54. A newer pending-flow write could commit between those IndexedDB transactions.

Reproduced independently with local driver fixtures, without remote calls:

1. Seed recovery flow A; begin successful ordinary login (also reproduced during logout).
2. Pause cleanup after the final pending-pointer read captures A.
3. Complete a newer recovery flow B in the same browser metadata namespace.
4. Resume cleanup. The captured value still matches A, so the unconditional pending-pointer deletion removes B.

Observed result: B's verifier record survives, but `v7-auth-pending` is absent. B's callback fails with `Confirmation introuvable dans ce navigateur`, because confirmation requires the pointer.

The final code now compares and clears atomically through the existing native `updateMeta` read/write transaction. It replaces the pending row with `null` only when its ID still matches, then removes only the captured verifier. `family-v2.js` exposes the existing `updateMeta` function to this controller; no second state store was introduced.

Two new regression cases exercise both successful ordinary login and logout with serialized metadata transactions. They hold recovery B's pending write, queue that write after cleanup's final legacy pointer read or atomic transaction, and then complete cleanup. Both fail on the initial candidate and pass on the atomic fix. They assert B's pointer and verifier survive and perform B's subsequent callback exchange successfully. This covers transaction ordering rather than only a preexisting newer pointer.

## Resolved P2 — Callback and immediate-signup consumption used separate pointer deletions

The cleanup-only candidate still deleted the pointer directly in `confirmFromURL` and the immediate authenticated signup branch. Two additional serialized-transaction races confirmed that recovery B could replace A between A's verifier deletion and its pointer deletion, yet A would erase B and install its superseded session.

The final helper returns whether its atomic comparison matched the captured flow. Callback consumption (`family-access.mjs:82`) and immediate signup (`family-access.mjs:71`) now require a matching result before installing the session. Ordinary password login and logout preserve a newer pointer while still completing their explicit operation. A source audit confirms no direct `v7-auth-pending` deletion remains: all pending-pointer consumption uses the native atomic helper.

Both added races fail on the prior candidate and pass on the final source. They require rejection of A without installing its session, retention of B's matching pointer/verifier, a sanitized callback error URL, and successful subsequent callback exchange for B.

Verification performed independently:

- Cleanup race regressions: **2 RED → 2 GREEN**, logs `stitch-auth-pending-race-red.log` and `stitch-auth-pending-race-green.log` in `/workspace/scratch`.
- Consumption race regressions: **2 RED → 2 GREEN**, logs `stitch-auth-consumption-race-red.log` and `stitch-auth-consumption-race-green.log` in `/workspace/scratch`.
- Controller, native facade, adoption and access-flow tests: **53/53 PASS**, including all four race regressions, log `/workspace/scratch/stitch-auth-consumption-review-focused.log`.
- Transverse preservation checks, including the seven exact native access amendments: **3/3 PASS**. The fixture still restores the unchanged base preservation hash after reversing the bounded amendments.

No unresolved finding remains in this scoped cleanup change.

Unchanged v2 integration review remains PASS within its documented scope. This addendum does not certify real accounts, invitations, or deployment.
