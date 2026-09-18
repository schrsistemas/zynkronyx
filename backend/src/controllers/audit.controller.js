const service=require('../services/audit.service');
exports.list=async(req,res,next)=>{try{const rows=await service.list(req.tenant.id,req.query);const nextCursor=rows.length?rows[rows.length-1].ID:null;res.json({ok:true,events:rows,next_cursor:nextCursor});}catch(e){next(e);}};
exports.get=async(req,res,next)=>{try{const row=await service.get(req.tenant.id,req.params.id);if(!row)return res.status(404).json({erro:'Evento nao encontrado'});res.json({ok:true,event:row});}catch(e){next(e);}};
