const skills=require('./skills.service');
const mcp=require('./mcp.service');
const policy=require('./skill.policy.service');

const MAX_STEPS=3;
const MAX_EXECUTION_MS=15000;
function fail(code,status=400,details){const e=new Error(code);e.code=code;e.status=status;if(details)e.details=details;throw e;}
async function execute(req,skillName,plan={}){
 const skillDef=skills.getSkill(skillName);if(!skillDef)fail('SKILL_NOT_FOUND',404);
 if(!req?.tenant?.id)fail('TENANT_CONTEXT_REQUIRED',401);
 const steps=Array.isArray(plan.steps)?plan.steps:[];if(!steps.length)fail('SKILL_STEPS_REQUIRED');
 if(steps.length>MAX_STEPS)fail('SKILL_STEP_LIMIT_EXCEEDED');
 const budgetMs=Math.min(Math.max(Number(plan.timeout_ms||MAX_EXECUTION_MS),1),MAX_EXECUTION_MS);
 const started=Date.now();const results=[];
 for(const step of steps){
   const remaining=budgetMs-(Date.now()-started);if(remaining<=0)fail('SKILL_EXECUTION_BUDGET_EXCEEDED',504,{budget_ms:budgetMs});
   const decision=policy.evaluate(skillDef,step,{tenantId:req.tenant.id,approved:Boolean(step.approved),remainingMs:remaining});
   if(decision.timeoutMs>remaining)fail('SKILL_EXECUTION_BUDGET_EXCEEDED',504,{tool:decision.tool,remaining_ms:remaining});
   const result=await mcp.call(req,decision.tool,step.arguments||{});
   results.push({tool:decision.tool,policy:{side_effect:decision.sideEffect,contract_version:decision.contractVersion},result});
 }
 return {skill:skillDef.name,version:skillDef.version,budget_ms:budgetMs,elapsed_ms:Date.now()-started,steps:results};
}
module.exports={MAX_STEPS,MAX_EXECUTION_MS,execute};