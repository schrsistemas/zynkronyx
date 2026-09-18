const radarService = require('../services/radar.service');
exports.list = async (req, res, next) => {
  try {
    res.json({ ok: true, privacy: { default_precision: 'coarse' }, devices: await radarService.list(req.tenant.id, req) });
  } catch (error) { next(error); }
};
