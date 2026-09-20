const express=require('express');
const legal=require('../services/legal.acceptance.service');
const router=express.Router();

router.get('/acceptance',async(req,res)=>{try{return res.json({ok:true,correlation_id:req.correlationId,result:await legal.current(req.tenant.id,req.query.subject_id,req.query.policy_type||'PRIVACY_NOTICE')});}catch(error){return res.status(error.status||500).json({ok:false,error:error.code||error.message||'LEGAL_ACCEPTANCE_QUERY_FAILED',correlation_id:req.correlationId});}});
router.get('/acceptance/history',async(req,res)=>{try{return res.json({ok:true,correlation_id:req.correlationId,results:await legal.history(req.tenant.id,req.query.subject_id,req.query.limit)});}catch(error){return res.status(error.status||500).json({ok:false,error:error.code||error.message||'LEGAL_ACCEPTANCE_HISTORY_FAILED',correlation_id:req.correlationId});}});
router.post('/acceptance',async(req,res)=>{try{return res.status(201).json({ok:true,correlation_id:req.correlationId,result:await legal.accept(req.tenant.id,{...req.body,correlationId:req.correlationId,subjectId:req.body?.subject_id||req.user?.id})});}catch(error){return res.status(error.status||500).json({ok:false,error:error.code||error.message||'LEGAL_ACCEPTANCE_FAILED',correlation_id:req.correlationId});}});
module.exports=router;
