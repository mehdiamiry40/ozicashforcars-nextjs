import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const inventory = JSON.parse(await readFile(new URL("data/site-index.json", root), "utf8"));
const origin = "https://www.ozicashforcars.com.au";
const pages = new Map(await Promise.all(Object.keys(inventory.pages).map(async (path) => {
  const filename = path === "/" ? "index" : path.slice(1, -1);
  const html = await readFile(new URL(`.next/server/app/${filename}.html`, root), "utf8");
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1];
  assert.ok(main, `${path} has no main content`);
  const graph = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1] ?? "{}")["@graph"];
  assert.ok(Array.isArray(graph), `${path} has no structured-data graph`);
  return [path, { html, main, graph, indexable: !/<meta name="robots" content="[^"]*noindex/.test(html) }];
})));

function text(html) {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, "")
    .replace(/<[^>]+>/g, " ").replace(/&(?:#x27|#39|apos);/g, "'")
    .replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}

function internalLinks(html, path) {
  return [...html.matchAll(/<a\b[^>]*href="([^"]+)"/g)].flatMap(([, href]) => {
    const url = new URL(href.replaceAll("&amp;", "&"), `${origin}${path}`);
    return url.origin === origin && pages.has(url.pathname) ? [url.pathname] : [];
  });
}

test("every retained indexable page is reachable by links from the homepage", () => {
  const reachable = new Set(["/"]);
  const queue = ["/"];
  for (let i = 0; i < queue.length; i += 1) {
    for (const target of internalLinks(pages.get(queue[i]).html, queue[i])) {
      if (!reachable.has(target)) { reachable.add(target); queue.push(target); }
    }
  }
  const missing = [...pages].filter(([path, page]) => page.indexable && !reachable.has(path)).map(([path]) => path);
  assert.deepEqual(missing, [], `Indexable pages are orphaned: ${missing.join(", ")}`);
});

test("indexable pages do not repeat the same body with only a different heading", () => {
  const bodies = new Map();
  for (const [path, page] of pages) {
    if (!page.indexable) continue;
    const body = text(page.main.replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/, ""));
    assert.ok(!bodies.has(body), `${path} repeats the main content of ${bodies.get(body)}`);
    bodies.set(body, path);
  }
});

test("truck, recycling and collection pages address different user questions", () => {
  const truck = text(pages.get("/cash-for-trucks/").main);
  assert.match(truck, /GVM/);
  assert.match(truck, /axle configuration/);
  assert.match(truck, /size or weight limit/);
  const recycling = text(pages.get("/car-recycling-brisbane/").main);
  assert.match(recycling, /fluids and batteries/);
  assert.match(recycling, /receiving facility/);
  assert.match(recycling, /does not promise a recovery percentage/);
  const removal = text(pages.get("/free-car-removals/").main);
  assert.match(removal, /net amount/);
  assert.match(removal, /additional work or cost/);
});

test("the FAQ route puts questions before its quote form", () => {
  const { main } = pages.get("/frequently-asked-questions/");
  const firstQuestion = main.indexOf("<summary>");
  assert.ok(firstQuestion >= 0 && firstQuestion < main.indexOf("<form"));
  assert.match(text(main), /registration status and the buyer/);
  assert.match(text(main), /quote request is not a confirmed booking/);
});

test("schema describes informational pages accurately without inventing a public address or ratings", () => {
  for (const [path, page] of pages) {
    const organization = page.graph.find((entity) => entity["@type"] === "Organization");
    assert.ok(organization?.name && organization.url, `${path} has no named organization`);
    assert.equal(organization.address, undefined);
    assert.ok(!page.graph.some((entity) => ["LocalBusiness", "AutomotiveBusiness"].some((kind) => [].concat(entity["@type"]).includes(kind))), path);
    assert.ok(!page.graph.some((entity) => entity.aggregateRating || entity.review), path);
  }
  const types = {
    "/about-us/": "AboutPage", "/contact-us/": "ContactPage", "/blog/": "CollectionPage",
    "/vehicles/": "CollectionPage", "/privacy-policy/": "WebPage", "/testimonials/": "WebPage",
    "/thank-you/": "WebPage", "/frequently-asked-questions/": "WebPage",
  };
  for (const [path, expected] of Object.entries(types)) {
    assert.ok(pages.get(path).graph.some((entity) => entity["@type"] === expected), path);
    assert.ok(!pages.get(path).graph.some((entity) => entity["@type"] === "Service"), path);
  }
  assert.ok(pages.get("/cash-for-trucks/").graph.some((entity) => entity["@type"] === "Service"));
  const sunshineService = pages.get("/cash-for-cars-sunshine-coast/").graph.find((entity) => entity["@type"] === "Service");
  assert.equal(sunshineService.areaServed, undefined, "Unverified Sunshine Coast coverage must not become a schema assertion");
  for (const [path, page] of pages) {
    if (!path.startsWith("/blog/") || path === "/blog/") continue;
    const article = page.graph.find((entity) => entity["@type"] === "BlogPosting");
    assert.ok(article?.author?.url && article.image, path);
    assert.equal(article.datePublished, undefined, "A capture timestamp is not a publication date");
  }
});

test("authored metadata and trust copy exclude unsupported legacy promises", () => {
  for (const [path, { html, main }] of pages) {
    const metadata = [...html.matchAll(/<(?:title|meta)\b[^>]*>[\s\S]*?<\/title>|<meta\b[^>]*>/g)].map(([tag]) => tag).join(" ");
    assert.doesNotMatch(text(main) + metadata, /\b1\s*HR\b|\$19,999|satisfaction guaranteed|★★★★★|Brisbane customer|Logan customer|Gold Coast customer/i, path);
  }
  assert.doesNotMatch(pages.get("/testimonials/").main, /<blockquote\b/);
  const privacy = text(pages.get("/privacy-policy/").main);
  assert.match(privacy, /database for deletion after 90 days/);
  assert.match(privacy, /does not automatically delete copies in email inboxes/);
});
