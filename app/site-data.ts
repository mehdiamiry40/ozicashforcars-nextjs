import rawIndex from "../data/site-index.json";
import { SITE } from "./site-config";

type RawPage = {
  path: string;
  title: string;
  description: string;
  robots: string;
  ogImage: string;
  bodyClass: string;
};

type RawIndex = {
  source: string;
  capturedAt: string;
  pages: Record<string, RawPage>;
};

export type PageKind =
  | "home"
  | "service"
  | "region"
  | "location"
  | "article"
  | "blog"
  | "vehicles"
  | "about"
  | "contact"
  | "testimonials"
  | "faq"
  | "privacy"
  | "utility"
  | "thank-you";

export type SitePage = {
  path: string;
  kind: PageKind;
  title: string;
  heading: string;
  description: string;
  ogImage: string;
  location?: string;
  region?: string;
  hubPath?: string;
  noIndex: boolean;
  canonicalPath: string;
};

const index = rawIndex as RawIndex;

const REGION_RULES = [
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
] as const;

const REGION_HUBS = new Map<string, string>(
  [
    ["/cash-for-cars-brisbane-northern-suburbs/", "Brisbane Northern Suburbs"],
    ["/cash-for-cars-brisbane-southern-suburbs/", "Brisbane Southern Suburbs"],
    ["/cash-for-cars-brisbane-eastern-suburbs/", "Brisbane Eastern Suburbs"],
    ["/cash-for-cars-brisbane-western-suburbs/", "Brisbane Western Suburbs"],
    ["/cash-for-cars-logan-city-suburbs/", "Logan City"],
    ["/cash-for-cars-gold-coast/", "Gold Coast"],
    ["/cash-for-cars-sunshine-coast/", "Sunshine Coast"],
  ] as const,
);

const KIND_PATHS: Record<string, PageKind> = {
  "/": "home",
  "/about-us/": "about",
  "/blog/": "blog",
  "/contact-us/": "contact",
  "/frequently-asked-questions/": "faq",
  "/privacy-policy/": "privacy",
  "/testimonials/": "testimonials",
  "/thank-you/": "thank-you",
  "/vehicles/": "vehicles",
  "/sitemap/": "utility",
  "/useful-links/": "utility",
};

const SPECIAL_TITLES: Record<string, string> = {
  "/": "Cash for Cars Brisbane | Free Car Removal",
  "/about-us/": "About Ozi Cash for Cars Brisbane",
  "/blog/": "Car Selling Guides | Ozi Cash for Cars",
  "/contact-us/": "Contact Ozi Cash for Cars Brisbane",
  "/frequently-asked-questions/": "Cash for Cars FAQs | Brisbane",
  "/privacy-policy/": "Privacy Policy | Ozi Cash for Cars",
  "/testimonials/": "Customer Reviews | Ozi Cash for Cars",
  "/thank-you/": "Quote Request Received | Ozi Cash for Cars",
  "/vehicles/": "Vehicles We Buy | Ozi Cash for Cars",
  "/sitemap/": "Website Guide | Ozi Cash for Cars",
  "/useful-links/": "Vehicle Selling Resources | Queensland",
};

const SERVICE_NAMES: Record<string, string> = {
  "cash-for-accident-cars": "Accident Cars",
  "cash-for-damaged-cars": "Damaged Cars",
  "cash-for-junk-cars": "Junk Cars",
  "cash-for-old-cars": "Old Cars",
  "cash-for-scrap-cars": "Scrap Cars",
  "cash-for-trucks": "Trucks",
  "cash-for-unwanted-cars": "Unwanted Cars",
  "cash-for-used-cars": "Used Cars",
  "car-removal-brisbane": "Car Removal Brisbane",
  "car-recycling-brisbane": "Car Recycling Brisbane",
  "free-car-removals": "Free Car Removal",
  "junk-car-removals": "Junk Car Removal",
  "old-car-removals": "Old Car Removal",
  "scrap-car-removals": "Scrap Car Removal",
  "sell-my-car": "Sell My Car Brisbane",
  "unwanted-car-removals": "Unwanted Car Removal",
  "unwanted-truck-removals": "Unwanted Truck Removal",
  "used-car-removals": "Used Car Removal",
};

function titleCase(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((word) =>
      ["4x4", "suv", "qld"].includes(word.toLowerCase())
        ? word.toUpperCase()
        : `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`,
    )
    .join(" ")
    .replace(/\bNw\b/g, "NW");
}

function lastSegment(pathname: string) {
  return pathname.split("/").filter(Boolean).at(-1) ?? "";
}

function trimTo(value: string, max: number) {
  const clean = value
    .replace(/&(?:amp|#0?39|apos);/g, (entity) => (entity === "&amp;" ? "&" : "'"))
    .replace(/\s+/g, " ")
    .trim();
  if (clean.length <= max) return clean;
  const shortened = clean.slice(0, max - 1);
  return `${shortened.slice(0, shortened.lastIndexOf(" "))}…`;
}

function serviceName(pathname: string) {
  const segment = lastSegment(pathname);
  return SERVICE_NAMES[segment] ?? titleCase(segment.replace(/^cash-for-/, ""));
}

function modelPage(pathname: string, raw: RawPage): SitePage {
  if (pathname.startsWith("/blog/") && pathname !== "/blog/") {
    const heading = trimTo(raw.title.split("|")[0], 72);
    return {
      path: pathname,
      kind: "article",
      title: trimTo(heading, 58),
      heading,
      description: trimTo(raw.description, 155),
      ogImage: raw.ogImage,
      noIndex: false,
      canonicalPath: pathname,
    };
  }

  const regionRule = REGION_RULES.find(
    (rule) => pathname.startsWith(rule.prefix) && pathname !== rule.hubPath,
  );
  if (regionRule) {
    const location = titleCase(lastSegment(pathname).replace(/^cash-for-cars-/, ""));
    return {
      path: pathname,
      kind: "location",
      title: trimTo(`Cash for Cars ${location} | Free Car Removal`, 58),
      heading: `Cash for Cars ${location}`,
      description: trimTo(
        `Get a fast vehicle quote and free towing in ${location}. Ozi Cash for Cars collects cars, utes, vans and 4WDs across ${regionRule.region}.`,
        155,
      ),
      ogImage: raw.ogImage,
      location,
      region: regionRule.region,
      hubPath: regionRule.hubPath,
      noIndex: true,
      canonicalPath: regionRule.hubPath,
    };
  }

  const hubName = REGION_HUBS.get(pathname);
  if (hubName) {
    return {
      path: pathname,
      kind: "region",
      title: trimTo(`Cash for Cars ${hubName} | Free Removal`, 58),
      heading: `Cash for Cars ${hubName}`,
      description: trimTo(
        `Sell your vehicle in ${hubName} with a fast cash quote and free towing. We collect cars, utes, vans, 4WDs and light commercial vehicles.`,
        155,
      ),
      ogImage: raw.ogImage,
      location: hubName,
      region: hubName,
      noIndex: false,
      canonicalPath: pathname,
    };
  }

  const kind = KIND_PATHS[pathname] ?? "service";
  const heading = SPECIAL_TITLES[pathname]?.split("|")[0].trim() ?? serviceName(pathname);
  const title = SPECIAL_TITLES[pathname] ?? trimTo(`${heading} | Ozi Cash for Cars`, 58);
  const noIndex = kind === "thank-you" || kind === "utility";

  return {
    path: pathname,
    kind,
    title,
    heading,
    description:
      kind === "home"
        ? `Sell your car in Brisbane with a fast quote, payment on pickup and free towing. We buy vehicles in any condition with offers up to ${SITE.maxOffer}.`
        : kind === "thank-you"
          ? "Your vehicle quote request has been received and is ready for review by the Ozi Cash for Cars team."
          : kind === "privacy"
            ? "How Ozi Cash for Cars collects, uses and protects information submitted through our vehicle quote service."
            : trimTo(
                `Get a clear vehicle quote, payment on pickup and free towing with ${heading}. Ozi Cash for Cars services Brisbane and surrounding areas.`,
                155,
              ),
    ogImage: raw.ogImage,
    noIndex,
    canonicalPath: pathname,
  };
}

export const allPages = Object.entries(index.pages).map(([pathname, raw]) =>
  modelPage(pathname, raw),
);

const pagesByPath = new Map(allPages.map((page) => [page.path, page]));

export function getPage(pathname: string) {
  return pagesByPath.get(pathname);
}

export const indexablePages = allPages.filter((page) => !page.noIndex);
export const blogArticles = allPages.filter((page) => page.kind === "article");

export function locationPagesForHub(hubPath: string) {
  return allPages.filter((page) => page.kind === "location" && page.hubPath === hubPath);
}

export function pagePathFromSlug(slug?: string[]) {
  return slug?.length ? `/${slug.join("/")}/` : "/";
}

export function staticParams() {
  return allPages.map((page) => ({
    slug: page.path === "/" ? undefined : page.path.split("/").filter(Boolean),
  }));
}

export function absoluteUrl(pathname: string) {
  return new URL(pathname, SITE.url).href;
}

export const contentVersion = index.capturedAt;
