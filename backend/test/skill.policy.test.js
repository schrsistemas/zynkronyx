const test=require('node:test');const assert=require('node:assert/strict');const Module=require('node:module');
function load(contract={version:'1.0.0',sideEffect:'READ_ONLY',tenantRequired:true,timeoutMs:5000,idempotency:'NOT_REQUIRED'}){
 const original=Module._load;const stubs={'./mcp.contracts.service':{getContract:()=>contract}};
 Module._load=function(request,parent,isMain){if(parent?.filename?.endsWith('skill.policy.service.js')&&stubs[request])return stubs[request];return original.apply(this,arguments)};
 delete require.cache[require.resolve('../src/services/skill.policy.service')];const service=require('../src/services/skill.policy.service');Module._load=original;return service;
}
const skill={allowedTools:['analytics_query']};
test('skill policy allows declared read-only tool',()=>{const p=load();const d=p.evaluate(skill,{tool:'analytics_query'},{tenantId:7});assert.equal(d.allowed,true);assert.equal(d.requiresApproval,false);});
test('skill policy denies undeclared tool',()=>{const p=load();assert.throws(()=>p.evaluate(skill,{tool:'other'},{tenantId:7}),e=>e.code==='SKILL_TOOL_NOT_ALLOWED');});
test('mutating tool requires explicit human approval',()=>{const p=load({version:'1',sideEffect:'MUTATION',tenantRequired:true,timeoutMs:5000,idempotency:'REQUIRED'});assert.throws(()=>p.evaluate(skill,{tool:'analytics_query'},{tenantId:7}),e=>e.code==='SKILL_HUMAN_APPROVAL_REQUIRED');});
test('mutating tool must declare idempotency even when approved',()=>{const p=load({version:'1',sideEffect:'MUTATION',tenantRequired:true,timeoutMs:5000,idempotency:'NOT_REQUIRED'});assert.throws(()=>p.evaluate(skill,{tool:'analytics_query'},{tenantId:7,approved:true}),e=>e.code==='SKILL_MUTATION_IDEMPOTENCY_REQUIRED');});
