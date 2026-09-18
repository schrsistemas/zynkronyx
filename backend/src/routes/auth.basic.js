const express = require('express');
const crypto = require('node:crypto');
const router = express.Router();

function secret(name, minLength = 1) {
  const value = process.env[name];
  if (!value || value.length < minLength) {
    throw Object.assign(new Error(name + ' nao configurado'), { status: 503 });
  }
  return value;
}

router.post('/login', (req, res) => {
  const { login, password } = req.body || {};
  if (!login || !password) return res.status(400).json({ erro: 'Login e senha obrigatorios' });

  try {
    const expectedLogin = secret('AUTH_LOGIN');
    const expectedPassword = secret('AUTH_PASSWORD', 12);
    const a = Buffer.from(String(login));
    const b = Buffer.from(expectedLogin);
    const c = Buffer.from(String(password));
    const d = Buffer.from(expectedPassword);
    const loginOk = a.length === b.length && crypto.timingSafeEqual(a, b);
    const passwordOk = c.length === d.length && crypto.timingSafeEqual(c, d);
    if (!loginOk || !passwordOk) return res.status(401).json({ erro: 'Credenciais invalidas' });
    return res.json({ token: secret('AUTH_TOKEN', 32), token_type: 'Bearer', expires: 'server-configured' });
  } catch (error) {
    return res.status(error.status || 500).json({ erro: error.message || 'Falha de autenticacao' });
  }
});

module.exports = router;
