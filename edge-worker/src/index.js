// Companion edge status worker (Cloudflare Free, 100k req/day)
export default {
  async fetch(request, env = {}) {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/edge-status" || pathname === "/") {
      const body = {
        ok: true,
        runtime: "cloudflare-workers",
        env: env.APP_ENV || "production",
        hostTarget: env.HOST_TARGET || "cloudflare-free",
        commercialFriendly: true,
        freeDailyLimit: Number(env.FREE_DAILY_LIMIT || 100000),
      };
      return Response.json(body, { status: 200 });
    }
    return Response.json({ ok: false, error: "not_found" }, { status: 404 });
  },
};
