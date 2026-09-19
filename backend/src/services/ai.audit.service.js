const db=require('./db.service');

function cleanKey(value){const key=String(value??'').trim();return key?key.slice(0,150):null;}

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

async function feedback(i={}){
  if(!i.tenantId||!i.auditId)return null;
  const idempotencyKey=cleanKey(i.idempotencyKey);
  return db.withTransaction(async tx=>{
    const auditRows=await tx.query('SELECT ID FROM AI_QUERY_AUDIT WHERE ID=? AND TENANT_ID=?',[Number(i.auditId),i.tenantId]);
    if(!auditRows[0]){const e=new Error('AI_AUDIT_NOT_FOUND');e.status=404;throw e;}
    if(idempotencyKey){
      const existing=await tx.query('SELECT ID,AUDIT_ID FROM AI_QUERY_FEEDBACK WHERE TENANT_ID=? AND IDEMPOTENCY_KEY=?',[i.tenantId,idempotencyKey]);
      if(existing[0]){
        if(Number(existing[0].AUDIT_ID)!==Number(i.auditId)){const e=new Error('AI_FEEDBACK_IDEMPOTENCY_CONFLICT');e.status=409;throw e;}
        return {id:Number(existing[0].ID),idempotent:true};
      }
    }
    const id=await tx.nextId('AI_QUERY_FEEDBACK');
    await tx.execute(
      'INSERT INTO AI_QUERY_FEEDBACK (ID,TENANT_ID,AUDIT_ID,FEEDBACK_TYPE,LABEL,RATING,COMMENT_TEXT,CREATED_BY,IDEMPOTENCY_KEY) VALUES (?,?,?,?,?,?,?,?,?)',
      [id,i.tenantId,Number(i.auditId),i.feedbackType||'HUMAN',i.label||null,i.rating==null?null:Number(i.rating),i.comment||null,i.createdBy||null,idempotencyKey]
    );
    return {id,idempotent:false};
  });
}

async function feedbackSummary(tenantId,limit=20){
  if(!tenantId)return[];
  const n=Math.min(Math.max(Number(limit||20),1),100);
  const sql=db.dialect().limit('SELECT a.PROMPT_VERSION,COUNT(f.ID) AS FEEDBACK_COUNT,AVG(f.RATING) AS AVG_RATING,SUM(CASE WHEN f.FEEDBACK_TYPE=\'HUMAN\' THEN 1 ELSE 0 END) AS HUMAN_COUNT,SUM(CASE WHEN f.FEEDBACK_TYPE=\'AUTOMATED\' THEN 1 ELSE 0 END) AS AUTOMATED_COUNT FROM AI_QUERY_FEEDBACK f JOIN AI_QUERY_AUDIT a ON a.ID=f.AUDIT_ID AND a.TENANT_ID=f.TENANT_ID WHERE f.TENANT_ID=? GROUP BY a.PROMPT_VERSION ORDER BY COUNT(f.ID) DESC',n);
  return db.query(sql,[tenantId]);
}
module.exports={record,recent,feedback,feedbackSummary};
