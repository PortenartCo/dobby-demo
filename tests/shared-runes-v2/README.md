# Real PostgreSQL tests — shared runes V2

Run only against the labelled local Docker PostgreSQL fixture:

```sh
bash tests/shared-runes-v2/start-isolated-postgres.sh
node tests/shared-runes-v2/run-postgres.mjs
node --test tests/shared-runes-v2/client-postgres.mjs
```

`run-postgres.mjs` checks the exact task label, container-name pattern, `--network none`, absence of exposed ports, and running state **before any reset**. All Docker calls explicitly use `-H unix:///var/run/docker.sock`; a remote `DOCKER_HOST` is refused and a different Docker context cannot choose the endpoint. It accepts no remote DSN. It resets only the fake database `dobby_runes_tests`, applies `bootstrap.sql`, the existing modules baseline and the proposed migration, and restores its logical backup only into `dobby_runes_restore_tests`. The separate client suite owns `dobby_runes_client_tests`. It never accesses a real Supabase project.

The fixture's three UUID users and all households/missions are invented. The bootstrap reproduces the `auth.uid()`/active-membership RLS boundary; it does not test Supabase JWT issuance or a deployed PostgREST server. Every untrusted SQL call connects as the non-superuser, non-BYPASSRLS `dobby_fixture_authenticator`, then assumes `authenticated` or `anon`. It never uses a superuser session for client-role bypass assertions.

The auth `42501` regression proof requires its own container. The historical default stays unchanged; the sole additional allowed suffix is `-auth-42501`, with the separate task label `shared-runes-v2-auth-42501-20261111`. Both the server and native client PostgreSQL harnesses honor this exact fixture selection:

```sh
DOBBY_RUNES_PG_CONTAINER=dobby-runes-v2-test-20261111-auth-42501 bash tests/shared-runes-v2/start-isolated-postgres.sh
DOBBY_RUNES_PG_CONTAINER=dobby-runes-v2-test-20261111-auth-42501 node tests/shared-runes-v2/auth-42501.mjs
```

This test refuses the historical container before any reset. It installs the original modules and Runes SQL immutably from Git commit `0a8e1ed`, creates fictional historical credits and receipts, then removes both `auth` schema usage and effective `auth.uid()` execution from the writer. It proves the original `42501`, applies only `sql-proposals/dobby-shared-runes-v2-auth-42501.sql`, and verifies atomic rollback, refusal of unexpected installations, idempotence, unchanged existing data and grants, modern claim validation, native writes and replay, the invoker stamp, all five other modules, RLS and the direct-write guard. Its evidence is written separately to `docs/dobby-v7/evidence/shared-runes-v2/auth-42501/results.json`.

The fixture's `auth.uid()` uses the official legacy/JSON `COALESCE` shape. Normal test requests supply both settings; the dedicated test deliberately contradicts them to prove the writer uses only modern `request.jwt.claims.sub` while ordinary modules retain their existing `auth.uid()` behavior. These are trusted synthetic SQL session claims for the fixture; JWT signature verification by PostgREST remains outside this test.

The server suite uses the native runes core to construct requests and calculate expected balances. Concurrent scenarios use separate `psql` connections, distinct PostgreSQL PIDs, a controller transaction holding a row lock, and `pg_stat_activity`/`pg_locks` barriers. They assert one CAS success/one `40001`, then rebase the losing intent. The injected rollback failure is an isolated fixture trigger on receipt insertion; no production RPC failure hook is added.

Evidence is written to `docs/dobby-v7/evidence/shared-runes-v2/postgres/results.json` and `concurrency.json`. `DOBBY_RUNES_FAIL_FAST=1` is available for local debugging; omit it for the complete report. A red result is a failure, never an automatic skip. The suite does not stop or delete the container and does not publish, commit or push anything.

To retain the original evidence and write this correction's historical regression results separately:

```sh
DOBBY_RUNES_PG_CONTAINER=dobby-runes-v2-test-20261111-auth-42501 DOBBY_RUNES_PG_EVIDENCE=docs/dobby-v7/evidence/shared-runes-v2/auth-42501/postgres node tests/shared-runes-v2/run-postgres.mjs
DOBBY_RUNES_PG_CONTAINER=dobby-runes-v2-test-20261111-auth-42501 DOBBY_RUNES_CLIENT_EVIDENCE=docs/dobby-v7/evidence/shared-runes-v2/auth-42501/client-postgres node --test tests/shared-runes-v2/client-postgres.mjs
```

Run these database suites sequentially. The dedicated correction test demonstrates the installed-baseline → hotfix-only path. The historical suites separately exercise the corrected reference on fresh fictional installations; they never reapply a migration to the hosted project.

## Exact LF/CRLF regression proof

The SQL hotfix body checks normalize only CRLF to LF. The supplied real stamp body is kept verbatim in `fixtures/dobby_v2_modules_stamp_prosrc_LF.txt`; its SHA-256 must equal `66ebec0137d31429243d4ae6bafa21788cef3c2315e18059acb5e1f44744c4d0` before any fixture installation. Other formatting changes remain forbidden unless explicitly pinned.

Run sequentially on the correction's own labelled fixture:

```sh
DOBBY_RUNES_PG_CONTAINER=dobby-runes-v2-test-20261111-auth-42501 node tests/shared-runes-v2/auth-42501-eol.mjs
DOBBY_RUNES_PG_CONTAINER=dobby-runes-v2-test-20261111-auth-42501 DOBBY_RUNES_AUTH_EVIDENCE=docs/dobby-v7/evidence/shared-runes-v2/auth-42501/eol/regression/auth-42501 node tests/shared-runes-v2/auth-42501.mjs
DOBBY_RUNES_PG_CONTAINER=dobby-runes-v2-test-20261111-auth-42501 DOBBY_RUNES_PG_EVIDENCE=docs/dobby-v7/evidence/shared-runes-v2/auth-42501/eol/regression/postgres node tests/shared-runes-v2/run-postgres.mjs
DOBBY_RUNES_PG_CONTAINER=dobby-runes-v2-test-20261111-auth-42501 DOBBY_RUNES_CLIENT_EVIDENCE=docs/dobby-v7/evidence/shared-runes-v2/auth-42501/eol/regression/client-postgres node --test tests/shared-runes-v2/client-postgres.mjs
```

The evidence directory override keeps the previous 80-test proof intact. The standalone hotfix, its after-install checks, and the real supplied variant are covered locally; no hosted Supabase call is made.
