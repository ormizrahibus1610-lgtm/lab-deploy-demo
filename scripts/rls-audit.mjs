import fs from "node:fs";
import { createRuntimeClient, signUpOrSignIn } from "../src/lib/auth.mjs";

export function evaluateIsolation(m) {
  const leaks = m.anonSees + m.bobSees + m.bobUpd + m.bobDel;
  const ok = m.aliceOwn === 1 && leaks === 0;
  const verdict = ok ? "CROSS_USER_ISOLATION_PASS" : "CROSS_USER_LEAK_DETECTED";
  return { ok, verdict };
}

export async function runLiveAudit(env = process.env) {
  const pass = env.RLS_TEST_PASSWORD || env.DEMO_TEST_PASSWORD;
  if (!pass) throw new Error("Set DEMO_TEST_PASSWORD in gitignored .env first.");
  const [anon, alice, bob] = [1, 2, 3].map(() => createRuntimeClient(env));
  const aEmail = env.RLS_ALICE_EMAIL || "alice@example.com";
  const bEmail = env.RLS_BOB_EMAIL || "bob@example.com";
  const aAuth = await signUpOrSignIn(alice, aEmail, pass);
  await signUpOrSignIn(bob, bEmail, pass);
  const ins = await alice.from("feedback_items")
    .insert({ user_id: aAuth.user.id, title: "Alice private note", votes: 1 })
    .select("id").single();
  if (ins.error) throw ins.error;
  const id = ins.data.id;
  const aRead = await alice.from("feedback_items").select("id").eq("id", id);
  const nRead = await anon.from("feedback_items").select("id").eq("id", id);
  const bRead = await bob.from("feedback_items").select("id").eq("id", id);
  const bUpd = await bob.from("feedback_items").update({ votes: 999 })
    .eq("id", id).select("id");
  const bDel = await bob.from("feedback_items").delete().eq("id", id).select("id");
  const m = {
    aliceOwn: (aRead.data || []).length, anonSees: (nRead.data || []).length,
    bobSees: (bRead.data || []).length, bobUpd: (bUpd.data || []).length,
    bobDel: (bDel.data || []).length,
  };
  if (m.bobDel === 0) await alice.from("feedback_items").delete().eq("id", id);
  return { ...m, ...evaluateIsolation(m) };
}

if (process.argv[1]?.endsWith("rls-audit.mjs")) {
  const r = await runLiveAudit(process.env);
  const row = `rls_audit  : alice_own=${r.aliceOwn} anon=${r.anonSees} `
    + `bob_read=${r.bobSees} bob_upd=${r.bobUpd} bob_del=${r.bobDel}`;
  fs.writeFileSync("/tmp/rls-audit-summary.txt", `${row}\nverdict    : ${r.verdict}\n`);
  console.log("audit_pair : alice@example.com vs bob@example.com (public anon key)");
  console.log(row);
  console.log(`verdict    : ${r.verdict}`);
  process.exit(r.ok ? 0 : 1);
}
