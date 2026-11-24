import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildHealth } from "../api/health.mjs";

const ciYml = fs.readFileSync(
  path.resolve(".github/workflows/ci.yml"), "utf8"
);

test("ci.yml enforces contents:read and concurrency cancel", () => {
  assert.match(ciYml, /contents:\s*read/);
  assert.match(ciYml, /cancel-in-progress:\s*true/);
  assert.match(ciYml, /actions\/checkout@v7/);
  assert.match(ciYml, /actions\/setup-node@v7/);
});

test("ci.yml verify runs typecheck, security, test, deploy", () => {
  const steps = [
    "npm ci", "npm run typecheck", "npm run security:check",
    "npm test", "npm run deploy:check",
  ];
  for (const s of steps) assert.ok(ciYml.includes(s), `missing: ${s}`);
});

test("ci.yml gates deploy strictly to push on main after verify", () => {
  assert.match(ciYml, /needs:\s*verify/);
  assert.match(ciYml, /github\.event_name == 'push'/);
  assert.match(ciYml, /github\.ref == 'refs\/heads\/main'/);
  assert.match(ciYml, /vars\.ENABLE_AUTO_DEPLOY == 'true'/);
});
