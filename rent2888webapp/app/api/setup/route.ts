// Setup one-time: inicializa el esquema y crea el primer admin, sin necesidad de terminal.
// Uso: GET /api/setup?token=<SETUP_TOKEN>
// Requiere env vars: SETUP_TOKEN, DATABASE_URL, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD.
// Es idempotente: se puede visitar más de una vez sin romper nada.
import { NextRequest, NextResponse } from "next/server";
import { Client } from "pg";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

// Mantener en sync con db/migrations/0001_init.sql (versión idempotente)
const SCHEMA_SQL = `
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('ADMIN', 'OWNER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS users (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email              TEXT UNIQUE NOT NULL,
  full_name          TEXT,
  password_hash      TEXT,
  role               user_role NOT NULL,
  propietario_name   TEXT,
  propietario_names  TEXT[],
  active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Migraciones aditivas idempotentes (para bases ya existentes):
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS propietario_names TEXT[];
UPDATE users SET propietario_names = ARRAY[propietario_name]
  WHERE propietario_names IS NULL AND propietario_name IS NOT NULL;

CREATE TABLE IF NOT EXISTS settings (
  id              BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  commission_pct  NUMERIC NOT NULL DEFAULT 0.20
);

INSERT INTO settings (id, commission_pct) VALUES (TRUE, 0.20)
ON CONFLICT (id) DO NOTHING;

-- Mails de liquidación (en sync con db/migrations/0002_mails.sql)
CREATE TABLE IF NOT EXISTS mail_liquidacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo TEXT NOT NULL,
  propietario TEXT NOT NULL,
  mail TEXT NOT NULL DEFAULT '',
  asunto TEXT NOT NULL DEFAULT '',
  nombre TEXT NOT NULL DEFAULT '',
  moneda TEXT NOT NULL DEFAULT '$',
  deptos TEXT[] NOT NULL DEFAULT '{}',
  compras TEXT[] NOT NULL DEFAULT '{}',
  arreglos TEXT[] NOT NULL DEFAULT '{}',
  comentarios TEXT[] NOT NULL DEFAULT '{}',
  nota_libre TEXT,
  especial BOOLEAN NOT NULL DEFAULT FALSE,
  edited BOOLEAN NOT NULL DEFAULT FALSE,
  sent BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at TIMESTAMPTZ,
  matched BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS mail_liq_periodo_prop_uq
  ON mail_liquidacion (periodo, propietario) WHERE especial = FALSE;
CREATE INDEX IF NOT EXISTS mail_liq_periodo_idx ON mail_liquidacion (periodo);
`;

export async function GET(req: NextRequest) {
  const setupToken = process.env.SETUP_TOKEN;
  if (!setupToken) {
    return NextResponse.json(
      { ok: false, error: "SETUP_TOKEN no está configurado en las variables de entorno" },
      { status: 500 }
    );
  }
  const token = req.nextUrl.searchParams.get("token");
  if (token !== setupToken) {
    return NextResponse.json({ ok: false, error: "Token inválido" }, { status: 401 });
  }

  const url = process.env.DATABASE_URL;
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!url) {
    return NextResponse.json(
      { ok: false, error: "Falta DATABASE_URL (conectá la base Neon en Storage y redeploy)" },
      { status: 500 }
    );
  }
  if (!email || !password) {
    return NextResponse.json(
      { ok: false, error: "Faltan SEED_ADMIN_EMAIL y/o SEED_ADMIN_PASSWORD" },
      { status: 500 }
    );
  }

  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    await client.query(SCHEMA_SQL);
    const hash = await bcrypt.hash(password, 10);
    await client.query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, 'ADMIN')
       ON CONFLICT (email) DO UPDATE SET password_hash = $2, role = 'ADMIN', active = TRUE`,
      [email, hash]
    );
    const { rows } = await client.query(`SELECT count(*)::int AS n FROM users`);
    return NextResponse.json({
      ok: true,
      mensaje: `Base inicializada. Admin listo: ${email}. Ya podés entrar en /login.`,
      usuarios: rows[0].n,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Error desconocido" },
      { status: 500 }
    );
  } finally {
    await client.end().catch(() => {});
  }
}
