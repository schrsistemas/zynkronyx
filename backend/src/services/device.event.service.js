const crypto = require('node:crypto');
const db = require('./db.firebird.service');
const syncService = require('./sync.service');

const ALLOWED_TYPES = new Set(['arduino', 'raspberry-pi', 'pic', 'android', 'ios', 'delphi', 'simulator']);

function canonical(value) {
  return JSON.stringify(value, Object.keys(value || {}).sort());
}

function hash(value) {
  return crypto.createHash('sha256').update(canonical(value)).digest('hex');
}

function validateEvent(event) {
  if (!event || typeof event !== 'object' || Array.isArray(event)) throw new Error('Evento invalido');
  if (typeof event.event_id !== 'string' || !event.event_id.trim() || event.event_id.length > 100) throw new Error('event_id obrigatorio');
  if (typeof event.device_id !== 'string' || !event.device_id.trim() || event.device_id.length > 100) throw new Error('device_id obrigatorio');
  if (!ALLOWED_TYPES.has(event.device_type)) throw new Error('device_type invalido');
  if (!Number.isInteger(event.protocol_version) || event.protocol_version < 1) throw new Error('protocol_version invalido');
  if (typeof event.operation !== 'string' || !event.operation.trim() || event.operation.length > 50) throw new Error('operation obrigatoria');
  return event;
}

exports.ingest = async (tenantId, event, correlationId) => {
  validateEvent(event);
  const eventHash = hash(event);
  const payloadHash = hash(event.payload ?? null);

  try {
    await db.execute(
      `INSERT INTO LEGAL_EVENT_LOG
       (TENANT_ID, DEVICE_ID, EVENT_ID, EVENT_TYPE, ACAO, CORRELATION_ID, CLIENT_TIMESTAMP, EVENT_HASH, PAYLOAD_HASH, RESULTADO, METADATA)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'RECEIVED', ?)`,
      [
        tenantId, event.device_id, event.event_id, event.device_type, event.operation,
        correlationId || null, event.timestamp ? new Date(event.timestamp) : null,
        eventHash, payloadHash, JSON.stringify({ protocol_version: event.protocol_version, sequence: event.sequence ?? null })
      ]
    );
  } catch (error) {
    if (error && (error.code === 335544665 || /violation.*UNIQUE|unique.*constraint/i.test(error.message || ''))) {
      return { accepted: true, duplicate: true, event_id: event.event_id, event_hash: eventHash };
    }
    throw error;
  }

  await db.execute(
    `UPDATE INTEGRATION_DEVICE
     SET LAST_SEEN = CURRENT_TIMESTAMP
     WHERE TENANT_ID = ? AND DEVICE_ID = ?`,
    [tenantId, event.device_id]
  );

  await syncService.processIncoming([{
    event_id: event.event_id,
    empresa_id: tenantId,
    tabela: event.operation,
    chave: event.sequence == null ? event.event_id : String(event.sequence),
    operacao: 'U',
    dados: event.payload ?? null,
    hash_unico: eventHash
  }]);

  return { accepted: true, duplicate: false, event_id: event.event_id, event_hash: eventHash };
};
