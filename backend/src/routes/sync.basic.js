const express = require('express');
const router = express.Router();

router.get('/out', (req, res) => {
  res.json({ data: [] });
});

router.post('/in', (req, res) => {
  res.json({ status: 'ok' });
});

module.exports = router;
