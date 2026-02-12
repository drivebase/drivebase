#!/usr/bin/env sh
set -eu

if [ "${SKIP_DB_MIGRATIONS:-false}" != "true" ]; then
  echo "Running database migrations..."
  bun run --cwd /app/packages/db migrate
fi

exec supervisord -c /etc/supervisord.conf
