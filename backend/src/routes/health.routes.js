const express = require('express');
const router = express.Router();

// Simples metricas em memoria (substituir por Redis/Prometheus em producao)
let metrics = {
  startedAt: new Date(),
  requests: 0,
  errors: 0
};

function incRequest() { metrics.requests++; }
function incError() { metrics.errors++; }

// middleware para contagem
router.use((req, res, next) => {
  incRequest();
  const origJson = res.json;
  res.json = function (body) {
    if (res.statusCode >= 500) incError();
    return origJson.call(this, body);
  };
  next();
});

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime_sec: Math.floor((Date.now() - metrics.startedAt.getTime()) / 1000),
    requests: metrics.requests,
    errors: metrics.errors,
    timestamp: new Date()
  });
});

router.get('/metrics', (req, res) => {
  res.json(metrics);
});

module.exports = router;
