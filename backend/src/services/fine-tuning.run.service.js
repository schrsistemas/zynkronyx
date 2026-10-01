const crypto=require('node:crypto');
const db=require('./db.service');

const STATUSES=new Set(['QUEUED','RUNNING','COMPLETED','FAILED','CANCELLED']);
const HEX64=/^[a-f0-9]{64}$/i;
function fail(code,status=400,details){const e=new Error(code);e.code=code;e.status=status;if(details)e.details=details;throw e;}
function stable(value){if(value===null||typeof value!=='object')return value;if(Array.isArray(value))return value.map(stable);return Object.keys(value).sort().reduce((o,k)=>{o[k]=stable(value[k]);return o;},{});}
function runHash(input){const manifest=stable({artifact_id:Number(input.artifactId),provider:input.provider||null,model:input.model||null,training_config:stable(input.trainingConfig||{}),output_model:input.outputModel||null,output_model_hash:input.outputModelHash||null});return crypto.createHash('sha256').update(JSON.stringify(manifest)).digest('hex');}
function validate(input={}){
 if(!Number.isInteger(Number(input.artifactId))||Number(input.artifactId)<=0)fail('FINE_TUNE_ARTIFACT_ID_REQUIRED');
 const key=String(input.idempotencyKey||'').trim();if(!key)fail('FINE_TUNE_RUN_IDEMPOTENCY_KEY_REQUIRED');if(key.length>150)fail('FINE_TUNE_RUN_IDEMPOTENCY_KEY_TOO_LONG');
 if(input.status!=null&&!STATUSES.has(String(input.status).toUpperCase()))fail('FINE_TUNE_RUN_STATUS_INVALID');
 if(input.outputModelHash!=null&&!HEX64.test(String(input.outputModelHash)))fail('FINE_TUNE_OUTPUT_MODEL_HASH_INVALID');
 return true;
}
async function create(tenantId,input={}){
 validate(input);
 const existing=await db.query('SELECT ID,TENANT_ID,ARTIFACT_ID,RUN_HASH,IDEMPOTENCY_KEY,STATUS,CREATED_AT FROM AI_FINE_TUNE_RUN WHERE TENANT_ID=? AND IDEMPOTENCY_KEY=?',[tenantId,String(input.idempotencyKey).trim()]);
 if(existing[0])return {...existing[0],idempotent:true};
 const artifact=await db.query('SELECT ID,ARTIFACT_HASH,DATASET_HASH FROM AI_FINE_TUNE_ARTIFACT WHERE TENANT_ID=? AND ID=?',[tenantId,Number(input.artifactId)]);
 if(!artifact[0])fail('FINE_TUNE_ARTIFACT_NOT_FOUND',404);
 const hash=runHash(input);
 const byHash=await db.query('SELECT ID,TENANT_ID,ARTIFACT_ID,RUN_HASH,IDEMPOTENCY_KEY,STATUS,CREATED_AT FROM AI_FINE_TUNE_RUN WHERE TENANT_ID=? AND RUN_HASH=?',[tenantId,hash]);
 if(byHash[0])return {...byHash[0],idempotent:true};
 const id=await db.nextId('AI_FINE_TUNE_RUN');
 await db.execute('INSERT INTO AI_FINE_TUNE_RUN (ID,TENANT_ID,ARTIFACT_ID,RUN_HASH,IDEMPOTENCY_KEY,EXTERNAL_JOB_ID,PROVIDER,MODEL,STATUS,TRAINING_CONFIG_JSON,METRICS_JSON,OUTPUT_MODEL,OUTPUT_MODEL_HASH,ERROR_CODE,ERROR_MESSAGE,CORRELATION_ID,CREATED_BY) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',[id,tenantId,Number(input.artifactId),hash,String(input.idempotencyKey).trim(),input.externalJobId||null,input.provider||null,input.model||null,String(input.status||'QUEUED').toUpperCase(),JSON.stringify(stable(input.trainingConfig||{})),JSON.stringify(stable(input.metrics||{})),input.outputModel||null,input.outputModelHash||null,input.errorCode||null,input.errorMessage||null,input.correlationId||null,input.createdBy||null]);
 return {id:Number(id),tenant_id:tenantId,artifact_id:Number(input.artifactId),run_hash:hash,idempotency_key:String(input.idempotencyKey).trim(),status:String(input.status||'QUEUED').toUpperCase(),idempotent:false};
}
async function get(tenantId,id){const rows=await db.query('SELECT ID,TENANT_ID,ARTIFACT_ID,RUN_HASH,IDEMPOTENCY_KEY,EXTERNAL_JOB_ID,PROVIDER,MODEL,STATUS,TRAINING_CONFIG_JSON,METRICS_JSON,OUTPUT_MODEL,OUTPUT_MODEL_HASH,ERROR_CODE,ERROR_MESSAGE,CORRELATION_ID,CREATED_BY,STARTED_AT,FINISHED_AT,CREATED_AT FROM AI_FINE_TUNE_RUN WHERE TENANT_ID=? AND ID=?',[tenantId,Number(id)]);return rows[0]||null;}
async function list(tenantId,limit=50){const n=Math.min(Math.max(Number(limit||50),1),100);return db.query(db.dialect().limit('SELECT ID,ARTIFACT_ID,RUN_HASH,IDEMPOTENCY_KEY,EXTERNAL_JOB_ID,PROVIDER,MODEL,STATUS,OUTPUT_MODEL,OUTPUT_MODEL_HASH,ERROR_CODE,CORRELATION_ID,CREATED_BY,STARTED_AT,FINISHED_AT,CREATED_AT FROM AI_FINE_TUNE_RUN WHERE TENANT_ID=? ORDER BY CREATED_AT DESC,ID DESC',n),[tenantId]);}
async function updateStatus(tenantId,id,status,input={}){
 const next=String(status||'').toUpperCase();if(!STATUSES.has(next))fail('FINE_TUNE_RUN_STATUS_INVALID');
 const current=await get(tenantId,id);if(!current)fail('FINE_TUNE_RUN_NOT_FOUND',404);
 const terminal=new Set(['COMPLETED','FAILED','CANCELLED']);
 if(terminal.has(String(current.STATUS).toUpperCase())&&String(current.STATUS).toUpperCase()!==next)fail('FINE_TUNE_RUN_TERMINAL');
 const started=next==='RUNNING'&&!current.STARTED_AT?'CURRENT_TIMESTAMP':null;
 const finished=terminal.has(next)&&!current.FINISHED_AT?'CURRENT_TIMESTAMP':null;
 const sql='UPDATE AI_FINE_TUNE_RUN SET STATUS=?,EXTERNAL_JOB_ID=?,METRICS_JSON=?,OUTPUT_MODEL=?,OUTPUT_MODEL_HASH=?,ERROR_CODE=?,ERROR_MESSAGE=?,CORRELATION_ID=?,STARTED_AT='+ (started||'STARTED_AT') +',FINISHED_AT='+(finished||'FINISHED_AT')+' WHERE TENANT_ID=? AND ID=?';
 await db.execute(sql,[next,(input.externalJobId??current.EXTERNAL_JOB_ID??null),JSON.stringify(stable(input.metrics||{})),(input.outputModel??current.OUTPUT_MODEL??null),(input.outputModelHash??current.OUTPUT_MODEL_HASH??null),(input.errorCode??current.ERROR_CODE??null),(input.errorMessage??current.ERROR_MESSAGE??null),(input.correlationId??current.CORRELATION_ID??null),tenantId,Number(id)]);
 return get(tenantId,id);
}
module.exports={STATUSES,stable,runHash,validate,create,get,list,updateStatus};
