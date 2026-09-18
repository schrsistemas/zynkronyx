const express = require('express');
const router = express.Router();
const eventController = require('../controllers/device.event.controller');
const registryController = require('../controllers/device.registry.controller');

router.get('/devices', registryController.list);
router.post('/devices', registryController.register);
router.post('/devices/:deviceId/rotate', registryController.rotate);
router.delete('/devices/:deviceId', registryController.revoke);
router.post('/events', eventController.ingest);

module.exports = router;
