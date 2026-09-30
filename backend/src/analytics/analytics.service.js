const repo = require('./analytics.repository');
const catalog = require('./metric.catalog');
const periods = require('./period.resolver');
const builder = require('./query.builder');
const audit = require('../services/security.audit.service');
const insightRepo = require('./insight.repository');
const db = require('../services/db.service');

function invalidQuery(details) {
  const error = new Error('ANALYTICS_INVALID_QUERY');
  error.code = 'ANALYTICS_INVALID_QUERY';
  error.status = 400;
  error.details = details;
  return error;
}

function validateMetricName(name) {
  const metric = catalog.getMetric(name);
  if (!metric) {
    const error = new Error('ANALYTICS_METRIC_NOT_FOUND');
    error.code = 'ANALYTICS_METRIC_NOT_FOUND';
    error.status = 404;
    throw error;
  }
  return metric;
}

function parseMappingMetadata(mapping) {
  if (!mapping) return {};
  if (mapping.METADATA && typeof mapping.METADATA === 'object') return mapping.METADATA;
  try { return mapping.METADATA ? JSON.parse(mapping.METADATA) : {}; } catch { return {}; }
}

function resolveTenantIsolation(metric,mappings) {
  const fields=metric.requiredFields||[];
  const configs=fields.map(field=>({field,mapping:mappings[field],metadata:parseMappingMetadata(mappings[field])}));
  const modes=new Set(configs.map(item=>String(item.mapping.ISOLATION_MODE||item.metadata.isolation_mode||'').trim().toUpperCase()));
  if(modes.size!==1) {
    const error=new Error('ANALYTICS_TENANT_ISOLATION_NOT_CONFIGURED'); error.code=error.message; error.status=409; throw error;
  }
  const mode=[...modes][0];
  if(mode==='DEDICATED_SOURCE') return {mode};
  if(mode==='TENANT_COLUMN') {
    const tenantField=String(configs[0].mapping.TENANT_FIELD||configs[0].metadata.tenant_field||'').trim();
    const tenantValue=configs[0].mapping.TENANT_VALUE??configs[0].metadata.tenant_value;
    if(!/^[A-Za-z_][A-Za-z0-9_$]*$/.test(tenantField)||tenantValue===null||tenantValue===undefined||String(tenantValue)==='') {
      const error=new Error('ANALYTICS_TENANT_ISOLATION_NOT_CONFIGURED'); error.code=error.message; error.status=409; throw error;
    }
    for(const item of configs) {
      const field=String(item.mapping.TENANT_FIELD||item.metadata.tenant_field||'').trim();
      const value=item.mapping.TENANT_VALUE??item.metadata.tenant_value;
      if(field!==tenantField||String(value)!==String(tenantValue)) {
        const error=new Error('ANALYTICS_TENANT_ISOLATION_MISMATCH'); error.code=error.message; error.status=409; throw error;
      }
    }
    return {mode,tenantField,tenantValue};
  }
  const error=new Error('ANALYTICS_TENANT_ISOLATION_NOT_CONFIGURED'); error.code=error.message; error.status=409; throw error;
}

function validateBaseMappings(metric, mappings) {
  const missing=(metric.requiredFields||[]).filter(field=>!mappings[field]||mappings[field].STATUS!=='ACTIVE');
  if(missing.length){
    const error=new Error('ANALYTICS_METRIC_NOT_CONFIGURED'); error.code=error.message; error.status=409;
    error.details={metric:metric.name,missing:missing.map(field=>metric.entity+'.'+field)}; throw error;
  }
  const sourceNames=new Set((metric.requiredFields||[]).map(field=>mappings[field].SOURCE_NAME+'|'+mappings[field].SOURCE_TYPE));
  if(sourceNames.size!==1||mappings[metric.requiredFields[0]].SOURCE_TYPE!=='TABLE'){
    const error=new Error('ANALYTICS_UNSUPPORTED_SOURCE'); error.code=error.message; error.status=409; throw error;
  }
  return resolveTenantIsolation(metric,mappings);
}

async function getMetricStatus(tenantId, metric) {
  if (metric.type === 'DERIVED') {
    const statuses = await Promise.all((metric.dependencies || []).map(async dependency => {
      const item = catalog.getMetric(dependency);
      return getMetricStatus(tenantId, item);
    }));
    return {
      ...metric,
      configured: statuses.every(status => status.configured),
      dependencies: statuses.map(status => ({
        name: status.name,
        configured: status.configured,
        missing: status.missing || []
      })),
      missing: statuses.flatMap(status => status.missing || [])
    };
  }

  const mappings = await repo.getMappingsForMetric(tenantId, metric);
  const missing = (metric.requiredFields || [])
    .filter(field => !mappings[field] || mappings[field].STATUS !== 'ACTIVE')
    .map(field => metric.entity + '.' + field);
  let isolation = null;
  if (!missing.length) {
    try { isolation = resolveTenantIsolation(metric, mappings); }
    catch (error) { missing.push('TENANT_ISOLATION'); }
  }

  return {
    ...metric,
    configured: missing.length === 0,
    missing,
    isolation
  };
}

async function queryMetric(tenantId, input = {}) {
  if (!input || typeof input !== 'object') throw invalidQuery({ body: 'object_required' });

  const metric = validateMetricName(input.metric);
  const period = periods.resolvePeriod(input.period, input);
  const dimensions = Array.isArray(input.dimensions) && input.dimensions.length
    ? input.dimensions
    : ['month'];

  if (metric.type === 'DERIVED') {
    if (metric.name !== 'average_ticket') {
      const error = new Error('ANALYTICS_UNSUPPORTED_DERIVED_METRIC');
      error.code = 'ANALYTICS_UNSUPPORTED_DERIVED_METRIC';
      error.status = 501;
      throw error;
    }

    const revenue = catalog.getMetric('revenue');
    const mappings = await repo.getMappingsForMetric(tenantId, revenue);
    const isolation = validateBaseMappings(revenue, mappings);

    const query = builder.buildQuery(metric, {
      revenue: {
        source: mappings.total,
        date: mappings.occurred_at,
        value: mappings.total
      }
    }, period, dimensions, isolation);

    const rows = await db.query(query.sql, query.params);
    return formatResult(metric, period, dimensions, rows);
  }

  const mappings = await repo.getMappingsForMetric(tenantId, metric);
  const isolation = validateBaseMappings(metric, mappings);

  const query = builder.buildQuery(metric, {
    source: mappings[metric.requiredFields[0]],
    date: mappings.occurred_at,
    value: mappings[metric.field]
  }, period, dimensions, isolation);

  const rows = await require('../services/db.service').query(query.sql, query.params);
  return formatResult(metric, period, dimensions, rows);
}

function numeric(value) {
  if (value === null || value === undefined) return 0;
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

function formatResult(metric, period, dimensions, rows) {
  const data = rows.map(row => ({
    period: String(row.YEAR_VALUE).padStart(4, '0') + '-' + String(row.MONTH_VALUE).padStart(2, '0'),
    value: numeric(row.VALUE)
  }));

  return {
    metric: metric.name,
    label: metric.label,
    period: {
      name: period.name,
      from: period.from.toISOString(),
      to: period.to.toISOString()
    },
    dimensions: dimensions.map(value => String(value).trim().toLowerCase()),
    data
  };
}

async function listMetrics(tenantId) {
  const metrics = catalog.listMetrics();
  return Promise.all(metrics.map(async metric => {
    const status = await getMetricStatus(tenantId, metric);
    return {
      ...status,
      configured: Boolean(status.configured)
    };
  }));
}

async function listMappings(tenantId) {
  return repo.listMappings(tenantId);
}

function normalizeIdentifier(value, field) {
  const text = String(value || '').trim();
  if (!/^[A-Za-z_][A-Za-z0-9_$]*$/.test(text)) {
    const error = new Error('ANALYTICS_INVALID_SOURCE_MAPPING');
    error.code = 'ANALYTICS_INVALID_SOURCE_MAPPING';
    error.status = 400;
    error.details = { field };
    throw error;
  }
  return text;
}

async function saveMapping(tenantId, input = {}, correlationId = null) {
  const entityName = normalizeIdentifier(input.entity_name || input.entityName, 'entity_name');
  const fieldName = normalizeIdentifier(input.field_name || input.fieldName, 'field_name');
  const sourceName = normalizeIdentifier(input.source_name || input.sourceName, 'source_name');
  const sourceField = normalizeIdentifier(input.source_field || input.sourceField, 'source_field');
  const sourceType = String(input.source_type || input.sourceType || 'TABLE').trim().toUpperCase();
  const dataType = String(input.data_type || input.dataType || 'TEXT').trim().toUpperCase();
  const status = String(input.status || 'ACTIVE').trim().toUpperCase();
  const isolationMode = String(input.isolation_mode || input.isolationMode || 'TENANT_COLUMN').trim().toUpperCase();
  const tenantField = isolationMode === 'TENANT_COLUMN'
    ? normalizeIdentifier(input.tenant_field || input.tenantField, 'tenant_field')
    : null;
  const tenantValue = isolationMode === 'TENANT_COLUMN'
    ? (input.tenant_value ?? input.tenantValue)
    : null;

  if (sourceType !== 'TABLE') {
    const error = new Error('ANALYTICS_UNSUPPORTED_SOURCE');
    error.code = 'ANALYTICS_UNSUPPORTED_SOURCE';
    error.status = 400;
    throw error;
  }

  if (!['DEDICATED_SOURCE','TENANT_COLUMN'].includes(isolationMode)) { const error=new Error('ANALYTICS_TENANT_ISOLATION_NOT_CONFIGURED'); error.code=error.message; error.status=400; throw error; }
  if (isolationMode === 'TENANT_COLUMN' && (tenantValue === null || tenantValue === undefined || String(tenantValue) === '')) { const error=new Error('ANALYTICS_TENANT_ISOLATION_NOT_CONFIGURED'); error.code=error.message; error.status=400; throw error; }

  if (!['ACTIVE', 'DISABLED'].includes(status)) {
    const error = new Error('ANALYTICS_INVALID_MAPPING_STATUS');
    error.code = 'ANALYTICS_INVALID_MAPPING_STATUS';
    error.status = 400;
    throw error;
  }

  let mapping;
  await db.withTransaction(async tx => {
    const txMapping = await repo.upsertMapping({
    tenantId,
    entityName,
    fieldName,
    sourceType,
    sourceName,
    sourceField,
    dataType,
    status,
    isolationMode,
    tenantField,
    tenantValue,
    metadata: input.metadata
  });
  await db.withTransaction(async tx => {
    const txMapping = await repo.upsertMapping({
      tenantId,entityName,fieldName,sourceType,sourceName,sourceField,dataType,status,isolationMode,tenantField,tenantValue,metadata: input.metadata
    }, tx);
    await audit.recordTx(tx, {
      tenantId,
      correlationId,
      action: 'ANALYTICS_MAPPING_UPSERTED',
    result: 'ALLOWED',
    metadata: {
      entity_name: entityName,
      field_name: fieldName,
      source_type: sourceType,
      source_name: sourceName,
      source_field: sourceField,
      isolation_mode: isolationMode
    }
    });
    mapping = txMapping;
  });
  return mapping;
}

async function deleteMapping(tenantId, input = {}, correlationId = null) {
  const entityName = normalizeIdentifier(input.entity_name || input.entityName, 'entity_name');
  const fieldName = normalizeIdentifier(input.field_name || input.fieldName, 'field_name');
  const existing = await repo.getMapping(tenantId, entityName, fieldName);
  if (!existing) {
    const error = new Error('ANALYTICS_MAPPING_NOT_FOUND');
    error.code = 'ANALYTICS_MAPPING_NOT_FOUND';
    error.status = 404;
    throw error;
  }
  await db.withTransaction(async tx => {
    await repo.deleteMapping(tenantId, entityName, fieldName, tx);
    await audit.recordTx(tx, {
      tenantId,
      correlationId,
      action: 'ANALYTICS_MAPPING_DELETED',
      result: 'ALLOWED',
      metadata: { entity_name: entityName, field_name: fieldName }
    });
  });
  return existing;
}


function shiftPeriod(period, now = new Date()) {
  const from = new Date(period.from);
  const to = new Date(period.to);
  const duration = to.getTime() - from.getTime() + 1;
  return {
    name: 'PREVIOUS_PERIOD',
    from: new Date(from.getTime() - duration),
    to: new Date(from.getTime() - 1)
  };
}

function summarizeInsight(metric, current, previous) {
  const currentTotal = current.data.reduce((sum, row) => sum + Number(row.value || 0), 0);
  const previousTotal = previous.data.reduce((sum, row) => sum + Number(row.value || 0), 0);
  const variation = previousTotal === 0
    ? (currentTotal === 0 ? 0 : null)
    : ((currentTotal - previousTotal) / Math.abs(previousTotal));

  let type = 'STABLE';
  if (variation === null) type = 'NEW_BASELINE';
  else if (variation >= 0.10) type = 'POSITIVE_TREND';
  else if (variation <= -0.10) type = 'NEGATIVE_TREND';

  const coverage = current.data.length > 0 && previous.data.length > 0
    ? 1
    : (current.data.length > 0 || previous.data.length > 0 ? 0.5 : 0);

  const variationPercent = variation === null ? null : Number((variation * 100).toFixed(2));
  const title = type === 'POSITIVE_TREND'
    ? metric.label + ' em alta'
    : type === 'NEGATIVE_TREND'
      ? metric.label + ' em queda'
      : type === 'NEW_BASELINE'
        ? metric.label + ' com nova base de comparação'
        : metric.label + ' estável';

  return {
    type,
    metric: metric.name,
    label: metric.label,
    current: currentTotal,
    previous: previousTotal,
    baseline: previousTotal,
    variation,
    variation_percent: variationPercent,
    title,
    evidence: {
      current_period: current.period,
      previous_period: previous.period,
      current_points: current.data.length,
      previous_points: previous.data.length,
      current_series: current.data.slice(-120),
      previous_series: previous.data.slice(-120),
      coverage
    },
    explanation: variation === null
      ? (currentTotal === 0 ? 'Não houve valor no período atual nem no período anterior.' : 'O período anterior não possui base numérica; a variação percentual não é calculada.')
      : type === 'POSITIVE_TREND'
        ? 'A métrica aumentou pelo menos 10% em relação ao período imediatamente anterior.'
        : type === 'NEGATIVE_TREND'
          ? 'A métrica reduziu pelo menos 10% em relação ao período imediatamente anterior.'
          : 'A variação ficou entre -10% e +10%; o resultado é classificado como estável.',
    methodology: {
      kind: 'DETERMINISTIC',
      threshold: 0.10,
      source: 'ANALYTICS_QUERY',
      baseline: 'PREVIOUS_EQUIVALENT_PERIOD'
    }
  };
}

async function getInsight(tenantId, input = {}, correlationId = null) {
  if (!input || typeof input !== 'object') throw invalidQuery({ body: 'object_required' });

  const metric = validateMetricName(input.metric);
  const period = periods.resolvePeriod(input.period, input);
  const dimensions = Array.isArray(input.dimensions) && input.dimensions.length ? input.dimensions : ['month'];

  const current = await queryMetric(tenantId, {
    metric: metric.name,
    period: period.name,
    dimensions,
    ...(period.name === 'CUSTOM' ? {
      from: period.from.toISOString(),
      to: period.to.toISOString()
    } : {})
  });

  const previousPeriod = shiftPeriod(period);
  const previous = await queryMetric(tenantId, {
    metric: metric.name,
    period: 'CUSTOM',
    from: previousPeriod.from.toISOString(),
    to: previousPeriod.to.toISOString(),
    dimensions
  });

  const insight = summarizeInsight(metric, current, previous);
  const persisted = await insightRepo.upsertInsight({
    tenantId,
    type: insight.type,
    metric: insight.metric,
    periodStart: period.from,
    periodEnd: period.to,
    currentValue: insight.current,
    previousValue: insight.previous,
    variation: insight.variation,
    baselineValue: insight.baseline,
    title: insight.title,
    explanation: insight.explanation,
    methodology: insight.methodology,
    evidenceCoverage: insight.evidence.coverage,
    metadata: {
      dimensions: insight.dimensions || dimensions,
      evidence: insight.evidence
    },
    status: 'GENERATED'
  });

  await audit.record({
    tenantId,
    correlationId,
    action: 'ANALYTICS_INSIGHT_GENERATED',
    result: 'ALLOWED',
    metadata: {
      insight_id: persisted.id,
      metric: metric.name,
      type: insight.type,
      period_start: period.from.toISOString(),
      period_end: period.to.toISOString()
    }
  });

  return {
    ok: true,
    insight: {
      ...insight,
      id: persisted.id,
      status: persisted.status,
      created_at: persisted.created_at,
      updated_at: persisted.updated_at
    }
  };
}

async function listInsights(tenantId, input = {}) {
  const metric = input.metric ? validateMetricName(input.metric).name : undefined;
  return insightRepo.listInsights(tenantId, {
    metric,
    type: input.type,
    limit: input.limit
  });
}

async function getInsightById(tenantId, id) {
  const parsed = Number(id);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    const error = new Error('ANALYTICS_INSIGHT_INVALID_ID');
    error.code = 'ANALYTICS_INSIGHT_INVALID_ID';
    error.status = 400;
    throw error;
  }
  return insightRepo.getInsightById(tenantId, parsed);
}

module.exports = {
  queryMetric,
  listMetrics,
  listMappings,
  saveMapping,
  deleteMapping,
  getMetricStatus,
  getInsight,
  summarizeInsight,
  listInsights,
  getInsightById
};
