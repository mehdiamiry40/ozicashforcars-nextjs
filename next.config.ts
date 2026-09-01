import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  poweredByHeader: false,
  outputFileTracingRoot: process.cwd(),
  turbopack: { root: process.cwd() },
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
      { key: "Content-Security-Policy", value: "default-src 'self'; base-uri 'self'; connect-src 'self'; font-src 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self' data:; object-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; upgrade-insecure-requests" },
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
