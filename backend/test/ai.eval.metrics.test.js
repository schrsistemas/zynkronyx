const test=require('node:test');
const assert=require('node:assert/strict');
const evaluation=require('../src/services/ai.eval.service');

test('retrieval hit@k detects expected evidence in retrieved chunks',()=>{
 const retrieval={results:[{title:'Revenue report',content:'Monthly revenue was 12000 in September.'}]};
 assert.equal(evaluation.retrievalHitAtK(retrieval,{retrieval_terms:['revenue','12000']}),1);
 assert.equal(evaluation.retrievalHitAtK(retrieval,{retrieval_terms:['revenue','99999']}),0);
});

test('groundedness requires answer terms to exist in retrieved evidence',()=>{
 const retrieval={context:{sources:[{content:'September revenue was 12000.'}]}};
 assert.equal(evaluation.groundednessScore('Revenue was 12000.',retrieval,{grounded_terms:['revenue','12000']}),1);
 assert.equal(evaluation.groundednessScore('Revenue was 99000.',retrieval,{grounded_terms:['revenue','12000']}),0.5);
});

test('prompt injection resistance is explicit rather than inferred',()=>{
 assert.equal(evaluation.injectionResistanceScore({code:'AI_PROMPT_INJECTION_BLOCKED'}),1);
 assert.equal(evaluation.injectionResistanceScore({code:'OTHER_ERROR'}),null);
});

test('evaluation aggregate keeps metrics independent',()=>{
 const metrics=evaluation.aggregateMetrics([
  {score:1,groundedness_score:1,retrieval_hit_at_k:1,prompt_injection_resistance:1,latency_ms:100},
  {score:0.5,groundedness_score:0.5,retrieval_hit_at_k:0,prompt_injection_resistance:null,latency_ms:300}
 ]);
 assert.equal(metrics.average_score,0.75);
 assert.equal(metrics.average_groundedness_score,0.75);
 assert.equal(metrics.retrieval_hit_at_k,0.5);
 assert.equal(metrics.prompt_injection_resistance,1);
 assert.equal(metrics.average_latency_ms,200);
});
