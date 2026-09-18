const deviceRegistry = require('../services/device.registry.service');
const securityAudit = require('../services/security.audit.service');
const crypto = require('node:crypto');

module.exports = requiredScope => async (req, res, next) => {
  const deviceId = req.headers['x-device-id'];
  const credential = req.headers['x-device-credential'];

  if (!deviceId || !credential) {
    await securityAudit.record({
      tenantId: req.tenant.id,
      deviceId: deviceId || null,
      action: 'DEVICE_AUTH',
      result: 'DENIED',
      correlationId,
      metadata: { reason: 'missing_credential' }
    });
    return res.status(401).json({ erro: 'Credencial do dispositivo obrigatoria' });
  }

  const correlationId = req.headers['x-correlation-id'] || crypto.randomUUID();

  try {
    const device = await deviceRegistry.authenticate(req.tenant.id, deviceId, credential);
    if (!device) {
      await securityAudit.record({
        tenantId: req.tenant.id,
        deviceId: deviceId || null,
        action: 'DEVICE_AUTH',
        result: 'DENIED',
        correlationId,
        metadata: { reason: 'invalid_credential' }
      });
      return res.status(401).json({ erro: 'Credencial do dispositivo invalida' });
    }
    if (!deviceRegistry.hasScope(device, requiredScope)) {
      await securityAudit.record({
        tenantId: req.tenant.id,
        deviceId: device.DEVICE_ID,
        action: 'DEVICE_SCOPE',
        result: 'DENIED',
        correlationId,
        metadata: { required_scope: requiredScope }
      });
      return res.status(403).json({ erro: 'Scope ' + requiredScope + ' obrigatorio' });
    }

    await securityAudit.record({
      tenantId: req.tenant.id,
      deviceId: device.DEVICE_ID,
      action: 'DEVICE_SCOPE',
      result: 'ALLOWED',
      correlationId,
      metadata: { required_scope: requiredScope }
    });
    req.device = device;
    req.correlationId = correlationId;
    return next();
  } catch (error) {
    return next(error);
  }
};
