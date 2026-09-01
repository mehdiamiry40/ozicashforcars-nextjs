import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { once } from "node:events";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";
import test, { after, before } from "node:test";

const root = new URL("../", import.meta.url);
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required; pull the isolated preview/development environment first");

const sql = neon(databaseUrl);
const environment = `test-${Date.now().toString(36)}`;
const cronSecret = randomBytes(32).toString("hex");
let base;
let server;
let serverOutput = "";

async function freePort() {
  const probe = createServer();
  probe.listen(0, "127.0.0.1");
  await once(probe, "listening");
  const address = probe.address();
  const port = typeof address === "object" && address ? address.port : 0;
  probe.close();
  await once(probe, "close");
  return port;
}

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(base, { redirect: "manual" });
      if (response.status < 500) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Outbox test server did not start:\n${serverOutput}`);
}

function quotePayload(overrides = {}) {
  return {
    submissionId: randomUUID(),
    name: "Codex Outbox Verification",
    phone: "0400 111 001",
    email: "outbox-verification@example.com",
    suburb: "Brisbane",
    vehicle: "2015 Toyota Corolla",
    condition: "Synthetic integration test",
    consent: "yes",
    company: "",
    sourcePath: "/verification/outbox/",
    startedAt: Date.now() - 2_000,
    ...overrides,
  };
}

async function post(payload, clientAddress) {
  const response = await fetch(`${base}/api/quote/`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-vercel-forwarded-for": clientAddress,
    },
    body: JSON.stringify(payload),
  });
  return { status: response.status, body: await response.json() };
}

async function reconcile(secret = cronSecret) {
  const response = await fetch(`${base}/api/internal/quotes/reconcile/`, {
    headers: { authorization: `Bearer ${secret}` },
  });
  return { status: response.status, body: await response.json() };
}

async function storedLead(submissionId) {
  const rows = await sql`
    SELECT status, attempt_count, last_error_code, provider_message_id
      FROM quote_lead
     WHERE environment = ${environment}
       AND submission_id = ${submissionId}::uuid
  `;
  return rows[0] ?? null;
}

before(async () => {
  const port = await freePort();
  base = `http://127.0.0.1:${port}`;
  const mockModule = fileURLToPath(new URL("./mock-resend.mjs", import.meta.url));
  server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", String(port)],
    {
      cwd: new URL(".", root),
      env: {
        ...process.env,
        VERCEL: "1",
        VERCEL_ENV: environment,
        QUOTE_OUTBOX_ENABLED: "true",
        QUOTE_RATE_SECRET: randomBytes(32).toString("hex"),
        QUOTE_CLIENT_RATE_LIMIT: "1",
        QUOTE_CONTACT_RATE_LIMIT: "1",
        QUOTE_GLOBAL_RATE_LIMIT: "100",
        CRON_SECRET: cronSecret,
        NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --import=${mockModule}`.trim(),
        RESEND_API_KEY: "re_mock_key",
        QUOTE_FROM_EMAIL: "Ozi Quotes <quotes@example.com>",
        QUOTE_TO_EMAIL: "contact@example.com",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  server.stdout.on("data", (chunk) => { serverOutput += String(chunk); });
  server.stderr.on("data", (chunk) => { serverOutput += String(chunk); });
  await waitForServer();
});

after(async () => {
  if (server && server.exitCode === null) {
    server.kill("SIGTERM");
    await once(server, "exit");
  }
  await sql.transaction((tx) => [
    tx`DELETE FROM quote_lead WHERE environment = ${environment}`,
    tx`DELETE FROM quote_rate_bucket WHERE environment = ${environment}`,
    tx`DELETE FROM quote_worker_lease WHERE environment = ${environment}`,
  ]);
});

test("concurrent identical submissions create one lead, budget charge and delivery", async () => {
  const payload = quotePayload();
  const responses = await Promise.all([
    post(payload, "198.51.100.1"),
    post(payload, "198.51.100.1"),
  ]);
  assert.ok(responses.every((response) => [200, 202].includes(response.status) && response.body.ok));

  const lead = await storedLead(payload.submissionId);
  assert.equal(lead.status, "sent");
  assert.equal(lead.attempt_count, 1);
  const counts = await sql`
    SELECT
      (SELECT count(*)::int FROM quote_lead WHERE environment = ${environment}) AS leads,
      (SELECT count(*)::int FROM quote_delivery_attempt WHERE environment = ${environment}) AS attempts,
      (SELECT sum(request_count)::int FROM quote_rate_bucket WHERE environment = ${environment}) AS budget
  `;
  assert.deepEqual(counts[0], { leads: 1, attempts: 1, budget: 3 });

  const changed = await post({ ...payload, vehicle: "Changed vehicle" }, "198.51.100.1");
  assert.equal(changed.status, 409);
  assert.equal((await storedLead(payload.submissionId)).attempt_count, 1);
});

test("Australian phone variants share one contact budget and rejected work rolls back atomically", async () => {
  const first = quotePayload({ phone: "0400 111 002", email: "phone-a@example.com" });
  const second = quotePayload({ phone: "+61 400 111 002", email: "phone-b@example.com" });
  assert.equal((await post(first, "198.51.100.2")).status, 200);
  const rejected = await post(second, "198.51.100.3");
  assert.equal(rejected.status, 429);
  assert.equal(await storedLead(second.submissionId), null);

  const counts = await sql`
    SELECT
      (SELECT count(*)::int FROM quote_lead WHERE environment = ${environment}) AS leads,
      (SELECT sum(request_count)::int FROM quote_rate_bucket WHERE environment = ${environment}) AS budget
  `;
  assert.deepEqual(counts[0], { leads: 2, budget: 6 });
});

test("one transient failure is recovered by exactly one of two concurrent workers", async () => {
  const payload = quotePayload({
    phone: "0400 111 003",
    email: "retry@example.com",
    vehicle: "[fail-once] Retry vehicle",
  });
  const accepted = await post(payload, "198.51.100.4");
  assert.equal(accepted.status, 202);
  assert.equal((await storedLead(payload.submissionId)).last_error_code, "provider_503");

  await sql`
    UPDATE quote_lead
       SET next_attempt_at = now()
     WHERE environment = ${environment}
       AND submission_id = ${payload.submissionId}::uuid
  `;
  const workers = await Promise.all([reconcile(), reconcile()]);
  assert.ok(workers.every((worker) => worker.status === 200));
  assert.equal(workers.reduce((sum, worker) => sum + worker.body.claimed, 0), 1);

  const lead = await storedLead(payload.submissionId);
  assert.equal(lead.status, "sent");
  assert.equal(lead.attempt_count, 2);
  assert.ok(lead.provider_message_id);
});

test("reconciliation paces a backlog below the provider burst limit", async () => {
  const payloads = [5, 6, 7].map((suffix) => quotePayload({
    phone: `0400 111 00${suffix}`,
    email: `paced-${suffix}@example.com`,
    vehicle: `[fail-once] Paced retry vehicle ${suffix}`,
  }));
  for (const [index, payload] of payloads.entries()) {
    assert.equal((await post(payload, `198.51.100.${6 + index}`)).status, 202);
  }

  await sql`
    UPDATE quote_lead
       SET next_attempt_at = now()
     WHERE environment = ${environment}
       AND submission_id = ANY(${payloads.map((payload) => payload.submissionId)}::uuid[])
  `;
  const startedAt = Date.now();
  const workers = await Promise.all([reconcile(), reconcile()]);
  const elapsed = Date.now() - startedAt;
  assert.ok(workers.every((worker) => worker.status === 200));
  assert.equal(workers.reduce((sum, worker) => sum + worker.body.claimed, 0), payloads.length);
  assert.equal(workers.filter((worker) => worker.body.skipped).length, 1);
  assert.ok(elapsed >= 450, `paced reconciliation completed too quickly in ${elapsed}ms`);

  for (const payload of payloads) {
    const lead = await storedLead(payload.submissionId);
    assert.equal(lead.status, "sent");
    assert.equal(lead.attempt_count, 2);
  }
});

test("a stale due backlog keeps reconciliation unhealthy", async () => {
  const payloads = [10, 11, 12, 13, 14, 15].map((suffix) => quotePayload({
    phone: `0400 111 0${suffix}`,
    email: `stale-${suffix}@example.com`,
    vehicle: `[invalid-response] Stale backlog vehicle ${suffix}`,
  }));
  for (const [index, payload] of payloads.entries()) {
    assert.equal((await post(payload, `198.51.100.${20 + index}`)).status, 202);
  }
  await sql`
    UPDATE quote_lead
       SET next_attempt_at = now() - interval '10 minutes'
     WHERE environment = ${environment}
       AND submission_id = ANY(${payloads.map((payload) => payload.submissionId)}::uuid[])
  `;
  const worker = await reconcile();
  assert.equal(worker.status, 503);
  assert.equal(worker.body.ok, false);
  assert.equal(worker.body.claimed, 5);
  assert.equal(worker.body.backlog.due, 1);
  assert.ok(worker.body.backlog.oldestDueSeconds >= 590);
  await sql`
    UPDATE quote_lead
       SET next_attempt_at = now() + interval '1 day'
     WHERE environment = ${environment}
       AND submission_id = ANY(${payloads.map((payload) => payload.submissionId)}::uuid[])
  `;
});

test("malformed provider success stays queued and cron authentication fails closed", async () => {
  const payload = quotePayload({
    phone: "0400 111 004",
    email: "malformed@example.com",
    vehicle: "[invalid-response] Invalid response vehicle",
  });
  assert.equal((await post(payload, "198.51.100.5")).status, 202);
  const lead = await storedLead(payload.submissionId);
  assert.equal(lead.status, "accepted");
  assert.equal(lead.last_error_code, "provider_invalid_response");

  const missing = await fetch(`${base}/api/internal/quotes/reconcile/`);
  assert.equal(missing.status, 401);
  assert.equal((await reconcile("incorrect-secret-that-is-long-enough-0000")).status, 401);
  assert.equal((await reconcile("é".repeat(cronSecret.length))).status, 401);

  await sql`
    UPDATE quote_lead
       SET status = 'failed'
     WHERE environment = ${environment}
       AND submission_id = ${payload.submissionId}::uuid
  `;
  const unhealthy = await reconcile();
  assert.equal(unhealthy.status, 503);
  assert.equal(unhealthy.body.ok, false);
  assert.equal(unhealthy.body.backlog.failed, 1);
});
