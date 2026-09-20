const db=require('./db.service');
const prompts=require('./ai.prompt.service');

function hashBucket(value){
  const input=String(value||'');
  let hash=0;
  for(let i=0;i<input.length;i++) hash=((hash<<5)-hash)+input.charCodeAt(i)|0;
  return Math.abs(hash)%100;
}

async function create(input){
  const candidate=await prompts.getById(input.tenantId,Number(input.promptVersionId));
  if(Number(candidate.TENANT_ID)!==Number(input.tenantId)){const e=new Error('AI_RELEASE_PROMPT_TENANT_MISMATCH');e.status=409;throw e;}
  if(String(candidate.STATUS)==='ACTIVE'){const e=new Error('AI_RELEASE_CANDIDATE_ALREADY_ACTIVE');e.status=409;throw e;}
  const gate=await prompts.evaluationGate(input.tenantId,Number(input.promptVersionId));
  const baselineId=gate.baseline_prompt_version_id||null;
  if(input.baselineVersionId!=null && Number(input.baselineVersionId)!==Number(baselineId)){const e=new Error('AI_RELEASE_BASELINE_MISMATCH');e.status=409;throw e;}
  const id=await db.nextId('AI_PROMPT_RELEASE');
  const mode=String(input.mode||process.env.AI_CANARY_MODE||'TENANT_CANARY').trim().toUpperCase();
  const traffic=Math.min(Math.max(Number(input.trafficPercent??10),0),100);
  await db.execute(
    'INSERT INTO AI_PROMPT_RELEASE (ID,TENANT_ID,PROMPT_VERSION_ID,BASELINE_VERSION_ID,MODE,STATUS,TRAFFIC_PERCENT,MIN_SCORE) VALUES (?,?,?,?,?,?,?,?)',
    [id,input.tenantId,input.promptVersionId,baselineId,mode,'RUNNING',traffic,input.minScore??Number(process.env.AI_PROMOTION_MIN_SCORE||0.8)]
  );
  return {id,gate};
}

async function list(tenantId){
  return db.query('SELECT ID,PROMPT_VERSION_ID,BASELINE_VERSION_ID,MODE,STATUS,TRAFFIC_PERCENT,MIN_SCORE,STARTED_AT,FINISHED_AT,RESULT_JSON FROM AI_PROMPT_RELEASE WHERE TENANT_ID=? ORDER BY STARTED_AT DESC,ID DESC',[tenantId]);
}

async function finish(tenantId,id,status,result={}){
  const normalized=String(status||'').trim().toUpperCase();
  if(!['PASSED','FAILED','ROLLED_BACK'].includes(normalized)){const e=new Error('INVALID_RELEASE_STATUS');e.status=400;throw e;}
  const row=(await db.query('SELECT ID,PROMPT_VERSION_ID,BASELINE_VERSION_ID,STATUS FROM AI_PROMPT_RELEASE WHERE ID=? AND TENANT_ID=?',[Number(id),tenantId]))[0];
  if(!row){const e=new Error('AI_RELEASE_NOT_FOUND');e.status=404;throw e;}
  if(String(row.STATUS).toUpperCase()!=='RUNNING'){const e=new Error('AI_RELEASE_ALREADY_FINISHED');e.status=409;throw e;}
  const timestamp=db.dialect().currentTimestamp;
  await db.withTransaction(async tx=>{
    await tx.execute('UPDATE AI_PROMPT_RELEASE SET STATUS=?,FINISHED_AT='+timestamp+',RESULT_JSON=? WHERE ID=? AND TENANT_ID=? AND STATUS=\'RUNNING\'',[normalized,JSON.stringify(result||{}),Number(id),tenantId]);
    if(normalized==='ROLLED_BACK'){
      const auditId=await tx.nextId('AI_PROMPT_PROMOTION_AUDIT');
      await tx.execute('INSERT INTO AI_PROMPT_PROMOTION_AUDIT (ID,TENANT_ID,PROMPT_VERSION_ID,BASELINE_VERSION_ID,RELEASE_ID,CANARY_STATUS,DECISION,DECIDED_BY,CORRELATION_ID,REASON,DETAILS_JSON) VALUES (?,?,?,?,?,?,?,?,?,?,?)',[auditId,tenantId,Number(row.PROMPT_VERSION_ID),row.BASELINE_VERSION_ID?Number(row.BASELINE_VERSION_ID):null,Number(id),normalized,'ROLLED_BACK',result?.reviewed_by||null,result?.correlation_id||null,result?.reason||'canary rollback',JSON.stringify(result||{})]);
    }
  });
  return{status:normalized,id:Number(id)};
}

function selectPromptVersion({tenantId,stableId,requestKey=null,mode='TENANT_CANARY',trafficPercent=0,candidateId}={}) {
  const normalizedMode=String(mode||'TENANT_CANARY').trim().toUpperCase();
  const key=normalizedMode==='TRAFFIC_CANARY'
    ? String(tenantId)+':'+String(requestKey||'')
    : String(tenantId)+':'+String(stableId||'stable');
  if(normalizedMode==='TRAFFIC_CANARY'&&!requestKey) return stableId;
  const seed=hashBucket(key);
  return seed<Number(trafficPercent||0)?Number(candidateId):stableId;
}

async function choose(tenantId,stableId,requestKey=null){
  const rows=await db.query(
    "SELECT PROMPT_VERSION_ID,BASELINE_VERSION_ID,MODE,TRAFFIC_PERCENT FROM AI_PROMPT_RELEASE WHERE TENANT_ID=? AND STATUS='RUNNING' ORDER BY STARTED_AT DESC,ID DESC",
    [tenantId]
  );
  const rel=rows[0];
  if(!rel) return stableId;
  return selectPromptVersion({tenantId,stableId,requestKey,mode:rel.MODE,trafficPercent:rel.TRAFFIC_PERCENT,candidateId:rel.PROMPT_VERSION_ID});
}

module.exports={create,list,finish,choose,hashBucket,selectPromptVersion};