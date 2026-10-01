const test=require('node:test');
const assert=require('node:assert/strict');
const contracts=require('../src/services/mcp.contracts.service');
const skills=require('../src/services/skill.executor.service');

test('MCP contracts expose security and execution metadata',()=>{
 const c=contracts.getContract('analytics_query');
 assert.equal(c.version,'1.0.0');
 assert.equal(c.sideEffect,'READ_ONLY');
 assert.equal(c.tenantRequired,true);
 assert.equal(c.auditRequired,true);
});

test('MCP contract validation rejects missing and invalid arguments',()=>{
 assert.throws(()=>contracts.validateArgs('analytics_query',{}),e=>e.code==='MCP_REQUIRED_ARGUMENT:metric');
 assert.throws(()=>contracts.validateArgs('analytics_query',{metric:'x',period:'THIS_MONTH',dimensions:['a','b','c','d','e','f','g','h','i','j','k']}),e=>e.code==='MCP_INVALID_ARGUMENT:dimensions');
});

test('skill executor rejects tools outside skill policy',async()=>{
 const req={tenant:{id:7},user:{permissions:['CAN_ANALYZE']}};
 await assert.rejects(()=>skills.execute(req,'business_analytics',{steps:[{tool:'unknown_tool',arguments:{}}]}),e=>e.code==='SKILL_TOOL_NOT_ALLOWED');
});

test('skill executor limits execution steps',async()=>{
 const req={tenant:{id:7},user:{permissions:['CAN_ANALYZE']}};
 await assert.rejects(()=>skills.execute(req,'business_analytics',{steps:[1,2,3,4]}),e=>e.code==='SKILL_STEP_LIMIT_EXCEEDED');
});
