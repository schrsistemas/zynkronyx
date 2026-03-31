/**
 * Middleware de compressao GZIP
 */

const zlib = require('zlib');

module.exports = (req, res, next) => {
    const acceptEncoding = req.headers['accept-encoding'] || '';

    if (!acceptEncoding.includes('gzip')) {
        return next();
    }

    const originalSend = res.send;

    res.send = function (body) {
        try {
            const buffer = Buffer.isBuffer(body) ? body : Buffer.from(JSON.stringify(body));

            const compressed = zlib.gzipSync(buffer);

            res.set('Content-Encoding', 'gzip');
            res.set('Content-Length', compressed.length);

            return originalSend.call(this, compressed);
        } catch (err) {
            console.error('[COMPRESSION][ERRO]', err);
            return originalSend.call(this, body);
        }
    };

    next();
};
