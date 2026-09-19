const test = require('node:test');
const assert = require('node:assert/strict');

test('Firebird dialect exposes portable database boundary operations', () => {
  const { dialect } = require('../src/db/firebird.connection');
  assert.equal(dialect.name, 'firebird');
  assert.match(dialect.limit('SELECT ID FROM T ORDER BY ID', 10), /^SELECT FIRST 10 /);
  assert.equal(dialect.currentTimestamp, 'CURRENT_TIMESTAMP');
  assert.equal(dialect.beforeNow('LEASE_AT', 60), 'LEASE_AT < DATEADD(-60 SECOND TO CURRENT_TIMESTAMP)');
  assert.equal(dialect.returning('UPDATE T SET A=? WHERE ID=?', 'ID'), 'UPDATE T SET A=? WHERE ID=? RETURNING ID');
});
