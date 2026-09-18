const service=require('../services/device.registry.service');
exports.register=async(req,res,next)=>{try{res.status(201).json({ok:true,device:await service.register(req.tenant.id,req.body)});}catch(e){next(e);}};
exports.list=async(req,res,next)=>{try{res.json({ok:true,devices:await service.list(req.tenant.id)});}catch(e){next(e);}};
exports.revoke=async(req,res,next)=>{try{const ok=await service.revoke(req.tenant.id,req.params.deviceId);if(!ok)return res.status(404).json({erro:'Dispositivo nao encontrado ou ja inativo'});res.json({ok:true});}catch(e){next(e);}};
exports.rotate=async(req,res,next)=>{try{const device=await service.rotate(req.tenant.id,req.params.deviceId);if(!device)return res.status(404).json({erro:'Dispositivo nao encontrado ou inativo'});res.json({ok:true,device});}catch(e){next(e);}};
