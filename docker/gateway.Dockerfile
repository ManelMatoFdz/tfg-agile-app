FROM node:24-alpine AS frontend-build

WORKDIR /workspace/frontend
COPY frontend/package*.json ./
RUN npm ci

ARG VITE_GOOGLE_CLIENT_ID=
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}

COPY frontend/ ./
RUN npm run build

FROM caddy:2.11-alpine

COPY docker/caddy/Caddyfile /etc/caddy/Caddyfile
COPY --from=frontend-build /workspace/frontend/dist /srv
