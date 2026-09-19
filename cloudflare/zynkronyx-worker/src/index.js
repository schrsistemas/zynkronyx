const VERSION = "0.3.4";

const ALLOWED_ORIGINS = new Set([
  "https://zynkronyx-control-center.pages.dev",
  "https://x-control-center.pages.dev",
  "https://zynkronyx.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

function publicHeaders(request) {
  const origin = request.headers.get("Origin");
  const headers = {
    "access-control-allow-methods": "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS",
    "access-control-allow-headers": "Authorization,Content-Type,X-API-Key,X-Device-Id,X-Device-Credential,X-Correlation-Id",
    "cache-control": "no-store",
    "vary": "Origin",
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) headers["access-control-allow-origin"] = origin;
  return headers;
}

function json(data, status = 200, request, extra = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=UTF-8", ...publicHeaders(request), ...extra },
  });
}
function now() { return new Date().toISOString(); }
function backendUrl(env) {
  const value = env.BACKEND_URL;
  if (!value) return null;
  try { const url = new URL(value); if (url.protocol !== "https:") return null; return url; } catch (_) { return null; }
}
async function proxy(request, env, path) {
  const base = backendUrl(env);
  if (!base) return json({ok:false,error:"BACKEND_NOT_CONFIGURED",message:"Configure BACKEND_URL no Worker para ativar a API.",timestamp:now()},503,request);
  const target = new URL(path + new URL(request.url).search, base);
  const headers = new Headers(request.headers);
  headers.delete("host"); headers.set("x-zynkronyx-gateway", VERSION);
  try {
    const response = await fetch(new Request(target,{method:request.method,headers,body:request.method==="GET"||request.method==="HEAD"?undefined:request.body,redirect:"follow"}),{signal:AbortSignal.timeout(15000)});
    const responseHeaders = new Headers(response.headers);
    for (const [key,value] of Object.entries(publicHeaders(request))) responseHeaders.set(key,value);
    return new Response(response.body,{status:response.status,statusText:response.statusText,headers:responseHeaders});
  } catch(error) {
    return json({ok:false,error:"BACKEND_UNREACHABLE",message:"O backend Node/Express nao respondeu pelo gateway.",detail:error?.message||"fetch failed",timestamp:now()},502,request);
  }
}
const HTML = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Zynkronyx Control Center Gateway</title><style>:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;font-family:Inter,system-ui,sans-serif;background:#09090b;color:#f4f4f5}main{max-width:1050px;margin:auto;padding:48px 22px}.hero{padding:34px;border:1px solid #27272a;border-radius:20px;background:#111113}h1{font-size:42px;margin:18px 0 8px}p{color:#a1a1aa;line-height:1.6}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-top:22px}.card{padding:20px;border:1px solid #27272a;border-radius:16px;background:#0f0f12}.card b{display:block;font-size:14px;margin-bottom:9px}.endpoint{font-family:ui-monospace,monospace;color:#d4d4d8}.ok{color:#4ade80}.warn{color:#facc15}footer{margin-top:28px;color:#71717a;font-size:13px}</style></head><body><main><section class="hero"><span>CONTROL CENTER · GATEWAY</span><h1>Zynkronyx</h1><p>Cloudflare Worker como gateway da API Node/Express.</p><div class="grid"><div class="card"><b>Gateway</b><span class="ok">● ONLINE</span></div><div class="card"><b>Version</b><span class="endpoint">${VERSION}</span></div><div class="card"><b>Backend</b><span id="backend" class="warn">checking...</span></div><div class="card"><b>Updated</b><span class="endpoint">${now()}</span></div></div></section><section class="grid"><div class="card"><b>Health</b><span class="endpoint">GET /health</span><p>Estado do gateway.</p></div><div class="card"><b>API</b><span class="endpoint">/auth · /sync · /integration · /audit · /ai</span><p>Rotas encaminhadas para Node/Express quando BACKEND_URL estiver configurado.</p></div></section><footer>Gateway Zynkronyx · ${VERSION}</footer><script>fetch("/health").then(r=>r.json()).then(x=>document.getElementById("backend").textContent=x.backend||"not-configured").catch(()=>document.getElementById("backend").textContent="unreachable")</script></main></body></html>`;

export default { async fetch(request,env) {
  const url=new URL(request.url); const path=url.pathname.replace(/\/+$/,"")||"/";
  if(request.method==="OPTIONS") return new Response(null,{status:204,headers:publicHeaders(request)});
  if(path==="/health") return json({ok:true,service:"zynkronyx-gateway",status:"healthy",version:VERSION,backend:backendUrl(env)?"configured":"not-configured",timestamp:now()},200,request);
  if(path==="/workflow" && request.method==="POST") { if (!env.ZYNKRONYX_ORCHESTRATION) return json({ok:false,error:"WORKFLOW_NOT_CONFIGURED"},503,request); try { const payload=await request.json().catch(()=>({})); const instance=await env.ZYNKRONYX_ORCHESTRATION.create({params:payload}); return json({ok:true,workflow:"zynkronyx-orchestration",instance_id:instance.id,status:instance.status},202,request); } catch(error) { return json({ok:false,error:"WORKFLOW_CREATE_FAILED",message:error?.message||"workflow create failed"},502,request); } }\n  if(path==="/api/status") return json({ok:true,service:"zynkronyx-gateway",version:VERSION,runtime:"cloudflare-workers",backend:backendUrl(env)?"configured":"not-configured",environment:"public",timestamp:now()},200,request);
  if(path==="/api/capabilities") return json({ok:true,capabilities:[{name:"health",method:"GET",path:"/health",status:"active"},{name:"status",method:"GET",path:"/api/status",status:"active"},{name:"capabilities",method:"GET",path:"/api/capabilities",status:"active"},{name:"gateway-proxy",status:backendUrl(env)?"active":"awaiting-backend-url",paths:["/auth/*","/sync/*","/integration/*","/audit/*","/admin/*","/metrics/*","/ai/*","/sales/*"]},{name:"database",status:"configured",target:"transactional-sgbd"},{name:"ai-sales",status:"active",paths:["/sales/leads","/sales/opportunities","/sales/opportunities/:id/copilot"]}],timestamp:now()},200,request);
  if(path==="/") return new Response(HTML,{headers:{"content-type":"text/html; charset=UTF-8",...publicHeaders(request)}});
  return proxy(request,env,path);
} };