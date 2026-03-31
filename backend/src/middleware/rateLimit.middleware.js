// Middleware de rate limit simples para evitar crash no startup

const requests = {};

setInterval(() => {
  for (const k in requests) requests[k] = 0;
}, 60000);

module.exports = (req, res, next) => {
  const key = req.headers['x-api-key'] || 'anon';

  requests[key] = (requests[key] || 0) + 1;

  if (requests[key] > 1000) {
    return res.status(429).json({ error: 'rate limit' });
  }

  next();
};
