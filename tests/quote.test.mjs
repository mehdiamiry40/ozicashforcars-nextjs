import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import test, { after, before } from "node:test";

const root = new URL("../", import.meta.url);
let server;
let base;

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
    name: "Test Person",
    phone: "0421 719 431",
    email: "test@example.com",
    suburb: "Brisbane",
    vehicle,
    condition: "Running",
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
        NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --import=${mockModule}`.trim(),
        RESEND_API_KEY: "re_test_key",
        QUOTE_FROM_EMAIL: "Ozi Quotes <quotes@example.com>",
        QUOTE_TO_EMAIL: "contact@example.com",
        QUOTE_EMAIL_TIMEOUT_MS: "",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  await waitForServer();
});

after(async () => {
  if (!server || server.exitCode !== null) return;
  server.kill("SIGTERM");
  await once(server, "exit");
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
