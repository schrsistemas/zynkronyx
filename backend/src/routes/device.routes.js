const express = require('express');
const router = express.Router();
const controller = require('../controllers/device.event.controller');

router.post('/events', controller.ingest);

module.exports = router;
