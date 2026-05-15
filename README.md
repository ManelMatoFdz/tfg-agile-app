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