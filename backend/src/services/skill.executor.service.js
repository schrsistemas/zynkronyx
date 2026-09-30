const skills=require('./skills.service');
const mcp=require('./mcp.service');

const MAX_STEPS=3;
function fail(code,status=400){const e=new Error(code);e.code=code;e.status=status;throw e;}
async function execute(req,skillName,plan={}){
 const skillDef=skills.getSkill(skillName);if(!skillDef)fail('SKILL_NOT_FOUND',404);
 if(!req?.tenant?.id)fail('TENANT_CONTEXT_REQUIRED',401);
 const steps=Array.isArray(plan.steps)?plan.steps:[];if(!steps.length)fail('SKILL_STEPS_REQUIRED');
 if(steps.length>MAX_STEPS)fail('SKILL_STEP_LIMIT_EXCEEDED');
 const results=[];
 for(const step of steps){
   const tool=String(step?.tool||'');
   if(!skillDef.allowedTools.includes(tool))fail('SKILL_TOOL_NOT_ALLOWED',403);
   const result=await mcp.call(req,tool,step.arguments||{});
   results.push({tool,result});
 }
 return {skill:skillDef.name,version:skillDef.version,steps:results};
}
module.exports={MAX_STEPS,execute};
