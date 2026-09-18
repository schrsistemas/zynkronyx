const test = require('node:test');
const assert = require('node:assert/strict');

test('security audit records metadata without credential material', async () => {
  const auditPath=require.resolve('../src/services/security.audit.service');
  const dbPath=require.resolve('../src/services/db.firebird.service');
  const db=require(dbPath);
  const original=db.execute;
  let call;
  db.execute=async(sql,params)=>{call={sql,params};};
  delete require.cache[auditPath];
  const audit=require(auditPath);
  const result=await audit.record({
    tenantId:7, deviceId:'arduino-01', action:'DEVICE_SCOPE',
    result:'DENIED', correlationId:'corr-1',
    metadata:{required_scope:'sync:read',reason:'missing_scope'}
  });
  assert.match(result.event_id,/^[0-9a-f-]{36}$/);
  assert.match(result.event_hash,/^[0-9a-f]{64}$/);
  assert.match(call.sql,/INSERT INTO LEGAL_EVENT_LOG/);
  assert.equal(call.params[0],7);
  assert.equal(call.params[1],'arduino-01');
  assert.equal(call.params[4],'corr-1');
  assert.equal(JSON.stringify(call.params).includes('x-device-credential'),false);
  assert.equal(JSON.stringify(call.params).includes('credential'),false);
  db.execute=original;
});
