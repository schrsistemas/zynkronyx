const db=require('./db.service');

function required(value,name){const v=String(value||'').trim();if(!v){const e=new Error(name+'_REQUIRED');e.status=400;throw e;}return v;}

async function accept(tenantId,input={}){
 const subjectId=required(input.subjectId||input.subject_id,'SUBJECT_ID');
 const policyType=required(input.policyType||input.policy_type||'PRIVACY_NOTICE','POLICY_TYPE');
 const policyVersion=required(input.policyVersion||input.policy_version,'POLICY_VERSION');
 const action=String(input.action||'ACCEPT').trim().toUpperCase();
 if(!['ACCEPT','REVOKE'].includes(action)){const e=new Error('LEGAL_ACCEPTANCE_ACTION_INVALID');e.status=400;throw e;}
 const id=await db.nextId('LEGAL_ACCEPTANCE');
 await db.execute('INSERT INTO LEGAL_ACCEPTANCE (ID,TENANT_ID,SUBJECT_ID,POLICY_TYPE,POLICY_VERSION,ACTION,CORRELATION_ID,SOURCE) VALUES (?,?,?,?,?,?,?,?)',[id,tenantId,subjectId,policyType,policyVersion,action,input.correlationId||null,input.source||'control-center']);
 return {id:Number(id),tenant_id:Number(tenantId),subject_id:subjectId,policy_type:policyType,policy_version:policyVersion,action};
}
async function current(tenantId,subjectId,policyType='PRIVACY_NOTICE'){
 const rows=await db.query('SELECT ID,SUBJECT_ID,POLICY_TYPE,POLICY_VERSION,ACTION,ACCEPTED_AT,CORRELATION_ID,SOURCE FROM LEGAL_ACCEPTANCE WHERE TENANT_ID=? AND SUBJECT_ID=? AND POLICY_TYPE=? ORDER BY ACCEPTED_AT DESC,ID DESC',[tenantId,required(subjectId,'SUBJECT_ID'),policyType]);
 return rows[0]||null;
}
async function history(tenantId,subjectId,limit=50){
 const n=Math.min(Math.max(Number(limit||50),1),100);
 return db.query(db.dialect().limit('SELECT ID,SUBJECT_ID,POLICY_TYPE,POLICY_VERSION,ACTION,ACCEPTED_AT,CORRELATION_ID,SOURCE FROM LEGAL_ACCEPTANCE WHERE TENANT_ID=? AND SUBJECT_ID=? ORDER BY ACCEPTED_AT DESC,ID DESC',n),[tenantId,required(subjectId,'SUBJECT_ID')]);
}
module.exports={accept,current,history};
