import type { MetadataRoute } from "next";
import { PRIVACY_POLICY_UPDATED_ISO } from "./site-config";
import { absoluteUrl, indexablePages } from "./site-data";

const AUTHORED_LAST_MODIFIED: Record<string, string> = {
  "/privacy-policy/": PRIVACY_POLICY_UPDATED_ISO,
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
