#!/usr/bin/env bash
# Levanta el stack completo para las pruebas E2E:
#   infra (Docker) → 4 microservicios → frontend (preview)
# Los PIDs se guardan en .e2e-pids para que stop-e2e-stack.sh los pueda matar.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PID_FILE="$ROOT/.e2e-pids"

cd "$ROOT"

# ── 1. Cargar .env ────────────────────────────────────────────────────────────
if [ -f .env ]; then
  set -a; source .env; set +a
else
  echo "⚠️  No se encontró .env — copiando desde docs/.env.example"
  cp docs/.env.example .env
  set -a; source .env; set +a
fi
echo "✅ .env cargado"

: > "$PID_FILE"   # crear/vaciar fichero de PIDs

# ── 2. Infraestructura Docker ─────────────────────────────────────────────────
echo "🐳 Levantando infraestructura..."
docker compose -f docs/docker-compose.yml up -d

wait_healthy() {
  local container="$1"
  local elapsed=0
  echo "  ⏳ $container..."
  while [ "$elapsed" -lt 90 ]; do
    status=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "")
    [ "$status" = "healthy" ] && echo "  ✅ $container" && return 0
    sleep 2; elapsed=$((elapsed + 2))
  done
  echo "  ❌ Timeout: $container no alcanzó healthy"
  exit 1
}

wait_healthy agileflow-user-db
wait_healthy agileflow-project-db
wait_healthy agileflow-task-db
wait_healthy agileflow-poker-db
wait_healthy agileflow-rabbitmq

# ── 3. Compilar JARs si no existen ───────────────────────────────────────────
for svc in user-service project-service task-service poker-service; do
  jar=$(ls "$ROOT/$svc/target/"*.jar 2>/dev/null | grep -v original | head -1 || true)
  if [ -z "$jar" ]; then
    echo "📦 Compilando $svc (sin tests)..."
    mvn -q -pl "$svc" package -DskipTests
  fi
done

# ── 4. Arrancar microservicios ────────────────────────────────────────────────
start_jar() {
  local svc="$1"
  local jar
  jar=$(ls "$ROOT/$svc/target/"*.jar | grep -v original | head -1)
  local logfile="/tmp/e2e-${svc}.log"
  echo "🚀 $svc → $jar (log: $logfile)"
  nohup java -jar "$jar" > "$logfile" 2>&1 &
  echo $! >> "$PID_FILE"
}

start_jar user-service
start_jar project-service
start_jar task-service
start_jar poker-service

# ── 5. Esperar /actuator/health ───────────────────────────────────────────────
# Timeout de 240 s por servicio (Spring Boot + DB en frío puede tardar 2-3 min).
# Si el proceso muere antes del timeout, se aborta con diagnóstico.
wait_health() {
  local url="$1"
  local pid="$2"    # PID del proceso java para detectar fallos tempranos
  local elapsed=0
  echo "  ⏳ $url (PID $pid)..."
  while [ "$elapsed" -lt 240 ]; do
    # Abortar si el proceso ya murió
    if ! kill -0 "$pid" 2>/dev/null; then
      echo "  ❌ El proceso $pid terminó antes de estar listo (revisa el log)"
      exit 1
    fi
    response=$(curl -sf "$url" 2>/dev/null || true)
    if echo "$response" | grep -q '"UP"'; then
      echo "  ✅ $url"
      return 0
    fi
    sleep 5; elapsed=$((elapsed + 5))
  done
  echo "  ❌ Timeout 240 s: $url no respondió"
  exit 1
}

# Leer los 4 PIDs del fichero en orden de inserción (compatible bash 3.2/macOS)
IFS=$'\n' read -r PID_USER    _ <<< "$(sed -n '1p' "$PID_FILE")"
IFS=$'\n' read -r PID_PROJECT _ <<< "$(sed -n '2p' "$PID_FILE")"
IFS=$'\n' read -r PID_TASK    _ <<< "$(sed -n '3p' "$PID_FILE")"
IFS=$'\n' read -r PID_POKER   _ <<< "$(sed -n '4p' "$PID_FILE")"

wait_health "http://localhost:${USER_SERVICE_PORT:-8081}/actuator/health/readiness"    "$PID_USER"
wait_health "http://localhost:${PROJECT_SERVICE_PORT:-8082}/actuator/health/readiness" "$PID_PROJECT"
wait_health "http://localhost:${TASK_SERVICE_PORT:-8083}/actuator/health/readiness"    "$PID_TASK"
wait_health "http://localhost:${POKER_SERVICE_PORT:-8084}/actuator/health/readiness"   "$PID_POKER"

# ── 6. Build frontend con URLs directas (sin proxy) y lanzar preview ─────────
echo "🔨 Compilando frontend con URLs directas (modo e2e)..."
cd "$ROOT/frontend"
npx tsc -b && npx vite build --mode e2e

echo "🌐 Iniciando frontend preview en :5173..."
nohup npm run preview -- --port 5173 > /tmp/e2e-frontend.log 2>&1 &
echo $! >> "$PID_FILE"

elapsed=0
echo "  ⏳ http://localhost:5173..."
while [ "$elapsed" -lt 30 ]; do
  curl -sf http://localhost:5173 > /dev/null 2>&1 && echo "  ✅ Frontend listo" && echo "✅ Stack E2E listo" && exit 0
  sleep 1; elapsed=$((elapsed + 1))
done

echo "❌ Timeout: el frontend no respondió en 30s"
exit 1