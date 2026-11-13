# DOBBY V7 visible logout — independent review

Result: PASS for the source hashes below. No remaining review blockers.

The top profile action is outside collapsed settings and is available whenever either native account-access state or native connection state contains a user identifier. It is therefore available even when household/profile verification has failed. The action does not infer account identity from a local member, magical profile or parental role.

The new handler reuses the existing serialized access runner and native account logout. It locks the entire current profile main element while pending. A small loggingOut flag suppresses only competing subscriber navigation while native logout and its pending-flow cleanup complete; identity withdrawal and owner-scoped invitation cleanup remain enabled. After awaiting native logout, both native connection state and account-access state must have no user before the handler routes to the welcome screen. A newly installed native session cannot be misreported as logged out.

There is no fresh membership/network-verification gate before logout, no new native/backend implementation, no cache reset, and no blind deletion of authentication-flow pointers. The unchanged native path deletes the stored session, withdraws its context/permissions and resets in-memory providers while preserving persistent items, module metadata, device household identity and family local data. Existing controller compare-and-clear logic owns pending PKCE cleanup.

## Independent verification

Chrome 157.0.8103.50, declared local UI fixtures only:

- Visible top action logs out a verified member and preserves cached family members and magical choices.
- An unverified native user can also log out through the same visible action.
- Delayed native logout serializes repeated activation and retains cached members.
- A newer native session appearing after the old access controller reports signed-out prevents welcome navigation and displays the fixed account-change message.
- A thrown logout error remains inline, preserves the current account, re-enables the action and does not expose raw provider text, an address or a token.

All five checks pass with no page exceptions or live backend calls. The first three reuse the repository's new UI regression cases; the latter two are independent scratch-only negative cases. git diff --check passes. The producer separately owns the full access campaign and broader CI.

## Limits

The user has already confirmed real ceremonies and two-way grocery synchronization before this change. This review does not certify the new button's hosted execution or the final real logout/reconnection journey; those still require the user's acceptance test after deployment. The static site's existing asset URLs are reused, so the release instructions should request a hard reload before looking for the new action.

## SHA256

- essai-stitch-v7/access.js: dd0fefae02e58ab73846960979b8dded3562adb5067301b6bc25f00b2e619d59
- essai-stitch-v7/magic-profile.js: 64c2e45a394f390b6caf0e9e5715f5010e93eaa89332136c09183adae1df5fac
- essai-stitch-v7/tests/stitch-access-races.cjs: d6004146adba32dfe11fc1fd6e893983d772cf9b53b011944c846f6daf57b26a
