#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

TASK_PORT=${TASK_SERVICE_PORT:-8083}

# Matar cualquier instancia previa
pkill -f "ngrok http" 2>/dev/null || true
sleep 1

echo "🚀 Iniciando ngrok en puerto $TASK_PORT..."
ngrok http "$TASK_PORT" --log=stdout > /tmp/ngrok-task.log 2>&1 &
NGROK_PID=$!

# Esperar a que la API local de ngrok esté disponible
echo "⏳ Esperando a que ngrok arranque..."
for i in $(seq 1 15); do
  sleep 1
  if curl -sf http://localhost:4040/api/tunnels > /dev/null 2>&1; then
    break
  fi
  if [ "$i" -eq 15 ]; then
    echo "❌ ngrok no arrancó en 15s."
    echo "   Si es la primera vez, autentícate con:"
    echo "   ngrok config add-authtoken <tu-token>  (gratis en dashboard.ngrok.com)"
    kill "$NGROK_PID" 2>/dev/null || true
    exit 1
  fi
done

# Esperar a que el túnel esté activo (tunnels puede estar vacío al principio)
PUBLIC_URL=""
for i in $(seq 1 10); do
  sleep 1
  PUBLIC_URL=$(curl -sf http://localhost:4040/api/tunnels | python3 -c "
import sys, json
tunnels = json.load(sys.stdin).get('tunnels', [])
https = [t for t in tunnels if t['proto'] == 'https']
result = (https or tunnels)
print(result[0]['public_url'] if result else '')
" 2>/dev/null || true)
  [ -n "$PUBLIC_URL" ] && break
done

if [ -z "$PUBLIC_URL" ]; then
  echo "❌ No se pudo obtener la URL pública de ngrok."
  kill "$NGROK_PID" 2>/dev/null || true
  exit 1
fi

echo "✅ ngrok activo: $PUBLIC_URL"

# Actualizar GIT_WEBHOOK_BASE_URL en .env
if [ -f .env ]; then
  sed -i '' "s|^GIT_WEBHOOK_BASE_URL=.*|GIT_WEBHOOK_BASE_URL=$PUBLIC_URL|" .env
  echo "✅ .env actualizado → GIT_WEBHOOK_BASE_URL=$PUBLIC_URL"
fi

echo ""
echo "⚠️  Reinicia el task-service para que tome la nueva URL."
echo "Pulsa Ctrl+C para parar ngrok."

trap 'echo ""; echo "🛑 Parando ngrok..."; kill "$NGROK_PID" 2>/dev/null; exit 0' INT TERM
wait "$NGROK_PID"