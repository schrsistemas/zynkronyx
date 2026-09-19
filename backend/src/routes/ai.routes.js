const express = require('express');
const ai = require('../services/ai.service');
const router = express.Router();

router.get('/status', (req, res) => {
  res.json({ ok: true, service: 'zynkronyx-ai', ...ai.status(req) });
});

router.post('/query', async (req, res) => {
  try {
    const result = await ai.query(req.body, req);
    return res.json({ ok: true, correlation_id: req.correlationId, ...result });
  } catch (error) {
    return res.status(error.status || 500).json({
      ok: false, error: error.code || error.message || 'AI_QUERY_FAILED',
      correlation_id: req.correlationId
    });
  }
});

router.post('/rag/documents/preview', async (req, res) => {
  try {
    const result = await ai.rag.registerDocument(req, req.body);
    return res.status(202).json({ ok: true, correlation_id: req.correlationId, ...result });
  } catch (error) {
    return res.status(error.status || 500).json({
      ok: false, error: error.message || 'RAG_DOCUMENT_FAILED',
      correlation_id: req.correlationId
    });
  }
});

router.post('/rag/retrieve', async (req, res) => {
  try {
    const result = await ai.rag.retrieve(req, req.body);
    return res.json({ ok: true, correlation_id: req.correlationId, ...result });
  } catch (error) {
    return res.status(error.status || 500).json({
      ok: false, error: error.message || 'RAG_RETRIEVAL_FAILED',
      correlation_id: req.correlationId
    });
  }
});

module.exports = router;
