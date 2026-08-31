import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL_UNPOOLED or DATABASE_URL is required");

const migration = await readFile(new URL("../migrations/001_quote_outbox.sql", import.meta.url), "utf8");
const sql = neon(databaseUrl);
const statements = migration
  .split(/^-- migrate:split\s*$/m)
  .map((statement) => statement.trim())
  .filter(Boolean);
await sql.transaction(statements.map((statement) => sql.query(statement)));
console.log("Applied migrations/001_quote_outbox.sql");
