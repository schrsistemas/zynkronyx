const express = require('express');
const router = express.Router();
const controller = require('../controllers/legal.audit.controller');

router.get('/events', controller.list);

module.exports = router;
