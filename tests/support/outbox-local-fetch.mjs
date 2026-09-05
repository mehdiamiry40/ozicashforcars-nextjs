// Test-only transport: production still uses the unmodified Neon HTTP driver.
// This module is preloaded into both the tests and the built Next server.
import { neonConfig } from "@neondatabase/serverless";

const databaseUrl = process.env.OUTBOX_TEST_DATABASE_URL;
const proxyUrl = process.env.OUTBOX_TEST_PROXY_URL;
const token = process.env.OUTBOX_TEST_PROXY_TOKEN;
if (!databaseUrl || !proxyUrl || !token) throw new Error("Use npm run test:outbox with an isolated local PostgreSQL server");
const target = new URL(proxyUrl);
if (target.protocol !== "http:" || target.hostname !== "127.0.0.1" || target.pathname !== "/sql") {
  throw new Error("The outbox test proxy must use loopback HTTP");
}
if (!/^postgresql:\/\/outbox:outbox@outbox\.test\/outbox_test_[a-f0-9]+$/.test(databaseUrl)) {
  throw new Error("The outbox tests require a synthetic database connection string");
}
if (process.env.DATABASE_URL !== databaseUrl || process.env.DATABASE_URL_UNPOOLED) {
  throw new Error("Refusing outbox tests with ordinary database credentials");
}
const endpoint = typeof neonConfig.fetchEndpoint === "function"
  ? neonConfig.fetchEndpoint("outbox.test", 5432)
  : neonConfig.fetchEndpoint;

const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
  const headers = new Headers(init.headers ?? (input instanceof Request ? input.headers : undefined));
  if (url.href === endpoint && headers.get("Neon-Connection-String") === databaseUrl) {
    headers.set("Authorization", `Bearer ${token}`);
    return originalFetch(proxyUrl, { ...init, headers, redirect: "error" });
  }
  if (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") {
    throw new Error(`Outbox tests cannot make external requests: ${url.origin}`);
  }
  return originalFetch(input, { ...init, redirect: "error" });
};
