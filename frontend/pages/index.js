import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "https://mute-grass-9428.schrsistemas.workers.dev";
const fallbackServices = [
  ["API Gateway", "unknown", "Worker"],
  ["Database", "planned", "D1"],
  ["Observability", "planned", "Tracing"],
  ["DelphiDBUtils", "development", "FireDAC"],
];

export default function Home() {
  const [section, setSection] = useState("overview");
  const [status, setStatus] = useState(null);
  const [capabilities, setCapabilities] = useState([]);
  const [latency, setLatency] = useState(null);

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
    ["Database", findCapability(capabilities, "database")?.status || "planned", "D1"],
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
      </main>
    </div>
  );
}

function Nav({active,onClick,icon,children}) { return <button className={active?"active":""} onClick={onClick}>{icon} <span>{children}</span></button>; }
function title(s) { return ({overview:"System Overview",services:"Services",api:"API Explorer",database:"Database",sync:"Synchronization"})[s]; }
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
    <Stat title="Database" value={findCapability(capabilities,"database")?.status === "active" ? "D1" : "NEXT"} note="data layer"/>
  </div>
  <section><div className="sectionTitle"><h3>Service health</h3><span>Live API data</span></div><div className="serviceGrid">{services.map(s=><div className="service" key={s[0]}><div className="serviceIcon">◆</div><div className="serviceName">{s[0]}</div><span className={"status " + (s[1]==="online"?"":"muted")}>{s[1]}</span><div className="serviceMeta">{s[2]}</div></div>)}</div></section>
  <section><div className="sectionTitle"><h3>Architecture</h3><span>Current foundation</span></div><div className="architecture"><div>CLIENTS<span>Delphi · Web · Android</span></div><b>→</b><div>EDGE API<span>Cloudflare Worker</span></div><b>→</b><div>DATA<span>Cloudflare D1</span></div></div></section>
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
      const response = await fetch(API+"/sync/in", {method:"POST", headers:{"Content-Type":"application/json","x-api-key":"demo"}, body:payload});
      setResult(await response.json());
    } catch (error) { setResult({erro:error.message}); }
  }
  return <div className="panel"><p className="lead">Console de sincronização e staging.</p><textarea className="jsonEditor" value={payload} onChange={e=>setPayload(e.target.value)} rows={10}/><div className="syncActions"><button onClick={send}>Enviar para staging</button></div>{result && <pre className="resultBox">{JSON.stringify(result,null,2)}</pre>}</div>;
}

function Database({capabilities}) {
 const db=findCapability(capabilities,"database");
 return <div className="emptyState"><div className="bigIcon">▣</div><h2>Data layer</h2><p>Status informado pela API: <strong>{db?.status || "planned"}</strong>. O próximo passo é criar o schema D1 e expor operações reais pela API.</p><div className="progress"><span style={{width:db?.status==="active"?"100%":"42%"}}/></div><small>{db?.status==="active"?"Connected":"Foundation"}</small></div>
}
