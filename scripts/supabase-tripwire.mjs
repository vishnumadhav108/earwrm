#!/usr/bin/env node
/**
 * A stand-in "Supabase" for the preview-guard e2e test. The guard build points
 * NEXT_PUBLIC_SUPABASE_URL here; any request it receives, from the browser or the Next.js
 * server, means the guard leaked. It answers every request with 418 and records it.
 *
 *   GET /__tripwire/requests  → { count, requests: [{ method, path, from }] }  (not recorded)
 */
import http from "node:http";

const PORT = Number(process.env.TRIPWIRE_PORT ?? 3198);
const requests = [];

http
  .createServer((req, res) => {
    if (req.url === "/__tripwire/requests") {
      res.writeHead(200, { "content-type": "application/json", "access-control-allow-origin": "*" });
      res.end(JSON.stringify({ count: requests.length, requests }));
      return;
    }
    requests.push({ method: req.method, path: (req.url ?? "").split("?")[0], from: req.headers["user-agent"] ?? "" });
    res.writeHead(418, { "content-type": "text/plain", "access-control-allow-origin": "*" });
    res.end("preview-guard tripwire: Supabase must not be contacted");
  })
  .listen(PORT, "127.0.0.1", () => console.log(`[tripwire] listening on 127.0.0.1:${PORT}`));
