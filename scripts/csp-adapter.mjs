import fs from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  NOT_FOUND_CSP_TOKEN,
  assertPublishedCsp,
  installDocumentCsp,
  notFoundDocument,
  notFoundPolicyB64,
  replaceNotFoundTokenInDist,
  stripPreviewToolbar,
  stripToolbarFile,
  stripToolbarFromDist,
} from "./publish-csp.mjs";

const adapterFile = fileURLToPath(new URL("./csp-adapter.mjs", import.meta.url));
let notFoundB64 = "";

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
  // Preview compiles the toolbar as an unconditional script. That chunk is
  // content-addressed, so stripping it after the hash is computed cannot
  // replace the bytes already uploaded. Drop the inject before compilation.
  // Production leaves the cookie-gated module; public responses never run it.
  if (process.env.VERCEL_ENV !== "production" && Array.isArray(config.instrumentationClientInject)) {
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

function applyWrittenTransforms(source) {
  let next = source;
  if (next.includes("vercel.live/_next-live/feedback/feedback.js")) next = stripPreviewToolbar(next);
  if (notFoundB64 && next.includes(NOT_FOUND_CSP_TOKEN)) next = next.replaceAll(NOT_FOUND_CSP_TOKEN, notFoundB64);
  return next;
}

function stripWritten(file, data) {
  if (typeof file !== "string" || (!file.endsWith(".js") && !file.endsWith(".html") && !file.endsWith(".map"))) return data;
  if (typeof data === "string") {
    const next = applyWrittenTransforms(data);
    return next === data ? data : next;
  }
  if (Buffer.isBuffer(data)) {
    const source = data.toString("utf8");
    const next = applyWrittenTransforms(source);
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
  const notFound = notFoundDocument(documents);
  notFoundB64 = notFound ? notFoundPolicyB64(notFound.policy) : "";
  if (notFoundB64) replaceNotFoundTokenInDist(payload.distDir, payload.projectDir, notFoundB64);
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
