const test=require('node:test');
const assert=require('node:assert/strict');
const {scoreLead}=require('../src/services/sales.service');

test('sales lead scoring is bounded and deterministic',()=>{
  assert.deepEqual(scoreLead({fit_score:1.2,intent_score:-1}),{fit:1,intent:0,priority:0.45});
  assert.deepEqual(scoreLead({fit_score:0.8,intent_score:0.6}),{fit:0.8,intent:0.6,priority:0.69});
});
