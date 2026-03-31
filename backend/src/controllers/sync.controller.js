const syncService = require('../services/sync.service');

exports.getDelta = async (req, res) => {
    try {
        const { ultima_data } = req.query;

        if (!ultima_data) {
            return res.status(400).json({ erro: 'Parametro ultima_data obrigatorio' });
        }

        const result = await syncService.getDelta(ultima_data);

        res.json(result);

    } catch (error) {
        console.error('[SYNC][OUT][ERRO]', error);
        res.status(500).json({ erro: 'Erro interno' });
    }
};

exports.receiveData = async (req, res) => {
    try {
        const payload = req.body;

        await syncService.processIncoming(payload);

        res.json({ status: 'ok' });

    } catch (error) {
        console.error('[SYNC][IN][ERRO]', error);
        res.status(500).json({ erro: 'Erro interno' });
    }
};
