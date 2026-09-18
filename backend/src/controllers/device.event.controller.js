const deviceEventService = require('../services/device.event.service');

exports.ingest = async (req, res, next) => {
  try {
    const events = Array.isArray(req.body) ? req.body : [req.body];
    if (events.length > 100) return res.status(413).json({ erro: 'Limite de 100 eventos por requisicao' });
    const correlationId = req.headers['x-correlation-id'] || require('node:crypto').randomUUID();
    const results = [];
    for (const event of events) {
      results.push(await deviceEventService.ingest(req.tenant.id, event, correlationId));
    }
    res.status(202).json({ ok: true, correlation_id: correlationId, results });
  } catch (error) {
    next(error);
  }
};
