const test = require('node:test');
const assert = require('node:assert/strict');

const service = require('../src/services/sync.service');

test('sync cursor accepts ISO8601 and bounded limit', () => {
  assert.equal(service.normalizeLimit(undefined), 100);
  assert.equal(service.normalizeLimit('25'), 25);
  assert.equal(service.parseCursorId('10'), 10);
  assert.equal(service.parseSince('2026-09-18T12:00:00Z'), '2026-09-18T12:00:00.000Z');
  assert.throws(() => service.normalizeLimit('0'), /between 1 and 1000/);
  assert.throws(() => service.parseCursorId('-1'), /non-negative/);
  assert.throws(() => service.parseSince('invalid'), /ISO8601/);
});

test('incoming sync contract requires table, key, operation and data', () => {
  assert.throws(() => service.validateIncomingPayload({}), /tabela is required/);
  assert.throws(
    () => service.validateIncomingPayload({ tabela: 'CLIENTE', chave: '1', operacao: 'U' }),
    /dados is required/
  );
  assert.doesNotThrow(() => service.validateIncomingPayload({
    tabela: 'CLIENTE', chave: '1', operacao: 'U', dados: { nome: 'Teste' }
  }));
});
