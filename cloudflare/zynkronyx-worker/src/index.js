const VERSION = "0.3.0";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS",
  "access-control-allow-headers": "Authorization,Content-Type,x-api-key,x-device-id,x-device-credential,x-correlation-id",
  "access-control-max-age": "86400",
};

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=UTF-8", "cache-control": "no-store", ...CORS, ...extra },
  });
}

function now() { return new Date().toISOString(); }

function backendUrl(env) {
  const raw = env.BACKEND_URL || "";
  return raw.replace(/\/+$/, "");
}

async function proxy(request, env) {
  const base = backendUrl(env);
  if (!base) return json({ ok:false, error:"BACKEND_NOT_CONFIGURED", message:"BACKEND_URL não está configurado no Worker." }, 503);
  const incoming = new URL(request.url);
  const target = new URL(base + incoming.pathname + incoming.search);
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("content-length");
  headers.set("x-forwarded-host", incoming.host);
  headers.set("x-forwarded-proto", incoming.protocol.replace(":", ""));
  const init = { method: request.method, headers, redirect:"manual" };
  if (request.method !== "GET" && request.method !== "HEAD") init.body = request.body;
  try {
    const upstream = await fetch(target.toString(), init);
    const out = new Headers(upstream.headers);
    Object.entries(CORS).forEach(([k,v]) => out.set(k,v));
    out.set("cache-control","no-store");
    return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: out });
  } catch (error) {
    return json({ ok:false, error:"BACKEND_UNREACHABLE", message:"Backend indisponível.", detail:String(error?.message || error) }, 502);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    if (request.method === "OPTIONS") return new Response(null, { status:204, headers:CORS });

    if (path === "/health") {
      const base = backendUrl(env);
      let backend = "not-configured";
      if (base) {
        try {
          const r = await fetch(base + "/health", { method:"GET", headers:{accept:"application/json"} });
          backend = r.ok ? "healthy" : "unhealthy";
        } catch (_) { backend = "unreachable"; }
      }
      return json({ ok:true, service:"zynkronyx-gateway", status:"healthy", backend, version:VERSION, timestamp:now() });
    }

    if (path === "/api/status") {
      return json({ ok:true, service:"zynkronyx-gateway", version:VERSION, runtime:"cloudflare-workers", environment:"public", backend:backendUrl(env) ? "configured" : "not-configured", timestamp:now() });
    }

    if (path === "/api/capabilities") {
      return json({ ok:true, capabilities:[
        {name:"health",method:"GET",path:"/health",status:"active"},
        {name:"status",method:"GET",path:"/api/status",status:"active"},
        {name:"capabilities",method:"GET",path:"/api/capabilities",status:"active"},
        {name:"gateway-proxy",method:"ANY",path:"/auth|/sync|/integration|/audit|/admin",status:backendUrl(env)?"active":"not-configured"},
        {name:"database",status:"active",target:"Firebird"},
      ],timestamp:now() });
    }

    if (path === "/") {
      return new Response(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Zynkronyx Gateway</title><style>body{margin:0;background:#090a0d;color:#eee;font-family:system-ui;padding:32px}main{max-width:760px;margin:auto;border:1px solid #282a30;border-radius:18px;padding:28px;background:#111318}code{font-family:monospace;color:#a7f3d0}p{color:#999;line-height:1.6}.ok{color:#4ade80}</style></head><body><main><h1>Zynkronyx Gateway</h1><p class="ok">● ONLINE</p><p>Gateway público para o Control Center.</p><p>Backend: <code>${backendUrl(env) ? "configured" : "NOT CONFIGURED"}</code></p><p>Version: <code>${VERSION}</code></p></main></body></html>`, {headers:{"content-type":"text/html; charset=UTF-8","cache-control":"no-store"}});
    }

    if (["/auth","/sync","/integration","/audit","/admin"].some(prefix => path === prefix || path.startsWith(prefix + "/"))) {
      return proxy(request, env);
    }

    return json({ ok:false, error:"NOT_FOUND", path }, 404);
  },
};