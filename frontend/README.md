# Frontend — User Service

Frontend React + TypeScript del microservicio de usuarios para la plataforma Agile App.

## Requisitos

- Node.js 18+
- Backend `user-service` corriendo en `http://localhost:8081`

## Instalación

```bash
npm install
```

## Variables de entorno

Copia `.env.example` a `.env` y ajusta si es necesario:

| Variable             | Descripción                          | Default  |
|----------------------|--------------------------------------|----------|
| `VITE_API_BASE_URL`  | URL base de la API del user-service  | `/api`   |
| `VITE_GOOGLE_CLIENT_ID` | OAuth Client ID de Google (Web)   | -        |

En desarrollo, Vite hace proxy de `/api` → `http://localhost:8081` (configurable en `vite.config.ts`).

## Desarrollo

```bash
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173).

## Build

```bash
npm run build
npm run preview
```

## Pantallas

- `/login` — Inicio de sesión (email + Google)
- `/register` — Registro
- `/forgot-password` — Recuperar contraseña
- `/reset-password?token=...` — Nueva contraseña
- `/profile` — Dashboard de perfil (datos, avatar, contraseña, notificaciones)
- `/notifications` — Centro de notificaciones

## Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS v4
- React Router v7
- Zustand (estado global)
- Axios (HTTP + interceptor refresh token)
