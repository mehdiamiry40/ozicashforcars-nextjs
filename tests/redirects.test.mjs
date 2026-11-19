import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { classifyPaths, MERGED_PAGES } from "../lib/region-rules.mjs";
import { redirectRules } from "../lib/route-policy.mjs";
import { orderBeforeMiddleware, orderConfigRoutes } from "../scripts/publish-csp.mjs";

const require = createRequire(import.meta.url);
const { buildCustomRoute } = require("next/dist/lib/build-custom-route");

const inventory = JSON.parse(readFileSync(new URL("../data/site-index.json", import.meta.url), "utf8"));
const { redirects, merged, content } = classifyPaths(Object.keys(inventory.pages));
const rules = redirectRules();
const REMOVAL_PAGE = "/car-removal-brisbane/";
const MERGED_REMOVAL_PAGES = ["/junk-car-removals/", "/scrap-car-removals/", "/old-car-removals/", "/unwanted-car-removals/"];

test("all 282 known routes stay either rendered or redirected: 242 suburb URLs to their regional canonical, four merged pages to the page that took them in", () => {
  assert.equal(content.length + redirects.size, 282);
  assert.equal(redirects.size, 246);
  assert.equal(merged.size, 4);
  assert.equal(redirects.size - merged.size, 242);
  const bySource = new Map(rules.map((rule) => [rule.source, rule]));
  assert.equal(bySource.size, rules.length);
  for (const [path, hub] of redirects) {
    const rule = bySource.get(path.replace(/\/$/, ""));
    assert.ok(rule, path);
    assert.equal(rule.destination, hub);
    assert.equal(rule.statusCode, 301);
    assert.equal(redirects.has(rule.destination), false);
  }
  assert.equal(bySource.get("/cash-for-cars-brisbane")?.destination, "/");
  assert.equal(
    bySource.get("/brisbane-northern-suburbs/cash-for-cars-lutwyche")?.destination,
    "/cash-for-cars-brisbane-northern-suburbs/",
  );
  assert.equal(
    bySource.get("/brisbane-northern-suburbs/cash-for-cars-lutwyche-mcdowall")?.destination,
    "/cash-for-cars-brisbane-northern-suburbs/",
  );
  assert.equal(
    bySource.get("/brisbane-northern-suburbs/cash-for-cars-wilston")?.destination,
    "/cash-for-cars-brisbane-southern-suburbs/",
  );
  assert.equal(
    bySource.get("/brisbane-northern-suburbs/cash-for-cars-wooloowin")?.destination,
    "/cash-for-cars-brisbane-southern-suburbs/",
  );
  assert.equal(rules.at(-2)?.source, "/cash-for-cars-logan-city-suburbs/:slug");
  assert.equal(rules.at(-1)?.source, "/brisbane-eastern-suburbs/brisbane-eastern-suburbs/:slug");
});

test("the four narrow removal pages are merged into the Brisbane removal page and nothing else is", () => {
  assert.deepEqual(Object.keys(MERGED_PAGES).sort(), [...MERGED_REMOVAL_PAGES].sort());
  assert.deepEqual([...merged.keys()].sort(), [...MERGED_REMOVAL_PAGES].sort());
  const bySource = new Map(rules.map((rule) => [rule.source, rule]));
  for (const path of MERGED_REMOVAL_PAGES) {
    assert.ok(inventory.pages[path], `${path} left the URL inventory`);
    assert.equal(MERGED_PAGES[path], REMOVAL_PAGE, path);
    assert.equal(content.includes(path), false, `${path} is still a rendered page`);
    assert.deepEqual(bySource.get(path.replace(/\/$/, "")), { source: path.replace(/\/$/, ""), destination: REMOVAL_PAGE, statusCode: 301 });
  }
  // The destination is a rendered page, so a merged URL never lands on a second redirect.
  assert.equal(content.includes(REMOVAL_PAGE), true);
  // The removal pages that answer a different question stay as pages.
  for (const kept of ["/free-car-removals/", "/used-car-removals/", "/unwanted-truck-removals/"]) {
    assert.equal(content.includes(kept), true, kept);
    assert.equal(redirects.has(kept), false, kept);
  }
});

test("compiled merged-page redirects match one hop with or without a trailing slash", () => {
  for (const path of MERGED_REMOVAL_PAGES) {
    const source = path.replace(/\/$/, "");
    const compiled = buildCustomRoute("redirect", rules.find((rule) => rule.source === source));
    const expression = new RegExp(compiled.regex);
    assert.equal(compiled.statusCode, 301, path);
    assert.equal(compiled.destination, REMOVAL_PAGE, path);
    assert.equal(expression.test(source), true, source);
    assert.equal(expression.test(path), true, path);
    assert.equal(expression.test(`${path}extra`), false, path);
    assert.equal(expression.test(REMOVAL_PAGE), false, "The destination must not match its own redirect");
  }
});

test("compiled suburb redirects match one hop with or without a trailing slash", () => {
  const sample = rules.find((rule) => rule.source === "/brisbane-northern-suburbs/cash-for-cars-lutwyche");
  const compiled = buildCustomRoute("redirect", sample);
  const expression = new RegExp(compiled.regex);
  assert.equal(compiled.statusCode, 301);
  assert.equal(expression.test("/brisbane-northern-suburbs/cash-for-cars-lutwyche"), true);
  assert.equal(expression.test("/brisbane-northern-suburbs/cash-for-cars-lutwyche/"), true);
  assert.equal(expression.test("/brisbane-northern-suburbs/cash-for-cars-lutwyche/extra"), false);
  const brisbane = buildCustomRoute("redirect", rules.find((rule) => rule.source === "/cash-for-cars-brisbane"));
  const brisbaneExpression = new RegExp(brisbane.regex);
  assert.equal(brisbaneExpression.test("/cash-for-cars-brisbane"), true);
  assert.equal(brisbaneExpression.test("/cash-for-cars-brisbane/"), true);
  assert.equal(brisbane.destination ?? rules.find((rule) => rule.source === "/cash-for-cars-brisbane").destination, "/");
});

test("built redirects are ordered ahead of the trailing-slash hop", () => {
  const manifest = JSON.parse(readFileSync(new URL("../.next/routes-manifest.json", import.meta.url), "utf8"));
  const slashIndex = manifest.redirects.findIndex((route) => String(route.source).includes(":notfile"));
  assert.ok(slashIndex > 0);
  const brisbaneIndex = manifest.redirects.findIndex((route) => route.source === "/cash-for-cars-brisbane");
  const lutwycheIndex = manifest.redirects.findIndex((route) => route.source === "/brisbane-northern-suburbs/cash-for-cars-lutwyche");
  assert.ok(brisbaneIndex >= 0 && brisbaneIndex < slashIndex);
  assert.ok(lutwycheIndex >= 0 && lutwycheIndex < slashIndex);
  assert.equal(manifest.redirects[brisbaneIndex].statusCode, 301);
  assert.equal(manifest.redirects[brisbaneIndex].destination, "/");
  assert.equal(manifest.redirects[lutwycheIndex].destination, "/cash-for-cars-brisbane-northern-suburbs/");
  for (const path of MERGED_REMOVAL_PAGES) {
    const index = manifest.redirects.findIndex((route) => route.source === path.replace(/\/$/, ""));
    assert.ok(index >= 0 && index < slashIndex, `${path} is not ahead of the trailing-slash hop`);
    assert.equal(manifest.redirects[index].statusCode, 301, path);
    assert.equal(manifest.redirects[index].destination, REMOVAL_PAGE, path);
  }
});

test("slash redirects lose the priority flag that Vercel hoists", () => {
  const ordered = orderBeforeMiddleware([
    {
      source: "/:notfile((?!\\.well-known(?:/.*)?)(?:[^/]+/)*[^/\\.]+)",
      status: 308,
      priority: true,
      headers: { Location: "/$1/" },
    },
    { source: "/cash-for-cars-brisbane", status: 301, headers: { Location: "/" } },
  ]);
  assert.equal(ordered[0].status, 301);
  assert.equal(ordered[1].status, 308);
  assert.equal(ordered[1].priority, false);
});

test("deployment routes test a specific 301 before the trailing-slash 308", () => {
  const fileSlash = {
    src: "^(?:\\/((?!\\.well-known(?:\\/.*)?)(?:[^/]+\\/)*[^/]+\\.\\w+))\\/$",
    headers: { Location: "/$1" },
    status: 308,
    continue: true,
  };
  const slash = {
    src: "^(?:\\/((?!\\.well-known(?:\\/.*)?)(?:[^/]+\\/)*[^/\\.]+))$",
    headers: { Location: "/$1/" },
    status: 308,
    continue: true,
  };
  const header = { src: "^/about-us(?:\\/)?$", continue: true, headers: { "Content-Security-Policy": "default-src 'self'" } };
  const brisbane = {
    src: "^/cash-for-cars-brisbane(?:\\/)?$",
    headers: { Location: "/" },
    status: 301,
  };
  const filesystem = { handle: "filesystem" };
  const ordered = orderConfigRoutes([fileSlash, slash, header, brisbane, filesystem]);
  assert.deepEqual(ordered, [brisbane, fileSlash, slash, header, filesystem]);
  const brisbanePattern = new RegExp(brisbane.src);
  assert.equal(brisbanePattern.test("/cash-for-cars-brisbane"), true);
  assert.equal(brisbanePattern.test("/cash-for-cars-brisbane/"), true);
  assert.equal(new RegExp(slash.src).test("/sell-my-car"), true);
  assert.equal(new RegExp(slash.src).test("/sell-my-car/"), false);
});

test("robots omits Host and sitemap lastmod is only the authored privacy date", async () => {
  const { readFile } = await import("node:fs/promises");
  const root = new URL("../.next/server/app/", import.meta.url);
  async function body(name) {
    try {
      return await readFile(new URL(`${name}.body`, root), "utf8");
    } catch {
      return readFile(new URL(name, root), "utf8");
    }
  }
  const robots = await body("robots.txt");
  assert.match(robots, /Sitemap: https:\/\/www\.ozicashforcars\.com\.au\/sitemap\.xml/);
  assert.doesNotMatch(robots, /^Host:/m);
  const sitemap = await body("sitemap.xml");
  assert.match(sitemap, /<loc>https:\/\/www\.ozicashforcars\.com\.au\/privacy-policy\/<\/loc>[\s\S]*<lastmod>2026-11-11/);
  assert.equal(sitemap.match(/<lastmod>/g)?.length, 1);
  assert.doesNotMatch(sitemap, /testimonials|vehicles\/|sunshine-coast/);
  assert.match(sitemap, /<loc>https:\/\/www\.ozicashforcars\.com\.au\/car-removal-brisbane\/<\/loc>/);
  for (const path of MERGED_REMOVAL_PAGES) {
    assert.ok(!sitemap.includes(path), `${path} is still in the sitemap`);
  }
});
