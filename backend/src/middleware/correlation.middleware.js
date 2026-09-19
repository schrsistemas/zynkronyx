const logger = require('../utils/logger');
module.exports = (req, res, next) => {
  const incoming = req.headers['x-correlation-id'];
  const correlationId = typeof incoming === 'string' && incoming.length > 0 && incoming.length <= 128 ? incoming : require('node:crypto').randomUUID();
  req.correlationId = correlationId; req.requestId = correlationId;
  req.log = logger.childContext({requestId:correlationId,correlationId});
  res.setHeader('x-correlation-id', correlationId); res.setHeader('x-request-id', correlationId); next();
};
