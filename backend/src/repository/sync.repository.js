const crypto = require('node:crypto');
const db = require('../services/db.service');

function stablePayload(item) {
  return JSON.stringify(item.dados ?? item.payload ?? item);
}
function payloadHash(item) {
  return crypto.createHash('sha256').update(stablePayload(item)).digest('hex');
}
function parsePayload(row) {
  if (row && typeof row.PAYLOAD === 'string') {
    try { return JSON.parse(row.PAYLOAD); } catch (_) { return row.PAYLOAD; }
  }
  return row?.PAYLOAD ?? null;
}
function dialect() { return db.dialect(); }
function limitSelect(columns, fromSql, n, tail='') {
  return dialect().limit(`SELECT ${columns} FROM ${fromSql}${tail}`, n);
}

exports.fetchDelta = async (ultimaData, { limit = 500 } = {}) => {
  const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 5000) : 500;
  const rows = await db.query(limitSelect(
    'ID, EMPRESA_ID, TABELA, CHAVE, OPERACAO, DATA, HASH_UNICO',
    'SYNC_LOG WHERE DATA > ? ORDER BY DATA, ID',
    safeLimit
  ), [ultimaData]);
  return rows.map(row => ({
    id: row.ID, empresa_id: row.EMPRESA_ID, tabela: row.TABELA,
    chave: row.CHAVE, operacao: row.OPERACAO, data: row.DATA, hash_unico: row.HASH_UNICO
  }));
};

exports.insertStagingTx = async (tx, item) => {
  const payload = stablePayload(item);
  const hashUnico = item.hash_unico ?? item.hashUnico ?? payloadHash(item);
  const empresaId = item.empresa_id ?? item.empresaId ?? 1;
  await tx.execute(`
    INSERT INTO SYNC_STAGING
      (EMPRESA_ID, TABELA, CHAVE, OPERACAO, PAYLOAD, DATA_RECEBIMENTO, PROCESSADO, TENTATIVAS, STATUS, HASH_UNICO)
    VALUES (?, ?, ?, ?, ?, ${dialect().currentTimestamp}, 'N', 0, 'N', ?)
  `, [empresaId, item.tabela, item.chave ?? null, item.operacao, payload, hashUnico]);
  return { staged: true, hash_unico: hashUnico };
};

exports.insertStaging = async (item) => {
  const payload = stablePayload(item);
  const hashUnico = item.hash_unico ?? item.hashUnico ?? payloadHash(item);
  const empresaId = item.empresa_id ?? item.empresaId ?? 1;
  await db.execute(`
    INSERT INTO SYNC_STAGING
      (EMPRESA_ID, TABELA, CHAVE, OPERACAO, PAYLOAD, DATA_RECEBIMENTO, PROCESSADO, TENTATIVAS, STATUS, HASH_UNICO)
    VALUES (?, ?, ?, ?, ?, ${dialect().currentTimestamp}, 'N', 0, 'N', ?)
  `, [empresaId, item.tabela, item.chave ?? null, item.operacao, payload, hashUnico]);
  return { staged: true, hash_unico: hashUnico };
};

exports.fetchPending = async (limit = 100) => {
  const leaseSeconds = Math.max(30, Math.min(Number(process.env.SYNC_LEASE_SECONDS || 300), 86400));
  const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 1000) : 100;
  const leaseExpired = dialect().beforeNow('DATA_PROCESSAMENTO', leaseSeconds);
  const rows = await db.query(limitSelect(
    'ID, EMPRESA_ID, TABELA, CHAVE, OPERACAO, PAYLOAD, TENTATIVAS, STATUS, DATA_RECEBIMENTO, DATA_PROCESSAMENTO, WORKER_ID',
    `SYNC_STAGING WHERE STATUS = 'N' OR (STATUS = 'P' AND ${leaseExpired}) ORDER BY ID`,
    safeLimit
  ));
  return rows.map(row => ({ ...row, payload: parsePayload(row) }));
};

exports.markProcessing = async (id, workerId = 'zynkronyx') => {
  const leaseSeconds = Math.max(30, Math.min(Number(process.env.SYNC_LEASE_SECONDS || 300), 86400));
  const leaseExpired = dialect().beforeNow('DATA_PROCESSAMENTO', leaseSeconds);
  const sql = dialect().returning(`
    UPDATE SYNC_STAGING
    SET STATUS = 'P',
        TENTATIVAS = COALESCE(TENTATIVAS, 0) + 1,
        DATA_PROCESSAMENTO = ${dialect().currentTimestamp},
        WORKER_ID = ?
    WHERE ID = ?
      AND (STATUS = 'N' OR (STATUS = 'P' AND ${leaseExpired}))
  `, 'ID, TENTATIVAS');
  const rows = await db.query(sql, [workerId, id]);
  const row = rows?.[0];
  return row ? { id: row.ID, attempts: Number(row.TENTATIVAS || 0) } : null;
};

exports.markError = async (id, { permanent = false } = {}) => {
  await db.execute(`
    UPDATE SYNC_STAGING
    SET STATUS = ?, PROCESSADO = CASE WHEN ? = 'S' THEN 'N' ELSE PROCESSADO END,
        DATA_PROCESSAMENTO = NULL, WORKER_ID = NULL
    WHERE ID = ?
  `, [permanent ? 'E' : 'N', permanent ? 'S' : 'N', id]);
};

exports.markProcessed = async (id) => {
  await db.execute(`
    UPDATE SYNC_STAGING
    SET STATUS = 'S', PROCESSADO = 'S', DATA_PROCESSAMENTO = NULL, WORKER_ID = NULL
    WHERE ID = ? AND STATUS = 'P'
  `, [id]);
};
