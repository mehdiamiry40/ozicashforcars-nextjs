import { readFileSync } from "node:fs";
import { join } from "node:path";
import { classifyPaths } from "./region-rules.mjs";

function addRule(rules, seen, source, destination) {
  const src = source === "/" ? "/" : source.replace(/\/$/, "");
  if (seen.has(src)) throw new Error(`Duplicate redirect source ${src}`);
  seen.add(src);
  rules.push({ source: src, destination, statusCode: 301 });
}

/**
 * Permanent redirects for the 242 inventoried suburb URLs, the pages merged
 * into another page, and the legacy aliases that already pointed at suburb
 * URLs. Suburb destinations are the regional hubs their canonicals already
 * named; a merged page goes to the page that now carries its content. Each
 * source is written without a trailing slash, which Next compiles to match
 * both forms, so the old URL reaches its destination in one hop either way.
 * Unknown legacy slugs still fall through the two trailing wildcard rules.
 */
export function redirectRules(projectRoot = process.cwd()) {
  const index = JSON.parse(readFileSync(join(projectRoot, "data/site-index.json"), "utf8"));
  const { redirects, merged, content } = classifyPaths(Object.keys(index.pages));
  const rendered = new Set(content);
  for (const [path, destination] of merged) {
    // A merge must end on a page that is still rendered, never on another redirect.
    if (!rendered.has(destination)) throw new Error(`Merged page ${path} points at ${destination}, which is not a rendered page`);
  }
  const rules = [];
  const seen = new Set();

  for (const [path, hub] of redirects) addRule(rules, seen, path, hub);

  addRule(rules, seen, "/cash-for-cars-brisbane", "/");
  addRule(
    rules,
    seen,
    "/brisbane-northern-suburbs/cash-for-cars-lutwyche-mcdowall",
    "/cash-for-cars-brisbane-northern-suburbs/",
  );
  addRule(
    rules,
    seen,
    "/brisbane-northern-suburbs/cash-for-cars-wilston",
    "/cash-for-cars-brisbane-southern-suburbs/",
  );
  addRule(
    rules,
    seen,
    "/brisbane-northern-suburbs/cash-for-cars-wooloowin",
    "/cash-for-cars-brisbane-southern-suburbs/",
  );

  for (const [path, hub] of redirects) {
    if (path.startsWith("/logan-city-suburbs/")) {
      const slug = path.slice("/logan-city-suburbs/".length).replace(/\/$/, "");
      addRule(rules, seen, `/cash-for-cars-logan-city-suburbs/${slug}`, hub);
    }
    if (path.startsWith("/brisbane-eastern-suburbs/")) {
      const rest = path.slice("/brisbane-eastern-suburbs/".length).replace(/\/$/, "");
      addRule(rules, seen, `/brisbane-eastern-suburbs/brisbane-eastern-suburbs/${rest}`, hub);
    }
  }

  rules.push({
    source: "/cash-for-cars-logan-city-suburbs/:slug",
    destination: "/logan-city-suburbs/:slug/",
    statusCode: 301,
  });
  rules.push({
    source: "/brisbane-eastern-suburbs/brisbane-eastern-suburbs/:slug",
    destination: "/brisbane-eastern-suburbs/:slug/",
    statusCode: 301,
  });
  return rules;
}
