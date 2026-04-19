#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

# Cargar .env como variables de entorno
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

cd user-service
echo "🚀 Arrancando user-service en puerto ${USER_SERVICE_PORT:-8081}..."
mvn spring-boot:run
