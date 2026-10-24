import { createHash } from "node:crypto";

/**
 * Replaced after prerender with the sha256 of each executable inline script.
 * A leftover token keeps the directive syntactically valid and blocks those
 * scripts, and the build refuses to publish while it is still present.
 * It is not a real hash, so it cannot collide with a script digest.
 */
export const CSP_HASH_PLACEHOLDER = "__CSP_INLINE_HASHES__";

const NEXT_S_PUSH = "(self.__next_s=self.__next_s||[]).push(";

const JS_TYPES = new Set([
  "",
  "text/javascript",
  "application/javascript",
  "text/ecmascript",
  "application/ecmascript",
  "module",
]);

const MAX_DOCUMENT_POLICY_CHARS = 7500;

function join(directive, sources) {
  return `${directive} ${sources.join(" ")}`;
}

function attr(attrs, name) {
  const match = attrs.match(
    new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>\`]+))`, "i"),
  );
  if (!match) return null;
  return match[1] ?? match[2] ?? match[3] ?? "";
}

function isExecutableScript(attrs) {
  if (attr(attrs, "src") !== null) return false;
  const type = attr(attrs, "type");
  if (type === null) return true;
  return JS_TYPES.has(type.trim().toLowerCase());
}

/** Children Next assigns to a new script element via innerHTML. */
export function nextScriptPayloads(text) {
  const trimmed = text.trim();
  if (!trimmed.startsWith(NEXT_S_PUSH)) return [];
  if (!trimmed.endsWith(")")) throw new Error("truncated __next_s inline script");
  let payload;
  try {
    payload = JSON.parse(trimmed.slice(NEXT_S_PUSH.length, -1));
  } catch (error) {
    throw new Error(
      `unparseable __next_s inline script: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (!Array.isArray(payload)) return [];
  const props = payload[1];
  if (!props || typeof props !== "object" || !("children" in props)) return [];
  const children = props.children;
  if (typeof children !== "string" || children.length === 0) return [];
  return [children];
}

/**
 * Parser-inserted executable inline scripts, in document order.
 * JSON-LD and other non-script types are ignored: the browser does not
 * execute them, so they do not need a hash. Script data is not HTML-decoded;
 * the bytes between the tags are the bytes the browser hashes.
 */
export function inlineScripts(html) {
  const scripts = [];
  const open = /<script\b([^>]*)>/gi;
  let match;
  while ((match = open.exec(html))) {
    const attrs = match[1] ?? "";
    const start = open.lastIndex;
    const end = html.toLowerCase().indexOf("</script>", start);
    if (end === -1) throw new Error("unterminated <script> in prerendered HTML");
    const text = html.slice(start, end);
    open.lastIndex = end + "</script>".length;
    if (!isExecutableScript(attrs) || text.length === 0) continue;
    scripts.push({ text, dynamic: nextScriptPayloads(text) });
  }
  return scripts;
}

export function sha256Source(content) {
  const digest = createHash("sha256").update(content, "utf8").digest("base64");
  return `'sha256-${digest}'`;
}

/** Every hash the CSP must list for this HTML document. */
export function requiredScriptHashes(html) {
  const hashes = new Set();
  for (const script of inlineScripts(html)) {
    hashes.add(sha256Source(script.text));
    for (const payload of script.dynamic) hashes.add(sha256Source(payload));
  }
  return [...hashes].sort();
}

/**
 * Document policy. `scriptHashes` are `'sha256-...'` sources for this page.
 * An empty list leaves the placeholder so a missed publish step fails closed.
 * There is no nonce and no `'strict-dynamic'`: a nonce would make every
 * response unique, and `'strict-dynamic'` would ignore `'self'` and block
 * the parser-inserted Next chunks.
 *
 * style-src-attr stays `'unsafe-inline'` because next/image emits a style
 * attribute, which cannot carry a hash. style-src-elem does not, so an
 * injected style element is still refused in browsers that understand the
 * split. style-src keeps `'unsafe-inline'` for browsers that only read it.
 *
 * The quote form posts and fetches same-origin `/api/quote/`. No analytics
 * or tag-manager host is loaded by this site.
 */
export function buildContentSecurityPolicy(scriptHashes = []) {
  const hashes = scriptHashes.length > 0 ? [...scriptHashes].sort() : [CSP_HASH_PLACEHOLDER];
  return [
    join("default-src", ["'self'"]),
    join("script-src", ["'self'", ...hashes]),
    join("script-src-attr", ["'none'"]),
    join("style-src", ["'self'", "'unsafe-inline'"]),
    join("style-src-elem", ["'self'"]),
    join("style-src-attr", ["'unsafe-inline'"]),
    join("img-src", ["'self'", "data:"]),
    join("font-src", ["'self'"]),
    join("connect-src", ["'self'"]),
    join("frame-src", ["'none'"]),
    join("object-src", ["'none'"]),
    join("base-uri", ["'self'"]),
    join("form-action", ["'self'"]),
    join("frame-ancestors", ["'none'"]),
    "upgrade-insecure-requests",
  ].join("; ");
}

/** JSON, sitemap, and other responses that ship no inline script. */
export function buildResourceContentSecurityPolicy() {
  return [
    join("default-src", ["'self'"]),
    join("script-src", ["'self'"]),
    join("script-src-attr", ["'none'"]),
    join("style-src", ["'self'", "'unsafe-inline'"]),
    join("style-src-elem", ["'self'"]),
    join("style-src-attr", ["'unsafe-inline'"]),
    join("img-src", ["'self'", "data:"]),
    join("font-src", ["'self'"]),
    join("connect-src", ["'self'"]),
    join("frame-src", ["'none'"]),
    join("object-src", ["'none'"]),
    join("base-uri", ["'self'"]),
    join("form-action", ["'self'"]),
    join("frame-ancestors", ["'none'"]),
    "upgrade-insecure-requests",
  ].join("; ");
}

/** React's development overlay needs eval, and dev inline scripts change every compile. */
export function buildDevContentSecurityPolicy() {
  return [
    join("default-src", ["'self'"]),
    join("script-src", ["'self'", "'unsafe-inline'", "'unsafe-eval'"]),
    join("script-src-attr", ["'none'"]),
    join("style-src", ["'self'", "'unsafe-inline'"]),
    join("style-src-elem", ["'self'", "'unsafe-inline'"]),
    join("style-src-attr", ["'unsafe-inline'"]),
    join("img-src", ["'self'", "data:", "blob:"]),
    join("font-src", ["'self'", "data:"]),
    join("connect-src", ["'self'", "ws:", "wss:"]),
    join("frame-src", ["'none'"]),
    join("object-src", ["'none'"]),
    join("base-uri", ["'self'"]),
    join("form-action", ["'self'"]),
    join("frame-ancestors", ["'none'"]),
  ].join("; ");
}

export function directiveValue(policy, name) {
  const match = policy
    .split(";")
    .map((part) => part.trim())
    .find((part) => part === name || part.startsWith(`${name} `));
  if (!match) throw new Error(`CSP is missing ${name}`);
  return match.slice(name.length).trim();
}

export function assertProductionScriptSrc(policy) {
  const scriptSrc = directiveValue(policy, "script-src");
  if (scriptSrc.includes("'unsafe-inline'") || scriptSrc.includes("'unsafe-eval'")) {
    throw new Error(`production script-src must not allow unsafe-inline or unsafe-eval: ${scriptSrc}`);
  }
  if (scriptSrc.includes("'nonce-") || scriptSrc.includes("'strict-dynamic'")) {
    throw new Error("production script-src must use hashes so prerendered pages stay static");
  }
  if (policy.includes(CSP_HASH_PLACEHOLDER)) {
    throw new Error("production CSP still contains the inline-script hash placeholder");
  }
  if (policy.includes("vercel.live")) {
    throw new Error("production CSP must not allowlist vercel.live");
  }
  if (!scriptSrc.includes("'sha256-")) {
    throw new Error("production script-src has no sha256 hashes");
  }
  if (policy.length > MAX_DOCUMENT_POLICY_CHARS) {
    throw new Error(
      `Document CSP is ${policy.length} characters. Per-page hash policies must stay within ${MAX_DOCUMENT_POLICY_CHARS}.`,
    );
  }
}

export function missingScriptHashes(policy, required) {
  const scriptSrc = directiveValue(policy, "script-src");
  return required.filter((hash) => !scriptSrc.includes(hash));
}

export function documentScriptPolicy(hashes) {
  if (!hashes.length) throw new Error("Refusing to publish a document CSP with no inline-script hashes");
  const policy = buildContentSecurityPolicy(hashes);
  assertProductionScriptSrc(policy);
  const missing = missingScriptHashes(policy, hashes);
  if (missing.length) throw new Error(`document policy is missing ${missing[0]}`);
  return policy;
}

const PREVIEW_TOOLBAR_URL = "https://vercel.live/_next-live/feedback/feedback.js";

/**
 * Preview builds can append this script on every page. The document policy
 * does not allow vercel.live, so the unconditional injector is removed.
 */
const UNCONDITIONAL_TOOLBAR_INJECTION =
  /var \w+=document\.createElement\("script"\);\w+\.src="https:\/\/vercel\.live\/_next-live\/feedback\/feedback\.js",\w+\.setAttribute\("data-deployment-id",globalThis\.NEXT_DEPLOYMENT_ID\),\(document\.head\|\|document\.documentElement\)\.appendChild\(\w+\)/g;

/**
 * Production leaves the same injector in the client bundle, but only runs it
 * when the document cookie `__vercel_toolbar=1` is set. Public responses never
 * set that cookie, so the reference does not load the script and must not fail
 * the build. vercel.live stays out of the policy.
 */
function cookieGatedToolbarOnly(source) {
  let from = 0;
  while (from < source.length) {
    const index = source.indexOf(PREVIEW_TOOLBAR_URL, from);
    if (index === -1) return true;
    const before = source.slice(Math.max(0, index - 800), index);
    const after = source.slice(index, index + 500);
    const gated =
      before.includes("__vercel_toolbar=1") &&
      before.includes("document.cookie") &&
      after.includes("data-cookie-opt-in") &&
      after.includes("appendChild(");
    if (!gated) return false;
    from = index + PREVIEW_TOOLBAR_URL.length;
  }
  return true;
}

export function stripPreviewToolbar(source) {
  const code = source.replace(UNCONDITIONAL_TOOLBAR_INJECTION, "void 0");
  if (!code.includes(PREVIEW_TOOLBAR_URL)) return code;
  if (cookieGatedToolbarOnly(code)) return code;
  throw new Error("unrecognized Vercel preview toolbar injection still references vercel.live");
}
