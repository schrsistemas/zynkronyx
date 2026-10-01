const test = require('node:test');
const assert = require('node:assert/strict');
const { resolvePeriod } = require('../src/analytics/period.resolver');

const NOW = new Date('2026-09-30T12:00:00.000Z');

test('LAST_30_DAYS resolves an inclusive 30-day UTC window', () => {
  const result = resolvePeriod('LAST_30_DAYS', {}, NOW);
  assert.equal(result.from.toISOString(), '2026-09-01T00:00:00.000Z');
  assert.equal(result.to.toISOString(), '2026-09-30T23:59:59.999Z');
});

test('THIS_MONTH resolves current UTC month', () => {
  const result = resolvePeriod('THIS_MONTH', {}, NOW);
  assert.equal(result.from.toISOString(), '2026-09-01T00:00:00.000Z');
  assert.equal(result.to.toISOString(), '2026-09-30T23:59:59.999Z');
});

test('CUSTOM rejects inverted dates', () => {
  assert.throws(
    () => resolvePeriod('CUSTOM', { from: '2026-09-30', to: '2026-09-01' }, NOW),
    error => error.code === 'ANALYTICS_INVALID_PERIOD'
  );
});
