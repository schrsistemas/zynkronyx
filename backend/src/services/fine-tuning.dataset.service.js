const crypto=require('node:crypto');

const DEFAULT_VALIDATION_RATIO=0.2;
const SECRET_PATTERNS=[
  /(?:sk-[A-Za-z0-9_-]{16,})/g,
  /(?:api[_-]?key|access[_-]?token|refresh[_-]?token|password|secret)\s*[:=]\s*[^\s,;]+/gi,
  /Bearer\s+[A-Za-z0-9._-]+/gi
];
const PII_PATTERNS=[
  /\b[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}\b/gi,
  /\b(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?9?\d{4}[-.\s]?\d{4}\b/g,
  /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g
];

function scrubText(value){
 let text=String(value??'');
 for(const pattern of SECRET_PATTERNS) text=text.replace(pattern,'[REDACTED_SECRET]');
 for(const pattern of PII_PATTERNS) text=text.replace(pattern,'[REDACTED_PII]');
 return text;
}
function scrubExample(example={}){
 const messages=Array.isArray(example.messages)?example.messages:[];
 return {
  ...example,
  messages:messages.map(m=>({...m,content:scrubText(m.content)}))
 };
}
function stableJson(value){return JSON.stringify(value,Object.keys(value).sort());}
function fingerprint(example){return crypto.createHash('sha256').update(JSON.stringify(example)).digest('hex');}
function datasetFingerprint(examples){return crypto.createHash('sha256').update(JSON.stringify(examples)).digest('hex');}

function deduplicate(examples=[]){
 const seen=new Set();const result=[];
 for(const raw of examples){
  const item=scrubExample(raw);const id=fingerprint(item);
  if(seen.has(id)) continue;
  seen.add(id);result.push({...item,id});
 }
 return result;
}

function splitDataset(examples=[],validationRatio=DEFAULT_VALIDATION_RATIO){
 const ratio=Number(validationRatio);
 if(!Number.isFinite(ratio)||ratio<0||ratio>=1){const e=new Error('INVALID_VALIDATION_RATIO');e.code=e.message;e.status=400;throw e;}
 const train=[];const validation=[];
 for(const item of examples){
  const hash=crypto.createHash('sha256').update(String(item.id||fingerprint(item))).digest();
  const bucket=hash.readUInt32BE(0)/0x100000000;
  (bucket<ratio?validation:train).push(item);
 }
 return {train,validation};
}
function buildVersion(rows=[],options={}){
 const examples=deduplicate(rows);
 const split=splitDataset(examples,options.validationRatio??DEFAULT_VALIDATION_RATIO);
 const version={
  schema_version:1,
  created_at:options.createdAt||null,
  source:options.source||'human_feedback',
  examples_count:examples.length,
  train_count:split.train.length,
  validation_count:split.validation.length,
  validation_ratio:Number(options.validationRatio??DEFAULT_VALIDATION_RATIO),
  dataset_hash:datasetFingerprint(examples),
  examples
 };
 return version;
}
module.exports={scrubText,scrubExample,fingerprint,datasetFingerprint,deduplicate,splitDataset,buildVersion};
