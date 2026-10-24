import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  CSP_HASH_PLACEHOLDER,
  buildContentSecurityPolicy,
  buildDevContentSecurityPolicy,
  buildResourceContentSecurityPolicy,
  directiveValue,
  inlineScripts,
  requiredScriptHashes,
  sha256Source,
  stripPreviewToolbar,
} from "../lib/csp.mjs";

const READY = "var ready = true;";
const READY_HASH = "'sha256-TozK714HU/l1ieYBTx7IEMltYbPiij1d+yG6zbWK/BM='";

function page(extra = "") {
  const payload = JSON.stringify([0, { children: "window.dataLayer = window.dataLayer || [];", id: "tag" }]);
  return `<!doctype html><script src="/_next/static/chunks/app.js"></script>
<script type="application/ld+json">{"@type":"WebSite"}</script>
<script>(self.__next_s=self.__next_s||[]).push(${payload})</script>
<script>(self.__next_f=self.__next_f||[]).push([0])</script>
${extra}`;
}

test("hashes the script source the browser hashes", () => {
  assert.equal(sha256Source(READY), READY_HASH);
  assert.equal(sha256Source("a &amp; b"), sha256Source("a &amp; b"));
  assert.notEqual(sha256Source("a &amp; b"), sha256Source("a & b"));
});

test("ignores JSON-LD and external scripts, and hashes next/script payloads", () => {
  const scripts = inlineScripts(page());
  assert.equal(scripts.length, 2);
  assert.deepEqual(scripts[0]?.dynamic, ["window.dataLayer = window.dataLayer || [];"]);
  const hashes = requiredScriptHashes(page());
  assert.ok(hashes.includes(sha256Source(scripts[0].text)));
  assert.ok(hashes.includes(sha256Source("window.dataLayer = window.dataLayer || [];")));
  assert.ok(hashes.includes(sha256Source("(self.__next_f=self.__next_f||[]).push([0])")));
  assert.equal(hashes.some((hash) => hash === sha256Source('{"@type":"WebSite"}')), false);
});

test("production script-src is hash-only and does not allowlist vercel.live", () => {
  const policy = buildContentSecurityPolicy([sha256Source(READY)]);
  assert.equal(directiveValue(policy, "script-src").includes("'unsafe-inline'"), false);
  assert.equal(directiveValue(policy, "script-src").includes("'unsafe-eval'"), false);
  assert.equal(directiveValue(policy, "script-src").includes("'nonce-"), false);
  assert.equal(directiveValue(policy, "form-action"), "'self'");
  assert.equal(directiveValue(policy, "connect-src"), "'self'");
  assert.equal(directiveValue(policy, "frame-ancestors"), "'none'");
  assert.equal(policy.includes("vercel.live"), false);
  assert.equal(policy.includes(READY_HASH), true);
});

test("the placeholder stays until hashes are published", () => {
  const policy = buildContentSecurityPolicy();
  assert.equal(policy.includes(CSP_HASH_PLACEHOLDER), true);
  assert.equal(policy.includes("'unsafe-inline'"), true);
  assert.equal(directiveValue(policy, "script-src").includes("'unsafe-inline'"), false);
});

test("development keeps eval and the resource policy does not", () => {
  const dev = buildDevContentSecurityPolicy();
  assert.match(directiveValue(dev, "script-src"), /'unsafe-eval'/);
  assert.match(directiveValue(dev, "script-src"), /'unsafe-inline'/);
  const resource = buildResourceContentSecurityPolicy();
  assert.equal(resource.includes(CSP_HASH_PLACEHOLDER), false);
  assert.equal(directiveValue(resource, "script-src"), "'self'");
  assert.equal(directiveValue(resource, "script-src-attr"), "'none'");
  assert.equal(directiveValue(resource, "form-action"), "'self'");
});

test("strips the unconditional preview toolbar and keeps the production cookie gate", () => {
  const injected =
    'before;var r=document.createElement("script");r.src="https://vercel.live/_next-live/feedback/feedback.js",r.setAttribute("data-deployment-id",globalThis.NEXT_DEPLOYMENT_ID),(document.head||document.documentElement).appendChild(r);after';
  assert.equal(stripPreviewToolbar(injected), "before;void 0;after");
  assert.equal(stripPreviewToolbar("var ready = true;"), "var ready = true;");
  const production =
    'if(e.i(47167),/(?:^|;\\s)__vercel_toolbar=1(?:;|$)/.test(document.cookie)){var r=document.createElement("script");r.src="https://vercel.live/_next-live/feedback/feedback.js",r.setAttribute("data-explicit-opt-in","true"),r.setAttribute("data-cookie-opt-in","true"),r.setAttribute("data-deployment-id",globalThis.NEXT_DEPLOYMENT_ID),(document.head||document.documentElement).appendChild(r)}';
  assert.equal(stripPreviewToolbar(production), production);
  assert.throws(
    () => stripPreviewToolbar('const src = "https://vercel.live/_next-live/feedback/feedback.js";'),
    /unrecognized/,
  );
});

test("toolbar stripping reaches client chunks and leaves the cookie gate", async () => {
  const { stripToolbarFromDist } = await import("../scripts/publish-csp.mjs");
  const root = mkdtempSync(join(tmpdir(), "csp-toolbar-"));
  const distDir = join(root, ".next");
  try {
    const chunk = join(distDir, "static/immutable/chunks/toolbar.js");
    mkdirSync(join(distDir, "static/immutable/chunks"), { recursive: true });
    const injected =
      'before;var t=document.createElement("script");t.src="https://vercel.live/_next-live/feedback/feedback.js",t.setAttribute("data-deployment-id",globalThis.NEXT_DEPLOYMENT_ID),(document.head||document.documentElement).appendChild(t);after';
    const gated =
      'if(/(?:^|;\\s)__vercel_toolbar=1(?:;|$)/.test(document.cookie)){var r=document.createElement("script");r.src="https://vercel.live/_next-live/feedback/feedback.js",r.setAttribute("data-explicit-opt-in","true"),r.setAttribute("data-cookie-opt-in","true"),r.setAttribute("data-deployment-id",globalThis.NEXT_DEPLOYMENT_ID),(document.head||document.documentElement).appendChild(r)}';
    const outputChunk = join(distDir, "output/static/immutable/chunks/toolbar.js");
    mkdirSync(join(distDir, "output/static/immutable/chunks"), { recursive: true });
    writeFileSync(chunk, injected);
    writeFileSync(outputChunk, injected);
    writeFileSync(join(distDir, "static/immutable/chunks/gated.js"), gated);
    assert.equal(stripToolbarFromDist(distDir, root), 2);
    assert.equal(readFileSync(outputChunk, "utf8").includes("vercel.live"), false);
    assert.equal(readFileSync(chunk, "utf8").includes("vercel.live"), false);
    assert.equal(readFileSync(join(distDir, "static/immutable/chunks/gated.js"), "utf8"), gated);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the quote form still posts only to this origin", () => {
  const source = readFileSync(new URL("../app/components/QuoteForm.tsx", import.meta.url), "utf8");
  assert.match(source, /action="\/api\/quote\/"/);
  assert.match(source, /fetch\("\/api\/quote\/"/);
  assert.equal(source.includes("headers("), false);
  assert.equal(source.includes("cookies("), false);
});

test("hashes are published into adapter routing before that adapter seals output", async () => {
  const root = mkdtempSync(join(tmpdir(), "csp-adapter-"));
  const distDir = join(root, ".next");
  const previousAdapter = process.env.NEXT_ADAPTER_PATH;
  try {
    mkdirSync(join(distDir, "server/app"), { recursive: true });
    writeFileSync(join(distDir, "server/app/index.html"), `<!doctype html><script>${READY}</script>`);
    writeFileSync(join(distDir, "server/app/sell-my-car.html"), "<!doctype html><script>window.__page = 2;</script>");
    const placeholder = buildContentSecurityPolicy();
    writeFileSync(
      join(distDir, "routes-manifest.json"),
      JSON.stringify({
        headers: [
          {
            source: "/(.*)",
            regex: "^/(.*)$",
            headers: [
              { key: "Content-Security-Policy", value: placeholder },
              { key: "X-Frame-Options", value: "DENY" },
            ],
          },
        ],
      }),
    );
    const sealedPath = join(distDir, "output/config.json");
    const toolbarChunk = join(distDir, "static/chunks/toolbar.js");
    const injected =
      'var t=document.createElement("script");t.src="https://vercel.live/_next-live/feedback/feedback.js",t.setAttribute("data-deployment-id",globalThis.NEXT_DEPLOYMENT_ID),(document.head||document.documentElement).appendChild(t)';
    const delegatePath = join(root, "delegate.mjs");
    writeFileSync(
      delegatePath,
      `import fs from "node:fs";
       import { dirname } from "node:path";
       export async function onBuildComplete(payload) {
         fs.mkdirSync(dirname(${JSON.stringify(toolbarChunk)}), { recursive: true });
         fs.writeFileSync(${JSON.stringify(toolbarChunk)}, ${JSON.stringify(injected)});
         const routes = payload.routing.beforeMiddleware
           .filter((route) => route.headers && Object.values(route.headers).some((value) => String(value).includes("script-src")))
           .map((route) => ({
             src: route.sourceRegex,
             continue: true,
             headers: Object.fromEntries(Object.entries(route.headers).map(([key, value]) => [
               key,
               String(value).replace(/'sha256-[^']*\\/[^']*'/g, ""),
             ])),
           }));
         fs.mkdirSync(dirname(${JSON.stringify(sealedPath)}), { recursive: true });
         fs.writeFileSync(${JSON.stringify(sealedPath)}, JSON.stringify({ routes }));
       }
       export default { onBuildComplete };`,
    );
    process.env.NEXT_ADAPTER_PATH = delegatePath;
    const routing = {
      beforeMiddleware: [
        {
          source: "/(.*)",
          sourceRegex: "^/(.*)$",
          headers: {
            "Content-Security-Policy": placeholder,
            "X-Frame-Options": "DENY",
          },
        },
      ],
    };
    const adapter = await import(`../scripts/csp-adapter.mjs?test=${Date.now()}`);
    await adapter.onBuildComplete({ projectDir: root, distDir, routing, outputs: {} });
    const sealed = readFileSync(sealedPath, "utf8");
    assert.equal(sealed.includes(CSP_HASH_PLACEHOLDER), false);
    assert.equal(sealed.includes(READY_HASH), true);
    assert.equal(sealed.includes(sha256Source("window.__page = 2;")), true);
    const manifest = readFileSync(join(distDir, "routes-manifest.json"), "utf8");
    assert.equal(manifest.includes(CSP_HASH_PLACEHOLDER), false);
    assert.equal(manifest.includes("X-Frame-Options"), true);
    const home = JSON.parse(sealed).routes.find((route) => route.src.includes("sell-my-car") === false && route.headers["Content-Security-Policy"]?.includes(READY_HASH));
    assert.ok(home, "home policy restored after a slash-containing hash was dropped");
    assert.equal(home.headers["Content-Security-Policy"].includes(sha256Source("window.__page = 2;")), false);
    assert.equal(readFileSync(toolbarChunk, "utf8").includes("vercel.live"), false);
  } finally {
    if (previousAdapter === undefined) delete process.env.NEXT_ADAPTER_PATH;
    else process.env.NEXT_ADAPTER_PATH = previousAdapter;
    rmSync(root, { recursive: true, force: true });
  }
});

test("modifyConfig opts out of shared immutable assets and drops toolbar injects", async () => {
  const root = mkdtempSync(join(tmpdir(), "csp-modify-"));
  const delegatePath = join(root, "delegate.mjs");
  const previousAdapter = process.env.NEXT_ADAPTER_PATH;
  writeFileSync(
    delegatePath,
    `export function modifyConfig(config) {
       config.supportsImmutableAssets = true;
       config.experimental = { ...(config.experimental ?? {}), supportsImmutableAssets: true };
       config.instrumentationClientInject = ["@vercel/toolbar/next", "./app/instrumentation-client"];
       return config;
     }
     export default { modifyConfig };`,
  );
  process.env.NEXT_ADAPTER_PATH = delegatePath;
  try {
    const adapter = await import(`../scripts/csp-adapter.mjs?modify=${Date.now()}`);
    const next = await adapter.modifyConfig({ experimental: { other: true } }, {});
    assert.equal(next.supportsImmutableAssets, false);
    assert.equal(next.experimental.supportsImmutableAssets, false);
    assert.equal(next.experimental.other, true);
    assert.deepEqual(next.instrumentationClientInject, ["./app/instrumentation-client"]);
    assert.equal(next.adapterPath.endsWith(`${join("scripts", "csp-adapter.mjs")}`), true);
  } finally {
    if (previousAdapter === undefined) delete process.env.NEXT_ADAPTER_PATH;
    else process.env.NEXT_ADAPTER_PATH = previousAdapter;
    rmSync(root, { recursive: true, force: true });
  }
});

test("a published policy that still has the placeholder fails the build", async () => {
  const { assertPublishedCsp } = await import("../scripts/publish-csp.mjs");
  const root = mkdtempSync(join(tmpdir(), "csp-assert-"));
  const distDir = join(root, ".next");
  try {
    mkdirSync(join(distDir, "server/app"), { recursive: true });
    writeFileSync(join(distDir, "server/app/index.html"), `<script>${READY}</script>`);
    writeFileSync(
      join(distDir, "routes-manifest.json"),
      JSON.stringify({
        headers: [
          {
            source: "/",
            regex: "^/(?:/)?$",
            headers: [{ key: "Content-Security-Policy", value: buildContentSecurityPolicy() }],
          },
        ],
      }),
    );
    await assert.rejects(
      async () => assertPublishedCsp({ projectRoot: root, distDir, requireDeploymentOutput: false }),
      /placeholder/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a prerendered inline script missing from its page policy fails the build", async () => {
  const { assertPublishedCsp } = await import("../scripts/publish-csp.mjs");
  const root = mkdtempSync(join(tmpdir(), "csp-missing-"));
  const distDir = join(root, ".next");
  try {
    mkdirSync(join(distDir, "server/app"), { recursive: true });
    writeFileSync(join(distDir, "server/app/index.html"), `<script>${READY}</script><script>window.__other = 1;</script>`);
    writeFileSync(
      join(distDir, "routes-manifest.json"),
      JSON.stringify({
        headers: [
          {
            source: "/",
            regex: "^/(?:/)?$",
            headers: [{ key: "Content-Security-Policy", value: buildContentSecurityPolicy([sha256Source(READY)]) }],
          },
        ],
      }),
    );
    await assert.rejects(
      async () => assertPublishedCsp({ projectRoot: root, distDir, requireDeploymentOutput: false }),
      /missing/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
