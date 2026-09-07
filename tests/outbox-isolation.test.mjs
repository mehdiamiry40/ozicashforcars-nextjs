import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { once } from "node:events";
import test from "node:test";

const root = new URL("../", import.meta.url);
const env = {
  ...process.env,
  DATABASE_URL: "",
  DATABASE_URL_UNPOOLED: "",
  NEON_PROJECT_ID: "",
  OUTBOX_TEST_POSTGRES_URL: "",
};

for (const [description, overrides, message] of [
  ["ordinary pooled database credentials", { DATABASE_URL: "postgresql://do-not-use.example/production" }, /ordinary database configuration/],
  ["ordinary unpooled database credentials", { DATABASE_URL_UNPOOLED: "postgresql://do-not-use.example/production" }, /ordinary database configuration/],
  ["missing isolated database configuration", {}, /OUTBOX_TEST_POSTGRES_URL is required/],
  ["a remote database host", { OUTBOX_TEST_POSTGRES_URL: "postgresql://quote_ci:unused@do-not-use.example/postgres" }, /must name the quote_ci user/],
  ["an existing application database", { OUTBOX_TEST_POSTGRES_URL: "postgresql://quote_ci:unused@127.0.0.1/production" }, /must name the quote_ci user/],
  ["connection overrides", { OUTBOX_TEST_POSTGRES_URL: "postgresql://quote_ci:unused@127.0.0.1/postgres?host=do-not-use.example" }, /must name the quote_ci user/],
]) {
  test(`the outbox runner refuses ${description} before connecting`, () => {
    const result = spawnSync(process.execPath, ["scripts/test-outbox-isolated.mjs"], {
      cwd: root,
      encoding: "utf8",
      env: { ...env, ...overrides },
      timeout: 5_000,
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, message);
  });
}

// The redirect target must be loopback the transport's allowlist rejects. ::1 is
// the sharpest case — a different address family, still the same machine — but
// some containers carry no IPv6 stack, so a second IPv4 loopback address stands
// in. Both are outside the allowlist, so the property under test is unchanged.
const FORBIDDEN_ADDRESSES = ["::1", "127.0.0.2"];

function listenOn(server, address) {
  return new Promise((resolve, reject) => {
    const onError = (error) => { server.removeListener("listening", onListening); reject(error); };
    const onListening = () => { server.removeListener("error", onError); resolve(); };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(0, address);
  });
}

async function listenOutsideAllowlist(server) {
  const failures = [];
  for (const address of FORBIDDEN_ADDRESSES) {
    try {
      await listenOn(server, address);
      return address.includes(":") ? `[${address}]` : address;
    } catch (error) {
      failures.push(`${address} (${error.code ?? error.message})`);
    }
  }
  throw new Error(`No loopback address outside the allowlist could be bound: ${failures.join(", ")}`);
}

test("the local test transport cannot follow redirects outside its allowlist", async () => {
  let forbiddenRequests = 0;
  const forbidden = createServer((_request, response) => {
    forbiddenRequests += 1;
    response.end("must not be reached");
  });
  const forbiddenHost = await listenOutsideAllowlist(forbidden);
  const allowed = createServer((_request, response) => {
    response.writeHead(302, { location: `http://${forbiddenHost}:${forbidden.address().port}/forbidden` });
    response.end();
  });
  try {
    allowed.listen(0, "127.0.0.1");
    await once(allowed, "listening");
    const databaseUrl = "postgresql://outbox:outbox@outbox.test/outbox_test_abcdef";
    const proxyUrl = `http://127.0.0.1:${allowed.address().port}/sql`;
    const child = spawn(process.execPath, ["--import", "./tests/support/outbox-local-fetch.mjs", "--input-type=module", "--eval", `
      import assert from 'node:assert/strict';
      import { neonConfig } from '@neondatabase/serverless';
      await assert.rejects(fetch(process.env.OUTBOX_TEST_PROXY_URL, {redirect:'follow'}), TypeError);
      const endpoint = typeof neonConfig.fetchEndpoint === 'function' ? neonConfig.fetchEndpoint('outbox.test',5432) : neonConfig.fetchEndpoint;
      await assert.rejects(fetch(endpoint, {redirect:'follow',headers:{'Neon-Connection-String':process.env.DATABASE_URL}}), TypeError);
    `], {
      cwd:root,
      env:{...env,DATABASE_URL:databaseUrl,OUTBOX_TEST_DATABASE_URL:databaseUrl,OUTBOX_TEST_PROXY_URL:proxyUrl,OUTBOX_TEST_PROXY_TOKEN:"synthetic-test-token",NODE_OPTIONS:""},
      stdio:["ignore","pipe","pipe"],
    });
    let output = "";
    child.stdout.on("data", chunk => { output += chunk; });
    child.stderr.on("data", chunk => { output += chunk; });
    const timer = setTimeout(() => child.kill("SIGTERM"), 5_000);
    const [code] = await once(child, "exit");
    clearTimeout(timer);
    assert.equal(code,0,output);
    assert.equal(forbiddenRequests,0,"neither a local application nor a proxy redirect may escape the allowlist");
  } finally {
    await Promise.all([allowed,forbidden].map(server => new Promise(resolve => server.close(resolve))));
  }
});
