const express = require('express');
const ai = require('../services/ai.service');

const router = express.Router();



router.get('/status', (req, res) => {
  const state = ai.status();
  const llm = state.enabled && Boolean(state.provider);
  const rag = state.rag.enabled;
  res.json({
    ok: true,
    service: 'zynkronyx-ai',
    llm: {
      enabled: llm,
      provider: process.env.AI_PROVIDER || null,
      model: process.env.AI_MODEL || null
    },
    rag: {
      enabled: rag,
      topK: state.rag.topK
    },
    safeguards: {
      tenantIsolation: true,
      auditRequired: true,
      sqlGeneration: false,
      mutableActionsRequireAuthorization: true
    }
  });
});

router.post('/query', async (req, res) => {
  if (!ai.config.enabled()) {
    return res.status(503).json({
      ok: false,
      error: 'AI_NOT_CONFIGURED',
      message: 'IA desativada. Configure AI_ENABLED e um provider antes de habilitar consultas.'
    });
  }

  if (!process.env.AI_PROVIDER) {
    return res.status(503).json({
      ok: false,
      error: 'AI_PROVIDER_NOT_CONFIGURED',
      message: 'Nenhum provider de LLM configurado.'
    });
  }

  try { await ai.query(req.body, req); } catch (error) { return res.status(error.status || 500).json({ ok:false, error:error.message || 'AI_QUERY_FAILED', correlation_id:req.correlationId }); }
});

module.exports = router;
