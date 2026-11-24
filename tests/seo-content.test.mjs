import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { classifyPaths } from "../lib/region-rules.mjs";

const root = new URL("../", import.meta.url);
const inventory = JSON.parse(await readFile(new URL("data/site-index.json", root), "utf8"));
const origin = "https://www.ozicashforcars.com.au";
const classified = classifyPaths(Object.keys(inventory.pages));
assert.equal(Object.keys(inventory.pages).length, 282);
assert.equal(classified.redirects.size, 246);
assert.equal(classified.merged.size, 4);
assert.equal(classified.content.length, 36);
const pages = new Map(await Promise.all(classified.content.map(async (path) => {
  const filename = path === "/" ? "index" : path.slice(1, -1);
  const html = await readFile(new URL(`.next/server/app/${filename}.html`, root), "utf8");
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1];
  assert.ok(main, `${path} has no main content`);
  const graph = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1] ?? "{}")["@graph"];
  assert.ok(Array.isArray(graph), `${path} has no structured-data graph`);
  return [path, { html, main, graph, indexable: !/<meta name="robots" content="[^"]*noindex/.test(html) }];
})));

test("legacy suburb URLs and merged pages are redirects, not rendered pages", async () => {
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
    "/cash-for-trucks/#old-trucks": "cash for old and unwanted trucks",
    "/cash-for-trucks/#scrap-trucks": "cash for scrap and junk trucks",
    "/car-removal-brisbane/": "car removal in Brisbane",
    "/car-removal-brisbane/#scrap-cars": "scrap car and shell removal",
    "/car-removal-brisbane/#unwanted-cars": "unwanted car removal from a property",
    "/cash-for-cars-brisbane-northern-suburbs/": "cash for cars in Brisbane's northern suburbs",
  };
  for (const [href, anchor] of Object.entries(expected)) {
    const [path, fragment] = href.split("#");
    assert.equal(pages.get(path).indexable, true, href);
    assert.equal(links.get(href), anchor, href);
    if (fragment) assert.match(pages.get(path).main, new RegExp(`<section\\b[^>]*\\bid="${fragment}"`), href);
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

const REMOVAL_PAGE = "/car-removal-brisbane/";
const MERGED_REMOVAL_PAGES = ["/junk-car-removals/", "/scrap-car-removals/", "/old-car-removals/", "/unwanted-car-removals/"];
// The sections that replaced the four pages, with the guidance and the questions each one brought.
const REMOVAL_SECTIONS = [
  {
    id: "junk-cars",
    heading: "Junk car removal for neglected cars",
    points: ["Assess the site without disturbing the car", "Identify loading obstacles", "Separate the vehicle from a site clean-up"],
    guidance: [/soft ground or has sunk during storage/, /missing wheels, disconnected suspension, locked steering/, /unrelated waste before accepting terms/],
    questions: ["Can I book before clearing overgrown access?", "What if there are no keys?"],
  },
  {
    id: "scrap-cars",
    heading: "Scrap car and shell removal",
    points: ["Describe the shell and remaining components", "Disclose potential handling issues", "Confirm release and collection records"],
    guidance: [/missing wheels, engine, transmission or suspension parts/, /leaks, damaged fuel systems, loose batteries/, /evidence of disposal/],
    questions: ["Can a shell without wheels be collected?", "Can I add other scrap metal to the pickup?"],
  },
  {
    id: "old-cars",
    heading: "Old car removal after long storage",
    points: ["Describe the effects of storage", "Find the handover essentials early", "Plan removal from its current position"],
    guidance: [/how long the car has been parked/, /keys and documents showing your authority to sell/, /forms part of an estate/, /garage clearance, gate width/],
    questions: ["Do I have to get a long-stored car running?", "Can an estate vehicle be removed straight away?"],
  },
  {
    id: "unwanted-cars",
    heading: "Unwanted car removal from a property",
    points: ["Confirm the right to remove and sell it", "Coordinate with the property contact", "Make the timing practical"],
    guidance: [/tenant, neighbour, relative or previous occupant/, /who can unlock gates or arrange access/, /Do not assume a deadline is booked until it is confirmed/],
    questions: ["Can you take an apparently abandoned car from my property?", "Can someone else attend the pickup for me?"],
  },
];

function sectionById(main, id) {
  const start = main.search(new RegExp(`<section\\b[^>]*\\bid="${id}"`));
  if (start < 0) return null;
  const rest = main.slice(start + 1);
  const next = rest.search(/<section\b/);
  return main.slice(start, next < 0 ? undefined : start + 1 + next);
}

test("one page covers car removal in Brisbane, and the two removal pages that stay separate link up to it", () => {
  const hub = REMOVAL_PAGE;
  const narrower = ["/used-car-removals/", "/free-car-removals/"];
  const all = [hub, ...narrower];
  assert.equal(new Set(all.map(headTitle)).size, all.length, "Removal pages share a title");
  assert.equal(new Set(all.map(mainHeading)).size, all.length, "Removal pages share a heading");
  assert.equal(new Set(all.map((path) => pages.get(path).html.match(/<meta name="description" content="([^"]*)"/)?.[1])).size, all.length, "Removal pages share a description");
  for (const path of all) {
    assert.ok(headTitle(path).length <= 60, `${path} title is ${headTitle(path).length} characters`);
    assert.doesNotMatch(headTitle(path), /…/, path);
  }
  assert.equal(headTitle(hub), "Car Removal Brisbane | Junk, Scrap and Unwanted Cars");
  assert.equal(mainHeading(hub), "Car Removal Brisbane");
  assert.match(pages.get(hub).html, /<meta name="description" content="[^"]*junk, scrap, old or unwanted car/);
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
  assert.equal(anchors(pages.get("/sell-my-car/").main).get(hub), "Car removal in Brisbane");
});

test("the Brisbane removal page carries the four merged pages as anchored sections, with their guidance and questions", () => {
  const { main } = pages.get(REMOVAL_PAGE);
  assert.equal(main.match(/<h1\b/g)?.length, 1, "The merged page must keep exactly one H1");
  const hubLinks = anchors(main);
  const questions = [...main.matchAll(/<summary>([\s\S]*?)<\/summary>/g)].map(([, inner]) => text(inner));
  assert.equal(new Set(questions).size, questions.length, "A question is repeated on the merged page");
  for (const general of ["Can a car be removed from an underground garage?", "Can I choose any collection time?", "Can a junk car that does not run be removed?"]) {
    assert.ok(questions.includes(general), general);
  }
  let lastPosition = main.indexOf("Agree on the handover plan");
  assert.ok(lastPosition > 0, "The general access, loading and handover guidance is missing");
  for (const section of REMOVAL_SECTIONS) {
    const html = sectionById(main, section.id);
    assert.ok(html, `No section with id="${section.id}"`);
    assert.equal(main.match(new RegExp(`\\bid="${section.id}"`, "g")).length, 1, `id="${section.id}" is repeated`);
    assert.equal(text(html.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/)?.[1] ?? ""), section.heading, section.id);
    const position = main.indexOf(html);
    assert.ok(position > lastPosition, `${section.id} is out of order`);
    lastPosition = position;
    const body = text(main.slice(position, position + 6000));
    for (const point of section.points) assert.ok(body.includes(point), `${section.id} lost "${point}"`);
    for (const pattern of section.guidance) assert.match(text(main), pattern, section.id);
    for (const question of section.questions) assert.ok(questions.includes(question), `${section.id} lost the question "${question}"`);
    // The page's own list of situations points at the section, not at the page it replaced.
    assert.equal(hubLinks.get(`${REMOVAL_PAGE}#${section.id}`), section.heading, section.id);
  }
  assert.equal(questions.length, 3 + REMOVAL_SECTIONS.reduce((count, section) => count + section.questions.length, 0));
  // Merging adds no promise the separate pages did not make.
  assert.doesNotMatch(text(main), /free towing|same[- ]day|top dollar|instant cash|\$\d/i);
});

test("no rendered page links to a redirected URL, and every fragment link lands on a real id", () => {
  const redirected = new Set(classified.redirects.keys());
  assert.equal(MERGED_REMOVAL_PAGES.every((path) => redirected.has(path)), true);
  for (const [path, { html }] of pages) {
    for (const [, href] of html.matchAll(/<a\b[^>]*href="([^"]+)"/g)) {
      const url = new URL(href.replaceAll("&amp;", "&"), `${origin}${path}`);
      if (url.origin !== origin) continue;
      const target = url.pathname.endsWith("/") ? url.pathname : `${url.pathname}/`;
      assert.equal(redirected.has(target), false, `${path} links to ${href}, which redirects to ${classified.redirects.get(target)}`);
      if (!url.hash || !pages.has(target)) continue;
      const id = decodeURIComponent(url.hash.slice(1));
      assert.match(pages.get(target).html, new RegExp(`\\bid="${id}"`), `${path} links to ${href}, but ${target} has no id="${id}"`);
    }
  }
  // The service lists and the footer carry one link for car removal, not one per merged page.
  const home = pages.get("/").html;
  assert.match(home, /href="\/car-removal-brisbane\/"/);
  assert.doesNotMatch(home, />(?:Junk|Old|Scrap|Unwanted) car removal</);
});

const TRUCKS_PAGE = "/cash-for-trucks/";
// The sections added on 24 November 2026 for the truck searches Search Console showed the page missing.
const TRUCK_SECTIONS = [
  {
    id: "old-trucks",
    heading: "Cash for old and unwanted trucks",
    points: ["Describe its age, use and storage", "Keep its history with the enquiry", "Confirm who can approve the sale"],
    guidance: [/parked for a long time/, /business or fleet truck/],
  },
  {
    id: "scrap-trucks",
    heading: "Cash for scrap and junk trucks",
    points: ["List what remains on the truck", "Ask what the offer is based on", "Plan a documented handover"],
    guidance: [/cab and chassis with major parts missing/, /scrap-metal rate by weight does not set the amount/],
  },
  {
    id: "used-trucks",
    heading: "Cash for used trucks",
    points: ["Show how the truck has been maintained", "Compare the offer with your other options", "Prepare what goes with the truck"],
    guidance: [/private sale or a trade-in/, /toll tags and tracking devices/],
  },
];
// Every page that was given a link to the trucks page, with the address and the anchor it uses.
// The title and heading are what each page had before; a link is all it gained.
const TRUCK_LINK_SOURCES = [
  { path: "/", links: { "/cash-for-trucks/": "cash for trucks and commercial vehicles", "/cash-for-trucks/#old-trucks": "cash for old and unwanted trucks", "/cash-for-trucks/#scrap-trucks": "cash for scrap and junk trucks" }, title: "Cash for Cars Brisbane | Check Your Pickup Terms", heading: "Cash for Cars Brisbane" },
  { path: "/cash-for-junk-cars/", links: { "/cash-for-trucks/#scrap-trucks": "cash for scrap and junk trucks" }, title: "Cash for Junk Cars | Ozi Cash for Cars", heading: "Cash for Junk Cars" },
  { path: "/cash-for-scrap-cars/", links: { "/cash-for-trucks/#scrap-trucks": "cash for scrap and junk trucks" }, title: "Cash for Scrap Cars | Ozi Cash for Cars", heading: "Cash for Scrap Cars" },
  { path: "/cash-for-old-cars/", links: { "/cash-for-trucks/#old-trucks": "cash for old and unwanted trucks" }, title: "Cash for Old Cars | Ozi Cash for Cars", heading: "Cash for Old Cars" },
  { path: "/cash-for-unwanted-cars/", links: { "/cash-for-trucks/#old-trucks": "cash for old and unwanted trucks" }, title: "Cash for Unwanted Cars | Ozi Cash for Cars", heading: "Cash for Unwanted Cars" },
  { path: "/unwanted-truck-removals/", links: { "/cash-for-trucks/": "cash for trucks and commercial vehicles" }, title: "Unwanted Truck Removal | Ozi Cash for Cars", heading: "Unwanted Truck Removal" },
];
// The two regional pages that name a place in a sentence about trucks.
const TRUCK_PLACE_PAGES = [
  { path: "/cash-for-cars-logan-city-suburbs/", sentence: "Selling a truck in Logan City? Cash for trucks and commercial vehicles lists", title: "Cash for Cars Logan City | Pickup Enquiries", heading: "Cash for Cars Logan City" },
  { path: "/cash-for-cars-brisbane-eastern-suburbs/", sentence: "Selling a truck in Wynnum or elsewhere in Brisbane's eastern suburbs? Cash for trucks and commercial vehicles lists", title: "Cash for Cars Brisbane Eastern Suburbs | Pickup Enquiries", heading: "Cash for Cars Brisbane Eastern Suburbs" },
];

function metaDescription(path) {
  return text(pages.get(path).html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? "");
}

test("the trucks page names Brisbane and old, used, scrap, junk and unwanted trucks in its title, heading, description and sections", () => {
  const { main, graph } = pages.get(TRUCKS_PAGE);
  assert.equal(headTitle(TRUCKS_PAGE), "Cash for Trucks Brisbane | Old, Used and Scrap Trucks");
  assert.ok(headTitle(TRUCKS_PAGE).length <= 60, `The title is ${headTitle(TRUCKS_PAGE).length} characters`);
  assert.equal(mainHeading(TRUCKS_PAGE), "Cash for Trucks Brisbane");
  assert.equal(main.match(/<h1\b/g)?.length, 1, "The trucks page must keep exactly one H1");
  const description = metaDescription(TRUCKS_PAGE);
  assert.match(description, /^Cash for trucks in Brisbane: request a quote for an old, used, scrap, junk or unwanted truck/);
  assert.ok(description.length <= 155, `The description is ${description.length} characters`);
  assert.match(text(main), /Selling an old, used, scrap or unwanted truck in Brisbane\?/);
  assert.equal(graph.find((entity) => entity["@type"] === "Service").name, "Cash for Trucks Brisbane");

  const ownLinks = anchors(main);
  let lastPosition = main.indexOf("Confirm suitability before clearing the site");
  assert.ok(lastPosition > 0, "The general configuration, loading and site guidance is missing");
  for (const section of TRUCK_SECTIONS) {
    const html = sectionById(main, section.id);
    assert.ok(html, `No section with id="${section.id}"`);
    assert.equal(main.match(new RegExp(`\\bid="${section.id}"`, "g")).length, 1, `id="${section.id}" is repeated`);
    assert.equal(text(html.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/)?.[1] ?? ""), section.heading, section.id);
    const position = main.indexOf(html);
    assert.ok(position > lastPosition, `${section.id} is out of order`);
    lastPosition = position;
    const body = text(main.slice(position, position + 6000));
    for (const point of section.points) assert.ok(body.includes(point), `${section.id} lost "${point}"`);
    for (const pattern of section.guidance) assert.match(body, pattern, section.id);
    // The page's own list of situations points at the section and uses its heading.
    assert.equal(ownLinks.get(`${TRUCKS_PAGE}#${section.id}`), section.heading, section.id);
  }
  assert.equal(ownLinks.get("/unwanted-truck-removals/"), "Unwanted truck removal");

  const questions = [...main.matchAll(/<summary>([\s\S]*?)<\/summary>/g)].map(([, inner]) => text(inner));
  assert.equal(new Set(questions).size, questions.length, "A question is repeated on the trucks page");
  assert.deepEqual(questions, [
    "Are all truck sizes accepted?",
    "Can the truck be collected with a load still on it?",
    "Can I request a quote for an old truck that does not run?",
    "Can I sell a truck that belongs to a business or another owner?",
    "Is a scrap-metal price by weight the offer for a scrap truck?",
    "Which areas can I request a truck quote from?",
  ]);
  assert.match(text(main), /Pickups are arranged throughout Brisbane, Logan, Ipswich, Gold Coast and surrounding areas/);
  // The new copy states no price, speed, size limit, equipment or guarantee the site did not already state.
  assert.doesNotMatch(
    text(main) + headTitle(TRUCKS_PAGE) + description,
    /free towing|same[- ]day|top dollar|best price|instant cash|\$\d|\d+\s*(?:tonnes?|t\b|kg)|any (?:size|condition|make)|all (?:makes|sizes|trucks)|guarantee|licen[cs]ed|years? (?:of )?experience/i,
  );
});

test("no page carries FAQ structured data, so the trucks page's questions add none", () => {
  for (const [path, page] of pages) {
    assert.ok(!page.graph.some((entity) => [].concat(entity["@type"]).includes("FAQPage")), path);
    assert.doesNotMatch(page.html, /"@type":"(?:FAQPage|Question)"/, path);
  }
});

test("pages that gained a link to the trucks page use its anchors and keep their own titles and headings", () => {
  const sectionAnchors = new Map(TRUCK_SECTIONS.map((section) => [`${TRUCKS_PAGE}#${section.id}`, section.heading.toLowerCase()]));
  for (const source of TRUCK_LINK_SOURCES) {
    // The homepage also links to the trucks page from its card and lists; the sentence links are in its guide section.
    const { main } = pages.get(source.path);
    const links = anchors(source.path === "/" ? main.match(/<section\b[^>]*id="vehicle-guide"[\s\S]*?<\/section>/)[0] : main);
    for (const [href, anchor] of Object.entries(source.links)) {
      assert.equal(links.get(href), anchor, `${source.path} to ${href}`);
      // A link to a section reads as that section's heading does.
      if (sectionAnchors.has(href)) assert.equal(anchor.toLowerCase(), sectionAnchors.get(href), `${source.path} to ${href}`);
    }
    assert.equal(headTitle(source.path), source.title, source.path);
    assert.equal(mainHeading(source.path), source.heading, source.path);
  }
  for (const place of TRUCK_PLACE_PAGES) {
    const services = pages.get(place.path).main.match(/<section\b[^>]*id="services"[\s\S]*?<div class="card-grid"/)?.[0];
    assert.ok(services, `${place.path} has no services section`);
    assert.ok(text(services).includes(place.sentence), `${place.path} lost its truck sentence`);
    assert.equal(anchors(services).get(TRUCKS_PAGE), "Cash for trucks and commercial vehicles", place.path);
    assert.equal(headTitle(place.path), place.title, place.path);
    assert.equal(mainHeading(place.path), place.heading, place.path);
  }
  // The sentence belongs to those two pages only.
  for (const path of ["/", "/cash-for-cars-gold-coast/", "/cash-for-cars-brisbane-northern-suburbs/"]) {
    assert.doesNotMatch(text(pages.get(path).main), /Selling a truck in /, path);
  }
  // The truck card is shown away from Brisbane too, so it does not name Brisbane.
  for (const path of ["/", "/cash-for-cars-logan-city-suburbs/", "/cash-for-cars-gold-coast/"]) {
    const card = pages.get(path).main.match(/<a\b[^>]*class="service-card"[^>]*href="\/cash-for-trucks\/"[\s\S]*?<\/a>/)?.[0];
    assert.ok(card, `${path} has no truck card`);
    assert.match(text(card), /Request a quote for an old, used, scrap, junk or unwanted truck\./, path);
    assert.doesNotMatch(text(card), /Brisbane/, path);
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
