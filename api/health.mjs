// Vercel serverless health endpoint reusing src/stack-policy.mjs
import { evaluateStack, loadLimits } from "../src/stack-policy.mjs";
export function buildHealth(urlStr, env = process.env) {
  const paused = new URL(urlStr).searchParams.get("db") === "paused";
  const pol = evaluateStack({ commercial: false }, loadLimits());
  const ready = Boolean(env.NEXT_PUBLIC_SUPABASE_URL)
    && Boolean(env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const body = {
    ok: !paused, status: paused ? "COLD_WAKE_REQUIRED" : "OK",
    env: env.APP_ENV || env.VERCEL_ENV || "preview",
    hostTarget: env.HOST_TARGET || "vercel-hobby",
    supabaseReady: ready, recommendedHost: pol.recommendedHost,
    coldWakeAware: true,
  };
  return { status: paused ? 503 : 200, body };
}
export function GET(req) {
  const { status, body } = buildHealth(req.url, process.env);
  return Response.json(body, { status });
}
