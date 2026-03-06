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

if ! command -v pg_dump >/dev/null 2>&1; then
	echo "pg_dump is not installed" >&2
	exit 1
fi

mkdir -p "$(dirname "$BACKUP_FILE")"

pg_dump "$DATABASE_URL" \
	--data-only \
	--inserts \
	--column-inserts \
	--table=public.users \
	--table=public.workspaces \
	--table=public.workspace_memberships \
	--table=public.workspace_invites \
	--table=public.storage_providers \
	--table=public.oauth_provider_credentials \
	--file="$BACKUP_FILE"

echo "Backup written to $BACKUP_FILE"
