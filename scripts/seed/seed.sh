#!/usr/bin/env bash
# ============================================================================
#  AgileFlow — carga de datos de demo en las cuatro bases de datos.
#
#  Borra TODOS los datos existentes salvo el usuario `darkoclemente`
#  (id ca8bb86d-46e6-44ed-9f77-4e841be4de8a) y su sesion activa.
#
#  Uso:  ./scripts/seed/seed.sh
#  Requisitos: los contenedores de las cuatro bases de datos deben estar en marcha.
# ============================================================================
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

run() {
  local container="$1" dbuser="$2" dbname="$3" file="$4"
  echo "→ ${file}  →  ${dbname}"
  docker exec -i "$container" psql -v ON_ERROR_STOP=1 -q -U "$dbuser" -d "$dbname" < "${DIR}/${file}"
}

echo "Cargando datos de demo…"

run agileflow-user-db    user    userdb    01_userdb.sql
run agileflow-project-db project projectdb 02_projectdb.sql
run agileflow-task-db    task    taskdb    03_taskdb_base.sql
run agileflow-task-db    task    taskdb    04_taskdb_tasks_p1.sql
run agileflow-task-db    task    taskdb    05_taskdb_tasks_rest.sql
run agileflow-task-db    task    taskdb    06_taskdb_relations.sql
run agileflow-task-db    task    taskdb    07_taskdb_git.sql
run agileflow-poker-db   poker   pokerdb   08_pokerdb.sql

echo
echo "Hecho. Usuarios de demo: contrasena 'Password123!' (p. ej. laura.vidal@agileflow.dev)."
echo "El usuario darkoclemente conserva su contrasena original."