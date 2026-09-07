import { readdir, readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

const expectedProjectId = process.env.MIGRATION_EXPECTED_NEON_PROJECT_ID;
const actualProjectId = process.env.NEON_PROJECT_ID;
if (!expectedProjectId) {
  throw new Error("MIGRATION_EXPECTED_NEON_PROJECT_ID is required");
}
if (actualProjectId !== expectedProjectId) {
  throw new Error("Refusing quote migration: NEON_PROJECT_ID does not match MIGRATION_EXPECTED_NEON_PROJECT_ID");
}

const databaseUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL_UNPOOLED or DATABASE_URL is required");

const migrationsDirectory = new URL("../migrations/", import.meta.url);
const files = (await readdir(migrationsDirectory))
  .filter((file) => file.endsWith(".sql"))
  .sort();
if (files.length === 0) throw new Error("No quote migrations were found");

const statements = [];
for (const file of files) {
  const migration = await readFile(new URL(file, migrationsDirectory), "utf8");
  for (const statement of migration.split(/^-- migrate:split\s*$/m)) {
    const trimmed = statement.trim();
    if (trimmed) statements.push(trimmed);
  }
}

// Every migration is idempotent, so the whole set is replayed in one
// transaction: the schema either advances completely or not at all.
const sql = neon(databaseUrl);
await sql.transaction(statements.map((statement) => sql.query(statement)));
console.log(`Applied ${files.map((file) => `migrations/${file}`).join(", ")}`);
