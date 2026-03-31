// CI ENTRYPOINT - ultra simples e garantido

const express = require('express');
const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok-ci' });
});

app.post('/auth/login', (req, res) => {
  res.json({ token: 'ci-token' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('[CI MODE] API rodando na porta', PORT);
});
