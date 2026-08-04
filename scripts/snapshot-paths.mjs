import path from "node:path";

const ASSET_ROOTS = ["/wp-content/", "/wp-includes/"];

export function resolveAssetOutputPath(publicDir, encodedPathname) {
  let pathname;
  try {
    pathname = decodeURIComponent(encodedPathname);
  } catch {
    throw new Error(`Rejected malformed asset path: ${encodedPathname}`);
  }

  const assetRoot = ASSET_ROOTS.find((root) => pathname.startsWith(root));
  if (
    pathname.includes("\0") ||
    pathname.includes("\\") ||
    !assetRoot
  ) {
    throw new Error(`Rejected asset path outside allowed roots: ${encodedPathname}`);
  }

  const root = path.resolve(publicDir);
  const outputPath = path.resolve(root, `.${pathname}`);
  const allowedRoot = path.resolve(root, `.${assetRoot}`);
  const relative = path.relative(allowedRoot, outputPath);
  if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`Rejected asset path outside public directory: ${encodedPathname}`);
  }
  return outputPath;
}

export function assertSameOriginResponse(responseUrl, expectedOrigin) {
  if (new URL(responseUrl).origin !== expectedOrigin) {
    throw new Error(`Rejected cross-origin asset response: ${responseUrl}`);
  }
}
