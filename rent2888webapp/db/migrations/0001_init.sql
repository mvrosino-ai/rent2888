-- Rent2888: esquema inicial de autenticación y settings
CREATE TYPE user_role AS ENUM ('ADMIN', 'OWNER');

CREATE TABLE users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email             TEXT UNIQUE NOT NULL,
  full_name         TEXT,
  -- NULL = el usuario todavía no definió su contraseña (primer ingreso pendiente).
  password_hash     TEXT,
  role              user_role NOT NULL,
  -- Debe coincidir EXACTAMENTE con el valor de la columna "Propietario" del Google Sheet.
  -- Requerido cuando role = 'OWNER'; NULL para ADMIN.
  propietario_name  TEXT,
  active            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fila única de configuración editable in-app (comisión).
CREATE TABLE settings (
  id              BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  commission_pct  NUMERIC NOT NULL DEFAULT 0.20
);

INSERT INTO settings (commission_pct) VALUES (0.20);
