const crypto = require('node:crypto');
module.exports = (req, res, next) => {
  const incoming = req.headers['x-correlation-id'];
  const correlationId = typeof incoming === 'string' && incoming.length > 0 && incoming.length <= 128 ? incoming : crypto.randomUUID();
  req.correlationId = correlationId; req.requestId = correlationId;
  res.setHeader('x-correlation-id', correlationId); res.setHeader('x-request-id', correlationId); next();
};
