const express = require('express');
const router = express.Router();

const syncController = require('../controllers/sync.controller');

router.get('/out', syncController.getDelta);
router.post('/in', syncController.receiveData);

module.exports = router;
