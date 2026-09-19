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

async function feedback(i={}){if(!i.tenantId||!i.auditId)return null;const auditRows=await db.query('SELECT ID FROM AI_QUERY_AUDIT WHERE ID=? AND TENANT_ID=?',[Number(i.auditId),i.tenantId]);if(!auditRows[0]){const e=new Error('AI_AUDIT_NOT_FOUND');e.status=404;throw e;}const id=await db.nextId('AI_QUERY_FEEDBACK');await db.execute('INSERT INTO AI_QUERY_FEEDBACK (ID,TENANT_ID,AUDIT_ID,FEEDBACK_TYPE,LABEL,RATING,COMMENT_TEXT,CREATED_BY) VALUES (?,?,?,?,?,?,?,?)',[id,i.tenantId,Number(i.auditId),i.feedbackType||'HUMAN',i.label||null,i.rating==null?null:Number(i.rating),i.comment||null,i.createdBy||null]);return id;}
module.exports={record,recent,feedback};