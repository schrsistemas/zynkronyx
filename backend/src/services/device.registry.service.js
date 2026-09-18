const crypto = require('node:crypto');
const db = require('./db.firebird.service');

const ALLOWED_TYPES = new Set(['arduino', 'raspberry-pi', 'pic', 'android', 'ios', 'delphi', 'simulator']);

function tokenHash(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
function validate(input) {
  if (!input || typeof input.device_id !== 'string' || !input.device_id.trim() || input.device_id.length > 100) throw new Error('device_id obrigatorio');
  if (!ALLOWED_TYPES.has(input.device_type)) throw new Error('device_type invalido');
  if (input.protocol_version !== undefined && (!Number.isInteger(input.protocol_version) || input.protocol_version < 1)) throw new Error('protocol_version invalido');
}
exports.register = async (tenantId, input) => {
  validate(input);
  const token = crypto.randomBytes(32).toString('base64url');
  await db.execute(`INSERT INTO INTEGRATION_DEVICE
    (TENANT_ID, DEVICE_ID, DEVICE_TYPE, NAME, STATUS, PROTOCOL_VERSION, CREDENTIAL_HASH, CREDENTIAL_CREATED_AT)
    VALUES (?, ?, ?, ?, 'A', ?, ?, CURRENT_TIMESTAMP)`,
    [tenantId, input.device_id.trim(), input.device_type, input.name || null, input.protocol_version || 1, tokenHash(token)]);
  return { device_id: input.device_id.trim(), credential: token };
};
exports.list = async tenantId => db.query(
  `SELECT DEVICE_ID, DEVICE_TYPE, NAME, STATUS, PROTOCOL_VERSION, LAST_SEEN, CREATED_AT
   FROM INTEGRATION_DEVICE WHERE TENANT_ID = ? ORDER BY DEVICE_ID`, [tenantId]);
exports.revoke = async (tenantId, deviceId) => {
  const rows = await db.query(
    `SELECT DEVICE_ID FROM INTEGRATION_DEVICE WHERE TENANT_ID=? AND DEVICE_ID=? AND STATUS='A'`,
    [tenantId, deviceId]);
  if (!rows[0]) return false;
  await db.execute(
    `UPDATE INTEGRATION_DEVICE SET STATUS='I' WHERE TENANT_ID=? AND DEVICE_ID=? AND STATUS='A'`,
    [tenantId, deviceId]);
  return true;
};
exports.rotate = async (tenantId, deviceId) => {
  const token = crypto.randomBytes(32).toString('base64url');
  const result = await db.execute(
    `UPDATE INTEGRATION_DEVICE
     SET CREDENTIAL_HASH=?, CREDENTIAL_CREATED_AT=CURRENT_TIMESTAMP
     WHERE TENANT_ID=? AND DEVICE_ID=? AND STATUS='A'`,
    [tokenHash(token), tenantId, deviceId]);
  return { rotated: !!result, device_id: deviceId, credential: token };
};
exports.authenticate = async (tenantId, deviceId, credential) => {
  if (!deviceId || !credential) return null;
  const rows = await db.query(
    `SELECT DEVICE_ID, DEVICE_TYPE, PROTOCOL_VERSION
     FROM INTEGRATION_DEVICE
     WHERE TENANT_ID=? AND DEVICE_ID=? AND STATUS='A' AND CREDENTIAL_HASH=?`,
    [tenantId, deviceId, tokenHash(credential)]);
  return rows[0] || null;
};
