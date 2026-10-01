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
  return {year:`EXTRACT(YEAR FROM ${dateColumn})`,month:`EXTRACT(MONTH FROM ${dateColumn})`};
}

function buildIsolation(table, isolation) {
  const mode=String(isolation?.mode||'').trim().toUpperCase();
  if(mode==='DEDICATED_SOURCE') return {sql:'',params:[]};
  if(mode==='TENANT_COLUMN'){
    const field=quoteIdentifier(isolation.tenantField,'tenant_field');
    if(isolation.tenantValue===null||isolation.tenantValue===undefined||String(isolation.tenantValue)==='') {
      const error=new Error('ANALYTICS_TENANT_ISOLATION_NOT_CONFIGURED'); error.code=error.message; error.status=409; throw error;
    }
    return {sql:` AND ${table}.${field} = ?`,params:[isolation.tenantValue]};
  }
  const error=new Error('ANALYTICS_TENANT_ISOLATION_NOT_CONFIGURED'); error.code=error.message; error.status=409; throw error;
}

function buildBaseQuery(metric, mappings, period, isolation) {
  const source=mappings.source, date=mappings.date, table=quoteIdentifier(source.SOURCE_NAME,'source_name');
  const dateColumn=table+'.'+quoteIdentifier(date.SOURCE_FIELD,'source_field');
  const month=buildMonthExpression(dateColumn);
  const valueColumn=metric.aggregation==='COUNT'
    ? 'COUNT(*)'
    : metric.aggregation==='SUM'
      ? 'SUM('+table+'.'+quoteIdentifier(mappings.value.SOURCE_FIELD,'source_field')+')'
      : null;
  if(!valueColumn){const error=new Error('ANALYTICS_UNSUPPORTED_AGGREGATION');error.code=error.message;error.status=400;throw error;}
  const predicate=buildIsolation(table,isolation);
  return {
    sql:`SELECT ${month.year} AS YEAR_VALUE, ${month.month} AS MONTH_VALUE, ${valueColumn} AS VALUE FROM ${table} WHERE ${dateColumn} >= ? AND ${dateColumn} <= ?${predicate.sql} GROUP BY ${month.year}, ${month.month} ORDER BY ${month.year}, ${month.month}`,
    params:[period.from,period.to,...predicate.params]
  };
}

function buildAverageTicketQuery(mappings,period,isolation) {
  const source=mappings.revenue.source, date=mappings.revenue.date, table=quoteIdentifier(source.SOURCE_NAME,'source_name');
  const dateColumn=table+'.'+quoteIdentifier(date.SOURCE_FIELD,'source_field');
  const valueColumn=table+'.'+quoteIdentifier(mappings.revenue.value.SOURCE_FIELD,'source_field');
  const month=buildMonthExpression(dateColumn);
  const predicate=buildIsolation(table,isolation);
  return {
    sql:`SELECT ${month.year} AS YEAR_VALUE, ${month.month} AS MONTH_VALUE, CAST(SUM(${valueColumn}) / NULLIF(COUNT(*), 0) AS DECIMAL(18,4)) AS VALUE FROM ${table} WHERE ${dateColumn} >= ? AND ${dateColumn} <= ?${predicate.sql} GROUP BY ${month.year}, ${month.month} ORDER BY ${month.year}, ${month.month}`,
    params:[period.from,period.to,...predicate.params]
  };
}

function buildQuery(metric,mappings,period,dimensions=[],isolation=null) {
  const normalized=dimensions.map(value=>String(value).trim().toLowerCase());
  if(normalized.some(value=>value!=='month')){
    const error=new Error('ANALYTICS_INVALID_DIMENSION');error.code=error.message;error.status=400;error.details={allowed:['month']};throw error;
  }
  if(metric.type==='DERIVED'&&metric.name==='average_ticket') return buildAverageTicketQuery(mappings,period,isolation);
  return buildBaseQuery(metric,mappings,period,isolation);
}

module.exports={IDENTIFIER,assertIdentifier,quoteIdentifier,buildQuery,buildIsolation};
