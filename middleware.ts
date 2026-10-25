import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import rawIndex from "./data/site-index.json";
import { classifyPaths } from "./lib/region-rules.mjs";

const KNOWN_PATHS = new Set(classifyPaths(Object.keys(rawIndex.pages)).content);
const NOT_FOUND_CSP_B64 = "__CSP_NOT_FOUND_B64__";

function canonicalPath(pathname: string) {
  if (!pathname || pathname === "/") return "/";
  return pathname.endsWith("/") ? pathname : `${pathname}/`;
}

function notFoundPolicy() {
  if (NOT_FOUND_CSP_B64.includes("CSP_NOT_FOUND")) return "";
  try {
    const policy = atob(NOT_FOUND_CSP_B64);
    return policy.includes("default-src") ? policy : "";
  } catch {
    return "";
  }
}

export function middleware(request: NextRequest) {
  if (KNOWN_PATHS.has(canonicalPath(request.nextUrl.pathname))) return NextResponse.next();
  const policy = notFoundPolicy();
  if (!policy) return NextResponse.next();
  const response = NextResponse.next();
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

export const config = {
  matcher: ["/((?!_next/|api/|wp-content/).*)"],
};
