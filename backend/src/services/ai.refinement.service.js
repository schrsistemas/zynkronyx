const db=require('./db.service');
const prompts=require('./ai.prompt.service');

const STATES=new Set(['PENDING','REVIEWED','ACCEPTED','REJECTED']);
function parseJson(value,fallback={}){if(value==null)return fallback;try{return typeof value==='string'?JSON.parse(value):value;}catch{return fallback;}}
function clean(value,max=2000){return String(value??'').trim().slice(0,max);}
async function nextId(){return db.nextId('AI_REFINEMENT_ITEM');}
async function get(tenantId,id){
  const rows=await db.query('SELECT ID,TENANT_ID,AUDIT_ID,PROMPT_VERSION_ID,FEEDBACK_ID,TYPE,SOURCE,TITLE,PROPOSED_CHANGE_JSON,STATUS,CREATED_BY,REVIEWED_BY,CREATED_AT,REVIEWED_AT FROM AI_REFINEMENT_ITEM WHERE ID=? AND TENANT_ID=?',[Number(id),tenantId]);
  if(!rows[0]){const e=new Error('AI_REFINEMENT_NOT_FOUND');e.status=404;throw e;} return rows[0];
}
async function list(tenantId,limit=50){
  const n=Math.min(Math.max(Number(limit||50),1),100);
  const sql=db.dialect().limit('SELECT ID,AUDIT_ID,PROMPT_VERSION_ID,FEEDBACK_ID,TYPE,SOURCE,TITLE,PROPOSED_CHANGE_JSON,STATUS,CREATED_BY,REVIEWED_BY,CREATED_AT,REVIEWED_AT FROM AI_REFINEMENT_ITEM WHERE TENANT_ID=? ORDER BY CREATED_AT DESC,ID DESC',n);
  return db.query(sql,[tenantId]);
}
async function create(input={}){
  if(!input.tenantId)throw Object.assign(new Error('TENANT_REQUIRED'),{status:400});
  const id=await nextId();
  const proposed={kind:'PROMPT_REFINEMENT_PROPOSAL',principle:'create-new-draft',rationale:clean(input.rationale,4000),source_feedback_id:input.feedbackId==null?null:Number(input.feedbackId),suggested_change:input.suggestedChange||{}};
  await db.execute('INSERT INTO AI_REFINEMENT_ITEM (ID,TENANT_ID,AUDIT_ID,PROMPT_VERSION_ID,FEEDBACK_ID,TYPE,SOURCE,TITLE,PROPOSED_CHANGE_JSON,STATUS,CREATED_BY) VALUES (?,?,?,?,?,?,?,?,?,?,?)',[id,input.tenantId,input.auditId==null?null:Number(input.auditId),input.promptVersionId==null?null:Number(input.promptVersionId),input.feedbackId==null?null:Number(input.feedbackId),clean(input.type||'PROMPT',40),clean(input.source||'HUMAN_FEEDBACK',40),clean(input.title||'AI refinement proposal',250),JSON.stringify(proposed),'PENDING',clean(input.createdBy,150)||null]);
  return get(input.tenantId,id);
}
async function review(tenantId,id,input={}){
  const item=await get(tenantId,id);
  const status=String(input.status||'REVIEWED').trim().toUpperCase();
  if(!['REVIEWED','REJECTED'].includes(status))throw Object.assign(new Error('INVALID_REFINEMENT_REVIEW_STATUS'),{status:400});
  if(item.STATUS==='ACCEPTED')throw Object.assign(new Error('AI_REFINEMENT_ALREADY_ACCEPTED'),{status:409});
  await db.execute('UPDATE AI_REFINEMENT_ITEM SET STATUS=?,REVIEWED_BY=?,REVIEWED_AT=CURRENT_TIMESTAMP WHERE ID=? AND TENANT_ID=?',[status,clean(input.reviewedBy,150)||null,Number(id),tenantId]);
  return get(tenantId,id);
}
async function accept(tenantId,id,input={}){
  const item=await get(tenantId,id);
  if(String(item.STATUS)!=='REVIEWED')throw Object.assign(new Error('AI_REFINEMENT_NOT_ACCEPTABLE'),{status:409});
  const proposal=parseJson(item.PROPOSED_CHANGE_JSON,{});
  const base=item.PROMPT_VERSION_ID==null?await prompts.resolve(tenantId):await prompts.resolveById(tenantId,Number(item.PROMPT_VERSION_ID));
  if(!base)throw Object.assign(new Error('AI_REFINEMENT_BASE_PROMPT_NOT_FOUND'),{status:409});
  const nextVersion=Number(base.VERSION_NO||0)+1;
  const basePrompt=parseJson(base.PROMPT_JSON,{});
  const patch=proposal.suggested_change&&typeof proposal.suggested_change==='object'?proposal.suggested_change:{};
  const draftPrompt={...basePrompt,...patch};
  const promptId=await prompts.create({tenantId,versionNo:nextVersion,name:clean(input.name||('Refinement '+nextVersion),150),prompt:draftPrompt,status:'DRAFT'});
  await db.execute("UPDATE AI_REFINEMENT_ITEM SET STATUS='ACCEPTED',PROMPT_VERSION_ID=?,REVIEWED_BY=?,REVIEWED_AT=CURRENT_TIMESTAMP WHERE ID=? AND TENANT_ID=?",[promptId,clean(input.reviewedBy,150)||null,Number(id),tenantId]);
  return {refinement:await get(tenantId,id),draft_prompt_id:promptId,base_prompt_id:Number(base.ID),next_version:nextVersion};
}
module.exports={list,get,create,review,accept,STATES};