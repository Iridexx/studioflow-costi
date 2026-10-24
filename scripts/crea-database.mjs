// Crea il database indicato in DATABASE_URL se non esiste ancora (prima di prisma migrate deploy).
import "dotenv/config";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL non impostata nel file .env");
  process.exit(1);
}
const target = new URL(url);
const name = decodeURIComponent(target.pathname.replace(/^\//, ""));
const admin = new URL(url);
admin.pathname = "/postgres";

const client = new pg.Client({ connectionString: admin.toString() });
await client.connect();
try {
  const found = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [name]);
  if (found.rowCount === 0) {
    await client.query(`CREATE DATABASE "${name.replace(/"/g, '""')}"`);
    console.log(`Database ${name} creato.`);
  } else {
    console.log(`Database ${name} già presente.`);
  }
} finally {
  await client.end();
}
