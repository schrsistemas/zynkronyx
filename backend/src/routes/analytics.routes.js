const express = require('express');
const analytics = require('../analytics/analytics.service');
const insightExplanation = require('../analytics/insight.explanation.service');

const router = express.Router();

function requireMappingAdmin(req, res, next) {
  const configured = String(process.env.ANALYTICS_MAPPING_USERS || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
  const userId = String(req.user?.id || '');

  if (!configured.length) {
    return res.status(503).json({
      ok: false,
      error: 'ANALYTICS_MAPPING_ADMIN_NOT_CONFIGURED',
      correlation_id: req.correlationId
    });
  }

  if (!configured.includes(userId)) {
    return res.status(403).json({
      ok: false,
      error: 'ANALYTICS_MAPPING_FORBIDDEN',
      correlation_id: req.correlationId
    });
  }

  return next();
}

router.get('/metrics', async (req, res) => {
  try {
    return res.json({
      ok: true,
      correlation_id: req.correlationId,
      results: await analytics.listMetrics(req.tenant.id)
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      ok: false,
      error: error.code || error.message,
      correlation_id: req.correlationId,
      ...(error.details ? { details: error.details } : {})
    });
  }
});

router.post('/query', async (req, res) => {
  try {
    return res.json({
      ok: true,
      correlation_id: req.correlationId,
      ...await analytics.queryMetric(req.tenant.id, req.body || {})
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      ok: false,
      error: error.code || error.message,
      correlation_id: req.correlationId,
      ...(error.details ? { details: error.details } : {})
    });
  }
});

router.post('/insights', async (req, res) => {
  try {
    return res.json({
      ok: true,
      correlation_id: req.correlationId,
      ...await analytics.getInsight(req.tenant.id, req.body || {}, req.correlationId)
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      ok: false,
      error: error.code || error.message,
      correlation_id: req.correlationId,
      ...(error.details ? { details: error.details } : {})
    });
  }
});

router.get('/insights', async (req, res) => {
  try {
    return res.json({
      ok: true,
      correlation_id: req.correlationId,
      results: await analytics.listInsights(req.tenant.id, req.query || {})
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      ok: false,
      error: error.code || error.message,
      correlation_id: req.correlationId,
      ...(error.details ? { details: error.details } : {})
    });
  }
});

router.get('/insights/:id', async (req, res) => {
  try {
    const insight = await analytics.getInsightById(req.tenant.id, req.params.id);
    if (!insight) {
      return res.status(404).json({
        ok: false,
        error: 'ANALYTICS_INSIGHT_NOT_FOUND',
        correlation_id: req.correlationId
      });
    }
    return res.json({ ok: true, correlation_id: req.correlationId, insight });
  } catch (error) {
    return res.status(error.status || 500).json({
      ok: false,
      error: error.code || error.message,
      correlation_id: req.correlationId,
      ...(error.details ? { details: error.details } : {})
    });
  }
});

router.post('/insights/:id/explain', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, error: 'ANALYTICS_INSIGHT_INVALID_ID', correlation_id: req.correlationId });
    }
    const result = await insightExplanation.explain(req.tenant.id, id, req);
    return res.json({ ok: true, correlation_id: req.correlationId, ...result });
  } catch (error) {
    return res.status(error.status || 500).json({
      ok: false,
      error: error.code || error.message || 'ANALYTICS_INSIGHT_EXPLANATION_FAILED',
      correlation_id: req.correlationId
    });
  }
});

router.get('/mappings', async (req, res) => {
  try {
    return res.json({
      ok: true,
      correlation_id: req.correlationId,
      results: await analytics.listMappings(req.tenant.id)
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      ok: false,
      error: error.code || error.message,
      correlation_id: req.correlationId
    });
  }
});

router.post('/mappings', requireMappingAdmin, async (req, res) => {
  try {
    return res.status(201).json({
      ok: true,
      correlation_id: req.correlationId,
      mapping: await analytics.saveMapping(req.tenant.id, req.body || {}, req.correlationId)
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      ok: false,
      error: error.code || error.message,
      correlation_id: req.correlationId,
      ...(error.details ? { details: error.details } : {})
    });
  }
});

router.delete('/mappings', requireMappingAdmin, async (req, res) => {
  try {
    await analytics.deleteMapping(req.tenant.id, req.body || req.query || {}, req.correlationId);
    return res.status(204).send();
  } catch (error) {
    return res.status(error.status || 500).json({
      ok: false,
      error: error.code || error.message,
      correlation_id: req.correlationId
    });
  }
});

module.exports = router;
