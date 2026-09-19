const crypto=require('node:crypto');
const db=require('./db.service');
function canonical(value){if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';return JSON.stringify(value);}
function eventHash(input){return crypto.createHash('sha256').update(canonical(input)).digest('hex');}
exports.record=async({tenantId,deviceId=null,action,result,correlationId,metadata={}})=>{
 const eventId=crypto.randomUUID();
 const payload={event_id:eventId,device_id:deviceId,action,result,correlation_id:correlationId||null,metadata};
 const hash=eventHash(payload);
 await db.execute(`INSERT INTO LEGAL_EVENT_LOG
 (TENANT_ID,DEVICE_ID,EVENT_ID,EVENT_TYPE,ACAO,CORRELATION_ID,EVENT_HASH,RESULTADO,METADATA)
 VALUES (?,?,?,'SECURITY',?,?,?,?,?)`,
 [tenantId,deviceId,eventId,action,correlationId||null,hash,result,JSON.stringify(metadata)]);
 return {event_id:eventId,event_hash:hash};
};
