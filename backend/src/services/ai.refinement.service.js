const db=require('./db.service');
const prompts=require('./ai.prompt.service');

const STATES=new Set(['PENDING','REVIEWED','ACCEPTED','REJECTED']);
function parseJson(value,fallback={}){if(value==null)return fallback;try{return typeof value==='string'?JSON.parse(value):value;}catch{return fallback;}}
function clean(value,max=2000){return String(value??'').trim().slice(0,max);}
function notFound(code,status=404){return Object.assign(new Error(code),{status});}
async function nextId(){return db.nextId('AI_REFINEMENT_ITEM');}
async function get(tenantId,id){
  const rows=await db.query('SELECT ID,TENANT_ID,AUDIT_ID,PROMPT_VERSION_ID,FEEDBACK_ID,TYPE,SOURCE,TITLE,PROPOSED_CHANGE_JSON,STATUS,CREATED_BY,REVIEWED_BY,CREATED_AT,REVIEWED_AT FROM AI_REFINEMENT_ITEM WHERE ID=? AND TENANT_ID=?',[Number(id),tenantId]);
  if(!rows[0])throw notFound('AI_REFINEMENT_NOT_FOUND');
  return rows[0];
}
async function list(tenantId,limit=50){
  const n=Math.min(Math.max(Number(limit||50),1),100);
  const sql=db.dialect().limit('SELECT ID,AUDIT_ID,PROMPT_VERSION_ID,FEEDBACK_ID,TYPE,SOURCE,TITLE,PROPOSED_CHANGE_JSON,STATUS,CREATED_BY,REVIEWED_BY,CREATED_AT,REVIEWED_AT FROM AI_REFINEMENT_ITEM WHERE TENANT_ID=? ORDER BY CREATED_AT DESC,ID DESC',n);
  return db.query(sql,[tenantId]);
}
async function validateLinks(input){
  if(input.auditId!=null){
    const rows=await db.query('SELECT ID FROM AI_QUERY_AUDIT WHERE ID=? AND TENANT_ID=?',[Number(input.auditId),input.tenantId]);
    if(!rows[0])throw notFound('AI_AUDIT_NOT_FOUND');
  }
  if(input.feedbackId!=null){
    const rows=await db.query('SELECT ID,AUDIT_ID FROM AI_QUERY_FEEDBACK WHERE ID=? AND TENANT_ID=?',[Number(input.feedbackId),input.tenantId]);
    if(!rows[0])throw notFound('AI_FEEDBACK_NOT_FOUND');
    if(input.auditId!=null&&Number(rows[0].AUDIT_ID)!==Number(input.auditId))throw notFound('AI_FEEDBACK_AUDIT_MISMATCH',409);
  }
  if(input.promptVersionId!=null)await prompts.getById(input.tenantId,Number(input.promptVersionId));
}
async function create(input={}){
  if(!input.tenantId)throw notFound('TENANT_REQUIRED',400);
  await validateLinks(input);
  const id=await nextId();
  const proposed={kind:'PROMPT_REFINEMENT_PROPOSAL',principle:'create-new-draft',rationale:clean(input.rationale,4000),source_feedback_id:input.feedbackId==null?null:Number(input.feedbackId),suggested_change:input.suggestedChange||{}};
  await db.execute('INSERT INTO AI_REFINEMENT_ITEM (ID,TENANT_ID,AUDIT_ID,PROMPT_VERSION_ID,FEEDBACK_ID,TYPE,SOURCE,TITLE,PROPOSED_CHANGE_JSON,STATUS,CREATED_BY) VALUES (?,?,?,?,?,?,?,?,?,?,?)',[id,input.tenantId,input.auditId==null?null:Number(input.auditId),input.promptVersionId==null?null:Number(input.promptVersionId),input.feedbackId==null?null:Number(input.feedbackId),clean(input.type||'PROMPT',40),clean(input.source||'HUMAN_FEEDBACK',40),clean(input.title||'AI refinement proposal',250),JSON.stringify(proposed),'PENDING',clean(input.createdBy,150)||null]);
  return get(input.tenantId,id);
}
async function review(tenantId,id,input={}){
  const status=String(input.status||'REVIEWED').trim().toUpperCase();
  if(!['REVIEWED','REJECTED'].includes(status))throw notFound('INVALID_REFINEMENT_REVIEW_STATUS',400);
  const item=await get(tenantId,id);
  if(item.STATUS==='ACCEPTED')throw notFound('AI_REFINEMENT_ALREADY_ACCEPTED',409);
  const result=await db.execute('UPDATE AI_REFINEMENT_ITEM SET STATUS=?,REVIEWED_BY=?,REVIEWED_AT=CURRENT_TIMESTAMP WHERE ID=? AND TENANT_ID=? AND STATUS=\'PENDING\'',[status,clean(input.reviewedBy,150)||null,Number(id),tenantId]);
  const updated=await get(tenantId,id);
  if(String(updated.STATUS)!==status&&item.STATUS==='REVIEWED')return updated;
  return updated;
}
async function accept(tenantId,id,input={}){
  const idempotencyKey=clean(input.idempotencyKey,150)||null;
  return db.withTransaction(async tx=>{
    const lockSql=db.dialect().lock('SELECT ID,TENANT_ID,AUDIT_ID,PROMPT_VERSION_ID,FEEDBACK_ID,TYPE,SOURCE,TITLE,PROPOSED_CHANGE_JSON,STATUS,CREATED_BY,REVIEWED_BY,CREATED_AT,REVIEWED_AT FROM AI_REFINEMENT_ITEM WHERE ID=? AND TENANT_ID=?');
    const rows=await tx.query(lockSql,[Number(id),tenantId]);
    const item=rows[0];
    if(!item)throw notFound('AI_REFINEMENT_NOT_FOUND');
    if(String(item.STATUS)==='ACCEPTED'){
      if(idempotencyKey&&String(item.ACCEPT_IDEMPOTENCY_KEY||'')===idempotencyKey)return {refinement:item,draft_prompt_id:Number(item.PROMPT_VERSION_ID),base_prompt_id:null,next_version:null,idempotent:true};
      throw notFound('AI_REFINEMENT_NOT_ACCEPTABLE',409);
    }
    if(String(item.STATUS)!=='REVIEWED')throw notFound('AI_REFINEMENT_NOT_ACCEPTABLE',409);
    if(idempotencyKey){
      const existing=await tx.query('SELECT ID,PROMPT_VERSION_ID,STATUS,ACCEPT_IDEMPOTENCY_KEY FROM AI_REFINEMENT_ITEM WHERE TENANT_ID=? AND ACCEPT_IDEMPOTENCY_KEY=?',[tenantId,idempotencyKey]);
      if(existing[0]&&Number(existing[0].ID)!==Number(id))throw notFound('AI_REFINEMENT_IDEMPOTENCY_CONFLICT',409);
    }
    const proposal=parseJson(item.PROPOSED_CHANGE_JSON,{});
    const base=item.PROMPT_VERSION_ID==null?await prompts.resolveTx(tx,tenantId):await prompts.resolveByIdTx(tx,tenantId,Number(item.PROMPT_VERSION_ID));
    if(!base)throw notFound('AI_REFINEMENT_BASE_PROMPT_NOT_FOUND',409);
    const nextVersion=Number(base.VERSION_NO||0)+1;
    const basePrompt=parseJson(base.PROMPT_JSON,{});
    const patch=proposal.suggested_change&&typeof proposal.suggested_change==='object'?proposal.suggested_change:{};
    const draftPrompt={...basePrompt,...patch};
    const promptId=await prompts.createTx(tx,{tenantId,versionNo:nextVersion,name:clean(input.name||('Refinement '+nextVersion),150),prompt:draftPrompt,status:'DRAFT'});
    await tx.execute("UPDATE AI_REFINEMENT_ITEM SET STATUS='ACCEPTED',PROMPT_VERSION_ID=?,ACCEPT_IDEMPOTENCY_KEY=?,REVIEWED_BY=?,REVIEWED_AT=CURRENT_TIMESTAMP WHERE ID=? AND TENANT_ID=? AND STATUS='REVIEWED'",[promptId,idempotencyKey,clean(input.reviewedBy,150)||null,Number(id),tenantId]);
    const refinementRows=await tx.query('SELECT ID,TENANT_ID,AUDIT_ID,PROMPT_VERSION_ID,FEEDBACK_ID,TYPE,SOURCE,TITLE,PROPOSED_CHANGE_JSON,STATUS,ACCEPT_IDEMPOTENCY_KEY,CREATED_BY,REVIEWED_BY,CREATED_AT,REVIEWED_AT FROM AI_REFINEMENT_ITEM WHERE ID=? AND TENANT_ID=?',[Number(id),tenantId]);
    return {refinement:refinementRows[0],draft_prompt_id:promptId,base_prompt_id:Number(base.ID),next_version:nextVersion};
  });
}
module.exports={list,get,create,review,accept,STATES};
