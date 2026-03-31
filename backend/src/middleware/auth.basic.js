module.exports = (req, res, next) => {
  const auth = req.headers['authorization'];

  if (!auth) {
    return res.status(401).json({ erro: 'Token requerido' });
  }

  // mock token
  if (!auth.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'Token invalido' });
  }

  req.user = { id: 1 };

  next();
};
