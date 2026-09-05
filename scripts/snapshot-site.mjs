import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { resolveAssetOutputPath } from "./snapshot-paths.mjs";
import { fetchSnapshotResource } from "./snapshot-fetch.mjs";

const ORIGIN = "https://www.ozicashforcars.com.au";
const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_DIR = path.join(ROOT, "data");
const USER_AGENT =
  "Mozilla/5.0 (compatible; OziCashNextMigration/1.0; +https://www.ozicashforcars.com.au/)";

const decodeXml = (value) =>
  value
    .replaceAll("&amp;", "&")
    .replaceAll("&#038;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");

async function fetchText(url) {
  const resource = await fetchSnapshotResource(url, {
    origin: ORIGIN,
    userAgent: USER_AGENT,
    accept: "text/html,application/xml,*/*",
    maxBytes: 2 * 1024 * 1024,
  });
  return { text: resource.body.toString("utf8"), url: resource.url };
}

function absoluteUrl(value, base = `${ORIGIN}/`) {
  if (!value || value.startsWith("data:") || value.startsWith("blob:")) return null;
  try {
    return new URL(value.replace(/^\/\//, "https://"), base).href;
  } catch {
    return null;
  }
}

function localizeMarkup(markup) {
  return markup
    .replaceAll(`${ORIGIN}/`, "/")
    .replaceAll("http://www.ozicashforcars.com.au/", "/")
    .replaceAll("//www.ozicashforcars.com.au/", "/")
    .replaceAll("https:\/\/www.ozicashforcars.com.au\/", "\/")
    .replaceAll("http:\/\/www.ozicashforcars.com.au\/", "\/");
}

function firstMatch(source, pattern, fallback = "") {
  return source.match(pattern)?.[1]?.trim() ?? fallback;
}

function stripTags(value) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#(?:x([\da-f]+)|(\d+));/gi, (_, hex, dec) =>
      String.fromCodePoint(Number.parseInt(hex || dec, hex ? 16 : 10)),
    )
    .replace(/\s+/g, " ")
    .trim();
}

function extractAttribute(attributes, name) {
  return (
    attributes.match(new RegExp(`\\b${name}=["']([^"']*)["']`, "i"))?.[1] ?? ""
  );
}

function extractMeta(head, name, attribute = "name") {
  const tags = head.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    if (extractAttribute(tag, attribute).toLowerCase() === name.toLowerCase()) {
      return extractAttribute(tag, "content");
    }
  }
  return "";
}

function pagePath(url) {
  const pathname = new URL(url).pathname.replace(/\/{2,}/g, "/");
  return pathname === "/" ? "/" : `${pathname.replace(/\/$/, "")}/`;
}

function collectSameOriginAssets(source, baseUrl, assetSet) {
  const candidates = new Set();
  const attrPattern = /\b(?:src|href|poster|data-src|data-lazy-src)=["']([^"']+)["']/gi;
  const srcsetPattern = /\b(?:srcset|data-srcset)=["']([^"']+)["']/gi;
  const cssPattern = /url\(\s*["']?([^"')]+)["']?\s*\)/gi;
  let match;
  while ((match = attrPattern.exec(source))) candidates.add(match[1]);
  while ((match = srcsetPattern.exec(source))) {
    for (const part of match[1].split(",")) candidates.add(part.trim().split(/\s+/)[0]);
  }
  while ((match = cssPattern.exec(source))) candidates.add(match[1]);

  for (const candidate of candidates) {
    const resolved = absoluteUrl(decodeXml(candidate), baseUrl);
    if (!resolved) continue;
    const parsed = new URL(resolved);
    if (parsed.origin !== ORIGIN) continue;
    let decodedPathname;
    try {
      decodedPathname = decodeURIComponent(parsed.pathname);
    } catch {
      continue;
    }
    if (
      !decodedPathname.includes("\\") &&
      (decodedPathname.startsWith("/wp-content/") || decodedPathname.startsWith("/wp-includes/"))
    ) {
      assetSet.add(parsed.href);
    }
  }
}

function parsePage(url, html, assetSet, assetBase = url) {
  collectSameOriginAssets(html, assetBase, assetSet);
  const head = firstMatch(html, /<head\b[^>]*>([\s\S]*?)<\/head>/i);
  const bodyAttributes = firstMatch(html, /<body\b([^>]*)>/i);
  let body = firstMatch(html, /<body\b[^>]*>([\s\S]*?)<\/body>/i);

  const scripts = [];
  const allScripts = html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi);
  for (const script of allScripts) {
    const attributes = script[1];
    const type = extractAttribute(attributes, "type");
    if (type === "application/ld+json") continue;
    scripts.push({
      src: localizeMarkup(extractAttribute(attributes, "src")),
      type,
      id: extractAttribute(attributes, "id"),
      code: script[2].trim(),
    });
  }
  body = body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");

  const headAssets = [];
  for (const tag of head.matchAll(/<link\b([^>]*)>/gi)) {
    const rel = extractAttribute(tag[1], "rel").toLowerCase();
    const href = extractAttribute(tag[1], "href");
    if (rel.includes("stylesheet") && href) {
      headAssets.push(`<link rel="stylesheet" href="${localizeMarkup(href)}" />`);
    }
  }
  for (const style of head.matchAll(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi)) {
    const id = extractAttribute(style[1], "id");
    headAssets.push(`<style${id ? ` id="${id}"` : ""}>${localizeMarkup(style[2])}</style>`);
  }

  const title = stripTags(firstMatch(head, /<title[^>]*>([\s\S]*?)<\/title>/i));
  const description = extractMeta(head, "description");
  const ogImage = extractMeta(head, "og:image", "property");
  const absoluteOgImage = absoluteUrl(ogImage, assetBase);
  if (absoluteOgImage && new URL(absoluteOgImage).origin === ORIGIN) {
    assetSet.add(absoluteOgImage);
  }
  const robots = extractMeta(head, "robots");
  const jsonLd = [...head.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map((entry) => entry[1].trim());

  return {
    path: pagePath(url),
    title,
    description,
    robots,
    ogImage: localizeMarkup(ogImage),
    bodyClass: extractAttribute(bodyAttributes, "class"),
    headHtml: headAssets.join("\n"),
    bodyHtml: localizeMarkup(body),
    scripts,
    jsonLd,
  };
}

async function pooled(items, limit, worker) {
  let index = 0;
  const results = new Array(items.length);
  async function run() {
    while (true) {
      const current = index++;
      if (current >= items.length) return;
      results[current] = await worker(items[current], current);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

async function downloadAsset(url, discoveredAssets) {
  const parsed = new URL(url);
  const outputPath = resolveAssetOutputPath(PUBLIC_DIR, parsed.pathname);
  const resource = await fetchSnapshotResource(url, {
    origin: ORIGIN,
    userAgent: USER_AGENT,
  });
  let buffer = resource.body;
  const contentType = resource.contentType;
  if (contentType.includes("text/css") || parsed.pathname.endsWith(".css")) {
    let css = buffer.toString("utf8");
    collectSameOriginAssets(css, resource.url, discoveredAssets);
    css = localizeMarkup(css);
    buffer = Buffer.from(css);
  }
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, buffer);
}

async function main() {
  const [pageSitemap, postSitemap] = await Promise.all([
    fetchText(`${ORIGIN}/page-sitemap.xml`),
    fetchText(`${ORIGIN}/post-sitemap.xml`),
  ]);
  const urls = [...`${pageSitemap.text}\n${postSitemap.text}`.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((entry) => decodeXml(entry[1]))
    .filter((url, index, list) => list.indexOf(url) === index);

  console.log(`Snapshotting ${urls.length} public URLs…`);
  const assetSet = new Set();
  const pages = await pooled(urls, 8, async (url, index) => {
    const resource = await fetchText(url);
    const page = parsePage(url, resource.text, assetSet, resource.url);
    if ((index + 1) % 25 === 0 || index + 1 === urls.length) {
      console.log(`Fetched ${index + 1}/${urls.length} pages`);
    }
    return page;
  });

  await mkdir(path.join(DATA_DIR, "pages"), { recursive: true });
  const index = {};
  for (const page of pages) {
    const fileKey = createHash("sha1").update(page.path).digest("hex").slice(0, 12);
    const { bodyHtml, headHtml, scripts, jsonLd, ...metadata } = page;
    index[page.path] = metadata;
    await writeFile(
      path.join(DATA_DIR, "pages", `${fileKey}.json`),
      `${JSON.stringify({ bodyHtml, headHtml, scripts, jsonLd })}\n`,
    );
  }
  await writeFile(
    path.join(DATA_DIR, "site-index.json"),
    `${JSON.stringify(
      { source: ORIGIN, capturedAt: new Date().toISOString(), pages: index },
      null,
      2,
    )}\n`,
  );
  const downloaded = new Set();
  while (true) {
    const pending = [...assetSet].filter((url) => !downloaded.has(url));
    if (!pending.length) break;
    await pooled(pending, 10, async (url) => {
      try {
        await downloadAsset(url, assetSet);
      } catch (error) {
        console.warn(`Skipped asset: ${error.message}`);
      } finally {
        downloaded.add(url);
      }
    });
    console.log(`Mirrored ${downloaded.size} assets`);
  }

  console.log(`Saved ${pages.length} routes to ${path.relative(ROOT, DATA_DIR)}`);
}

await main();
