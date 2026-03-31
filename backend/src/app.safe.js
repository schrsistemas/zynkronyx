// SAFE ENTRYPOINT - garante que API sempre sobe mesmo com erro interno

const express = require('express');
const app = express();

app.use(express.json());

// health sempre responde
app.get('/health', (req, res) => {
  res.json({ status: 'ok-safe' });
});

// tenta carregar app real
try {
  require('./app.production');
} catch (err) {
  console.error('[FALLBACK ERROR]', err);
}

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('[SAFE MODE] API subida na porta', PORT);
});
