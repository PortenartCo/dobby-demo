# Real PostgreSQL tests — shared runes V2

Run only against the labelled local Docker PostgreSQL fixture:

```sh
bash tests/shared-runes-v2/start-isolated-postgres.sh
node tests/shared-runes-v2/run-postgres.mjs
node --test tests/shared-runes-v2/client-postgres.mjs
```

`run-postgres.mjs` checks the exact task label, container-name pattern, `--network none`, absence of exposed ports, and running state **before any reset**. All Docker calls explicitly use `-H unix:///var/run/docker.sock`; a remote `DOCKER_HOST` is refused and a different Docker context cannot choose the endpoint. It accepts no remote DSN. It resets only the fake database `dobby_runes_tests`, applies `bootstrap.sql`, the existing modules baseline and the proposed migration, and restores its logical backup only into `dobby_runes_restore_tests`. The separate client suite owns `dobby_runes_client_tests`. It never accesses a real Supabase project.

The fixture's three UUID users and all households/missions are invented. The bootstrap reproduces the `auth.uid()`/active-membership RLS boundary; it does not test Supabase JWT issuance or a deployed PostgREST server. Every untrusted SQL call connects as the non-superuser, non-BYPASSRLS `dobby_fixture_authenticator`, then assumes `authenticated` or `anon`. It never uses a superuser session for client-role bypass assertions.

The server suite uses the native runes core to construct requests and calculate expected balances. Concurrent scenarios use separate `psql` connections, distinct PostgreSQL PIDs, a controller transaction holding a row lock, and `pg_stat_activity`/`pg_locks` barriers. They assert one CAS success/one `40001`, then rebase the losing intent. The injected rollback failure is an isolated fixture trigger on receipt insertion; no production RPC failure hook is added.

Evidence is written to `docs/dobby-v7/evidence/shared-runes-v2/postgres/results.json` and `concurrency.json`. `DOBBY_RUNES_FAIL_FAST=1` is available for local debugging; omit it for the complete report. A red result is a failure, never an automatic skip. The suite does not stop or delete the container and does not publish, commit or push anything.
