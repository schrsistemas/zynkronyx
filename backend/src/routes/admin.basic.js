const express = require('express');
const router = express.Router();

router.get('/status', (req, res) => {
  res.json({ admin: 'ok' });
});

module.exports = router;
