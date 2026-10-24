import { fileURLToPath, pathToFileURL } from "node:url";
import { assertPublishedCsp, installDocumentCsp, stripToolbarFromDist } from "./publish-csp.mjs";

const adapterFile = fileURLToPath(new URL("./csp-adapter.mjs", import.meta.url));

async function loadDelegatedAdapter() {
  const adapterPath = process.env.NEXT_ADAPTER_PATH;
  if (!adapterPath || adapterPath === adapterFile) return null;
  const loaded = await import(pathToFileURL(adapterPath).href);
  return loaded.default ?? loaded;
}

export const name = "Ozi CSP";

export async function modifyConfig(config, context) {
  const delegated = await loadDelegatedAdapter();
  if (typeof delegated?.modifyConfig === "function") {
    config = await delegated.modifyConfig(config, context);
  }
  // Vercel's modifyConfig points adapterPath back at itself. This file has to
  // stay the adapter so hashes are in the routing object before it is serialised.
  config.adapterPath = adapterFile;
  return config;
}

export async function onBuildComplete(payload) {
  stripToolbarFromDist(payload.distDir);
  const documents = installDocumentCsp({
    projectRoot: payload.projectDir,
    distDir: payload.distDir,
    routing: payload.routing,
    outputs: payload.outputs,
  });
  console.log(
    `CSP: published ${documents.length} per-page script policies before the deployment adapter writes config.json`,
  );

  const delegated = await loadDelegatedAdapter();
  if (typeof delegated?.onBuildComplete === "function") {
    await delegated.onBuildComplete(payload);
  } else if (process.env.NEXT_ADAPTER_PATH) {
    throw new Error(
      `CSP adapter could not call onBuildComplete on NEXT_ADAPTER_PATH (${process.env.NEXT_ADAPTER_PATH})`,
    );
  }

  const checked = assertPublishedCsp({
    projectRoot: payload.projectDir,
    distDir: payload.distDir,
    routing: payload.routing,
    requireDeploymentOutput: Boolean(process.env.NEXT_ADAPTER_PATH),
  });
  console.log(`CSP: deployment config has the hashed policy (${checked.configs.length} file(s))`);
}

const cspAdapter = { name, modifyConfig, onBuildComplete };
export default cspAdapter;
