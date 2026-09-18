const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

function request(app, { method='GET', path='/', headers={}, body } = {}) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const port = server.address().port;
      const req = http.request({ hostname:'127.0.0.1', port, method, path,
        headers:{ 'content-type':'application/json', ...headers } }, res => {
        let data='';
        res.setEncoding('utf8');
        res.on('data', chunk => data += chunk);
        res.on('end', () => { server.close(); resolve({ status:res.statusCode, body:data ? JSON.parse(data) : null }); });
      });
      req.on('error', err => { server.close(); reject(err); });
      if (body !== undefined) req.write(JSON.stringify(body));
      req.end();
    });
    server.on('error', reject);
  });
}

test('auth middleware fails closed when Authorization is missing', async () => {
  process.env.AUTH_TOKEN = 'a'.repeat(32);
  const { app } = require('../src/app.production');
  const r = await request(app, { path:'/sync' });
  assert.equal(r.status, 401);
});

test('auth middleware rejects malformed bearer and wrong token', async () => {
  process.env.AUTH_TOKEN = 'a'.repeat(32);
  const { app } = require('../src/app.production');
  assert.equal((await request(app, { path:'/sync', headers:{authorization:'Basic abc'} })).status, 401);
  assert.equal((await request(app, { path:'/sync', headers:{authorization:'Bearer '+'b'.repeat(32)} })).status, 401);
});

test('auth middleware accepts only the configured bearer token', async () => {
  process.env.AUTH_TOKEN = 'a'.repeat(32);
  const { app } = require('../src/app.production');
  const r = await request(app, { path:'/sync', headers:{authorization:'Bearer '+'a'.repeat(32), 'x-api-key':'missing'} });
  // Authentication succeeds before tenant lookup; tenant middleware may then reject the request.
  assert.notEqual(r.status, 401);
});

test('login requires both credentials', async () => {
  process.env.AUTH_TOKEN = 'a'.repeat(32);
  process.env.AUTH_LOGIN = 'ci';
  process.env.AUTH_PASSWORD = 'ci-password-123';
  const { app } = require('../src/app.production');
  assert.equal((await request(app, { method:'POST', path:'/auth/login', body:{login:'ci'} })).status, 400);
  assert.equal((await request(app, { method:'POST', path:'/auth/login', body:{password:'ci-password-123'} })).status, 400);
});

test('login rejects wrong credentials and returns configured token for correct credentials', async () => {
  process.env.AUTH_TOKEN = 'a'.repeat(32);
  process.env.AUTH_LOGIN = 'ci';
  process.env.AUTH_PASSWORD = 'ci-password-123';
  const { app } = require('../src/app.production');
  assert.equal((await request(app, { method:'POST', path:'/auth/login', body:{login:'wrong',password:'ci-password-123'} })).status, 401);
  const ok = await request(app, { method:'POST', path:'/auth/login', body:{login:'ci',password:'ci-password-123'} });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.token, process.env.AUTH_TOKEN);
  assert.equal(ok.body.token_type, 'Bearer');
});

test('login fails closed when required auth configuration is absent', async () => {
  delete process.env.AUTH_LOGIN;
  delete process.env.AUTH_PASSWORD;
  delete process.env.AUTH_TOKEN;
  const { app } = require('../src/app.production');
  const r = await request(app, { method:'POST', path:'/auth/login', body:{login:'ci',password:'ci-password-123'} });
  assert.equal(r.status, 503);
});
