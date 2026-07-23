import { Pool, type QueryResult, type QueryResultRow } from "pg";

export type UserRole = "ADMIN" | "OWNER";

export interface DbUser {
  id: string;
  email: string;
  full_name: string | null;
  password_hash: string | null;
  role: UserRole;
  propietario_name: string | null;
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
         ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;`
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
    `SELECT id, email, full_name, password_hash, role, propietario_name, active, created_at
     FROM users WHERE lower(email) = lower($1) LIMIT 1`,
    [email]
  );
  return rows[0] ?? null;
}

export async function listUsers(): Promise<DbUser[]> {
  const { rows } = await q<DbUser>(
    `SELECT id, email, full_name, password_hash, role, propietario_name, active, created_at
     FROM users ORDER BY created_at`
  );
  return rows;
}

export async function createUser(u: {
  email: string;
  fullName: string | null;
  passwordHash: string | null;
  role: UserRole;
  propietarioName: string | null;
}): Promise<void> {
  await q(
    `INSERT INTO users (email, full_name, password_hash, role, propietario_name)
     VALUES ($1, $2, $3, $4, $5)`,
    [u.email, u.fullName, u.passwordHash, u.role, u.propietarioName]
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
  propietarioName: string | null
): Promise<void> {
  await q(`UPDATE users SET propietario_name = $2 WHERE id = $1`, [id, propietarioName]);
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
