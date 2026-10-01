const test=require('node:test');
const assert=require('node:assert/strict');
const {buildQuery}=require('../src/analytics/query.builder');

const metric={name:'revenue',type:'BASE',aggregation:'SUM'};
const mappings={source:{SOURCE_NAME:'PEDIDO'},date:{SOURCE_FIELD:'DATA'},value:{SOURCE_FIELD:'TOTAL'}};
const period={from:new Date('2026-09-01T00:00:00.000Z'),to:new Date('2026-09-30T23:59:59.999Z')};

test('tenant column isolation adds a parameterized tenant predicate',()=>{
 const q=buildQuery(metric,mappings,period,['month'],{mode:'TENANT_COLUMN',tenantField:'TENANT_ID',tenantValue:7});
 assert.match(q.sql,/TENANT_ID" = \?/);
 assert.equal(q.params[2],7);
 assert.equal(q.params.length,3);
});

test('dedicated source isolation does not invent a tenant predicate',()=>{
 const q=buildQuery(metric,mappings,period,['month'],{mode:'DEDICATED_SOURCE'});
 assert.doesNotMatch(q.sql,/TENANT_ID/);
 assert.equal(q.params.length,2);
});

test('unknown isolation mode fails closed',()=>{
 assert.throws(()=>buildQuery(metric,mappings,period,['month'],{mode:'UNKNOWN'}),e=>e.code==='ANALYTICS_TENANT_ISOLATION_NOT_CONFIGURED');
});

test('tenant field identifier is validated',()=>{
 assert.throws(()=>buildQuery(metric,mappings,period,['month'],{mode:'TENANT_COLUMN',tenantField:'TENANT_ID;DROP',tenantValue:7}),e=>e.code==='ANALYTICS_INVALID_SOURCE_MAPPING');
});
