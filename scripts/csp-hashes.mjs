/**
 * Fill production CSP hashes after a local `next build`, and check the files
 * Vercel actually serves.
 *
 * On Vercel, `scripts/csp-adapter.mjs` runs inside onBuildComplete, before the
 * adapter writes `.next/output/config.json`. This step still runs afterwards.
 * A placeholder left in either file would block every inline script. On Vercel
 * a missing deployment config is a failure, not a warning.
 */
import { join } from "node:path";
import { assertPublishedCsp, installDocumentCsp, stripToolbarFromDist } from "./publish-csp.mjs";

const projectRoot = process.cwd();
const distDir = join(projectRoot, ".next");
const onVercel = process.env.VERCEL === "1" || Boolean(process.env.NEXT_ADAPTER_PATH);

try {
  const removed = stripToolbarFromDist(distDir, projectRoot);
  if (removed) console.log(`CSP: removed the unconditional preview toolbar from ${removed} file(s)`);
  if (!onVercel) {
    const documents = installDocumentCsp({ projectRoot, distDir });
    console.log(`CSP: published ${documents.length} per-page script policies into the routes manifest`);
  }
  const checked = assertPublishedCsp({
    projectRoot,
    distDir,
    requireDeploymentOutput: onVercel,
  });
  if (checked.configs.length) {
    console.log(`CSP: checked hashed policy in ${checked.configs.join(", ")}`);
  } else {
    console.log(`CSP: checked hashed policy in ${join(distDir, "routes-manifest.json")}`);
  }
} catch (error) {
  console.error(`\nCSP build failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}
