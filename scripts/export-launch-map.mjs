import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const index = JSON.parse(await readFile(new URL("data/site-index.json", root), "utf8"));
const lines = ["old_url,candidate_status,candidate_indexability,candidate_canonical,current_action,search_clicks,search_impressions,organic_leads,approved_decision,decision_owner"];
let excluded = 0;
for (const path of Object.keys(index.pages).sort()) {
  const name = path === "/" ? "index" : path.slice(1, -1);
  const html = await readFile(new URL(`.next/server/app/${name}.html`, root), "utf8");
  const noindex = /<meta name="robots" content="[^"]*noindex/.test(html);
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  if (!canonical) throw new Error(`Missing rendered canonical: ${path}`);
  const oldUrl = `https://www.ozicashforcars.com.au${path}`;
  if (noindex) excluded += 1;
  const action = noindex && canonical !== oldUrl
    ? "Existing suburb exclusion; review Search Console evidence before changing"
    : noindex ? "Keep utility/confirmation exclusion" : "Retain authored indexable page";
  lines.push([oldUrl, "200", noindex ? "noindex" : "indexable", canonical, action, "", "", "", "", ""]
    .map(value => `"${value.replaceAll('"', '""')}"`).join(","));
}
await writeFile(new URL("docs/launch-url-map.csv", root), lines.join("\n") + "\n");
console.log(`Exported ${lines.length - 1} known routes (${excluded} excluded) from the current build; business evidence columns remain blank.`);
