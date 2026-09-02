#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [ -f .env ]; then
  set -a
  source .env
  set +a
  echo "✅ .env cargado"
else
  echo "⚠️  No se encontró .env — copiando desde docs/.env.example"
  cp docs/.env.example .env
  set -a
  source .env
  set +a
  echo "✅ .env creado y cargado (edita JWT_SECRET si es necesario)"
fi

cd task-service
echo "🚀 Arrancando task-service en puerto ${TASK_SERVICE_PORT:-8083}..."
echo "   GIT_WEBHOOK_BASE_URL=${GIT_WEBHOOK_BASE_URL:-http://localhost:8083}"
mvn spring-boot:run