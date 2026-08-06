# PokeLAP Admin API

NestJS + TypeORM + MySQL backend for the PokeLAP Admin app.


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
