const test=require('node:test');
const assert=require('node:assert/strict');
const mcp=require('../src/services/mcp.service');
const skills=require('../src/services/skills.service');
const ft=require('../src/services/fine-tuning.service');

test('MCP registry exposes governed analytics tools',()=>{
 const names=mcp.listTools().map(x=>x.name);
 assert.deepEqual(names,['analytics_query','analytics_forecast','analytics_anomaly','analytics_insight']);
});

test('MCP denies analytics calls without explicit analysis permission',async()=>{
 const req={tenant:{id:7},user:{permissions:[]}};
 await assert.rejects(()=>mcp.call(req,'analytics_query',{metric:'revenue',period:'THIS_MONTH'}),e=>e.code==='MCP_PERMISSION_DENIED');
});

test('Skills registry exposes policy-bound skills',()=>{
 const skill=skills.getSkill('business_analytics');
 assert.ok(skill);
 assert.ok(skill.policy.includes('never_generate_sql'));
 assert.ok(skill.allowedTools.includes('analytics_query'));
});

test('fine-tuning dataset is deduplicated and validated',()=>{
 const rows=[
  {prompt:'Explique receita',completion:'A receita é...',source:'human'},
  {prompt:'Explique receita',completion:'A receita é...',source:'human'},
  {prompt:'Explique ticket',completion:'O ticket é...',source:'human'}
 ];
 const examples=ft.buildDataset(rows);
 assert.equal(examples.length,2);
 assert.equal(ft.validateDataset(examples).valid,true);
});
