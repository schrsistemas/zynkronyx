const test = require('node:test');
const assert = require('node:assert/strict');
const { app } = require('../src/app.production');
const http = require('node:http');

function request(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port: 0, method, path, headers }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let parsed = data;
        try { parsed = JSON.parse(data); } catch (_) {}
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    if (body !== undefined) req.write(JSON.stringify(body));
    req.end();
  });
}

// The app is tested through an ephemeral listener created from the Express instance.
async function withServer(fn) {
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const original = http.request;
  http.request = (options, callback) => original({ ...options, port }, callback);
  try { return await fn(); } finally {
    http.request = original;
    await new Promise(resolve => server.close(resolve));
  }
}

test('health is public and reports runtime state', () => withServer(async () => {
  const res = await request('GET', '/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
  assert.equal(res.body.service, 'zynkronyx');
}));

test('login rejects an empty login', () => withServer(async () => {
  const res = await request('POST', '/auth/login', {}, { 'content-type': 'application/json' });
  assert.equal(res.status, 400);
}));

test('business routes reject unknown tenant API keys', () => withServer(async () => {
  const res = await request('GET', '/sync/out?ultima_data=2026-01-01', undefined, { 'x-api-key': 'x'.repeat(101) });
  assert.equal(res.status, 401);
}));

test('unknown routes return JSON 404', () => withServer(async () => {
  const res = await request('GET', '/does-not-exist');
  assert.equal(res.status, 404);
  assert.equal(res.body.erro, 'Rota nao encontrada');
}));
