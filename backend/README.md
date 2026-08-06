# PokeLAP Admin API

NestJS + TypeORM + MySQL backend for the PokeLAP Admin app.

## Structure

```
src/
├── modules/          # Feature modules (auth, chips, dashboard, game-types, tables, tournaments, users)
├── common/           # Shared code (interceptors, filters, guards, decorators, generic CRUD service)
├── config/           # Configuration (port, database, JWT)
└── database/         # DataSource + idempotent seed
```

## Requirements

- MySQL 8 running on port 3306 (e.g. started from Laragon).
- Node.js 18+.

## Setup

1. Create a MySQL database named `pokelap`.
2. Copy `.env.example` to `.env` and adjust credentials.
3. `npm install`
4. `npm run seed` (creates admin user + sample data)
5. `npm run start:dev` (serves at http://localhost:3000/api)

## Auth

- `POST /api/auth/register` - register with email + password
- `POST /api/auth/login` - login
- `GET /api/auth/me` - current user (Bearer token)

## Seed admin

email: `admin@pokelap.com` / password: `Admin123!`

## Logging

- Every HTTP request is logged (method, route, status, duration, IP) by `LoggingInterceptor`.
- AuthService logs register/login attempts (email + outcome, never the password).
- `HttpExceptionFilter` logs 4xx as warnings and 5xx with stack traces.

## Connect from the mobile app (Expo Go on a physical device)

The API listens on port 3000 on all interfaces. To reach it from a phone on the
same Wi-Fi, set the PC's LAN IP in the app:

```
EXPO_PUBLIC_API_URL=http://<PC-LAN-IP>:3000/api
```

On startup the backend prints every reachable URL, e.g.
`Reachable from your device at: http://172.18.20.54:3000/api`.