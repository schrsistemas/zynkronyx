const test = require('node:test');
const assert = require('node:assert/strict');
const { buildQuery, quoteIdentifier } = require('../src/analytics/query.builder');

const period = {
  from: new Date('2026-07-01T00:00:00.000Z'),
  to: new Date('2026-09-30T23:59:59.999Z')
};

const mappings = {
  source: {
    SOURCE_TYPE: 'TABLE',
    SOURCE_NAME: 'PEDIDO'
  },
  date: {
    SOURCE_FIELD: 'DATA_PEDIDO'
  },
  value: {
    SOURCE_FIELD: 'VALOR_TOTAL'
  }
};

test('revenue query uses registered identifiers and parameters for values', () => {
  const result = buildQuery(
    {
      name: 'revenue',
      type: 'BASE',
      aggregation: 'SUM'
    },
    mappings,
    period,
    ['month']
  );

  assert.match(result.sql, /SUM\("PEDIDO"\."VALOR_TOTAL"\)/);
  assert.match(result.sql, /"PEDIDO"\."DATA_PEDIDO" >= \?/);
  assert.equal(result.params.length, 2);
});

test('unsafe identifiers are rejected', () => {
  assert.throws(
    () => quoteIdentifier('PEDIDO; DROP TABLE TENANT', 'source_name'),
    error => error.code === 'ANALYTICS_INVALID_SOURCE_MAPPING'
  );
});

test('average ticket uses deterministic derived calculation', () => {
  const result = buildQuery(
    { name: 'average_ticket', type: 'DERIVED' },
    {
      revenue: {
        source: { SOURCE_NAME: 'PEDIDO' },
        date: { SOURCE_FIELD: 'DATA_PEDIDO' },
        value: { SOURCE_FIELD: 'VALOR_TOTAL' }
      }
    },
    period,
    ['month']
  );

  assert.match(result.sql, /SUM\("PEDIDO"\."VALOR_TOTAL"\)/);
  assert.match(result.sql, /COUNT\(\*\)/);
});
