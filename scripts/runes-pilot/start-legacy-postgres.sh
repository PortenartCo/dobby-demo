#!/usr/bin/env bash
set -euo pipefail

# Private, ephemeral PostgreSQL fixture. No external endpoint or argument exists.
[[ $# -eq 0 ]] || { echo 'This fixture accepts no arguments or connection string.' >&2; exit 1; }
[[ -z ${DOCKER_HOST:-} || ${DOCKER_HOST} == unix:///var/run/docker.sock ]] || { echo 'Remote Docker endpoints are forbidden.' >&2; exit 1; }
for fixture_env in DATABASE_URL SUPABASE_DB_URL PGHOST PGPORT PGDATABASE PGSERVICE PGSERVICEFILE DOBBY_RUNES_PG_CONTAINER; do
  [[ -z ${!fixture_env:-} ]] || { echo "Unexpected connection override: $fixture_env" >&2; exit 1; }
done
fixture_container=dobby-runes-v2-legacy-test-20261112
fixture_label=shared-runes-v2-legacy-20261112
fixture_image=postgres@sha256:ff87138949ad9a46f32ff23bd6852b52ce024a13dffe9b4087be98292cdd3b4f
docker() { command docker --host unix:///var/run/docker.sock "$@"; }
if docker inspect "$fixture_container" >/dev/null 2>&1; then
  fixture_info=$(docker inspect "$fixture_container" --format '{{.Name}}|{{index .Config.Labels "org.dobby.task"}}|{{.HostConfig.NetworkMode}}|{{.State.Running}}|{{.Config.Image}}|{{json .HostConfig.PortBindings}}|{{json .HostConfig.Tmpfs}}')
  [[ "$fixture_info" == "/$fixture_container|$fixture_label|none|true|$fixture_image|{}|"* ]] || { echo 'Refusing a fixture with unexpected identity, network, state, image, or ports.' >&2; exit 1; }
  [[ "$fixture_info" == *'"/var/lib/postgresql/data"'* ]] || { echo 'Fixture PostgreSQL data must use tmpfs.' >&2; exit 1; }
else
  docker run --detach --name "$fixture_container" --label "org.dobby.task=$fixture_label" \
    --network none --tmpfs /var/lib/postgresql/data:rw,size=512m --shm-size=128m \
    -e POSTGRES_USER=dobby_legacy_test_admin -e POSTGRES_DB=dobby_runes_legacy_tests \
    -e POSTGRES_PASSWORD=dobby_legacy_isolated_test_only "$fixture_image"
fi
for fixture_attempt in {1..40}; do
  if docker exec "$fixture_container" pg_isready -U dobby_legacy_test_admin -d dobby_runes_legacy_tests >/dev/null 2>&1; then
    docker exec "$fixture_container" psql -X -U dobby_legacy_test_admin -d dobby_runes_legacy_tests -Atc 'select version(), current_database()'
    exit 0
  fi
  sleep 1
done
echo 'The isolated legacy PostgreSQL fixture did not become ready.' >&2
exit 1
