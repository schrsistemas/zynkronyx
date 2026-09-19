const test=require('node:test');
const assert=require('node:assert/strict');
const Module=require('node:module');

function loadService(){
  const original=Module._load;
  const state={items:[],nextId:100,queries:[],prompt:null};
  const db={
    dialect:()=>({limit:(sql,n)=>sql+' FIRST '+n,lock:sql=>sql+' WITH LOCK'}),
    nextId:async()=>++state.nextId,
    withTransaction:async work=>work({
      nextId:async()=>++state.nextId,
      execute:async(sql,params)=>{
        state.queries.push({sql,params});
        if(sql.startsWith('INSERT INTO AI_PROMPT_VERSION'))state.prompt={id:params[0],tenantId:params[1],versionNo:params[2],name:params[3],prompt:JSON.parse(params[4]),status:params[5]};
        if(sql.startsWith('INSERT INTO AI_REFINEMENT_ITEM'))state.items.push({ID:params[0],TENANT_ID:params[1],AUDIT_ID:params[2],PROMPT_VERSION_ID:params[3],FEEDBACK_ID:params[4],TYPE:params[5],SOURCE:params[6],TITLE:params[7],PROPOSED_CHANGE_JSON:params[8],STATUS:params[9],CREATED_BY:params[10]});
        if(sql.startsWith("UPDATE AI_REFINEMENT_ITEM SET STATUS='ACCEPTED'")){const item=state.items.find(x=>x.ID===params[2]);item.STATUS='ACCEPTED';item.PROMPT_VERSION_ID=params[0];item.REVIEWED_BY=params[1];}
      },
      query:async(sql,params)=>{
        if(sql.includes('FROM AI_REFINEMENT_ITEM')&&sql.includes('WHERE ID=? AND TENANT_ID=?'))return state.items.filter(x=>x.ID===params[0]&&x.TENANT_ID===params[1]).map(x=>({...x}));
        if(sql.includes('FROM AI_QUERY_AUDIT'))return params[0]===2&&params[1]===10?[{ID:2}]:[];
        if(sql.includes('FROM AI_QUERY_FEEDBACK'))return params[0]===3&&params[1]===10?[{ID:3,AUDIT_ID:2}]:[];
        return state.items.filter(x=>x.TENANT_ID===params[0]).map(x=>({...x}));
      }
    })
  };
  const tx={};
  const prompts={
    getById:async()=>({ID:7,TENANT_ID:10,VERSION_NO:3,PROMPT_JSON:'{"tone":"direct"}'}),
    resolve:async()=>({ID:7,VERSION_NO:3,PROMPT_JSON:'{"tone":"direct"}'}),
    resolveById:async()=>({ID:7,TENANT_ID:10,VERSION_NO:3,PROMPT_JSON:'{"tone":"direct"}'}),
    resolveTx:async()=>({ID:7,VERSION_NO:3,PROMPT_JSON:'{"tone":"direct"}'}),
    resolveByIdTx:async()=>({ID:7,TENANT_ID:10,VERSION_NO:3,PROMPT_JSON:'{"tone":"direct"}'}),
    create:async input=>{state.prompt={...input,id:8};return 8;},
    createTx:async(inputTx,input)=>{state.prompt={...input,id:8};return 8;}
  };
  Module._load=function(request,parent,isMain){
    if(request==='./db.service' && parent?.filename?.endsWith('ai.refinement.service.js'))return db;
    if(request==='./ai.prompt.service' && parent?.filename?.endsWith('ai.refinement.service.js'))return prompts;
    return original.apply(this,arguments);
  };
  delete require.cache[require.resolve('../src/services/ai.refinement.service')];
  const service=require('../src/services/ai.refinement.service');
  Module._load=original;
  return {service,state};
}

test('refinement proposal validates tenant-scoped links',async()=>{
  const {service,state}=loadService();
  const item=await service.create({tenantId:10,auditId:2,feedbackId:3,promptVersionId:7,title:'Improve answer',suggestedChange:{tone:'concise'},createdBy:'u1'});
  assert.equal(item.STATUS,'PENDING');
  assert.equal(item.TENANT_ID,10);
  assert.deepEqual(JSON.parse(item.PROPOSED_CHANGE_JSON).suggested_change,{tone:'concise'});
  assert.equal(state.items.length,1);
});

test('review only accepts reviewed or rejected',async()=>{
  const {service}=loadService();
  const item=await service.create({tenantId:10,title:'x'});
  const reviewed=await service.review(10,item.ID,{status:'REVIEWED',reviewedBy:'u2'});
  assert.equal(reviewed.STATUS,'REVIEWED');
  await assert.rejects(()=>service.review(10,item.ID,{status:'ACCEPTED'}),/INVALID_REFINEMENT_REVIEW_STATUS/);
});

test('accept locks the refinement and creates the prompt in the same transaction',async()=>{
  const {service,state}=loadService();
  const item=await service.create({tenantId:10,promptVersionId:7,title:'x',suggestedChange:{tone:'concise'}});
  await service.review(10,item.ID,{status:'REVIEWED',reviewedBy:'u2'});
  const result=await service.accept(10,item.ID,{reviewedBy:'u2'});
  assert.equal(result.draft_prompt_id,8);
  assert.equal(result.base_prompt_id,7);
  assert.equal(result.next_version,4);
  assert.equal(state.prompt.status,'DRAFT');
  assert.deepEqual(state.prompt.prompt,{tone:'concise'});
  assert.equal(result.refinement.STATUS,'ACCEPTED');
  assert.ok(state.queries.some(x=>x.sql.includes('WITH LOCK')));
});

test('accepted refinement cannot be accepted twice',async()=>{
  const {service}=loadService();
  const item=await service.create({tenantId:10,title:'x'});
  await service.review(10,item.ID,{status:'REVIEWED',reviewedBy:'u2'});
  await service.accept(10,item.ID,{reviewedBy:'u2'});
  await assert.rejects(()=>service.accept(10,item.ID,{reviewedBy:'u3'}),/AI_REFINEMENT_NOT_ACCEPTABLE/);
});

test('cross-tenant audit and feedback links are rejected',async()=>{
  const {service}=loadService();
  await assert.rejects(()=>service.create({tenantId:10,auditId:99}),/AI_AUDIT_NOT_FOUND/);
  await assert.rejects(()=>service.create({tenantId:10,feedbackId:99}),/AI_FEEDBACK_NOT_FOUND/);
});
