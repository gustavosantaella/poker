# PokeLAP Admin (Expo)

App de administracion para gestionar mesas cash y torneos de poker
(login/registro con email y contrasena).

## Setup

1. `bun install` (o `npm install`).
2. Copia `.env.example` a `.env` y ajusta `EXPO_PUBLIC_API_URL`.
   - Web / iOS simulator : `http://localhost:3000/api`
   - Android emulator   : `http://10.0.2.2:3000/api`
   - **Dispositivo fisico (Expo Go)**: usa la IP LAN de tu PC, ej. `http://192.168.x.x:3000/api`.
     El backend imprime las URLs correctas al arrancar.
3. Levanta el backend (carpeta `backend`, puerto 3000).
4. `bun start` (Expo) o `bun run web` / `bun run android`.

> Si cambias `EXPO_PUBLIC_API_URL` en `.env`, reinicia el dev server de Expo
> (`Ctrl+C` y `bun start`) para que Metro tome la nueva URL.

## Logging de red

En desarrollo (`__DEV__`) el app registra en la consola de Metro/Expo:
- la URL de la API al iniciar,
- cada request (`→ POST ...`) y response (`← 201 ...`),
- errores de red detallados (`✗ NETWORK ERROR ... { code, message }`) y respuestas con error.

Los mensajes de error en pantalla incluyen la URL configurada cuando el fallo es de red.

## Estructura

- `src/theme` – diseno tokens (colores claro/oscuro, spacing, tipografia).
- `src/components/ui` – componentes UI reutilizables.
- `src/components/forms` – formularios reutilizables (react-hook-form + zod).
- `src/api` – cliente axios + endpoints tipados (con interceptores de log).
- `src/hooks` – auth + queries (TanStack Query).
- `src/schemas` – esquemas zod compartidos entre crear/editar.
- `src/app` – pantallas con expo-router.

## Seed admin

email: `admin@pokelap.com` / password: `Admin123!`