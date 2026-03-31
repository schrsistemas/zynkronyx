exports.fetchDelta = async (ultimaData) => {
    console.log('[SYNC][REPO][DELTA]', ultimaData);

    return [
        {
            tabela: 'PRODUTO',
            chave: '123',
            operacao: 'U',
            data: new Date()
        }
    ];
};

exports.insertStaging = async (item) => {
    console.log('[SYNC][REPO][STAGING]', item);
};
