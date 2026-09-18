const registry = require('../services/device.registry.service');

exports.list = async (req, res, next) => {
  try { res.json({ devices: await registry.list(req.tenant.id) }); } catch (e) { next(e); }
};
exports.register = async (req, res, next) => {
  try { res.status(201).json(await registry.register(req.tenant.id, req.body)); } catch (e) { e.status = e.status || 400; next(e); }
};
exports.revoke = async (req, res, next) => {
  try {
    const revoked = await registry.revoke(req.tenant.id, req.params.deviceId);
    if (!revoked) return res.status(404).json({ erro: 'Dispositivo nao encontrado ou ja inativo' });
    res.status(204).end();
  } catch (e) { next(e); }
};
exports.rotate = async (req, res, next) => {
  try {
    const result = await registry.rotate(req.tenant.id, req.params.deviceId);
    if (!result.rotated) return res.status(404).json({ erro: 'Dispositivo nao encontrado ou inativo' });
    res.json(result);
  } catch (e) { next(e); }
};
