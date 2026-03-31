const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const syncRoutes = require('./routes/sync.routes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.use('/sync', syncRoutes);

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'zynkronyx',
        timestamp: new Date()
    });
});

const PORT = 3000;

app.listen(PORT, () => {
    console.log(`[Zynkronyx] API rodando na porta ${PORT}`);
});
