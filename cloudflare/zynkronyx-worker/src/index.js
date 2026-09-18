const VERSION = "0.3.0";

const SECURITY_HEADERS = {
  "content-type": "text/html; charset=UTF-8",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "no-referrer",
  "cache-control": "no-store",
};

const JSON_HEADERS = {
  "content-type": "application/json; charset=UTF-8",
  "access-control-allow-origin": "*",
  "cache-control": "no-store",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: JSON_HEADERS,
  });
}

function corsHeaders(request) {\n  const origin = request.headers.get("Origin");\n  return { "access-control-allow-origin": origin || "*", "access-control-allow-headers": "Authorization, Content-Type, x-api-key, x-device-id, x-device-credential, x-correlation-id", "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS", "access-control-max-age": "86400" };\n}\n\nfunction html() {
  return new Response(HTML, { headers: SECURITY_HEADERS });
}

function now() {
  return new Date().toISOString();
}

const HTML = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Zynkronyx Control Center</title>
<style>
:root{color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;font-family:Inter,system-ui,-apple-system,Segoe UI,sans-serif;background:#09090b;color:#f4f4f5}
main{max-width:1050px;margin:auto;padding:48px 22px}
.hero{padding:34px;border:1px solid #27272a;border-radius:20px;background:linear-gradient(145deg,#18181b,#0f0f12)}
.badge{display:inline-block;padding:6px 10px;border:1px solid #3f3f46;border-radius:999px;font-size:12px;color:#a1a1aa}
h1{font-size:42px;margin:18px 0 8px}
p{color:#a1a1aa;line-height:1.6}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-top:22px}
.card{padding:20px;border:1px solid #27272a;border-radius:16px;background:#111113}
.card b{display:block;font-size:14px;margin-bottom:9px}
.ok{color:#4ade80}
.endpoint{font-family:ui-monospace,monospace;color:#d4d4d8}
footer{margin-top:28px;color:#71717a;font-size:13px}
a{color:#e4e4e7}
</style>
</head>
<body>
<main>
<section class="hero">
<span class="badge">CONTROL CENTER · LIVE</span>
<h1>Zynkronyx</h1>
<p>Control Center público do projeto, servido diretamente pelo Cloudflare Worker.</p>
<div class="grid">
<div class="card"><b>Status</b><span class="ok">● ONLINE</span></div>
<div class="card"><b>Version</b><span class="endpoint">${VERSION}</span></div>
<div class="card"><b>Runtime</b><span class="endpoint">Cloudflare Workers</span></div>
<div class="card"><b>Updated</b><span class="endpoint" id="time">...</span></div>
</div>
</section>
<section class="grid">
<div class="card"><b>Health</b><span class="endpoint">GET /health</span><p>Verificação simples para monitoramento.</p></div>
<div class="card"><b>Status</b><span class="endpoint">GET /api/status</span><p>Estado e versão da API.</p></div>
<div class="card"><b>Capabilities</b><span class="endpoint">GET /api/capabilities</span><p>Mapa das capacidades públicas atuais.</p></div>
</section>
<footer>Base pública do Zynkronyx · ${VERSION}</footer>
</main>
<script>document.getElementById("time").textContent=new Date().toISOString()</script>
</body>
</html>`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (request.method !== "GET" && request.method !== "HEAD") {
      return json({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405);
    }

    if (path === "/health") {
      return json({
        ok: true,
        service: "zynkronyx-api",
        status: "healthy",
        version: VERSION,
        timestamp: now(),
      });
    }

    if (path === "/api/status") {
      return json({
        ok: true,
        service: "zynkronyx-api",
        version: VERSION,
        runtime: "cloudflare-workers",
        environment: "public",
        timestamp: now(),
      });
    }

    if (path === "/api/capabilities") {
      return json({
        ok: true,
        capabilities: [
          { name: "health", method: "GET", path: "/health", status: "active" },
          { name: "status", method: "GET", path: "/api/status", status: "active" },
          { name: "capabilities", method: "GET", path: "/api/capabilities", status: "active" },
          { name: "database", status: "active", target: "Firebird" },
          { name: "sync-in", method: "POST", path: "/sync/in", status: "backend-ready", target: "Firebird" },
          { name: "sync-out", method: "GET", path: "/sync/out", status: "backend-ready", target: "Firebird" },
          { name: "authentication", status: "backend" },
        ],
        timestamp: now(),
      });
    }

    if (path === "/") {
      return html();
    }

    return json({
      ok: false,
      error: "NOT_FOUND",
      path,
      available: ["/", "/health", "/api/status", "/api/capabilities"],
    }, 404);
  },
};
