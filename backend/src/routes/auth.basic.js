const express = require('express');
const router = express.Router();

router.post('/login', (req, res) => {
  const { login } = req.body;

  if (!login) {
    return res.status(400).json({ erro: 'Login requerido' });
  }

  res.json({ token: 'mock-token' });
});

module.exports = router;
