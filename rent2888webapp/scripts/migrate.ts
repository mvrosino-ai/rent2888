// Corre las migraciones SQL contra DATABASE_URL.
// Uso: DATABASE_URL=postgres://... npm run migrate
import "dotenv/config";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL");
  const client = new Client({ connectionString: url });
  await client.connect();

  try {
    const dir = join(__dirname, "..", "db", "migrations");
    const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
    for (const f of files) {
      console.log(`Aplicando ${f}...`);
      await client.query(readFileSync(join(dir, f), "utf8"));
    }
    console.log("Migraciones aplicadas.");
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
