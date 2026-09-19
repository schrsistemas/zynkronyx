const express = require('express');

const router = express.Router();

function enabled(name) {
  return String(process.env[name] || '').toLowerCase() === 'true';
}

router.get('/status', (req, res) => {
  const llm = enabled('AI_ENABLED') && Boolean(process.env.AI_PROVIDER);
  const rag = enabled('RAG_ENABLED');
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
      topK: Number(process.env.RAG_TOP_K || 8)
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
  if (!enabled('AI_ENABLED')) {
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

  return res.status(501).json({
    ok: false,
    error: 'AI_PIPELINE_NOT_ENABLED',
    message: 'O contrato de consulta está reservado para o pipeline RAG/LLM versionado.'
  });
});

module.exports = router;
