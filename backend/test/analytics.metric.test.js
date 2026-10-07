const test = require('node:test');
const assert = require('node:assert/strict');
const catalog = require('../src/analytics/metric.catalog');

test('analytics metric catalog exposes controlled metrics', () => {
  assert.equal(catalog.getMetric('revenue').aggregation, 'SUM');
  assert.equal(catalog.getMetric('order_count').aggregation, 'COUNT');
  assert.equal(catalog.getMetric('average_ticket').type, 'DERIVED');
  assert.equal(catalog.getMetric('not_a_metric'), null);
});
