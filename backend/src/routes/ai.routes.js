const express = require('express');
const ai = require('../services/ai.service');
const audit = require('../services/ai.audit.service');
const evaluation = require('../services/ai.eval.service');
const prompts = require('../services/ai.prompt.service');
const releases = require('../services/ai.release.service');
const refinement = require('../services/ai.refinement.service');
const router = express.Router();

function requireAiGovernance(req,res,next){
  const configured=String(process.env.AI_GOVERNANCE_USERS||'').split(',').map((v)=>v.trim()).filter(Boolean);
  const userId=String(req.user?.id||'');
  if(!configured.length) return res.status(503).json({ok:false,error:'AI_GOVERNANCE_NOT_CONFIGURED',correlation_id:req.correlationId});
  if(!configured.includes(userId)) return res.status(403).json({ok:false,error:'AI_GOVERNANCE_FORBIDDEN',correlation_id:req.correlationId});
  return next();
}


router.get('/status', (req, res) => res.json({ ok: true, service: 'zynkronyx-ai', ...ai.status(req) }));





router.get('/releases',async(req,res)=>{try{return res.json({ok:true,correlation_id:req.correlationId,results:await releases.list(req.tenant.id)});}catch(error){return res.status(error.status||500).json({ok:false,error:error.code||error.message||'AI_RELEASES_FAILED',correlation_id:req.correlationId});}});
router.post('/releases',requireAiGovernance,async(req,res)=>{try{const promptVersionId=Number(req.body?.prompt_version_id);if(!Number.isInteger(promptVersionId)||promptVersionId<1)throw Object.assign(new Error('INVALID_PROMPT_VERSION_ID'),{status:400});const release=await releases.create({tenantId:req.tenant.id,promptVersionId,baselineVersionId:req.body?.baseline_version_id,trafficPercent:req.body?.traffic_percent,mode:'CANARY'});return res.status(201).json({ok:true,id:release.id,gate:release.gate,correlation_id:req.correlationId,status:'RUNNING'});}catch(error){return res.status(error.status||500).json({ok:false,error:error.code||error.message||'AI_RELEASE_CREATE_FAILED',correlation_id:req.correlationId});}});
router.post('/releases/:id/rollback',requireAiGovernance,async(req,res)=>{try{return res.json({ok:true,correlation_id:req.correlationId,...await releases.finish(req.tenant.id,Number(req.params.id),'ROLLED_BACK',{reason:req.body?.reason||'manual',reviewed_by:req.user?.id,correlation_id:req.correlationId})});}catch(error){return res.status(error.status||500).json({ok:false,error:error.code||error.message||'AI_RELEASE_ROLLBACK_FAILED',correlation_id:req.correlationId});}});
router.post('/releases/:id/finish',requireAiGovernance,async(req,res)=>{try{const status=String(req.body?.status||'PASSED').trim().toUpperCase();if(!['PASSED','FAILED'].includes(status))return res.status(400).json({ok:false,error:'INVALID_RELEASE_FINISH_STATUS',correlation_id:req.correlationId});return res.json({ok:true,correlation_id:req.correlationId,...await releases.finish(req.tenant.id,Number(req.params.id),status,{...req.body?.result,reviewed_by:req.user?.id,correlation_id:req.correlationId})});}catch(error){return res.status(error.status||500).json({ok:false,error:error.code||error.message||'AI_RELEASE_FINISH_FAILED',correlation_id:req.correlationId});}});
router.get('/prompts/:id/promotion-history',async(req,res)=>{try{return res.json({ok:true,correlation_id:req.correlationId,results:await prompts.promotionHistory(req.tenant.id,Number(req.params.id),req.query.limit)});}catch(error){return res.status(error.status||500).json({ok:false,error:error.code||error.message||'AI_PROMOTION_HISTORY_FAILED',correlation_id:req.correlationId});}});
router.get('/prompts',async(req,res)=>{try{return res.json({ok:true,correlation_id:req.correlationId,results:await prompts.list(req.tenant.id)});}catch(error){return res.status(error.status||500).json({ok:false,error:error.code||error.message||'AI_PROMPTS_FAILED',correlation_id:req.correlationId});}});
router.post('/prompts',requireAiGovernance,async(req,res)=>{try{const version=Number(req.body?.version_no);if(!Number.isInteger(version)||version<1)throw Object.assign(new Error('INVALID_PROMPT_VERSION'),{status:400});const id=await prompts.create({tenantId:req.tenant.id,versionNo:version,name:String(req.body?.name||'prompt'),prompt:req.body?.prompt||{},status:'DRAFT'});return res.status(201).json({ok:true,id,correlation_id:req.correlationId});}catch(error){return res.status(error.status||500).json({ok:false,error:error.code||error.message||'AI_PROMPT_CREATE_FAILED',correlation_id:req.correlationId});}});
router.post('/prompts/:id/promote',requireAiGovernance,async(req,res)=>{try{return res.json({ok:true,correlation_id:req.correlationId,...await prompts.promote(req.tenant.id,Number(req.params.id),{decidedBy:req.user?.id,correlationId:req.correlationId,reason:req.body?.reason})});}catch(error){return res.status(error.status||500).json({ok:false,error:error.code||error.message||'AI_PROMPT_PROMOTE_FAILED',correlation_id:req.correlationId});}});
router.get('/eval/cases', async (req,res)=>{try{return res.json({ok:true,correlation_id:req.correlationId,results:await evaluation.listCases(req.tenant.id)});}catch(error){return res.status(error.status||500).json({ok:false,error:error.code||error.message||'AI_EVAL_CASES_FAILED',correlation_id:req.correlationId});}});
router.get('/eval/runs', async (req,res)=>{try{return res.json({ok:true,correlation_id:req.correlationId,results:await evaluation.listRuns(req.tenant.id,{limit:req.query.limit,promptVersionId:req.query.prompt_version_id})});}catch(error){return res.status(error.status||500).json({ok:false,error:error.code||error.message||'AI_EVAL_RUNS_FAILED',correlation_id:req.correlationId});}});
router.post('/eval/run', requireAiGovernance, async (req,res)=>{try{return res.json({ok:true,correlation_id:req.correlationId,...await evaluation.runAll(req,{topK:req.body?.top_k,promptVersionId:req.body?.prompt_version_id})});}catch(error){return res.status(error.status||500).json({ok:false,error:error.code||error.message||'AI_EVAL_RUN_FAILED',correlation_id:req.correlationId});}});
router.post('/feedback', async (req,res)=>{try{const auditId=Number(req.body?.audit_id);const type=String(req.body?.feedback_type||'HUMAN').trim().toUpperCase();const rating=req.body?.rating==null?null:Number(req.body.rating);if(!Number.isInteger(auditId)||auditId<1)return res.status(400).json({ok:false,error:'INVALID_AUDIT_ID',correlation_id:req.correlationId});if(!['HUMAN','AUTOMATED'].includes(type))return res.status(400).json({ok:false,error:'INVALID_FEEDBACK_TYPE',correlation_id:req.correlationId});if(rating!=null&&(!Number.isFinite(rating)||rating<0||rating>1))return res.status(400).json({ok:false,error:'INVALID_FEEDBACK_RATING',correlation_id:req.correlationId});const result=await audit.feedback({tenantId:req.tenant.id,auditId,feedbackType:type,label:req.body?.label, rating,comment:req.body?.comment,createdBy:req.user?.id,idempotencyKey:req.get('Idempotency-Key')||req.body?.idempotency_key});return res.status(result.idempotent?200:201).json({ok:true,...result,correlation_id:req.correlationId});}catch(error){return res.status(error.status||500).json({ok:false,error:error.code||error.message||'AI_FEEDBACK_FAILED',correlation_id:req.correlationId});}});
router.get('/feedback/summary', async (req,res)=>{try{return res.json({ok:true,correlation_id:req.correlationId,results:await audit.feedbackSummary(req.tenant?.id,req.query.limit)});}catch(error){return res.status(error.status||500).json({ok:false,error:error.code||error.message||'AI_FEEDBACK_SUMMARY_FAILED',correlation_id:req.correlationId});}});
router.get('/refinement', async (req,res)=>{try{return res.json({ok:true,correlation_id:req.correlationId,results:await refinement.list(req.tenant.id,req.query.limit)});}catch(error){return res.status(error.status||500).json({ok:false,error:error.code||error.message||'AI_REFINEMENT_LIST_FAILED',correlation_id:req.correlationId});}});
router.post('/refinement', requireAiGovernance, async (req,res)=>{try{const item=await refinement.create({tenantId:req.tenant.id,auditId:req.body?.audit_id,promptVersionId:req.body?.prompt_version_id,feedbackId:req.body?.feedback_id,type:req.body?.type,source:req.body?.source,title:req.body?.title,rationale:req.body?.rationale,suggestedChange:req.body?.suggested_change,createdBy:req.user?.id});return res.status(201).json({ok:true,correlation_id:req.correlationId,item});}catch(error){return res.status(error.status||500).json({ok:false,error:error.code||error.message||'AI_REFINEMENT_CREATE_FAILED',correlation_id:req.correlationId});}});
router.post('/refinement/:id/review', requireAiGovernance, async (req,res)=>{try{return res.json({ok:true,correlation_id:req.correlationId,item:await refinement.review(req.tenant.id,Number(req.params.id),{status:req.body?.status,reviewedBy:req.user?.id})});}catch(error){return res.status(error.status||500).json({ok:false,error:error.code||error.message||'AI_REFINEMENT_REVIEW_FAILED',correlation_id:req.correlationId});}});
router.post('/refinement/:id/accept', requireAiGovernance, async (req,res)=>{try{return res.json({ok:true,correlation_id:req.correlationId,...await refinement.accept(req.tenant.id,Number(req.params.id),{name:req.body?.name,reviewedBy:req.user?.id,idempotencyKey:req.get('Idempotency-Key')||req.body?.idempotency_key})});}catch(error){return res.status(error.status||500).json({ok:false,error:error.code||error.message||'AI_REFINEMENT_ACCEPT_FAILED',correlation_id:req.correlationId});}});
router.get('/audit', async (req,res)=>{try{const rows=await audit.recent(req.tenant?.id,req.query.limit);return res.json({ok:true,correlation_id:req.correlationId,results:rows});}catch(error){return res.status(error.status||500).json({ok:false,error:error.code||error.message||'AI_AUDIT_FAILED',correlation_id:req.correlationId});}});
router.post('/query', async (req, res) => {
  try { const result = await ai.query(req.body, req); return res.json({ ok: true, correlation_id: req.correlationId, ...result }); }
  catch (error) { return res.status(error.status || 500).json({ ok: false, error: error.code || error.message || 'AI_QUERY_FAILED', correlation_id: req.correlationId }); }
});

async function ingest(req, res) {
  try {
    const result = await ai.rag.ingest(req, req.body);
    return res.status(result.idempotent ? 200 : 202).json({ ok: true, correlation_id: req.correlationId, ...result });
  } catch (error) {
    return res.status(error.status || 500).json({ ok: false, error: error.code || error.message || 'RAG_DOCUMENT_FAILED', correlation_id: req.correlationId });
  }
}
router.post('/rag/documents', ingest);
router.post('/rag/documents/preview', async (req,res)=>{try{return res.json({ok:true,correlation_id:req.correlationId,...await ai.rag.preview(req.body)});}catch(error){return res.status(error.status||500).json({ok:false,error:error.code||error.message||'RAG_PREVIEW_FAILED',correlation_id:req.correlationId});}});

router.post('/rag/retrieve', async (req, res) => {
  try { const result = await ai.rag.retrieve(req, req.body); return res.json({ ok: true, correlation_id: req.correlationId, ...result }); }
  catch (error) { return res.status(error.status || 500).json({ ok: false, error: error.code || error.message || 'RAG_RETRIEVAL_FAILED', correlation_id: req.correlationId }); }
});
module.exports = router;
