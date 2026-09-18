const deviceRegistry = require('../services/device.registry.service');

module.exports = requiredScope => async (req, res, next) => {
  const deviceId = req.headers['x-device-id'];
  const credential = req.headers['x-device-credential'];

  if (!deviceId || !credential) {
    return res.status(401).json({ erro: 'Credencial do dispositivo obrigatoria' });
  }

  try {
    const device = await deviceRegistry.authenticate(req.tenant.id, deviceId, credential);
    if (!device) return res.status(401).json({ erro: 'Credencial do dispositivo invalida' });
    if (!deviceRegistry.hasScope(device, requiredScope)) {
      return res.status(403).json({ erro: 'Scope ' + requiredScope + ' obrigatorio' });
    }

    req.device = device;
    return next();
  } catch (error) {
    return next(error);
  }
};
