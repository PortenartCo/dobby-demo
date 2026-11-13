# DOBBY V7 invitation resumption — independent review

Result: PASS for the source hashes below. No remaining review blockers.

The user's aggregate database diagnostic confirms that two distinct profiles are bound to two active accounts in the same household. The original native adoption failure remains unidentified. The UI patch addresses the verified local routing trap after an invitation was consumed; it does not claim to repair every possible native binding failure.

## Security and state integrity

Recovery is offered only from an invalid or expired invitation while a native user identifier exists. It performs a fresh account context/binding check and requires phase active, authenticated=true, verified=true, a household and a canonical member. An invalid invitation or cached profile never grants identity. The user captured before refresh must still match after refresh. A full account/household/member tuple is then guarded inside the atomic pending-metadata transaction and again after that transaction before routing.

Pending cleanup compares both the token and its owner. A newer token or another account's same token survives. Account-change subscription cleanup captures the previous owner and clears old in-memory invitation state before its asynchronous transaction. Its later completion cannot clear a new owner's in-memory state. A related initialization read-then-blind-clear race found during review was corrected to use the same compare-and-clear helper.

The recovery action never calls acceptInvitation, creates no profile or household, and performs no reset. It uses the existing destination rules after verified resumption. Valid invitations for another household retain their explicit acceptance path. The three new local-error references compare exact existing application guard messages and emit fixed safe text; raw server messages, identities and tokens are not displayed.

## Verification

Independent Chrome 157.0.8103.50 run: all 23 access regression cases pass against the pinned source, with no page errors or live backend calls. Coverage includes a committed acceptance followed by failed native adoption, recovery without replay, incomplete/unverified states, ownership and token replacement during compare-and-clear, account changes during refresh and metadata commit, preserved valid invitations, and initialization cleanup races.

An additional scratch-only browser case delayed old account A's subscription cleanup, let account B submit the very same token, and then released A's old transaction. Both B's persisted token and private in-memory token survived another invitation-screen render.

The first account-switch fixture jumped directly to an already verified replacement account and observed that replacement account's independent root navigation. It was corrected to model native installSession's actual withdrawal of household/member authority before verification; the corrected tests retain the actor-switch and pending-token assertions. No production permission guard was weakened.

Evidence: final-all.log, review-results.json, final-focused.log, and independent-race.log in this directory. git diff --check passes.

## Limits

These browser outcomes use declared local fixtures. They do not certify that the user can complete the newly published recovery action or subsequent real synchronization and reconnection. A persistent local-data guard still refuses binding safely and now has a specific support reference. The existing backend, native writers and binding/adoption implementation are unchanged.

## SHA256

- essai-stitch-v7/access.js: 182083cbe1eb50025d892befddee8d1bfb8e573c37b73854f31e2e2c81b1e7d1
- essai-stitch-v7/tests/stitch-access-races.cjs: 58df8562d3fbc4567e5c52592899ad0e6d2e38cce1431985222e0350166fe32a
