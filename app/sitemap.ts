import type { MetadataRoute } from "next";
import { PRIVACY_POLICY_UPDATED_ISO, TRUCK_ENQUIRY_PLACES } from "./site-config";
import { absoluteUrl, indexablePages } from "./site-data";

// 24 November 2026: /cash-for-trucks/ was rewritten for old, used, scrap, junk
// and unwanted truck searches, and the other pages listed here were each given a
// link to it in a sentence.
const TRUCK_LINKS_ADDED_ISO = "2026-11-24";
const TRUCK_LINKS_ADDED_PATHS = [
  "/cash-for-trucks/",
  "/",
  "/cash-for-junk-cars/",
  "/cash-for-scrap-cars/",
  "/cash-for-old-cars/",
  "/cash-for-unwanted-cars/",
  "/unwanted-truck-removals/",
  ...Object.keys(TRUCK_ENQUIRY_PLACES),
];

// 28 November 2026: the homepage title and heading stopped opening with "Cash
// for Cars Brisbane", and its guide gained a link to the used-trucks section.
const HOME_RETITLED_ISO = "2026-11-28";

// A date is recorded only for a page whose own content was edited on a known
// day. It is never taken from the build, and a page is not dated because a
// shared card, list or footer on it changed. A page edited twice carries the
// later date, so the homepage entry comes last.
const AUTHORED_LAST_MODIFIED: Record<string, string> = {
  "/privacy-policy/": PRIVACY_POLICY_UPDATED_ISO,
  ...Object.fromEntries(TRUCK_LINKS_ADDED_PATHS.map((path) => [path, TRUCK_LINKS_ADDED_ISO])),
  "/": HOME_RETITLED_ISO,
};

export default function sitemap(): MetadataRoute.Sitemap {
  return indexablePages.map((page) => {
    const lastModified = AUTHORED_LAST_MODIFIED[page.path];
    return {
      url: absoluteUrl(page.path),
      ...(lastModified ? { lastModified } : {}),
      changeFrequency: page.kind === "article" ? "monthly" : "yearly",
      priority: page.path === "/" ? 1 : page.kind === "region" || page.kind === "service" ? 0.8 : 0.6,
    };
  });
}
