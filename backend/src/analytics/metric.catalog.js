const METRICS = Object.freeze({
  revenue: Object.freeze({
    name: 'revenue',
    label: 'Receita',
    type: 'BASE',
    entity: 'Order',
    field: 'total',
    aggregation: 'SUM',
    requiredFields: Object.freeze(['total', 'occurred_at'])
  }),

  order_count: Object.freeze({
    name: 'order_count',
    label: 'Quantidade de pedidos',
    type: 'BASE',
    entity: 'Order',
    field: '*',
    aggregation: 'COUNT',
    requiredFields: Object.freeze(['occurred_at'])
  }),

  average_ticket: Object.freeze({
    name: 'average_ticket',
    label: 'Ticket médio',
    type: 'DERIVED',
    formula: 'revenue / order_count',
    dependencies: Object.freeze(['revenue', 'order_count'])
  })
});

function listMetrics() {
  return Object.values(METRICS).map(metric => ({
    name: metric.name,
    label: metric.label,
    type: metric.type,
    entity: metric.entity || null,
    field: metric.field || null,
    aggregation: metric.aggregation || null,
    formula: metric.formula || null
  }));
}

function getMetric(name) {
  const key = String(name || '').trim().toLowerCase();
  return METRICS[key] || null;
}

module.exports = { METRICS, listMetrics, getMetric };
