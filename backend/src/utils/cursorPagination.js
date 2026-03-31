/**
 * Cursor-based pagination
 * Melhor que offset para grandes volumes
 */

function buildCursor(query) {
    const lastDate = query.last_date || null;
    const lastId = query.last_id ? parseInt(query.last_id, 10) : null;
    const limit = Math.min(parseInt(query.limit || '100', 10), 1000);

    return { lastDate, lastId, limit };
}

module.exports = { buildCursor };
