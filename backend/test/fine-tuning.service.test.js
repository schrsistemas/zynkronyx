const test=require('node:test');
const assert=require('node:assert/strict');
const service=require('../src/services/fine-tuning.service');

test('fine-tuning builder scrubs secrets and PII before fingerprinting',()=>{
 const rows=[{prompt:'email john@example.com token=super-secret-value',completion:'CPF 123.456.789-00',tenant_id:99}];
 const examples=service.buildDataset(rows);
 assert.equal(examples.length,1);
 const content=JSON.stringify(examples[0]);
 assert.equal(content.includes('john@example.com'),false);
 assert.equal(content.includes('super-secret-value'),false);
 assert.equal(content.includes('123.456.789-00'),false);
 assert.equal(content.includes('tenant_id'),false);
});

test('fine-tuning builder deduplicates after scrubbing',()=>{
 const examples=service.buildDataset([
  {prompt:'email john@example.com',completion:'ok'},
  {prompt:'email jane@example.com',completion:'ok'}
 ]);
 assert.equal(examples.length,1);
});
