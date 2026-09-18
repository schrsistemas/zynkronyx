const deviceEventService = require('../services/device.event.service');
const deviceRegistry = require('../services/device.registry.service');
const crypto = require('node:crypto');
exports.ingest = async (req,res,next)=>{
  try{
    const device=await deviceRegistry.authenticate(req.tenant.id,req.headers['x-device-id'],req.headers['x-device-credential']);
    if(!device)return res.status(401).json({erro:'Credencial do dispositivo invalida'});
    if(!deviceRegistry.hasScope(device,'events:write'))return res.status(403).json({erro:'Scope events:write obrigatorio'});
    const events=Array.isArray(req.body)?req.body:[req.body];
    if(events.length>100)return res.status(413).json({erro:'Limite de 100 eventos por requisicao'});
    for(const e of events){
      if(e.device_id!==device.DEVICE_ID)return res.status(403).json({erro:'device_id nao corresponde a credencial'});
      if(e.device_type!==device.DEVICE_TYPE)return res.status(403).json({erro:'device_type nao corresponde ao registro'});
      if(e.protocol_version!==device.PROTOCOL_VERSION)return res.status(409).json({erro:'protocol_version incompativel'});
    }
    const correlationId=req.headers['x-correlation-id']||crypto.randomUUID();
    const results=[];
    for(const e of events)results.push(await deviceEventService.ingest(req.tenant.id,e,correlationId));
    res.status(202).json({ok:true,correlation_id:correlationId,results});
  }catch(error){next(error);}
};
