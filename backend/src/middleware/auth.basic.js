const crypto = require('node:crypto');

function configuredToken() {
  const token = process.env.AUTH_TOKEN;
  if (!token || token.length < 32) {
    throw Object.assign(new Error('AUTH_TOKEN nao configurado ou muito curto'), { status: 503 });
  }
  return token;
}

module.exports = (req, res, next) => {
  const value = req.headers.authorization;
  if (!value || !value.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'Token requerido' });
  }

  const presented = value.slice(7).trim();
  if (!presented) return res.status(401).json({ erro: 'Token invalido' });

  try {
    const expected = configuredToken();
    const a = Buffer.from(presented);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return res.status(401).json({ erro: 'Token invalido' });
    }
    req.user = { id: Number(process.env.AUTH_USER_ID || 1) };
    return next();
  } catch (error) {
    return next(error);
  }
};
