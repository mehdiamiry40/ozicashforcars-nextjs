/**
 * URL rules shared by page generation and redirects: the regional rules for
 * suburb URLs, and the pages that were merged into another page.
 * Suburb pages live under a region prefix and canonicalise to that region's hub.
 * Sunshine Coast is a hub only: it has no suburb inventory.
 */
export const REGION_RULES = [
  {
    prefix: "/brisbane-northern-suburbs/",
    hubPath: "/cash-for-cars-brisbane-northern-suburbs/",
    region: "Brisbane's northern suburbs",
  },
  {
    prefix: "/brisbane-southern-suburbs/",
    hubPath: "/cash-for-cars-brisbane-southern-suburbs/",
    region: "Brisbane's southern suburbs",
  },
  {
    prefix: "/brisbane-eastern-suburbs/",
    hubPath: "/cash-for-cars-brisbane-eastern-suburbs/",
    region: "Brisbane's eastern suburbs",
  },
  {
    prefix: "/brisbane-western-suburbs/",
    hubPath: "/cash-for-cars-brisbane-western-suburbs/",
    region: "Brisbane's western suburbs",
  },
  {
    prefix: "/logan-city-suburbs/",
    hubPath: "/cash-for-cars-logan-city-suburbs/",
    region: "Logan City",
  },
  {
    prefix: "/cash-for-cars-gold-coast/",
    hubPath: "/cash-for-cars-gold-coast/",
    region: "the Gold Coast",
  },
];

export const REGION_HUB_NAMES = {
  "/cash-for-cars-brisbane-northern-suburbs/": "Brisbane Northern Suburbs",
  "/cash-for-cars-brisbane-southern-suburbs/": "Brisbane Southern Suburbs",
  "/cash-for-cars-brisbane-eastern-suburbs/": "Brisbane Eastern Suburbs",
  "/cash-for-cars-brisbane-western-suburbs/": "Brisbane Western Suburbs",
  "/cash-for-cars-logan-city-suburbs/": "Logan City",
  "/cash-for-cars-gold-coast/": "Gold Coast",
  "/cash-for-cars-sunshine-coast/": "Sunshine Coast",
};

/**
 * Pages merged into another page. Each old URL permanently redirects to the
 * page that now carries its guidance. It stays in the URL inventory, but it is
 * no longer generated, linked or listed in the sitemap.
 *
 * 19 November 2026: Search Console showed the four narrow removal pages
 * appearing for the same searches as /car-removal-brisbane/ ("junk car removal
 * brisbane" showed three of them at positions 66 to 87). Their guidance and
 * questions are now sections of that page.
 */
export const MERGED_PAGES = {
  "/junk-car-removals/": "/car-removal-brisbane/",
  "/scrap-car-removals/": "/car-removal-brisbane/",
  "/old-car-removals/": "/car-removal-brisbane/",
  "/unwanted-car-removals/": "/car-removal-brisbane/",
};

export function mergedInto(pathname) {
  const path = pathname.endsWith("/") ? pathname : `${pathname}/`;
  return Object.hasOwn(MERGED_PAGES, path) ? MERGED_PAGES[path] : null;
}

export function hubForPath(pathname) {
  const path = pathname.endsWith("/") ? pathname : `${pathname}/`;
  const rule = REGION_RULES.find((entry) => path.startsWith(entry.prefix) && path !== entry.hubPath);
  return rule ? rule.hubPath : null;
}

/**
 * Sorts the inventoried paths into rendered pages and permanent redirects.
 * `redirects` holds every redirected path with its destination; `merged` is the
 * part of it that comes from MERGED_PAGES, so callers can tell the two apart.
 */
export function classifyPaths(paths) {
  const redirects = new Map();
  const merged = new Map();
  const content = [];
  for (const path of paths) {
    const hub = hubForPath(path);
    const target = hub ? null : mergedInto(path);
    if (hub) redirects.set(path, hub);
    else if (target) {
      redirects.set(path, target);
      merged.set(path, target);
    } else content.push(path);
  }
  return { redirects, merged, content };
}
