/**
 * Regional URL rules shared by page generation and redirects.
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

export function hubForPath(pathname) {
  const path = pathname.endsWith("/") ? pathname : `${pathname}/`;
  const rule = REGION_RULES.find((entry) => path.startsWith(entry.prefix) && path !== entry.hubPath);
  return rule ? rule.hubPath : null;
}

export function classifyPaths(paths) {
  const redirects = new Map();
  const content = [];
  for (const path of paths) {
    const hub = hubForPath(path);
    if (hub) redirects.set(path, hub);
    else content.push(path);
  }
  return { redirects, content };
}
