const crypto = require('node:crypto');
const db = require('./db.firebird.service');

function stable(value) {
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + stable(value[k])).join(',') + '}';
  }
  return JSON.stringify(value);
}
function hash(value) { return crypto.createHash('sha256').update(stable(value)).digest('hex'); }

exports.list = async (tenantId, { limit = 100, cursor = 0 } = {}) => {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 100, 500));
  const safeCursor = Math.max(0, Number(cursor) || 0);
  return db.query(
    `SELECT FIRST ${safeLimit} ID, EVENT_ID, EVENT_TYPE, ACAO, DEVICE_ID, SERVER_TIMESTAMP,
            CLIENT_TIMESTAMP, CORRELATION_ID, EVENT_HASH, RESULTADO
     FROM LEGAL_EVENT_LOG
     WHERE TENANT_ID=? AND ID>?
     ORDER BY ID`, [tenantId, safeCursor]);
};

exports.record = async (tx, event) => {
  const eventHash = hash({
    tenant_id: event.tenant_id, event_id: event.event_id, event_type: event.event_type,
    action: event.action, resource: event.resource || null, payload_hash: event.payload_hash || null,
    server_timestamp: event.server_timestamp
  });
  await tx.execute(
    `INSERT INTO LEGAL_EVENT_LOG
     (TENANT_ID, USUARIO_ID, DEVICE_ID, EVENT_ID, EVENT_TYPE, ACAO, RECURSO, RECURSO_CHAVE,
      SERVER_TIMESTAMP, CLIENT_TIMESTAMP, CORRELATION_ID, PREVIOUS_HASH, EVENT_HASH, RESULTADO, METADATA, PAYLOAD_HASH)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, ?)`,
    [event.tenant_id, event.user_id || null, event.device_id || null, event.event_id,
     event.event_type, event.action, event.resource || null, event.resource_key || null,
     event.client_timestamp || null, event.correlation_id || null, event.previous_hash || null,
     eventHash, event.result || 'SUCCESS', event.metadata ? JSON.stringify(event.metadata) : null,
     event.payload_hash || null]);
  return eventHash;
};
exports.hash = hash;
