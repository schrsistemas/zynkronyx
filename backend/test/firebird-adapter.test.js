const test = require('node:test');
const assert = require('node:assert/strict');

test('database service exposes generic transactional contract', async () => {
  const db = require('../src/services/db.service');
  assert.equal(typeof db.query, 'function');
  assert.equal(typeof db.execute, 'function');
  assert.equal(typeof db.withTransaction, 'function');
  assert.equal(typeof db.nextId, 'function');
  assert.equal(typeof db.driverName, 'function');
});

test('sync repository exposes transaction-aware staging insert', async () => {
  const repository = require('../src/repository/sync.repository');
  assert.equal(typeof repository.insertStagingTx, 'function');
});
