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
 * Permanent redirects for the 242 inventoried suburb URLs, plus the legacy
 * aliases that already pointed at those URLs. Destinations are the regional
 * hubs the suburb canonicals already named. Unknown legacy slugs still fall
 * through the two trailing wildcard rules.
 */
export function redirectRules(projectRoot = process.cwd()) {
  const index = JSON.parse(readFileSync(join(projectRoot, "data/site-index.json"), "utf8"));
  const { redirects } = classifyPaths(Object.keys(index.pages));
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
