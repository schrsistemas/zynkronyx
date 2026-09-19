const db=require('./db.service');

async function nextId(resource){return db.nextId(resource);}
const now=()=>db.dialect().currentTimestamp;

exports.listLeads=async(tenantId,limit=50)=>db.query(db.dialect().limit('SELECT ID,EXTERNAL_KEY,NAME,EMAIL,COMPANY,SOURCE,STATUS,FIT_SCORE,INTENT_SCORE,PRIORITY_SCORE,LAST_CONTACT_AT,CREATED_AT,UPDATED_AT FROM SALES_LEAD WHERE TENANT_ID=? ORDER BY PRIORITY_SCORE DESC,CREATED_AT DESC',Math.min(Math.max(Number(limit)||50,1),100)),[tenantId]);

exports.getLead=async(tenantId,id)=>{const rows=await db.query('SELECT * FROM SALES_LEAD WHERE TENANT_ID=? AND ID=?',[tenantId,id]);return rows[0]||null;};
exports.findLeadByKey=async(tenantId,key)=>{const rows=await db.query('SELECT * FROM SALES_LEAD WHERE TENANT_ID=? AND EXTERNAL_KEY=?',[tenantId,key]);return rows[0]||null;};

exports.insertLead=async(input)=>{const id=await nextId('SALES_LEAD');await db.execute('INSERT INTO SALES_LEAD (ID,TENANT_ID,EXTERNAL_KEY,NAME,EMAIL,COMPANY,SOURCE,STATUS,METADATA) VALUES (?,?,?,?,?,?,?,?,?)',[id,input.tenantId,input.externalKey,input.name,input.email||null,input.company||null,input.source||null,input.status||'NEW',JSON.stringify(input.metadata||{})]);return exports.getLead(input.tenantId,id);};

exports.updateLeadScore=async(tenantId,id,score)=>{await db.execute('UPDATE SALES_LEAD SET FIT_SCORE=?,INTENT_SCORE=?,PRIORITY_SCORE=?,UPDATED_AT='+now()+' WHERE TENANT_ID=? AND ID=?',[score.fit,score.intent,score.priority,tenantId,id]);return exports.getLead(tenantId,id);};

exports.listOpportunities=async tenantId=>db.query('SELECT * FROM SALES_OPPORTUNITY WHERE TENANT_ID=? ORDER BY UPDATED_AT DESC',[tenantId]);
exports.getOpportunity=async(tenantId,id)=>{const rows=await db.query('SELECT * FROM SALES_OPPORTUNITY WHERE TENANT_ID=? AND ID=?',[tenantId,id]);return rows[0]||null;};

exports.insertOpportunity=async(input)=>{if(!String(input.title||'').trim()){const e=new Error('OPPORTUNITY_TITLE_REQUIRED');e.status=400;throw e;}const lead=await exports.getLead(input.tenantId,input.leadId);if(!lead){const e=new Error('LEAD_NOT_FOUND');e.status=404;throw e;}const id=await nextId('SALES_OPPORTUNITY');await db.execute('INSERT INTO SALES_OPPORTUNITY (ID,TENANT_ID,LEAD_ID,TITLE,STAGE,STATUS,AMOUNT,PROBABILITY,EXPECTED_CLOSE_AT,OWNER_ID,METADATA) VALUES (?,?,?,?,?,?,?,?,?,?,?)',[id,input.tenantId,input.leadId,String(input.title).trim(),input.stage||'QUALIFICATION',input.status||'OPEN',input.amount??null,input.probability??null,input.expectedCloseAt||null,input.ownerId??null,JSON.stringify(input.metadata||{})]);return exports.getOpportunity(input.tenantId,id);};

exports.listActivities=async(tenantId,opportunityId)=>db.query('SELECT * FROM SALES_ACTIVITY WHERE TENANT_ID=? AND OPPORTUNITY_ID=? ORDER BY OCCURRED_AT DESC',[tenantId,opportunityId]);
exports.findActivityByKey=async(tenantId,key)=>{const rows=await db.query('SELECT * FROM SALES_ACTIVITY WHERE TENANT_ID=? AND IDEMPOTENCY_KEY=?',[tenantId,key]);return rows[0]||null;};

exports.insertActivity=async(input)=>{const id=await nextId('SALES_ACTIVITY');await db.execute('INSERT INTO SALES_ACTIVITY (ID,TENANT_ID,OPPORTUNITY_ID,LEAD_ID,IDEMPOTENCY_KEY,ACTIVITY_TYPE,CHANNEL,SUBJECT,OUTCOME,OCCURRED_AT,PAYLOAD) VALUES (?,?,?,?,?,?,?,?,?,?,?)',[id,input.tenantId,input.opportunityId||null,input.leadId||null,input.idempotencyKey,input.activityType,input.channel||null,input.subject||null,input.outcome||null,input.occurredAt||now(),JSON.stringify(input.payload||{})]);return id;};

exports.listNextActions=async(tenantId,opportunityId)=>db.query('SELECT * FROM SALES_NEXT_ACTION WHERE TENANT_ID=? AND OPPORTUNITY_ID=? ORDER BY CREATED_AT DESC',[tenantId,opportunityId]);
exports.getNextAction=async(tenantId,id)=>{const rows=await db.query('SELECT * FROM SALES_NEXT_ACTION WHERE TENANT_ID=? AND ID=?',[tenantId,id]);return rows[0]||null;};

exports.insertNextAction=async(input)=>{const id=await nextId('SALES_NEXT_ACTION');await db.execute('INSERT INTO SALES_NEXT_ACTION (ID,TENANT_ID,OPPORTUNITY_ID,ACTION_TYPE,DUE_AT,STATUS,RATIONALE,CONFIDENCE,SOURCE,REQUIRES_APPROVAL) VALUES (?,?,?,?,?,?,?,?,?,?)',[id,input.tenantId,input.opportunityId,input.actionType,input.dueAt||null,'PROPOSED',JSON.stringify(input.rationale||[]),input.confidence??null,input.source||'AI',input.requiresApproval===false?'N':'Y']);return exports.getNextAction(input.tenantId,id);};

exports.approveNextAction=async(tenantId,id,userId)=>{await db.execute("UPDATE SALES_NEXT_ACTION SET STATUS='APPROVED',APPROVED_BY=?,APPROVED_AT="+now()+" WHERE TENANT_ID=? AND ID=? AND STATUS='PROPOSED'",[userId,tenantId,id]);return exports.getNextAction(tenantId,id);};
exports.completeNextAction=async(tenantId,id)=>{await db.execute("UPDATE SALES_NEXT_ACTION SET STATUS='COMPLETED',COMPLETED_AT="+now()+" WHERE TENANT_ID=? AND ID=? AND STATUS='APPROVED'",[tenantId,id]);return exports.getNextAction(tenantId,id);};
exports.nextId=nextId;
