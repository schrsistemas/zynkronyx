const db = require('../services/db.firebird.service');

class SyncProcessor {
  async process() {
    console.log('[PROCESSOR] buscando staging...');

    const rows = await db.query(`
      SELECT ID, PAYLOAD FROM SYNC_STAGING WHERE STATUS = 'P'
    `);

    for (const row of rows) {
      try {
        console.log('[PROCESSANDO]', row.ID);

        // simula aplicacao
        await db.execute(`
          UPDATE SYNC_STAGING SET STATUS = 'A' WHERE ID = ?
        `, [row.ID]);

      } catch (err) {
        console.error('[ERRO PROCESSAMENTO]', err);

        await db.execute(`
          UPDATE SYNC_STAGING SET STATUS = 'E' WHERE ID = ?
        `, [row.ID]);
      }
    }
  }
}

module.exports = new SyncProcessor();
