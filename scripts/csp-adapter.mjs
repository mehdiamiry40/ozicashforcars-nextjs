import fs from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  assertPublishedCsp,
  installDocumentCsp,
  stripPreviewToolbar,
  stripToolbarFile,
  stripToolbarFromDist,
} from "./publish-csp.mjs";

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
  // Turbopack's immutable assets are content-addressed and shared across
  // deployments. The preview toolbar is compiled into that chunk, and the first
  // upload of a hash keeps being served. Opt out before compilation so this
  // deployment uploads the stripped file under its own deployment id.
  config.supportsImmutableAssets = false;
  config.experimental = { ...(config.experimental ?? {}), supportsImmutableAssets: false };
  if (Array.isArray(config.instrumentationClientInject)) {
    const dropped = config.instrumentationClientInject.filter((spec) =>
      /vercel|toolbar|feedback/i.test(String(spec)),
    );
    if (dropped.length) {
      config.instrumentationClientInject = config.instrumentationClientInject.filter(
        (spec) => !dropped.includes(spec),
      );
      console.log(`CSP: dropped ${dropped.length} preview instrumentation inject(s) before compilation`);
    }
  }
  return config;
}

function stripWritten(file, data) {
  if (typeof file !== "string" || (!file.endsWith(".js") && !file.endsWith(".html"))) return data;
  if (typeof data === "string") {
    if (!data.includes("vercel.live/_next-live/feedback/feedback.js")) return data;
    return stripPreviewToolbar(data);
  }
  if (Buffer.isBuffer(data)) {
    const source = data.toString("utf8");
    if (!source.includes("vercel.live/_next-live/feedback/feedback.js")) return data;
    const next = stripPreviewToolbar(source);
    return next === source ? data : Buffer.from(next);
  }
  return data;
}

function installWriteStrip() {
  const removed = { count: 0 };
  const writeFileSync = fs.writeFileSync;
  const writeFile = fs.writeFile;
  const promiseWrite = fs.promises.writeFile;
  const copyFileSync = fs.copyFileSync;
  const promiseCopy = fs.promises.copyFile;
  const replace = (file, data) => {
    const next = stripWritten(file, data);
    if (next !== data) removed.count += 1;
    return next;
  };
  fs.writeFileSync = function (file, data, ...rest) {
    return writeFileSync.call(this, file, replace(file, data), ...rest);
  };
  fs.writeFile = function (file, data, ...rest) {
    return writeFile.call(this, file, replace(file, data), ...rest);
  };
  fs.promises.writeFile = function (file, data, ...rest) {
    return promiseWrite.call(this, file, replace(file, data), ...rest);
  };
  const stripCopied = (dest) => {
    if (typeof dest === "string" && stripToolbarFile(dest)) removed.count += 1;
  };
  fs.copyFileSync = function (src, dest, ...rest) {
    const result = copyFileSync.call(this, src, dest, ...rest);
    stripCopied(dest);
    return result;
  };
  fs.promises.copyFile = async function (src, dest, ...rest) {
    const result = await promiseCopy.call(this, src, dest, ...rest);
    stripCopied(dest);
    return result;
  };
  return {
    removed,
    restore() {
      fs.writeFileSync = writeFileSync;
      fs.writeFile = writeFile;
      fs.promises.writeFile = promiseWrite;
      fs.copyFileSync = copyFileSync;
      fs.promises.copyFile = promiseCopy;
    },
  };
}

export async function onBuildComplete(payload) {
  const strippedBefore = stripToolbarFromDist(payload.distDir, payload.projectDir);
  const documents = installDocumentCsp({
    projectRoot: payload.projectDir,
    distDir: payload.distDir,
    routing: payload.routing,
    outputs: payload.outputs,
  });
  console.log(
    `CSP: published ${documents.length} per-page script policies before the deployment adapter writes config.json`,
  );

  const writes = installWriteStrip();
  try {
    const delegated = await loadDelegatedAdapter();
    if (typeof delegated?.onBuildComplete === "function") {
      await delegated.onBuildComplete(payload);
    } else if (process.env.NEXT_ADAPTER_PATH) {
      throw new Error(
        `CSP adapter could not call onBuildComplete on NEXT_ADAPTER_PATH (${process.env.NEXT_ADAPTER_PATH})`,
      );
    }
  } finally {
    writes.restore();
  }

  const strippedAfter = stripToolbarFromDist(payload.distDir, payload.projectDir);
  console.log(
    `CSP: removed the unconditional preview toolbar from ${strippedBefore + writes.removed.count + strippedAfter} file(s)`,
  );
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
