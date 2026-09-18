const crypto = require('node:crypto');
const db = require('./db.firebird.service');
const syncRepository = require('./sync.repository');

const ALLOWED_TYPES = new Set(['arduino', 'raspberry-pi', 'pic', 'android', 'ios', 'delphi', 'simulator']);

function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  return JSON.stringify(value);
}
function hash(value) { return crypto.createHash('sha256').update(canonical(value)).digest('hex'); }
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
  return db.withTransaction(async (tx) => {
    const existing = await tx.query(`SELECT FIRST 1 EVENT_ID, EVENT_HASH FROM LEGAL_EVENT_LOG WHERE TENANT_ID = ? AND EVENT_ID = ?`,[tenantId,event.event_id]);
    if (existing[0]) return { accepted:true, duplicate:true, event_id:event.event_id, event_hash:existing[0].EVENT_HASH };
    await tx.execute(`INSERT INTO LEGAL_EVENT_LOG
      (TENANT_ID, DEVICE_ID, EVENT_ID, EVENT_TYPE, ACAO, CORRELATION_ID, CLIENT_TIMESTAMP, EVENT_HASH, PAYLOAD_HASH, RESULTADO, METADATA)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'RECEIVED', ?)`,
      [tenantId,event.device_id,event.event_id,event.device_type,event.operation,correlationId||null,event.timestamp?new Date(event.timestamp):null,eventHash,payloadHash,
       JSON.stringify({protocol_version:event.protocol_version,sequence:event.sequence??null})]);
    const lat=Number(event.location?.latitude), lon=Number(event.location?.longitude);
    const hasLocation=Number.isFinite(lat)&&Number.isFinite(lon)&&lat>=-90&&lat<=90&&lon>=-180&&lon<=180;
    if(hasLocation){
      await tx.execute(`UPDATE INTEGRATION_DEVICE SET LAST_SEEN=CURRENT_TIMESTAMP,LAST_LATITUDE=?,LAST_LONGITUDE=?,LOCATION_UPDATED_AT=CURRENT_TIMESTAMP WHERE TENANT_ID=? AND DEVICE_ID=?`,[lat,lon,tenantId,event.device_id]);
    } else {
      await tx.execute(`UPDATE INTEGRATION_DEVICE SET LAST_SEEN=CURRENT_TIMESTAMP WHERE TENANT_ID=? AND DEVICE_ID=?`,[tenantId,event.device_id]);
    }
    await syncRepository.insertStagingTx(tx,{event_id:event.event_id,empresa_id:tenantId,tabela:event.operation,chave:event.sequence==null?event.event_id:String(event.sequence),operacao:'U',dados:event.payload??null,hash_unico:eventHash});
    return {accepted:true,duplicate:false,event_id:event.event_id,event_hash:eventHash};
  });
};
