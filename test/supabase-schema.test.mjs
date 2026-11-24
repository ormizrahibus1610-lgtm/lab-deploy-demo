import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRuntimeClient, signUpOrSignIn } from "../src/lib/auth.mjs";

test("versioned migration defines public.feedback_items with auth.users FK", () => {
  const dir = path.resolve("supabase/migrations");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith("_create_feedback_items.sql"));
  assert.equal(files.length >= 1, true);
  const sql = fs.readFileSync(path.join(dir, files[files.length - 1]), "utf8");
  assert.match(sql, /create table if not exists public\.feedback_items/i);
  assert.match(sql, /references auth\.users\(id\)/i);
  assert.match(sql, /votes integer not null default 0/i);
});

test("generated database.types.ts exports feedback_items Row and Insert", () => {
  const live = path.resolve("src/lib/database.types.ts");
  const fallback = path.resolve("src/lib/database.types.example.ts");
  const dts = fs.readFileSync(fs.existsSync(live) ? live : fallback, "utf8");
  assert.match(dts, /"?feedback_items"?:\s*\{/);
  assert.match(dts, /"?votes"?:\s*number/);
  assert.match(dts, /"?user_id"?:\s*string/);
});

test("createRuntimeClient rejects missing public Supabase env vars", () => {
  assert.throws(() => createRuntimeClient({}), /Missing Supabase public env vars/);
});

test("signUpOrSignIn uses signUp when session returned and falls back to signIn", async () => {
  const fakeUser = { id: "11111111-2222-3333-4444-555555555555" };
  const fakeSession = { access_token: "redacted-jwt" };
  const freshClient = {
    auth: {
      signUp: async () => ({ data: { user: fakeUser, session: fakeSession }, error: null }),
      signInWithPassword: async () => { throw new Error("should not call"); },
    },
  };
  const r1 = await signUpOrSignIn(freshClient, "a@example.com", "pw");
  assert.equal(r1.mode, "signUp");

  const existingClient = {
    auth: {
      signUp: async () => ({ data: { user: null, session: null }, error: new Error("exists") }),
      signInWithPassword: async () => ({ data: { user: fakeUser, session: fakeSession }, error: null }),
    },
  };
  const r2 = await signUpOrSignIn(existingClient, "a@example.com", "pw");
  assert.equal(r2.mode, "signIn");
  assert.equal(r2.user.id, fakeUser.id);
});
