const test = require('node:test');
const assert = require('node:assert/strict');
const { normalize, chunkText, hash } = require('../src/services/rag.chunker');

test('normalizes deterministic document text', () => assert.equal(normalize('  A  B\r\n\r\n\r\n C  '), 'A B\n\nC'));
test('chunks deterministically and hashes each chunk', () => {
  const input = Array.from({ length: 8 }, (_, i) => 'Paragraph ' + i + ' ' + 'x'.repeat(300)).join('\n\n');
  const first = chunkText(input, { maxChars: 900, overlap: 50 });
  const second = chunkText(input, { maxChars: 900, overlap: 50 });
  assert.deepEqual(first, second); assert.ok(first.length > 1); assert.equal(first[0].hash, hash(first[0].content)); assert.equal(first[0].index, 0);
});
test('empty content produces no chunks', () => assert.deepEqual(chunkText('   '), []));
