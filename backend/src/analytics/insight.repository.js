const db = require('../services/db.service');

function rowToInsight(row) {
  if (!row) return null;
  const json = value => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'object') return value;
    try { return JSON.parse(String(value)); } catch { return null; }
  };
  return {
    id: Number(row.ID),
    tenant_id: Number(row.TENANT_ID),
    type: row.TYPE,
    metric: row.METRIC,
    period_start: row.PERIOD_START,
    period_end: row.PERIOD_END,
    current_value: Number(row.CURRENT_VALUE),
    previous_value: Number(row.PREVIOUS_VALUE),
    variation: row.VARIATION === null || row.VARIATION === undefined ? null : Number(row.VARIATION),
    baseline_value: row.BASELINE_VALUE === null || row.BASELINE_VALUE === undefined ? null : Number(row.BASELINE_VALUE),
    title: row.TITLE,
    explanation: row.EXPLANATION,
    methodology: json(row.METHODOLOGY),
    status: row.STATUS,
    evidence_coverage: row.EVIDENCE_COVERAGE === null || row.EVIDENCE_COVERAGE === undefined ? null : Number(row.EVIDENCE_COVERAGE),
    metadata: json(row.METADATA),
    created_at: row.CREATED_AT,
    updated_at: row.UPDATED_AT
  };
}

const columns = 'ID,TENANT_ID,TYPE,METRIC,PERIOD_START,PERIOD_END,CURRENT_VALUE,PREVIOUS_VALUE,VARIATION,BASELINE_VALUE,TITLE,EXPLANATION,METHODOLOGY,STATUS,EVIDENCE_COVERAGE,METADATA,CREATED_AT,UPDATED_AT';

exports.getInsight = async (tenantId, metric, type, periodStart, periodEnd) => {
  const rows = await db.query(
    'SELECT ' + columns + ' FROM ANALYTICS_INSIGHT WHERE TENANT_ID=? AND METRIC=? AND TYPE=? AND PERIOD_START=? AND PERIOD_END=?',
    [tenantId, metric, type, periodStart, periodEnd]
  );
  return rowToInsight(rows[0] || null);
};

exports.upsertInsight = async input => {
  const existing = await exports.getInsight(
    input.tenantId, input.metric, input.type, input.periodStart, input.periodEnd
  );
  const methodology = JSON.stringify(input.methodology || {});
  const metadata = JSON.stringify(input.metadata || {});

  if (existing) {
    await db.execute(
      'UPDATE ANALYTICS_INSIGHT SET CURRENT_VALUE=?,PREVIOUS_VALUE=?,VARIATION=?,BASELINE_VALUE=?,TITLE=?,EXPLANATION=?,METHODOLOGY=?,STATUS=?,EVIDENCE_COVERAGE=?,METADATA=?,UPDATED_AT=' +
      db.dialect().currentTimestamp +
      ' WHERE TENANT_ID=? AND METRIC=? AND TYPE=? AND PERIOD_START=? AND PERIOD_END=?',
      [
        input.currentValue,
        input.previousValue,
        input.variation,
        input.baselineValue,
        input.title,
        input.explanation,
        methodology,
        input.status || 'GENERATED',
        input.evidenceCoverage,
        metadata,
        input.tenantId,
        input.metric,
        input.type,
        input.periodStart,
        input.periodEnd
      ]
    );
    return exports.getInsight(input.tenantId, input.metric, input.type, input.periodStart, input.periodEnd);
  }

  const id = await db.nextId('ANALYTICS_INSIGHT');
  await db.execute(
    'INSERT INTO ANALYTICS_INSIGHT (ID,TENANT_ID,TYPE,METRIC,PERIOD_START,PERIOD_END,CURRENT_VALUE,PREVIOUS_VALUE,VARIATION,BASELINE_VALUE,TITLE,EXPLANATION,METHODOLOGY,STATUS,EVIDENCE_COVERAGE,METADATA) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
    [
      id,
      input.tenantId,
      input.type,
      input.metric,
      input.periodStart,
      input.periodEnd,
      input.currentValue,
      input.previousValue,
      input.variation,
      input.baselineValue,
      input.title,
      input.explanation,
      methodology,
      input.status || 'GENERATED',
      input.evidenceCoverage,
      metadata
    ]
  );
  return exports.getInsight(input.tenantId, input.metric, input.type, input.periodStart, input.periodEnd);
};

exports.listInsights = async (tenantId, input = {}) => {
  const params = [tenantId];
  let where = 'TENANT_ID=?';
  if (input.metric) {
    where += ' AND METRIC=?';
    params.push(input.metric);
  }
  if (input.type) {
    where += ' AND TYPE=?';
    params.push(input.type);
  }
  const parsedLimit = Number(input.limit);
  const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(Math.trunc(parsedLimit), 1), 100) : 25;
  const sql = db.dialect().limit(
    'SELECT ' + columns + ' FROM ANALYTICS_INSIGHT WHERE ' + where + ' ORDER BY CREATED_AT DESC',
    limit
  );
  const rows = await db.query(sql, params);
  return rows.map(rowToInsight);
};
