const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_$]*$/;

function assertIdentifier(value, label) {
  const text = String(value || '').trim();
  if (!IDENTIFIER.test(text)) {
    const error = new Error('ANALYTICS_INVALID_SOURCE_MAPPING');
    error.code = 'ANALYTICS_INVALID_SOURCE_MAPPING';
    error.status = 400;
    error.details = { field: label };
    throw error;
  }
  return text;
}

function quoteIdentifier(value, label) {
  return '"' + assertIdentifier(value, label).toUpperCase() + '"';
}

function buildMonthExpression(dateColumn) {
  return {
    year: `EXTRACT(YEAR FROM ${dateColumn})`,
    month: `EXTRACT(MONTH FROM ${dateColumn})`
  };
}

function buildBaseQuery(metric, mappings, period) {
  const source = mappings.source;
  const date = mappings.date;
  const table = quoteIdentifier(source.SOURCE_NAME, 'source_name');
  const dateColumn = table + '.' + quoteIdentifier(date.SOURCE_FIELD, 'source_field');
  const month = buildMonthExpression(dateColumn);
  const valueColumn = metric.aggregation === 'COUNT'
    ? 'COUNT(*)'
    : metric.aggregation === 'SUM'
      ? 'SUM(' + table + '.' + quoteIdentifier(mappings.value.SOURCE_FIELD, 'source_field') + ')'
      : null;

  if (!valueColumn) {
    const error = new Error('ANALYTICS_UNSUPPORTED_AGGREGATION');
    error.code = 'ANALYTICS_UNSUPPORTED_AGGREGATION';
    error.status = 400;
    throw error;
  }

  return {
    sql: `SELECT ${month.year} AS YEAR_VALUE, ${month.month} AS MONTH_VALUE, ${valueColumn} AS VALUE FROM ${table} WHERE ${dateColumn} >= ? AND ${dateColumn} <= ? GROUP BY ${month.year}, ${month.month} ORDER BY ${month.year}, ${month.month}`,
    params: [period.from, period.to]
  };
}

function buildAverageTicketQuery(mappings, period) {
  const source = mappings.revenue.source;
  const date = mappings.revenue.date;
  const table = quoteIdentifier(source.SOURCE_NAME, 'source_name');
  const dateColumn = table + '.' + quoteIdentifier(date.SOURCE_FIELD, 'source_field');
  const valueColumn = table + '.' + quoteIdentifier(mappings.revenue.value.SOURCE_FIELD, 'source_field');
  const month = buildMonthExpression(dateColumn);

  return {
    sql: `SELECT ${month.year} AS YEAR_VALUE, ${month.month} AS MONTH_VALUE, CAST(SUM(${valueColumn}) / NULLIF(COUNT(*), 0) AS DECIMAL(18,4)) AS VALUE FROM ${table} WHERE ${dateColumn} >= ? AND ${dateColumn} <= ? GROUP BY ${month.year}, ${month.month} ORDER BY ${month.year}, ${month.month}`,
    params: [period.from, period.to]
  };
}

function buildQuery(metric, mappings, period, dimensions = []) {
  const normalized = dimensions.map(value => String(value).trim().toLowerCase());
  if (normalized.some(value => value !== 'month')) {
    const error = new Error('ANALYTICS_INVALID_DIMENSION');
    error.code = 'ANALYTICS_INVALID_DIMENSION';
    error.status = 400;
    error.details = { allowed: ['month'] };
    throw error;
  }

  if (!normalized.length) {
    return buildBaseQuery(metric, mappings, period);
  }

  if (metric.type === 'DERIVED' && metric.name === 'average_ticket') {
    return buildAverageTicketQuery(mappings, period);
  }

  return buildBaseQuery(metric, mappings, period);
}

module.exports = { IDENTIFIER, assertIdentifier, quoteIdentifier, buildQuery };
