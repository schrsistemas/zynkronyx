/**
 * Middleware simples de API Key
 * Protege endpoints /sync
 */

module.exports = (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    const expected = process.env.API_KEY || 'changeme';

    if (!apiKey || apiKey !== expected) {
      return res.status(401).json({ erro: 'Unauthorized' });
    }

    next();
  } catch (e) {
    return res.status(500).json({ erro: 'Auth error' });
  }
};
