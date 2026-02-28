#!/usr/bin/env bash
set -euo pipefail

# Load .env if present. Otherwise defaults are used.
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

USER_DB_USER="${USER_DB_USER:-user}"
USER_DB_PASS="${USER_DB_PASS:-user}"
USER_DB_NAME="${USER_DB_NAME:-userdb}"

PROJECT_DB_USER="${PROJECT_DB_USER:-project}"
PROJECT_DB_PASS="${PROJECT_DB_PASS:-project}"
PROJECT_DB_NAME="${PROJECT_DB_NAME:-projectdb}"

echo "== Checking Docker containers =="
docker ps --format "{{.Names}}" | grep -E "agileflow-user-db|agileflow-project-db" >/dev/null || {
  echo "DB containers not running. Run: docker compose up -d"
  exit 1
}

echo "== Checking user-db connection =="
PGPASSWORD="$USER_DB_PASS" psql "host=localhost port=5433 user=$USER_DB_USER dbname=$USER_DB_NAME" \
  -v ON_ERROR_STOP=1 -c "SELECT 1;" >/dev/null

echo "== Checking project-db connection =="
PGPASSWORD="$PROJECT_DB_PASS" psql "host=localhost port=5434 user=$PROJECT_DB_USER dbname=$PROJECT_DB_NAME" \
  -v ON_ERROR_STOP=1 -c "SELECT 1;" >/dev/null

echo "✅ dev-check passed"