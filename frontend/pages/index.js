import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "https://mute-grass-9428.schrsistemas.workers.dev";
const fallbackServices = [
  ["API Gateway", "unknown", "Worker"],
  ["Database", "planned", "Firebird"],
  ["Observability", "planned", "Logs / Metrics"],
  ["DelphiDBUtils", "development", "FireDAC"],
];

export default function Home() {
  const [section, setSection] = useState("overview");
  const [status, setStatus] = useState(null);
  const [capabilities, setCapabilities] = useState([]);
  const [latency, setLatency] = useState(null);
  const [authVersion, setAuthVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    async function load() {
      const started = performance.now();
      try {
        const [s, c] = await Promise.all([
          fetch(API + "/api/status", { cache: "no-store" }),
          fetch(API + "/api/capabilities", { cache: "no-store" }),
        ]);
        const statusJson = await s.json();
        const capJson = await c.json();
        if (!alive) return;
        setStatus(statusJson);
        setCapabilities(capJson.capabilities || []);
        setLatency(Math.round(performance.now() - started));
      } catch (_) {
        if (alive) setStatus({ ok: false, service: "zynkronyx-api" });
      }
    }
    load();
    const timer = setInterval(load, 30000);
    return () => { alive = false; clearInterval(timer); };
  }, []);

  const serviceRows = [
    ["API Gateway", status?.ok ? "online" : "offline", status?.runtime || "Worker"],
    ["Database", findCapability(capabilities, "database")?.status || "planned", "Firebird"],
    ["Observability", "planned", "Tracing"],
    ["DelphiDBUtils", "development", "FireDAC"],
  ];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="brandMark">Z</span><div><strong>Zynkronyx</strong><small>Platform</small></div></div>
        <nav>
          <Nav active={section==="overview"} onClick={()=>setSection("overview")} icon="⌂">Overview</Nav>
          <Nav active={section==="services"} onClick={()=>setSection("services")} icon="◈">Services</Nav>
          <Nav active={section==="api"} onClick={()=>setSection("api")} icon="⌘">API Explorer</Nav>
          <Nav active={section==="database"} onClick={()=>setSection("database")} icon="▣">Database</Nav>
          <Nav active={section==="sync"} onClick={()=>setSection("sync")} icon="⇄">Sync</Nav>
          <Nav active={section==="monitoring"} onClick={()=>setSection("monitoring")} icon="◉">Monitoring</Nav>
          <Nav active={section==="security"} onClick={()=>setSection("security")} icon="⌑">Security</Nav>
          <Nav active={section==="radar"} onClick={()=>setSection("radar")} icon="⌖">Radar</Nav>
          <Nav active={section==="devices"} onClick={()=>setSection("devices")} icon="⌁">Devices</Nav>
          <Nav active={section==="audit"} onClick={()=>setSection("audit")} icon="≡">Audit</Nav>
          <Nav active={section==="deploy"} onClick={()=>setSection("deploy")} icon="⇧">Deployments</Nav>
          <Nav active={section==="docs"} onClick={()=>setSection("docs")} icon="?">Docs</Nav>
        </nav>
        <div className="sideBottom"><span className={"dot " + (status?.ok ? "online" : "")}/> {status?.ok ? "All systems operational" : "Checking services..."}</div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div><span className="eyebrow">CONTROL CENTER</span><h1>{title(section)}</h1></div>
          <div className="userChip">PUBLIC <span>●</span></div>
        </header>
        {section === "overview" && <Overview status={status} latency={latency} services={serviceRows} capabilities={capabilities}/>}
        {section === "services" && <Services services={serviceRows}/>}
        {section === "api" && <ApiExplorer/>}
        {section === "database" && <Database capabilities={capabilities}/>} 
        {section === "sync" && <SyncConsole/>}
        {section === "monitoring" && <Monitoring status={status} latency={latency}/>} 
        {section === "security" && <Security onAuth={()=>setAuthVersion(v=>v+1)}/>}
        {section === "radar" && <Radar/>}
        {section === "devices" && <Devices/>}
        {section === "audit" && <Audit/>}
        {section === "deploy" && <Deployments/>}
        {section === "docs" && <Docs/>}
      </main>
    </div>
  );
}

function Nav({active,onClick,icon,children}) { return <button className={active?"active":""} onClick={onClick}>{icon} <span>{children}</span></button>; }
function title(s) { return ({overview:"System Overview",services:"Services",api:"API Explorer",database:"Database",sync:"Synchronization",devices:"Device Integrations",audit:"Legal Audit",deploy:"Deployments",docs:"Documentation",monitoring:"Monitoring",radar:"Radar Visual",security:"Security"})[s] || "Zynkronyx"; }
function authHeaders(){ if(typeof window==="undefined") return {}; const token=sessionStorage.getItem("zynkronyx_token"); const key=process.env.NEXT_PUBLIC_TENANT_API_KEY; return {...(key?{"x-api-key":key}:{}),...(token?{Authorization:"Bearer "+token}:{})}; }
function findCapability(list,name) { return list.find(x => x.name === name); }

function Overview({status,latency,services,capabilities}) {
 return <div>
  <div className="hero">
    <div><span className={"pill " + (status?.ok ? "" : "warn")}>● {status?.ok ? "LIVE" : "CHECKING"}</span><h2>{status?.ok ? "Zynkronyx is running." : "Connecting to Zynkronyx."}</h2><p>Uma plataforma modular para conectar aplicações, dados e serviços.</p></div>
    <div className="heroVersion">{status?.version || "—"}<br/><small>{status?.runtime || "Cloudflare Workers"}</small></div>
  </div>
  <div className="stats">
    <Stat title="API round trip" value={latency ? latency + " ms" : "—"} note="live browser check"/>
    <Stat title="Services" value={services.length} note="registered"/>
    <Stat title="Environment" value={status?.environment?.toUpperCase() || "PUBLIC"} note="serverless"/>
    <Stat title="Database" value={findCapability(capabilities,"database")?.status === "active" ? "Firebird" : "NEXT"} note="data layer"/>
  </div>
  <section><div className="sectionTitle"><h3>Service health</h3><span>Live API data</span></div><div className="serviceGrid">{services.map(s=><div className="service" key={s[0]}><div className="serviceIcon">◆</div><div className="serviceName">{s[0]}</div><span className={"status " + (s[1]==="online"?"":"muted")}>{s[1]}</span><div className="serviceMeta">{s[2]}</div></div>)}</div></section>
  <section><div className="sectionTitle"><h3>Architecture</h3><span>Current foundation</span></div><div className="architecture"><div>CLIENTS<span>Delphi · Web · Android</span></div><b>→</b><div>EDGE<span>Cloudflare Worker</span></div><b>→</b><div>BACKEND<span>Node · Express</span></div><b>→</b><div>DATA<span>Firebird</span></div></div></section>
 </div>
}

function Stat({title,value,note}) { return <div className="stat"><small>{title}</small><strong>{value}</strong><span>{note}</span></div> }

function Services({services}) {
 return <div className="panel"><p className="lead">Estado observado diretamente pela interface.</p>{services.map(s=><div className="row" key={s[0]}><div><strong>{s[0]}</strong><small>{s[2]}</small></div><span className={"status " + (s[1]==="online"?"":"muted")}>{s[1]}</span><b>›</b></div>)}</div>
}

function ApiExplorer() {
 const endpoints=["/","/health","/api/status","/api/capabilities"];
 return <div className="panel"><p className="lead">Endpoints públicos do gateway. Cada chamada abre a resposta real do Worker.</p>{endpoints.map(path=><div className="endpoint" key={path}><span className="method">GET</span><code>{path}</code><span className="status">active</span><button onClick={()=>window.open(API+path,"_blank","noopener,noreferrer")}>Open ↗</button></div>)}</div>
}


function SyncConsole() {
  const [payload, setPayload] = useState(JSON.stringify({tabela:"CLIENTE",chave:"123",operacao:"U",dados:{NOME:"Exemplo"}}, null, 2));
  const [result, setResult] = useState(null);
  async function send() {
    try {
      const response = await fetch(API+"/sync/in", {method:"POST", headers:{"Content-Type":"application/json",...authHeaders()}, body:payload});
      setResult(await response.json());
    } catch (error) { setResult({erro:error.message}); }
  }
  return <div className="panel"><p className="lead">Console de sincronização e staging.</p><textarea className="jsonEditor" value={payload} onChange={e=>setPayload(e.target.value)} rows={10}/><div className="syncActions"><button onClick={send}>Enviar para staging</button></div>{result && <pre className="resultBox">{JSON.stringify(result,null,2)}</pre>}</div>;
}

function Monitoring({status,latency}) { return <div className="panel"><p className="lead">Diagnóstico operacional observado pelo navegador.</p><div className="row"><div><strong>Cloudflare Worker</strong><small>{status?.runtime || "cloudflare-workers"}</small></div><span className={"status " + (status?.ok ? "":"muted")}>{status?.ok ? "online":"offline"}</span></div><div className="row"><div><strong>API latency</strong><small>Última medição</small></div><span className="status">{latency ? latency+" ms":"—"}</span></div><div className="row"><div><strong>Cache policy</strong><small>API responses</small></div><span className="status">no-store</span></div></div>; }

function Devices() {
 const [rows,setRows]=useState([]); const [error,setError]=useState(null); const [loading,setLoading]=useState(false);
 const [form,setForm]=useState({device_id:"",device_type:"simulator",name:"",protocol_version:1,scopes:["events:write"]});
 const [credential,setCredential]=useState(null); const [action,setAction]=useState(null);
 const auth={headers:authHeaders()};
 async function load(){setLoading(true);setError(null);try{const r=await fetch(API+"/integration/devices",{...auth,cache:"no-store"});const j=await r.json();if(!r.ok)throw new Error(j.erro||"Falha ao consultar dispositivos");setRows(j.devices||[]);}catch(e){setError(e.message)}finally{setLoading(false)}}
 useEffect(()=>{load()},[]);
 function change(e){setForm({...form,[e.target.name]:e.target.name==="protocol_version"?Number(e.target.value):e.target.value})}
 async function register(e){e.preventDefault();setAction("register");setError(null);try{const r=await fetch(API+"/integration/devices",{method:"POST",...auth,headers:{...auth.headers,"Content-Type":"application/json"},body:JSON.stringify(form)});const j=await r.json();if(!r.ok)throw new Error(j.erro||"Falha ao registrar");setCredential(j.device);setForm({...form,device_id:"",name:""});await load()}catch(e){setError(e.message)}finally{setAction(null)}}
 async function rotate(id){setAction("rotate:"+id);setError(null);try{const r=await fetch(API+"/integration/devices/"+encodeURIComponent(id)+"/rotate",{method:"POST",...auth});const j=await r.json();if(!r.ok)throw new Error(j.erro||"Falha ao rotacionar");setCredential(j.device)}catch(e){setError(e.message)}finally{setAction(null)}}
 async function revoke(id){if(!window.confirm("Revogar o dispositivo "+id+"?"))return;setAction("revoke:"+id);try{const r=await fetch(API+"/integration/devices/"+encodeURIComponent(id),{method:"DELETE",...auth});const j=await r.json();if(!r.ok)throw new Error(j.erro||"Falha ao revogar");await load()}catch(e){setError(e.message)}finally{setAction(null)}}
 return <div>
  <div className="panel"><div className="sectionTitle"><h3>Novo dispositivo</h3><span>Credential gerada uma única vez</span></div>
   <form onSubmit={register} className="deviceForm">
    <input name="device_id" value={form.device_id} onChange={change} placeholder="device_id" required/>
    <select name="device_type" value={form.device_type} onChange={change}>{["arduino","raspberry-pi","pic","android","ios","delphi","simulator"].map(x=><option key={x}>{x}</option>)}</select>
    <input name="name" value={form.name} onChange={change} placeholder="Nome (opcional)"/>
    <input name="protocol_version" type="number" min="1" value={form.protocol_version} onChange={change}/>
    <button type="submit">{action==="register"?"Registrando...":"Registrar dispositivo"}</button>
   </form>
   {error&&<div className="resultBox">{error}</div>}
  </div>
  {credential&&<div className="panel credentialPanel"><div className="sectionTitle"><h3>Credencial recém-gerada</h3><button onClick={()=>setCredential(null)}>Fechar</button></div><p>Ela é retornada pela API somente neste momento. Não é armazenada pelo Control Center.</p><code className="credential">{credential.credential}</code><div><button onClick={()=>navigator.clipboard?.writeText(credential.credential)}>Copiar credencial</button></div><small>Validade: {credential.expires_in_days||"configurada no servidor"} dias · scopes: {(credential.scopes||[]).join(", ")}</small></div>}
  <div className="panel"><div className="sectionTitle"><h3>Device Registry</h3><button onClick={load}>{loading?"Atualizando...":"Atualizar"}</button></div><p className="lead">Tenant atual · credenciais nunca aparecem na listagem.</p>
   {!rows.length&&!error?<div className="emptyState"><h2>Nenhum dispositivo retornado</h2><p>O painel não inventa dados.</p></div>:rows.map(d=><div className="row" key={d.DEVICE_ID}><div><strong>{d.DEVICE_ID}</strong><small>{d.NAME||"Sem nome"} · {d.DEVICE_TYPE} · protocolo {d.PROTOCOL_VERSION} · {d.LAST_SEEN||"nunca visto"}</small></div><span className={"status "+(d.STATUS==="A"?"":"muted")}>{d.STATUS==="A"?"active":"inactive"}</span><div><button disabled={action===("rotate:"+d.DEVICE_ID)} onClick={()=>rotate(d.DEVICE_ID)}>Rotacionar</button> <button disabled={action===("revoke:"+d.DEVICE_ID)} onClick={()=>revoke(d.DEVICE_ID)}>Revogar</button></div></div>)}
  </div>
 </div>;
}

function Radar() {
 const [devices,setDevices]=useState([]); const [error,setError]=useState(null); const [loading,setLoading]=useState(false);
 async function load(){setLoading(true);setError(null);try{const r=await fetch(API+"/integration/devices",{headers:authHeaders(),cache:"no-store"});const j=await r.json();if(!r.ok)throw new Error(j.erro||"Falha ao carregar radar");setDevices(j.devices||[])}catch(e){setError(e.message)}finally{setLoading(false)}}
 useEffect(()=>{load()},[]);
 const located=devices.filter(d=>Number.isFinite(Number(d.LAST_LATITUDE))&&Number.isFinite(Number(d.LAST_LONGITUDE)));
 return <div>
  <div className="hero"><div><span className="pill">RADAR VISUAL</span><h2>Device Radar</h2><p>Mapa operacional preparado para posições reportadas pelos dispositivos.</p></div><div className="heroVersion">{located.length}<br/><small>posições conhecidas</small></div></div>
  <div className="panel radarPanel">
   <div className="sectionTitle"><h3>Mapa</h3><button onClick={load}>{loading?"Atualizando...":"Atualizar"}</button></div>
   {error&&<div className="resultBox">{error}</div>}
   <div className="radarMap">
    <div className="radarGrid"/>
    <div className="radarSweep"/>
    {located.map((d,i)=>{const lon=Number(d.LAST_LONGITUDE),lat=Number(d.LAST_LATITUDE);const x=((lon+180)/360)*100,y=((90-lat)/180)*100;return <div key={d.DEVICE_ID} className="radarPin" style={{left:x+"%",top:y+"%"}} title={d.DEVICE_ID}>●<span>{d.DEVICE_ID}</span></div>})}
    {!located.length&&<div className="radarEmpty"><strong>Sem coordenadas reportadas</strong><small>O radar não cria posições fictícias. Quando um dispositivo enviar latitude/longitude válidas, o ponto será plotado automaticamente.</small></div>}
   </div>
   <div className="radarLegend"><span>● Ativo</span><span>{devices.length} dispositivos registrados</span><span>{located.length} com localização</span></div>
  </div>
  <div className="panel"><p className="lead">Privacidade e precisão</p><div className="row"><div><strong>Origem</strong><small>Somente coordenadas explicitamente enviadas pelo dispositivo.</small></div><span className="status">NO INFERENCE</span></div><div className="row"><div><strong>Firebird</strong><small>Localização é opcional e não substitui endereço residencial.</small></div><span className="status">COARSE-READY</span></div></div>
 </div>;
}

function Deployments() {
 return <div>
  <div className="hero"><div><span className="pill">DEPLOY PIPELINE</span><h2>Deployments</h2><p>Visão operacional dos artefatos e verificações de publicação.</p></div><div className="heroVersion">GHCR<br/><small>immutable SHA tags</small></div></div>
  <div className="stats"><Stat title="Backend image" value="GHCR" note="published by CI"/><Stat title="Frontend" value="Pages" note="Cloudflare"/><Stat title="Runtime check" value="/health" note="smoke test"/><Stat title="Rollback" value="SHA" note="immutable tag"/></div>
  <div className="panel"><p className="lead">Contrato atual</p>
   <div className="row"><div><strong>Backend container</strong><small>Dockerfile.prod.fix → GHCR → runtime externo configurado</small></div><span className="status">VERIFIED</span></div>
   <div className="row"><div><strong>Control Center</strong><small>Next.js static export → Cloudflare Pages</small></div><span className="status">LIVE</span></div>
   <div className="row"><div><strong>Production boundary</strong><small>CI não é tratado como servidor persistente</small></div><span className="status">ENFORCED</span></div>
  </div>
 </div>;
}

function Audit() {
 const [rows,setRows]=useState([]); const [cursor,setCursor]=useState(0); const [loading,setLoading]=useState(false); const [error,setError]=useState(null); const [selected,setSelected]=useState(null);
 const [filters,setFilters]=useState({device_id:"",event_type:"SECURITY",resultado:""});
 const auth={headers:authHeaders()};
 async function load(nextCursor=0){
  setLoading(true);setError(null);
  try{
   const qs=new URLSearchParams({limit:"50",cursor:String(nextCursor)});
   if(filters.device_id)qs.set("device_id",filters.device_id);
   if(filters.event_type)qs.set("event_type",filters.event_type);
   if(filters.resultado)qs.set("resultado",filters.resultado);
   const r=await fetch(API+"/audit/events?"+qs.toString(),{...auth,cache:"no-store"});
   const j=await r.json();if(!r.ok)throw new Error(j.erro||"Falha ao consultar auditoria");
   setRows(j.events||j.rows||[]);setCursor(Number(j.next_cursor||0));
  }catch(e){setError(e.message);setRows([])}finally{setLoading(false)}
 }
 useEffect(()=>{load(0)},[]);
 function apply(e){e.preventDefault();load(0)}
 return <div>
  <div className="panel">
   <div className="sectionTitle"><h3>Security & Legal Audit</h3><span>Somente eventos retornados pela API</span></div>
   <form className="auditFilters" onSubmit={apply}>
    <input placeholder="device_id" value={filters.device_id} onChange={e=>setFilters({...filters,device_id:e.target.value})}/>
    <select value={filters.event_type} onChange={e=>setFilters({...filters,event_type:e.target.value})}><option value="">Todos os tipos</option><option>SECURITY</option><option>DEVICE</option><option>SYNC</option></select>
    <select value={filters.resultado} onChange={e=>setFilters({...filters,resultado:e.target.value})}><option value="">Todos os resultados</option><option>ALLOWED</option><option>DENIED</option><option>RECEIVED</option></select>
    <button type="submit">{loading?"Consultando...":"Aplicar filtros"}</button>
   </form>
   {error&&<div className="resultBox">{error}</div>}
   {!rows.length&&!loading&&!error?<div className="emptyState"><div className="bigIcon">≡</div><h2>Sem eventos</h2><p>Nenhum registro correspondente foi retornado pela API.</p></div>:
    rows.map((e,i)=><button className="auditRow" key={e.ID||e.id||e.EVENT_ID||i} onClick={()=>setSelected(e)}>
      <div><strong>{e.EVENT_ID||e.event_id}</strong><small>{e.EVENT_TYPE||e.event_type} · {e.DEVICE_ID||e.device_id||"—"} · {e.SERVER_TIMESTAMP||e.server_timestamp||"—"}</small></div>
      <span className={"status "+((e.RESULTADO||e.resultado)==="DENIED"?"muted":"")}>{e.RESULTADO||e.resultado}</span>
    </button>)}
   {cursor>0&&<div className="syncActions"><button onClick={()=>load(cursor)}>Carregar próxima página</button></div>}
  </div>
  {selected&&<div className="panel auditDetail"><div className="sectionTitle"><h3>Evento de segurança</h3><button onClick={()=>setSelected(null)}>Fechar</button></div><pre className="resultBox">{JSON.stringify(selected,null,2)}</pre></div>}
 </div>;
}

function Docs() { return <div className="panel"><p className="lead">Documentação operacional do projeto.</p><div className="row"><div><strong>Architecture</strong><small>Fluxos, componentes e responsabilidades</small></div><span className="status">docs/</span></div><div className="row"><div><strong>Build ALL</strong><small>Critérios de implementação e deploy</small></div><span className="status">BUILD-ALL</span></div><div className="row"><div><strong>API</strong><small>Endpoints públicos atuais</small></div><span className="status">LIVE</span></div></div>; }

function Database({capabilities}) {
 const db=findCapability(capabilities,"database");
 return <div className="emptyState"><div className="bigIcon">▣</div><h2>Data layer</h2><p>Status informado pela API: <strong>{db?.status || "planned"}</strong>. A camada de dados operacional alvo é Firebird. A interface exibirá dados reais quando a API autenticada de banco estiver disponível.</p><div className="progress"><span style={{width:db?.status==="active"?"100%":"42%"}}/></div><small>{db?.status==="active"?"Connected":"Foundation"}</small></div>
}


function Security({onAuth}) {
 const [login,setLogin]=useState(""); const [password,setPassword]=useState(""); const [message,setMessage]=useState(null); const [loading,setLoading]=useState(false);
 const logged=typeof window!=="undefined"&&!!sessionStorage.getItem("zynkronyx_token");
 async function submit(e){e.preventDefault();setLoading(true);setMessage(null);try{const r=await fetch(API+"/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({login,password})});const j=await r.json();if(!r.ok)throw new Error(j.erro||"Falha no login");sessionStorage.setItem("zynkronyx_token",j.token);setPassword("");setMessage("Sessão autenticada neste navegador.");onAuth?.()}catch(e){setMessage(e.message)}finally{setLoading(false)}}
 function logout(){sessionStorage.removeItem("zynkronyx_token");setMessage("Sessão encerrada.");onAuth?.()}
 return <div>
  <div className="hero"><div><span className="pill">AUTHENTICATION</span><h2>Security Center</h2><p>Credenciais de produção são obtidas pelo endpoint de login; nenhum bearer token é mantido no código da interface.</p></div><div className="heroVersion">{logged?"AUTHENTICATED":"SIGNED OUT"}<br/><small>sessionStorage</small></div></div>
  <div className="panel securityPanel">
   <div className="sectionTitle"><h3>{logged?"Sessão atual":"Entrar"}</h3><span>tenant key via NEXT_PUBLIC_TENANT_API_KEY</span></div>
   {!logged?<form className="securityForm" onSubmit={submit}><input value={login} onChange={e=>setLogin(e.target.value)} placeholder="Login" autoComplete="username" required/><input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="Senha" autoComplete="current-password" required/><button type="submit">{loading?"Autenticando...":"Entrar"}</button></form>:<div className="securityActions"><button onClick={logout}>Encerrar sessão</button></div>}
   {message&&<div className="resultBox">{message}</div>}
  </div>
  <div className="panel"><div className="row"><div><strong>Bearer token</strong><small>Recebido somente após login e mantido na sessão do navegador.</small></div><span className="status">NO MOCK</span></div><div className="row"><div><strong>Tenant API key</strong><small>Configuração pública do Control Center; nunca usar valor de demonstração em produção.</small></div><span className={process.env.NEXT_PUBLIC_TENANT_API_KEY?"status":"status muted"}>{process.env.NEXT_PUBLIC_TENANT_API_KEY?"CONFIGURED":"NOT CONFIGURED"}</span></div></div>
 </div>;
}
