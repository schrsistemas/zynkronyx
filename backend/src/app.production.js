const express = require('express');
const crypto = require('node:crypto');

const logger = require('./utils/logger');
const rateLimit = require('./middleware/rateLimit.middleware');
const tenant = require('./middleware/tenant');
const auth = require('./middleware/auth.basic');

const syncRoutes = require('./routes/sync.routes');
const deviceRoutes = require('./routes/device.routes');
const adminRoutes = require('./routes/admin.basic');
const authRoutes = require('./routes/auth.basic');
const deviceRegistryRoutes = require('./routes/device.registry.routes');
const auditRoutes = require('./routes/audit.routes');
const aiRoutes = require('./routes/ai.routes');

const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '1mb' }));
app.use(rateLimit);

app.get('/health', (req, res) => res.json({
  status: 'ok',
  service: 'zynkronyx',
  timestamp: new Date().toISOString(),
  database: process.env.DB_DATABASE ? 'configured' : 'not-configured'
}));

app.use('/auth', authRoutes);
app.use(tenant);
app.use('/sync', auth, syncRoutes);
app.use('/integration', auth, deviceRoutes);
app.use('/integration/devices', auth, deviceRegistryRoutes);
app.use('/audit', auth, auditRoutes);
app.use('/ai', auth, aiRoutes);
app.use('/admin', auth, adminRoutes);

app.get('/metrics', (req, res) => res.type('text/plain').send('metrics ok'));

app.use((req, res) => res.status(404).json({ erro: 'Rota nao encontrada' }));
app.use((err, req, res, next) => {
  logger.error({ err, path: req.path }, 'Unhandled request error');
  res.status(err.status || 500).json({ erro: err.message || 'Erro interno' });
});

function start() {
  const PORT = Number(process.env.PORT || 3000);
  const server = app.listen(PORT, () => logger.info({ port: PORT }, 'API PROD rodando'));
  if (process.env.SYNC_PROCESSOR_ENABLED === 'true') {
    const startProcessor = require('./processor/runner');
    startProcessor();
  }
  return server;
}

if (require.main === module) start();
module.exports = { app, start };
