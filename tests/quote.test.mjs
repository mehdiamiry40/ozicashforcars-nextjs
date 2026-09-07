import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test, { after, before } from "node:test";

const root = new URL("../", import.meta.url);
const deliveredDirectory = mkdtempSync(path.join(tmpdir(), "ozi-quote-delivered-"));
const deliveredFile = path.join(deliveredDirectory, "delivered.jsonl");
let server;
let base;

function deliveredEmails() {
  try {
    return readFileSync(deliveredFile, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

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
  throw new Error("Quote test server did not start");
}

function quotePayload(vehicle = "2012 Toyota Corolla") {
  return {
    submissionId: crypto.randomUUID(),
    name: "Test Person",
    phone: "0421 719 431",
    email: "test@example.com",
    suburb: "Brisbane",
    vehicle,
    condition: "Running",
    expectedPrice: "3500",
    consent: "yes",
    company: "",
    sourcePath: "/sell-my-car/",
    startedAt: Date.now() - 2_000,
  };
}

let requestNumber = 0;
async function post(body) {
  requestNumber += 1;
  return fetch(`${base}/api/quote/`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-vercel-forwarded-for": `203.0.113.${requestNumber}`,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
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
        VERCEL: "",
        QUOTE_OUTBOX_ENABLED: "false",
        NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --import=${mockModule}`.trim(),
        RESEND_API_KEY: "re_test_key",
        QUOTE_FROM_EMAIL: "Ozi Quotes <quotes@example.com>",
        QUOTE_TO_EMAIL: "contact@example.com",
        QUOTE_EMAIL_TIMEOUT_MS: "",
        QUOTE_TEST_DELIVERED_FILE: deliveredFile,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  await waitForServer();
});

after(async () => {
  try {
    if (server && server.exitCode === null) {
      server.kill("SIGTERM");
      await once(server, "exit");
    }
  } finally {
    rmSync(deliveredDirectory, { recursive: true, force: true });
  }
});

test("non-object JSON is rejected without a server error", async () => {
  for (const body of ["null", "[]", '"quote"', "123"]) {
    const response = await post(body);
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { ok: false, message: "The quote request was not valid." });
  }
});

test("a valid quote reaches the delivery boundary", async () => {
  const response = await post(quotePayload());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, message: "Your quote request has been sent." });
});

test("an expected price is optional and accepts the shapes visitors type", async () => {
  for (const expectedPrice of ["", "3500", "$3,500", "3 500", "3500.50", undefined]) {
    const response = await post({ ...quotePayload(), expectedPrice });
    assert.equal(response.status, 200, `expected price ${JSON.stringify(expectedPrice)} was rejected`);
    assert.equal((await response.json()).ok, true);
  }
});

test("the operator receives a complete currency amount, cents included", async () => {
  for (const [submitted, expected] of [["$3,500.50", "A$3,500.50"], ["3500", "A$3,500"], ["0.05", "A$0.05"]]) {
    const vehicle = `Currency check ${crypto.randomUUID()}`;
    const response = await post({ ...quotePayload(vehicle), expectedPrice: submitted });
    assert.equal(response.status, 200, `${submitted} was rejected`);
    const delivered = deliveredEmails().find((email) => email.subject.includes(vehicle));
    assert.ok(delivered, `${submitted} never reached the delivery provider`);
    assert.ok(
      delivered.text.split("\n").includes(`Expected price: ${expected}`),
      `${submitted} was delivered as ${JSON.stringify(delivered.text.match(/^Expected price: .*$/m)?.[0])}`,
    );
  }
});

test("an expected price that is not an amount is refused with correctable guidance", async () => {
  for (const expectedPrice of ["best offer", "-500", "12345678", "3500.555", "35e3"]) {
    const response = await post({ ...quotePayload(), expectedPrice });
    assert.equal(response.status, 400, `expected price ${JSON.stringify(expectedPrice)} was accepted`);
    const result = await response.json();
    assert.equal(result.ok, false);
    assert.match(result.message, /expected price as a dollar amount/);
  }
});

test("a blank timeout setting uses the safe default", async () => {
  const response = await post(quotePayload("[slow-success] Test Vehicle"));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).ok, true);
});

test("provider rejections return a controlled visitor-safe response", async () => {
  const response = await post(quotePayload("[provider-error] Test Vehicle"));
  assert.equal(response.status, 502);
  const result = await response.json();
  assert.equal(result.ok, false);
  assert.match(result.message, /0421 719 431/);
  assert.doesNotMatch(result.message, /provider detail/i);
});

test("malformed provider success responses remain retryable failures", async () => {
  const response = await post(quotePayload("[invalid-response] Test Vehicle"));
  assert.equal(response.status, 502);
  const result = await response.json();
  assert.equal(result.ok, false);
  assert.match(result.message, /0421 719 431/);
});

test("provider transport failures return a controlled response", async () => {
  const response = await post(quotePayload("[transport-error] Test Vehicle"));
  assert.equal(response.status, 502);
  assert.match((await response.json()).message, /0421 719 431/);
});

test("provider timeouts are bounded and return a controlled response", async () => {
  const started = Date.now();
  const response = await post(quotePayload("[timeout] Test Vehicle"));
  assert.equal(response.status, 504);
  const elapsed = Date.now() - started;
  assert.ok(elapsed >= 7_000 && elapsed < 10_000, `default timeout took ${elapsed} ms`);
  assert.match((await response.json()).message, /0421 719 431/);
});
