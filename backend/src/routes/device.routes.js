const express = require('express');
const router = express.Router();
const eventController = require('../controllers/device.event.controller');
const radarController = require('../controllers/radar.controller');
router.post('/events', eventController.ingest);
router.get('/radar', radarController.list);
module.exports = router;
