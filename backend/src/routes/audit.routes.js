const express=require('express');
const router=express.Router();
const c=require('../controllers/audit.controller');
router.get('/events',c.list);
router.get('/events/:id',c.get);
module.exports=router;
