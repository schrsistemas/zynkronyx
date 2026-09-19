const crypto = require('node:crypto');

module.exports = (req, res, next) => {
  const incoming = req.headers['x-correlation-id'];
  const correlationId = typeof incoming === 'string' && incoming.length <= 128
    ? incoming
    : crypto.randomUUID();

  req.correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);
  next();
};
