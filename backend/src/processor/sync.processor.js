const syncRepository = require('../repository/sync.repository');
const syncHandlers = require('./sync.handler.registry');
const db = require('../services/db.firebird.service');
const crypto = require('node:crypto');

class SyncProcessor {
  async process({ limit = 100 } = {}) {
    const rows = await syncRepository.fetchPending(limit);
    let claimed = 0;
    let applied = 0;
    let failed = 0;
    let unsupported = 0;
    let skipped = 0;

    const maxAttempts = Number(process.env.SYNC_MAX_ATTEMPTS || 5);
    const workerId = process.env.SYNC_WORKER_ID || `zynkronyx-${crypto.randomUUID()}`;

    for (const row of rows) {
      try {
        const claim = await syncRepository.markProcessing(row.ID, workerId);
        if (!claim) {
          skipped += 1;
          continue;
        }
        claimed += 1;

        if (process.env.SYNC_APPLY_ENABLED !== 'true') continue;

        const handler = syncHandlers.resolve(row.TABELA, row.OPERACAO);
        if (!handler) {
          unsupported += 1;
          continue;
        }

        await db.withTransaction(async (tx) => {
          await handler(row, tx);
          await tx.execute(`
            UPDATE SYNC_STAGING
            SET STATUS = 'S', PROCESSADO = 'S', DATA_PROCESSAMENTO = NULL, WORKER_ID = NULL
            WHERE ID = ? AND STATUS = 'P' AND WORKER_ID = ?
          `, [row.ID, workerId]);
        });
        applied += 1;
      } catch (error) {
        failed += 1;
        const attempts = Number((await syncRepository.fetchAttemptCount?.(row.ID)) || row.TENTATIVAS || 0);
        const permanent = attempts >= maxAttempts;
        await syncRepository.markError(row.ID, { permanent }).catch(() => {});
      }
    }

    return { selected: rows.length, claimed, applied, failed, unsupported, skipped };
  }
}

module.exports = new SyncProcessor();
