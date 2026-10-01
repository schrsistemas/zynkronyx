const test=require('node:test');
const assert=require('node:assert/strict');
const Module=require('node:module');

function load(rows,canaryStatus){
  process.env.AI_PROMOTION_MIN_EVALS='1';
  process.env.AI_PROMOTION_MIN_SCORE='0.8';
  process.env.AI_PROMOTION_MIN_DELTA='-1';
  const original=Module._load;
  const db={
    query:async(sql)=>{
      if(sql.includes('AI_PROMPT_RELEASE'))return canaryStatus?[{ID:41,STATUS:canaryStatus}]:[];
      if(sql.includes('AI_EVAL_RUN'))return [{ID:1,EVAL_CASE_ID:101,SCORE:.9,PROMPT_VERSION_ID:9,CREATED_AT:'2026-09-30T10:00:00Z'},{ID:2,EVAL_CASE_ID:102,SCORE:.9,PROMPT_VERSION_ID:9,CREATED_AT:'2026-09-30T10:00:00Z'},{ID:3,EVAL_CASE_ID:103,SCORE:.9,PROMPT_VERSION_ID:9,CREATED_AT:'2026-09-30T10:00:00Z'},{ID:4,EVAL_CASE_ID:101,SCORE:.8,PROMPT_VERSION_ID:8,CREATED_AT:'2026-09-30T09:00:00Z'},{ID:5,EVAL_CASE_ID:102,SCORE:.8,PROMPT_VERSION_ID:8,CREATED_AT:'2026-09-30T09:00:00Z'},{ID:6,EVAL_CASE_ID:103,SCORE:.8,PROMPT_VERSION_ID:8,CREATED_AT:'2026-09-30T09:00:00Z'}];
      if(sql.includes('AI_PROMPT_VERSION')&&sql.includes("STATUS='ACTIVE'"))return [{ID:8,TENANT_ID:7,VERSION_NO:3,STATUS:'ACTIVE'}];
      if(sql.includes('AI_PROMPT_VERSION')&&sql.includes('WHERE ID=?'))return [{ID:9,TENANT_ID:7,VERSION_NO:4,STATUS:'DRAFT'}];
      return [];
    },
    dialect:()=>({currentTimestamp:'CURRENT_TIMESTAMP'})
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
  await assert.rejects(()=>service.promotionGate(7,9),e=>e.code==='PROMOTION_POLICY_NOT_MET');
  service.evaluationGate=original;
});

test('promotion gate accepts a passed canary',async()=>{
  const {service}=load(null,'PASSED');
  service.evaluationGate=async()=>({prompt_version_id:9,candidate_score:.9,baseline_score:.8,candidate_eval_count:4});
  const gate=await service.promotionGate(7,9);
  assert.equal(gate.canary_passed,true);
  assert.equal(gate.canary_release_id,41);
});

test('evaluation gate can pass independently of canary status',async()=>{
  const {service}=load();
  service.getById=async()=>({ID:9,TENANT_ID:7,VERSION_NO:4,STATUS:'DRAFT'});
  const gate=await service.evaluationGate(7,9);
  assert.equal(gate.prompt_version_id,9);
  assert.equal(gate.candidate_score,.9);
  assert.equal(gate.baseline_score,.8);
  assert.equal(gate.candidate_eval_count,3);
});

test('production rollback records lineage and changes active prompt atomically',async()=>{
  const original=Module._load;
  const calls=[];
  const db={
    query:async(sql,params)=>{
      if(sql.includes("STATUS='ACTIVE'"))return [{ID:9,VERSION_NO:4}];
      if(sql.includes('WHERE ID=? AND TENANT_ID=?'))return [{ID:8,VERSION_NO:3,STATUS:'RETIRED'}];
      if(sql.includes('WHERE ID=? AND (TENANT_ID=? OR TENANT_ID IS NULL)'))return [{ID:8,TENANT_ID:7,VERSION_NO:3,STATUS:'RETIRED'}];
      return [];
    },
    withTransaction:async work=>work({
      query:db.query,
      execute:async(sql,params)=>calls.push({sql,params}),
      nextId:async()=>77
    }),
    dialect:()=>({currentTimestamp:'CURRENT_TIMESTAMP'})
  };
  Module._load=function(request,parent,isMain){
    if(request==='./db.service'&&parent?.filename?.endsWith('ai.prompt.service.js'))return db;
    return original.apply(this,arguments);
  };
  delete require.cache[require.resolve('../src/services/ai.prompt.service')];
  const service=require('../src/services/ai.prompt.service');
  Module._load=original;
  const result=await service.rollback(7,8,{decidedBy:'user-1',correlationId:'corr-1',reason:'test'});
  assert.equal(result.rolled_back_to,8);
  assert.equal(result.previous_active,9);
  assert.equal(result.promotion_audit_id,77);
  assert.equal(calls.length,3);
  assert.match(calls[2].sql,/AI_PROMPT_PROMOTION_AUDIT/);
});
