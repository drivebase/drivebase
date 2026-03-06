#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKUP_FILE="${1:-$ROOT_DIR/backup.sql}"

if [[ -z "${DATABASE_URL:-}" && -f "$ROOT_DIR/.env.local" ]]; then
	set -a
	# shellcheck disable=SC1091
	source "$ROOT_DIR/.env.local"
	set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
	echo "DATABASE_URL is not set" >&2
	exit 1
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
	echo "Backup file not found: $BACKUP_FILE" >&2
	exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
	echo "psql is not installed" >&2
	exit 1
fi

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$BACKUP_FILE"

echo "Restore completed from $BACKUP_FILE"
