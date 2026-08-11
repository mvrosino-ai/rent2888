-- Mails de liquidación generados por mes, con soporte de edición manual,
-- mails especiales (fe de erratas) y registro de envío.
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

-- Un único mail "normal" por (período, propietario); los especiales no aplican.
CREATE UNIQUE INDEX IF NOT EXISTS mail_liq_periodo_prop_uq
  ON mail_liquidacion (periodo, propietario) WHERE especial = FALSE;

CREATE INDEX IF NOT EXISTS mail_liq_periodo_idx ON mail_liquidacion (periodo);
