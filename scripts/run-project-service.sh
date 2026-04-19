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

cd project-service
echo "🚀 Arrancando project-service en puerto ${PROJECT_SERVICE_PORT:-8082}..."
mvn spring-boot:run