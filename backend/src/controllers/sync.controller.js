const syncService = require('../services/sync.service');

exports.getDelta = async (req, res) => {
  try {
    const { ultima_data } = req.query;
    if (!ultima_data) return res.status(400).json({ erro: 'Parametro ultima_data obrigatorio' });
    const result = await syncService.getDelta(ultima_data);
    res.json({ ok: true, data: result });
  } catch (error) {
    console.error('[SYNC][OUT][ERRO]', error);
    res.status(error.status || 500).json({ erro: error.message || 'Erro interno' });
  }
};

exports.receiveData = async (req, res) => {
  try {
    const result = await syncService.processIncoming(req.body);
    res.status(202).json({ ok: true, ...result });
  } catch (error) {
    console.error('[SYNC][IN][ERRO]', error);
    res.status(400).json({ erro: error.message || 'Payload invalido' });
  }
};
