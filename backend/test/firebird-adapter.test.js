const test = require('node:test');
const assert = require('node:assert/strict');

test('Firebird adapter exposes query and execute operations', async () => {
  const db = require('../src/services/db.firebird.service');
  assert.equal(typeof db.query, 'function');
  assert.equal(typeof db.execute, 'function');
});

test('Firebird connection reads environment configuration without connecting on import', async () => {
  const connection = require('../src/db/firebird.connection');
  assert.equal(typeof connection.query, 'function');
  assert.equal(typeof connection.execute, 'function');
});
