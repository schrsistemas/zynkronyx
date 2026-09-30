const analytics=require('../analytics/analytics.service');
const forecast=require('../analytics/forecast.service');
const anomaly=require('../analytics/anomaly.service');
const insight=require('../analytics/insight.repository');
const contracts=require('./mcp.contracts.service');

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
async function call(req,name,args={}){
 if(!TOOLS[name]){const e=new Error('MCP_TOOL_NOT_FOUND');e.code=e.message;e.status=404;throw e;}
 const contract=contracts.getContract(name);
 if(contract.tenantRequired&&!req?.tenant?.id){const e=new Error('TENANT_CONTEXT_REQUIRED');e.code=e.message;e.status=401;throw e;}
 assertPermission(req,name);
 if(contract.auditRequired&&!req?.correlationId){const e=new Error('MCP_CORRELATION_ID_REQUIRED');e.code=e.message;e.status=400;throw e;}
 contracts.validateArgs(name,args);
 const tenantId=req.tenant.id;
 if(name==='analytics_query')return analytics.queryMetric(tenantId,args);
 if(name==='analytics_forecast')return forecast.forecastMetric(tenantId,args);
 if(name==='analytics_anomaly')return anomaly.analyzeMetric(tenantId,args);
 if(name==='analytics_insight')return insight.getInsightById(tenantId,Number(args.insight_id));
}
module.exports={TOOLS,listTools,call};
