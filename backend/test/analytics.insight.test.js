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

const { parseIntent } = require('../src/analytics/nl.analytics.service');

test('natural language resolver maps Portuguese revenue query to controlled metric', () => {
  const intent = parseIntent('Compare minha receita dos últimos 90 dias por mês');
  assert.equal(intent.operation,'QUERY_METRIC');
  assert.equal(intent.metric,'revenue');
  assert.equal(intent.period,'LAST_90_DAYS');
  assert.deepEqual(intent.dimensions,['month']);
  assert.equal(intent.confidence.kind,'RULE_BASED');
});

test('natural language resolver rejects unsupported business metric instead of inventing SQL', () => {
  assert.throws(
    () => parseIntent('Qual foi meu churn nos últimos 90 dias?'),
    error => error.code === 'ANALYTICS_INTENT_METRIC_NOT_FOUND'
  );
});

const { classify } = require('../src/analytics/recommendation.service');

test('recommendation classifies negative trend as risk without executing action', () => {
  const result = classify({type:'NEGATIVE_TREND',variation:-0.15});
  assert.equal(result.type,'RISK');
  assert.equal(result.action,'INVESTIGATE_DECLINE');
});

test('recommendation classifies positive trend as opportunity', () => {
  const result = classify({type:'POSITIVE_TREND',variation:0.2});
  assert.equal(result.type,'OPPORTUNITY');
  assert.equal(result.action,'ANALYZE_GROWTH_DRIVER');
});

test('recommendation keeps stable metrics in monitoring state', () => {
  const result = classify({type:'STABLE',variation:0.02});
  assert.equal(result.type,'REVIEW');
  assert.equal(result.action,'MONITOR_METRIC');
});
