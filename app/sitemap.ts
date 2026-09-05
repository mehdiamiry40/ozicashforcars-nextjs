import type { MetadataRoute } from "next";
import { absoluteUrl, indexablePages } from "./site-data";

export default function sitemap(): MetadataRoute.Sitemap {
  return indexablePages.map((page) => ({
    url: absoluteUrl(page.path),
    changeFrequency: page.kind === "article" ? "monthly" : "yearly",
    priority: page.path === "/" ? 1 : page.kind === "region" || page.kind === "service" ? 0.8 : 0.6,
  }));
}
