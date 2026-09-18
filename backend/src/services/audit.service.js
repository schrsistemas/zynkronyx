const db=require('./db.firebird.service');
exports.list=async(tenantId,{limit=100,cursor=0,device_id,event_type,resultado,from,to,correlation_id}={})=>{
 const safeLimit=Math.max(1,Math.min(Number(limit)||100,500)); const safeCursor=Math.max(0,Number(cursor)||0);
 const where=['TENANT_ID=?','ID>?']; const params=[tenantId,safeCursor];
 if(device_id){where.push('DEVICE_ID=?');params.push(device_id);}
 if(event_type){where.push('EVENT_TYPE=?');params.push(event_type);}
 if(resultado){where.push('RESULTADO=?');params.push(resultado);}
 if(correlation_id){where.push('CORRELATION_ID=?');params.push(correlation_id);}
 if(from){where.push('SERVER_TIMESTAMP>=?');params.push(new Date(from));}
 if(to){where.push('SERVER_TIMESTAMP<=?');params.push(new Date(to));}
 return db.query(`SELECT FIRST ${safeLimit} ID,EVENT_ID,EVENT_TYPE,ACAO,DEVICE_ID,SERVER_TIMESTAMP,CLIENT_TIMESTAMP,CORRELATION_ID,EVENT_HASH,PAYLOAD_HASH,RESULTADO,METADATA FROM LEGAL_EVENT_LOG WHERE ${where.join(' AND ')} ORDER BY ID`,params);
};
exports.get=async(tenantId,id)=>{const rows=await db.query(`SELECT FIRST 1 ID,EVENT_ID,EVENT_TYPE,ACAO,DEVICE_ID,SERVER_TIMESTAMP,CLIENT_TIMESTAMP,CORRELATION_ID,EVENT_HASH,PAYLOAD_HASH,RESULTADO,METADATA FROM LEGAL_EVENT_LOG WHERE TENANT_ID=? AND ID=?`,[tenantId,id]);return rows[0]||null;};
