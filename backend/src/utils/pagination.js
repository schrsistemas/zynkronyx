/**
 * Utilitario de paginacao para sync
 */

function buildPagination(query) {
    const limit = Math.min(parseInt(query.limit || '100', 10), 1000);
    const offset = parseInt(query.offset || '0', 10);

    return { limit, offset };
}

module.exports = { buildPagination };
