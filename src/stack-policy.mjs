import fs from "node:fs";
import path from "node:path";

const LIMITS_PATH = path.resolve("config/stack-limits.json");
export const loadLimits = () => JSON.parse(fs.readFileSync(LIMITS_PATH, "utf8"));

export function evaluateStack(profile, limits = loadLimits()) {
  const { commercial = false, reqPerDay = 2000, supabaseProjects = 1 } = profile;
  const warnings = [];
  const supa = limits.supabase_free;
  const maxP = supa.max_active_projects;
  if (supabaseProjects > maxP) {
    warnings.push(`SUPABASE_CAP: ${supabaseProjects}>${maxP} -> ${supa.shared_slot_1}`);
  }
  const cfCap = limits.cloudflare_free.workers_req_per_day;
  const cfOk = reqPerDay <= cfCap;
  if (!cfOk) warnings.push(`CF_DAILY_CAP: ${reqPerDay}>${cfCap} Worker req/day`);

  const vercelOk = !commercial;
  let recommendedHost = "vercel-hobby";
  let reason = "Non-commercial hobby app; instant PR previews included";
  if (commercial && cfOk) {
    recommendedHost = "cloudflare-free";
    reason = "Vercel Hobby is non-commercial; Cloudflare Free allows business";
  } else if (commercial && !cfOk) {
    recommendedHost = "upgrade-required";
    reason = "Commercial load exceeds 100k/day free Worker pool; upgrade tier";
  }
  return {
    recommendedHost,
    vercelStatus: vercelOk ? "OK" : "BLOCKED_NON_COMMERCIAL_TOS",
    cloudflareStatus: cfOk ? "OK" : "EXCEEDS_100K_REQ_DAY",
    supabaseSlotPolicy: `slot 1/${maxP} (${supa.shared_slot_1})`,
    coldWakeRule: `pauses after ${supa.inactivity_pause_days}d idle`,
    reason, warnings,
  };
}
