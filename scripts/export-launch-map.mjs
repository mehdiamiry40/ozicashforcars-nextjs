import { readFile, writeFile } from "node:fs/promises";
import { classifyPaths } from "../lib/region-rules.mjs";

const root = new URL("../", import.meta.url);
const index = JSON.parse(await readFile(new URL("data/site-index.json", root), "utf8"));
const { redirects, content } = classifyPaths(Object.keys(index.pages));
const lines = ["old_url,candidate_status,candidate_indexability,candidate_canonical,current_action,search_clicks,search_impressions,organic_leads,approved_decision,decision_owner"];
let excluded = 0;
const rows = [];
for (const path of [...content].sort()) {
  const name = path === "/" ? "index" : path.slice(1, -1);
  const html = await readFile(new URL(`.next/server/app/${name}.html`, root), "utf8");
  const noindex = /<meta name="robots" content="[^"]*noindex/.test(html);
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  if (!canonical) throw new Error(`Missing rendered canonical: ${path}`);
  const oldUrl = `https://www.ozicashforcars.com.au${path}`;
  if (noindex) excluded += 1;
  const action = noindex ? "Keep noindex until the owner supplies the missing material" : "Retain authored indexable page";
  rows.push([oldUrl, "200", noindex ? "noindex" : "indexable", canonical, action]);
}
for (const [path, hub] of [...redirects].sort(([left], [right]) => left.localeCompare(right))) {
  excluded += 1;
  rows.push([
    `https://www.ozicashforcars.com.au${path}`,
    "301",
    "redirect",
    `https://www.ozicashforcars.com.au${hub}`,
    "Permanent redirect to the regional page",
  ]);
}
rows.sort((left, right) => left[0].localeCompare(right[0]));
for (const row of rows) {
  lines.push([...row, "", "", "", "", ""].map((value) => `"${value.replaceAll('"', '""')}"`).join(","));
}
await writeFile(new URL("docs/launch-url-map.csv", root), `${lines.join("\n")}\n`);
console.log(`Exported ${lines.length - 1} known routes (${excluded} excluded or redirected) from the current build; business evidence columns remain blank.`);
