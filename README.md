# TFG Agile App

## Dev environment

### 1) Create local env file
```bash
cp docs/.env.example .env
```

### 2) Start databases (Docker)
```bash
docker compose -f docs/docker-compose.yml --env-file .env up -d
```

### 3) Run services (each in a separate terminal)

**user-service** (port 8081)
```bash
set -a && source .env && set +a && cd user-service && mvn spring-boot:run
```

**project-service** (port 8082)
```bash
set -a && source .env && set +a && cd project-service && mvn spring-boot:run
```

**task-service** (port 8083)
```bash
set -a && source .env && set +a && cd task-service && mvn spring-boot:run
```

**poker-service** (port 8084)
```bash
set -a && source .env && set +a && cd poker-service && mvn spring-boot:run
```

**frontend** (port 5173)
```bash
cd frontend && npm run dev
```

### Ports summary

| Service         | Port |
|-----------------|------|
| user-service    | 8081 |
| project-service | 8082 |
| task-service    | 8083 |
| poker-service   | 8084 |
| frontend        | 5173 |
| user-db         | 5433 |
| project-db      | 5434 |
| task-db         | 5435 |
| poker-db        | 5436 |
| RabbitMQ        | 5672 / 15672 |

### Flyway note for local databases

El backend ya no crea ni actualiza el esquema con Hibernate en arranque. Ahora usa Flyway y valida el esquema con `ddl-auto=validate`.

Si vienes de una base local antigua creada con `ddl-auto=update`, recréala antes de arrancar otra vez:

```bash
docker compose --env-file docs/.env.example -f docs/docker-compose.yml down -v
docker compose --env-file docs/.env.example -f docs/docker-compose.yml up -d
```

## Backend tests

Maven queda separado en dos niveles:

- `mvn test`: solo unitarias (`*Test.java`, Surefire)
- `mvn verify`: unitarias + integración (`*IT.java`, Failsafe)

Los tests de integración levantan PostgreSQL con Testcontainers en los cuatro microservicios y RabbitMQ adicionalmente en `user-service`.
Ahora mismo hay 12 clases `*IT.java`:

- `user-service`: repositorio + cola RabbitMQ/notificaciones internas
- `project-service`: repositorio + endpoints internos + contrato HTTP con `user-service` vía WireMock
- `task-service`: repositorio + webhook GitHub + contrato HTTP con `project-service` y `user-service` vía WireMock
- `poker-service`: repositorio + flujo REST/STOMP + contratos HTTP con `project-service`, `user-service` y `task-service` vía WireMock

## Frontend tests

```bash
cd frontend
npm run test
npm run test:ci
npm run test:coverage
```

`npm run test:coverage` genera `frontend/coverage/lcov.info`, que es el informe usado por SonarQube.
`npm run test:ci` genera además `frontend/junit.xml`, que Jenkins puede mostrar en “Test Result”.

## SonarQube

### 1) Arrancar SonarQube en local

```bash
docker run -d --name sonarqube -p 9000:9000 sonarqube:community
```

Accede a `http://localhost:9000`, entra con `admin/admin` y genera un token.

### 2) Analizar backend

Desde la raíz del proyecto:

```bash
mvn clean verify sonar:sonar \
  -Dsonar.host.url=http://localhost:9000 \
  -Dsonar.token=$SONAR_TOKEN \
  -Dsonar.projectKey=tfg-agile-app-backend
```

JaCoCo publica cobertura de unitarias e integración para `user-service`, `project-service`, `task-service` y `poker-service`.

El informe HTML unificado del backend se genera en `coverage-aggregate/target/site/jacoco-aggregate/index.html`, y SonarQube consume el XML agregado `coverage-aggregate/target/site/jacoco-aggregate/jacoco.xml`.

### 3) Analizar frontend

```bash
cd frontend
npm run test:coverage
sonar-scanner \
  -Dsonar.host.url=http://localhost:9000 \
  -Dsonar.token=$SONAR_TOKEN
```

La configuración del frontend está en [frontend/sonar-project.properties](/Users/porterodarkoa/Documents/IG/4º/TFG/tfg-agile-app/frontend/sonar-project.properties).

## Jenkins

El pipeline versionado está en [Jenkinsfile](/Users/porterodarkoa/Documents/IG/4º/TFG/tfg-agile-app/Jenkinsfile).

Flujo del pipeline:

- `mvn -B test`
- `mvn -B verify -Dskip.unit.tests=true`
- `frontend/npm run test:ci`
- `frontend/npx playwright test`
- análisis Sonar del backend
- análisis Sonar del frontend

El stage de backend archiva además el informe JaCoCo agregado del módulo `coverage-aggregate`.

Resultados visibles en Jenkins:

- backend unitario e integración: publicados como JUnit
- frontend Jest: `frontend/junit.xml`
- frontend E2E Playwright: `frontend/test-results/playwright/results.xml`
- cobertura frontend y reporte HTML de Playwright: archivados como artefactos

Trigger versionado:

- `pollSCM('H/5 * * * *')`
- si prefieres disparo inmediato, puedes cambiarlo por webhook de GitHub usando una URL pública de ngrok

Requisitos para que funcione en Jenkins:

- el agente de Jenkins debe tener acceso al daemon de Docker, porque Testcontainers levanta PostgreSQL y RabbitMQ
- debe existir la credencial Jenkins `sonar-token`; el `Jenkinsfile` exporta `SONAR_HOST_URL=http://localhost:9000` y `SONAR_TOKEN` desde esa credencial
- `sonar-scanner` debe estar instalado en el agente que ejecute el stage del frontend

## Deploy

La guía operativa completa está en [docs/deployment.md](/Users/porterodarkoa/Documents/IG/4º/TFG/tfg-agile-app/docs/deployment.md).

Resumen corto:

- copia `.env.prod.example` a `.env.prod`
- genera `JWT_SECRET`, `INTERNAL_API_KEY`, passwords de PostgreSQL y RabbitMQ
- rellena SMTP y Google OAuth con credenciales reales
- prueba primero `docker compose --env-file .env.prod -f compose.prod.yml build` y `up -d` en local
- despliega después en el VPS con el mismo `compose.prod.yml`
- rehace los webhooks de GitHub cuando tengas la URL pública final

## Runtime de notificaciones

`NOTIFICATIONS_QUEUE_ENABLED` queda activado por defecto tanto en [docs/.env.example](/Users/porterodarkoa/Documents/IG/4º/TFG/tfg-agile-app/docs/.env.example) como en la configuración estándar de `user-service`. Si quieres desactivar la cola en un entorno concreto, sobrescribe la variable explícitamente.
