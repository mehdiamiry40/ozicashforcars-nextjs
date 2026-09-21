import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import { access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { Client, Pool } from "pg";
import { startNeonPostgresProxy } from "../tests/support/neon-postgres-proxy.mjs";

if (process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED || process.env.NEON_PROJECT_ID) {
  throw new Error("Refusing outbox tests with ordinary database configuration; unset DATABASE_URL, DATABASE_URL_UNPOOLED and NEON_PROJECT_ID");
}
if (!process.env.OUTBOX_TEST_POSTGRES_URL) {
  throw new Error("OUTBOX_TEST_POSTGRES_URL is required: use a disposable local PostgreSQL server, never a production or preview connection");
}
const adminUrl = new URL(process.env.OUTBOX_TEST_POSTGRES_URL);
if (!["postgres:", "postgresql:"].includes(adminUrl.protocol)
  || !["localhost", "127.0.0.1"].includes(adminUrl.hostname)
  || adminUrl.username !== "quote_ci" || adminUrl.pathname !== "/postgres" || adminUrl.search) {
  throw new Error("OUTBOX_TEST_POSTGRES_URL must name the quote_ci user and postgres database on loopback, with no query options");
}
await access(new URL("../.next/BUILD_ID", import.meta.url));

const databaseName = `outbox_test_${randomBytes(12).toString("hex")}`;
const databaseUrl = `postgresql://outbox:outbox@outbox.test/${databaseName}`;
const token = randomBytes(32).toString("hex");
const admin = new Client({ connectionString: adminUrl.href, connectionTimeoutMillis: 5_000 });
const localUrl = new URL(adminUrl);
localUrl.pathname = `/${databaseName}`;
const pool = new Pool({ connectionString: localUrl.href, max: 12, connectionTimeoutMillis: 5_000 });
// The teardown below drops the disposable database WITH (FORCE), which
// terminates any backend that has not finished closing. pg raises that FATAL
// as an "error" event and, with no listener, Node exits non-zero after every
// test has already passed. An idle connection reports through pg-pool's
// idleListener, which re-emits on the pool; a checked-out one emits on the
// client itself, so both need a listener. Failed queries still reject their
// own promises, so no test result is hidden by this.
pool.on("error", () => {});
pool.on("connect", (client) => client.on("error", () => {}));
let created = false;
let proxy;
let child;

async function run(args, env) {
  child = spawn(process.execPath, args, { cwd: new URL("../", import.meta.url), env, stdio: "inherit" });
  const [code, signal] = await once(child, "exit");
  child = undefined;
  if (code !== 0) throw new Error(`Isolated outbox command failed (${signal ?? code})`);
}

try {
  await admin.connect();
  // The name is generated here, never taken from user input. Only this database
  // is migrated or dropped; the admin connection never executes quote queries.
  await admin.query(`CREATE DATABASE "${databaseName}"`);
  created = true;
  proxy = await startNeonPostgresProxy({ pool, databaseUrl, token });
  const preload = fileURLToPath(new URL("../tests/support/outbox-local-fetch.mjs", import.meta.url));
  const env = {
    ...process.env,
    DATABASE_URL: databaseUrl,
    DATABASE_URL_UNPOOLED: "",
    OUTBOX_TEST_POSTGRES_URL: "",
    OUTBOX_TEST_DATABASE_URL: databaseUrl,
    OUTBOX_TEST_PROXY_URL: proxy.url,
    OUTBOX_TEST_PROXY_TOKEN: token,
    NEON_PROJECT_ID: "outbox-isolated-test",
    MIGRATION_EXPECTED_NEON_PROJECT_ID: "outbox-isolated-test",
    NODE_OPTIONS: "",
    RESEND_API_KEY: "",
    QUOTE_FROM_EMAIL: "",
    QUOTE_TO_EMAIL: "",
  };
  await run(["--import", preload, "scripts/migrate-quotes.mjs"], env);
  await pool.query("INSERT INTO quote_worker_lease (environment, lease_token, lease_until) VALUES ('migration-sentinel', $1, now())", ["00000000-0000-4000-8000-000000000001"]);
  await run(["--import", preload, "scripts/migrate-quotes.mjs"], env);
  assert.equal((await pool.query("SELECT count(*)::int AS count FROM quote_worker_lease WHERE environment = 'migration-sentinel'")).rows[0].count, 1, "reapplying the migration must preserve existing rows");
  await pool.query("DELETE FROM quote_worker_lease WHERE environment = 'migration-sentinel'");
  await run(["--import", preload, "--test", "--test-concurrency=1", "tests/outbox.integration.mjs"], env);
} finally {
  if (child && child.exitCode === null) child.kill("SIGTERM");
  await proxy?.close();
  await pool.end();
  if (created) await admin.query(`DROP DATABASE "${databaseName}" WITH (FORCE)`);
  await admin.end();
}
