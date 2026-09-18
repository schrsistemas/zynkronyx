const crypto = require('node:crypto');
const db = require('./db.firebird.service');

function tokenHash(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
function credentialDays() {
  const n = Number(process.env.DEVICE_CREDENTIAL_DAYS || 365);
  return Math.max(1, Math.min(Number.isFinite(n) ? n : 365, 3650));
}
function scopes(input) {
  const value = input?.scopes;
  if (value === undefined) return 'events:write';
  if (!Array.isArray(value) || value.length === 0 || value.some(x => typeof x !== 'string' || !/^[a-z0-9:_-]{1,50}$/.test(x))) throw new Error('scopes invalidos');
  const allowed = new Set(['events:write', 'sync:read']);
  if (value.some(x => !allowed.has(x))) throw new Error('scope nao permitido');
  return [...new Set(value)].join(',');
}
function validate(input) {
  if (!input || typeof input.device_id !== 'string' || !input.device_id.trim()) throw new Error('device_id obrigatorio');
  if (!['arduino','raspberry-pi','pic','android','ios','delphi','simulator'].includes(input.device_type)) throw new Error('device_type invalido');
}
exports.register = async (tenantId, input) => {
  validate(input);
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresDays = credentialDays();
  const scopeList = scopes(input);
  await db.execute(`INSERT INTO INTEGRATION_DEVICE
    (TENANT_ID, DEVICE_ID, DEVICE_TYPE, NAME, STATUS, PROTOCOL_VERSION, CREDENTIAL_HASH, CREDENTIAL_CREATED_AT, CREDENTIAL_EXPIRES_AT, CREDENTIAL_VERSION, SCOPES)
    VALUES (?, ?, ?, ?, 'A', ?, ?, CURRENT_TIMESTAMP, DATEADD(${expiresDays} DAY TO CURRENT_TIMESTAMP), 1, ?)`,
    [tenantId,input.device_id.trim(),input.device_type,input.name || null,input.protocol_version || 1,tokenHash(token),scopeList]);
  return { device_id: input.device_id.trim(), credential: token, expires_in_days: expiresDays, scopes: scopeList.split(',') };
};
exports.list = async tenantId => db.query(`SELECT DEVICE_ID, DEVICE_TYPE, NAME, STATUS, PROTOCOL_VERSION, LAST_SEEN, CREATED_AT, LAST_LATITUDE, LAST_LONGITUDE, LOCATION_UPDATED_AT FROM INTEGRATION_DEVICE WHERE TENANT_ID = ? ORDER BY DEVICE_ID`,[tenantId]);
exports.revoke = async (tenantId, deviceId) => {
  const result = await db.execute(`UPDATE INTEGRATION_DEVICE SET STATUS='I' WHERE TENANT_ID=? AND DEVICE_ID=? AND STATUS='A'`,[tenantId,deviceId]);
  return !!result;
};
exports.authenticate = async (tenantId, deviceId, credential) => {
  if (!deviceId || !credential) return null;
  const rows = await db.query(`SELECT DEVICE_ID, DEVICE_TYPE, PROTOCOL_VERSION, SCOPES FROM INTEGRATION_DEVICE WHERE TENANT_ID=? AND DEVICE_ID=? AND STATUS='A' AND CREDENTIAL_HASH=? AND (CREDENTIAL_EXPIRES_AT IS NULL OR CREDENTIAL_EXPIRES_AT > CURRENT_TIMESTAMP)`,[tenantId,deviceId,tokenHash(credential)]);
  return rows[0] || null;
};
exports.rotate = async (tenantId, deviceId) => {
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresDays = credentialDays();
  const result = await db.execute(
    `UPDATE INTEGRATION_DEVICE SET CREDENTIAL_HASH=?, CREDENTIAL_CREATED_AT=CURRENT_TIMESTAMP,
      CREDENTIAL_EXPIRES_AT=DATEADD(${expiresDays} DAY TO CURRENT_TIMESTAMP), CREDENTIAL_VERSION=COALESCE(CREDENTIAL_VERSION,0)+1
     WHERE TENANT_ID=? AND DEVICE_ID=? AND STATUS='A'`,
    [tokenHash(token), tenantId, deviceId]);
  if (!result) return null;
  return { device_id: deviceId, credential: token, expires_in_days: expiresDays };
};
exports.hasScope = (device, scope) => String(device?.SCOPES || '').split(',').includes(scope);
