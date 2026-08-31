import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { access, readFile } from "node:fs/promises";
import { request as httpRequest } from "node:http";
import { createServer } from "node:net";
import test, { after, before } from "node:test";

const root = new URL("../", import.meta.url);
const index = JSON.parse(await readFile(new URL("data/site-index.json", root), "utf8"));
const paths = Object.keys(index.pages);
const knownPaths = new Set(paths);
let port;
let base;
const legacyRedirects = [
  { source: "/cash-for-cars-brisbane/", destination: "/" },
  {
    source: "/cash-for-cars-logan-city-suburbs/cash-for-cars-beenleigh/",
    destination: "/logan-city-suburbs/cash-for-cars-beenleigh/",
  },
  {
    source: "/brisbane-eastern-suburbs/brisbane-eastern-suburbs/cash-for-cars-belmont/",
    destination: "/brisbane-eastern-suburbs/cash-for-cars-belmont/",
  },
  {
    source: "/brisbane-northern-suburbs/cash-for-cars-lutwyche-mcdowall/",
    destination: "/brisbane-northern-suburbs/cash-for-cars-lutwyche/",
  },
  {
    source: "/brisbane-northern-suburbs/cash-for-cars-wilston/",
    destination: "/brisbane-southern-suburbs/cash-for-cars-wilston/",
  },
  {
    source: "/brisbane-northern-suburbs/cash-for-cars-wooloowin/",
    destination: "/brisbane-southern-suburbs/cash-for-cars-wooloowin/",
  },
];
let server;

async function freePort() {
  const probe = createServer();
  probe.listen(0, "127.0.0.1");
  await once(probe, "listening");
  const address = probe.address();
  const availablePort = typeof address === "object" && address ? address.port : 0;
  probe.close();
  await once(probe, "close");
  return availablePort;
}

function postChunked(path, body) {
  return new Promise((resolve, reject) => {
    const request = httpRequest({ host: "127.0.0.1", port, path, method: "POST", headers: { "content-type": "application/json" } }, (response) => {
      response.resume();
      response.on("end", () => resolve(response.statusCode));
    });
    request.on("error", reject);
    request.write(body);
    request.end();
  });
}

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(base, { redirect: "manual" });
      if (response.status < 500) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Production server did not start");
}

before(async () => {
  port = await freePort();
  base = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", String(port)], {
    cwd: new URL(".", root),
    env: { ...process.env, RESEND_API_KEY: "", QUOTE_FROM_EMAIL: "", QUOTE_TO_EMAIL: "" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  await waitForServer();
});

after(async () => {
  if (!server || server.exitCode !== null) return;
  server.kill("SIGTERM");
  await once(server, "exit");
});

test("all 282 known URLs render successfully", async () => {
  assert.equal(paths.length, 282);
  for (let offset = 0; offset < paths.length; offset += 24) {
    const batch = paths.slice(offset, offset + 24);
    const responses = await Promise.all(batch.map((path) => fetch(`${base}${path}`)));
    responses.forEach((response, indexInBatch) => {
      assert.equal(response.status, 200, `${batch[indexInBatch]} returned ${response.status}`);
    });
  }
});

test("the primary page is semantic, accessible and free of legacy runtime markup", async () => {
  const response = await fetch(base);
  const html = await response.text();
  assert.match(html, /<html lang="en-AU"/);
  assert.match(html, /<header class="site-header"/);
  assert.match(html, /<nav class="site-nav" aria-label="Primary navigation"/);
  assert.match(html, /<main id="main-content"/);
  assert.match(html, /<footer class="site-footer"/);
  assert.match(html, /<label for="quote-name"/);
  assert.match(html, /href="#quote"/);
  assert.doesNotMatch(html, /href="#"/);
  assert.doesNotMatch(html, /wp-json|contact-form-7|googletagmanager|SiteSnapshot/i);
});

test("SEO metadata consolidates suburb pages and keeps private utility pages out of search", async () => {
  const locationPath = "/brisbane-northern-suburbs/cash-for-cars-aspley/";
  const locationHtml = await (await fetch(`${base}${locationPath}`)).text();
  assert.match(locationHtml, /<meta name="robots" content="noindex, follow"/);
  assert.match(locationHtml, /<link rel="canonical" href="https:\/\/www\.ozicashforcars\.com\.au\/cash-for-cars-brisbane-northern-suburbs\/"/);

  const thankYouHtml = await (await fetch(`${base}/thank-you/`)).text();
  assert.match(thankYouHtml, /<meta name="robots" content="noindex, follow"/);

  const sitemap = await (await fetch(`${base}/sitemap.xml`)).text();
  assert.match(sitemap, /https:\/\/www\.ozicashforcars\.com\.au\//);
  const sitemapLocations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  assert.ok(!sitemapLocations.some((url) => ["/thank-you/", "/useful-links/", "/sitemap/"].some((path) => url.endsWith(path))));
  assert.ok(!sitemapLocations.some((url) => url.endsWith(locationPath)));
});

test("page titles and descriptions stay within search-friendly limits", async () => {
  for (const path of paths) {
    const html = await (await fetch(`${base}${path}`)).text();
    const title = html.match(/<title>([^<]+)<\/title>/)?.[1] ?? "";
    const description = html.match(/<meta name="description" content="([^"]+)"/)?.[1] ?? "";
    assert.ok(title.length > 10 && title.length <= 60, `${path} title length ${title.length}`);
    assert.ok(description.length >= 70 && description.length <= 160, `${path} description length ${description.length}`);
  }
});

test("all rendered internal links resolve to a known route", async () => {
  const checked = new Set();
  for (const path of paths) {
    const html = await (await fetch(`${base}${path}`)).text();
    for (const match of html.matchAll(/<a\b[^>]*href="([^"]+)"/g)) {
      const href = match[1].replaceAll("&amp;", "&");
      if (href.startsWith("#") || href.startsWith("tel:") || href.startsWith("mailto:") || href.startsWith("https://")) continue;
      const pathname = new URL(href, base).pathname.replace(/\/$/, "") || "/";
      const normalized = pathname === "/" ? "/" : `${pathname}/`;
      if (checked.has(normalized)) continue;
      checked.add(normalized);
      assert.ok(knownPaths.has(normalized), `${path} links to unknown route ${normalized}`);
    }
  }
});

test("every legacy redirect is one permanent hop to a live canonical route", async () => {
  for (const { source, destination } of legacyRedirects) {
    const redirect = await fetch(`${base}${source}`, { redirect: "manual" });
    assert.equal(redirect.status, 308, `${source} returned ${redirect.status}`);

    const location = new URL(redirect.headers.get("location"), base);
    assert.equal(location.origin, base, `${source} redirected off origin`);
    assert.equal(location.pathname, destination, `${source} did not use its canonical target`);

    const final = await fetch(location, { redirect: "manual" });
    assert.equal(final.status, 200, `${source} final target returned ${final.status}`);
    assert.equal(final.headers.get("location"), null, `${source} required more than one hop`);
  }
});

test("security headers and the quote endpoint behave safely", async () => {
  const response = await fetch(base);
  assert.match(response.headers.get("content-security-policy") ?? "", /default-src 'self'/);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.match(response.headers.get("strict-transport-security") ?? "", /max-age=63072000/);

  const rejected = await fetch(`${base}/api/quote/`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://malicious.example" },
    body: "{}",
  });
  assert.equal(rejected.status, 403);

  const sameOrigin = await fetch(`${base}/api/quote/`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: base },
    body: JSON.stringify({
      name: "Test Person", phone: "0421 719 431", suburb: "Brisbane", vehicle: "2012 Toyota Corolla",
      consent: "yes", company: "", sourcePath: "/", startedAt: Date.now() - 2000,
    }),
  });
  assert.equal(sameOrigin.status, 503);

  const oversizedStatus = await postChunked("/api/quote/", JSON.stringify({ condition: "A".repeat(30_000) }));
  assert.equal(oversizedStatus, 413);

  const unavailable = await fetch(`${base}/api/quote/`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Test Person", phone: "0421 719 431", suburb: "Brisbane", vehicle: "2012 Toyota Corolla",
      consent: "yes", company: "", sourcePath: "/", startedAt: Date.now() - 2000,
    }),
  });
  assert.equal(unavailable.status, 503);
  assert.match((await unavailable.json()).message, /0421 719 431/);
});

test("unknown routes return a real 404 and the old runtime is gone", async () => {
  assert.equal((await fetch(`${base}/definitely-not-a-real-page/`)).status, 404);
  await assert.rejects(access(new URL("app/SiteSnapshot.tsx", root)));
  await assert.rejects(access(new URL("data/page-loaders.ts", root)));
  await access(new URL("public/wp-content/uploads/2019/07/cropped-favicon-32x32.png", root));
});
