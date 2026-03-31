// Middleware para correlacao completa (trace + request_id)

const { v4: uuidv4 } = require('uuid');
const logger = require('../logger');

module.exports = (req, res, next) => {
  const requestId = uuidv4();

  req.request_id = requestId;

  logger.info({
    request_id: requestId,
    method: req.method,
    url: req.url
  }, 'request start');

  res.on('finish', () => {
    logger.info({
      request_id: requestId,
      status: res.statusCode
    }, 'request end');
  });

  next();
};
