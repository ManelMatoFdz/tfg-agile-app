# Despliegue sin AWS y sin dominio propio

Este despliegue publica la aplicacion en un VPS no-AWS con Docker Compose. Caddy sirve el frontend, termina HTTPS y enruta las APIs internas a los cuatro microservicios.

## 1. Preparar el VPS

Crear una maquina Ubuntu 24.04 con al menos 4 vCPU, 8 GB de RAM y 40 GB de disco. En el firewall del proveedor, abrir solo:

- `22/tcp` desde tu IP publica.
- `80/tcp` desde internet.
- `443/tcp` desde internet.

No abrir `8081-8084`, `5432`, `5672` ni `15672`.

## 2. Instalar Docker

Instalar Docker Engine y el plugin de Compose desde el repositorio oficial de Docker para Ubuntu.

Verificar:

```bash
docker --version
docker compose version
```

## 3. Configurar el host temporal

Si la IP publica del VPS es `203.0.113.10`, usar un host temporal como:

```text
kadenza-203-0-113-10.sslip.io
```

Sustituirlo en `.env.prod`.

## 4. Crear secretos

Crear el fichero real a partir del ejemplo:

```bash
cp .env.prod.example .env.prod
chmod 600 .env.prod
```

Cambiar todos los valores `change-me-*`. `JWT_SECRET` debe ser el mismo en todos los servicios y tener al menos 32 bytes.

Actualizar tambien:

```text
APP_HOST=<host-temporal>
RESET_PASSWORD_BASE_URL=https://<host-temporal>/reset-password
AVATAR_PUBLIC_BASE_URL=https://<host-temporal>/api/assets/avatars
GIT_WEBHOOK_BASE_URL=https://<host-temporal>/task-api
```

## 5. Levantar produccion

Validar Compose:

```bash
docker compose --env-file .env.prod -f compose.prod.yml config
```

Construir y arrancar:

```bash
docker compose --env-file .env.prod -f compose.prod.yml build --pull
docker compose --env-file .env.prod -f compose.prod.yml up -d
```

Comprobar estado:

```bash
docker compose --env-file .env.prod -f compose.prod.yml ps
docker compose --env-file .env.prod -f compose.prod.yml logs --tail=100 gateway
```

## 6. Comprobaciones

- Abrir `https://<host-temporal>`.
- Probar registro, login, workspaces, proyectos, epics, tareas y planning poker.
- Confirmar que `https://<host-temporal>/task-api/webhooks/github/{projectId}` es la URL del webhook de GitHub.
- Confirmar que `https://<host-temporal>/api/internal/notifications` devuelve `404` desde internet.

## 7. Backups

Antes de cada despliegue con datos reales, sacar dumps de las cuatro bases de datos y guardarlos fuera del VPS.
