#!/usr/bin/env bash
set -euo pipefail

# Ignore any remote Docker context configured in the developer's environment.
docker() { command docker --host unix:///var/run/docker.sock "$@"; }

# This script can only create/check this task's ephemeral local fixture.
fixture_container=dobby-runes-v2-test-20261111
fixture_image=postgres@sha256:ff87138949ad9a46f32ff23bd6852b52ce024a13dffe9b4087be98292cdd3b4f
if docker inspect "$fixture_container" >/dev/null 2>&1; then
  fixture_label=$(docker inspect "$fixture_container" --format '{{index .Config.Labels "org.dobby.task"}}')
  fixture_network=$(docker inspect "$fixture_container" --format '{{.HostConfig.NetworkMode}}')
  fixture_running=$(docker inspect "$fixture_container" --format '{{.State.Running}}')
  fixture_existing_image=$(docker inspect "$fixture_container" --format '{{.Config.Image}}')
  if [[ "$fixture_label" != shared-runes-v2-20261111 || "$fixture_network" != none || "$fixture_running" != true || "$fixture_existing_image" != "$fixture_image" ]]; then
    echo 'Refusing to reuse a container outside the exact isolated test fixture.' >&2
    exit 1
  fi
else
  docker run --detach --name "$fixture_container" \
    --label org.dobby.task=shared-runes-v2-20261111 \
    --network none --tmpfs /var/lib/postgresql/data:rw,size=512m --shm-size=128m \
    -e POSTGRES_USER=dobby_test_admin -e POSTGRES_DB=dobby_runes_tests \
    -e POSTGRES_PASSWORD=dobby_isolated_test_only "$fixture_image"
fi
for fixture_attempt in {1..40}; do
  if docker exec "$fixture_container" pg_isready -U dobby_test_admin -d dobby_runes_tests >/dev/null 2>&1; then
    docker exec "$fixture_container" psql -X -U dobby_test_admin -d dobby_runes_tests -Atc 'select version(), current_database()'
    exit 0
  fi
  sleep 1
done
echo 'Isolated PostgreSQL failed to become ready.' >&2
exit 1
