// Crea el primer usuario ADMIN.
// Uso: DATABASE_URL=... SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... npm run seed:admin
import "dotenv/config";
import { Client } from "pg";
import bcrypt from "bcryptjs";

async function main() {
  const url = process.env.DATABASE_URL;
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!url || !email || !password) {
    throw new Error("Faltan DATABASE_URL, SEED_ADMIN_EMAIL o SEED_ADMIN_PASSWORD");
  }
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const hash = await bcrypt.hash(password, 10);
    await client.query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, 'ADMIN')
       ON CONFLICT (email) DO UPDATE SET password_hash = $2, role = 'ADMIN', active = TRUE`,
      [email, hash]
    );
    console.log(`Admin creado/actualizado: ${email}`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
