import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { classifyPaths } from "../lib/region-rules.mjs";
import { redirectRules } from "../lib/route-policy.mjs";

const require = createRequire(import.meta.url);
const { buildCustomRoute } = require("next/dist/lib/build-custom-route");

const inventory = JSON.parse(readFileSync(new URL("../data/site-index.json", import.meta.url), "utf8"));
const { redirects, content } = classifyPaths(Object.keys(inventory.pages));
const rules = redirectRules();

test("all 282 known routes stay either rendered or redirected to their existing regional canonical", () => {
  assert.equal(content.length + redirects.size, 282);
  assert.equal(redirects.size, 242);
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
  assert.match(sitemap, /<loc>https:\/\/www\.ozicashforcars\.com\.au\/privacy-policy\/<\/loc>[\s\S]*<lastmod>2026-09-05/);
  assert.equal(sitemap.match(/<lastmod>/g)?.length, 1);
  assert.doesNotMatch(sitemap, /testimonials|vehicles\/|sunshine-coast/);
});
