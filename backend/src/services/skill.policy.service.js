const mcp=require('./mcp.contracts.service');
const MUTATING=new Set(['WRITE','MUTATION','EXTERNAL_WRITE']);
function fail(code,status=403,details){const e=new Error(code);e.code=code;e.status=status;if(details)e.details=details;throw e;}
function evaluate(skill,step,context={}){
 const tool=String(step?.tool||'');
 if(!skill?.allowedTools?.includes(tool))fail('SKILL_TOOL_NOT_ALLOWED',403,{tool});
 const contract=mcp.getContract(tool);if(!contract)fail('MCP_TOOL_CONTRACT_NOT_FOUND',404,{tool});
 if(contract.tenantRequired&&!context.tenantId)fail('TENANT_CONTEXT_REQUIRED',401);
 const sideEffect=String(contract.sideEffect||'UNKNOWN').toUpperCase();
 if(MUTATING.has(sideEffect)&&!context.approved)fail('SKILL_HUMAN_APPROVAL_REQUIRED',409,{tool,sideEffect});
 if(MUTATING.has(sideEffect)&&contract.idempotency==='NOT_REQUIRED')fail('SKILL_MUTATION_IDEMPOTENCY_REQUIRED',409,{tool});
 return {allowed:true,tool,sideEffect,requiresApproval:MUTATING.has(sideEffect),contractVersion:contract.version,timeoutMs:Number(contract.timeoutMs||5000)};
}
module.exports={MUTATING,evaluate};