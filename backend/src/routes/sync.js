const express = require('express');
const syncService = require('../services/sync.service');

const router = express.Router();

router.get('/out', async (req, res) => {
  try {
    res.json(await syncService.getDelta({
      since: req.query.since,
      cursorId: req.query.cursor_id,
      limit: req.query.limit
    }));
  } catch (error) {
    res.status(error.statusCode || 500).json({
      erro: error.statusCode ? error.message : 'Falha ao consultar delta'
    });
  }
});

router.post('/in', async (req, res) => {
  try {
    const result = await syncService.stageIncoming({
      tenantId: req.tenant.id,
      payload: req.body
    });
    res.status(202).json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({
      erro: error.statusCode ? error.message : 'Falha ao registrar sincronizacao'
    });
  }
});

module.exports = router;
