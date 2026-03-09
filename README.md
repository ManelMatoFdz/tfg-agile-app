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

### 3) Run smoke test
```bash
./scripts/dev-check.sh
```
