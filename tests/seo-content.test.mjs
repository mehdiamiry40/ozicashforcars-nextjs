import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { classifyPaths } from "../lib/region-rules.mjs";

const root = new URL("../", import.meta.url);
const inventory = JSON.parse(await readFile(new URL("data/site-index.json", root), "utf8"));
const origin = "https://www.ozicashforcars.com.au";
const classified = classifyPaths(Object.keys(inventory.pages));
assert.equal(Object.keys(inventory.pages).length, 282);
assert.equal(classified.redirects.size, 242);
assert.equal(classified.content.length, 40);
const pages = new Map(await Promise.all(classified.content.map(async (path) => {
  const filename = path === "/" ? "index" : path.slice(1, -1);
  const html = await readFile(new URL(`.next/server/app/${filename}.html`, root), "utf8");
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1];
  assert.ok(main, `${path} has no main content`);
  const graph = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1] ?? "{}")["@graph"];
  assert.ok(Array.isArray(graph), `${path} has no structured-data graph`);
  return [path, { html, main, graph, indexable: !/<meta name="robots" content="[^"]*noindex/.test(html) }];
})));

test("legacy suburb URLs are redirects, not rendered pages", async () => {
  for (const path of classified.redirects.keys()) {
    const filename = path.slice(1, -1);
    await assert.rejects(access(new URL(`.next/server/app/${filename}.html`, root)), { code: "ENOENT" });
  }
});

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

function headTitle(path) {
  return text(pages.get(path).html.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "");
}

function mainHeading(path) {
  return text(pages.get(path).main.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? "");
}

function anchors(html) {
  return new Map([...html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map(([, href, inner]) => [href, text(inner)]));
}

test("the homepage links to the core service pages from sentences, not only from lists", () => {
  const guide = pages.get("/").main.match(/<section\b[^>]*id="vehicle-guide"[\s\S]*?<\/section>/)?.[0];
  assert.ok(guide, "The homepage has no vehicle guide section");
  const links = anchors(guide);
  const expected = {
    "/cash-for-used-cars/": "Cash for used cars in Brisbane",
    "/cash-for-trucks/": "cash for trucks and commercial vehicles",
    "/car-removal-brisbane/": "car removal in Brisbane",
    "/scrap-car-removals/": "scrap car and shell removal",
    "/unwanted-car-removals/": "unwanted car removal from a property",
    "/cash-for-cars-brisbane-northern-suburbs/": "cash for cars in Brisbane's northern suburbs",
  };
  for (const [path, anchor] of Object.entries(expected)) {
    assert.equal(pages.get(path).indexable, true, path);
    assert.equal(links.get(path), anchor, path);
  }
  for (const path of ["/cash-for-cars-gold-coast/", "/cash-for-cars-brisbane-northern-suburbs/"]) {
    assert.doesNotMatch(pages.get(path).main, /id="vehicle-guide"/, path);
  }
  assert.match(pages.get("/about-us/").html, /<footer[\s\S]*href="\/cash-for-used-cars\/"/, "The footer no longer links to the used-cars page");
});

test("the used-cars page names Brisbane in its title, heading, description and opening copy", () => {
  const path = "/cash-for-used-cars/";
  const { html, main } = pages.get(path);
  assert.equal(headTitle(path), "Cash for Used Cars Brisbane | Ozi Cash for Cars");
  assert.equal(mainHeading(path), "Cash for Used Cars Brisbane");
  assert.match(html, /<meta name="description" content="[^"]*used car in Brisbane/);
  assert.match(text(main), /Selling a used car, ute, van or 4WD in Brisbane\?/);
  const links = anchors(main);
  for (const target of ["/sell-my-car/", "/used-car-removals/", "/cash-for-unwanted-cars/"]) assert.ok(links.has(target), target);
  for (const source of ["/sell-my-car/", "/used-car-removals/"]) {
    assert.equal(anchors(pages.get(source).main).get(path), "Cash for used cars in Brisbane", source);
  }
});

test("one page targets car removal in Brisbane and each narrower removal page links up to it", () => {
  const hub = "/car-removal-brisbane/";
  const narrower = ["/junk-car-removals/", "/scrap-car-removals/", "/old-car-removals/", "/unwanted-car-removals/", "/used-car-removals/", "/free-car-removals/"];
  const all = [hub, ...narrower];
  assert.equal(new Set(all.map(headTitle)).size, all.length, "Removal pages share a title");
  assert.equal(new Set(all.map(mainHeading)).size, all.length, "Removal pages share a heading");
  assert.equal(new Set(all.map((path) => pages.get(path).html.match(/<meta name="description" content="([^"]*)"/)?.[1])).size, all.length, "Removal pages share a description");
  for (const path of all) {
    assert.ok(headTitle(path).length <= 60, `${path} title is ${headTitle(path).length} characters`);
    assert.doesNotMatch(headTitle(path), /…/, path);
  }
  assert.match(headTitle(hub), /^Car Removal Brisbane \| /);
  assert.equal(mainHeading(hub), "Car Removal Brisbane");
  assert.match(text(pages.get(hub).main), /junk car/);
  const hubLinks = anchors(pages.get(hub).main);
  for (const path of narrower) {
    assert.ok(hubLinks.has(path), `${hub} does not link to ${path}`);
    assert.doesNotMatch(headTitle(path) + mainHeading(path), /Brisbane/, `${path} competes for the Brisbane removal title`);
    const links = anchors(pages.get(path).main);
    assert.equal(links.get(hub), "car removal in Brisbane", path);
    for (const other of narrower) {
      if (other !== path) assert.equal(links.get(other), hubLinks.get(other), `${path} to ${other}`);
    }
  }
  assert.equal(new Set(narrower.map((path) => hubLinks.get(path))).size, narrower.length, "Removal pages share an anchor");
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
    assert.equal(organization.telephone, "+61421719431", path);
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
  assert.equal(pages.get("/testimonials/").indexable, false);
  assert.equal(pages.get("/vehicles/").indexable, false);
  assert.equal(pages.get("/cash-for-cars-sunshine-coast/").indexable, false);
  assert.doesNotMatch(pages.get("/").html, /href="\/testimonials\/"/);
  assert.doesNotMatch(pages.get("/").html, /<title>[^<]*Free Car Removal/);
  assert.doesNotMatch(text(pages.get("/").main), /Free towing|Standard local pickup included/);
  assert.match(text(pages.get("/").main), /Do not rely on a general 'free removal' label to settle the details of a difficult recovery/);
  assert.match(text(pages.get("/").main), /Standard towing is included in covered pickup arrangements/);
  assert.match(text(pages.get("/free-car-removals/").main), /Do not rely on a general 'free removal' label to settle the details of a difficult recovery/);
  for (const path of ["/cash-for-cars-gold-coast/", "/cash-for-cars-logan-city-suburbs/", "/cash-for-cars-sunshine-coast/"]) {
    assert.doesNotMatch(text(pages.get(path).html.replace("Brisbane, Queensland", "")), /Brisbane team|Car removal Brisbane/, path);
  }
  assert.match(text(pages.get("/cash-for-cars-brisbane-northern-suburbs/").main), /Speak with our Brisbane team/);
  assert.doesNotMatch(pages.get("/testimonials/").main, /<blockquote\b/);
  const privacy = text(pages.get("/privacy-policy/").main);
  assert.match(privacy, /database for deletion after 90 days/);
  assert.match(privacy, /does not automatically delete copies in email inboxes/);
});
