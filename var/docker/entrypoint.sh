#!/bin/sh
set -eu

CONFIG_PATH="${DRIVEBASE_CONFIG:-/app/config.toml}"

if [[ ! -f "$CONFIG_PATH" ]]; then
  echo "[entrypoint] error: config file not found at $CONFIG_PATH"
  echo "[entrypoint] mount your config.toml with: -v /path/to/config.toml:$CONFIG_PATH"
  exit 1
fi

export DRIVEBASE_CONFIG="$CONFIG_PATH"

echo "[entrypoint] running database migrations..."
bun run /app/packages/db/migrate.ts
echo "[entrypoint] migrations done"

exec supervisord -n -c /etc/supervisord.conf
