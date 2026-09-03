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
  echo "✅ .env creado y cargado"
fi

cd poker-service
echo "🚀 Arrancando poker-service en puerto ${POKER_SERVICE_PORT:-8084}..."
mvn spring-boot:run