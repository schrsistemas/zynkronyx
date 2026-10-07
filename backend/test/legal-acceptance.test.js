const test=require('node:test');
const assert=require('node:assert/strict');
const Module=require('node:module');

function load(rows=[],envVersion='2026-09-19'){
 const original=Module._load;
 const calls=[];
 const db={
  nextId:async()=>91,
  execute:async(sql,params)=>{calls.push({sql,params});},
  query:async()=>rows,
  dialect:()=>({limit:(sql,n)=>sql+' FIRST '+n})
 };
 process.env.LEGAL_PRIVACY_NOTICE_VERSION=envVersion;
 Module._load=function(request,parent,isMain){
  if(request==='./db.service'&&parent?.filename?.endsWith('legal.acceptance.service.js')) return db;
  return original.apply(this,arguments);
 };
 delete require.cache[require.resolve('../src/services/legal.acceptance.service')];
 const service=require('../src/services/legal.acceptance.service');
 Module._load=original;
 return {service,calls};
}

test('LGPD acceptance rejects outdated privacy notice version',async()=>{
 const {service}=load();
 await assert.rejects(
  ()=>service.accept(7,{subjectId:'user-1',policyType:'PRIVACY_NOTICE',policyVersion:'old',action:'ACCEPT'}),
  e=>e.code==='LEGAL_POLICY_VERSION_OUTDATED'&&e.status===409
 );
});

test('LGPD acceptance persists tenant-scoped server-side evidence',async()=>{
 const {service,calls}=load();
 const result=await service.accept(7,{subjectId:'user-1',policyType:'PRIVACY_NOTICE',policyVersion:'2026-09-19',action:'ACCEPT',correlationId:'corr-1',source:'control-center'});
 assert.equal(result.id,91);
 assert.equal(result.tenant_id,7);
 assert.equal(result.action,'ACCEPT');
 assert.equal(calls.length,1);
 assert.match(calls[0].sql,/INSERT INTO LEGAL_ACCEPTANCE/);
 assert.deepEqual(calls[0].params.slice(0,5),[91,7,'user-1','PRIVACY_NOTICE','2026-09-19']);
});

test('LGPD revoke is accepted without changing the policy version contract',async()=>{
 const {service}=load();
 const result=await service.accept(7,{subjectId:'user-1',policyType:'PRIVACY_NOTICE',policyVersion:'2026-09-19',action:'REVOKE'});
 assert.equal(result.action,'REVOKE');
});

test('LGPD current record returns latest server-side event',async()=>{
 const {service}=load([{ID:2,SUBJECT_ID:'user-1',POLICY_TYPE:'PRIVACY_NOTICE',POLICY_VERSION:'2026-09-19',ACTION:'REVOKE'}]);
 const result=await service.current(7,'user-1');
 assert.equal(result.ACTION,'REVOKE');
});

test('LGPD invalid action is rejected',async()=>{
 const {service}=load();
 await assert.rejects(
  ()=>service.accept(7,{subjectId:'user-1',policyVersion:'2026-09-19',action:'DELETE'}),
  e=>e.code==='LEGAL_ACCEPTANCE_ACTION_INVALID'&&e.status===400
 );
});
