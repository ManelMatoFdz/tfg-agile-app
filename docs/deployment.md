# Despliegue sin AWS y sin dominio propio

Este despliegue publica la aplicacion en un VPS no-AWS con Docker Compose. Caddy sirve el frontend, termina HTTPS y enruta las APIs internas a los cuatro microservicios.

## 1. Requisitos previos

Antes de construir imagenes de produccion:

- confirmar que el backend pasa `mvn -B verify`
- confirmar que el frontend pasa sus tests
- confirmar que las migraciones Flyway ya forman parte del repositorio

Si vienes de bases locales creadas antiguamente por Hibernate, elimínalas antes de seguir. Con `ddl-auto=validate` el arranque ya no repara esquemas:

```bash
docker compose --env-file docs/.env.example -f docs/docker-compose.yml down -v
```

## 2. Preparar el VPS

Crear una maquina Ubuntu 24.04 con al menos 4 vCPU, 8 GB de RAM y 40 GB de disco. En el firewall del proveedor, abrir solo:

- `22/tcp` desde tu IP publica.
- `80/tcp` desde internet.
- `443/tcp` desde internet.

No abrir `8081-8084`, `5432`, `5672` ni `15672`.

## 3. Instalar Docker

Instalar Docker Engine y el plugin de Compose desde el repositorio oficial de Docker para Ubuntu.

Verificar:

```bash
docker --version
docker compose version
```

## 4. Configurar el host temporal

Si la IP publica del VPS es `203.0.113.10`, usar un host temporal como:

```text
kadenza-203-0-113-10.sslip.io
```

Sustituirlo en `.env.prod`.

## 5. Crear y rellenar `.env.prod`

Crear el fichero real a partir del ejemplo:

```bash
cp .env.prod.example .env.prod
chmod 600 .env.prod
```

Cambiar todos los valores `change-me-*`. `JWT_SECRET` debe ser el mismo en todos los servicios y tener al menos 32 bytes.

Generacion recomendada:

```bash
openssl rand -base64 48
openssl rand -hex 32
```

Asignar asi:

- `JWT_SECRET`: una salida de `openssl rand -base64 48`
- `INTERNAL_API_KEY`: una salida de `openssl rand -hex 32`
- `USER_DB_PASS`, `PROJECT_DB_PASS`, `TASK_DB_PASS`, `POKER_DB_PASS`, `RABBITMQ_PASS`: valores distintos entre si

Variables que debes completar con datos externos:

- SMTP real:
  - `MAIL_ENABLED=true`
  - `SMTP_HOST`
  - `SMTP_PORT`
  - `SMTP_USER`
  - `SMTP_PASS`
  - `SMTP_AUTH`
  - `SMTP_STARTTLS`
- Google OAuth:
  - `GOOGLE_CLIENT_ID`
  - `VITE_GOOGLE_CLIENT_ID`

`VITE_GOOGLE_CLIENT_ID` se inyecta en el build del frontend. Si cambia, hay que reconstruir la imagen del gateway/frontend.

Actualizar tambien:

```text
APP_HOST=<host-temporal>
RESET_PASSWORD_BASE_URL=https://<host-temporal>/reset-password
AVATAR_PUBLIC_BASE_URL=https://<host-temporal>/api/assets/avatars
GIT_WEBHOOK_BASE_URL=https://<host-temporal>/task-api
```

## 6. Configurar proveedores externos

### SMTP

Crear una cuenta SMTP transaccional real, por ejemplo en Brevo, y copiar sus credenciales a `.env.prod`.

Antes del despliegue en el VPS, probar en local el flujo de recuperacion de contraseña con `MAIL_ENABLED=true`.

### Google OAuth

En Google Cloud Console:

- crear o reutilizar un cliente OAuth 2.0 de tipo Web
- añadir `https://<host-temporal>` en los orígenes JavaScript autorizados
- copiar el Client ID a `GOOGLE_CLIENT_ID` y `VITE_GOOGLE_CLIENT_ID`

Si `VITE_GOOGLE_CLIENT_ID` queda vacio, el frontend ocultará el acceso con Google.

## 7. Ensayo completo en local con el stack de produccion

Antes de usar el VPS, probar exactamente el mismo `compose.prod.yml` en local.

Si quieres hacerlo con certificados locales de Caddy, usa una copia de `.env.prod` con:

```text
APP_HOST=localhost
RESET_PASSWORD_BASE_URL=https://localhost/reset-password
AVATAR_PUBLIC_BASE_URL=https://localhost/api/assets/avatars
GIT_WEBHOOK_BASE_URL=https://localhost/task-api
```

Construir y arrancar:

```bash
docker compose --env-file .env.prod -f compose.prod.yml build
docker compose --env-file .env.prod -f compose.prod.yml up -d
```

Recorrido mínimo:

- registro
- login local
- login con Google
- creacion de workspace, equipo y proyecto
- backlog, sprint y tablero
- sesion de Planning Poker con dos navegadores

Comprobaciones extra:

- `https://localhost/api/internal/notifications` debe devolver `404`
- el correo de recuperacion debe llegar si `MAIL_ENABLED=true`

Al terminar:

```bash
docker compose --env-file .env.prod -f compose.prod.yml down -v
```

## 8. Levantar produccion en el VPS

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

Durante el primer minuto puede haber `502` temporales mientras los servicios arrancan.

## 9. Comprobaciones en produccion

- Abrir `https://<host-temporal>`.
- Probar registro, login, workspaces, proyectos, epics, tareas y planning poker.
- Confirmar que `https://<host-temporal>/task-api/webhooks/github/{projectId}` es la URL del webhook de GitHub.
- Confirmar que `https://<host-temporal>/api/internal/notifications` devuelve `404` desde internet.

Si usabas antes webhooks apuntando a ngrok, rehacerlos ahora contra la URL publica final del VPS.

## 10. Backups

Antes de cada despliegue con datos reales, sacar dumps de las cuatro bases de datos y guardarlos fuera del VPS.
