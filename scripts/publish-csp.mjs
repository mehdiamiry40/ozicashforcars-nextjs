/**
 * Publish per-page CSP script hashes for prerendered HTML.
 *
 * Each page embeds its own React flight script, so one site-wide hash list
 * would be larger than the proxy header limit. A page's header lists only
 * that page's executable inline scripts. The catch-all header cannot keep a
 * second policy: browsers enforce every matching Content-Security-Policy,
 * and a catch-all without those hashes would block the page.
 *
 * On Vercel this runs inside onBuildComplete, before the platform adapter
 * writes `.next/output/config.json`. Local `next build` has no adapter; the
 * post-build step writes the same headers into the routes manifest.
 */
import { createRequire } from "node:module";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import {
  CSP_HASH_PLACEHOLDER,
  assertProductionScriptSrc,
  buildResourceContentSecurityPolicy,
  documentScriptPolicy,
  missingScriptHashes,
  requiredScriptHashes,
  stripPreviewToolbar,
} from "../lib/csp.mjs";

export { stripPreviewToolbar };

const require = createRequire(import.meta.url);
const { buildCustomRoute } = require("next/dist/lib/build-custom-route");
const { modifyRouteRegex } = require("next/dist/lib/redirect-status");
const { convertHeaders } = require("next/dist/compiled/@vercel/routing-utils");

const RESOURCE_SOURCES = ["/api/(.*)", "/sitemap.xml", "/robots.txt", "/manifest.webmanifest"];
const SKIP_DIRECTORIES = new Set(["node_modules", "chunks", "diagnostics", "trace"]);

export function canonicalPath(pathname) {
  if (typeof pathname !== "string" || pathname.length === 0) return "";
  let path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  if (path === "/index") return "/";
  if (path === "/") return "/";
  return `${path}/`;
}

export function headerSource(canonical) {
  if (canonical === "/") return "/";
  return canonical.endsWith("/") ? canonical.slice(0, -1) : canonical;
}

function walk(directory, files = [], skip = SKIP_DIRECTORIES) {
  if (!existsSync(directory)) return files;
  for (const entry of readdirSync(directory)) {
    if (skip.has(entry)) continue;
    const path = join(directory, entry);
    const info = statSync(path);
    if (info.isDirectory()) walk(path, files, skip);
    else if (info.isFile()) files.push(path);
  }
  return files;
}

function routeFromAppHtml(file, appDir) {
  let route = relative(appDir, file).split(sep).join("/");
  if (!route.endsWith(".html") || route.includes(".segments/")) return "";
  route = route.slice(0, -".html".length);
  if (route === "index") return "/";
  if (route.endsWith("/index")) route = route.slice(0, -"/index".length);
  return canonicalPath(`/${route}`);
}

function routeFromCacheHtml(file) {
  const normalized = file.split(sep).join("/");
  const marker = "/$/";
  const index = normalized.lastIndexOf(marker);
  if (index === -1 || !normalized.endsWith(".html")) return "";
  const rest = normalized.slice(index + marker.length, -".html".length);
  if (!rest || rest.includes(".segments/")) return "";
  if (rest === "index") return "/";
  return canonicalPath(`/${rest}`);
}

function addDocument(byPath, path, file) {
  if (!path || !file.endsWith(".html")) return;
  const html = readFileSync(file, "utf8");
  const hashes = requiredScriptHashes(html);
  if (hashes.length === 0) return;
  const existing = byPath.get(path);
  if (!existing) {
    byPath.set(path, { path, file, hashes, policy: documentScriptPolicy(hashes) });
    return;
  }
  if (existing.hashes.join("\n") !== hashes.join("\n")) {
    throw new Error(`Prerendered HTML for ${path} differs between ${existing.file} and ${file}.`);
  }
}

export function collectDocuments({ distDir, outputs }) {
  const byPath = new Map();
  const appDir = join(distDir, "server", "app");
  for (const file of walk(appDir)) {
    if (!file.endsWith(".html")) continue;
    addDocument(byPath, routeFromAppHtml(file, appDir), file);
  }
  const cacheDir = join(distDir, "server", "route-cache");
  for (const file of walk(cacheDir)) {
    if (!file.endsWith(".html")) continue;
    addDocument(byPath, routeFromCacheHtml(file), file);
  }
  for (const prerender of outputs?.prerenders ?? []) {
    const file = prerender.fallback?.filePath;
    if (!file || !String(file).endsWith(".html")) continue;
    addDocument(byPath, canonicalPath(prerender.pathname), file);
  }
  for (const file of outputs?.staticFiles ?? []) {
    if (!file.filePath || !String(file.filePath).endsWith(".html")) continue;
    addDocument(byPath, canonicalPath(file.pathname), file.filePath);
  }
  return [...byPath.values()].sort((left, right) => left.path.localeCompare(right.path));
}

function expectedPagePaths(projectRoot) {
  const indexPath = join(projectRoot, "data", "site-index.json");
  const index = JSON.parse(readFileSync(indexPath, "utf8"));
  return Object.keys(index.pages);
}

export function assertDocumentsDiscovered(projectRoot, documents) {
  if (documents.length === 0) {
    throw new Error("CSP hash check found no prerendered HTML. Pages are still dynamic, so a static script hash cannot be published.");
  }
  const indexPath = join(projectRoot, "data", "site-index.json");
  if (!existsSync(indexPath)) return;
  const found = new Set(documents.map((document) => document.path));
  const missing = expectedPagePaths(projectRoot).filter((path) => !found.has(path));
  if (missing.length) {
    throw new Error(
      `CSP hash check did not find prerendered HTML for ${missing.length} page(s), first ${missing[0]}. Pages are still dynamic, or the HTML was written somewhere else.`,
    );
  }
}

function cspHeaderKey(headers) {
  if (!headers || typeof headers !== "object" || Array.isArray(headers)) return undefined;
  return Object.keys(headers).find((key) => key.toLowerCase() === "content-security-policy");
}

function headerValue(headers, key) {
  const value = headers[key];
  if (Array.isArray(value)) return value.join(", ");
  return typeof value === "string" ? value : "";
}

function setHeaderCsp(headers, policy) {
  const key = cspHeaderKey(headers) ?? "Content-Security-Policy";
  for (const name of Object.keys(headers)) {
    if (name.toLowerCase() === "content-security-policy" && name !== key) delete headers[name];
  }
  headers[key] = policy;
}

function deleteHeaderCsp(headers) {
  for (const name of Object.keys(headers)) {
    if (name.toLowerCase() === "content-security-policy") delete headers[name];
  }
}

export function adapterHeaderRoute(source, policy) {
  const manifestRoute = buildCustomRoute("header", {
    source,
    headers: [{ key: "Content-Security-Policy", value: policy }],
  });
  const converted = convertHeaders([manifestRoute])[0];
  const regex = converted.src || manifestRoute.regex;
  return {
    source,
    sourceRegex: modifyRouteRegex(regex),
    headers: converted.headers ?? { "Content-Security-Policy": policy },
  };
}

function manifestHeaderRoute(source, policy) {
  return buildCustomRoute("header", {
    source,
    headers: [{ key: "Content-Security-Policy", value: policy }],
  });
}

function isCspOnly(headers) {
  const list = Array.isArray(headers) ? headers : Object.entries(headers).map(([key, value]) => ({ key, value }));
  return list.length === 1 && list[0]?.key?.toLowerCase() === "content-security-policy";
}

function resourcePolicy() {
  const policy = buildResourceContentSecurityPolicy();
  if (policy.includes(CSP_HASH_PLACEHOLDER) || policy.includes("'sha256-") || policy.includes("vercel.live")) {
    throw new Error("resource CSP must not carry a script hash, placeholder, or vercel.live");
  }
  const scriptSrc = policy.split(";").map((part) => part.trim()).find((part) => part.startsWith("script-src "));
  if (!scriptSrc || scriptSrc.includes("'unsafe-inline'") || scriptSrc.includes("'unsafe-eval'")) {
    throw new Error(`resource script-src is not strict: ${scriptSrc}`);
  }
  return policy;
}

/**
 * Remove the placeholder catch-all policy and install one hash policy per
 * document. A catch-all that still matched the page would be enforced as
 * well, so the placeholder is deleted rather than left beside the real hashes.
 */
export function installRoutingHeaders(routing, documents) {
  if (!routing?.beforeMiddleware) return;
  const owned = new Set(documents.map((document) => headerSource(document.path)));
  const resourceSources = new Set(RESOURCE_SOURCES);
  routing.beforeMiddleware = routing.beforeMiddleware.filter((route) => {
    if (!route.headers) return true;
    const key = cspHeaderKey(route.headers);
    if (!key) return true;
    const placeholder = headerValue(route.headers, key).includes(CSP_HASH_PLACEHOLDER);
    const ownedCsp = owned.has(route.source) || resourceSources.has(route.source);
    if (placeholder || (ownedCsp && isCspOnly(route.headers))) {
      if (isCspOnly(route.headers)) return false;
      deleteHeaderCsp(route.headers);
    }
    return true;
  });
  for (const document of documents) {
    routing.beforeMiddleware.push(adapterHeaderRoute(headerSource(document.path), document.policy));
  }
  for (const source of RESOURCE_SOURCES) {
    routing.beforeMiddleware.push(adapterHeaderRoute(source, resourcePolicy()));
  }
}

export function installManifestHeaders(distDir, documents) {
  const manifestPath = join(distDir, "routes-manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const owned = new Set(documents.map((document) => headerSource(document.path)));
  const resourceSources = new Set(RESOURCE_SOURCES);
  manifest.headers = (manifest.headers ?? []).flatMap((rule) => {
    const headers = Array.isArray(rule.headers) ? rule.headers : [];
    const placeholder = headers.some(
      (header) =>
        header.key?.toLowerCase() === "content-security-policy" &&
        String(header.value).includes(CSP_HASH_PLACEHOLDER),
    );
    const ownedCsp = owned.has(rule.source) || resourceSources.has(rule.source);
    if (!placeholder && !ownedCsp) return [rule];
    const kept = headers.filter((header) => header.key?.toLowerCase() !== "content-security-policy");
    if (kept.length === 0) return [];
    return [{ ...rule, headers: kept }];
  });
  const additions = [
    ...documents.map((document) => manifestHeaderRoute(headerSource(document.path), document.policy)),
    ...RESOURCE_SOURCES.map((source) => manifestHeaderRoute(source, resourcePolicy())),
  ];
  manifest.headers.push(...additions);
  writeFileSync(manifestPath, JSON.stringify(manifest));
  return manifest;
}

function matchesPath(regex, path) {
  try {
    const expression = new RegExp(regex);
    return expression.test(path) || expression.test(headerSource(path));
  } catch {
    return false;
  }
}

export function policiesForPath(rules, path) {
  const policies = [];
  for (const rule of rules) {
    const regex = rule.regex || rule.sourceRegex || rule.src;
    if (!regex || !matchesPath(regex, path)) continue;
    const headers = rule.headers;
    if (Array.isArray(headers)) {
      for (const header of headers) {
        if (header.key?.toLowerCase() === "content-security-policy") policies.push(String(header.value));
      }
    } else if (headers && typeof headers === "object") {
      const key = cspHeaderKey(headers);
      if (key) policies.push(headerValue(headers, key));
    }
  }
  return policies;
}

export function assertDocumentsCovered(documents, policiesFor) {
  const problems = [];
  for (const document of documents) {
    const policies = policiesFor(document.path);
    if (policies.length === 0) {
      problems.push(`${document.path}: no Content-Security-Policy matches this document`);
      continue;
    }
    for (const policy of policies) {
      if (policy.includes(CSP_HASH_PLACEHOLDER)) {
        problems.push(`${document.path}: CSP still contains the placeholder`);
        continue;
      }
      try {
        assertProductionScriptSrc(policy);
      } catch (error) {
        problems.push(`${document.path}: ${error instanceof Error ? error.message : String(error)}`);
        continue;
      }
      for (const hash of missingScriptHashes(policy, document.hashes)) {
        problems.push(`${document.path}: missing ${hash}`);
      }
    }
  }
  if (problems.length) {
    throw new Error(
      `CSP script hash check failed (${problems.length}):\n${problems
        .slice(0, 40)
        .map((problem) => `  - ${problem}`)
        .join("\n")}`,
    );
  }
}

function prerenderKeyCandidates(path) {
  return [...new Set([path, headerSource(path), path === "/" ? "/index" : ""].filter(Boolean))];
}

export function installPrerenderHeaders(distDir, documents, projectRoot) {
  const manifestPath = join(distDir, "prerender-manifest.json");
  if (!existsSync(manifestPath)) return;
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const byPath = new Map(documents.map((document) => [document.path, document]));
  const problems = [];
  for (const [routePath, route] of Object.entries(manifest.routes ?? {})) {
    const canonical = canonicalPath(routePath);
    const document = byPath.get(canonical) ?? byPath.get(routePath);
    if (!document) continue;
    if (route.compute && route.compute !== "static") {
      problems.push(`${routePath} compute is ${route.compute}, expected static`);
    }
    if (route.initialRevalidateSeconds !== false) {
      problems.push(
        `${routePath} revalidate is ${String(route.initialRevalidateSeconds)}, expected false so the page stays statically prerendered`,
      );
    }
    route.initialHeaders = route.initialHeaders ?? {};
    setHeaderCsp(route.initialHeaders, document.policy);
  }
  const indexPath = projectRoot ? join(projectRoot, "data", "site-index.json") : "";
  if (indexPath && existsSync(indexPath)) {
    for (const path of expectedPagePaths(projectRoot)) {
      const route = prerenderKeyCandidates(path)
        .map((key) => manifest.routes?.[key])
        .find(Boolean);
      if (!route) problems.push(`${path} was not prerendered`);
    }
  }
  if (problems.length) {
    throw new Error(
      `Static prerender was not preserved:\n${problems
        .slice(0, 40)
        .map((problem) => `  - ${problem}`)
        .join("\n")}`,
    );
  }
  writeFileSync(manifestPath, JSON.stringify(manifest));
}

function installOutputHeaders(outputs, documents) {
  if (!outputs) return;
  const byPath = new Map(documents.map((document) => [document.path, document]));
  for (const prerender of outputs.prerenders ?? []) {
    const document = byPath.get(canonicalPath(prerender.pathname));
    const headers = prerender.fallback?.initialHeaders;
    if (!document || !headers || Array.isArray(headers)) continue;
    setHeaderCsp(headers, document.policy);
  }
}

export function deploymentConfigPaths(projectRoot, distDir) {
  return [
    join(distDir, "output", "config.json"),
    join(projectRoot, ".vercel", "output", "config.json"),
    "/vercel/output/config.json",
  ].filter((file, index, files) => existsSync(file) && files.indexOf(file) === index);
}

function routeSource(route) {
  return route?.src || route?.sourceRegex || route?.regex || route?.source;
}

/**
 * The platform adapter serialises routing headers into config.json and has
 * dropped a hash whose base64 contains `/`. Rewrite each document policy from
 * the hashes just collected. A catch-all that matches more than one document
 * loses its CSP so it cannot block a page whose hash it does not carry.
 */
export function repairDeploymentConfig(config, documents) {
  const visit = (value) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      for (const entry of value) visit(entry);
      return;
    }
    const headers = value.headers;
    const key = cspHeaderKey(headers);
    if (key) {
      const source = routeSource(value);
      const matched = source
        ? documents.filter((document) => matchesPath(source, document.path))
        : [];
      if (matched.length === 1) setHeaderCsp(headers, matched[0].policy);
      else if (matched.length > 1) deleteHeaderCsp(headers);
      else if (headerValue(headers, key).includes(CSP_HASH_PLACEHOLDER)) setHeaderCsp(headers, resourcePolicy());
    }
    for (const entry of Object.values(value)) visit(entry);
  };
  visit(config);
}

export function policiesFromConfig(config, path) {
  const policies = [];
  const visit = (value) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      for (const entry of value) visit(entry);
      return;
    }
    const key = cspHeaderKey(value.headers);
    const source = routeSource(value);
    if (key && source && matchesPath(source, path)) policies.push(headerValue(value.headers, key));
    for (const entry of Object.values(value)) {
      if (entry && typeof entry === "object") visit(entry);
    }
  };
  visit(config.routes ?? config);
  return policies;
}

export function installDocumentCsp({ projectRoot, distDir, routing, outputs }) {
  const documents = collectDocuments({ distDir, outputs });
  assertDocumentsDiscovered(projectRoot, documents);
  installRoutingHeaders(routing, documents);
  const manifest = installManifestHeaders(distDir, documents);
  installPrerenderHeaders(distDir, documents, projectRoot);
  installOutputHeaders(outputs, documents);
  assertDocumentsCovered(documents, (path) => policiesForPath(manifest.headers, path));
  if (routing?.beforeMiddleware) {
    assertDocumentsCovered(documents, (path) => policiesForPath(routing.beforeMiddleware, path));
  }
  return documents;
}

export function assertPublishedCsp({ projectRoot, distDir, routing, requireDeploymentOutput }) {
  const documents = collectDocuments({ distDir });
  assertDocumentsDiscovered(projectRoot, documents);
  const manifest = JSON.parse(readFileSync(join(distDir, "routes-manifest.json"), "utf8"));
  if (JSON.stringify(manifest.headers ?? []).includes(CSP_HASH_PLACEHOLDER)) {
    throw new Error("CSP placeholder is still in routes-manifest.json");
  }
  assertDocumentsCovered(documents, (path) => policiesForPath(manifest.headers ?? [], path));
  installPrerenderHeaders(distDir, documents, projectRoot);

  if (routing?.beforeMiddleware) {
    if (JSON.stringify(routing.beforeMiddleware).includes(CSP_HASH_PLACEHOLDER)) {
      throw new Error("CSP placeholder is still in the deployment routing");
    }
    assertDocumentsCovered(documents, (path) => policiesForPath(routing.beforeMiddleware, path));
  }

  const configs = deploymentConfigPaths(projectRoot, distDir);
  if (requireDeploymentOutput && configs.length === 0) {
    throw new Error(
      `Vercel adapter did not write a deployment config. Looked for ${[
        join(distDir, "output", "config.json"),
        join(projectRoot, ".vercel", "output", "config.json"),
        "/vercel/output/config.json",
      ].join(", ")}.`,
    );
  }
  for (const file of configs) {
    const data = JSON.parse(readFileSync(file, "utf8"));
    repairDeploymentConfig(data, documents);
    const serialised = JSON.stringify(data);
    if (serialised.includes(CSP_HASH_PLACEHOLDER)) {
      throw new Error(`CSP placeholder is still in ${file}`);
    }
    writeFileSync(file, serialised);
    assertDocumentsCovered(documents, (path) => policiesFromConfig(JSON.parse(serialised), path));
  }
  return { documents, configs };
}

export function stripToolbarFile(file) {
  if (typeof file !== "string" || (!file.endsWith(".js") && !file.endsWith(".html"))) return false;
  let source;
  try {
    source = readFileSync(file, "utf8");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return false;
    throw error;
  }
  if (!source.includes("vercel.live/_next-live/feedback/feedback.js")) return false;
  const next = stripPreviewToolbar(source);
  if (next === source) return false;
  writeFileSync(file, next);
  return true;
}

export function stripToolbarFromDist(distDir, projectRoot = process.cwd()) {
  // Client bundles live under static/chunks and static/immutable/chunks. The
  // document walk skips a directory named "chunks"; this pass must not, or the
  // unconditional preview toolbar stays in the file Vercel serves.
  // The platform adapter copies those bundles into /vercel/output during
  // onBuildComplete. Strip that tree too: it is what the deployment uploads.
  const includeChunks = new Set(["node_modules", "diagnostics", "trace"]);
  const roots = [
    join(distDir, "static"),
    join(distDir, "output"),
    join(distDir, "server"),
    join(projectRoot, ".vercel", "output"),
    "/vercel/output",
  ];
  let stripped = 0;
  for (const root of roots) {
    for (const file of walk(root, [], includeChunks)) {
      if (!file.endsWith(".js") && !file.endsWith(".html")) continue;
      const source = readFileSync(file, "utf8");
      if (!source.includes("vercel.live/_next-live/feedback/feedback.js")) continue;
      const next = stripPreviewToolbar(source);
      if (next !== source) {
        writeFileSync(file, next);
        stripped += 1;
      }
    }
  }
  return stripped;
}
