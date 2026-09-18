const db = require('../services/db.firebird.service');

module.exports = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({ erro: 'API key obrigatoria' });
  }

  if (typeof apiKey !== 'string' || apiKey.length > 100) {
    return res.status(401).json({ erro: 'API key invalida' });
  }

  try {
    const rows = await db.query(
      `SELECT FIRST 1 ID, STATUS
       FROM TENANT
       WHERE API_KEY = ?`,
      [apiKey]
    );

    const tenant = rows[0];

    if (!tenant) {
      return res.status(401).json({ erro: 'API key invalida' });
    }

    if (tenant.STATUS !== 'A') {
      return res.status(403).json({ erro: 'Tenant bloqueado' });
    }

    req.tenant = {
      id: tenant.ID,
      status: tenant.STATUS
    };

    return next();
  } catch (error) {
    return next(error);
  }
};
