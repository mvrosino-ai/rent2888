import { Pool, type QueryResult, type QueryResultRow } from "pg";

export type UserRole = "ADMIN" | "OWNER";

export interface DbUser {
  id: string;
  email: string;
  full_name: string | null;
  password_hash: string | null;
  role: UserRole;
  propietario_name: string | null;
  // Lista de propietarios del sheet vinculados a la cuenta (holdings o dueños
  // con más de un depto). propietario_name se mantiene como el primero por
  // compatibilidad hacia atrás.
  propietario_names: string[] | null;
  active: boolean;
  created_at: string;
}

let pool: Pool | null = null;

function db(): Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL no está configurada");
    pool = new Pool({ connectionString: url, max: 3 });
  }
  return pool;
}

// Migración aditiva idempotente que se aplica una sola vez por proceso, la
// primera vez que se toca la base. Así producción se actualiza sola en el
// deploy sin necesidad de correr scripts ni tener acceso a la terminal.
let migrationPromise: Promise<void> | null = null;
function ensureMigrated(): Promise<void> {
  if (!migrationPromise) {
    migrationPromise = db()
      .query(
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name TEXT;
         ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
         ALTER TABLE users ADD COLUMN IF NOT EXISTS propietario_names TEXT[];
         UPDATE users SET propietario_names = ARRAY[propietario_name]
           WHERE propietario_names IS NULL AND propietario_name IS NOT NULL;

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
         CREATE INDEX IF NOT EXISTS mail_liq_periodo_idx ON mail_liquidacion (periodo);`
      )
      .then(() => undefined)
      .catch((e) => {
        // Si falla, reintentar en la próxima llamada.
        migrationPromise = null;
        throw e;
      });
  }
  return migrationPromise;
}

async function q<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  await ensureMigrated();
  return db().query<T>(text, params as never);
}

export async function findUserByEmail(email: string): Promise<DbUser | null> {
  const { rows } = await q<DbUser>(
    `SELECT id, email, full_name, password_hash, role, propietario_name, propietario_names, active, created_at
     FROM users WHERE lower(email) = lower($1) LIMIT 1`,
    [email]
  );
  return rows[0] ?? null;
}

export async function listUsers(): Promise<DbUser[]> {
  const { rows } = await q<DbUser>(
    `SELECT id, email, full_name, password_hash, role, propietario_name, propietario_names, active, created_at
     FROM users ORDER BY created_at`
  );
  return rows;
}

export async function createUser(u: {
  email: string;
  fullName: string | null;
  passwordHash: string | null;
  role: UserRole;
  propietarioNames: string[];
}): Promise<void> {
  const names = u.propietarioNames;
  await q(
    `INSERT INTO users (email, full_name, password_hash, role, propietario_name, propietario_names)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [u.email, u.fullName, u.passwordHash, u.role, names[0] ?? null, names.length ? names : null]
  );
}

export async function setUserActive(id: string, active: boolean): Promise<void> {
  await q(`UPDATE users SET active = $2 WHERE id = $1`, [id, active]);
}

export async function updateUserPassword(id: string, passwordHash: string): Promise<void> {
  await q(`UPDATE users SET password_hash = $2 WHERE id = $1`, [id, passwordHash]);
}

// Setea la contraseña SOLO si el usuario todavía no tiene una (primer ingreso).
// Devuelve true si la seteó, false si ya tenía contraseña o no aplica.
export async function setInitialPassword(email: string, passwordHash: string): Promise<boolean> {
  const { rowCount } = await q(
    `UPDATE users SET password_hash = $2
     WHERE lower(email) = lower($1) AND active = TRUE AND password_hash IS NULL`,
    [email, passwordHash]
  );
  return (rowCount ?? 0) > 0;
}

export async function updateUserPropietario(
  id: string,
  propietarioNames: string[]
): Promise<void> {
  await q(
    `UPDATE users SET propietario_name = $2, propietario_names = $3 WHERE id = $1`,
    [id, propietarioNames[0] ?? null, propietarioNames.length ? propietarioNames : null]
  );
}

export async function deleteUser(id: string): Promise<void> {
  await q(`DELETE FROM users WHERE id = $1`, [id]);
}

export async function getCommissionPct(): Promise<number> {
  try {
    const { rows } = await q(`SELECT commission_pct FROM settings LIMIT 1`);
    if (rows[0]) return Number(rows[0].commission_pct);
  } catch {
    // sin DB o sin tabla settings: cae al env var
  }
  return Number(process.env.COMMISSION_PCT ?? 0.2);
}

export async function setCommissionPct(pct: number): Promise<void> {
  await q(
    `INSERT INTO settings (id, commission_pct) VALUES (TRUE, $1)
     ON CONFLICT (id) DO UPDATE SET commission_pct = $1`,
    [pct]
  );
}

// ── Mails de liquidación ──

export interface DbMail {
  id: string;
  periodo: string;
  propietario: string;
  mail: string;
  asunto: string;
  nombre: string;
  moneda: string;
  deptos: string[];
  compras: string[];
  arreglos: string[];
  comentarios: string[];
  nota_libre: string | null;
  especial: boolean;
  edited: boolean;
  sent: boolean;
  sent_at: string | null;
  matched: boolean;
  created_at: string;
  updated_at: string;
}

const MAIL_COLS = `id, periodo, propietario, mail, asunto, nombre, moneda, deptos,
  compras, arreglos, comentarios, nota_libre, especial, edited, sent, sent_at,
  matched, created_at, updated_at`;

/** Lista todos los mails guardados de un período, especiales al final. */
export async function listMails(periodo: string): Promise<DbMail[]> {
  const { rows } = await q<DbMail>(
    `SELECT ${MAIL_COLS} FROM mail_liquidacion
     WHERE periodo = $1
     ORDER BY especial ASC, lower(propietario) ASC, created_at ASC`,
    [periodo]
  );
  return rows;
}

export async function getMailById(id: string): Promise<DbMail | null> {
  const { rows } = await q<DbMail>(
    `SELECT ${MAIL_COLS} FROM mail_liquidacion WHERE id = $1 LIMIT 1`,
    [id]
  );
  return rows[0] ?? null;
}

export interface GeneratedMailInput {
  periodo: string;
  propietario: string;
  mail: string;
  asunto: string;
  nombre: string;
  moneda: string;
  deptos: string[];
  compras: string[];
  arreglos: string[];
  comentarios: string[];
  matched: boolean;
}

/**
 * Inserta/actualiza el mail generado por IA de un propietario (no especial).
 * Por defecto CONSERVA las ediciones manuales: si la fila ya existe y fue
 * editada a mano (edited = TRUE), no la pisa. Con force = true (rehacer con IA)
 * sobrescribe el contenido y limpia el flag de edición.
 */
export async function saveGeneratedMail(
  m: GeneratedMailInput,
  opts: { force?: boolean } = {}
): Promise<void> {
  const guard = opts.force ? "" : "WHERE mail_liquidacion.edited = FALSE";
  const editedSet = opts.force ? "edited = FALSE," : "";
  await q(
    `INSERT INTO mail_liquidacion
       (periodo, propietario, mail, asunto, nombre, moneda, deptos, compras, arreglos, comentarios, matched)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT (periodo, propietario) WHERE especial = FALSE
     DO UPDATE SET
       mail = EXCLUDED.mail,
       asunto = EXCLUDED.asunto,
       nombre = EXCLUDED.nombre,
       moneda = EXCLUDED.moneda,
       deptos = EXCLUDED.deptos,
       compras = EXCLUDED.compras,
       arreglos = EXCLUDED.arreglos,
       comentarios = EXCLUDED.comentarios,
       matched = EXCLUDED.matched,
       ${editedSet}
       updated_at = now()
     ${guard}`,
    [
      m.periodo,
      m.propietario,
      m.mail,
      m.asunto,
      m.nombre,
      m.moneda,
      m.deptos,
      m.compras,
      m.arreglos,
      m.comentarios,
      m.matched,
    ]
  );
}

/** Actualiza el contenido editado a mano de un mail y lo marca como editado. */
export async function updateMailContent(
  id: string,
  c: { mail: string; asunto: string; nombre: string; compras: string[]; arreglos: string[]; comentarios: string[]; notaLibre: string }
): Promise<void> {
  await q(
    `UPDATE mail_liquidacion SET
       mail = $2, asunto = $3, nombre = $4,
       compras = $5, arreglos = $6, comentarios = $7, nota_libre = $8,
       edited = TRUE, updated_at = now()
     WHERE id = $1`,
    [id, c.mail, c.asunto, c.nombre, c.compras, c.arreglos, c.comentarios, c.notaLibre]
  );
}

export async function setMailSent(id: string, sent: boolean): Promise<void> {
  await q(
    `UPDATE mail_liquidacion
     SET sent = $2, sent_at = CASE WHEN $2 THEN now() ELSE NULL END, updated_at = now()
     WHERE id = $1`,
    [id, sent]
  );
}

export interface SpecialMailInput {
  periodo: string;
  propietario: string;
  mail: string;
  asunto: string;
  nombre: string;
  moneda: string;
  deptos: string[];
  cuerpo: string; // texto libre completo del mail especial (va en nota_libre)
}

/** Crea un mail especial (p. ej. fe de erratas) dirigido a un propietario. */
export async function createSpecialMail(m: SpecialMailInput): Promise<string> {
  const { rows } = await q<{ id: string }>(
    `INSERT INTO mail_liquidacion
       (periodo, propietario, mail, asunto, nombre, moneda, deptos, nota_libre, especial, edited, matched)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8, TRUE, TRUE, TRUE)
     RETURNING id`,
    [m.periodo, m.propietario, m.mail, m.asunto, m.nombre, m.moneda, m.deptos, m.cuerpo]
  );
  return rows[0].id;
}

export async function deleteMail(id: string): Promise<void> {
  await q(`DELETE FROM mail_liquidacion WHERE id = $1`, [id]);
}
