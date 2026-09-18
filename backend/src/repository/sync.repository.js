const db = require('../services/db.firebird.service');

function parsePayload(row) {
  if (row && typeof row.PAYLOAD === 'string') {
    try { return JSON.parse(row.PAYLOAD); } catch (_) { return row.PAYLOAD; }
  }
  return row?.PAYLOAD ?? null;
}

exports.fetchDelta = async (ultimaData, { limit = 500 } = {}) => {
  const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 5000) : 500;
  const rows = await db.query(`
    SELECT FIRST ${safeLimit}
      ID, EMPRESA_ID, TABELA, CHAVE, OPERACAO, DATA, HASH_UNICO
    FROM SYNC_LOG
    WHERE DATA > ?
    ORDER BY DATA, ID
  `, [ultimaData]);

  return rows.map(row => ({
    id: row.ID,
    empresa_id: row.EMPRESA_ID,
    tabela: row.TABELA,
    chave: row.CHAVE,
    operacao: row.OPERACAO,
    data: row.DATA,
    hash_unico: row.HASH_UNICO
  }));
};

exports.insertStaging = async (item) => {
  const payload = JSON.stringify(item.dados ?? item.payload ?? item);
  const empresaId = item.empresa_id ?? item.empresaId ?? 1;

  await db.execute(`
    INSERT INTO SYNC_STAGING
      (EMPRESA_ID, TABELA, CHAVE, OPERACAO, PAYLOAD, DATA_RECEBIMENTO, PROCESSADO, TENTATIVAS, STATUS)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 'N', 0, 'N')
  `, [
    empresaId,
    item.tabela,
    item.chave ?? null,
    item.operacao,
    payload
  ]);

  return { staged: true };
};

exports.fetchPending = async (limit = 100) => {
  const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 1000) : 100;
  const rows = await db.query(`
    SELECT FIRST ${safeLimit}
      ID, EMPRESA_ID, TABELA, CHAVE, OPERACAO, PAYLOAD, TENTATIVAS, STATUS
    FROM SYNC_STAGING
    WHERE STATUS = 'N'
    ORDER BY ID
  `);
  return rows.map(row => ({ ...row, payload: parsePayload(row) }));
};

exports.markProcessing = async (id) => {
  await db.execute(`
    UPDATE SYNC_STAGING
    SET STATUS = 'P', TENTATIVAS = COALESCE(TENTATIVAS, 0) + 1
    WHERE ID = ? AND STATUS = 'N'
  `, [id]);
};

exports.markError = async (id) => {
  await db.execute(`
    UPDATE SYNC_STAGING
    SET STATUS = 'E'
    WHERE ID = ?
  `, [id]);
};
