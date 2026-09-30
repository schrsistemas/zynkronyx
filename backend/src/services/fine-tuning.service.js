const crypto=require('node:crypto');
function normalizeExample(input={}){
 const prompt=String(input.prompt||'').trim();
 const completion=String(input.completion||'').trim();
 if(!prompt||!completion){const e=new Error('FINE_TUNE_EXAMPLE_REQUIRED');e.code=e.message;e.status=400;throw e;}
 return {messages:[{role:'user',content:prompt},{role:'assistant',content:completion}]};
}
function fingerprint(example){return crypto.createHash('sha256').update(JSON.stringify(example)).digest('hex');}
function buildDataset(rows=[]){const seen=new Set();const examples=[];for(const row of rows){const example=normalizeExample(row);const hash=fingerprint(example);if(seen.has(hash))continue;seen.add(hash);examples.push({id:hash,messages:example.messages,metadata:{source:row.source||'human_feedback',tenant_id:row.tenant_id||null}});}return examples;}
function validateDataset(examples=[]){
 const errors=[];for(const item of examples){if(!Array.isArray(item.messages)||item.messages.length<2)errors.push(item.id||'UNKNOWN');}
 return {valid:errors.length===0,count:examples.length,errors};
}
module.exports={normalizeExample,fingerprint,buildDataset,validateDataset};
