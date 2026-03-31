module.exports = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({ erro: 'API key obrigatoria' });
  }

  req.tenant = { id: 1, status: 'A' };

  if (req.tenant.status !== 'A') {
    return res.status(403).json({ erro: 'Tenant bloqueado' });
  }

  next();
};
