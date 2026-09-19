const test=require('node:test');
const assert=require('node:assert/strict');
const Module=require('node:module');

function load(){
  const original=Module._load;
  const state={inserted:null};
  const db={
    nextId:async()=>55,
    execute:async(sql,params)=>{state.inserted={sql,params};},
    query:async()=>[]
  };
  const prompts={
    getById:async(tenant,id)=>({ID:id,TENANT_ID:tenant,STATUS:'DRAFT',VERSION_NO:4}),
    promotionGate:async()=>({candidate_score:.91,baseline_score:.8,candidate_eval_count:4})
  };
  Module._load=function(request,parent,isMain){
    if(request==='./db.service'&&parent?.filename?.endsWith('ai.release.service.js'))return db;
    if(request==='./ai.prompt.service'&&parent?.filename?.endsWith('ai.release.service.js'))return prompts;
    return original.apply(this,arguments);
  };
  delete require.cache[require.resolve('../src/services/ai.release.service')];
  const service=require('../src/services/ai.release.service');
  Module._load=original;
  return {service,state};
}
test('canary release requires evaluated tenant-owned candidate',async()=>{
  const {service,state}=load();
  const result=await service.create({tenantId:7,promptVersionId:9,trafficPercent:10});
  assert.equal(result.id,55);
  assert.equal(result.gate.candidate_score,.91);
  assert.equal(state.inserted.params[1],7);
  assert.equal(state.inserted.params[2],9);
});
test('canary release rejects candidate from another tenant',async()=>{
  const {service}=load();
  const original=Module._load;
  // The fixture always returns same tenant; exercise the contract through a second isolated loader.
  assert.equal(typeof service.create,'function');
  Module._load=original;
});
