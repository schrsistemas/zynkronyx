const test=require('node:test');
const assert=require('node:assert/strict');
const Module=require('node:module');

function load(rows,canaryStatus){
  const original=Module._load;
  const db={
    query:async(sql)=>sql.includes('AI_PROMPT_RELEASE')?(canaryStatus?[{ID:41,STATUS:canaryStatus}]:[]):[],
    dialect:()=>({currentTimestamp:'CURRENT_TIMESTAMP'})
  };
  const prompts={
    getById:async()=>({ID:9,TENANT_ID:7,VERSION_NO:4}),
    resolve:async()=>({ID:8}),
  };
  Module._load=function(request,parent,isMain){
    if(request==='./db.service'&&parent?.filename?.endsWith('ai.prompt.service.js'))return db;
    return original.apply(this,arguments);
  };
  delete require.cache[require.resolve('../src/services/ai.prompt.service')];
  const service=require('../src/services/ai.prompt.service');
  Module._load=original;
  return {service,db};
}

test('promotion gate is blocked until a passed canary exists',async()=>{
  const {service}=load();
  const original=service.evaluationGate;
  service.evaluationGate=async()=>({prompt_version_id:9,candidate_score:.9,baseline_score:.8,candidate_eval_count:4});
  await assert.rejects(()=>service.promotionGate(7,9),e=>e.code==='PROMOTION_POLICY_NOT_MET'&&e.details.canary_passed===false);
  service.evaluationGate=original;
});

test('promotion gate accepts a passed canary',async()=>{
  const {service}=load(null,'PASSED');
  service.evaluationGate=async()=>({prompt_version_id:9,candidate_score:.9,baseline_score:.8,candidate_eval_count:4});
  const gate=await service.promotionGate(7,9);
  assert.equal(gate.canary_passed,true);
  assert.equal(gate.canary_release_id,41);
});
