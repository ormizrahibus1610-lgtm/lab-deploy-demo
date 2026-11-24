import { createClient } from "@supabase/supabase-js";

export function createRuntimeClient(env = process.env) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase public env vars");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function signUpOrSignIn(client, email, password) {
  const up = await client.auth.signUp({ email, password });
  if (!up.error && up.data.session) {
    return { mode: "signUp", user: up.data.user, session: up.data.session };
  }
  const inn = await client.auth.signInWithPassword({ email, password });
  if (inn.error || !inn.data.session) throw inn.error || new Error("No session");
  return { mode: "signIn", user: inn.data.user, session: inn.data.session };
}
