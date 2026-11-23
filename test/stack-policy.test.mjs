import test from "node:test";
import assert from "node:assert/strict";
import { evaluateStack } from "../src/stack-policy.mjs";
import { createApp } from "../src/server.mjs";

test("non-commercial hobby profile selects vercel-hobby", () => {
  const r = evaluateStack({ commercial: false, reqPerDay: 1500, supabaseProjects: 1 });
  assert.equal(r.recommendedHost, "vercel-hobby");
  assert.equal(r.vercelStatus, "OK");
  assert.equal(r.warnings.length, 0);
});

test("commercial SaaS blocks vercel-hobby and routes to cloudflare-free", () => {
  const r = evaluateStack({ commercial: true, reqPerDay: 25000, supabaseProjects: 1 });
  assert.equal(r.recommendedHost, "cloudflare-free");
  assert.equal(r.vercelStatus, "BLOCKED_NON_COMMERCIAL_TOS");
  assert.equal(r.cloudflareStatus, "OK");
});

test("over 100k daily commercial requests flags cloudflare worker limit", () => {
  const r = evaluateStack({ commercial: true, reqPerDay: 120000, supabaseProjects: 1 });
  assert.equal(r.recommendedHost, "upgrade-required");
  assert.equal(r.cloudflareStatus, "EXCEEDS_100K_REQ_DAY");
});

test("exceeding 2 Supabase projects warns to reuse shippulse-dev", () => {
  const r = evaluateStack({ commercial: false, reqPerDay: 500, supabaseProjects: 3 });
  assert.match(r.warnings[0], /SUPABASE_CAP: 3>2/);
});

test("GET / serves starter HTML and /api/health returns 200 OK", async () => {
  const srv = createApp({ APP_ENV: "preview", HOST_TARGET: "vercel-hobby" });
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  const { port } = srv.address();
  try {
    const html = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(html.status, 200);
    assert.match(await html.text(), /lab-deploy starter/);
    const health = await fetch(`http://127.0.0.1:${port}/api/health`);
    assert.equal(health.status, 200);
    const body = await health.json();
    assert.equal(body.status, "OK");
    assert.equal(body.coldWakeAware, true);
  } finally { srv.close(); }
});

test("GET /api/health?db=paused returns graceful 503 COLD_WAKE_REQUIRED", async () => {
  const srv = createApp();
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  const { port } = srv.address();
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/health?db=paused`);
    assert.equal(res.status, 503);
    const body = await res.json();
    assert.equal(body.status, "COLD_WAKE_REQUIRED");
    assert.match(body.retryHint, /7d idle pause/);
  } finally { srv.close(); }
});
