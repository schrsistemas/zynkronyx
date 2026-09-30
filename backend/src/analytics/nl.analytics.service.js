const catalog = require('./metric.catalog');
const periods = require('./period.resolver');
const { queryMetric } = require('./analytics.service');

const PERIOD_ALIASES = Object.freeze({
  hoje: 'TODAY',
  hoje_mes: 'THIS_MONTH',
  mes_atual: 'THIS_MONTH',
  este_mes: 'THIS_MONTH',
  ultimo_mes: 'LAST_MONTH',
  mês_atual: 'THIS_MONTH',
  último_mes: 'LAST_MONTH',
  ultimos_30_dias: 'LAST_30_DAYS',
  últimos_30_dias: 'LAST_30_DAYS',
  ultimos_90_dias: 'LAST_90_DAYS',
  últimos_90_dias: 'LAST_90_DAYS',
  ytd: 'YTD'
});

const METRIC_ALIASES = Object.freeze({
  receita: 'revenue',
  faturamento: 'revenue',
  vendas: 'revenue',
  venda: 'revenue',
  pedidos: 'order_count',
  'quantidade de pedidos': 'order_count',
  ticket: 'average_ticket',
  'ticket medio': 'average_ticket',
  'ticket médio': 'average_ticket'
});

function normalize(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function detectMetric(query) {
  const normalized = normalize(query);
  const matches = Object.entries(METRIC_ALIASES)
    .filter(([alias]) => normalized.includes(alias))
    .sort((a,b) => b[0].length - a[0].length);
  if (matches.length) return matches[0][1];

  for (const metric of catalog.listMetrics()) {
    if (normalized.includes(normalize(metric.name)) || normalized.includes(normalize(metric.label))) {
      return metric.name;
    }
  }
  return null;
}

function detectPeriod(query) {
  const normalized = normalize(query);
  if (/ultimos 90 dias|últimos 90 dias|90 dias/.test(normalized)) return 'LAST_90_DAYS';
  if (/ultimos 30 dias|últimos 30 dias|30 dias/.test(normalized)) return 'LAST_30_DAYS';
  if (/ultimo mes|último mes|mes passado/.test(normalized)) return 'LAST_MONTH';
  if (/este mes|mês atual|mes atual/.test(normalized)) return 'THIS_MONTH';
  if (/hoje/.test(normalized)) return 'TODAY';
  if (/ontem/.test(normalized)) return 'YESTERDAY';
  if (/ano/.test(normalized) && /ate agora|até agora|ytd/.test(normalized)) return 'YTD';
  return 'THIS_MONTH';
}

function detectDimensions(query) {
  const normalized = normalize(query);
  const dimensions = [];
  if (/mes|mês|mensal/.test(normalized)) dimensions.push('month');
  return dimensions.length ? dimensions : ['month'];
}

function parseIntent(query) {
  const metric = detectMetric(query);
  if (!metric) {
    const error = new Error('ANALYTICS_INTENT_METRIC_NOT_FOUND');
    error.code = error.message;
    error.status = 400;
    error.details = { supported_metrics: catalog.listMetrics().map(item => item.name) };
    throw error;
  }

  return {
    operation: 'QUERY_METRIC',
    metric,
    period: detectPeriod(query),
    dimensions: detectDimensions(query),
    confidence: {
      kind: 'RULE_BASED',
      score: 1
    }
  };
}

async function resolveAndQuery(tenantId, query) {
  const intent = parseIntent(query);
  const result = await queryMetric(tenantId, {
    metric: intent.metric,
    period: intent.period,
    dimensions: intent.dimensions
  });
  return { intent, result };
}

module.exports = {
  normalize,
  detectMetric,
  detectPeriod,
  detectDimensions,
  parseIntent,
  resolveAndQuery
};
