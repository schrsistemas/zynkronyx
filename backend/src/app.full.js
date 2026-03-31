const express = require('express');
const app = express();

const logger = require('./utils/logger');
const rateLimit = require('./middleware/rateLimit.middleware');
const tenant = require('./middleware/tenant');
const auth = require('./middleware/auth.basic');

const syncRoutes = require('./routes/sync.basic');
const adminRoutes = require('./routes/admin.basic');
const authRoutes = require('./routes/auth.basic');

app.use(express.json());
app.use(rateLimit);
app.use(tenant);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRoutes);
app.use('/sync', auth, syncRoutes);
app.use('/admin', auth, adminRoutes);

app.get('/metrics', (req, res) => {
  res.send('metrics ok');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info('API FULL rodando na porta ' + PORT);
});
