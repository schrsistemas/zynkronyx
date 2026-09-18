const audit = require('../services/legal.audit.service');

exports.list = async (req, res, next) => {
  try {
    const rows = await audit.list(req.tenant.id, { limit: req.query.limit, cursor: req.query.cursor });
    res.json({ events: rows, next_cursor: rows.length ? rows[rows.length - 1].ID : null });
  } catch (e) { next(e); }
};
