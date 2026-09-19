const test=require('node:test');
const assert=require('node:assert/strict');
const {scoreLead,normalizeLead}=require('../src/services/sales.service');

test('sales lead scoring is bounded and deterministic',()=>{
  assert.deepEqual(scoreLead({fit_score:1.2,intent_score:-1}),{fit:1,intent:0,priority:0.45});
  assert.deepEqual(scoreLead({fit_score:0.8,intent_score:0.6}),{fit:0.8,intent:0.6,priority:0.69});
});

test('sales lead identity normalization is deterministic',()=>{
  assert.deepEqual(normalizeLead({
    name:'  Acme   Comercial  ',
    email:'  SALES@ACME.COM ',
    company:'Acme,  Comercial Ltda.',
    source:'  inbound '
  }),{
    name:'Acme Comercial',
    email:'sales@acme.com',
    company:'acme comercial ltda',
    source:'inbound',
    metadata:undefined
  });
});

test('versioned ICP and intent scoring combines weighted signals',()=>{
  const previous=process.env.SALES_SCORE_POLICY_VERSION;
  process.env.SALES_SCORE_POLICY_VERSION='v2-test';
  const {scoreLeadV2}=require('../src/services/sales.service');
  const result=scoreLeadV2({icp_score:0.8,intent_signals:[{score:1,weight:2},{score:0.5,weight:1}]});
  assert.equal(result.policy_version,'v2-test');
  assert.equal(result.fit,0.8);
  assert.equal(result.intent,0.8333);
  assert.equal(result.priority,0.8183);
  if(previous===undefined) delete process.env.SALES_SCORE_POLICY_VERSION; else process.env.SALES_SCORE_POLICY_VERSION=previous;
});
