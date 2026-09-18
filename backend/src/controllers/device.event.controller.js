const deviceEventService = require('../services/device.event.service');
const deviceRegistry = require('../services/device.registry.service');
const crypto = require('node:crypto');

exports.ingest = async (req, res, next) => {
  try {
    const deviceId = req.headers['x-device-id'];
    const credential = req.headers['x-device-credential'];
    const device = await deviceRegistry.authenticate(req.tenant.id, deviceId, credential);
    if (!device) return res.status(401).json({ erro: 'Credencial do dispositivo invalida' });

    const events = Array.isArray(req.body) ? req.body : [req.body];
    if (events.length > 100) return res.status(413).json({ erro: 'Limite de 100 eventos por requisicao' });
    for (const event of events) {
      if (event.device_id !== device.DEVICE_ID) return res.status(403).json({ erro: 'device_id nao corresponde a credencial' });
      if (event.device_type !== device.DEVICE_TYPE) return res.status(403).json({ erro: 'device_type nao corresponde ao registro' });
      if (event.protocol_version !== device.PROTOCOL_VERSION) return res.status(409).json({ erro: 'protocol_version incompativel' });
    }
    const correlationId = req.headers['x-correlation-id'] || crypto.randomUUID();
    const results = [];
    for (const event of events) results.push(await deviceEventService.ingest(req.tenant.id, event, correlationId));
    res.status(202).json({ ok: true, correlation_id: correlationId, results });
  } catch (error) { next(error); }
};
