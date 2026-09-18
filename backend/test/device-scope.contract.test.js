const test = require('node:test');
const assert = require('node:assert/strict');

function mockResponse() {
  return { code:null, payload:null, status(n){this.code=n;return this;}, json(v){this.payload=v;return this;} };
}

test('device event controller rejects an authenticated device without events:write', async () => {
  const registryPath=require.resolve('../src/services/device.registry.service');
  const controllerPath=require.resolve('../src/controllers/device.event.controller');
  const registry=require(registryPath);
  const originalAuth=registry.authenticate;
  const originalScope=registry.hasScope;
  registry.authenticate=async()=>({DEVICE_ID:'d1',DEVICE_TYPE:'arduino',PROTOCOL_VERSION:1,SCOPES:'sync:read'});
  registry.hasScope=()=>false;
  delete require.cache[controllerPath];
  const controller=require(controllerPath);
  const res=mockResponse();
  await controller.ingest({tenant:{id:1},headers:{'x-device-id':'d1','x-device-credential':'credential'},body:{event_id:'e1',device_id:'d1',device_type:'arduino',protocol_version:1,operation:'TEST'}},res,()=>{});
  assert.equal(res.code,403);
  assert.equal(res.payload.erro,'Scope events:write obrigatorio');
  registry.authenticate=originalAuth;
  registry.hasScope=originalScope;
});

test('device event controller rejects device identity mismatch after scope check', async () => {
  const registry=require('../src/services/device.registry.service');
  const originalAuth=registry.authenticate;
  const originalScope=registry.hasScope;
  registry.authenticate=async()=>({DEVICE_ID:'d1',DEVICE_TYPE:'arduino',PROTOCOL_VERSION:1,SCOPES:'events:write'});
  registry.hasScope=()=>true;
  const controllerPath=require.resolve('../src/controllers/device.event.controller');
  delete require.cache[controllerPath];
  const controller=require(controllerPath);
  const res=mockResponse();
  await controller.ingest({tenant:{id:1},headers:{'x-device-id':'d1','x-device-credential':'credential'},body:{event_id:'e1',device_id:'other',device_type:'arduino',protocol_version:1,operation:'TEST'}},res,()=>{});
  assert.equal(res.code,403);
  registry.authenticate=originalAuth;
  registry.hasScope=originalScope;
});
