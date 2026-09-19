const express = require('express');
const ai = require('../services/ai.service');
const audit = require('../services/ai.audit.service');
const evaluation = require('../services/ai.eval.service');
const prompts = require('../services/ai.prompt.service');
const releases = require('../services/ai.release.service');
const router = express.Router();

function requireAiGovernance(req,res,next){
  const configured=String(process.env.AI_GOVERNANCE_USERS||'').split(',').map((v)=>v.trim()).filter(Boolean);
  const userId=String(req.user?.id||'');
  if(configured.length && !configured.includes(userId)) return res.status(403).json({ok:false,error:'AI_GOVERNANCE_FORBIDDEN',correlation_id:req.correlationId});
  if(!req.user?.id) return res.status(403).json({ok:false,error:'AI_GOVERNANCE_FORBIDDEN',correlation_id:req.correlationId});
  return next();
}


router.get('/status', (req, res) => res.json({ ok: true, service: 'zynkronyx-ai', ...ai.status(req) }));





router.get('/releases',async(req,res)=>{try{return res.json({ok:true,correlation_id:req.correlationId,results:await releases.list(req.tenant.id)});}catch(error){return res.status(error.status||500).json({ok:false,error:error.code||error.message||'AI_RELEASES_FAILED',correlation_id:req.correlationId});}});
router.post('/releases',requireAiGovernance,async(req,res)=>{try{const promptVersionId=Number(req.body?.prompt_version_id);if(!Number.isInteger(promptVersionId)||promptVersionId<1)throw Object.assign(new Error('INVALID_PROMPT_VERSION_ID'),{status:400});const id=await releases.create({tenantId:req.tenant.id,promptVersionId,baselineVersionId:req.body?.baseline_version_id,trafficPercent:req.body?.traffic_percent,mode:'CANARY'});return res.status(201).json({ok:true,id,correlation_id:req.correlationId,status:'RUNNING'});}catch(error){return res.status(error.status||500).json({ok:false,error:error.code||error.message||'AI_RELEASE_CREATE_FAILED',correlation_id:req.correlationId});}});
router.post('/releases/:id/rollback',requireAiGovernance,async(req,res)=>{try{return res.json({ok:true,correlation_id:req.correlationId,...await releases.finish(req.tenant.id,Number(req.params.id),'ROLLED_BACK',{reason:'manual'})});}catch(error){return res.status(error.status||500).json({ok:false,error:error.code||error.message||'AI_RELEASE_ROLLBACK_FAILED',correlation_id:req.correlationId});}});
router.get('/prompts',async(req,res)=>{try{return res.json({ok:true,correlation_id:req.correlationId,results:await prompts.list(req.tenant.id)});}catch(error){return res.status(error.status||500).json({ok:false,error:error.code||error.message||'AI_PROMPTS_FAILED',correlation_id:req.correlationId});}});
router.post('/prompts',requireAiGovernance,async(req,res)=>{try{const version=Number(req.body?.version_no);if(!Number.isInteger(version)||version<1)throw Object.assign(new Error('INVALID_PROMPT_VERSION'),{status:400});const id=await prompts.create({tenantId:req.tenant.id,versionNo:version,name:String(req.body?.name||'prompt'),prompt:req.body?.prompt||{},status:'DRAFT'});return res.status(201).json({ok:true,id,correlation_id:req.correlationId});}catch(error){return res.status(error.status||500).json({ok:false,error:error.code||error.message||'AI_PROMPT_CREATE_FAILED',correlation_id:req.correlationId});}});
router.post('/prompts/:id/promote',requireAiGovernance,async(req,res)=>{try{const gate=await prompts.promotionGate(req.tenant.id,Number(req.params.id));return res.json({ok:true,correlation_id:req.correlationId,gate,...await prompts.promote(req.tenant.id,Number(req.params.id))});}catch(error){return res.status(error.status||500).json({ok:false,error:error.code||error.message||'AI_PROMPT_PROMOTE_FAILED',correlation_id:req.correlationId});}});
router.get('/eval/cases', async (req,res)=>{try{return res.json({ok:true,correlation_id:req.correlationId,results:await evaluation.listCases(req.tenant.id)});}catch(error){return res.status(error.status||500).json({ok:false,error:error.code||error.message||'AI_EVAL_CASES_FAILED',correlation_id:req.correlationId});}});
router.post('/eval/run', requireAiGovernance, async (req,res)=>{try{return res.json({ok:true,correlation_id:req.correlationId,...await evaluation.runAll(req,{topK:req.body?.top_k,promptVersionId:req.body?.prompt_version_id})});}catch(error){return res.status(error.status||500).json({ok:false,error:error.code||error.message||'AI_EVAL_RUN_FAILED',correlation_id:req.correlationId});}});
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
router.post('/rag/documents/preview', async (req,res)=>{try{return res.json({ok:true,correlation_id:req.correlationId,...await ai.rag.preview(req.body);});}catch(error){return res.status(error.status||500).json({ok:false,error:error.code||error.message||'RAG_PREVIEW_FAILED',correlation_id:req.correlationId});}});

router.post('/rag/retrieve', async (req, res) => {
  try { const result = await ai.rag.retrieve(req, req.body); return res.json({ ok: true, correlation_id: req.correlationId, ...result }); }
  catch (error) { return res.status(error.status || 500).json({ ok: false, error: error.code || error.message || 'RAG_RETRIEVAL_FAILED', correlation_id: req.correlationId }); }
});
module.exports = router;
