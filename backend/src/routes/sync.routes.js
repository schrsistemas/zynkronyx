const express = require('express');
const router = express.Router();

const syncController = require('../controllers/sync.controller');
const deviceScope = require('../middleware/device.scope');

router.get('/out', syncController.getDelta);
router.get('/device-out', deviceScope('sync:read'), syncController.getDelta);
router.post('/in', syncController.receiveData);

module.exports = router;
