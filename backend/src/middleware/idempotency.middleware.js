/**
 * Middleware de idempotencia
 * Evita processar requests duplicadas
 */

const crypto = require('crypto');

const processed = new Set(); // substituir por Redis em producao

function gerarHash(body) {
    return crypto
        .createHash('sha256')
        .update(JSON.stringify(body))
        .digest('hex');
}

module.exports = (req, res, next) => {
    try {
        const hash = gerarHash(req.body);

        if (processed.has(hash)) {
            console.warn('[IDEMPOTENCY] Requisicao duplicada bloqueada');
            return res.status(409).json({ erro: 'Requisicao duplicada' });
        }

        processed.add(hash);

        next();

    } catch (err) {
        console.error('[IDEMPOTENCY][ERRO]', err);
        next();
    }
};
