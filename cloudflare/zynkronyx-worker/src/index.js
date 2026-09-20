const VERSION = "0.3.6";
const PUBLIC_ORIGIN = "https://zynkronyx-control-center.pages.dev";
const PUBLIC_PATHS = new Set(["/", "/health", "/api/status", "/api/capabilities"]);
const GATEWAY_PREFIXES = ["/auth", "/sync", "/integration", "/audit", "/ai", "/sales", "/fiscal", "/admin", "/legal", "/metrics", "/ready"];

function corsHeaders(origin) {
  return {
    "access-control-allow-origin": origin === PUBLIC_ORIGIN ? origin : PUBLIC_ORIGIN,
    "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "access-control-allow-headers": "Authorization,Content-Type,x-api-key,x-device-id,x-device-credential,x-correlation-id",
    "access-control-expose-headers": "content-type,x-correlation-id",
    "access-control-max-age": "86400",
    "vary": "Origin",
  };
}

function json(data, status = 200, request) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=UTF-8",
      "cache-control": "no-store",
      ...corsHeaders(request.headers.get("Origin") || ""),
    },
  });
}

function now() {
  return new Date().toISOString();
}

function isGatewayPath(path) {
  return GATEWAY_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix + "/"));
}

function forwardedHeaders(request) {
  const headers = new Headers();
  for (const name of [
    "authorization",
    "content-type",
    "x-api-key",
    "x-device-id",
    "x-device-credential",
    "x-correlation-id",
  ]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  return headers;
}

async function proxy(request, env, path) {
  if (!env.BACKEND_URL) {
    return json({ ok: false, error: "BACKEND_NOT_CONFIGURED", version: VERSION }, 503, request);
  }

  const base = env.BACKEND_URL.replace(/\/+$/, "");
  const target = new URL(base + path + new URL(request.url).search);
  const init = {
    method: request.method,
    headers: forwardedHeaders(request),
    redirect: "manual",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
  }

  try {
    const upstream = await fetch(target, init);
    const headers = new Headers(upstream.headers);
    headers.set("cache-control", "no-store");

    for (const [key, value] of Object.entries(corsHeaders(request.headers.get("Origin") || ""))) {
      headers.set(key, value);
    }

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers,
    });
  } catch (error) {
    return json({
      ok: false,
      error: "BACKEND_UNREACHABLE",
      detail: error instanceof Error ? error.message : String(error),
      version: VERSION,
    }, 502, request);
  }
}

function publicResponse(request, path, env) {
  if (path === "/") {
    return new Response(HTML, {
      headers: {
        "content-type": "text/html; charset=UTF-8",
        "cache-control": "no-store",
        ...corsHeaders(request.headers.get("Origin") || ""),
      },
    });
  }

  if (path === "/health") {
    return json({
      ok: true,
      service: "zynkronyx-gateway",
      status: "healthy",
      version: VERSION,
      backend: env?.BACKEND_URL ? "configured" : "not-configured",
      timestamp: now(),
    }, 200, request);
  }

  if (path === "/api/status") {
    return json({
      ok: true,
      service: "zynkronyx-gateway",
      version: VERSION,
      runtime: "cloudflare-workers",
      backend: "configured",
      timestamp: now(),
    }, 200, request);
  }

  return json({
    ok: true,
    capabilities: [
      { name: "health", method: "GET", path: "/health", status: "active" },
      { name: "status", method: "GET", path: "/api/status", status: "active" },
      { name: "capabilities", method: "GET", path: "/api/capabilities", status: "active" },
      { name: "database", status: "backend", target: "configured transactional SGBD" },
      { name: "authentication", status: "backend" },
      { name: "device-events", method: "POST", path: "/integration/events", status: "backend" },
      { name: "audit", method: "GET", path: "/audit/events", status: "backend" },
      { name: "sync", status: "backend", target: "configured transactional SGBD" },
    ],
    timestamp: now(),
  }, 200, request);
}

const HTML = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Zynkronyx Control Center</title><style>:root{color-scheme:dark}body{margin:0;font-family:Inter,system-ui,sans-serif;background:#09090b;color:#f4f4f5}main{max-width:1050px;margin:auto;padding:48px 22px}.hero{padding:34px;border:1px solid #27272a;border-radius:20px;background:#111113}.badge{display:inline-block;padding:6px 10px;border:1px solid #3f3f46;border-radius:999px;font-size:12px;color:#a1a1aa}h1{font-size:42px;margin:18px 0 8px}p{color:#a1a1aa;line-height:1.6}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-top:22px}.card{padding:20px;border:1px solid #27272a;border-radius:16px;background:#111113}.card b{display:block;font-size:14px;margin-bottom:9px}.ok{color:#4ade80}.endpoint{font-family:monospace;color:#d4d4d8}</style></head><body><main><section class="hero"><span class="badge">CONTROL CENTER · LIVE</span><h1>Zynkronyx</h1><p>Gateway Cloudflare com encaminhamento seguro para a API backend.</p><div class="grid"><div class="card"><b>Status</b><span class="ok">● ONLINE</span></div><div class="card"><b>Version</b><span class="endpoint">${VERSION}</span></div><div class="card"><b>Runtime</b><span class="endpoint">Cloudflare Workers</span></div><div class="card"><b>Gateway</b><span class="endpoint">API proxy enabled</span></div></div></section></main></body></html>`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (PUBLIC_PATHS.has(path)) {
      return publicResponse(request, path, env);
    }

    if (isGatewayPath(path)) {
      return proxy(request, env, path);
    }

    return json({ ok: false, error: "NOT_FOUND", path, version: VERSION }, 404, request);
  },
};
