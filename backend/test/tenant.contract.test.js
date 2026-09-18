const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

function loadTenant(queryResult) {
  const original = Module._load;
  Module._load = function(request, parent, isMain) {
    if (request === '../services/db.firebird.service' && parent?.filename?.endsWith('/middleware/tenant.js')) {
      return { query: async () => queryResult };
    }
    return original.apply(this, arguments);
  };
  delete require.cache[require.resolve('../src/middleware/tenant')];
  const tenant = require('../src/middleware/tenant');
  Module._load = original;
  return tenant;
}

test('tenant middleware requires an API key', async () => {
  const tenant = loadTenant([]);
  let status;
  const res = { status(n){ status=n; return this; }, json(){ return this; } };
  await tenant({ headers:{} }, res, () => {});
  assert.equal(status, 401);
});

test('tenant middleware rejects unknown API keys', async () => {
  const tenant = loadTenant([]);
  let status;
  const res = { status(n){ status=n; return this; }, json(){ return this; } };
  await tenant({ headers:{'x-api-key':'unknown'} }, res, () => {});
  assert.equal(status, 401);
});

test('tenant middleware blocks inactive tenants', async () => {
  const tenant = loadTenant([{ID:7,STATUS:'I'}]);
  let status;
  const res = { status(n){ status=n; return this; }, json(){ return this; } };
  await tenant({ headers:{'x-api-key':'tenant-key'} }, res, () => {});
  assert.equal(status, 403);
});

test('tenant middleware binds only the resolved tenant', async () => {
  const tenant = loadTenant([{ID:42,STATUS:'A'}]);
  const req = { headers:{'x-api-key':'tenant-key'} };
  let called = false;
  const res = { status(n){ this.code=n; return this; }, json(){ return this; } };
  await tenant(req, res, () => { called = true; });
  assert.equal(called, true);
  assert.deepEqual(req.tenant, {id:42,status:'A'});
});
