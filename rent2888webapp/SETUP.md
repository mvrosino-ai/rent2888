# Rent2888 — Guía de deploy (Vercel + Neon)

Webapp Next.js con login real de dos roles:

- **ADMIN**: ve todas las liquidaciones, cuentas internas (`/admin/interno`), gestiona usuarios y comisión (`/admin/users`).
- **PROPIETARIO (OWNER)**: al loguearse ve solo sus propias liquidaciones (`/dashboard`).

Los datos siguen viniendo en vivo del mismo Google Sheet público (se lee server-side, el ID ya no se expone al navegador). Los usuarios y contraseñas (hasheadas con bcrypt) viven en Postgres (Neon).

## Camino rápido — todo desde el navegador, sin terminal

### 1. Crear la base Neon desde Vercel

1. En el dashboard de Vercel, entrá al proyecto → pestaña **Storage**.
2. **Create Database** → elegí **Neon** (Postgres) → aceptá el plan free.
3. Al conectarla al proyecto, Vercel crea sola la variable `DATABASE_URL`. Listo, no hace falta cuenta separada de Neon.

### 2. Variables de entorno

En el proyecto → **Settings → Environment Variables**, agregar (Production):

| Variable | Valor |
|---|---|
| `AUTH_SECRET` | un string largo aleatorio (por ej. el resultado de [generate-secret.vercel.app/32](https://generate-secret.vercel.app/32)) |
| `GOOGLE_SHEET_ID` | `1dBQzIqkRXzRVreJxecQT0XD1jslrBRI0PcCXZT7huRw` |
| `SHEET_TAB_MAIN` | `$$$` |
| `SHEET_TAB_PROP` | `Departamento - Propietario - Edificio` |
| `COMMISSION_PCT` | `0.20` |
| `SETUP_TOKEN` | otro string aleatorio (protege la ruta de setup) |
| `SEED_ADMIN_EMAIL` | el email de tu usuario admin |
| `SEED_ADMIN_PASSWORD` | la contraseña de tu usuario admin |

Después de agregar variables: **Deployments → ⋯ → Redeploy** (las env vars solo se aplican en un deploy nuevo).

### 3. Inicializar la base (una sola vez)

Visitá en el navegador:

```
https://TU-APP.vercel.app/api/setup?token=EL_VALOR_DE_SETUP_TOKEN
```

Eso crea las tablas y tu usuario admin. Si responde `"ok": true`, ya podés entrar en `/login` con el email y contraseña que pusiste en las variables. (La ruta es idempotente y solo funciona con el token correcto; podés borrar `SETUP_TOKEN`, `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD` después si querés.)

### 4. Alta de propietarios

1. Ingresá con tu usuario admin → **Usuarios** (`/admin/users`).
2. Un usuario por propietario: email + contraseña temporal + rol "Propietario" + elegir el propietario del dropdown (se llena en vivo desde el sheet, así el nombre siempre coincide).
3. Pasale las credenciales al propietario. Al entrar solo va a ver sus liquidaciones.

## Notas

- **El Sheet debe seguir compartido como público** ("cualquiera con el enlace puede ver"), igual que hoy.
- Cambiar el Sheet o los nombres de pestañas = editar env vars en Vercel y redeploy.
- El % de comisión se edita desde `/admin/users` sin redeploy.
- Los datos del sheet se cachean ~60 segundos server-side.
- Los HTML originales quedaron en `legacy/` como referencia; no se sirven en la app.

## Alternativa con terminal (desarrollo local / Neon propio)

```bash
npm install
# .env con DATABASE_URL, AUTH_SECRET, GOOGLE_SHEET_ID, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD
npm run migrate      # crea las tablas (db/migrations/0001_init.sql)
npm run seed:admin   # crea el usuario ADMIN
npm run dev
```
