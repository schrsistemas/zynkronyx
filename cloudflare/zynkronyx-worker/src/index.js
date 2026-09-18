const VERSION = "0.3.0";
const PUBLIC_ORIGIN = "https://zynkronyx-control-center.pages.dev";

const SECURITY_HEADERS = {
  "content-type": "text/html; charset=UTF-8",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "no-referrer",
  "cache-control": "no-store",
};

function corsHeaders(request) {
  const origin = request.headers.get("Origin");
  const allowed = !origin || origin === PUBLIC_ORIGIN || origin.endsWith(".pages.dev");
  return {
    "access-control-allow-origin": allowed ? (origin || "*") : PUBLIC_ORIGIN,
    "access-control-allow-methods": "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS",
    "access-control-allow-headers": "Authorization,Content-Type,x-api-key,x-device-id,x-device-credential,x-correlation-id",
    "access-control-expose-headers": "content-type,x-request-id",
    "cache-control": "no-store",
    "vary": "Origin",
  };
}

function json(data, status = 200, request = null) {
  const headers = {
    "content-type": "application/json; charset=UTF-8",
    ...(request ? corsHeaders(request) : {}),
  };
  return new Response(JSON.stringify(data, null, 2), { status, headers });
}

function html() {
  return new Response(HTML, { headers: SECURITY_HEADERS });
}

function now() {
  return new Date().toISOString();
}

function backendUrl(env) {
  return String(env.BACKEND_URL || "").trim().replace(/\/+$/, "");
}

async function proxy(request, env, path) {
  const base = backendUrl(env);
  if (!base) {
    return json({
      ok: false,
      error: "BACKEND_NOT_CONFIGURED",
      message: "Cloudflare Worker está ativo, mas BACKEND_URL não foi configurado.",
      path,
    }, 503, request);
  }

  const target = new URL(path + new URL(request.url).search, base + "/");
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("cf-connecting-ip");
  headers.set("x-zynkronyx-gateway", "cloudflare-worker");
  headers.set("x-zynkronyx-gateway-version", VERSION);

  try {
    const response = await fetch(target.toString(), {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
      redirect: "manual",
    });

    const out = new Headers(response.headers);
    const cors = corsHeaders(request);
    for (const [key, value] of Object.entries(cors)) out.set(key, value);
    out.delete("content-length");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: out,
    });
  } catch (error) {
    return json({
      ok: false,
      error: "BACKEND_UNREACHABLE",
      message: "Não foi possível alcançar o backend configurado.",
      detail: error instanceof Error ? error.message : String(error),
      path,
    }, 502, request);
  }
}

const HTML = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Zynkronyx Control Center</title>
<style>
:root{color-scheme:dark}*{box-sizing:border-box}
body{margin:0;font-family:Inter,system-ui,-apple-system,Segoe UI,sans-serif;background:#09090b;color:#f4f4f5}
main{max-width:1050px;margin:auto;padding:48px 22px}.hero{padding:34px;border:1px solid #27272a;border-radius:20px;background:linear-gradient(145deg,#18181b,#0f0f12)}
.badge{display:inline-block;padding:6px 10px;border:1px solid #3f3f46;border-radius:999px;font-size:12px;color:#a1a1aa}
h1{font-size:42px;margin:18px 0 8px}p{color:#a1a1aa;line-height:1.6}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-top:22px}
.card{padding:20px;border:1px solid #27272a;border-radius:16px;background:#111113}.card b{display:block;font-size:14px;margin-bottom:9px}
.ok{color:#4ade80}.endpoint{font-family:ui-monospace,monospace;color:#d4d4d8}footer{margin-top:28px;color:#71717a;font-size:13px}
</style>
</head>
<body><main><section class="hero"><span class="badge">CONTROL CENTER · GATEWAY LIVE</span>
<h1>Zynkronyx</h1><p>Gateway público do Control Center, com proxy para o backend operacional.</p>
<div class="grid"><div class="card"><b>Gateway</b><span class="ok">● ONLINE</span></div>
<div class="card"><b>Version</b><span class="endpoint">${VERSION}</span></div>
<div class="card"><b>Runtime</b><span class="endpoint">Cloudflare Workers</span></div>
<div class="card"><b>API</b><span class="endpoint">/api/status</span></div></div></section>
<section class="grid"><div class="card"><b>Health</b><span class="endpoint">GET /health</span><p>Saúde do gateway.</p></div>
<div class="card"><b>Backend proxy</b><span class="endpoint">/auth · /sync · /integration · /audit · /admin</span><p>Rotas encaminhadas ao Node/Express.</p></div>
<div class="card"><b>CORS</b><span class="endpoint">Control Center Pages</span><p>Preflight OPTIONS e headers de integração habilitados.</p></div></section>
<footer>Zynkronyx Gateway · ${VERSION}</footer></main></body></html>`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    if (path === "/health" && (request.method === "GET" || request.method === "HEAD")) {
      return json({
        ok: true, service: "zynkronyx-gateway", status: "healthy",
        version: VERSION, backend_configured: Boolean(backendUrl(env)), timestamp: now(),
      }, 200, request);
    }

    if (path === "/api/status" && (request.method === "GET" || request.method === "HEAD")) {
      return json({
        ok: true, service: "zynkronyx-gateway", version: VERSION,
        runtime: "cloudflare-workers", environment: "public",
        backend_configured: Boolean(backendUrl(env)), timestamp: now(),
      }, 200, request);
    }

    if (path === "/api/capabilities" && (request.method === "GET" || request.method === "HEAD")) {
      return json({
        ok: true,
        capabilities: [
          { name: "health", method: "GET", path: "/health", status: "active" },
          { name: "status", method: "GET", path: "/api/status", status: "active" },
          { name: "capabilities", method: "GET", path: "/api/capabilities", status: "active" },
          { name: "database", status: "active", target: "Firebird" },
          { name: "sync-in", method: "POST", path: "/sync/in", status: "proxied", target: "Node/Firebird" },
          { name: "sync-out", method: "GET", path: "/sync/out", status: "proxied", target: "Node/Firebird" },
          { name: "authentication", status: "proxied", target: "Node/Express" },
          { name: "device-events", method: "POST", path: "/integration/events", status: "proxied", target: "Node/Express" },
          { name: "device-registry", status: "proxied", target: "Node/Express" },
          { name: "audit", status: "proxied", target: "Node/Express" },
        ],
        timestamp: now(),
      }, 200, request);
    }

    if (path === "/" && (request.method === "GET" || request.method === "HEAD")) return html();

    if (path.startsWith("/auth") || path.startsWith("/sync") || path.startsWith("/integration") ||
        path.startsWith("/audit") || path.startsWith("/admin") || path === "/metrics") {
      return proxy(request, env, path);
    }

    return json({
      ok: false, error: "NOT_FOUND", path,
      available: ["/", "/health", "/api/status", "/api/capabilities", "/auth/*", "/sync/*", "/integration/*", "/audit/*", "/admin/*"],
    }, 404, request);
  },
};
