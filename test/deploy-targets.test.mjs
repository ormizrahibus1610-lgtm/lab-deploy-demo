import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildHealth, GET } from "../api/health.mjs";
import worker from "../edge-worker/src/index.js";

test("vercel.json sets public outputDirectory and bundles stack-limits.json", () => {
  const cfg = JSON.parse(fs.readFileSync(path.resolve("vercel.json"), "utf8"));
  assert.equal(cfg.outputDirectory, "public");
  assert.equal(cfg.functions["api/*.mjs"].includeFiles, "config/stack-limits.json");
});

test("api/health.mjs reflects preview vs production APP_ENV scoping", () => {
  const prev = buildHealth("https://prev.vercel.app/api/health", {
    APP_ENV: "preview", NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-anon-placeholder",
  });
  assert.equal(prev.status, 200);
  assert.equal(prev.body.env, "preview");
  assert.equal(prev.body.supabaseReady, true);
  assert.equal(prev.body.coldWakeAware, true);

  const prod = buildHealth("https://prod.vercel.app/api/health", {
    APP_ENV: "production",
  });
  assert.equal(prod.status, 200);
  assert.equal(prod.body.env, "production");
  assert.equal(prod.body.supabaseReady, false);
});

test("api/health.mjs GET returns 503 COLD_WAKE_REQUIRED for db=paused", async () => {
  const res = GET(new Request("https://prev.vercel.app/api/health?db=paused"));
  assert.equal(res.status, 503);
  const body = await res.json();
  assert.equal(body.ok, false);
  assert.equal(body.status, "COLD_WAKE_REQUIRED");
});

test("edge-worker/wrangler.toml pins compatibility_date and workers_dev", () => {
  const toml = fs.readFileSync(path.resolve("edge-worker/wrangler.toml"), "utf8");
  assert.match(toml, /^name\s*=\s*"lab-deploy-edge"/m);
  assert.match(toml, /^compatibility_date\s*=\s*"2026-11-22"/m);
  assert.match(toml, /^workers_dev\s*=\s*true/m);
});

test("edge-worker/src/index.js serves 200 /api/edge-status and 404 fallback", async () => {
  const ok = await worker.fetch(new Request("https://e.workers.dev/api/edge-status"));
  assert.equal(ok.status, 200);
  const body = await ok.json();
  assert.equal(body.ok, true);
  assert.equal(body.runtime, "cloudflare-workers");
  assert.equal(body.commercialFriendly, true);
  assert.equal(body.freeDailyLimit, 100000);

  const miss = await worker.fetch(new Request("https://e.workers.dev/missing"));
  assert.equal(miss.status, 404);
  assert.equal((await miss.json()).error, "not_found");
});

test(".gitignore excludes .vercel/ and edge-worker/.wrangler/ caches", () => {
  const gi = fs.readFileSync(path.resolve(".gitignore"), "utf8");
  assert.match(gi, /^\.vercel\/$/m);
  assert.match(gi, /^edge-worker\/\.wrangler\/$/m);
});
