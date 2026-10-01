const test=require('node:test');
const assert=require('node:assert/strict');
const rag=require('../src/services/rag.service');

test('RAG marks empty retrieval as insufficient evidence',()=>{
 assert.equal(rag.evidenceStatus({results:[],context:{sources:[]}}),'INSUFFICIENT_EVIDENCE');
});

test('RAG marks assembled retrieval context as evidence available',()=>{
 assert.equal(rag.evidenceStatus({results:[{chunk_id:1}],context:{sources:[{chunk_id:1,content:'authorized evidence'}]}}),'EVIDENCE_AVAILABLE');
});

test('tenant ACL denies documents assigned to another tenant',()=>{
 assert.equal(rag.aclAllows({acl_json:JSON.stringify({mode:'tenant',tenants:['tenant-a']})},'tenant-b'),false);
 assert.equal(rag.aclAllows({acl_json:JSON.stringify({mode:'tenant',tenants:['tenant-a']})},'tenant-a'),true);
});

test('malformed ACL fails closed',()=>{
 assert.equal(rag.aclAllows({acl_json:'{invalid'},'tenant-a'),false);
});

test('default tenant ACL permits the owning retrieval pipeline',()=>{
 assert.equal(rag.aclAllows({acl_json:JSON.stringify({mode:'tenant'})},'tenant-a'),true);
});
