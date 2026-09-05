const origin = process.env.QUOTE_MONITOR_ORIGIN;
const secret = process.env.QUOTE_MONITOR_SECRET;
if (!origin || !secret || secret.length < 32) {
  throw new Error("Set QUOTE_MONITOR_ORIGIN and QUOTE_MONITOR_SECRET before enabling quote monitoring.");
}
const url = new URL(origin);
if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
  throw new Error("QUOTE_MONITOR_ORIGIN must be an HTTPS origin without credentials or a path.");
}
url.pathname = "/api/internal/quotes/health/";
const response = await fetch(url, {
  headers: { authorization: `Bearer ${secret}`, accept: "application/json" },
  redirect: "error",
  signal: AbortSignal.timeout(20_000),
});
// Never include response bodies, credentials or customer details in CI logs.
const result = await response.json().catch(() => null);
if (!response.ok || result?.ok !== true) {
  throw new Error(`Quote pipeline check failed (HTTP ${response.status}). Inspect the deployment and quote delivery runbook.`);
}
console.log("Quote pipeline is healthy.");
