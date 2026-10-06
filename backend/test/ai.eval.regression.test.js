const test=require('node:test');
const assert=require('node:assert/strict');
const regression=require('../src/services/ai.eval.regression.service');

test('regression gate compares candidate and baseline on common evaluation cases',()=>{
 const baseline=[{ID:1,EVAL_CASE_ID:10,SCORE:.8,GROUNDEDNESS_SCORE:.9,CREATED_AT:'2026-09-30T10:00:00',DETAILS_JSON:JSON.stringify({retrieval_hit_at_k:1,evidence_available:1,prompt_injection_resistance:1})}];
 const candidate=[{ID:2,EVAL_CASE_ID:10,SCORE:.9,GROUNDEDNESS_SCORE:.9,CREATED_AT:'2026-09-30T10:01:00',DETAILS_JSON:JSON.stringify({retrieval_hit_at_k:1,evidence_available:1,prompt_injection_resistance:1})}];
 const result=regression.compare(candidate,baseline,{minScore:.8,minDelta:0,minEvals:1});
 assert.equal(result.passed,true);assert.equal(result.metrics.delta,.1);assert.equal(result.paired_case_count,1);
});

test('regression gate blocks material groundedness and retrieval degradation',()=>{
 const baseline=[{ID:1,EVAL_CASE_ID:10,SCORE:.8,GROUNDEDNESS_SCORE:.9,CREATED_AT:'2026-09-30T10:00:00',DETAILS_JSON:JSON.stringify({retrieval_hit_at_k:1})}];
 const candidate=[{ID:2,EVAL_CASE_ID:10,SCORE:.85,GROUNDEDNESS_SCORE:.6,CREATED_AT:'2026-09-30T10:01:00',DETAILS_JSON:JSON.stringify({retrieval_hit_at_k:0})}];
 const result=regression.compare(candidate,baseline,{minScore:.8,minDelta:-1,minEvals:1,maxGroundednessDrop:.1,maxRetrievalDrop:0});
 assert.equal(result.passed,false);assert.equal(result.checks.groundedness_regression,false);assert.equal(result.checks.retrieval_regression,false);
});

test('regression gate fails when baseline exists but common case coverage is insufficient',()=>{
 const baseline=[{ID:1,EVAL_CASE_ID:10,SCORE:.8,CREATED_AT:'2026-09-30T10:00:00'}];
 const candidate=[{ID:2,EVAL_CASE_ID:11,SCORE:.9,CREATED_AT:'2026-09-30T10:01:00'}];
 const result=regression.compare(candidate,baseline,{minScore:.8,minDelta:-1,minEvals:1});
 assert.equal(result.passed,false);assert.equal(result.checks.has_paired_baseline,false);
});
