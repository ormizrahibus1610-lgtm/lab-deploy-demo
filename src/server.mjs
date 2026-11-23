import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const HTML_PATH = path.resolve("public/index.html");
export function createApp(env = process.env) {
  return http.createServer((req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    if (url.pathname === "/api/health") {
      const paused = url.searchParams.get("db") === "paused";
      res.writeHead(paused ? 503 : 200, { "content-type": "application/json" });
      return res.end(JSON.stringify({
        status: paused ? "COLD_WAKE_REQUIRED" : "OK",
        env: env.APP_ENV || "preview", hostTarget: env.HOST_TARGET || "vercel-hobby",
        supabaseSlot: "1/2 (shippulse-dev)", coldWakeAware: true,
        retryHint: paused ? "DB waking after 7d idle pause; retry in 30s" : null,
      }));
    }
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(fs.readFileSync(HTML_PATH, "utf8"));
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || 3000);
  createApp().listen(port, "127.0.0.1", () => console.log(`listening :${port}`));
}
