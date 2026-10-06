const insightRepo=require('./insight.repository');
const recommendationRepo=require('./recommendation.repository');
const audit=require('../services/security.audit.service');

function classify(insight){
 const v=insight.variation==null?null:Number(insight.variation);
 if(insight.type==='NEGATIVE_TREND') return {type:'RISK',severity:'MEDIUM',action:'INVESTIGATE_DECLINE',reason:'A métrica apresentou queda relevante em relação ao período comparável.'};
 if(insight.type==='POSITIVE_TREND') return {type:'OPPORTUNITY',severity:'INFO',action:'ANALYZE_GROWTH_DRIVER',reason:'A métrica apresentou crescimento relevante em relação ao período comparável.'};
 if(insight.type==='NEW_BASELINE') return {type:'REVIEW',severity:'LOW',action:'ESTABLISH_BASELINE',reason:'Não existe base comparável suficiente para uma variação percentual.'};
 return {type:'REVIEW',severity:'LOW',action:'MONITOR_METRIC',reason:v==null?'Não há variação percentual disponível.':'A variação está dentro da faixa estável definida pelo Insight Engine.'};
}

exports.propose=async(req,insightId)=>{
 const tenantId=req.tenant.id;
 const insight=await insightRepo.getInsightById(tenantId,Number(insightId));
 if(!insight){const e=new Error('ANALYTICS_INSIGHT_NOT_FOUND');e.status=404;throw e;}
 const existing=await recommendationRepo.getByInsight(tenantId,insight.id);
 if(existing)return {recommendation:existing,idempotent:true};
 const c=classify(insight);
 const recommendation=await recommendationRepo.insert({tenantId,insightId:insight.id,type:c.type,severity:c.severity,action:c.action,evidenceCoverage:insight.evidence_coverage,rationale:{reason:c.reason,metric:insight.metric,period_start:insight.period_start,period_end:insight.period_end,variation:insight.variation,methodology:insight.methodology,evidence:insight.evidence||{}}});
 await audit.record({tenantId,action:'ANALYTICS_RECOMMENDATION_PROPOSED',result:'PROPOSED',correlationId:req.correlationId,metadata:{insight_id:insight.id,recommendation_id:recommendation.id,type:c.type,action:c.action}});
 return {recommendation,idempotent:false};
};
exports.list=(tenantId,query)=>recommendationRepo.list(tenantId,query||{});
exports.get=(tenantId,id)=>recommendationRepo.getById(tenantId,Number(id));
exports.approve=async(req,id)=>{const result=await recommendationRepo.approve(req.tenant.id,Number(id),Number(req.user?.id||0));if(!result){const e=new Error('ANALYTICS_RECOMMENDATION_NOT_APPROVABLE');e.status=409;throw e;}await audit.record({tenantId:req.tenant.id,action:'ANALYTICS_RECOMMENDATION_APPROVED',result:'ALLOWED',correlationId:req.correlationId,metadata:{recommendation_id:Number(id),approved_by:Number(req.user?.id||0)}});return result;};
exports.complete=async(req,id)=>{const result=await recommendationRepo.complete(req.tenant.id,Number(id));if(!result){const e=new Error('ANALYTICS_RECOMMENDATION_NOT_APPROVED');e.status=409;throw e;}await audit.record({tenantId:req.tenant.id,action:'ANALYTICS_RECOMMENDATION_COMPLETED',result:'ALLOWED',correlationId:req.correlationId,metadata:{recommendation_id:Number(id)}});return result;};
exports.classify=classify;
