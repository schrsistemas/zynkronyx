const analytics=require('../analytics/analytics.service');
const forecast=require('../analytics/forecast.service');
const anomaly=require('../analytics/anomaly.service');
const insight=require('../analytics/insight.repository');

const TOOLS=Object.freeze({
  analytics_query:{
    name:'analytics_query',
    description:'Consulta uma métrica registrada do tenant sem permitir SQL arbitrário.',
    inputSchema:{type:'object',required:['metric','period'],properties:{metric:{type:'string'},period:{type:'string'},dimensions:{type:'array',items:{type:'string'}}}},
    requires:['CAN_ANALYZE']
  },
  analytics_forecast:{
    name:'analytics_forecast',
    description:'Gera baseline determinístico de forecast mensal para uma métrica registrada.',
    inputSchema:{type:'object',required:['metric'],properties:{metric:{type:'string'},period:{type:'string'},horizon:{type:'integer'}}},
    requires:['CAN_ANALYZE']
  },
  analytics_anomaly:{
    name:'analytics_anomaly',
    description:'Executa detecção estatística V1 sobre série mensal autorizada.',
    inputSchema:{type:'object',required:['metric'],properties:{metric:{type:'string'},period:{type:'string'},zThreshold:{type:'number'}}},
    requires:['CAN_ANALYZE']
  },
  analytics_insight:{
    name:'analytics_insight',
    description:'Obtém um insight analítico persistido do tenant.',
    inputSchema:{type:'object',required:['insight_id'],properties:{insight_id:{type:'integer'}}},
    requires:['CAN_ANALYZE']
  }
});

function listTools(){return Object.values(TOOLS);}
function assertPermission(req,tool){const permissions=new Set((req.user?.permissions||req.user?.scopes||[]).map(String));const required=TOOLS[tool]?.requires||[];if(required.length&&!required.some(p=>permissions.has(p))){const e=new Error('MCP_PERMISSION_DENIED');e.code=e.message;e.status=403;throw e;}}
async function call(req,name,args={}){
 if(!TOOLS[name]){const e=new Error('MCP_TOOL_NOT_FOUND');e.code=e.message;e.status=404;throw e;}
 assertPermission(req,name);
 const tenantId=req.tenant.id;
 if(name==='analytics_query')return analytics.queryMetric(tenantId,args);
 if(name==='analytics_forecast')return forecast.forecastMetric(tenantId,args);
 if(name==='analytics_anomaly')return anomaly.analyzeMetric(tenantId,args);
 if(name==='analytics_insight')return insight.getInsightById(tenantId,Number(args.insight_id));
}
module.exports={TOOLS,listTools,call};
