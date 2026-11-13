# DOBBY V7 Auth schema fallback — independent review

Result: PASS for the frozen manual SQL package below. No remote Supabase action was performed. Real account authentication, invitation acceptance and synchronization remain to be tested by the user after applying the package.

## Exact scope and security

The application helper actor is recreated as SECURITY INVOKER, owned by the existing private-schema owner. It reads the same trusted request subject expression as a recognized canonical auth.uid implementation and rejects missing identity. It does not execute with its new owner's privileges. Its EXECUTE ACL remains limited to that owner and the closed V7 writer. All existing public V7 SECURITY DEFINER RPCs remain owned by dobby_v7_writer.

The stamp adds one branch for current_user=dobby_v7_writer that calls the private actor helper. The existing Missions branch and ordinary authenticated branch remain unchanged. Stamp OID, owner, ACL and execution properties are preserved. The repair deliberately changes the stamp body hash from 81320b020efdd9c11fc8a2b0e9cb692a to 6e2372696dc78db3a039342f66feadcf.

No Auth schema privilege, role membership, RLS policy, account, household or table data is changed by the repair. A prior draft's malformed JSON case matrix was identified and fixed before the successful tests.

## Independent local evidence

Tests ran on PostgreSQL 17.7 in a dedicated Docker container with network=none and no published ports. The installer was NOSUPERUSER/CREATEROLE, could not SET the writer and could not grant Auth schema USAGE. The initial actor and stamp definitions exactly matched the user's observed MD5 hashes ca66dec1067c5cb1a77139730dcf2d9c and 81320b020efdd9c11fc8a2b0e9cb692a. An authenticated context request reproduced the original Auth schema permission denial.

Thirteen behavior groups passed: no table-data changes from migration; legacy/JSON subjects and priority; malformed JSON short circuit; missing, malformed and metadata-only identity rejection; private-helper denial for anon/authenticated/service_role; unchanged closed writer permissions; profile and household creation; bound profile CAS update and stamp attribution; protected snapshot refusal; ordinary native module stamping; original Missions stamping; verification after writes; and rollback with all created fixture data retained.

A separate brand-new psql connection introduced only request.jwt.claims JSON, with no legacy subject GUC ever set. Context lookup and a permitted profile write both passed.

The final frozen apply script accepted uppercase SQL keywords in a canonical helper but rejected a changed quoted JSON key 'SUB' before DDL, preserving actor OID and definition. Final verification returned correct aggregate context phases and no SQLSTATE errors, preserved all nine table fingerprints, and restored both preexisting nonempty SQL Editor session claim settings. The local installer inherited authenticated to model the standard hosted postgres role; the V7 writer retained zero memberships and no Auth schema USAGE. callerCanExecuteContext makes this entrypoint requirement explicit.

The unchanged rollback script restored both original function body hashes and returned the original Auth schema failure, while preserving all local test data. It correctly reports that the actor remains owned by the installer as SECURITY INVOKER: original writer ownership cannot be restored without unavailable SET/ADMIN privileges.

## Evidence and limits

- behavior-results.json / behavior.log: 13 behavioral groups against unchanged resulting actor/stamp code and exact rollback.
- json-only-fresh-connection.json: modern PostgREST claim layout in a fresh connection.
- final-results.json / final-apply.log / final-verify.log: exact final artifacts and read-only checks.
- final/: frozen copies of the reviewed SQL package.

These tests do not certify the real private Missions guard, whose supplied local fixture is explicitly a defensive stub. Its real function is left unchanged. They do not validate an API key, a signed JWT, a password, e-mail delivery, a browser session or the hosted database mutation. SQL verification must not be described as real Auth/API success.

## Frozen SHA256

- 11-apply-auth-schema-fallback.sql: 89ad617b164b6b94a6751da7ba6e6ee2d9a7eaf6a03206ad50b9083324692cc6
- 12-verify-auth-schema-fallback.sql: 16632c0de4d65ea314cb82f09b899cb0747f91bbc228593d0b67a49e33503cc2
- 13-rollback-auth-schema-fallback.sql: 8c7b6a7505c84614f0d95cb640bca2362acaf40c4b6fbc8f16e944ba21d73266
