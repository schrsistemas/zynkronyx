const express=require('express');
const router=express.Router();
const c=require('../controllers/device.registry.controller');
router.post('/',c.register);
router.get('/',c.list);
router.post('/:deviceId/revoke',c.revoke);
module.exports=router;
