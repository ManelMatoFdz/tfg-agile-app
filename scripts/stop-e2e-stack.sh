#!/usr/bin/env bash
# Para todos los procesos arrancados por run-e2e-stack.sh y elimina los volúmenes
# Docker para que el siguiente build empiece desde cero.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PID_FILE="$ROOT/.e2e-pids"

echo "🛑 Parando servicios..."
if [ -f "$PID_FILE" ]; then
  while read -r pid; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" && echo "  Killed PID $pid" || true
    fi
  done < "$PID_FILE"
  rm -f "$PID_FILE"
else
  echo "  (Sin fichero de PIDs — nada que matar)"
fi

echo "🐳 Parando infraestructura y eliminando volúmenes..."
docker compose -f "$ROOT/docs/docker-compose.yml" down -v

echo "✅ Stack parado y volúmenes eliminados"