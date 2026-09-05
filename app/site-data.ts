import rawIndex from "../data/site-index.json";
import { SITE } from "./site-config";
import { ARTICLE_CONTENT } from "./article-content";
import { SERVICE_CONTENT } from "./service-content";

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
  "/testimonials/": "Reviews and Feedback | Ozi Cash for Cars",
  "/thank-you/": "Quote Request Received | Ozi Cash for Cars",
  "/vehicles/": "Vehicle Enquiries | Ozi Cash for Cars",
  "/sitemap/": "Website Guide | Ozi Cash for Cars",
  "/useful-links/": "Vehicle Selling Resources | Queensland",
};

const PAGE_DESCRIPTIONS: Record<string, string> = {
  "/": "Request a Brisbane vehicle quote with your car's condition and pickup suburb. Review the offer, payment and towing terms before deciding to sell.",
  "/about-us/": "Learn how Ozi Cash for Cars handles vehicle enquiries and arranged pickup, and find the team's contact details and service hours.",
  "/blog/": "Practical car-selling guides covering vehicle details, offers, pickup preparation and Queensland safety-certificate questions.",
  "/contact-us/": "Call, email or send a vehicle enquiry to Ozi Cash for Cars. Find contact hours and share the condition and pickup suburb for a quote.",
  "/frequently-asked-questions/": "Answers about vehicle quotes, documents, towing, payment and pickup. Find what to confirm before agreeing to sell your car.",
  "/privacy-policy/": "How Ozi Cash for Cars uses quote information, stores database records for 90 days and handles requests about your information.",
  "/testimonials/": "Contact Ozi Cash for Cars with feedback about your experience and find questions to consider before arranging a vehicle pickup.",
  "/thank-you/": "Your vehicle quote request has been received and is ready for review by the Ozi Cash for Cars team.",
  "/vehicles/": "Explore vehicle enquiry options for cars, utes, vans, SUVs and light trucks. Describe condition and access so suitability can be confirmed.",
  "/sitemap/": "Browse vehicle services, pickup area enquiries and customer information on the Ozi Cash for Cars website.",
  "/useful-links/": "Find car-selling guides, vehicle services, pickup area enquiries and contact information for Ozi Cash for Cars.",
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


function modelPage(pathname: string, raw: RawPage): SitePage {
  if (pathname.startsWith("/blog/") && pathname !== "/blog/") {
    const article = ARTICLE_CONTENT[pathname];
    if (!article) throw new Error(`Missing authored article content: ${pathname}`);
    const heading = article.heading;
    return {
      path: pathname,
      kind: "article",
      title: trimTo(heading, 58),
      heading,
      description: article.description,
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
        `Enquire about a vehicle quote in ${location}. Share its condition and access details, then confirm pickup availability and towing terms.`,
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
      title: trimTo(`Cash for Cars ${hubName} | Pickup Enquiries`, 58),
      heading: `Cash for Cars ${hubName}`,
      description: trimTo(
        `Request a vehicle quote for ${hubName}. Confirm collection availability for your suburb, access requirements and towing terms before booking.`,
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
  const service = kind === "service" ? SERVICE_CONTENT[pathname] : undefined;
  if (kind === "service" && !service) throw new Error(`Missing authored service content: ${pathname}`);
  const heading = service?.heading ?? SPECIAL_TITLES[pathname]?.split("|")[0].trim() ?? titleCase(lastSegment(pathname));
  const title = SPECIAL_TITLES[pathname] ?? trimTo(`${heading} | Ozi Cash for Cars`, 58);
  const noIndex = kind === "thank-you" || kind === "utility";

  return {
    path: pathname,
    kind,
    title,
    heading,
    description: service?.description ?? PAGE_DESCRIPTIONS[pathname],
    ogImage: raw.ogImage,
    noIndex,
    canonicalPath: pathname,
  };
}

export const allPages = Object.entries(index.pages).map(([pathname, raw]) =>
  modelPage(pathname, raw),
);

// Preserve known legacy paths and existing suburb indexing policy; editorial changes do not select redirects.
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
