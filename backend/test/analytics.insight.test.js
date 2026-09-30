const test = require('node:test');
const assert = require('node:assert/strict');

function summarize(metric, current, previous) {
  const currentTotal = current.data.reduce((sum, row) => sum + Number(row.value || 0), 0);
  const previousTotal = previous.data.reduce((sum, row) => sum + Number(row.value || 0), 0);
  const variation = previousTotal === 0
    ? (currentTotal === 0 ? 0 : null)
    : ((currentTotal - previousTotal) / Math.abs(previousTotal));
  if (variation === null) return 'NEW_BASELINE';
  if (variation >= 0.10) return 'POSITIVE_TREND';
  if (variation <= -0.10) return 'NEGATIVE_TREND';
  return 'STABLE';
}

const metric = {name:'revenue'};

test('insight classification is positive at +10%', () => {
  assert.equal(summarize(metric,{data:[{value:110}]},{data:[{value:100}]}),'POSITIVE_TREND');
});

test('insight classification is negative at -10%', () => {
  assert.equal(summarize(metric,{data:[{value:90}]},{data:[{value:100}]}),'NEGATIVE_TREND');
});

test('insight classification is stable inside threshold', () => {
  assert.equal(summarize(metric,{data:[{value:105}]},{data:[{value:100}]}),'STABLE');
});

test('zero baseline is never converted into a fake percentage', () => {
  assert.equal(summarize(metric,{data:[{value:10}]},{data:[{value:0}]}),'NEW_BASELINE');
});
