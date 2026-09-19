const assert = require('node:assert/strict');
const test = require('node:test');

const {hashBucket,selectPromptVersion}=require('../src/services/ai.release.service');

test('canary bucket is deterministic', () => {
  assert.equal(hashBucket('tenant-1:req-42'), hashBucket('tenant-1:req-42'));
});

test('tenant canary is stable for the same tenant and stable prompt', () => {
  const a=selectPromptVersion({tenantId:1,stableId:10,mode:'TENANT_CANARY',trafficPercent:50,candidateId:20});
  const b=selectPromptVersion({tenantId:1,stableId:10,mode:'TENANT_CANARY',trafficPercent:50,candidateId:20});
  assert.equal(a,b);
});

test('traffic canary uses request key instead of tenant-only key', () => {
  const a=selectPromptVersion({tenantId:1,stableId:10,requestKey:'request-a',mode:'TRAFFIC_CANARY',trafficPercent:100,candidateId:20});
  const b=selectPromptVersion({tenantId:1,stableId:10,requestKey:'request-b',mode:'TRAFFIC_CANARY',trafficPercent:100,candidateId:20});
  assert.equal(a,20);
  assert.equal(b,20);
});

test('traffic canary fails closed to stable prompt without request key', () => {
  assert.equal(
    selectPromptVersion({tenantId:1,stableId:10,mode:'TRAFFIC_CANARY',trafficPercent:100,candidateId:20}),
    10
  );
});

test('zero traffic never selects candidate and full traffic always selects candidate', () => {
  assert.equal(selectPromptVersion({tenantId:1,stableId:10,requestKey:'x',mode:'TRAFFIC_CANARY',trafficPercent:0,candidateId:20}),10);
  assert.equal(selectPromptVersion({tenantId:1,stableId:10,requestKey:'x',mode:'TRAFFIC_CANARY',trafficPercent:100,candidateId:20}),20);
});
