import type { MetadataRoute } from "next";
import rawIndex from "../data/site-index.json";
import type { SiteIndex } from "./site-types";

const siteIndex = rawIndex as SiteIndex;

export default function sitemap(): MetadataRoute.Sitemap {
  return Object.keys(siteIndex.pages).map((pathname) => ({
    url: new URL(pathname, siteIndex.source).href,
    lastModified: siteIndex.capturedAt,
    changeFrequency: pathname.startsWith("/blog/") ? "monthly" : "yearly",
    priority: pathname === "/" ? 1 : pathname.split("/").length <= 3 ? 0.8 : 0.6,
  }));
}
