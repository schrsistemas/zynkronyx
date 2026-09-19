const db=require('./db.service');

function hashBucket(value){
  const input=String(value||'');
  let hash=0;
  for(let i=0;i<input.length;i++) hash=((hash<<5)-hash)+input.charCodeAt(i)|0;
  return Math.abs(hash)%100;
}

async function create(input){
  const id=await db.nextId('AI_PROMPT_RELEASE');
  const mode=String(input.mode||process.env.AI_CANARY_MODE||'TENANT_CANARY').trim().toUpperCase();
  const traffic=Math.min(Math.max(Number(input.trafficPercent??10),0),100);
  await db.execute(
    'INSERT INTO AI_PROMPT_RELEASE (ID,TENANT_ID,PROMPT_VERSION_ID,BASELINE_VERSION_ID,MODE,STATUS,TRAFFIC_PERCENT,MIN_SCORE) VALUES (?,?,?,?,?,?,?,?)',
    [id,input.tenantId,input.promptVersionId,input.baselineVersionId||null,mode,'RUNNING',traffic,input.minScore??Number(process.env.AI_PROMOTION_MIN_SCORE||0.8)]
  );
  return id;
}

async function list(tenantId){
  return db.query('SELECT ID,PROMPT_VERSION_ID,BASELINE_VERSION_ID,MODE,STATUS,TRAFFIC_PERCENT,MIN_SCORE,STARTED_AT,FINISHED_AT,RESULT_JSON FROM AI_PROMPT_RELEASE WHERE TENANT_ID=? ORDER BY STARTED_AT DESC,ID DESC',[tenantId]);
}

async function finish(tenantId,id,status,result){
  const timestamp=db.dialect().currentTimestamp;
  await db.execute('UPDATE AI_PROMPT_RELEASE SET STATUS=?,FINISHED_AT='+timestamp+',RESULT_JSON=? WHERE ID=? AND TENANT_ID=?',[status,JSON.stringify(result||{}),id,tenantId]);
  return{status,id};
}

async function choose(tenantId,stableId,requestKey=null){
  const rows=await db.query(
    "SELECT PROMPT_VERSION_ID,BASELINE_VERSION_ID,MODE,TRAFFIC_PERCENT FROM AI_PROMPT_RELEASE WHERE TENANT_ID=? AND STATUS='RUNNING' ORDER BY STARTED_AT DESC,ID DESC",
    [tenantId]
  );
  const rel=rows[0];
  if(!rel) return stableId;
  const mode=String(rel.MODE||'TENANT_CANARY').trim().toUpperCase();
  const key=mode==='TRAFFIC_CANARY'
    ? String(tenantId)+':'+String(requestKey||'')
    : String(tenantId)+':'+String(stableId||'stable');
  // Never silently enable request-level distribution when no stable request key exists.
  if(mode==='TRAFFIC_CANARY'&&!requestKey) return stableId;
  const seed=hashBucket(key);
  return seed<Number(rel.TRAFFIC_PERCENT||0)?Number(rel.PROMPT_VERSION_ID):stableId;
}

module.exports={create,list,finish,choose,hashBucket};