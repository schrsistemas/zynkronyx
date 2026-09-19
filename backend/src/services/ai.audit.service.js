const db=require('./db.service');

async function record(i={}){
  if(!i.tenantId||!i.correlationId)return null;
  try{
    const id=await db.nextId('AI_QUERY_AUDIT');
    await db.execute(
      'INSERT INTO AI_QUERY_AUDIT (ID,TENANT_ID,CORRELATION_ID,MODEL,PROVIDER,RETRIEVAL_TOP_K,RETRIEVAL_COUNT,PROMPT_VERSION,RESULT_STATUS,LATENCY_MS,INPUT_TOKENS,OUTPUT_TOKENS) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
      [id,i.tenantId,i.correlationId,i.model||null,i.provider||null,i.retrievalTopK||0,i.retrievalCount||0,i.promptVersion||null,i.resultStatus||'UNKNOWN',i.latencyMs||null,i.inputTokens||null,i.outputTokens||null]
    );
    return id;
  }catch(error){return null;}
}

async function recent(tenantId,limit=20){
  if(!tenantId)return[];
  const n=Math.min(Math.max(Number(limit||20),1),100);
  const sql=db.dialect().limit(
    'SELECT ID,CORRELATION_ID,MODEL,PROVIDER,RETRIEVAL_TOP_K,RETRIEVAL_COUNT,PROMPT_VERSION,RESULT_STATUS,LATENCY_MS,INPUT_TOKENS,OUTPUT_TOKENS,CREATED_AT FROM AI_QUERY_AUDIT WHERE TENANT_ID=? ORDER BY CREATED_AT DESC,ID DESC',
    n
  );
  return db.query(sql,[tenantId]);
}

module.exports={record,recent};