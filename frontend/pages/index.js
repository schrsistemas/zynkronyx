import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import IntegrationsCenter from "../components/IntegrationsCenter";

const RadarMap = dynamic(() => import("../components/RadarMap"), { ssr:false, loading:() => <div className="radarMap radarLoading">Carregando mapa…</div> });

const API = process.env.NEXT_PUBLIC_API_URL || "https://mute-grass-9428.schrsistemas.workers.dev";
const APP_NAME = "PescaRadar";
const LGPD_POLICY_VERSION = "2026-09-19";
const LGPD_POLICY_TYPE = "PRIVACY_NOTICE";

function authHeaders(){
  if(typeof window==="undefined") return {};
  const token=sessionStorage.getItem("zynkronyx_token");
  return token ? {Authorization:"Bearer "+token} : {};
}
function findCapability(list,name){ return list.find(x=>x.name===name); }

export default function Home(){
  const [section,setSection]=useState("radar");
  const [status,setStatus]=useState(null);
  const [capabilities,setCapabilities]=useState([]);
  const [authenticated,setAuthenticated]=useState(false);
  const [authVersion,setAuthVersion]=useState(0);

  useEffect(()=>{
    if(typeof window!=="undefined") setAuthenticated(!!sessionStorage.getItem("zynkronyx_token"));
  },[authVersion]);

  useEffect(()=>{
    let alive=true;
    async function load(){
      try{
        const [s,c]=await Promise.all([
          fetch(API+"/api/status",{cache:"no-store"}),
          fetch(API+"/api/capabilities",{cache:"no-store"})
        ]);
        const sj=await s.json(), cj=await c.json();
        if(!alive)return;
        setStatus(sj);
        setCapabilities(cj.capabilities||[]);
      }catch(_){ if(alive)setStatus({ok:false}); }
    }
    load();
    const t=setInterval(load,30000);
    return()=>{alive=false;clearInterval(t)};
  },[]);

  const serviceRows=[
    ["Gateway",status?.ok?"online":"offline","Cloudflare Worker"],
    ["Backend",status?.backend==="configured"?"configured":"not-configured","Node / Express"],
    ["Database",findCapability(capabilities,"database")?.status||"not-observed","Firebird adapter"],
  ];

  return <>
    <LgpdAcceptance authVersion={authVersion} onAuth={()=>setAuthVersion(v=>v+1)}/>
    <div className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="brandMark">🎣</span><div><strong>{APP_NAME}</strong><small>Fishing intelligence</small></div></div>
        <nav>
          <Nav active={section==="radar"} onClick={()=>setSection("radar")} icon="⌖">Radar</Nav>
          <Nav active={section==="diary"} onClick={()=>setSection("diary")} icon="▤">Diário</Nav>
          <Nav active={section==="assistant"} onClick={()=>setSection("assistant")} icon="✦">Assistente</Nav>
          <Nav active={section==="conditions"} onClick={()=>setSection("conditions")} icon="☁">Condições</Nav>
          <Nav active={section==="tournament"} onClick={()=>setSection("tournament")} icon="🏆">Torneio</Nav>
          <Nav active={section==="history"} onClick={()=>setSection("history")} icon="◴">Histórico</Nav>
          <Nav active={section==="analytics"} onClick={()=>setSection("analytics")} icon="◫">Análises</Nav>
          <Nav active={section==="devices"} onClick={()=>setSection("devices")} icon="⌁">Dispositivos</Nav>
          <Nav active={section==="security"} onClick={()=>setSection("security")} icon="⌑">Segurança</Nav>
          <Nav active={section==="integrations"} onClick={()=>setSection("integrations")} icon="⚙">Integrações</Nav>
        </nav>
        <div className="sideBottom"><span className={"dot "+(status?.ok?"online":"")}/>{status?.ok?"Gateway online":"Verificando gateway…"}</div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div><span className="eyebrow">PESCA RADAR</span><h1>{title(section)}</h1></div>
          <div className="userChip">{authenticated?"AUTH":"PUBLIC"} <span className={"authDot "+(authenticated?"on":"")}>●</span></div>
        </header>

        {section==="radar" && <Radar/>}
        {section==="diary" && <FishingDiary/>}
        {section==="assistant" && <Assistant/>}
        {section==="conditions" && <Conditions/>}
        {section==="tournament" && <Tournament/>}
        {section==="history" && <History/>}
        {section==="analytics" && <Analytics/>}
        {section==="devices" && <Devices/>}
        {section==="security" && <Security authVersion={authVersion} onAuth={()=>setAuthVersion(v=>v+1)}/>}
        {section==="integrations" && <IntegrationsCenter/>}
      </main>
    </div>
  </>;
}

function Nav({active,onClick,icon,children}){
  return <button type="button" className={active?"active":""} onClick={onClick} title={children} aria-label={children} aria-current={active?"page":undefined}>{icon}<span>{children}</span></button>;
}
function title(s){
  return ({radar:"Radar de Pescaria",diary:"Diário de Pescaria",assistant:"Assistente de Pescaria",conditions:"Condições de Pesca",tournament:"Torneio",history:"Histórico",analytics:"Análises",devices:"Dispositivos",security:"Segurança",integrations:"Integrações"})[s]||APP_NAME;
}

function LgpdAcceptance({authVersion,onAuth}){
  const [visible,setVisible]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(null),[checked,setChecked]=useState(false);
  useEffect(()=>{
    if(typeof window==="undefined")return;
    let alive=true;
    async function check(){
      const token=sessionStorage.getItem("zynkronyx_token");
      if(!token){setVisible(false);return}
      try{
        const r=await fetch(API+"/legal/acceptance?policy_type="+encodeURIComponent(LGPD_POLICY_TYPE),{headers:authHeaders(),cache:"no-store"});
        if(r.status===401||r.status===403){sessionStorage.removeItem("zynkronyx_token");onAuth?.();return}
        const j=await r.json();
        if(alive&&r.ok&&j.result?.policy_version===LGPD_POLICY_VERSION&&j.result?.action==="ACCEPT"){setVisible(false);return}
      }catch(_){}
      if(alive)setVisible(true);
    }
    check();
    return()=>{alive=false};
  },[authVersion]);

  async function accept(){
    setBusy(true);setError(null);
    try{
      const r=await fetch(API+"/legal/acceptance",{method:"POST",headers:{"Content-Type":"application/json",...authHeaders()},body:JSON.stringify({policy_type:LGPD_POLICY_TYPE,policy_version:LGPD_POLICY_VERSION,action:"ACCEPT",source:"pescaradar"})});
      if(r.status===401||r.status===403){sessionStorage.removeItem("zynkronyx_token");onAuth?.();return}
      const j=await r.json();
      if(!r.ok)throw new Error(j.error||j.erro||"Não foi possível registrar o aceite.");
      setVisible(false);setChecked(false);
    }catch(e){setError(e.message)}finally{setBusy(false)}
  }

  if(!visible)return null;
  return <div className="lgpdOverlay" role="dialog" aria-modal="true">
    <div className="lgpdCard">
      <span className="eyebrow">PRIVACIDADE · LGPD</span>
      <h2>Aviso de privacidade</h2>
      <p>O PescaRadar registra dados de pescaria, localização e telemetria de dispositivos quando você os envia. O aceite é registrado no servidor com a versão da política.</p>
      <div className="lgpdSummary"><strong>O que este aviso cobre</strong><ul><li>dados de pescaria e equipamentos;</li><li>localização quando reportada;</li><li>uso, segurança e auditoria dos registros.</li></ul></div>
      <p className="lgpdMeta">Versão vigente: <strong>{LGPD_POLICY_VERSION}</strong></p>
      <label className="lgpdCheck"><input type="checkbox" checked={checked} onChange={e=>{setChecked(e.target.checked);setError(null)}}/> <span>Li e estou ciente do aviso de privacidade vigente.</span></label>
      {error&&<div className="resultBox">{error}</div>}
      <button type="button" className="primaryButton" disabled={busy||!checked} onClick={accept}>{busy?"Registrando…":"Aceitar e continuar"}</button>
    </div>
  </div>
}

function Radar(){
  const [devices,setDevices]=useState([]),[error,setError]=useState(null),[loading,setLoading]=useState(false),[type,setType]=useState(""),[activeOnly,setActiveOnly]=useState(true),[selected,setSelected]=useState(null);
  const auth=authHeaders();
  async function load(){
    setLoading(true);setError(null);
    try{
      const r=await fetch(API+"/integration/devices",{headers:auth,cache:"no-store"});const j=await r.json();
      if(!r.ok)throw new Error(j.erro||"Faça login para consultar pontos do radar.");
      setDevices(j.devices||[]);
    }catch(e){setError(e.message)}finally{setLoading(false)}
  }
  useEffect(()=>{load();const t=setInterval(load,30000);return()=>clearInterval(t)},[]);
  const visible=devices.filter(d=>(!activeOnly||d.STATUS==="A")&&(!type||d.DEVICE_TYPE===type)&&validCoords(d));
  const last=visible.slice().sort((a,b)=>new Date(b.LOCATION_UPDATED_AT||0)-new Date(a.LOCATION_UPDATED_AT||0))[0];

  return <div>
    <div className="hero"><div><span className="pill">PESCA RADAR</span><h2>Mapa de pescarias e pontos monitorados</h2><p>Mostra somente posições realmente reportadas pelos dispositivos. Nenhum ponto é inventado.</p></div><div className="heroVersion">{visible.length}<br/><small>pontos</small></div></div>
    <div className="stats">
      <Stat title="Dispositivos" value={devices.length} note="cadastro do tenant"/>
      <Stat title="Pontos com GPS" value={visible.length} note="coordenadas válidas"/>
      <Stat title="Atualização" value={last?.LOCATION_UPDATED_AT?formatDate(last.LOCATION_UPDATED_AT):"—"} note="último sinal"/>
      <Stat title="Gateway" value={statusLabel()} note="estado observado"/>
    </div>
    <div className="panel">
      <div className="sectionTitle"><h3>Radar</h3><span>{loading?"Atualizando…":"polling 30s"}</span></div>
      <div className="radarControls">
        <select value={type} onChange={e=>setType(e.target.value)}><option value="">Todos os tipos</option>{["android","delphi","simulator","arduino","raspberry-pi","pic","ios"].map(x=><option key={x}>{x}</option>)}</select>
        <label><input type="checkbox" checked={activeOnly} onChange={e=>setActiveOnly(e.target.checked)}/> somente ativos</label>
        <button onClick={load}>{loading?"Atualizando…":"Atualizar agora"}</button>
      </div>
      {error&&<div className="resultBox">{error}</div>}
      {visible.length?<RadarMap devices={visible} selectedId={selected?.DEVICE_ID} onSelect={setSelected}/>:<div className="radarEmpty radarMap"><strong>Sem coordenadas reportadas</strong><small>Registre um dispositivo e envie eventos com latitude/longitude para formar o mapa.</small></div>}
    </div>
    {selected&&<div className="panel"><div className="sectionTitle"><h3>{selected.DEVICE_ID}</h3><button onClick={()=>setSelected(null)}>Fechar</button></div><InfoRow label="Tipo" value={selected.DEVICE_TYPE}/><InfoRow label="Posição" value={selected.LAST_LATITUDE+", "+selected.LAST_LONGITUDE}/><InfoRow label="Última atualização" value={formatDate(selected.LOCATION_UPDATED_AT)}/></div>}
    <div className="panel"><div className="sectionTitle"><h3>Como alimentar o radar</h3><span>API real</span></div><pre className="resultBox">{JSON.stringify({endpoint:API+"/integration/events",headers:["x-api-key","x-device-id","x-device-credential"],event:{event_id:"pesca-001",device_id:"barco-01",device_type:"android",protocol_version:1,operation:"FISHING_POINT",location:{latitude:-26.3045,longitude:-48.8487},payload:{especie:"traíra",comprimento_cm:42,isca:"spinner"}}},null,2)}</pre></div>
  </div>
}

function FishingDiary(){
  const [items,setItems]=useState(loadDiary),[form,setForm]=useState({date:new Date().toISOString().slice(0,10),location:"",species:"",quantity:1,length:"",bait:"",color:"",work:"",notes:""}),[message,setMessage]=useState("");
  function save(e){e.preventDefault();const item={id:crypto?.randomUUID?.()||String(Date.now()),...form,quantity:Number(form.quantity)||0,length:Number(form.length)||null};const next=[item,...items];setItems(next);persistDiary(next);setMessage("Registro salvo neste navegador.")}
  function clear(){setItems([]);persistDiary([]);setMessage("Diário limpo neste navegador.")}
  return <div>
    <div className="hero"><div><span className="pill">DIÁRIO</span><h2>Registre a pescaria enquanto ela acontece</h2><p>Primeira camada offline. O próximo passo é sincronizar esses registros com o backend.</p></div></div>
    <div className="panel"><form className="fishingForm" onSubmit={save}>
      <input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} required/>
      <input placeholder="Local / ponto" value={form.location} onChange={e=>setForm({...form,location:e.target.value})}/>
      <input placeholder="Espécie" value={form.species} onChange={e=>setForm({...form,species:e.target.value})}/>
      <input type="number" min="0" placeholder="Quantidade" value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})}/>
      <input type="number" min="0" step="0.1" placeholder="Comprimento cm" value={form.length} onChange={e=>setForm({...form,length:e.target.value})}/>
      <input placeholder="Isca" value={form.bait} onChange={e=>setForm({...form,bait:e.target.value})}/>
      <input placeholder="Cor" value={form.color} onChange={e=>setForm({...form,color:e.target.value})}/>
      <input placeholder="Trabalho / técnica" value={form.work} onChange={e=>setForm({...form,work:e.target.value})}/>
      <textarea placeholder="Observações" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/>
      <button type="submit">Salvar pescaria</button><button type="button" onClick={clear}>Limpar diário</button>
    </form>{message&&<div className="resultBox">{message}</div>}</div>
    <div className="panel"><div className="sectionTitle"><h3>Registros ({items.length})</h3><span>persistência local</span></div>{items.length?items.map(x=><div className="row" key={x.id}><div><strong>{x.species||"Pescaria"}</strong><small>{x.date} · {x.location||"local não informado"} · {x.bait||"sem isca"}</small></div><span className="status">{x.quantity||0} peixe(s)</span><small>{x.length?x.length+" cm":"—"}</small></div>):<div className="emptyState"><h2>Diário vazio</h2><p>Seu primeiro registro aparecerá aqui.</p></div>}</div>
  </div>
}
function loadDiary(){if(typeof window==="undefined")return [];try{return JSON.parse(localStorage.getItem("pescaradar.diary")||"[]")}catch(_){return []}}
function persistDiary(items){if(typeof window!=="undefined")localStorage.setItem("pescaradar.diary",JSON.stringify(items))}

function Assistant(){
  const [query,setQuery]=useState("Quais condições devo observar antes de pescar amanhã?");
  const [result,setResult]=useState(null),[loading,setLoading]=useState(false);
  async function ask(e){e.preventDefault();setLoading(true);setResult(null);try{
    const r=await fetch(API+"/ai/query",{method:"POST",headers:{"Content-Type":"application/json",...authHeaders()},body:JSON.stringify({query})});
    const j=await r.json();if(!r.ok)throw new Error(j.error||j.erro||"Assistente indisponível");setResult(j);
  }catch(e){setResult({erro:e.message})}finally{setLoading(false)}}
  return <div><div className="hero"><div><span className="pill">ASSISTENTE</span><h2>Assistente de Pescaria</h2><p>Use RAG/LLM quando o backend de IA estiver configurado. A resposta deve vir com o contexto autorizado.</p></div></div><div className="panel"><form className="securityForm" onSubmit={ask}><textarea rows={5} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Pergunte…"/><button type="submit" disabled={loading}>{loading?"Consultando…":"Perguntar"}</button></form>{result&&<pre className="resultBox">{JSON.stringify(result,null,2)}</pre>}</div></div>
}

function Conditions(){
  const [city,setCity]=useState("Joinville, SC"),[url,setUrl]=useState(""),[loading,setLoading]=useState(false),[result,setResult]=useState(null),[error,setError]=useState(null);
  async function consult(e){e.preventDefault();setLoading(true);setError(null);try{
    if(typeof fetch!=="undefined"){
      const target="https://api.open-meteo.com/v1/forecast?latitude=-26.3045&longitude=-48.8487&current=temperature_2m,relative_humidity_2m,pressure_msl,wind_speed_10m,precipitation&hourly=temperature_2m,pressure_msl,precipitation_probability&forecast_days=2&timezone=auto";
      setUrl(target);
      const r=await fetch(target);const j=await r.json();if(!r.ok)throw new Error("Falha na consulta meteorológica");setResult(j);
    }
  }catch(e){setError(e.message)}finally{setLoading(false)}
  }
  const current=result?.current;
  return <div><div className="hero"><div><span className="pill">CLIMA</span><h2>Condições meteorológicas</h2><p>Consulta operacional de pressão, chuva, vento, temperatura e umidade. A análise de pesca virá por cima desses dados.</p></div></div><div className="panel"><form className="securityForm" onSubmit={consult}><input value={city} onChange={e=>setCity(e.target.value)} placeholder="Local"/><button type="submit">{loading?"Consultando…":"Atualizar condições"}</button></form>{error&&<div className="resultBox">{error}</div>}{current&&<div className="stats"><Stat title="Temperatura" value={current.temperature_2m+" °C"} note="agora"/><Stat title="Pressão" value={current.pressure_msl+" hPa"} note="agora"/><Stat title="Chuva" value={current.precipitation+" mm"} note="agora"/><Stat title="Vento" value={current.wind_speed_10m+" km/h"} note="agora"/></div>}<small>Fonte: Open-Meteo. O campo de local é visual nesta primeira camada; coordenadas serão parametrizadas no próximo ciclo.</small></div>{url&&<div className="panel"><div className="sectionTitle"><h3>Dados brutos</h3><span>forecast</span></div><pre className="resultBox">{JSON.stringify(result,null,2)}</pre></div>}</div>
}

function Tournament(){
  const [name,setName]=useState("Torneio de hoje"),[rows,setRows]=useState(loadTournaments),[species,setSpecies]=useState("traíra"),[length,setLength]=useState(""),[place,setPlace]=useState("");
  function add(e){e.preventDefault();const next=[{id:Date.now(),name,species,length:Number(length)||0,place,date:new Date().toISOString()},...rows];setRows(next);localStorage.setItem("pescaradar.tournaments",JSON.stringify(next));setLength("");setPlace("")}
  function clear(){setRows([]);localStorage.removeItem("pescaradar.tournaments")}
  return <div><div className="hero"><div><span className="pill">TORNEIO</span><h2>Controle de competição</h2><p>Registre capturas e consolide a classificação. A pontuação final pode ser parametrizada por regra.</p></div></div><div className="panel"><form className="fishingForm" onSubmit={add}><input value={name} onChange={e=>setName(e.target.value)} placeholder="Nome do torneio"/><input value={species} onChange={e=>setSpecies(e.target.value)} placeholder="Espécie"/><input type="number" min="0" step="0.1" value={length} onChange={e=>setLength(e.target.value)} placeholder="Comprimento cm"/><input value={place} onChange={e=>setPlace(e.target.value)} placeholder="Local"/><button type="submit">Registrar captura</button><button type="button" onClick={clear}>Limpar torneio</button></form></div><div className="panel"><div className="sectionTitle"><h3>Capturas ({rows.length})</h3><span>protótipo local</span></div>{rows.length?rows.map(r=><div className="row" key={r.id}><div><strong>{r.name}</strong><small>{r.species} · {r.place||"—"} · {formatDate(r.date)}</small></div><span className="status">{r.length} cm</span></div>):<div className="emptyState"><h2>Nenhuma captura</h2><p>Registre a primeira captura do torneio.</p></div>}</div></div>
}
function loadTournaments(){if(typeof window==="undefined")return [];try{return JSON.parse(localStorage.getItem("pescaradar.tournaments")||"[]")}catch(_){return []}}

function History(){
  const diary=loadDiary(),tournaments=loadTournaments();
  return <div><div className="hero"><div><span className="pill">HISTÓRICO</span><h2>Memória da pescaria</h2><p>Agrega registros locais e prepara a comparação futura com condições meteorológicas.</p></div></div><div className="stats"><Stat title="Pescarias" value={diary.length} note="diário local"/><Stat title="Capturas" value={diary.reduce((s,x)=>s+(Number(x.quantity)||0),0)} note="total registrado"/><Stat title="Torneio" value={tournaments.length} note="capturas"/></div><div className="panel"><div className="sectionTitle"><h3>Últimos registros</h3><span>ordenados localmente</span></div>{diary.slice(0,10).map(x=><div className="row" key={x.id}><div><strong>{x.species||"Pescaria"}</strong><small>{x.date} · {x.location||"local"} · {x.bait||"sem isca"}</small></div><span className="status">{x.quantity||0} un.</span></div>)}</div></div>
}

function Analytics(){
  const diary=loadDiary();
  const bySpecies=Object.entries(diary.reduce((a,x)=>{const k=x.species||"Não informado";a[k]=(a[k]||0)+(Number(x.quantity)||0);return a},{}));
  return <div><div className="hero"><div><span className="pill">ANÁLISES</span><h2>Comparativo de técnica e resultado</h2><p>O modelo de análise usa seus próprios registros; não apresenta “certeza” onde ainda não existe amostra suficiente.</p></div></div><div className="stats"><Stat title="Pescarias" value={diary.length} note="amostra atual"/><Stat title="Espécies" value={bySpecies.length} note="grupos"/><Stat title="Capturas" value={diary.reduce((s,x)=>s+(Number(x.quantity)||0),0)} note="total"/></div><div className="panel">{bySpecies.length?bySpecies.map(([species,total])=><div className="row" key={species}><div><strong>{species}</strong><small>Quantidade registrada</small></div><span className="status">{total}</span></div>):<div className="emptyState"><h2>Sem dados suficientes</h2><p>Registre pescarias para começar a comparar espécies, iscas e técnicas.</p></div>}</div></div>
}

function Devices(){
 const [rows,setRows]=useState([]),[error,setError]=useState(null),[loading,setLoading]=useState(false);
 const [form,setForm]=useState({device_id:"",device_type:"simulator",name:"",protocol_version:1});
 async function load(){setLoading(true);setError(null);try{const r=await fetch(API+"/integration/devices",{headers:authHeaders(),cache:"no-store"});const j=await r.json();if(!r.ok)throw new Error(j.erro||"Faça login para acessar dispositivos");setRows(j.devices||[])}catch(e){setError(e.message)}finally{setLoading(false)}}
 useEffect(()=>{load()},[]);
 async function register(e){e.preventDefault();try{const r=await fetch(API+"/integration/devices",{method:"POST",headers:{"Content-Type":"application/json",...authHeaders()},body:JSON.stringify(form)});const j=await r.json();if(!r.ok)throw new Error(j.erro||"Falha ao registrar");setError("Dispositivo criado. Guarde a credencial exibida pela API.");setForm({...form,device_id:"",name:""});load()}catch(e){setError(e.message)}}
 return <div><div className="panel"><div className="sectionTitle"><h3>Registrar dispositivo</h3><span>para barco, celular ou simulador</span></div><form className="fishingForm" onSubmit={register}><input placeholder="device_id" required value={form.device_id} onChange={e=>setForm({...form,device_id:e.target.value})}/><select value={form.device_type} onChange={e=>setForm({...form,device_type:e.target.value})}>{["android","delphi","simulator","arduino","raspberry-pi","pic","ios"].map(x=><option key={x}>{x}</option>)}</select><input placeholder="Nome" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/><button type="submit">Registrar</button></form>{error&&<div className="resultBox">{error}</div>}</div><div className="panel"><div className="sectionTitle"><h3>Dispositivos</h3><button onClick={load}>{loading?"Atualizando…":"Atualizar"}</button></div>{rows.length?rows.map(d=><div className="row" key={d.DEVICE_ID}><div><strong>{d.DEVICE_ID}</strong><small>{d.DEVICE_TYPE} · {d.LAST_SEEN||"sem sinal"} · {validCoords(d)?d.LAST_LATITUDE+", "+d.LAST_LONGITUDE:"sem GPS"}</small></div><span className="status">{d.STATUS==="A"?"ATIVO":"INATIVO"}</span></div>):<div className="emptyState"><h2>Nenhum dispositivo</h2><p>O cadastro é feito no backend protegido.</p></div>}</div></div>
}

function Security({onAuth,authVersion}){
 const [login,setLogin]=useState(""),[password,setPassword]=useState(""),[message,setMessage]=useState(null),[loading,setLoading]=useState(false),[logged,setLogged]=useState(false);
 useEffect(()=>setLogged(typeof window!=="undefined"&&!!sessionStorage.getItem("zynkronyx_token")),[authVersion]);
 async function submit(e){e.preventDefault();setLoading(true);setMessage(null);try{const r=await fetch(API+"/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({login,password})});const j=await r.json();if(!r.ok)throw new Error(j.erro||"Falha no login");sessionStorage.setItem("zynkronyx_token",j.token);setPassword("");setLogged(true);onAuth?.();setMessage("Sessão autenticada.");}catch(e){setMessage(e.message)}finally{setLoading(false)}}
 function logout(){sessionStorage.removeItem("zynkronyx_token");setLogged(false);onAuth?.();setMessage("Sessão encerrada.")}
 return <div><div className="hero"><div><span className="pill">SEGURANÇA</span><h2>{logged?"Sessão autenticada":"Entrar no PescaRadar"}</h2><p>Login necessário para acessar dispositivos, auditoria, LGPD e IA protegidas.</p></div></div><div className="panel">{!logged?<form className="securityForm" onSubmit={submit}><input placeholder="Login" autoComplete="username" required value={login} onChange={e=>setLogin(e.target.value)}/><input type="password" placeholder="Senha" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/><button type="submit" disabled={loading}>{loading?"Autenticando…":"Entrar"}</button></form>:<button onClick={logout}>Encerrar sessão</button>}{message&&<div className="resultBox">{message}</div>}</div></div>
}

function InfoRow({label,value}){return <div className="row"><div><strong>{label}</strong></div><span className="status">{value||"—"}</span></div>}
function Stat({title,value,note}){return <div className="stat"><small>{title}</small><strong>{value}</strong><span>{note}</span></div>}
function validCoords(d){const lat=Number(d?.LAST_LATITUDE),lon=Number(d?.LAST_LONGITUDE);return Number.isFinite(lat)&&Number.isFinite(lon)&&lat>=-90&&lat<=90&&lon>=-180&&lon<=180}
function statusLabel(){return "online"}
function formatDate(v){if(!v)return "—";try{return new Date(v).toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"})}catch(_){return String(v)}}
