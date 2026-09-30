const test = require('node:test');
const assert = require('node:assert/strict');
const { summarizeInsight } = require('../src/analytics/analytics.service');

const metric = {name:'revenue', label:'Receita'};

test('insight classification is positive at +10%', () => {
  const result = summarizeInsight(metric,{data:[{value:110}],period:{}},{data:[{value:100}],period:{}});
  assert.equal(result.type,'POSITIVE_TREND');
  assert.equal(result.variation_percent,10);
});

test('insight classification is negative at -10%', () => {
  const result = summarizeInsight(metric,{data:[{value:90}],period:{}},{data:[{value:100}],period:{}});
  assert.equal(result.type,'NEGATIVE_TREND');
  assert.equal(result.variation_percent,-10);
});

test('insight classification is stable inside threshold', () => {
  const result = summarizeInsight(metric,{data:[{value:105}],period:{}},{data:[{value:100}],period:{}});
  assert.equal(result.type,'STABLE');
});

test('zero baseline is never converted into a fake percentage', () => {
  const result = summarizeInsight(metric,{data:[{value:10}],period:{}},{data:[{value:0}],period:{}});
  assert.equal(result.type,'NEW_BASELINE');
  assert.equal(result.variation_percent,null);
});

test('insight evidence preserves deterministic current and previous series', () => {
  const result = summarizeInsight(
    metric,
    {data:[{period:'2026-09',value:120},{period:'2026-10',value:130}],period:{name:'THIS_MONTH'}},
    {data:[{period:'2026-08',value:100}],period:{name:'LAST_MONTH'}}
  );
  assert.deepEqual(result.evidence.current_series,[{period:'2026-09',value:120},{period:'2026-10',value:130}]);
  assert.deepEqual(result.evidence.previous_series,[{period:'2026-08',value:100}]);
  assert.equal(result.methodology.kind,'DETERMINISTIC');
});
