import fs from "node:fs";
import assert from "node:assert/strict";
import { buildHealth } from "../api/health.mjs";

const vc = JSON.parse(fs.readFileSync("vercel.json", "utf8"));
const fn = vc.functions["api/*.mjs"];
assert.equal(vc.outputDirectory, "public");
assert.equal(fn.includeFiles, "config/stack-limits.json");

const wr = fs.readFileSync("edge-worker/wrangler.toml", "utf8");
assert.match(wr, /^name\s*=\s*"lab-deploy-edge"/m);
assert.match(wr, /^workers_dev\s*=\s*true/m);

const url = "https://ci.vercel.app/api/health";
const h = buildHealth(url, { APP_ENV: "preview" });
assert.equal(h.status, 200);
assert.equal(h.body.coldWakeAware, true);
console.log("DEPLOY_PREVIEW_CHECK_OK (vercel.json + wrangler.toml + health)");
