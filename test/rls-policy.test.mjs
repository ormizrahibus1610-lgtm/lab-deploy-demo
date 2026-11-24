import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { evaluateIsolation } from "../scripts/rls-audit.mjs";
import { isBadEnv, scanText, scanRepo } from "../scripts/secret-scan.mjs";

test("RLS migration enables row level security with initPlan auth.uid()", () => {
  const dir = path.resolve("supabase/migrations");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith("_enable_feedback_rls.sql"));
  assert.equal(files.length >= 1, true);
  const sql = fs.readFileSync(path.join(dir, files[files.length - 1]), "utf8");
  assert.match(sql, /alter table public\.feedback_items enable row level security/i);
  for (const op of ["select", "insert", "update", "delete"]) {
    assert.match(sql, new RegExp(`for ${op} to authenticated`, "i"));
  }
  const initMatches = sql.match(/\(select auth\.uid\(\)\) = user_id/gi) || [];
  assert.equal(initMatches.length, 5);
});

test("evaluateIsolation flags cross-user or anon leaks and passes strict isolation", () => {
  const leak = evaluateIsolation({
    aliceOwn: 1, anonSees: 1, bobSees: 1, bobUpd: 1, bobDel: 1,
  });
  assert.equal(leak.ok, false);
  assert.equal(leak.verdict, "CROSS_USER_LEAK_DETECTED");

  const safe = evaluateIsolation({
    aliceOwn: 1, anonSees: 0, bobSees: 0, bobUpd: 0, bobDel: 0,
  });
  assert.equal(safe.ok, true);
  assert.equal(safe.verdict, "CROSS_USER_ISOLATION_PASS");
});

test("scanText detects privileged key, PAT, JWT, and postgres URI leaks", () => {
  const fakeSbp = "sbp_" + "a1b2c3d4e5f6g7h8i9j0";
  const fakeGhp = "ghp_" + "A1B2C3D4E5F6G7H8I9J0";
  const fakeJwt = "eyJ" + "hbGciOiJIUzI1NiJ9" + "." + "eyJyb2xlIjoiYW5vbiJ9";
  const fakePg = "postgres://" + "user:password" + "@db.example.com:5432/postgres";
  const fakeRole = "service_role" + "=placeholder_12345678";
  assert.deepEqual(scanText("a.ts", fakeSbp), ["a.ts:pat_token"]);
  assert.deepEqual(scanText("b.ts", fakeGhp), ["b.ts:pat_token"]);
  assert.deepEqual(scanText("c.ts", fakeJwt), ["c.ts:jwt_token"]);
  assert.deepEqual(scanText("d.ts", fakePg), ["d.ts:postgres_uri"]);
  assert.deepEqual(scanText("e.ts", fakeRole), ["e.ts:service_role"]);
  assert.deepEqual(scanText("ok.ts", "const k = process.env.ANON_KEY;"), []);
});

test("isBadEnv blocks real .env files while allowing .env.example", () => {
  assert.equal(isBadEnv(".env"), true);
  assert.equal(isBadEnv(".env.local"), true);
  assert.equal(isBadEnv("apps/web/.env.production"), true);
  assert.equal(isBadEnv(".env.example"), false);
});

test("scanRepo passes cleanly on tracked repo with gitignored .env", () => {
  assert.deepEqual(scanRepo(process.cwd()), []);
});
