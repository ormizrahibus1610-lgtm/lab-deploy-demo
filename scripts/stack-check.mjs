import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const num = (f, d) => {
  const i = args.indexOf(f);
  return i >= 0 && args[i + 1] ? Number(args[i + 1]) : d;
};
function probeCli(cmd) {
  try {
    const out = execFileSync(cmd, ["--version"], {
      encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
    });
    return out.trim().split("\n")[0].slice(0, 46);
  } catch {
    return "not_installed_yet (cloud CLI setup)";
  }
}
if (has("--cli")) {
  console.log("--- local & cloud CLI readiness (zero secrets printed) ---");
  for (const [cmd, label] of [
    ["git", "git       "], ["node", "node      "], ["gh", "gh        "],
    ["agy", "agy       "], ["supabase", "supabase  "],
    ["vercel", "vercel    "], ["wrangler", "wrangler  "],
  ]) console.log(`${label}: ${probeCli(cmd)}`);
  process.exit(0);
}
const { evaluateStack, loadLimits } = await import("../src/stack-policy.mjs");
const profile = {
  commercial: has("--commercial"),
  reqPerDay: num("--requests-per-day", 2000),
  supabaseProjects: num("--supabase-projects", 1),
};
const r = evaluateStack(profile, loadLimits());
console.log(
  `PROFILE          : commercial=${profile.commercial}`
  + ` req/day=${profile.reqPerDay} supa_proj=${profile.supabaseProjects}`
);
console.log(`RECOMMENDED_HOST : ${r.recommendedHost}`);
console.log(`VERCEL_HOBBY     : ${r.vercelStatus}`);
console.log(`CLOUDFLARE_FREE  : ${r.cloudflareStatus}`);
console.log(`SUPABASE_POLICY  : ${r.supabaseSlotPolicy} · ${r.coldWakeRule}`);
console.log(`REASON           : ${r.reason}`);
if (r.warnings.length) console.log(`WARNINGS         : ${r.warnings.join(" | ")}`);
