import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "https://mute-grass-9428.schrsistemas.workers.dev";
const TYPES = ["arduino","raspberry-pi","pic","android","ios","delphi","simulator"];

function headers() {
  if (typeof window === "undefined") return {"Content-Type":"application/json"};
  const token = sessionStorage.getItem("zynkronyx_token");
  const key = process.env.NEXT_PUBLIC_TENANT_API_KEY;
  return {"Content-Type":"application/json", ...(key ? {"x-api-key":key}:{}), ...(token ? {Authorization:"Bearer "+token}: {})};
}

export default function IntegrationsCenter() {
  const [form,setForm] = useState({
    device_id:"", device_type:"simulator", protocol_version:1, operation:"TEST_EVENT", sequence:1,
    correlation_id:"", latitude:"", longitude:"",
    payload:JSON.stringify({source:"zynkronyx-simulator",message:"integration test"},null,2)
  });
  const [credential,setCredential] = useState("");
  const [result,setResult] = useState(null);
  const [loading,setLoading] = useState(false);

  function set(name,value){setForm(f=>({...f,[name]:value}))}

  async function send(e) {
    e.preventDefault(); setLoading(true); setResult(null);
    try {
      let payload;
      try { payload=JSON.parse(form.payload); } catch { throw new Error("Payload JSON inválido"); }
      const body={
        event_id: crypto.randomUUID(),
        device_id:form.device_id,
        device_type:form.device_type,
        operation:form.operation,
        sequence:Number(form.sequence)||1,
        payload,
        ...(form.correlation_id?{correlation_id:form.correlation_id}:{}),
        ...(form.latitude!==""&&form.longitude!==""?{location:{latitude:Number(form.latitude),longitude:Number(form.longitude)}}:{})
      };
      const r=await fetch(API+"/integration/events",{
        method:"POST",
        headers:{...headers(),"x-device-id":form.device_id,"x-device-credential":credential},
        body:JSON.stringify(body)
      });
      const text=await r.text();
      let json; try {json=JSON.parse(text)} catch {json={raw:text}};
      if(!r.ok) throw new Error(json.erro||"HTTP "+r.status);
      setResult({ok:true,status:r.status,response:json});
      set("sequence",(Number(form.sequence)||1)+1);
    } catch(error) { setResult({ok:false,error:error.message}); }
    finally {setLoading(false);}
  }

  return <div>
    <div className="hero">
      <div><span className="pill">INTEGRATIONS</span><h2>Device Integration Center</h2>
      <p>Teste o contrato real de integração sem inventar eventos. O Simulator envia HTTPS/JSON para a API e o resultado aparece na auditoria.</p></div>
      <div className="heroVersion">7<br/><small>device profiles</small></div>
    </div>

    <div className="integrationGrid">
      {TYPES.map(type=><div className="integrationCard" key={type}><strong>{type}</strong><small>{type==="simulator"?"HTTP/JSON test harness":"HTTPS/JSON contract"}</small><span>protocol v1</span></div>)}
    </div>

    <div className="panel">
      <div className="sectionTitle"><h3>Simulator — evento real</h3><span>sem dados sintéticos de sucesso</span></div>
      <form className="simulatorForm" onSubmit={send}>
        <input value={form.device_id} onChange={e=>set("device_id",e.target.value)} placeholder="device_id registrado" required/>
        <input value={credential} onChange={e=>setCredential(e.target.value)} placeholder="device credential" type="password" required/>
        <select value={form.device_type} onChange={e=>set("device_type",e.target.value)}>{TYPES.map(x=><option key={x}>{x}</option>)}</select>\n        <input value={form.protocol_version} onChange={e=>set("protocol_version",e.target.value)} type="number" min="1" placeholder="protocol version"/>
        <input value={form.operation} onChange={e=>set("operation",e.target.value)} placeholder="operation" required/>
        <input value={form.sequence} onChange={e=>set("sequence",e.target.value)} type="number" min="1" placeholder="sequence"/>
        <input value={form.correlation_id} onChange={e=>set("correlation_id",e.target.value)} placeholder="correlation_id (opcional)"/>
        <input value={form.latitude} onChange={e=>set("latitude",e.target.value)} type="number" step="0.000001" placeholder="latitude (opcional)"/>
        <input value={form.longitude} onChange={e=>set("longitude",e.target.value)} type="number" step="0.000001" placeholder="longitude (opcional)"/>
        <textarea className="jsonEditor" value={form.payload} onChange={e=>set("payload",e.target.value)} rows={9}/>
        <button type="submit" disabled={loading}>{loading?"Enviando…":"Enviar evento real"}</button>
      </form>
      {result && <pre className="resultBox">{JSON.stringify(result,null,2)}</pre>}
    </div>

    <div className="panel">
      <div className="sectionTitle"><h3>Protocolos</h3><span>contrato documentado</span></div>
      {TYPES.map(type=><div className="row" key={type}><div><strong>{type}</strong><small>{protocol(type)}</small></div><span className="status">DOCUMENTED</span></div>)}
    </div>
  </div>;
}

function protocol(type) {
  if(type==="pic") return "UART / RS-485 / CAN → gateway → HTTPS/JSON";
  if(type==="arduino") return "HTTPS ou MQTT → gateway → HTTPS/JSON";
  if(type==="raspberry-pi") return "HTTPS ou MQTT → API";
  if(type==="android"||type==="ios") return "HTTPS/JSON com fila offline e retry";
  if(type==="delphi") return "HTTPS/JSON para integração com aplicações desktop";
  return "HTTP/HTTPS → /integration/events; idempotência por event_id";
}
