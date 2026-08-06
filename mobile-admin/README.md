# PokeLAP Admin (Expo)

App de administracion para gestionar mesas cash y torneos de poker
(login/registro con email y contrasena).

## Setup

1. `npm install`
2. Copia `.env.example` a `.env` y ajusta `EXPO_PUBLIC_API_URL`.
3. Levanta el backend (carpeta `backend`, puerto 3000).
4. `npm start` (Expo) o `npm run web` / `npm run android`.

## Estructura

- `src/theme` – diseno tokens (colores claro/oscuro, spacing, tipografia).
- `src/components/ui` – componentes UI reutilizables.
- `src/components/forms` – formularios reutilizables (react-hook-form + zod).
- `src/api` – cliente axios + endpoints tipados.
- `src/hooks` – auth + queries (TanStack Query).
- `src/schemas` – esquemas zod compartidos entre crear/editar.
- `src/app` – pantallas con expo-router.

## Seed admin

email: `admin@pokelap.com` / password: `Admin123!`