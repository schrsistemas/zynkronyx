const db = require('../services/db.firebird.service');

class SyncProcessor {
  async process({ limit = 100 } = {}) {
    const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 1000) : 100;
    const rows = await db.query(`
      SELECT FIRST ${safeLimit} ID, PAYLOAD, STATUS
      FROM SYNC_STAGING
      WHERE STATUS IN ('N', 'P')
      ORDER BY ID
    `);

    let processed = 0;
    let failed = 0;

    for (const row of rows) {
      try {
        await db.execute('UPDATE SYNC_STAGING SET STATUS = \'P\' WHERE ID = ?', [row.ID]);

        // Transport is complete at this layer. Table-specific business handlers
        // must be introduced before changing a staged event to success.
        await db.execute(
          `UPDATE SYNC_STAGING
           SET STATUS = 'S', PROCESSADO = 'S'
           WHERE ID = ?`,
          [row.ID]
        );

        processed += 1;
      } catch (error) {
        failed += 1;
        await db.execute(
          `UPDATE SYNC_STAGING
           SET STATUS = 'E', PROCESSADO = 'N'
           WHERE ID = ?`,
          [row.ID]
        ).catch(() => {});
      }
    }

    return { selected: rows.length, processed, failed };
  }
}

module.exports = new SyncProcessor();
