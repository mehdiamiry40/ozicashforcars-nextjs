import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { assertSameOriginResponse, resolveAssetOutputPath } from "../scripts/snapshot-paths.mjs";

const publicDir = path.resolve("/tmp/ozi-snapshot-test/public");

test("snapshot asset paths remain inside the public directory", () => {
  assert.equal(
    resolveAssetOutputPath(publicDir, "/wp-content/uploads/car.jpg"),
    path.join(publicDir, "wp-content/uploads/car.jpg"),
  );
  assert.equal(
    resolveAssetOutputPath(publicDir, "/wp-includes/fonts/site.woff2"),
    path.join(publicDir, "wp-includes/fonts/site.woff2"),
  );
});

test("snapshot asset paths reject encoded traversal and separators", () => {
  for (const maliciousPath of [
    "/wp-content/%2e%2e%2f%2e%2e%2fpackage.json",
    "/wp-content/%2e%2e/secret.txt",
    "/wp-content/%2e%2e%5c%2e%2e%5cpackage.json",
    "/other/place/file.js",
    "/wp-content/%E0%A4%A",
  ]) {
    assert.throws(() => resolveAssetOutputPath(publicDir, maliciousPath), /Rejected/);
  }
});

test("snapshot downloads reject cross-origin redirects", () => {
  assert.doesNotThrow(() => assertSameOriginResponse("https://www.ozicashforcars.com.au/wp-content/a.css", "https://www.ozicashforcars.com.au"));
  assert.throws(() => assertSameOriginResponse("https://attacker.example/a.css", "https://www.ozicashforcars.com.au"), /cross-origin/);
});
