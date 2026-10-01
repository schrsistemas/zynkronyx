const test=require('node:test');
const assert=require('node:assert/strict');
const dataset=require('../src/services/fine-tuning.dataset.service');

test('dataset scrubber removes common secrets and PII',()=>{
 const text='email john@example.com token=super-secret-value phone 48999123456';
 const scrubbed=dataset.scrubText(text);
 assert.equal(scrubbed.includes('john@example.com'),false);
 assert.equal(scrubbed.includes('super-secret-value'),false);
 assert.equal(scrubbed.includes('48999123456'),false);
 assert.match(scrubbed,/REDACTED_/);
});

test('dataset deduplication is deterministic after scrubbing',()=>{
 const rows=[
  {messages:[{role:'user',content:'email john@example.com'},{role:'assistant',content:'ok'}]},
  {messages:[{role:'user',content:'email jane@example.com'},{role:'assistant',content:'ok'}]},
  {messages:[{role:'user',content:'same'},{role:'assistant',content:'answer'}]},
  {messages:[{role:'user',content:'same'},{role:'assistant',content:'answer'}]}
 ];
 const first=dataset.deduplicate(rows);
 const second=dataset.deduplicate(rows);
 assert.deepEqual(first,second);
 assert.equal(first.length,2);
});

test('dataset split is deterministic and bounded',()=>{
 const examples=dataset.deduplicate(Array.from({length:20},(_,i)=>({
  messages:[{role:'user',content:'question '+i},{role:'assistant',content:'answer '+i}]
 })));
 const a=dataset.splitDataset(examples,0.2);
 const b=dataset.splitDataset(examples,0.2);
 assert.deepEqual(a,b);
 assert.equal(a.train.length+a.validation.length,20);
 assert.ok(a.validation.length>0);
 assert.ok(a.validation.length<20);
});

test('dataset version has reproducible fingerprint and lineage metadata',()=>{
 const version=dataset.buildVersion([
  {messages:[{role:'user',content:'hello'},{role:'assistant',content:'world'}]},
  {messages:[{role:'user',content:'hello'},{role:'assistant',content:'world'}]}
 ],{source:'human_feedback',validationRatio:0.5});
 assert.equal(version.schema_version,1);
 assert.equal(version.examples_count,1);
 assert.equal(version.train_count+version.validation_count,1);
 assert.equal(typeof version.dataset_hash,'string');
 assert.equal(version.dataset_hash.length,64);
});
