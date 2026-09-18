const crypto = require('node:crypto');
const db = require('./db.firebird.service');

function tokenHash(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
function validate(input) {
  if (!input || typeof input.device_id !== 'string' || !input.device_id.trim()) throw new Error('device_id obrigatorio');
  if (!['arduino','raspberry-pi','pic','android','ios','delphi','simulator'].includes(input.device_type)) throw new Error('device_type invalido');
}
exports.register = async (tenantId, input) => {
  validate(input);
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresDays = Math.max(1, Math.min(Number(process.env.DEVICE_CREDENTIAL_DAYS || 365), 3650));
  await db.execute(`INSERT INTO INTEGRATION_DEVICE
    (TENANT_ID, DEVICE_ID, DEVICE_TYPE, NAME, STATUS, PROTOCOL_VERSION, CREDENTIAL_HASH, CREDENTIAL_CREATED_AT)
    VALUES (?, ?, ?, ?, 'A', ?, ?, CURRENT_TIMESTAMP)`,
    [tenantId,input.device_id,input.device_type,input.name || null,input.protocol_version || 1,tokenHash(token)]);
  return { device_id: input.device_id, credential: token };
};
exports.list = async tenantId => db.query(`SELECT DEVICE_ID, DEVICE_TYPE, NAME, STATUS, PROTOCOL_VERSION, LAST_SEEN, CREATED_AT FROM INTEGRATION_DEVICE WHERE TENANT_ID = ? ORDER BY DEVICE_ID`,[tenantId]);
exports.revoke = async (tenantId, deviceId) => {
  const result = await db.execute(`UPDATE INTEGRATION_DEVICE SET STATUS='I' WHERE TENANT_ID=? AND DEVICE_ID=? AND STATUS='A'`,[tenantId,deviceId]);
  return !!result;
};
exports.authenticate = async (tenantId, deviceId, credential) => {
  if (!deviceId || !credential) return null;
  const rows = await db.query(`SELECT DEVICE_ID, DEVICE_TYPE, PROTOCOL_VERSION FROM INTEGRATION_DEVICE WHERE TENANT_ID=? AND DEVICE_ID=? AND STATUS='A' AND CREDENTIAL_HASH=? AND (CREDENTIAL_EXPIRES_AT IS NULL OR CREDENTIAL_EXPIRES_AT > CURRENT_TIMESTAMP)`,[tenantId,deviceId,tokenHash(credential)]);
  return rows[0] || null;
};
