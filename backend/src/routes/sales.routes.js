const express=require('express');
const sales=require('../services/sales.service');
const router=express.Router();
function requireSalesApproval(req,res,next){
 const configured=String(process.env.SALES_APPROVAL_USERS||'').split(',').map(v=>v.trim()).filter(Boolean);
 const userId=String(req.user?.id||'');
 if(!configured.length)return res.status(503).json({ok:false,error:'SALES_APPROVAL_NOT_CONFIGURED',correlation_id:req.correlationId});
 if(!configured.includes(userId))return res.status(403).json({ok:false,error:'SALES_APPROVAL_FORBIDDEN',correlation_id:req.correlationId});
 return next();
}

router.get('/leads',async(req,res)=>{try{return res.json({ok:true,results:await sales.listLeads(req.tenant.id,req.query.limit)});}catch(e){return res.status(e.status||500).json({ok:false,error:e.code||e.message,correlation_id:req.correlationId});}});
router.post('/leads',async(req,res)=>{try{return res.status(201).json({ok:true,correlation_id:req.correlationId,...await sales.createLead(req,req.body||{})});}catch(e){return res.status(e.status||500).json({ok:false,error:e.code||e.message,correlation_id:req.correlationId});}});
router.post('/leads/:id/score',async(req,res)=>{try{return res.json({ok:true,correlation_id:req.correlationId,lead:await sales.scoreLead(req,req.params.id,req.body||{})});}catch(e){return res.status(e.status||500).json({ok:false,error:e.code||e.message,correlation_id:req.correlationId});}});

router.get('/opportunities',async(req,res)=>{try{return res.json({ok:true,results:await sales.listOpportunities(req.tenant.id)});}catch(e){return res.status(e.status||500).json({ok:false,error:e.code||e.message,correlation_id:req.correlationId});}});
router.post('/opportunities',async(req,res)=>{try{return res.status(201).json({ok:true,correlation_id:req.correlationId,opportunity:await sales.createOpportunity(req,req.body||{})});}catch(e){return res.status(e.status||500).json({ok:false,error:e.code||e.message,correlation_id:req.correlationId});}});

router.get('/opportunities/:id/activities',async(req,res)=>{try{return res.json({ok:true,results:await require('../services/sales.repository').listActivities(req.tenant.id,Number(req.params.id))});}catch(e){return res.status(e.status||500).json({ok:false,error:e.code||e.message,correlation_id:req.correlationId});}});
router.post('/opportunities/:id/activities',async(req,res)=>{try{return res.status(201).json({ok:true,correlation_id:req.correlationId,...await sales.createActivity(req,req.params.id,req.body||{})});}catch(e){return res.status(e.status||500).json({ok:false,error:e.code||e.message,correlation_id:req.correlationId});}});
router.post('/opportunities/:id/next-action',async(req,res)=>{try{return res.status(201).json({ok:true,correlation_id:req.correlationId,recommendation:await sales.proposeNextAction(req,req.params.id)});}catch(e){return res.status(e.status||500).json({ok:false,error:e.code||e.message,correlation_id:req.correlationId});}});
router.get('/opportunities/:id/next-actions',async(req,res)=>{try{return res.json({ok:true,results:await require('../services/sales.repository').listNextActions(req.tenant.id,Number(req.params.id))});}catch(e){return res.status(e.status||500).json({ok:false,error:e.code||e.message,correlation_id:req.correlationId});}});
router.post('/next-actions/:id/approve',requireSalesApproval,async(req,res)=>{try{return res.json({ok:true,correlation_id:req.correlationId,action:await sales.approveNextAction(req,req.params.id)});}catch(e){return res.status(e.status||500).json({ok:false,error:e.code||e.message,correlation_id:req.correlationId});}});
router.post('/next-actions/:id/complete',requireSalesApproval,async(req,res)=>{try{return res.json({ok:true,correlation_id:req.correlationId,action:await sales.completeNextAction(req,req.params.id)});}catch(e){return res.status(e.status||500).json({ok:false,error:e.code||e.message,correlation_id:req.correlationId});}});
router.post('/opportunities/:id/copilot',async(req,res)=>{try{return res.json({ok:true,correlation_id:req.correlationId,...await sales.copilot(req,req.params.id,req.body?.query)});}catch(e){return res.status(e.status||500).json({ok:false,error:e.code||e.message,correlation_id:req.correlationId});}});

module.exports=router;
