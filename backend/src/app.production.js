// Entrypoint de producao
const express = require('express');
const app = express();

const logger = require('./utils/logger');
const rateLimit = require('./middleware/rateLimit.middleware');
const tenant = require('./middleware/tenant');
const auth = require('./middleware/auth.basic');

const syncRoutes = require('./routes/sync');
const adminRoutes = require('./routes/admin.basic');
const authRoutes = require('./routes/auth.basic');

const processorRunner = require('./processor/runner');

app.use(express.json());
app.use(rateLimit);

// Health e autenticacao inicial devem ser publicos.
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'zynkronyx',
    timestamp: new Date().toISOString()
  });
});

app.use('/auth', authRoutes);

// Recursos de negocio exigem tenant e autenticacao.
app.use(tenant);
app.use('/sync', auth, syncRoutes);
app.use('/admin', auth, adminRoutes);

app.get('/metrics', (req, res) => {
  res.send('metrics ok');
});

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  logger.info('API PROD rodando na porta ' + PORT);
  processorRunner.start();
});

module.exports = { app, server };
