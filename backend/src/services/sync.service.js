const axios = require('axios');
const syncRepository = require('../repository/sync.repository');

// Base URL da API Delphi (ajustar)
const ERP_BASE_URL = process.env.ERP_BASE_URL || 'http://localhost:8080';

exports.getDelta = async (ultimaData) => {
    console.log('[SYNC][SERVICE][DELTA]', ultimaData);

    // Chamada real ao ERP (Delphi)
    const response = await axios.get(`${ERP_BASE_URL}/sync/out`, {
        params: { ultima_data: ultimaData },
        timeout: 10000
    });

    return response.data;
};

exports.processIncoming = async (payload) => {
    console.log('[SYNC][SERVICE][INCOMING]');

    if (!Array.isArray(payload)) {
        throw new Error('Payload deve ser array');
    }

    // Persistencia em staging (ainda local/mock)
    for (const item of payload) {
        if (!item.tabela || !item.operacao) {
            throw new Error('Payload invalido');
        }
        await syncRepository.insertStaging(item);
    }

    // Envia para ERP processar (endpoint futuro /sync/in)
    try {
        await axios.post(`${ERP_BASE_URL}/sync/in`, payload, {
            timeout: 10000
        });
    } catch (e) {
        console.error('[SYNC][SERVICE][ERP_IN][ERRO]', e.message);
        // nao falha geral; deixa para reprocesso
    }
};
