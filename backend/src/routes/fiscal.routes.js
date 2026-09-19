const express = require('express');
const fiscal = require('../services/fiscal.service');
const router = express.Router();

function idempotencyKey(req) {
  const value = req.headers['idempotency-key'];
  if (typeof value === 'string' && value.length >= 8 && value.length <= 200) return value;
  return null;
}

router.post('/simulations', async (req, res) => {
  const key = idempotencyKey(req);
  if (!key) return res.status(400).json({ ok:false, error:'IDEMPOTENCY_KEY_REQUIRED', correlation_id:req.correlationId });

  try {
    const result = await fiscal.createSimulation({
      tenantId: req.tenant.id,
      correlationId: req.correlationId,
      idempotencyKey: key,
      command: req.body
    });
    return res.status(202).json({ ok:true, correlation_id:req.correlationId, ...result });
  } catch (error) {
    return res.status(error.status || 502).json({
      ok:false,
      error:error.code || error.message || 'FISCAL_SIMULATION_FAILED',
      correlation_id:req.correlationId
    });
  }
});

router.get('/simulations/:id', async (req, res) => {
  try {
    const result = await fiscal.getSimulation({
      tenantId: req.tenant.id,
      correlationId: req.correlationId,
      simulationId: req.params.id
    });
    return res.json({ ok:true, correlation_id:req.correlationId, ...result });
  } catch (error) {
    return res.status(error.status || 502).json({
      ok:false,
      error:error.code || error.message || 'FISCAL_SIMULATION_LOOKUP_FAILED',
      correlation_id:req.correlationId
    });
  }
});

module.exports = router;
