import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import test, { after, before } from "node:test";
import { MERGED_PAGES } from "../lib/region-rules.mjs";

// The other redirect tests read the compiled rules. This one asks the built
// server, because the hop count is only real once the trailing-slash redirect
// and the merged-page redirect have both had their chance to answer.
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
  throw new Error("Merged-page test server did not start");
}

function get(path) {
  return fetch(`${base}${path}`, { redirect: "manual" });
}

before(async () => {
  const port = await freePort();
  base = `http://127.0.0.1:${port}`;
  server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", String(port)],
    { cwd: new URL(".", root), env: { ...process.env, VERCEL: "" }, stdio: ["ignore", "pipe", "pipe"] },
  );
  await waitForServer();
});

after(async () => {
  if (server && server.exitCode === null) {
    server.kill("SIGTERM");
    await once(server, "exit");
  }
});

test("each merged page answers one permanent redirect to the page that took it in, with or without a trailing slash", async () => {
  assert.equal(Object.keys(MERGED_PAGES).length, 4);
  for (const [path, destination] of Object.entries(MERGED_PAGES)) {
    for (const requested of [path, path.replace(/\/$/, "")]) {
      const response = await get(requested);
      assert.equal(response.status, 301, requested);
      assert.equal(new URL(response.headers.get("location"), base).pathname, destination, requested);
    }
    const landed = await get(destination);
    assert.equal(landed.status, 200, `${destination} is not a direct 200, so ${path} would take a second hop`);
  }
});

test("a merged page keeps the query string and never serves its old content", async () => {
  const response = await get("/scrap-car-removals/?utm_source=test");
  assert.equal(response.status, 301);
  const location = new URL(response.headers.get("location"), base);
  assert.equal(location.pathname, "/car-removal-brisbane/");
  assert.equal(location.searchParams.get("utm_source"), "test");
  assert.equal((await response.text()).includes("<h1"), false);
});

test("the page that took them in is served once, at its trailing-slash address, with the four section anchors", async () => {
  const slashless = await get("/car-removal-brisbane");
  assert.equal(slashless.status, 308);
  assert.equal(new URL(slashless.headers.get("location"), base).pathname, "/car-removal-brisbane/");
  const html = await (await get("/car-removal-brisbane/")).text();
  assert.equal(html.match(/<h1\b/g)?.length, 1);
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.ozicashforcars\.com\.au\/car-removal-brisbane\/"/);
  for (const id of ["junk-cars", "scrap-cars", "old-cars", "unwanted-cars"]) {
    assert.match(html, new RegExp(`<section\\b[^>]*\\bid="${id}"`), id);
  }
});

test("the removal pages that were not merged are still served directly", async () => {
  for (const path of ["/free-car-removals/", "/used-car-removals/", "/unwanted-truck-removals/"]) {
    assert.equal((await get(path)).status, 200, path);
  }
});
