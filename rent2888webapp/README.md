# Rent2888 · Reportes

Webapp de liquidaciones mensuales para propietarios, con login de dos roles:

- **Admin**: todas las liquidaciones, cuentas internas, gestión de usuarios y comisión.
- **Propietario**: solo sus propias liquidaciones.

Stack: Next.js (App Router) + Auth.js + Postgres (Neon) + Tailwind. Los datos se leen en vivo del Google Sheet (server-side).

📖 **Deploy y configuración**: ver [SETUP.md](./SETUP.md)

Los HTML originales (versión estática previa) están en [`legacy/`](./legacy/).
