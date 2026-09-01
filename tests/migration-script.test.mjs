import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("the quote migration refuses a mismatched Neon project", () => {
  const result = spawnSync(process.execPath, ["scripts/migrate-quotes.mjs"], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      DATABASE_URL: "postgresql://unused.example/test",
      DATABASE_URL_UNPOOLED: "",
      NEON_PROJECT_ID: "actual-project",
      MIGRATION_EXPECTED_NEON_PROJECT_ID: "expected-project",
    },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /NEON_PROJECT_ID does not match/);
});

test("the quote migration requires an expected Neon project", () => {
  const result = spawnSync(process.execPath, ["scripts/migrate-quotes.mjs"], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      DATABASE_URL: "postgresql://unused.example/test",
      DATABASE_URL_UNPOOLED: "",
      NEON_PROJECT_ID: "actual-project",
      MIGRATION_EXPECTED_NEON_PROJECT_ID: "",
    },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /MIGRATION_EXPECTED_NEON_PROJECT_ID is required/);
});
