const skills=require('./skills.service');
const mcp=require('./mcp.service');
const policy=require('./skill.policy.service');
const execution=require('./agent.execution.service');

const MAX_STEPS=3;
const MAX_EXECUTION_MS=15000;
function fail(code,status=400,details){const e=new Error(code);e.code=code;e.status=status;if(details)e.details=details;throw e;}
async function execute(req,skillName,plan={}){
 const skillDef=skills.getSkill(skillName);if(!skillDef)fail('SKILL_NOT_FOUND',404);
 if(!req?.tenant?.id)fail('TENANT_CONTEXT_REQUIRED',401);
 const steps=Array.isArray(plan.steps)?plan.steps:[];if(!steps.length)fail('SKILL_STEPS_REQUIRED');
 if(steps.length>MAX_STEPS)fail('SKILL_STEP_LIMIT_EXCEEDED');
 const budgetMs=Math.min(Math.max(Number(plan.timeout_ms||MAX_EXECUTION_MS),1),MAX_EXECUTION_MS);
 const correlationId=String(req.correlationId||req.correlation_id||plan.correlation_id||'').trim();
 if(!correlationId)fail('AGENT_CORRELATION_ID_REQUIRED');
 const exec=await execution.create({
   tenantId:req.tenant.id,agentName:String(plan.agent_name||skillName),skillName:skillDef.name,
   planId:plan.plan_id||null,idempotencyKey:plan.idempotency_key||null,correlationId,
   timeoutBudgetMs:budgetMs,maxSteps:MAX_STEPS,approvalRequired:steps.some(s=>s.approval)
 });
 const started=Date.now();const results=[];
 try{
   for(let index=0;index<steps.length;index++){
     const step=steps[index];
     const elapsed=Date.now()-started;
     const remaining=budgetMs-elapsed;
     if(remaining<=0)fail('SKILL_EXECUTION_BUDGET_EXCEEDED',504,{budget_ms:budgetMs});
     await execution.advance(req.tenant.id,exec.id,index+1);
     const decision=policy.evaluate(skillDef,step,{tenantId:req.tenant.id,approval:step.approval,remainingMs:remaining});
     if(decision.timeoutMs>remaining)fail('SKILL_EXECUTION_BUDGET_EXCEEDED',504,{tool:decision.tool,remaining_ms:remaining});
     const result=await mcp.call(req,decision.tool,step.arguments||{});
     results.push({tool:decision.tool,policy:{side_effect:decision.sideEffect,contract_version:decision.contractVersion,approval_id:decision.approval_id},result});
   }
   await execution.finish(req.tenant.id,exec.id,'COMPLETED');
   return {execution_id:exec.id,skill:skillDef.name,version:skillDef.version,budget_ms:budgetMs,elapsed_ms:Date.now()-started,steps:results};
 }catch(error){
   try{await execution.finish(req.tenant.id,exec.id,'FAILED');}catch{}
   throw error;
 }
}
module.exports={MAX_STEPS,MAX_EXECUTION_MS,execute};