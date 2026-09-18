const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

function loadMiddleware(device) {
  const original = Module._load;
  Module._load = function(request, parent, isMain) {
    if (request === '../services/device.registry.service' && parent?.filename?.endsWith('/middleware/device.scope.js')) {
      return {
        authenticate: async () => device,
        hasScope: (d, scope) => String(d?.SCOPES || '').split(',').includes(scope)
      };
    }
    return original.apply(this, arguments);
  };
  const path=require.resolve('../src/middleware/device.scope');
  delete require.cache[path];
  const middleware=require(path);
  Module._load=original;
  return middleware;
}

function response(){return {code:null,payload:null,status(n){this.code=n;return this;},json(v){this.payload=v;return this;}};}

test('device scope middleware requires device credential headers', async()=>{
  const mw=loadMiddleware({SCOPES:'sync:read'});
  const res=response();
  await mw('sync:read')({tenant:{id:1},headers:{}},res,()=>{});
  assert.equal(res.code,401);
});

test('device scope middleware rejects missing required scope', async()=>{
  const mw=loadMiddleware({SCOPES:'events:write'});
  const res=response();
  await mw('sync:read')({tenant:{id:1},headers:{'x-device-id':'d1','x-device-credential':'c'}},res,()=>{});
  assert.equal(res.code,403);
});

test('device scope middleware accepts sync:read and binds device', async()=>{
  const device={DEVICE_ID:'d1',SCOPES:'sync:read'};
  const mw=loadMiddleware(device);
  const req={tenant:{id:1},headers:{'x-device-id':'d1','x-device-credential':'c'}};
  const res=response();
  let called=false;
  await mw('sync:read')(req,res,()=>{called=true;});
  assert.equal(called,true);
  assert.equal(req.device,device);
});
