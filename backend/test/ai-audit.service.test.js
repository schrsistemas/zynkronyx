const test=require('node:test');
const assert=require('node:assert/strict');
const Module=require('node:module');

function loadService(){
  const original=Module._load;
  const state={nextId:100,feedback:[],queries:[]};
  const db={
    nextId:async()=>++state.nextId,
    dialect:()=>({limit:(sql,n)=>sql+' FIRST '+n}),
    query:async()=>[],
    withTransaction:async work=>work({
      nextId:async()=>++state.nextId,
      query:async(sql,params)=>{
        if(sql.includes('AI_QUERY_AUDIT'))return params[1]===7&&[10,11].includes(Number(params[0]))?[{ID:Number(params[0])}]:[];
        if(sql.includes('IDEMPOTENCY_KEY'))return state.feedback.filter(x=>x.TENANT_ID===params[0]&&x.IDEMPOTENCY_KEY===params[1]).map(x=>({...x}));
        return [];
      },
      execute:async(sql,params)=>{
        state.queries.push({sql,params});
        state.feedback.push({ID:params[0],TENANT_ID:params[1],AUDIT_ID:params[2],FEEDBACK_TYPE:params[3],IDEMPOTENCY_KEY:params[8]});
      }
    })
  };
  Module._load=function(request,parent,isMain){
    if(request==='./db.service'&&parent?.filename?.endsWith('ai.audit.service.js'))return db;
    return original.apply(this,arguments);
  };
  delete require.cache[require.resolve('../src/services/ai.audit.service')];
  const service=require('../src/services/ai.audit.service');
  Module._load=original;
  return {service,state};
}

test('feedback is idempotent per tenant and audit',async()=>{
  const {service,state}=loadService();
  const first=await service.feedback({tenantId:7,auditId:10,feedbackType:'HUMAN',rating:1,idempotencyKey:'fb-1'});
  const second=await service.feedback({tenantId:7,auditId:10,feedbackType:'HUMAN',rating:1,idempotencyKey:'fb-1'});
  assert.equal(first.id,101);
  assert.equal(first.idempotent,false);
  assert.equal(second.id,101);
  assert.equal(second.idempotent,true);
  assert.equal(state.feedback.length,1);
});

test('same feedback idempotency key cannot target another audit',async()=>{
  const {service}=loadService();
  await service.feedback({tenantId:7,auditId:10,idempotencyKey:'fb-1'});
  await assert.rejects(()=>service.feedback({tenantId:7,auditId:11,idempotencyKey:'fb-1'}),/AI_FEEDBACK_IDEMPOTENCY_CONFLICT/);
});

test('feedback without idempotency key remains repeatable',async()=>{
  const {service,state}=loadService();
  const a=await service.feedback({tenantId:7,auditId:10});
  const b=await service.feedback({tenantId:7,auditId:10});
  assert.notEqual(a.id,b.id);
  assert.equal(state.feedback.length,2);
});
