const db = require('./db.firebird.service');

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 1000;

function normalizeLimit(value) {
  if (value === undefined || value === null || value === '') return DEFAULT_LIMIT;
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    const error = new Error('limit must be an integer between 1 and 1000');
    error.statusCode = 400;
    throw error;
  }
  return limit;
}

function parseSince(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const error = new Error('since must be a valid ISO8601 date');
    error.statusCode = 400;
    throw error;
  }
  return date.toISOString();
}

function parseCursorId(value) {
  if (value === undefined || value === null || value === '') return 0;
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 0) {
    const error = new Error('cursor_id must be a non-negative integer');
    error.statusCode = 400;
    throw error;
  }
  return id;
}

async function getDelta({ since, cursorId, limit } = {}) {
  const normalizedSince = parseSince(since);
  const normalizedCursorId = parseCursorId(cursorId);
  const normalizedLimit = normalizeLimit(limit);

  const sql = normalizedSince
    ? `SELECT ID, EMPRESA_ID, TABELA, CHAVE, OPERACAO, DATA, HASH_UNICO
       FROM SYNC_LOG
       WHERE (DATA > ? OR (DATA = ? AND ID > ?))
       ORDER BY DATA, ID
       ROWS 1 TO ${normalizedLimit}`
    : `SELECT ID, EMPRESA_ID, TABELA, CHAVE, OPERACAO, DATA, HASH_UNICO
       FROM SYNC_LOG
       ORDER BY DATA, ID
       ROWS 1 TO ${normalizedLimit}`;

  const params = normalizedSince
    ? [normalizedSince, normalizedSince, normalizedCursorId]
    : [];

  const data = await db.query(sql, params);
  const last = data.length ? data[data.length - 1] : null;

  return {
    data,
    count: data.length,
    next: last ? { since: new Date(last.DATA).toISOString(), cursor_id: last.ID } : null
  };
}

function validateIncomingPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    const error = new Error('payload must be a JSON object');
    error.statusCode = 400;
    throw error;
  }

  for (const field of ['tabela', 'chave', 'operacao']) {
    if (typeof payload[field] !== 'string' || !payload[field].trim()) {
      const error = new Error(`${field} is required`);
      error.statusCode = 400;
      throw error;
    }
  }

  if (!Object.prototype.hasOwnProperty.call(payload, 'dados')) {
    const error = new Error('dados is required');
    error.statusCode = 400;
    throw error;
  }
}

async function stageIncoming({ tenantId, payload }) {
  validateIncomingPayload(payload);

  await db.execute(`
    INSERT INTO SYNC_STAGING
      (EMPRESA_ID, TABELA, CHAVE, OPERACAO, PAYLOAD, STATUS)
    VALUES (?, ?, ?, ?, ?, 'N')
  `, [
    tenantId,
    payload.tabela.trim(),
    payload.chave.trim(),
    payload.operacao.trim().toUpperCase(),
    JSON.stringify(payload.dados)
  ]);

  return { accepted: true };
}

module.exports = {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  getDelta,
  stageIncoming,
  normalizeLimit,
  parseSince,
  parseCursorId,
  validateIncomingPayload
};
