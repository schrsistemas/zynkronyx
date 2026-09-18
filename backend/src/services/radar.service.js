const db = require('./db.firebird.service');

function privacyMode(req) {
  return String(req.headers['x-location-precision'] || 'coarse').toLowerCase();
}
function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round(Number(value) * factor) / factor;
}
exports.list = async (tenantId, req) => {
  const precise = privacyMode(req) === 'precise';
  const rows = await db.query(`
    SELECT DEVICE_ID, DEVICE_TYPE, NAME, STATUS, PROTOCOL_VERSION,
           LAST_SEEN, LAST_LATITUDE, LAST_LONGITUDE, LAST_LOCATION_ACCURACY,
           LOCATION_UPDATED_AT
    FROM INTEGRATION_DEVICE
    WHERE TENANT_ID = ? AND STATUS = 'A'
    ORDER BY LAST_SEEN DESC, DEVICE_ID
  `, [tenantId]);
  return rows.map(row => {
    const lat = row.LAST_LATITUDE == null ? null : Number(row.LAST_LATITUDE);
    const lon = row.LAST_LONGITUDE == null ? null : Number(row.LAST_LONGITUDE);
    return {
      device_id: row.DEVICE_ID, device_type: row.DEVICE_TYPE, name: row.NAME,
      status: row.STATUS, protocol_version: row.PROTOCOL_VERSION, last_seen: row.LAST_SEEN,
      location: lat == null || lon == null ? null : {
        latitude: precise ? lat : round(lat, 2),
        longitude: precise ? lon : round(lon, 2),
        accuracy_meters: row.LAST_LOCATION_ACCURACY == null ? null : Number(row.LAST_LOCATION_ACCURACY),
        precision: precise ? 'precise' : 'coarse'
      },
      location_updated_at: row.LOCATION_UPDATED_AT
    };
  });
};
