const analytics=require('../analytics/analytics.service');
const forecast=require('../analytics/forecast.service');
const anomaly=require('../analytics/anomaly.service');
const insight=require('../analytics/insight.repository');
const contracts=require('./mcp.contracts.service');
const audit=require('./mcp.audit.service');

const TOOLS=Object.freeze({
  analytics_query:{
    name:'analytics_query',
    description:'Consulta uma métrica registrada do tenant sem permitir SQL arbitrário.',
    inputSchema:contracts.getContract('analytics_query').inputSchema,
    requires:['CAN_ANALYZE']
  },
  analytics_forecast:{
    name:'analytics_forecast',
    description:'Gera baseline determinístico de forecast mensal para uma métrica registrada.',
    inputSchema:contracts.getContract('analytics_forecast').inputSchema,
    requires:['CAN_ANALYZE']
  },
  analytics_anomaly:{
    name:'analytics_anomaly',
    description:'Executa detecção estatística V1 sobre série mensal autorizada.',
    inputSchema:contracts.getContract('analytics_anomaly').inputSchema,
    requires:['CAN_ANALYZE']
  },
  analytics_insight:{
    name:'analytics_insight',
    description:'Obtém um insight analítico persistido do tenant.',
    inputSchema:contracts.getContract('analytics_insight').inputSchema,
    requires:['CAN_ANALYZE']
  }
});

function listTools(){return Object.values(TOOLS).map(tool=>({...tool,contract:contracts.getContract(tool.name)}));}
function assertPermission(req,tool){
 const permissions=new Set((req.user?.permissions||req.user?.scopes||[]).map(String));
 const required=TOOLS[tool]?.requires||[];
 if(required.length&&!required.some(p=>permissions.has(p))){const e=new Error('MCP_PERMISSION_DENIED');e.code=e.message;e.status=403;throw e;}
}
async function call(req,name,args={}) {
 const started=Date.now(); let contract=null;
 try{
  if(!TOOLS[name]){const e=new Error('MCP_TOOL_NOT_FOUND');e.code=e.message;e.status=404;throw e;}
  contract=contracts.getContract(name);
  if(contract.tenantRequired&&!req?.tenant?.id){const e=new Error('TENANT_CONTEXT_REQUIRED');e.code=e.message;e.status=401;throw e;}
  assertPermission(req,name);
  if(contract.auditRequired&&!req?.correlationId){const e=new Error('MCP_CORRELATION_ID_REQUIRED');e.code=e.message;e.status=400;throw e;}
  contracts.validateArgs(name,args);
  const tenantId=req.tenant.id;
  const operation=name==='analytics_query'?analytics.queryMetric(tenantId,args):name==='analytics_forecast'?forecast.forecastMetric(tenantId,args):name==='analytics_anomaly'?anomaly.analyzeMetric(tenantId,args):name==='analytics_insight'?insight.getInsightById(tenantId,Number(args.insight_id)):null;
  if(!operation){const e=new Error('MCP_TOOL_NOT_IMPLEMENTED');e.code=e.message;e.status=501;throw e;}
  let timer;const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{const e=new Error('MCP_TOOL_TIMEOUT');e.code=e.message;e.status=504;reject(e);},Number(contract.timeoutMs||5000));});
  let result;try{result=await Promise.race([operation,timeout]);}finally{clearTimeout(timer);}
  if(contract.outputSchema?.type==='object'&&(result==null||typeof result!=='object'||Array.isArray(result))){const e=new Error('MCP_OUTPUT_SCHEMA_INVALID');e.code=e.message;e.status=502;throw e;}
  await audit.record({tenantId,correlationId:req.correlationId,toolName:name,contractVersion:contract.version,sideEffect:contract.sideEffect,status:'SUCCESS',input:args,output:result,latencyMs:Date.now()-started});
  return result;
 }catch(error){
  if(req?.tenant?.id&&req?.correlationId&&contract?.auditRequired) await audit.record({tenantId:req.tenant.id,correlationId:req.correlationId,toolName:name,contractVersion:contract.version,sideEffect:contract.sideEffect,status:'FAILED',input:args,errorCode:error.code||error.message,latencyMs:Date.now()-started});
  throw error;
 }
}
module.exports={TOOLS,listTools,call};
