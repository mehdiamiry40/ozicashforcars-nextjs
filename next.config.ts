import type { NextConfig } from "next";
import { join } from "node:path";
import { buildContentSecurityPolicy, buildDevContentSecurityPolicy } from "./lib/csp.mjs";

// Production script hashes are unknown until prerender finishes. The placeholder
// is replaced in the build output by scripts/csp-hashes.mjs. On Vercel that is
// too late for the header the CDN serves: the Next adapter copies it into
// `.next/output/config.json` during onBuildComplete, while `next build` is still
// running. scripts/csp-adapter.mjs wraps that adapter and writes the hashes first.
// Development cannot use those hashes.
const contentSecurityPolicy =
  process.env.NODE_ENV === "development" ? buildDevContentSecurityPolicy() : buildContentSecurityPolicy();

const nextConfig: NextConfig = {
  trailingSlash: true,
  poweredByHeader: false,
  outputFileTracingRoot: process.cwd(),
  turbopack: { root: process.cwd() },
  // Vercel sets NEXT_ADAPTER_PATH to its own adapter. Wrap it so the routing
  // object it serialises already contains the real script hashes.
  ...(process.env.NEXT_ADAPTER_PATH ? { adapterPath: join(process.cwd(), "scripts/csp-adapter.mjs") } : {}),
  async redirects() {
    return [
      { source: "/cash-for-cars-brisbane", destination: "/", permanent: true },
      { source: "/cash-for-cars-logan-city-suburbs/:slug", destination: "/logan-city-suburbs/:slug/", permanent: true },
      { source: "/brisbane-eastern-suburbs/brisbane-eastern-suburbs/:slug", destination: "/brisbane-eastern-suburbs/:slug/", permanent: true },
      { source: "/brisbane-northern-suburbs/cash-for-cars-lutwyche-mcdowall", destination: "/brisbane-northern-suburbs/cash-for-cars-lutwyche/", permanent: true },
      // The captured route inventory currently contains these two pages only under
      // southern suburbs. Preserve those known-good targets until canonical content
      // exists for a geographically corrected route.
      { source: "/brisbane-northern-suburbs/cash-for-cars-wilston", destination: "/brisbane-southern-suburbs/cash-for-cars-wilston/", permanent: true },
      { source: "/brisbane-northern-suburbs/cash-for-cars-wooloowin", destination: "/brisbane-southern-suburbs/cash-for-cars-wooloowin/", permanent: true },
    ];
  },
  async headers() {
    const securityHeaders = [
      { key: "Content-Security-Policy", value: contentSecurityPolicy },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=()" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
    ];
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
