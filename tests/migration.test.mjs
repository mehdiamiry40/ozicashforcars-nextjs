import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("the migration preserves every sitemap route", async () => {
  const index = JSON.parse(await readFile(new URL("data/site-index.json", root), "utf8"));
  assert.equal(Object.keys(index.pages).length, 282);
  assert.ok(index.pages["/"]);
  assert.ok(index.pages["/contact-us/"]);
  assert.ok(index.pages["/blog/"]);
  assert.ok(Object.values(index.pages).every((page) => page.title && page.description));
});

test("mirrored brand assets are stored locally", async () => {
  await access(
    new URL(
      "public/wp-content/uploads/2019/07/cropped-favicon-32x32.png",
      root,
    ),
  );
  await access(
    new URL(
      "public/wp-content/uploads/2020/02/ozi-cash-for-car-buyer-banner-half2.jpg",
      root,
    ),
  );
});
