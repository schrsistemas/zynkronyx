import { useState } from "react";

const services = [
  ["API Gateway", "Online", "99.99%"],
  ["Database", "Ready", "D1"],
  ["Observability", "Active", "Tracing"],
  ["DelphiDBUtils", "Development", "FireDAC"],
];

export default function Home() {
  const [section, setSection] = useState("overview");

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="brandMark">Z</span><div><strong>Zynkronyx</strong><small>Platform</small></div></div>
        <nav>
          <button className={section==="overview"?"active":""} onClick={()=>setSection("overview")}>⌂ <span>Overview</span></button>
          <button className={section==="services"?"active":""} onClick={()=>setSection("services")}>◈ <span>Services</span></button>
          <button className={section==="api"?"active":""} onClick={()=>setSection("api")}>⌘ <span>API Explorer</span></button>
          <button className={section==="database"?"active":""} onClick={()=>setSection("database")}>▣ <span>Database</span></button>
        </nav>
        <div className="sideBottom"><span className="dot"/> All systems operational</div>
      </aside>

      <main className="main">
        <header className="topbar"><div><span className="eyebrow">CONTROL CENTER</span><h1>{section === "overview" ? "System Overview" : section === "services" ? "Services" : section === "api" ? "API Explorer" : "Database"}</h1></div><div className="userChip">PUBLIC <span>●</span></div></header>

        {section === "overview" && <Overview />}
        {section === "services" && <Services />}
        {section === "api" && <ApiExplorer />}
        {section === "database" && <Database />}
      </main>
    </div>
  );
}

function Overview() {
 return <div>
  <div className="hero"><div><span className="pill">● LIVE</span><h2>Zynkronyx is running.</h2><p>Uma plataforma modular para conectar aplicações, dados e serviços.</p></div><div className="heroVersion">v0.1.0<br/><small>Cloudflare Workers</small></div></div>
  <div className="stats"><Stat title="API latency" value="42 ms" note="edge response"/><Stat title="Services" value="4" note="registered"/><Stat title="Environment" value="PUBLIC" note="serverless"/><Stat title="Database" value="D1" note="next layer"/></div>
  <section><div className="sectionTitle"><h3>Service health</h3><span>Updated just now</span></div><div className="serviceGrid">{services.map(s=><div className="service" key={s[0]}><div className="serviceIcon">◆</div><div className="serviceName">{s[0]}</div><span className="status">{s[1]}</span><div className="serviceMeta">{s[2]}</div></div>)}</div></section>
  <section><div className="sectionTitle"><h3>Architecture</h3><span>Current foundation</span></div><div className="architecture"><div>CLIENTS<span>Delphi · Web · Android</span></div><b>→</b><div>EDGE API<span>Cloudflare Worker</span></div><b>→</b><div>DATA<span>Cloudflare D1</span></div></div></section>
 </div>
}

function Stat({title,value,note}) { return <div className="stat"><small>{title}</small><strong>{value}</strong><span>{note}</span></div> }

function Services() {
 return <div className="panel"><p className="lead">Componentes registrados na plataforma.</p>{services.map(s=><div className="row" key={s[0]}><div><strong>{s[0]}</strong><small>{s[2]}</small></div><span className="status">{s[1]}</span><b>›</b></div>)}</div>
}

function ApiExplorer() {
 const endpoints=["GET /","GET /health","GET /api/status","GET /api/capabilities"];
 return <div className="panel"><p className="lead">Endpoints públicos disponíveis no gateway.</p>{endpoints.map((e,i)=><div className="endpoint" key={e}><span className="method">GET</span><code>{e.slice(4)}</code><span className="status">active</span><button onClick={()=>window.open("https://mute-grass-9428.schrsistemas.workers.dev"+e.slice(4),"_blank")}>Open ↗</button></div>)}</div>
}

function Database() {
 return <div className="emptyState"><div className="bigIcon">▣</div><h2>Data layer is next</h2><p>Cloudflare D1 será conectado ao gateway para armazenar dados reais. A interface já está preparada para essa evolução.</p><div className="progress"><span style={{width:"42%"}}/></div><small>Foundation 42%</small></div>
}
