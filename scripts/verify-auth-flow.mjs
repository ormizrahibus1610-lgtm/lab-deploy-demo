import fs from "node:fs";
import { createRuntimeClient, signUpOrSignIn } from "../src/lib/auth.mjs";

const email = process.env.DEMO_TEST_EMAIL || "demo.builder@example.com";
const password = process.env.DEMO_TEST_PASSWORD;
if (!password) {
  console.error("Set DEMO_TEST_PASSWORD in gitignored .env first.");
  process.exit(1);
}
const client = createRuntimeClient(process.env);
const first = await signUpOrSignIn(client, email, password);
await client.auth.signOut();
const second = await client.auth.signInWithPassword({ email, password });
if (second.error || !second.data.session) {
  throw second.error || new Error("Sign-in verification failed");
}
const uid = second.data.user.id;
const title = "Terminal migration workflow";
const { data: existing } = await client.from("feedback_items")
  .select("id, title, votes").eq("user_id", uid).eq("title", title).limit(1);
let row = existing && existing[0];
if (!row) {
  const ins = await client.from("feedback_items")
    .insert({ user_id: uid, title, votes: 1 })
    .select("id, title, votes").single();
  if (ins.error) throw ins.error;
  row = ins.data;
}
const masked = `auth_flow  : ${first.mode}+signIn jwt=true · user=${uid.slice(0, 8)}... · votes=${row.votes}`;
fs.writeFileSync("/tmp/supa-auth-summary.txt", masked + "\n");
console.log(`auth_first  : mode=${first.mode} email=${email}`);
console.log(`auth_signin : jwt_issued=true user_id=${uid.slice(0, 8)}...`);
console.log(`typed_row   : id=${row.id.slice(0, 8)}... title="${row.title}" votes=${row.votes}`);
console.log("auth_roundtrip: PASS (zero raw tokens or passwords printed)");
